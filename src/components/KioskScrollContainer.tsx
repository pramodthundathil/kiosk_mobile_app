import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  ScrollView,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

export interface KioskScrollContainerProps extends ScrollViewProps {
  containerStyle?: StyleProp<ViewStyle>;
  indicatorBottomOffset?: number;
  indicatorBg?: string;
  indicatorBorderColor?: string;
  arrowColor?: string;
  arrowSize?: number;
  scrollStep?: number;
  hideThreshold?: number;
}

/**
 * KioskScrollContainer
 * Drop-in replacement for ScrollView that displays an animated floating arrow indicator
 * at the bottom when additional content is available by scrolling.
 * Automatically fades out when reaching the bottom and fades in when scrolling back up.
 * Supports tapping the arrow to scroll down smoothly.
 */
export const KioskScrollContainer = forwardRef<ScrollView, KioskScrollContainerProps>(
  (
    {
      children,
      style,
      containerStyle,
      contentContainerStyle,
      indicatorBottomOffset = 16,
      indicatorBg = 'rgba(13, 96, 174, 0.94)',
      indicatorBorderColor = 'rgba(56, 189, 248, 0.7)',
      arrowColor = '#FFFFFF',
      arrowSize = 18,
      scrollStep,
      hideThreshold = 20,
      onScroll,
      onContentSizeChange,
      onLayout,
      scrollEventThrottle = 16,
      ...restProps
    },
    ref
  ) => {
    const localScrollViewRef = useRef<ScrollView>(null);
    useImperativeHandle(ref, () => localScrollViewRef.current as ScrollView);

    const [isScrollable, setIsScrollable] = useState(false);
    const scrollYRef = useRef(0);
    const contentHeightRef = useRef(0);
    const layoutHeightRef = useRef(0);
    const isShowingRef = useRef(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    // Continuous floating bounce animation
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 5,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [bounceAnim]);

    const evaluateScrollIndicator = useCallback(() => {
      const cHeight = contentHeightRef.current;
      const lHeight = layoutHeightRef.current;
      const sY = scrollYRef.current;

      const hasOverflow = cHeight > lHeight + 15;
      const isAtBottom = sY + lHeight >= cHeight - hideThreshold;
      const shouldShow = hasOverflow && !isAtBottom;

      if (shouldShow !== isShowingRef.current) {
        isShowingRef.current = shouldShow;
        setIsScrollable(shouldShow);
        Animated.timing(fadeAnim, {
          toValue: shouldShow ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }, [fadeAnim, hideThreshold]);

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
        layoutHeightRef.current = e.nativeEvent.layoutMeasurement.height;
        contentHeightRef.current = e.nativeEvent.contentSize.height;
        evaluateScrollIndicator();
        if (onScroll) {
          onScroll(e);
        }
      },
      [evaluateScrollIndicator, onScroll]
    );

    const handleContentSizeChange = useCallback(
      (w: number, h: number) => {
        contentHeightRef.current = h;
        evaluateScrollIndicator();
        if (onContentSizeChange) {
          onContentSizeChange(w, h);
        }
      },
      [evaluateScrollIndicator, onContentSizeChange]
    );

    const handleLayout = useCallback(
      (e: LayoutChangeEvent) => {
        layoutHeightRef.current = e.nativeEvent.layout.height;
        evaluateScrollIndicator();
        if (onLayout) {
          onLayout(e);
        }
      },
      [evaluateScrollIndicator, onLayout]
    );

    const handleScrollDown = () => {
      const step = scrollStep || Math.max(220, layoutHeightRef.current * 0.7);
      const nextY = Math.min(
        scrollYRef.current + step,
        contentHeightRef.current - layoutHeightRef.current
      );
      localScrollViewRef.current?.scrollTo({
        y: Math.max(0, nextY),
        animated: true,
      });
    };

    return (
      <View style={[styles.outerContainer, containerStyle]}>
        <ScrollView
          ref={localScrollViewRef}
          style={[styles.scrollView, style]}
          contentContainerStyle={contentContainerStyle}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          scrollEventThrottle={scrollEventThrottle}
          {...restProps}
        >
          {children}
        </ScrollView>

        <Animated.View
          pointerEvents={isScrollable ? 'auto' : 'none'}
          style={[
            styles.arrowPositioner,
            {
              bottom: indicatorBottomOffset,
              opacity: fadeAnim,
              transform: [{ translateY: bounceAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleScrollDown}
            style={[
              styles.arrowButton,
              {
                backgroundColor: indicatorBg,
                borderColor: indicatorBorderColor,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scroll down for more items"
            accessibilityHint="Tapping scrolls the page down to view additional items"
          >
            <ChevronDown size={arrowSize} color={arrowColor} strokeWidth={2.8} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  arrowPositioner: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
});
