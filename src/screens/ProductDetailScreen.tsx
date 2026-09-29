import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Building2,
  FileText,
  Zap,
  Edit3,
  Award,
  ClipboardCheck,
  Layers,
  Check,
  CheckCircle2,
  Search,
  Home,
  Globe,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';
import {
  KioskProduct,
  KioskProductVariant,
  ProductMediaAsset,
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
  allProducts?: KioskProduct[];
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
  onOpenMediaViewer?: (product: KioskProduct, initialAssetId?: string) => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  allProducts,
  metrics,
  onBack,
  onOpenMediaViewer,
}) => {
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;
  const appVersion = useAppVersion();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ScrollView refs for smooth horizontal scroll affordances
  const variantsScrollRef = useRef<ScrollView>(null);
  const tabsScrollRef = useRef<ScrollView>(null);

  // Live Clock state for landscape footer
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Active Variant Selection
  // Combine Parent Product and all Child Variants so both are available in the variant selector
  const allVariants = useMemo<KioskProductVariant[]>(() => {
    const rawVariants: any[] =
      (Array.isArray(product.variants) && product.variants.length > 0)
        ? product.variants
        : (Array.isArray((product as any).sub_products) && (product as any).sub_products.length > 0)
        ? (product as any).sub_products
        : (Array.isArray((product as any).child_variants) && (product as any).child_variants.length > 0)
        ? (product as any).child_variants
        : (Array.isArray((product as any).direct_variants) && (product as any).direct_variants.length > 0)
        ? (product as any).direct_variants
        : (Array.isArray((product as any).children) && (product as any).children.length > 0)
        ? (product as any).children
        : [];

    let combined: KioskProductVariant[] = rawVariants.map((v) => ({
      id: String(v.id),
      productId: String(v.productId || product.id),
      name: v.name || 'Variant',
      sku: v.sku || '',
      price: typeof v.price === 'number' ? v.price : parseFloat(v.price) || 0,
      stock: typeof v.stock === 'number' ? v.stock : 100,
      image: v.image || v.image_url || product.image,
      description: v.description || '',
      specifications: v.specifications || {},
      features: v.features || [],
      certifications: v.certifications || [],
      inHouseTests: v.inHouseTests || [],
      applicableAreas: v.applicableAreas || [],
      isActive: v.isActive !== false,
      mediaAssets: v.mediaAssets || v.media_assets || [],
    }));

    // If still empty, check allProducts for child items linked by parentId
    if (combined.length === 0 && allProducts && allProducts.length > 0) {
      const childProducts = allProducts.filter((p) => p.parentId && String(p.parentId) === String(product.id));
      if (childProducts.length > 0) {
        combined = childProducts.map((c) => ({
          id: String(c.id),
          productId: String(product.id),
          name: c.name,
          sku: c.sku,
          price: c.price,
          stock: c.stock,
          image: c.image,
          description: c.description,
          specifications: c.specifications || {},
          features: c.features || [],
          certifications: c.certifications || [],
          inHouseTests: c.inHouseTests || [],
          applicableAreas: c.applicableAreas || [],
          isActive: true,
          mediaAssets: c.mediaAssets,
        }));
      }
    }

    if (combined.length === 0) {
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
      mediaAssets: product.mediaAssets,
    };

    const hasParent = combined.some((v) => v.id === product.id || v.name.trim().toLowerCase() === product.name.trim().toLowerCase());
    return hasParent ? combined : [parentAsVariant, ...combined];
  }, [product, allProducts]);

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

  // Helper to extract clean base filename for robust deduplication
  const getCleanMediaFilename = (url?: string) => {
    if (!url) return '';
    const clean = url.split('?')[0].split('#')[0];
    return clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
  };

  // Resolved Media Assets for the current selection
  const resolvedMediaAssets: ProductMediaAsset[] = useMemo(() => {
    const allProductMedia = product.mediaAssets || [];
    let candidateAssets: ProductMediaAsset[] = [];

    if (isParentSelected) {
      // For base/parent product, include media that is NOT tagged with a child variant id or matches product.id
      candidateAssets = allProductMedia.filter((a) => !a.variantId || a.variantId === product.id);
    } else {
      // For a specific child variant:
      const explicitVariantAssets = (activeVariant && Array.isArray(activeVariant.mediaAssets)) ? activeVariant.mediaAssets : [];
      const taggedFromAll = allProductMedia.filter((a) => a.variantId === selectedVariantId);
      const combinedVariantAssets = [...explicitVariantAssets, ...taggedFromAll];

      // Check if this variant has its own 3D model
      const variantHas3D = combinedVariantAssets.some(
        (a) =>
          a.asset_type?.toUpperCase() === 'THREE_D' ||
          a.asset_type?.toUpperCase() === '3D' ||
          a.file_url?.toLowerCase().endsWith('.glb') ||
          a.file_url?.toLowerCase().endsWith('.gltf')
      );

      // Check if variant has its own PDF
      const variantHasPdf = combinedVariantAssets.some(
        (a) =>
          a.asset_type?.toUpperCase().includes('PDF') ||
          a.asset_type?.toUpperCase().includes('TECH') ||
          a.file_url?.toLowerCase().endsWith('.pdf')
      );

      // Allow general parent PDF brochures if variant doesn't have its own
      const generalPdfs = !variantHasPdf
        ? allProductMedia.filter(
            (a) =>
              !a.variantId &&
              (a.asset_type?.toUpperCase().includes('PDF') ||
                a.asset_type?.toUpperCase().includes('TECH') ||
                a.file_url?.toLowerCase().endsWith('.pdf'))
          )
        : [];

      // Variant assets + general parent photos (if variant has none) + general parent PDFs
      const generalPhotos = combinedVariantAssets.length === 0
        ? allProductMedia.filter(
            (a) =>
              !a.variantId &&
              a.asset_type?.toUpperCase() !== 'THREE_D' &&
              a.asset_type?.toUpperCase() !== '3D' &&
              !a.file_url?.toLowerCase().endsWith('.glb') &&
              !a.file_url?.toLowerCase().endsWith('.gltf') &&
              !a.file_url?.toLowerCase().endsWith('.pdf')
          )
        : [];

      candidateAssets = [...combinedVariantAssets, ...generalPhotos, ...generalPdfs];
    }

    // Strictly deduplicate PDF assets so only 1 unique PDF is ever shown if only 1 is available
    const seenPdfKeys = new Set<string>();
    const seenAssetIds = new Set<string>();
    const deduplicated: ProductMediaAsset[] = [];

    for (const a of candidateAssets) {
      if (a.id && seenAssetIds.has(a.id)) {
        continue;
      }
      if (a.id) seenAssetIds.add(a.id);

      const isPdf =
        a.asset_type?.toUpperCase().includes('PDF') ||
        a.asset_type?.toUpperCase().includes('TECH') ||
        a.file_url?.toLowerCase().endsWith('.pdf');

      if (isPdf && a.file_url) {
        const cleanFile = getCleanMediaFilename(a.file_url);
        if (seenPdfKeys.has(a.file_url) || (cleanFile && seenPdfKeys.has(cleanFile))) {
          continue; // Skip duplicate PDF
        }
        seenPdfKeys.add(a.file_url);
        if (cleanFile) seenPdfKeys.add(cleanFile);
      }

      deduplicated.push(a);
    }

    return deduplicated;
  }, [product.mediaAssets, activeVariant, isParentSelected, selectedVariantId, product.id]);

  // Virtual product with active variant parameters for gallery / media
  const displayedProduct: KioskProduct = useMemo(() => {
    return {
      ...product,
      name: resolvedName,
      image: activeVariant?.image || product.image,
      specifications: resolvedSpecs,
      mediaAssets: resolvedMediaAssets,
    };
  }, [product, resolvedName, activeVariant, resolvedSpecs, resolvedMediaAssets]);

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

      {/* ── HEADER INHERITED FROM OTHER PAGES ── */}
      {isLandscape ? (
        <>
          {/* LANDSCAPE TOP HEADER */}
          <ImageBackground
            source={require('../../assets/portrait_earth_header.png')}
            style={styles.landscapeTopHeader}
            imageStyle={styles.topHeaderBgImage}
            resizeMode="cover"
          >
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/excel_since_logo.png')}
                style={{ width: scaleSpacing(38), height: scaleSpacing(36), marginRight: scaleSpacing(10) }}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/excel_logo_white.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={onBack}
                style={styles.homeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Home size={16} color="#FFFFFF" strokeWidth={kioskIcons.strokeWidth} />
              </TouchableOpacity>

              <View style={styles.landscapeSearchContainer}>
                <Search size={scaleFont(14)} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search products..."
                  placeholderTextColor={kioskColors.textLightMuted}
                  style={[styles.landscapeSearchInput, { fontSize: scaleFont(13) }]}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                    <X size={scaleFont(13)} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleOpenWhiteboard}
                style={styles.landscapeWhiteboardBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={[styles.landscapeWhiteboardBtnText, { fontSize: scaleFont(13) }]} {...crispTextProps}>
                  Whiteboard
                </Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

          {/* LANDSCAPE SUB-HEADER */}
          <View style={styles.productSubHeader}>
            <KioskBackButton onPress={onBack} label="Back to Catalog" />
            <View style={styles.subHeaderDivider} />
            <Text numberOfLines={1} style={[styles.productSubHeaderTitle, { fontSize: scaleFont(15) }]} {...crispTextProps}>
              {resolvedName}
            </Text>
          </View>
        </>
      ) : (
        <>
          {/* PORTRAIT EXPANDED TOP HEADER */}
          <ImageBackground
            source={require('../../assets/portrait_earth_header.png')}
            style={[styles.portraitExpandedHeaderBg, { minHeight: scaleSpacing(110) }]}
            imageStyle={styles.portraitExpandedHeaderBgImage}
            resizeMode="cover"
          >
            <View style={styles.portraitHeaderTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleSpacing(8) }}>
                <Image
                  source={require('../../assets/excel_since_logo.png')}
                  style={{ width: scaleSpacing(34), height: scaleSpacing(32) }}
                  resizeMode="contain"
                />
                <Image
                  source={require('../../assets/excel_logo_white.png')}
                  style={styles.portraitOfficialWhiteLogoImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.portraitHeaderActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setIsSearchOpen((prev) => !prev)}
                  style={styles.portraitHeaderPillBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Search size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                  <Text style={[styles.portraitHeaderPillBtnText, { fontSize: scaleFont(12) }]}>Search</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleOpenWhiteboard}
                  style={styles.portraitHeaderPillBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                  <Text style={[styles.portraitHeaderPillBtnText, { fontSize: scaleFont(12) }]}>Whiteboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>

          {/* Expandable Search Input in Portrait */}
          {isSearchOpen && (
            <View style={styles.portraitSearchBarWrapper}>
              <View style={styles.portraitSearchContainer}>
                <Search size={14} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search earthing products..."
                  placeholderTextColor={kioskColors.textLightMuted}
                  autoFocus={isSearchOpen}
                  style={styles.portraitSearchInput}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                    <X size={14} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* PORTRAIT SUB-HEADER */}
          <View style={styles.productSubHeader}>
            <KioskBackButton onPress={onBack} label="Back to Catalog" />
            <View style={styles.subHeaderDivider} />
            <Text numberOfLines={1} style={[styles.productSubHeaderTitle, { fontSize: scaleFont(15) }]} {...crispTextProps}>
              {resolvedName}
            </Text>
          </View>
        </>
      )}

      {/* ── FULL PAGE CONTENT SCROLLVIEW ── */}
      <KioskScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { padding: scaleSpacing(18) },
        ]}
      >
        <View style={[styles.contentLayoutRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
          {/* Left Panel: Media Gallery */}
          <View style={[styles.leftPanel, { width: isLandscape ? 440 : '100%' }]}>
            <ProductMediaGallery
              product={displayedProduct}
              height={isLandscape ? 360 : 300}
              isLandscape={isLandscape}
              scaleFont={scaleFont}
              scaleSpacing={scaleSpacing}
              onOpenMediaViewer={(asset) => handleLaunchMediaViewer(asset?.id)}
            />
          </View>

          {/* Right Panel: Overview, Variants Selector, Segmented Tabs, and Content */}
          <View style={styles.rightPanel}>
            {/* Product Overview Header */}
            <View style={styles.overviewCard}>
              <Text style={[styles.productTitleMain, { fontSize: scaleFont(22) }]}>
                {resolvedName}
              </Text>
              {!isParentSelected && (
                <Text style={[styles.productBaseNameText, { fontSize: scaleFont(12) }]}>
                  Base Model: {product.name}
                </Text>
              )}
              {product.subtitle ? (
                <Text style={[styles.productSubtitleText, { fontSize: scaleFont(13.5) }]}>
                  {product.subtitle}
                </Text>
              ) : null}
              <Text style={[styles.productDescText, { fontSize: scaleFont(12.5) }]}>
                {resolvedDescription || 'Precision-engineered industrial earthing and grounding equipment manufactured under stringent international quality control.'}
              </Text>
            </View>

            {/* PRODUCT VARIANTS SELECTOR CARDS (MATCHING UPLOADED DESIGN) */}
            {allVariants.length > 0 && (
              <View style={styles.variantsCard}>
                <View style={styles.variantsHeaderRow}>
                  <View style={styles.variantsHeaderLeft}>
                    <Layers size={scaleFont(15)} color={kioskColors.brandNavy} strokeWidth={2.2} />
                    <Text style={[styles.variantsSectionTitle, { fontSize: scaleFont(13.5) }]}>
                      Available Variants
                    </Text>
                  </View>
                </View>

                <View style={styles.variantsScrollWrapper}>
                  <ScrollView
                    ref={variantsScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.variantsScrollContent}
                  >
                    {allVariants.map((v) => {
                      const isSelected = selectedVariantId === v.id || (isParentSelected && v.id === product.id);
                      const isParent = (v.id === product.id);
                      const variantImage = v.image || product.image;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          activeOpacity={0.88}
                          onPress={() => handleSelectVariant(v)}
                          style={[
                            styles.variantCard,
                            isSelected ? styles.variantCardActive : styles.variantCardInactive,
                          ]}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <View style={styles.variantThumbWrapper}>
                            {variantImage ? (
                              <Image
                                source={typeof variantImage === 'string' ? { uri: variantImage } : variantImage}
                                style={styles.variantThumbImg}
                                resizeMode="contain"
                              />
                            ) : (
                              <Layers size={18} color={kioskColors.accentBlue} strokeWidth={1.8} />
                            )}
                          </View>
                          <View style={styles.variantInfoCol}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.variantNameText,
                                isSelected ? styles.variantNameTextActive : styles.variantNameTextInactive,
                                { fontSize: scaleFont(12) },
                              ]}
                            >
                              {isParent ? `${v.name} (Base)` : v.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {allVariants.length > 2 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => variantsScrollRef.current?.scrollTo({ x: 260, animated: true })}
                      style={styles.variantScrollArrowBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Scroll variants right"
                    >
                      <ChevronRight size={scaleFont(16)} color="#0D60AE" strokeWidth={2.6} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* 5-TAB SEGMENTED CONTROLLER */}
            <View style={styles.tabsContainer}>
              <ScrollView
                ref={tabsScrollRef}
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
                    Specifications ({Object.keys(resolvedSpecs).length})
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
                    Testing ({resolvedInHouseTests.length})
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

              {/* Right side arrow to identify more tabs are available on sliding */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => tabsScrollRef.current?.scrollTo({ x: 260, animated: true })}
                style={styles.tabsScrollArrowBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Scroll tabs right"
              >
                <ChevronRight size={scaleFont(16)} color="#0D60AE" strokeWidth={2.6} />
              </TouchableOpacity>
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
                      Technical Specifications
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Verified dimensional data, material compliance, and metallurgical specs.
                  </Text>

                  {Object.keys(resolvedSpecs).length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No specifications configured for this model.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.specsTableContainer}>
                      {Object.entries(resolvedSpecs).map(([key, val], idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.specsTableRow,
                            idx % 2 === 0 ? styles.specsRowEven : styles.specsRowOdd,
                          ]}
                        >
                          <Text style={[styles.specsKeyText, { fontSize: scaleFont(12) }]}>
                            {key}
                          </Text>
                          <Text style={[styles.specsValText, { fontSize: scaleFont(12) }]}>
                            {val}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 3: CERTIFICATIONS */}
              {activeTab === 'certifications' && (
                <View style={styles.tabSection}>
                  <View style={styles.tabSectionTitleRow}>
                    <Award size={scaleFont(16)} color="#D97706" strokeWidth={2.2} />
                    <Text style={[styles.tabSectionTitle, { fontSize: scaleFont(14.5) }]}>
                      International Standards & Certifications
                    </Text>
                  </View>
                  <Text style={[styles.tabSectionSub, { fontSize: scaleFont(11.5) }]}>
                    Accredited third-party compliance, safety approvals, and global electrical certifications.
                  </Text>

                  {resolvedCertifications.length === 0 ? (
                    <View style={styles.emptyTabBox}>
                      <Text style={[styles.emptyTabText, { fontSize: scaleFont(12.5) }]}>
                        No certifications configured for this item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.certsListContainer}>
                      {resolvedCertifications.map((item, idx) => (
                        <View key={idx} style={styles.certCard}>
                          <View style={styles.certHeaderRow}>
                            <View style={styles.certBadgeWrap}>
                              <Award size={15} color="#D97706" strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.certTitleText, { fontSize: scaleFont(13) }]}>
                              {item.title}
                            </Text>
                          </View>

                          {/* Cert sub-points */}
                          {item.sub_points && item.sub_points.length > 0 && (
                            <View style={styles.certSubPointsWrapper}>
                              {item.sub_points.map((sub, sIdx) => (
                                <View key={sIdx} style={styles.certSubPointRow}>
                                  <View style={styles.certSubPointCheck}>
                                    <Check size={10} color="#D97706" strokeWidth={2.5} />
                                  </View>
                                  <Text style={[styles.certSubPointText, { fontSize: scaleFont(12) }]}>
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

              {/* TAB 4: IN-HOUSE TESTS */}
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

            {/* Bottom Ergonomic Action Buttons */}
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

      {/* ── FOOTER INHERITED FROM OTHER PAGES ── */}
      {isLandscape ? (
        /* LANDSCAPE BOTTOM FOOTER */
        <View style={styles.landscapeBottomFooter}>
          <TouchableOpacity style={styles.languageBtn} activeOpacity={0.8}>
            <Globe size={scaleFont(13)} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
            <Text style={[styles.languageBtnText, { fontSize: scaleFont(12) }]} {...crispTextProps}>
              English
            </Text>
            <ChevronDown size={scaleFont(11)} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
          </TouchableOpacity>

          <View style={styles.footerRightRow}>
            <View style={styles.clockSection}>
              <Text style={[styles.clockTime, { fontSize: scaleFont(13) }]} {...crispTextProps}>
                {currentTime}
              </Text>
              <View style={styles.clockDivider} />
              <Text style={[styles.clockDate, { fontSize: scaleFont(12.5) }]} {...crispTextProps}>
                {currentDate}
              </Text>
            </View>

            <View style={styles.clockDivider} />

            <View style={styles.footerVersionContainer}>
              <Text style={[styles.footerVersionText, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
                {appVersion.startsWith('v') ? appVersion : 'v' + appVersion}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* PORTRAIT BOTTOM FOOTER */
        <>
          <View style={styles.portraitVersionBar}>
            <Text style={[styles.portraitVersionText, { fontSize: scaleFont(11) }]} {...crispTextProps}>
              {appVersion.startsWith('v') ? appVersion : 'v' + appVersion}
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

  // ── LANDSCAPE HEADER STYLES (MATCHING LandscapeKioskLayout) ──
  landscapeTopHeader: {
    backgroundColor: '#020D22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  topHeaderBgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImg: {
    width: 142,
    height: 38,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeBtn: {
    width: 36,
    height: 36,
    borderRadius: kioskRadii.md,
    backgroundColor: kioskColors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  landscapeSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: kioskRadii.md,
    paddingHorizontal: 10,
    height: 36,
    width: 230,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  landscapeSearchInput: {
    flex: 1,
    color: kioskColors.textPrimary,
    fontWeight: '600',
    marginLeft: 6,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 3,
  },
  landscapeWhiteboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    height: 36,
    borderRadius: kioskRadii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  landscapeWhiteboardBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  // ── PORTRAIT HEADER STYLES (MATCHING PortraitKioskLayout) ──
  portraitExpandedHeaderBg: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#020D22',
  },
  portraitExpandedHeaderBgImage: {
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
  portraitOfficialWhiteLogoImg: {
    width: 130,
    height: 36,
  },
  portraitHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portraitHeaderPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  portraitHeaderPillBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
  },
  portraitSearchBarWrapper: {
    width: '100%',
    backgroundColor: '#0D60AE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  portraitSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.full,
    paddingHorizontal: 14,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  portraitSearchInput: {
    flex: 1,
    fontSize: 13,
    color: kioskColors.textPrimary,
    fontWeight: '600',
    marginLeft: 8,
  },

  // ── STANDARDIZED SUB-HEADER ──
  productSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  subHeaderDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  productSubHeaderTitle: {
    flex: 1,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },

  // ── CONTENT LAYOUT ──
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

  // ── PRODUCT OVERVIEW ──
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

  // ── AVAILABLE VARIANTS CARDS (MATCHING UPLOADED DESIGN) ──
  variantsCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  variantsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variantsSectionTitle: {
    fontWeight: '800',
    color: kioskColors.brandNavy,
    letterSpacing: -0.2,
  },
  variantsScrollWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variantsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  variantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  variantCardActive: {
    borderWidth: 2,
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  variantCardInactive: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  variantThumbWrapper: {
    width: 26,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    overflow: 'hidden',
  },
  variantThumbImg: {
    width: '100%',
    height: '100%',
  },
  variantInfoCol: {
    justifyContent: 'center',
  },
  variantNameText: {
    fontWeight: '700',
  },
  variantNameTextActive: {
    color: '#0284C7',
  },
  variantNameTextInactive: {
    color: '#334155',
  },
  variantScrollArrowBtn: {
    width: 32,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── 5-TAB SEGMENTED CONTROLLER ──
  tabsContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: kioskRadii.md,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 4,
  },
  tabsScrollArrowBtn: {
    width: 32,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginLeft: 4,
    marginRight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    includeFontPadding: false,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  // ── TAB CONTENT PANEL ──
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 220,
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
    letterSpacing: -0.2,
  },
  tabSectionSub: {
    color: kioskColors.textMuted,
    marginTop: -4,
    lineHeight: 16,
  },
  emptyTabBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    color: kioskColors.textMuted,
    fontStyle: 'italic',
  },

  // Features list
  featuresListContainer: {
    gap: 10,
    marginTop: 4,
  },
  featureItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  featureMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureCheckIconWrap: {
    marginTop: 1,
  },
  featureMainPointText: {
    fontWeight: '700',
    color: kioskColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  featureSubPointsWrapper: {
    paddingLeft: 26,
    gap: 4,
    marginTop: 4,
  },
  featureSubPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subPointDisc: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748B',
  },
  featureSubPointText: {
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },

  // Specs Table
  specsTableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: kioskRadii.md,
    overflow: 'hidden',
    marginTop: 4,
  },
  specsTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  specsRowEven: {
    backgroundColor: '#FFFFFF',
  },
  specsRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  specsKeyText: {
    color: kioskColors.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  specsValText: {
    color: kioskColors.brandNavy,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },

  // Certifications list
  certsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  certCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: kioskRadii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  certBadgeWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTitleText: {
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
  },
  certSubPointsWrapper: {
    paddingLeft: 34,
    gap: 4,
    marginTop: 4,
  },
  certSubPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  certSubPointCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certSubPointText: {
    color: '#78350F',
    flex: 1,
  },

  // In-House Tests list
  testsListContainer: {
    gap: 10,
    marginTop: 4,
  },
  testCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: kioskRadii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 6,
  },
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testBadgeWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testTitleText: {
    fontWeight: '800',
    color: '#115E59',
    flex: 1,
  },
  testSubPointsWrapper: {
    paddingLeft: 34,
    gap: 4,
    marginTop: 4,
  },
  testSubPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testSubPointCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testSubPointText: {
    color: '#134E4A',
    flex: 1,
  },

  // Applicable Areas grid
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: kioskRadii.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    minWidth: 140,
  },
  areaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCardText: {
    fontWeight: '700',
    color: '#1E40AF',
  },

  // Action Buttons
  detailActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: kioskRadii.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBackBtnText: {
    fontWeight: '700',
    color: kioskColors.textSecondary,
    includeFontPadding: false,
  },
  detailWhiteboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: kioskRadii.md,
    minHeight: 46,
    justifyContent: 'center',
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  detailWhiteboardBtnText: {
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
  },

  // ── LANDSCAPE FOOTER STYLES (MATCHING LandscapeKioskLayout) ──
  landscapeBottomFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 32,
  },
  footerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerVersionContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  footerVersionText: {
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: kioskRadii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  languageBtnText: {
    color: kioskColors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
    includeFontPadding: false,
  },
  clockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockTime: {
    fontWeight: '700',
    fontSize: 13,
    color: kioskColors.textPrimary,
    includeFontPadding: false,
  },
  clockDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
  },
  clockDate: {
    fontWeight: '600',
    fontSize: 12.5,
    color: kioskColors.textMuted,
    includeFontPadding: false,
  },

  // ── PORTRAIT FOOTER STYLES (MATCHING PortraitKioskLayout) ──
  portraitVersionBar: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  portraitVersionText: {
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.3,
    includeFontPadding: false,
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
});
