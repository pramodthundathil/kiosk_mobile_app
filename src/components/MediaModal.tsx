import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
        return <Box size={scaleFont(16)} color="#38BDF8" strokeWidth={2.4} />;
      case 'VIDEO':
        return <Video size={scaleFont(16)} color="#F43F5E" strokeWidth={2.4} />;
      case 'PDF_BROCHURE':
      case 'TECH_SHEET':
        return <FileText size={scaleFont(16)} color="#10B981" strokeWidth={2.4} />;
      default:
        return <FileText size={scaleFont(16)} color="#38BDF8" strokeWidth={2.4} />;
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
                    {product.name} &bull; {product.sku}
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
              <ScrollView
                contentContainerStyle={styles.documentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.docCard}>
                  <View style={styles.docHeader}>
                    <View style={styles.docIconBox}>
                      <FileText size={scaleFont(36)} color="#10B981" strokeWidth={2} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={[styles.docTitle, { fontSize: scaleFont(18) }]}>
                        {asset.title || 'Technical Brochure & Documentation'}
                      </Text>
                      <Text style={[styles.docDescription, { fontSize: scaleFont(13) }]}>
                        {asset.description ||
                          'Certified industrial product specifications, engineering schematics, and test compliance reports.'}
                      </Text>
                      <Text style={[styles.docFileTag, { fontSize: scaleFont(11.5) }]}>
                        PDF Document &bull; Verified Technical Reference
                      </Text>
                    </View>
                  </View>

                  {/* QR Code Sharing Box for Kiosk Visitors */}
                  <View style={styles.qrSection}>
                    <View style={styles.qrImageFrame}>
                      <Image
                        source={{ uri: qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.qrTextCol}>
                      <View style={styles.qrHeadlineRow}>
                        <QrCode size={scaleFont(18)} color="#0284C7" strokeWidth={2.2} />
                        <Text style={[styles.qrTitle, { fontSize: scaleFont(15) }]}>
                          Scan to Download to Phone
                        </Text>
                      </View>
                      <Text style={[styles.qrExplainer, { fontSize: scaleFont(12.5) }]}>
                        Point your mobile phone camera at the QR code to instantly open and download this official PDF brochure on your device.
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.openDocButton}
                          onPress={handleOpenExternal}
                          activeOpacity={0.85}
                        >
                          <ExternalLink size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={[styles.openDocButtonText, { fontSize: scaleFont(13) }]}>
                            Open PDF Directly
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
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
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 960,
    height: '90%',
    maxHeight: 760,
    backgroundColor: '#0F172A',
    borderRadius: kioskRadii.xl,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...kioskShadows.modal,
  },
  header: {
    height: 64,
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    color: '#E2E8F0',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleColumn: {
    flex: 1,
  },
  titleText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  productSub: {
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#0B1329',
  },
  threeDContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
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
  },
  docCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#1E293B',
    borderRadius: kioskRadii.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 24,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  docDescription: {
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 20,
  },
  docFileTag: {
    color: '#10B981',
    fontWeight: '600',
    marginTop: 8,
  },
  qrSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: kioskRadii.md,
    padding: 20,
    gap: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  qrImageFrame: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    color: '#38BDF8',
    fontWeight: '700',
  },
  qrExplainer: {
    color: '#CBD5E1',
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
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
  },
  openDocButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
