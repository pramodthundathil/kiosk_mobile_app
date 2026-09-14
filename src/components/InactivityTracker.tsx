import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

interface InactivityTrackerProps {
  inactivityTimeoutMs?: number; // Defaults to 30000 (30 seconds)
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

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (onReset) {
      onReset();
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onInactivity();
      }, inactivityTimeoutMs);
    }
  }, [inactivityTimeoutMs, onInactivity, onReset, enabled]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetInactivityTimer, enabled]);

  // PanResponder to capture touch down / move events globally without blocking child interaction
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false; // Do NOT consume the touch event so children (buttons, inputs) work normally
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetInactivityTimer();
        return false;
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
