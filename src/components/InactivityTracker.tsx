import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Platform } from 'react-native';

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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (onResetRef.current) onResetRef.current();
    if (enabledRef.current) {
      timerRef.current = setTimeout(() => {
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

  // PanResponder captures touch events on touch-screen devices.
  // On Android TV, remote D-pad events are NOT touch events, so PanResponder
  // is not attached on TV to avoid interfering with D-pad focus navigation.
  // TVEventHandler is intentionally NOT used here — it is unavailable in
  // Expo Go and causes a fatal crash.
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

  const touchHandlers = Platform.isTV ? {} : panResponder.panHandlers;

  return (
    <View style={styles.container} {...touchHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
