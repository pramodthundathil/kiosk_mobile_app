import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileText,
  Zap,
  Edit3,
} from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii, kioskShadows } from '../theme/kioskTheme';
import { KioskProduct, KioskResponsiveMetrics } from '../types/kiosk';
import { KioskBackButton } from '../components/KioskBackButton';
import { WhiteboardModal } from '../components/WhiteboardModal';
import { ProductMediaGallery } from '../components/ProductMediaGallery';
import { analyticsService } from '../services/analyticsService';
import { useAppVersion } from '../hooks/useAppVersion';

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
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;
  const appVersion = useAppVersion();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Track dwell time spent exploring this product
  useEffect(() => {
    const entryTime = Date.now();
    return () => {
      const dwellSeconds = Math.max(1, Math.round((Date.now() - entryTime) / 1000));
      analyticsService.trackProductClick(product, 'VIEW_DETAIL', { duration_seconds: dwellSeconds });
    };
  }, [product]);

  const handleOpenWhiteboard = () => {
    analyticsService.trackProductClick(product, 'WHITEBOARD_OPEN');
    setIsWhiteboardOpen(true);
  };

  const resolvedSpecs: Record<string, string> = (product.specifications && Object.keys(product.specifications).length > 0)
    ? { ...product.specifications }
    : {
        'Material / Grade': 'Electrolytic Copper Bonded (≥ 99.9% Cu Purity)',
        'Standards Compliance': 'IEC 62561-2 / UL 467 / IEEE 80 / IS 3043',
        'Electrical Conductivity': '> 99.9% IACS High Electrical Conductivity',
        'Corrosion Resistance': 'Exceeds 30 Years Service Life in Aggressive Soil',
        'Coating Thickness': '254 Microns (10 Mils) Electro-Molecular Bond',
        'Tensile Strength': '≥ 600 N/mm² High Tensile Carbon Steel Core',
        'Item Code / SKU': product.sku || 'EX-SPEC-01',
        'Product Category': product.categoryName || 'Earthing & Lightning Protection',
      };

  if (product.subCategoryName && !resolvedSpecs['Sub-Category']) {
    resolvedSpecs['Sub-Category'] = product.subCategoryName;
  }

  const resolvedStandards = (product.standards && product.standards.length > 0)
    ? product.standards
    : [
        'IEC 62561-2 Certified',
        'UL 467 Listed',
        'IEEE 80 Compliant',
        'ISO 9001:2015 Quality Assured',
        'IS 3043 Earth Electrode Code',
      ];

  const resolvedFeatures = (product.features && product.features.length > 0)
    ? product.features
    : [
        'Tested and certified in accordance with IEC 62561-2 & UL 467 international standards.',
        'Molecularly bonded electrolytic copper coating prevents peeling, chipping, or cracking.',
        'High tensile strength steel core allows deep driving into hard, rocky terrain without bending.',
        'Low electrical resistance path to dissipate fault currents and lightning surges safely.',
        'Maintenance-free design engineered for critical industrial and utility installations.',
      ];

  const resolvedApplications = (product.applications && product.applications.length > 0)
    ? product.applications
    : [
        'Substations & Transmission Lines',
        'Telecommunication & Microwave Towers',
        'Oil, Gas & Petrochemical Refineries',
        'Data Centers & Mission Critical IT Facilities',
        'Solar PV & Wind Energy Farms',
        'Heavy Industrial Manufacturing Facilities',
      ];

  return (
    <View style={styles.rootContainer}>
      {/* Subtle modern background gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#F0F6FF', '#E8EFF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Interactive Digital Whiteboard Modal */}
      <WhiteboardModal visible={isWhiteboardOpen} onClose={() => setIsWhiteboardOpen(false)} />

      {/* Top Earth Header Background in Portrait Mode */}
      {!isLandscape && (
        <ImageBackground
          source={require('../../assets/portrait_earth_header.png')}
          style={[styles.portraitHeaderBg, { minHeight: scaleSpacing(110) }]}
          imageStyle={styles.portraitHeaderBgImage}
          resizeMode="cover"
        >
          <View style={styles.portraitHeaderTopRow}>
            <Image
              source={require('../../assets/excel_logo_white.png')}
              style={styles.portraitLogoImg}
              resizeMode="contain"
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenWhiteboard}
              style={styles.portraitHeaderWhiteboardBtn}
            >
              <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.portraitHeaderWhiteboardBtnText, { fontSize: scaleFont(12) }]}>Whiteboard</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      {/* Top Page Header Bar */}
      <View style={styles.headerBar}>
        <KioskBackButton onPress={onBack} label="Back to Catalog" />

        <View style={styles.headerTitleBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={styles.headerCategoryPill}>
              <Text style={styles.headerCategoryText}>
                {product.categoryName || 'Technical Catalog'}
              </Text>
            </View>
            {product.subCategoryName && (
              <View style={[styles.headerCategoryPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.headerCategoryText, { color: '#16A34A' }]}>
                  {product.subCategoryName}
                </Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[styles.headerTitleText, { fontSize: scaleFont(13.5) }]}
          >
            {product.name}
          </Text>
        </View>

        <View style={styles.headerSkuBadge}>
          <Text style={[styles.headerSkuText, { fontSize: scaleFont(11) }]}>
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
          {/* Left Panel: Rich Product Media Gallery (3D, Photo, Video, Docs) & Compliance Tags */}
          <View style={[styles.leftPanel, { width: isLandscape ? 440 : '100%' }]}>
            <ProductMediaGallery
              product={product}
              height={isLandscape ? 340 : 280}
              scaleFont={scaleFont}
              scaleSpacing={scaleSpacing}
            />

            {/* Testing & Standards Compliance */}
            <View style={styles.standardsCard}>
              <View style={styles.cardHeaderRow}>
                <ShieldCheck size={scaleFont(16)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(13) }]}>
                  Testing & Standards Compliance
                </Text>
              </View>
              <View style={styles.standardsTagRow}>
                {resolvedStandards.map((st, idx) => (
                  <View key={idx} style={styles.standardTag}>
                    <ShieldCheck size={12} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                    <Text style={styles.standardTagText}>{st}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right Panel: Overview, Specs Table, Highlights & Applications */}
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
                {product.description || 'Precision-engineered industrial earthing and grounding equipment manufactured under stringent international quality control.'}
              </Text>
            </View>

            {/* Technical Specification Table */}
            <View style={styles.specTableCard}>
              <View style={styles.cardHeaderRow}>
                <FileText size={scaleFont(16)} color={kioskColors.brandNavy} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                  Technical Specifications
                </Text>
              </View>

              <View style={styles.specTableWrapper}>
                {Object.entries(resolvedSpecs).map(([key, val], idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.specTableRow,
                      idx % 2 === 0 ? styles.specRowEven : styles.specRowOdd,
                    ]}
                  >
                    <Text style={[styles.specKeyText, { fontSize: scaleFont(12.5) }]}>
                      {key}
                    </Text>
                    <Text style={[styles.specValText, { fontSize: scaleFont(12.5) }]}>
                      {val}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Engineering Highlights */}
            <View style={styles.featuresCard}>
              <View style={styles.cardHeaderRow}>
                <Zap size={scaleFont(16)} color={kioskColors.lightningGold} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                  Engineering Highlights & Features
                </Text>
              </View>
              <View style={styles.featuresList}>
                {resolvedFeatures.map((feat, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <CheckCircle2 size={16} color={kioskColors.success} strokeWidth={kioskIcons.strokeWidth} style={{ marginTop: 2 }} />
                    <Text style={[styles.featureText, { fontSize: scaleFont(12.5) }]}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recommended Applications */}
            <View style={styles.applicationsCard}>
              <View style={styles.cardHeaderRow}>
                <Building2 size={scaleFont(16)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(14) }]}>
                  Recommended Application Areas
                </Text>
              </View>
              <View style={styles.appsChipRow}>
                {resolvedApplications.map((app, idx) => (
                  <View key={idx} style={styles.appChip}>
                    <Building2 size={13} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                    <Text style={[styles.appChipText, { fontSize: scaleFont(12) }]}>
                      {app}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Action Footer for Kiosk Touch Ergonomics */}
            <View style={styles.detailActionFooter}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onBack}
                style={styles.detailBackBtn}
              >
                <Text style={[styles.detailBackBtnText, { fontSize: scaleFont(13.5) }]}>
                  ← Back to Catalog
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenWhiteboard}
                style={styles.detailWhiteboardBtn}
              >
                <Edit3 size={scaleFont(15)} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={[styles.detailWhiteboardBtnText, { fontSize: scaleFont(13.5) }]}>
                  Open Whiteboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Ad Banner in Portrait Mode */}
      {!isLandscape && (
        <>
          <View style={styles.portraitVersionBar}>
            <Text style={[styles.portraitVersionText, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
              v{appVersion}
            </Text>
          </View>
          <View style={styles.fixedBottomAdWrapper}>
            <Image
              source={require('../../assets/portrait_nature_footer.png')}
              style={[styles.fixedBottomAdImg, { height: Math.max(68, scaleSpacing(72)) }]}
              resizeMode="cover"
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  portraitHeaderBg: {
    width: '100%',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#020D22',
  },
  portraitHeaderBgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  portraitHeaderTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  portraitLogoImg: {
    width: 175,
    height: 48,
  },
  portraitHeaderWhiteboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  portraitHeaderWhiteboardBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  fixedBottomAdWrapper: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  fixedBottomAdImg: {
    width: '100%',
    height: 68,
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCategoryPill: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  headerCategoryText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  headerTitleText: {
    color: kioskColors.textPrimary,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  headerSkuBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerSkuText: {
    color: kioskColors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    includeFontPadding: false,
  },
  scrollBody: {
    flexGrow: 1,
  },
  contentLayoutRow: {
    gap: 18,
  },
  leftPanel: {
    gap: 14,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productImg: {
    width: '92%',
    backgroundColor: '#FFFFFF',
  },
  imageBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: kioskRadii.xs,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    includeFontPadding: false,
  },
  standardsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: kioskRadii.sm,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  standardTagText: {
    color: kioskColors.brandNavy,
    fontSize: 11.5,
    fontWeight: '700',
  },
  rightPanel: {
    flex: 1,
    gap: 14,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  productTitleMain: {
    fontWeight: '900',
    color: kioskColors.textPrimary,
    letterSpacing: -0.3,
  },
  productSubtitleText: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
    marginTop: 4,
  },
  productDescText: {
    color: kioskColors.textSecondary,
    marginTop: 10,
    lineHeight: 20,
  },
  specTableCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  specTableWrapper: {
    borderRadius: kioskRadii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  specRowEven: {
    backgroundColor: '#F8FAFC',
  },
  specRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  specKeyText: {
    color: kioskColors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  specValText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  featuresList: {
    gap: 9,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  featureText: {
    color: kioskColors.textPrimary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 19,
  },
  applicationsCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
    paddingVertical: 7,
    borderRadius: kioskRadii.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  appChipText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
  },
  portraitVersionBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  portraitVersionText: {
    color: kioskColors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  detailActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailBackBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  detailBackBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    includeFontPadding: false,
  },
  detailWhiteboardBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#0D60AE',
    borderRadius: kioskRadii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  detailWhiteboardBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
});
