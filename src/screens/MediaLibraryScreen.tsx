import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Image as ImageIcon,
  FileText,
  Box,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { kioskColors } from '../theme/kioskTheme';
import { KioskResponsiveMetrics, MediaLibraryAsset, MediaLibraryCategory } from '../types/kiosk';
import { KioskBackButton } from '../components/KioskBackButton';
import { ThreeDModelViewer } from '../components/ThreeDModelViewer';
import { InAppPdfViewer } from '../components/InAppPdfViewer';
import {
  fetchMediaLibraryItems,
  getCachedMediaLibrary,
  saveCachedMediaLibrary,
} from '../services/api';
import { syncService } from '../services/syncService';
import { analyticsService } from '../services/analyticsService';

interface MediaLibraryScreenProps {
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
  onOpenProductDetail?: (productId: string) => void;
}

// Only Images, 3D Images, and Brochures as requested
const DEFAULT_CATEGORIES: MediaLibraryCategory[] = [
  { id: 'IMAGE', name: 'Images', icon: 'image', count: 0 },
  { id: 'THREE_D', name: '3D Images', icon: 'box', count: 0 },
  { id: 'PDF_BROCHURE', name: 'Brochures', icon: 'file-text', count: 0 },
];

const ALLOWED_CATEGORY_IDS = new Set(['IMAGE', 'THREE_D', 'PDF_BROCHURE']);

export const MediaLibraryScreen: React.FC<MediaLibraryScreenProps> = ({
  metrics,
  onBack,
}) => {
  const { width: screenWidth, isLandscape, scaleFont, scaleSpacing, is4K } = metrics;

  // Category Filter state (Defaults to Images)
  const [selectedCategory, setSelectedCategory] = useState<string>('IMAGE');

  // Data & Pagination states
  const [items, setItems] = useState<MediaLibraryAsset[]>([]);
  const [categories, setCategories] = useState<MediaLibraryCategory[]>(DEFAULT_CATEGORIES);
  const [page, setPage] = useState<number>(1);
  const [, setTotalPages] = useState<number>(1);
  const [, setTotalCount] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Viewer / Slideshow states
  const [viewerItem, setViewerItem] = useState<MediaLibraryAsset | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(false);
  const slideshowIntervalMs = 4000;
  const slideshowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Responsive Grid Calculations: Rigid Uniform Card Sizing
  const numColumns = useMemo(() => {
    if (isLandscape) {
      return is4K ? 5 : 4;
    }
    return screenWidth >= 600 ? 3 : 2;
  }, [isLandscape, is4K, screenWidth]);

  const horizontalPadding = scaleSpacing(16);
  const cardGap = scaleSpacing(12);

  // Card width is strictly calculated so cards never stretch or shrink unevenly
  const cardWidth = useMemo(() => {
    const totalGaps = (numColumns - 1) * cardGap;
    const totalPadding = horizontalPadding * 2;
    return Math.floor((screenWidth - totalPadding - totalGaps) / numColumns);
  }, [screenWidth, horizontalPadding, cardGap, numColumns]);

  const thumbnailHeight = useMemo(() => {
    return isLandscape ? Math.round(cardWidth * 0.72) : Math.round(cardWidth * 0.82);
  }, [cardWidth, isLandscape]);

  // Load from local storage initially for instant zero-latency offline UX
  const loadFromLocalStorage = useCallback(async () => {
    try {
      const cached = await getCachedMediaLibrary();
      if (cached && cached.results && cached.results.length > 0) {
        const filteredCached = cached.results.filter(
          (i) => i.asset_type === selectedCategory
        );
        if (filteredCached.length > 0) {
          setItems(filteredCached);
          setTotalCount(filteredCached.length);
          setIsLoadingInitial(false);
        }
        if (cached.categories && cached.categories.length > 0) {
          const merged = DEFAULT_CATEGORIES.map((def) => {
            const match = cached.categories?.find((c) => c.id === def.id);
            return match ? { ...def, count: match.count } : def;
          });
          setCategories(merged);
        }
      }
    } catch (e) {
      console.warn('[MediaLibraryScreen] Local storage read error:', e);
    }
  }, [selectedCategory]);

  // Fetch items from backend API
  const fetchItems = useCallback(
    async (
      targetPage: number = 1,
      targetCat: string = selectedCategory,
      append: boolean = false
    ) => {
      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsLoadingInitial(true);
      }

      try {
        const response = await fetchMediaLibraryItems({
          page: targetPage,
          pageSize: 16,
          assetType: targetCat,
        });

        if (response) {
          setPage(response.page);
          setTotalPages(response.total_pages);
          setTotalCount(response.count);
          setHasNext(response.has_next);

          if (response.categories && response.categories.length > 0) {
            const updated = DEFAULT_CATEGORIES.map((def) => {
              const match = response.categories.find((c) => c.id === def.id);
              return match ? { ...def, count: match.count } : def;
            });
            setCategories(updated);
          }

          if (append) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              const newItems = response.results.filter((i) => !existingIds.has(i.id));
              const combined = [...prev, ...newItems];
              saveCachedMediaLibrary(combined, response.categories);
              return combined;
            });
          } else {
            setItems(response.results);
            saveCachedMediaLibrary(response.results, response.categories);
          }
        }
      } catch (error) {
        console.warn('[MediaLibraryScreen] Backend fetch notice, reading local cache:', error);
        const cached = await getCachedMediaLibrary();
        if (cached && cached.results) {
          const filtered = cached.results.filter((i) => i.asset_type === targetCat);
          setItems(filtered);
          setTotalCount(filtered.length);
        }
      } finally {
        setIsLoadingInitial(false);
        setIsFetchingMore(false);
        setIsRefreshing(false);
      }
    },
    [selectedCategory]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadFromLocalStorage();
      if (mounted) {
        fetchItems(1, selectedCategory, false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadFromLocalStorage, selectedCategory, fetchItems]);

  // Handle Category tab change
  const handleSelectCategory = (catId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedCategory(catId);
    setPage(1);
    fetchItems(1, catId, false);
  };

  // Handle Load More (Infinite Scroll)
  const handleLoadMore = () => {
    if (!isFetchingMore && hasNext && !isLoadingInitial) {
      fetchItems(page + 1, selectedCategory, true);
    }
  };

  // Handle Pull-to-Refresh & Sync
  const handleSyncRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRefreshing(true);
    analyticsService.onUserActivity();
    syncService.performFullContentSync().catch(() => {});
    await fetchItems(1, selectedCategory, false);
    setIsRefreshing(false);
  };

  // Open item in dedicated viewer / slideshow
  const handleOpenViewer = (item: MediaLibraryAsset, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    analyticsService.onUserActivity();
    setViewerItem(item);
    setViewerIndex(index);
    setIsSlideshowPlaying(false);
  };

  // Navigate to previous asset in viewer
  const handleViewerPrev = () => {
    if (items.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    const nextIdx = (viewerIndex - 1 + items.length) % items.length;
    setViewerIndex(nextIdx);
    setViewerItem(items[nextIdx]);
  };

  // Navigate to next asset in viewer
  const handleViewerNext = () => {
    if (items.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    const nextIdx = (viewerIndex + 1) % items.length;
    setViewerIndex(nextIdx);
    setViewerItem(items[nextIdx]);
  };

  // Slideshow auto-advance timer
  useEffect(() => {
    if (isSlideshowPlaying && viewerItem) {
      slideshowTimerRef.current = setInterval(() => {
        handleViewerNext();
      }, slideshowIntervalMs);
    } else {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    }
    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    };
  }, [isSlideshowPlaying, viewerItem, viewerIndex, items, slideshowIntervalMs]);

  // Category Tab Icon Helper
  const renderCategoryIcon = (id: string, active: boolean) => {
    const color = active ? '#FFFFFF' : kioskColors.textSecondary;
    const size = scaleFont(14);
    switch (id) {
      case 'THREE_D':
        return <Box size={size} color={color} strokeWidth={2.2} />;
      case 'PDF_BROCHURE':
        return <FileText size={size} color={color} strokeWidth={2.2} />;
      case 'IMAGE':
      default:
        return <ImageIcon size={size} color={color} strokeWidth={2.2} />;
    }
  };

  // Render individual Media Asset Card in the grid:
  // Strictly uniform size, NO badges or icons on the image, ONLY product name in card details!
  const renderItem = ({ item, index }: { item: MediaLibraryAsset; index: number }) => {
    const thumbUri = item.thumbnail_url || item.file_url;
    const is3D = item.asset_type === 'THREE_D';
    const isPDF = item.asset_type === 'PDF_BROCHURE';

    // Strictly show ONLY the product name attached to that image
    const displayName = item.product_name || item.title;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => handleOpenViewer(item, index)}
        style={[
          styles.card,
          {
            width: cardWidth,
            borderRadius: scaleSpacing(12),
          },
        ]}
      >
        {/* Thumbnail Preview Area (Clean, Minimal, No Badges, No Icons overlaid) */}
        <View style={[styles.thumbnailContainer, { height: thumbnailHeight }]}>
          {thumbUri && (thumbUri.startsWith('http') || thumbUri.startsWith('file://')) ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumbnailImage}
              resizeMode={is3D ? 'contain' : 'cover'}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              {is3D ? (
                <Box size={scaleFont(38)} color="#8B5CF6" strokeWidth={1.8} />
              ) : isPDF ? (
                <FileText size={scaleFont(38)} color="#DC2626" strokeWidth={1.8} />
              ) : (
                <ImageIcon size={scaleFont(38)} color={kioskColors.accentBlue} strokeWidth={1.8} />
              )}
            </View>
          )}
        </View>

        {/* Card Details: ONLY the product name attached to that image */}
        <View style={[styles.cardContent, { paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(9) }]}>
          <Text numberOfLines={2} style={[styles.productNameText, { fontSize: scaleFont(12.5) }]}>
            {displayName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── TOP HEADER BAR ── */}
      <View style={[styles.headerBar, { paddingHorizontal: scaleSpacing(20), paddingVertical: scaleSpacing(12) }]}>
        <View style={styles.headerLeft}>
          <KioskBackButton onPress={onBack} label="Back" />
          <View style={styles.titleWrapper}>
            <Text style={[styles.headerTitle, { fontSize: scaleFont(19) }]}>Media Library</Text>
          </View>
        </View>
      </View>

      {/* ── CATEGORY FILTER TABS (Only Images, 3D Images, Brochures) ── */}
      <View style={[styles.categoriesBar, { paddingHorizontal: scaleSpacing(20), paddingVertical: scaleSpacing(10) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {categories
            .filter((cat) => ALLOWED_CATEGORY_IDS.has(cat.id))
            .map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.85}
                  onPress={() => handleSelectCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                    {
                      height: scaleSpacing(38),
                      paddingHorizontal: scaleSpacing(16),
                      borderRadius: scaleSpacing(20),
                    },
                  ]}
                >
                  {renderCategoryIcon(cat.id, isActive)}
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                      { fontSize: scaleFont(13) },
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {cat.count > 0 && (
                    <View
                      style={[
                        styles.categoryCountBadge,
                        isActive && styles.categoryCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryCountText,
                          isActive && styles.categoryCountTextActive,
                          { fontSize: scaleFont(11) },
                        ]}
                      >
                        {cat.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>

      {/* ── MAIN GRID VIEW (Strictly Uniform Cards, Infinite Scrolling) ── */}
      {isLoadingInitial ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={kioskColors.accentBlue} />
          <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
            Loading media assets...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ImageIcon size={scaleFont(46)} color={kioskColors.textLightMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { fontSize: scaleFont(16) }]}>No Media Items Found</Text>
          <Text style={[styles.emptySubtitle, { fontSize: scaleFont(12.5) }]}>
            No media items available in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          key={`library-${numColumns}-${cardWidth}`}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: cardGap } : undefined}
          contentContainerStyle={[
            styles.listContainer,
            {
              paddingHorizontal: horizontalPadding,
              paddingVertical: scaleSpacing(14),
              gap: cardGap,
            },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleSyncRefresh}
              colors={[kioskColors.accentBlue]}
            />
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={kioskColors.accentBlue} />
                <Text style={[styles.footerLoaderText, { fontSize: scaleFont(12) }]}>
                  Loading more assets...
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ── PREMIUM FULLSCREEN MEDIA VIEWER & SLIDESHOW ── */}
      {viewerItem && (
        <Modal
          visible={!!viewerItem}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setViewerItem(null)}
        >
          <StatusBar barStyle="light-content" backgroundColor="#060911" />
          <SafeAreaView style={styles.viewerModalContainer}>
            {/* Top Bar Navigation */}
            <View style={styles.viewerHeaderBar}>
              <View style={styles.viewerHeaderLeft}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setViewerItem(null)}
                  style={styles.viewerCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={scaleFont(18)} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>

                <View style={styles.viewerTitleInfo}>
                  <Text numberOfLines={1} style={[styles.viewerMainTitle, { fontSize: scaleFont(15) }]}>
                    {viewerItem.product_name || viewerItem.title}
                  </Text>
                  {viewerItem.product_name && viewerItem.title !== viewerItem.product_name ? (
                    <Text numberOfLines={1} style={[styles.viewerSubTitle, { fontSize: scaleFont(11.5) }]}>
                      {viewerItem.title}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.viewerHeaderRight}>
                {/* Slideshow Play / Pause Pill */}
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setIsSlideshowPlaying((prev) => !prev);
                  }}
                  style={[
                    styles.slideshowPill,
                    isSlideshowPlaying && styles.slideshowPillActive,
                  ]}
                >
                  {isSlideshowPlaying ? (
                    <Pause size={scaleFont(13)} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Play size={scaleFont(13)} color="#CBD5E1" strokeWidth={2.5} />
                  )}
                  <Text
                    style={[
                      styles.slideshowPillText,
                      isSlideshowPlaying && styles.slideshowPillTextActive,
                      { fontSize: scaleFont(11.5) },
                    ]}
                  >
                    {isSlideshowPlaying ? 'Playing (4s)' : 'Slideshow'}
                  </Text>
                </TouchableOpacity>

                {/* Counter Badge */}
                <View style={styles.viewerCounterBadge}>
                  <Text style={[styles.viewerCounterText, { fontSize: scaleFont(11.5) }]}>
                    {viewerIndex + 1} / {items.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Main Interactive Stage */}
            <View style={styles.viewerContentCanvas}>
              {viewerItem.asset_type === 'THREE_D' ? (
                /* High-End Interactive 3D Model Canvas */
                <View style={styles.threeDContainer}>
                  <ThreeDModelViewer
                    modelUrl={viewerItem.file_url}
                    posterUrl={viewerItem.thumbnail_url}
                    title={viewerItem.product_name || viewerItem.title}
                    autoRotate={true}
                    scaleFont={scaleFont}
                  />
                </View>
              ) : viewerItem.asset_type === 'PDF_BROCHURE' ? (
                /* High-End PDF Brochure Reader */
                <View style={styles.pdfContainer}>
                  <InAppPdfViewer
                    pdfUrl={viewerItem.file_url}
                    title={viewerItem.product_name || viewerItem.title}
                    subtitle="Official Brochure"
                    scaleFont={scaleFont}
                    scaleSpacing={scaleSpacing}
                  />
                </View>
              ) : (
                /* High-Definition Responsive Image Slide */
                <View style={styles.imageSlideContainer}>
                  <Image
                    source={{ uri: viewerItem.file_url || viewerItem.thumbnail_url }}
                    style={styles.imageSlide}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Prev Navigation Floating Glass Arrow */}
              {items.length > 1 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleViewerPrev}
                  style={[styles.navArrowBtn, styles.navArrowLeft]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <ChevronLeft size={scaleFont(24)} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              )}

              {/* Next Navigation Floating Glass Arrow */}
              {items.length > 1 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleViewerNext}
                  style={[styles.navArrowBtn, styles.navArrowRight]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <ChevronRight size={scaleFont(24)} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Filmstrip Carousel */}
            {items.length > 1 && (
              <View style={styles.viewerBottomFilmstrip}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filmstripScrollContent}
                >
                  {items.map((it, idx) => {
                    const isCur = idx === viewerIndex;
                    const thumb = it.thumbnail_url || it.file_url;
                    return (
                      <TouchableOpacity
                        key={it.id}
                        activeOpacity={0.82}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setViewerIndex(idx);
                          setViewerItem(it);
                        }}
                        style={[
                          styles.filmstripItem,
                          isCur && styles.filmstripItemActive,
                        ]}
                      >
                        {thumb && (thumb.startsWith('http') || thumb.startsWith('file://')) ? (
                          <Image
                            source={{ uri: thumb }}
                            style={[styles.filmstripThumb, !isCur && styles.filmstripThumbDim]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.filmstripFallback}>
                            {it.asset_type === 'THREE_D' ? (
                              <Box size={14} color="#A78BFA" />
                            ) : it.asset_type === 'PDF_BROCHURE' ? (
                              <FileText size={14} color="#F87171" />
                            ) : (
                              <ImageIcon size={14} color="#93C5FD" />
                            )}
                          </View>
                        )}
                        {isCur && <View style={styles.filmstripActiveDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  categoriesBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: kioskColors.accentBlue,
    borderColor: kioskColors.accentBlue,
  },
  categoryChipText: {
    fontWeight: '600',
    color: kioskColors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  categoryCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  categoryCountText: {
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  categoryCountTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flexGrow: 1,
  },
  // Rigid Uniform Card styling
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  thumbnailContainer: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  productNameText: {
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    color: kioskColors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  emptySubtitle: {
    color: kioskColors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  footerLoaderText: {
    color: kioskColors.textMuted,
    fontWeight: '600',
  },

  // ── High-End Slideshow & Media Viewer Styles ──
  viewerModalContainer: {
    flex: 1,
    backgroundColor: '#060911',
  },
  viewerHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1120',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 20,
  },
  viewerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  viewerCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewerTitleInfo: {
    flex: 1,
  },
  viewerMainTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  viewerSubTitle: {
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  viewerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slideshowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  slideshowPillActive: {
    backgroundColor: kioskColors.accentBlue,
    borderColor: '#60A5FA',
  },
  slideshowPillText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  slideshowPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewerCounterBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewerCounterText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  viewerContentCanvas: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04070F',
  },
  imageSlideContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  imageSlide: {
    width: '94%',
    height: '94%',
  },
  threeDContainer: {
    width: '100%',
    height: '100%',
  },
  pdfContainer: {
    width: '100%',
    height: '100%',
  },
  navArrowBtn: {
    position: 'absolute',
    top: '47%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  navArrowLeft: {
    left: 14,
  },
  navArrowRight: {
    right: 14,
  },
  viewerBottomFilmstrip: {
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 10,
  },
  filmstripScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filmstripItem: {
    width: 62,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  filmstripItemActive: {
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  filmstripThumb: {
    width: '100%',
    height: '100%',
  },
  filmstripThumbDim: {
    opacity: 0.5,
  },
  filmstripFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  filmstripActiveDot: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
});
