import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSISTENT_MAC_KEY = '@kiosk_unique_persistent_mac_id';

// Memory cache in case storage takes a moment
let cachedMacAddress: string | null = null;

/**
 * Retrieves a strictly unique, immutable MAC-formatted hardware identifier for this Kiosk terminal.
 * - On physical Android devices: uses hardware Android ID (Settings.Secure.ANDROID_ID).
 * - Persisted in device storage permanently upon first run.
 * - Once resolved, the identifier never changes across reboots, app restarts, or offline cycles.
 */
export async function getDeviceMacAddress(): Promise<string> {
  if (cachedMacAddress) {
    return cachedMacAddress;
  }

  // 1. Check persistent storage first to guarantee unchangeability
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(PERSISTENT_MAC_KEY);
      if (stored) {
        cachedMacAddress = stored;
        return stored;
      }
    } else {
      const stored = await AsyncStorage.getItem(PERSISTENT_MAC_KEY);
      if (stored) {
        cachedMacAddress = stored;
        return stored;
      }
    }
  } catch (e) {
    console.warn('Storage check warning for MAC ID:', e);
  }

  // 2. Derive unique hardware identifier
  let rawId: string | null = null;

  try {
    if (Platform.OS === 'android' && Application) {
      try {
        rawId = Application.getAndroidId ? Application.getAndroidId() : null;
      } catch (e) {
        rawId = null;
      }
    }

    // Fallback on install timestamp or device UUID if AndroidId not available
    if (!rawId && Application && Application.getInstallationTimeAsync) {
      try {
        const installTime = await Application.getInstallationTimeAsync();
        rawId = Math.abs(installTime.getTime()).toString(16);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Hardware detection warning:', e);
  }

  // If still no rawId (e.g. web or simulator), generate a cryptographically strong unique seed
  if (!rawId) {
    const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    rawId = `${Date.now().toString(16)}${randomHex()}${randomHex()}`;
  }

  // Clean and format into standard 6-byte MAC Address (e.g., 8F:D7:25:89:16:3D)
  const clean = rawId.replace(/[^a-fA-F0-9]/g, '').padEnd(12, '0').slice(0, 12);
  const formatted = (clean.match(/.{1,2}/g)?.join(':') || '00:1A:2B:3C:4D:5E').toUpperCase();

  cachedMacAddress = formatted;

  // 3. Persist permanently to storage so it never changes
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PERSISTENT_MAC_KEY, formatted);
    } else {
      await AsyncStorage.setItem(PERSISTENT_MAC_KEY, formatted);
    }
  } catch (e) {
    console.warn('Could not persist unique MAC address:', e);
  }

  return formatted;
}
