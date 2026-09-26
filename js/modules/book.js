/**
 * Book & Envelope Module
 * Mengelola interaksi 3D Scrapbook Album fisik (page flip) dan Amplop Surat Cinta ganda.
 */

let audioCtx = null;

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
    // Ignore audio synthesis errors on autoplay-restricted browsers
  }
}

export function setupHeroScrapbook() {
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
    if (bookPageIndicator) {
      bookPageIndicator.textContent = `Halaman ${currentPage + 1} / ${totalPages}`;
    }

    bookDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentPage);
    });

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
      const flippingPage = scrapbookPages[fromIndex];
      const targetPage = scrapbookPages[toIndex];

      targetPage.classList.remove('turned', 'flipping-forward', 'flipping-backward');
      targetPage.classList.add('active');
      targetPage.style.zIndex = 10;

      for (let i = fromIndex + 1; i < toIndex; i++) {
        scrapbookPages[i].classList.add('turned');
        scrapbookPages[i].classList.remove('active', 'flipping-forward', 'flipping-backward');
        scrapbookPages[i].style.zIndex = i + 1;
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
      const targetPage = scrapbookPages[toIndex];
      const currentPageEl = scrapbookPages[fromIndex];

      currentPageEl.classList.remove('active', 'flipping-forward', 'flipping-backward');
      currentPageEl.style.zIndex = 10;

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
      goToPage(0);
    }
  }

  function flipPrev() {
    if (isFlipping) return;
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }

  if (bookNextBtn) {
    bookNextBtn.addEventListener('click', flipNext);
  }

  if (bookPrevBtn) {
    bookPrevBtn.addEventListener('click', flipPrev);
  }

  bookDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => goToPage(idx));
  });

  scrapbookPages.forEach((page, idx) => {
    page.addEventListener('click', () => {
      if (idx === currentPage) {
        flipNext();
      } else if (idx < currentPage) {
        goToPage(idx);
      }
    });
  });

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
