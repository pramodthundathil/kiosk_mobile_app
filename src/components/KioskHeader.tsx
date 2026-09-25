import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Monitor, Smartphone, Clock, RefreshCw, LogOut, ShieldCheck } from 'lucide-react-native';
import { kioskColors, kioskShadows, minTouchTarget } from '../theme/kioskTheme';
import { KioskResponsiveMetrics, KioskHardwareType } from '../types/kiosk';

interface KioskHeaderProps {
  metrics: KioskResponsiveMetrics;
  simulatedType: KioskHardwareType | null;
  onToggleSimulated: (type: KioskHardwareType | null) => void;
  onRefreshData?: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({
  metrics,
  simulatedType,
  onToggleSimulated,
  onRefreshData,
  onLogout,
  isSyncing = false,
}) => {
  const { isLandscape, kioskType, scaleFont, scaleSpacing } = metrics;
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getHardwareLabel = () => {
    if (kioskType === 'LANDSCAPE_22') return '22" LANDSCAPE KIOSK';
    if (kioskType === 'PORTRAIT_43') return '43" PORTRAIT KIOSK';
    return isLandscape ? 'TABLET LANDSCAPE' : 'MOBILE PORTRAIT';
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: scaleSpacing(20),
          paddingVertical: scaleSpacing(10),
        },
      ]}
    >
      {/* Left Section: Company Official Logo & Tagline */}
      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/excel_since_logo.png')}
            style={styles.crestLogoImage}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/excel logo_blue.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          {isLandscape && (
            <View style={styles.brandTextWrapper}>
              <Image
                source={require('../../assets/excel_dedicated_caption.png')}
                style={styles.captionImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        {/* Orientation & Hardware Type Badge */}
        <View style={styles.hardwareBadge}>
          <ShieldCheck size={scaleFont(14)} color={kioskColors.accentBlue} />
          <Text
            style={[
              styles.hardwareText,
              {
                fontSize: scaleFont(11),
                color: kioskColors.accentBlue,
              },
            ]}
          >
            {getHardwareLabel()}
          </Text>
        </View>
      </View>

      {/* Right Section: Controls, Sync & Clock */}
      <View style={styles.rightSection}>
        {/* Realtime Digital Clock */}
        <View style={styles.clockContainer}>
          <Clock size={scaleFont(15)} color={kioskColors.textSecondary} />
          <Text style={[styles.clockText, { fontSize: scaleFont(14) }]}>
            {timeString}
          </Text>
        </View>

        {/* Sync / Refresh Button */}
        {onRefreshData && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onRefreshData}
            disabled={isSyncing}
            style={styles.actionBtn}
          >
            <RefreshCw
              size={scaleFont(15)}
              color={isSyncing ? kioskColors.lightningGold : kioskColors.textPrimary}
            />
            <Text style={[styles.actionBtnText, { fontSize: scaleFont(12) }]}>
              {isSyncing ? 'Syncing...' : 'Sync Catalog'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Orientation Switcher Simulator Pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (simulatedType === 'LANDSCAPE_22') {
              onToggleSimulated('PORTRAIT_43');
            } else if (simulatedType === 'PORTRAIT_43') {
              onToggleSimulated(null);
            } else {
              onToggleSimulated('LANDSCAPE_22');
            }
          }}
          style={styles.simToggleBtn}
        >
          <Monitor size={scaleFont(15)} color={kioskColors.lightningGold} />
          <Text style={[styles.simToggleText, { fontSize: scaleFont(11) }]}>
            {simulatedType ? `Sim: ${simulatedType}` : 'Switch Layout'}
          </Text>
        </TouchableOpacity>

        {/* Logout Option */}
        {onLogout && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onLogout}
            style={styles.logoutBtn}
          >
            <LogOut size={scaleFont(16)} color={kioskColors.brandRed} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 150,
    height: 40,
  },
  crestLogoImage: {
    width: 38,
    height: 38,
  },
  brandTextWrapper: {
    justifyContent: 'center',
    marginLeft: 4,
  },
  captionImage: {
    width: 180,
    height: 20,
  },
  taglineCursive: {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
    fontStyle: 'italic',
    fontWeight: '700',
    color: kioskColors.brandNavy,
    letterSpacing: 0.5,
  },
  hardwareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  hardwareText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clockText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '600',
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  simToggleText: {
    color: kioskColors.lightningGold,
    fontWeight: '700',
  },
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
});
