package com.kiosk.app

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * DeviceAdminReceiver enabling Android Device Owner / Kiosk Managed Mode.
 * Allows silent package installation via PackageInstaller and system lock task enforcement.
 */
class KioskDeviceAdminReceiver : DeviceAdminReceiver() {
    companion object {
        private const val TAG = "KioskDeviceAdmin"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Admin enabled for package ${context.packageName}")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Device Admin disabled for package ${context.packageName}")
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.i(TAG, "Kiosk entered lock task mode: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.w(TAG, "Kiosk exited lock task mode")
    }
}
