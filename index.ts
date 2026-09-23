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

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
