import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { HomeScreen } from './src/screens/HomeScreen';
import { KioskLoginScreen } from './src/screens/KioskLoginScreen';
import { VideoSplashScreen } from './src/components/VideoSplashScreen';
import { AttractLoop } from './src/components/AttractLoop';
import { InactivityTracker } from './src/components/InactivityTracker';
import { useKioskResponsive } from './src/hooks/useKioskResponsive';
import { KioskScreensaver } from './src/types/kiosk';
import {
  getStoredKioskToken,
  logoutKioskDevice,
  fetchScreensavers,
  startHeartbeatRunner,
  stopHeartbeatRunner,
} from './src/services/api';

export default function App() {
  const responsiveMetrics = useKioskResponsive();
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [screensavers, setScreensavers] = useState<KioskScreensaver[]>([]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const initApp = async () => {
      // Pre-fetch screensavers from backend and persist in local storage (available on login & home)
      const currentOrientation = responsiveMetrics.isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
      const fetched = await fetchScreensavers(currentOrientation);
      if (fetched && fetched.length > 0) {
        setScreensavers(fetched);
      }

      const token = await getStoredKioskToken();
      if (token) {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);

      // Start 10-second hardware heartbeat runner immediately on device boot/launch
      // Monitors hardware availability via MAC address even on dynamic IP networks
      startHeartbeatRunner(10000);
    };

    initApp();

    return () => {
      stopHeartbeatRunner();
    };
  }, [responsiveMetrics.isLandscape]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // Send immediate heartbeat update with authenticated state
    startHeartbeatRunner(10000);
  };

  const handleLogout = async () => {
    await logoutKioskDevice();
    setIsAuthenticated(false);
    // Continue heartbeat to indicate hardware is alive on the login screen
    startHeartbeatRunner(10000);
  };


  return (
    <InactivityTracker
      inactivityTimeoutMs={30000} // Dynamic 30s inactivity triggers screensaver/ads even before login
      onInactivity={() => {
        if (!showSplash && !isCheckingAuth) {
          const currentOrientation = responsiveMetrics.isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
          fetchScreensavers(currentOrientation).then((fetched) => {
            if (fetched && fetched.length > 0) {
              setScreensavers(fetched);
            }
          });
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

        {/* Video Splash Animation Overlay */}
        {showSplash ? (
          <VideoSplashScreen onFinish={() => setShowSplash(false)} />
        ) : isCheckingAuth ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00F0FF" />
          </View>
        ) : isAuthenticated ? (
          /* Product Details & Full Catalog: Accessible ONLY when authenticated/logged in */
          <HomeScreen onLogout={handleLogout} isScreensaverActive={isScreensaverActive} />
        ) : (
          /* Login Screen: Displayed when not authenticated */
          <KioskLoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </View>
    </InactivityTracker>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070A11',
  },
});
