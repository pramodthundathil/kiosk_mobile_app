import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  TouchableWithoutFeedback,
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

interface PortraitKioskLayoutProps {
  metrics: KioskResponsiveMetrics;
  products: KioskProduct[];
  categories: KioskCategory[];
  selectedCategory: string;
  searchQuery: string;
  activeTab: 'home' | 'products' | 'about';
  onSelectCategory: (catId: string) => void;
  onSearchChange: (query: string) => void;
  onSelectProduct: (product: KioskProduct) => void;
  onSelectTab: (tab: 'home' | 'products' | 'about') => void;
  onLogout?: () => void;
}

export const PortraitKioskLayout: React.FC<PortraitKioskLayoutProps> = ({
  metrics,
  products,
  categories,
  selectedCategory,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onSelectProduct,
}) => {
  const { scaleFont } = metrics;

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

  const renderCategoryIcon = (iconName: string, catName: string, color: string, size = 22) => {
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

  return (
    <View style={styles.rootContainer}>
      {/* Clean White Top Header Banner (No extra writings, taglines, badges) */}
      <View style={styles.topBannerHeader}>
        <Image
          source={require('../../assets/excel logo_blue.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>

      {/* Main Body View */}
      <View style={styles.mainContent}>
        {/* Top Search Input */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search products, categories..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { fontSize: scaleFont(13) }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* View 1: Main Category Selection Screen */}
        {!activeCategory ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(17) }]}>
                Select Product Category
              </Text>
            </View>

            {/* Category Cards Grid */}
            <View style={styles.categoryGrid}>
              {categories
                .filter((c) => c.id !== 'all')
                .map((cat, idx) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.88}
                    onPress={() => {
                      setActiveCategory(cat.id);
                      onSelectCategory(cat.id);
                    }}
                    style={[
                      styles.categoryCard,
                      idx === 0 && styles.categoryCardHighlight,
                    ]}
                  >
                    <View style={styles.categoryCardHeader}>
                      <View style={[styles.categoryIconCircle, idx === 0 && styles.iconCircleHighlight]}>
                        {renderCategoryIcon(cat.icon, cat.name, idx === 0 ? '#FFFFFF' : '#0D60AE', 22)}
                      </View>
                      <ChevronRight size={18} color={idx === 0 ? '#FFFFFF' : '#0D60AE'} />
                    </View>

                    <Text style={[styles.categoryTitle, idx === 0 && styles.titleHighlight, { fontSize: scaleFont(15) }]}>
                      {cat.name}
                    </Text>
                    <Text numberOfLines={2} style={[styles.categorySub, idx === 0 && styles.subHighlight, { fontSize: scaleFont(11) }]}>
                      {cat.description || 'View complete product catalog and specifications'}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        ) : (
          /* View 2: Category Products Screen (Slid in when category is clicked) */
          <View style={styles.categoryProductsView}>
            {/* Category Sub-Header with Back Button */}
            <View style={styles.catSubHeader}>
              <TouchableOpacity onPress={() => setActiveCategory(null)} style={styles.backBtn}>
                <ArrowLeft size={16} color="#0D60AE" />
                <Text style={styles.backBtnText}>Categories</Text>
              </TouchableOpacity>

              <Text style={[styles.catHeaderTitle, { fontSize: scaleFont(15) }]}>
                {activeCategoryObj?.name || 'Products'} ({filteredProducts.length})
              </Text>
            </View>

            {/* Product Grid */}
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              key="portrait-2-col"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 14, gap: 12 }}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setSelectedProductDetail(item)}
                  style={styles.productCard}
                >
                  <View style={styles.productImgWrapper}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.productImg}
                      resizeMode="contain"
                    />
                    {item.badge ? (
                      <View style={styles.prodBadge}>
                        <Text style={styles.prodBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.productCardBody}>
                    <Text numberOfLines={2} style={[styles.productCardTitle, { fontSize: scaleFont(13) }]}>
                      {item.name}
                    </Text>
                    {item.sku ? (
                      <Text style={styles.skuText}>SKU: {item.sku}</Text>
                    ) : null}

                    <View style={styles.viewDetailsRow}>
                      <Text style={styles.viewDetailsText}>View Details</Text>
                      <ChevronRight size={14} color="#0D60AE" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom Sheet Modal Popup for Product Details */}
      <Modal
        visible={!!selectedProductDetail}
        transparent
        animationType="none"
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
              <X size={18} color="#64748B" />
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

              <Text style={[styles.sheetProductTitle, { fontSize: scaleFont(17) }]}>
                {selectedProductDetail.name}
              </Text>
              {selectedProductDetail.sku ? (
                <Text style={styles.sheetSkuText}>SKU: {selectedProductDetail.sku}</Text>
              ) : null}

              <Text style={[styles.sheetProductDesc, { fontSize: scaleFont(12) }]}>
                {selectedProductDetail.description || selectedProductDetail.subtitle}
              </Text>

              {/* Key Specifications Table */}
              <View style={styles.keySpecsContainer}>
                <Text style={styles.keySpecsHeader}>Key Specifications</Text>
                {Object.entries(selectedProductDetail.specifications || {})
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
          )}

          {/* Bottom Action Footer */}
          {selectedProductDetail && (
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  const prod = selectedProductDetail;
                  closeBottomSheet();
                  onSelectProduct(prod);
                }}
                style={styles.fullDetailBtn}
              >
                <FileText size={16} color="#FFFFFF" />
                <Text style={styles.fullDetailBtnText}>View Full Technical Specs</Text>
                <ChevronRight size={16} color="#FEF08A" />
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
  mainContent: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '600',
    marginLeft: 10,
  },
  clearBtn: {
    padding: 6,
  },
  scrollPadding: {
    padding: 16,
  },
  sectionHeaderRow: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  categoryCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 130,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryCardHighlight: {
    backgroundColor: '#0D60AE',
    borderColor: '#0D60AE',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryTitle: {
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  titleHighlight: {
    color: '#FFFFFF',
  },
  categorySub: {
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },
  subHighlight: {
    color: '#E0F2FE',
  },
  categoryProductsView: {
    flex: 1,
  },
  catSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#0D60AE',
    fontWeight: '700',
    fontSize: 12,
  },
  catHeaderTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  productImgWrapper: {
    position: 'relative',
    height: 120,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: {
    width: '85%',
    height: '85%',
  },
  prodBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prodBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  productCardBody: {
    padding: 12,
    gap: 4,
  },
  productCardTitle: {
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  skuText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D60AE',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 12,
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
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    gap: 12,
    paddingBottom: 10,
  },
  sheetMainImgContainer: {
    width: '100%',
    height: 170,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
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
    color: '#0F172A',
  },
  sheetSkuText: {
    fontSize: 11,
    color: '#0D60AE',
    fontWeight: '700',
  },
  sheetProductDesc: {
    color: '#475569',
    lineHeight: 18,
  },
  keySpecsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginTop: 4,
  },
  keySpecsHeader: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 13,
    marginBottom: 4,
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
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  specVal: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  sheetFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fullDetailBtn: {
    backgroundColor: '#0D60AE',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
  },
  fullDetailBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
