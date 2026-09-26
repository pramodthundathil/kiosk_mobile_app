import { Image } from 'react-native';
import { getDeviceMacAddress } from '../utils/deviceInfo';
import { KioskProduct, KioskScreensaver, KioskCategory } from '../types/kiosk';
import {
  storageGetItem,
  storageSetItem,
  getActiveKioskIdentity,
  getSavedServerUrl,
  getStoredKioskToken,
  fetchCatalogProducts,
  fetchCatalogCategories,
  fetchScreensavers,
  sendKioskHeartbeat,
  KIOSK_CONTENT_VERSION_KEY,
  KIOSK_LAST_SYNC_TIME_KEY,
  KIOSK_CACHED_PRODUCTS_KEY,
  KIOSK_CACHED_CATEGORIES_KEY,
} from './api';
import { mediaCacheService } from './mediaCacheService';
import { FALLBACK_CATEGORY_IMAGES } from '../utils/kioskDesignHelper';

export const SYNC_INTERVAL_3_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours = 10,800,000 ms

export interface SyncStats {
  productsCount: number;
  screensaversCount: number;
  categoriesCount: number;
  completedAt: string;
}

export type SyncListener = (targetVersion: string, stats: SyncStats) => void;

class KioskSyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private syncTimer: any = null;

  /**
   * Returns the current local content version (defaults to '1').
   */
  async getCurrentContentVersion(): Promise<string> {
    try {
      const ver = await storageGetItem(KIOSK_CONTENT_VERSION_KEY);
      return ver && ver.trim() ? ver.trim() : '1';
    } catch {
      return '1';
    }
  }

  /**
   * Sets the current local content version.
   */
  async setCurrentContentVersion(version: string): Promise<void> {
    try {
      await storageSetItem(KIOSK_CONTENT_VERSION_KEY, version.trim());
    } catch (e) {
      console.warn('[SyncService] Failed saving content version:', e);
    }
  }

  /**
   * Returns the timestamp (ms) of the last successful sync.
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const val = await storageGetItem(KIOSK_LAST_SYNC_TIME_KEY);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Subscribe a callback to be triggered whenever content is successfully synchronized.
   * Returns an unsubscribe function.
   */
  onContentSynced(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(targetVersion: string, stats: SyncStats) {
    this.listeners.forEach((fn) => {
      try {
        fn(targetVersion, stats);
      } catch (err) {
        console.warn('[SyncService] Listener notification error:', err);
      }
    });
  }

  /**
   * Returns whether a synchronization run is currently active.
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Starts periodic sync scheduler with 3-hour interval.
   * Also performs an immediate check/sync at startup.
   */
  startSyncScheduler(intervalMs = SYNC_INTERVAL_3_HOURS_MS): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    console.log(`[SyncService] Starting 3-hour periodic sync scheduler (interval: ${intervalMs / 3600000}h)`);

    // 1. Immediately evaluate if startup sync is needed
    this.checkAndTriggerSync();

    // 2. Schedule periodic collection every 3 hours
    this.syncTimer = setInterval(() => {
      console.log('[SyncService] 3-hour scheduled interval reached. Triggering automatic background sync...');
      this.performFullContentSync().catch((e) =>
        console.warn('[SyncService] Scheduled sync notice:', e)
      );
    }, intervalMs);
  }

  /**
   * Stops the periodic sync scheduler.
   */
  stopSyncScheduler(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[SyncService] Stopped periodic sync scheduler.');
    }
  }

  /**
   * Checks last sync time. If never synced or last sync was > 3 hours ago,
   * triggers background sync. If recently synced within 3 hours, skips redundant sync.
   */
  async checkAndTriggerSync(force = false): Promise<void> {
    try {
      const lastSync = await this.getLastSyncTime();
      const now = Date.now();
      const elapsed = lastSync ? now - lastSync : Infinity;

      if (force || !lastSync || elapsed >= SYNC_INTERVAL_3_HOURS_MS) {
        console.log(
          `[SyncService] Sync due (elapsed: ${
            lastSync ? Math.round(elapsed / 60000) + ' min' : 'never'
          }). Starting background collection...`
        );
        await this.performFullContentSync();
      } else {
        const nextInMin = Math.round((SYNC_INTERVAL_3_HOURS_MS - elapsed) / 60000);
        console.log(
          `[SyncService] Local content is up to date (last sync ${Math.round(
            elapsed / 60000
          )}m ago). Next scheduled sync in ~${nextInMin}m.`
        );
      }
    } catch (e) {
      console.warn('[SyncService] checkAndTriggerSync notice:', e);
    }
  }

  /**
   * Sends explicit sync completion notification to Django backend /api/kiosk/sync-complete/
   */
  async notifyBackendSyncComplete(
    targetVersion: string,
    stats: { products: number; screensavers: number; categories: number }
  ): Promise<boolean> {
    try {
      const serverUrl = await getSavedServerUrl();
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/api/kiosk/sync-complete/`;
      const mac = await getDeviceMacAddress();
      const token = await getStoredKioskToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Device-MAC': mac,
        'X-Device-Id': mac,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          device_id: mac,
          content_version: targetVersion,
          status: 'SUCCESS',
          synced_items: stats,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return res.ok;
    } catch (e) {
      console.warn('[SyncService] Failed to notify backend of sync completion:', e);
      return false;
    }
  }

  /**
   * Performs full download & local storage persistence of all latest content from Django backend:
   * 1. Screensavers for Landscape & Portrait orientations
   * 2. Products assigned to this specific kiosk terminal
   * 3. Catalog categories and subcategories
   * 4. Media asset download into local filesystem (pictures, 3D assets .glb/.gltf, videos, PDFs)
   * 5. Saves resolved products & categories into local storage with local file URIs
   * 6. Updates last sync timestamp and content version
   * 7. Notifies all UI subscribers to refresh instantly from local storage
   */
  async performFullContentSync(targetVersion?: string): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[SyncService] Content sync already in progress, skipping duplicate call.');
      return false;
    }

    this.isSyncing = true;
    const version = targetVersion || (await this.getCurrentContentVersion());
    console.log(`[SyncService] >>> STARTING FULL CONTENT SYNC (v${version}) <<<`);

    try {
      const macAddress = await getDeviceMacAddress();
      const identity = await getActiveKioskIdentity();
      const kioskId = identity.kiosk_id;
      const deviceId = identity.device_id || macAddress;

      console.log(`[SyncService] Target Kiosk: ID=${kioskId || 'N/A'}, Device/MAC=${deviceId}`);

      // Ensure media cache directory exists before downloading
      await mediaCacheService.initMediaCache().catch(() => {});

      // 1. Fetch screensavers for both LANDSCAPE, PORTRAIT, and general (BOTH)
      console.log('[SyncService] 1/5 Fetching screensavers for both orientations...');
      const [landscapeScreensavers, portraitScreensavers, allScreensavers] = await Promise.all([
        fetchScreensavers('LANDSCAPE'),
        fetchScreensavers('PORTRAIT'),
        fetchScreensavers(),
      ]);

      const screensaversMap = new Map<string, KioskScreensaver>();
      [
        ...(landscapeScreensavers || []),
        ...(portraitScreensavers || []),
        ...(allScreensavers || []),
      ].forEach((ss) => {
        if (ss && ss.id) screensaversMap.set(String(ss.id), ss);
      });
      const totalScreensavers = screensaversMap.size;
      console.log(`[SyncService] Screensavers collected: ${totalScreensavers} slides.`);

      // 2. Fetch products assigned to this specific kiosk terminal
      console.log('[SyncService] 2/5 Fetching products assigned to this kiosk...');
      const assignedProducts = await fetchCatalogProducts(kioskId, deviceId);
      console.log(`[SyncService] Assigned products collected: ${assignedProducts.length} items.`);

      // 3. Fetch product categories & subcategories
      console.log('[SyncService] 3/5 Fetching catalog categories...');
      const categories = await fetchCatalogCategories();
      console.log(`[SyncService] Categories collected: ${categories.length} categories.`);

      // 4. Download and cache ALL media assets (pictures, 3D assets, videos, PDFs) into persistent local disk storage
      console.log('[SyncService] 4/5 Downloading pictures and 3D assets to local storage...');
      try {
        const mediaToCache: string[] = [];

        // A. Products: main image and all mediaAssets (3D models, images, videos, PDFs)
        assignedProducts.forEach((p) => {
          if (p.image && p.image.startsWith('http')) {
            mediaToCache.push(p.image);
          }
          if (Array.isArray(p.mediaAssets)) {
            p.mediaAssets.forEach((m) => {
              if (m.file_url && m.file_url.startsWith('http')) {
                mediaToCache.push(m.file_url);
              }
            });
          }
          if (p.brochureUrl && p.brochureUrl.startsWith('http')) {
            mediaToCache.push(p.brochureUrl);
          }
          if (p.techSheetUrl && p.techSheetUrl.startsWith('http')) {
            mediaToCache.push(p.techSheetUrl);
          }
        });

        // B. Categories and Sub-categories images
        categories.forEach((c) => {
          if (c.image && c.image.startsWith('http')) {
            mediaToCache.push(c.image);
          }
          if (Array.isArray(c.subcategories)) {
            c.subcategories.forEach((sc) => {
              if (sc.image && sc.image.startsWith('http')) {
                mediaToCache.push(sc.image);
              }
            });
          }
        });

        // C. Fallback category images
        Object.values(FALLBACK_CATEGORY_IMAGES).forEach((imgUrl) => {
          if (imgUrl && imgUrl.startsWith('http')) {
            mediaToCache.push(imgUrl);
          }
        });

        // D. Screensaver images
        screensaversMap.forEach((ss) => {
          const img = ss.image_url || ss.image;
          if (img && img.startsWith('http')) {
            mediaToCache.push(img);
          }
        });

        console.log(`[SyncService] Caching ${mediaToCache.length} total media & 3D assets to local disk...`);
        await mediaCacheService.cacheBatchImages(mediaToCache, 4);

        // Pre-warm local files into memory for instantaneous display
        mediaToCache.forEach((url) => {
          const localUri = mediaCacheService.resolveCachedImageUri(url);
          if (localUri && (localUri.startsWith('file://') || localUri.startsWith('http'))) {
            Image.prefetch(localUri).catch(() => {});
          }
        });
      } catch (mediaErr) {
        console.warn('[SyncService] Media caching notice:', mediaErr);
      }

      // 5. Save structured catalog data into local storage with resolved local filesystem URIs
      console.log('[SyncService] 5/5 Saving content with local URIs to Local Storage...');
      const resolvedProducts: KioskProduct[] = assignedProducts.map((p) => ({
        ...p,
        image: mediaCacheService.resolveCachedImageUri(p.image),
        mediaAssets: Array.isArray(p.mediaAssets)
          ? p.mediaAssets.map((m) => ({
              ...m,
              file_url: mediaCacheService.resolveCachedImageUri(m.file_url),
            }))
          : [],
      }));
      await storageSetItem(KIOSK_CACHED_PRODUCTS_KEY, JSON.stringify(resolvedProducts));

      const resolvedCategories: KioskCategory[] = categories.map((c) => ({
        ...c,
        image: c.image ? mediaCacheService.resolveCachedImageUri(c.image) : undefined,
        subcategories: Array.isArray(c.subcategories)
          ? c.subcategories.map((sc) => ({
              ...sc,
              image: sc.image ? mediaCacheService.resolveCachedImageUri(sc.image) : undefined,
            }))
          : [],
      }));
      await storageSetItem(KIOSK_CACHED_CATEGORIES_KEY, JSON.stringify(resolvedCategories));

      // 6. Update local content version and last sync timestamp
      await this.setCurrentContentVersion(version);
      const completedAt = new Date().toISOString();
      await storageSetItem(KIOSK_LAST_SYNC_TIME_KEY, String(Date.now()));

      console.log(`[SyncService] Local storage content successfully synchronized to v${version}.`);

      const stats: SyncStats = {
        productsCount: assignedProducts.length,
        screensaversCount: totalScreensavers,
        categoriesCount: categories.length,
        completedAt,
      };

      // 7. Notify Django Backend via dedicated sync-complete API
      await this.notifyBackendSyncComplete(version, {
        products: stats.productsCount,
        screensavers: stats.screensaversCount,
        categories: stats.categoriesCount,
      });

      // 8. Fire an immediate heartbeat with the new content version so telemetry is updated
      sendKioskHeartbeat({
        current_content_version: version,
      }).catch(() => {});

      // 9. Notify all UI subscribers (HomeScreen, App, AttractLoop) to reload directly from local storage
      this.notifyListeners(version, stats);

      console.log(`[SyncService] >>> CONTENT SYNC COMPLETED SUCCESSFULLY (v${version}) <<<`);
      return true;
    } catch (err) {
      console.error('[SyncService] Error during full content synchronization:', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new KioskSyncService();
