package com.kiosk.app

import android.content.Intent
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme)
    super.onCreate(null)
    enableMaxResolutionAnd4KDisplay()
    enableImmersiveStickyMode()
  }

  override fun onResume() {
    super.onResume()
    enableImmersiveStickyMode()
    KioskWatchdogService.notifyAppForeground(this)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      enableImmersiveStickyMode()
      KioskWatchdogService.notifyAppForeground(this)
    }
  }

  /**
   * Automatically switches the window surface to the highest available display mode
   * (e.g. 3840x2160 UHD / 4K) supported by the connected display or TV panel.
   */
  private fun enableMaxResolutionAnd4KDisplay() {
    try {
      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      window.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        window.decorView.post {
          try {
            val currentDisplay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
              display
            } else {
              @Suppress("DEPRECATION")
              windowManager.defaultDisplay
            }

            currentDisplay?.let { disp ->
              val modes = disp.supportedModes
              if (modes != null && modes.isNotEmpty()) {
                var bestMode = disp.mode
                for (m in modes) {
                  val bestPixels = bestMode.physicalWidth.toLong() * bestMode.physicalHeight.toLong()
                  val candidatePixels = m.physicalWidth.toLong() * m.physicalHeight.toLong()
                  if (candidatePixels > bestPixels ||
                    (candidatePixels == bestPixels && m.refreshRate > bestMode.refreshRate)
                  ) {
                    bestMode = m
                  }
                }

                val params = window.attributes
                params.preferredDisplayModeId = bestMode.modeId
                window.attributes = params
              }
            }
          } catch (e: Exception) {
            e.printStackTrace()
          }
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  /**
   * Enables edge-to-edge sticky immersive mode so the app uses 100% of the 4K canvas
   * without system status bars or navigation bars interrupting.
   */
  private fun enableImmersiveStickyMode() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        window.setDecorFitsSystemWindows(false)
        window.insetsController?.let { controller ->
          controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
          controller.systemBarsBehavior =
            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
      } else {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
