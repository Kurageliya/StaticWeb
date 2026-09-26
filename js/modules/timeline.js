/**
 * Timeline Module
 * Menghasilkan timeline kronologis interaktif perjalanan cinta dari kenangan tersimpan.
 */
import { escapeHtml } from '../utils/helpers.js';

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

export function renderTimelineSection(memoriesList = [], onScrollReveal = null) {
  const timelineContainer = document.getElementById('timeline-items-container');
  if (!timelineContainer) return;
  timelineContainer.innerHTML = '';

  // Urutkan secara kronologis (tanggal terlama ke tanggal terbaru)
  let timelineMemories = [...memoriesList];
  timelineMemories.sort((a, b) => new Date(a.date) - new Date(b.date));

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
    const dateObj = new Date(memory.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    let badgeIcon = 'fa-heart';
    if (memory.category === 'kencan') badgeIcon = 'fa-champagne-glasses';
    else if (memory.category === 'liburan') badgeIcon = 'fa-map-location-dot';
    else if (memory.title.toLowerCase().includes('pesan') || memory.title.toLowerCase().includes('chat')) badgeIcon = 'fa-comments';

    const itemEl = document.createElement('div');
    itemEl.className = `timeline-item reveal ${isLeft ? 'left' : 'right'}`;

    const imgs = getMemoryImages(memory);
    const thumb = imgs[0] || memory.imgUrl;
    const thumbHtml = thumb ? `
      <div class="timeline-img-small">
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(memory.title)}" loading="lazy">
      </div>
    ` : '';

    itemEl.innerHTML = `
      <div class="timeline-badge"><i class="fa-solid ${badgeIcon}"></i></div>
      <div class="timeline-card">
        <div class="card-tape"></div>
        <span class="timeline-date">${formattedDate}</span>
        <h3>${escapeHtml(memory.title)}</h3>
        <p>${escapeHtml(memory.caption || 'Momen manis yang terukir indah dalam perjalanan cinta kita.')}</p>
        ${thumbHtml}
      </div>
    `;

    timelineContainer.appendChild(itemEl);
  });

  if (typeof onScrollReveal === 'function') {
    onScrollReveal();
  }
}
