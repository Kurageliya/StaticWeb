/**
 * Gallery Module
 * Mengelola Galeri Polaroid, 3D Curved Slider Panorama, Filter Kategori, Drag-to-Slide,
 * dan Carousel Foto mini di dalam kartu polaroid.
 */
import { escapeHtml } from '../utils/helpers.js';

let activeHoverItem = null;

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

export function apply3DCurvedGlider() {
  const polaroidGrid = document.getElementById('polaroid-grid');
  if (!polaroidGrid) return;
  const gallerySliderWrapper = document.getElementById('gallery-slider-wrapper');
  if (!gallerySliderWrapper || !gallerySliderWrapper.classList.contains('mode-slider')) return;

  const items = polaroidGrid.querySelectorAll('.polaroid-item');
  if (items.length === 0) return;

  const gridRect = polaroidGrid.getBoundingClientRect();
  const gridCenter = gridRect.left + gridRect.width / 2;
  const scrollLeft = polaroidGrid.scrollLeft;
  const maxScroll = polaroidGrid.scrollWidth - polaroidGrid.clientWidth;
  const isMobile = window.innerWidth <= 600;

  // Lebar kartu + jarak gap sebagai unit langkah acuan
  const sampleItem = items[0];
  const itemWidth = sampleItem ? sampleItem.getBoundingClientRect().width : (isMobile ? 270 : 300);
  const gap = isMobile ? 18 : 28;
  const pitch = itemWidth + gap;

  // Deteksi kartu primer: kartu yang sedang di-hover > tepi kiri awal > tepi kanan akhir > kartu terdekat di tengah
  let primaryIndex = -1;
  if (activeHoverItem) {
    items.forEach((item, idx) => {
      if (item === activeHoverItem) primaryIndex = idx;
    });
  } else if (scrollLeft <= 25) {
    primaryIndex = 0;
  } else if (maxScroll > 0 && scrollLeft >= (maxScroll - 25)) {
    primaryIndex = items.length - 1;
  } else {
    let minDiff = Infinity;
    items.forEach((item, idx) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const diff = Math.abs(itemCenter - gridCenter);
      if (diff < minDiff) {
        minDiff = diff;
        primaryIndex = idx;
      }
    });
  }

  items.forEach((item, index) => {
    const isPrimary = (index === primaryIndex);

    if (isPrimary) {
      const translateY = isMobile ? -6 : -10;
      const scale = isMobile ? 1.05 : 1.08;
      item.style.transform = `translate3d(0, ${translateY}px, 0) rotateY(0deg) rotateZ(0deg) scale(${scale})`;
      item.style.zIndex = '45';
      item.style.opacity = '1';
      item.style.boxShadow = '0 22px 48px rgba(58, 46, 57, 0.22), 0 8px 24px rgba(216, 131, 144, 0.28), 0 0 0 2px rgba(216, 131, 144, 0.55)';
      item.classList.add('is-center-card');
    } else {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const dist = itemCenter - gridCenter;
      const norm = dist / (pitch || 1);
      const clampedNorm = Math.max(-2, Math.min(2, norm));
      const clampedAbs = Math.abs(clampedNorm);

      const arcY = Math.min(12, Math.pow(clampedAbs, 1.15) * 8);
      const rotateZ = clampedNorm * 1.6;
      const rotateY = -clampedNorm * 4;
      const scale = Math.max(0.92, 1.0 - (clampedAbs * 0.06));

      item.style.transform = `translate3d(0, ${arcY.toFixed(1)}px, 0) rotateY(${rotateY.toFixed(1)}deg) rotateZ(${rotateZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      item.style.zIndex = String(Math.max(5, Math.round(25 - clampedAbs * 6)));
      item.style.opacity = '1';
      item.style.boxShadow = '';
      item.classList.remove('is-center-card');
    }
  });
}

export function updateGallerySliderState(filteredCount = null) {
  const polaroidGrid = document.getElementById('polaroid-grid');
  if (!polaroidGrid) return;
  const gallerySliderPrev = document.getElementById('gallery-slider-prev');
  const gallerySliderNext = document.getElementById('gallery-slider-next');
  const galleryProgressFill = document.getElementById('gallery-progress-fill');
  const galleryCurrentRange = document.getElementById('gallery-current-range');
  const galleryTotalCount = document.getElementById('gallery-total-count');

  const total = typeof filteredCount === 'number' ? filteredCount : polaroidGrid.querySelectorAll('.polaroid-item').length;
  if (galleryTotalCount) galleryTotalCount.textContent = total;

  if (total === 0) {
    if (galleryCurrentRange) galleryCurrentRange.textContent = '0';
    if (galleryProgressFill) galleryProgressFill.style.width = '0%';
    if (gallerySliderPrev) gallerySliderPrev.disabled = true;
    if (gallerySliderNext) gallerySliderNext.disabled = true;
    return;
  }

  const scrollLeft = polaroidGrid.scrollLeft;
  const maxScroll = polaroidGrid.scrollWidth - polaroidGrid.clientWidth;

  if (galleryProgressFill) {
    if (maxScroll <= 0) {
      galleryProgressFill.style.width = '100%';
    } else {
      const pct = Math.min(1, Math.max(0, scrollLeft / maxScroll));
      galleryProgressFill.style.width = `${Math.min(100, Math.max(15, (pct * 85) + 15))}%`;
    }
  }

  const items = polaroidGrid.querySelectorAll('.polaroid-item');
  if (items.length > 0) {
    const sampleItem = polaroidGrid.querySelector('.polaroid-item');
    const itemWidth = sampleItem ? (sampleItem.clientWidth + 28) : 328;
    const firstIdx = Math.min(total, Math.max(1, Math.floor((scrollLeft + 15) / itemWidth) + 1));
    const visibleCount = Math.max(1, Math.round(polaroidGrid.clientWidth / itemWidth));
    const lastIdx = Math.min(total, firstIdx + visibleCount - 1);

    if (galleryCurrentRange) {
      galleryCurrentRange.textContent = firstIdx >= lastIdx ? `${firstIdx}` : `${firstIdx} - ${lastIdx}`;
    }
  }

  if (gallerySliderPrev) gallerySliderPrev.disabled = scrollLeft <= 15;
  if (gallerySliderNext) gallerySliderNext.disabled = scrollLeft >= (maxScroll - 15);

  apply3DCurvedGlider();
}

export function renderPolaroidGrid({
  memoriesList = [],
  currentFilter = 'all',
  onOpenLightbox = null,
  onEditMemory = null,
  onToggleFeatured = null,
  onDeleteMemory = null
}) {
  const polaroidGrid = document.getElementById('polaroid-grid');
  if (!polaroidGrid) return [];

  polaroidGrid.innerHTML = '';

  const filteredMemories = memoriesList.filter(item => {
    if (currentFilter === 'all') return true;
    return item.category === currentFilter;
  });

  const galleryTotalCount = document.getElementById('gallery-total-count');
  if (galleryTotalCount) {
    galleryTotalCount.textContent = filteredMemories.length;
  }

  if (memoriesList.length === 0) {
    polaroidGrid.innerHTML = `
      <div class="empty-gallery-state text-center" style="grid-column: 1/-1; padding: 3.5rem 1.5rem; color: var(--text-muted); width: 100%;">
        <div style="font-size: 2.8rem; margin-bottom: 0.75rem; color: var(--primary-pink);"><i class="fa-regular fa-images"></i></div>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Album Kenangan Masih Kosong</h3>
        <p style="max-width: 440px; margin: 0 auto 1.5rem; font-size: 0.95rem; line-height: 1.5;">Yuk abadikan momen indah perjalanan cinta kalian! Klik tombol di bawah untuk menambahkan foto kenangan pertama.</p>
        <button type="button" class="btn btn-sm btn-gold" onclick="document.getElementById('btn-add-memory').click();">
          <i class="fa-solid fa-plus"></i> Tambah Foto Kenangan
        </button>
      </div>
    `;
    updateGallerySliderState(0);
    return filteredMemories;
  }

  if (filteredMemories.length === 0) {
    polaroidGrid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: var(--text-muted); width: 100%;">Belum ada foto dalam kategori "${escapeHtml(currentFilter)}". Klik "Tambah Kenangan Baru" untuk mengunggah.</div>`;
    updateGallerySliderState(0);
    return filteredMemories;
  }

  filteredMemories.forEach((memory, memoryIndex) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'polaroid-item';

    const dateObj = new Date(memory.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    const isLoved = memory.isFeatured !== false;
    const images = getMemoryImages(memory);
    const hasMultiplePhotos = images.length > 1;

    let currentPhotoIndex = 0;

    let imgBoxHtml = '';
    if (hasMultiplePhotos) {
      imgBoxHtml = `
        <div class="img-box card-carousel" data-photo-index="0">
          <div class="carousel-track">
            ${images.map((img, i) => `
              <div class="carousel-slide ${i === 0 ? 'active' : ''}">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(memory.title)} - Foto ${i + 1}" loading="lazy">
              </div>
            `).join('')}
          </div>

          <button type="button" class="card-carousel-btn card-carousel-prev" aria-label="Foto Sebelumnya" title="Foto Sebelumnya">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" class="card-carousel-btn card-carousel-next" aria-label="Foto Selanjutnya" title="Foto Selanjutnya">
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <div class="carousel-dots">
            ${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
          </div>

          <div class="hover-overlay">
            <i class="fa-solid fa-heart"></i>
          </div>
          <button type="button" class="btn-card-action btn-card-edit" title="Edit Kenangan">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" class="btn-card-action btn-card-love ${isLoved ? 'active' : ''}" title="${isLoved ? 'Sembunyikan dari Timeline' : 'Tampilkan di Timeline'}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button type="button" class="btn-card-action btn-card-delete" title="Hapus Foto Kenangan">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    } else {
      const singleImg = images[0] || memory.imgUrl || '';
      imgBoxHtml = `
        <div class="img-box">
          <img src="${escapeHtml(singleImg)}" alt="${escapeHtml(memory.title)}" loading="lazy">
          <div class="hover-overlay">
            <i class="fa-solid fa-heart"></i>
          </div>
          <button type="button" class="btn-card-action btn-card-edit" title="Edit Kenangan">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" class="btn-card-action btn-card-love ${isLoved ? 'active' : ''}" title="${isLoved ? 'Sembunyikan dari Timeline' : 'Tampilkan di Timeline'}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button type="button" class="btn-card-action btn-card-delete" title="Hapus Foto Kenangan">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }

    const categoryName = memory.category || 'Momen';
    const categoryIcon = categoryName === 'kencan' ? 'fa-heart' : (categoryName === 'liburan' ? 'fa-plane' : 'fa-star');

    itemEl.innerHTML = `
      ${imgBoxHtml}
      <div class="item-details">
        <div class="card-header-row">
          <h3 class="item-title" title="${escapeHtml(memory.title)}">${escapeHtml(memory.title)}</h3>
          <span class="card-category-pill"><i class="fa-solid ${categoryIcon}"></i> ${escapeHtml(categoryName)}</span>
        </div>
        ${memory.caption ? `<p class="item-caption-snippet">${escapeHtml(memory.caption)}</p>` : '<p class="item-caption-snippet" style="opacity:0.55; font-style:italic;">Kenangan manis kita...</p>'}
        <div class="card-chips-row">
          <span class="card-chip"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
          ${isLoved ? `<span class="card-chip card-chip-timeline" style="color:var(--pink-accent);"><i class="fa-solid fa-heart"></i> Timeline</span>` : ''}
        </div>
        <button type="button" class="btn-card-open" title="Buka Detail Kenangan">
          <i class="fa-solid fa-expand"></i> Buka Kenangan
        </button>
      </div>
    `;

    if (hasMultiplePhotos) {
      const imgBox = itemEl.querySelector('.card-carousel');
      const track = itemEl.querySelector('.carousel-track');
      const dots = itemEl.querySelectorAll('.carousel-dot');
      const btnPrev = itemEl.querySelector('.card-carousel-prev');
      const btnNext = itemEl.querySelector('.card-carousel-next');

      function updateCardPhoto(newIdx) {
        currentPhotoIndex = (newIdx + images.length) % images.length;
        track.style.transform = `translateX(-${currentPhotoIndex * 100}%)`;
        dots.forEach((dot, dIdx) => {
          dot.classList.toggle('active', dIdx === currentPhotoIndex);
        });
        imgBox.setAttribute('data-photo-index', currentPhotoIndex);
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
          e.stopPropagation();
          updateCardPhoto(currentPhotoIndex - 1);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', (e) => {
          e.stopPropagation();
          updateCardPhoto(currentPhotoIndex + 1);
        });
      }

      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const dIdx = parseInt(dot.getAttribute('data-index'), 10) || 0;
          updateCardPhoto(dIdx);
        });
      });

      let touchStartX = 0;
      let touchStartY = 0;
      imgBox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      imgBox.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) updateCardPhoto(currentPhotoIndex + 1);
          else updateCardPhoto(currentPhotoIndex - 1);
        }
      }, { passive: true });
    }

    const btnOpen = itemEl.querySelector('.btn-card-open');
    if (btnOpen) {
      btnOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onOpenLightbox === 'function') {
          onOpenLightbox(memoryIndex, currentPhotoIndex);
        }
      });
    }

    itemEl.querySelector('.img-box').addEventListener('click', (e) => {
      if (e.target.closest('.btn-card-action') || e.target.closest('.card-carousel-btn') || e.target.closest('.carousel-dots')) return;
      if (typeof onOpenLightbox === 'function') {
        onOpenLightbox(memoryIndex, currentPhotoIndex);
      }
    });

    itemEl.querySelector('.item-details').addEventListener('click', (e) => {
      if (e.target.closest('.btn-card-open')) return;
      if (typeof onOpenLightbox === 'function') {
        onOpenLightbox(memoryIndex, currentPhotoIndex);
      }
    });

    const btnEdit = itemEl.querySelector('.btn-card-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onEditMemory === 'function') {
          onEditMemory(memory.id);
        }
      });
    }

    const btnLove = itemEl.querySelector('.btn-card-love');
    if (btnLove) {
      btnLove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onToggleFeatured === 'function') {
          onToggleFeatured(memory.id);
        }
      });
    }

    const btnDelete = itemEl.querySelector('.btn-card-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onDeleteMemory === 'function') {
          onDeleteMemory(memory.id);
        }
      });
    }

    polaroidGrid.appendChild(itemEl);
  });

  updateGallerySliderState(filteredMemories.length);
  requestAnimationFrame(apply3DCurvedGlider);

  return filteredMemories;
}

export function setupGallerySliderEvents() {
  const polaroidGrid = document.getElementById('polaroid-grid');
  const gallerySliderWrapper = document.getElementById('gallery-slider-wrapper');
  const gallerySliderPrev = document.getElementById('gallery-slider-prev');
  const gallerySliderNext = document.getElementById('gallery-slider-next');
  const btnViewSlider = document.getElementById('btn-view-slider');
  const btnViewGrid = document.getElementById('btn-view-grid');

  const getSliderStep = () => {
    const sampleItem = polaroidGrid ? polaroidGrid.querySelector('.polaroid-item') : null;
    return sampleItem ? (sampleItem.offsetWidth + 28) : 328;
  };

  if (polaroidGrid) {
    let scrollTimer = null;
    polaroidGrid.addEventListener('scroll', () => {
      if (scrollTimer) cancelAnimationFrame(scrollTimer);
      scrollTimer = requestAnimationFrame(() => {
        updateGallerySliderState();
      });
    }, { passive: true });

    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;
    let dragDistance = 0;

    polaroidGrid.addEventListener('mousedown', (e) => {
      if (!gallerySliderWrapper || !gallerySliderWrapper.classList.contains('mode-slider')) return;
      if (e.target.closest('button, a, input, select, textarea, .card-carousel-btn')) return;
      isDown = true;
      dragDistance = 0;
      startX = e.pageX - polaroidGrid.offsetLeft;
      scrollLeftStart = polaroidGrid.scrollLeft;
      polaroidGrid.style.cursor = 'grabbing';
      polaroidGrid.style.userSelect = 'none';
      polaroidGrid.style.scrollBehavior = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      if (polaroidGrid) {
        polaroidGrid.style.cursor = '';
        polaroidGrid.style.userSelect = '';
        polaroidGrid.style.scrollBehavior = 'smooth';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown || !polaroidGrid) return;
      const x = e.pageX - polaroidGrid.offsetLeft;
      const walk = (x - startX);
      dragDistance = Math.abs(walk);
      polaroidGrid.scrollLeft = scrollLeftStart - walk;
    });

    polaroidGrid.addEventListener('click', (e) => {
      if (dragDistance > 6) {
        e.preventDefault();
        e.stopPropagation();
        dragDistance = 0;
      }
    }, true);

    polaroidGrid.addEventListener('mouseover', (e) => {
      if (!gallerySliderWrapper || !gallerySliderWrapper.classList.contains('mode-slider')) return;
      const item = e.target.closest('.polaroid-item');
      if (item && item !== activeHoverItem) {
        activeHoverItem = item;
        apply3DCurvedGlider();
      }
    });

    polaroidGrid.addEventListener('mouseout', (e) => {
      if (!gallerySliderWrapper || !gallerySliderWrapper.classList.contains('mode-slider')) return;
      const item = e.target.closest('.polaroid-item');
      if (item && !item.contains(e.relatedTarget)) {
        activeHoverItem = null;
        apply3DCurvedGlider();
      }
    });
  }

  if (gallerySliderPrev && polaroidGrid) {
    gallerySliderPrev.addEventListener('click', () => {
      polaroidGrid.scrollBy({ left: -getSliderStep(), behavior: 'smooth' });
    });
  }

  if (gallerySliderNext && polaroidGrid) {
    gallerySliderNext.addEventListener('click', () => {
      polaroidGrid.scrollBy({ left: getSliderStep(), behavior: 'smooth' });
    });
  }

  if (btnViewSlider && btnViewGrid && gallerySliderWrapper) {
    btnViewSlider.addEventListener('click', () => {
      gallerySliderWrapper.classList.add('mode-slider');
      gallerySliderWrapper.classList.remove('mode-grid');
      btnViewSlider.classList.add('active');
      btnViewGrid.classList.remove('active');
      updateGallerySliderState();
      requestAnimationFrame(apply3DCurvedGlider);
    });

    btnViewGrid.addEventListener('click', () => {
      gallerySliderWrapper.classList.add('mode-grid');
      gallerySliderWrapper.classList.remove('mode-slider');
      btnViewGrid.classList.add('active');
      btnViewSlider.classList.remove('active');
      if (polaroidGrid) {
        polaroidGrid.querySelectorAll('.polaroid-item').forEach(item => {
          item.style.transform = '';
          item.style.opacity = '';
          item.style.zIndex = '';
          item.style.boxShadow = '';
          item.classList.remove('is-center-card');
        });
      }
    });
  }

  window.addEventListener('resize', () => {
    updateGallerySliderState();
  });
}

export function setupFilterEvents(onFilterChange) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const newFilter = btn.getAttribute('data-filter') || 'all';
      if (typeof onFilterChange === 'function') {
        onFilterChange(newFilter);
      }
    });
  });
}
