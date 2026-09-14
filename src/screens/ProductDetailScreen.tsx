import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileText,
  Zap,
} from 'lucide-react-native';
import { kioskColors, kioskShadows } from '../theme/kioskTheme';
import { KioskProduct, KioskResponsiveMetrics } from '../types/kiosk';

interface ProductDetailScreenProps {
  product: KioskProduct;
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  metrics,
  onBack,
}) => {
  const { isLandscape, scaleFont, scaleSpacing } = metrics;

  return (
    <View style={styles.rootContainer}>
      {/* Top Page Header Bar with Back Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backButton}
        >
          <ArrowLeft size={scaleFont(20)} color="#FFFFFF" />
          <Text style={[styles.backButtonText, { fontSize: scaleFont(14) }]}>
            Back to Catalog
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerCategoryText, { fontSize: scaleFont(11) }]}>
            {product.categoryName || 'EXCEL EARTHINGS TECHNICAL CATALOG'}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.headerTitleText, { fontSize: scaleFont(18) }]}
          >
            {product.name}
          </Text>
        </View>

        <View style={styles.headerSkuBadge}>
          <Text style={[styles.headerSkuText, { fontSize: scaleFont(12) }]}>
            SKU: {product.sku}
          </Text>
        </View>
      </View>

      {/* Full Page Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[
          styles.scrollBody,
          { padding: scaleSpacing(20) },
        ]}
      >
        <View style={[styles.contentLayoutRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
          {/* Left Panel: High Res Product Image & Compliance Tags */}
          <View style={[styles.leftPanel, { width: isLandscape ? 380 : '100%' }]}>
            <View style={styles.imageCard}>
              <Image
                source={{ uri: product.image }}
                style={[styles.productImg, { height: isLandscape ? 280 : 240 }]}
                resizeMode="cover"
              />
              {product.badge ? (
                <View style={styles.imageBadgeOverlay}>
                  <Text style={styles.imageBadgeText}>{product.badge}</Text>
                </View>
              ) : null}
            </View>

            {/* Testing & Standards Compliance */}
            {product.standards && product.standards.length > 0 && (
              <View style={styles.standardsCard}>
                <View style={styles.cardHeaderRow}>
                  <ShieldCheck size={scaleFont(16)} color={kioskColors.accentBlue} />
                  <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(13) }]}>
                    Testing & International Standards
                  </Text>
                </View>
                <View style={styles.standardsTagRow}>
                  {product.standards.map((st, idx) => (
                    <View key={idx} style={styles.standardTag}>
                      <ShieldCheck size={12} color="#0D60AE" />
                      <Text style={styles.standardTagText}>{st}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right Panel: Description, Specs Table, Highlights & Applications */}
          <View style={styles.rightPanel}>
            {/* Overview & Subtitle */}
            <View style={styles.overviewCard}>
              <Text style={[styles.productTitleMain, { fontSize: scaleFont(22) }]}>
                {product.name}
              </Text>
              {product.subtitle ? (
                <Text style={[styles.productSubtitleText, { fontSize: scaleFont(14) }]}>
                  {product.subtitle}
                </Text>
              ) : null}
              <Text style={[styles.productDescText, { fontSize: scaleFont(13) }]}>
                {product.description}
              </Text>
            </View>

            {/* Technical Specification Table */}
            <View style={styles.specTableCard}>
              <View style={styles.cardHeaderRow}>
                <FileText size={scaleFont(16)} color={kioskColors.brandNavy} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                  Technical Specifications
                </Text>
              </View>

              <View style={styles.specTableWrapper}>
                {Object.entries(product.specifications || {}).map(([key, val], idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.specTableRow,
                      idx % 2 === 0 ? styles.specRowEven : styles.specRowOdd,
                    ]}
                  >
                    <Text style={[styles.specKeyText, { fontSize: scaleFont(13) }]}>
                      {key}
                    </Text>
                    <Text style={[styles.specValText, { fontSize: scaleFont(13) }]}>
                      {val}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Engineering Highlights */}
            {product.features && product.features.length > 0 && (
              <View style={styles.featuresCard}>
                <View style={styles.cardHeaderRow}>
                  <Zap size={scaleFont(16)} color={kioskColors.lightningGold} />
                  <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                    Engineering Highlights & Features
                  </Text>
                </View>
                <View style={styles.featuresList}>
                  {product.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <CheckCircle2 size={16} color={kioskColors.success} style={{ marginTop: 2 }} />
                      <Text style={[styles.featureText, { fontSize: scaleFont(13) }]}>
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recommended Applications */}
            {product.applications && product.applications.length > 0 && (
              <View style={styles.applicationsCard}>
                <View style={styles.cardHeaderRow}>
                  <Building2 size={scaleFont(16)} color={kioskColors.accentBlue} />
                  <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                    Recommended Application Areas
                  </Text>
                </View>
                <View style={styles.appsChipRow}>
                  {product.applications.map((app, idx) => (
                    <View key={idx} style={styles.appChip}>
                      <Building2 size={13} color={kioskColors.accentBlue} />
                      <Text style={[styles.appChipText, { fontSize: scaleFont(12) }]}>
                        {app}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#1E2B58',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#0D60AE',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  headerCategoryText: {
    color: '#FEF08A',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
  },
  headerSkuBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerSkuText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollBody: {
    flexGrow: 1,
  },
  contentLayoutRow: {
    gap: 20,
  },
  leftPanel: {
    gap: 16,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  productImg: {
    width: '100%',
    backgroundColor: '#F1F5F9',
  },
  imageBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  standardsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  standardsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  standardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  standardTagText: {
    color: '#1E2B58',
    fontSize: 12,
    fontWeight: '700',
  },
  rightPanel: {
    flex: 1,
    gap: 16,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productTitleMain: {
    fontWeight: '900',
    color: '#0F172A',
  },
  productSubtitleText: {
    color: '#0D60AE',
    fontWeight: '700',
    marginTop: 4,
  },
  productDescText: {
    color: '#475569',
    marginTop: 12,
    lineHeight: 22,
  },
  specTableCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  specTableWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  specRowEven: {
    backgroundColor: '#F8FAFC',
  },
  specRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  specKeyText: {
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  specValText: {
    color: '#0F172A',
    fontWeight: '800',
    flex: 1.2,
    textAlign: 'right',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  applicationsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  appsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  appChipText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
