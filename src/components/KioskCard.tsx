import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { kioskShadows } from '../theme/kioskTheme';
import { KioskProduct, KioskResponsiveMetrics } from '../types/kiosk';

interface KioskCardProps {
  product: KioskProduct;
  metrics: KioskResponsiveMetrics;
  onPressCard: (product: KioskProduct) => void;
}

export const KioskCard: React.FC<KioskCardProps> = ({
  product,
  metrics,
  onPressCard,
}) => {
  const { isLandscape, kioskType } = metrics;

  const imageHeight = isLandscape
    ? kioskType === 'LANDSCAPE_22' ? 140 : 120
    : kioskType === 'PORTRAIT_43' ? 160 : 130;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPressCard(product)}
      style={[styles.cardContainer, kioskShadows.card]}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: product.image }}
          style={[styles.productImage, { height: imageHeight }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={styles.productTitle}>
          {product.name}
        </Text>
        <View style={styles.arrowCircleBtn}>
          <ChevronRight size={14} color="#0D60AE" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '90%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  productTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 12.5,
    lineHeight: 16,
    flex: 1,
  },
  arrowCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
