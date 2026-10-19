import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  PanResponder,
  GestureResponderEvent,
  TextInput,
  Keyboard,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Trash2,
  Edit3,
  Eraser,
  Check,
  Undo,
  X,
  Keyboard as KeyboardIcon,
  Plus,
  Move,
} from 'lucide-react-native';
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

export interface WhiteboardTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export type ToolMode = 'pen' | 'text' | 'eraser';

type WhiteboardAction =
  | { type: 'stroke'; stroke: PathData }
  | { type: 'text'; item: WhiteboardTextItem };

const COLORS = [
  '#0D60AE', // Excel Blue
  '#0F172A', // Dark Navy
  '#DC2626', // Red
  '#16A34A', // Green
  '#D97706', // Gold / Amber
  '#9333EA', // Purple
];

const BRUSH_SIZES = [2, 4, 8, 14];

const FONT_SIZES = [
  { label: 'S', size: 16 },
  { label: 'M', size: 22 },
  { label: 'L', size: 30 },
  { label: 'XL', size: 40 },
];

// Global persistent in-memory storage preserved across both orientations (Portrait & Landscape)
let globalWhiteboardMemory: PathData[] = [];
let globalWhiteboardTextMemory: WhiteboardTextItem[] = [];

/**
 * Retrieves current drawing memory
 */
export function getWhiteboardMemory(): PathData[] {
  return [...globalWhiteboardMemory];
}

/**
 * Retrieves current text items memory
 */
export function getWhiteboardTextMemory(): WhiteboardTextItem[] {
  return [...globalWhiteboardTextMemory];
}

/**
 * Erases all whiteboard memory explicitly
 */
export function clearWhiteboardMemory(): void {
  globalWhiteboardMemory = [];
  globalWhiteboardTextMemory = [];
}

/**
 * Memoized container for completed strokes to avoid re-rendering existing paths on every touch move
 */
const CompletedStrokes = React.memo<{ paths: PathData[] }>(({ paths }) => {
  return (
    <>
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
    </>
  );
});

/**
 * Draggable Canvas Text Item Component
 * Allows dragging displayed text anywhere across the whiteboard canvas in real-time
 */
interface DraggableCanvasTextProps {
  item: WhiteboardTextItem;
  toolMode: ToolMode;
  onPress: () => void;
  onMoveEnd: (id: string, newX: number, newY: number) => void;
  crispTextProps: any;
}

const DraggableCanvasText: React.FC<DraggableCanvasTextProps> = ({
  item,
  toolMode,
  onPress,
  onMoveEnd,
  crispTextProps,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;
  const currentPos = useRef({ x: item.x, y: item.y });
  const isDraggingRef = useRef(false);

  // Synchronize position if updated from parent
  useEffect(() => {
    pan.setValue({ x: item.x, y: item.y });
    currentPos.current = { x: item.x, y: item.y };
  }, [item.x, item.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => toolMode === 'text' || toolMode === 'eraser',
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          toolMode === 'text' &&
          (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3)
        );
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
          isDraggingRef.current = true;
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDraggingRef.current) {
          // Tap without dragging
          onPress();
        } else {
          // Drag finished: update persisted position
          const newX = Math.max(8, currentPos.current.x + gestureState.dx);
          const newY = Math.max(8, currentPos.current.y + gestureState.dy);
          currentPos.current = { x: newX, y: newY };
          onMoveEnd(item.id, newX, newY);
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      {...(toolMode !== 'pen' ? panResponder.panHandlers : {})}
      style={[
        styles.stampedTextContainer,
        {
          transform: pan.getTranslateTransform(),
          backgroundColor: toolMode === 'text' ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          borderColor:
            toolMode === 'text'
              ? '#93C5FD'
              : toolMode === 'eraser'
              ? '#FCA5A5'
              : 'transparent',
          borderWidth: toolMode === 'pen' ? 0 : 1,
          borderStyle: toolMode === 'text' ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text
        style={{
          fontSize: item.fontSize,
          color: item.color,
          fontWeight: '700',
          includeFontPadding: false,
        }}
        {...crispTextProps}
      >
        {item.text}
      </Text>

    </Animated.View>
  );
};

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ visible, onClose }) => {
  const metrics = useKioskResponsive();
  const { isLandscape, scaleFont, crispTextProps } = metrics;

  // Active Tool Mode: 'pen' | 'text' | 'eraser'
  const [toolMode, setToolMode] = useState<ToolMode>('pen');

  // Drawing state
  const [paths, setPaths] = useState<PathData[]>(() => [...globalWhiteboardMemory]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#0D60AE');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);

  // Text Items state
  const [textItems, setTextItems] = useState<WhiteboardTextItem[]>(() => [...globalWhiteboardTextMemory]);
  const [selectedFontSize, setSelectedFontSize] = useState<number>(22);

  // In-Place Active Text Draft
  const [activeTextDraft, setActiveTextDraft] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    isExisting: boolean;
  } | null>(null);

  // Action history for clean Undo
  const [actionHistory, setActionHistory] = useState<WhiteboardAction[]>([]);

  // Synchronize with global memory whenever modal becomes visible or orientation shifts
  useEffect(() => {
    if (visible) {
      setPaths([...globalWhiteboardMemory]);
      setTextItems([...globalWhiteboardTextMemory]);
      setActiveTextDraft(null);
    }
  }, [visible, isLandscape]);

  const activeStrokeColor = toolMode === 'eraser' ? '#FFFFFF' : selectedColor;
  const activeStrokeWidth = toolMode === 'eraser' ? strokeWidth * 3 : strokeWidth;

  // Mutable refs to prevent stale closures and manage high-frequency events
  const toolModeRef = useRef<ToolMode>(toolMode);
  const currentPathRef = useRef<string>('');
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeColorRef = useRef<string>(activeStrokeColor);
  const activeWidthRef = useRef<number>(activeStrokeWidth);
  const rafRef = useRef<number | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Keep refs synchronized
  useEffect(() => {
    toolModeRef.current = toolMode;
  }, [toolMode]);

  useEffect(() => {
    activeColorRef.current = toolMode === 'eraser' ? '#FFFFFF' : selectedColor;
    activeWidthRef.current = toolMode === 'eraser' ? strokeWidth * 3 : strokeWidth;
  }, [toolMode, selectedColor, strokeWidth]);

  // Clean up pending animation frames on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Update text position when dragged across the canvas
  const handleMoveTextItem = (id: string, newX: number, newY: number) => {
    setTextItems((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, x: newX, y: newY } : t));
      globalWhiteboardTextMemory = updated;
      return updated;
    });
  };

  // Commit typed text directly in-place to whiteboard canvas
  const handleCommitDraft = () => {
    if (!activeTextDraft) return;
    const trimmed = activeTextDraft.text.trim();
    if (trimmed.length === 0) {
      if (activeTextDraft.isExisting) {
        setTextItems((prev) => {
          const updated = prev.filter((t) => t.id !== activeTextDraft.id);
          globalWhiteboardTextMemory = updated;
          return updated;
        });
      }
      setActiveTextDraft(null);
      return;
    }

    const newItem: WhiteboardTextItem = {
      id: activeTextDraft.id,
      text: trimmed,
      x: activeTextDraft.x,
      y: activeTextDraft.y,
      color: activeTextDraft.color,
      fontSize: activeTextDraft.fontSize,
    };

    setTextItems((prev) => {
      const exists = prev.some((t) => t.id === newItem.id);
      const updated = exists ? prev.map((t) => (t.id === newItem.id ? newItem : t)) : [...prev, newItem];
      globalWhiteboardTextMemory = updated;
      return updated;
    });

    if (!activeTextDraft.isExisting) {
      setActionHistory((prev) => [...prev, { type: 'text', item: newItem }]);
    }

    setActiveTextDraft(null);
    Keyboard.dismiss();
  };

  // Open in-place text editor directly on canvas screen
  const handleOpenTextEditor = (x: number, y: number, existingItem?: WhiteboardTextItem) => {
    if (activeTextDraft && activeTextDraft.text.trim().length > 0) {
      handleCommitDraft();
    }

    if (existingItem) {
      setActiveTextDraft({
        id: existingItem.id,
        text: existingItem.text,
        x: existingItem.x,
        y: existingItem.y,
        color: existingItem.color,
        fontSize: existingItem.fontSize,
        isExisting: true,
      });
    } else {
      setActiveTextDraft({
        id: Date.now().toString(),
        text: '',
        x: Math.max(16, Math.min(x, (isLandscape ? 900 : 400) - 150)),
        y: Math.max(16, y),
        color: selectedColor,
        fontSize: selectedFontSize,
        isExisting: false,
      });
    }
  };

  // Delete an existing text item
  const handleDeleteDraft = () => {
    if (activeTextDraft && activeTextDraft.isExisting) {
      setTextItems((prev) => {
        const updated = prev.filter((t) => t.id !== activeTextDraft.id);
        globalWhiteboardTextMemory = updated;
        return updated;
      });
      setActionHistory((prev) => prev.filter((a) => !(a.type === 'text' && a.item.id === activeTextDraft.id)));
    }
    setActiveTextDraft(null);
    Keyboard.dismiss();
  };

  // Color picker change handler
  const handleSelectColor = (c: string) => {
    setSelectedColor(c);
    if (activeTextDraft) {
      setActiveTextDraft((prev) => (prev ? { ...prev, color: c } : null));
    }
  };

  // Font size change handler
  const handleSelectFontSize = (size: number) => {
    setSelectedFontSize(size);
    if (activeTextDraft) {
      setActiveTextDraft((prev) => (prev ? { ...prev, fontSize: size } : null));
    }
  };

  // Canvas PanResponder for smooth drawing gestures and canvas tap-to-type
  const canvasPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => toolModeRef.current !== 'text',
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        touchStartPosRef.current = { x: locationX, y: locationY };
        hasMovedRef.current = false;

        if (toolModeRef.current === 'text') {
          return;
        }

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const startPoint = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        currentPathRef.current = startPoint;
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentPath(startPoint);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (toolModeRef.current === 'text') {
          const start = touchStartPosRef.current;
          if (start) {
            const dx = locationX - start.x;
            const dy = locationY - start.y;
            if (dx * dx + dy * dy > 25) {
              hasMovedRef.current = true;
            }
          }
          return;
        }

        const last = lastPointRef.current;
        if (!last) {
          lastPointRef.current = { x: locationX, y: locationY };
          return;
        }

        const dx = locationX - last.x;
        const dy = locationY - last.y;
        if (dx * dx + dy * dy < 6.25) {
          return;
        }

        hasMovedRef.current = true;
        const midX = ((last.x + locationX) / 2).toFixed(1);
        const midY = ((last.y + locationY) / 2).toFixed(1);
        currentPathRef.current += ` Q ${last.x.toFixed(1)} ${last.y.toFixed(1)} ${midX} ${midY}`;
        lastPointRef.current = { x: locationX, y: locationY };

        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            setCurrentPath(currentPathRef.current);
            rafRef.current = null;
          });
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (toolModeRef.current === 'text') {
          if (!hasMovedRef.current) {
            handleOpenTextEditor(locationX, locationY);
          }
          touchStartPosRef.current = null;
          return;
        }

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        let finalPath = currentPathRef.current;
        const last = lastPointRef.current;

        if (last && (!hasMovedRef.current || (!finalPath.includes('Q') && !finalPath.includes('L')))) {
          finalPath = `M ${(last.x - 0.5).toFixed(1)} ${(last.y - 0.5).toFixed(1)} L ${(last.x + 0.5).toFixed(1)} ${(last.y + 0.5).toFixed(1)}`;
        } else if (last && hasMovedRef.current) {
          finalPath += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
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
          setActionHistory((prev) => [...prev, { type: 'stroke', stroke: newStroke }]);
        }
        currentPathRef.current = '';
        lastPointRef.current = null;
        hasMovedRef.current = false;
        setCurrentPath('');
      },
      onPanResponderTerminate: () => {
        if (toolModeRef.current === 'text') {
          touchStartPosRef.current = null;
          return;
        }
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        currentPathRef.current = '';
        lastPointRef.current = null;
        hasMovedRef.current = false;
        setCurrentPath('');
      },
    })
  ).current;

  // Delete / Clear all drawings and texts currently on the whiteboard
  const handleClear = () => {
    globalWhiteboardMemory = [];
    globalWhiteboardTextMemory = [];
    setPaths([]);
    setTextItems([]);
    setActionHistory([]);
    setActiveTextDraft(null);
    setCurrentPath('');
  };

  // Undo the last stroke or text item from memory
  const handleUndo = () => {
    if (activeTextDraft) {
      setActiveTextDraft(null);
      Keyboard.dismiss();
    }

    if (actionHistory.length === 0) {
      if (paths.length > 0) {
        setPaths((prev) => {
          const updated = prev.slice(0, -1);
          globalWhiteboardMemory = updated;
          return updated;
        });
      }
      return;
    }

    const lastAction = actionHistory[actionHistory.length - 1];
    setActionHistory((prev) => prev.slice(0, -1));

    if (lastAction.type === 'stroke') {
      setPaths((prev) => {
        const updated = prev.slice(0, -1);
        globalWhiteboardMemory = updated;
        return updated;
      });
    } else if (lastAction.type === 'text') {
      setTextItems((prev) => {
        const updated = prev.filter((t) => t.id !== lastAction.item.id);
        globalWhiteboardTextMemory = updated;
        return updated;
      });
    }
  };

  /**
   * When clicking Done:
   * Erase all memory completely and close modal
   */
  const handleDone = () => {
    globalWhiteboardMemory = [];
    globalWhiteboardTextMemory = [];
    setPaths([]);
    setTextItems([]);
    setActionHistory([]);
    setActiveTextDraft(null);
    setCurrentPath('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleDone}>
      <View style={styles.container}>
        {/* Top Control Toolbar */}
        <View style={styles.toolbarWrapper}>
          {/* Row 1: Header Title & Action Buttons (Undo, Delete All, Done) */}
          <View style={styles.toolbarHeaderRow}>
            <View style={styles.titleWrapper}>
              <Edit3 size={scaleFont(18)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.titleText, { fontSize: scaleFont(15) }]} {...crispTextProps}>
                Digital Whiteboard
              </Text>

              {/* Mode indicator badge */}
              <View
                style={[
                  styles.modeBadge,
                  toolMode === 'pen' && styles.modeBadgePen,
                  toolMode === 'text' && styles.modeBadgeText,
                  toolMode === 'eraser' && styles.modeBadgeEraser,
                ]}
              >
                <Text
                  style={[
                    styles.modeBadgeLabel,
                    toolMode === 'pen' && styles.modeBadgeLabelPen,
                    toolMode === 'text' && styles.modeBadgeLabelText,
                    toolMode === 'eraser' && styles.modeBadgeLabelEraser,
                  ]}
                  {...crispTextProps}
                >
                  {toolMode === 'pen' ? 'Draw Mode' : toolMode === 'text' ? 'Type & Drag Mode' : 'Eraser Mode'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                onPress={handleUndo}
                style={styles.actionIconBtn}
                accessible={true}
                accessibilityLabel="Undo last action"
              >
                <Undo size={scaleFont(16)} color={kioskColors.textSecondary} strokeWidth={2.4} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClear}
                style={styles.actionIconBtnDanger}
                accessible={true}
                accessibilityLabel="Delete all drawings and text"
              >
                <Trash2 size={scaleFont(15)} color={kioskColors.danger} strokeWidth={2.4} />
                <Text style={[styles.clearText, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                  Delete All
                </Text>
              </TouchableOpacity>

              {/* Done Button: Finishes and clears memory */}
              <TouchableOpacity
                onPress={handleDone}
                style={styles.doneBtn}
                accessible={true}
                accessibilityLabel="Done and close whiteboard"
              >
                <Check size={scaleFont(16)} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={[styles.doneBtnText, { fontSize: scaleFont(13) }]} {...crispTextProps}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Tool Switchers & Controls */}
          <View style={styles.toolsRow}>
            {/* Primary Tool Switchers: Draw (Pen), Type (Keyboard & Drag), Eraser */}
            <View style={styles.toolModeGroup}>
              {/* Draw Tool */}
              <TouchableOpacity
                onPress={() => {
                  if (activeTextDraft) handleCommitDraft();
                  setToolMode('pen');
                }}
                style={[styles.toolBtn, toolMode === 'pen' && styles.toolBtnActive]}
                accessible={true}
                accessibilityLabel="Draw with pen"
              >
                <Edit3
                  size={scaleFont(16)}
                  color={toolMode === 'pen' ? kioskColors.accentBlue : kioskColors.textSecondary}
                  strokeWidth={toolMode === 'pen' ? 2.5 : kioskIcons.strokeWidth}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    toolMode === 'pen' && styles.toolBtnTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                  {...crispTextProps}
                >
                  Draw
                </Text>
              </TouchableOpacity>

              {/* Type / Keyboard Tool */}
              <TouchableOpacity
                onPress={() => setToolMode('text')}
                style={[styles.toolBtn, toolMode === 'text' && styles.toolBtnActive]}
                accessible={true}
                accessibilityLabel="Type and drag text anywhere"
              >
                <KeyboardIcon
                  size={scaleFont(16)}
                  color={toolMode === 'text' ? kioskColors.accentBlue : kioskColors.textSecondary}
                  strokeWidth={toolMode === 'text' ? 2.5 : kioskIcons.strokeWidth}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    toolMode === 'text' && styles.toolBtnTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                  {...crispTextProps}
                >
                  Type / Move
                </Text>
              </TouchableOpacity>

              {/* Eraser Tool */}
              <TouchableOpacity
                onPress={() => {
                  if (activeTextDraft) handleCommitDraft();
                  setToolMode('eraser');
                }}
                style={[styles.toolBtn, toolMode === 'eraser' && styles.toolBtnActive]}
                accessible={true}
                accessibilityLabel="Eraser mode"
              >
                <Eraser
                  size={scaleFont(16)}
                  color={toolMode === 'eraser' ? kioskColors.accentBlue : kioskColors.textSecondary}
                  strokeWidth={toolMode === 'eraser' ? 2.5 : kioskIcons.strokeWidth}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    toolMode === 'eraser' && styles.toolBtnTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                  {...crispTextProps}
                >
                  Eraser
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Quick "+ Add Text" Button when in Type Mode */}
            {toolMode === 'text' && (
              <>
                <TouchableOpacity
                  onPress={() => handleOpenTextEditor(60, 60)}
                  style={styles.addTextBtn}
                  accessible={true}
                  accessibilityLabel="Add new text note in place"
                >
                  <Plus size={scaleFont(15)} color="#FFFFFF" strokeWidth={2.6} />
                  <Text style={[styles.addTextBtnLabel, { fontSize: scaleFont(12) }]} {...crispTextProps}>
                    + Add Text
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />
              </>
            )}

            {/* Color Palette (Active for Draw & Type modes) */}
            {toolMode !== 'eraser' && (
              <View style={styles.colorPalette}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => handleSelectColor(c)}
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

            {/* Brush Sizes (Pen Mode) */}
            {toolMode === 'pen' && (
              <View style={styles.sizePalette}>
                {BRUSH_SIZES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStrokeWidth(s)}
                    accessible={true}
                    accessibilityLabel={`Brush size ${s}`}
                    style={[styles.sizeDotContainer, strokeWidth === s && styles.sizeDotSelected]}
                  >
                    <View
                      style={[
                        styles.sizeDot,
                        { width: s + 4, height: s + 4, backgroundColor: activeStrokeColor },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Font Sizes (Type Mode) */}
            {toolMode === 'text' && (
              <View style={styles.fontSizeGroup}>
                <Text style={styles.fontSizeLabel}>Size:</Text>
                {FONT_SIZES.map(({ label, size }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => handleSelectFontSize(size)}
                    style={[
                      styles.fontSizeChip,
                      selectedFontSize === size && styles.fontSizeChipSelected,
                    ]}
                    accessible={true}
                    accessibilityLabel={`Font size ${label}`}
                  >
                    <Text
                      style={[
                        styles.fontSizeChipText,
                        selectedFontSize === size && styles.fontSizeChipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Eraser Thickness (Eraser Mode) */}
            {toolMode === 'eraser' && (
              <View style={styles.sizePalette}>
                {[4, 8, 14].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStrokeWidth(s)}
                    accessible={true}
                    accessibilityLabel={`Eraser width ${s}`}
                    style={[styles.sizeDotContainer, strokeWidth === s && styles.sizeDotSelected]}
                  >
                    <View
                      style={[
                        styles.sizeDot,
                        { width: s + 6, height: s + 6, backgroundColor: '#94A3B8' },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Whiteboard Interactive Canvas Area */}
        <View style={styles.canvasContainer}>
          {/* Base drawing canvas layer with panResponder */}
          <View style={StyleSheet.absoluteFill} {...canvasPanResponder.panHandlers} collapsable={false}>
            {/* SVG Strokes Layer */}
            <Svg style={StyleSheet.absoluteFill}>
              <CompletedStrokes paths={paths} />
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={activeStrokeColor}
                  strokeWidth={activeStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>

          {/* Interactive Draggable Text Layer */}
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents={toolMode === 'pen' ? 'none' : 'box-none'}
          >
            {/* Displayed Text Items (Draggable anywhere on canvas) */}
            {textItems
              .filter((item) => !activeTextDraft || item.id !== activeTextDraft.id)
              .map((item) => (
                <DraggableCanvasText
                  key={item.id}
                  item={item}
                  toolMode={toolMode}
                  crispTextProps={crispTextProps}
                  onMoveEnd={handleMoveTextItem}
                  onPress={() => {
                    if (toolMode === 'eraser') {
                      setTextItems((prev) => {
                        const updated = prev.filter((t) => t.id !== item.id);
                        globalWhiteboardTextMemory = updated;
                        return updated;
                      });
                      setActionHistory((prev) => prev.filter((a) => !(a.type === 'text' && a.item.id === item.id)));
                    } else if (toolMode === 'text') {
                      handleOpenTextEditor(item.x, item.y, item);
                    }
                  }}
                />
              ))}

            {/* In-Place Active Typing Box (Directly on canvas screen, NO popup modal) */}
            {activeTextDraft && (
              <View
                style={[
                  styles.inlineTextEditorContainer,
                  {
                    left: activeTextDraft.x,
                    top: activeTextDraft.y,
                  },
                ]}
              >
                {/* Floating mini action bar directly attached to the in-place text box */}
                <View style={styles.inlineMiniActionBar}>
                  <View style={styles.inlineTypeTag}>
                    <KeyboardIcon size={12} color="#0D60AE" />
                    <Text style={styles.inlineTypeTagText}>Typing Note</Text>
                  </View>

                  <View style={styles.inlineButtonsRow}>
                    <TouchableOpacity
                      onPress={handleCommitDraft}
                      style={styles.inlineCommitBtn}
                      accessible={true}
                      accessibilityLabel="Done typing"
                    >
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.inlineCommitBtnText}>Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleDeleteDraft}
                      style={styles.inlineCancelBtn}
                      accessible={true}
                      accessibilityLabel="Cancel note"
                    >
                      <X size={14} color={kioskColors.danger} strokeWidth={2.6} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Direct In-Place TextInput */}
                <TextInput
                  style={[
                    styles.inlineTextInput,
                    {
                      fontSize: activeTextDraft.fontSize,
                      color: activeTextDraft.color,
                    },
                  ]}
                  placeholder="Type note here..."
                  placeholderTextColor="#94A3B8"
                  value={activeTextDraft.text}
                  onChangeText={(val) =>
                    setActiveTextDraft((prev) => (prev ? { ...prev, text: val } : null))
                  }
                  autoFocus={true}
                  multiline={true}
                  returnKeyType="default"
                  blurOnSubmit={false}
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
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.full,
    marginLeft: 4,
  },
  modeBadgePen: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modeBadgeText: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modeBadgeEraser: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modeBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  modeBadgeLabelPen: {
    color: '#1D4ED8',
  },
  modeBadgeLabelText: {
    color: '#15803D',
  },
  modeBadgeLabelEraser: {
    color: '#B91C1C',
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
  toolsRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 10,
    backgroundColor: '#FAFAFA',
    flexWrap: 'wrap',
  },
  toolModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: '#EFF6FF',
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  toolBtnTextActive: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
  },
  addTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: kioskColors.accentBlue,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: kioskRadii.md,
    shadowColor: kioskColors.accentBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addTextBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    transform: [{ scale: 1.15 }],
  },
  sizePalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeDotContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  fontSizeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fontSizeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: kioskColors.textSecondary,
    marginRight: 2,
  },
  fontSizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minWidth: 28,
    alignItems: 'center',
  },
  fontSizeChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: kioskColors.accentBlue,
  },
  fontSizeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: kioskColors.textSecondary,
  },
  fontSizeChipTextSelected: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stampedTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineTextEditorContainer: {
    position: 'absolute',
    minWidth: 180,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: kioskColors.accentBlue,
    borderRadius: kioskRadii.md,
    padding: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  inlineMiniActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  inlineTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D60AE',
  },
  inlineButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCommitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: kioskRadii.sm,
  },
  inlineCommitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  inlineCancelBtn: {
    width: 24,
    height: 24,
    borderRadius: kioskRadii.sm,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTextInput: {
    minHeight: 40,
    padding: 4,
    textAlignVertical: 'top',
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
    borderRadius: kioskRadii.sm,
  },
});
