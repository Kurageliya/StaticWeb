/**
 * Timeline Module
 * Menghasilkan timeline kronologis interaktif perjalanan cinta dengan desain Polaroid Keepsake.
 */
import { escapeHtml, getMemoryTimestamp, formatIndoDate } from '../utils/helpers.js';

export function getMemoryImages(memory) {
  if (!memory) return [];
  if (Array.isArray(memory.images) && memory.images.length > 0) {
    return memory.images.filter(img => typeof img === 'string' && img.trim().length > 0);
  }
  if (memory.imgUrl && typeof memory.imgUrl === 'string' && memory.imgUrl.trim().length > 0) {
    return [memory.imgUrl.trim()];
  }
  return [];
}

export function renderTimelineSection(memoriesList = [], onScrollReveal = null, onOpenMemory = null) {
  const timelineContainer = document.getElementById('timeline-items-container');
  if (!timelineContainer) return;
  timelineContainer.innerHTML = '';

  // Urutkan secara kronologis presisi (tanggal & jam terlama ke tanggal & jam terbaru)
  let timelineMemories = [...memoriesList];
  timelineMemories.sort((a, b) => getMemoryTimestamp(a) - getMemoryTimestamp(b));

  // Tampilkan momen yang ditandai featured (atau maksimal 10 jika belum ada yang ditandai)
  const featuredOnly = timelineMemories.filter(m => m.isFeatured !== false);
  let displayMemories = featuredOnly.length > 0 ? featuredOnly : timelineMemories;
  displayMemories = displayMemories.slice(0, 10); // Maksimal 10 item

  if (displayMemories.length === 0) {
    timelineContainer.innerHTML = `<div class="text-center" style="padding: 3rem; color: var(--text-muted);">Belum ada momen di timeline. Klik ikon Love (❤️) pada foto di galeri untuk menampilkannya!</div>`;
    return;
  }

  displayMemories.forEach((memory, index) => {
    const isLeft = index % 2 === 0;
    const formattedDate = formatIndoDate(memory.date);

    const catLower = (memory.category || 'spesial').toLowerCase().trim();

    let badgeIcon = 'fa-heart';
    if (catLower === 'kencan') badgeIcon = 'fa-champagne-glasses';
    else if (catLower === 'liburan') badgeIcon = 'fa-plane-departure';
    else if (memory.title && (memory.title.toLowerCase().includes('pesan') || memory.title.toLowerCase().includes('chat'))) badgeIcon = 'fa-comments';
    else if (catLower !== 'spesial' && catLower) badgeIcon = 'fa-tag';

    // Konfigurasi Pill Kategori
    let catLabel = 'Spesial';
    let catClass = 'pill-spesial';
    let catIcon = 'fa-heart';
    if (catLower === 'kencan') {
      catLabel = 'Kencan';
      catClass = 'pill-kencan';
      catIcon = 'fa-champagne-glasses';
    } else if (catLower === 'liburan') {
      catLabel = 'Liburan';
      catClass = 'pill-liburan';
      catIcon = 'fa-plane-departure';
    } else if (catLower === 'spesial' || !catLower) {
      catLabel = 'Spesial';
      catClass = 'pill-spesial';
      catIcon = 'fa-heart';
    } else {
      catLabel = memory.category.charAt(0).toUpperCase() + memory.category.slice(1);
      catClass = 'pill-custom';
      catIcon = 'fa-tag';
    }

    const itemEl = document.createElement('div');
    itemEl.className = `timeline-item reveal ${isLeft ? 'left' : 'right'}`;

    const imgs = getMemoryImages(memory);
    const photoCount = imgs.length;
    const thumb = imgs[0] || memory.imgUrl;

    const countBadgeHtml = photoCount > 1 ? `
      <span class="polaroid-count-badge">
        <i class="fa-solid fa-images"></i> ${photoCount} Foto
      </span>
    ` : '';

    const polaroidPhotoHtml = thumb ? `
      <div class="timeline-polaroid-frame" title="Klik untuk membuka detail foto & carousel">
        <div class="timeline-polaroid-img-wrap">
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(memory.title)}" class="timeline-polaroid-img" loading="lazy">
          ${countBadgeHtml}
          <div class="timeline-polaroid-overlay">
            <span class="overlay-hint"><i class="fa-solid fa-expand"></i> Buka Foto</span>
          </div>
        </div>
      </div>
    ` : '';

    const timeHtml = memory.time ? `
      <span class="timeline-meta-time"><i class="fa-regular fa-clock"></i> ${escapeHtml(memory.time)} WIB</span>
    ` : '';

    itemEl.innerHTML = `
      <div class="timeline-badge"><i class="fa-solid ${badgeIcon}"></i></div>
      <div class="timeline-card">
        ${polaroidPhotoHtml}
        <div class="timeline-card-meta">
          <span class="timeline-pill ${catClass}"><i class="fa-solid ${catIcon}"></i> ${catLabel}</span>
          <div class="timeline-meta-time-wrap">
            <span class="timeline-meta-date"><i class="fa-regular fa-calendar-check"></i> ${formattedDate}</span>
            ${timeHtml}
          </div>
        </div>
        <h3 class="timeline-card-title">${escapeHtml(memory.title)}</h3>
        <div class="timeline-story-box">
          <i class="fa-solid fa-quote-left quote-icon"></i>
          <p class="timeline-story-text">${escapeHtml(memory.caption || 'Momen manis yang terukir indah dalam perjalanan cinta kita.')}</p>
        </div>
        <div class="timeline-card-footer">
          <span class="timeline-pin-chip"><i class="fa-solid fa-sparkles"></i> Momen Indah</span>
          <button type="button" class="timeline-read-btn" title="Buka foto dan detail kenangan">
            Buka Kenangan <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    // Interaktivitas: klik foto polaroid atau tombol 'Buka Kenangan' langsung membuka Lightbox
    const photoFrame = itemEl.querySelector('.timeline-polaroid-frame');
    const readBtn = itemEl.querySelector('.timeline-read-btn');
    if (typeof onOpenMemory === 'function') {
      if (photoFrame) {
        photoFrame.addEventListener('click', (e) => {
          e.stopPropagation();
          onOpenMemory(memory);
        });
      }
      if (readBtn) {
        readBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onOpenMemory(memory);
        });
      }
    }

    timelineContainer.appendChild(itemEl);
  });

  if (typeof onScrollReveal === 'function') {
    onScrollReveal();
  }
}
