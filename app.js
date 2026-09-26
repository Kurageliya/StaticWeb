/* ==========================================================================
   OUR LOVE JOURNEY - SCRAPBOOK DIGITAL ROMANTIS (APP.JS)
   Logika Real-Time Counter, Galeri Polaroid, Lightbox Zoom+Fade,
   Envelope Animation, Ambient Audio Synth, & LocalStorage Management.
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. INITIAL STATE & LOCALSTORAGE DATA
     -------------------------------------------------------------------------- */
  const DEFAULT_SETTINGS = {
    person1: 'Rijal',
    person2: 'Cilpaaa',
    anniversaryDate: '2026-02-15T09:00:00',
    letterMessage: `Makasihhh yaa sayangkuuu.. kamu pasti inget awal kita kenalan, kamu ngechat aku tanggal 9 desember 2025 jam 20.59 (walaupun dulu aku pernah dm kamu tapi dicuekin sih 😜).\n\nTapi aku seneng banget hari-hariku mulai berubah. Yang awalnya cuma kerja di jakarta sendirian gaada tempat cerita, semenjak itu aku punya kamu yang mewarnai hariku.. yah meskipun kita ldr kamu di kudus aku di jakarta, tapi aku bakal tetep percaya sama kamu.. semua masalah pasti bisa kita atasi bersama.\n\nTerima kasih sudah menjaga rasa ini dan bertahan bersama. Website kecil ini aku buat khusus untuk mengabadikan setiap kenangan indah perjalanan cinta Rijal & Cilpaaa. Aku sayang banget sama kamu, hari ini, besok, dan selamanya! 💖`,
    letterMessage2: '',
    musicUrl: 'assets/audio/music.mp3'
  };

  /* --------------------------------------------------------------------------
     SAFE LOCALSTORAGE WRAPPER
     Mencegah unhandled QuotaExceededError crash saat menyimpan foto Base64
     -------------------------------------------------------------------------- */
  function safeGetLocalStorage(key, defaultVal = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch (e) {
      console.warn(`LocalStorage read warning for "${key}":`, e);
      return defaultVal;
    }
  }

  function safeSetLocalStorage(key, val) {
    try {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {
      console.warn(`LocalStorage write warning for "${key}":`, e);
    }
  }

  /* --------------------------------------------------------------------------
     FIREBASE REAL-TIME CLOUD SYNCHRONIZATION SETUP
     -------------------------------------------------------------------------- */
  const firebaseConfig = {
    apiKey: "AIzaSyBWFGFMU90YZsldRcm0LGeWthJZJ5BC9iA",
    authDomain: "webstaticcilpa.firebaseapp.com",
    projectId: "webstaticcilpa",
    storageBucket: "webstaticcilpa.firebasestorage.app",
    messagingSenderId: "897044124769",
    appId: "1:897044124769:web:e148ae679745e44931c620",
    measurementId: "G-GYX18MNE8M"
  };

  let db = null;
  if (window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
    } catch (err) {
      console.warn('Firebase initialization fallback:', err);
    }
  }

  async function syncMemoryToCloud(memory) {
    if (!db || !memory || !memory.id) return false;
    try {
      await db.collection('memories').doc(memory.id).set(memory, { merge: true });
      return true;
    } catch (err) {
      console.error('Cloud sync memory error:', err);
      showToast('⚠️ Gagal menyimpan ke server cloud. Periksa koneksi internet.');
      return false;
    }
  }

  async function deleteMemoryFromCloud(id) {
    if (!db || !id) return false;
    try {
      await db.collection('memories').doc(id).delete();
      return true;
    } catch (err) {
      console.error('Cloud sync delete error:', err);
      showToast('⚠️ Gagal menghapus dari server cloud. Periksa koneksi internet.');
      return false;
    }
  }

  async function syncSettingsToCloud(settings) {
    if (!db || !settings) return false;
    try {
      await db.collection('settings').doc('couple').set(settings, { merge: true });
      return true;
    } catch (err) {
      console.error('Cloud sync settings error:', err);
      return false;
    }
  }

  // Initial State: Load from cache without falling back to dummy memories
  let coupleSettings = safeGetLocalStorage('love_journey_settings', DEFAULT_SETTINGS);
  if (!coupleSettings || !coupleSettings.person1) {
    coupleSettings = DEFAULT_SETTINGS;
  }

  let memoriesList = safeGetLocalStorage('love_journey_memories', []);
  if (!Array.isArray(memoriesList)) {
    memoriesList = [];
  }

  function setupCloudListeners() {
    if (!db) return;

    // 1. Realtime Memories Listener across devices (Single Source of Truth)
    db.collection('memories').onSnapshot((snapshot) => {
      const cloudMemories = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.id) {
          cloudMemories.push(data);
        }
      });

      cloudMemories.sort((a, b) => new Date(b.date) - new Date(a.date));
      memoriesList = cloudMemories;
      safeSetLocalStorage('love_journey_memories', memoriesList);
      renderPolaroidGrid();
      renderTimelineSection();
    }, (error) => {
      console.warn('Firestore memories snapshot fallback to local:', error);
      renderPolaroidGrid();
      renderTimelineSection();
    });

    // 2. Realtime Couple Settings Listener
    db.collection('settings').doc('couple').onSnapshot((doc) => {
      if (doc.exists) {
        coupleSettings = doc.data();
        safeSetLocalStorage('love_journey_settings', coupleSettings);
        updateCoupleDisplay();
        updateCounterValues();
      } else {
        db.collection('settings').doc('couple').set(coupleSettings || DEFAULT_SETTINGS).catch(() => { });
      }
    }, (error) => {
      console.warn('Firestore settings snapshot fallback to local:', error);
      updateCoupleDisplay();
      updateCounterValues();
    });
  }

  let currentFilter = 'all';
  let filteredMemories = [];
  let currentLightboxIndex = 0;

  /* --------------------------------------------------------------------------
     2. DOM ELEMENTS
     -------------------------------------------------------------------------- */
  const navBrandNames = document.getElementById('nav-brand-names');
  const heroCoupleNames = document.getElementById('hero-couple-names');
  const heroCoupleTitle = document.getElementById('hero-couple-title');
  const heroDateDisplay = document.getElementById('hero-date-display');
  const counterSinceDate = document.getElementById('counter-since-date');

  // Counter numbers
  const countYears = document.getElementById('count-years');
  const countMonths = document.getElementById('count-months');
  const countDays = document.getElementById('count-days');
  const countHours = document.getElementById('count-hours');
  const countMinutes = document.getElementById('count-minutes');
  const countSeconds = document.getElementById('count-seconds');

  // Polaroid Grid & Controls
  const polaroidGrid = document.getElementById('polaroid-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const btnAddMemory = document.getElementById('btn-add-memory');

  // Envelope & Letter (Flip Card Dual Letter)
  const envelope = document.getElementById('envelope');
  const btnToggleEnvelope = document.getElementById('btn-toggle-envelope');
  const letterFlipcard = document.getElementById('letter-flipcard');
  const btnFlipLetter = document.getElementById('btn-flip-letter');
  const btnFlipText = document.getElementById('btn-flip-text');
  const letterRecipientName = document.getElementById('letter-recipient-name');
  const letterSenderName = document.getElementById('letter-sender-name');
  const letterBodyText = document.getElementById('letter-body-text');
  const letterFromNameFront = document.getElementById('letter-from-name-front');
  const letterRecipientName2 = document.getElementById('letter-recipient-name-2');
  const letterSenderName2 = document.getElementById('letter-sender-name-2');
  const letterBodyText2 = document.getElementById('letter-body-text-2');
  const letterFromNameBack = document.getElementById('letter-from-name-back');

  // Footer & Settings Modal
  const footerNames = document.getElementById('footer-names');
  const btnEditCouple = document.getElementById('btn-edit-couple');
  const modalSettings = document.getElementById('modal-settings');
  const modalSettingsClose = document.getElementById('modal-settings-close');
  const formSettings = document.getElementById('form-settings');
  const inputPerson1 = document.getElementById('input-person1');
  const inputPerson2 = document.getElementById('input-person2');
  const inputDate = document.getElementById('input-date');
  const inputLetter = document.getElementById('input-letter');
  const inputLetter2 = document.getElementById('input-letter-2');
  const labelLetterPerson1 = document.getElementById('label-letter-person1');
  const labelLetterPerson2 = document.getElementById('label-letter-person2');

  // Add Memory Modal
  const modalAddMemory = document.getElementById('modal-add-memory');
  const modalAddClose = document.getElementById('modal-add-close');
  const formAddMemory = document.getElementById('form-add-memory');

  // Lightbox Modal
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxTag = document.getElementById('lightbox-tag');
  const lightboxPolaroidCard = document.querySelector('.lightbox-polaroid');

  // Audio Toggle
  const btnAudioToggle = document.getElementById('btn-audio-toggle');

  // Theme Selector Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const modalThemePicker = document.getElementById('modal-theme-picker');
  const modalThemeClose = document.getElementById('modal-theme-close');
  const themeOptionsGrid = document.getElementById('theme-options-grid');
  const modalThemeDone = document.querySelector('.modal-theme-done');

  let currentTheme = localStorage.getItem('love_journey_theme') || 'dusty-rose';

  /* --------------------------------------------------------------------------
     3. INITIALIZATION & UI UPDATES
     -------------------------------------------------------------------------- */
  function initApp() {
    setupThemeEvents();
    setupHeroScrapbook();
    updateCoupleDisplay();
    startLiveCounter();
    renderPolaroidGrid();
    setupGallerySliderEvents();
    renderTimelineSection();
    setupScrollReveal();
    setupEnvelopeInteraction();
    setupLightboxEvents();
    setupModalEvents();
    setupFileUploadEvents();
    setupConfirmDeleteEvents();
    setupAudioSynth();
    initAmbientCanvas();
    setupCloudListeners();
  }

  function applyTheme(themeId) {
    currentTheme = themeId;
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

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function setupThemeEvents() {
    applyTheme(currentTheme);

    if (btnThemeToggle && modalThemePicker) {
      btnThemeToggle.addEventListener('click', () => openModal(modalThemePicker));
    }

    if (modalThemeClose) {
      modalThemeClose.addEventListener('click', () => closeModal(modalThemePicker));
      const backdrop = document.querySelector('#modal-theme-picker .modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => closeModal(modalThemePicker));
      }
    }

    if (modalThemeDone) {
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

  function updateCoupleDisplay() {
    const p1 = coupleSettings.person1 || 'Romeo';
    const p2 = coupleSettings.person2 || 'Juliet';
    const combinedNames = `${p1} & ${p2}`;

    if (navBrandNames) navBrandNames.textContent = combinedNames;
    if (heroCoupleNames) heroCoupleNames.textContent = combinedNames;
    if (heroCoupleTitle) heroCoupleTitle.textContent = combinedNames;
    if (footerNames) footerNames.textContent = combinedNames;

    // Sisi Depan: Surat dari Person 1 (Rijal) untuk Person 2 (Cilpaaa)
    if (letterRecipientName) letterRecipientName.textContent = p2;
    if (letterSenderName) letterSenderName.textContent = p1;
    if (letterFromNameFront) letterFromNameFront.textContent = p1;

    // Sisi Belakang: Surat dari Person 2 (Cilpaaa) untuk Person 1 (Rijal)
    if (letterRecipientName2) letterRecipientName2.textContent = p1;
    if (letterSenderName2) letterSenderName2.textContent = p2;
    if (letterFromNameBack) letterFromNameBack.textContent = p2;

    // Label di modal pengaturan
    if (labelLetterPerson1) labelLetterPerson1.textContent = p1;
    if (labelLetterPerson2) labelLetterPerson2.textContent = p2;

    // Format Anniversary Date Display
    const dateObj = new Date(coupleSettings.anniversaryDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('id-ID', options);

    if (heroDateDisplay) heroDateDisplay.textContent = formattedDate;
    if (counterSinceDate) counterSinceDate.textContent = `(${formattedDate})`;

    // Update Pesan Surat 1 (Person 1)
    if (letterBodyText) {
      const msg1 = coupleSettings.letterMessage || '';
      const paragraphs = msg1.split('\n\n').filter(p => p.trim());
      if (paragraphs.length > 0) {
        letterBodyText.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
      } else {
        letterBodyText.innerHTML = `<p class="letter-placeholder-text">Belum ada pesan surat cinta yang ditulis.</p>`;
      }
    }

    // Update Pesan Surat 2 (Person 2)
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

    // Update Teks Tombol Balik Surat
    if (btnFlipText) {
      const isFlipped = letterFlipcard && letterFlipcard.classList.contains('flipped');
      btnFlipText.textContent = isFlipped ? `Balik Surat — Dari ${p1}` : `Balik Surat — Dari ${p2}`;
    }
  }

  /* --------------------------------------------------------------------------
     4. REAL-TIME TIME TOGETHER COUNTER
     -------------------------------------------------------------------------- */
  function startLiveCounter() {
    updateCounterValues();
    setInterval(updateCounterValues, 1000);
  }

  function updateCounterValues() {
    const startDate = new Date(coupleSettings.anniversaryDate).getTime();
    const now = new Date().getTime();
    let diff = Math.max(0, now - startDate);

    // Convert milliseconds to time units
    const secondsInMs = 1000;
    const minutesInMs = secondsInMs * 60;
    const hoursInMs = minutesInMs * 60;
    const daysInMs = hoursInMs * 24;
    const yearsInMs = daysInMs * 365.25;

    const years = Math.floor(diff / yearsInMs);
    diff %= yearsInMs;

    const months = Math.floor(diff / (daysInMs * 30.4375));
    diff %= (daysInMs * 30.4375);

    const days = Math.floor(diff / daysInMs);
    diff %= daysInMs;

    const hours = Math.floor(diff / hoursInMs);
    diff %= hoursInMs;

    const minutes = Math.floor(diff / minutesInMs);
    diff %= minutesInMs;

    const seconds = Math.floor(diff / secondsInMs);

    if (countYears) countYears.textContent = String(years).padStart(2, '0');
    if (countMonths) countMonths.textContent = String(months).padStart(2, '0');
    if (countDays) countDays.textContent = String(days).padStart(2, '0');
    if (countHours) countHours.textContent = String(hours).padStart(2, '0');
    if (countMinutes) countMinutes.textContent = String(minutes).padStart(2, '0');
    if (countSeconds) countSeconds.textContent = String(seconds).padStart(2, '0');
  }

  /* --------------------------------------------------------------------------
     5. POLAROID GALLERY GRID & FILTERING (WITH INSTAGRAM-LIKE CARD CAROUSEL)
     -------------------------------------------------------------------------- */
  function getMemoryImages(memory) {
    if (!memory) return [];
    if (Array.isArray(memory.images) && memory.images.length > 0) {
      return memory.images.filter(img => typeof img === 'string' && img.trim().length > 0);
    }
    if (memory.imgUrl && typeof memory.imgUrl === 'string' && memory.imgUrl.trim().length > 0) {
      return [memory.imgUrl.trim()];
    }
    return [];
  }

  function renderPolaroidGrid() {
    if (!polaroidGrid) return;
    polaroidGrid.innerHTML = '';

    filteredMemories = memoriesList.filter(item => {
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
      updateGallerySliderState();
      return;
    }

    if (filteredMemories.length === 0) {
      polaroidGrid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: var(--text-muted); width: 100%;">Belum ada foto dalam kategori "${escapeHtml(currentFilter)}". Klik "Tambah Kenangan Baru" untuk mengunggah.</div>`;
      updateGallerySliderState();
      return;
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

      // Construct Image Box HTML
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

            <!-- Carousel Nav Buttons -->
            <button type="button" class="card-carousel-btn card-carousel-prev" aria-label="Foto Sebelumnya" title="Foto Sebelumnya">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" class="card-carousel-btn card-carousel-next" aria-label="Foto Selanjutnya" title="Foto Selanjutnya">
              <i class="fa-solid fa-chevron-right"></i>
            </button>

            <!-- Dots Indicator -->
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

      // Handle in-card carousel events if multiple photos
      if (hasMultiplePhotos) {
        const imgBox = itemEl.querySelector('.card-carousel');
        const track = itemEl.querySelector('.carousel-track');
        const badgeCurr = itemEl.querySelector('.carousel-curr');
        const dots = itemEl.querySelectorAll('.carousel-dot');
        const btnPrev = itemEl.querySelector('.card-carousel-prev');
        const btnNext = itemEl.querySelector('.card-carousel-next');

        function updateCardPhoto(newIdx) {
          currentPhotoIndex = (newIdx + images.length) % images.length;
          track.style.transform = `translateX(-${currentPhotoIndex * 100}%)`;
          if (badgeCurr) badgeCurr.textContent = currentPhotoIndex + 1;
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

        // Touch Swipe on card image
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
            if (diffX < 0) updateCardPhoto(currentPhotoIndex + 1); // swipe left
            else updateCardPhoto(currentPhotoIndex - 1); // swipe right
          }
        }, { passive: true });
      }

      // Open Lightbox via Buka Kenangan button
      const btnOpen = itemEl.querySelector('.btn-card-open');
      if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
          e.stopPropagation();
          openLightbox(memoryIndex, currentPhotoIndex);
        });
      }

      // Open Lightbox when clicking photo or card details directly
      itemEl.querySelector('.img-box').addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-action') || e.target.closest('.card-carousel-btn') || e.target.closest('.carousel-dots')) return;
        openLightbox(memoryIndex, currentPhotoIndex);
      });

      itemEl.querySelector('.item-details').addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-open')) return;
        openLightbox(memoryIndex, currentPhotoIndex);
      });

      // Quick action buttons
      const btnEdit = itemEl.querySelector('.btn-card-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditMemoryModal(memory.id);
        });
      }

      const btnLove = itemEl.querySelector('.btn-card-love');
      if (btnLove) {
        btnLove.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFeaturedMemory(memory.id);
        });
      }

      const btnDelete = itemEl.querySelector('.btn-card-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteMemory(memory.id);
        });
      }

      polaroidGrid.appendChild(itemEl);
    });

    updateGallerySliderState();
    requestAnimationFrame(apply3DCurvedGlider);
  }

  /* --------------------------------------------------------------------------
     5.2. GALLERY CARD SLIDER NAVIGATION & 3D CURVED PANORAMA (Foto 2)
     -------------------------------------------------------------------------- */
  let activeHoverItem = null;

  function apply3DCurvedGlider() {
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

    // Use single card pitch (width + gap) as normalized step unit
    const sampleItem = items[0];
    const itemWidth = sampleItem ? sampleItem.getBoundingClientRect().width : (isMobile ? 270 : 300);
    const gap = isMobile ? 18 : 28;
    const pitch = itemWidth + gap;

    // Detect which card is currently primary (hovered > start edge > end edge > center closest)
    let primaryIndex = -1;
    if (activeHoverItem) {
      items.forEach((item, idx) => {
        if (item === activeHoverItem) primaryIndex = idx;
      });
    } else if (scrollLeft <= 25) {
      // First card at start
      primaryIndex = 0;
    } else if (maxScroll > 0 && scrollLeft >= (maxScroll - 25)) {
      // Last card at end
      primaryIndex = items.length - 1;
    } else {
      // Card closest to visual center
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
        // Spotlight active/hovered/center card: elevated, scaled up, upright, glowing
        const translateY = isMobile ? -6 : -10;
        const scale = isMobile ? 1.05 : 1.08;
        item.style.transform = `translate3d(0, ${translateY}px, 0) rotateY(0deg) rotateZ(0deg) scale(${scale})`;
        item.style.zIndex = '45';
        item.style.opacity = '1';
        item.style.boxShadow = '0 22px 48px rgba(58, 46, 57, 0.22), 0 8px 24px rgba(216, 131, 144, 0.28), 0 0 0 2px rgba(216, 131, 144, 0.55)';
        item.classList.add('is-center-card');
      } else {
        // Side cards: gentle curved arc, 100% visible, elegant tilt
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

  function updateGallerySliderState() {
    if (!polaroidGrid) return;
    const gallerySliderWrapper = document.getElementById('gallery-slider-wrapper');
    const gallerySliderPrev = document.getElementById('gallery-slider-prev');
    const gallerySliderNext = document.getElementById('gallery-slider-next');
    const galleryProgressFill = document.getElementById('gallery-progress-fill');
    const galleryCurrentRange = document.getElementById('gallery-current-range');
    const galleryTotalCount = document.getElementById('gallery-total-count');

    const total = filteredMemories.length;
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

    // Progress bar fill
    if (galleryProgressFill) {
      if (maxScroll <= 0) {
        galleryProgressFill.style.width = '100%';
      } else {
        const pct = Math.min(1, Math.max(0, scrollLeft / maxScroll));
        galleryProgressFill.style.width = `${Math.min(100, Math.max(15, (pct * 85) + 15))}%`;
      }
    }

    // Visible range estimate & active center card index
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

    // Apply 3D Panorama transform on items
    apply3DCurvedGlider();
  }

  function setupGallerySliderEvents() {
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

      // Drag-to-Slide Support for Desktop Mouse Interaction
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

      // Suppress click on card if user just dragged to slide
      polaroidGrid.addEventListener('click', (e) => {
        if (dragDistance > 6) {
          e.preventDefault();
          e.stopPropagation();
          dragDistance = 0;
        }
      }, true);

      // Mouseover / Mouseout delegation to spotlight ANY card on hover (including card 1 and last card)
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

    // View Switcher (Slider vs Grid)
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
        // Reset 3D styles on all items for flat grid view
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

  // Filter Tabs Event Listeners
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderPolaroidGrid();
    });
  });

  /* --------------------------------------------------------------------------
     5.1. DYNAMIC TIMELINE GENERATION (CHRONOLOGICAL SORT, MAX 10 ITEMS)
     -------------------------------------------------------------------------- */
  function renderTimelineSection() {
    const timelineContainer = document.getElementById('timeline-items-container');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    // Sort chronologically (oldest date first -> newest date last)
    let timelineMemories = [...memoriesList];
    timelineMemories.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filter memories marked as featured (or if none marked explicitly, show all up to 10)
    const featuredOnly = timelineMemories.filter(m => m.isFeatured !== false);
    let displayMemories = featuredOnly.length > 0 ? featuredOnly : timelineMemories;
    displayMemories = displayMemories.slice(0, 10); // Max 10 items

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

      itemEl.innerHTML = `
        <div class="timeline-badge"><i class="fa-solid ${badgeIcon}"></i></div>
        <div class="timeline-card">
          <div class="card-tape"></div>
          <span class="timeline-date">${formattedDate}</span>
          <h3>${escapeHtml(memory.title)}</h3>
          <p>${escapeHtml(memory.caption || 'Momen manis yang terukir indah dalam perjalanan cinta kita.')}</p>
          ${(() => {
            const imgs = getMemoryImages(memory);
            const thumb = imgs[0] || memory.imgUrl;
            return thumb ? `
              <div class="timeline-img-small">
                <img src="${escapeHtml(thumb)}" alt="${escapeHtml(memory.title)}" loading="lazy">
              </div>
            ` : '';
          })()}
        </div>
      `;

      timelineContainer.appendChild(itemEl);
    });

    setupScrollReveal();
  }

  let pendingDeleteMemoryId = null;

  function deleteMemory(id) {
    const memory = memoriesList.find(m => m.id === id);
    if (!memory) return;

    pendingDeleteMemoryId = id;
    const textEl = document.getElementById('confirm-delete-text');
    if (textEl) {
      textEl.innerHTML = `Apakah kamu yakin ingin menghapus foto <strong style="color:var(--text-dark);">"${escapeHtml(memory.title)}"</strong> dari scrapbook?`;
    }

    const modalConfirm = document.getElementById('modal-confirm-delete');
    openModal(modalConfirm);
  }

  function setupConfirmDeleteEvents() {
    const modalConfirm = document.getElementById('modal-confirm-delete');
    const btnCancel = document.getElementById('btn-confirm-delete-cancel');
    const btnOk = document.getElementById('btn-confirm-delete-ok');

    if (btnCancel && modalConfirm) {
      btnCancel.addEventListener('click', () => {
        pendingDeleteMemoryId = null;
        closeModal(modalConfirm);
      });
      const backdrop = modalConfirm.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => {
          pendingDeleteMemoryId = null;
          closeModal(modalConfirm);
        });
      }
    }

    if (btnOk && modalConfirm) {
      btnOk.addEventListener('click', async () => {
        if (!pendingDeleteMemoryId) return;
        const id = pendingDeleteMemoryId;
        pendingDeleteMemoryId = null;

        memoriesList = memoriesList.filter(m => m.id !== id);
        safeSetLocalStorage('love_journey_memories', memoriesList);

        renderPolaroidGrid();
        renderTimelineSection();

        if (lightboxModal && lightboxModal.classList.contains('active')) {
          closeLightbox();
        }

        closeModal(modalConfirm);
        showToast('🗑️ Foto Kenangan Berhasil Dihapus!');

        await deleteMemoryFromCloud(id);
      });
    }
  }

  function toggleFeaturedMemory(id) {
    const memory = memoriesList.find(m => m.id === id);
    if (memory) {
      memory.isFeatured = memory.isFeatured === false ? true : false;
      safeSetLocalStorage('love_journey_memories', memoriesList);
      syncMemoryToCloud(memory);

      renderPolaroidGrid();
      renderTimelineSection();

      if (lightboxModal && lightboxModal.classList.contains('active')) {
        updateLightboxContent(memory);
      }

      showToast(memory.isFeatured !== false ? '❤️ Ditampilkan di Timeline!' : '💔 Dihapus dari Timeline');
    }
  }

  /* --------------------------------------------------------------------------
     6. LIGHTBOX MODAL WITH ZOOM + FADE TRANSITION (NEXT / PREV)
     -------------------------------------------------------------------------- */
  function setupLightboxEvents() {
    if (!lightboxModal) return;

    lightboxClose.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

    lightboxPrev.addEventListener('click', () => {
      navigateLightbox(-1);
    });

    lightboxNext.addEventListener('click', () => {
      navigateLightbox(1);
    });

    // Keyboard Arrow Keys Support
    document.addEventListener('keydown', (e) => {
      if (!lightboxModal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Multi-Photo Sub-Nav Prev/Next inside Lightbox
    const lightboxSubPrev = document.getElementById('lightbox-sub-prev');
    const lightboxSubNext = document.getElementById('lightbox-sub-next');
    if (lightboxSubPrev) {
      lightboxSubPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        switchLightboxPhoto(currentLightboxPhotoIndex - 1);
      });
    }
    if (lightboxSubNext) {
      lightboxSubNext.addEventListener('click', (e) => {
        e.stopPropagation();
        switchLightboxPhoto(currentLightboxPhotoIndex + 1);
      });
    }

    // Touch swipe & mouse drag support for smooth horizontal photo slider
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    // Click photo to peek full image (toggle minimizing / restoring bottom info overlay)
    const lightboxImgWrap = document.getElementById('lightbox-img-wrap');
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

      lightboxImgWrap.addEventListener('click', (e) => {
        if (e.target.closest('.lightbox-sub-nav') || e.target.closest('.lightbox-sub-dots') || isSwiping) return;
        if (lightboxPolaroidCard) {
          lightboxPolaroidCard.classList.toggle('info-minimized');
        }
      });
    }
  }

  let currentLightboxPhotoIndex = 0;
  let peekHintTimer = null;

  function switchLightboxPhoto(newIndex) {
    const memory = filteredMemories[currentLightboxIndex];
    if (!memory) return;
    const images = getMemoryImages(memory);
    if (images.length <= 1) return;

    currentLightboxPhotoIndex = (newIndex + images.length) % images.length;

    // Buttery-smooth physical slide transition via CSS transform on track
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
  }

  function openLightbox(index, photoIndex = 0) {
    currentLightboxIndex = index;
    currentLightboxPhotoIndex = photoIndex || 0;
    updateLightboxContent(filteredMemories[index], currentLightboxPhotoIndex);
    if (lightboxPolaroidCard) {
      lightboxPolaroidCard.classList.remove('info-minimized');
    }

    // Auto-dismissing hint: briefly displays as a helpful tip, then smoothly vanishes!
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

    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    clearTimeout(peekHintTimer);
    if (lightboxPolaroidCard) {
      lightboxPolaroidCard.classList.remove('info-minimized');
    }
    const hint = document.getElementById('lightbox-peek-hint');
    if (hint) {
      hint.classList.add('fade-out');
      hint.style.display = 'none';
    }

    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* Smooth Zoom + Fade Transition for Lightbox Nav */
  function navigateLightbox(direction) {
    if (filteredMemories.length === 0) return;

    currentLightboxIndex = (currentLightboxIndex + direction + filteredMemories.length) % filteredMemories.length;
    currentLightboxPhotoIndex = 0;
    const targetMemory = filteredMemories[currentLightboxIndex];

    lightboxPolaroidCard.classList.remove('zoom-fade-in');
    lightboxPolaroidCard.classList.add('zoom-fade-out');

    setTimeout(() => {
      updateLightboxContent(targetMemory, 0);
      lightboxPolaroidCard.classList.remove('zoom-fade-out');
      lightboxPolaroidCard.classList.add('zoom-fade-in');
    }, 200);
  }

  function updateLightboxContent(memory, photoIndex = 0) {
    if (!memory) return;
    const dateObj = new Date(memory.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    const images = getMemoryImages(memory);
    currentLightboxPhotoIndex = Math.min(Math.max(0, photoIndex), Math.max(0, images.length - 1));

    // Populate smooth carousel slides in track
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

    lightboxTitle.textContent = memory.title;
    lightboxDate.textContent = formattedDate;
    lightboxCaption.textContent = memory.caption || '';
    const cat = memory.category || 'Momen';
    const catIcon = cat === 'kencan' ? 'fa-heart' : (cat === 'liburan' ? 'fa-plane' : 'fa-star');
    if (lightboxTag) {
      lightboxTag.innerHTML = `<i class="fa-solid ${catIcon}"></i> ${escapeHtml(cat)}`;
    }

    // Multi-Photo Sub-Nav Controls
    const subPrev = document.getElementById('lightbox-sub-prev');
    const subNext = document.getElementById('lightbox-sub-next');
    const counterBadge = document.getElementById('lightbox-carousel-counter');
    const currSpan = document.getElementById('lightbox-curr-photo');
    const totalSpan = document.getElementById('lightbox-total-photo');
    const subDots = document.getElementById('lightbox-sub-dots');

    if (images.length > 1) {
      if (subPrev) subPrev.style.display = 'flex';
      if (subNext) subNext.style.display = 'flex';
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
      btnFeatured.onclick = () => toggleFeaturedMemory(memory.id);
    }

    const btnDelete = document.getElementById('btn-delete-lightbox');
    if (btnDelete) {
      btnDelete.onclick = () => deleteMemory(memory.id);
    }

    // Edit button in Lightbox — opens edit modal ON TOP (no close needed)
    const btnEdit = document.getElementById('btn-edit-lightbox');
    if (btnEdit) {
      btnEdit.onclick = () => openEditMemoryModal(memory.id);
    }
  }

  /* --------------------------------------------------------------------------
     6.1. EDIT MEMORY MODAL (OVERLAY ABOVE LIGHTBOX)
     -------------------------------------------------------------------------- */
  const modalEditMemory = document.getElementById('modal-edit-memory');
  const modalEditClose = document.getElementById('modal-edit-close');
  const formEditMemory = document.getElementById('form-edit-memory');
  const btnEditCancel = document.getElementById('btn-edit-cancel');

  // Edit photo upload elements
  const editUploadDropzone = document.getElementById('edit-upload-dropzone');
  const editFileInput = document.getElementById('edit-memory-file-input');
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

  // Edit dropzone click → trigger file input
  if (editUploadDropzone && editFileInput) {
    editUploadDropzone.addEventListener('click', () => {
      editFileInput.click();
    });
  }

  // Edit file input change → compress & add to editCurrentImages
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

  // Edit drag & drop support
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

  function openEditMemoryModal(id) {
    const memory = memoriesList.find(m => m.id === id);
    if (!memory) return;

    document.getElementById('edit-memory-id').value = memory.id;
    document.getElementById('edit-memory-title').value = memory.title || '';
    document.getElementById('edit-memory-date').value = memory.date || '';
    document.getElementById('edit-memory-category').value = memory.category || 'spesial';
    document.getElementById('edit-memory-caption').value = memory.caption || '';

    // Load existing photos
    editCurrentImages = [...getMemoryImages(memory)];
    renderEditPhotoGrid();

    // Reset URL input and file input
    if (editFileInput) editFileInput.value = '';
    const editImgUrl = document.getElementById('edit-memory-img-url');
    if (editImgUrl) editImgUrl.value = '';

    // Open edit modal ON TOP of lightbox (z-index 2500 > 2000)
    openModal(modalEditMemory);
  }

  function closeEditModal() {
    closeModal(modalEditMemory);
  }

  if (modalEditClose) {
    modalEditClose.addEventListener('click', closeEditModal);
  }
  if (btnEditCancel) {
    btnEditCancel.addEventListener('click', closeEditModal);
  }
  if (modalEditMemory) {
    const editBackdrop = modalEditMemory.querySelector('.modal-backdrop');
    if (editBackdrop) editBackdrop.addEventListener('click', closeEditModal);
  }

  if (formEditMemory) {
    formEditMemory.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-memory-id').value;
      const memory = memoriesList.find(m => m.id === id);
      if (!memory) return;

      memory.title = document.getElementById('edit-memory-title').value.trim();
      memory.date = document.getElementById('edit-memory-date').value;
      memory.category = document.getElementById('edit-memory-category').value;
      memory.caption = document.getElementById('edit-memory-caption').value.trim();

      // Check URL input for additional links
      const editImgUrlInput = document.getElementById('edit-memory-img-url');
      if (editImgUrlInput && editImgUrlInput.value.trim()) {
        const rawUrls = editImgUrlInput.value.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
        editCurrentImages.push(...rawUrls);
      }

      if (editCurrentImages.length === 0) {
        showToast('⚠️ Momen harus memiliki minimal 1 foto.');
        return;
      }

      memory.images = editCurrentImages;
      memory.imgUrl = editCurrentImages[0];

      memoriesList.sort((a, b) => new Date(b.date) - new Date(a.date));
      safeSetLocalStorage('love_journey_memories', memoriesList);

      renderPolaroidGrid();
      renderTimelineSection();

      // Update lightbox if it's still open
      if (lightboxModal && lightboxModal.classList.contains('active')) {
        updateLightboxContent(memory, 0);
      }

      closeEditModal();
      showToast('✏️ Kenangan Berhasil Diperbarui!');

      await syncMemoryToCloud(memory);
    });
  }

  /* --------------------------------------------------------------------------
     7. INTERACTIVE LOVE LETTER ENVELOPE (FLIP CARD DUAL LETTER)
     -------------------------------------------------------------------------- */
  function setupEnvelopeInteraction() {
    if (!envelope || !btnToggleEnvelope) return;

    let isOpen = false;

    function toggleEnvelope() {
      isOpen = !isOpen;
      const p1 = coupleSettings.person1 || 'Rijal';
      const p2 = coupleSettings.person2 || 'Cilpaaa';

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
        // Kembalikan ke sisi depan saat amplop ditutup
        if (letterFlipcard) {
          letterFlipcard.classList.remove('flipped');
        }
      }
    }

    envelope.addEventListener('click', (e) => {
      // Hanya buka jika amplop sedang tertutup dan bukan klik di dalam tombol/link
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
        const p1 = coupleSettings.person1 || 'Rijal';
        const p2 = coupleSettings.person2 || 'Cilpaaa';
        if (btnFlipText) {
          btnFlipText.textContent = isFlipped ? `Balik Surat — Dari ${p1}` : `Balik Surat — Dari ${p2}`;
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     8. MODALS & FORMS (SETTINGS & ADD MEMORY)
     -------------------------------------------------------------------------- */
  function setupModalEvents() {
    const inputMusicUrl = document.getElementById('input-music-url');

    // Live update label nama surat saat ketik di modal settings
    if (inputPerson1 && labelLetterPerson1) {
      inputPerson1.addEventListener('input', () => {
        labelLetterPerson1.textContent = inputPerson1.value.trim() || 'Pasangan 1';
      });
    }
    if (inputPerson2 && labelLetterPerson2) {
      inputPerson2.addEventListener('input', () => {
        labelLetterPerson2.textContent = inputPerson2.value.trim() || 'Pasangan 2';
      });
    }

    // Settings Modal
    if (btnEditCouple) {
      btnEditCouple.addEventListener('click', () => {
        inputPerson1.value = coupleSettings.person1 || '';
        inputPerson2.value = coupleSettings.person2 || '';
        inputDate.value = coupleSettings.anniversaryDate ? coupleSettings.anniversaryDate.substring(0, 16) : '';
        inputLetter.value = coupleSettings.letterMessage || '';
        if (inputLetter2) inputLetter2.value = coupleSettings.letterMessage2 || '';
        if (inputMusicUrl) inputMusicUrl.value = coupleSettings.musicUrl || '';

        if (labelLetterPerson1) labelLetterPerson1.textContent = coupleSettings.person1 || 'Pasangan 1';
        if (labelLetterPerson2) labelLetterPerson2.textContent = coupleSettings.person2 || 'Pasangan 2';

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
      formSettings.addEventListener('submit', async (e) => {
        e.preventDefault();
        coupleSettings.person1 = inputPerson1.value.trim();
        coupleSettings.person2 = inputPerson2.value.trim();
        coupleSettings.anniversaryDate = inputDate.value;
        coupleSettings.letterMessage = inputLetter.value.trim();
        if (inputLetter2) {
          coupleSettings.letterMessage2 = inputLetter2.value.trim();
        }
        if (inputMusicUrl) {
          coupleSettings.musicUrl = inputMusicUrl.value.trim();
        }

        safeSetLocalStorage('love_journey_settings', coupleSettings);
        updateCoupleDisplay();
        updateCounterValues();
        closeModal(modalSettings);
        showToast('✨ Pengaturan Pasangan & Kedua Surat Cinta Berhasil Disimpan!');

        await syncSettingsToCloud(coupleSettings);
      });
    }

    // Add Memory Modal Reset & Events
    if (btnAddMemory) {
      btnAddMemory.addEventListener('click', () => {
        formAddMemory.reset();
        addSelectedImages = [];
        if (memoryFileInput) memoryFileInput.value = '';
        renderAddPhotoGrid();
        openModal(modalAddMemory);
      });
    }

    if (modalAddClose) {
      modalAddClose.addEventListener('click', () => closeModal(modalAddMemory));
      document.querySelector('#modal-add-memory .modal-backdrop').addEventListener('click', () => closeModal(modalAddMemory));
      document.querySelector('#modal-add-memory .modal-add-cancel').addEventListener('click', () => closeModal(modalAddMemory));
    }

    if (formAddMemory) {
      formAddMemory.addEventListener('submit', async (e) => {
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

        memoriesList.unshift(newMemory); // Add to front of array
        safeSetLocalStorage('love_journey_memories', memoriesList);
        renderPolaroidGrid();
        renderTimelineSection();
        closeModal(modalAddMemory);
        showToast(allImages.length > 1 ? `💖 Kenangan Baru (${allImages.length} Foto Carousel) Berhasil Ditambahkan!` : '💖 Kenangan Baru Berhasil Ditambahkan!');

        await syncMemoryToCloud(newMemory);
      });
    }
  }

  /* --------------------------------------------------------------------------
     8.1. FILE UPLOAD & CANVAS IMAGE COMPRESSION (MULTI-PHOTO SUPPORT)
     -------------------------------------------------------------------------- */
  let addSelectedImages = [];
  const uploadDropzone = document.getElementById('upload-dropzone');
  const memoryFileInput = document.getElementById('memory-file-input');
  const dropzoneContent = document.getElementById('dropzone-content');
  const filePreviewWrap = document.getElementById('file-preview-wrap');
  const multiPhotoGrid = document.getElementById('multi-photo-grid');
  const multiFileCount = document.getElementById('multi-file-count');
  const btnAddMoreFiles = document.getElementById('btn-add-more-files');

  function renderAddPhotoGrid() {
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

  function compressAndReadImage(file, maxWidth = 850, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAddSelectedFiles(files) {
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

  function setupFileUploadEvents() {
    if (!uploadDropzone || !memoryFileInput) return;

    uploadDropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btn-add-more-files') || e.target.closest('.btn-thumb-remove')) {
        return;
      }
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

  /* --------------------------------------------------------------------------
     8.5. HERO 3D SCRAPBOOK ALBUM INTERACTION (PHYSICAL PAGE TURNING)
     -------------------------------------------------------------------------- */
  function playPaperRustle() {
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
      // Ignore audio synthesis errors on autoplay-restricted browsers
    }
  }

  function setupHeroScrapbook() {
    const scrapbookBook = document.getElementById('scrapbook-book');
    const scrapbookPages = Array.from(document.querySelectorAll('.scrapbook-page'));
    const bookPrevBtn = document.getElementById('book-prev-btn');
    const bookNextBtn = document.getElementById('book-next-btn');
    const bookPageIndicator = document.getElementById('book-page-indicator');
    const bookDots = Array.from(document.querySelectorAll('.book-dot'));

    if (!scrapbookBook || scrapbookPages.length === 0) return;

    let currentPage = 0;
    const totalPages = scrapbookPages.length;
    let isFlipping = false;

    function updateNavUI() {
      // Update Teks Indikator Halaman
      if (bookPageIndicator) {
        bookPageIndicator.textContent = `Halaman ${currentPage + 1} / ${totalPages}`;
      }

      // Update Titik Navigasi (Dots)
      bookDots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentPage);
      });

      // Update Tombol Navigasi
      if (bookPrevBtn) {
        bookPrevBtn.style.opacity = currentPage === 0 ? '0.4' : '1';
        bookPrevBtn.style.pointerEvents = currentPage === 0 ? 'none' : 'auto';
      }
      if (bookNextBtn) {
        if (currentPage === totalPages - 1) {
          bookNextBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i>';
          bookNextBtn.title = 'Ulang dari Halaman Pertama';
          bookNextBtn.setAttribute('aria-label', 'Ulang dari Halaman Pertama');
        } else {
          bookNextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
          bookNextBtn.title = 'Halaman Selanjutnya';
          bookNextBtn.setAttribute('aria-label', 'Halaman Selanjutnya');
        }
      }
    }

    function goToPage(targetIndex) {
      if (isFlipping || targetIndex === currentPage) return;
      if (targetIndex < 0 || targetIndex >= totalPages) return;

      const fromIndex = currentPage;
      const toIndex = targetIndex;
      isFlipping = true;
      currentPage = toIndex;

      updateNavUI();
      playPaperRustle();

      if (toIndex > fromIndex) {
        // MAJU KE DEPAN: Halaman fromIndex berputar maju (0deg -> -180deg) di LAPISAN TERATAS (z-index 35)
        const flippingPage = scrapbookPages[fromIndex];
        const targetPage = scrapbookPages[toIndex];

        // Pastikan targetPage berada tepat di bawahnya dalam posisi diam siap tampil
        targetPage.classList.remove('turned', 'flipping-forward', 'flipping-backward');
        targetPage.classList.add('active');
        targetPage.style.zIndex = 10;

        // Atur halaman perantara jika loncat lebih dari 1 halaman
        for (let i = fromIndex + 1; i < toIndex; i++) {
          scrapbookPages[i].classList.add('turned');
          scrapbookPages[i].classList.remove('active', 'flipping-forward', 'flipping-backward');
          scrapbookPages[i].style.zIndex = i + 1;
        }

        // Jalankan animasi buka buku pada flippingPage (z-index 35 paling atas!)
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
        // MUNDUR KE BELAKANG: Halaman toIndex berputar balik (-180deg -> 0deg) di LAPISAN TERATAS (z-index 35)
        const targetPage = scrapbookPages[toIndex];
        const currentPageEl = scrapbookPages[fromIndex];

        currentPageEl.classList.remove('active', 'flipping-forward', 'flipping-backward');
        currentPageEl.style.zIndex = 10;

        // Jika loncat mundur lebih dari 1 halaman (misal reset dari akhir ke cover)
        if (fromIndex - toIndex > 1) {
          for (let i = toIndex + 1; i < fromIndex; i++) {
            scrapbookPages[i].classList.remove('turned', 'flipping-forward', 'flipping-backward');
            scrapbookPages[i].classList.remove('active');
            scrapbookPages[i].style.zIndex = totalPages - i;
          }
        }

        targetPage.classList.remove('turned', 'active');
        targetPage.classList.add('flipping-backward');

        setTimeout(() => {
          targetPage.classList.remove('flipping-backward');
          targetPage.classList.add('active');
          targetPage.style.zIndex = totalPages + 5;

          // Halaman setelah toIndex berada di bawahnya
          for (let i = toIndex + 1; i < totalPages; i++) {
            scrapbookPages[i].classList.remove('turned', 'flipping-forward', 'flipping-backward');
            scrapbookPages[i].classList.remove('active');
            scrapbookPages[i].style.zIndex = totalPages - i;
          }
          isFlipping = false;
        }, 850);
      }
    }

    function flipNext() {
      if (isFlipping) return;
      if (currentPage < totalPages - 1) {
        goToPage(currentPage + 1);
      } else {
        // Dari halaman terakhir kembali ke halaman pertama (tutup buku ke cover)
        goToPage(0);
      }
    }

    function flipPrev() {
      if (isFlipping) return;
      if (currentPage > 0) {
        goToPage(currentPage - 1);
      }
    }

    // Tombol Next & Prev
    if (bookNextBtn) {
      bookNextBtn.addEventListener('click', flipNext);
    }

    if (bookPrevBtn) {
      bookPrevBtn.addEventListener('click', flipPrev);
    }

    // Klik Dot Navigasi
    bookDots.forEach((dot, idx) => {
      dot.addEventListener('click', () => goToPage(idx));
    });

    // Klik langsung pada Halaman Scrapbook untuk membalik
    scrapbookPages.forEach((page, idx) => {
      page.addEventListener('click', () => {
        if (idx === currentPage) {
          flipNext();
        } else if (idx < currentPage) {
          goToPage(idx);
        }
      });
    });

    // Gestur Swipe Layar Sentuh di HP / Tablet
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

    // Render Awal (Halaman 1)
    function initBookState() {
      currentPage = 0;
      scrapbookPages.forEach((page, idx) => {
        page.classList.remove('turned', 'flipping-forward', 'flipping-backward');
        if (idx === 0) {
          page.classList.add('active');
          page.style.zIndex = totalPages + 5;
        } else {
          page.classList.remove('active');
          page.style.zIndex = totalPages - idx;
        }
      });
      updateNavUI();
    }

    initBookState();
  }

  /* --------------------------------------------------------------------------
     9. SCROLL REVEAL OBSERVER
     -------------------------------------------------------------------------- */
  function setupScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    reveals.forEach(el => observer.observe(el));
  }

  /* --------------------------------------------------------------------------
     10. AMBIENT AUDIO SYNTHESIZER (WEB AUDIO API ROMANTIC CHIMES)
     -------------------------------------------------------------------------- */
  let audioCtx = null;
  let isPlayingAudio = false;
  let audioTimer = null;
  const bgMusic = document.getElementById('bg-music');

  function setupAudioSynth() {
    if (!btnAudioToggle) return;

    btnAudioToggle.addEventListener('click', () => {
      const customUrl = (coupleSettings && coupleSettings.musicUrl) ? coupleSettings.musicUrl : 'assets/audio/music.mp3';

      if (!isPlayingAudio) {
        if (bgMusic && customUrl) {
          if (bgMusic.src !== customUrl && !bgMusic.src.endsWith(encodeURI(customUrl))) {
            bgMusic.src = customUrl;
          }
          bgMusic.play().then(() => {
            isPlayingAudio = true;
            btnAudioToggle.classList.add('playing');
            btnAudioToggle.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
            showToast('🎵 Memutar Musik: Nadhif Basalamah');
          }).catch(err => {
            startAmbientMusic();
            btnAudioToggle.classList.add('playing');
            btnAudioToggle.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
            showToast('🎵 Memutar Musik Ambient Romantis');
          });
        } else {
          startAmbientMusic();
          btnAudioToggle.classList.add('playing');
          btnAudioToggle.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
          showToast('🎵 Memutar Musik Ambient Romantis');
        }
      } else {
        if (bgMusic && !bgMusic.paused) {
          bgMusic.pause();
        }
        stopAmbientMusic();
        isPlayingAudio = false;
        btnAudioToggle.classList.remove('playing');
        btnAudioToggle.innerHTML = `<i class="fa-solid fa-music"></i>`;
        showToast('🔇 Musik Dimatikan');
      }
    });
  }

  function startAmbientMusic() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    isPlayingAudio = true;

    // Romantic Pentatonic Chord Frequencies (F Major / D Minor warmth)
    const chordNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5

    function playSoftChime() {
      if (!isPlayingAudio || !audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const freq = chordNotes[Math.floor(Math.random() * chordNotes.length)];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 4.6);

      const nextInterval = 2000 + Math.random() * 2500;
      audioTimer = setTimeout(playSoftChime, nextInterval);
    }

    playSoftChime();
  }

  function stopAmbientMusic() {
    isPlayingAudio = false;
    if (audioTimer) clearTimeout(audioTimer);
  }

  /* --------------------------------------------------------------------------
     11. FLOATING PARTICLES CANVAS (HEARTS & SPARKLES)
     -------------------------------------------------------------------------- */
  function initAmbientCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 28;

    class FloatingHeart {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 20 + Math.random() * 50;
        this.size = 10 + Math.random() * 14;
        this.speedY = 0.5 + Math.random() * 0.8;
        this.speedX = Math.sin(Math.random() * Math.PI) * 0.5;
        this.opacity = 0.2 + Math.random() * 0.4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
      }

      update() {
        this.y -= this.speedY;
        this.x += Math.sin(this.y * 0.01) * 0.4;
        this.rotation += this.rotSpeed;

        if (this.y < -30) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#e8b4b8';

        // Draw Heart Path
        ctx.beginPath();
        const topCurveHeight = this.size * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -this.size / 2, 0, -this.size / 2, topCurveHeight);
        ctx.bezierCurveTo(-this.size / 2, (this.size + topCurveHeight) / 2, 0, this.size, 0, this.size);
        ctx.bezierCurveTo(0, this.size, this.size / 2, (this.size + topCurveHeight) / 2, this.size / 2, topCurveHeight);
        ctx.bezierCurveTo(this.size / 2, 0, 0, 0, 0, topCurveHeight);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      const heart = new FloatingHeart();
      heart.y = Math.random() * height; // initial scatter
      particles.push(heart);
    }

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    }

    animateParticles();
  }

  /* --------------------------------------------------------------------------
     12. TOAST NOTIFICATION UTILITY
     -------------------------------------------------------------------------- */
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  /* Run App on DOM Ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
