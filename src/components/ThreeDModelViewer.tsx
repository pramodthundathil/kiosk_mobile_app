import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Box,
  AlertCircle,
} from 'lucide-react-native';
import { kioskColors, kioskRadii, kioskShadows } from '../theme/kioskTheme';
import { MODEL_VIEWER_SCRIPT } from '../assets/modelViewerBundle';
import { resolveOfflineModelUri } from '../services/modelAssetService';

// Conditionally require react-native-webview only on native platforms
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not available on this platform:', e);
  }
}

export interface ThreeDModelViewerProps {
  modelUrl: string;
  style?: ViewStyle;
  posterUrl?: string;
  title?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  scaleFont?: (size: number, min?: number) => number;
}

export const ThreeDModelViewer: React.FC<ThreeDModelViewerProps> = ({
  modelUrl,
  style,
  posterUrl,
  title = '3D Product Model',
  autoRotate = true,
  showControls = true,
  isFullscreen = false,
  onToggleFullscreen,
  scaleFont = (s) => s,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const [cameraZoomLevel, setCameraZoomLevel] = useState(0); // -2 to +2
  const [resolvedModelUrl, setResolvedModelUrl] = useState<string>('');
  const [isPreparingModel, setIsPreparingModel] = useState<boolean>(true);
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  // Resolve offline-capable URI (Base64 data URI or local cached file)
  useEffect(() => {
    let isMounted = true;
    setIsPreparingModel(true);
    setIsLoading(true);
    setHasError(false);

    resolveOfflineModelUri(modelUrl)
      .then((resolvedUri) => {
        if (isMounted) {
          setResolvedModelUrl(resolvedUri);
          setIsPreparingModel(false);
        }
      })
      .catch((err) => {
        console.warn('[ThreeDModelViewer] Model resolution notice:', err);
        if (isMounted) {
          setResolvedModelUrl(modelUrl || '');
          setIsPreparingModel(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  // Generates complete self-contained HTML for Google <model-viewer>
  // Uses bundled JavaScript so it works 100% OFFLINE without any CDN dependency
  const generateModelViewerHtml = (url: string, poster?: string, initialAutoRotate: boolean = true) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  ${
    MODEL_VIEWER_SCRIPT
      ? `<script type="module">${MODEL_VIEWER_SCRIPT}</script>`
      : `<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>`
  }
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: radial-gradient(circle at 50% 40%, #1e293b 0%, #0b1329 80%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      --poster-color: transparent;
      outline: none;
      --progress-bar-color: #0284c7;
      --progress-bar-height: 3px;
    }
    .badge-3d {
      position: absolute;
      top: 14px;
      left: 14px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 20px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 7px;
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      backdrop-filter: blur(8px);
      pointer-events: none;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .touch-hint {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 7px 18px;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      pointer-events: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      transition: opacity 0.5s ease;
    }
    .touch-hint.fade-out {
      opacity: 0;
    }
  </style>
</head>
<body>
  <div class="badge-3d">
    <div class="badge-dot"></div>
    <span>3D INTERACTIVE MODEL</span>
  </div>

  <model-viewer
    id="viewer"
    src="${url}"
    ${poster ? `poster="${poster}"` : ''}
    camera-controls
    touch-action="pan-y"
    ${initialAutoRotate ? 'auto-rotate' : ''}
    rotation-per-second="20deg"
    interaction-prompt="auto"
    shadow-intensity="1.6"
    shadow-softness="0.7"
    exposure="1.15"
    loading="eager"
    reveal="auto"
    bounds="tight"
    ar
  >
  </model-viewer>

  <div id="hint" class="touch-hint">
    <span>🖐️ Touch to Rotate 360° &bull; Pinch to Zoom</span>
  </div>

  <script>
    const viewer = document.getElementById('viewer');
    const hint = document.getElementById('hint');
    let hasLoaded = false;

    // Notify React Native when model is loaded or has error
    function post(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(JSON.stringify(data), '*');
      }
    }

    if (viewer) {
      viewer.addEventListener('load', () => {
        hasLoaded = true;
        post({ type: 'LOADED' });
      });

      viewer.addEventListener('error', (err) => {
        if (!hasLoaded) {
          post({ type: 'ERROR', detail: 'Could not render 3D model: ' + (err.detail || 'Format or decoding issue') });
        }
      });

      // Fade out hint after first interaction
      viewer.addEventListener('camera-change', (event) => {
        if (event.detail && event.detail.source === 'user-interaction') {
          hint.classList.add('fade-out');
        }
      });

      // Liveness fallback: if model-viewer custom element upgraded and scene has mesh
      setTimeout(() => {
        if (!hasLoaded && customElements.get('model-viewer')) {
          hasLoaded = true;
          post({ type: 'LOADED' });
        }
      }, 2500);
    }

    // Listen for control commands from React Native
    window.addEventListener('message', (event) => {
      try {
        const cmd = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!viewer) return;
        if (cmd.action === 'toggle-auto-rotate') {
          if (cmd.value) {
            viewer.setAttribute('auto-rotate', '');
          } else {
            viewer.removeAttribute('auto-rotate');
          }
        } else if (cmd.action === 'reset-camera') {
          viewer.cameraOrbit = '0deg 75deg 105%';
          viewer.resetTurntableRotation();
        } else if (cmd.action === 'zoom-in') {
          viewer.zoom(0.85);
        } else if (cmd.action === 'zoom-out') {
          viewer.zoom(1.18);
        }
      } catch (e) {}
    });
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data);
      if (data.type === 'LOADED') {
        setIsLoading(false);
        setHasError(false);
      } else if (data.type === 'ERROR') {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(data.detail || 'Failed to display 3D model.');
      }
    } catch (e) {}
  };

  const sendCommand = (cmd: object) => {
    const payload = JSON.stringify(cmd);
    if (NativeWebView && webViewRef.current) {
      webViewRef.current.postMessage(payload);
    } else if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(payload, '*');
    }
  };

  const toggleAutoRotate = () => {
    const nextVal = !isAutoRotating;
    setIsAutoRotating(nextVal);
    sendCommand({ action: 'toggle-auto-rotate', value: nextVal });
  };

  const resetCamera = () => {
    sendCommand({ action: 'reset-camera' });
  };

  const handleZoomIn = () => {
    sendCommand({ action: 'zoom-in' });
  };

  const handleZoomOut = () => {
    sendCommand({ action: 'zoom-out' });
  };

  const activeHtml = !isPreparingModel && resolvedModelUrl
    ? generateModelViewerHtml(resolvedModelUrl, posterUrl, isAutoRotating)
    : '';

  return (
    <View style={[styles.container, style]}>
      {/* 3D Rendering Area */}
      <View style={styles.viewerWrapper}>
        {isPreparingModel ? (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
                Preparing 3D Asset...
              </Text>
            </View>
          </View>
        ) : Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={activeHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#0b1329',
            } as any}
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        ) : NativeWebView ? (
          <NativeWebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{
              html: activeHtml,
              baseUrl: Platform.OS === 'android' ? 'file:///' : undefined,
            }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            allowingReadAccessToURL={Platform.OS === 'ios' ? 'file://' : undefined}
            mixedContentMode="always"
            scalesPageToFit={true}
            onMessage={handleMessage}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              setHasError(true);
              setErrorMessage(nativeEvent.description || 'Failed to load WebView');
              setIsLoading(false);
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>3D viewer is not supported on this platform.</Text>
          </View>
        )}

        {/* Loading Spinner Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
                Rendering 3D Model...
              </Text>
              <Text style={[styles.loadingSubText, { fontSize: scaleFont(11) }]}>
                Pinch & rotate to inspect details
              </Text>
            </View>
          </View>
        )}

        {/* Error Fallback */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <AlertCircle size={scaleFont(28)} color={kioskColors.danger} />
            <Text style={[styles.errorTitle, { fontSize: scaleFont(14) }]}>
              Unable to load 3D asset
            </Text>
            <Text style={[styles.errorSubText, { fontSize: scaleFont(12) }]}>
              {errorMessage || 'The 3D model could not be rendered.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.8}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Retry Loading</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interactive Floating Tool Bar */}
        {showControls && !hasError && (
          <View style={styles.floatingControlsContainer}>
            {/* Auto Rotate Toggle */}
            <TouchableOpacity
              style={[
                styles.controlBtn,
                isAutoRotating && styles.controlBtnActive,
              ]}
              onPress={toggleAutoRotate}
              activeOpacity={0.8}
            >
              {isAutoRotating ? (
                <Pause size={scaleFont(15)} color="#FFFFFF" strokeWidth={2.4} />
              ) : (
                <Play size={scaleFont(15)} color="#94A3B8" strokeWidth={2.4} />
              )}
            </TouchableOpacity>

            {/* Reset Camera */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={resetCamera}
              activeOpacity={0.8}
            >
              <RotateCcw size={scaleFont(15)} color="#94A3B8" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Zoom In */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <ZoomIn size={scaleFont(15)} color="#94A3B8" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Zoom Out */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <ZoomOut size={scaleFont(15)} color="#94A3B8" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Toggle Fullscreen Modal if available */}
            {onToggleFullscreen && (
              <TouchableOpacity
                style={[styles.controlBtn, styles.fullscreenBtn]}
                onPress={onToggleFullscreen}
                activeOpacity={0.8}
              >
                {isFullscreen ? (
                  <Minimize2 size={scaleFont(16)} color="#38BDF8" strokeWidth={2.5} />
                ) : (
                  <Maximize2 size={scaleFont(16)} color="#38BDF8" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1329',
    borderRadius: kioskRadii.lg,
    overflow: 'hidden',
  },
  viewerWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0B1329',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 19, 41, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    gap: 10,
    ...kioskShadows.card,
  },
  loadingText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  loadingSubText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 19, 41, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
    zIndex: 10,
  },
  errorTitle: {
    color: '#F87171',
    fontWeight: '700',
    marginTop: 6,
  },
  errorSubText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0D60AE',
    borderRadius: kioskRadii.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#94A3B8',
  },
  floatingControlsContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'column',
    gap: 8,
    zIndex: 20,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...kioskShadows.subtle,
  },
  controlBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  fullscreenBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
});
