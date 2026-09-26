import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Box,
  Image as ImageIcon,
  Video,
  FileText,
  Maximize2,
  Sparkles,
  ChevronRight,
  QrCode,
} from 'lucide-react-native';
import { kioskColors, kioskRadii, kioskShadows } from '../theme/kioskTheme';
import { KioskProduct, ProductMediaAsset } from '../types/kiosk';
import { ThreeDModelViewer } from './ThreeDModelViewer';
import { MediaModal } from './MediaModal';
import { useVideoPlayer, VideoView } from 'expo-video';

interface ProductMediaGalleryProps {
  product: KioskProduct;
  height?: number;
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
  height = 320,
  scaleFont = (s) => s,
  scaleSpacing = (s) => s,
  onOpenMediaViewer,
}) => {
  const mediaAssets = product.mediaAssets || [];

  // Categorize assets
  const threeDAsset = useMemo(
    () => mediaAssets.find((a) => a.asset_type === 'THREE_D'),
    [mediaAssets]
  );

  const videoAssets = useMemo(
    () => mediaAssets.filter((a) => a.asset_type === 'VIDEO'),
    [mediaAssets]
  );

  const photoAssets = useMemo(() => {
    const list: { id: string; url: string; title: string }[] = [];
    if (product.image) {
      list.push({ id: 'main', url: product.image, title: 'Main Photo' });
    }
    mediaAssets
      .filter((a) => a.asset_type === 'IMAGE' && a.file_url && a.file_url !== product.image)
      .forEach((a) => {
        list.push({ id: a.id, url: a.file_url!, title: a.title || 'Product Photo' });
      });
    return list;
  }, [product.image, mediaAssets]);

  const docAssets = useMemo(() => {
    const docs = mediaAssets.filter(
      (a) => a.asset_type === 'PDF_BROCHURE' || a.asset_type === 'TECH_SHEET'
    );
    // If not in mediaAssets but brochureUrl or techSheetUrl exists
    if (docs.length === 0) {
      if (product.brochureUrl) {
        docs.push({
          id: 'brochure',
          title: 'Product Brochure PDF',
          asset_type: 'PDF_BROCHURE',
          file_url: product.brochureUrl,
        });
      }
      if (product.techSheetUrl) {
        docs.push({
          id: 'tech_sheet',
          title: 'Technical Data Sheet',
          asset_type: 'TECH_SHEET',
          file_url: product.techSheetUrl,
        });
      }
    }
    return docs;
  }, [mediaAssets, product.brochureUrl, product.techSheetUrl]);

  // Initial tab selection: if product has 3D asset, showcase it proudly; otherwise default to photo
  const [activeTab, setActiveTab] = useState<MediaTabType>(
    threeDAsset ? 'three_d' : 'photo'
  );

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [fullscreenAsset, setFullscreenAsset] = useState<ProductMediaAsset | null>(null);

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

      {/* Modern Media Tab Switcher */}
      <View style={styles.tabBar}>
        {/* Photo Tab */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'photo' && styles.tabButtonActive]}
          onPress={() => setActiveTab('photo')}
          activeOpacity={0.85}
        >
          <ImageIcon
            size={scaleFont(13)}
            color={activeTab === 'photo' ? '#FFFFFF' : '#94A3B8'}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'photo' && styles.tabTextActive,
              { fontSize: scaleFont(12) },
            ]}
          >
            Photos ({photoAssets.length})
          </Text>
        </TouchableOpacity>

        {/* 3D Asset Tab (Prominently Highlighted with glow if available) */}
        {threeDAsset && (
          <TouchableOpacity
            style={[
              styles.tabButton,
              styles.tabButton3D,
              activeTab === 'three_d' && styles.tabButton3DActive,
            ]}
            onPress={() => setActiveTab('three_d')}
            activeOpacity={0.85}
          >
            <View style={styles.pulseDot} />
            <Box
              size={scaleFont(13)}
              color={activeTab === 'three_d' ? '#FFFFFF' : '#38BDF8'}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.tabText,
                styles.tabText3D,
                activeTab === 'three_d' && styles.tabTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              3D Interactive View
            </Text>
          </TouchableOpacity>
        )}

        {/* Video Tab */}
        {videoAssets.length > 0 && (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'video' && styles.tabButtonActive]}
            onPress={() => setActiveTab('video')}
            activeOpacity={0.85}
          >
            <Video
              size={scaleFont(13)}
              color={activeTab === 'video' ? '#FFFFFF' : '#94A3B8'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'video' && styles.tabTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              Videos ({videoAssets.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Documents / Brochure Tab */}
        {docAssets.length > 0 && (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'brochure' && styles.tabButtonActive]}
            onPress={() => setActiveTab('brochure')}
            activeOpacity={0.85}
          >
            <FileText
              size={scaleFont(13)}
              color={activeTab === 'brochure' ? '#FFFFFF' : '#94A3B8'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'brochure' && styles.tabTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              Brochures ({docAssets.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Display Stage */}
      <View style={[styles.stageWrapper, { height }]}>
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
          <TouchableOpacity
            style={styles.stageContent}
            onPress={handleOpenActiveFullscreen}
            activeOpacity={0.92}
          >
            <Image
              source={{ uri: photoAssets[selectedPhotoIndex]?.url || product.image }}
              style={styles.mainPhoto}
              resizeMode="contain"
            />
            {/* Fullscreen Expansion Button */}
            <View style={styles.expandButton}>
              <Maximize2 size={scaleFont(15)} color="#38BDF8" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Thumbnails Row if Multiple Photos Exist */}
      {activeTab === 'photo' && photoAssets.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {photoAssets.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.thumbnailItem,
                selectedPhotoIndex === idx && styles.thumbnailItemActive,
              ]}
              onPress={() => setSelectedPhotoIndex(idx)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.url }} style={styles.thumbnailImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Quick Launch Bar for 3D if in Photo mode */}
      {activeTab !== 'three_d' && threeDAsset && (
        <TouchableOpacity
          style={styles.quickLaunch3DBar}
          onPress={() => setActiveTab('three_d')}
          activeOpacity={0.88}
        >
          <View style={styles.quickLaunch3DLeft}>
            <View style={styles.quickLaunch3DIcon}>
              <Box size={scaleFont(15)} color="#38BDF8" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={[styles.quickLaunch3DTitle, { fontSize: scaleFont(12.5) }]}>
                Interactive 3D Model Available
              </Text>
              <Text style={[styles.quickLaunch3DSub, { fontSize: scaleFont(11) }]}>
                Tap to rotate 360&deg; and inspect internal engineering
              </Text>
            </View>
          </View>
          <ChevronRight size={scaleFont(16)} color="#38BDF8" strokeWidth={2.4} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...kioskShadows.card,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0D60AE',
    borderColor: '#0D60AE',
  },
  tabButton3D: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  tabButton3DActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  tabText: {
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabText3D: {
    color: '#0284C7',
  },
  stageWrapper: {
    width: '100%',
    borderRadius: kioskRadii.lg,
    overflow: 'hidden',
    backgroundColor: '#0B1329',
    position: 'relative',
  },
  stageContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  mainPhoto: {
    width: '90%',
    height: '90%',
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...kioskShadows.subtle,
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
  thumbnailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingBottom: 2,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: kioskRadii.md,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  thumbnailItemActive: {
    borderColor: '#0284C7',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  quickLaunch3DBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    borderRadius: kioskRadii.md,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  quickLaunch3DLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  quickLaunch3DIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLaunch3DTitle: {
    color: '#0369A1',
    fontWeight: '700',
  },
  quickLaunch3DSub: {
    color: '#64748B',
  },
});
