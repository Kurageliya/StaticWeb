/**
 * Audio Service
 * Pengelola musik latar pintar:
 * 1. YouTube & YouTube Music (via YouTube IFrame Player API)
 * 2. File Audio MP3 / AAC / OGG (via HTML5 Audio Element)
 * 3. Synthesizer Denting Romantis (Web Audio API Pentatonic Chimes) sebagai fallback otomatis.
 */
import { showToast } from '../utils/toast.js';

let audioCtx = null;
let isPlayingAudio = false;
let audioTimer = null;
let currentAudioMode = 'none'; // 'youtube' | 'html5' | 'ambient' | 'none'
let ytPlayer = null;
let ytReadyPromise = null;
let currentLoadedVideoId = null;
let activeGetCoupleSettings = null;
let activeBtnToggle = null;
let activeBgMusic = null;

// Romantic Pentatonic Chord Frequencies (F Major / D Minor warmth)
const CHORD_NOTES = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5

/**
 * Mengekstrak YouTube Video ID dari berbagai format link:
 * - youtube.com/watch?v=ID
 * - music.youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/shorts/ID
 * - youtube.com/embed/ID
 * - Direct 11-character Video ID
 */
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

/**
 * Memuat skrip resmi YouTube IFrame Player API jika belum tersedia
 */
function loadYouTubeIFrameAPI() {
  if (ytReadyPromise) return ytReadyPromise;

  ytReadyPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const existingTag = document.getElementById('youtube-iframe-api-script');
    if (!existingTag) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0] || document.head;
      firstScript.parentNode.insertBefore(tag, firstScript);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      resolve(window.YT);
    };
  });

  return ytReadyPromise;
}

/**
 * Memastikan elemen container iframe YouTube tersedia di latar belakang
 */
function ensureYouTubeContainer() {
  let container = document.getElementById('yt-player-wrap');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-player-wrap';
    container.style.cssText = 'position:fixed;bottom:-999px;right:-999px;width:200px;height:200px;opacity:0.01;pointer-events:none;z-index:-999;';
    const inner = document.createElement('div');
    inner.id = 'yt-player-iframe';
    container.appendChild(inner);
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Memperbarui tampilan ikon dan class pada tombol audio toggle
 */
function updateButtonState(btn, playing) {
  if (!btn) return;
  if (playing) {
    btn.classList.add('playing');
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
    btn.setAttribute('title', 'Matikan Musik Latar');
  } else {
    btn.classList.remove('playing');
    btn.innerHTML = `<i class="fa-solid fa-music"></i>`;
    btn.setAttribute('title', 'Putar Musik Latar');
  }
}

/**
 * Menghentikan semua pemutar audio (YouTube, HTML5 audio, dan Ambient Synthesizer)
 */
export function stopAllAudio(includeAmbient = true) {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try {
      ytPlayer.pauseVideo();
    } catch (e) {
      console.warn('Gagal pause YouTube player:', e);
    }
  }

  if (activeBgMusic && !activeBgMusic.paused) {
    try {
      activeBgMusic.pause();
    } catch (e) {
      console.warn('Gagal pause HTML5 audio:', e);
    }
  }

  if (includeAmbient) {
    stopAmbientMusic();
  }

  isPlayingAudio = false;
  currentAudioMode = 'none';
  if (activeBtnToggle) {
    updateButtonState(activeBtnToggle, false);
  }
}

/**
 * Memutar lagu dari YouTube atau YouTube Music
 */
function playYouTubeTrack(videoId, btnAudioToggle) {
  ensureYouTubeContainer();
  showToast('⏳ Menghubungkan ke YouTube...');
  updateButtonState(btnAudioToggle, true);

  loadYouTubeIFrameAPI().then((YT) => {
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
      if (currentLoadedVideoId !== videoId) {
        currentLoadedVideoId = videoId;
        ytPlayer.loadVideoById({
          videoId: videoId,
          startSeconds: 0
        });
      } else {
        ytPlayer.playVideo();
      }
      currentAudioMode = 'youtube';
      isPlayingAudio = true;
      updateButtonState(btnAudioToggle, true);
      showToast('🎵 Memutar Musik YouTube');
      return;
    }

    currentLoadedVideoId = videoId;
    ytPlayer = new YT.Player('yt-player-iframe', {
      height: '200',
      width: '200',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        loop: 1,
        playlist: videoId,
        modestbranding: 1,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady: (event) => {
          event.target.playVideo();
          currentAudioMode = 'youtube';
          isPlayingAudio = true;
          updateButtonState(btnAudioToggle, true);
          showToast('🎵 Memutar Musik YouTube');
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            isPlayingAudio = true;
            currentAudioMode = 'youtube';
            updateButtonState(btnAudioToggle, true);
          } else if (event.data === YT.PlayerState.ENDED) {
            event.target.playVideo(); // Auto-loop
          }
        },
        onError: (err) => {
          console.warn('YouTube Player error code:', err.data, err);
          showToast('⚠️ Video YouTube tidak dapat diputar, beralih ke musik ambient');
          stopAllAudio(false);
          startAmbientMusic();
          currentAudioMode = 'ambient';
          updateButtonState(btnAudioToggle, true);
        }
      }
    });
  }).catch((err) => {
    console.warn('Gagal memuat YouTube API:', err);
    startAmbientMusic();
    currentAudioMode = 'ambient';
    updateButtonState(btnAudioToggle, true);
  });
}

/**
 * Setup Utama Audio Synth & Listener Tombol Musik
 */
export function setupAudioSynth(btnAudioToggle, bgMusic, getCoupleSettings) {
  activeBtnToggle = btnAudioToggle;
  activeBgMusic = bgMusic;
  activeGetCoupleSettings = getCoupleSettings;

  if (!btnAudioToggle) return;

  btnAudioToggle.addEventListener('click', () => {
    if (isPlayingAudio) {
      stopAllAudio(true);
      showToast('🔇 Musik Dimatikan');
      return;
    }

    const coupleSettings = typeof activeGetCoupleSettings === 'function' ? activeGetCoupleSettings() : null;
    const customUrl = (coupleSettings && coupleSettings.musicUrl) ? coupleSettings.musicUrl.trim() : 'assets/audio/music.mp3';

    // 1. Cek jika URL adalah YouTube / YouTube Music
    const ytVideoId = extractYouTubeVideoId(customUrl);
    if (ytVideoId) {
      playYouTubeTrack(ytVideoId, btnAudioToggle);
      return;
    }

    // 2. Jika file MP3 / HTML5 Audio biasa
    if (bgMusic && customUrl) {
      if (bgMusic.src !== customUrl && !bgMusic.src.endsWith(encodeURI(customUrl))) {
        bgMusic.src = customUrl;
      }
      bgMusic.play().then(() => {
        isPlayingAudio = true;
        currentAudioMode = 'html5';
        updateButtonState(btnAudioToggle, true);
        showToast('🎵 Memutar Musik Latar');
      }).catch(err => {
        console.warn('Audio element play fallback ke Web Audio synth:', err);
        startAmbientMusic();
        currentAudioMode = 'ambient';
        updateButtonState(btnAudioToggle, true);
        showToast('🎵 Memutar Musik Ambient Romantis');
      });
    } else {
      startAmbientMusic();
      currentAudioMode = 'ambient';
      updateButtonState(btnAudioToggle, true);
      showToast('🎵 Memutar Musik Ambient Romantis');
    }
  });
}

/**
 * Handler saat URL musik diperbarui di modal Pengaturan
 */
export function onMusicUrlChanged(newUrl) {
  if (!isPlayingAudio) return;
  // Jika musik sedang menyala, ganti ke sumber baru
  stopAllAudio(true);
  const ytVideoId = extractYouTubeVideoId(newUrl);
  if (ytVideoId) {
    playYouTubeTrack(ytVideoId, activeBtnToggle);
  } else if (activeBgMusic && newUrl) {
    activeBgMusic.src = newUrl;
    activeBgMusic.play().then(() => {
      isPlayingAudio = true;
      currentAudioMode = 'html5';
      updateButtonState(activeBtnToggle, true);
      showToast('🎵 Memutar Musik Baru');
    }).catch(() => {
      startAmbientMusic();
      currentAudioMode = 'ambient';
      updateButtonState(activeBtnToggle, true);
    });
  } else {
    startAmbientMusic();
    currentAudioMode = 'ambient';
    updateButtonState(activeBtnToggle, true);
  }
}

/**
 * Pemutar Denting Romantis (Web Audio API Pentatonic Chimes)
 */
export function startAmbientMusic() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  isPlayingAudio = true;

  function playSoftChime() {
    if (!isPlayingAudio || !audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freq = CHORD_NOTES[Math.floor(Math.random() * CHORD_NOTES.length)];
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

export function stopAmbientMusic() {
  isPlayingAudio = false;
  if (audioTimer) clearTimeout(audioTimer);
}
