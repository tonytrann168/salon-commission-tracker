import { loadGallery } from '../gallery';
import type { GalleryPhoto } from '../gallery';
import { getLanguage, t } from '../i18n';
import { el } from './dom';
import './my-work.css';

/**
 * Story 050: "My work" on the profile: the last finished sets as photos. Tap one to see it big and save it to the phone
 * (the share sheet where the phone has one, so iPhones get "Save Image"; otherwise a download).
 */

const fileName = (photo: GalleryPhoto): string => `salon-besties-${photo.day}-${photo.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;

async function saveToPhone(photo: GalleryPhoto): Promise<void> {
  try {
    const blob = await (await fetch(photo.photo)).blob();
    const file = new File([blob], fileName(photo), { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch {
    // No share sheet (or it was closed): fall back to a download.
  }
  const link = document.createElement('a');
  link.href = photo.photo;
  link.download = fileName(photo);
  document.body.append(link);
  link.click();
  link.remove();
}

function openPhoto(photo: GalleryPhoto, alt: string): void {
  const sheet = el('div', 'my-work-viewer');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', alt);
  const card = el('div', 'my-work-card');
  const img = el('img', 'my-work-big');
  img.src = photo.photo;
  img.alt = alt;
  const caption = el('p', 'my-work-caption', `${'★'.repeat(photo.stars)}${'☆'.repeat(Math.max(0, 5 - photo.stars))} · ${new Date(`${photo.day}T12:00:00`).toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  const save = el('button', 'chat-button my-work-save', `📥 ${t('profile.savePhoto')}`);
  save.type = 'button';
  save.addEventListener('click', () => void saveToPhone(photo));
  const close = el('button', 'chat-button secondary', t('profile.closePhoto'));
  close.type = 'button';
  const shut = (): void => sheet.remove();
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (event) => event.target === sheet && shut());
  sheet.addEventListener('keydown', (event) => event.key === 'Escape' && shut());
  card.append(img, caption, save, close);
  sheet.append(card);
  document.body.append(sheet);
  save.focus({ preventScroll: true });
}

export function createMyWork(): HTMLElement {
  const box = el('section', 'results-section my-work');
  const photos = loadGallery();
  box.append(el('h2', '', `📸 ${t('profile.myWork')}`));
  if (photos.length === 0) {
    box.append(el('p', 'results-hint', t('profile.myWorkEmpty')));
    return box;
  }
  const grid = el('div', 'my-work-grid');
  for (const photo of photos) {
    const alt = t('profile.photoAlt', { name: photo.clientName, stars: photo.stars });
    const tile = el('button', 'my-work-tile');
    tile.type = 'button';
    tile.setAttribute('aria-label', alt);
    const img = el('img');
    img.src = photo.photo;
    img.alt = '';
    img.loading = 'lazy';
    tile.append(img, el('span', 'my-work-stars', `${photo.stars}★`));
    tile.addEventListener('click', () => openPhoto(photo, alt));
    grid.append(tile);
  }
  box.append(grid);
  return box;
}
