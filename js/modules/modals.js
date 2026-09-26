/**
 * Modals & Forms Module
 * Mengelola semua popup modal:
 * - Pengaturan Pasangan & Surat Cinta Ganda
 * - Unggah Kenangan Baru (Multi-Foto dengan Kompresi Gambar)
 * - Edit Kenangan Tersimpan (Multi-Foto dengan Kompresi Gambar)
 * - Dialog Konfirmasi Hapus Foto
 * - Pemilih Tema Background
 * - Scroll Reveal Observer
 */
import { escapeHtml, compressAndReadImage, safeSetLocalStorage } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';
import { getMemoryImages } from './gallery.js';

export function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('active');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* --------------------------------------------------------------------------
   1. THEME SWITCHER
   -------------------------------------------------------------------------- */
export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  safeSetLocalStorage('love_journey_theme', themeId);

  const themeOptions = document.querySelectorAll('.theme-card-option');
  themeOptions.forEach(opt => {
    if (opt.getAttribute('data-theme-id') === themeId) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
}

export function setupThemeEvents(initialTheme = 'dusty-rose') {
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const modalThemePicker = document.getElementById('modal-theme-picker');
  const modalThemeClose = document.getElementById('modal-theme-close');
  const themeOptionsGrid = document.getElementById('theme-options-grid');
  const modalThemeDone = document.querySelector('.modal-theme-done');

  applyTheme(initialTheme);

  if (btnThemeToggle && modalThemePicker) {
    btnThemeToggle.addEventListener('click', () => openModal(modalThemePicker));
  }

  if (modalThemeClose && modalThemePicker) {
    modalThemeClose.addEventListener('click', () => closeModal(modalThemePicker));
    const backdrop = modalThemePicker.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => closeModal(modalThemePicker));
    }
  }

  if (modalThemeDone && modalThemePicker) {
    modalThemeDone.addEventListener('click', () => {
      closeModal(modalThemePicker);
      showToast('✨ Tema Warna Background Berhasil Diterapkan!');
    });
  }

  if (themeOptionsGrid) {
    themeOptionsGrid.addEventListener('click', (e) => {
      const optionCard = e.target.closest('.theme-card-option');
      if (optionCard) {
        const themeId = optionCard.getAttribute('data-theme-id');
        applyTheme(themeId);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   2. DISPLAY UPDATE (COUPLE NAMES, DATES, & LETTERS)
   -------------------------------------------------------------------------- */
export function updateCoupleDisplay(coupleSettings = {}) {
  const p1 = coupleSettings.person1 || 'Romeo';
  const p2 = coupleSettings.person2 || 'Juliet';
  const combinedNames = `${p1} & ${p2}`;

  const navBrandNames = document.getElementById('nav-brand-names');
  const heroCoupleNames = document.getElementById('hero-couple-names');
  const heroCoupleTitle = document.getElementById('hero-couple-title');
  const footerNames = document.getElementById('footer-names');

  if (navBrandNames) navBrandNames.textContent = combinedNames;
  if (heroCoupleNames) heroCoupleNames.textContent = combinedNames;
  if (heroCoupleTitle) heroCoupleTitle.textContent = combinedNames;
  if (footerNames) footerNames.textContent = combinedNames;

  const letterRecipientName = document.getElementById('letter-recipient-name');
  const letterSenderName = document.getElementById('letter-sender-name');
  const letterFromNameFront = document.getElementById('letter-from-name-front');
  const letterRecipientName2 = document.getElementById('letter-recipient-name-2');
  const letterSenderName2 = document.getElementById('letter-sender-name-2');
  const letterFromNameBack = document.getElementById('letter-from-name-back');
  const labelLetterPerson1 = document.getElementById('label-letter-person1');
  const labelLetterPerson2 = document.getElementById('label-letter-person2');

  if (letterRecipientName) letterRecipientName.textContent = p2;
  if (letterSenderName) letterSenderName.textContent = p1;
  if (letterFromNameFront) letterFromNameFront.textContent = p1;

  if (letterRecipientName2) letterRecipientName2.textContent = p1;
  if (letterSenderName2) letterSenderName2.textContent = p2;
  if (letterFromNameBack) letterFromNameBack.textContent = p2;

  if (labelLetterPerson1) labelLetterPerson1.textContent = p1;
  if (labelLetterPerson2) labelLetterPerson2.textContent = p2;

  const dateObj = new Date(coupleSettings.anniversaryDate || Date.now());
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('id-ID', options);

  const heroDateDisplay = document.getElementById('hero-date-display');
  const counterSinceDate = document.getElementById('counter-since-date');
  if (heroDateDisplay) heroDateDisplay.textContent = formattedDate;
  if (counterSinceDate) counterSinceDate.textContent = `(${formattedDate})`;

  const letterBodyText = document.getElementById('letter-body-text');
  if (letterBodyText) {
    const msg1 = coupleSettings.letterMessage || '';
    const paragraphs = msg1.split('\n\n').filter(p => p.trim());
    if (paragraphs.length > 0) {
      letterBodyText.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    } else {
      letterBodyText.innerHTML = `<p class="letter-placeholder-text">Belum ada pesan surat cinta yang ditulis.</p>`;
    }
  }

  const letterBodyText2 = document.getElementById('letter-body-text-2');
  if (letterBodyText2) {
    const msg2 = coupleSettings.letterMessage2 || '';
    const paragraphs2 = msg2.split('\n\n').filter(p => p.trim());
    if (paragraphs2.length > 0) {
      letterBodyText2.innerHTML = paragraphs2.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    } else {
      letterBodyText2.innerHTML = `
        <p class="letter-placeholder-text"><i class="fa-solid fa-heart-circle-plus" style="font-size:1.8rem; color:var(--pink-accent); margin-bottom:0.5rem; display:inline-block;"></i></p>
        <p class="letter-placeholder-text">Surat dari <strong>${escapeHtml(p2)}</strong> masih kosong... ✨</p>
        <p class="letter-placeholder-text">Ayo tulis pesan balasan cintamu lewat menu <strong>Pengaturan Pasangan</strong> di bawah!</p>
      `;
    }
  }

  const btnFlipText = document.getElementById('btn-flip-text');
  const letterFlipcard = document.getElementById('letter-flipcard');
  if (btnFlipText) {
    const isFlipped = letterFlipcard && letterFlipcard.classList.contains('flipped');
    btnFlipText.textContent = isFlipped ? `Balik Surat — Dari ${p1}` : `Balik Surat — Dari ${p2}`;
  }
}

/* --------------------------------------------------------------------------
   3. CONFIRM DELETE MODAL
   -------------------------------------------------------------------------- */
let pendingDeleteId = null;

export function openDeleteConfirm(id, title = '') {
  pendingDeleteId = id;
  const modalConfirm = document.getElementById('modal-confirm-delete');
  const textEl = document.getElementById('confirm-delete-text');
  if (textEl) {
    textEl.innerHTML = `Apakah kamu yakin ingin menghapus foto <strong style="color:var(--text-dark);">"${escapeHtml(title)}"</strong> dari scrapbook?`;
  }
  openModal(modalConfirm);
}

export function setupConfirmDeleteEvents({ onDeleteConfirmed = null }) {
  const modalConfirm = document.getElementById('modal-confirm-delete');
  const btnCancel = document.getElementById('btn-confirm-delete-cancel');
  const btnOk = document.getElementById('btn-confirm-delete-ok');

  if (btnCancel && modalConfirm) {
    btnCancel.addEventListener('click', () => {
      pendingDeleteId = null;
      closeModal(modalConfirm);
    });
    const backdrop = modalConfirm.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        pendingDeleteId = null;
        closeModal(modalConfirm);
      });
    }
  }

  if (btnOk && modalConfirm) {
    btnOk.addEventListener('click', () => {
      if (!pendingDeleteId) return;
      const id = pendingDeleteId;
      pendingDeleteId = null;
      closeModal(modalConfirm);
      if (typeof onDeleteConfirmed === 'function') {
        onDeleteConfirmed(id);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   4. EDIT MEMORY MODAL (MULTI-PHOTO)
   -------------------------------------------------------------------------- */
let editCurrentImages = [];

function renderEditPhotoGrid() {
  const editPhotoGrid = document.getElementById('edit-photo-grid');
  if (!editPhotoGrid) return;
  editPhotoGrid.innerHTML = '';

  if (editCurrentImages.length === 0) {
    editPhotoGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 0.85rem; color:var(--text-muted); font-size:0.85rem;">Belum ada foto yang dipilih. Silakan unggah minimal 1 foto di bawah.</div>`;
    return;
  }

  editCurrentImages.forEach((imgUrl, idx) => {
    const card = document.createElement('div');
    card.className = 'multi-thumb-card';
    card.innerHTML = `
      <img src="${escapeHtml(imgUrl)}" alt="Foto ${idx + 1}">
      <span class="thumb-badge">#${idx + 1}</span>
      <button type="button" class="btn-thumb-remove" title="Hapus Foto ini"><i class="fa-solid fa-xmark"></i></button>
    `;

    card.querySelector('.btn-thumb-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      editCurrentImages.splice(idx, 1);
      renderEditPhotoGrid();
    });

    editPhotoGrid.appendChild(card);
  });
}

export function openEditMemoryModal(memory) {
  if (!memory) return;
  const modalEditMemory = document.getElementById('modal-edit-memory');

  document.getElementById('edit-memory-id').value = memory.id;
  document.getElementById('edit-memory-title').value = memory.title || '';
  document.getElementById('edit-memory-date').value = memory.date || '';
  document.getElementById('edit-memory-category').value = memory.category || 'spesial';
  document.getElementById('edit-memory-caption').value = memory.caption || '';

  editCurrentImages = [...getMemoryImages(memory)];
  renderEditPhotoGrid();

  const editFileInput = document.getElementById('edit-memory-file-input');
  if (editFileInput) editFileInput.value = '';
  const editImgUrl = document.getElementById('edit-memory-img-url');
  if (editImgUrl) editImgUrl.value = '';

  openModal(modalEditMemory);
}

export function setupEditMemoryEvents({ onSaveEdit = null }) {
  const modalEditMemory = document.getElementById('modal-edit-memory');
  const modalEditClose = document.getElementById('modal-edit-close');
  const formEditMemory = document.getElementById('form-edit-memory');
  const btnEditCancel = document.getElementById('btn-edit-cancel');
  const editUploadDropzone = document.getElementById('edit-upload-dropzone');
  const editFileInput = document.getElementById('edit-memory-file-input');

  const closeEditModal = () => closeModal(modalEditMemory);

  if (modalEditClose) modalEditClose.addEventListener('click', closeEditModal);
  if (btnEditCancel) btnEditCancel.addEventListener('click', closeEditModal);
  if (modalEditMemory) {
    const editBackdrop = modalEditMemory.querySelector('.modal-backdrop');
    if (editBackdrop) editBackdrop.addEventListener('click', closeEditModal);
  }

  if (editUploadDropzone && editFileInput) {
    editUploadDropzone.addEventListener('click', () => editFileInput.click());
  }

  if (editFileInput) {
    editFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      for (const file of files) {
        try {
          const dataUrl = await compressAndReadImage(file);
          editCurrentImages.push(dataUrl);
        } catch (err) {
          console.warn('Error reading edit photo:', err);
        }
      }
      renderEditPhotoGrid();
      editFileInput.value = '';
    });
  }

  if (editUploadDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      editUploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        editUploadDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      editUploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        editUploadDropzone.classList.remove('dragover');
      });
    });

    editUploadDropzone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files || []).filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        try {
          const dataUrl = await compressAndReadImage(file);
          editCurrentImages.push(dataUrl);
        } catch (err) {
          console.warn('Error reading edit dropped photo:', err);
        }
      }
      renderEditPhotoGrid();
    });
  }

  if (formEditMemory) {
    formEditMemory.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-memory-id').value;

      const editImgUrlInput = document.getElementById('edit-memory-img-url');
      if (editImgUrlInput && editImgUrlInput.value.trim()) {
        const rawUrls = editImgUrlInput.value.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
        editCurrentImages.push(...rawUrls);
      }

      if (editCurrentImages.length === 0) {
        showToast('⚠️ Momen harus memiliki minimal 1 foto.');
        return;
      }

      const updatedMemoryData = {
        id,
        title: document.getElementById('edit-memory-title').value.trim(),
        date: document.getElementById('edit-memory-date').value,
        category: document.getElementById('edit-memory-category').value,
        caption: document.getElementById('edit-memory-caption').value.trim(),
        images: editCurrentImages,
        imgUrl: editCurrentImages[0]
      };

      closeEditModal();
      if (typeof onSaveEdit === 'function') {
        onSaveEdit(updatedMemoryData);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   5. ADD MEMORY MODAL & COUPLE SETTINGS MODAL
   -------------------------------------------------------------------------- */
let addSelectedImages = [];

function renderAddPhotoGrid() {
  const multiPhotoGrid = document.getElementById('multi-photo-grid');
  const filePreviewWrap = document.getElementById('file-preview-wrap');
  const dropzoneContent = document.getElementById('dropzone-content');
  const multiFileCount = document.getElementById('multi-file-count');

  if (!multiPhotoGrid) return;
  multiPhotoGrid.innerHTML = '';

  if (addSelectedImages.length === 0) {
    if (filePreviewWrap) filePreviewWrap.style.display = 'none';
    if (dropzoneContent) dropzoneContent.style.display = 'block';
    return;
  }

  if (dropzoneContent) dropzoneContent.style.display = 'none';
  if (filePreviewWrap) filePreviewWrap.style.display = 'block';

  if (multiFileCount) {
    multiFileCount.innerHTML = `<i class="fa-solid fa-images"></i> ${addSelectedImages.length} Foto Terpilih ${addSelectedImages.length > 1 ? '(Mode Carousel Aktif)' : ''}`;
  }

  addSelectedImages.forEach((imgUrl, idx) => {
    const card = document.createElement('div');
    card.className = 'multi-thumb-card';
    card.innerHTML = `
      <img src="${escapeHtml(imgUrl)}" alt="Foto ${idx + 1}">
      <span class="thumb-badge">#${idx + 1}</span>
      <button type="button" class="btn-thumb-remove" title="Hapus Foto ini"><i class="fa-solid fa-xmark"></i></button>
    `;

    card.querySelector('.btn-thumb-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      addSelectedImages.splice(idx, 1);
      renderAddPhotoGrid();
    });

    multiPhotoGrid.appendChild(card);
  });
}

async function handleAddSelectedFiles(files) {
  const memoryFileInput = document.getElementById('memory-file-input');
  const fileList = Array.from(files || []).filter(f => f.type.startsWith('image/'));
  if (fileList.length === 0) return;

  for (const file of fileList) {
    try {
      const dataUrl = await compressAndReadImage(file);
      addSelectedImages.push(dataUrl);
    } catch (err) {
      console.warn('Error reading upload photo:', err);
    }
  }
  renderAddPhotoGrid();
  if (memoryFileInput) memoryFileInput.value = '';
}

export function setupModalEvents({
  getCoupleSettings = () => ({}),
  onSaveSettings = null,
  onAddMemory = null
} = {}) {
  const inputPerson1 = document.getElementById('input-person1');
  const inputPerson2 = document.getElementById('input-person2');
  const inputDate = document.getElementById('input-date');
  const inputBirthdayPerson1 = document.getElementById('input-birthday-person1');
  const inputBirthdayPerson2 = document.getElementById('input-birthday-person2');
  const labelBirthdayPerson1 = document.getElementById('label-birthday-person1');
  const labelBirthdayPerson2 = document.getElementById('label-birthday-person2');
  const inputLetter = document.getElementById('input-letter');
  const inputLetter2 = document.getElementById('input-letter-2');
  const inputMusicUrl = document.getElementById('input-music-url');
  const labelLetterPerson1 = document.getElementById('label-letter-person1');
  const labelLetterPerson2 = document.getElementById('label-letter-person2');

  const btnEditCouple = document.getElementById('btn-edit-couple');
  const modalSettings = document.getElementById('modal-settings');
  const modalSettingsClose = document.getElementById('modal-settings-close');
  const formSettings = document.getElementById('form-settings');

  const btnAddMemory = document.getElementById('btn-add-memory');
  const modalAddMemory = document.getElementById('modal-add-memory');
  const modalAddClose = document.getElementById('modal-add-close');
  const formAddMemory = document.getElementById('form-add-memory');
  const memoryFileInput = document.getElementById('memory-file-input');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const btnAddMoreFiles = document.getElementById('btn-add-more-files');

  if (inputPerson1) {
    inputPerson1.addEventListener('input', () => {
      const name = inputPerson1.value.trim() || 'Pasangan 1';
      if (labelLetterPerson1) labelLetterPerson1.textContent = name;
      if (labelBirthdayPerson1) labelBirthdayPerson1.textContent = name;
    });
  }
  if (inputPerson2) {
    inputPerson2.addEventListener('input', () => {
      const name = inputPerson2.value.trim() || 'Pasangan 2';
      if (labelLetterPerson2) labelLetterPerson2.textContent = name;
      if (labelBirthdayPerson2) labelBirthdayPerson2.textContent = name;
    });
  }

  if (btnEditCouple) {
    btnEditCouple.addEventListener('click', () => {
      const settings = getCoupleSettings();
      inputPerson1.value = settings.person1 || '';
      inputPerson2.value = settings.person2 || '';
      inputDate.value = settings.anniversaryDate ? settings.anniversaryDate.substring(0, 16) : '';
      if (inputBirthdayPerson1) inputBirthdayPerson1.value = settings.birthdayPerson1 || '11-22';
      if (inputBirthdayPerson2) inputBirthdayPerson2.value = settings.birthdayPerson2 || '09-24';
      inputLetter.value = settings.letterMessage || '';
      if (inputLetter2) inputLetter2.value = settings.letterMessage2 || '';
      if (inputMusicUrl) inputMusicUrl.value = settings.musicUrl || '';

      if (labelLetterPerson1) labelLetterPerson1.textContent = settings.person1 || 'Pasangan 1';
      if (labelLetterPerson2) labelLetterPerson2.textContent = settings.person2 || 'Pasangan 2';
      if (labelBirthdayPerson1) labelBirthdayPerson1.textContent = settings.person1 || 'Pasangan 1';
      if (labelBirthdayPerson2) labelBirthdayPerson2.textContent = settings.person2 || 'Pasangan 2';

      openModal(modalSettings);
    });
  }

  if (modalSettingsClose) {
    modalSettingsClose.addEventListener('click', () => closeModal(modalSettings));
    const backdrop = document.querySelector('#modal-settings .modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => closeModal(modalSettings));
    const closeBtn = document.querySelector('#modal-settings .modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modalSettings));
  }

  if (formSettings) {
    formSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        person1: inputPerson1.value.trim(),
        person2: inputPerson2.value.trim(),
        anniversaryDate: inputDate.value,
        birthdayPerson1: inputBirthdayPerson1 ? inputBirthdayPerson1.value.trim() : '11-22',
        birthdayPerson2: inputBirthdayPerson2 ? inputBirthdayPerson2.value.trim() : '09-24',
        letterMessage: inputLetter.value.trim(),
        letterMessage2: inputLetter2 ? inputLetter2.value.trim() : '',
        musicUrl: inputMusicUrl ? inputMusicUrl.value.trim() : ''
      };

      closeModal(modalSettings);
      if (typeof onSaveSettings === 'function') {
        onSaveSettings(updated);
      }
    });
  }

  if (btnAddMemory) {
    btnAddMemory.addEventListener('click', () => {
      if (formAddMemory) formAddMemory.reset();
      addSelectedImages = [];
      if (memoryFileInput) memoryFileInput.value = '';
      renderAddPhotoGrid();
      openModal(modalAddMemory);
    });
  }

  if (modalAddClose) {
    modalAddClose.addEventListener('click', () => closeModal(modalAddMemory));
    const backdrop = document.querySelector('#modal-add-memory .modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => closeModal(modalAddMemory));
    const cancelBtn = document.querySelector('#modal-add-memory .modal-add-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modalAddMemory));
  }

  if (formAddMemory) {
    formAddMemory.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputUrl = document.getElementById('memory-img-url').value.trim();
      const urlList = inputUrl ? inputUrl.split(/[\n,]+/).map(u => u.trim()).filter(Boolean) : [];
      const allImages = [...addSelectedImages, ...urlList];

      if (allImages.length === 0) {
        showToast('⚠️ Silakan pilih minimal 1 foto dari HP/Laptop atau masukkan URL gambar.');
        return;
      }

      const newMemory = {
        id: 'mem-' + Date.now(),
        title: document.getElementById('memory-title').value.trim(),
        date: document.getElementById('memory-date').value,
        category: document.getElementById('memory-category').value,
        images: allImages,
        imgUrl: allImages[0],
        caption: document.getElementById('memory-caption').value.trim(),
        isFeatured: true
      };

      closeModal(modalAddMemory);
      if (typeof onAddMemory === 'function') {
        onAddMemory(newMemory);
      }
    });
  }

  if (uploadDropzone && memoryFileInput) {
    uploadDropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btn-add-more-files') || e.target.closest('.btn-thumb-remove')) return;
      memoryFileInput.click();
    });

    if (btnAddMoreFiles) {
      btnAddMoreFiles.addEventListener('click', (e) => {
        e.stopPropagation();
        memoryFileInput.click();
      });
    }

    memoryFileInput.addEventListener('change', async (e) => {
      await handleAddSelectedFiles(e.target.files);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
      });
    });

    uploadDropzone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      await handleAddSelectedFiles(dt.files);
    });
  }
}

/* --------------------------------------------------------------------------
   6. SCROLL REVEAL OBSERVER
   -------------------------------------------------------------------------- */
export function setupScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  const observerOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, observerOptions);

  reveals.forEach(el => observer.observe(el));
}
