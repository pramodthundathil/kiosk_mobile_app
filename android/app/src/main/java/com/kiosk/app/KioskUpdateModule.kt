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
        try {
            val apkFile = File(filePath)
            if (!apkFile.exists() || apkFile.length() == 0L) {
                promise.reject("FILE_NOT_FOUND", "APK file does not exist at $filePath")
                return
            }

            val isOwner = devicePolicyManager?.isDeviceOwnerApp(reactContext.packageName) ?: false
            Log.i(TAG, "Initiating APK installation: file=$filePath, isDeviceOwner=$isOwner")

            if (isOwner) {
                // Device Owner silent unattended installation via PackageInstaller
                installViaPackageInstallerSession(apkFile, promise)
            } else {
                // Fallback standard installation prompt via FileProvider
                installViaFileProviderPrompt(apkFile, promise)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initiating install", e)
            promise.reject("INSTALL_ERROR", e.message, e)
        }
    }

    private fun installViaPackageInstallerSession(apkFile: File, promise: Promise) {
        Thread {
            try {
                val packageInstaller = reactContext.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                params.setAppPackageName(reactContext.packageName)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    params.setInstallReason(PackageManager.INSTALL_REASON_POLICY)
                }

                val sessionId = packageInstaller.createSession(params)
                val session = packageInstaller.openSession(sessionId)

                val out = session.openWrite("package_update", 0, apkFile.length())
                val fis = FileInputStream(apkFile)
                val buffer = ByteArray(65536)
                var len: Int

                while (fis.read(buffer).also { len = it } != -1) {
                    out.write(buffer, 0, len)
                }

                session.fsync(out)
                out.close()
                fis.close()

                // Register dynamic receiver to listen for session commit outcome
                val statusReceiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context, intent: Intent) {
                        try {
                            context.unregisterReceiver(this)
                        } catch (_: Exception) {}

                        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
                        val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Status $status"
                        Log.i(TAG, "PackageInstaller session #$sessionId outcome: status=$status, message=$msg")

                        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                            val confirmIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                            } else {
                                @Suppress("DEPRECATION")
                                intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                            }
                            if (confirmIntent != null) {
                                confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(confirmIntent)
                            }
                        } else if (status != PackageInstaller.STATUS_SUCCESS) {
                            Log.w(TAG, "Silent PackageInstaller session failed ($msg). Falling back to FileProvider prompt...")
                            installViaFileProviderPrompt(apkFile, null)
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

                session.commit(pendingIntent.intentSender)
                session.close()

                Log.i(TAG, "PackageInstaller session #$sessionId committed successfully.")
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("method", "PACKAGE_INSTALLER_SILENT")
                    putInt("sessionId", sessionId)
                })
            } catch (e: Exception) {
                Log.e(TAG, "Failed silent installation session, trying FileProvider fallback", e)
                try {
                    installViaFileProviderPrompt(apkFile, promise)
                } catch (ex: Exception) {
                    promise.reject("PACKAGE_INSTALLER_ERROR", e.message, e)
                }
            }
        }.start()
    }

    private fun installViaFileProviderPrompt(apkFile: File, promise: Promise?) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!reactContext.packageManager.canRequestPackageInstalls()) {
                    Log.w(TAG, "REQUEST_INSTALL_PACKAGES not granted. Prompting user settings.")
                    val manageIntent = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(manageIntent)
                }
            }

            val authority = "${reactContext.packageName}.fileprovider"
            val contentUri: Uri = FileProvider.getUriForFile(reactContext, authority, apkFile)

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(intent)
            Log.i(TAG, "Fired FileProvider intent for user installation confirmation.")
            promise?.resolve(Arguments.createMap().apply {
                putBoolean("success", true)
                putString("method", "FILE_PROVIDER_PROMPT")
            })
        } catch (e: Exception) {
            Log.e(TAG, "FileProvider prompt failed", e)
            promise?.reject("FILE_PROVIDER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun restartApp(promise: Promise) {
        try {
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
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
