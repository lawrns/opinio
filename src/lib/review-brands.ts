export interface ReviewTimeWindow {
  readonly startHour: number;
  readonly endHour: number;
}

export interface ReviewBrandConfig {
  readonly slug: string;
  readonly officialOrigin: string;
  readonly timezone: string;
  readonly windows: readonly ReviewTimeWindow[];
}

export const REVIEW_BRANDS = {
  barri: {
    slug: 'barri',
    officialOrigin: 'https://barri.mx',
    timezone: 'America/Chihuahua',
    windows: [{ startHour: 13, endHour: 16 }, { startHour: 19, endHour: 23 }],
  },
  gogym: {
    slug: 'gogym',
    officialOrigin: 'https://gogym.mx',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 7, endHour: 10 }, { startHour: 18, endHour: 21 }],
  },
  doctormx: {
    slug: 'doctormx',
    officialOrigin: 'https://doctor.mx',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 10, endHour: 19 }],
  },
  bien: {
    slug: 'bien',
    officialOrigin: 'https://bien.mx',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 9, endHour: 18 }],
  },
  hablo: {
    slug: 'hablo',
    officialOrigin: 'https://hablo.com.mx',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 9, endHour: 18 }],
  },
  'locomotion-mx': {
    slug: 'locomotion-mx',
    officialOrigin: 'https://locomotion.mx',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 9, endHour: 18 }],
  },
} as const satisfies Record<string, ReviewBrandConfig>;

export type OwnedBrandSlug = keyof typeof REVIEW_BRANDS;

export function getReviewBrand(slug: string): ReviewBrandConfig {
  if (!Object.hasOwn(REVIEW_BRANDS, slug)) throw new Error(`Unsupported owned brand: ${slug}`);
  return REVIEW_BRANDS[slug as OwnedBrandSlug];
}
