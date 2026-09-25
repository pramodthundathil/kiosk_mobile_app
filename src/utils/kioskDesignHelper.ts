import { KioskCategory, KioskSubCategory } from '../types/kiosk';

// Official Excel Brand Blue for Borders and Active States
export const KIOSK_BRAND_BORDER = '#0D60AE';
export const KIOSK_BRAND_BORDER_ACTIVE = '#38BDF8';
export const KIOSK_ACTIVE_BG_DARK = '#0A2540';
export const KIOSK_ACTIVE_BG_DARK_GRADIENT = ['#0A2540', '#0F1E36'] as const;
export const KIOSK_DEFAULT_CARD_GRADIENT = [
  'rgba(10, 25, 47, 0.40)',
  'rgba(10, 25, 47, 0.86)',
] as const;

/**
 * Curated high-resolution industrial fallback imagery matching the 4 primary Kiosk categories.
 */
const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  earthing: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
  lightning: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1200&q=80',
  enclosure: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
  cable: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
  spd: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
};

/**
 * Resolves high quality image to fill category box.
 */
export function resolveCategoryThumbnail(
  cat?: Partial<KioskCategory | KioskSubCategory> | null
): string {
  if (cat?.image && typeof cat.image === 'string' && cat.image.trim().length > 0) {
    return cat.image;
  }
  const key = `${cat?.name || ''} ${cat?.code || ''} ${cat?.id || ''}`.toLowerCase();
  if (key.includes('earth') || key.includes('compound') || key.includes('electrode')) {
    return FALLBACK_CATEGORY_IMAGES.earthing;
  }
  if (key.includes('lightning') || key.includes('strike') || key.includes('air')) {
    return FALLBACK_CATEGORY_IMAGES.lightning;
  }
  if (key.includes('enclosure') || key.includes('pit') || key.includes('box') || key.includes('cover')) {
    return FALLBACK_CATEGORY_IMAGES.enclosure;
  }
  if (key.includes('cable') || key.includes('tray') || key.includes('ladder') || key.includes('management')) {
    return FALLBACK_CATEGORY_IMAGES.cable;
  }
  if (key.includes('surge') || key.includes('spd')) {
    return FALLBACK_CATEGORY_IMAGES.spd;
  }
  return FALLBACK_CATEGORY_IMAGES.default;
}

/**
 * Resolves concise, punchy description positioned directly below the heading.
 * Adheres to user's official kiosk copy.
 */
export function resolveCategoryDescription(
  cat?: Partial<KioskCategory | KioskSubCategory> | null
): string {
  const key = `${cat?.name || ''} ${cat?.code || ''} ${cat?.id || ''}`.toLowerCase();

  if (key.includes('earth')) {
    if (cat?.description && cat.description.trim().length > 0 && !cat.description.toLowerCase().includes('complete earthing')) {
      return cat.description;
    }
    return 'Disperses fault and surges, protecting equipment and lives.';
  }
  if (key.includes('lightning')) {
    if (cat?.description && cat.description.trim().length > 0 && !cat.description.toLowerCase().includes('structural direct strike')) {
      return cat.description;
    }
    return 'Designed to neutralize strikes and safeguard critical infrastructure.';
  }
  if (key.includes('enclosure') || key.includes('pit') || key.includes('box') || key.includes('cover')) {
    if (cat?.description && cat.description.trim().length > 0 && !cat.description.toLowerCase().includes('heavy-duty')) {
      return cat.description;
    }
    return 'Delivering safety, strength, and long-lasting reliability.';
  }
  if (key.includes('cable') || key.includes('tray') || key.includes('management')) {
    if (cat?.description && cat.description.trim().length > 0) {
      return cat.description;
    }
    return 'Powering infrastructure, engineered to meet global standards.';
  }
  if (key.includes('surge') || key.includes('spd')) {
    return 'Transient surge suppression safeguarding sensitive electronics.';
  }

  return (
    cat?.description ||
    'Powering infrastructure, engineered to meet global standards.'
  );
}
