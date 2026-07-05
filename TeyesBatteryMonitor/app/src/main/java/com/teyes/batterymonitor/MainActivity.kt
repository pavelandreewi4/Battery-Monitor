package com.teyes.batterymonitor

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
                Toast.makeText(this@MainActivity, "Порог изменен: ${String.format("%.1f V", voltageVal / 10.0f)}", Toast.LENGTH_SHORT).show()
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
                Uri.parse("package:$packageName")
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
}
