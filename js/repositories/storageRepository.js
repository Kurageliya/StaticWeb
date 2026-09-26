/**
 * Storage Repository
 * Mengelola LocalStorage dan sinkronisasi real-time cloud Firebase Firestore.
 */
import { DEFAULT_SETTINGS, firebaseConfig } from '../config/initialData.js';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

let db = null;

// Inisialisasi Firebase jika library tersedia
if (typeof window !== 'undefined' && window.firebase) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
  } catch (err) {
    console.warn('Firebase initialization fallback to local storage:', err);
  }
}

export function getCoupleSettings() {
  const cached = safeGetLocalStorage('love_journey_settings', DEFAULT_SETTINGS);
  if (!cached || !cached.person1) {
    return { ...DEFAULT_SETTINGS };
  }
  return cached;
}

export function saveCoupleSettings(settings) {
  safeSetLocalStorage('love_journey_settings', settings);
}

export function getMemoriesList() {
  const list = safeGetLocalStorage('love_journey_memories', []);
  return Array.isArray(list) ? list : [];
}

export function saveMemoriesList(list) {
  safeSetLocalStorage('love_journey_memories', Array.isArray(list) ? list : []);
}

export async function syncMemoryToCloud(memory) {
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

export async function deleteMemoryFromCloud(id) {
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

export async function syncSettingsToCloud(settings) {
  if (!db || !settings) return false;
  try {
    await db.collection('settings').doc('couple').set(settings, { merge: true });
    return true;
  } catch (err) {
    console.error('Cloud sync settings error:', err);
    return false;
  }
}

export function setupCloudListeners({ onMemoriesUpdate, onSettingsUpdate }) {
  if (!db) return;

  // Realtime Memories Listener
  db.collection('memories').onSnapshot((snapshot) => {
    const cloudMemories = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.id) {
        cloudMemories.push(data);
      }
    });

    cloudMemories.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (cloudMemories.length > 0 || snapshot.empty) {
      saveMemoriesList(cloudMemories);
      if (typeof onMemoriesUpdate === 'function') {
        onMemoriesUpdate(cloudMemories);
      }
    }
  }, (error) => {
    console.warn('Firestore memories snapshot fallback to local:', error);
    if (typeof onMemoriesUpdate === 'function') {
      onMemoriesUpdate(getMemoriesList());
    }
  });

  // Realtime Couple Settings Listener
  db.collection('settings').doc('couple').onSnapshot((doc) => {
    if (doc.exists) {
      const cloudSettings = doc.data();
      if (cloudSettings && cloudSettings.person1) {
        saveCoupleSettings(cloudSettings);
        if (typeof onSettingsUpdate === 'function') {
          onSettingsUpdate(cloudSettings);
        }
      }
    } else {
      const current = getCoupleSettings();
      db.collection('settings').doc('couple').set(current || DEFAULT_SETTINGS).catch(() => {});
    }
  }, (error) => {
    console.warn('Firestore settings snapshot fallback to local:', error);
    if (typeof onSettingsUpdate === 'function') {
      onSettingsUpdate(getCoupleSettings());
    }
  });
}
