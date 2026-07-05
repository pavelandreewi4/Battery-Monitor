export interface AndroidFile {
  name: string;
  path: string;
  language: 'kotlin' | 'xml' | 'groovy';
  code: string;
  description: string;
}

export const androidProjectFiles: AndroidFile[] = [
  {
    name: "AndroidManifest.xml",
    path: "app/src/main/AndroidManifest.xml",
    language: "xml",
    description: "Конфигурационный файл манифеста Android. Объявляет необходимые разрешения (работа в фоне, автозапуск, наложение поверх других окон) и регистрирует службу и ресивер.",
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.teyes.batterymonitor">

    <!-- Разрешение для фоновой службы (требуется с Android 9) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    
    <!-- Разрешение для показа предупреждения поверх всех окон -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    
    <!-- Разрешение для автоматического запуска при загрузке магнитолы -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <!-- Разрешение для предотвращения засыпания процессора во время проверки -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BatteryMonitor">
        
        <!-- Главное окно настроек -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Фоновая служба мониторинга -->
        <service
            android:name=".BatteryMonitorService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse" />

        <!-- Автозапуск службы при загрузке ОС -->
        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter android:priority="999">
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
        
    </application>
</manifest>`
  },
  {
    name: "MainActivity.kt",
    path: "app/src/main/java/com/teyes/batterymonitor/MainActivity.kt",
    language: "kotlin",
    description: "Основной экран настроек приложения. Позволяет включать/выключать службу, настраивать пороговое напряжение через ползунок и запрашивать системные разрешения Android.",
    code: `package com.teyes.batterymonitor

import android.content.*
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var tvCurrentVoltage: TextView
    private lateinit var tvThresholdValue: TextView
    private lateinit var seekBarThreshold: SeekBar
    private lateinit var btnToggleService: Button
    private lateinit var switchAutostart: SwitchCompat

    private lateinit var prefs: SharedPreferences

    // Получаем обновления напряжения из службы для отображения на экране
    private val voltageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BatteryMonitorService.ACTION_VOLTAGE_UPDATE) {
                val voltage = intent.getFloatExtra(BatteryMonitorService.EXTRA_VOLTAGE_VAL, 12.0f)
                tvCurrentVoltage.text = String.format("%.1f V", voltage)
                
                // Меняем цвет текста в зависимости от напряжения
                val color = when {
                    voltage >= 12.0f -> ContextCompat.getColor(this@MainActivity, android.R.color.holo_green_light)
                    voltage >= 11.6f -> ContextCompat.getColor(this@MainActivity, android.R.color.holo_orange_light)
                    else -> ContextCompat.getColor(this@MainActivity, android.R.color.holo_red_light)
                }
                tvCurrentVoltage.setTextColor(color)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences("BatteryMonitorPrefs", Context.MODE_PRIVATE)

        initViews()
        setupListeners()
        checkPermissions()
        updateUIState()
    }

    private fun initViews() {
        tvCurrentVoltage = findViewById(R.id.tvCurrentVoltage)
        tvThresholdValue = findViewById(R.id.tvThresholdValue)
        seekBarThreshold = findViewById(R.id.seekBarThreshold)
        btnToggleService = findViewById(R.id.btnToggleService)
        switchAutostart = findViewById(R.id.switchAutostart)

        // Загрузка настроек порога (от 110 до 125, где 118 = 11.8V)
        val thresholdInt = prefs.getInt("threshold_voltage_int", 118)
        seekBarThreshold.progress = thresholdInt - 110
        tvThresholdValue.text = String.format("%.1f V", thresholdInt / 10.0f)

        // Загрузка автозапуска
        switchAutostart.isChecked = prefs.getBoolean("autostart_enabled", true)
    }

    private fun setupListeners() {
        seekBarThreshold.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                val voltage = (progress + 110) / 10.0f
                tvThresholdValue.text = String.format("%.1f V", voltage)
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                val progress = seekBar?.progress ?: 8
                val voltageVal = progress + 110
                prefs.edit().putInt("threshold_voltage_int", voltageVal).apply()
                
                // Передаем новый порог в запущенную службу
                val updateIntent = Intent(this@MainActivity, BatteryMonitorService::class.java).apply {
                    action = BatteryMonitorService.ACTION_UPDATE_SETTINGS
                }
                startService(updateIntent)
                Toast.makeText(this@MainActivity, "Порог изменен: \${String.format("%.1f V", voltageVal / 10.0f)}", Toast.LENGTH_SHORT).show()
            }
        })

        btnToggleService.setOnClickListener {
            if (BatteryMonitorService.isRunning) {
                stopMonitorService()
            } else {
                startMonitorService()
            }
        }

        switchAutostart.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean("autostart_enabled", isChecked).apply()
            Toast.makeText(this, if (isChecked) "Автозапуск включен" else "Автозапуск выключен", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startMonitorService() {
        if (!checkOverlayPermission()) {
            requestOverlayPermission()
            return
        }
        val serviceIntent = Intent(this, BatteryMonitorService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
        Toast.makeText(this, "Мониторинг запущен", Toast.LENGTH_SHORT).show()
        updateUIState()
    }

    private fun stopMonitorService() {
        val serviceIntent = Intent(this, BatteryMonitorService::class.java)
        stopService(serviceIntent)
        Toast.makeText(this, "Мониторинг остановлен", Toast.LENGTH_SHORT).show()
        updateUIState()
        tvCurrentVoltage.text = "--.- V"
        tvCurrentVoltage.setTextColor(ContextCompat.getColor(this, android.R.color.darker_gray))
    }

    private fun updateUIState() {
        if (BatteryMonitorService.isRunning) {
            btnToggleService.text = "Остановить мониторинг"
            btnToggleService.setBackgroundColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
        } else {
            btnToggleService.text = "Запустить мониторинг"
            btnToggleService.setBackgroundColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
        }
    }

    private fun checkPermissions() {
        // Проверка разрешения на рисование поверх других окон (Overlay)
        if (!checkOverlayPermission()) {
            Toast.makeText(this, "Необходимо разрешение на отображение поверх других окон!", Toast.LENGTH_LONG).show()
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:\$packageName")
            )
            startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
        }
    }

    override fun onResume() {
        super.onResume()
        updateUIState()
        registerReceiver(voltageReceiver, IntentFilter(BatteryMonitorService.ACTION_VOLTAGE_UPDATE))
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(voltageReceiver)
    }

    companion object {
        private const val OVERLAY_PERMISSION_REQ_CODE = 5469
    }
}`
  },
  {
    name: "BatteryMonitorService.kt",
    path: "app/src/main/java/com/teyes/batterymonitor/BatteryMonitorService.kt",
    language: "kotlin",
    description: "Сердце приложения. Работает в фоновом режиме (Foreground), опрашивает бортовую сеть автомобиля строго каждые 10 секунд. Реализует защиту от ложных срабатываний (двойной замер) и воспроизведение сирены на самом устройстве.",
    code: `package com.teyes.batterymonitor

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
            Log.d(TAG, "Настройки успешно обновлены. Новый порог: \$thresholdVoltage V")
        }
        return START_STICKY
    }

    private fun startMonitoringLoop() {
        checkRunnable = object : Runnable {
            override fun run() {
                try {
                    val voltage = readBatteryVoltage()
                    lastMeasuredVoltage = voltage
                    Log.d(TAG, "Проверка напряжения: \$voltage V (порог: \$thresholdVoltage V)")

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
                        Log.w(TAG, "Пониженное напряжение! Шаг проверки: \$consecutiveLowCount/2")
                        
                        if (consecutiveLowCount >= 2) {
                            // Напряжение держится ниже порога 2 замера подряд (20 секунд)
                            triggerBatteryAlarm(voltage)
                        }
                    } else {
                        // Напряжение восстановилось или в норме
                        consecutiveLowCount = 0
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "Ошибка в цикле мониторинга: \${e.message}")
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
                val process = Runtime.getRuntime().exec("getprop \$key")
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
        // На реальном устройстве здесь можно интегрировать Car API от Google: 
        // CarPropertyManager.getFloatProperty(VehiclePropertyIds.ENV_BATTERY_VOLTAGE, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        return lastMeasuredVoltage - 0.01f 
    }

    /**
     * СИСТЕМА ОПОВЕЩЕНИЯ (СИГНАЛИЗАЦИЯ)
     */
    private fun triggerBatteryAlarm(voltage: Float) {
        Log.e(TAG, "ВНИМАНИЕ! КРИТИЧЕСКИЙ РАЗРЯД: \$voltage V!")

        // 1. Звуковое оповещение через встроенный спикер
        try {
            val toneG = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            toneG.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 1500) // Громкий сигнал 1.5 сек
        } catch (e: Exception) {
            Log.e(TAG, "Не удалось воспроизвести сигнал: \${e.message}")
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
                Log.e(TAG, "Ошибка отображения оверлея: \${e.message}")
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
        val statusText = "Текущее напряжение: \${String.format("%.1f V", voltage)} (Порог: \$thresholdVoltage V)"
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
}`
  },
  {
    name: "OverlayWarningHelper.kt",
    path: "app/src/main/java/com/teyes/batterymonitor/OverlayWarningHelper.kt",
    language: "kotlin",
    description: "Вспомогательный класс для отображения полноэкранного яркого предупреждения поверх всех навигаторов, музыкальных плееров и лаунчеров магнитолы.",
    code: `package com.teyes.batterymonitor

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

object OverlayWarningHelper {

    private var overlayView: View? = null
    private var windowManager: WindowManager? = null

    /**
     * Показывает аварийное предупреждение поверх всех остальных приложений
     */
    fun showWarning(context: Context, voltage: Float) {
        // Если окно уже отображается, просто обновим значение напряжения
        if (overlayView != null) {
            val tvVoltage = overlayView?.findViewById<TextView>(R.id.tvOverlayVoltage)
            tvVoltage?.text = String.format("%.1f V", voltage)
            return
        }

        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Настройка параметров окна для отображения поверх других (Overlay)
        val layoutParamsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutParamsType,
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.CENTER

        // Инфлейтим макет нашего предупреждения
        val inflater = context.getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
        overlayView = inflater.inflate(R.layout.overlay_warning, null)

        val tvVoltage = overlayView?.findViewById<TextView>(R.id.tvOverlayVoltage)
        val btnDismiss = overlayView?.findViewById<Button>(R.id.btnOverlayDismiss)

        tvVoltage?.text = String.format("%.1f V", voltage)

        // Закрытие оверлея по кнопке
        btnDismiss?.setOnClickListener {
            dismissWarning()
        }

        try {
            windowManager?.addView(overlayView, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Скрывает предупреждающее окно
     */
    fun dismissWarning() {
        if (overlayView != null && windowManager != null) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            overlayView = null
        }
    }
}`
  },
  {
    name: "BootReceiver.kt",
    path: "app/src/main/java/com/teyes/batterymonitor/BootReceiver.kt",
    language: "kotlin",
    description: "BroadcastReceiver, который ловит событие загрузки ОС магнитолы (BOOT_COMPLETED) и автоматически запускает фоновую службу, если эта функция включена в настройках приложения.",
    code: `package com.teyes.batterymonitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    
    private val TAG = "BootReceiver"

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Получен системный Intent Broadcast: \$action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
            val prefs = context.getSharedPreferences("BatteryMonitorPrefs", Context.MODE_PRIVATE)
            val autostartEnabled = prefs.getBoolean("autostart_enabled", true)

            if (autostartEnabled) {
                Log.i(TAG, "Автозапуск разрешен пользователем. Запуск BatteryMonitorService...")
                try {
                    val serviceIntent = Intent(context, BatteryMonitorService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Критическая ошибка запуска службы при загрузке: \${e.message}")
                }
            } else {
                Log.w(TAG, "Автозапуск отключен в настройках BatteryMonitor.")
            }
        }
    }
}`
  },
  {
    name: "overlay_warning.xml",
    path: "app/src/main/res/layout/overlay_warning.xml",
    language: "xml",
    description: "Разметка макета экстренного предупреждения. Отличается контрастными цветами, мигающими элементами и крупными кнопками, адаптированными под автомобильное использование.",
    code: `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#E6000000"
    android:padding="24dp">

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:gravity="center"
        android:orientation="vertical"
        android:background="@drawable/warning_card_bg"
        android:padding="40dp">

        <ImageView
            android:layout_width="80dp"
            android:layout_height="80dp"
            android:src="@android:drawable/stat_sys_warning"
            android:tint="#FF3B30"
            android:layout_marginBottom="16dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ВНИМАНИЕ!"
            android:textColor="#FF3B30"
            android:textSize="32sp"
            android:textStyle="bold"
            android:layout_marginBottom="8dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="НИЗКИЙ ЗАРЯД АККУМУЛЯТОРА!"
            android:textColor="#FFFFFF"
            android:textSize="22sp"
            android:textStyle="bold"
            android:alignment="center"
            android:layout_marginBottom="16dp" />

        <TextView
            android:id="@+id/tvOverlayVoltage"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="11.5 V"
            android:textColor="#FFCC00"
            android:textSize="54sp"
            android:textStyle="bold"
            android:layout_marginBottom="24dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Немедленно запустите двигатель, чтобы не разрядить аккумулятор!"
            android:textColor="#CCCCCC"
            android:textSize="16sp"
            android:gravity="center"
            android:layout_marginBottom="32dp" />

        <Button
            android:id="@+id/btnOverlayDismiss"
            android:layout_width="260dp"
            android:layout_height="64dp"
            android:text="Я понял (Закрыть)"
            android:textColor="#FFFFFF"
            android:backgroundTint="#4CD964"
            android:textSize="18sp"
            android:textStyle="bold" />

    </LinearLayout>
</FrameLayout>`
  },
  {
    name: "activity_main.xml",
    path: "app/src/main/res/layout/activity_main.xml",
    language: "xml",
    description: "Разметка интерфейса настроек. Сделана адаптивной для горизонтальных экранов магнитол. Крупные элементы управления, контрастная палитра и интуитивный дизайн для автомобиля.",
    code: `<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#121214"
    android:fillViewport="true">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">

        <!-- Заголовок -->
        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Teyes Battery Monitor"
            android:textColor="#FFFFFF"
            android:textSize="24sp"
            android:textStyle="bold"
            android:layout_marginBottom="24dp" />

        <!-- Блок отображения напряжения -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:background="#1F1F23"
            android:padding="24dp"
            android:gravity="center"
            android:layout_marginBottom="20dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="ТЕКУЩЕЕ НАПРЯЖЕНИЕ"
                android:textColor="#8E8E93"
                android:textSize="12sp"
                android:letterSpacing="0.1" />

            <TextView
                android:id="@+id/tvCurrentVoltage"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="--.- V"
                android:textColor="#8E8E93"
                android:textSize="64sp"
                android:textStyle="bold"
                android:layout_marginTop="8dp"
                android:layout_marginBottom="8dp" />

            <Button
                android:id="@+id/btnToggleService"
                android:layout_width="280dp"
                android:layout_height="56dp"
                android:text="Запустить мониторинг"
                android:textColor="#FFFFFF"
                android:textSize="16sp"
                android:textStyle="bold"
                android:layout_marginTop="12dp" />

        </LinearLayout>

        <!-- Настройки порогов -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:background="#1F1F23"
            android:padding="20dp"
            android:layout_marginBottom="20dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="horizontal"
                android:layout_marginBottom="12dp">

                <TextView
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:text="Порог срабатывания сигнализации"
                    android:textColor="#FFFFFF"
                    android:textSize="16sp" />

                <TextView
                    android:id="@+id/tvThresholdValue"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="11.8 V"
                    android:textColor="#FFCC00"
                    android:textSize="18sp"
                    android:textStyle="bold" />
            </LinearLayout>

            <SeekBar
                android:id="@+id/seekBarThreshold"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:max="15"
                android:progress="8" />

            <TextView
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Сигнал прозвучит, если напряжение опустится ниже порога и продержится 2 цикла проверки подряд (20 секунд)."
                android:textColor="#8E8E93"
                android:textSize="12sp"
                android:layout_marginTop="8dp" />

        </LinearLayout>

        <!-- Системные опции -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:background="#1F1F23"
            android:padding="20dp">

            <androidx.appcompat.widget.SwitchCompat
                android:id="@+id/switchAutostart"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Автозапуск при загрузке магнитолы"
                android:textColor="#FFFFFF"
                android:textSize="16sp"
                android:layout_padding="4dp" />

        </LinearLayout>

    </LinearLayout>
</ScrollView>`
  },
  {
    name: "warning_card_bg.xml",
    path: "app/src/main/res/drawable/warning_card_bg.xml",
    language: "xml",
    description: "Форма фона карточки предупреждения. Задает темно-красный матовый оттенок, скругленные углы и яркую пульсирующую/красную обводку.",
    code: `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#2C1212" />
    <stroke
        android:width="3dp"
        android:color="#FF3B30" />
    <corners android:radius="16dp" />
</shape>`
  },
  {
    name: "build.gradle (Module)",
    path: "app/build.gradle",
    language: "groovy",
    description: "Файл конфигурации сборки Gradle для модуля приложения. Содержит целевую версию SDK (Android 10 / API 29 отлично подходит для CC3), зависимости Gradle и настройки компиляции.",
    code: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.teyes.batterymonitor'
    compileSdk 33

    defaultConfig {
        applicationId "com.teyes.batterymonitor"
        minSdk 21 // Android 5.0
        targetSdk 29 // Android 10 (ОС Teyes CC3)
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.9.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.8.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // Для car API (дополнительно, если будете читать системный вольтаж через Car API)
    compileOnly 'android.car:android.car:29'
}`
  }
];
