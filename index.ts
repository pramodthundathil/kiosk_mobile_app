import { registerRootComponent } from 'expo';
import * as ReactNative from 'react-native';

// Polyfill DevSettings if missing (e.g. on Web / React Native Web or certain runtimes)
// to prevent uncaught promise rejection: "TypeError: Cannot read property 'reload' of undefined"
if (typeof (ReactNative as any).DevSettings === 'undefined') {
  (ReactNative as any).DevSettings = {
    reload: (reason?: string) => {
      if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
        window.location.reload();
      }
    },
    addMenuItem: () => {},
    onFastRefresh: () => {},
  };
} else if (typeof (ReactNative as any).DevSettings.reload !== 'function') {
  (ReactNative as any).DevSettings.reload = (reason?: string) => {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  };
}

// Register global unhandled JS exception handler for unattended kiosk recovery
if ((globalThis as any).ErrorUtils) {
  const originalErrorHandler = (globalThis as any).ErrorUtils.getGlobalHandler();
  (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('[GlobalErrorHandler] Unhandled JS exception caught:', error, 'isFatal:', isFatal);
    if (isFatal && ReactNative.Platform.OS === 'android' && (ReactNative.NativeModules as any).KioskUpdateModule?.restartApp) {
      (ReactNative.NativeModules as any).KioskUpdateModule.restartApp().catch(() => {});
    }
    if (typeof originalErrorHandler === 'function') {
      originalErrorHandler(error, isFatal);
    }
  });
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
