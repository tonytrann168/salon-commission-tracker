import { afterEach, describe, expect, it, vi } from 'vitest';
import galleryJson from '../game/config/gallery.json';
import { GALLERY_CONFIG, addToGallery, loadGallery, parseGalleryConfig } from '../game/gallery';

/** Story 050: My work, the finished sets' photos on this phone. */

const photo = (n: number) => ({ photo: `data:image/jpeg;base64,${'A'.repeat(8)}${n}`, clientName: `Client ${n}`, stars: (n % 5) + 1, day: '2026-11-15' });

/** A small localStorage for this test (no DOM here); `full` makes writes over that many photos fail like a full phone. */
let full = Infinity;
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (key === 'salon.gallery.v1' && JSON.parse(value).length > full) throw new Error('QuotaExceededError');
    store.set(key, value);
  },
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
});

describe('My work gallery', () => {
  afterEach(() => {
    store.clear();
    full = Infinity;
  });

  it('keeps the newest first, at most max photos', () => {
    for (let n = 0; n < GALLERY_CONFIG.max + 3; n++) addToGallery(photo(n));
    const list = loadGallery();
    expect(list).toHaveLength(GALLERY_CONFIG.max);
    expect(list[0]!.clientName).toBe(`Client ${GALLERY_CONFIG.max + 2}`);
  });

  it('a full phone drops the oldest photos to make room, and never throws', () => {
    for (let n = 0; n < 3; n++) addToGallery(photo(n));
    full = 2;
    const list = addToGallery(photo(9));
    expect(list.map((p) => p.clientName)).toEqual(['Client 9', 'Client 2']);
  });

  it('reads a damaged gallery as empty and skips anything that is not a photo', () => {
    store.set('salon.gallery.v1', '{oops');
    expect(loadGallery()).toEqual([]);
    store.set('salon.gallery.v1', JSON.stringify([photo(1), { photo: 'javascript:alert(1)', clientName: 'x', stars: 5, day: 'd' }]));
    expect(loadGallery()).toHaveLength(1);
  });

  it('refuses a bad config', () => {
    expect(() => parseGalleryConfig({ ...galleryJson, max: 0 })).toThrow('gallery.json: "max"');
    expect(() => parseGalleryConfig({ ...galleryJson, quality: 2 })).toThrow('"quality"');
  });
});
