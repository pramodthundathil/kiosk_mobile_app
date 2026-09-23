package com.kiosk.app

import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Automatically relaunches MainActivity immediately after an OTA APK update
 * (ACTION_MY_PACKAGE_REPLACED) or device boot (ACTION_BOOT_COMPLETED, LOCKED_BOOT_COMPLETED, etc.),
 * ensuring unattended kiosk continuity. Starts KioskWatchdogService to guarantee continuous
 * retry until the kiosk app is successfully popped up and active on screen.
 */
class KioskPackageReplacedReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "KioskBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: "UNKNOWN"
        Log.i(TAG, "Received broadcast action: $action")

        // 1. Start the watchdog service to continuously retry launching until the app is confirmed open
        KioskWatchdogService.startWatchdog(context, "System event: $action")

        val optionsBundle = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ActivityOptions.makeBasic().apply {
                setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                )
            }.toBundle()
        } else {
            null
        }

        // 2. Attempt immediate foreground start via launchIntent
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("EXTRA_RESTARTED_POST_UPDATE", true)
            }
            if (launchIntent != null) {
                if (optionsBundle != null) {
                    context.startActivity(launchIntent, optionsBundle)
                } else {
                    context.startActivity(launchIntent)
                }
                Log.i(TAG, "Immediate kiosk foreground start dispatched via startActivity.")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Immediate launch via startActivity failed: ${e.message}")
        }

        // 3. Dispatch via PendingIntent with BAL permissions
        try {
            val piIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("EXTRA_RESTARTED_POST_UPDATE", true)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pi = PendingIntent.getActivity(context, 9090, piIntent, flags)
            if (optionsBundle != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                pi.send(context, 0, null, null, null, null, optionsBundle)
            } else {
                pi.send()
            }
            Log.i(TAG, "PendingIntent launch dispatched from receiver.")
        } catch (e: Exception) {
            Log.w(TAG, "PendingIntent dispatch from receiver failed: ${e.message}")
        }

        // 4. Shell or root fallback
        try {
            val cmd = "am start -n ${context.packageName}/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-brought-to-front"
            Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
        } catch (_: Exception) {}
    }
}
