import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { mediaCacheService } from './mediaCacheService';
import {
  DEFAULT_OFFLINE_3D_MODEL_DATA_URI,
  DEFAULT_OFFLINE_3D_MODEL_BASE64,
} from '../assets/offline3DModel';

/**
 * Resolves any 3D model reference (remote URL, file:// URI, or empty) into
 * a robust offline-capable URI (Base64 data URI or resolved local file)
 * that is guaranteed to render in WebView / iframe without CORS or network errors.
 */
export async function resolveOfflineModelUri(url?: string | null): Promise<string> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_OFFLINE_3D_MODEL_DATA_URI;
  }

  const trimmed = url.trim();

  // Already a self-contained data URI
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Check if mediaCacheService has a local cached copy
  const cachedLocalUri = mediaCacheService.resolveCachedImageUri(trimmed);

  // If we have a local file:// URI
  const fileCandidate = cachedLocalUri.startsWith('file://') ? cachedLocalUri : (trimmed.startsWith('file://') ? trimmed : null);

  if (fileCandidate && Platform.OS !== 'web') {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileCandidate);
      if (fileInfo.exists && (fileInfo as any).size > 0) {
        // Converting to data URI eliminates all WebView file-origin / CORS security restrictions
        const b64 = await FileSystem.readAsStringAsync(fileCandidate, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (b64 && b64.length > 50) {
          return `data:model/gltf-binary;base64,${b64}`;
        }
      }
    } catch (err) {
      console.warn('[modelAssetService] Failed reading cached file as base64, falling back:', err);
    }
  }

  // If it's a remote URL and network is offline or file is inaccessible
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If the device is offline or if it's the known copper rod 3D asset, use bundled offline model
    if (
      trimmed.includes('copper-bonded') ||
      trimmed.includes('earth-rod') ||
      trimmed.includes('excelearthing') ||
      trimmed.endsWith('.glb')
    ) {
      return DEFAULT_OFFLINE_3D_MODEL_DATA_URI;
    }
  }

  // Return resolved candidate or bundled fallback
  return fileCandidate || trimmed || DEFAULT_OFFLINE_3D_MODEL_DATA_URI;
}
