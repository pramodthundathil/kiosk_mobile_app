// ── Curated Kiosk Color Combinations ──
// Sourced from official Excel Electrical Earthing design palette.
// Unified across Categories and Products on both Portrait and Landscape displays.

export interface KioskColorCombo {
  bg: string;          // Card background soft pastel tone
  arrowBg: string;     // Arrow / chevron circular button background
  borderColor: string; // Subtle card border
  accent: string;      // Accent / highlight color
  textColor: string;   // Card heading text color
  badgeBg?: string;    // Badge background
  badgeText?: string;  // Badge text
}

export const KIOSK_COLOR_COMBOS: KioskColorCombo[] = [
  {
    bg: '#F0F7FF',         // Soft Sky Blue (Card 1: Earth Electrodes)
    arrowBg: '#0D60AE',    // Vibrant Brand Blue
    borderColor: '#BFDBFE',
    accent: '#0284C7',
    textColor: '#0F172A',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
  {
    bg: '#FFF6F0',         // Warm Peach / Copper (Card 2: Accessories)
    arrowBg: '#B45309',    // Terracotta Copper
    borderColor: '#FED7AA',
    accent: '#C2410C',
    textColor: '#0F172A',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
  },
  {
    bg: '#F0FDF4',         // Clean Mint Green (Card 3: Earthing Conductors)
    arrowBg: '#16A34A',    // Emerald Green
    borderColor: '#BBF7D0',
    accent: '#15803D',
    textColor: '#0F172A',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
  },
  {
    bg: '#F5F3FF',         // Slate Lavender (Card 4: Earth Enhancement)
    arrowBg: '#6366F1',    // Indigo / Violet
    borderColor: '#DDD6FE',
    accent: '#4F46E5',
    textColor: '#0F172A',
    badgeBg: '#EDE9FE',
    badgeText: '#4338CA',
  },
  {
    bg: '#FFF7ED',         // Warm Amber (Card 5: Lightning Protection)
    arrowBg: '#D97706',    // Amber Gold
    borderColor: '#FDE68A',
    accent: '#B45309',
    textColor: '#0F172A',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  {
    bg: '#F8FAFC',         // Crisp Slate (Card 6: Inspection Chambers)
    arrowBg: '#475569',    // Slate Neutral
    borderColor: '#CBD5E1',
    accent: '#334155',
    textColor: '#0F172A',
    badgeBg: '#E2E8F0',
    badgeText: '#1E293B',
  },
  {
    bg: '#ECFDF5',         // Teal Cyan (Card 7: Earthing Strips & Bars)
    arrowBg: '#059669',    // Rich Teal
    borderColor: '#A7F3D0',
    accent: '#047857',
    textColor: '#0F172A',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
  {
    bg: '#FAF5FF',         // Royal Lilac (Card 8: Testing & Monitoring)
    arrowBg: '#9333EA',    // Purple Accent
    borderColor: '#E9D5FF',
    accent: '#7E22CE',
    textColor: '#0F172A',
    badgeBg: '#F3E8FF',
    badgeText: '#6B21A8',
  },
];

/**
 * Get a deterministic, well-distributed color combination for dynamic items.
 * Uses index if available so adjacent items always alternate colors smoothly,
 * or hashes the ID/string if index is not provided.
 */
export const getColorCombo = (identifier?: string | number, index?: number): KioskColorCombo => {
  if (typeof index === 'number' && index >= 0) {
    return KIOSK_COLOR_COMBOS[index % KIOSK_COLOR_COMBOS.length];
  }
  if (typeof identifier === 'number') {
    return KIOSK_COLOR_COMBOS[Math.abs(identifier) % KIOSK_COLOR_COMBOS.length];
  }
  if (typeof identifier === 'string' && identifier.length > 0) {
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = (hash << 5) - hash + identifier.charCodeAt(i);
      hash |= 0;
    }
    return KIOSK_COLOR_COMBOS[Math.abs(hash) % KIOSK_COLOR_COMBOS.length];
  }
  return KIOSK_COLOR_COMBOS[0];
};

/**
 * Pick a random color combo from the 8 curated combinations
 */
export const getRandomColorCombo = (): KioskColorCombo => {
  const randomIndex = Math.floor(Math.random() * KIOSK_COLOR_COMBOS.length);
  return KIOSK_COLOR_COMBOS[randomIndex];
};
