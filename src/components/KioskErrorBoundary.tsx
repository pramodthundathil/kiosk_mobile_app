import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, NativeModules, Platform } from 'react-native';

const { KioskUpdateModule } = NativeModules;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export class KioskErrorBoundary extends Component<Props, State> {
  private timer: any = null;
  private retryAttempts = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      countdown: 3,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[KioskErrorBoundary] Caught unhandled React UI error:', error, errorInfo);
    this.retryAttempts++;

    // Start auto-recovery countdown
    this.startRecoveryTimer();
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private startRecoveryTimer() {
    let timeLeft = 3;
    this.setState({ countdown: timeLeft });

    this.timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.timer);
        this.attemptRecovery();
      } else {
        this.setState({ countdown: timeLeft });
      }
    }, 1000);
  }

  private attemptRecovery = () => {
    if (this.retryAttempts >= 2 && Platform.OS === 'android' && KioskUpdateModule?.restartApp) {
      console.log('[KioskErrorBoundary] Multiple UI crashes detected. Requesting native Kiosk restart...');
      KioskUpdateModule.restartApp().catch((err: any) => {
        console.warn('[KioskErrorBoundary] Native restart failed, resetting React state:', err);
        this.setState({ hasError: false, error: null });
      });
    } else {
      console.log('[KioskErrorBoundary] Recovering React view tree...');
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#00F0FF" />
          <Text style={styles.title}>Kiosk System Auto-Recovery</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Restoring kiosk display in {this.state.countdown}s...
          </Text>
          {this.state.error?.message && (
            <Text style={styles.errorMessage} numberOfLines={2}>
              {this.state.error.message}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#00F0FF',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 15,
    textAlign: 'center',
    maxWidth: 400,
  },
});
