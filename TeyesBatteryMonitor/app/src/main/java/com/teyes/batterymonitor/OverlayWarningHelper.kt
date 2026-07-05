package com.teyes.batterymonitor

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

object OverlayWarningHelper {

    private var overlayView: View? = null

    @Synchronized
    fun showWarning(context: Context, voltage: Float) {
        // Если окно уже отображается, просто обновляем в нем вольтаж
        if (overlayView != null) {
            updateVoltage(voltage)
            return
        }

        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val inflater = context.getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater

        // Инфлейтим разметку предупреждения
        val view = inflater.inflate(R.layout.overlay_warning, null)
        overlayView = view

        // Настраиваем заголовок и вольтаж
        val tvOverlayVoltage = view.findViewById<TextView>(R.id.tvOverlayVoltage)
        tvOverlayVoltage.text = String.format("%.1f V", voltage)

        // Кнопка закрытия
        val btnCloseOverlay = view.findViewById<Button>(R.id.btnCloseOverlay)
        btnCloseOverlay.setOnClickListener {
            dismiss()
        }

        // Параметры отображения поверх окон для разных версий Android
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        )

        try {
            windowManager.addView(view, params)
        } catch (e: Exception) {
            e.printStackTrace()
            overlayView = null
        }
    }

    private fun updateVoltage(voltage: Float) {
        overlayView?.let { view ->
            val tvOverlayVoltage = view.findViewById<TextView>(R.id.tvOverlayVoltage)
            tvOverlayVoltage?.text = String.format("%.1f V", voltage)
        }
    }

    @Synchronized
    fun dismiss() {
        overlayView?.let { view ->
            try {
                val windowManager = view.context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                windowManager.removeView(view)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            overlayView = null
        }
    }
}
