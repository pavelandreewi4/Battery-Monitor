package com.teyes.batterymonitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent == null || context == null) return

        val action = intent.action
        Log.d("BootReceiver", "Получено системное событие: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
            val prefs = context.getSharedPreferences("BatteryMonitorPrefs", Context.MODE_PRIVATE)
            val autostartEnabled = prefs.getBoolean("autostart_enabled", true)

            if (autostartEnabled) {
                Log.i("BootReceiver", "Автозапуск включен. Запуск фоновой службы мониторинга АКБ Teyes...")
                val serviceIntent = Intent(context, BatteryMonitorService::class.java)
                try {
                    ContextCompat.startForegroundService(context, serviceIntent)
                } catch (e: Exception) {
                    Log.e("BootReceiver", "Не удалось запустить службу: ${e.message}")
                }
            } else {
                Log.i("BootReceiver", "Автозапуск отключен в настройках пользователем.")
            }
        }
    }
}
