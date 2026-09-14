import { useWindowDimensions } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { KioskOrientation, KioskHardwareType, KioskResponsiveMetrics } from '../types/kiosk';

// Baseline reference dimensions
const LANDSCAPE_BASELINE_WIDTH = 1920;
const PORTRAIT_BASELINE_WIDTH = 1080;

export function useKioskResponsive(): KioskResponsiveMetrics & {
  orientation: KioskOrientation;
  simulatedType: KioskHardwareType | null;
  setSimulatedType: (type: KioskHardwareType | null) => void;
  lockLandscape: () => Promise<void>;
  lockPortrait: () => Promise<void>;
  unlockOrientation: () => Promise<void>;
} {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [simulatedType, setSimulatedType] = useState<KioskHardwareType | null>(null);

  // Auto-detect physical orientation
  const isPhysicalLandscape = windowWidth > windowHeight;
  const currentOrientation: KioskOrientation = isPhysicalLandscape ? 'LANDSCAPE' : 'PORTRAIT';

  // Lock orientation helper methods
  const lockLandscape = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (e) {
      console.warn('ScreenOrientation lock failed:', e);
    }
  };

  const lockPortrait = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    } catch (e) {
      console.warn('ScreenOrientation lock failed:', e);
    }
  };

  const unlockOrientation = async () => {
    try {
      await ScreenOrientation.unlockAsync();
    } catch (e) {
      console.warn('ScreenOrientation unlock failed:', e);
    }
  };

  const metrics = useMemo(() => {
    // Check if user enabled simulated mode for testing
    let effectiveWidth = windowWidth;
    let effectiveHeight = windowHeight;
    let effectiveIsLandscape = isPhysicalLandscape;

    if (simulatedType === 'LANDSCAPE_22') {
      effectiveIsLandscape = true;
      effectiveWidth = Math.max(windowWidth, windowHeight);
      effectiveHeight = Math.min(windowWidth, windowHeight);
    } else if (simulatedType === 'PORTRAIT_43') {
      effectiveIsLandscape = false;
      effectiveWidth = Math.min(windowWidth, windowHeight);
      effectiveHeight = Math.max(windowWidth, windowHeight);
    }

    const effectiveIsPortrait = !effectiveIsLandscape;
    const aspectRatio = effectiveWidth / effectiveHeight;

    // Categorize hardware size
    let kioskType: KioskHardwareType;
    if (simulatedType) {
      kioskType = simulatedType;
    } else if (effectiveIsLandscape) {
      kioskType = effectiveWidth >= 900 ? 'LANDSCAPE_22' : 'DYNAMIC_TABLET';
    } else {
      kioskType = effectiveHeight >= 900 ? 'PORTRAIT_43' : 'DYNAMIC_MOBILE';
    }

    // Grid columns recommendation
    let gridColumns = 3;
    if (kioskType === 'LANDSCAPE_22') {
      gridColumns = effectiveWidth > 1400 ? 4 : 3;
    } else if (kioskType === 'PORTRAIT_43') {
      gridColumns = 2;
    } else if (effectiveIsLandscape) {
      gridColumns = 3;
    } else {
      gridColumns = 2;
    }

    // Font & spacing scaling formulas
    const baseline = effectiveIsLandscape ? LANDSCAPE_BASELINE_WIDTH : PORTRAIT_BASELINE_WIDTH;
    const scaleFactor = Math.max(0.7, Math.min(1.4, effectiveWidth / baseline));

    const scaleFont = (baseSize: number) => {
      // Ensure text is legible on large kiosk displays without becoming oversized
      return Math.round(baseSize * scaleFactor);
    };

    const scaleSpacing = (baseSize: number) => {
      return Math.round(baseSize * scaleFactor);
    };

    return {
      width: effectiveWidth,
      height: effectiveHeight,
      isLandscape: effectiveIsLandscape,
      isPortrait: effectiveIsPortrait,
      aspectRatio,
      kioskType,
      gridColumns,
      scaleFont,
      scaleSpacing,
    };
  }, [windowWidth, windowHeight, isPhysicalLandscape, simulatedType]);

  return {
    ...metrics,
    orientation: currentOrientation,
    simulatedType,
    setSimulatedType,
    lockLandscape,
    lockPortrait,
    unlockOrientation,
  };
}
