/**
 * Counter Service
 * Menghitung waktu jadian real-time (Tahun, Bulan, Hari, Jam, Menit, Detik).
 */

export function calculateTimeUnits(anniversaryDateStr) {
  const startDate = new Date(anniversaryDateStr).getTime();
  const now = Date.now();
  let diff = Math.max(0, now - startDate);

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

  return {
    years: String(years).padStart(2, '0'),
    months: String(months).padStart(2, '0'),
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    totalDays: Math.floor((now - startDate) / daysInMs)
  };
}

let counterInterval = null;

export function startLiveCounter(getAnniversaryDate, onTick) {
  function tick() {
    const dateStr = typeof getAnniversaryDate === 'function' ? getAnniversaryDate() : getAnniversaryDate;
    if (!dateStr) return;
    const units = calculateTimeUnits(dateStr);
    if (typeof onTick === 'function') {
      onTick(units);
    }
  }

  tick();
  if (counterInterval) clearInterval(counterInterval);
  counterInterval = setInterval(tick, 1000);
  return counterInterval;
}
