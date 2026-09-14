import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, FileText, ShieldCheck, Zap } from 'lucide-react-native';
import { kioskColors, kioskShadows, minTouchTarget } from '../theme/kioskTheme';
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
  const { isLandscape, kioskType, scaleFont, scaleSpacing } = metrics;

  // Responsive image height calculation based on screen size
  const imageHeight = isLandscape
    ? kioskType === 'LANDSCAPE_22' ? 180 : 150
    : kioskType === 'PORTRAIT_43' ? 220 : 170;

  // Extract top 2 key specs to showcase on card
  const specEntries = Object.entries(product.specifications || {}).slice(0, 2);

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
          resizeMode="cover"
        />

        {/* Top Badges */}
        <View style={styles.badgeRow}>
          {product.badge ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          ) : <View />}

          <View style={styles.skuBadge}>
            <Text style={styles.skuText}>SKU: {product.sku}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.cardContent, { padding: scaleSpacing(14) }]}>
        <View>
          <Text
            numberOfLines={2}
            style={[styles.productTitle, { fontSize: scaleFont(16) }]}
          >
            {product.name}
          </Text>

          {product.subtitle ? (
            <Text
              numberOfLines={2}
              style={[styles.productSubtitle, { fontSize: scaleFont(12) }]}
            >
              {product.subtitle}
            </Text>
          ) : null}
        </View>

        {/* Key Spec Snippets */}
        {specEntries.length > 0 && (
          <View style={styles.specsSnippetContainer}>
            {specEntries.map(([key, val], idx) => (
              <View key={idx} style={styles.specSnippetRow}>
                <Text style={styles.specKey} numberOfLines={1}>{key}:</Text>
                <Text style={styles.specValue} numberOfLines={1}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPressCard(product)}
            style={styles.viewDetailsButton}
          >
            <FileText size={scaleFont(15)} color="#FFFFFF" />
            <Text style={[styles.btnText, { fontSize: scaleFont(13) }]}>
              View Technical Specs
            </Text>
            <ChevronRight size={scaleFont(15)} color="#FEF08A" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    backgroundColor: '#F1F5F9',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  badgeContainer: {
    backgroundColor: '#0D60AE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  skuBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skuText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  productTitle: {
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  productSubtitle: {
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  specsSnippetContainer: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  specSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specKey: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  specValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  footerRow: {
    marginTop: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#1E2B58',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
