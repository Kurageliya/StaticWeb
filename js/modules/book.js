/**
 * Book & Envelope Module
 * Mengelola interaksi 3D Scrapbook Album fisik (page flip), kustomisasi pilihan foto buku hero,
 * dan Amplop Surat Cinta ganda.
 */

import { escapeHtml, formatIndoDate } from '../utils/helpers.js';
import { getMemoryImages } from './gallery.js';
import { openModal, closeModal } from './modals.js';
import { showToast } from '../utils/toast.js';
import { getScrapbookCustomPages, saveScrapbookCustomPages } from '../repositories/storageRepository.js';

let audioCtx = null;
let currentRefreshHeroBook = null;

export function playPaperRustle() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;
    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.11);
  } catch (e) {
    // Abaikan jika browser membatasi autoplay audio
  }
}

/**
 * 5 Momen bawaan awal album scrapbook jika belum ada kustomisasi
 */
export const DEFAULT_SCRAPBOOK_ITEMS = [
  {
    id: '__default_1__',
    imgUrl: 'assets/images/nembak.jpeg',
    title: 'Rijal & Cilpaaa',
    formattedDate: '15 Februari 2026',
    stampText: 'Sealed with Love',
    stampIcon: 'fa-stamp',
    stampClass: ''
  },
  {
    id: '__default_2__',
    imgUrl: 'assets/images/pertemuan.jpeg',
    title: 'Tatap Muka Perdana',
    formattedDate: 'Pertemuan Pertama',
    stampText: 'First Met',
    stampIcon: 'fa-heart',
    stampClass: 'stamp-heart'
  },
  {
    id: '__default_3__',
    imgUrl: 'assets/images/kedua.jpeg',
    title: 'Tawa & Bahagia',
    formattedDate: 'Kencan Berdua',
    stampText: 'Sweet Memories',
    stampIcon: 'fa-sparkles',
    stampClass: 'stamp-star'
  },
  {
    id: '__default_4__',
    imgUrl: 'assets/images/kisah.jpeg',
    title: 'Menembus Jarak',
    formattedDate: 'Perjalanan Bersama',
    stampText: 'Jakarta — Kudus',
    stampIcon: 'fa-plane-departure',
    stampClass: ''
  },
  {
    id: '__default_5__',
    imgUrl: 'assets/images/pesanpertama.jpeg',
    title: 'Awal Kisah Kita',
    formattedDate: '9 Desember 2025',
    stampText: 'The Beginning',
    stampIcon: 'fa-comment-dots',
    stampClass: 'stamp-love'
  }
];

const PAGE_TAPE_CLASSES = [
  'washi-tape tape-page-tl',
  'washi-tape tape-page-center',
  'washi-tape tape-page-tr',
  'washi-tape tape-page-diagonal',
  'washi-tape tape-page-bl',
  'washi-tape tape-page-br'
];

const SCRAPBOOK_STAMPS = [
  { text: 'Sealed with Love', icon: 'fa-stamp', class: '' },
  { text: 'First Met', icon: 'fa-heart', class: 'stamp-heart' },
  { text: 'Sweet Memories', icon: 'fa-sparkles', class: 'stamp-star' },
  { text: 'Jakarta — Kudus', icon: 'fa-plane-departure', class: '' },
  { text: 'The Beginning', icon: 'fa-comment-dots', class: 'stamp-love' },
  { text: 'Forever & Always', icon: 'fa-infinity', class: 'stamp-star' }
];

function getStampForIndex(idx) {
  return SCRAPBOOK_STAMPS[idx % SCRAPBOOK_STAMPS.length];
}

/**
 * Mengambil SEMUA foto dari galeri (mendukung multi-foto / album dalam satu momen)
 */
export function getAllAvailableMemoryPhotos(memoriesList = []) {
  const photoList = [];
  if (!Array.isArray(memoriesList)) return photoList;

  memoriesList.forEach((mem) => {
    if (!mem || !mem.id) return;
    const images = getMemoryImages(mem);
    const totalInMem = images.length;

    images.forEach((imgUrl, photoIndex) => {
      if (!imgUrl || typeof imgUrl !== 'string' || !imgUrl.trim()) return;
      photoList.push({
        id: `${mem.id}__p${photoIndex}`,
        memoryId: mem.id,
        photoIndex: photoIndex,
        imgUrl: imgUrl.trim(),
        title: mem.title || 'Momen Spesial',
        date: mem.date || '',
        formattedDate: formatIndoDate(mem.date) || 'Kenangan Indah',
        category: mem.category || 'Momen',
        isMultiple: totalInMem > 1,
        photoNumberText: totalInMem > 1 ? `Foto ${photoIndex + 1}/${totalInMem}` : ''
      });
    });
  });

  return photoList;
}

/**
 * Mendapatkan daftar halaman aktif untuk album buku (Prioritas: Kustom Lokal -> Default)
 */
export function getEffectiveBookItems(memoriesList = [], customPages = null) {
  let pages = customPages;
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    pages = getScrapbookCustomPages();
  }

  // Jika user sudah memiliki kustomisasi foto album buku:
  if (Array.isArray(pages) && pages.length > 0) {
    const memoryMap = new Map();
    if (Array.isArray(memoriesList)) {
      memoriesList.forEach(m => {
        if (m && m.id) memoryMap.set(m.id, m);
      });
    }

    return pages.map((page, idx) => {
      const stamp = getStampForIndex(idx);
      if (page.memoryId && memoryMap.has(page.memoryId)) {
        const mem = memoryMap.get(page.memoryId);
        const images = getMemoryImages(mem);
        const imgUrl = (images && images[page.photoIndex]) || page.imgUrl;
        return {
          id: page.id || `custom_page_${idx}`,
          memoryId: page.memoryId,
          photoIndex: page.photoIndex,
          imgUrl: imgUrl,
          title: mem.title || page.title || 'Momen Spesial',
          formattedDate: formatIndoDate(mem.date) || page.formattedDate || 'Kenangan Berdua',
          stampText: page.stampText || stamp.text,
          stampIcon: page.stampIcon || stamp.icon,
          stampClass: page.stampClass || stamp.class
        };
      }
      return {
        id: page.id || `custom_page_${idx}`,
        memoryId: page.memoryId || null,
        photoIndex: page.photoIndex !== undefined ? page.photoIndex : 0,
        imgUrl: page.imgUrl,
        title: page.title || 'Momen Spesial',
        formattedDate: page.formattedDate || 'Kenangan Berdua',
        stampText: page.stampText || stamp.text,
        stampIcon: page.stampIcon || stamp.icon,
        stampClass: page.stampClass || stamp.class
      };
    });
  }

  // Fallback HANYA jika belum ada kustomisasi sama sekali
  return DEFAULT_SCRAPBOOK_ITEMS;
}

/**
 * Menghasilkan HTML halaman-halaman buku ke dalam #scrapbook-pages
 */
export function renderHeroBookPages(items = []) {
  const scrapbookPagesContainer = document.getElementById('scrapbook-pages');
  if (!scrapbookPagesContainer) return;

  const totalPages = items.length;
  let html = '';

  items.forEach((item, idx) => {
    const pageNum = idx + 1;
    const isFirst = idx === 0;
    const isLast = idx === totalPages - 1;
    const zIndex = totalPages - idx;
    const tapeClass = PAGE_TAPE_CLASSES[idx % PAGE_TAPE_CLASSES.length];

    html += `
      <div class="scrapbook-page page-${pageNum} ${isFirst ? 'active' : ''}" data-page="${pageNum}" style="z-index: ${zIndex};">
        <div class="page-paper">
          <div class="${tapeClass}"></div>
          
          <!-- Tombol Sunting/Pensil di atas Kertas Buku -->
          <button type="button" class="btn-paper-edit" data-page-index="${idx}" title="Sunting atau ganti foto album buku ini" aria-label="Sunting Foto">
            <i class="fa-solid fa-pencil"></i>
            <span>Sunting</span>
          </button>

          <div class="page-photo-card">
            <div class="img-wrapper">
              <img src="${escapeHtml(item.imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
            </div>
            <div class="page-caption">
              <span class="caption-date">${escapeHtml(item.formattedDate)}</span>
              <p class="caption-title">${escapeHtml(item.title)}</p>
            </div>
            <div class="stamp-badge ${item.stampClass || ''}">
              <i class="fa-solid ${item.stampIcon || 'fa-sparkles'}"></i> ${escapeHtml(item.stampText || 'Sealed with Love')}
            </div>
          </div>
          <div class="page-corner-fold ${isLast ? 'page-corner-reset' : ''}" title="${isLast ? 'Klik untuk kembali ke halaman awal' : 'Klik untuk membalik halaman'}">
            <span>${isLast ? 'Ulang <i class="fa-solid fa-rotate-left"></i>' : 'Balik <i class="fa-solid fa-arrow-right"></i>'}</span>
          </div>
          <div class="page-number-tag">Hal. ${pageNum} / ${totalPages}</div>
        </div>
        <div class="page-flip-overlay"></div>
      </div>
    `;
  });

  scrapbookPagesContainer.innerHTML = html;
}

/**
 * Inisialisasi dan Orkestrasi Scrapbook Album Fisik 3D
 */
export function setupHeroScrapbook({
  getCoupleSettings = () => ({}),
  getMemoriesList = () => [],
  onSaveSettings = null
} = {}) {
  const scrapbookBook = document.getElementById('scrapbook-book');
  const scrapbookPagesContainer = document.getElementById('scrapbook-pages');
  const modalEditScrapbook = document.getElementById('modal-edit-scrapbook');
  const modalScrapbookClose = document.getElementById('modal-scrapbook-close');
  const btnScrapbookCancel = document.getElementById('btn-scrapbook-cancel');
  const btnScrapbookSave = document.getElementById('btn-scrapbook-save');
  const btnScrapbookResetDefault = document.getElementById('btn-scrapbook-reset-default');
  const scrapbookMemoriesPicker = document.getElementById('scrapbook-memories-picker');
  const scrapbookSelectedCounter = document.getElementById('scrapbook-selected-counter');

  if (!scrapbookBook) return;

  let currentPage = 0;
  let isFlipping = false;
  let currentPages = [];
  let tempSelectedItems = [];

  function goToPage(targetIndex) {
    const totalPages = currentPages.length;
    if (isFlipping || targetIndex === currentPage || totalPages === 0) return;
    if (targetIndex < 0 || targetIndex >= totalPages) return;

    isFlipping = true;
    playPaperRustle();

    if (targetIndex > currentPage) {
      for (let i = currentPage; i < targetIndex; i++) {
        const pageToTurn = currentPages[i];
        if (pageToTurn) {
          pageToTurn.classList.add('flipping-forward');
          setTimeout(() => {
            pageToTurn.classList.remove('active', 'flipping-forward');
            pageToTurn.classList.add('turned');
          }, 350);
        }
      }
    } else {
      for (let i = currentPage - 1; i >= targetIndex; i--) {
        const pageToTurnBack = currentPages[i];
        if (pageToTurnBack) {
          pageToTurnBack.classList.remove('turned');
          pageToTurnBack.classList.add('flipping-backward');
          setTimeout(() => {
            pageToTurnBack.classList.remove('flipping-backward');
            pageToTurnBack.classList.add('active');
          }, 350);
        }
      }
    }

    setTimeout(() => {
      currentPage = targetIndex;
      currentPages.forEach((page, idx) => {
        if (idx < currentPage) {
          page.classList.add('turned');
          page.classList.remove('active');
          page.style.zIndex = idx;
        } else if (idx === currentPage) {
          page.classList.remove('turned');
          page.classList.add('active');
          page.style.zIndex = totalPages + 5;
        } else {
          page.classList.remove('turned', 'active');
          page.style.zIndex = totalPages - idx;
        }
      });
      isFlipping = false;
    }, 400);
  }

  function flipNext() {
    const totalPages = currentPages.length;
    if (isFlipping || totalPages === 0) return;
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else {
      goToPage(0);
    }
  }

  function flipPrev() {
    const totalPages = currentPages.length;
    if (isFlipping || totalPages === 0) return;
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }

  function refreshBook() {
    const mems = typeof getMemoriesList === 'function' ? getMemoriesList() : [];
    const customPages = getScrapbookCustomPages();
    const items = getEffectiveBookItems(mems, customPages);

    renderHeroBookPages(items);
    currentPages = Array.from(document.querySelectorAll('.scrapbook-page'));
    const totalPages = currentPages.length;
    currentPage = 0;

    currentPages.forEach((page, idx) => {
      page.classList.remove('turned', 'flipping-forward', 'flipping-backward');
      if (idx === 0) {
        page.classList.add('active');
        page.style.zIndex = totalPages + 5;
      } else {
        page.classList.remove('active');
        page.style.zIndex = totalPages - idx;
      }

      page.addEventListener('click', (e) => {
        // Jangan balik halaman jika tombol edit di atas kertas diklik
        if (e.target.closest('.btn-paper-edit')) return;

        if (idx === currentPage) {
          flipNext();
        } else if (idx < currentPage) {
          goToPage(idx);
        }
      });
    });
  }

  currentRefreshHeroBook = refreshBook;

  // Delegasi klik tombol sunting foto di atas kertas buku
  if (scrapbookPagesContainer) {
    scrapbookPagesContainer.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-paper-edit');
      if (editBtn) {
        e.stopPropagation();
        openPickerModal();
      }
    });
  }

  // Interaksi Touch Swipe pada Buku
  let touchStartX = 0;
  let touchStartY = 0;

  scrapbookBook.addEventListener('touchstart', (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }
  }, { passive: true });

  scrapbookBook.addEventListener('touchend', (e) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        flipNext();
      } else {
        flipPrev();
      }
    }
  }, { passive: true });

  // --- Modal Pemilih Foto Album Buku ---
  function updatePickerUI() {
    if (!scrapbookMemoriesPicker) return;
    const cards = scrapbookMemoriesPicker.querySelectorAll('.scrapbook-picker-card');
    cards.forEach(card => {
      const itemId = card.getAttribute('data-item-id');
      const orderIdx = tempSelectedItems.findIndex(item => item.id === itemId);
      const isSelected = orderIdx !== -1;
      card.classList.toggle('is-selected', isSelected);
      const badge = card.querySelector('.scrapbook-picker-badge');
      if (badge) {
        badge.innerHTML = isSelected ? `#${orderIdx + 1}` : '<i class="fa-solid fa-plus"></i>';
      }
    });

    if (scrapbookSelectedCounter) {
      if (tempSelectedItems.length === 0) {
        scrapbookSelectedCounter.textContent = '0 / 6 (Bawaan Awal)';
      } else {
        scrapbookSelectedCounter.textContent = `${tempSelectedItems.length} / 6 Dipilih`;
      }
    }
  }

  function renderPickerGrid() {
    if (!scrapbookMemoriesPicker) return;
    const mems = typeof getMemoriesList === 'function' ? getMemoriesList() : [];
    const allPhotos = getAllAvailableMemoryPhotos(mems);

    if (allPhotos.length === 0) {
      scrapbookMemoriesPicker.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-regular fa-images" style="font-size: 2.2rem; color: var(--pink-accent); margin-bottom: 0.6rem; display: block;"></i>
          <p style="font-weight: 600; color: var(--text-dark); margin-bottom: 0.35rem;">Belum ada foto di Galeri Kenangan</p>
          <small>Kamu bisa menambahkan momen foto baru di bagian galeri terlebih dahulu untuk dipilih ke dalam album buku ini.</small>
        </div>
      `;
      return;
    }

    scrapbookMemoriesPicker.innerHTML = allPhotos.map(photo => {
      const orderIdx = tempSelectedItems.findIndex(item => item.id === photo.id || (item.memoryId === photo.memoryId && item.photoIndex === photo.photoIndex));
      const isSelected = orderIdx !== -1;

      return `
        <div class="scrapbook-picker-card ${isSelected ? 'is-selected' : ''}" data-item-id="${escapeHtml(photo.id)}" title="Klik untuk memilih foto ini ke buku">
          <div class="scrapbook-picker-thumb-wrap" style="position: relative; overflow: hidden; width: 100%; aspect-ratio: 4/3; background: #eee;">
            <img src="${escapeHtml(photo.imgUrl)}" alt="${escapeHtml(photo.title)}" class="scrapbook-picker-thumb" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
            ${photo.photoNumberText ? `<span class="picker-subphoto-badge"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(photo.photoNumberText)}</span>` : ''}
            <span class="scrapbook-picker-badge">${isSelected ? `#${orderIdx + 1}` : '<i class="fa-solid fa-plus"></i>'}</span>
          </div>
          <div class="scrapbook-picker-info">
            <h4 class="scrapbook-picker-title">${escapeHtml(photo.title || 'Momen')}</h4>
            <span class="scrapbook-picker-date">${escapeHtml(photo.formattedDate)}</span>
          </div>
        </div>
      `;
    }).join('');

    scrapbookMemoriesPicker.querySelectorAll('.scrapbook-picker-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.getAttribute('data-item-id');
        const pos = tempSelectedItems.findIndex(item => item.id === itemId);
        if (pos !== -1) {
          tempSelectedItems.splice(pos, 1);
        } else {
          if (tempSelectedItems.length >= 6) {
            showToast('⚠️ Maksimal 6 foto kenangan untuk album buku.');
            return;
          }
          const matchedPhoto = allPhotos.find(p => p.id === itemId);
          if (matchedPhoto) {
            tempSelectedItems.push({ ...matchedPhoto });
          }
        }
        updatePickerUI();
      });
    });

    updatePickerUI();
  }

  function openPickerModal() {
    const custom = getScrapbookCustomPages();
    if (Array.isArray(custom) && custom.length > 0) {
      tempSelectedItems = custom.map(item => ({ ...item }));
    } else {
      tempSelectedItems = [];
    }
    renderPickerGrid();
    openModal(modalEditScrapbook);
  }

  if (modalScrapbookClose) {
    modalScrapbookClose.addEventListener('click', () => closeModal(modalEditScrapbook));
  }
  if (btnScrapbookCancel) {
    btnScrapbookCancel.addEventListener('click', () => closeModal(modalEditScrapbook));
  }
  if (modalEditScrapbook) {
    const backdrop = modalEditScrapbook.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => closeModal(modalEditScrapbook));
  }

  if (btnScrapbookResetDefault) {
    btnScrapbookResetDefault.addEventListener('click', () => {
      tempSelectedItems = [];
      updatePickerUI();
      showToast('ℹ️ Pilihan dikosongkan. Klik "Terapkan ke Buku" untuk kembali ke momen bawaan.');
    });
  }

  if (btnScrapbookSave) {
    btnScrapbookSave.addEventListener('click', async () => {
      closeModal(modalEditScrapbook);

      if (tempSelectedItems.length > 0) {
        const pagesToSave = tempSelectedItems.map((item, idx) => {
          const stamp = getStampForIndex(idx);
          return {
            id: item.id || `page_${Date.now()}_${idx}`,
            memoryId: item.memoryId || null,
            photoIndex: item.photoIndex !== undefined ? item.photoIndex : 0,
            imgUrl: item.imgUrl,
            title: item.title || 'Momen Spesial',
            formattedDate: item.formattedDate || 'Kenangan Berdua',
            stampText: stamp.text,
            stampIcon: stamp.icon,
            stampClass: stamp.class
          };
        });

        // 1. Simpan ke LocalStorage agar langsung aktif seketika
        saveScrapbookCustomPages(pagesToSave);

        // 2. Simpan ke Couple Settings & Sync ke Firestore
        const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
        const updated = {
          ...settings,
          scrapbookCustomPages: pagesToSave,
          scrapbookPageRefs: pagesToSave.map(p => ({
            memoryId: p.memoryId,
            photoIndex: p.photoIndex,
            id: p.id
          }))
        };

        if (typeof onSaveSettings === 'function') {
          await onSaveSettings(updated, { silent: true });
        }

        refreshBook();
        showToast(`📖 Album buku berhasil diperbarui (${pagesToSave.length} halaman)!`);
      } else {
        // Reset kembali ke default bawaan
        saveScrapbookCustomPages(null);

        const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
        const updated = {
          ...settings,
          scrapbookCustomPages: null,
          scrapbookPageRefs: null
        };

        if (typeof onSaveSettings === 'function') {
          await onSaveSettings(updated, { silent: true });
        }

        refreshBook();
        showToast('📖 Album buku kembali ke momen bawaan awal!');
      }
    });
  }

  // Render awal album buku
  refreshBook();
}

export function refreshHeroBook() {
  if (typeof currentRefreshHeroBook === 'function') {
    currentRefreshHeroBook();
  }
}

/**
 * Interaksi Amplop Surat Cinta Ganda (Surat 1 & Surat 2)
 */
export function setupEnvelopeInteraction(getCoupleSettings) {
  const envelope = document.getElementById('envelope');
  const btnToggleEnvelope = document.getElementById('btn-toggle-envelope');
  const letterFlipcard = document.getElementById('letter-flipcard');
  const btnFlipLetter = document.getElementById('btn-flip-letter');
  const btnFlipText = document.getElementById('btn-flip-text');

  if (!envelope || !btnToggleEnvelope) return;

  let isOpen = false;

  function toggleEnvelope() {
    isOpen = !isOpen;
    const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
    const p1 = settings.person1 || 'Rijal';
    const p2 = settings.person2 || 'Cilpaaa';

    if (isOpen) {
      envelope.classList.add('open');
      btnToggleEnvelope.innerHTML = `<i class="fa-solid fa-envelope"></i> Tutup Surat`;
      if (btnFlipLetter) {
        btnFlipLetter.style.display = 'inline-flex';
        const isFlipped = letterFlipcard && letterFlipcard.classList.contains('flipped');
        if (btnFlipText) {
          btnFlipText.textContent = isFlipped ? `Balik Surat — Dari ${p1}` : `Balik Surat — Dari ${p2}`;
        }
      }
    } else {
      envelope.classList.remove('open');
      btnToggleEnvelope.innerHTML = `<i class="fa-solid fa-envelope-open"></i> Buka Surat Cinta`;
      if (btnFlipLetter) {
        btnFlipLetter.style.display = 'none';
      }
      if (letterFlipcard) {
        letterFlipcard.classList.remove('flipped');
      }
    }
  }

  envelope.addEventListener('click', (e) => {
    if (!isOpen && !e.target.closest('button')) {
      toggleEnvelope();
    }
  });

  btnToggleEnvelope.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEnvelope();
  });

  if (btnFlipLetter && letterFlipcard) {
    btnFlipLetter.addEventListener('click', (e) => {
      e.stopPropagation();
      letterFlipcard.classList.toggle('flipped');
      const isFlipped = letterFlipcard.classList.contains('flipped');
      const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
      const p1 = settings.person1 || 'Rijal';
      const p2 = settings.person2 || 'Cilpaaa';
      if (btnFlipText) {
        btnFlipText.textContent = isFlipped ? `Balik Surat — Dari ${p1}` : `Balik Surat — Dari ${p2}`;
      }
    });
  }
}
