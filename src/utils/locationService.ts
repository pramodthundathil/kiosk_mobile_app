import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KIOSK_LAST_LOCATION_TIMESTAMP_KEY = '@kiosk_last_location_recorded_timestamp';
export const KIOSK_SAVED_LATITUDE_KEY = '@kiosk_saved_latitude';
export const KIOSK_SAVED_LONGITUDE_KEY = '@kiosk_saved_longitude';

// 24 hours in milliseconds
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Storage helpers with web/native fallback
 */
async function storageGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {}
}

/**
 * Determines whether the device needs to identify and record its latitude/longitude:
 * - If lat/long is NOT recorded yet: returns true immediately (ignores 24h gap).
 * - If already recorded: only returns true once 24 hours have elapsed.
 */
export async function shouldIdentifyLocation(): Promise<boolean> {
  try {
    const lastTimestampStr = await storageGet(KIOSK_LAST_LOCATION_TIMESTAMP_KEY);
    const savedLat = await storageGet(KIOSK_SAVED_LATITUDE_KEY);
    const savedLon = await storageGet(KIOSK_SAVED_LONGITUDE_KEY);

    // If never recorded yet, record immediately without checking 24 hours gap
    if (!lastTimestampStr || !savedLat || !savedLon) {
      return true;
    }

    const lastTimestamp = parseInt(lastTimestampStr, 10);
    if (isNaN(lastTimestamp)) {
      return true;
    }

    const elapsed = Date.now() - lastTimestamp;
    return elapsed >= TWENTY_FOUR_HOURS_MS;
  } catch (e) {
    return true;
  }
}

/**
 * Identifies physical latitude & longitude of the device:
 * 1. Checks device hardware GPS / geolocation API if available.
 * 2. Falls back to free public network IP geolocation services for TV/kiosks without GPS chips.
 */
export async function identifyDeviceCoordinates(): Promise<DeviceCoordinates | null> {
  // 1. Try Hardware / Browser Geolocation API if supported
  const geoPromise = new Promise<DeviceCoordinates | null>((resolve) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation && navigator.geolocation.getCurrentPosition) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos && pos.coords) {
              resolve({
                latitude: parseFloat(pos.coords.latitude.toFixed(6)),
                longitude: parseFloat(pos.coords.longitude.toFixed(6)),
              });
            } else {
              resolve(null);
            }
          },
          () => resolve(null),
          { timeout: 4000, enableHighAccuracy: true }
        );
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });

  const geoResult = await geoPromise;
  if (geoResult) {
    return geoResult;
  }

  // 2. Primary Network IP Geolocation: freeipapi.com
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return {
          latitude: parseFloat(data.latitude.toFixed(6)),
          longitude: parseFloat(data.longitude.toFixed(6)),
        };
      }
    }
  } catch (e) {}

  // 3. Fallback Network IP Geolocation: ipwhois.app
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwhois.app/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: parseFloat(Number(data.latitude).toFixed(6)),
          longitude: parseFloat(Number(data.longitude).toFixed(6)),
        };
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Saves recorded location coordinates and records the timestamp to enforce the 24-hour interval.
 */
export async function saveRecordedLocation(coords: DeviceCoordinates): Promise<void> {
  const nowStr = String(Date.now());
  await storageSet(KIOSK_LAST_LOCATION_TIMESTAMP_KEY, nowStr);
  await storageSet(KIOSK_SAVED_LATITUDE_KEY, String(coords.latitude));
  await storageSet(KIOSK_SAVED_LONGITUDE_KEY, String(coords.longitude));
}
