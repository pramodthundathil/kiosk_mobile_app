import React, { useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { View, StyleSheet, PanResponder, BackHandler } from 'react-native';
import { analyticsService } from '../services/analyticsService';

interface InactivityContextType {
  resetTimer: () => void;
}

export const InactivityContext = createContext<InactivityContextType>({
  resetTimer: () => {},
});

export const useInactivityTimer = () => useContext(InactivityContext);

interface InactivityTrackerProps {
  inactivityTimeoutMs?: number;
  onInactivity: () => void;
  onReset?: () => void;
  children: React.ReactNode;
  enabled?: boolean;
}

export const InactivityTracker: React.FC<InactivityTrackerProps> = ({
  inactivityTimeoutMs = 30000,
  onInactivity,
  onReset,
  children,
  enabled = true,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInactivityRef = useRef(onInactivity);
  const onResetRef = useRef(onReset);
  const enabledRef = useRef(enabled);

  useEffect(() => { onInactivityRef.current = onInactivity; }, [onInactivity]);
  useEffect(() => { onResetRef.current = onReset; }, [onReset]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const resetInactivityTimer = useCallback(() => {
    // Notify analytics that user is active on the kiosk
    analyticsService.onUserActivity();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (onResetRef.current) onResetRef.current();
    if (enabledRef.current) {
      timerRef.current = setTimeout(() => {
        // Customer went idle - close session and trigger screensaver
        analyticsService.endSession().catch(() => {});
        if (onInactivityRef.current) onInactivityRef.current();
      }, inactivityTimeoutMs);
    }
  }, [inactivityTimeoutMs]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [inactivityTimeoutMs, enabled, resetInactivityTimer]);

  // Listen for hardware remote Back button on Android / TV devices
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      resetInactivityTimer();
      return false; // Allow standard back action to continue
    });
    return () => backSub.remove();
  }, [resetInactivityTimer]);

  // PanResponder observes touch & pointer gestures without capturing them
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false;
      },
    })
  ).current;

  return (
    <InactivityContext.Provider value={{ resetTimer: resetInactivityTimer }}>
      <View
        style={styles.container}
        {...panResponder.panHandlers}
        onStartShouldSetResponderCapture={() => {
          resetInactivityTimer();
          return false;
        }}
      >
        {children}
      </View>
    </InactivityContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
