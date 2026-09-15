export const kioskColors = {
  // Official Excel Earthings Brand Palette
  brandNavy: '#1E2B58',        // Primary Brand Header Navy
  brandRed: '#C82333',         // Excel Red Accent
  accentBlue: '#0D60AE',       // Vibrant Action / Selected Blue
  accentBlueHover: '#0A4C8A',  // Deep Action Blue
  lightningGold: '#D97706',    // Rich Amber / Gold Accent
  
  // Backgrounds & Surfaces
  background: '#F8FAFC',       // Clean Light Slate Screen Background
  surface: '#FFFFFF',          // Pure White Card Surface
  surfaceBorder: '#E2E8F0',    // Soft Slate Card Border
  surfaceElevated: '#F1F5F9',  // Subtle Elevated Slate Container
  surfaceLight: '#2563EB',     // Active Accent Royal Blue
  surfaceMedium: '#1E2B58',    // Deep Brand Header Navy
  surfaceGlass: 'rgba(255, 255, 255, 0.88)',
  surfaceGlassDark: 'rgba(15, 23, 42, 0.75)',

  primary: '#1E2B58',          // Excel Earthings Navy
  primaryLight: '#0D60AE',     // Vibrant Accent Blue
  primaryDark: '#0F172A',      // Dark Slate Header Text
  
  secondary: '#2563EB',        // Royal Blue
  accent: '#D97706',           // Lightning Gold / Amber
  accentRed: '#C82333',        // Red Accent
  
  success: '#16A34A',          // Green Pass
  warning: '#D97706',          // Warning Amber
  danger: '#DC2626',           // Alert Red

  textPrimary: '#0F172A',      // High Contrast Deep Slate Text
  textSecondary: '#475569',    // Cool Slate Subtext
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
  full: 9999,
};

export const kioskShadows = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  glowBlue: {
    shadowColor: '#0D60AE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  glowGold: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    shadowRadius: 18,
    elevation: 16,
  },
};

export const kioskTypography = {
  titleLg: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: kioskColors.textPrimary,
    letterSpacing: -0.15,
  },
  cardSubtext: {
    fontSize: 9.5,
    fontWeight: '600' as const,
    color: kioskColors.textMuted,
  },
  badge: {
    fontSize: 9.5,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 11.5,
    color: kioskColors.textSecondary,
    lineHeight: 16,
  },
  caption: {
    fontSize: 10,
    color: kioskColors.textMuted,
  },
};

export const kioskIcons = {
  strokeWidth: 2.2,
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeLg: 18,
  sizeXl: 22,
};

export const minTouchTarget = 64; // Minimum touch size in pixels for Kiosk touchscreens
