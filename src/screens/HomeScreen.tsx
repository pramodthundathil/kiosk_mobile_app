import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useKioskResponsive } from '../hooks/useKioskResponsive';
import { PortraitKioskLayout } from '../components/PortraitKioskLayout';
import { LandscapeKioskLayout } from '../components/LandscapeKioskLayout';
import { ProductDetailScreen } from './ProductDetailScreen';
import { CompanyInfoScreen } from './CompanyInfoScreen';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mock/kioskData';
import { KioskProduct, KioskCategory } from '../types/kiosk';
import { fetchCatalogProducts, fetchCatalogCategories, getStoredKioskToken } from '../services/api';

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
  const [products, setProducts] = useState<KioskProduct[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<KioskCategory[]>(MOCK_CATEGORIES);
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

  // Dynamic Data Fetcher from Django Backend
  const loadDynamicCatalog = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [liveProducts, liveCategories] = await Promise.all([
        fetchCatalogProducts(),
        fetchCatalogCategories(),
      ]);

      console.log('[HomeScreen] liveProducts received count:', liveProducts?.length, liveProducts?.map((p: any) => ({ name: p.name, category: p.category, sku: p.sku })));
      console.log('[HomeScreen] liveCategories count:', liveCategories?.length);

      if (liveProducts && liveProducts.length > 0) {
        setProducts(liveProducts);
      } else {
        const token = await getStoredKioskToken();
        if (token) {
          // Kiosk is authenticated: reflect the actual assigned products (even if empty)
          setProducts(liveProducts || []);
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      }

      if (liveCategories && liveCategories.length > 0) {
        const mergedCategories = [
          { id: 'all', name: 'All Products', code: 'ALL', icon: 'grid', color: '#0D60AE' },
          ...liveCategories,
        ];
        setCategories(mergedCategories);
      } else {
        setCategories(MOCK_CATEGORIES);
      }
    } catch (e) {
      console.warn('Backend fetch notice:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadDynamicCatalog();
  }, [loadDynamicCatalog]);

  const handleOpenProductDetail = (product: KioskProduct) => {
    setSelectedProduct(product);
    setActivePage('product-detail');
  };

  const handleBackToCatalog = () => {
    setActivePage('catalog');
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedProduct(null);
  };

  const handleSelectTab = (tab: KioskActiveTab) => {
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
          onSearchChange={setSearchQuery}
          onSelectProduct={(prod) => setSelectedProduct(prod)}
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
          onSearchChange={setSearchQuery}
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
