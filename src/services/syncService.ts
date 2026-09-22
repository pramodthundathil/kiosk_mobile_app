import { Image, Platform } from 'react-native';
import { getDeviceMacAddress } from '../utils/deviceInfo';
import { KioskProduct, KioskScreensaver } from '../types/kiosk';
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
} from './api';

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
        'Accept': 'application/json',
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
   * Performs full download & local caching of all latest content from Django backend:
   * 1. Screensavers for Landscape & Portrait orientations
   * 2. Products assigned to this specific kiosk terminal
   * 3. Catalog categories
   * 4. Media asset prefetching
   * 5. Content version bumping & backend sync acknowledgment
   */
  async performFullContentSync(targetVersion: string): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[SyncService] Content sync already in progress, skipping duplicate call.');
      return false;
    }

    this.isSyncing = true;
    console.log(`[SyncService] >>> STARTING FULL CONTENT SYNC -> Target Version: v${targetVersion} <<<`);

    try {
      const macAddress = await getDeviceMacAddress();
      const identity = await getActiveKioskIdentity();
      const kioskId = identity.kiosk_id;
      const deviceId = identity.device_id || macAddress;

      console.log(`[SyncService] Target Kiosk: ID=${kioskId || 'N/A'}, Device/MAC=${deviceId}`);

      // 1. Fetch screensavers for both LANDSCAPE, PORTRAIT, and general (BOTH)
      console.log('[SyncService] 1/4 Fetching and caching screensavers for both orientations...');
      const [landscapeScreensavers, portraitScreensavers, allScreensavers] = await Promise.all([
        fetchScreensavers('LANDSCAPE'),
        fetchScreensavers('PORTRAIT'),
        fetchScreensavers(),
      ]);

      const screensaversMap = new Map<string, KioskScreensaver>();
      [...(landscapeScreensavers || []), ...(portraitScreensavers || []), ...(allScreensavers || [])].forEach(
        (ss) => {
          if (ss && ss.id) screensaversMap.set(String(ss.id), ss);
        }
      );
      const totalScreensavers = screensaversMap.size;
      console.log(`[SyncService] Screensavers collected: ${totalScreensavers} unique slides.`);

      // 2. Fetch products assigned to this specific kiosk terminal
      console.log('[SyncService] 2/4 Fetching products assigned to this kiosk...');
      const assignedProducts = await fetchCatalogProducts(kioskId, deviceId);
      console.log(`[SyncService] Assigned products collected: ${assignedProducts.length} items.`);

      // 3. Fetch product categories
      console.log('[SyncService] 3/4 Fetching catalog categories...');
      const categories = await fetchCatalogCategories();
      console.log(`[SyncService] Categories collected: ${categories.length} categories.`);

      // 4. Warm up / prefetch high-priority media assets (non-blocking)
      try {
        const imagesToPrefetch: string[] = [];
        assignedProducts.forEach((p) => {
          if (p.image && p.image.startsWith('http')) imagesToPrefetch.push(p.image);
        });
        screensaversMap.forEach((ss) => {
          if (ss.image && ss.image.startsWith('http')) imagesToPrefetch.push(ss.image);
        });

        // Limit concurrent prefetching to first 15 key images
        const prefetchSlice = imagesToPrefetch.slice(0, 15);
        Promise.all(
          prefetchSlice.map((url) =>
            Image.prefetch(url).catch(() => {
              // Ignore individual image prefetch errors
            })
          )
        ).catch(() => {});
      } catch (imgErr) {
        console.warn('[SyncService] Media prefetch notice:', imgErr);
      }

      // 5. Update local content version to targetVersion
      await this.setCurrentContentVersion(targetVersion);
      const completedAt = new Date().toISOString();
      await storageSetItem(KIOSK_LAST_SYNC_TIME_KEY, String(Date.now()));

      console.log(`[SyncService] 4/4 Local content version successfully updated to v${targetVersion}.`);

      const stats: SyncStats = {
        productsCount: assignedProducts.length,
        screensaversCount: totalScreensavers,
        categoriesCount: categories.length,
        completedAt,
      };

      // 6. Notify Django Backend via dedicated sync-complete API
      await this.notifyBackendSyncComplete(targetVersion, {
        products: stats.productsCount,
        screensavers: stats.screensaversCount,
        categories: stats.categoriesCount,
      });

      // 7. Fire an immediate heartbeat with the new content version so telemetry is in sync
      sendKioskHeartbeat({
        current_content_version: targetVersion,
      }).catch(() => {});

      // 8. Notify all UI subscribers (HomeScreen, App, AttractLoop) to refresh in real-time
      this.notifyListeners(targetVersion, stats);

      console.log(`[SyncService] >>> CONTENT SYNC COMPLETED SUCCESSFULLY (v${targetVersion}) <<<`);
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
