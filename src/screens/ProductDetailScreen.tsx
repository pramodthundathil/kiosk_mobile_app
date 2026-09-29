import React, { useState, useEffect, useMemo } from 'react';
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
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileText,
  Zap,
  Edit3,
  Maximize2,
  Sparkles,
  Award,
  ClipboardCheck,
  Layers,
  Check,
  CheckCheck,
} from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';
import {
  KioskProduct,
  KioskProductVariant,
  FeaturePointItem,
  CertificationPointItem,
  InHouseTestPointItem,
  KioskResponsiveMetrics,
} from '../types/kiosk';
import { KioskBackButton } from '../components/KioskBackButton';
import { WhiteboardModal } from '../components/WhiteboardModal';
import { ProductMediaGallery } from '../components/ProductMediaGallery';
import { KioskScrollContainer } from '../components/KioskScrollContainer';
import { analyticsService } from '../services/analyticsService';
import { useAppVersion } from '../hooks/useAppVersion';

type DetailTabKey = 'features' | 'specifications' | 'certifications' | 'in_house_tests' | 'applicable_areas';

interface ProductDetailScreenProps {
  product: KioskProduct;
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
  onOpenMediaViewer?: (product: KioskProduct, initialAssetId?: string) => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  metrics,
  onBack,
  onOpenMediaViewer,
}) => {
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;
  const appVersion = useAppVersion();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Active Variant Selection
  // Combine Parent Product and all Child Variants so both are available in the variant selector
  const allVariants = useMemo<KioskProductVariant[]>(() => {
    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    const parentAsVariant: KioskProductVariant = {
      id: product.id,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      image: product.image,
      description: product.description,
      specifications: product.specifications || {},
      features: product.features || [],
      certifications: product.certifications || [],
      inHouseTests: product.inHouseTests || [],
      applicableAreas: product.applicableAreas || [],
      isActive: true,
    };

    return [parentAsVariant, ...product.variants];
  }, [product]);

  // Selected variant id - defaults to the parent product (product.id)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.id);

  // Active Information Tab
  const [activeTab, setActiveTab] = useState<DetailTabKey>('features');

  // If product changes, reset selected variant to the parent product
  useEffect(() => {
    setSelectedVariantId(product.id);
  }, [product.id]);

  const isParentSelected = (!selectedVariantId || selectedVariantId === product.id);

  const activeVariant: KioskProductVariant = useMemo(() => {
    if (isParentSelected) {
      return {
        id: product.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        image: product.image,
        description: product.description,
        specifications: product.specifications || {},
        features: product.features || [],
        certifications: product.certifications || [],
        inHouseTests: product.inHouseTests || [],
        applicableAreas: product.applicableAreas || [],
        isActive: true,
      };
    }
    const found = product.variants?.find((v) => v.id === selectedVariantId);
    return (
      found || {
        id: product.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        image: product.image,
        description: product.description,
        specifications: product.specifications || {},
        features: product.features || [],
        certifications: product.certifications || [],
        inHouseTests: product.inHouseTests || [],
        applicableAreas: product.applicableAreas || [],
        isActive: true,
      }
    );
  }, [product, selectedVariantId, isParentSelected]);

  // Track dwell time spent exploring this product
  useEffect(() => {
    const entryTime = Date.now();
    return () => {
      const dwellSeconds = Math.max(1, Math.round((Date.now() - entryTime) / 1000));
      analyticsService.trackProductClick(product, 'VIEW_DETAIL', {
        duration_seconds: dwellSeconds,
        active_variant: activeVariant?.name,
      });
    };
  }, [product, activeVariant]);

  const handleSelectVariant = (variant: KioskProductVariant) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedVariantId(variant.id);
    analyticsService.trackProductClick(product, 'VARIANT_SELECT', {
      variant_id: variant.id,
      variant_name: variant.name,
      variant_sku: variant.sku,
    });
  };

  const handleSelectTab = (tab: DetailTabKey) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setActiveTab(tab);
  };

  const handleOpenWhiteboard = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    analyticsService.trackProductClick(product, 'WHITEBOARD_OPEN');
    setIsWhiteboardOpen(true);
  };

  const handleLaunchMediaViewer = (assetId?: string) => {
    if (onOpenMediaViewer) {
      onOpenMediaViewer(displayedProduct, assetId);
    }
  };

  // Resolved dynamic values with fallback to parent product
  const resolvedName = activeVariant.name;
  const resolvedSku = activeVariant.sku || product.sku;
  const resolvedDescription = activeVariant.description || product.description;

  // Resolved specifications dictionary - when a child variant is selected, use that child variant's specifications
  const resolvedSpecs: Record<string, string> = useMemo(() => {
    if (isParentSelected) {
      return { ...(product.specifications || {}) };
    }
    const variantSpecs = activeVariant.specifications;
    if (variantSpecs && Object.keys(variantSpecs).length > 0) {
      return { ...variantSpecs };
    }
    return {};
  }, [isParentSelected, activeVariant.specifications, product.specifications]);

  // Resolved Features (with points and sub-points)
  const resolvedFeatures: FeaturePointItem[] = useMemo(() => {
    const raw = (activeVariant && activeVariant.features && activeVariant.features.length > 0)
      ? activeVariant.features
      : product.features;

    if (raw && raw.length > 0) {
      return raw.map((item) => {
        if (typeof item === 'string') {
          return { point: item, sub_points: [] };
        }
        return {
          point: item.point || (item as any).title || '',
          sub_points: Array.isArray(item.sub_points) ? item.sub_points : [],
        };
      });
    }

    return [];
  }, [activeVariant, product.features]);

  // Resolved Certifications (with points and test sub-points)
  const resolvedCertifications: CertificationPointItem[] = useMemo(() => {
    const raw = (activeVariant && activeVariant.certifications && activeVariant.certifications.length > 0)
      ? activeVariant.certifications
      : product.certifications;

    if (raw && raw.length > 0) {
      return raw.map((item) => {
        if (typeof item === 'string') {
          return { title: item, sub_points: [] };
        }
        return {
          title: item.title || (item as any).point || '',
          sub_points: Array.isArray(item.sub_points) ? item.sub_points : [],
        };
      });
    }

    return [];
  }, [activeVariant, product.certifications]);

  // Resolved In-House Tests (with points and sub-points)
  const resolvedInHouseTests: InHouseTestPointItem[] = useMemo(() => {
    const raw = (activeVariant && activeVariant.inHouseTests && activeVariant.inHouseTests.length > 0)
      ? activeVariant.inHouseTests
      : product.inHouseTests;

    if (raw && raw.length > 0) {
      return raw.map((item) => {
        if (typeof item === 'string') {
          return { title: item, sub_points: [] };
        }
        return {
          title: item.title || (item as any).point || '',
          sub_points: Array.isArray(item.sub_points) ? item.sub_points : [],
        };
      });
    }

    return [];
  }, [activeVariant, product.inHouseTests]);

  // Resolved Applicable Areas
  const resolvedAreas: string[] = useMemo(() => {
    const raw = (activeVariant && activeVariant.applicableAreas && activeVariant.applicableAreas.length > 0)
      ? activeVariant.applicableAreas
      : (product.applicableAreas && product.applicableAreas.length > 0)
      ? product.applicableAreas
      : product.applications;

    if (raw && raw.length > 0) {
      return raw.map((a) => (typeof a === 'string' ? a : String(a)));
    }

    return [];
  }, [activeVariant, product.applicableAreas, product.applications]);

  // Virtual product with active variant parameters for gallery / media
  const displayedProduct: KioskProduct = useMemo(() => {
    return {
      ...product,
      name: resolvedName,
      sku: resolvedSku,
      image: activeVariant?.image || product.image,
      specifications: resolvedSpecs,
    };
  }, [product, resolvedName, resolvedSku, activeVariant, resolvedSpecs]);

  return (
    <View style={styles.rootContainer}>
      {/* Background Gradient */}
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          {!isParentSelected && (
            <View style={styles.headerBadgesRow}>
              <View style={[styles.headerCategoryPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.headerCategoryText, { color: '#1D4ED8' }]}>
                  Variant: {resolvedName}
                </Text>
              </View>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[styles.headerTitleText, { fontSize: scaleFont(14) }]}
          >
            {resolvedName}
          </Text>
        </View>

        <View style={styles.headerSkuBadge}>
          <Text style={[styles.headerSkuText, { fontSize: scaleFont(11.5) }]}>
            SKU: {resolvedSku}
          </Text>
        </View>
      </View>

      {/* Full Page Content ScrollView */}
      <KioskScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { padding: scaleSpacing(18) },
        ]}
      >
        <View style={[styles.contentLayoutRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
          {/* Left Panel: Media Gallery, Fullscreen Viewer Button, and Quick Standards */}
          <View style={[styles.leftPanel, { width: isLandscape ? 440 : '100%' }]}>
            <ProductMediaGallery
              product={displayedProduct}
              height={isLandscape ? 340 : 280}
              scaleFont={scaleFont}
              scaleSpacing={scaleSpacing}
              onOpenMediaViewer={(asset) => handleLaunchMediaViewer(asset?.id)}
            />

            {/* Quick Launch Full Page Media Viewer */}
            <TouchableOpacity
              style={styles.openFullMediaPageBtn}
              onPress={() => handleLaunchMediaViewer()}
              activeOpacity={0.88}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.openFullMediaPageBtnLeft}>
                <View style={styles.openFullMediaPageIconWrap}>
                  <Maximize2 size={scaleFont(15)} color="#0D60AE" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.openFullMediaPageBtnTitle, { fontSize: scaleFont(13) }]}>
                    Interactive 3D & Media Gallery
                  </Text>
                  <Text style={[styles.openFullMediaPageBtnSub, { fontSize: scaleFont(11) }]}>
                    Explore 360° 3D, High-Res Photos & PDF Specs
                  </Text>
                </View>
              </View>
              <Sparkles size={scaleFont(16)} color="#FFC107" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Key Quality Standards Badges */}
            <View style={styles.standardsCard}>
              <View style={styles.cardHeaderRow}>
                <ShieldCheck size={scaleFont(16)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.cardHeaderTitle, { fontSize: scaleFont(13) }]}>
                  Quality & Standards Compliance
                </Text>
              </View>
              <View style={styles.standardsTagRow}>
                {resolvedCertifications.slice(0, 4).map((c, idx) => (
                  <View key={idx} style={styles.standardTag}>
                    <CheckCheck size={13} color="#16A34A" strokeWidth={2.2} />
                    <Text numberOfLines={1} style={styles.standardTagText}>
                      {c.title.split(':')[0].slice(0, 32)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right Panel: Variant Selector (top), Overview, Segmented Tabs, and Rich Content */}
          <View style={styles.rightPanel}>
            {/* PRODUCT VARIANTS SELECTOR PILLS (SHOWN AT TOP) */}
            {allVariants.length > 0 && (
              <View style={styles.variantsCard}>
                <View style={styles.variantsHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Layers size={scaleFont(15)} color={kioskColors.brandNavy} strokeWidth={2.2} />
                    <Text style={[styles.variantsSectionTitle, { fontSize: scaleFont(13.5) }]}>
                      Available Models & Variants ({allVariants.length})
                    </Text>
                  </View>
                  <Text style={[styles.variantsTapHint, { fontSize: scaleFont(11) }]}>
                    Tap to switch model specs & features
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantsScrollContent}
                >
                  {allVariants.map((v) => {
                    const isSelected = selectedVariantId === v.id || (isParentSelected && v.id === product.id);
                    const isParent = (v.id === product.id);
                    return (
                      <TouchableOpacity
                        key={v.id}
                        activeOpacity={0.88}
                        onPress={() => handleSelectVariant(v)}
                        style={[
                          styles.variantPill,
                          isSelected ? styles.variantPillActive : styles.variantPillInactive,
                        ]}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      >
                        <View style={[styles.variantDot, isSelected && styles.variantDotActive]} />
                        <Text
                          style={[
                            styles.variantPillText,
                            isSelected ? styles.variantPillTextActive : styles.variantPillTextInactive,
                            { fontSize: scaleFont(12) },
                          ]}
                        >
                          {isParent ? `${v.name} (Base Model)` : v.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.variantSelectedCheck}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Product Overview Header */}
            <View style={styles.overviewCard}>
              <Text style={[styles.productTitleMain, { fontSize: scaleFont(22) }]}>
                {resolvedName}
              </Text>
              {!isParentSelected ? (
                <Text style={[styles.productBaseNameText, { fontSize: scaleFont(12.5) }]}>
                  Base Model: {product.name}
                </Text>
              ) : null}
              {product.subtitle ? (
                <Text style={[styles.productSubtitleText, { fontSize: scaleFont(13.5) }]}>
                  {product.subtitle}
                </Text>
              ) : null}
              <Text style={[styles.productDescText, { fontSize: scaleFont(12.5) }]}>
                {resolvedDescription || 'Precision-engineered industrial earthing and grounding equipment manufactured under stringent international quality control.'}
              </Text>
            </View>

            {/* 5-TAB SEGMENTED CONTROLLER */}
            <View style={styles.tabsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectTab('features')}
                  style={[styles.tabButton, activeTab === 'features' && styles.tabButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Zap
                    size={scaleFont(14)}
                    color={activeTab === 'features' ? '#FFFFFF' : kioskColors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.tabButtonText, activeTab === 'features' && styles.tabButtonTextActive, { fontSize: scaleFont(12.5) }]}>
                    Features ({resolvedFeatures.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectTab('specifications')}
                  style={[styles.tabButton, activeTab === 'specifications' && styles.tabButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <FileText
                    size={scaleFont(14)}
                    color={activeTab === 'specifications' ? '#FFFFFF' : kioskColors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.tabButtonText, activeTab === 'specifications' && styles.tabButtonTextActive, { fontSize: scaleFont(12.5) }]}>
                    Technical Specifications ({Object.keys(resolvedSpecs).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectTab('certifications')}
                  style={[styles.tabButton, activeTab === 'certifications' && styles.tabButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Award
                    size={scaleFont(14)}
                    color={activeTab === 'certifications' ? '#FFFFFF' : kioskColors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.tabButtonText, activeTab === 'certifications' && styles.tabButtonTextActive, { fontSize: scaleFont(12.5) }]}>
                    Certifications ({resolvedCertifications.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectTab('in_house_tests')}
                  style={[styles.tabButton, activeTab === 'in_house_tests' && styles.tabButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <ClipboardCheck
                    size={scaleFont(14)}
                    color={activeTab === 'in_house_tests' ? '#FFFFFF' : kioskColors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.tabButtonText, activeTab === 'in_house_tests' && styles.tabButtonTextActive, { fontSize: scaleFont(12.5) }]}>
                    In-House Tests ({resolvedInHouseTests.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectTab('applicable_areas')}
                  style={[styles.tabButton, activeTab === 'applicable_areas' && styles.tabButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Building2
                    size={scaleFont(14)}
                    color={activeTab === 'applicable_areas' ? '#FFFFFF' : kioskColors.textSecondary}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.tabButtonText, activeTab === 'applicable_areas' && styles.tabButtonTextActive, { fontSize: scaleFont(12.5) }]}>
                    Applicable Areas ({resolvedAreas.length})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* TAB CONTENT PANEL */}
            <View style={styles.tabContentCard}>
              {/* TAB 1: FEATURES (Pointed & Sub-Points) */}
              {activeTab === 'features' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <Zap size={scaleFont(16)} color={kioskColors.lightningGold} strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      Features & Engineering Highlights
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Key functional advantages, structural integrity, and electrical performance parameters.
                  </Text>

                  {resolvedFeatures.length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No engineering features configured for this item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.featuresListContainer}>
                      {resolvedFeatures.map((item, idx) => (
                        <View key={idx} style={styles.featureItemCard}>
                          <View style={styles.featureMainRow}>
                            <View style={styles.featureCheckIconWrap}>
                              <CheckCircle2 size={16} color="#16A34A" strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.featureMainPointText, { fontSize: scaleFont(13) }]}>
                              {item.point}
                            </Text>
                          </View>

                          {/* Nested Sub-points */}
                          {item.sub_points && item.sub_points.length > 0 && (
                            <View style={styles.featureSubPointsWrapper}>
                              {item.sub_points.map((sub, sIdx) => (
                                <View key={sIdx} style={styles.featureSubPointRow}>
                                  <View style={styles.subPointDisc} />
                                  <Text style={[styles.featureSubPointText, { fontSize: scaleFont(12) }]}>
                                    {sub}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 2: TECHNICAL SPECIFICATIONS TABLE */}
              {activeTab === 'specifications' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <FileText size={scaleFont(16)} color={kioskColors.brandNavy} strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      Technical Specifications & Parameters
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Material composition, dimensional tolerances, and coating parameters for {resolvedName}.
                  </Text>

                  {Object.keys(resolvedSpecs).length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No technical specifications configured for this item.
                      </Text>
                    </View>
                  ) : (
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
                  )}
                </View>
              )}

              {/* TAB 3: CERTIFICATIONS (Standards & Test Sub-Points) */}
              {activeTab === 'certifications' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <Award size={scaleFont(16)} color="#2563EB" strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      International Certifications & Compliance
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Accredited test certificates and compliance reports from global testing authorities.
                  </Text>

                  {resolvedCertifications.length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No certificates configured for this item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.certsListContainer}>
                      {resolvedCertifications.map((cert, idx) => (
                        <View key={idx} style={styles.certCard}>
                          <View style={styles.certHeaderRow}>
                            <View style={styles.certBadgeWrap}>
                              <Award size={16} color="#1D4ED8" strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.certTitleText, { fontSize: scaleFont(13) }]}>
                              {cert.title}
                            </Text>
                          </View>

                          {/* Test Sub-points */}
                          {cert.sub_points && cert.sub_points.length > 0 && (
                            <View style={styles.certTestsContainer}>
                              <Text style={[styles.certTestsHeader, { fontSize: scaleFont(11) }]}>
                                Verified Laboratory Tests:
                              </Text>
                              <View style={styles.certTestsWrap}>
                                {cert.sub_points.map((test, tIdx) => (
                                  <View key={tIdx} style={styles.certTestPill}>
                                    <Check size={11} color="#16A34A" strokeWidth={2.5} />
                                    <Text style={[styles.certTestPillText, { fontSize: scaleFont(11.5) }]}>
                                      {test}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 4: IN-HOUSE TESTS (Pointed & Sub-Points) */}
              {activeTab === 'in_house_tests' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <ClipboardCheck size={scaleFont(16)} color="#0D9488" strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      In-House Quality Control & Laboratory Tests
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Continuous batch testing, micro-layer thickness measurement, and structural pull tests.
                  </Text>

                  {resolvedInHouseTests.length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No in-house tests configured for this item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.testsListContainer}>
                      {resolvedInHouseTests.map((t, idx) => (
                        <View key={idx} style={styles.testCard}>
                          <View style={styles.testHeaderRow}>
                            <View style={styles.testBadgeWrap}>
                              <ClipboardCheck size={15} color="#0D9488" strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.testTitleText, { fontSize: scaleFont(13) }]}>
                              {t.title}
                            </Text>
                          </View>

                          {/* Test details sub-points */}
                          {t.sub_points && t.sub_points.length > 0 && (
                            <View style={styles.testSubPointsWrapper}>
                              {t.sub_points.map((sub, sIdx) => (
                                <View key={sIdx} style={styles.testSubPointRow}>
                                  <View style={styles.testSubPointCheck}>
                                    <Check size={10} color="#0D9488" strokeWidth={2.5} />
                                  </View>
                                  <Text style={[styles.testSubPointText, { fontSize: scaleFont(12) }]}>
                                    {sub}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 5: APPLICABLE AREAS */}
              {activeTab === 'applicable_areas' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <Building2 size={scaleFont(16)} color={kioskColors.accentBlue} strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      Recommended Application & Deployment Areas
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Ideal installation grounds, industry sectors, and infrastructure environments.
                  </Text>

                  {resolvedAreas.length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No applicable areas configured for this item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.areasGridContainer}>
                      {resolvedAreas.map((area, idx) => (
                        <View key={idx} style={styles.areaGridCard}>
                          <View style={styles.areaIconBox}>
                            <Building2 size={16} color={kioskColors.accentBlue} strokeWidth={2.2} />
                          </View>
                          <Text style={[styles.areaCardText, { fontSize: scaleFont(12.5) }]}>
                            {area}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Action Bar for Kiosk Touch Ergonomics */}
            <View style={styles.detailActionFooter}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onBack}
                style={styles.detailBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.detailBackBtnText, { fontSize: scaleFont(13) }]}>
                  ← Back to Catalog
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenWhiteboard}
                style={styles.detailWhiteboardBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Edit3 size={scaleFont(15)} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={[styles.detailWhiteboardBtnText, { fontSize: scaleFont(13) }]}>
                  Open Whiteboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KioskScrollContainer>

      {/* Fixed Bottom Banner in Portrait Mode */}
      {!isLandscape && (
        <>
          <View style={styles.portraitVersionBar}>
            <Text style={[styles.portraitVersionText, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
              v{appVersion} • Excel Earthings Kiosk
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
    height: 56,
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
    justifyContent: 'center',
    gap: 2,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  headerCategoryPill: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  headerCategoryText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  headerTitleText: {
    color: kioskColors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  headerSkuBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerSkuText: {
    color: kioskColors.textMuted,
    fontWeight: '700',
    includeFontPadding: false,
  },
  scrollBody: {
    flexGrow: 1,
  },
  contentLayoutRow: {
    gap: 20,
  },
  leftPanel: {
    gap: 14,
  },
  rightPanel: {
    flex: 1,
    gap: 14,
  },
  openFullMediaPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: kioskRadii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  openFullMediaPageBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  openFullMediaPageIconWrap: {
    width: 38,
    height: 38,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  openFullMediaPageBtnTitle: {
    color: '#0F172A',
    fontWeight: '800',
  },
  openFullMediaPageBtnSub: {
    color: '#0D60AE',
    fontWeight: '600',
    marginTop: 2,
  },
  standardsCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
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
  },
  standardsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  standardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: kioskRadii.xs,
  },
  standardTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productTitleMain: {
    fontWeight: '900',
    color: kioskColors.brandNavy,
    letterSpacing: -0.3,
  },
  productBaseNameText: {
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  productSubtitleText: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
  },
  productDescText: {
    color: '#475569',
    lineHeight: 19,
    marginTop: 2,
  },
  /* VARIANTS SELECTOR STYLING */
  variantsCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: kioskRadii.lg,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    gap: 10,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  variantsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantsSectionTitle: {
    fontWeight: '800',
    color: kioskColors.brandNavy,
  },
  variantsTapHint: {
    color: '#64748B',
    fontWeight: '600',
  },
  variantsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  variantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44, // Minimum 44dp touch target standard
    borderRadius: kioskRadii.full,
    borderWidth: 1.5,
  },
  variantPillActive: {
    backgroundColor: kioskColors.brandNavy,
    borderColor: kioskColors.brandNavy,
    shadowColor: kioskColors.brandNavy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  variantPillInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  variantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  variantDotActive: {
    backgroundColor: '#38BDF8',
  },
  variantPillText: {
    fontWeight: '700',
  },
  variantPillTextActive: {
    color: '#FFFFFF',
  },
  variantPillTextInactive: {
    color: '#334155',
  },
  variantSelectedCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* 5-TAB SEGMENTED CONTROLLER STYLING */
  tabsContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: kioskRadii.md,
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: kioskRadii.sm,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: kioskColors.brandNavy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  /* TAB CONTENT PANEL STYLING */
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tabSection: {
    gap: 12,
  },
  tabSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabSectionTitle: {
    fontWeight: '800',
    color: kioskColors.brandNavy,
  },
  tabSectionSub: {
    color: '#64748B',
    marginTop: -4,
  },
  emptyTabBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  emptyTabText: {
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  /* FEATURES STYLING (Points & Sub-Points) */
  featuresListContainer: {
    gap: 10,
    marginTop: 4,
  },
  featureItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  featureMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureCheckIconWrap: {
    marginTop: 2,
  },
  featureMainPointText: {
    flex: 1,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    lineHeight: 19,
  },
  featureSubPointsWrapper: {
    marginLeft: 26,
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
    paddingLeft: 12,
    paddingTop: 2,
  },
  featureSubPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  subPointDisc: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: kioskColors.accentBlue,
    marginTop: 6,
  },
  featureSubPointText: {
    flex: 1,
    color: '#475569',
    lineHeight: 18,
  },
  /* SPECIFICATIONS TABLE STYLING */
  specTableWrapper: {
    borderRadius: kioskRadii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  specTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  specRowEven: {
    backgroundColor: '#FFFFFF',
  },
  specRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  specKeyText: {
    flex: 1.1,
    fontWeight: '700',
    color: kioskColors.brandNavy,
  },
  specValText: {
    flex: 1.5,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 18,
  },
  /* CERTIFICATIONS STYLING */
  certsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  certCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  certBadgeWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 1,
  },
  certTitleText: {
    flex: 1,
    fontWeight: '800',
    color: kioskColors.brandNavy,
    lineHeight: 19,
  },
  certTestsContainer: {
    marginLeft: 38,
    gap: 6,
  },
  certTestsHeader: {
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  certTestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  certTestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: kioskRadii.xs,
  },
  certTestPillText: {
    fontWeight: '700',
    color: '#166534',
  },
  /* IN-HOUSE TESTS STYLING */
  testsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  testCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 14,
    gap: 8,
  },
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  testBadgeWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  testTitleText: {
    flex: 1,
    fontWeight: '800',
    color: '#0F766E',
    lineHeight: 19,
  },
  testSubPointsWrapper: {
    marginLeft: 36,
    gap: 5,
  },
  testSubPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  testSubPointCheck: {
    marginTop: 2,
  },
  testSubPointText: {
    flex: 1,
    color: '#134E4A',
    lineHeight: 17,
  },
  /* APPLICABLE AREAS STYLING */
  areasGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  areaGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
    minHeight: 44,
  },
  areaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCardText: {
    fontWeight: '700',
    color: kioskColors.textPrimary,
  },
  /* ACTION FOOTER STYLING */
  detailActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailBackBtn: {
    paddingHorizontal: 18,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: kioskRadii.md,
  },
  detailBackBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
  },
  detailWhiteboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    minHeight: 46,
    justifyContent: 'center',
    backgroundColor: kioskColors.accentBlue,
    borderRadius: kioskRadii.md,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  detailWhiteboardBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  portraitVersionBar: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#0F172A',
  },
  portraitVersionText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
