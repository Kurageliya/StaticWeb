/**
 * Helpers & General Utility Functions
 * Sanitasi HTML, format tanggal bahasa Indonesia, kompresi gambar, dan safe storage.
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

export function formatIndoDate(dateStr) {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const dateObj = new Date(cleanDate + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Menghitung nilai epoch timestamp akurat dari kombinasi date (YYYY-MM-DD) dan time (HH:mm)
 * Memastikan urutan momen di hari yang sama (misal pagi vs malam) 100% tepat.
 */
export function getMemoryTimestamp(memory) {
  if (!memory || !memory.date) return 0;
  const cleanDate = memory.date.includes('T') ? memory.date.split('T')[0] : memory.date;
  const timeStr = memory.time && memory.time.trim() ? memory.time.trim() : (memory.date.includes('T') ? memory.date.split('T')[1].substring(0, 5) : '12:00');
  const normalizedTime = timeStr.length === 5 ? timeStr + ':00' : timeStr;
  const dateObj = new Date(`${cleanDate}T${normalizedTime}`);
  return isNaN(dateObj.getTime()) ? (new Date(memory.date).getTime() || 0) : dateObj.getTime();
}

/**
 * Memformat tanggal dan jam momen untuk tampilan ramah pembaca
 */
export function formatMemoryDate(memory, includeTime = false) {
  if (!memory || !memory.date) return '';
  const cleanDate = memory.date.includes('T') ? memory.date.split('T')[0] : memory.date;
  const dateObj = new Date(cleanDate + 'T12:00:00');
  const formatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
    : cleanDate;

  if (includeTime && memory.time) {
    return `${formatted} • ${memory.time} WIB`;
  }
  return formatted;
}

/**
 * Memeriksa apakah file adalah gambar yang didukung (termasuk HEIC/HEIF dari HP & kamera modern)
 */
export function isSupportedImageFile(file) {
  if (!file) return false;
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.bmp') ||
    name.endsWith('.svg') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    name.endsWith('.hif') ||
    name.endsWith('.avif')
  );
}

/**
 * Memeriksa apakah file berformat HEIC/HEIF
 */
export function isHeicFile(file) {
  if (!file) return false;
  const mime = (file.type || '').toLowerCase();
  if (mime.includes('heic') || mime.includes('heif')) return true;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || name.endsWith('.hif');
}

/**
 * Memastikan pustaka heic2any siap digunakan (mendukung deferred/lazy loading)
 */
async function ensureHeic2Any() {
  if (typeof window !== 'undefined' && typeof window.heic2any === 'function') {
    return window.heic2any;
  }
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="heic2any"]');
    if (existing) {
      if (typeof window.heic2any === 'function') return resolve(window.heic2any);
      existing.addEventListener('load', () => resolve(window.heic2any));
      existing.addEventListener('error', () => resolve(null));
      setTimeout(() => resolve(window.heic2any || null), 2500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'js/libs/heic2any.min.js';
    script.onload = () => resolve(window.heic2any);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Kompres dan konversi file gambar (termasuk HEIC/HEIF) menjadi Data URL JPEG yang ramah browser & hemat memori.
 * Membatasi dimensi maksimum (landscape maupun portrait) dan menjaga ukuran Base64 hemat agar muat di batas 1 MB Firestore.
 */
export async function compressAndReadImage(file, maxDimension = 800, targetQuality = 0.68) {
  let processFile = file;

  // Jika file adalah HEIC/HEIF, konversi client-side via heic2any ke JPEG Blob
  if (isHeicFile(file)) {
    const heic2anyFn = await ensureHeic2Any();
    if (typeof heic2anyFn === 'function') {
      try {
        const conversionResult = await heic2anyFn({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.75
        });
        processFile = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
      } catch (conversionErr) {
        console.error('Gagal mengonversi foto HEIC dengan heic2any:', conversionErr);
        throw new Error('Gagal mengonversi foto HEIC. Pastikan file tidak rusak atau coba simpan sebagai JPG di galeri.');
      }
    } else {
      console.warn('heic2any library belum siap dimuat.');
      throw new Error('Pustaka pengonversi HEIC belum siap. Silakan muat ulang halaman dan coba lagi.');
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Batasi kedua dimensi (baik lebar maupun tinggi) agar foto portrait/landscape tidak berukuran raksasa
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Kompresi adaptif: pastikan ukuran base64 di bawah ~140KB per gambar
          let q = targetQuality;
          let dataUrl = canvas.toDataURL('image/jpeg', q);
          while (dataUrl.length > 140000 && q > 0.42) {
            q -= 0.08;
            dataUrl = canvas.toDataURL('image/jpeg', q);
          }

          // Fallback ekstra jika foto memiliki detail sangat padat
          if (dataUrl.length > 160000) {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = Math.round(width * 0.8);
            smallerCanvas.height = Math.round(height * 0.8);
            const sCtx = smallerCanvas.getContext('2d');
            sCtx.drawImage(img, 0, 0, smallerCanvas.width, smallerCanvas.height);
            dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.55);
          }

          resolve(dataUrl);
        } catch (canvasErr) {
          console.warn('Canvas compression error:', canvasErr);
          reject(canvasErr);
        }
      };
      img.onerror = () => {
        reject(new Error('Format foto tidak dapat dibaca oleh browser.'));
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(processFile);
  });
}

/**
 * Kompres ulang Data URL gambar yang terlalu besar agar hemat memori
 */
export function recompressDataUrl(dataUrl, maxDim = 700, quality = 0.6) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Memastikan total ukuran dokumen kenangan tidak melebihi batas 1 MiB (1,048,576 bytes) Firestore
 */
export async function ensureDocumentUnderLimit(memory, maxBytes = 850 * 1024) {
  if (!memory) return memory;
  const imageList = memory.images || (memory.imgUrl ? [memory.imgUrl] : []);
  if (!Array.isArray(imageList) || imageList.length === 0) return memory;

  let jsonStr = JSON.stringify(memory);
  let jsonSize = new Blob([jsonStr]).size;
  if (jsonSize <= maxBytes) return memory;

  console.warn(`Memory [${memory.id}] size is ${Math.round(jsonSize / 1024)} KB (> 850 KB limit). Mengompresi ulang agar muat di Firestore...`);

  const optimizedImages = [];
  for (const img of imageList) {
    if (typeof img === 'string' && img.startsWith('data:image/')) {
      const smaller = await recompressDataUrl(img, 650, 0.55);
      optimizedImages.push(smaller);
    } else {
      optimizedImages.push(img);
    }
  }

  memory.images = optimizedImages;
  if (optimizedImages.length > 0) {
    memory.imgUrl = optimizedImages[0];
  }

  jsonStr = JSON.stringify(memory);
  jsonSize = new Blob([jsonStr]).size;
  console.log(`Memory [${memory.id}] after recompression: ${Math.round(jsonSize / 1024)} KB`);
  return memory;
}

export function safeGetLocalStorage(key, defaultVal = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    console.warn(`LocalStorage read warning for "${key}":`, e);
    return defaultVal;
  }
}

export function safeSetLocalStorage(key, val) {
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  } catch (e) {
    console.warn(`LocalStorage write warning for "${key}":`, e);
  }
}
