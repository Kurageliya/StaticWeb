/**
 * Lightbox Module
 * Menampilkan modal detail foto polaroid dengan transisi zoom-fade,
 * slider multi-foto horizontal yang mulus, titik navigasi terpusat, dan peek full image.
 */
import { escapeHtml } from '../utils/helpers.js';
import { getMemoryImages } from './gallery.js';

let currentLightboxIndex = 0;
let currentLightboxPhotoIndex = 0;
let peekHintTimer = null;
let subNavTimer = null;
let currentGetFilteredMemories = () => [];

/**
 * Memunculkan tombol panah sub-nav selama durasi tertentu (default 0.5s),
 * lalu otomatis memudarkannya kembali agar tidak menutupi foto.
 */
export function flashSubNav(duration = 500) {
  const subPrev = document.getElementById('lightbox-sub-prev');
  const subNext = document.getElementById('lightbox-sub-next');
  if (!subPrev && !subNext) return;

  if (subPrev) subPrev.classList.add('is-visible');
  if (subNext) subNext.classList.add('is-visible');

  clearTimeout(subNavTimer);
  subNavTimer = setTimeout(() => {
    if (subPrev) subPrev.classList.remove('is-visible');
    if (subNext) subNext.classList.remove('is-visible');
  }, duration);
}

export function setupLightboxEvents({
  getFilteredMemories = () => [],
  onToggleFeatured = null,
  onDeleteMemory = null,
  onEditMemory = null
} = {}) {
  currentGetFilteredMemories = getFilteredMemories;

  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxPolaroidCard = document.querySelector('.lightbox-polaroid');
  const lightboxImgWrap = document.getElementById('lightbox-img-wrap');
  const backdrop = document.querySelector('.lightbox-backdrop');

  if (!lightboxModal) return;

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (backdrop) backdrop.addEventListener('click', closeLightbox);

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => {
      navigateLightbox(-1, { onToggleFeatured, onDeleteMemory, onEditMemory });
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => {
      navigateLightbox(1, { onToggleFeatured, onDeleteMemory, onEditMemory });
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightboxModal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1, { onToggleFeatured, onDeleteMemory, onEditMemory });
    if (e.key === 'ArrowRight') navigateLightbox(1, { onToggleFeatured, onDeleteMemory, onEditMemory });
  });

  const lightboxSubPrev = document.getElementById('lightbox-sub-prev');
  const lightboxSubNext = document.getElementById('lightbox-sub-next');
  if (lightboxSubPrev) {
    lightboxSubPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      switchLightboxPhoto(currentLightboxPhotoIndex - 1);
      flashSubNav(500);
    });
  }
  if (lightboxSubNext) {
    lightboxSubNext.addEventListener('click', (e) => {
      e.stopPropagation();
      switchLightboxPhoto(currentLightboxPhotoIndex + 1);
      flashSubNav(500);
    });
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  if (lightboxImgWrap) {
    lightboxImgWrap.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    }, { passive: true });

    lightboxImgWrap.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const diffX = e.touches[0].clientX - touchStartX;
      const diffY = e.touches[0].clientY - touchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 12) {
        isSwiping = true;
      }
    }, { passive: true });

    lightboxImgWrap.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;
      if (diffX < -38) {
        switchLightboxPhoto(currentLightboxPhotoIndex + 1);
      } else if (diffX > 38) {
        switchLightboxPhoto(currentLightboxPhotoIndex - 1);
      }
      setTimeout(() => { isSwiping = false; }, 50);
    });

    // Munculkan panah saat mouse bergerak, otomatis hilang jika diam/keluar
    lightboxImgWrap.addEventListener('mousemove', () => {
      flashSubNav(800);
    });

    lightboxImgWrap.addEventListener('mouseleave', () => {
      clearTimeout(subNavTimer);
      if (lightboxSubPrev) lightboxSubPrev.classList.remove('is-visible');
      if (lightboxSubNext) lightboxSubNext.classList.remove('is-visible');
    });

    lightboxImgWrap.addEventListener('click', (e) => {
      if (e.target.closest('.lightbox-sub-nav') || e.target.closest('.lightbox-sub-dots') || isSwiping) return;
      flashSubNav(500);
      if (lightboxPolaroidCard) {
        lightboxPolaroidCard.classList.toggle('info-minimized');
      }
    });
  }

  const btnFeatured = document.getElementById('btn-toggle-featured-lightbox');
  if (btnFeatured && typeof onToggleFeatured === 'function') {
    btnFeatured.addEventListener('click', () => {
      const memories = currentGetFilteredMemories();
      const memory = memories[currentLightboxIndex];
      if (memory) onToggleFeatured(memory.id);
    });
  }

  const btnDelete = document.getElementById('btn-delete-lightbox');
  if (btnDelete && typeof onDeleteMemory === 'function') {
    btnDelete.addEventListener('click', () => {
      const memories = currentGetFilteredMemories();
      const memory = memories[currentLightboxIndex];
      if (memory) onDeleteMemory(memory.id);
    });
  }

  const btnEdit = document.getElementById('btn-edit-lightbox');
  if (btnEdit && typeof onEditMemory === 'function') {
    btnEdit.addEventListener('click', () => {
      const memories = currentGetFilteredMemories();
      const memory = memories[currentLightboxIndex];
      if (memory) onEditMemory(memory.id);
    });
  }
}

export function switchLightboxPhoto(newIndex) {
  const memories = currentGetFilteredMemories();
  const memory = memories[currentLightboxIndex];
  if (!memory) return;
  const images = getMemoryImages(memory);
  if (images.length <= 1) return;

  currentLightboxPhotoIndex = (newIndex + images.length) % images.length;

  const track = document.getElementById('lightbox-carousel-track');
  if (track) {
    track.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
    track.style.transform = `translateX(-${currentLightboxPhotoIndex * 100}%)`;
  }

  const currSpan = document.getElementById('lightbox-curr-photo');
  if (currSpan) currSpan.textContent = currentLightboxPhotoIndex + 1;

  const subDots = document.getElementById('lightbox-sub-dots');
  if (subDots) {
    subDots.querySelectorAll('.lightbox-sub-dot').forEach((dot, dIdx) => {
      dot.classList.toggle('active', dIdx === currentLightboxPhotoIndex);
    });
  }

  // Tampilkan tombol panah selama 0.5 detik saat berpindah foto
  flashSubNav(500);
}

export function openLightbox(index, photoIndex = 0, callbacks = {}) {
  const memories = currentGetFilteredMemories();
  if (!memories || memories.length === 0 || !memories[index]) return;

  currentLightboxIndex = index;
  currentLightboxPhotoIndex = photoIndex || 0;

  updateLightboxContent(memories[index], currentLightboxPhotoIndex, callbacks);

  const lightboxPolaroidCard = document.querySelector('.lightbox-polaroid');
  if (lightboxPolaroidCard) {
    lightboxPolaroidCard.classList.remove('info-minimized');
  }

  const hint = document.getElementById('lightbox-peek-hint');
  if (hint) {
    hint.classList.remove('fade-out');
    hint.style.display = 'block';
    clearTimeout(peekHintTimer);
    peekHintTimer = setTimeout(() => {
      hint.classList.add('fade-out');
      setTimeout(() => {
        if (hint.classList.contains('fade-out')) {
          hint.style.display = 'none';
        }
      }, 400);
    }, 1200);
  }

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal) {
    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
  }
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  clearTimeout(peekHintTimer);
  clearTimeout(subNavTimer);
  const subPrev = document.getElementById('lightbox-sub-prev');
  const subNext = document.getElementById('lightbox-sub-next');
  if (subPrev) subPrev.classList.remove('is-visible');
  if (subNext) subNext.classList.remove('is-visible');

  const lightboxPolaroidCard = document.querySelector('.lightbox-polaroid');
  if (lightboxPolaroidCard) {
    lightboxPolaroidCard.classList.remove('info-minimized');
  }
  const hint = document.getElementById('lightbox-peek-hint');
  if (hint) {
    hint.classList.add('fade-out');
    hint.style.display = 'none';
  }

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal) {
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
}

export function navigateLightbox(direction, callbacks = {}) {
  const memories = currentGetFilteredMemories();
  if (!memories || memories.length === 0) return;

  currentLightboxIndex = (currentLightboxIndex + direction + memories.length) % memories.length;
  currentLightboxPhotoIndex = 0;
  const targetMemory = memories[currentLightboxIndex];

  const lightboxPolaroidCard = document.querySelector('.lightbox-polaroid');
  if (lightboxPolaroidCard) {
    lightboxPolaroidCard.classList.remove('zoom-fade-in');
    lightboxPolaroidCard.classList.add('zoom-fade-out');
  }

  setTimeout(() => {
    updateLightboxContent(targetMemory, 0, callbacks);
    if (lightboxPolaroidCard) {
      lightboxPolaroidCard.classList.remove('zoom-fade-out');
      lightboxPolaroidCard.classList.add('zoom-fade-in');
    }
  }, 200);
}

export function updateLightboxContent(memory, photoIndex = 0, callbacks = {}) {
  if (!memory) return;
  const dateObj = new Date(memory.date);
  const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  const images = getMemoryImages(memory);
  currentLightboxPhotoIndex = Math.min(Math.max(0, photoIndex), Math.max(0, images.length - 1));

  const track = document.getElementById('lightbox-carousel-track');
  if (track) {
    if (images.length > 0) {
      track.innerHTML = images.map((url, i) => `
        <div class="lightbox-carousel-slide ${i === currentLightboxPhotoIndex ? 'active' : ''}" data-idx="${i}">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(memory.title)} - Foto ${i + 1}">
        </div>
      `).join('');
    } else {
      track.innerHTML = `
        <div class="lightbox-carousel-slide active">
          <img id="lightbox-img" src="${escapeHtml(memory.imgUrl || '')}" alt="${escapeHtml(memory.title)}">
        </div>
      `;
    }
    track.style.transition = 'none';
    track.style.transform = `translateX(-${currentLightboxPhotoIndex * 100}%)`;
    requestAnimationFrame(() => {
      if (track) track.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
    });
  }

  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxTag = document.getElementById('lightbox-tag');

  if (lightboxTitle) lightboxTitle.textContent = memory.title;
  if (lightboxDate) lightboxDate.textContent = formattedDate;
  if (lightboxCaption) lightboxCaption.textContent = memory.caption || '';
  const cat = memory.category || 'Momen';
  const catIcon = cat === 'kencan' ? 'fa-heart' : (cat === 'liburan' ? 'fa-plane' : 'fa-star');
  if (lightboxTag) {
    lightboxTag.innerHTML = `<i class="fa-solid ${catIcon}"></i> ${escapeHtml(cat)}`;
  }

  const subPrev = document.getElementById('lightbox-sub-prev');
  const subNext = document.getElementById('lightbox-sub-next');
  const counterBadge = document.getElementById('lightbox-carousel-counter');
  const subDots = document.getElementById('lightbox-sub-dots');

  if (images.length > 1) {
    if (subPrev) subPrev.style.display = 'flex';
    if (subNext) subNext.style.display = 'flex';
    flashSubNav(500);
    if (subDots) {
      subDots.style.display = 'flex';
      subDots.innerHTML = images.map((_, i) => `
        <span class="lightbox-sub-dot ${i === currentLightboxPhotoIndex ? 'active' : ''}" data-idx="${i}"></span>
      `).join('');

      subDots.querySelectorAll('.lightbox-sub-dot').forEach(dot => {
        dot.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(dot.getAttribute('data-idx'), 10) || 0;
          switchLightboxPhoto(idx);
        };
      });
    }
  } else {
    if (subPrev) subPrev.style.display = 'none';
    if (subNext) subNext.style.display = 'none';
    if (counterBadge) counterBadge.style.display = 'none';
    if (subDots) {
      subDots.style.display = 'none';
      subDots.innerHTML = '';
    }
  }

  const btnFeatured = document.getElementById('btn-toggle-featured-lightbox');
  const featuredText = document.getElementById('featured-btn-text');
  if (btnFeatured && featuredText) {
    if (memory.isFeatured !== false) {
      btnFeatured.classList.add('active');
      featuredText.textContent = 'Di Timeline (❤️)';
    } else {
      btnFeatured.classList.remove('active');
      featuredText.textContent = '+ Timeline';
    }
  }
}
