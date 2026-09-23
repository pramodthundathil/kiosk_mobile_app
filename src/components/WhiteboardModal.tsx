import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Trash2, Edit3, Eraser, Check, Undo, X } from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';
import { useKioskResponsive } from '../hooks/useKioskResponsive';

interface WhiteboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface PathData {
  d: string;
  color: string;
  strokeWidth: number;
}

const COLORS = [
  '#0D60AE', // Excel Blue
  '#0F172A', // Dark Navy
  '#DC2626', // Red
  '#16A34A', // Green
  '#D97706', // Gold / Amber
  '#9333EA', // Purple
];

const BRUSH_SIZES = [2, 4, 8, 14];

// Global persistent in-memory storage preserved across both orientations (Portrait & Landscape)
let globalWhiteboardMemory: PathData[] = [];

/**
 * Retrieves the current drawing memory (useful for testing or external access)
 */
export function getWhiteboardMemory(): PathData[] {
  return [...globalWhiteboardMemory];
}

/**
 * Erases the whiteboard memory explicitly
 */
export function clearWhiteboardMemory(): void {
  globalWhiteboardMemory = [];
}

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ visible, onClose }) => {
  const metrics = useKioskResponsive();
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;

  // Initialize paths from global persistent memory
  const [paths, setPaths] = useState<PathData[]>(() => [...globalWhiteboardMemory]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#0D60AE');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  // Synchronize with global memory whenever modal becomes visible or orientation shifts
  useEffect(() => {
    if (visible) {
      setPaths([...globalWhiteboardMemory]);
    }
  }, [visible, isLandscape]);

  const activeColor = isEraser ? '#FFFFFF' : selectedColor;
  const activeWidth = isEraser ? strokeWidth * 3 : strokeWidth;

  // Mutable refs to prevent stale closures in PanResponder callbacks
  const currentPathRef = useRef<string>('');
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeColorRef = useRef<string>(activeColor);
  const activeWidthRef = useRef<number>(activeWidth);

  // Keep refs synchronized with active tools
  useEffect(() => {
    activeColorRef.current = isEraser ? '#FFFFFF' : selectedColor;
    activeWidthRef.current = isEraser ? strokeWidth * 3 : strokeWidth;
  }, [isEraser, selectedColor, strokeWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const startPoint = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        currentPathRef.current = startPoint;
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentPath(startPoint);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const nextSegment = ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        currentPathRef.current += nextSegment;
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderRelease: () => {
        let finalPath = currentPathRef.current;
        // If user tapped without moving (e.g. dotting an 'i' or period '.'), add tiny segment to draw the dot
        if (finalPath && !finalPath.includes('L') && lastPointRef.current) {
          finalPath += ` L ${(lastPointRef.current.x + 0.2).toFixed(1)} ${(lastPointRef.current.y + 0.2).toFixed(1)}`;
        }
        if (finalPath && finalPath.length > 0) {
          const newStroke: PathData = {
            d: finalPath,
            color: activeColorRef.current,
            strokeWidth: activeWidthRef.current,
          };
          setPaths((prev) => {
            const updated = [...prev, newStroke];
            globalWhiteboardMemory = updated;
            return updated;
          });
        }
        currentPathRef.current = '';
        lastPointRef.current = null;
        setCurrentPath('');
      },
      onPanResponderTerminate: () => {
        let finalPath = currentPathRef.current;
        if (finalPath && !finalPath.includes('L') && lastPointRef.current) {
          finalPath += ` L ${(lastPointRef.current.x + 0.2).toFixed(1)} ${(lastPointRef.current.y + 0.2).toFixed(1)}`;
        }
        if (finalPath && finalPath.length > 0) {
          const newStroke: PathData = {
            d: finalPath,
            color: activeColorRef.current,
            strokeWidth: activeWidthRef.current,
          };
          setPaths((prev) => {
            const updated = [...prev, newStroke];
            globalWhiteboardMemory = updated;
            return updated;
          });
        }
        currentPathRef.current = '';
        lastPointRef.current = null;
        setCurrentPath('');
      },
    })
  ).current;

  // Delete / Clear all drawings currently in memory
  const handleClear = () => {
    globalWhiteboardMemory = [];
    setPaths([]);
    setCurrentPath('');
  };

  // Undo the last stroke from memory
  const handleUndo = () => {
    setPaths((prev) => {
      const updated = prev.slice(0, -1);
      globalWhiteboardMemory = updated;
      return updated;
    });
  };

  /**
   * When clicking Done:
   * 1. Erase all drawing memory completely
   * 2. Reset the canvas state
   * 3. Close the modal
   */
  const handleDone = () => {
    globalWhiteboardMemory = [];
    setPaths([]);
    setCurrentPath('');
    onClose();
  };

  /**
   * Close without erasing memory (allows resuming drawing later in both orientations)
   */
  const handleDismissKeepMemory = () => {
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleDone}>
      <View style={styles.container}>
        {/* Top Control Toolbar - Responsive across Portrait and Landscape */}
        <View style={styles.toolbarWrapper}>
          {/* Row 1: Header Title & Action Buttons (Undo, Delete All, Done) */}
          <View style={styles.toolbarHeaderRow}>
            <View style={styles.titleWrapper}>
              <Edit3 size={scaleFont(18)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.titleText, { fontSize: scaleFont(15) }]} {...crispTextProps}>
                Digital Whiteboard
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                onPress={handleUndo}
                style={styles.actionIconBtn}
                accessible={true}
                accessibilityLabel="Undo last stroke"
              >
                <Undo size={scaleFont(16)} color={kioskColors.textSecondary} strokeWidth={2.4} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClear}
                style={styles.actionIconBtnDanger}
                accessible={true}
                accessibilityLabel="Delete all drawings"
              >
                <Trash2 size={scaleFont(15)} color={kioskColors.danger} strokeWidth={2.4} />
                <Text style={[styles.clearText, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                  Delete All
                </Text>
              </TouchableOpacity>

              {/* Done Button: Deletes all saved drawing and finishes */}
              <TouchableOpacity
                onPress={handleDone}
                style={styles.doneBtn}
                accessible={true}
                accessibilityLabel="Done and delete all drawing"
              >
                <Check size={scaleFont(16)} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={[styles.doneBtnText, { fontSize: scaleFont(13) }]} {...crispTextProps}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Drawing Tools (Eraser, Colors, Brush Sizes) */}
          <View style={styles.toolsRow}>
            {/* Eraser Toggle */}
            <TouchableOpacity
              onPress={() => setIsEraser(!isEraser)}
              style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
              accessible={true}
              accessibilityLabel="Eraser mode"
            >
              <Eraser
                size={scaleFont(16)}
                color={isEraser ? kioskColors.accentBlue : kioskColors.textSecondary}
                strokeWidth={kioskIcons.strokeWidth}
              />
              <Text style={[styles.toolBtnText, isEraser && styles.toolBtnTextActive, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                Eraser
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Color Palette */}
            {!isEraser && (
              <View style={styles.colorPalette}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    accessible={true}
                    accessibilityLabel={`Select color ${c}`}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorDotSelected,
                    ]}
                  />
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* Brush Sizes */}
            <View style={styles.sizePalette}>
              {BRUSH_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStrokeWidth(s)}
                  accessible={true}
                  accessibilityLabel={`Brush size ${s}`}
                  style={[
                    styles.sizeDotContainer,
                    strokeWidth === s && styles.sizeDotSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      { width: s + 4, height: s + 4, backgroundColor: activeColor },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Drawing Canvas Area */}
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((p, idx) => (
              <Path
                key={idx}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={activeColor}
                strokeWidth={activeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
          </Svg>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  toolbarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  toolbarHeaderRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: kioskRadii.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: kioskRadii.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearText: {
    fontSize: 12,
    color: kioskColors.danger,
    fontWeight: '800',
  },
  memoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 6,
  },
  memoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D60AE',
  },
  memoryBadgeText: {
    color: '#0D60AE',
    fontWeight: '700',
    fontSize: 11,
    includeFontPadding: false,
  },
  dismissBtn: {
    width: 36,
    height: 36,
    borderRadius: kioskRadii.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 15,
    height: 36,
    borderRadius: kioskRadii.md,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  doneBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: kioskRadii.md,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  closeBtnText: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
  },
  toolsRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 12,
    backgroundColor: '#FAFAFA',
    flexWrap: 'wrap',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: kioskRadii.md,
  },
  toolBtnActive: {
    borderColor: kioskColors.accentBlue,
    backgroundColor: kioskColors.badgeBackground,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  toolBtnTextActive: {
    color: kioskColors.accentBlue,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    transform: [{ scale: 1.2 }],
  },
  sizePalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeDotContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sizeDotSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: kioskColors.accentBlue,
  },
  sizeDot: {
    borderRadius: 10,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
