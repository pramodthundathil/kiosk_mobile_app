import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import {
  Search,
  ChevronRight,
  Shield,
  Zap,
  Layers,
  Grid,
  X,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Wrench,
  FlaskConical,
  Activity,
} from 'lucide-react-native';
import { KioskProduct, KioskCategory, KioskResponsiveMetrics } from '../types/kiosk';

interface LandscapeKioskLayoutProps {
  metrics: KioskResponsiveMetrics;
  products: KioskProduct[];
  categories: KioskCategory[];
  selectedCategory: string;
  searchQuery: string;
  selectedProduct: KioskProduct | null;
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
  onSelectCategory,
  onSearchChange,
  onSelectProduct,
  onOpenFullDetail,
}) => {
  const { scaleFont } = metrics;

  // Animated values for smooth detail panel pop-up transition
  const slideAnim = useRef(new Animated.Value(350)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedProduct) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(350);
      fadeAnim.setValue(0);
    }
  }, [selectedProduct]);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'all' ||
      p.category === selectedCategory ||
      p.categoryName?.toLowerCase().includes(selectedCategory.toLowerCase());

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query));

    return matchesCat && matchesSearch;
  });

  const activeProduct = selectedProduct;
  const currentCategoryObj = categories.find((c) => c.id === selectedCategory);
  const categoryTitle = currentCategoryObj ? currentCategoryObj.name : 'All Products';

  const renderSidebarIcon = (iconName: string, catName: string, color: string, size = 20) => {
    const nameLower = (catName || iconName || '').toLowerCase();
    if (nameLower.includes('all')) return <Grid size={size} color={color} />;
    if (nameLower.includes('electrode') || nameLower.includes('rod')) return <Zap size={size} color={color} />;
    if (nameLower.includes('accessor')) return <Wrench size={size} color={color} />;
    if (nameLower.includes('chemical')) return <FlaskConical size={size} color={color} />;
    if (nameLower.includes('lightning') || nameLower.includes('protect')) return <Zap size={size} color={color} />;
    if (nameLower.includes('test') || nameLower.includes('monitor')) return <Activity size={size} color={color} />;
    if (nameLower.includes('solution') || nameLower.includes('earth')) return <ShieldCheck size={size} color={color} />;
    return <Grid size={size} color={color} />;
  };

  const handleCategoryPress = (catId: string) => {
    onSelectCategory(catId);
    onSelectProduct(null);
  };

  // Fixed 3 columns so product cards NEVER resize or shrink when panel opens/closes
  const numColumns = 3;

  return (
    <View style={styles.rootContainer}>
      {/* Clean White Board Top Banner Header */}
      <View style={styles.topBannerHeader}>
        <Image
          source={require('../../assets/excel logo_blue.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>

      {/* Main Kiosk Layout Body */}
      <View style={styles.mainLayoutBody}>
        {/* Column 1: Left Navigation Rail Sidebar */}
        <View style={styles.leftSidebarRail}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.82}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={[
                    styles.sidebarPill,
                    isActive ? styles.sidebarPillActive : styles.sidebarPillInactive,
                  ]}
                >
                  {renderSidebarIcon(
                    cat.icon,
                    cat.name,
                    isActive ? '#FFFFFF' : '#93C5FD',
                    20
                  )}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sidebarPillText,
                      { color: isActive ? '#FFFFFF' : '#F1F5F9' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Column 2: Center Product Grid */}
        <View style={styles.centerGridPanel}>
          {/* Top Search & Filter Bar */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchInputContainer}>
              <Search size={18} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search products, categories..."
                placeholderTextColor="#94A3B8"
                style={[styles.searchInput, { fontSize: scaleFont(13) }]}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearSearchBtn}>
                  <X size={14} color="#64748B" />
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.categoryCountBadge}>
              <Text style={styles.categoryCountText}>
                {categoryTitle} ({filteredProducts.length})
              </Text>
            </View>
          </View>

          {/* Product Grid - Fixed 3 columns so card dimensions stay constant */}
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key="grid-fixed-3-col"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingBottom: 20 }}
            columnWrapperStyle={{ gap: 14, justifyContent: 'flex-start' }}
            renderItem={({ item }) => {
              const isSelected = activeProduct?.id === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => onSelectProduct(item)}
                  style={[
                    styles.gridCard,
                    isSelected && styles.gridCardSelected,
                  ]}
                >
                  <View style={styles.gridCardImgWrapper}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.gridCardImg}
                      resizeMode="contain"
                    />
                    {item.badge ? (
                      <View style={styles.cardBadgeContainer}>
                        <Text style={styles.cardBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.gridCardBody}>
                    <Text numberOfLines={2} style={styles.gridCardTitle}>
                      {item.name}
                    </Text>
                    {item.sku ? (
                      <Text numberOfLines={1} style={styles.gridCardSku}>
                        SKU: {item.sku}
                      </Text>
                    ) : item.subtitle ? (
                      <Text numberOfLines={1} style={styles.gridCardSubtitle}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.gridCardFooter, isSelected && styles.gridCardFooterSelected]}>
                    <Text style={[styles.gridCardFooterText, isSelected && styles.gridCardFooterTextSelected]}>
                      View Details
                    </Text>
                    <ChevronRight size={14} color={isSelected ? '#FFFFFF' : '#0D60AE'} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Column 3: Animated Pop-Up Product Details Panel with Sticky Always-Visible Footer Button */}
        {activeProduct && (
          <Animated.View
            style={[
              styles.rightDetailPanel,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header with Compact Back Button */}
            <View style={styles.detailHeaderRow}>
              <TouchableOpacity onPress={() => onSelectProduct(null)} style={styles.compactBackBtn}>
                <ArrowLeft size={12} color="#475569" />
                <Text style={styles.compactBackBtnText}>Back to Catalog</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onSelectProduct(null)} style={styles.closeBtnCircle}>
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Specs Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              <View style={styles.mainImgContainer}>
                <Image
                  source={{ uri: activeProduct.image }}
                  style={styles.mainDetailImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.thumbGalleryRow}>
                <View style={[styles.thumbBox, styles.thumbBoxActive]}>
                  <Image source={{ uri: activeProduct.image }} style={styles.thumbImg} resizeMode="contain" />
                </View>
                <View style={styles.thumbBox}>
                  <Image source={{ uri: activeProduct.image }} style={styles.thumbImg} resizeMode="contain" />
                </View>
                <View style={styles.pdfButtonBox}>
                  <FileText size={14} color="#0D60AE" />
                  <Text style={styles.pdfText}>PDF Brochure</Text>
                </View>
              </View>

              <Text style={[styles.detailProductTitle, { fontSize: scaleFont(15) }]}>
                {activeProduct.name}
              </Text>
              <Text style={[styles.detailProductDesc, { fontSize: scaleFont(11.5) }]}>
                {activeProduct.description || activeProduct.subtitle}
              </Text>

              <View style={styles.keySpecsContainer}>
                <Text style={styles.keySpecsHeader}>Key Specifications</Text>
                {Object.entries(activeProduct.specifications || {})
                  .slice(0, 6)
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

            {/* Fixed Sticky Always-Visible Bottom Action Button */}
            <View style={styles.stickyFooterContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onOpenFullDetail(activeProduct)}
                style={styles.stickyViewDetailsBtn}
              >
                <FileText size={14} color="#FFFFFF" />
                <Text style={styles.stickyViewDetailsText}>View Full Technical Details</Text>
                <ChevronRight size={14} color="#FEF08A" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBannerHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 54,
  },
  logoImg: {
    width: 140,
    height: 38,
  },
  mainLayoutBody: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSidebarRail: {
    width: 240,
    backgroundColor: '#08173E',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sidebarScroll: {
    gap: 10,
  },
  sidebarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sidebarPillActive: {
    backgroundColor: '#0D60AE',
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sidebarPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sidebarPillText: {
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  centerGridPanel: {
    flex: 1,
    padding: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '600',
    marginLeft: 8,
  },
  clearSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  categoryCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryCountText: {
    color: '#0D60AE',
    fontWeight: '800',
    fontSize: 12,
  },
  gridCard: {
    width: 220,
    maxWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 185,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  gridCardSelected: {
    borderColor: '#0D60AE',
    backgroundColor: '#F0F7FF',
  },
  gridCardImgWrapper: {
    width: '100%',
    height: 105,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridCardImg: {
    width: '88%',
    height: '88%',
  },
  cardBadgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 9,
  },
  gridCardBody: {
    marginTop: 8,
    gap: 2,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
  },
  gridCardSku: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  gridCardSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  gridCardFooterSelected: {
    backgroundColor: '#0D60AE',
  },
  gridCardFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D60AE',
  },
  gridCardFooterTextSelected: {
    color: '#FFFFFF',
  },
  rightDetailPanel: {
    width: 350,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
  detailScroll: {
    gap: 12,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactBackBtnText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImgContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainDetailImg: {
    width: '90%',
    height: '90%',
  },
  thumbGalleryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  thumbBoxActive: {
    borderColor: '#0D60AE',
    borderWidth: 2,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  pdfButtonBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D60AE',
    backgroundColor: '#EFF6FF',
  },
  pdfText: {
    color: '#0D60AE',
    fontWeight: '800',
    fontSize: 12,
  },
  detailProductTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  detailProductDesc: {
    color: '#475569',
    lineHeight: 17,
  },
  keySpecsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  keySpecsHeader: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 12,
    marginBottom: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  specRowEven: {
    backgroundColor: '#FFFFFF',
  },
  specRowOdd: {
    backgroundColor: 'transparent',
  },
  specKey: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  specVal: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  stickyFooterContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  stickyViewDetailsBtn: {
    backgroundColor: '#0D60AE',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
  },
  stickyViewDetailsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
});
