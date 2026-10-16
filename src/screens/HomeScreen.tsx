import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useKioskResponsive } from '../hooks/useKioskResponsive';
import { PortraitKioskLayout } from '../components/PortraitKioskLayout';
import { LandscapeKioskLayout } from '../components/LandscapeKioskLayout';
import { ProductDetailScreen } from './ProductDetailScreen';
import { CompanyInfoScreen } from './CompanyInfoScreen';
import { MediaViewerScreen } from './MediaViewerScreen';
import { MediaLibraryScreen } from './MediaLibraryScreen';
import { KioskProduct, KioskCategory } from '../types/kiosk';
import {
  fetchCatalogProducts,
  fetchCatalogCategories,
  getCachedCatalogProducts,
  getCachedCatalogCategories,
} from '../services/api';
import { analyticsService } from '../services/analyticsService';
import { syncService } from '../services/syncService';

const DEFAULT_CATEGORY: KioskCategory = {
  id: 'all',
  name: 'All Products',
  code: 'ALL',
  icon: 'grid',
  color: '#0D60AE',
};

type KioskActivePage = 'catalog' | 'product-detail' | 'company-info' | 'media-viewer' | 'media-library';
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
  const [categories, setCategories] = useState<KioskCategory[]>([DEFAULT_CATEGORY]);
  const [selectedProduct, setSelectedProduct] = useState<KioskProduct | null>(null);
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300,000 ms (5 minutes)
  const fiveMinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if user is currently on the main category list screen
  const isMainCategoryScreen =
    activePage === 'catalog' &&
    selectedCategory === 'all' &&
    selectedProduct === null &&
    searchQuery.trim() === '' &&
    activeTab === 'home';

  // Handler to reset all navigation state back to main category list screen
  const handleResetToMainCategoryScreen = useCallback(() => {
    console.log('[HomeScreen] 5 minutes of inactivity detected while off main screen. Redirecting to main category list screen...');
    setActivePage('catalog');
    setSelectedCategory('all');
    setSelectedProduct(null);
    setSelectedMediaAssetId(null);
    setSearchQuery('');
    setActiveTab('home');
  }, []);

  // Reset 5-minute inactivity timer
  const resetFiveMinTimer = useCallback(() => {
    if (fiveMinTimerRef.current) {
      clearTimeout(fiveMinTimerRef.current);
      fiveMinTimerRef.current = null;
    }

    if (!isMainCategoryScreen) {
      fiveMinTimerRef.current = setTimeout(() => {
        handleResetToMainCategoryScreen();
      }, FIVE_MINUTES_MS);
    }
  }, [isMainCategoryScreen, handleResetToMainCategoryScreen]);

  // Automatically dismiss modal/product and reset to catalog when screensaver activates
  useEffect(() => {
    if (isScreensaverActive) {
      setSelectedProduct(null);
      setSelectedMediaAssetId(null);
      if (activePage !== 'catalog') {
        setActivePage('catalog');
      }
    }
  }, [isScreensaverActive, activePage]);

  // Restart 5-minute inactivity timer whenever user navigates or state changes
  useEffect(() => {
    resetFiveMinTimer();
    return () => {
      if (fiveMinTimerRef.current) {
        clearTimeout(fiveMinTimerRef.current);
        fiveMinTimerRef.current = null;
      }
    };
  }, [resetFiveMinTimer, activePage, selectedCategory, selectedProduct, searchQuery, activeTab, isScreensaverActive]);

  // Load content directly from Local Storage for instant, zero-latency kiosk performance
  const loadFromLocalStorage = useCallback(async () => {
    try {
      const [cachedProds, cachedCats] = await Promise.all([
        getCachedCatalogProducts(),
        getCachedCatalogCategories(),
      ]);

      if (cachedProds) {
        setProducts(cachedProds.filter((p) => !p.parentId));
      }
      if (cachedCats) {
        setCategories(cachedCats.length > 0 ? [DEFAULT_CATEGORY, ...cachedCats] : [DEFAULT_CATEGORY]);
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

  const handleOpenLibrary = () => {
    analyticsService.onUserActivity();
    setActivePage('media-library');
  };

  // Dedicated Full-Page View: Media Library (Pictures, Brochures, 3D Assets, Videos)
  if (activePage === 'media-library') {
    return (
      <MediaLibraryScreen
        metrics={responsiveMetrics}
        onBack={handleBackToCatalog}
        onOpenProductDetail={(productId) => {
          const prod = products.find((p) => p.id === productId);
          if (prod) {
            handleOpenProductDetail(prod);
          }
        }}
      />
    );
  }

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
        allProducts={products}
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
          onOpenLibrary={handleOpenLibrary}
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
          onOpenLibrary={handleOpenLibrary}
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
