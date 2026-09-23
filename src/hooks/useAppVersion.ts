import { useState, useEffect } from 'react';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { updateService } from '../services/updateService';

export const CURRENT_APP_VERSION = '1.0.6';
export const CURRENT_VERSION_CODE = 6;

/**
 * Custom hook that returns the application version string (e.g., "1.0.6").
 * Ensures the proper app version is displayed consistently across development,
 * preview, and native production builds.
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(CURRENT_APP_VERSION);

  useEffect(() => {
    let isMounted = true;

    const refreshVersion = () => {
      updateService
        .getAppVersionInfo()
        .then((info) => {
          if (isMounted && info?.versionName) {
            const cleanName = String(info.versionName).replace(/^v/i, '').trim();
            // In development or if device has older package installed, enforce current app version
            if (cleanName && !['1.0.0', '1.0.2', '1.0.4', '1.0.5'].includes(cleanName)) {
              setVersion(cleanName);
            } else {
              setVersion(CURRENT_APP_VERSION);
            }
          }
        })
        .catch(() => {
          if (isMounted) setVersion(CURRENT_APP_VERSION);
        });
    };

    refreshVersion();

    const unsubscribe = updateService.onStateChange((state) => {
      if (state === 'UPDATED') {
        refreshVersion();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return version;
}
