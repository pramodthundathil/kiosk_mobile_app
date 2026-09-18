export type KioskOrientation = 'LANDSCAPE' | 'PORTRAIT';
export type KioskHardwareType = 'LANDSCAPE_22' | 'PORTRAIT_43' | 'DYNAMIC_TABLET' | 'DYNAMIC_MOBILE';

export interface KioskResponsiveMetrics {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  aspectRatio: number;
  kioskType: KioskHardwareType;
  gridColumns: number;
  scaleFont: (size: number, minSize?: number) => number;
  scaleSpacing: (size: number) => number;
  is4K: boolean;
  pixelRatio: number;
  crispTextProps: {
    includeFontPadding: boolean;
    textBreakStrategy: 'simple';
  };
}

export interface KioskCategory {
  id: string;
  name: string;
  code: string;
  icon: string;
  description?: string;
  color?: string;
  image?: string; // Optional category image URL from backend
}

export interface ProductMediaAsset {
  id: string;
  title: string;
  asset_type: 'IMAGE' | 'VIDEO' | 'PDF_BROCHURE' | 'TECH_SHEET' | 'THREE_D';
  asset_type_display?: string;
  file_url?: string;
  description?: string;
}

export interface KioskProduct {
  id: string;
  name: string;
  sku: string;
  subtitle?: string;
  category: string;
  categoryId?: string;
  categoryCode?: string;
  categoryName?: string;
  description: string;
  image: string;
  specifications: Record<string, string>;
  features?: string[];
  applications?: string[];
  standards?: string[];
  badge?: string;
  price?: number; // Optional reference price if provided by API
  stock?: number;
  mediaAssets?: ProductMediaAsset[];
  brochureUrl?: string;
  techSheetUrl?: string;
  isPopular?: boolean;
}

export interface KioskScreensaver {
  id: string;
  title: string;
  image: string;
  image_url: string;
  orientation: 'LANDSCAPE' | 'PORTRAIT' | 'BOTH';
  orientation_display?: string;
  duration_seconds: number;
  display_order: number;
  caption?: string;
  description?: string;
  is_active: boolean;
}

