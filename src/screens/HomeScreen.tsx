import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useKioskResponsive } from '../hooks/useKioskResponsive';
import { PortraitKioskLayout } from '../components/PortraitKioskLayout';
import { LandscapeKioskLayout } from '../components/LandscapeKioskLayout';
import { ProductDetailScreen } from './ProductDetailScreen';
import { CompanyInfoScreen } from './CompanyInfoScreen';
import { MediaViewerScreen } from './MediaViewerScreen';
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

type KioskActivePage = 'catalog' | 'product-detail' | 'company-info' | 'media-viewer';
type KioskActiveTab = 'home' | 'products' | 'about';

interface HomeScreenProps {
  onLogout?: () => void;
  isScreensaverActive?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, isScreensaverActive }) => {
  const responsiveMetrics = useKioskResponsive();
  const { isLandscape } = responsiveMetrics;

  const [activePage, setActivePage] = useState<KioskActivePage>('catalog');
  const [previousPage, setPreviousPage] = useState<'catalog' | 'product-detail'>('catalog');
  const [activeTab, setActiveTab] = useState<KioskActiveTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<KioskProduct[]>([]);
  const [categories, setCategories] = useState<KioskCategory[]>(
    MOCK_CATEGORIES && MOCK_CATEGORIES.length > 0 ? MOCK_CATEGORIES : [DEFAULT_CATEGORY]
  );
  const [selectedProduct, setSelectedProduct] = useState<KioskProduct | null>(null);
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState<string | null>(null);
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

  // Load content directly from Local Storage for instant, zero-latency kiosk performance
  const loadFromLocalStorage = useCallback(async () => {
    try {
      const [cachedProds, cachedCats] = await Promise.all([
        getCachedCatalogProducts(),
        getCachedCatalogCategories(),
      ]);

      if (cachedProds && cachedProds.length > 0) {
        setProducts(cachedProds);
      }
      if (cachedCats && cachedCats.length > 0) {
        setCategories([DEFAULT_CATEGORY, ...cachedCats]);
      }
    } catch (e) {
      console.warn('[HomeScreen] Local storage load notice:', e);
    }
  }, []);

  // 1. Instant loading from Local Storage when kiosk pops up
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // 2. Refresh from Local Storage whenever background synchronization completes (at startup or 3-hour interval)
  useEffect(() => {
    const unsubscribe = syncService.onContentSynced((targetVersion) => {
      console.log(`[HomeScreen] Content synced (v${targetVersion}). Reloading from local storage...`);
      loadFromLocalStorage();
    });
    return unsubscribe;
  }, [loadFromLocalStorage]);

  const handleOpenProductDetail = (product: KioskProduct) => {
    analyticsService.trackProductClick(product, 'VIEW_DETAIL');
    setSelectedProduct(product);
    setActivePage('product-detail');
  };

  const handleOpenMediaViewer = (product: KioskProduct, initialAssetId?: string) => {
    analyticsService.trackProductClick(product, 'MEDIA_VIEW', { asset_id: initialAssetId });
    setSelectedProduct(product);
    setSelectedMediaAssetId(initialAssetId || null);
    setPreviousPage(activePage === 'product-detail' ? 'product-detail' : 'catalog');
    setActivePage('media-viewer');
  };

  const handleBackFromMediaViewer = () => {
    if (previousPage === 'product-detail' && selectedProduct) {
      setActivePage('product-detail');
    } else {
      setActivePage('catalog');
    }
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

  // Dedicated Full-Page View: Fullscreen Interactive Media & 3D Viewer
  if (activePage === 'media-viewer' && selectedProduct) {
    return (
      <MediaViewerScreen
        product={selectedProduct}
        initialAssetId={selectedMediaAssetId}
        metrics={responsiveMetrics}
        onBack={handleBackFromMediaViewer}
      />
    );
  }

  // Dedicated Full-Page View: Product Detail
  if (activePage === 'product-detail' && selectedProduct) {
    return (
      <ProductDetailScreen
        product={selectedProduct}
        metrics={responsiveMetrics}
        onBack={handleBackToCatalog}
        onOpenMediaViewer={handleOpenMediaViewer}
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
          onOpenMediaViewer={handleOpenMediaViewer}
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
          onOpenMediaViewer={handleOpenMediaViewer}
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
