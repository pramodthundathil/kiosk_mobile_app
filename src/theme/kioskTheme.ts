export const kioskColors = {
  // Official Excel Earthings Brand Palette & High Contrast Foundations
  brandNavy: '#1E2B58',        // Primary Brand Header Navy
  brandNavyDark: '#0F172A',    // Deep Rich Slate
  brandRed: '#DC2626',         // Vibrant Warning/Accent Red
  accentBlue: '#0D60AE',       // Excel Signature Action Blue
  accentBlueHover: '#0A4C8A',  // Deep Action Blue
  accentBlueLight: '#EFF6FF',  // Very Soft Blue Tint
  accentBlueBorder: '#BFDBFE', // Soft Border Blue
  lightningGold: '#D97706',    // Rich Amber / Gold Accent
  lightningGoldLight: '#FEF3C7',
  
  // Backgrounds & Elevated Surfaces
  background: '#F8FAFC',       // Clean Slate Canvas Background
  backgroundAlt: '#F1F5F9',    // Secondary Surface Canvas
  surface: '#FFFFFF',          // Pure White Card Surface
  surfaceBorder: '#E2E8F0',    // Soft Slate Card Border
  surfaceBorderHover: '#CBD5E1',
  surfaceElevated: '#F8FAFC',  // Subtle Elevated Container
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  surfaceGlassDark: 'rgba(15, 23, 42, 0.85)',

  primary: '#1E2B58',
  primaryLight: '#0D60AE',
  primaryDark: '#0F172A',
  
  secondary: '#2563EB',
  accent: '#D97706',
  accentRed: '#DC2626',
  
  // Semantic Indicators
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  // Typography Contrast (WCAG AA & AAA compliant on light canvas)
  textPrimary: '#0F172A',      // High Contrast Deep Slate Text
  textSecondary: '#334155',    // Refined Subtext
  textMuted: '#64748B',        // Muted Slate Text
  textLightMuted: '#94A3B8',   // Light Muted Slate
  textDark: '#020617',         // Pure Dark Text
  textLight: '#FFFFFF',        // White text on dark buttons/headers

  badgeBackground: '#EFF6FF',
  badgeBorder: '#BFDBFE',
  badgeText: '#0D60AE',
  
  overlay: 'rgba(15, 23, 42, 0.65)',
};

export const kioskRadii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const kioskShadows = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  glowBlue: {
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  glowGold: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  drawer: {
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 20,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 16,
  },
};

export const crispLettering = {
  includeFontPadding: false,
  textBreakStrategy: 'simple' as const,
};

export const kioskTypography = {
  titleLg: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.15,
    includeFontPadding: false,
  },
  cardSubtext: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: kioskColors.textMuted,
    includeFontPadding: false,
  },
  badge: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  body: {
    fontSize: 13.5,
    color: kioskColors.textSecondary,
    lineHeight: 19,
    includeFontPadding: false,
  },
  caption: {
    fontSize: 11.5,
    color: kioskColors.textMuted,
    includeFontPadding: false,
  },
};

export const kioskIcons = {
  strokeWidth: 2.2,
  sizeXs: 12,
  sizeSm: 14,
  sizeMd: 16,
  sizeLg: 20,
  sizeXl: 24,
};

// UI/UX Pro Max Accessibility & Touch Ergonomics Constants
export const minTouchTarget = 48; // Minimum touch size in pixels for Kiosk touchscreens
export const hitSlopPill = { top: 10, bottom: 10, left: 10, right: 10 };
export const hitSlopButton = { top: 12, bottom: 12, left: 12, right: 12 };

// Spring physics config for smooth physical tactile micro-animations
export const springPressIn = {
  toValue: 0.96,
  useNativeDriver: true,
  speed: 28,
  bounciness: 4,
};

export const springPressOut = {
  toValue: 1,
  useNativeDriver: true,
  speed: 22,
  bounciness: 6,
};

