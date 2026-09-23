import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  ChevronRight,
  X,
  Zap,
  Info,
  Edit3,
  Box,
  Video,
} from 'lucide-react-native';
import { ProductMediaAsset, KioskProduct, KioskCategory, KioskResponsiveMetrics } from '../types/kiosk';
import { WhiteboardModal } from './WhiteboardModal';
import { KioskBackButton } from './KioskBackButton';
import { MediaModal } from './MediaModal';
import { useInactivityTimer } from './InactivityTracker';
import { useAppVersion } from '../hooks/useAppVersion';
import {
  KIOSK_COLOR_COMBOS,
  getColorCombo,
  getRandomColorCombo,
} from '../constants/colorCombos';
import { kioskColors, kioskIcons, kioskRadii, kioskShadows } from '../theme/kioskTheme';

// ── Interactive Spring Touch Card Component with Tactile Kiosk Feedback ──
const AnimatedCard: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  activeOpacity?: number;
  accessible?: boolean;
  accessibilityLabel?: string;
}> = ({ onPress, style, children, activeOpacity = 0.9, accessible, accessibilityLabel }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 28,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 5,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <View style={styles.cardTouchInner}>
          {children}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Re-export curated color combinations and helper utilities
export { KIOSK_COLOR_COMBOS, getColorCombo, getRandomColorCombo };

interface PortraitKioskLayoutProps {
  metrics: KioskResponsiveMetrics;
  products: KioskProduct[];
  categories: KioskCategory[];
  selectedCategory: string;
  searchQuery: string;
  activeTab?: 'home' | 'products' | 'about';
  isScreensaverActive?: boolean;
  onSelectCategory: (catId: string) => void;
  onSearchChange: (query: string) => void;
  onSelectProduct: (product: KioskProduct) => void;
  onSelectTab?: (tab: 'home' | 'products' | 'about') => void;
  onLogout?: () => void;
}

export const PortraitKioskLayout: React.FC<PortraitKioskLayoutProps> = ({
  metrics,
  products,
  categories,
  selectedCategory,
  searchQuery,
  isScreensaverActive,
  onSelectCategory,
  onSearchChange,
  onSelectProduct,
}) => {
  const { resetTimer } = useInactivityTimer();
  const { scaleFont, scaleSpacing, width: screenWidth, height: screenHeight, crispTextProps } = metrics;
  const appVersion = useAppVersion();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active sub-view in Portrait mode: null for Category Selection, catId for Category Products List
  const [activeCategory, setActiveCategory] = useState<string | null>(
    selectedCategory === 'all' ? null : selectedCategory
  );

  // Selected product for Bottom Sheet Popup
  const [selectedProductDetail, setSelectedProductDetail] = useState<KioskProduct | null>(null);
  // Fullscreen media preview (3D or Video)
  const [previewMediaAsset, setPreviewMediaAsset] = useState<ProductMediaAsset | null>(null);

  // Responsive card layout calculation to prevent oversized, vertically stretched cards on kiosks
  const numColumns = screenWidth >= 900 ? 4 : screenWidth >= 600 ? 3 : 2;
  const horizontalPadding = 16;
  const gridGap = 12;
  const totalGaps = (numColumns - 1) * gridGap;
  const availableWidth = screenWidth - (horizontalPadding * 2);
  const cardWidth = Math.floor((availableWidth - totalGaps) / numColumns);
  // Elegant fixed proportions: cardHeight around 175-205px (compact, never stretched)
  const cardHeight = Math.min(210, Math.max(172, Math.round(cardWidth * 1.04)));
  const cardImgHeight = cardHeight - 50;

  // Screen transition animation when switching categories or search queries
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentTranslateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    contentFadeAnim.setValue(0);
    contentTranslateAnim.setValue(16);
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeCategory, searchQuery]);

  // Subtle ambient attention pulse on Kiosk interactive CTA
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  // Bottom Sheet Animation Value
  const sheetAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (selectedProductDetail) {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      sheetAnim.setValue(600);
    }
  }, [selectedProductDetail]);

  // Immediately close bottom sheet and whiteboard if screensaver activates
  useEffect(() => {
    if (isScreensaverActive) {
      setSelectedProductDetail(null);
      setIsWhiteboardOpen(false);
    }
  }, [isScreensaverActive]);

  const closeBottomSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSelectedProductDetail(null);
    });
  };

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const rawTarget = activeCategory || selectedCategory || 'all';
    const targetCat = rawTarget.trim().toLowerCase();

    let matchesCat = !targetCat || targetCat === 'all';
    if (!matchesCat) {
      const activeCatObj = categories.find(
        (c) => c.id.toLowerCase() === targetCat || c.code.toLowerCase() === targetCat
      );
      const activeCatName = activeCatObj?.name?.toLowerCase() || '';

      matchesCat = Boolean(
        p.category?.toLowerCase() === targetCat ||
        p.categoryId?.toLowerCase() === targetCat ||
        p.categoryCode?.toLowerCase() === targetCat ||
        (activeCatName && p.categoryName?.toLowerCase() === activeCatName) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(targetCat)) ||
        (activeCatName && p.categoryName && activeCatName.includes(p.categoryName.toLowerCase()))
      );
    }

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query));

    return matchesCat && matchesSearch;
  });

  const activeCategoryObj = categories.find((c) => c.id === activeCategory);

  // Dynamically collected categories list (excluding "all")
  const displayCategories = categories.filter((c) => c.id !== 'all');

  // Scroll height and content height measurements for adaptive centering
  const [catScrollHeight, setCatScrollHeight] = useState(0);
  const [catContentHeight, setCatContentHeight] = useState(0);
  const [prodScrollHeight, setProdScrollHeight] = useState(0);
  const [prodContentHeight, setProdContentHeight] = useState(0);

  const isCatScrollable = catScrollHeight > 0 && catContentHeight > catScrollHeight;
  const isProdScrollable = prodScrollHeight > 0 && prodContentHeight > prodScrollHeight;

  // Fallback specs generator
  const getProductSpecs = (prod: KioskProduct): Record<string, string> => {
    if (prod.specifications && Object.keys(prod.specifications).length > 0) {
      return prod.specifications;
    }
    return {
      'Material Grade': 'High Conductive Pure Electrolytic Copper (99.9%)',
      'Manufacturing Standard': 'IEC 62561-2 / UL 467 Certified',
      'Corrosion Resistance': 'High resistance against aggressive soil chemicals',
      'Coating Thickness': 'Minimum 254 Microns (Molecular Bonded)',
      'Service Life': '30+ Years in standard grounding installation',
      'Testing Method': '4-Terminal Fall-of-Potential & Soil Resistivity',
    };
  };

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

      {/* ── EXPANDED HEADER WITH EARTH BACKGROUND IMAGE ── */}
      <ImageBackground
        source={require('../../assets/portrait_earth_header.png')}
        style={[styles.expandedHeaderBg, { minHeight: scaleSpacing(110) }]}
        imageStyle={styles.expandedHeaderBgImage}
        resizeMode="cover"
      >
        <View style={styles.headerTopRow}>
          <Image
            source={require('../../assets/excel_logo_white.png')}
            style={styles.officialWhiteLogoImg}
            resizeMode="contain"
          />

          <View style={styles.headerActionsRow}>
            {/* Standardized Search Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsSearchOpen((prev) => !prev)}
              style={styles.headerPillBtn}
            >
              <Search size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.headerPillBtnText, { fontSize: scaleFont(12) }]}>Search</Text>
            </TouchableOpacity>

            {/* Standardized Whiteboard Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.headerPillBtn}
            >
              <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.headerPillBtnText, { fontSize: scaleFont(12) }]}>Whiteboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Search Input Bar (when active) */}
      {(isSearchOpen || searchQuery.length > 0) && (
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchContainer}>
            <Search size={14} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search earthing products, SKUs..."
              placeholderTextColor={kioskColors.textLightMuted}
              autoFocus={isSearchOpen}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
                <X size={14} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* ── VIEW 1: DYNAMIC CATEGORY SELECTION SCREEN ── */}
      {/* ── ANIMATED BODY CONTAINER WITH SMOOTH GLIDE-IN KIOSK TRANSITIONS ── */}
      <Animated.View
        style={[
          styles.animatedContentWrapper,
          {
            opacity: contentFadeAnim,
            transform: [{ translateY: contentTranslateAnim }],
          },
        ]}
      >
        {!activeCategory && !searchQuery.trim() ? (
          <ScrollView
            showsVerticalScrollIndicator={isCatScrollable}
            bounces={true}
            style={styles.categoryScrollView}
            contentContainerStyle={[
              styles.scrollBodyContainer,
              isCatScrollable ? styles.scrollBodyScrollable : styles.scrollBodyCentered,
            ]}
            onLayout={(e) => setCatScrollHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_w, h) => setCatContentHeight(h)}
          >
            {products.length > 0 && (
              <View style={styles.portraitTopActionRow}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setActiveCategory('all');
                      onSelectCategory('all');
                    }}
                    style={styles.portraitAllProductsBtn}
                  >
                    <Zap size={13} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.portraitAllProductsBtnText}>
                      All Products ({products.length})
                    </Text>
                    <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}

            <View style={styles.cardGrid}>
              {displayCategories.map((cat, idx) => {
                const combo = getColorCombo(cat.id || cat.name, idx);
                const catProdCount = products.filter((p) => {
                  const catTarget = (cat.id || cat.code || cat.name).toLowerCase();
                  return (
                    p.category?.toLowerCase() === catTarget ||
                    p.categoryId?.toLowerCase() === catTarget ||
                    p.categoryCode?.toLowerCase() === catTarget ||
                    (p.categoryName && p.categoryName.toLowerCase() === catTarget) ||
                    (p.categoryName && cat.name && p.categoryName.toLowerCase().includes(cat.name.toLowerCase()))
                  );
                }).length;

                return (
                  <AnimatedCard
                    key={cat.id || idx}
                    onPress={() => {
                      setActiveCategory(cat.id);
                      onSelectCategory(cat.id);
                    }}
                    accessible={true}
                    accessibilityLabel={cat.name}
                    style={[
                      styles.kioskCard,
                      {
                        width: cardWidth,
                        height: cardHeight,
                        backgroundColor: combo.bg,
                        borderColor: combo.borderColor,
                      },
                    ]}
                  >
                    {/* Dynamic Category Image with Product Count Badge */}
                    <View style={[styles.cardImgContainer, { height: cardImgHeight }]}>
                      {cat.image ? (
                        <Image
                          source={{ uri: cat.image }}
                          style={styles.cardImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.fallbackIconCircle}>
                          <Zap size={scaleFont(28)} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                        </View>
                      )}
                      {catProdCount > 0 && (
                        <View style={[styles.catCountBadge, { backgroundColor: combo.arrowBg }]}>
                          <Text style={[styles.catCountBadgeText, { fontSize: scaleFont(10.5) }]}>
                            {catProdCount} {catProdCount === 1 ? 'item' : 'items'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooterRow}>
                      <Text numberOfLines={1} style={[styles.cardTitleText, { fontSize: scaleFont(14) }]}>
                        {cat.name}
                      </Text>
                      <View style={[styles.arrowCircleBtn, { backgroundColor: combo.arrowBg }]}>
                        <ChevronRight size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.6} />
                      </View>
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          /* ── VIEW 2: DYNAMIC CATEGORY PRODUCTS SCREEN ── */
          <View style={styles.categoryProductsView}>
            {/* Sub-Header with Standardized Back Button */}
            <View style={styles.catSubHeader}>
              <KioskBackButton
                onPress={() => {
                  setActiveCategory(null);
                  onSelectCategory('all');
                }}
                label="Categories"
              />

              <View style={styles.catSubHeaderInfo}>
                <Text numberOfLines={1} style={[styles.catHeaderTitle, { fontSize: scaleFont(17) }]}>
                  {activeCategoryObj?.name || 'All Products'}
                </Text>
                <View style={styles.productCountPill}>
                  <Text style={[styles.productCountPillText, { fontSize: scaleFont(12) }]}>{filteredProducts.length}</Text>
                </View>
              </View>
            </View>

            {/* Horizontal Quick Category Filter Strip for Fast Browsing */}
            <View style={styles.quickFilterStrip}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickFilterScroll}
              >
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    setActiveCategory('all');
                    onSelectCategory('all');
                  }}
                  style={[
                    styles.quickFilterPill,
                    (activeCategory === 'all' || !activeCategory) && styles.quickFilterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickFilterText,
                      (activeCategory === 'all' || !activeCategory) && styles.quickFilterTextActive,
                      { fontSize: scaleFont(12) },
                    ]}
                  >
                    All ({products.length})
                  </Text>
                </TouchableOpacity>
                {displayCategories.map((c) => {
                  const isSelected = activeCategory === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.82}
                      onPress={() => {
                        setActiveCategory(c.id);
                        onSelectCategory(c.id);
                      }}
                      style={[
                        styles.quickFilterPill,
                        isSelected && styles.quickFilterPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickFilterText,
                          isSelected && styles.quickFilterTextActive,
                          { fontSize: scaleFont(12) },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Product Cards Grid */}
            <ScrollView
              showsVerticalScrollIndicator={isProdScrollable}
              bounces={true}
              style={styles.categoryScrollView}
              contentContainerStyle={[
                styles.scrollBodyContainer,
                isProdScrollable ? styles.scrollBodyScrollable : styles.scrollBodyCentered,
              ]}
              onLayout={(e) => setProdScrollHeight(e.nativeEvent.layout.height)}
              onContentSizeChange={(_w, h) => setProdContentHeight(h)}
            >
              <View style={styles.cardGrid}>
                {filteredProducts.map((prod, idx) => {
                  const combo = getColorCombo(prod.id || prod.name, idx);

                  return (
                    <AnimatedCard
                      key={prod.id || idx}
                      onPress={() => setSelectedProductDetail(prod)}
                      style={[
                        styles.kioskCard,
                        {
                          width: cardWidth,
                          height: cardHeight,
                          backgroundColor: combo.bg,
                          borderColor: combo.borderColor,
                        },
                      ]}
                    >
                      {/* Dynamic Product Image */}
                      <View style={[styles.cardImgContainer, { height: cardImgHeight }]}>
                        {prod.mediaAssets?.some((a) => a.asset_type === 'THREE_D') && (
                          <View style={styles.card3DBadge}>
                            <Box size={10} color="#0284C7" strokeWidth={2.4} />
                            <Text style={styles.card3DBadgeText}>3D</Text>
                          </View>
                        )}
                        {prod.mediaAssets?.some((a) => a.asset_type === 'VIDEO') && (
                          <View style={styles.cardVideoBadge}>
                            <Video size={10} color="#E11D48" strokeWidth={2.4} />
                            <Text style={styles.cardVideoBadgeText}>VIDEO</Text>
                          </View>
                        )}
                        {prod.image ? (
                          <Image
                            source={{ uri: prod.image }}
                            style={styles.cardImg}
                            resizeMode="contain"
                            fadeDuration={0}
                          />
                        ) : (
                          <View style={styles.fallbackIconCircle}>
                            <Zap size={scaleFont(28)} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                          </View>
                        )}
                      </View>

                      {/* Card Footer */}
                      <View style={styles.cardFooterRow}>
                        <View style={styles.cardFooterTextCol}>
                          <Text numberOfLines={1} style={[styles.cardTitleText, { fontSize: scaleFont(13.5) }]}>
                            {prod.name}
                          </Text>
                          <Text numberOfLines={1} style={[styles.productSkuText, { fontSize: scaleFont(11) }]}>
                            {prod.sku}
                          </Text>
                        </View>
                        <View style={[styles.arrowCircleBtn, { backgroundColor: combo.arrowBg }]}>
                          <ChevronRight size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                      </View>
                    </AnimatedCard>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { fontSize: scaleFont(13) }]}>No products found matching this filter</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* ── APP VERSION (SUBTLE LETTERING AT SIDE OF SCREEN) ── */}
      <View style={styles.portraitVersionBar}>
        <Text style={[styles.portraitVersionText, { fontSize: scaleFont(11) }]} {...crispTextProps}>
          {appVersion.startsWith('v') ? appVersion : `v${appVersion}`}
        </Text>
      </View>

      {/* ── FIXED POSITION BOTTOM AD IMAGE ── */}
      <View style={styles.fixedBottomAdWrapper}>
        <Image
          source={require('../../assets/portrait_nature_footer.png')}
          style={[styles.fixedBottomAdImg, { height: Math.max(68, scaleSpacing(72)) }]}
          resizeMode="cover"
        />
      </View>

      {/* ── PRODUCT DETAIL BOTTOM SHEET MODAL ── */}
      <Modal
        visible={!!selectedProductDetail}
        transparent
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeBottomSheet}
      >
        <TouchableWithoutFeedback onPress={closeBottomSheet}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.bottomSheetContainer,
            { transform: [{ translateY: sheetAnim }] },
          ]}
        >
          {/* Drag Handle & Close Button Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandleBar} />
            <TouchableOpacity onPress={closeBottomSheet} style={styles.closeBtnCircle}>
              <X size={15} color={kioskColors.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {selectedProductDetail && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              <View style={styles.sheetMainImgContainer}>
                <Image
                  source={{ uri: selectedProductDetail.image }}
                  style={styles.sheetMainImg}
                  resizeMode="contain"
                />
              </View>

              {/* Media Action Quick Pills */}
              {(selectedProductDetail.mediaAssets?.some((a) => a.asset_type === 'THREE_D') ||
                selectedProductDetail.mediaAssets?.some((a) => a.asset_type === 'VIDEO')) && (
                <View style={styles.sheetMediaActionsRow}>
                  {selectedProductDetail.mediaAssets?.find((a) => a.asset_type === 'THREE_D') && (
                    <TouchableOpacity
                      style={styles.sheet3DBtn}
                      onPress={() => {
                        const a = selectedProductDetail.mediaAssets?.find((m) => m.asset_type === 'THREE_D');
                        if (a) setPreviewMediaAsset(a);
                      }}
                      activeOpacity={0.85}
                    >
                      <Box size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={[styles.sheet3DBtnText, { fontSize: scaleFont(12.5) }]}>
                        Explore 3D Model
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedProductDetail.mediaAssets?.find((a) => a.asset_type === 'VIDEO') && (
                    <TouchableOpacity
                      style={styles.sheetVideoBtn}
                      onPress={() => {
                        const a = selectedProductDetail.mediaAssets?.find((m) => m.asset_type === 'VIDEO');
                        if (a) setPreviewMediaAsset(a);
                      }}
                      activeOpacity={0.85}
                    >
                      <Video size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={[styles.sheetVideoBtnText, { fontSize: scaleFont(12.5) }]}>
                        Watch Video
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={[styles.sheetProductTitle, { fontSize: scaleFont(20) }]}>
                {selectedProductDetail.name}
              </Text>
              <Text style={[styles.sheetProductDesc, { fontSize: scaleFont(13), lineHeight: scaleFont(18) }]}>
                {selectedProductDetail.description || selectedProductDetail.subtitle || 'Industrial Grade Component'}
              </Text>

              {/* Technical Specifications Table */}
              <View style={styles.keySpecsContainer}>
                <View style={styles.keySpecsHeaderRow}>
                  <Info size={scaleFont(15)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                  <Text style={[styles.keySpecsHeader, { fontSize: scaleFont(14.5) }]}>Technical Specifications</Text>
                </View>
                {Object.entries(getProductSpecs(selectedProductDetail))
                  .slice(0, 8)
                  .map(([key, val], idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.specRow,
                        idx % 2 === 0 ? styles.specRowEven : styles.specRowOdd,
                      ]}
                    >
                      <Text style={[styles.specKey, { fontSize: scaleFont(12.5) }]}>{key}</Text>
                      <Text style={[styles.specVal, { fontSize: scaleFont(12.5) }]}>{val}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          )}

          {/* Bottom Action Footer */}
          {selectedProductDetail && (
            <View style={styles.sheetFooter}>
              <Text numberOfLines={1} style={[styles.sheetFooterHint, { fontSize: scaleFont(12) }]}>
                Detailed electrical ratings & diagrams
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  const prod = selectedProductDetail;
                  closeBottomSheet();
                  onSelectProduct(prod);
                }}
                style={styles.fullDetailBtn}
              >
                <Text style={[styles.fullDetailBtnText, { fontSize: scaleFont(12.5) }]}>Full Specifications</Text>
                <ChevronRight size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Modal>

      {/* Fullscreen 3D & Media Asset Inspector Modal */}
      <MediaModal
        visible={!!previewMediaAsset}
        asset={previewMediaAsset}
        product={selectedProductDetail}
        onClose={() => setPreviewMediaAsset(null)}
        scaleFont={scaleFont}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  portraitTopActionRow: {
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  portraitAllProductsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: kioskRadii.full,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  portraitAllProductsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
    includeFontPadding: false,
  },
  categoryScrollView: {
    flex: 1,
    width: '100%',
  },
  scrollBodyContainer: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scrollBodyCentered: {
    justifyContent: 'center',
    paddingVertical: 12,
  },
  scrollBodyScrollable: {
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingBottom: 28,
  },

  // ── Expanded Header with Earth Background ──
  expandedHeaderBg: {
    width: '100%',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#020D22',
  },
  expandedHeaderBgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  officialWhiteLogoImg: {
    width: 175,
    height: 48,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  headerPillBtnText: {
    color: kioskColors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    includeFontPadding: false,
  },

  // ── Search Bar ──
  searchBarWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: kioskRadii.md,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: kioskColors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 6,
  },

  animatedContentWrapper: {
    flex: 1,
    width: '100%',
  },

  // ── Card Grid ──
  cardGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  kioskCard: {
    borderRadius: kioskRadii.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTouchInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  cardImgContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  card3DBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    zIndex: 5,
  },
  card3DBadgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '800',
  },
  cardVideoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.5)',
    zIndex: 5,
  },
  cardVideoBadgeText: {
    color: '#E11D48',
    fontSize: 10,
    fontWeight: '800',
  },
  sheetMediaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  sheet3DBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#38BDF8',
    ...kioskShadows.subtle,
  },
  sheet3DBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sheetVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E11D48',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#FB7185',
  },
  sheetVideoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardImg: {
    width: '85%',
    height: '85%',
  },
  fallbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitleText: {
    flex: 1,
    fontWeight: '800',
    fontSize: 14,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    marginRight: 6,
    includeFontPadding: false,
  },
  cardFooterTextCol: {
    flex: 1,
    marginRight: 6,
  },
  productSkuText: {
    fontSize: 12,
    fontWeight: '700',
    color: kioskColors.textMuted,
    marginTop: 2,
    includeFontPadding: false,
  },
  arrowCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── View 2: Category Products Screen ──
  categoryProductsView: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  catSubHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  catSubHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 8,
  },
  catHeaderTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  productCountPill: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  productCountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: kioskColors.accentBlue,
    includeFontPadding: false,
  },
  headerPillBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  headerPillBtnCompactText: {
    color: kioskColors.accentBlue,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  productBadgePill: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  productBadgeText: {
    color: '#854D0E',
    fontWeight: '800',
    fontSize: 11,
    includeFontPadding: false,
  },
  catCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  catCountBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  quickFilterStrip: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  quickFilterScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  quickFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: kioskRadii.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickFilterPillActive: {
    backgroundColor: '#0D60AE',
    borderColor: '#0D60AE',
  },
  quickFilterText: {
    color: '#334155',
    fontWeight: '700',
    includeFontPadding: false,
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyStateText: {
    color: kioskColors.textLightMuted,
    fontWeight: '600',
    fontSize: 13.5,
    includeFontPadding: false,
  },

  // ── Fixed Bottom Ad Banner & Version Bar ──
  portraitVersionBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  portraitVersionText: {
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.4,
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

  // ── Modal Bottom Sheet ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: kioskColors.overlay,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: kioskRadii.xl,
    borderTopRightRadius: kioskRadii.xl,
    paddingHorizontal: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  closeBtnCircle: {
    position: 'absolute',
    right: 0,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    gap: 12,
    paddingBottom: 12,
  },
  sheetMainImgContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetMainImg: {
    width: '90%',
    height: '90%',
  },
  sheetProductTitle: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
  },
  sheetProductDesc: {
    color: kioskColors.textSecondary,
  },
  keySpecsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
    marginTop: 2,
  },
  keySpecsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  keySpecsHeader: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  specRowEven: {
    backgroundColor: '#FFFFFF',
  },
  specRowOdd: {
    backgroundColor: 'transparent',
  },
  specKey: {
    color: kioskColors.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  specVal: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  sheetFooter: {
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetFooterHint: {
    fontWeight: '600',
    color: kioskColors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  fullDetailBtn: {
    backgroundColor: kioskColors.accentBlue,
    borderRadius: kioskRadii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  fullDetailBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
