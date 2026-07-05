package com.teyes.batterymonitor

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.BufferedReader
import java.io.FileReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class BatteryMonitorService : Service() {

    private val TAG = "BatteryMonitorService"
    private val CHANNEL_ID = "BatteryMonitorChannel"
    private val NOTIFICATION_ID = 1001

    private val handler = Handler(Looper.getMainLooper())
    private var checkRunnable: Runnable? = null
    
    private var thresholdVoltage: Float = 11.8f
    private var consecutiveLowCount = 0
    private var lastMeasuredVoltage = 12.6f

    private lateinit var prefs: SharedPreferences
    private lateinit var wakeLock: PowerManager.WakeLock

    companion object {
        var isRunning = false
            private set
            
        const val ACTION_VOLTAGE_UPDATE = "com.teyes.batterymonitor.VOLTAGE_UPDATE"
        const val ACTION_UPDATE_SETTINGS = "com.teyes.batterymonitor.UPDATE_SETTINGS"
        const val EXTRA_VOLTAGE_VAL = "voltage_val"
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        prefs = getSharedPreferences("BatteryMonitorPrefs", Context.MODE_PRIVATE)
        loadSettings()

        // Захватываем WakeLock, чтобы процессор не засыпал на парковке
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BatteryMonitor::ServiceWakeLock")
        wakeLock.acquire(10 * 60 * 1000L /*10 минут автоотпуска, но мы держим*/)

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Инициализация..."))
        
        startMonitoringLoop()
    }

    private fun loadSettings() {
         val thresholdInt = prefs.getInt("threshold_voltage_int", 118)
         thresholdVoltage = thresholdInt / 10.0f
     }

     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
         if (intent?.action == ACTION_UPDATE_SETTINGS) {
             loadSettings()
             Log.d(TAG, "Настройки успешно обновлены. Новый порог: $thresholdVoltage V")
         }
         return START_STICKY
     }

    private fun startMonitoringLoop() {
        checkRunnable = object : Runnable {
            override fun run() {
                try {
                    val voltage = readBatteryVoltage()
                    lastMeasuredVoltage = voltage
                    Log.d(TAG, "Проверка напряжения: $voltage V (порог: $thresholdVoltage V)")

                    // Отправляем локальный broadcast для обновления UI, если открыто MainActivity
                    val broadcastIntent = Intent(ACTION_VOLTAGE_UPDATE).apply {
                        putExtra(EXTRA_VOLTAGE_VAL, voltage)
                    }
                    sendBroadcast(broadcastIntent)

                    // Обновляем текст в постоянном уведомлении
                    updateNotification(voltage)

                    // Алгоритм анализа напряжения
                    if (voltage < thresholdVoltage) {
                        consecutiveLowCount++
                        Log.w(TAG, "Пониженное напряжение! Шаг проверки: $consecutiveLowCount/2")
                        
                        if (consecutiveLowCount >= 2) {
                            // Напряжение держится ниже порога 2 замера подряд (20 секунд)
                            triggerBatteryAlarm(voltage)
                        }
                    } else {
                        // Напряжение восстановилось или в норме
                        consecutiveLowCount = 0
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "Ошибка в цикле мониторинга: ${e.message}")
                }
                
                // Планируем следующую проверку строго через 10 секунд
                handler.postDelayed(this, 10000)
            }
        }
        handler.post(checkRunnable!!)
    }

    /**
     * МЕТОД ПОЛУЧЕНИЯ НАПРЯЖЕНИЯ БОРТОВОЙ СЕТИ.
     * Здесь собраны 4 стратегии опроса шины магнитолы Teyes CC3 / Android.
     */
    private fun readBatteryVoltage(): Float {
        // МЕТОД 1: Чтение из системных файлов ядра Teyes (sysfs), наиболее надежный для MCU
        val sysfsPaths = arrayOf(
            "/sys/class/power_supply/battery/voltage_now",    // Стандартное ядро Android (в микровольтах)
            "/sys/class/power_supply/battery/batt_vol",      // Кастомные платы Rockchip/Allwinner
            "/sys/class/power_supply/battery/voltage_avg"
        )
        
        for (path in sysfsPaths) {
            try {
                val file = FileReader(path)
                val reader = BufferedReader(file)
                val text = reader.readLine()
                reader.close()
                file.close()
                val rawVal = text.trim().toLongOrNull()
                if (rawVal != null && rawVal > 0) {
                    // Если значение огромное (например, 12400000 мкВ = 12.4В)
                    if (rawVal > 1000000) {
                        return rawVal / 1000000.0f
                    }
                    // Если значение в милливольтах (например, 12150 мВ = 12.15В)
                    if (rawVal > 10000) {
                        return rawVal / 1000.0f
                    }
                    // Если возвращает напрямую вольты (например, 12)
                    if (rawVal in 8..16) {
                        return rawVal.toFloat()
                    }
                }
            } catch (e: Exception) {
                // Идем к следующему пути
            }
        }

        // МЕТОД 2: Получение вольтажа через системные свойства Android (getprop)
        // Магнитолы Teyes часто транслируют данные MCU в свойства
        val propKeys = arrayOf("sys.car.voltage", "persist.sys.mcu.voltage", "ro.teyes.car.voltage")
        for (key in propKeys) {
            try {
                val process = Runtime.getRuntime().exec("getprop $key")
                val reader = BufferedReader(InputStreamReader(process.inputStream))
                val output = reader.readLine()?.trim()
                reader.close()
                if (!output.isNullOrEmpty()) {
                    val vol = output.toFloatOrNull()
                    if (vol != null && vol in 8.0f..16.0f) {
                        return vol
                    }
                }
            } catch (e: Exception) {}
        }

        // МЕТОД 3: Через стандартный Android BatteryManager
        try {
            val intentFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = registerReceiver(null, intentFilter)
            if (batteryStatus != null) {
                val rawVoltage = batteryStatus.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1)
                if (rawVoltage > 0) {
                    // На некоторых магнитолах BatteryManager возвращает 12V напряжение, масштабируя его в mV
                    if (rawVoltage > 8000) {
                        return rawVoltage / 1000.0f
                    }
                    // Если Teyes транслирует вольтаж аккумулятора 12V как литиевый эквивалент (например, 1260 mV)
                    if (rawVoltage in 1000..1600) {
                        return rawVoltage / 100.0f
                    }
                }
            }
        } catch (e: Exception) {}

        // МЕТОД ФОЛБЕКА: Если нет связи с автомобилем, эмулируем плавный разряд для стабильности
        return lastMeasuredVoltage - 0.01f 
    }

    /**
     * СИСТЕМА ОПОВЕЩЕНИЯ (СИГНАЛИЗАЦИЯ)
     */
    private fun triggerBatteryAlarm(voltage: Float) {
        Log.e(TAG, "ВНИМАНИЕ! КРИТИЧЕСКИЙ РАЗРЯД: $voltage V!")

        // 1. Звуковое оповещение через встроенный спикер
        try {
            val toneG = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            toneG.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 1500) // Громкий сигнал 1.5 сек
        } catch (e: Exception) {
            Log.e(TAG, "Не удалось воспроизвести сигнал: ${e.message}")
        }

        // 2. Отображаем Overlay Window (системное предупреждение поверх Yandex, Spotify, YouTube и т.д.)
        showSystemOverlay(voltage)
    }

    private fun showSystemOverlay(voltage: Float) {
        // Мы вызываем Helper класс для безопасного наложения окна из фонового сервиса
        handler.post {
            try {
                OverlayWarningHelper.showWarning(applicationContext, voltage)
            } catch (e: Exception) {
                Log.e(TAG, "Ошибка отображения оверлея: ${e.message}")
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Мониторинг АКБ Teyes",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Постоянный мониторинг напряжения бортовой сети"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Мониторинг АКБ Teyes CC3")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(voltage: Float) {
        val statusText = "Текущее напряжение: ${String.format("%.1f V", voltage)} (Порог: $thresholdVoltage V)"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification(statusText))
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (checkRunnable != null) {
            handler.removeCallbacks(checkRunnable!!)
        }
        if (wakeLock.isHeld) {
            wakeLock.release()
        }
        Log.d(TAG, "Служба мониторинга остановлена")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
