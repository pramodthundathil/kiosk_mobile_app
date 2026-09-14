import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { HomeScreen } from './src/screens/HomeScreen';
import { KioskLoginScreen } from './src/screens/KioskLoginScreen';
import { VideoSplashScreen } from './src/components/VideoSplashScreen';
import { AttractLoop } from './src/components/AttractLoop';
import { InactivityTracker } from './src/components/InactivityTracker';
import { useKioskResponsive } from './src/hooks/useKioskResponsive';
import { KioskScreensaver } from './src/types/kiosk';
import { getStoredKioskToken, logoutKioskDevice, fetchScreensavers } from './src/services/api';

// Allow native splash screen to hide when React mounts
SplashScreen.hideAsync().catch(() => {});

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
      // Pre-fetch screensavers from backend and persist in local storage
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
    };
    initApp();
  }, [responsiveMetrics.isLandscape]);

  const handleLogout = async () => {
    await logoutKioskDevice();
    setIsAuthenticated(false);
  };

  return (
    <InactivityTracker
      inactivityTimeoutMs={30000} // 30 seconds inactivity trigger
      onInactivity={() => {
        if (!showSplash && !isCheckingAuth) {
          setIsScreensaverActive(true);
        }
      }}
      enabled={!showSplash && !isCheckingAuth}
    >
      <View style={styles.container}>
        <StatusBar hidden style="light" />

        {/* Dynamic Backend Screensaver Overlay (Plays after 30s inactivity) */}
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
          <HomeScreen onLogout={handleLogout} />
        ) : (
          <KioskLoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
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
