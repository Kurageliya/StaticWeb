/**
 * Audio Service
 * Pengelola musik latar (mp3) dan synthesizer denting romantis (Web Audio API Pentatonic Chimes).
 */
import { showToast } from '../utils/toast.js';

let audioCtx = null;
let isPlayingAudio = false;
let audioTimer = null;

// Romantic Pentatonic Chord Frequencies (F Major / D Minor warmth)
const CHORD_NOTES = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5

export function setupAudioSynth(btnAudioToggle, bgMusic, getCoupleSettings) {
  if (!btnAudioToggle) return;

  btnAudioToggle.addEventListener('click', () => {
    const coupleSettings = typeof getCoupleSettings === 'function' ? getCoupleSettings() : null;
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
          console.warn('Audio element play fallback to Web Audio synth:', err);
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
