import React, { useState, useRef } from 'react';
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
import { Trash2, Edit3, Eraser, Check, Undo } from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';

interface WhiteboardModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PathData {
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

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ visible, onClose }) => {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#0D60AE');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  const activeColor = isEraser ? '#FFFFFF' : selectedColor;
  const activeWidth = isEraser ? strokeWidth * 3 : strokeWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths((prev) => [
            ...prev,
            { d: currentPath, color: activeColor, strokeWidth: activeWidth },
          ]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Control Toolbar */}
        <View style={styles.toolbar}>
          {/* Left: Title */}
          <View style={styles.titleWrapper}>
            <Edit3 size={17} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
            <Text style={styles.titleText}>Digital Whiteboard</Text>
          </View>

          {/* Middle: Colors & Sizes */}
          <View style={styles.toolsGroup}>
            {/* Eraser Toggle */}
            <TouchableOpacity
              onPress={() => setIsEraser(!isEraser)}
              style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
            >
              <Eraser size={15} color={isEraser ? kioskColors.accentBlue : kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.toolBtnText, isEraser && styles.toolBtnTextActive]}>
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
                  style={[
                    styles.sizeDotContainer,
                    strokeWidth === s && styles.sizeDotSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      { width: s + 3, height: s + 3, backgroundColor: activeColor },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Right: Actions (Undo, Clear, Done) */}
          <View style={styles.actionGroup}>
            <TouchableOpacity onPress={handleUndo} style={styles.actionIconBtn}>
              <Undo size={15} color={kioskColors.textSecondary} strokeWidth={kioskIcons.strokeWidth} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClear} style={styles.actionIconBtnDanger}>
              <Trash2 size={14} color={kioskColors.danger} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Check size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
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
  toolbar: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  toolsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: kioskRadii.sm,
  },
  toolBtnActive: {
    borderColor: kioskColors.accentBlue,
    backgroundColor: kioskColors.badgeBackground,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  toolBtnTextActive: {
    color: kioskColors.accentBlue,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
    transform: [{ scale: 1.2 }],
  },
  sizePalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeDotContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeDotSelected: {
    backgroundColor: '#E2E8F0',
  },
  sizeDot: {
    borderRadius: 10,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearText: {
    fontSize: 11,
    color: kioskColors.danger,
    fontWeight: '700',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: kioskRadii.sm,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  closeBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
