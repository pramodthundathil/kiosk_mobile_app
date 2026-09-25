import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Image,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { Zap, ShieldCheck } from 'lucide-react-native';

const isTV = Platform.isTV;

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

// Official brand assets
const EXCEL_SINCE_LOGO = require('../../assets/excel_since_logo.png');
const EXCEL_CORPORATE_LOGO = require('../../assets/excel_corporate_logo.png');
const EXCEL_DEDICATED_CAPTION = require('../../assets/excel_dedicated_caption_gold.png');

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onFinish }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [hasFinished, setHasFinished] = useState(false);

  // Master fade & scale out
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Crest seal animations
  const crestScale = useRef(new Animated.Value(0.72)).current;
  const crestOpacity = useRef(new Animated.Value(0)).current;
  const crestFloat = useRef(new Animated.Value(0)).current;

  // Electrical wave rings
  const pulseScale1 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.65)).current;
  const pulseScale2 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0)).current;

  // Original logo writings entrance
  const logoTextOpacity = useRef(new Animated.Value(0)).current;
  const logoTextTranslateY = useRef(new Animated.Value(16)).current;

  // Cursive caption entrance
  const captionOpacity = useRef(new Animated.Value(0)).current;
  const captionTranslateY = useRef(new Animated.Value(12)).current;

  // Grounding safety bar & spark
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sparkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide native OS splash screen immediately so our animated splash takes over cleanly
    SplashScreen.hideAsync().catch(() => {});

    // 1. Entrance timeline
    Animated.parallel([
      // Crest seal spring
      Animated.spring(crestScale, {
        toValue: 1,
        friction: 6.5,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(crestOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // Original logo writings entrance
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(logoTextOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoTextTranslateY, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Caption entrance
      Animated.sequence([
        Animated.delay(550),
        Animated.parallel([
          Animated.timing(captionOpacity, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(captionTranslateY, {
            toValue: 0,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Grounding progress line
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Continuous crest hovering float
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(crestFloat, {
          toValue: -5,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(crestFloat, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // 3. Earthing electrical pulse wave loop
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale1, {
              toValue: 1.45,
              duration: 2200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity1, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale1, { toValue: 0.85, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity1, { toValue: 0.65, duration: 0, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(1000),
          Animated.parallel([
            Animated.timing(pulseScale2, {
              toValue: 1.45,
              duration: 2200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity2, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale2, { toValue: 0.85, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity2, { toValue: 0.65, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    pulseLoop.start();

    // 4. Electric spark flicker loop
    const sparkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(sparkOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(sparkOpacity, { toValue: 0.2, duration: 40, useNativeDriver: true }),
        Animated.timing(sparkOpacity, { toValue: 0.9, duration: 70, useNativeDriver: true }),
        Animated.timing(sparkOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    sparkLoop.start();

    // Automatic finish safety timer (3.5 seconds)
    const autoFinishTimer = setTimeout(() => {
      finishSplashScreen();
    }, 3500);

    return () => {
      clearTimeout(autoFinishTimer);
      floatLoop.stop();
      pulseLoop.stop();
      sparkLoop.stop();
    };
  }, []);

  const finishSplashScreen = () => {
    if (hasFinished) return;
    setHasFinished(true);

    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.03,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  };

  // Dimensions dynamically proportional to screen height & width
  const crestSize = isLandscape
    ? Math.min(height * 0.28, 155)
    : Math.min(width * 0.44, height * 0.24, 180);

  // Original logo writings image dimensions (aspect ratio is 846/203 = 4.167)
  const corporateLogoWidth = isLandscape
    ? Math.min(width * 0.36, height * 0.52, 330)
    : Math.min(width * 0.76, 320);
  const corporateLogoHeight = corporateLogoWidth / 4.167;

  // Caption dimensions (aspect ratio is 989/85 = 11.63)
  const captionWidth = isLandscape
    ? Math.min(width * 0.32, 300)
    : Math.min(width * 0.80, 310);
  const captionHeight = captionWidth / 11.63;

  const progressWidthInterpolation = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          height,
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={finishSplashScreen}
        style={[styles.touchArea, { width, height }]}
        hasTVPreferredFocus={isTV}
        accessible={true}
        accessibilityLabel="Touch screen to enter app"
      >
        {/* Sleek Deep Navy Gradient Background */}
        <LinearGradient
          colors={['#050811', '#0B1228', '#050811']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Radial Glow centered behind elements */}
        <View style={styles.ambientGlowContainer} pointerEvents="none">
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.12)', 'rgba(0, 240, 255, 0.05)', 'transparent']}
            style={[styles.ambientGlow, { width: crestSize * 2.4, height: crestSize * 2.4 }]}
          />
        </View>

        {/* Master Center Stage: Everything strictly center aligned vertically & horizontally */}
        <View style={styles.centerStage}>

          {/* 1. Centered Crest Seal Section with Electrical Waves */}
          <View style={[styles.crestSection, { width: crestSize, height: crestSize }]}>
            {/* Concentric Earthing Electric Wave Rings */}
            <View
              style={[
                styles.pulseWrapper,
                { width: crestSize * 1.45, height: crestSize * 1.45 },
              ]}
              pointerEvents="none"
            >
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseScale1 }],
                    opacity: pulseOpacity1,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  styles.pulseRingGold,
                  {
                    transform: [{ scale: pulseScale2 }],
                    opacity: pulseOpacity2,
                  },
                ]}
              />
            </View>

            {/* Floating Gold Crest Seal */}
            <Animated.View
              style={[
                styles.crestContainer,
                {
                  width: crestSize,
                  height: crestSize,
                  transform: [
                    { scale: crestScale },
                    { translateY: crestFloat },
                  ],
                  opacity: crestOpacity,
                },
              ]}
            >
              <Image
                source={EXCEL_SINCE_LOGO}
                style={styles.crestImage}
                resizeMode="contain"
              />

              {/* Electric Spark Glow on Lightning Bolt */}
              <Animated.View
                style={[
                  styles.sparkAura,
                  {
                    opacity: sparkOpacity,
                  },
                ]}
                pointerEvents="none"
              >
                <Zap size={22} color="#FFD700" fill="#FFC107" />
              </Animated.View>
            </Animated.View>
          </View>

          {/* 2. ORIGINAL Excel Earthing writings logo image (CENTER ALIGNED) */}
          <Animated.View
            style={[
              styles.corporateLogoBox,
              {
                width: corporateLogoWidth,
                height: corporateLogoHeight,
                opacity: logoTextOpacity,
                transform: [{ translateY: logoTextTranslateY }],
              },
            ]}
          >
            <Image
              source={EXCEL_CORPORATE_LOGO}
              style={styles.corporateLogoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 3. Official Cursive Caption: Dedicated to Electrical Safety (CENTER ALIGNED) */}
          <Animated.View
            style={[
              styles.captionWrapper,
              {
                width: captionWidth,
                height: captionHeight + 6,
                opacity: captionOpacity,
                transform: [{ translateY: captionTranslateY }],
              },
            ]}
          >
            <Image
              source={EXCEL_DEDICATED_CAPTION}
              style={[styles.captionImage, { width: captionWidth, height: captionHeight }]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 4. Certification & Heritage Badge (CENTER ALIGNED) */}
          <Animated.View
            style={[
              styles.ribbonBadgeRow,
              {
                opacity: logoTextOpacity,
                transform: [{ translateY: logoTextTranslateY }],
              },
            ]}
          >
            <View style={styles.ribbonLine} />
            <View style={styles.ribbonBadge}>
              <ShieldCheck size={12} color="#D4AF37" strokeWidth={2.4} />
              <Text style={styles.ribbonBadgeText}>SINCE 2006 • ISO 9001:2015 CERTIFIED</Text>
            </View>
            <View style={styles.ribbonLine} />
          </Animated.View>

          {/* 5. Grounding Safety Indicator Bar (CENTER ALIGNED) */}
          <Animated.View style={[styles.groundingStatusBox, { opacity: captionOpacity }]}>
            {/* 3-Bar Electrical Ground Symbol (⏚) */}
            <View style={styles.groundSymbol}>
              <View style={styles.groundStem} />
              <View style={styles.groundLine1} />
              <View style={styles.groundLine2} />
              <View style={styles.groundLine3} />
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidthInterpolation,
                  },
                ]}
              />
            </View>
            <Text style={styles.groundingStatusText}>
              ELECTRICAL SAFETY & SURGE PROTECTION SYSTEMS
            </Text>
          </Animated.View>

        </View>

        {/* Bottom Interactive Skip Hint */}
        <Animated.View style={[styles.bottomBar, { opacity: logoTextOpacity }]}>
          <View style={styles.skipPill}>
            <Zap size={13} color="#FFC107" />
            <Text style={styles.skipText}>
              {isTV ? 'Press OK to Skip' : 'Touch Screen to Enter'}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050811',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlowContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    borderRadius: 9999,
  },
  centerStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  crestSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  crestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestImage: {
    width: '100%',
    height: '100%',
  },
  sparkAura: {
    position: 'absolute',
    top: 8,
    right: 20,
  },
  pulseWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
  },
  pulseRingGold: {
    borderColor: 'rgba(212, 175, 55, 0.55)',
  },
  corporateLogoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  corporateLogoImage: {
    width: '100%',
    height: '100%',
  },
  captionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  captionImage: {
    tintColor: undefined,
  },
  ribbonBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ribbonLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
  },
  ribbonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  ribbonBadgeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  groundingStatusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
  },
  groundSymbol: {
    alignItems: 'center',
    marginBottom: 6,
  },
  groundStem: {
    width: 2,
    height: 8,
    backgroundColor: '#38BDF8',
  },
  groundLine1: {
    width: 24,
    height: 2,
    backgroundColor: '#38BDF8',
    borderRadius: 1,
    marginTop: 1,
  },
  groundLine2: {
    width: 16,
    height: 2,
    backgroundColor: '#38BDF8',
    borderRadius: 1,
    marginTop: 2,
  },
  groundLine3: {
    width: 8,
    height: 2,
    backgroundColor: '#38BDF8',
    borderRadius: 1,
    marginTop: 2,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(51, 65, 85, 0.45)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  groundingStatusText: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  skipText: {
    color: '#FFC107',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
