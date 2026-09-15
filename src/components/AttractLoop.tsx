import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Animated, Platform, Modal } from 'react-native';
import { Touchpad, ArrowRight } from 'lucide-react-native';

const isTV = Platform.isTV;
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';
import { KioskResponsiveMetrics, KioskScreensaver } from '../types/kiosk';
import { fetchScreensavers } from '../services/api';

interface AttractLoopProps {
  metrics: KioskResponsiveMetrics;
  onDismiss: () => void;
  screensavers?: KioskScreensaver[];
}

const DEFAULT_SCREENSAVERS: Partial<KioskScreensaver>[] = [
  {
    id: 'default-1',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
  },
  {
    id: 'default-2',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
  },
  {
    id: 'default-3',
    image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1920&q=80',
    duration_seconds: 8,
  },
];

export const AttractLoop: React.FC<AttractLoopProps> = ({ metrics, onDismiss, screensavers: initialScreensavers }) => {
  const { isLandscape } = metrics;
  const [slides, setSlides] = useState<(KioskScreensaver | Partial<KioskScreensaver>)[]>(
    initialScreensavers && initialScreensavers.length > 0 ? initialScreensavers : DEFAULT_SCREENSAVERS
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Pulsing animation for bottom Touch Screen prompt
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Pre-fetch screensavers dynamically if not supplied via props
  useEffect(() => {
    let isMounted = true;
    if (!initialScreensavers || initialScreensavers.length === 0) {
      const orientationParam = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
      fetchScreensavers(orientationParam).then((fetched) => {
        if (isMounted && fetched && fetched.length > 0) {
          setFailedImages({});
          setSlides(fetched);
          setCurrentIndex(0);
          setPreviousIndex(null);
        }
      });
    } else {
      setFailedImages({});
      setSlides(initialScreensavers);
      setCurrentIndex(0);
      setPreviousIndex(null);
    }
    return () => {
      isMounted = false;
    };
  }, [initialScreensavers, isLandscape]);

  // Preload all image assets into memory cache
  useEffect(() => {
    slides.forEach((s) => {
      const uri = s.image_url || s.image;
      if (uri) {
        Image.prefetch(uri).catch(() => {});
      }
    });
  }, [slides]);

  // Transition handler with smooth cross-fade
  const advanceToNextSlide = () => {
    if (slides.length <= 1) return;

    const nextIdx = (currentIndex + 1) % slides.length;
    setPreviousIndex(currentIndex);
    setCurrentIndex(nextIdx);

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  // Slideshow auto-advance timer
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlide = slides[currentIndex];
    const displayDurationMs = ((currentSlide?.duration_seconds || 10) * 1000);

    const timer = setTimeout(() => {
      advanceToNextSlide();
    }, displayDurationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  const activeSlide = slides[currentIndex] || slides[0] || DEFAULT_SCREENSAVERS[0];
  const activeSlideId = activeSlide.id || `slide-${currentIndex}`;
  const activeRawUri = activeSlide.image_url || activeSlide.image;
  const isActiveFailed = failedImages[activeSlideId];
  const activeUri = !isActiveFailed && activeRawUri ? activeRawUri : DEFAULT_SCREENSAVERS[currentIndex % DEFAULT_SCREENSAVERS.length].image_url!;

  const prevSlide = previousIndex !== null ? (slides[previousIndex] || slides[0]) : null;
  const prevSlideId = prevSlide?.id || (previousIndex !== null ? `slide-${previousIndex}` : '');
  const prevRawUri = prevSlide ? (prevSlide.image_url || prevSlide.image) : null;
  const isPrevFailed = prevSlideId ? failedImages[prevSlideId] : false;
  const prevUri = prevSlide && !isPrevFailed && prevRawUri ? prevRawUri : (previousIndex !== null ? DEFAULT_SCREENSAVERS[previousIndex % DEFAULT_SCREENSAVERS.length].image_url! : null);

  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={styles.fullContainer}
        hasTVPreferredFocus={isTV}
        accessible={true}
        accessibilityLabel="Press OK or touch to continue"
      >
        <View style={styles.imageWrapper}>
          {/* Layer 1: Previous Slide */}
          {prevUri && (
            <Image
              key={`prev-${previousIndex}`}
              source={{ uri: prevUri }}
              style={styles.fullscreenImage}
              resizeMode="stretch"
            />
          )}

          {/* Layer 2: Active Incoming Slide */}
          <Animated.View style={[styles.activeLayer, { opacity: fadeAnim }]}>
            <Image
              key={`active-${currentIndex}`}
              source={{ uri: activeUri }}
              style={styles.fullscreenImage}
              resizeMode="stretch"
              onError={(e) => {
                console.warn(`Screensaver image error [${activeSlideId}]:`, activeUri, e.nativeEvent?.error);
                setFailedImages((prev) => ({ ...prev, [activeSlideId]: true }));
              }}
            />
          </Animated.View>
        </View>

        {/* Modern Frosted Glass Floating Touch Prompt Pill */}
        <View style={styles.floatingPromptContainer} pointerEvents="none">
          <Animated.View style={[styles.floatingPromptPill, { opacity: pulseAnim }]}>
            <Touchpad size={15} color="#FFFFFF" strokeWidth={kioskIcons.strokeWidth} />
            <Text style={styles.floatingPromptText}>
              {isTV ? 'PRESS OK ON REMOTE TO CONTINUE' : 'TOUCH SCREEN TO EXPLORE'}
            </Text>
            <ArrowRight size={15} color={kioskColors.lightningGold} strokeWidth={kioskIcons.strokeWidth} />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  activeLayer: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPromptContainer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  floatingPromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingPromptText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
