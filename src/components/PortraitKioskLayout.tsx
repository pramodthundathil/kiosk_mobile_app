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
} from 'lucide-react-native';
import { KioskProduct, KioskCategory, KioskResponsiveMetrics } from '../types/kiosk';
import { WhiteboardModal } from './WhiteboardModal';
import { KioskBackButton } from './KioskBackButton';
import {
  KIOSK_COLOR_COMBOS,
  getColorCombo,
  getRandomColorCombo,
} from '../constants/colorCombos';
import { kioskColors, kioskIcons, kioskRadii, kioskShadows } from '../theme/kioskTheme';

// ── Interactive Spring Card Component ──
const AnimatedCard: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  activeOpacity?: number;
}> = ({ onPress, style, children, activeOpacity = 0.88 }) => {
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
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardTouchInner}
      >
        {children}
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
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active sub-view in Portrait mode: null for Category Selection, catId for Category Products List
  const [activeCategory, setActiveCategory] = useState<string | null>(
    selectedCategory === 'all' ? null : selectedCategory
  );

  // Selected product for Bottom Sheet Popup
  const [selectedProductDetail, setSelectedProductDetail] = useState<KioskProduct | null>(null);

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
        style={styles.expandedHeaderBg}
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
              <Search size={14} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={styles.headerPillBtnText}>Search</Text>
            </TouchableOpacity>

            {/* Standardized Whiteboard Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.headerPillBtn}
            >
              <Edit3 size={14} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={styles.headerPillBtnText}>Whiteboard</Text>
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
      {!activeCategory ? (
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
          <View style={styles.cardGrid}>
            {displayCategories.map((cat, idx) => {
              const combo = getColorCombo(cat.id || cat.name, idx);

              return (
                <AnimatedCard
                  key={cat.id || idx}
                  onPress={() => {
                    setActiveCategory(cat.id);
                    onSelectCategory(cat.id);
                  }}
                  style={[
                    styles.kioskCard,
                    { backgroundColor: combo.bg, borderColor: combo.borderColor },
                  ]}
                >
                  {/* Dynamic Category Image */}
                  <View style={styles.cardImgContainer}>
                    {cat.image ? (
                      <Image
                        source={{ uri: cat.image }}
                        style={styles.cardImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.fallbackIconCircle}>
                        <Zap size={28} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                      </View>
                    )}
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooterRow}>
                    <Text numberOfLines={1} style={styles.cardTitleText}>
                      {cat.name}
                    </Text>
                    <View style={[styles.arrowCircleBtn, { backgroundColor: combo.arrowBg }]}>
                      <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.6} />
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
              <Text numberOfLines={1} style={styles.catHeaderTitle}>
                {activeCategoryObj?.name || 'Products'}
              </Text>
              <View style={styles.productCountPill}>
                <Text style={styles.productCountPillText}>{filteredProducts.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.headerPillBtnCompact}
            >
              <Edit3 size={13} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={styles.headerPillBtnCompactText}>Whiteboard</Text>
            </TouchableOpacity>
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
                      { backgroundColor: combo.bg, borderColor: combo.borderColor },
                    ]}
                  >
                    {/* Dynamic Product Image */}
                    <View style={styles.cardImgContainer}>
                      {prod.image ? (
                        <Image
                          source={{ uri: prod.image }}
                          style={styles.cardImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.fallbackIconCircle}>
                          <Zap size={26} color={combo.arrowBg} strokeWidth={kioskIcons.strokeWidth} />
                        </View>
                      )}
                      {prod.badge ? (
                        <View style={styles.productBadgePill}>
                          <Text style={styles.productBadgeText}>{prod.badge}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.cardFooterTextCol}>
                        <Text numberOfLines={1} style={styles.cardTitleText}>
                          {prod.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.productSkuText}>
                          {prod.sku}
                        </Text>
                      </View>
                      <View style={[styles.arrowCircleBtn, { backgroundColor: combo.arrowBg }]}>
                        <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.6} />
                      </View>
                    </View>
                  </AnimatedCard>
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

      {/* ── FIXED POSITION BOTTOM AD IMAGE ── */}
      <View style={styles.fixedBottomAdWrapper}>
        <Image
          source={require('../../assets/portrait_nature_footer.png')}
          style={styles.fixedBottomAdImg}
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

              <Text style={styles.sheetProductTitle}>
                {selectedProductDetail.name}
              </Text>
              <Text style={styles.sheetProductDesc}>
                {selectedProductDetail.description || selectedProductDetail.subtitle || 'Industrial Grade Component'}
              </Text>

              {/* Technical Specifications Table */}
              <View style={styles.keySpecsContainer}>
                <View style={styles.keySpecsHeaderRow}>
                  <Info size={14} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                  <Text style={styles.keySpecsHeader}>Technical Specifications</Text>
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
                      <Text style={styles.specKey}>{key}</Text>
                      <Text style={styles.specVal}>{val}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          )}

          {/* Bottom Action Footer */}
          {selectedProductDetail && (
            <View style={styles.sheetFooter}>
              <Text numberOfLines={1} style={styles.sheetFooterHint}>
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
                <Text style={styles.fullDetailBtnText}>Full Specifications</Text>
                <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingTop: 26,
    paddingBottom: 16,
  },
  officialWhiteLogoImg: {
    width: 165,
    height: 46,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  headerPillBtnText: {
    color: kioskColors.textPrimary,
    fontSize: 11.5,
    fontWeight: '700',
  },

  // ── Search Bar ──
  searchBarWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    color: kioskColors.textPrimary,
    fontWeight: '600',
    fontSize: 11.5,
    marginLeft: 6,
  },
  clearBtn: {
    padding: 4,
  },

  // ── Card Grid ──
  cardGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  kioskCard: {
    width: '46%',
    minWidth: 150,
    maxWidth: 240,
    alignSelf: 'center',
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTouchInner: {
    height: 140,
    justifyContent: 'space-between',
  },
  cardImgContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  cardImg: {
    width: '90%',
    height: '90%',
  },
  fallbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardTitleText: {
    flex: 1,
    fontWeight: '700',
    fontSize: 11,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    marginRight: 4,
  },
  cardFooterTextCol: {
    flex: 1,
    marginRight: 4,
  },
  productSkuText: {
    fontSize: 9,
    fontWeight: '600',
    color: kioskColors.textMuted,
    marginTop: 1,
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
    fontSize: 13,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
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
    fontSize: 10,
    fontWeight: '800',
    color: kioskColors.accentBlue,
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
    fontSize: 10.5,
    fontWeight: '700',
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
    fontSize: 8,
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

  // ── Fixed Bottom Ad Banner ──
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
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: kioskRadii.xl,
    borderTopRightRadius: kioskRadii.xl,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  closeBtnCircle: {
    position: 'absolute',
    right: 0,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    gap: 10,
    paddingBottom: 10,
  },
  sheetMainImgContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetMainImg: {
    width: '85%',
    height: '85%',
  },
  sheetProductTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: kioskColors.textPrimary,
  },
  sheetProductDesc: {
    color: kioskColors.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
  },
  keySpecsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginTop: 2,
  },
  keySpecsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  keySpecsHeader: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
    fontSize: 11.5,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  specRowEven: {
    backgroundColor: '#FFFFFF',
  },
  specRowOdd: {
    backgroundColor: 'transparent',
  },
  specKey: {
    color: kioskColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  specVal: {
    color: kioskColors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  sheetFooter: {
    paddingTop: 8,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetFooterHint: {
    fontSize: 9.5,
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
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  fullDetailBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10.5,
  },
});
