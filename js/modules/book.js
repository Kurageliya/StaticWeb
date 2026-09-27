/**
 * Book & Envelope Module
 * Mengelola interaksi 3D Scrapbook Album fisik (page flip), kustomisasi pilihan foto buku hero,
 * dan Amplop Surat Cinta ganda.
 */

import { escapeHtml, formatIndoDate } from '../utils/helpers.js';
import { getMemoryImages } from './gallery.js';
import { openModal, closeModal } from './modals.js';
import { showToast } from '../utils/toast.js';

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

/**
 * Mengonversi data memory ke format halaman scrapbook
 */
function memoryToPageItem(memory, index) {
  const imgs = getMemoryImages(memory);
  const imgUrl = imgs[0] || memory.imgUrl || 'assets/images/nembak.jpeg';
  const formattedDate = formatIndoDate(memory.date) || 'Kenangan Indah';
  const catLower = (memory.category || 'spesial').toLowerCase().trim();

  let stampText = 'Momen Indah';
  let stampIcon = 'fa-sparkles';
  let stampClass = 'stamp-star';

  if (catLower === 'kencan') {
    stampText = 'Kencan Manis';
    stampIcon = 'fa-champagne-glasses';
    stampClass = 'stamp-heart';
  } else if (catLower === 'liburan') {
    stampText = 'Liburan Seru';
    stampIcon = 'fa-plane-departure';
    stampClass = '';
  } else if (catLower === 'spesial') {
    stampText = 'Momen Spesial';
    stampIcon = 'fa-heart';
    stampClass = 'stamp-love';
  } else if (memory.category) {
    stampText = memory.category.charAt(0).toUpperCase() + memory.category.slice(1);
    stampIcon = 'fa-tag';
    stampClass = '';
  }

  return {
    id: memory.id,
    imgUrl,
    title: memory.title || `Kenangan #${index + 1}`,
    formattedDate,
    stampText,
    stampIcon,
    stampClass
  };
}

/**
 * Mendapatkan daftar halaman aktif untuk album buku
 */
export function getEffectiveBookItems(memoriesList = [], scrapbookMemoryIds = []) {
  if (Array.isArray(scrapbookMemoryIds) && scrapbookMemoryIds.length > 0) {
    const memoryMap = new Map();
    memoriesList.forEach(m => {
      if (m && m.id) memoryMap.set(m.id, m);
    });

    const chosenItems = [];
    scrapbookMemoryIds.forEach((id, idx) => {
      const mem = memoryMap.get(id);
      if (mem) {
        chosenItems.push(memoryToPageItem(mem, idx));
      }
    });

    if (chosenItems.length > 0) {
      return chosenItems;
    }
  }

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
  const bookPageIndicator = document.getElementById('book-page-indicator');
  const btnEditScrapbook = document.getElementById('btn-edit-scrapbook');
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
  let tempSelectedIds = [];

  function updateNavUI() {
    const totalPages = currentPages.length;
    if (bookPageIndicator && totalPages > 0) {
      bookPageIndicator.innerHTML = `<i class="fa-solid fa-book-open"></i> Halaman ${currentPage + 1} / ${totalPages}`;
    }
  }

  function goToPage(targetIndex) {
    const totalPages = currentPages.length;
    if (isFlipping || targetIndex === currentPage) return;
    if (targetIndex < 0 || targetIndex >= totalPages) return;

    const fromIndex = currentPage;
    const toIndex = targetIndex;
    isFlipping = true;
    currentPage = toIndex;

    updateNavUI();
    playPaperRustle();

    if (toIndex > fromIndex) {
      const flippingPage = currentPages[fromIndex];
      const targetPage = currentPages[toIndex];

      targetPage.classList.remove('turned', 'flipping-forward', 'flipping-backward');
      targetPage.classList.add('active');
      targetPage.style.zIndex = 10;

      for (let i = fromIndex + 1; i < toIndex; i++) {
        currentPages[i].classList.add('turned');
        currentPages[i].classList.remove('active', 'flipping-forward', 'flipping-backward');
        currentPages[i].style.zIndex = i + 1;
      }

      flippingPage.classList.remove('active');
      flippingPage.classList.add('flipping-forward');

      setTimeout(() => {
        flippingPage.classList.remove('flipping-forward');
        flippingPage.classList.add('turned');
        flippingPage.style.zIndex = fromIndex + 1;

        targetPage.style.zIndex = totalPages + 5;
        isFlipping = false;
      }, 850);

    } else {
      const targetPage = currentPages[toIndex];
      const currentPageEl = currentPages[fromIndex];

      currentPageEl.classList.remove('active', 'flipping-forward', 'flipping-backward');
      currentPageEl.style.zIndex = 10;

      if (fromIndex - toIndex > 1) {
        for (let i = toIndex + 1; i < fromIndex; i++) {
          currentPages[i].classList.remove('turned', 'flipping-forward', 'flipping-backward');
          currentPages[i].classList.remove('active');
          currentPages[i].style.zIndex = totalPages - i;
        }
      }

      targetPage.classList.remove('turned', 'active');
      targetPage.classList.add('flipping-backward');

      setTimeout(() => {
        targetPage.classList.remove('flipping-backward');
        targetPage.classList.add('active');
        targetPage.style.zIndex = totalPages + 5;

        for (let i = toIndex + 1; i < totalPages; i++) {
          currentPages[i].classList.remove('turned', 'flipping-forward', 'flipping-backward');
          currentPages[i].classList.remove('active');
          currentPages[i].style.zIndex = totalPages - i;
        }
        isFlipping = false;
      }, 850);
    }
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
    const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
    const mems = typeof getMemoriesList === 'function' ? getMemoriesList() : [];
    const items = getEffectiveBookItems(mems, settings.scrapbookMemoryIds);

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

      page.addEventListener('click', () => {
        if (idx === currentPage) {
          flipNext();
        } else if (idx < currentPage) {
          goToPage(idx);
        }
      });
    });

    updateNavUI();
  }

  currentRefreshHeroBook = refreshBook;

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

  // Klik pada indikator halaman juga membalik ke halaman berikutnya
  if (bookPageIndicator) {
    bookPageIndicator.addEventListener('click', flipNext);
  }

  // --- Modal Pemilih Foto Album Buku ---
  function updatePickerUI() {
    if (!scrapbookMemoriesPicker) return;
    const cards = scrapbookMemoriesPicker.querySelectorAll('.scrapbook-picker-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-id');
      const idx = tempSelectedIds.indexOf(id);
      const isSelected = idx !== -1;
      card.classList.toggle('is-selected', isSelected);
      const badge = card.querySelector('.scrapbook-picker-badge');
      if (badge) {
        badge.textContent = isSelected ? `#${idx + 1}` : '+';
      }
    });

    if (scrapbookSelectedCounter) {
      if (tempSelectedIds.length === 0) {
        scrapbookSelectedCounter.textContent = '0 / 6 (Bawaan Awal)';
      } else {
        scrapbookSelectedCounter.textContent = `${tempSelectedIds.length} / 6 Dipilih`;
      }
    }
  }

  function renderPickerGrid() {
    if (!scrapbookMemoriesPicker) return;
    const mems = typeof getMemoriesList === 'function' ? getMemoriesList() : [];

    if (mems.length === 0) {
      scrapbookMemoriesPicker.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-regular fa-images" style="font-size: 2.2rem; color: var(--pink-accent); margin-bottom: 0.6rem; display: block;"></i>
          <p style="font-weight: 600; color: var(--text-dark); margin-bottom: 0.35rem;">Belum ada foto di Galeri Kenangan</p>
          <small>Kamu bisa menambahkan momen foto baru di bagian galeri terlebih dahulu untuk dipilih ke dalam album buku ini.</small>
        </div>
      `;
      return;
    }

    scrapbookMemoriesPicker.innerHTML = mems.map(memory => {
      const imgs = getMemoryImages(memory);
      const thumb = imgs[0] || memory.imgUrl || 'assets/images/nembak.jpeg';
      const formattedDate = formatIndoDate(memory.date) || 'Kenangan Indah';
      const isSelected = tempSelectedIds.includes(memory.id);
      const orderIdx = tempSelectedIds.indexOf(memory.id);

      return `
        <div class="scrapbook-picker-card ${isSelected ? 'is-selected' : ''}" data-id="${escapeHtml(memory.id)}" title="Klik untuk memilih atau membatalkan pilihan">
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(memory.title)}" class="scrapbook-picker-thumb" loading="lazy">
          <span class="scrapbook-picker-badge">${isSelected ? `#${orderIdx + 1}` : '+'}</span>
          <div class="scrapbook-picker-info">
            <h4 class="scrapbook-picker-title">${escapeHtml(memory.title || 'Momen')}</h4>
            <span class="scrapbook-picker-date">${escapeHtml(formattedDate)}</span>
          </div>
        </div>
      `;
    }).join('');

    scrapbookMemoriesPicker.querySelectorAll('.scrapbook-picker-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const pos = tempSelectedIds.indexOf(id);
        if (pos !== -1) {
          tempSelectedIds.splice(pos, 1);
        } else {
          if (tempSelectedIds.length >= 6) {
            showToast('⚠️ Maksimal 6 foto kenangan untuk album buku.');
            return;
          }
          tempSelectedIds.push(id);
        }
        updatePickerUI();
      });
    });

    updatePickerUI();
  }

  function openPickerModal() {
    const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
    tempSelectedIds = Array.isArray(settings.scrapbookMemoryIds) ? [...settings.scrapbookMemoryIds] : [];
    renderPickerGrid();
    openModal(modalEditScrapbook);
  }

  if (btnEditScrapbook) {
    btnEditScrapbook.addEventListener('click', openPickerModal);
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
      tempSelectedIds = [];
      updatePickerUI();
      showToast('ℹ️ Pilihan dikosongkan (akan kembali ke 5 momen bawaan awal saat disimpan).');
    });
  }

  if (btnScrapbookSave) {
    btnScrapbookSave.addEventListener('click', async () => {
      const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
      const updated = {
        ...settings,
        scrapbookMemoryIds: [...tempSelectedIds]
      };

      closeModal(modalEditScrapbook);
      if (typeof onSaveSettings === 'function') {
        await onSaveSettings(updated);
      }
      refreshBook();
      showToast(tempSelectedIds.length > 0 ? `📖 Album buku berhasil diperbarui (${tempSelectedIds.length} halaman)!` : '📖 Album buku kembali ke momen bawaan awal!');
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
 * Interaksi Amplop Surat Cinta Ganda (Flip & Buka/Tutup)
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
