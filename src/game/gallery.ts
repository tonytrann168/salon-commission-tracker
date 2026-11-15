import galleryJson from './config/gallery.json';

/**
 * Story 050: "My work": the last finished sets as photos (a JPEG data URL each), newest first. Kept on this phone
 * only (photos are too big for backups and the account). Config: config/gallery.json.
 */

export interface GalleryConfig {
  max: number;
  width: number;
  quality: number;
}

export function parseGalleryConfig(raw: unknown): GalleryConfig {
  const c = raw as Partial<GalleryConfig>;
  const fail = (what: string): never => {
    throw new Error(`gallery.json: ${what}`);
  };
  const max = typeof c.max === 'number' && Number.isInteger(c.max) && c.max >= 1 && c.max <= 100 ? c.max : fail('"max" must be 1-100');
  const width = typeof c.width === 'number' && c.width >= 120 && c.width <= 1200 ? c.width : fail('"width" must be 120-1200');
  const quality = typeof c.quality === 'number' && c.quality > 0 && c.quality <= 1 ? c.quality : fail('"quality" must be above 0 and at most 1');
  return { max, width, quality };
}

export const GALLERY_CONFIG: GalleryConfig = parseGalleryConfig(galleryJson);

export interface GalleryPhoto {
  /** A data:image/jpeg URL. */
  photo: string;
  clientName: string;
  stars: number;
  /** Local day, YYYY-MM-DD. */
  day: string;
}

const KEY = 'salon.gallery.v1';

const isPhoto = (value: unknown): value is GalleryPhoto => {
  const p = value as GalleryPhoto;
  return typeof p === 'object' && p !== null && typeof p.photo === 'string' && p.photo.startsWith('data:image/') && typeof p.clientName === 'string' && typeof p.stars === 'number' && typeof p.day === 'string';
};

export function loadGallery(): GalleryPhoto[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(data) ? data.filter(isPhoto).slice(0, GALLERY_CONFIG.max) : [];
  } catch {
    return [];
  }
}

/** Add a photo (newest first, at most `max`). If the phone's storage is full, the oldest photos make room. */
export function addToGallery(photo: GalleryPhoto, config: GalleryConfig = GALLERY_CONFIG): GalleryPhoto[] {
  let list = [photo, ...loadGallery()].slice(0, config.max);
  // Straight to localStorage (not safe-storage): a full phone must say so, and the photos are not progress to sync.
  while (list.length > 0) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return list;
    } catch {
      list = list.slice(0, -1);
    }
  }
  return [];
}
