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
    formattedDate: '15 Februari 2026'
  },
  {
    id: '__default_2__',
    imgUrl: 'assets/images/pertemuan.jpeg',
    title: 'Tatap Muka Perdana',
    formattedDate: 'Pertemuan Pertama'
  },
  {
    id: '__default_3__',
    imgUrl: 'assets/images/kedua.jpeg',
    title: 'Tawa & Bahagia',
    formattedDate: 'Kencan Berdua'
  },
  {
    id: '__default_4__',
    imgUrl: 'assets/images/kisah.jpeg',
    title: 'Menembus Jarak',
    formattedDate: 'Perjalanan Bersama'
  },
  {
    id: '__default_5__',
    imgUrl: 'assets/images/pesanpertama.jpeg',
    title: 'Awal Kisah Kita',
    formattedDate: '9 Desember 2025'
  }
];


export const PAGE_STICKER_SVGS = [
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-panda\">\n    <ellipse cx=\"32\" cy=\"34\" rx=\"25\" ry=\"23\" fill=\"#ffffff\"/>\n    <circle cx=\"16\" cy=\"18\" r=\"9\" fill=\"#2d2a32\"/>\n    <circle cx=\"16\" cy=\"18\" r=\"5\" fill=\"#433e49\"/>\n    <circle cx=\"48\" cy=\"18\" r=\"9\" fill=\"#2d2a32\"/>\n    <circle cx=\"48\" cy=\"18\" r=\"5\" fill=\"#433e49\"/>\n    <circle cx=\"32\" cy=\"34\" r=\"21\" fill=\"#fdfdfd\" stroke=\"#ffffff\" stroke-width=\"2\"/>\n    <ellipse cx=\"23\" cy=\"31\" rx=\"6.5\" ry=\"5.5\" transform=\"rotate(-15 23 31)\" fill=\"#2d2a32\"/>\n    <ellipse cx=\"41\" cy=\"31\" rx=\"6.5\" ry=\"5.5\" transform=\"rotate(15 41 31)\" fill=\"#2d2a32\"/>\n    <circle cx=\"23\" cy=\"30.5\" r=\"2.4\" fill=\"#ffffff\"/>\n    <circle cx=\"24.5\" cy=\"32\" r=\"1\" fill=\"#ffffff\"/>\n    <circle cx=\"41\" cy=\"30.5\" r=\"2.4\" fill=\"#ffffff\"/>\n    <circle cx=\"42.5\" cy=\"32\" r=\"1\" fill=\"#ffffff\"/>\n    <ellipse cx=\"16\" cy=\"38\" rx=\"4\" ry=\"2.2\" fill=\"#ffb4c2\" opacity=\"0.85\"/>\n    <ellipse cx=\"48\" cy=\"38\" rx=\"4\" ry=\"2.2\" fill=\"#ffb4c2\" opacity=\"0.85\"/>\n    <ellipse cx=\"32\" cy=\"36\" rx=\"2.5\" ry=\"1.8\" fill=\"#2d2a32\"/>\n    <path d=\"M30 38.5 C31 40, 32 40, 32 38.5 C32 40, 33 40, 34 38.5\" stroke=\"#2d2a32\" stroke-width=\"1.3\" stroke-linecap=\"round\" fill=\"none\"/>\n    <path d=\"M32 49 C32 49 25 43 25 39.5 C25 37 27 35.5 29.5 35.5 C31 35.5 32 36.5 32 36.5 C32 36.5 33 35.5 34.5 35.5 C37 35.5 39 37 39 39.5 C39 43 32 49 32 49 Z\" fill=\"#ff4d6d\" stroke=\"#ffffff\" stroke-width=\"1.2\"/>\n    <circle cx=\"25.5\" cy=\"42\" r=\"3.2\" fill=\"#2d2a32\"/>\n    <circle cx=\"38.5\" cy=\"42\" r=\"3.2\" fill=\"#2d2a32\"/>\n  </svg>",
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-bunny\">\n    <ellipse cx=\"32\" cy=\"36\" rx=\"24\" ry=\"21\" fill=\"#ffffff\"/>\n    <ellipse cx=\"22\" cy=\"17\" rx=\"6.5\" ry=\"14\" transform=\"rotate(-10 22 17)\" fill=\"#ffffff\"/>\n    <ellipse cx=\"22\" cy=\"17\" rx=\"3.5\" ry=\"10\" transform=\"rotate(-10 22 17)\" fill=\"#ffb4c2\"/>\n    <ellipse cx=\"42\" cy=\"17\" rx=\"6.5\" ry=\"14\" transform=\"rotate(10 42 17)\" fill=\"#ffffff\"/>\n    <ellipse cx=\"42\" cy=\"17\" rx=\"3.5\" ry=\"10\" transform=\"rotate(10 42 17)\" fill=\"#ffb4c2\"/>\n    <ellipse cx=\"32\" cy=\"38\" rx=\"21\" ry=\"18\" fill=\"#ffffff\" stroke=\"#f0e2e5\" stroke-width=\"1\"/>\n    <circle cx=\"24\" cy=\"22\" r=\"3\" fill=\"#ffd166\"/>\n    <circle cx=\"24\" cy=\"22\" r=\"1.5\" fill=\"#ff7597\"/>\n    <ellipse cx=\"23\" cy=\"36\" rx=\"2.5\" ry=\"3\" fill=\"#2d2a32\"/>\n    <circle cx=\"22.2\" cy=\"35\" r=\"1\" fill=\"#ffffff\"/>\n    <ellipse cx=\"41\" cy=\"36\" rx=\"2.5\" ry=\"3\" fill=\"#2d2a32\"/>\n    <circle cx=\"40.2\" cy=\"35\" r=\"1\" fill=\"#ffffff\"/>\n    <ellipse cx=\"17\" cy=\"41\" rx=\"4.5\" ry=\"2.5\" fill=\"#ffccd5\" opacity=\"0.9\"/>\n    <ellipse cx=\"47\" cy=\"41\" rx=\"4.5\" ry=\"2.5\" fill=\"#ffccd5\" opacity=\"0.9\"/>\n    <polygon points=\"32,40 30.5,38 33.5,38\" fill=\"#ff7597\"/>\n    <path d=\"M30.5 41 C31.2 42.2 32 42.2 32 41 C32 42.2 32.8 42.2 33.5 41\" stroke=\"#2d2a32\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n    <path d=\"M32 54 C30 54 28 50 28 47 C28 45.5 29.5 44 32 44 C34.5 44 36 45.5 36 47 C36 50 34 54 32 54 Z\" fill=\"#ff3366\"/>\n    <polygon points=\"32,43 30.5,41 33.5,41\" fill=\"#48cae4\"/>\n  </svg>",
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-bear\">\n    <ellipse cx=\"32\" cy=\"35\" rx=\"25\" ry=\"23\" fill=\"#ffffff\"/>\n    <circle cx=\"16\" cy=\"18\" r=\"8.5\" fill=\"#c48b58\"/>\n    <circle cx=\"16\" cy=\"18\" r=\"4.5\" fill=\"#eed0aa\"/>\n    <circle cx=\"48\" cy=\"18\" r=\"8.5\" fill=\"#c48b58\"/>\n    <circle cx=\"48\" cy=\"18\" r=\"4.5\" fill=\"#eed0aa\"/>\n    <circle cx=\"32\" cy=\"35\" r=\"20\" fill=\"#c48b58\"/>\n    <ellipse cx=\"32\" cy=\"39\" rx=\"8\" ry=\"6\" fill=\"#eed0aa\"/>\n    <ellipse cx=\"32\" cy=\"37\" rx=\"3\" ry=\"2\" fill=\"#4a2e18\"/>\n    <path d=\"M30.5 40 C31.2 41.5 32 41.5 32 40 C32 41.5 32.8 41.5 33.5 40\" stroke=\"#4a2e18\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n    <circle cx=\"23\" cy=\"32\" r=\"2.3\" fill=\"#2d2a32\"/>\n    <circle cx=\"22.2\" cy=\"31.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <circle cx=\"41\" cy=\"32\" r=\"2.3\" fill=\"#2d2a32\"/>\n    <circle cx=\"40.2\" cy=\"31.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <ellipse cx=\"17\" cy=\"37\" rx=\"3.5\" ry=\"2\" fill=\"#ff99a8\" opacity=\"0.8\"/>\n    <ellipse cx=\"47\" cy=\"37\" rx=\"3.5\" ry=\"2\" fill=\"#ff99a8\" opacity=\"0.8\"/>\n    <polygon points=\"32,44 34.5,49 40,49.5 36,53.5 37,59 32,56 27,59 28,53.5 24,49.5 29.5,49\" fill=\"#ffb703\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n  </svg>",
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-cat\">\n    <ellipse cx=\"32\" cy=\"35\" rx=\"25\" ry=\"22\" fill=\"#ffffff\"/>\n    <polygon points=\"14,24 24,12 28,24\" fill=\"#ffffff\" stroke=\"#f0e2e5\" stroke-width=\"1.5\"/>\n    <polygon points=\"16,23 23,15 26,23\" fill=\"#ffccd5\"/>\n    <polygon points=\"50,24 40,12 36,24\" fill=\"#ffffff\" stroke=\"#f0e2e5\" stroke-width=\"1.5\"/>\n    <polygon points=\"48,23 41,15 38,23\" fill=\"#ffccd5\"/>\n    <ellipse cx=\"32\" cy=\"37\" rx=\"21\" ry=\"18\" fill=\"#ffffff\" stroke=\"#f0e2e5\" stroke-width=\"1\"/>\n    <polygon points=\"21,18 27,22 21,26\" fill=\"#ff4d6d\"/>\n    <polygon points=\"29,18 23,22 29,26\" fill=\"#ff4d6d\"/>\n    <circle cx=\"25\" cy=\"22\" r=\"2\" fill=\"#ff7597\"/>\n    <path d=\"M21 34 Q24 31 27 34\" stroke=\"#2d2a32\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n    <path d=\"M37 34 Q40 31 43 34\" stroke=\"#2d2a32\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n    <line x1=\"14\" y1=\"36\" x2=\"20\" y2=\"37\" stroke=\"#998090\" stroke-width=\"1\" stroke-linecap=\"round\"/>\n    <line x1=\"14\" y1=\"39\" x2=\"19\" y2=\"40\" stroke=\"#998090\" stroke-width=\"1\" stroke-linecap=\"round\"/>\n    <line x1=\"50\" y1=\"36\" x2=\"44\" y2=\"37\" stroke=\"#998090\" stroke-width=\"1\" stroke-linecap=\"round\"/>\n    <line x1=\"50\" y1=\"39\" x2=\"45\" y2=\"40\" stroke=\"#998090\" stroke-width=\"1\" stroke-linecap=\"round\"/>\n    <polygon points=\"32,38 31,37 33,37\" fill=\"#ff7597\"/>\n    <path d=\"M30.5 39 C31.2 40.5 32 40.5 32 39 C32 40.5 32.8 40.5 33.5 39\" stroke=\"#2d2a32\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n    <ellipse cx=\"18\" cy=\"38\" rx=\"4\" ry=\"2\" fill=\"#ffb4c2\" opacity=\"0.85\"/>\n    <ellipse cx=\"46\" cy=\"38\" rx=\"4\" ry=\"2\" fill=\"#ffb4c2\" opacity=\"0.85\"/>\n    <path d=\"M32 52 C32 52 27 48 27 45 C27 43.5 28.5 42 30.5 42 C31.5 42 32 43 32 43 C32 43 32.5 42 33.5 42 C35.5 42 37 43.5 37 45 C37 48 32 52 32 52 Z\" fill=\"#ff4d6d\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n  </svg>",
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-penguin\">\n    <ellipse cx=\"32\" cy=\"35\" rx=\"24\" ry=\"22\" fill=\"#ffffff\"/>\n    <ellipse cx=\"32\" cy=\"35\" rx=\"20\" ry=\"19\" fill=\"#2b2d42\"/>\n    <ellipse cx=\"25\" cy=\"32\" rx=\"7\" ry=\"8\" fill=\"#ffffff\"/>\n    <ellipse cx=\"39\" cy=\"32\" rx=\"7\" ry=\"8\" fill=\"#ffffff\"/>\n    <ellipse cx=\"32\" cy=\"40\" rx=\"12\" ry=\"11\" fill=\"#ffffff\"/>\n    <circle cx=\"25\" cy=\"31\" r=\"2.2\" fill=\"#2b2d42\"/>\n    <circle cx=\"24.2\" cy=\"30.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <circle cx=\"39\" cy=\"31\" r=\"2.2\" fill=\"#2b2d42\"/>\n    <circle cx=\"38.2\" cy=\"30.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <polygon points=\"32,38 29.5,35 34.5,35\" fill=\"#f77f00\"/>\n    <ellipse cx=\"19\" cy=\"35\" rx=\"3.5\" ry=\"1.8\" fill=\"#ff99a8\" opacity=\"0.9\"/>\n    <ellipse cx=\"45\" cy=\"35\" rx=\"3.5\" ry=\"1.8\" fill=\"#ff99a8\" opacity=\"0.9\"/>\n    <path d=\"M20 44 C24 46, 40 46, 44 44 C45 47, 43 49, 39 49 C33 49, 27 49, 21 48 C19 47, 19 45, 20 44 Z\" fill=\"#e63946\"/>\n    <rect x=\"36\" y=\"47\" width=\"5\" height=\"10\" rx=\"1.5\" fill=\"#d90429\"/>\n    <circle cx=\"32\" cy=\"20\" r=\"3\" fill=\"#ffccd5\"/>\n  </svg>",
  "<svg viewBox=\"0 0 64 64\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"sticker-svg sticker-fox\">\n    <ellipse cx=\"32\" cy=\"35\" rx=\"25\" ry=\"22\" fill=\"#ffffff\"/>\n    <polygon points=\"15,22 25,10 29,22\" fill=\"#e06d44\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n    <polygon points=\"18,21 24,13 27,21\" fill=\"#ffffff\"/>\n    <polygon points=\"49,22 39,10 35,22\" fill=\"#e06d44\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n    <polygon points=\"46,21 40,13 37,21\" fill=\"#ffffff\"/>\n    <circle cx=\"32\" cy=\"35\" r=\"20\" fill=\"#e06d44\"/>\n    <ellipse cx=\"23\" cy=\"39\" rx=\"8\" ry=\"7\" fill=\"#ffffff\"/>\n    <ellipse cx=\"41\" cy=\"39\" rx=\"8\" ry=\"7\" fill=\"#ffffff\"/>\n    <ellipse cx=\"32\" cy=\"40\" rx=\"6\" ry=\"5\" fill=\"#ffffff\"/>\n    <circle cx=\"24\" cy=\"32\" r=\"2.4\" fill=\"#2d2a32\"/>\n    <circle cx=\"23.2\" cy=\"31.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <circle cx=\"40\" cy=\"32\" r=\"2.4\" fill=\"#2d2a32\"/>\n    <circle cx=\"39.2\" cy=\"31.2\" r=\"0.8\" fill=\"#ffffff\"/>\n    <ellipse cx=\"32\" cy=\"37.5\" rx=\"2.2\" ry=\"1.5\" fill=\"#2d2a32\"/>\n    <path d=\"M30.5 39.5 C31.2 41 32 41 32 39.5 C32 41 32.8 41 33.5 39.5\" stroke=\"#2d2a32\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n    <circle cx=\"24\" cy=\"27\" r=\"1.6\" fill=\"#ffffff\"/>\n    <circle cx=\"40\" cy=\"27\" r=\"1.6\" fill=\"#ffffff\"/>\n    <ellipse cx=\"17\" cy=\"38\" rx=\"3.5\" ry=\"2\" fill=\"#ff99a8\" opacity=\"0.85\"/>\n    <ellipse cx=\"47\" cy=\"38\" rx=\"3.5\" ry=\"2\" fill=\"#ff99a8\" opacity=\"0.85\"/>\n    <path d=\"M32 52 C32 52 28 48 28 45.5 C28 44 29.5 42.5 31 42.5 C31.8 42.5 32 43 32 43 C32 43 32.2 42.5 33 42.5 C34.5 42.5 36 44 36 45.5 C36 48 32 52 32 52 Z\" fill=\"#ff4d6d\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n  </svg>"
];

export function getStickerForIndex(idx) {
  return PAGE_STICKER_SVGS[idx % PAGE_STICKER_SVGS.length];
}

const PAGE_TAPE_CLASSES = [
  'washi-tape tape-page-tl',
  'washi-tape tape-page-center',
  'washi-tape tape-page-tr',
  'washi-tape tape-page-diagonal',
  'washi-tape tape-page-bl',
  'washi-tape tape-page-br'
];

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
          formattedDate: formatIndoDate(mem.date) || page.formattedDate || 'Kenangan Berdua'
        };
      }
      return {
        id: page.id || `custom_page_${idx}`,
        memoryId: page.memoryId || null,
        photoIndex: page.photoIndex !== undefined ? page.photoIndex : 0,
        imgUrl: page.imgUrl,
        title: page.title || 'Momen Spesial',
        formattedDate: page.formattedDate || 'Kenangan Berdua'
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
    const stickerSvg = getStickerForIndex(idx);

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
            <!-- Stiker Estetik di Pojok Bingkai Foto -->
            <div class="photo-corner-sticker" title="Stiker kenangan manis">
              ${stickerSvg}
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
        const pagesToSave = tempSelectedItems.map((item, idx) => ({
          id: item.id || `page_${Date.now()}_${idx}`,
          memoryId: item.memoryId || null,
          photoIndex: item.photoIndex !== undefined ? item.photoIndex : 0,
          imgUrl: item.imgUrl,
          title: item.title || 'Momen Spesial',
          formattedDate: item.formattedDate || 'Kenangan Berdua'
        }));

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
