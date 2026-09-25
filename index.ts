import { registerRootComponent } from 'expo';
import * as ReactNative from 'react-native';

// Comprehensive DevSettings polyfill to eliminate "Cannot read property 'reload' of undefined"
const safeReload = (reason?: string) => {
  try {
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  } catch {}
};

const devSettingsPolyfill = {
  reload: safeReload,
  reloadWithReason: safeReload,
  addMenuItem: () => {},
  onFastRefresh: () => {},
};

// 1. Patch ReactNative.DevSettings
try {
  if (typeof (ReactNative as any).DevSettings === 'undefined') {
    (ReactNative as any).DevSettings = devSettingsPolyfill;
  } else {
    (ReactNative as any).DevSettings.reload = safeReload;
    (ReactNative as any).DevSettings.reloadWithReason = safeReload;
  }
} catch {}

// 2. Patch NativeModules.DevSettings
try {
  const nm = (ReactNative as any).NativeModules;
  if (nm) {
    if (!nm.DevSettings) {
      nm.DevSettings = devSettingsPolyfill;
    } else {
      if (typeof nm.DevSettings.reload !== 'function') nm.DevSettings.reload = safeReload;
      if (typeof nm.DevSettings.reloadWithReason !== 'function') nm.DevSettings.reloadWithReason = safeReload;
    }
  }
} catch {}

// Ignore non-fatal warnings in kiosk environment so developer modals never block the kiosk UI
ReactNative.LogBox.ignoreLogs([
  'Deep imports from the',
  'DevSettings',
  'Cannot read property',
  'Property',
]);
ReactNative.LogBox.ignoreAllLogs(true);

// 4. Prevent unhandled promise rejections originating from Metro / fast refresh reload
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('unhandledrejection', (event: any) => {
    const reasonStr = String(event?.reason || '');
    if (reasonStr.includes('reload') || reasonStr.includes('DevSettings')) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });
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
