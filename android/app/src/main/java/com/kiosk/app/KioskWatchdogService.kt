package com.kiosk.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Isolated process watchdog service (`:kiosk_watchdog`).
 * Stays alive during app crashes, package updates, and system reboots to continuously
 * trigger launch attempts until MainActivity is confirmed visible and active on screen.
 */
class KioskWatchdogService : Service() {

    companion object {
        private const val TAG = "KioskWatchdogService"
        const val ACTION_START_WATCHDOG = "com.kiosk.app.ACTION_START_WATCHDOG"
        const val ACTION_NOTIFY_FOREGROUND = "com.kiosk.app.ACTION_NOTIFY_FOREGROUND"
        const val ACTION_STOP_WATCHDOG = "com.kiosk.app.ACTION_STOP_WATCHDOG"

        private const val NOTIFICATION_CHANNEL_ID = "kiosk_watchdog_channel"
        private const val NOTIFICATION_ID = 9001
        private const val CHECK_INTERVAL_MS = 2000L
        private const val MAX_RETRY_COUNT = 30 // Retries for up to 60 seconds

        @Volatile
        private var isAppInForeground = false

        fun startWatchdog(context: Context, reason: String = "Watchdog triggered", crashedPid: Int = -1) {
            try {
                isAppInForeground = false
                val intent = Intent(context, KioskWatchdogService::class.java).apply {
                    action = ACTION_START_WATCHDOG
                    putExtra("EXTRA_REASON", reason)
                    putExtra("EXTRA_CRASHED_PID", crashedPid)
                }
                context.startService(intent)
                Log.i(TAG, "Triggered KioskWatchdogService start. Reason: $reason (crashedPid: $crashedPid)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start KioskWatchdogService", e)
            }
        }

        fun notifyAppForeground(context: Context) {
            isAppInForeground = true
            try {
                val intent = Intent(context, KioskWatchdogService::class.java).apply {
                    action = ACTION_NOTIFY_FOREGROUND
                }
                context.startService(intent)
                Log.i(TAG, "Sent ACTION_NOTIFY_FOREGROUND to KioskWatchdogService.")
            } catch (e: Exception) {
                Log.d(TAG, "Watchdog already stopped or unreachable: ${e.message}")
            }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var retryCount = 0
    private var isRunning = false

    private val watchdogRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return

            if (checkIfAppInForeground()) {
                Log.i(TAG, "Kiosk MainActivity confirmed active in foreground! Mission accomplished. Stopping watchdog.")
                stopWatchdog()
                return
            }

            retryCount++
            Log.i(TAG, "Kiosk app not yet in foreground. Attempting relaunch (Attempt $retryCount / $MAX_RETRY_COUNT)...")

            relaunchApp()

            if (retryCount < MAX_RETRY_COUNT) {
                handler.postDelayed(this, CHECK_INTERVAL_MS)
            } else {
                Log.w(TAG, "Watchdog reached max retry limit ($MAX_RETRY_COUNT). Stopping to prevent resource drain.")
                stopWatchdog()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private var ignoreCrashedPid = -1

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val reason = intent?.getStringExtra("EXTRA_REASON") ?: "Unknown"
        ignoreCrashedPid = intent?.getIntExtra("EXTRA_CRASHED_PID", -1) ?: -1

        when (action) {
            ACTION_NOTIFY_FOREGROUND -> {
                Log.i(TAG, "Received ACTION_NOTIFY_FOREGROUND: App is active.")
                isAppInForeground = true
                stopWatchdog()
                return START_NOT_STICKY
            }
            ACTION_STOP_WATCHDOG -> {
                Log.i(TAG, "Received ACTION_STOP_WATCHDOG.")
                stopWatchdog()
                return START_NOT_STICKY
            }
            ACTION_START_WATCHDOG, null -> {
                Log.i(TAG, "Starting watchdog loop. Reason: $reason (ignoring pid $ignoreCrashedPid)")
                isAppInForeground = false
                retryCount = 0
                isRunning = true

                // Safely promote to foreground if possible without crashing on Android 14+
                try {
                    val notif = buildForegroundNotification("Kiosk Guardian Active", "Ensuring kiosk display stays open")
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ServiceCompat.startForeground(
                            this,
                            NOTIFICATION_ID,
                            notif,
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                            } else {
                                0
                            }
                        )
                    } else {
                        startForeground(NOTIFICATION_ID, notif)
                    }
                } catch (t: Throwable) {
                    Log.w(TAG, "startForeground non-fatal notice: ${t.message}")
                }

                handler.removeCallbacks(watchdogRunnable)
                // Wait 1.2s before first check to allow dying process to terminate cleanly
                handler.postDelayed(watchdogRunnable, 1200L)
            }
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun relaunchApp() {
        // Build BAL (Background Activity Launch) allowed ActivityOptions bundle
        val optionsBundle = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ActivityOptions.makeBasic().apply {
                setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                )
            }.toBundle()
        } else {
            null
        }

        // Strategy 1: Standard Activity Launch Intent
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("EXTRA_RESTARTED_BY_WATCHDOG", true)
            }
            if (launchIntent != null) {
                if (optionsBundle != null) {
                    startActivity(launchIntent, optionsBundle)
                } else {
                    startActivity(launchIntent)
                }
                Log.i(TAG, "Strategy 1: Fired package launchIntent.")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Strategy 1 (startActivity) failed: ${e.message}")
        }

        // Strategy 2: High-Priority FullScreen PendingIntent & Direct Send
        // Bypasses Android 10-16 Background Activity Start restrictions
        try {
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("EXTRA_RESTARTED_BY_WATCHDOG", true)
            }
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val fullScreenPending = PendingIntent.getActivity(this, 8888, mainIntent, pendingFlags)

            // A) Send PendingIntent directly with background activity start permissions
            try {
                if (optionsBundle != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    fullScreenPending.send(this, 0, null, null, null, null, optionsBundle)
                } else {
                    fullScreenPending.send()
                }
                Log.i(TAG, "Strategy 2A: Direct PendingIntent.send() dispatched.")
            } catch (sendErr: Exception) {
                Log.w(TAG, "Strategy 2A direct send failed: ${sendErr.message}")
            }

            // B) Also post high-priority full-screen intent notification
            val fullScreenNotification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Kiosk Display Recovery")
                .setContentText("Restoring kiosk screen...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPending, true)
                .setAutoCancel(true)
                .build()

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID + 1, fullScreenNotification)
            Log.i(TAG, "Strategy 2B: Full-screen notification posted.")
        } catch (e: Exception) {
            Log.w(TAG, "Strategy 2 (fullScreenIntent) failed: ${e.message}")
        }

        // Strategy 3: Root or Shell 'am start'
        tryShellOrRootAmStart()
    }

    private fun tryShellOrRootAmStart() {
        val suPaths = arrayOf("su", "/system/bin/su", "/system/xbin/su", "/vendor/bin/su", "/sbin/su", "sh")
        for (su in suPaths) {
            try {
                val cmd = "am start -n $packageName/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-brought-to-front"
                val proc = Runtime.getRuntime().exec(arrayOf(su, "-c", cmd))
                val exitCode = proc.waitFor()
                if (exitCode == 0) {
                    Log.i(TAG, "Strategy 3: '$su' am start executed successfully.")
                    return
                }
            } catch (_: Exception) {}
        }
    }

    private fun checkIfAppInForeground(): Boolean {
        if (isAppInForeground) return true

        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            if (activityManager != null) {
                val processes = activityManager.runningAppProcesses
                if (processes != null) {
                    for (appProcess in processes) {
                        if (appProcess.processName == packageName) {
                            if (ignoreCrashedPid > 0 && appProcess.pid == ignoreCrashedPid) {
                                Log.d(TAG, "Ignoring dying pid $ignoreCrashedPid in process check")
                                continue
                            }
                            if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                                isAppInForeground = true
                                return true
                            }
                        }
                    }
                }

                // Check via AppTasks
                val appTasks = activityManager.appTasks
                if (appTasks != null && appTasks.isNotEmpty()) {
                    for (task in appTasks) {
                        val taskInfo = task.taskInfo
                        val topActivity = taskInfo.topActivity
                        if (topActivity != null && topActivity.packageName == packageName) {
                            if (taskInfo.isVisible) {
                                isAppInForeground = true
                                return true
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking app foreground status: ${e.message}")
        }

        return false
    }

    private fun stopWatchdog() {
        isRunning = false
        handler.removeCallbacks(watchdogRunnable)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (_: Exception) {}
        stopSelf()
        Log.i(TAG, "Watchdog service stopped.")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Kiosk Watchdog Guardian",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Keeps kiosk application running continuously"
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(title: String, text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(this, 0, launchIntent, pendingFlags)
        } else null

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        handler.removeCallbacks(watchdogRunnable)
        Log.i(TAG, "KioskWatchdogService destroyed.")
    }
}
