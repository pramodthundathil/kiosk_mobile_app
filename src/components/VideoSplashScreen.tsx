import React from 'react';
import { AnimatedSplashScreen } from './AnimatedSplashScreen';

interface VideoSplashScreenProps {
  onFinish: () => void;
}

/**
 * Modern animated splash screen replacing heavy video player.
 * Features official Excel Earthing seal, "SINCE 2006" badge,
 * "Dedicated to Electrical Safety" cursive caption, and electrical wave animations.
 */
export const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({ onFinish }) => {
  return <AnimatedSplashScreen onFinish={onFinish} />;
};
