package com.kiosk.app

import android.app.Activity
import android.app.ActivityManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class KioskUpdateModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "KioskUpdateModule"
        private const val ACTION_INSTALL_STATUS = "com.kiosk.app.INSTALL_STATUS"
    }

    override fun getName(): String = "KioskUpdateModule"

    private val devicePolicyManager: DevicePolicyManager?
        get() = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager

    private val activityManager: ActivityManager?
        get() = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager

    @ReactMethod
    fun getAppVersionInfo(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val pInfo = pm.getPackageInfo(reactContext.packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            val isOwner = devicePolicyManager?.isDeviceOwnerApp(reactContext.packageName) ?: false

            val map = Arguments.createMap().apply {
                putString("versionName", pInfo.versionName ?: "1.0.0")
                putDouble("versionCode", versionCode.toDouble())
                putString("packageName", reactContext.packageName)
                putBoolean("isDeviceOwner", isOwner)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("VERSION_INFO_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        try {
            val isOwner = devicePolicyManager?.isDeviceOwnerApp(reactContext.packageName) ?: false
            promise.resolve(isOwner)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isLockTaskMode(promise: Promise) {
        try {
            val state = activityManager?.lockTaskModeState ?: ActivityManager.LOCK_TASK_MODE_NONE
            promise.resolve(state != ActivityManager.LOCK_TASK_MODE_NONE)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startLockTask(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.startLockTask()
                promise.resolve(true)
            } else {
                promise.reject("ACTIVITY_NULL", "Current activity is null.")
            }
        } catch (e: Exception) {
            promise.reject("LOCK_TASK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopLockTask(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.stopLockTask()
                promise.resolve(true)
            } else {
                promise.reject("ACTIVITY_NULL", "Current activity is null.")
            }
        } catch (e: Exception) {
            promise.reject("STOP_LOCK_TASK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun downloadAndVerifyApk(urlStr: String, expectedSha256: String, promise: Promise) {
        Thread {
            try {
                val updatesDir = File(reactContext.cacheDir, "updates")
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs()
                }

                val targetFile = File(updatesDir, "update.apk")
                if (targetFile.exists()) {
                    targetFile.delete()
                }

                Log.i(TAG, "Starting streaming APK download from $urlStr to ${targetFile.absolutePath}")

                var currentUrlStr = urlStr
                var connection: HttpURLConnection? = null
                var redirects = 0
                val maxRedirects = 5

                while (redirects < maxRedirects) {
                    val url = URL(currentUrlStr)
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        connectTimeout = 30000
                        readTimeout = 60000
                        requestMethod = "GET"
                        instanceFollowRedirects = true
                        setRequestProperty("Accept-Encoding", "identity")
                        setRequestProperty("User-Agent", "KioskTerminal/1.0")
                    }
                    conn.connect()

                    val status = conn.responseCode
                    if (status == HttpURLConnection.HTTP_MOVED_PERM ||
                        status == HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == HttpURLConnection.HTTP_SEE_OTHER ||
                        status == 307 || status == 308) {
                        val location = conn.getHeaderField("Location")
                        conn.disconnect()
                        if (!location.isNullOrEmpty()) {
                            currentUrlStr = if (location.startsWith("http://") || location.startsWith("https://")) {
                                location
                            } else {
                                URL(url, location).toString()
                            }
                            redirects++
                            continue
                        }
                    }
                    connection = conn
                    break
                }

                if (connection == null || connection.responseCode != HttpURLConnection.HTTP_OK) {
                    val code = connection?.responseCode ?: -1
                    val msg = connection?.responseMessage ?: "Unknown network error"
                    promise.reject(
                        "DOWNLOAD_HTTP_ERROR",
                        "Server returned HTTP $code $msg for $urlStr"
                    )
                    return@Thread
                }

                val contentLength = connection.contentLength
                val inputStream: InputStream = connection.inputStream
                val outputStream = FileOutputStream(targetFile)
                val digest = MessageDigest.getInstance("SHA-256")

                val buffer = ByteArray(65536)
                var bytesRead: Int
                var totalBytesRead: Long = 0

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    digest.update(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()
                connection.disconnect()

                val computedSha256 = digest.digest().joinToString("") { "%02x".format(it) }
                Log.i(TAG, "Download finished. Size: $totalBytesRead bytes. Computed SHA256: $computedSha256")

                val cleanExpected = expectedSha256.trim().lowercase()
                if (cleanExpected.isNotEmpty() && !cleanExpected.equals(computedSha256, ignoreCase = true)) {
                    targetFile.delete()
                    Log.e(TAG, "Checksum mismatch! Expected: $cleanExpected, Computed: $computedSha256")
                    promise.reject(
                        "SHA256_MISMATCH",
                        "APK checksum verification failed. Expected $cleanExpected but got $computedSha256"
                    )
                    return@Thread
                }

                val res = Arguments.createMap().apply {
                    putString("filePath", targetFile.absolutePath)
                    putDouble("fileSize", targetFile.length().toDouble())
                    putString("sha256", computedSha256)
                }
                promise.resolve(res)
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading APK", e)
                promise.reject("DOWNLOAD_EXCEPTION", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun installApk(filePath: String, promise: Promise) {
        val apkFile = File(filePath)
        if (!apkFile.exists() || apkFile.length() == 0L) {
            promise.reject("FILE_NOT_FOUND", "APK file does not exist at $filePath")
            return
        }

        val isOwner = devicePolicyManager?.isDeviceOwnerApp(reactContext.packageName) ?: false
        Log.i(TAG, "Initiating silent APK installation: file=$filePath, isDeviceOwner=$isOwner")

        Thread {
            try {
                // 1. First attempt: Root / SU background installation (instantaneous, 100% silent on rooted kiosk/TV hardware)
                if (tryRootInstall(apkFile)) {
                    Log.i(TAG, "Root silent install succeeded.")
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("method", "ROOT_SILENT")
                    })
                    return@Thread
                }

                // 2. Second attempt: Android PackageInstaller session (silent on Android 12+ or Device Owner)
                installViaPackageInstallerSession(apkFile, promise)
            } catch (e: Exception) {
                Log.e(TAG, "Error during silent install attempt", e)
                promise.reject("INSTALL_ERROR", e.message, e)
            }
        }.start()
    }

    private fun tryRootInstall(apkFile: File): Boolean {
        val suPaths = arrayOf("su", "/system/bin/su", "/system/xbin/su", "/vendor/bin/su", "/sbin/su")
        for (su in suPaths) {
            try {
                val testProc = Runtime.getRuntime().exec(arrayOf(su, "-c", "id"))
                val testExit = testProc.waitFor()
                if (testExit != 0) continue

                Log.i(TAG, "Valid root binary detected at: $su")

                // Start KioskWatchdogService in isolated process to ensure continuous relaunch
                KioskWatchdogService.startWatchdog(reactContext, "Root APK installation underway")

                // Launch a detached background root subshell to am start the kiosk after 3 seconds
                try {
                    val restartScript = "nohup sh -c 'sleep 3 && am start -n ${reactContext.packageName}/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-brought-to-front' >/dev/null 2>&1 &"
                    Runtime.getRuntime().exec(arrayOf(su, "-c", restartScript))
                } catch (_: Exception) {}

                // Pre-configure Device Owner and appops permissions via root if available
                try {
                    Runtime.getRuntime().exec(arrayOf(
                        su, "-c",
                        "dpm set-device-owner ${reactContext.packageName}/.KioskDeviceAdminReceiver 2>/dev/null; " +
                        "appops set ${reactContext.packageName} REQUEST_INSTALL_PACKAGES allow 2>/dev/null; " +
                        "appops set ${reactContext.packageName} SYSTEM_ALERT_WINDOW allow 2>/dev/null; " +
                        "pm grant ${reactContext.packageName} android.permission.INSTALL_PACKAGES 2>/dev/null; " +
                        "pm grant ${reactContext.packageName} android.permission.SYSTEM_ALERT_WINDOW 2>/dev/null"
                    )).waitFor()
                } catch (_: Exception) {}

                // Method A: Copy to /data/local/tmp and run pm install -r -d
                val tmpPath = "/data/local/tmp/kiosk_update.apk"
                val copyCmd = "cp \"${apkFile.absolutePath}\" $tmpPath && chmod 644 $tmpPath && pm install -r -d $tmpPath && rm -f $tmpPath"
                val p1 = Runtime.getRuntime().exec(arrayOf(su, "-c", copyCmd))
                if (p1.waitFor() == 0) {
                    Log.i(TAG, "Silent install succeeded via root pm install (tmp path).")
                    return true
                }

                // Method B: Pipe raw bytes into pm install (bypasses SELinux and filesystem permissions)
                val streamCmd = "cat \"${apkFile.absolutePath}\" | pm install -r -d -S ${apkFile.length()}"
                val p2 = Runtime.getRuntime().exec(arrayOf(su, "-c", streamCmd))
                if (p2.waitFor() == 0) {
                    Log.i(TAG, "Silent install succeeded via root pm install (streaming pipe).")
                    return true
                }

                // Method C: Chmod file and run pm install directly
                val directCmd = "chmod 666 \"${apkFile.absolutePath}\" && pm install -r -d \"${apkFile.absolutePath}\""
                val p3 = Runtime.getRuntime().exec(arrayOf(su, "-c", directCmd))
                if (p3.waitFor() == 0) {
                    Log.i(TAG, "Silent install succeeded via root pm install (direct file).")
                    return true
                }
            } catch (e: Exception) {
                Log.d(TAG, "Root execution attempt on $su failed: ${e.message}")
            }
        }
        return false
    }

    private fun installViaPackageInstallerSession(apkFile: File, promise: Promise?) {
        try {
            val packageInstaller = reactContext.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            params.setAppPackageName(reactContext.packageName)
            params.setSize(apkFile.length())

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                params.setRequestUpdateOwnership(true)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                params.setPackageSource(PackageInstaller.PACKAGE_SOURCE_STORE)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                params.setInstallReason(PackageManager.INSTALL_REASON_POLICY)
            }

            val sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            val out = session.openWrite("base.apk", 0, apkFile.length())
            val fis = FileInputStream(apkFile)
            val buffer = ByteArray(65536)
            var len: Int

            while (fis.read(buffer).also { len = it } != -1) {
                out.write(buffer, 0, len)
            }

            session.fsync(out)
            out.close()
            fis.close()

            // Dynamic receiver listening for session outcome
            val statusReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    try {
                        context.unregisterReceiver(this)
                    } catch (_: Exception) {}

                    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
                    val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Status $status"
                    Log.i(TAG, "PackageInstaller session #$sessionId outcome: status=$status, message=$msg")

                    if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                        Log.i(TAG, "PackageInstaller requested user confirmation ($msg). Launching confirmation intent...")
                        val confirmIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(Intent.EXTRA_INTENT)
                        }
                        if (confirmIntent != null) {
                            confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            reactContext.startActivity(confirmIntent)
                        } else {
                            installViaFileProvider(apkFile)
                        }
                    } else if (status != PackageInstaller.STATUS_SUCCESS) {
                        Log.w(TAG, "Silent PackageInstaller session failed: $msg. Triggering FileProvider fallback...")
                        installViaFileProvider(apkFile)
                    } else {
                        Log.i(TAG, "PackageInstaller session #$sessionId completed successfully with status SUCCESS.")
                    }
                }
            }

            val filter = IntentFilter(ACTION_INSTALL_STATUS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(statusReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactContext.registerReceiver(statusReceiver, filter)
            }

            val intent = Intent(ACTION_INSTALL_STATUS).apply {
                setPackage(reactContext.packageName)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getBroadcast(reactContext, sessionId, intent, flags)

            // Start KioskWatchdogService in isolated process before committing session
            KioskWatchdogService.startWatchdog(reactContext, "PackageInstaller session #$sessionId committed")

            session.commit(pendingIntent.intentSender)
            session.close()

            Log.i(TAG, "PackageInstaller session #$sessionId committed.")
            promise?.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putString("method", "PACKAGE_INSTALLER")
                putInt("sessionId", sessionId)
            })
        } catch (e: Exception) {
            Log.e(TAG, "PackageInstaller session error: ${e.message}", e)
            Log.i(TAG, "Falling back to FileProvider installer due to exception...")
            installViaFileProvider(apkFile)
            promise?.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putString("method", "FILE_PROVIDER_FALLBACK")
            })
        }
    }

    private fun installViaFileProvider(apkFile: File) {
        try {
            val contentUri = FileProvider.getUriForFile(reactContext, "${reactContext.packageName}.fileprovider", apkFile)
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(installIntent)
            Log.i(TAG, "Dispatched FileProvider APK installation intent.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch FileProvider installer", e)
        }
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
                return
            }
        }
        promise.resolve(false)
    }

    @ReactMethod
    fun notifyAppForeground(promise: Promise) {
        try {
            KioskWatchdogService.notifyAppForeground(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("NOTIFY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun triggerSimulatedCrash(promise: Promise) {
        Log.w(TAG, "Simulated crash requested from JavaScript!")
        Thread {
            Thread.sleep(200)
            throw RuntimeException("Kiosk Simulated Fatal Crash for Watchdog & Recovery Verification")
        }.start()
        promise.resolve(true)
    }

    @ReactMethod
    fun restartApp(promise: Promise) {
        try {
            KioskWatchdogService.startWatchdog(reactContext, "Manual restartApp called")
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                reactContext.startActivity(launchIntent)
                promise.resolve(true)
            } else {
                promise.reject("LAUNCH_INTENT_NULL", "Could not resolve launch intent for app.")
            }
        } catch (e: Exception) {
            promise.reject("RESTART_ERROR", e.message, e)
        }
    }
}
