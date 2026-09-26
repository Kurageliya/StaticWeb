/**
 * ============================================================================
 * OUR LOVE JOURNEY - MAIN APPLICATION BOOTSTRAP (ES MODULE ARCHITECTURE)
 * Mengorkestrasi semua modul, state manajemen, layanan, dan listener real-time.
 * ============================================================================
 */

import { DEFAULT_SETTINGS } from './js/config/initialData.js';
import {
  getCoupleSettings,
  saveCoupleSettings,
  getMemoriesList,
  saveMemoriesList,
  syncMemoryToCloud,
  deleteMemoryFromCloud,
  syncSettingsToCloud,
  setupCloudListeners
} from './js/repositories/storageRepository.js';
import { startLiveCounter } from './js/services/counterService.js';
import { startBirthdayReminder } from './js/services/reminderService.js';
import { setupAudioSynth, onMusicUrlChanged } from './js/services/audioService.js';
import { initAmbientCanvas } from './js/services/canvasService.js';
import { showToast } from './js/utils/toast.js';
import { safeGetLocalStorage } from './js/utils/helpers.js';

// Feature Modules
import { setupHeroScrapbook, setupEnvelopeInteraction } from './js/modules/book.js';
import { renderTimelineSection } from './js/modules/timeline.js';
import {
  renderPolaroidGrid,
  setupGallerySliderEvents,
  setupFilterEvents,
  updateGallerySliderState
} from './js/modules/gallery.js';
import {
  setupLightboxEvents,
  openLightbox,
  closeLightbox,
  updateLightboxContent
} from './js/modules/lightbox.js';
import {
  setupThemeEvents,
  updateCoupleDisplay,
  openDeleteConfirm,
  setupConfirmDeleteEvents,
  openEditMemoryModal,
  setupEditMemoryEvents,
  setupModalEvents,
  setupScrollReveal
} from './js/modules/modals.js';

// Application State
let coupleSettings = getCoupleSettings();
let memoriesList = getMemoriesList();
let currentFilter = 'all';
let filteredMemories = [];

/**
 * Memperbarui tampilan Galeri Polaroid dan Timeline secara terkoordinasi
 */
function refreshGalleryAndTimeline() {
  filteredMemories = renderPolaroidGrid({
    memoriesList,
    currentFilter,
    onOpenLightbox: (memoryIndex, photoIndex) => {
      openLightbox(memoryIndex, photoIndex);
    },
    onEditMemory: (id) => {
      const memory = memoriesList.find(m => m.id === id);
      if (memory) openEditMemoryModal(memory);
    },
    onToggleFeatured: handleToggleFeatured,
    onDeleteMemory: (id) => {
      const memory = memoriesList.find(m => m.id === id);
      if (memory) openDeleteConfirm(memory.id, memory.title);
    }
  });

  renderTimelineSection(memoriesList, setupScrollReveal);
}

/**
 * Handler Toggle Status Favorit / Timeline Memory (❤️)
 */
async function handleToggleFeatured(id) {
  const memory = memoriesList.find(m => m.id === id);
  if (!memory) return;

  memory.isFeatured = memory.isFeatured === false ? true : false;
  saveMemoriesList(memoriesList);
  refreshGalleryAndTimeline();

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal && lightboxModal.classList.contains('active')) {
    updateLightboxContent(memory);
  }

  showToast(memory.isFeatured !== false ? '❤️ Ditampilkan di Timeline!' : '💔 Dihapus dari Timeline');
  await syncMemoryToCloud(memory);
}

/**
 * Handler Konfirmasi Hapus Memory
 */
async function handleDeleteConfirmed(id) {
  memoriesList = memoriesList.filter(m => m.id !== id);
  saveMemoriesList(memoriesList);

  refreshGalleryAndTimeline();

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal && lightboxModal.classList.contains('active')) {
    closeLightbox();
  }

  showToast('🗑️ Foto Kenangan Berhasil Dihapus!');
  await deleteMemoryFromCloud(id);
}

/**
 * Handler Simpan Perubahan Edit Memory
 */
async function handleSaveEdit(updatedData) {
  const memory = memoriesList.find(m => m.id === updatedData.id);
  if (!memory) return;

  Object.assign(memory, updatedData);
  memoriesList.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveMemoriesList(memoriesList);

  refreshGalleryAndTimeline();

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal && lightboxModal.classList.contains('active')) {
    updateLightboxContent(memory, 0);
  }

  showToast('✏️ Kenangan Berhasil Diperbarui!');
  await syncMemoryToCloud(memory);
}

/**
 * Handler Tambah Kenangan Baru
 */
async function handleAddMemory(newMemory) {
  memoriesList.unshift(newMemory);
  memoriesList.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveMemoriesList(memoriesList);

  refreshGalleryAndTimeline();

  const photoCount = newMemory.images ? newMemory.images.length : 1;
  showToast(photoCount > 1 ? `💖 Kenangan Baru (${photoCount} Foto Carousel) Berhasil Ditambahkan!` : '💖 Kenangan Baru Berhasil Ditambahkan!');

  await syncMemoryToCloud(newMemory);
}

/**
 * Handler Simpan Pengaturan Pasangan & Surat Cinta
 */
async function handleSaveSettings(updatedSettings) {
  const prevMusicUrl = coupleSettings.musicUrl;
  coupleSettings = { ...coupleSettings, ...updatedSettings };
  saveCoupleSettings(coupleSettings);

  updateCoupleDisplay(coupleSettings);
  if (updatedSettings.musicUrl !== undefined && updatedSettings.musicUrl !== prevMusicUrl) {
    onMusicUrlChanged(updatedSettings.musicUrl);
  }
  showToast('✨ Pengaturan Pasangan & Musik Berhasil Disimpan!');

  await syncSettingsToCloud(coupleSettings);
}

/**
 * Inisialisasi Utama Aplikasi (Bootstrap)
 */
function initApp() {
  // 1. Tema Warna Background
  const savedTheme = safeGetLocalStorage('love_journey_theme', 'dusty-rose');
  setupThemeEvents(savedTheme);

  // 2. Scrapbook Album Fisik 3D & Amplop Surat Cinta
  setupHeroScrapbook();
  setupEnvelopeInteraction(() => coupleSettings);

  // 3. Tampilan Pasangan & Surat Cinta
  updateCoupleDisplay(coupleSettings);

  // 4. Real-Time Anniversary Counter
  const countYears = document.getElementById('count-years');
  const countMonths = document.getElementById('count-months');
  const countDays = document.getElementById('count-days');
  const countHours = document.getElementById('count-hours');
  const countMinutes = document.getElementById('count-minutes');
  const countSeconds = document.getElementById('count-seconds');

  startLiveCounter(() => coupleSettings.anniversaryDate, (units) => {
    if (countYears) countYears.textContent = units.years;
    if (countMonths) countMonths.textContent = units.months;
    if (countDays) countDays.textContent = units.days;
    if (countHours) countHours.textContent = units.hours;
    if (countMinutes) countMinutes.textContent = units.minutes;
    if (countSeconds) countSeconds.textContent = units.seconds;
  });

  // 4b. Milestone Hari Spesial & Hitung Mundur Hari Ulang Tahun
  startBirthdayReminder(() => coupleSettings);

  // 5. Galeri Polaroid & 3D Curved Panorama Slider
  refreshGalleryAndTimeline();
  setupGallerySliderEvents();

  setupFilterEvents((newFilter) => {
    currentFilter = newFilter;
    refreshGalleryAndTimeline();
  });

  // 6. Lightbox Modal
  setupLightboxEvents({
    getFilteredMemories: () => filteredMemories,
    onToggleFeatured: handleToggleFeatured,
    onDeleteMemory: (id) => {
      const memory = memoriesList.find(m => m.id === id);
      if (memory) openDeleteConfirm(memory.id, memory.title);
    },
    onEditMemory: (id) => {
      const memory = memoriesList.find(m => m.id === id);
      if (memory) openEditMemoryModal(memory);
    }
  });

  // 7. Modals: Edit, Delete, Settings, & Add Memory
  setupEditMemoryEvents({
    onSaveEdit: handleSaveEdit
  });

  setupConfirmDeleteEvents({
    onDeleteConfirmed: handleDeleteConfirmed
  });

  setupModalEvents({
    getCoupleSettings: () => coupleSettings,
    onSaveSettings: handleSaveSettings,
    onAddMemory: handleAddMemory
  });

  // 8. Musik & Ambient Audio Synthesizer
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const bgMusic = document.getElementById('bg-music');
  setupAudioSynth(btnAudioToggle, bgMusic, () => coupleSettings);

  // 9. Efek Canvas Partikel Romantis di Background
  initAmbientCanvas('ambient-canvas');

  // 10. Firebase Firestore Real-Time Synchronization Listener
  setupCloudListeners({
    onMemoriesUpdate: (cloudMemories) => {
      memoriesList = cloudMemories;
      refreshGalleryAndTimeline();
    },
    onSettingsUpdate: (cloudSettings) => {
      const prevMusicUrl = coupleSettings ? coupleSettings.musicUrl : '';
      coupleSettings = cloudSettings;
      updateCoupleDisplay(coupleSettings);
      if (cloudSettings && cloudSettings.musicUrl && cloudSettings.musicUrl !== prevMusicUrl) {
        onMusicUrlChanged(cloudSettings.musicUrl);
      }
    }
  });
}

// Jalankan aplikasi saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
