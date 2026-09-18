import { useWindowDimensions, PixelRatio, Dimensions } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { KioskOrientation, KioskHardwareType, KioskResponsiveMetrics } from '../types/kiosk';

// Baseline reference dimensions in density-independent pixels (DP)
const LANDSCAPE_BASELINE_WIDTH = 960;
const PORTRAIT_BASELINE_WIDTH = 450;

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
    const pixelRatio = PixelRatio.get();

    // Physical pixel dimension estimation to detect 4K / UHD screen panels
    const physicalWidth = effectiveWidth * pixelRatio;
    const physicalHeight = effectiveHeight * pixelRatio;
    const maxPhysicalDimension = Math.max(physicalWidth, physicalHeight);
    const is4K = maxPhysicalDimension >= 2560 || effectiveWidth >= 2000;

    // Categorize hardware size
    let kioskType: KioskHardwareType;
    if (simulatedType) {
      kioskType = simulatedType;
    } else if (effectiveIsLandscape) {
      kioskType = effectiveWidth >= 900 ? 'LANDSCAPE_22' : 'DYNAMIC_TABLET';
    } else {
      kioskType = effectiveHeight >= 850 ? 'PORTRAIT_43' : 'DYNAMIC_MOBILE';
    }

    // Grid columns recommendation
    let gridColumns = 2;
    if (effectiveIsLandscape) {
      gridColumns = effectiveWidth > 1800 ? 5 : effectiveWidth > 1300 ? 4 : 3;
    } else {
      gridColumns = effectiveWidth > 700 ? 3 : 2;
    }

    // Dynamic scale factor for Ultra HD / 4K Kiosks (scales up to 4.0x on full 4K framebuffers)
    const baseline = effectiveIsLandscape ? LANDSCAPE_BASELINE_WIDTH : PORTRAIT_BASELINE_WIDTH;
    const rawScale = effectiveWidth / baseline;
    const scaleFactor = Math.max(1.0, Math.min(4.0, rawScale));

    /**
     * Scales font size and strictly snaps it to the physical pixel grid using PixelRatio.roundToNearestPixel.
     * Snapping eliminates subpixel interpolation blur, rendering razor-sharp lettering on 4K displays.
     */
    const scaleFont = (baseSize: number, minSize: number = 11): number => {
      const scaled = Math.max(minSize, baseSize * scaleFactor);
      return PixelRatio.roundToNearestPixel(scaled);
    };

    /**
     * Scales spacing, padding, and margins aligned to nearest physical pixel.
     */
    const scaleSpacing = (baseSize: number): number => {
      return PixelRatio.roundToNearestPixel(baseSize * scaleFactor);
    };

    const crispTextProps = {
      includeFontPadding: false,
      textBreakStrategy: 'simple' as const,
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
      is4K,
      pixelRatio,
      crispTextProps,
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
