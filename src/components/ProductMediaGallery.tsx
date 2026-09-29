import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {
  Box,
  Image as ImageIcon,
  Video,
  FileText,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { kioskColors, kioskRadii, kioskShadows } from '../theme/kioskTheme';
import { KioskProduct, ProductMediaAsset } from '../types/kiosk';
import { ThreeDModelViewer } from './ThreeDModelViewer';
import { MediaModal } from './MediaModal';
import { useVideoPlayer, VideoView } from 'expo-video';

interface ProductMediaGalleryProps {
  product: KioskProduct;
  height?: number;
  isLandscape?: boolean;
  scaleFont?: (size: number, min?: number) => number;
  scaleSpacing?: (size: number) => number;
  onOpenMediaViewer?: (asset?: ProductMediaAsset) => void;
}

type MediaTabType = 'photo' | 'three_d' | 'video' | 'brochure';

// Mini preview video player
const InlineVideoCard: React.FC<{ url: string; onExpand: () => void; scaleFont: (s: number) => number }> = ({
  url,
  onExpand,
  scaleFont,
}) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.inlineVideoWrapper}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={true}
        contentFit="contain"
      />
      <TouchableOpacity
        style={styles.expandOverlayBtn}
        onPress={onExpand}
        activeOpacity={0.85}
      >
        <Maximize2 size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={[styles.expandOverlayText, { fontSize: scaleFont(12) }]}>Fullscreen</Text>
      </TouchableOpacity>
    </View>
  );
};

export const ProductMediaGallery: React.FC<ProductMediaGalleryProps> = ({
  product,
  height = 290,
  isLandscape = false,
  scaleFont = (s) => s,
  scaleSpacing = (s) => s,
  onOpenMediaViewer,
}) => {
  const mediaAssets = product.mediaAssets || [];

  // Categorize assets (require valid non-empty file_url)
  const threeDAsset = useMemo(
    () =>
      mediaAssets.find(
        (a) =>
          (a.asset_type?.toUpperCase() === 'THREE_D' ||
            a.asset_type?.toUpperCase() === '3D' ||
            a.file_url?.toLowerCase().endsWith('.glb') ||
            a.file_url?.toLowerCase().endsWith('.gltf')) &&
          typeof a.file_url === 'string' &&
          a.file_url.trim().length > 0
      ) || null,
    [mediaAssets]
  );

  const videoAssets = useMemo(
    () =>
      mediaAssets.filter(
        (a) =>
          (a.asset_type?.toUpperCase() === 'VIDEO' ||
            a.file_url?.toLowerCase().endsWith('.mp4') ||
            a.file_url?.toLowerCase().endsWith('.mov')) &&
          typeof a.file_url === 'string' &&
          a.file_url.trim().length > 0
      ),
    [mediaAssets]
  );

  const photoAssets = useMemo(() => {
    const list: { id: string; url: string; title: string }[] = [];
    if (product.image) {
      list.push({ id: `main-${product.id}`, url: product.image, title: product.name || 'Product Photo' });
    }
    // Include additional images explicitly defined in mediaAssets
    if (Array.isArray(mediaAssets)) {
      mediaAssets
        .filter((a) => (a.asset_type === 'IMAGE' || (a.asset_type as string) === 'PHOTO') && a.file_url && a.file_url.trim().length > 0 && a.file_url !== product.image)
        .forEach((a) => {
          list.push({ id: a.id, url: a.file_url!.trim(), title: a.title || 'Product Photo' });
        });
    }
    // Also include variant images if available
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v) => {
        if (v.image && v.image.trim().length > 0 && !list.some((item) => item.url === v.image)) {
          list.push({ id: `var-${v.id}`, url: v.image.trim(), title: v.name });
        }
      });
    }
    return list;
  }, [product.image, product.id, product.name, product.variants, mediaAssets]);

  const docAssets = useMemo(() => {
    const docs = mediaAssets.filter(
      (a) =>
        (a.asset_type?.toUpperCase() === 'PDF_BROCHURE' ||
          a.asset_type?.toUpperCase() === 'TECH_SHEET' ||
          a.asset_type?.toUpperCase() === 'PDF' ||
          a.file_url?.toLowerCase().endsWith('.pdf')) &&
        typeof a.file_url === 'string' &&
        a.file_url.trim().length > 0
    );
    if (docs.length === 0) {
      if (product.brochureUrl && product.brochureUrl.trim().length > 0) {
        docs.push({
          id: 'brochure',
          title: `${product.name} Brochure`,
          asset_type: 'PDF_BROCHURE' as const,
          file_url: product.brochureUrl.trim(),
        });
      }
      if (product.techSheetUrl && product.techSheetUrl.trim().length > 0) {
        docs.push({
          id: 'tech_sheet',
          title: `${product.name} Technical Datasheet`,
          asset_type: 'TECH_SHEET' as const,
          file_url: product.techSheetUrl.trim(),
        });
      }
    }
    return docs;
  }, [mediaAssets, product.brochureUrl, product.techSheetUrl, product.name]);

  // Initial tab selection
  const [activeTab, setActiveTab] = useState<MediaTabType>('photo');

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [fullscreenAsset, setFullscreenAsset] = useState<ProductMediaAsset | null>(null);

  useEffect(() => {
    setSelectedPhotoIndex(0);
    setSelectedVideoIndex(0);
    if (activeTab === 'three_d' && !threeDAsset) {
      setActiveTab('photo');
    } else if (activeTab === 'brochure' && docAssets.length === 0) {
      setActiveTab('photo');
    } else if (activeTab === 'video' && videoAssets.length === 0) {
      setActiveTab('photo');
    }
  }, [product.id, product.name, product.image, threeDAsset, docAssets.length, videoAssets.length]);

  const handleOpenFullscreen = (asset: ProductMediaAsset) => {
    if (onOpenMediaViewer) {
      onOpenMediaViewer(asset);
    } else {
      setFullscreenAsset(asset);
    }
  };

  const handleOpenActiveFullscreen = () => {
    let targetAsset: ProductMediaAsset | null = null;
    if (activeTab === 'three_d' && threeDAsset) {
      targetAsset = threeDAsset;
    } else if (activeTab === 'video' && videoAssets[selectedVideoIndex]) {
      targetAsset = videoAssets[selectedVideoIndex];
    } else if (activeTab === 'brochure' && docAssets[0]) {
      targetAsset = docAssets[0];
    } else {
      const curPhoto = photoAssets[selectedPhotoIndex];
      targetAsset = {
        id: curPhoto?.id || 'photo',
        title: product.name,
        asset_type: 'IMAGE',
        file_url: curPhoto?.url || product.image,
      };
    }

    if (onOpenMediaViewer && targetAsset) {
      onOpenMediaViewer(targetAsset);
    } else {
      setFullscreenAsset(targetAsset);
    }
  };

  const handlePrevPhoto = () => {
    if (photoAssets.length <= 1) return;
    try { Haptics.selectionAsync(); } catch (e) {}
    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photoAssets.length - 1));
  };

  const handleNextPhoto = () => {
    if (photoAssets.length <= 1) return;
    try { Haptics.selectionAsync(); } catch (e) {}
    setSelectedPhotoIndex((prev) => (prev < photoAssets.length - 1 ? prev + 1 : 0));
  };

  // Render thumbnail item
  const renderThumbnail = (item: { id: string; url: string; title: string }, idx: number) => {
    const isSelected = selectedPhotoIndex === idx;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.thumbnailCard,
          isSelected && styles.thumbnailCardActive,
        ]}
        onPress={() => {
          try { Haptics.selectionAsync(); } catch (e) {}
          setSelectedPhotoIndex(idx);
          if (activeTab !== 'photo') setActiveTab('photo');
        }}
        activeOpacity={0.85}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Image source={{ uri: item.url }} style={styles.thumbnailImg} resizeMode="contain" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fullscreen Inspector Modal (Fallback if onOpenMediaViewer not wired) */}
      {!onOpenMediaViewer && (
        <MediaModal
          visible={!!fullscreenAsset}
          asset={fullscreenAsset}
          product={product}
          onClose={() => setFullscreenAsset(null)}
          scaleFont={scaleFont}
        />
      )}

      {/* Top Toggle Pill Row: Only renders options that ACTUALLY exist */}
      <View style={styles.topToggleRow}>
        <View style={styles.pillToggleWrapper}>
          {photoAssets.length > 0 && (
            <TouchableOpacity
              style={[
                styles.pillToggleBtn,
                activeTab === 'photo' && styles.pillToggleBtnActive,
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setActiveTab('photo');
              }}
              activeOpacity={0.88}
            >
              <ImageIcon
                size={scaleFont(13)}
                color={activeTab === 'photo' ? '#FFFFFF' : '#475569'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.pillToggleText,
                  activeTab === 'photo' && styles.pillToggleTextActive,
                  { fontSize: scaleFont(12) },
                ]}
              >
                Photos ({photoAssets.length})
              </Text>
            </TouchableOpacity>
          )}

          {threeDAsset && (
            <TouchableOpacity
              style={[
                styles.pillToggleBtn,
                activeTab === 'three_d' && styles.pillToggleBtnActive,
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setActiveTab('three_d');
              }}
              activeOpacity={0.88}
            >
              <Box
                size={scaleFont(13)}
                color={activeTab === 'three_d' ? '#FFFFFF' : '#475569'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.pillToggleText,
                  activeTab === 'three_d' && styles.pillToggleTextActive,
                  { fontSize: scaleFont(12) },
                ]}
              >
                3D View
              </Text>
            </TouchableOpacity>
          )}

          {docAssets.length > 0 && (
            <TouchableOpacity
              style={[
                styles.pillToggleBtn,
                activeTab === 'brochure' && styles.pillToggleBtnActive,
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setActiveTab('brochure');
              }}
              activeOpacity={0.88}
            >
              <FileText
                size={scaleFont(13)}
                color={activeTab === 'brochure' ? '#FFFFFF' : '#475569'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.pillToggleText,
                  activeTab === 'brochure' && styles.pillToggleTextActive,
                  { fontSize: scaleFont(12) },
                ]}
              >
                PDF Document
              </Text>
            </TouchableOpacity>
          )}

          {videoAssets.length > 0 && (
            <TouchableOpacity
              style={[
                styles.pillToggleBtn,
                activeTab === 'video' && styles.pillToggleBtnActive,
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setActiveTab('video');
              }}
              activeOpacity={0.88}
            >
              <Video
                size={scaleFont(13)}
                color={activeTab === 'video' ? '#FFFFFF' : '#475569'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.pillToggleText,
                  activeTab === 'video' && styles.pillToggleTextActive,
                  { fontSize: scaleFont(12) },
                ]}
              >
                Video
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Media Content Stage with Side or Bottom Thumbnails */}
      <View style={[styles.stageAndThumbsRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
        {/* Main Display Stage */}
        <View style={[styles.stageWrapper, { height, flex: 1 }]}>
          {activeTab === 'three_d' && threeDAsset ? (
            <View style={styles.stageContent}>
              <ThreeDModelViewer
                modelUrl={threeDAsset.file_url || ''}
                posterUrl={product.image}
                title={threeDAsset.title || product.name}
                autoRotate={true}
                showControls={true}
                isFullscreen={false}
                onToggleFullscreen={handleOpenActiveFullscreen}
                scaleFont={scaleFont}
              />
            </View>
          ) : activeTab === 'video' && videoAssets[selectedVideoIndex] ? (
            <View style={styles.stageContent}>
              <InlineVideoCard
                url={videoAssets[selectedVideoIndex].file_url || ''}
                onExpand={handleOpenActiveFullscreen}
                scaleFont={scaleFont}
              />
            </View>
          ) : activeTab === 'brochure' && docAssets[0] ? (
            <View style={styles.docStageContent}>
              <View style={styles.docStageIconBox}>
                <FileText size={scaleFont(32)} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={[styles.docStageTitle, { fontSize: scaleFont(14.5) }]}>
                {docAssets[0].title || 'Product Technical Brochure'}
              </Text>
              <Text style={[styles.docStageSub, { fontSize: scaleFont(12) }]}>
                Official engineering datasheets and test certificates
              </Text>
              <TouchableOpacity
                style={styles.docStageButton}
                onPress={() => handleOpenFullscreen(docAssets[0])}
                activeOpacity={0.85}
              >
                <QrCode size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={[styles.docStageButtonText, { fontSize: scaleFont(12.5) }]}>
                  View PDF & Scan QR
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Default Photo View
            <View style={styles.stageContent}>
              <Image
                source={{ uri: photoAssets[selectedPhotoIndex]?.url || product.image }}
                style={styles.mainPhoto}
                resizeMode="contain"
              />

              {/* Floating Left Arrow */}
              {photoAssets.length > 1 && (
                <TouchableOpacity
                  style={styles.floatingArrowLeft}
                  onPress={handlePrevPhoto}
                  activeOpacity={0.85}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronLeft size={scaleFont(16)} color="#0D60AE" strokeWidth={2.6} />
                </TouchableOpacity>
              )}

              {/* Floating Right Arrow */}
              {photoAssets.length > 1 && (
                <TouchableOpacity
                  style={styles.floatingArrowRight}
                  onPress={handleNextPhoto}
                  activeOpacity={0.85}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ChevronRight size={scaleFont(16)} color="#0D60AE" strokeWidth={2.6} />
                </TouchableOpacity>
              )}

              {/* Floating Fullscreen Expand Button at bottom right */}
              <TouchableOpacity
                style={styles.floatingExpandBtn}
                onPress={handleOpenActiveFullscreen}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Maximize2 size={scaleFont(15)} color="#0D60AE" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Thumbnails: Vertical for Landscape, Horizontal for Portrait */}
        {activeTab === 'photo' && photoAssets.length > 1 && (
          isLandscape ? (
            <View style={styles.verticalThumbnailCol}>
              {photoAssets.slice(0, 4).map((item, idx) => renderThumbnail(item, idx))}
            </View>
          ) : (
            <View style={styles.portraitThumbnailsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailRow}
              >
                {photoAssets.map((item, idx) => renderThumbnail(item, idx))}
              </ScrollView>
              <TouchableOpacity
                style={styles.thumbnailNextCircle}
                onPress={handleNextPhoto}
                activeOpacity={0.85}
              >
                <ChevronRight size={scaleFont(14)} color="#0D60AE" strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topToggleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pillToggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  pillToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  pillToggleBtnActive: {
    backgroundColor: '#0D60AE',
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  pillToggleText: {
    color: '#475569',
    fontWeight: '700',
  },
  pillToggleTextActive: {
    color: '#FFFFFF',
  },
  stageAndThumbsRow: {
    gap: 10,
  },
  stageWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stageContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  mainPhoto: {
    width: '88%',
    height: '88%',
  },
  floatingArrowLeft: {
    position: 'absolute',
    left: 8,
    top: '48%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floatingArrowRight: {
    position: 'absolute',
    right: 8,
    top: '48%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floatingExpandBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  portraitThumbnailsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  thumbnailNextCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  verticalThumbnailCol: {
    width: 64,
    gap: 8,
    justifyContent: 'flex-start',
  },
  thumbnailCard: {
    width: 58,
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailCardActive: {
    borderWidth: 2,
    borderColor: '#0D60AE',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  inlineVideoWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  expandOverlayBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  expandOverlayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  docStageContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  docStageIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  docStageTitle: {
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'center',
  },
  docStageSub: {
    color: '#64748B',
    textAlign: 'center',
  },
  docStageButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: kioskRadii.md,
  },
  docStageButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
