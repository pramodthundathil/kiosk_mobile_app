import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tv, Sparkles, ShieldCheck, Globe, Info } from 'lucide-react-native';
import { kioskColors } from '../theme/kioskTheme';
import { KioskResponsiveMetrics } from '../types/kiosk';

interface KioskFooterProps {
  metrics: KioskResponsiveMetrics;
  onOpenAttract: () => void;
  onOpenInfo: () => void;
}

export const KioskFooter: React.FC<KioskFooterProps> = ({
  metrics,
  onOpenAttract,
  onOpenInfo,
}) => {
  const { width, height, isLandscape, scaleFont } = metrics;

  return (
    <View style={styles.footerContainer}>
      <View style={styles.leftInfo}>
        <View style={styles.statusDot} />
        <Text style={[styles.statusText, { fontSize: scaleFont(12) }]}>
          EXCEL EARTHINGS PVT LTD
        </Text>
        <Text style={styles.divider}>|</Text>
        <View style={styles.metricItem}>
          <Globe size={13} color={kioskColors.accentBlue} />
          <Text style={[styles.metricText, { fontSize: scaleFont(12) }]}>
            www.excelearthings.com
          </Text>
        </View>
        <Text style={styles.divider}>|</Text>
        <View style={styles.metricItem}>
          <ShieldCheck size={13} color={kioskColors.lightningGold} />
          <Text style={[styles.metricText, { fontSize: scaleFont(12) }]}>
            ISO 9001:2015 Certified
          </Text>
        </View>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenAttract}
          style={styles.actionBtn}
        >
          <Sparkles size={scaleFont(14)} color={kioskColors.lightningGold} />
          <Text style={[styles.actionText, { fontSize: scaleFont(12) }]}>
            Screensaver Mode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenInfo}
          style={styles.actionBtn}
        >
          <Info size={scaleFont(14)} color={kioskColors.accentBlue} />
          <Text style={[styles.actionText, { fontSize: scaleFont(12) }]}>
            Company Overview
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: kioskColors.success,
  },
  statusText: {
    color: kioskColors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    color: '#CBD5E1',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    color: kioskColors.textSecondary,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionText: {
    color: kioskColors.textPrimary,
    fontWeight: '600',
  },
});
