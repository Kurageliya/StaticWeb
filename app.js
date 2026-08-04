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
    musicUrl: 'assets/audio/music.mp3'
  };

  const DEFAULT_MEMORIES = [
    {
      id: 'mem-1',
      title: 'Pesan Pertama di WhatsApp',
      date: '2025-12-09',
      category: 'spesial',
      imgUrl: 'assets/images/pesanpertama.jpeg',
      caption: 'Malam jam 20.59 WIB saat Cilpaaa pertama kali mengirimkan pesan WhatsApp. Dulu pernah DM tapi dicuekin, dan pesan ini menjadi awal perjalanan indah kita!',
      isFeatured: true
    },
    {
      id: 'mem-2',
      title: 'Kisah LDR Jakarta - Kudus',
      date: '2026-01-15',
      category: 'kencan',
      imgUrl: 'assets/images/kisah.jpeg',
      caption: 'Rijal di Jakarta & Cilpaaa di Kudus sedang kuliah. Obrolan hangat setiap hari merekatkan rasa nyaman walau terpisah jarak ratusan kilometer.',
      isFeatured: true
    },
    {
      id: 'mem-3',
      title: 'Pertemuan Pertama di Kudus',
      date: '2026-02-14',
      category: 'spesial',
      imgUrl: 'assets/images/pertemuan.jpeg',
      caption: 'Pertama kali bertatap muka secara langsung di Kudus, Jawa Tengah. Rasa gugup berubah menjadi kehangatan nyata saat kita berdua bersama.',
      isFeatured: true
    },
    {
      id: 'mem-4',
      title: 'Resmi Berpacaran ("Nembak")',
      date: '2026-02-15',
      category: 'spesial',
      imgUrl: 'assets/images/nembak.jpeg',
      caption: 'Momen paling membahagiakan saat Rijal menyatakan perasaan cinta ("nembak") dan Cilpaaa menerimanya. Awal perjalanan resmi Rijal & Cilpaaa.',
      isFeatured: true
    },
    {
      id: 'mem-5',
      title: 'Pertemuan Ke-2 (Quality Time)',
      date: '2026-05-15',
      category: 'kencan',
      imgUrl: 'assets/images/kedua.jpeg',
      caption: 'Momen manis pertemuan kedua di mana kita menghabiskan waktu bersama, melepas rindu setelah berbulan-bulan LDR.',
      isFeatured: true
    },
    {
      id: 'mem-6',
      title: 'Pertemuan Ke-3 (Mendatang)',
      date: '2026-08-15',
      category: 'spesial',
      imgUrl: 'assets/images/pertemuan.jpeg',
      caption: 'Momen pertemuan ke-3 yang sangat dinantikan bersama. Kartu ini siap diisi cerita dan kenangan manisnya nanti!',
      isFeatured: true
    }
  ];

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

  function syncMemoryToCloud(memory) {
    if (db && memory && memory.id) {
      db.collection('memories').doc(memory.id).set(memory, { merge: true })
        .catch(err => console.warn('Cloud sync memory error:', err));
    }
  }

  function deleteMemoryFromCloud(id) {
    if (db && id) {
      db.collection('memories').doc(id).delete()
        .catch(err => console.warn('Cloud sync delete error:', err));
    }
  }

  function syncSettingsToCloud(settings) {
    if (db && settings) {
      db.collection('settings').doc('couple').set(settings, { merge: true })
        .catch(err => console.warn('Cloud sync settings error:', err));
    }
  }

  let coupleSettings = JSON.parse(localStorage.getItem('love_journey_settings'));
  if (!coupleSettings || !coupleSettings.person1) {
    coupleSettings = DEFAULT_SETTINGS;
    localStorage.setItem('love_journey_settings', JSON.stringify(DEFAULT_SETTINGS));
  }

  let memoriesList = JSON.parse(localStorage.getItem('love_journey_memories'));
  if (!memoriesList || !Array.isArray(memoriesList) || memoriesList.length === 0) {
    memoriesList = DEFAULT_MEMORIES;
    localStorage.setItem('love_journey_memories', JSON.stringify(DEFAULT_MEMORIES));
  }

  function setupCloudListeners() {
    if (!db) return;

    // 1. Realtime Memories Listener across devices
    db.collection('memories').onSnapshot((snapshot) => {
      if (snapshot.empty) {
        DEFAULT_MEMORIES.forEach(mem => {
          db.collection('memories').doc(mem.id).set(mem).catch(() => {});
        });
        return;
      }

      const cloudMemories = [];
      snapshot.forEach(doc => {
        cloudMemories.push(doc.data());
      });

      if (cloudMemories.length > 0) {
        cloudMemories.sort((a, b) => new Date(b.date) - new Date(a.date));
        memoriesList = cloudMemories;
        localStorage.setItem('love_journey_memories', JSON.stringify(memoriesList));
        renderPolaroidGrid();
        renderTimelineSection();
      }
    }, (error) => {
      console.warn('Firestore memories snapshot fallback to local:', error);
      renderPolaroidGrid();
      renderTimelineSection();
    });

    // 2. Realtime Couple Settings Listener
    db.collection('settings').doc('couple').onSnapshot((doc) => {
      if (doc.exists) {
        coupleSettings = doc.data();
        localStorage.setItem('love_journey_settings', JSON.stringify(coupleSettings));
        updateCoupleDisplay();
        updateCounterValues();
      } else {
        db.collection('settings').doc('couple').set(coupleSettings || DEFAULT_SETTINGS).catch(() => {});
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

  // Envelope & Letter
  const envelope = document.getElementById('envelope');
  const btnToggleEnvelope = document.getElementById('btn-toggle-envelope');
  const letterRecipientName = document.getElementById('letter-recipient-name');
  const letterSenderName = document.getElementById('letter-sender-name');
  const letterBodyText = document.getElementById('letter-body-text');

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
    updateCoupleDisplay();
    startLiveCounter();
    renderPolaroidGrid();
    renderTimelineSection();
    setupScrollReveal();
    setupEnvelopeInteraction();
    setupLightboxEvents();
    setupModalEvents();
    setupFileUploadEvents();
    setupAudioSynth();
    initAmbientCanvas();
    setupCloudListeners();
  }

  function applyTheme(themeId) {
    currentTheme = themeId;
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('love_journey_theme', themeId);

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
    if (letterRecipientName) letterRecipientName.textContent = p2;
    if (letterSenderName) letterSenderName.textContent = p1;

    // Format Anniversary Date Display
    const dateObj = new Date(coupleSettings.anniversaryDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('id-ID', options);

    if (heroDateDisplay) heroDateDisplay.textContent = formattedDate;
    if (counterSinceDate) counterSinceDate.textContent = `(${formattedDate})`;

    // Update Letter Message
    if (letterBodyText) {
      const paragraphs = coupleSettings.letterMessage.split('\n\n');
      letterBodyText.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
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
     5. POLAROID GALLERY GRID & FILTERING
     -------------------------------------------------------------------------- */
  /* --------------------------------------------------------------------------
     5. POLAROID GALLERY GRID & FILTERING
     -------------------------------------------------------------------------- */
  function renderPolaroidGrid() {
    if (!polaroidGrid) return;
    polaroidGrid.innerHTML = '';

    filteredMemories = memoriesList.filter(item => {
      if (currentFilter === 'all') return true;
      return item.category === currentFilter;
    });

    if (filteredMemories.length === 0) {
      polaroidGrid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: var(--text-muted);">Belum ada foto dalam kategori ini. Klik "Tambah Foto Baru" untuk mengunggah.</div>`;
      return;
    }

    filteredMemories.forEach((memory, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'polaroid-item';

      const dateObj = new Date(memory.date);
      const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
      const isLoved = memory.isFeatured !== false;

      itemEl.innerHTML = `
        <div class="img-box">
          <img src="${escapeHtml(memory.imgUrl)}" alt="${escapeHtml(memory.title)}" loading="lazy">
          <div class="hover-overlay">
            <i class="fa-solid fa-heart"></i>
          </div>
          <button type="button" class="btn-card-action btn-card-love ${isLoved ? 'active' : ''}" title="${isLoved ? 'Sembunyikan dari Timeline' : 'Tampilkan di Timeline'}">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button type="button" class="btn-card-action btn-card-delete" title="Hapus Foto Kenangan">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="item-details">
          <h3 class="item-title">${escapeHtml(memory.title)}</h3>
          <span class="item-date"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
          ${memory.caption ? `<p class="item-caption-snippet">${escapeHtml(memory.caption)}</p>` : ''}
        </div>
      `;

      // Open Lightbox when clicking photo or title
      itemEl.querySelector('.img-box').addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-action')) return;
        openLightbox(index);
      });
      itemEl.querySelector('.item-details').addEventListener('click', (e) => {
        openLightbox(index);
      });

      // Quick action buttons
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
          ${memory.imgUrl ? `
            <div class="timeline-img-small">
              <img src="${escapeHtml(memory.imgUrl)}" alt="${escapeHtml(memory.title)}" loading="lazy">
            </div>
          ` : ''}
        </div>
      `;

      timelineContainer.appendChild(itemEl);
    });

    setupScrollReveal();
  }

  function deleteMemory(id) {
    const memory = memoriesList.find(m => m.id === id);
    const titleText = memory ? memory.title : 'foto kenangan ini';

    if (!confirm(`Apakah kamu yakin ingin menghapus "${titleText}"?`)) return;

    memoriesList = memoriesList.filter(m => m.id !== id);
    localStorage.setItem('love_journey_memories', JSON.stringify(memoriesList));
    deleteMemoryFromCloud(id);

    renderPolaroidGrid();
    renderTimelineSection();

    if (lightboxModal && lightboxModal.classList.contains('active')) {
      closeLightbox();
    }

    showToast('🗑️ Foto Kenangan Berhasil Dihapus!');
  }

  function toggleFeaturedMemory(id) {
    const memory = memoriesList.find(m => m.id === id);
    if (memory) {
      memory.isFeatured = memory.isFeatured === false ? true : false;
      localStorage.setItem('love_journey_memories', JSON.stringify(memoriesList));
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

    // Image Magnifier & Interactive Zoom Support
    const lightboxImgWrap = document.getElementById('lightbox-img-wrap');
    if (lightboxImgWrap && lightboxImg) {
      lightboxImgWrap.addEventListener('mousemove', (e) => {
        const rect = lightboxImgWrap.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        lightboxImg.style.transformOrigin = `${x}% ${y}%`;
      });

      lightboxImgWrap.addEventListener('mouseleave', () => {
        if (!lightboxImgWrap.classList.contains('is-zoomed')) {
          lightboxImg.style.transformOrigin = 'center center';
        }
      });

      lightboxImgWrap.addEventListener('click', () => {
        lightboxImgWrap.classList.toggle('is-zoomed');
      });
    }
  }

  function openLightbox(index) {
    currentLightboxIndex = index;
    updateLightboxContent(filteredMemories[index]);
    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightboxImgWrap = document.getElementById('lightbox-img-wrap');
    if (lightboxImgWrap) lightboxImgWrap.classList.remove('is-zoomed');
    if (lightboxImg) lightboxImg.style.transformOrigin = 'center center';

    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* Smooth Zoom + Fade Transition for Lightbox Nav */
  function navigateLightbox(direction) {
    if (filteredMemories.length === 0) return;

    currentLightboxIndex = (currentLightboxIndex + direction + filteredMemories.length) % filteredMemories.length;
    const targetMemory = filteredMemories[currentLightboxIndex];

    lightboxPolaroidCard.classList.remove('zoom-fade-in');
    lightboxPolaroidCard.classList.add('zoom-fade-out');

    setTimeout(() => {
      updateLightboxContent(targetMemory);
      lightboxPolaroidCard.classList.remove('zoom-fade-out');
      lightboxPolaroidCard.classList.add('zoom-fade-in');
    }, 200);
  }

  function updateLightboxContent(memory) {
    if (!memory) return;
    const dateObj = new Date(memory.date);
    const formattedDate = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    lightboxImg.src = memory.imgUrl;
    lightboxImg.alt = memory.title;
    lightboxTitle.textContent = memory.title;
    lightboxDate.textContent = formattedDate;
    lightboxCaption.textContent = memory.caption || '';
    lightboxTag.textContent = memory.category || 'Momen';

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
  }

  /* --------------------------------------------------------------------------
     7. INTERACTIVE LOVE LETTER ENVELOPE
     -------------------------------------------------------------------------- */
  function setupEnvelopeInteraction() {
    if (!envelope || !btnToggleEnvelope) return;

    let isOpen = false;

    function toggleEnvelope() {
      isOpen = !isOpen;
      if (isOpen) {
        envelope.classList.add('open');
        btnToggleEnvelope.innerHTML = `<i class="fa-solid fa-envelope"></i> Tutup Surat`;
      } else {
        envelope.classList.remove('open');
        btnToggleEnvelope.innerHTML = `<i class="fa-solid fa-envelope-open"></i> Buka Surat Cinta`;
      }
    }

    envelope.addEventListener('click', (e) => {
      if (!isOpen) toggleEnvelope();
    });

    btnToggleEnvelope.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEnvelope();
    });
  }

  /* --------------------------------------------------------------------------
     8. MODALS & FORMS (SETTINGS & ADD MEMORY)
     -------------------------------------------------------------------------- */
  function setupModalEvents() {
    const inputMusicUrl = document.getElementById('input-music-url');

    // Settings Modal
    if (btnEditCouple) {
      btnEditCouple.addEventListener('click', () => {
        inputPerson1.value = coupleSettings.person1 || '';
        inputPerson2.value = coupleSettings.person2 || '';
        inputDate.value = coupleSettings.anniversaryDate ? coupleSettings.anniversaryDate.substring(0, 16) : '';
        inputLetter.value = coupleSettings.letterMessage || '';
        if (inputMusicUrl) inputMusicUrl.value = coupleSettings.musicUrl || '';

        openModal(modalSettings);
      });
    }

    if (modalSettingsClose) {
      modalSettingsClose.addEventListener('click', () => closeModal(modalSettings));
      document.querySelector('#modal-settings .modal-backdrop').addEventListener('click', () => closeModal(modalSettings));
      document.querySelector('#modal-settings .modal-close-btn').addEventListener('click', () => closeModal(modalSettings));
    }

    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        coupleSettings.person1 = inputPerson1.value.trim();
        coupleSettings.person2 = inputPerson2.value.trim();
        coupleSettings.anniversaryDate = inputDate.value;
        if (inputLetter.value.trim()) {
          coupleSettings.letterMessage = inputLetter.value.trim();
        }
        if (inputMusicUrl) {
          coupleSettings.musicUrl = inputMusicUrl.value.trim();
        }

        localStorage.setItem('love_journey_settings', JSON.stringify(coupleSettings));
        syncSettingsToCloud(coupleSettings);
        updateCoupleDisplay();
        updateCounterValues();
        closeModal(modalSettings);
        showToast('✨ Pengaturan Pasangan & Musik Berhasil Diperbarui!');
      });
    }

    // Add Memory Modal Reset & Events
    if (btnAddMemory) {
      btnAddMemory.addEventListener('click', () => {
        formAddMemory.reset();
        selectedUploadedDataUrl = '';
        if (memoryFileInput) memoryFileInput.value = '';
        if (filePreviewWrap) filePreviewWrap.style.display = 'none';
        if (dropzoneContent) dropzoneContent.style.display = 'block';
        openModal(modalAddMemory);
      });
    }

    if (modalAddClose) {
      modalAddClose.addEventListener('click', () => closeModal(modalAddMemory));
      document.querySelector('#modal-add-memory .modal-backdrop').addEventListener('click', () => closeModal(modalAddMemory));
      document.querySelector('#modal-add-memory .modal-add-cancel').addEventListener('click', () => closeModal(modalAddMemory));
    }

    if (formAddMemory) {
      formAddMemory.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputUrl = document.getElementById('memory-img-url').value.trim();
        const finalImgUrl = selectedUploadedDataUrl || inputUrl;

        if (!finalImgUrl) {
          showToast('⚠️ Silakan unggah foto dari HP/Laptop atau masukkan URL gambar.');
          return;
        }

        const newMemory = {
          id: 'mem-' + Date.now(),
          title: document.getElementById('memory-title').value.trim(),
          date: document.getElementById('memory-date').value,
          category: document.getElementById('memory-category').value,
          imgUrl: finalImgUrl,
          caption: document.getElementById('memory-caption').value.trim(),
          isFeatured: true
        };

        memoriesList.unshift(newMemory); // Add to front of array
        localStorage.setItem('love_journey_memories', JSON.stringify(memoriesList));
        syncMemoryToCloud(newMemory);
        renderPolaroidGrid();
        renderTimelineSection();
        closeModal(modalAddMemory);
        showToast('💖 Kenangan Baru Berhasil Ditambahkan!');
      });
    }
  }

  /* --------------------------------------------------------------------------
     8.1. FILE UPLOAD & CANVAS IMAGE COMPRESSION
     -------------------------------------------------------------------------- */
  let selectedUploadedDataUrl = '';
  const uploadDropzone = document.getElementById('upload-dropzone');
  const memoryFileInput = document.getElementById('memory-file-input');
  const dropzoneContent = document.getElementById('dropzone-content');
  const filePreviewWrap = document.getElementById('file-preview-wrap');
  const filePreviewImg = document.getElementById('file-preview-img');
  const btnRemoveFile = document.getElementById('btn-remove-file');

  function compressAndReadImage(file, maxWidth = 1000, quality = 0.8) {
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

  function setupFileUploadEvents() {
    if (!uploadDropzone || !memoryFileInput) return;

    uploadDropzone.addEventListener('click', (e) => {
      if (e.target.id === 'btn-remove-file' || e.target.closest('#btn-remove-file')) {
        return;
      }
      memoryFileInput.click();
    });

    memoryFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const dataUrl = await compressAndReadImage(file);
          selectedUploadedDataUrl = dataUrl;
          if (filePreviewImg) filePreviewImg.src = dataUrl;
          if (dropzoneContent) dropzoneContent.style.display = 'none';
          if (filePreviewWrap) filePreviewWrap.style.display = 'block';
        } catch (err) {
          showToast('⚠️ Gagal membaca foto. Silakan coba foto lain.');
        }
      }
    });

    if (btnRemoveFile) {
      btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedUploadedDataUrl = '';
        memoryFileInput.value = '';
        if (filePreviewImg) filePreviewImg.src = '';
        if (filePreviewWrap) filePreviewWrap.style.display = 'none';
        if (dropzoneContent) dropzoneContent.style.display = 'block';
      });
    }

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
      const file = dt.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          const dataUrl = await compressAndReadImage(file);
          selectedUploadedDataUrl = dataUrl;
          if (filePreviewImg) filePreviewImg.src = dataUrl;
          if (dropzoneContent) dropzoneContent.style.display = 'none';
          if (filePreviewWrap) filePreviewWrap.style.display = 'block';
        } catch (err) {
          showToast('⚠️ Gagal membaca foto. Silakan coba foto lain.');
        }
      }
    });
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
