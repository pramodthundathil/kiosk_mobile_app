import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { KioskProduct, KioskCategory, KioskScreensaver } from '../types/kiosk';

// Extract current Expo host IP dynamically (e.g. 192.168.29.102)
const manifestHost = Constants.expoConfig?.hostUri?.split(':')[0];
const lanHostIp = manifestHost || '192.168.29.102';

export const PRODUCTION_SERVER_URL = 'https://excel.byteboot.in';

export const DEFAULT_SERVER_URL =
  Platform.OS === 'web'
    ? PRODUCTION_SERVER_URL
    : PRODUCTION_SERVER_URL;

export interface KioskAuthResponse {
  access: string;
  refresh: string;
  kiosk_id?: string;
  device_id?: string;
  name?: string;
}

export const KIOSK_TOKEN_KEY = '@kiosk_jwt_token';
export const KIOSK_REFRESH_KEY = '@kiosk_jwt_refresh';
export const KIOSK_INFO_KEY = '@kiosk_device_info';
export const KIOSK_SERVER_URL_KEY = '@kiosk_server_url';
export const KIOSK_SCREENSAVERS_CACHE_KEY = '@kiosk_cached_screensavers';

// Safe Storage abstraction to prevent "Native module is null" crashes on Web/Expo Go
const memoryStorageCache: Record<string, string> = {};

async function storageGetItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const val = await AsyncStorage.getItem(key);
    return val;
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { return window.localStorage.getItem(key); } catch (err) {}
    }
    return memoryStorageCache[key] || null;
  }
}

async function storageSetItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem(key, value); } catch (err) {}
    }
    memoryStorageCache[key] = value;
  }
}

async function storageRemoveItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.removeItem(key); } catch (err) {}
    }
    delete memoryStorageCache[key];
  }
}

export async function getSavedServerUrl(): Promise<string> {
  try {
    const saved = await storageGetItem(KIOSK_SERVER_URL_KEY);
    if (saved && (saved.includes('localhost') || saved.includes('127.0.0.1') || saved.includes('192.168.') || saved.includes('10.0.2.2'))) {
      // Override stale local IP cache with production endpoint
      await storageSetItem(KIOSK_SERVER_URL_KEY, PRODUCTION_SERVER_URL);
      return PRODUCTION_SERVER_URL;
    }
    return saved || PRODUCTION_SERVER_URL;
  } catch (e) {
    return PRODUCTION_SERVER_URL;
  }
}

export async function getCandidateServerUrls(): Promise<string[]> {
  const saved = await getSavedServerUrl();
  const candidates: string[] = [PRODUCTION_SERVER_URL];

  if (saved && saved !== PRODUCTION_SERVER_URL && !saved.includes('localhost') && !saved.includes('127.0.0.1') && !saved.includes('192.168.') && !saved.includes('10.0.2.2')) {
    candidates.push(saved);
  }

  const cleaned = candidates.map((u) => u.replace(/\/+$/, ''));
  return Array.from(new Set(cleaned));
}

function sanitizeMediaUrl(url: string, activeBaseUrl: string): string {
  if (!url) return '';

  // Preserve Amazon S3 URLs or any remote absolute URL that is not local host
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (
      url.includes('amazonaws.com') ||
      (!url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('10.0.2.2'))
    ) {
      return url;
    }
  }

  let path = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const match = url.match(/^https?:\/\/[^\/]+(\/.*)$/);
    if (match && match[1]) {
      path = match[1];
    }
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  let host = activeBaseUrl.replace(/\/+$/, '');
  if (Platform.OS === 'android' && (host.includes('127.0.0.1') || host.includes('localhost'))) {
    host = `http://${lanHostIp}:8000`;
  }

  return `${host}${path}`;
}


async function tryFetchLogin(
  url: string,
  macAddress: string,
  deviceSecret: string
): Promise<{ ok: boolean; status: number; json: any }> {
  const cleanUrl = url.replace(/\/+$/, '');
  const endpoint = `${cleanUrl}/api/kiosk/auth/login/`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        mac_address: macAddress,
        device_secret: deviceSecret,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let json: any = {};
    try {
      json = await response.json();
    } catch (e) {
      json = { error: `Server returned HTTP ${response.status}` };
    }

    return { ok: response.ok, status: response.status, json };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Connection timed out while reaching backend server (12s).');
    }
    throw err;
  }
}

export async function loginKioskDevice(
  macAddress: string,
  deviceSecret: string,
  serverUrl: string = DEFAULT_SERVER_URL
): Promise<{ success: boolean; data?: KioskAuthResponse; error?: string }> {
  const targetUrl = (serverUrl || PRODUCTION_SERVER_URL).replace(/\/+$/, '');

  try {
    const res = await tryFetchLogin(targetUrl, macAddress, deviceSecret);

    if (res.ok && res.json.access) {
      await storageSetItem(KIOSK_TOKEN_KEY, res.json.access);
      if (res.json.refresh) await storageSetItem(KIOSK_REFRESH_KEY, res.json.refresh);
      await storageSetItem(KIOSK_SERVER_URL_KEY, targetUrl);
      await storageSetItem(KIOSK_INFO_KEY, JSON.stringify(res.json));

      return { success: true, data: res.json };
    } else {
      const errorMsg =
        res.json.error ||
        res.json.detail ||
        res.json.non_field_errors?.[0] ||
        `Backend Auth Error (HTTP ${res.status}).`;
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Cannot connect to server at ${targetUrl}. Please check internet connection.`,
    };
  }
}

export async function loginWithLocalStorageSession(
  macAddress: string,
  deviceSecret: string
): Promise<{ success: boolean; data: KioskAuthResponse }> {
  const sessionData: KioskAuthResponse = {
    access: `local_session_${Date.now()}`,
    refresh: `local_refresh_${Date.now()}`,
    device_id: macAddress,
    name: 'Excel Local Station Session',
  };

  await storageSetItem(KIOSK_TOKEN_KEY, sessionData.access);
  await storageSetItem(KIOSK_REFRESH_KEY, sessionData.refresh);
  await storageSetItem(KIOSK_SERVER_URL_KEY, PRODUCTION_SERVER_URL);
  await storageSetItem(KIOSK_INFO_KEY, JSON.stringify(sessionData));

  return { success: true, data: sessionData };
}

export async function fetchCatalogProducts(): Promise<KioskProduct[]> {
  try {
    const serverUrl = await getSavedServerUrl();
    const token = await getStoredKioskToken();
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/products/`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const json = await response.json();
    if (!Array.isArray(json)) return [];

    return json.map((p: any) => ({
      id: String(p.id || Math.random()),
      name: p.name || 'Excel Product',
      sku: p.sku || 'EX-ITEM',
      subtitle: p.description ? p.description.slice(0, 80) : 'Industrial Earthing Product',
      category: p.category?.code ? p.category.code.toLowerCase() : 'all',
      categoryName: p.category?.name || 'General Product',
      description: p.description || '',
      image: p.image_url || p.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      specifications: p.specifications && typeof p.specifications === 'object' ? p.specifications : {},
      price: parseFloat(p.price) || 0,
      badge: p.sku?.startsWith('EX-CBR') ? 'BESTSELLER' : 'HIGH CONDUCTIVITY',
      mediaAssets: p.media_assets || [],
    }));
  } catch (err) {
    console.warn('Failed fetching live products from backend:', err);
    return [];
  }
}

export async function fetchCatalogCategories(): Promise<KioskCategory[]> {
  try {
    const serverUrl = await getSavedServerUrl();
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/products/categories/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const json = await response.json();
    if (!Array.isArray(json)) return [];

    return json.map((c: any) => ({
      id: c.code ? c.code.toLowerCase() : String(c.id),
      name: c.name || 'Category',
      code: c.code || 'CAT',
      icon: 'grid',
      description: c.description || '',
    }));
  } catch (err) {
    return [];
  }
}

export async function getStoredKioskToken(): Promise<string | null> {
  try {
    return await storageGetItem(KIOSK_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function logoutKioskDevice(): Promise<void> {
  try {
    await storageRemoveItem(KIOSK_TOKEN_KEY);
    await storageRemoveItem(KIOSK_REFRESH_KEY);
    await storageRemoveItem(KIOSK_INFO_KEY);
  } catch (e) {}
}

export async function getCachedScreensavers(): Promise<KioskScreensaver[]> {
  try {
    const raw = await storageGetItem(KIOSK_SCREENSAVERS_CACHE_KEY);
    const candidateUrls = await getCandidateServerUrls();
    const activeBaseUrl = candidateUrls[0] || DEFAULT_SERVER_URL;

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          const rawImg = item.image_url || item.image || '';
          const fixedImg = sanitizeMediaUrl(rawImg, activeBaseUrl);
          return {
            ...item,
            image: fixedImg,
            image_url: fixedImg,
          };
        });
      }
    }
  } catch (e) {}
  return [];
}

export const KIOSK_SCREENSAVERS_LAST_FETCHED_KEY = '@kiosk_screensavers_last_fetched_time';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 Hours in milliseconds

export async function fetchScreensavers(orientation?: string, forceRefresh: boolean = false): Promise<KioskScreensaver[]> {
  const now = Date.now();
  const lastFetchedRaw = await storageGetItem(KIOSK_SCREENSAVERS_LAST_FETCHED_KEY);
  const lastFetchedTime = lastFetchedRaw ? parseInt(lastFetchedRaw, 10) : 0;

  let cached: KioskScreensaver[] = await getCachedScreensavers();

  // Filter cached items by orientation if specified
  if (orientation && cached.length > 0) {
    const targetOri = orientation.toUpperCase();
    const filteredCached = cached.filter(
      (s) => s.orientation === targetOri || s.orientation === 'BOTH'
    );
    if (filteredCached.length > 0) {
      cached = filteredCached;
    }
  }

  // If cache exists and less than 2 hours have passed since last API fetch, use cached list directly
  if (!forceRefresh && cached.length > 0 && lastFetchedTime > 0 && (now - lastFetchedTime) < TWO_HOURS_MS) {
    return cached;
  }

  const candidateUrls = await getCandidateServerUrls();
  const orientationQuery = orientation ? `?orientation=${encodeURIComponent(orientation)}` : '';

  for (const baseUrl of candidateUrls) {
    const primaryEndpoint = `${baseUrl}/api/kiosk/screensavers/${orientationQuery}`;
    const fallbackEndpoint = `${baseUrl}/api/kiosk/screensavers/`;
    
    for (const endpoint of [primaryEndpoint, fallbackEndpoint]) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const screensaversList = json.screensavers || json;
          if (Array.isArray(screensaversList) && screensaversList.length > 0) {
            // Save working server URL
            await storageSetItem(KIOSK_SERVER_URL_KEY, baseUrl);

            const mapped: KioskScreensaver[] = screensaversList.map((item: any) => {
              const rawImg = item.image_url || item.image || '';
              const fixedImg = sanitizeMediaUrl(rawImg, baseUrl);
              return {
                id: String(item.id),
                title: item.title || 'Excel Earthing Showcase',
                image: fixedImg,
                image_url: fixedImg,
                orientation: item.orientation || 'BOTH',
                orientation_display: item.orientation_display || '',
                duration_seconds: item.duration_seconds || 10,
                display_order: item.display_order || 0,
                caption: item.caption || '',
                description: item.description || '',
                is_active: item.is_active ?? true,
              };
            });

            // Store to local storage for future offline access and update 2-hour timestamp
            await storageSetItem(KIOSK_SCREENSAVERS_CACHE_KEY, JSON.stringify(mapped));
            await storageSetItem(KIOSK_SCREENSAVERS_LAST_FETCHED_KEY, String(now));
            return mapped;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
    }
  }

  return cached;
}
