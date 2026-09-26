import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import {
  ArrowLeft,
  Box,
  Image as ImageIcon,
  Video,
  FileText,
  Maximize2,
  Sparkles,
  QrCode,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { kioskColors, kioskRadii, kioskShadows, crispLettering } from '../theme/kioskTheme';
import { KioskProduct, KioskResponsiveMetrics, ProductMediaAsset } from '../types/kiosk';
import { ThreeDModelViewer } from '../components/ThreeDModelViewer';
import { InAppPdfViewer } from '../components/InAppPdfViewer';
import { analyticsService } from '../services/analyticsService';

export interface UnifiedMediaItem {
  id: string;
  title: string;
  type: 'THREE_D' | 'VIDEO' | 'PDF' | 'IMAGE';
  typeLabel: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
}

interface MediaViewerScreenProps {
  product: KioskProduct;
  initialAssetId?: string | null;
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
}

// Dedicated Kiosk Video Player with touch controls
const KioskDedicatedVideoPlayer: React.FC<{
  url: string;
  title?: string;
  scaleFont: (s: number) => number;
}> = ({ url, title, scaleFont }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const togglePlay = () => {
    if (player) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (player) {
      player.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restartVideo = () => {
    if (player) {
      player.currentTime = 0;
      player.play();
      setIsPlaying(true);
    }
  };

  return (
    <View style={styles.videoPlayerRoot}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={true}
        contentFit="contain"
      />

      {/* Floating Kiosk Video Action Bar */}
      <View style={styles.videoControlsOverlay}>
        <TouchableOpacity
          style={styles.videoControlBtn}
          onPress={togglePlay}
          activeOpacity={0.8}
        >
          {isPlaying ? (
            <Pause size={scaleFont(16)} color="#FFFFFF" strokeWidth={2.4} />
          ) : (
            <Play size={scaleFont(16)} color="#FFFFFF" strokeWidth={2.4} />
          )}
          <Text style={[styles.videoControlText, { fontSize: scaleFont(12) }]}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.videoControlBtn}
          onPress={restartVideo}
          activeOpacity={0.8}
        >
          <RotateCcw size={scaleFont(15)} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={[styles.videoControlText, { fontSize: scaleFont(12) }]}>
            Replay
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.videoControlBtn}
          onPress={toggleMute}
          activeOpacity={0.8}
        >
          {isMuted ? (
            <VolumeX size={scaleFont(16)} color="#EF4444" strokeWidth={2.4} />
          ) : (
            <Volume2 size={scaleFont(16)} color="#10B981" strokeWidth={2.4} />
          )}
          <Text style={[styles.videoControlText, { fontSize: scaleFont(12) }]}>
            {isMuted ? 'Unmute' : 'Audio On'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Animated Thumbnail Icon Card with tactile spring feedback
const MediaThumbnailCard: React.FC<{
  item: UnifiedMediaItem;
  isActive: boolean;
  isLandscape?: boolean;
  onSelect: () => void;
  scaleFont: (s: number) => number;
}> = ({ item, isActive, isLandscape = false, onSelect, scaleFont }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.05 : 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.05 : 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    }).start();
  }, [isActive]);

  const renderBadgeIcon = () => {
    const iconSize = isLandscape ? scaleFont(11) : scaleFont(13);
    switch (item.type) {
      case 'THREE_D':
        return <Box size={iconSize} color="#38BDF8" strokeWidth={2.4} />;
      case 'VIDEO':
        return <Video size={iconSize} color="#F43F5E" strokeWidth={2.4} />;
      case 'PDF':
        return <FileText size={iconSize} color="#10B981" strokeWidth={2.4} />;
      default:
        return <ImageIcon size={iconSize} color="#60A5FA" strokeWidth={2.4} />;
    }
  };

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.thumbnailTouchWrapper, isLandscape && styles.thumbnailTouchWrapperLandscape]}
    >
      <Animated.View
        style={[
          styles.thumbnailCard,
          isLandscape && styles.thumbnailCardLandscape,
          isActive && styles.thumbnailCardActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Thumbnail Preview Area */}
        <View style={[styles.thumbnailPreviewBox, isLandscape && styles.thumbnailPreviewBoxLandscape]}>
          {item.type === 'IMAGE' && item.url ? (
            <Image source={{ uri: item.url }} style={styles.thumbnailImage} resizeMode="cover" />
          ) : item.type === 'THREE_D' ? (
            <View style={styles.thumbnail3DPlaceholder}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} resizeMode="cover" />
              ) : null}
              <View style={styles.thumbnail3DOverlay}>
                <Box size={isLandscape ? scaleFont(15) : scaleFont(18)} color="#38BDF8" strokeWidth={2.5} />
              </View>
            </View>
          ) : item.type === 'VIDEO' ? (
            <View style={styles.thumbnailVideoPlaceholder}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} resizeMode="cover" />
              ) : null}
              <View style={styles.thumbnailVideoOverlay}>
                <Play size={isLandscape ? scaleFont(15) : scaleFont(18)} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
              </View>
            </View>
          ) : (
            // PDF Document Icon Card
            <View style={styles.thumbnailPdfPlaceholder}>
              <FileText size={isLandscape ? scaleFont(17) : scaleFont(22)} color="#10B981" strokeWidth={2.2} />
            </View>
          )}

          {/* Type Badge Overlay */}
          <View
            style={[
              styles.thumbnailTypeBadge,
              isLandscape && styles.thumbnailTypeBadgeLandscape,
              item.type === 'THREE_D' && styles.badgeBg3D,
              item.type === 'VIDEO' && styles.badgeBgVideo,
              item.type === 'PDF' && styles.badgeBgPdf,
              item.type === 'IMAGE' && styles.badgeBgPhoto,
            ]}
          >
            {renderBadgeIcon()}
            <Text style={[styles.thumbnailBadgeText, { fontSize: isLandscape ? scaleFont(8) : scaleFont(9.5) }]}>
              {item.typeLabel}
            </Text>
          </View>
        </View>

        {/* 1-Line Title Label */}
        <Text
          numberOfLines={1}
          style={[
            styles.thumbnailTitle,
            isLandscape && styles.thumbnailTitleLandscape,
            isActive && styles.thumbnailTitleActive,
            { fontSize: isLandscape ? scaleFont(9.5) : scaleFont(10.5) },
          ]}
        >
          {item.title}
        </Text>

        {/* Active Pill Indicator */}
        {isActive && (
          <View style={[styles.activePillIndicator, isLandscape && styles.activePillIndicatorLandscape]} />
        )}
      </Animated.View>
    </Pressable>
  );
};

export const MediaViewerScreen: React.FC<MediaViewerScreenProps> = ({
  product,
  initialAssetId,
  metrics,
  onBack,
}) => {
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;
  const scrollViewRef = useRef<ScrollView>(null);

  // Crossfade and micro-scale animations for media transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Build unified, exhaustive media items list
  const mediaList = useMemo<UnifiedMediaItem[]>(() => {
    const items: UnifiedMediaItem[] = [];
    const assets = product.mediaAssets || [];

    // 1. 3D Model Asset (Prioritize if available)
    const threeD = assets.find((a) => a.asset_type === 'THREE_D');
    if (threeD && threeD.file_url) {
      items.push({
        id: threeD.id,
        title: threeD.title || '3D Interactive Model',
        type: 'THREE_D',
        typeLabel: '3D Model',
        url: threeD.file_url,
        thumbnailUrl: product.image,
        description: threeD.description || 'Full 360-degree interactive 3D engineering model',
      });
    }

    // 2. Primary Product Photo
    if (product.image) {
      items.push({
        id: 'main-photo',
        title: 'Product Overview',
        type: 'IMAGE',
        typeLabel: 'Photo',
        url: product.image,
        thumbnailUrl: product.image,
        description: product.name,
      });
    }

    // 3. Additional Gallery Images
    assets
      .filter((a) => a.asset_type === 'IMAGE' && a.file_url && a.file_url !== product.image)
      .forEach((a, idx) => {
        items.push({
          id: a.id,
          title: a.title || `Photo Angle ${idx + 2}`,
          type: 'IMAGE',
          typeLabel: 'Photo',
          url: a.file_url!,
          thumbnailUrl: a.file_url,
          description: a.description,
        });
      });

    // 4. Video Assets
    assets
      .filter((a) => a.asset_type === 'VIDEO' && a.file_url)
      .forEach((a, idx) => {
        items.push({
          id: a.id,
          title: a.title || `Video Demo ${idx + 1}`,
          type: 'VIDEO',
          typeLabel: 'Video',
          url: a.file_url!,
          thumbnailUrl: product.image,
          description: a.description || 'Industrial equipment demonstration video',
        });
      });

    // 5. PDF Brochures & Tech Sheets
    assets
      .filter((a) => (a.asset_type === 'PDF_BROCHURE' || a.asset_type === 'TECH_SHEET') && a.file_url)
      .forEach((a) => {
        items.push({
          id: a.id,
          title: a.title || (a.asset_type === 'PDF_BROCHURE' ? 'Official Brochure' : 'Technical Sheet'),
          type: 'PDF',
          typeLabel: 'PDF Doc',
          url: a.file_url!,
          description: a.description || 'Certified engineering datasheet and test specifications',
        });
      });

    // 6. Direct brochure / techSheet URLs if not already in mediaAssets
    if (product.brochureUrl && !items.some((i) => i.url === product.brochureUrl)) {
      items.push({
        id: 'brochure-doc',
        title: 'Product Brochure',
        type: 'PDF',
        typeLabel: 'Brochure',
        url: product.brochureUrl,
        description: 'Comprehensive product catalog brochure',
      });
    }

    if (product.techSheetUrl && !items.some((i) => i.url === product.techSheetUrl)) {
      items.push({
        id: 'techsheet-doc',
        title: 'Technical Data Sheet',
        type: 'PDF',
        typeLabel: 'Datasheet',
        url: product.techSheetUrl,
        description: 'Engineering specifications and compliance ratings',
      });
    }

    return items;
  }, [product]);

  // Determine initial selected media item
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialAssetId && mediaList.some((m) => m.id === initialAssetId)) {
      return initialAssetId;
    }
    // Default to first item or 3D
    return mediaList[0]?.id || 'main-photo';
  });

  const activeItem = useMemo(
    () => mediaList.find((m) => m.id === selectedId) || mediaList[0],
    [mediaList, selectedId]
  );

  // Trigger smooth crossfade and micro-scale whenever active item switches
  const handleSelectMedia = (item: UnifiedMediaItem) => {
    if (item.id === selectedId) return;

    analyticsService.trackProductClick(product, 'MEDIA_VIEW', {
      media_id: item.id,
      media_type: item.type,
      media_title: item.title,
    });

    // Micro cross-fade transition
    fadeAnim.setValue(0.2);
    scaleAnim.setValue(0.97);

    setSelectedId(item.id);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 26,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const activeIndex = mediaList.findIndex((m) => m.id === selectedId);

  const handleNext = () => {
    if (activeIndex < mediaList.length - 1) {
      handleSelectMedia(mediaList[activeIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      handleSelectMedia(mediaList[activeIndex - 1]);
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, isLandscape && styles.headerBarLandscape]}>
        <View style={styles.headerLeftCluster}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.85}
          >
            <ArrowLeft size={scaleFont(18)} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={[styles.backButtonText, { fontSize: scaleFont(13.5) }]}>
              Back to Product
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerPipe} />

          <View style={styles.headerProductInfo}>
            <View style={styles.headerPillsRow}>
              <View style={styles.categoryPill}>
                <Text style={[styles.categoryPillText, { fontSize: scaleFont(10.5) }]}>
                  {product.categoryName || 'Technical Catalog'}
                </Text>
              </View>
              <View style={styles.skuPill}>
                <Text style={[styles.skuPillText, { fontSize: scaleFont(10.5) }]}>
                  SKU: {product.sku}
                </Text>
              </View>
            </View>

            <Text numberOfLines={1} style={[styles.productHeaderTitle, { fontSize: scaleFont(14.5) }]}>
              {product.name}
            </Text>
          </View>
        </View>

        {/* Right Status Badge */}
        <View style={styles.headerRightCluster}>
          {activeItem?.type === 'THREE_D' && (
            <View style={styles.live3DBadge}>
              <View style={styles.livePulseDot} />
              <Box size={scaleFont(14)} color="#38BDF8" strokeWidth={2.4} />
              <Text style={[styles.liveBadgeText, { fontSize: scaleFont(11.5) }]}>
                Interactive 3D Stage
              </Text>
            </View>
          )}

          {activeItem?.type === 'PDF' && (
            <View style={styles.livePdfBadge}>
              <FileText size={scaleFont(14)} color="#10B981" strokeWidth={2.4} />
              <Text style={[styles.livePdfBadgeText, { fontSize: scaleFont(11.5) }]}>
                Verified Engineering PDF
              </Text>
            </View>
          )}

          {activeItem?.type === 'VIDEO' && (
            <View style={styles.liveVideoBadge}>
              <Video size={scaleFont(14)} color="#F43F5E" strokeWidth={2.4} />
              <Text style={[styles.liveVideoBadgeText, { fontSize: scaleFont(11.5) }]}>
                Video Demonstration
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Center Stage with Crossfade Animation */}
      <View style={styles.mainStageWrapper}>
        <Animated.View
          style={[
            styles.stageAnimatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {activeItem?.type === 'THREE_D' ? (
            <ThreeDModelViewer
              modelUrl={activeItem.url}
              posterUrl={product.image}
              title={activeItem.title}
              autoRotate={true}
              showControls={true}
              isFullscreen={true}
              scaleFont={scaleFont}
            />
          ) : activeItem?.type === 'VIDEO' ? (
            <KioskDedicatedVideoPlayer
              url={activeItem.url}
              title={activeItem.title}
              scaleFont={scaleFont}
            />
          ) : activeItem?.type === 'PDF' ? (
            <InAppPdfViewer
              pdfUrl={activeItem.url}
              title={activeItem.title}
              subtitle={product.name}
              scaleFont={scaleFont}
              scaleSpacing={scaleSpacing}
            />
          ) : (
            // Image Viewer
            <View style={styles.imageViewerStage}>
              <Image
                source={{ uri: activeItem?.url || product.image }}
                style={styles.fullResolutionImage}
                resizeMode="contain"
              />
              <View style={styles.imageCaptionBar}>
                <Text style={[styles.imageCaptionTitle, { fontSize: scaleFont(13) }]}>
                  {activeItem?.title || product.name}
                </Text>
                <Text style={[styles.imageCaptionSub, { fontSize: scaleFont(11) }]}>
                  High-resolution technical engineering photography
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Previous / Next Arrow Quick Buttons for rapid kiosk browsing */}
        {mediaList.length > 1 && (
          <>
            {activeIndex > 0 && (
              <TouchableOpacity
                style={[styles.stageNavBtn, styles.stageNavBtnLeft]}
                onPress={handlePrev}
                activeOpacity={0.8}
              >
                <ChevronLeft size={scaleFont(22)} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
            )}

            {activeIndex < mediaList.length - 1 && (
              <TouchableOpacity
                style={[styles.stageNavBtn, styles.stageNavBtnRight]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <ChevronRight size={scaleFont(22)} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Bottom Media Icon Strip / Gallery Carousel (Themed to Excel Earthing) */}
      <View style={[styles.thumbnailStripContainer, isLandscape && styles.thumbnailStripContainerLandscape]}>
        <View style={[styles.stripHeaderRow, isLandscape && styles.stripHeaderRowLandscape]}>
          <View style={styles.stripTitleRow}>
            <Sparkles size={isLandscape ? scaleFont(12) : scaleFont(14)} color="#FFC107" strokeWidth={2.4} />
            <Text style={[styles.stripTitle, { fontSize: isLandscape ? scaleFont(11) : scaleFont(12.5) }]}>
              All Product Media Assets ({mediaList.length})
            </Text>
          </View>
          <Text style={[styles.stripCounterText, { fontSize: isLandscape ? scaleFont(10.5) : scaleFont(11.5) }]}>
            Item {activeIndex + 1} of {mediaList.length}
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailScrollContent}
        >
          {mediaList.map((item) => (
            <MediaThumbnailCard
              key={item.id}
              item={item}
              isActive={item.id === selectedId}
              isLandscape={isLandscape}
              onSelect={() => handleSelectMedia(item)}
              scaleFont={scaleFont}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#070A11',
    display: 'flex',
    flexDirection: 'column',
  },
  headerBar: {
    height: 64,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 20,
  },
  headerLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: kioskRadii.md,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  dividerPipe: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 14,
  },
  headerProductInfo: {
    flex: 1,
  },
  headerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(13, 96, 174, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: 'rgba(13, 96, 174, 0.45)',
  },
  categoryPillText: {
    color: '#38BDF8',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  skuPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: kioskRadii.xs,
  },
  skuPillText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  productHeaderTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
    marginTop: 2,
  },
  headerRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  live3DBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  liveBadgeText: {
    color: '#38BDF8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  livePdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  livePdfBadgeText: {
    color: '#10B981',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  liveVideoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  liveVideoBadgeText: {
    color: '#F43F5E',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mainStageWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070A11',
    position: 'relative',
    overflow: 'hidden',
  },
  stageAnimatedContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageViewerStage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 16,
  },
  fullResolutionImage: {
    width: '100%',
    height: '88%',
  },
  imageCaptionBar: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    ...kioskShadows.card,
  },
  imageCaptionTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  imageCaptionSub: {
    color: '#94A3B8',
    marginTop: 2,
  },
  videoPlayerRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoControlsOverlay: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...kioskShadows.modal,
  },
  videoControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: kioskRadii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoControlText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stageNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    ...kioskShadows.modal,
  },
  stageNavBtnLeft: {
    left: 20,
  },
  stageNavBtnRight: {
    right: 20,
  },
  thumbnailStripContainer: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  stripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stripCounterText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  thumbnailScrollContent: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 4,
  },
  thumbnailTouchWrapper: {
    minWidth: 110,
    maxWidth: 130,
  },
  thumbnailCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: kioskRadii.lg,
    padding: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    position: 'relative',
    ...kioskShadows.subtle,
  },
  thumbnailCardActive: {
    borderColor: '#0D60AE',
    backgroundColor: '#1E2B58',
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  thumbnailPreviewBox: {
    width: '100%',
    height: 70,
    borderRadius: kioskRadii.md,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnail3DPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1329',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail3DOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailVideoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPdfPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: kioskRadii.xs,
  },
  badgeBg3D: {
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
  },
  badgeBgVideo: {
    backgroundColor: 'rgba(244, 63, 94, 0.85)',
  },
  badgeBgPdf: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
  },
  badgeBgPhoto: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  thumbnailBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  thumbnailTitle: {
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  thumbnailTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activePillIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
    marginTop: 4,
  },
  headerBarLandscape: {
    height: 52,
    paddingHorizontal: 14,
  },
  thumbnailStripContainerLandscape: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  stripHeaderRowLandscape: {
    marginBottom: 4,
  },
  thumbnailTouchWrapperLandscape: {
    minWidth: 80,
    maxWidth: 92,
  },
  thumbnailCardLandscape: {
    padding: 3,
    borderRadius: kioskRadii.md,
  },
  thumbnailPreviewBoxLandscape: {
    height: 44,
  },
  thumbnailTypeBadgeLandscape: {
    top: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  thumbnailTitleLandscape: {
    marginTop: 2,
  },
  activePillIndicatorLandscape: {
    width: 16,
    height: 2,
    marginTop: 2,
  },
});
