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

function safeBase64Decode(str: string): string {
  if (typeof atob === 'function') {
    try {
      return atob(str);
    } catch (e) {}
  }
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let o1: number, o2: number, o3: number, h1: number, h2: number, h3: number, h4: number, bits: number;
  let i = 0, ac = 0;
  const tmp_arr: string[] = [];
  if (!str) return '';
  do {
    h1 = b64.indexOf(str.charAt(i++));
    h2 = b64.indexOf(str.charAt(i++));
    h3 = b64.indexOf(str.charAt(i++));
    h4 = b64.indexOf(str.charAt(i++));
    bits = (h1 << 18) | (h2 << 12) | (h3 << 6) | h4;
    o1 = (bits >> 16) & 0xff;
    o2 = (bits >> 8) & 0xff;
    o3 = bits & 0xff;
    if (h3 === 64) {
      tmp_arr[ac++] = String.fromCharCode(o1);
    } else if (h4 === 64) {
      tmp_arr[ac++] = String.fromCharCode(o1, o2);
    } else {
      tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
    }
  } while (i < str.length);
  return tmp_arr.join('');
}

export function parseJwtPayload(token: string): any {
  try {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = safeBase64Decode(base64);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

export interface ActiveKioskIdentity {
  kiosk_id?: string;
  device_id?: string;
  name?: string;
}

export async function getActiveKioskIdentity(): Promise<ActiveKioskIdentity> {
  const identity: ActiveKioskIdentity = {};

  try {
    const raw = await storageGetItem(KIOSK_INFO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.kiosk_id) identity.kiosk_id = parsed.kiosk_id;
      if (parsed.device_id) identity.device_id = parsed.device_id;
      if (parsed.name) identity.name = parsed.name;
    }
  } catch (e) {}

  // Fallback: decode claims from JWT access token payload
  if (!identity.kiosk_id || !identity.device_id) {
    try {
      const token = await getStoredKioskToken();
      if (token) {
        const payload = parseJwtPayload(token);
        if (payload) {
          if (payload.kiosk_id && !identity.kiosk_id) identity.kiosk_id = payload.kiosk_id;
          if (payload.device_id && !identity.device_id) identity.device_id = payload.device_id;
        }
      }
    } catch (e) {}
  }

  return identity;
}

export async function fetchCatalogProducts(targetKioskId?: string, targetDeviceId?: string): Promise<KioskProduct[]> {
  try {
    const serverUrl = await getSavedServerUrl();
    const token = await getStoredKioskToken();
    const cleanUrl = serverUrl.replace(/\/+$/, '');

    // Resolve kiosk identification for device-specific product filtering
    let kioskId = targetKioskId;
    let deviceId = targetDeviceId;

    if (!kioskId || !deviceId) {
      const activeIdentity = await getActiveKioskIdentity();
      if (!kioskId && activeIdentity.kiosk_id) kioskId = activeIdentity.kiosk_id;
      if (!deviceId && activeIdentity.device_id) deviceId = activeIdentity.device_id;
    }

    const queryParams: string[] = [];
    if (kioskId) queryParams.push(`kiosk_id=${encodeURIComponent(kioskId)}`);
    if (deviceId) queryParams.push(`device_id=${encodeURIComponent(deviceId)}`);
    const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const endpoint = `${cleanUrl}/api/products/${qs}`;

    console.log('[fetchCatalogProducts] Resolved kioskId:', kioskId, 'deviceId:', deviceId);
    console.log('[fetchCatalogProducts] Request endpoint:', endpoint, 'Token exists:', !!token);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Check if token is expired before sending to prevent 403 Token is expired errors
    let canSendToken = false;
    if (token) {
      const payload = parseJwtPayload(token);
      if (payload && payload.exp) {
        const isExpired = Date.now() >= payload.exp * 1000;
        if (!isExpired) {
          canSendToken = true;
        } else {
          console.log('[fetchCatalogProducts] Stored JWT token has expired, proceeding with kiosk_id query parameter');
        }
      } else {
        canSendToken = true;
      }
    }

    if (canSendToken && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response = await fetch(endpoint, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    console.log('[fetchCatalogProducts] Initial response status:', response.status, response.ok);

    // If server rejected the Kiosk JWT token (401 or 403), retry without Authorization header using query params
    if ((response.status === 401 || response.status === 403) && headers['Authorization']) {
      console.log(`[fetchCatalogProducts] HTTP ${response.status} auth rejection received, retrying without Authorization header...`);
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 8000);
      response = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        signal: retryController.signal,
      });
      clearTimeout(retryTimeout);
      console.log('[fetchCatalogProducts] Retry response status:', response.status, response.ok);
    }

    if (!response.ok) {
      console.warn('[fetchCatalogProducts] Response not OK, returning empty array');
      return [];
    }

    const json = await response.json();
    console.log('[fetchCatalogProducts] Parsed JSON is array:', Array.isArray(json), 'Count:', Array.isArray(json) ? json.length : json);
    if (!Array.isArray(json)) return [];

    return json.map((p: any) => {
      const rawImg = p.image_url || p.image || '';
      const fixedImg = rawImg ? sanitizeMediaUrl(rawImg, cleanUrl) : '';

      // Parse specifications safely if provided as JSON string or object
      let specs: Record<string, string> = {};
      if (typeof p.specifications === 'string') {
        try {
          specs = JSON.parse(p.specifications);
        } catch (e) {}
      } else if (p.specifications && typeof p.specifications === 'object') {
        specs = p.specifications;
      }

      // Map media assets and sanitize URLs
      const mappedAssets = Array.isArray(p.media_assets)
        ? p.media_assets.map((m: any) => ({
            id: String(m.id || Math.random()),
            title: m.title || 'Media Asset',
            asset_type: m.asset_type || 'IMAGE',
            asset_type_display: m.asset_type_display || '',
            file_url: m.file_url
              ? sanitizeMediaUrl(m.file_url, cleanUrl)
              : m.file
              ? sanitizeMediaUrl(m.file, cleanUrl)
              : m.external_url || '',
            description: m.description || '',
          }))
        : [];

      // Extract brochure and tech sheet URLs
      const brochureAsset = mappedAssets.find((a: any) => a.asset_type === 'PDF_BROCHURE');
      const techSheetAsset = mappedAssets.find((a: any) => a.asset_type === 'TECH_SHEET');

      // Category extraction
      const catCode = p.category?.code ? p.category.code.toLowerCase() : '';
      const catId = p.category?.id ? String(p.category.id) : '';
      const catName = p.category?.name || 'General Product';
      const categoryKey = catCode || catId || 'all';

      // Fallback image if product image is empty
      const finalImage =
        fixedImg ||
        (p.category?.image_url
          ? sanitizeMediaUrl(p.category.image_url, cleanUrl)
          : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80');

      return {
        id: String(p.id || Math.random()),
        name: p.name || 'Excel Product',
        sku: p.sku || 'EX-ITEM',
        subtitle: p.description
          ? p.description.length > 80
            ? p.description.slice(0, 80) + '...'
            : p.description
          : 'Industrial Earthing Product',
        category: categoryKey,
        categoryId: catId,
        categoryCode: p.category?.code || '',
        categoryName: catName,
        description: p.description || '',
        image: finalImage,
        specifications: specs,
        price: parseFloat(p.price) || 0,
        stock: typeof p.stock === 'number' ? p.stock : 100,
        mediaAssets: mappedAssets,
        brochureUrl: brochureAsset?.file_url,
        techSheetUrl: techSheetAsset?.file_url,
      };
    });
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
      image: c.image_url ? sanitizeMediaUrl(c.image_url, cleanUrl) : undefined,
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
    stopHeartbeatRunner();
    await storageRemoveItem(KIOSK_TOKEN_KEY);
    await storageRemoveItem(KIOSK_REFRESH_KEY);
    await storageRemoveItem(KIOSK_INFO_KEY);
  } catch (e) {}
}


export async function getCachedScreensavers(orientation?: string): Promise<KioskScreensaver[]> {
  try {
    const targetOri = orientation ? orientation.toUpperCase() : '';
    const orientationCacheKey = targetOri
      ? `${KIOSK_SCREENSAVERS_CACHE_KEY}_${targetOri}`
      : KIOSK_SCREENSAVERS_CACHE_KEY;

    let raw = await storageGetItem(orientationCacheKey);
    // If specific orientation cache is empty, check general cache
    if (!raw && targetOri) {
      raw = await storageGetItem(KIOSK_SCREENSAVERS_CACHE_KEY);
    }

    const candidateUrls = await getCandidateServerUrls();
    const activeBaseUrl = candidateUrls[0] || DEFAULT_SERVER_URL;

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let items: KioskScreensaver[] = parsed.map((item: any) => {
          const rawImg = item.image_url || item.image || '';
          const fixedImg = sanitizeMediaUrl(rawImg, activeBaseUrl);
          return {
            ...item,
            image: fixedImg,
            image_url: fixedImg,
          };
        });

        if (targetOri) {
          const filtered = items.filter(
            (s) => !s.orientation || s.orientation === targetOri || s.orientation === 'BOTH'
          );
          if (filtered.length > 0) {
            items = filtered;
          }
        }
        return items;
      }
    }
  } catch (e) {}
  return [];
}

export const KIOSK_SCREENSAVERS_LAST_FETCHED_KEY = '@kiosk_screensavers_last_fetched_time';

export async function fetchScreensavers(orientation?: string): Promise<KioskScreensaver[]> {
  const targetOri = orientation ? orientation.toUpperCase() : '';
  const orientationCacheKey = targetOri
    ? `${KIOSK_SCREENSAVERS_CACHE_KEY}_${targetOri}`
    : KIOSK_SCREENSAVERS_CACHE_KEY;

  // Retrieve cached screensavers as instant fallback if network is unreachable
  const cached: KioskScreensaver[] = await getCachedScreensavers(targetOri);

  const candidateUrls = await getCandidateServerUrls();
  const orientationQuery = targetOri ? `?orientation=${encodeURIComponent(targetOri)}` : '';

  // Always download screensavers as per orientation from backend
  for (const baseUrl of candidateUrls) {
    const primaryEndpoint = `${baseUrl}/api/kiosk/screensavers/${orientationQuery}`;
    const fallbackEndpoint = `${baseUrl}/api/kiosk/screensavers/`;
    
    for (const endpoint of [primaryEndpoint, fallbackEndpoint]) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const screensaversList = json.screensavers || json;
          if (Array.isArray(screensaversList) && screensaversList.length > 0) {
            await storageSetItem(KIOSK_SERVER_URL_KEY, baseUrl);

            let mapped: KioskScreensaver[] = screensaversList.map((item: any) => {
              const rawImg = item.image_url || item.image || '';
              const fixedImg = sanitizeMediaUrl(rawImg, baseUrl);
              return {
                id: String(item.id),
                title: item.title || 'Excel Earthing Showcase',
                image: fixedImg,
                image_url: fixedImg,
                orientation: (item.orientation || 'BOTH') as 'LANDSCAPE' | 'PORTRAIT' | 'BOTH',
                orientation_display: item.orientation_display || '',
                duration_seconds: item.duration_seconds || 10,
                display_order: item.display_order || 0,
                caption: item.caption || '',
                description: item.description || '',
                is_active: item.is_active ?? true,
              };
            });

            // If fallback endpoint was used, filter in memory by orientation
            if (targetOri && endpoint === fallbackEndpoint) {
              const filtered = mapped.filter(
                (s) => !s.orientation || s.orientation === targetOri || s.orientation === 'BOTH'
              );
              if (filtered.length > 0) {
                mapped = filtered;
              }
            }

            // Always persist latest downloaded screensavers to orientation-specific cache and general cache
            await storageSetItem(orientationCacheKey, JSON.stringify(mapped));
            await storageSetItem(KIOSK_SCREENSAVERS_CACHE_KEY, JSON.stringify(mapped));
            await storageSetItem(KIOSK_SCREENSAVERS_LAST_FETCHED_KEY, String(Date.now()));

            return mapped;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Network fetch failed or device is offline: return cached screensavers for this orientation
  return cached;
}

// ─── 10-Second Kiosk Heartbeat Runner ──────────────────────────────────────────

let heartbeatTimerId: any = null;

export interface KioskTelemetryPayload {
  app_version?: string;
  android_version?: string;
  device_model?: string;
  manufacturer?: string;
  battery_percentage?: number | null;
  network_type?: string;
  screen_on?: boolean;
  app_running?: boolean;
  current_content_version?: string;
  last_error?: string | null;
}

export async function sendKioskHeartbeat(
  customData?: KioskTelemetryPayload
): Promise<{ success: boolean; data?: any }> {
  try {
    const token = await getStoredKioskToken();
    if (!token) return { success: false };

    const serverUrl = await getSavedServerUrl();
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/kiosk/heartbeat/`;

    const payload: KioskTelemetryPayload = {
      app_version: 'v1.0.0',
      android_version: Platform.OS === 'android' ? 'Android TV / Tablet' : Platform.OS,
      device_model: Platform.OS === 'android' ? 'Android Kiosk Display' : 'Web Display',
      manufacturer: 'Excel Electronics',
      battery_percentage: 100,
      network_type: 'WIFI',
      screen_on: true,
      app_running: true,
      current_content_version: '1',
      ...customData,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    } else {
      return { success: false };
    }
  } catch (e) {
    return { success: false };
  }
}

export function startHeartbeatRunner(intervalMs: number = 10000): void {
  stopHeartbeatRunner();
  // Fire once immediately
  sendKioskHeartbeat().catch(() => {});
  // Then periodically every 10 seconds (10,000 ms)
  heartbeatTimerId = setInterval(() => {
    sendKioskHeartbeat().catch(() => {});
  }, intervalMs);
}

export function stopHeartbeatRunner(): void {
  if (heartbeatTimerId) {
    clearInterval(heartbeatTimerId);
    heartbeatTimerId = null;
  }
}

