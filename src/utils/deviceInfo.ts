import { Platform } from 'react-native';
import * as Application from 'expo-application';

// Generates or retrieves a deterministic MAC-formatted hardware identifier for the Kiosk station
export async function getDeviceMacAddress(): Promise<string> {
  try {
    let rawId: string | null = null;

    if (Platform.OS === 'android' && Application) {
      try {
        rawId = Application.getAndroidId ? Application.getAndroidId() : null;
      } catch (e) {
        rawId = null;
      }
    }

    if (!rawId && Application) {
      try {
        if (Application.getInstallationTimeAsync) {
          const installTime = await Application.getInstallationTimeAsync();
          rawId = Math.abs(installTime.getTime()).toString(16);
        }
      } catch (e) {}
    }

    if (rawId && rawId.length >= 12) {
      const clean = rawId.replace(/[^a-fA-F0-9]/g, '').padEnd(12, '0').slice(0, 12);
      const formatted = clean.match(/.{1,2}/g)?.join(':').toUpperCase();
      if (formatted) return formatted;
    }
  } catch (e) {
    console.warn('Device MAC retrieval fallback notice:', e);
  }

  // Fallback MAC address for testing/emulator
  return '00:1A:2B:3C:4D:5E';
}
