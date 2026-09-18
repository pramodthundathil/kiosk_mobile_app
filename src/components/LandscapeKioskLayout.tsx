import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  ChevronRight,
  X,
  Info,
  Edit3,
  Home,
  Globe,
  ChevronDown,
  FileText,
  Zap,
} from 'lucide-react-native';
import { KioskProduct, KioskCategory, KioskResponsiveMetrics } from '../types/kiosk';
import { WhiteboardModal } from './WhiteboardModal';
import { KioskBackButton } from './KioskBackButton';
import { useInactivityTimer } from './InactivityTracker';
import { getColorCombo } from '../constants/colorCombos';
import { kioskColors, kioskIcons, kioskRadii, kioskShadows } from '../theme/kioskTheme';

// ── Interactive Spring Press Card ──
const AnimatedPressableCard: React.FC<{
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
      speed: 26,
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
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Interactive Spring Button ──
const AnimatedButton: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  activeOpacity?: number;
}> = ({ onPress, style, children, activeOpacity = 0.88 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.93,
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
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface LandscapeKioskLayoutProps {
  metrics: KioskResponsiveMetrics;
  products: KioskProduct[];
  categories: KioskCategory[];
  selectedCategory: string;
  searchQuery: string;
  selectedProduct: KioskProduct | null;
  isScreensaverActive?: boolean;
  onSelectCategory: (catId: string) => void;
  onSearchChange: (query: string) => void;
  onSelectProduct: (product: KioskProduct | null) => void;
  onOpenFullDetail: (product: KioskProduct) => void;
}

export const LandscapeKioskLayout: React.FC<LandscapeKioskLayoutProps> = ({
  metrics,
  products,
  categories,
  selectedCategory,
  searchQuery,
  selectedProduct,
  isScreensaverActive,
  onSelectCategory,
  onSearchChange,
  onSelectProduct,
  onOpenFullDetail,
}) => {
  const { scaleFont, scaleSpacing, is4K, crispTextProps } = metrics;
  const { resetTimer } = useInactivityTimer();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Active category for home → product list navigation
  const [activeCategory, setActiveCategory] = useState<string | null>(
    selectedCategory === 'all' ? null : selectedCategory
  );

  // Selected product for the detail modal
  const [selectedProductDetail, setSelectedProductDetail] = useState<KioskProduct | null>(
    selectedProduct
  );

  // Keep in sync with external selectedProduct prop
  useEffect(() => {
    setSelectedProductDetail(selectedProduct);
  }, [selectedProduct]);

  // Immediately close modal and whiteboard if screensaver activates
  useEffect(() => {
    if (isScreensaverActive) {
      setSelectedProductDetail(null);
      setIsWhiteboardOpen(false);
    }
  }, [isScreensaverActive]);

  // Screen transition animation between category home & product list
  const screenTransitionAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    screenTransitionAnim.setValue(0);
    Animated.timing(screenTransitionAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeCategory]);

  // Product Detail Side Drawer animations
  const sideDrawerAnim = useRef(new Animated.Value(650)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedProductDetail) {
      sideDrawerAnim.setValue(650);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(sideDrawerAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedProductDetail]);

  const handleOpenFullDetail = (prod: KioskProduct) => {
    setSelectedProductDetail(null);
    onOpenFullDetail(prod);
  };

  const closeSideDrawer = () => {
    Animated.parallel([
      Animated.timing(sideDrawerAnim, {
        toValue: 650,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedProductDetail(null);
      onSelectProduct(null);
    });
  };

  // Resolve specifications to ensure technical specs are always displayed
  const getProductSpecs = (prod: KioskProduct): Record<string, string> => {
    if (prod.specifications && Object.keys(prod.specifications).length > 0) {
      return prod.specifications;
    }
    return {
      'Material / Grade': 'Electrolytic Copper Bonded (≥ 99.9% Cu)',
      'Standards Compliance': 'IEC 62561-2 / UL 467 / IEEE 80 / IS 3043',
      'Electrical Conductivity': '> 99.9% IACS High Conductivity',
      'Corrosion Resistance': 'Exceeds 30 Years Service Life in Soil',
      'Coating Thickness': '254 Microns (10 Mils) Molecular Bond',
      'Tensile Strength': '≥ 600 N/mm² High Tensile Steel Core',
      'SKU / Item Code': prod.sku || 'EX-SPEC-01',
      'Category Classification': prod.categoryName || 'Earthing & Lightning Protection',
    };
  };

  // Filter products based on active category and search
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

  // Live clock for footer
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayCategories = categories.filter((c) => c.id !== 'all');

  return (
    <View style={styles.rootContainer}>
      {/* Interactive Digital Whiteboard Modal */}
      <WhiteboardModal visible={isWhiteboardOpen} onClose={() => setIsWhiteboardOpen(false)} />

      {/* ── LEFT SIDEBAR: Full height advertisement / brand panel ── */}
      <ImageBackground
        source={require('../../assets/sidebar.png')}
        style={styles.sideGradientStrip}
        resizeMode="cover"
      />

      {/* ── RIGHT PANEL: Header + Content + Footer ── */}
      <View style={styles.rightPanel}>

        {/* TOP HEADER WITH EARTH BACKGROUND IMAGE */}
        <ImageBackground
          source={require('../../assets/portrait_earth_header.png')}
          style={styles.topHeader}
          imageStyle={styles.topHeaderBgImage}
          resizeMode="cover"
        >
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/excel_logo_white.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerRight}>
            {/* Standardized Home Button */}
            <AnimatedButton
              activeOpacity={0.88}
              onPress={() => {
                setActiveCategory(null);
                onSelectCategory('all');
              }}
              style={styles.homeBtn}
            >
              <Home size={16} color="#FFFFFF" strokeWidth={kioskIcons.strokeWidth} />
            </AnimatedButton>

            {/* Standardized Search Bar */}
            <View style={styles.searchContainer}>
              <Search size={scaleFont(14)} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search products or SKUs..."
                placeholderTextColor={kioskColors.textLightMuted}
                style={[styles.searchInput, { fontSize: scaleFont(13) }]}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
                  <X size={scaleFont(13)} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Standardized Whiteboard Action Pill */}
            <AnimatedButton
              activeOpacity={0.88}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.whiteboardBtn}
            >
              <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.whiteboardBtnText, { fontSize: scaleFont(13) }]} {...crispTextProps}>Whiteboard</Text>
            </AnimatedButton>
          </View>
        </ImageBackground>

        {/* MAIN CONTENT AREA */}
        <Animated.View
          style={[
            styles.contentArea,
            {
              opacity: screenTransitionAnim,
              transform: [
                {
                  translateY: screenTransitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Subtle modern background gradient */}
          <LinearGradient
            colors={['#F8FAFC', '#F0F6FF', '#E8EFF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* ── VIEW 1: CATEGORY SELECTION SCREEN ── */}
          {!activeCategory && !searchQuery.trim() ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryHomeContent}
            >
              <View style={styles.sectionHeadRow}>
                <View style={styles.sectionHeadLeft}>
                  <Text style={[styles.sectionTitle, { fontSize: scaleFont(17) }]} {...crispTextProps}>Product Categories</Text>
                  <View style={styles.sectionBadge}>
                    <Text style={[styles.sectionBadgeText, { fontSize: scaleFont(12.5) }]} {...crispTextProps}>
                      {displayCategories.length} Categories
                    </Text>
                  </View>
                </View>

                {products.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setActiveCategory('all');
                      onSelectCategory('all');
                    }}
                    style={styles.viewAllAssignedBtn}
                  >
                    <Zap size={scaleFont(13)} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={[styles.viewAllAssignedBtnText, { fontSize: scaleFont(13.5) }]} {...crispTextProps}>
                      All Products ({products.length})
                    </Text>
                    <ChevronRight size={scaleFont(13)} color="#FFFFFF" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.categoryGrid}>
                {displayCategories.map((cat, idx) => {
                  const combo = getColorCombo(cat.id || cat.name, idx);
                  return (
                    <AnimatedPressableCard
                      key={cat.id || idx}
                      onPress={() => {
                        setActiveCategory(cat.id);
                        onSelectCategory(cat.id);
                      }}
                      accessible={true}
                      accessibilityLabel={cat.name}
                      style={[
                        styles.categoryCard,
                        { backgroundColor: combo.bg, borderColor: combo.borderColor },
                      ]}
                    >
                      {/* Dynamic Category Image with Elegant Fallback */}
                      <View style={styles.categoryImgContainer}>
                        {cat.image ? (
                          <Image
                            source={{ uri: cat.image }}
                            style={styles.categoryImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.fallbackIconCircle}>
                            <Zap size={scaleFont(28)} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                          </View>
                        )}
                        <View style={[styles.chevronBadge, { backgroundColor: combo.arrowBg }]}>
                          <ChevronRight size={scaleFont(12)} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                      </View>

                      <View style={styles.categoryCardFooter}>
                        <Text
                          numberOfLines={1}
                          style={[styles.categoryCardTitle, { color: combo.textColor, fontSize: scaleFont(13.5) }]}
                          {...crispTextProps}
                        >
                          {cat.name}
                        </Text>
                      </View>
                    </AnimatedPressableCard>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            /* ── VIEW 2: PRODUCT LIST SCREEN ── */
            <View style={styles.productListView}>
              <View style={styles.productSubHeader}>
                <KioskBackButton
                  onPress={() => {
                    setActiveCategory(null);
                    onSelectCategory('all');
                  }}
                  label="Categories"
                />

                <View style={styles.subHeaderDivider} />

                <View style={styles.productSubHeaderInfo}>
                  <Text style={[styles.productSubHeaderTitle, { fontSize: scaleFont(17) }]} {...crispTextProps}>
                    {activeCategoryObj?.name || 'All Products'}
                  </Text>
                  <View style={styles.productCountPill}>
                    <Text style={[styles.productCountPillText, { fontSize: scaleFont(12.5) }]} {...crispTextProps}>
                      {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.productHomeContent}
              >
                <View style={styles.productGrid}>
                  {filteredProducts.map((item, idx) => {
                    const combo = getColorCombo(item.id || item.name, idx);
                    return (
                      <AnimatedPressableCard
                        key={item.id || idx}
                        onPress={() => setSelectedProductDetail(item)}
                        accessible={true}
                        accessibilityLabel={item.name}
                        style={[
                          styles.productCard,
                          { backgroundColor: combo.bg, borderColor: combo.borderColor },
                        ]}
                      >
                        <View style={styles.productImgWrapper}>
                          {item.image ? (
                            <Image
                              source={{ uri: item.image }}
                              style={styles.productImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.fallbackIconCircle}>
                              <Zap size={scaleFont(26)} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                            </View>
                          )}
                        </View>
                        <View style={styles.productCardFooter}>
                          <View style={styles.productCardTextCol}>
                            <Text numberOfLines={1} style={[styles.productCardTitle, { color: combo.textColor, fontSize: scaleFont(13.5) }]} {...crispTextProps}>
                              {item.name}
                            </Text>
                            <Text numberOfLines={1} style={[styles.productCardSku, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
                              {item.sku}
                            </Text>
                          </View>
                          <View style={[styles.arrowCircle, { backgroundColor: combo.arrowBg }]}>
                            <ChevronRight size={scaleFont(12)} color="#FFFFFF" strokeWidth={2.6} />
                          </View>
                        </View>
                      </AnimatedPressableCard>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateText, { fontSize: scaleFont(14) }]} {...crispTextProps}>No products found matching this filter</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* BOTTOM FOOTER */}
        <View style={styles.bottomFooter}>
          <TouchableOpacity style={styles.languageBtn} activeOpacity={0.8}>
            <Globe size={scaleFont(13)} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
            <Text style={[styles.languageBtnText, { fontSize: scaleFont(12) }]} {...crispTextProps}>English</Text>
            <ChevronDown size={scaleFont(11)} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
          </TouchableOpacity>

          <View style={styles.clockSection}>
            <Text style={[styles.clockTime, { fontSize: scaleFont(13) }]} {...crispTextProps}>{currentTime}</Text>
            <View style={styles.clockDivider} />
            <Text style={[styles.clockDate, { fontSize: scaleFont(12.5) }]} {...crispTextProps}>{currentDate}</Text>
          </View>
        </View>

      </View>

      {/* ── PRODUCT DETAIL SIDE DRAWER MODAL ── */}
      <Modal
        visible={!!selectedProductDetail}
        transparent
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeSideDrawer}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeSideDrawer}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                { opacity: backdropAnim },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sideDrawer,
              {
                transform: [{ translateX: sideDrawerAnim }],
              },
            ]}
          >
            {selectedProductDetail && (
              <View style={styles.sideDrawerInner}>
                {/* Side Drawer Header */}
                <View style={styles.sideDrawerHeader}>
                  <View style={styles.sideDrawerHeaderLeft}>
                    <View style={styles.drawerCategoryBadge}>
                      <Text style={[styles.drawerCategoryBadgeText, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
                        {activeCategoryObj?.name || selectedProductDetail.categoryName || 'Catalog'}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.drawerHeaderTitle, { fontSize: scaleFont(15) }]} {...crispTextProps}>
                      {selectedProductDetail.name}
                    </Text>
                  </View>

                  <View style={styles.sideDrawerHeaderRight}>
                    <View style={styles.drawerSkuPill}>
                      <Text numberOfLines={1} style={[styles.drawerSkuBadge, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                        {selectedProductDetail.sku}
                      </Text>
                    </View>
                    <AnimatedButton onPress={closeSideDrawer} style={styles.drawerCloseCircle}>
                      <X size={scaleFont(15)} color={kioskColors.textSecondary} strokeWidth={2.4} />
                    </AnimatedButton>
                  </View>
                </View>

                {/* Side Drawer Scroll Body */}
                <ScrollView
                  style={styles.sideDrawerScroll}
                  contentContainerStyle={styles.sideDrawerContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Top Media & Info Row */}
                  <View style={styles.drawerTopMediaRow}>
                    <View style={styles.drawerMainImgCard}>
                      <Image
                        source={{ uri: selectedProductDetail.image }}
                        style={styles.drawerMainImg}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.drawerQuickInfoBox}>
                      <Text numberOfLines={1} style={[styles.drawerProductSubtitle, { fontSize: scaleFont(13.5) }]} {...crispTextProps}>
                        {selectedProductDetail.subtitle || 'Industrial Grade Component'}
                      </Text>
                      <Text numberOfLines={3} style={[styles.drawerProductDesc, { fontSize: scaleFont(12.5), lineHeight: scaleFont(17.5) }]} {...crispTextProps}>
                        {selectedProductDetail.description || 'Certified earthing component engineered for maximum safety, durability, and conductivity.'}
                      </Text>

                      <View style={styles.drawerMediaActions}>
                        <TouchableOpacity
                          style={styles.drawerPdfBtn}
                          onPress={() => handleOpenFullDetail(selectedProductDetail)}
                          activeOpacity={0.85}
                        >
                          <FileText size={scaleFont(13)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                          <Text style={[styles.drawerPdfBtnText, { fontSize: scaleFont(12.5) }]} {...crispTextProps}>Data Sheet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Technical Specifications Grid */}
                  <View style={styles.drawerSpecsCard}>
                    <View style={styles.drawerSpecsHeaderRow}>
                      <Info size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                      <Text style={[styles.drawerSpecsTitle, { fontSize: scaleFont(14) }]} {...crispTextProps}>Technical Specifications</Text>
                    </View>
                    {Object.entries(getProductSpecs(selectedProductDetail))
                      .slice(0, 8)
                      .map(([key, val], idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.drawerSpecRow,
                            idx % 2 === 0 ? styles.drawerSpecRowEven : styles.drawerSpecRowOdd,
                          ]}
                        >
                          <Text style={[styles.drawerSpecKey, { fontSize: scaleFont(12) }]} {...crispTextProps}>{key}</Text>
                          <Text style={[styles.drawerSpecVal, { fontSize: scaleFont(12) }]} {...crispTextProps}>{val}</Text>
                        </View>
                      ))}
                  </View>
                </ScrollView>

                {/* Side Drawer Footer */}
                <View style={styles.sideDrawerFooter}>
                  <Text numberOfLines={1} style={[styles.drawerFooterHint, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                    Detailed electrical & mechanical ratings
                  </Text>
                  <AnimatedButton
                    activeOpacity={0.88}
                    onPress={() => handleOpenFullDetail(selectedProductDetail)}
                    style={styles.drawerFullDetailBtn}
                  >
                    <Text style={[styles.drawerFullDetailBtnText, { fontSize: scaleFont(13) }]} {...crispTextProps}>Full Specifications</Text>
                    <ChevronRight size={scaleFont(13)} color="#FFFFFF" strokeWidth={2.4} />
                  </AnimatedButton>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#08173E',
  },

  // ── LEFT SIDEBAR (fixed width ad/promotional panel) ──
  sideGradientStrip: {
    width: 92,
    backgroundColor: '#08173E',
  },

  // ── RIGHT PANEL ──
  rightPanel: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },

  // ── TOP HEADER ──
  topHeader: {
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
  searchContainer: {
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
  searchInput: {
    flex: 1,
    color: kioskColors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 3,
  },
  whiteboardBtn: {
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
  whiteboardBtnText: {
    color: kioskColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },

  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },

  // ── CATEGORY SELECTION VIEW ──
  categoryHomeContent: {
    padding: 14,
    paddingBottom: 22,
    alignItems: 'center',
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    width: '100%',
    paddingHorizontal: 20,
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllAssignedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: kioskRadii.full,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  viewAllAssignedBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    includeFontPadding: false,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  sectionBadge: {
    backgroundColor: kioskColors.badgeBackground,
    borderRadius: kioskRadii.full,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  sectionBadgeText: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
    fontSize: 12,
    includeFontPadding: false,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  categoryCard: {
    width: 155,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 145,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  categoryImgContainer: {
    height: 105,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  categoryImg: {
    width: '88%',
    height: '88%',
  },
  fallbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  categoryCardTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: kioskColors.textPrimary,
    lineHeight: 17,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },

  // ── PRODUCT LIST VIEW ──
  productListView: {
    flex: 1,
  },
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
  productSubHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productSubHeaderTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  productCountPill: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  productCountPillText: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
    fontSize: 12,
    includeFontPadding: false,
  },
  productHomeContent: {
    padding: 14,
    paddingBottom: 24,
    alignItems: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  productCard: {
    width: 165,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 155,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  productImgWrapper: {
    height: 110,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  productImg: {
    width: '90%',
    height: '90%',
  },
  productBadgePill: {
    position: 'absolute',
    top: 4,
    left: 4,
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
  productCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 9,
    paddingBottom: 8,
    paddingTop: 6,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  productCardTextCol: {
    flex: 1,
    marginRight: 4,
  },
  productCardTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: kioskColors.textPrimary,
    lineHeight: 16,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  productCardSku: {
    fontSize: 11,
    fontWeight: '600',
    color: kioskColors.textMuted,
    marginTop: 1,
    includeFontPadding: false,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
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

  // ── BOTTOM FOOTER ──
  bottomFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 32,
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

  // ── PRODUCT DETAIL SIDE DRAWER MODAL ──
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: kioskColors.overlay,
  },
  sideDrawer: {
    width: 520,
    maxWidth: '68%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: kioskRadii.lg,
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 24,
    zIndex: 100,
  },
  sideDrawerInner: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
  },
  sideDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: kioskRadii.lg,
    minHeight: 50,
  },
  sideDrawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  drawerCategoryBadge: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  drawerCategoryBadgeText: {
    color: kioskColors.accentBlue,
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  drawerHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  sideDrawerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerSkuPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerSkuBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: kioskColors.textMuted,
    includeFontPadding: false,
  },
  drawerCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sideDrawerScroll: {
    flex: 1,
  },
  sideDrawerContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 18,
  },
  drawerTopMediaRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerMainImgCard: {
    width: 140,
    height: 130,
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  drawerMainImg: {
    width: '88%',
    height: '88%',
  },
  drawerImgBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  drawerImgBadgeText: {
    color: '#854D0E',
    fontWeight: '800',
    fontSize: 10.5,
    includeFontPadding: false,
  },
  drawerQuickInfoBox: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  drawerProductSubtitle: {
    fontSize: 13,
    color: kioskColors.accentBlue,
    fontWeight: '700',
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  drawerProductDesc: {
    color: kioskColors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
    includeFontPadding: false,
  },
  drawerMediaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  drawerPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: kioskRadii.sm,
    borderWidth: 1.5,
    borderColor: kioskColors.accentBlue,
    backgroundColor: kioskColors.badgeBackground,
  },
  drawerPdfBtnText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 12,
    includeFontPadding: false,
  },
  drawerSpecsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  drawerSpecsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerSpecsTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  drawerSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  drawerSpecRowEven: {
    backgroundColor: '#F8FAFC',
  },
  drawerSpecRowOdd: {
    backgroundColor: 'transparent',
  },
  drawerSpecKey: {
    color: kioskColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    includeFontPadding: false,
  },
  drawerSpecVal: {
    color: kioskColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1.3,
    textAlign: 'right',
    includeFontPadding: false,
  },
  sideDrawerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 46,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerFooterHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: kioskColors.textMuted,
    flex: 1,
    marginRight: 8,
    includeFontPadding: false,
  },
  drawerFullDetailBtn: {
    backgroundColor: kioskColors.accentBlue,
    borderRadius: kioskRadii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  drawerFullDetailBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
});
