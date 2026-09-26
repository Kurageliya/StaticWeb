/**
 * Initial Configuration & Default Data
 * Data default profil pasangan, pesan surat cinta, dan konfigurasi Firebase.
 */

export const DEFAULT_SETTINGS = {
  person1: 'Rijal',
  person2: 'Cilpaaa',
  anniversaryDate: '2026-02-15T09:00:00',
  birthdayPerson1: '11-22', // Rijal: 22 November
  birthdayPerson2: '09-24', // Cilpaaa: 24 September
  letterMessage: `Makasihhh yaa sayangkuuu.. kamu pasti inget awal kita kenalan, kamu ngechat aku tanggal 9 desember 2025 jam 20.59 (walaupun dulu aku pernah dm kamu tapi dicuekin sih 😆).\n\nTapi aku seneng banget hari-hariku mulai berubah. Yang awalnya cuma kerja di jakarta sendirian gaada tempat cerita, semenjak itu aku punya kamu yang mewarnai hariku.. yah meskipun kita ldr kamu di kudus aku di jakarta, tapi aku bakal tetep percaya sama kamu.. semua masalah pasti bisa kita atasi bersama.\n\nTerima kasih sudah menjaga rasa ini dan bertahan bersama. Website kecil ini aku buat khusus untuk mengabadikan setiap kenangan indah perjalanan cinta Rijal & Cilpaaa. Aku sayang banget sama kamu, hari ini, besok, dan selamanya! ❤️`,
  letterMessage2: '',
  musicUrl: 'assets/audio/music.mp3'
};

export const firebaseConfig = {
  apiKey: "AIzaSyBWFGFMU90YZsldRcm0LGeWthJZJ5BC9iA",
  authDomain: "webstaticcilpa.firebaseapp.com",
  projectId: "webstaticcilpa",
  storageBucket: "webstaticcilpa.firebasestorage.app",
  messagingSenderId: "897044124769",
  appId: "1:897044124769:web:e148ae679745e44931c620",
  measurementId: "G-GYX18MNE8M"
};
