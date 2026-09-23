import { useState, useEffect } from 'react';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { updateService } from '../services/updateService';

/**
 * Custom hook that returns the application version string (e.g., "1.0.2").
 * Immediately initializes with the build version from Expo Constants or Application,
 * and refreshes with the native Android PackageManager version if available.
 */
export function useAppVersion(): string {
  const defaultVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.0.2';

  const [version, setVersion] = useState<string>(defaultVersion);

  useEffect(() => {
    let isMounted = true;

    updateService
      .getAppVersionInfo()
      .then((info) => {
        if (isMounted && info?.versionName) {
          setVersion(info.versionName);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return version;
}
