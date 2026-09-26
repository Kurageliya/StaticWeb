/**
 * Reminder Service
 * Pengelola hitung mundur hari ulang tahun & hari spesial pasangan (Rijal & Cilpaaa).
 * Fitur:
 * 1. Live Countdown real-time ke ulang tahun berikutnya (auto-rollover setiap tahun)
 * 2. Deteksi Zodiak & sifat manis otomatis
 * 3. Mode Hari H (Birthday Celebration Mode) dengan glow emas & ucapan selamat
 * 4. Interaksi tombol "Kirim Doa" dengan burst partikel hati & bintang romantis
 */
import { showToast } from '../utils/toast.js';

let reminderInterval = null;

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Parsing input tanggal ulang tahun yang fleksibel (MM-DD, YYYY-MM-DD, atau nama bulan)
 */
export function parseBirthday(val, fallbackMonth = 1, fallbackDay = 1) {
  if (!val || typeof val !== 'string') return { month: fallbackMonth, day: fallbackDay };
  const str = val.trim();

  // Format YYYY-MM-DD
  const ymd = str.match(/^\d{4}-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return { month: parseInt(ymd[1], 10), day: parseInt(ymd[2], 10) };

  // Format MM-DD
  const md = str.match(/^(\d{1,2})-(\d{1,2})$/);
  if (md) return { month: parseInt(md[1], 10), day: parseInt(md[2], 10) };

  // Format DD/MM atau DD-MM
  const ddm = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (ddm) {
    const p1 = parseInt(ddm[1], 10);
    const p2 = parseInt(ddm[2], 10);
    if (p1 > 12 && p2 <= 12) return { month: p2, day: p1 };
    if (p2 > 12 && p1 <= 12) return { month: p1, day: p2 };
  }

  // Format teks nama bulan ("24 September", "22 November")
  const lower = str.toLowerCase();
  for (let i = 0; i < INDONESIAN_MONTHS.length; i++) {
    if (lower.includes(INDONESIAN_MONTHS[i].toLowerCase())) {
      const dayMatch = lower.match(/\b([1-3]?[0-9])\b/);
      if (dayMatch) return { month: i + 1, day: parseInt(dayMatch[1], 10) };
    }
  }

  return { month: fallbackMonth, day: fallbackDay };
}

/**
 * Menentukan zodiak dan emoji berdasarkan bulan & tanggal lahir
 */
export function getZodiac(month, day) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { name: 'Aries', symbol: '♈' };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { name: 'Taurus', symbol: '♉' };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { name: 'Gemini', symbol: '♊' };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { name: 'Cancer', symbol: '♋' };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { name: 'Leo', symbol: '♌' };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { name: 'Virgo', symbol: '♍' };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { name: 'Libra', symbol: '♎' };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { name: 'Scorpio', symbol: '♏' };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { name: 'Sagitarius', symbol: '♐' };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { name: 'Capricorn', symbol: '♑' };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { name: 'Aquarius', symbol: '♒' };
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return { name: 'Pisces', symbol: '♓' };
  return { name: 'Bintang Cinta', symbol: '✨' };
}

/**
 * Menghitung selisih waktu menuju ulang tahun berikutnya secara akurat
 */
export function getNextBirthdayCountdown(month, day) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Tanggal ultah tahun ini
  let targetYear = currentYear;
  const birthdayThisYear = new Date(currentYear, month - 1, day, 0, 0, 0);
  const endOfBirthday = new Date(currentYear, month - 1, day, 23, 59, 59, 999);

  // Apakah hari ini adalah hari ulang tahunnya?
  const isToday = now.getMonth() === (month - 1) && now.getDate() === day;

  // Jika hari ultah tahun ini sudah lewat (bukan hari ini dan waktu sekarang > akhir hari ultah)
  if (now > endOfBirthday) {
    targetYear = currentYear + 1;
  }

  const nextBirthdayDate = new Date(targetYear, month - 1, day, 0, 0, 0);
  const diffMs = isToday ? 0 : Math.max(0, nextBirthdayDate.getTime() - now.getTime());

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    isToday,
    targetYear,
    days,
    hours,
    minutes,
    seconds
  };
}

/**
 * Efek partikel hati & konfeti melayang saat tombol Kirim Doa ditekan
 */
export function triggerHeartBurst(targetElement) {
  if (!targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  const burstCount = 18;
  const symbols = ['💖', '🎂', '✨', '🌸', '👑', '🎉', '🧁', '❤️'];

  for (let i = 0; i < burstCount; i++) {
    const particle = document.createElement('span');
    particle.className = 'burst-particle';
    particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 40;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 20;

    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = 60 + Math.random() * 80;
    const destX = Math.cos(angle) * velocity;
    const destY = Math.sin(angle) * velocity - 70; // cenderung melayang ke atas

    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      font-size: ${1.1 + Math.random() * 0.8}rem;
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
      transform: scale(0.5);
      transition: transform 1.2s cubic-bezier(0.12, 0.8, 0.32, 1), opacity 1.2s ease;
    `;

    document.body.appendChild(particle);

    requestAnimationFrame(() => {
      particle.style.transform = `translate(${destX}px, ${destY}px) scale(1.3) rotate(${(Math.random() - 0.5) * 60}deg)`;
      particle.style.opacity = '0';
    });

    setTimeout(() => {
      particle.remove();
    }, 1300);
  }
}

/**
 * Inisialisasi hitung mundur hari ulang tahun dan listener tombol ucapan
 */
export function startBirthdayReminder(getCoupleSettings) {
  const cardCilpa = document.getElementById('card-birthday-cilpa');
  const cardRijal = document.getElementById('card-birthday-rijal');
  if (!cardCilpa && !cardRijal) return;

  const btnWishCilpa = document.getElementById('btn-wish-cilpa');
  const btnWishRijal = document.getElementById('btn-wish-rijal');

  if (btnWishCilpa) {
    btnWishCilpa.onclick = (e) => {
      e.stopPropagation();
      triggerHeartBurst(btnWishCilpa);
      const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
      const name = settings.person2 || 'Cilpaaa';
      showToast(`💖 Doa tulus untuk ${name}: Semoga selalu bahagia, sehat, cantik, dan selalu bersama Rijal selamanya!`);
    };
  }

  if (btnWishRijal) {
    btnWishRijal.onclick = (e) => {
      e.stopPropagation();
      triggerHeartBurst(btnWishRijal);
      const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
      const name = settings.person1 || 'Rijal';
      showToast(`✨ Doa terbaik untuk ${name}: Semoga dimudahkan segala urusan, rezeki melimpah, dan jadi sosok terbaik untuk Cilpaaa!`);
    };
  }

  function tick() {
    const settings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : {};
    const name1 = settings.person1 || 'Rijal';
    const name2 = settings.person2 || 'Cilpaaa';

    // Parse Birthday 2 (Cilpaaa: default 24 September)
    const b2 = parseBirthday(settings.birthdayPerson2 || '09-24', 9, 24);
    const b1 = parseBirthday(settings.birthdayPerson1 || '11-22', 11, 22);

    // Update names
    const elName1 = document.getElementById('reminder-name-1');
    const elName2 = document.getElementById('reminder-name-2');
    if (elName1) elName1.textContent = name1;
    if (elName2) elName2.textContent = name2;

    // Update Zodiac Pll
    const z2 = getZodiac(b2.month, b2.day);
    const z1 = getZodiac(b1.month, b1.day);

    const elZodiac2 = document.getElementById('zodiac-cilpa');
    if (elZodiac2) {
      elZodiac2.innerHTML = `<i class="fa-solid fa-star"></i> ${z2.name} ${z2.symbol} • ${b2.day} ${INDONESIAN_MONTHS[b2.month - 1]}`;
    }

    const elZodiac1 = document.getElementById('zodiac-rijal');
    if (elZodiac1) {
      elZodiac1.innerHTML = `<i class="fa-solid fa-star"></i> ${z1.name} ${z1.symbol} • ${b1.day} ${INDONESIAN_MONTHS[b1.month - 1]}`;
    }

    // Countdown Cilpaaa
    const cd2 = getNextBirthdayCountdown(b2.month, b2.day);
    updateCardCountdown('cilpa', cd2, b2, name2, cardCilpa);

    // Countdown Rijal
    const cd1 = getNextBirthdayCountdown(b1.month, b1.day);
    updateCardCountdown('rijal', cd1, b1, name1, cardRijal);
  }

  function updateCardCountdown(prefix, cd, bData, name, cardEl) {
    const elDays = document.getElementById(`cd-${prefix}-days`);
    const elHours = document.getElementById(`cd-${prefix}-hours`);
    const elMinutes = document.getElementById(`cd-${prefix}-minutes`);
    const elSeconds = document.getElementById(`cd-${prefix}-seconds`);
    const elStatus = document.getElementById(`status-${prefix}`);
    const elCountdownWrap = document.getElementById(`countdown-${prefix}`);

    if (cd.isToday) {
      if (cardEl) cardEl.classList.add('is-birthday-today');
      if (elCountdownWrap) {
        elCountdownWrap.innerHTML = `
          <div class="birthday-today-banner">
            <span class="birthday-cake-icon">🎂</span>
            <div class="today-text">
              <strong>HARI INI SPESIAL!</strong>
              <small>Selamat Ulang Tahun ${name}! 🎉</small>
            </div>
          </div>
        `;
      }
      if (elStatus) {
        elStatus.innerHTML = `<i class="fa-solid fa-gift"></i> Semoga penuh berkah & tawa bahagia! ✨`;
      }
    } else {
      if (cardEl) cardEl.classList.remove('is-birthday-today');
      if (elDays) elDays.textContent = String(cd.days).padStart(2, '0');
      if (elHours) elHours.textContent = String(cd.hours).padStart(2, '0');
      if (elMinutes) elMinutes.textContent = String(cd.minutes).padStart(2, '0');
      if (elSeconds) elSeconds.textContent = String(cd.seconds).padStart(2, '0');

      if (elStatus) {
        elStatus.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Menuju ${bData.day} ${INDONESIAN_MONTHS[bData.month - 1]} ${cd.targetYear}`;
      }
    }
  }

  tick();
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(tick, 1000);
}
