package com.kiosk.app

import android.app.ActivityOptions
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.util.Log

/**
 * Global UncaughtExceptionHandler that intercepts fatal application crashes,
 * suppresses system "App has stopped" dialogs, and triggers an immediate
 * automated recovery relaunch via KioskWatchdogService, AlarmManager, and detached subshells.
 */
class KioskCrashHandler private constructor(private val context: Context) : Thread.UncaughtExceptionHandler {

    private val defaultHandler: Thread.UncaughtExceptionHandler? = Thread.getDefaultUncaughtExceptionHandler()

    companion object {
        private const val TAG = "KioskCrashHandler"
        private const val PREFS_NAME = "kiosk_crash_prefs"
        private const val KEY_LAST_CRASH_TIME = "last_crash_time"
        private const val KEY_CRASH_COUNT = "recent_crash_count"
        private const val CRASH_WINDOW_MS = 30000L // 30 seconds
        private const val MAX_CRASH_BURST = 5 // Max 5 rapid crashes before inserting a brief delay

        fun install(context: Context) {
            val handler = KioskCrashHandler(context.applicationContext)
            Thread.setDefaultUncaughtExceptionHandler(handler)
            Log.i(TAG, "KioskCrashHandler installed successfully as default UncaughtExceptionHandler.")
        }
    }

    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        Log.e(TAG, "FATAL CRASH INTERCEPTED on thread '${thread.name}': ${throwable.message}", throwable)

        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            val lastCrash = prefs.getLong(KEY_LAST_CRASH_TIME, 0L)
            var count = prefs.getInt(KEY_CRASH_COUNT, 0)

            if (now - lastCrash < CRASH_WINDOW_MS) {
                count++
            } else {
                count = 1
            }

            prefs.edit()
                .putLong(KEY_LAST_CRASH_TIME, now)
                .putInt(KEY_CRASH_COUNT, count)
                .commit()

            val delayMs = if (count > MAX_CRASH_BURST) 3000L else 1000L
            Log.i(TAG, "Initiating auto-restart sequence after crash (Crash count: $count, delay: ${delayMs}ms)...")

            // 1. Start isolated watchdog service (runs in separate :kiosk_watchdog process)
            KioskWatchdogService.startWatchdog(context, "Crash recovery: ${throwable.javaClass.simpleName} - ${throwable.message}", Process.myPid())

            // 2. Schedule direct AlarmManager wakeup for MainActivity with BAL permission
            scheduleAlarmRestart(delayMs)

            // 3. Launch detached background subshell as extra redundancy
            try {
                val restartScript = "nohup sh -c 'sleep 1 && am start -n ${context.packageName}/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-brought-to-front' >/dev/null 2>&1 &"
                Runtime.getRuntime().exec(arrayOf("sh", "-c", restartScript))
            } catch (_: Exception) {}

        } catch (e: Exception) {
            Log.e(TAG, "Error during crash recovery orchestration", e)
        } finally {
            // Terminate the broken process immediately so Android does not show the "App has stopped" dialog
            Process.killProcess(Process.myPid())
            System.exit(10)
        }
    }

    private fun scheduleAlarmRestart(delayMs: Long) {
        try {
            val intent = Intent(context, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TASK or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra("EXTRA_RESTARTED_POST_CRASH", true)
            }

            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_ONE_SHOT
            }

            val pendingIntent = PendingIntent.getActivity(context, 7777, intent, pendingFlags)

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val triggerTime = System.currentTimeMillis() + delayMs

            if (alarmManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
                Log.i(TAG, "Scheduled AlarmManager restart in ${delayMs}ms with BAL privileges.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule AlarmManager restart", e)
        }
    }
}
