import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Animated,
  Platform,
  Modal,
  BackHandler,
  Easing,
} from 'react-native';
import { Touchpad } from 'lucide-react-native';
import { KioskResponsiveMetrics, KioskScreensaver } from '../types/kiosk';
import { getCachedScreensavers } from '../services/api';
import { mediaCacheService } from '../services/mediaCacheService';

interface AttractLoopProps {
  metrics: KioskResponsiveMetrics;
  onDismiss: () => void;
  screensavers?: KioskScreensaver[];
}

const DEFAULT_LANDSCAPE_SCREENSAVERS: Partial<KioskScreensaver>[] = [
  {
    id: 'default-l-1',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
    orientation: 'LANDSCAPE',
  },
  {
    id: 'default-l-2',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
    orientation: 'LANDSCAPE',
  },
  {
    id: 'default-l-3',
    image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
    orientation: 'LANDSCAPE',
  },
];

const DEFAULT_PORTRAIT_SCREENSAVERS: Partial<KioskScreensaver>[] = [
  {
    id: 'default-p-1',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1080&h=1920&q=80',
    duration_seconds: 8,
    orientation: 'PORTRAIT',
  },
  {
    id: 'default-p-2',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1080&h=1920&q=80',
    duration_seconds: 8,
    orientation: 'PORTRAIT',
  },
];

export const AttractLoop: React.FC<AttractLoopProps> = ({
  metrics,
  onDismiss,
  screensavers: initialScreensavers,
}) => {
  const { isLandscape } = metrics;
  const orientationParam = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
  const defaultFallback = isLandscape ? DEFAULT_LANDSCAPE_SCREENSAVERS : DEFAULT_PORTRAIT_SCREENSAVERS;

  // Filter initial screensavers matching current orientation and resolve offline disk URIs
  const initialMatching = initialScreensavers
    ?.filter((s) => !s.orientation || s.orientation === orientationParam || s.orientation === 'BOTH')
    .map((s) => ({
      ...s,
      image: mediaCacheService.resolveCachedImageUri(s.image) || s.image,
      image_url: mediaCacheService.resolveCachedImageUri(s.image_url) || s.image_url,
    }));

  const [slides, setSlides] = useState<(KioskScreensaver | Partial<KioskScreensaver>)[]>(
    initialMatching && initialMatching.length > 0 ? initialMatching : defaultFallback
  );
  const [failedUris, setFailedUris] = useState<Record<string, boolean>>({});

  // ── DUAL PERSISTENT BUFFER SLOTS ──
  // Slot 0 and Slot 1 ping-pong back and forth so the outgoing image NEVER unmounts
  // or disappears before the incoming image is 100% rendered and opaque.
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [topSlot, setTopSlot] = useState<0 | 1>(0);
  const [slideIdx0, setSlideIdx0] = useState<number>(0);
  const [slideIdx1, setSlideIdx1] = useState<number>(slides.length > 1 ? 1 : 0);

  const isTransitioningRef = useRef<boolean>(false);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // Seamless Entrance Fade (eliminates black screen blink when opening screensaver)
  const entranceFade = useRef(new Animated.Value(0)).current;

  // Smooth Crossfade Opacity Animations between Slot 0 and Slot 1
  const opacity0 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;

  // Subtle Attention Pulse for bottom touch prompt lettering
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.timing(entranceFade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [entranceFade]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.65,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Preload all image assets into disk cache immediately
  useEffect(() => {
    slides.forEach((s) => {
      const uri = s.image_url || s.image;
      if (uri) {
        Image.prefetch(uri).catch(() => {});
      }
    });
  }, [slides]);

  // Synchronize matching slides from props or disk cache (NO blocking network fetch on open)
  useEffect(() => {
    let isMounted = true;
    const targetOri = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';

    if (initialScreensavers && initialScreensavers.length > 0) {
      const matching = initialScreensavers.filter(
        (s) => !s.orientation || s.orientation === targetOri || s.orientation === 'BOTH'
      );
      if (matching.length > 0) {
        const resolved = matching.map((s) => ({
          ...s,
          image: mediaCacheService.resolveCachedImageUri(s.image) || s.image,
          image_url: mediaCacheService.resolveCachedImageUri(s.image_url) || s.image_url,
        }));
        setSlides(resolved);
        setSlideIdx0(0);
        setSlideIdx1(matching.length > 1 ? 1 : 0);
        return;
      }
    }

    // If initialScreensavers is empty or not passed, load cached screensavers from disk immediately
    getCachedScreensavers(targetOri).then((cached) => {
      if (isMounted && cached && cached.length > 0) {
        const resolved = cached.map((s) => ({
          ...s,
          image: mediaCacheService.resolveCachedImageUri(s.image) || s.image,
          image_url: mediaCacheService.resolveCachedImageUri(s.image_url) || s.image_url,
        }));
        setSlides(resolved);
        setSlideIdx0(0);
        setSlideIdx1(cached.length > 1 ? 1 : 0);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialScreensavers, isLandscape]);

  // Resolve a valid image URL for a given slide index with safety fallbacks
  const getUriForIndex = useCallback(
    (idx: number): string => {
      const slideList = slidesRef.current;
      if (!slideList || slideList.length === 0) {
        return defaultFallback[0].image_url!;
      }
      const safeIdx = ((idx % slideList.length) + slideList.length) % slideList.length;
      const slide = slideList[safeIdx];
      const raw = slide?.image_url || slide?.image;
      if (raw) {
        const resolved = mediaCacheService.resolveCachedImageUri(raw);
        if (resolved) return resolved;
        return raw;
      }
      return defaultFallback[safeIdx % defaultFallback.length].image_url!;
    },
    [defaultFallback]
  );

  // Smooth Crossfade Transition (zero black gap, fully fit to screen, no overflow, no contain)
  const triggerSlideTransition = useCallback(() => {
    const slideList = slidesRef.current;
    if (slideList.length <= 1 || isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    if (activeSlot === 0) {
      // Transitioning: Slot 0 (outgoing) -> Slot 1 (incoming)
      setTopSlot(1);

      // Prepare Slot 1 initial state before animation
      opacity1.setValue(0);
      opacity0.setValue(1);

      // Smooth Crossfade: Slot 1 fades in over Slot 0
      Animated.timing(opacity1, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setActiveSlot(1);
        isTransitioningRef.current = false;

        // Reset Slot 0 behind Slot 1
        opacity0.setValue(0);

        // Pre-decode next slide in Slot 0 during the entire duration of Slot 1
        setSlideIdx0((slideIdx1 + 1) % slideList.length);
      });
    } else {
      // Transitioning: Slot 1 (outgoing) -> Slot 0 (incoming)
      setTopSlot(0);

      // Prepare Slot 0 initial state before animation
      opacity0.setValue(0);
      opacity1.setValue(1);

      // Smooth Crossfade: Slot 0 fades in over Slot 1
      Animated.timing(opacity0, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setActiveSlot(0);
        isTransitioningRef.current = false;

        // Reset Slot 1 behind Slot 0
        opacity1.setValue(0);

        // Pre-decode next slide in Slot 1 during the entire duration of Slot 0
        setSlideIdx1((slideIdx0 + 1) % slideList.length);
      });
    }
  }, [activeSlot, slideIdx0, slideIdx1, opacity0, opacity1]);

  // Slideshow auto-advance timer:
  // Automatically triggers transition based on current active slide's duration_seconds (default 8-10s)
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlideIndex = activeSlot === 0 ? slideIdx0 : slideIdx1;
    const currentSlide = slides[currentSlideIndex % slides.length];
    const displayDurationMs = (currentSlide?.duration_seconds || 8) * 1000;

    const timer = setTimeout(() => {
      triggerSlideTransition();
    }, displayDurationMs);

    return () => clearTimeout(timer);
  }, [activeSlot, slideIdx0, slideIdx1, slides, triggerSlideTransition]);

  // Dismiss screensaver if hardware Back button is pressed on remote / device
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true; // handled
    });
    return () => backSub.remove();
  }, [onDismiss]);

  const uri0 = getUriForIndex(slideIdx0);
  const uri1 = getUriForIndex(slideIdx1);

  // Fully fit to screen with resizeMode="stretch" (no overflow, no contain/bars)
  const renderSlot0 = () => (
    <Animated.View
      key="buffer-slot-0"
      style={[
        styles.slotLayer,
        {
          opacity: opacity0,
          zIndex: topSlot === 0 ? 2 : 1,
          elevation: topSlot === 0 ? 2 : 1,
        },
      ]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: uri0 }}
        style={styles.fullscreenImage}
        resizeMode="stretch"
        fadeDuration={0}
        onError={() => {
          console.warn('[AttractLoop] Slide notice loading uri0:', uri0);
        }}
      />
    </Animated.View>
  );

  const renderSlot1 = () => (
    <Animated.View
      key="buffer-slot-1"
      style={[
        styles.slotLayer,
        {
          opacity: opacity1,
          zIndex: topSlot === 1 ? 2 : 1,
          elevation: topSlot === 1 ? 2 : 1,
        },
      ]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: uri1 }}
        style={styles.fullscreenImage}
        resizeMode="stretch"
        fadeDuration={0}
        onError={() => {
          console.warn('[AttractLoop] Slide notice loading uri1:', uri1);
        }}
      />
    </Animated.View>
  );

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={styles.touchArea}
        focusable={true}
        hasTVPreferredFocus={true}
        accessible={true}
        accessibilityLabel="Touch screen to explore"
      >
        <Animated.View style={[styles.fullContainer, { opacity: entranceFade }]}>
          <View style={styles.imageWrapper}>
            {topSlot === 1 ? (
              <>
                {renderSlot0()}
                {renderSlot1()}
              </>
            ) : (
              <>
                {renderSlot1()}
                {renderSlot0()}
              </>
            )}
          </View>

          {/* Clean, Unboxed Floating Touch Prompt - High-Contrast Lettering with Deep Shadow */}
          <View style={styles.floatingPromptContainer} pointerEvents="none">
            <Animated.View style={[styles.floatingPromptRow, { opacity: pulseAnim }]}>
              <Touchpad
                size={metrics.scaleFont(16, 14)}
                color="#FFFFFF"
                strokeWidth={2.4}
                style={styles.promptIcon}
              />
              <Text
                style={[
                  styles.floatingPromptText,
                  { fontSize: metrics.scaleFont(15, 13) },
                ]}
              >
                TOUCH SCREEN TO EXPLORE
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  touchArea: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  fullContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  slotLayer: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  fullscreenImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  floatingPromptContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  floatingPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  promptIcon: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingPromptText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    includeFontPadding: false,
  },
});
