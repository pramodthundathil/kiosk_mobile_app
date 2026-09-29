import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, NativeModules, Text, AppState, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { HomeScreen } from './src/screens/HomeScreen';
import { KioskLoginScreen } from './src/screens/KioskLoginScreen';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { AttractLoop } from './src/components/AttractLoop';
import { InactivityTracker } from './src/components/InactivityTracker';
import { KioskErrorBoundary } from './src/components/KioskErrorBoundary';
import { useKioskResponsive } from './src/hooks/useKioskResponsive';
import { KioskScreensaver } from './src/types/kiosk';
import {
  getStoredKioskToken,
  logoutKioskDevice,
  fetchScreensavers,
  getCachedScreensavers,
  startHeartbeatRunner,
  stopHeartbeatRunner,
  parseJwtPayload,
  isKioskAuthenticated,
  ensureKioskSessionValid,
  verifyKioskStatus,
  onKioskAuthChange,
} from './src/services/api';
import { mediaCacheService } from './src/services/mediaCacheService';
import { syncService } from './src/services/syncService';
import { updateService } from './src/services/updateService';

export default function App() {
  const responsiveMetrics = useKioskResponsive();
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [screensavers, setScreensavers] = useState<KioskScreensaver[]>([]);

  // Listen for realtime backend session invalidation (e.g. admin deletes or deactivates kiosk)
  useEffect(() => {
    const unsubscribe = onKioskAuthChange((authenticated, reason) => {
      console.log('[App] Auth state changed event received:', authenticated, reason);
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        if (reason) setAuthErrorMessage(reason);
        // Continue heartbeat on login screen so hardware MAC is visible to backend
        startHeartbeatRunner(10000);
      } else {
        setAuthErrorMessage(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const initApp = async () => {
      const currentOrientation = responsiveMetrics.isLandscape ? 'LANDSCAPE' : 'PORTRAIT';

      // 0. Initialize offline media cache storage
      await mediaCacheService.initMediaCache().catch(() => {});

      // 1. Immediately load local cached screensavers from disk so they are available without delay
      const cached = await getCachedScreensavers(currentOrientation);
      if (cached && cached.length > 0) {
        setScreensavers(cached);
        // Pre-warm disk cache for instant display
        cached.forEach((s) => {
          const uri = s.image_url || s.image;
          if (uri) Image.prefetch(uri).catch(() => {});
        });
      }

      // 2. Kiosk Startup Backend Verification:
      // When the kiosk starts up, hit the backend to check if the kiosk MAC ID is available and active.
      // If the backend says the kiosk MAC ID is not available (deleted) or deactivated, logout immediately!
      const locallyAuthenticated = await isKioskAuthenticated();
      if (!locallyAuthenticated) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      } else {
        try {
          const verification = await verifyKioskStatus();
          if (verification.action === 'LOGOUT' || !verification.available || !verification.active) {
            console.warn('[App] Startup check rejected by backend: kiosk deleted or deactivated. Logging out.');
            await logoutKioskDevice();
            setAuthErrorMessage(verification.message || 'Kiosk device was deleted or deactivated by an administrator.');
            setIsAuthenticated(false);
            setIsCheckingAuth(false);
          } else {
            setIsAuthenticated(true);
            setAuthErrorMessage(null);
            setIsCheckingAuth(false);
            // Silently verify/refresh token in background
            ensureKioskSessionValid().catch(() => {});
          }
        } catch (verErr) {
          console.warn('[App] Startup verification notice:', verErr);
          // If offline network error, maintain previous authenticated state
          setIsAuthenticated(locallyAuthenticated);
          setIsCheckingAuth(false);
        }
      }

      // 3. Start 10-second hardware heartbeat runner immediately on device boot/launch
      // Monitors hardware availability via MAC address even on dynamic IP networks
      startHeartbeatRunner(10000);

      // 4. Start 3-hour periodic sync scheduler (and startup collection check in background)
      syncService.startSyncScheduler();

      // 5. Initialize Remote App Update (OTA) engine with 30-minute check cycle and post-update status reporting
      updateService.initUpdateService(30 * 60 * 1000);

      // Signal native isolated watchdog that the kiosk app has successfully initialized and is active
      if (Platform.OS === 'android' && NativeModules.KioskUpdateModule?.notifyAppForeground) {
        NativeModules.KioskUpdateModule.notifyAppForeground().catch(() => {});
        NativeModules.KioskUpdateModule.canDrawOverlays?.().then((hasOverlay: boolean) => {
          if (!hasOverlay) {
            NativeModules.KioskUpdateModule.requestOverlayPermission?.().catch(() => {});
          }
        }).catch(() => {});
      }
    };

    initApp();

    return () => {
      stopHeartbeatRunner();
      syncService.stopSyncScheduler();
      updateService.stopUpdateService();
    };
  }, [responsiveMetrics.isLandscape]);

  // Listen for AppState changes to trigger sync if returning after >= 3 hours
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncService.checkAndTriggerSync();
      }
    });
    return () => subscription.remove();
  }, []);

  // Dynamically update screensavers from local storage cache when background synchronization completes
  useEffect(() => {
    const unsubscribe = syncService.onContentSynced(() => {
      const currentOrientation = responsiveMetrics.isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
      getCachedScreensavers(currentOrientation).then((cached) => {
        if (cached && cached.length > 0) {
          setScreensavers(cached);
          cached.forEach((s) => {
            const uri = s.image_url || s.image;
            if (uri) Image.prefetch(uri).catch(() => {});
          });
        }
      });
    });
    return unsubscribe;
  }, [responsiveMetrics.isLandscape]);

  const handleLoginSuccess = () => {
    setAuthErrorMessage(null);
    setIsAuthenticated(true);
    // Send immediate heartbeat update with authenticated state
    startHeartbeatRunner(10000);
  };

  const handleLogout = async () => {
    await logoutKioskDevice();
    setAuthErrorMessage(null);
    setIsAuthenticated(false);
    // Continue heartbeat to indicate hardware is alive on the login screen
    startHeartbeatRunner(10000);
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KioskErrorBoundary>
        <InactivityTracker
          inactivityTimeoutMs={30000} // Dynamic 30s inactivity triggers screensaver/ads even before login
          onInactivity={() => {
            if (!showSplash && !isCheckingAuth) {
              // Instantly activate screensaver using already-cached, pre-warmed slides
              setIsScreensaverActive(true);
            }
          }}
          enabled={!showSplash && !isCheckingAuth}
        >
          <View style={styles.container}>
            <StatusBar hidden style="light" />

            {/* Dynamic Screensaver Overlay (Plays after 30s inactivity even if not logged in) */}
            {isScreensaverActive && (
              <AttractLoop
                metrics={responsiveMetrics}
                screensavers={screensavers}
                onDismiss={() => setIsScreensaverActive(false)}
              />
            )}

            {/* Animated Splash Screen Overlay */}
            {showSplash ? (
              <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />
            ) : isCheckingAuth ? (
              <View style={styles.loadingContainer}>
                <Image
                  source={require('./assets/excel_since_logo.png')}
                  style={styles.loadingCrestLogo}
                  resizeMode="contain"
                />
                <Image
                  source={require('./assets/excel_corporate_logo.png')}
                  style={styles.loadingCorporateLogo}
                  resizeMode="contain"
                />
                <Text style={styles.loadingTitle}>Excel Earthing Kiosk App</Text>
                <Text style={styles.loadingSub}>Initializing Terminal & Security...</Text>
                <ActivityIndicator size="large" color="#FFC107" style={{ marginTop: 18 }} />
              </View>
            ) : isAuthenticated ? (
              /* Product Details & Full Catalog: Accessible ONLY when authenticated/logged in */
              <HomeScreen onLogout={handleLogout} isScreensaverActive={isScreensaverActive} />
            ) : (
              /* Login Screen: Displayed when not authenticated */
              <KioskLoginScreen onLoginSuccess={handleLoginSuccess} initialErrorMessage={authErrorMessage} />
            )}
          </View>
        </InactivityTracker>
      </KioskErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050811',
    paddingHorizontal: 24,
  },
  loadingCrestLogo: {
    width: 140,
    height: 135,
    marginBottom: 12,
  },
  loadingCorporateLogo: {
    width: 280,
    height: 67,
    marginBottom: 10,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },
});
