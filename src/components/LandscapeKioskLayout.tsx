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
    const targetCat = activeCategory || selectedCategory;
    const matchesCat =
      !targetCat ||
      targetCat === 'all' ||
      p.category === targetCat ||
      p.categoryName?.toLowerCase().includes(targetCat.toLowerCase());

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
              <Search size={14} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search products or SKUs..."
                placeholderTextColor={kioskColors.textLightMuted}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
                  <X size={13} color={kioskColors.textMuted} strokeWidth={kioskIcons.strokeWidth} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Standardized Whiteboard Action Pill */}
            <AnimatedButton
              activeOpacity={0.88}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.whiteboardBtn}
            >
              <Edit3 size={14} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={styles.whiteboardBtnText}>Whiteboard</Text>
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
          {!activeCategory ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryHomeContent}
            >
              <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Product Categories</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {displayCategories.length} Categories
                  </Text>
                </View>
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
                            <Zap size={28} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                          </View>
                        )}
                        <View style={[styles.chevronBadge, { backgroundColor: combo.arrowBg }]}>
                          <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.6} />
                        </View>
                      </View>

                      <View style={styles.categoryCardFooter}>
                        <Text
                          numberOfLines={1}
                          style={[styles.categoryCardTitle, { color: combo.textColor }]}
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
                  <Text style={styles.productSubHeaderTitle}>
                    {activeCategoryObj?.name || 'All Products'}
                  </Text>
                  <View style={styles.productCountPill}>
                    <Text style={styles.productCountPillText}>
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
                              <Zap size={26} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                            </View>
                          )}
                          {item.badge ? (
                            <View style={styles.productBadgePill}>
                              <Text style={styles.productBadgeText}>{item.badge}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.productCardFooter}>
                          <View style={styles.productCardTextCol}>
                            <Text numberOfLines={1} style={[styles.productCardTitle, { color: combo.textColor }]}>
                              {item.name}
                            </Text>
                            <Text numberOfLines={1} style={styles.productCardSku}>
                              {item.sku}
                            </Text>
                          </View>
                          <View style={[styles.arrowCircle, { backgroundColor: combo.arrowBg }]}>
                            <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.6} />
                          </View>
                        </View>
                      </AnimatedPressableCard>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No products found matching this filter</Text>
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
            <Globe size={13} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
            <Text style={styles.languageBtnText}>English</Text>
            <ChevronDown size={11} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
          </TouchableOpacity>

          <View style={styles.clockSection}>
            <Text style={styles.clockTime}>{currentTime}</Text>
            <View style={styles.clockDivider} />
            <Text style={styles.clockDate}>{currentDate}</Text>
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
                      <Text style={styles.drawerCategoryBadgeText}>
                        {activeCategoryObj?.name || selectedProductDetail.categoryName || 'Catalog'}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.drawerHeaderTitle}>
                      {selectedProductDetail.name}
                    </Text>
                  </View>

                  <View style={styles.sideDrawerHeaderRight}>
                    <View style={styles.drawerSkuPill}>
                      <Text numberOfLines={1} style={styles.drawerSkuBadge}>
                        {selectedProductDetail.sku}
                      </Text>
                    </View>
                    <AnimatedButton onPress={closeSideDrawer} style={styles.drawerCloseCircle}>
                      <X size={15} color={kioskColors.textSecondary} strokeWidth={2.4} />
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
                      {selectedProductDetail.badge ? (
                        <View style={styles.drawerImgBadge}>
                          <Text style={styles.drawerImgBadgeText}>
                            {selectedProductDetail.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.drawerQuickInfoBox}>
                      <Text numberOfLines={1} style={styles.drawerProductSubtitle}>
                        {selectedProductDetail.subtitle || 'Industrial Grade Component'}
                      </Text>
                      <Text numberOfLines={3} style={styles.drawerProductDesc}>
                        {selectedProductDetail.description || 'Certified earthing component engineered for maximum safety, durability, and conductivity.'}
                      </Text>

                      <View style={styles.drawerMediaActions}>
                        <TouchableOpacity
                          style={styles.drawerPdfBtn}
                          onPress={() => handleOpenFullDetail(selectedProductDetail)}
                          activeOpacity={0.85}
                        >
                          <FileText size={13} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                          <Text style={styles.drawerPdfBtnText}>Data Sheet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Technical Specifications Grid */}
                  <View style={styles.drawerSpecsCard}>
                    <View style={styles.drawerSpecsHeaderRow}>
                      <Info size={14} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                      <Text style={styles.drawerSpecsTitle}>Technical Specifications</Text>
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
                          <Text style={styles.drawerSpecKey}>{key}</Text>
                          <Text style={styles.drawerSpecVal}>{val}</Text>
                        </View>
                      ))}
                  </View>
                </ScrollView>

                {/* Side Drawer Footer */}
                <View style={styles.sideDrawerFooter}>
                  <Text numberOfLines={1} style={styles.drawerFooterHint}>
                    Detailed electrical & mechanical ratings
                  </Text>
                  <AnimatedButton
                    activeOpacity={0.88}
                    onPress={() => handleOpenFullDetail(selectedProductDetail)}
                    style={styles.drawerFullDetailBtn}
                  >
                    <Text style={styles.drawerFullDetailBtnText}>Full Specifications</Text>
                    <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
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
    fontSize: 11.5,
    marginLeft: 6,
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
    fontSize: 11.5,
    fontWeight: '700',
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
    justifyContent: 'center',
    marginBottom: 14,
    gap: 10,
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 13.5,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: kioskColors.badgeBackground,
    borderRadius: kioskRadii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  sectionBadgeText: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
    fontSize: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  categoryCard: {
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
  },
  categoryImgContainer: {
    width: '100%',
    height: 112,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  categoryImg: {
    width: '90%',
    height: '90%',
  },
  fallbackIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
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
  categoryCardFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  categoryCardTitle: {
    fontWeight: '700',
    fontSize: 11,
    color: kioskColors.textPrimary,
    lineHeight: 15,
    letterSpacing: -0.2,
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
    fontSize: 13.5,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
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
    fontSize: 10,
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
    fontSize: 8,
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
    fontSize: 10.5,
    color: kioskColors.textPrimary,
    lineHeight: 14,
    letterSpacing: -0.2,
  },
  productCardSku: {
    fontSize: 9,
    fontWeight: '600',
    color: kioskColors.textMuted,
    marginTop: 1,
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
    fontSize: 12,
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
    height: 28,
  },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: kioskRadii.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  languageBtnText: {
    color: kioskColors.textSecondary,
    fontWeight: '600',
    fontSize: 9.5,
  },
  clockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockTime: {
    fontWeight: '700',
    fontSize: 11,
    color: kioskColors.textPrimary,
  },
  clockDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
  },
  clockDate: {
    fontWeight: '600',
    fontSize: 11,
    color: kioskColors.textMuted,
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
    width: 490,
    maxWidth: '66%',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: kioskRadii.lg,
    minHeight: 46,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  drawerCategoryBadgeText: {
    color: kioskColors.accentBlue,
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  drawerHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  sideDrawerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerSkuPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerSkuBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: kioskColors.textMuted,
  },
  drawerCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    padding: 12,
    gap: 10,
    paddingBottom: 16,
  },
  drawerTopMediaRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerMainImgCard: {
    width: 130,
    height: 120,
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
    fontSize: 8.5,
  },
  drawerQuickInfoBox: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  drawerProductSubtitle: {
    fontSize: 11,
    color: kioskColors.accentBlue,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  drawerProductDesc: {
    color: kioskColors.textSecondary,
    fontSize: 10.5,
    lineHeight: 14.5,
    marginTop: 3,
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
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: kioskRadii.sm,
    borderWidth: 1.5,
    borderColor: kioskColors.accentBlue,
    backgroundColor: kioskColors.badgeBackground,
  },
  drawerPdfBtnText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 10,
  },
  drawerSpecsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
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
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerSpecsTitle: {
    fontWeight: '800',
    fontSize: 11.5,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  drawerSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 7,
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
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  drawerSpecVal: {
    color: kioskColors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    flex: 1.3,
    textAlign: 'right',
  },
  sideDrawerFooter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerFooterHint: {
    fontSize: 9.5,
    fontWeight: '600',
    color: kioskColors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  drawerFullDetailBtn: {
    backgroundColor: kioskColors.accentBlue,
    borderRadius: kioskRadii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  drawerFullDetailBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
});
