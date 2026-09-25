import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useKioskResponsive } from '../hooks/useKioskResponsive';
import { PortraitKioskLayout } from '../components/PortraitKioskLayout';
import { LandscapeKioskLayout } from '../components/LandscapeKioskLayout';
import { ProductDetailScreen } from './ProductDetailScreen';
import { CompanyInfoScreen } from './CompanyInfoScreen';
import { KioskProduct, KioskCategory } from '../types/kiosk';
import {
  fetchCatalogProducts,
  fetchCatalogCategories,
  getCachedCatalogProducts,
  getCachedCatalogCategories,
} from '../services/api';
import { analyticsService } from '../services/analyticsService';
import { syncService } from '../services/syncService';

import { MOCK_CATEGORIES } from '../mock/kioskData';

const DEFAULT_CATEGORY: KioskCategory = {
  id: 'all',
  name: 'All Products',
  code: 'ALL',
  icon: 'grid',
  color: '#0D60AE',
};

type KioskActivePage = 'catalog' | 'product-detail' | 'company-info';
type KioskActiveTab = 'home' | 'products' | 'about';

interface HomeScreenProps {
  onLogout?: () => void;
  isScreensaverActive?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, isScreensaverActive }) => {
  const responsiveMetrics = useKioskResponsive();
  const { isLandscape } = responsiveMetrics;

  const [activePage, setActivePage] = useState<KioskActivePage>('catalog');
  const [activeTab, setActiveTab] = useState<KioskActiveTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<KioskProduct[]>([]);
  const [categories, setCategories] = useState<KioskCategory[]>(
    MOCK_CATEGORIES && MOCK_CATEGORIES.length > 0 ? MOCK_CATEGORIES : [DEFAULT_CATEGORY]
  );
  const [selectedProduct, setSelectedProduct] = useState<KioskProduct | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Automatically dismiss modal/product and reset to catalog when screensaver activates
  useEffect(() => {
    if (isScreensaverActive) {
      setSelectedProduct(null);
      if (activePage !== 'catalog') {
        setActivePage('catalog');
      }
    }
  }, [isScreensaverActive, activePage]);

  // Immediate Offline Cache Hydration: Loads latest cached catalog instantly on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([getCachedCatalogProducts(), getCachedCatalogCategories()])
      .then(([cachedProds, cachedCats]) => {
        if (isMounted) {
          if (cachedProds && cachedProds.length > 0) {
            setProducts(cachedProds);
          }
          if (cachedCats && cachedCats.length > 0) {
            setCategories([DEFAULT_CATEGORY, ...cachedCats]);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Data Fetcher from Django Backend
  const loadDynamicCatalog = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [liveProducts, liveCategories] = await Promise.all([
        fetchCatalogProducts(),
        fetchCatalogCategories(),
      ]);

      if (liveProducts && liveProducts.length > 0) {
        setProducts(liveProducts);
      } else {
        // If live products array was empty or failed, ensure cached products are preserved
        const cached = await getCachedCatalogProducts();
        if (cached && cached.length > 0) {
          setProducts(cached);
        }
      }

      if (liveCategories && liveCategories.length > 0) {
        setCategories([DEFAULT_CATEGORY, ...liveCategories]);
      } else {
        const cachedCats = await getCachedCatalogCategories();
        if (cachedCats && cachedCats.length > 0) {
          setCategories([DEFAULT_CATEGORY, ...cachedCats]);
        }
      }
    } catch (e) {
      console.warn('Backend fetch notice:', e);
      const cached = await getCachedCatalogProducts();
      if (cached && cached.length > 0) {
        setProducts(cached);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadDynamicCatalog();
  }, [loadDynamicCatalog]);

  // Dynamically re-render assigned products and categories when background synchronization completes
  useEffect(() => {
    const unsubscribe = syncService.onContentSynced((targetVersion, stats) => {
      console.log(`[HomeScreen] Synchronization completed (v${targetVersion}). Reloading catalog products...`);
      loadDynamicCatalog();
    });
    return unsubscribe;
  }, [loadDynamicCatalog]);

  const handleOpenProductDetail = (product: KioskProduct) => {
    analyticsService.trackProductClick(product, 'VIEW_DETAIL');
    setSelectedProduct(product);
    setActivePage('product-detail');
  };

  const handleSelectProduct = (product: KioskProduct | null) => {
    if (product) {
      analyticsService.trackProductClick(product, 'CLICK');
    }
    setSelectedProduct(product);
  };

  const handleBackToCatalog = () => {
    setActivePage('catalog');
  };

  const handleSelectCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId || c.code === catId);
    analyticsService.trackCategoryClick(cat ? cat.name : catId);
    setSelectedCategory(catId);
    setSelectedProduct(null);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      analyticsService.trackSearch(query);
    }
  };

  const handleSelectTab = (tab: KioskActiveTab) => {
    analyticsService.onUserActivity();
    setActiveTab(tab);
    if (tab === 'about') {
      setActivePage('company-info');
    } else {
      setActivePage('catalog');
      setSelectedProduct(null);
    }
  };

  // Dedicated Full-Page View: Product Detail
  if (activePage === 'product-detail' && selectedProduct) {
    return (
      <ProductDetailScreen
        product={selectedProduct}
        metrics={responsiveMetrics}
        onBack={handleBackToCatalog}
      />
    );
  }

  // Dedicated Full-Page View: Corporate Overview
  if (activePage === 'company-info') {
    return (
      <CompanyInfoScreen
        metrics={responsiveMetrics}
        onBack={handleBackToCatalog}
      />
    );
  }

  return (
    <View style={styles.rootContainer}>
      {/* Responsive Orientation Renderer matching User's Mockups */}
      {isLandscape ? (
        <LandscapeKioskLayout
          metrics={responsiveMetrics}
          products={products}
          categories={categories}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          selectedProduct={selectedProduct}
          isScreensaverActive={isScreensaverActive}
          onSelectCategory={handleSelectCategory}
          onSearchChange={handleSearchChange}
          onSelectProduct={handleSelectProduct}
          onOpenFullDetail={handleOpenProductDetail}
        />
      ) : (
        <PortraitKioskLayout
          metrics={responsiveMetrics}
          products={products}
          categories={categories}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          activeTab={activeTab}
          isScreensaverActive={isScreensaverActive}
          onSelectCategory={handleSelectCategory}
          onSearchChange={handleSearchChange}
          onSelectProduct={handleOpenProductDetail}
          onSelectTab={handleSelectTab}
          onLogout={onLogout}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
