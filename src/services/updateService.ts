import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {
  getSavedServerUrl,
  getStoredKioskToken,
} from './api';
import { getDeviceMacAddress } from '../utils/deviceInfo';


const { KioskUpdateModule } = NativeModules;

export interface AppReleaseUpdateInfo {
  update_available: boolean;
  latest_version_name?: string;
  latest_version_code: number;
  current_version_code: number;
  mandatory?: boolean;
  release_title?: string;
  release_notes?: string[];
  apk_url?: string;
  apk_size?: number;
  sha256?: string;
}

export type UpdateLifecycleState =
  | 'IDLE'
  | 'CHECKING'
  | 'UPDATE_AVAILABLE'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'INSTALLING'
  | 'UPDATED'
  | 'DOWNLOAD_FAILED'
  | 'VERIFY_FAILED'
  | 'INSTALL_FAILED';

const LAST_REPORTED_VERSION_CODE_KEY = 'kiosk_last_reported_version_code';
const PENDING_UPDATE_KEY = 'kiosk_pending_update_meta';
const DEFAULT_UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

class UpdateService {
  private currentState: UpdateLifecycleState = 'IDLE';
  private updateCheckTimer: any = null;
  private isProcessing = false;
  private listeners: ((state: UpdateLifecycleState, message?: string) => void)[] = [];

  public getState(): UpdateLifecycleState {
    return this.currentState;
  }

  public onStateChange(listener: (state: UpdateLifecycleState, message?: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(state: UpdateLifecycleState, message?: string) {
    this.currentState = state;
    this.listeners.forEach((l) => l(state, message));
  }

  /**
   * Retrieves installed application version info from native Android package manager.
   */
  public async getAppVersionInfo(): Promise<{
    versionName: string;
    versionCode: number;
    packageName: string;
    isDeviceOwner: boolean;
  }> {
    const fallbackVersion =
      Application.nativeApplicationVersion ||
      Constants.expoConfig?.version ||
      '1.0.8';
    const fallbackCode =
      Number(Application.nativeBuildVersion) ||
      Number(Constants.expoConfig?.android?.versionCode) ||
      8;

    if (Platform.OS === 'android' && KioskUpdateModule && KioskUpdateModule.getAppVersionInfo) {
      try {
        const info = await KioskUpdateModule.getAppVersionInfo();
        const rawName = info?.versionName || fallbackVersion;
        const cleanName = String(rawName).replace(/^v/i, '').trim();
        const parsedCode = Number(info?.versionCode) || fallbackCode;
        return {
          versionName: cleanName,
          versionCode: parsedCode,
          packageName: info?.packageName || 'com.kiosk.app',
          isDeviceOwner: !!info?.isDeviceOwner,
        };
      } catch (e) {
        console.warn('[UpdateService] Failed getting native version info:', e);
      }
    }
    return {
      versionName: String(fallbackVersion).replace(/^v/i, '').trim(),
      versionCode: fallbackCode,
      packageName: 'com.kiosk.app',
      isDeviceOwner: false,
    };
  }

  /**
   * Reports an update state transition back to the Django backend.
   */
  public async reportUpdateStatus(
    status: 'DOWNLOADING' | 'INSTALLING' | 'UPDATED' | 'FAILED',
    versionName: string,
    versionCode: number,
    message: string = ''
  ): Promise<boolean> {
    try {
      const serverUrl = await getSavedServerUrl();
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/api/kiosk/app-update/status/`;
      const deviceId = await getDeviceMacAddress();
      const token = await getStoredKioskToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-MAC': deviceId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          device_id: deviceId,
          version_name: versionName,
          version_code: versionCode,
          status,
          message,
        }),
      });

      console.log(`[UpdateService] Reported status [${status}] to backend (HTTP ${res.status})`);
      return res.ok;
    } catch (e) {
      console.warn('[UpdateService] Failed reporting status to backend:', e);
      return false;
    }
  }

  /**
   * Checks for newer releases from the Django backend.
   */
  public async checkForUpdate(force = false): Promise<AppReleaseUpdateInfo | null> {
    if (force) {
      this.isProcessing = false;
    } else if (this.isProcessing) {
      console.log('[UpdateService] Update check already in progress, skipping.');
      return null;
    }

    try {
      this.notify('CHECKING');
      const versionInfo = await this.getAppVersionInfo();
      const serverUrl = await getSavedServerUrl();
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const deviceId = await getDeviceMacAddress();
      const token = await getStoredKioskToken();

      const queryParams = new URLSearchParams({
        device_id: deviceId,
        version_code: String(versionInfo.versionCode),
        version_name: versionInfo.versionName,
      });

      const endpoint = `${cleanUrl}/api/kiosk/app-update/?${queryParams.toString()}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-MAC': deviceId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { method: 'GET', headers });
      if (!res.ok) {
        console.warn(`[UpdateService] App update check failed with HTTP ${res.status}`);
        this.notify('IDLE');
        return null;
      }

      const data: AppReleaseUpdateInfo = await res.json();
      if (data.update_available && data.latest_version_code > versionInfo.versionCode && data.apk_url) {
        console.log(`[UpdateService] Update available: v${data.latest_version_name} (code ${data.latest_version_code})`);
        this.notify('UPDATE_AVAILABLE', `New version v${data.latest_version_name} available`);

        // Trigger download & install flow
        this.performUpdate(data).catch((err) => {
          console.error('[UpdateService] Failed executing update:', err);
        });
        return data;
      } else {
        console.log('[UpdateService] App is up to date.');
        this.notify('IDLE');
        return data;
      }
    } catch (err: any) {
      console.warn('[UpdateService] Error checking for app update:', err);
      this.notify('IDLE');
      return null;
    }
  }

  /**
   * Downloads, verifies SHA-256, and executes APK installation.
   */
  public async performUpdate(release: AppReleaseUpdateInfo): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    const versionName = release.latest_version_name || '1.0.0';
    const versionCode = release.latest_version_code;
    const apkUrl = release.apk_url;
    const expectedSha256 = release.sha256 || '';

    if (!apkUrl) {
      this.notify('DOWNLOAD_FAILED', 'Missing APK URL');
      this.isProcessing = false;
      return false;
    }

    try {
      // 1. Report DOWNLOADING to Django
      this.notify('DOWNLOADING', `Downloading update v${versionName}...`);
      await this.reportUpdateStatus('DOWNLOADING', versionName, versionCode, 'Initiated APK download');

      if (Platform.OS !== 'android' || !KioskUpdateModule) {
        console.log('[UpdateService] Non-Android environment, skipping native download/install.');
        this.notify('IDLE');
        return false;
      }

      // 2. Native streaming download and SHA-256 verification
      this.notify('VERIFYING', 'Verifying package checksum...');
      let downloadResult: { filePath: string; fileSize: number; sha256: string };
      try {
        downloadResult = await KioskUpdateModule.downloadAndVerifyApk(apkUrl, expectedSha256);
        console.log('[UpdateService] APK download and SHA256 verification succeeded:', downloadResult);
      } catch (dlErr: any) {
        console.error('[UpdateService] Download or checksum error:', dlErr);
        const errMsg = dlErr?.message || 'Checksum verification or download failed';
        this.notify('VERIFY_FAILED', errMsg);
        await this.reportUpdateStatus('FAILED', versionName, versionCode, errMsg);
        return false;
      }

      // 3. Save pending update metadata in AsyncStorage so upon restart we can verify success
      await AsyncStorage.setItem(
        PENDING_UPDATE_KEY,
        JSON.stringify({
          targetVersionCode: versionCode,
          targetVersionName: versionName,
          timestamp: Date.now(),
        })
      );

      // 4. Report INSTALLING to Django
      this.notify('INSTALLING', 'Installing application update...');
      await this.reportUpdateStatus('INSTALLING', versionName, versionCode, 'APK validated, installation started');

      // 5. Trigger native package installer (silent if Device Owner, prompt fallback otherwise)
      const installResult = await KioskUpdateModule.installApk(downloadResult.filePath);
      console.log('[UpdateService] Native install result:', installResult);

      return true;
    } catch (installErr: any) {
      console.error('[UpdateService] Installation failed:', installErr);
      const errMsg = installErr?.message || 'Installation execution error';
      this.notify('INSTALL_FAILED', errMsg);
      await this.reportUpdateStatus('FAILED', versionName, versionCode, errMsg);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Called on application boot to detect if app was recently restarted post OTA upgrade.
   */
  public async checkPostUpdateRestart(): Promise<void> {
    try {
      const versionInfo = await this.getAppVersionInfo();
      const currentCode = versionInfo.versionCode;
      const currentName = versionInfo.versionName;

      const lastReportedRaw = await AsyncStorage.getItem(LAST_REPORTED_VERSION_CODE_KEY);
      const lastReportedCode = lastReportedRaw ? parseInt(lastReportedRaw, 10) : 0;

      const pendingMetaRaw = await AsyncStorage.getItem(PENDING_UPDATE_KEY);
      let pendingMeta: { targetVersionCode: number; targetVersionName: string; timestamp: number } | null = null;
      if (pendingMetaRaw) {
        try {
          pendingMeta = JSON.parse(pendingMetaRaw);
        } catch (e) {}
      }

      if (pendingMeta) {
        if (currentCode >= pendingMeta.targetVersionCode) {
          // Installation confirmed successful!
          console.log(`[UpdateService] App successfully upgraded to v${currentName} (code ${currentCode})`);
          this.notify('UPDATED', `Running v${currentName}`);

          await this.reportUpdateStatus(
            'UPDATED',
            currentName,
            currentCode,
            `Application upgraded and restarted successfully into kiosk mode (v${currentName})`
          );

          await AsyncStorage.setItem(LAST_REPORTED_VERSION_CODE_KEY, String(currentCode));
          await AsyncStorage.removeItem(PENDING_UPDATE_KEY);

          // Maintain lock task mode if Device Owner
          if (Platform.OS === 'android' && KioskUpdateModule?.startLockTask && versionInfo.isDeviceOwner) {
            KioskUpdateModule.startLockTask().catch(() => {});
          }
        } else {
          // Restarted, but version did not reach targetVersionCode (e.g. cancelled or failed)
          console.warn(`[UpdateService] App rebooted with versionCode ${currentCode}, expected >= ${pendingMeta.targetVersionCode}. Update failed or was cancelled.`);
          this.notify('INSTALL_FAILED', 'Update installation did not complete');

          await this.reportUpdateStatus(
            'FAILED',
            currentName,
            currentCode,
            `Installation did not complete or was cancelled. Still running v${currentName} (code ${currentCode})`
          );
          await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
        }
      } else if (currentCode > lastReportedCode) {
        console.log(`[UpdateService] New application version detected: v${currentName} (code ${currentCode})`);
        this.notify('UPDATED', `Running v${currentName}`);

        await this.reportUpdateStatus(
          'UPDATED',
          currentName,
          currentCode,
          `Application running v${currentName} (code ${currentCode})`
        );
        await AsyncStorage.setItem(LAST_REPORTED_VERSION_CODE_KEY, String(currentCode));
      }
    } catch (e) {
      console.warn('[UpdateService] Error checking post update restart:', e);
    }
  }

  /**
   * Initializes periodic checks and lifecycle hooks.
   */
  public initUpdateService(intervalMs: number = DEFAULT_UPDATE_INTERVAL_MS): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }

    // 1. Check if we just booted up after an update
    this.checkPostUpdateRestart().catch(() => {});

    // 2. Perform initial update check
    this.checkForUpdate().catch(() => {});

    // 3. Periodic update runner (every 30 mins)
    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdate().catch(() => {});
    }, intervalMs);
  }

  public stopUpdateService(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
    }
  }
}

export const updateService = new UpdateService();
