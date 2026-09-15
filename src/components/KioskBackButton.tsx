import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { kioskColors } from '../theme/kioskTheme';

interface KioskBackButtonProps {
  onPress: () => void;
  label?: string;
  isDark?: boolean;
}

export const KioskBackButton: React.FC<KioskBackButtonProps> = ({
  onPress,
  label = 'Back',
  isDark = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, isDark && styles.containerDark]}
      >
        <View style={styles.iconCircle}>
          <ChevronLeft size={13} color="#FFFFFF" strokeWidth={2.6} />
        </View>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    height: 36,
    paddingLeft: 5,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: kioskColors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 11.5,
    letterSpacing: -0.2,
  },
  labelDark: {
    color: '#FFFFFF',
  },
});
