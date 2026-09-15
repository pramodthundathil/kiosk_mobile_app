import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreen from 'expo-splash-screen';

const isTV = Platform.isTV;

interface VideoSplashScreenProps {
  onFinish: () => void;
}

const SPLASH_VIDEO_SOURCE = require('../../assets/excel_animation.mp4');

export const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const finishSplashScreen = () => {
    if (hasFinished) return;
    setHasFinished(true);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  };

  // Modern Expo SDK 57 expo-video player
  let player: any = null;
  try {
    player = useVideoPlayer(SPLASH_VIDEO_SOURCE, (p) => {
      p.loop = false;
      p.muted = true;
      p.play();
    });
  } catch (e) {
    console.warn('Video player initialization notice:', e);
  }

  useEffect(() => {
    if (!player) {
      finishSplashScreen();
      return;
    }

    let subscription: any = null;
    try {
      subscription = player.addListener('playToEnd', () => {
        finishSplashScreen();
      });
    } catch (e) {}

    return () => {
      try {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      } catch (e) {}
    };
  }, [player]);

  // Fallback safety timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasFinished) {
        finishSplashScreen();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasFinished]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={finishSplashScreen}
        style={styles.touchArea}
        hasTVPreferredFocus={isTV}
        accessible={true}
        accessibilityLabel={isTV ? 'Press OK to skip intro' : 'Tap to skip intro'}
      >
        {player ? (
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
        ) : (
          <View style={styles.video} />
        )}

        <View style={styles.skipContainer}>
          <Text style={styles.skipText}>
            {isTV ? 'Press OK to skip' : 'Tap to skip'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#171B3F',
    zIndex: 99999,
  },
  touchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#171B3F',
  },
  skipContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(23, 27, 63, 0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E3A74',
  },
  skipText: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
