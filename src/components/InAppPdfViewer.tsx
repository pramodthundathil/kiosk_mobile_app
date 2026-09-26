import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  Linking,
  Image,
} from 'react-native';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  QrCode,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Check,
  Maximize2,
  X,
  Smartphone,
} from 'lucide-react-native';
import { kioskColors, kioskRadii, kioskShadows } from '../theme/kioskTheme';

// Conditionally require react-native-webview safely for web and native
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('[InAppPdfViewer] react-native-webview not available:', e);
  }
}

export interface InAppPdfViewerProps {
  pdfUrl: string;
  title?: string;
  subtitle?: string;
  scaleFont?: (size: number, min?: number) => number;
  scaleSpacing?: (size: number) => number;
}

export const InAppPdfViewer: React.FC<InAppPdfViewerProps> = ({
  pdfUrl,
  title = 'Technical Document',
  subtitle,
  scaleFont = (s) => s,
  scaleSpacing = (s) => s,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // 75%, 100%, 125%, 150%, 175%, 200%
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [viewerKey, setViewerKey] = useState(0); // For forced reloads

  const webViewRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [pdfUrl, viewerKey]);

  // Handle Zoom change by injecting CSS zoom into WebView
  const handleZoomIn = () => {
    const nextZoom = Math.min(zoomLevel + 25, 200);
    setZoomLevel(nextZoom);
    injectZoom(nextZoom);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoomLevel - 25, 75);
    setZoomLevel(nextZoom);
    injectZoom(nextZoom);
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    injectZoom(100);
  };

  const injectZoom = (zoomPct: number) => {
    const script = `
      try {
        document.body.style.zoom = '${zoomPct}%';
        document.body.style.transformOrigin = '0 0';
      } catch (e) {}
      true;
    `;
    if (webViewRef.current) {
      if (Platform.OS === 'web') {
        try {
          const iframe = webViewRef.current as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.document.body.style.zoom = `${zoomPct}%`;
          }
        } catch (e) {}
      } else {
        webViewRef.current.injectJavaScript(script);
      }
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(false);
    setViewerKey((k) => k + 1);
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl).catch(() => {});
    }
  };

  // QR code URL for kiosk visitors to download directly to smartphone
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(
    pdfUrl || 'https://excel.byteboot.in'
  )}`;

  // Google Docs Embedded Viewer URL for Android & Web fallback
  // Provides high-performance in-app rendering of remote PDFs
  const isDirectWebOrIos = Platform.OS === 'ios';
  const resolvedViewerUrl = isDirectWebOrIos
    ? pdfUrl
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;

  return (
    <View style={styles.container}>
      {/* Top Document Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.docMetaBox}>
          <View style={styles.docBadge}>
            <FileText size={scaleFont(14)} color="#10B981" strokeWidth={2.4} />
            <Text style={[styles.docBadgeText, { fontSize: scaleFont(11.5) }]}>PDF In-App Viewer</Text>
          </View>
          <View style={styles.titleWrapper}>
            <Text numberOfLines={1} style={[styles.docTitleText, { fontSize: scaleFont(14) }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.docSubtitleText, { fontSize: scaleFont(11.5) }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Action Controls: Zoom Controls, Reload, QR Code */}
        <View style={styles.actionsCluster}>
          {/* Zoom In & Out */}
          <View style={styles.zoomControlGroup}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomOut}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ZoomOut size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zoomLevelBtn}
              onPress={handleResetZoom}
              activeOpacity={0.8}
            >
              <Text style={[styles.zoomLevelText, { fontSize: scaleFont(11.5) }]}>
                {zoomLevel}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomIn}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ZoomIn size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Refresh/Reload Button */}
          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={handleReload}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RefreshCw size={scaleFont(14)} color="#94A3B8" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Scan to Phone / QR Code Action */}
          <TouchableOpacity
            style={styles.qrActionBtn}
            onPress={() => setShowQrModal(true)}
            activeOpacity={0.85}
          >
            <Smartphone size={scaleFont(13)} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={[styles.qrActionText, { fontSize: scaleFont(12) }]}>
              Send to Phone
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main WebView Content Area */}
      <View style={styles.webviewWrapper}>
        {/* Loading Indicator */}
        {isLoading && !loadError && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0D60AE" />
              <Text style={[styles.loadingTitle, { fontSize: scaleFont(14) }]}>
                Loading Document...
              </Text>
              <Text style={[styles.loadingSub, { fontSize: scaleFont(11.5) }]}>
                Rendering high-resolution technical vector pages
              </Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {loadError && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <AlertTriangle size={scaleFont(38)} color="#F59E0B" strokeWidth={2} />
              <Text style={[styles.errorTitle, { fontSize: scaleFont(16) }]}>
                Document Preview Unavailable
              </Text>
              <Text style={[styles.errorSub, { fontSize: scaleFont(12.5) }]}>
                The PDF could not be loaded directly on screen. You can scan the QR code to open it on your smartphone or retry.
              </Text>

              <View style={styles.errorActionsRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleReload}
                  activeOpacity={0.85}
                >
                  <RefreshCw size={scaleFont(14)} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={[styles.retryBtnText, { fontSize: scaleFont(13) }]}>Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.errorQrBtn}
                  onPress={() => setShowQrModal(true)}
                  activeOpacity={0.85}
                >
                  <QrCode size={scaleFont(14)} color="#0D60AE" strokeWidth={2.2} />
                  <Text style={[styles.errorQrBtnText, { fontSize: scaleFont(13) }]}>Scan QR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.openExternalBtn}
                  onPress={handleOpenExternal}
                  activeOpacity={0.85}
                >
                  <ExternalLink size={scaleFont(14)} color="#64748B" strokeWidth={2.2} />
                  <Text style={[styles.openExternalBtnText, { fontSize: scaleFont(13) }]}>Open Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* WebView Execution */}
        {Platform.OS === 'web' ? (
          <iframe
            ref={webViewRef}
            src={resolvedViewerUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#FFFFFF',
            }}
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setLoadError(true);
            }}
          />
        ) : NativeWebView ? (
          <NativeWebView
            key={viewerKey}
            ref={webViewRef}
            source={{ uri: resolvedViewerUrl }}
            style={styles.nativeWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setLoadError(true);
            }}
          />
        ) : (
          <View style={styles.unsupportedContainer}>
            <Text style={{ color: '#FFFFFF' }}>WebView not available</Text>
          </View>
        )}
      </View>

      {/* QR Code Modal for Kiosk Visitor Phone Download */}
      {showQrModal && (
        <View style={styles.qrModalBackdrop}>
          <View style={styles.qrModalBox}>
            <View style={styles.qrModalHeader}>
              <View style={styles.qrModalTitleRow}>
                <Smartphone size={scaleFont(18)} color="#0D60AE" strokeWidth={2.4} />
                <Text style={[styles.qrModalTitle, { fontSize: scaleFont(16) }]}>
                  Download Document to Phone
                </Text>
              </View>
              <TouchableOpacity
                style={styles.qrModalCloseBtn}
                onPress={() => setShowQrModal(false)}
                activeOpacity={0.8}
              >
                <X size={scaleFont(18)} color="#64748B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrModalBody}>
              <View style={styles.qrFrame}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.qrHeadline, { fontSize: scaleFont(14) }]}>
                Point Camera to Open PDF
              </Text>
              <Text style={[styles.qrInstruction, { fontSize: scaleFont(12) }]}>
                Scan this QR code with any smartphone camera or QR reader to view and save this official Excel Earthing engineering specification.
              </Text>

              <TouchableOpacity
                style={styles.qrDismissBtn}
                onPress={() => setShowQrModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.qrDismissBtnText, { fontSize: scaleFont(13) }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#070A11',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  toolbar: {
    height: 58,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  docMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  docBadgeText: {
    color: '#10B981',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  titleWrapper: {
    flex: 1,
  },
  docTitleText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  docSubtitleText: {
    color: '#94A3B8',
    marginTop: 2,
  },
  actionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoomControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: kioskRadii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  zoomLevelBtn: {
    paddingHorizontal: 10,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  zoomLevelText: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: kioskRadii.sm,
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  qrActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webviewWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  nativeWebView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 10, 17, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 12,
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  loadingSub: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 6,
  },
  errorCard: {
    backgroundColor: '#0F172A',
    borderRadius: kioskRadii.xl,
    padding: 28,
    maxWidth: 540,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 4,
  },
  errorSub: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
  },
  errorQrBtnText: {
    color: '#0D60AE',
    fontWeight: '700',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  openExternalBtnText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  unsupportedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  qrModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    padding: 20,
  },
  qrModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.xl,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    ...kioskShadows.modal,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qrModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrModalTitle: {
    color: '#0F172A',
    fontWeight: '800',
  },
  qrModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalBody: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  qrFrame: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: kioskRadii.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    ...kioskShadows.card,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrHeadline: {
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 4,
  },
  qrInstruction: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  qrDismissBtn: {
    width: '100%',
    backgroundColor: '#0D60AE',
    paddingVertical: 12,
    borderRadius: kioskRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  qrDismissBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
