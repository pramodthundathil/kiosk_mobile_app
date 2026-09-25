import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { storageGetItem, storageSetItem } from '../utils/storage';
import { DEFAULT_OFFLINE_3D_MODEL_BASE64 } from '../assets/offline3DModel';

const MEDIA_CACHE_DIR_NAME = 'kiosk_offline_media/';
const MEDIA_CACHE_MAP_KEY = '@kiosk_media_offline_cache_map';

// In-memory cache map: remoteUrl -> localFileUri
let memoryCacheMap: Record<string, string> = {};
let isInitialized = false;

/**
 * Returns the local directory path dedicated to offline kiosk media.
 */
function getMediaDirectory(): string | null {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return null;
  }
  return `${FileSystem.documentDirectory}${MEDIA_CACHE_DIR_NAME}`;
}

/**
 * Computes a deterministic safe local filename for a given URL.
 */
function getFilenameForUrl(url: string): string {
  if (!url) return 'media.jpg';

  let ext = '.jpg';
  try {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.([a-z0-9]{2,6})$/i);
    if (match) {
      ext = `.${match[1].toLowerCase()}`;
    }
  } catch {}

  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  const safeHash = Math.abs(hash).toString(36);
  const slug =
    url
      .split('/')
      .pop()
      ?.split('?')[0]
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(-20) || 'media';

  return `${safeHash}_${slug}${ext}`;
}

class MediaCacheService {
  /**
   * Initializes the media cache directory and loads persisted cache mapping into memory.
   */
  async initMediaCache(): Promise<void> {
    if (isInitialized) return;

    try {
      const dir = getMediaDirectory();
      if (dir) {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        // Pre-seed offline 3D model (copper bonded earth rod) into persistent disk storage
        const bundledModelPath = `${dir}copper-bonded-earth-rod_JPxKz56.glb`;
        try {
          const bundledModelInfo = await FileSystem.getInfoAsync(bundledModelPath);
          if (!bundledModelInfo.exists) {
            await FileSystem.writeAsStringAsync(
              bundledModelPath,
              DEFAULT_OFFLINE_3D_MODEL_BASE64,
              { encoding: FileSystem.EncodingType.Base64 }
            );
          }
        } catch (e) {}

        const s3ModelUrl = 'https://s3.ap-south-1.amazonaws.com/excelearthing-437377029279-ap-south-1-an/media/media_assets/copper-bonded-earth-rod_JPxKz56.glb';
        if (!memoryCacheMap[s3ModelUrl]) {
          memoryCacheMap[s3ModelUrl] = bundledModelPath;
        }
      }

      const storedMap = await storageGetItem(MEDIA_CACHE_MAP_KEY);
      if (storedMap) {
        memoryCacheMap = { ...memoryCacheMap, ...JSON.parse(storedMap) };
      }
      isInitialized = true;
    } catch (e) {
      console.warn('[MediaCacheService] Init notice:', e);
      isInitialized = true;
    }
  }

  /**
   * Synchronously resolves a media URL to its local offline cached file:// URI if available.
   * If not cached or on web, returns the original URL.
   */
  resolveCachedImageUri(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('content://')) {
      return url;
    }

    const cached = memoryCacheMap[url];
    if (cached) {
      return cached;
    }

    return url;
  }

  /**
   * Downloads a single remote media URL to local device disk storage and updates cache map.
   * Returns the local file:// URI on success or already cached, or original URL on failure.
   */
  async cacheImage(url: string): Promise<string> {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('content://')) {
      return url;
    }

    await this.initMediaCache();
    const dir = getMediaDirectory();
    if (!dir) return url;

    // Check if already in map and file actually exists on disk
    const existingLocalUri = memoryCacheMap[url];
    if (existingLocalUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(existingLocalUri);
        if (fileInfo.exists && (fileInfo as any).size > 0) {
          return existingLocalUri;
        }
      } catch {}
    }

    const filename = getFilenameForUrl(url);
    const targetFileUri = `${dir}${filename}`;

    try {
      // Check if file is already on disk (e.g. from previous app run)
      const checkInfo = await FileSystem.getInfoAsync(targetFileUri);
      if (checkInfo.exists && (checkInfo as any).size > 0) {
        memoryCacheMap[url] = targetFileUri;
        this.saveCacheMapDebounced();
        return targetFileUri;
      }

      // Download from remote server to local persistent storage
      const downloadRes = await FileSystem.downloadAsync(url, targetFileUri);
      if (downloadRes && downloadRes.status === 200) {
        memoryCacheMap[url] = targetFileUri;
        this.saveCacheMapDebounced();
        return targetFileUri;
      } else {
        return url;
      }
    } catch (err) {
      // Network failure or offline
      return existingLocalUri || url;
    }
  }

  /**
   * Downloads a batch of media URLs concurrently (with batching) to populate offline disk cache.
   */
  async cacheBatchImages(urls: (string | undefined | null)[], concurrency = 4): Promise<Record<string, string>> {
    await this.initMediaCache();

    const validUrls = Array.from(
      new Set(
        urls.filter(
          (u): u is string =>
            !!u &&
            typeof u === 'string' &&
            u.startsWith('http')
        )
      )
    );

    if (validUrls.length === 0) return memoryCacheMap;

    console.log(`[MediaCacheService] Caching ${validUrls.length} media assets to local disk storage...`);

    // Process in batches to prevent network and I/O saturation on low-end kiosks/TV boxes
    for (let i = 0; i < validUrls.length; i += concurrency) {
      const chunk = validUrls.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (u) => {
          try {
            await this.cacheImage(u);
          } catch {}
        })
      );
    }

    await this.persistCacheMap();
    console.log(`[MediaCacheService] Media batch caching completed. Total cached entries: ${Object.keys(memoryCacheMap).length}`);
    return memoryCacheMap;
  }

  private saveTimeout: any = null;
  private saveCacheMapDebounced() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistCacheMap().catch(() => {});
    }, 1500);
  }

  private async persistCacheMap(): Promise<void> {
    try {
      await storageSetItem(MEDIA_CACHE_MAP_KEY, JSON.stringify(memoryCacheMap));
    } catch (e) {
      console.warn('[MediaCacheService] Failed persisting cache map:', e);
    }
  }

  /**
   * Returns a copy of current memory cache map.
   */
  getCacheMap(): Record<string, string> {
    return { ...memoryCacheMap };
  }
}

export const mediaCacheService = new MediaCacheService();
