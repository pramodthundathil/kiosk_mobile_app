import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import {
  X,
  Box,
  Video,
  FileText,
  ExternalLink,
  QrCode,
  Download,
  Share2,
  Check,
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { kioskColors, kioskRadii, kioskShadows } from '../theme/kioskTheme';
import { ProductMediaAsset, KioskProduct } from '../types/kiosk';
import { ThreeDModelViewer } from './ThreeDModelViewer';
import { InAppPdfViewer } from './InAppPdfViewer';

interface MediaModalProps {
  visible: boolean;
  asset: ProductMediaAsset | null;
  product?: KioskProduct | null;
  onClose: () => void;
  scaleFont?: (size: number, min?: number) => number;
}

// Inner Video Player Component so hooks are called conditionally only when asset is VIDEO
const MediaVideoPlayer: React.FC<{ url: string }> = ({ url }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <View style={styles.videoPlayerContainer}>
      <VideoView
        player={player}
        style={styles.fullVideo}
        nativeControls={true}
        contentFit="contain"
      />
    </View>
  );
};

export const MediaModal: React.FC<MediaModalProps> = ({
  visible,
  asset,
  product,
  onClose,
  scaleFont = (s) => s,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!visible || !asset) return null;

  const assetType = asset.asset_type || 'IMAGE';
  const assetUrl = asset.file_url || '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    assetUrl || 'https://excel.byteboot.in'
  )}`;

  const handleOpenExternal = () => {
    if (assetUrl) {
      Linking.openURL(assetUrl).catch(() => {});
    }
  };

  const getAssetBadgeIcon = () => {
    switch (assetType) {
      case 'THREE_D':
        return <Box size={scaleFont(16)} color="#93C5FD" strokeWidth={2.4} />;
      case 'VIDEO':
        return <Video size={scaleFont(16)} color="#FCA5A5" strokeWidth={2.4} />;
      case 'PDF_BROCHURE':
      case 'TECH_SHEET':
        return <FileText size={scaleFont(16)} color="#6EE7B7" strokeWidth={2.4} />;
      default:
        return <FileText size={scaleFont(16)} color="#93C5FD" strokeWidth={2.4} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeWrapper}>
                {getAssetBadgeIcon()}
                <Text style={[styles.badgeText, { fontSize: scaleFont(12) }]}>
                  {asset.asset_type_display || assetType}
                </Text>
              </View>

              <View style={styles.titleColumn}>
                <Text numberOfLines={1} style={[styles.titleText, { fontSize: scaleFont(16) }]}>
                  {asset.title || product?.name || 'Media Asset Preview'}
                </Text>
                {product && (
                  <Text numberOfLines={1} style={[styles.productSub, { fontSize: scaleFont(12) }]}>
                    {product.name}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <X size={scaleFont(18)} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Content Area Based on Media Type */}
          <View style={styles.contentArea}>
            {assetType === 'THREE_D' ? (
              <View style={styles.threeDContainer}>
                <ThreeDModelViewer
                  modelUrl={assetUrl}
                  posterUrl={product?.image}
                  title={asset.title}
                  autoRotate={true}
                  showControls={true}
                  isFullscreen={true}
                  scaleFont={scaleFont}
                />
              </View>
            ) : assetType === 'VIDEO' ? (
              <View style={styles.videoWrapper}>
                <MediaVideoPlayer url={assetUrl} />
              </View>
            ) : assetType === 'PDF_BROCHURE' || assetType === 'TECH_SHEET' ? (
              <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#FFFFFF' }}>
                <InAppPdfViewer
                  pdfUrl={assetUrl}
                  title={asset.title || 'Technical Brochure & Documentation'}
                  subtitle={product?.name}
                  scaleFont={scaleFont}
                />
              </View>
            ) : (
              // Default Image Viewer
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: assetUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 960,
    height: '90%',
    maxHeight: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.xl,
    borderWidth: 1,
    borderColor: kioskColors.surfaceBorder,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...kioskShadows.modal,
  },
  header: {
    height: 64,
    backgroundColor: kioskColors.brandNavy,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: kioskColors.accentBlue,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleColumn: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productSub: {
    color: '#93C5FD',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  threeDContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  documentContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    backgroundColor: '#F8FAFC',
  },
  docCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: kioskColors.surfaceBorder,
    gap: 24,
    ...kioskShadows.card,
  },
  docHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  docIconBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: 'rgba(13, 96, 174, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(13, 96, 174, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: kioskColors.brandNavy,
    fontWeight: '800',
  },
  docDescription: {
    color: kioskColors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  docFileTag: {
    color: kioskColors.accentBlue,
    fontWeight: '700',
    marginTop: 8,
  },
  qrSection: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.md,
    padding: 20,
    gap: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrImageFrame: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...kioskShadows.card,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  qrTextCol: {
    flex: 1,
    gap: 10,
  },
  qrHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrTitle: {
    color: kioskColors.brandNavy,
    fontWeight: '800',
  },
  qrExplainer: {
    color: kioskColors.textSecondary,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  openDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: kioskRadii.md,
    ...kioskShadows.card,
  },
  openDocButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
