package com.kiosk.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Automatically relaunches MainActivity immediately after an OTA APK update
 * (ACTION_MY_PACKAGE_REPLACED) or device boot (ACTION_BOOT_COMPLETED),
 * ensuring unattended kiosk continuity without requiring manual operator intervention.
 */
class KioskPackageReplacedReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "KioskPackageReplaced"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.i(TAG, "Received broadcast action: $action")

        if (Intent.ACTION_MY_PACKAGE_REPLACED == action || Intent.ACTION_BOOT_COMPLETED == action) {
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                    launchIntent.putExtra("EXTRA_RESTARTED_POST_UPDATE", true)
                    context.startActivity(launchIntent)
                    Log.i(TAG, "Successfully triggered kiosk foreground restart.")
                } else {
                    Log.e(TAG, "Launch intent for package was null.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to relaunch kiosk application post update", e)
            }
        }
    }
}
