/**
 * Audio Manager & Web Audio Synthesizer (100% Offline)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.currentAudioElement = null;
    this.currentNodes = [];
    this.isPlaying = false;
    this.currentPlayingName = null;
    this.volume = 0.9;
    this.isUnlocked = false;
    this.onStateChangeCallbacks = [];
  }

  init() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  async unlockAudio() {
    if (!this.audioCtx) this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.isUnlocked = true;
    this.notifyState();
    return true;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, parseFloat(val)));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.volume;
    }
    if (window.bellDB) {
      window.bellDB.setSetting('master_volume', this.volume);
    }
    this.notifyState();
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  notifyState() {
    for (const cb of this.onStateChangeCallbacks) {
      try {
        cb({
          isPlaying: this.isPlaying,
          currentPlayingName: this.currentPlayingName,
          volume: this.volume,
          isUnlocked: this.isUnlocked
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  // --- EMERGENCY STOP ---
  stop() {
    // 1. Stop all active synthetic audio nodes
    for (const node of this.currentNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    }
    this.currentNodes = [];

    // 2. Stop HTML5 audio element
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.src = '';
      } catch (e) {}
      this.currentAudioElement = null;
    }

    this.isPlaying = false;
    this.currentPlayingName = null;
    this.notifyState();
  }

  // --- PLAY INSTRUMENT BY ID ---
  async playInstrument(instrumentId, customName = null) {
    await this.unlockAudio();
    this.stop(); // Stop any previous sound

    const inst = await window.bellDB.getInstrumentById(instrumentId);
    if (!inst) {
      console.error('Instrumen tidak ditemukan:', instrumentId);
      return false;
    }

    this.isPlaying = true;
    this.currentPlayingName = customName || inst.name;
    this.notifyState();

    try {
      if (inst.blob) {
        // Play custom uploaded MP3/WAV/OGG from Blob
        await this.playAudioBlob(inst.blob);
      } else {
        // Play synthetic built-in chime
        await this.playSyntheticChime(inst.id);
      }
    } catch (err) {
      console.error('Gagal memutar instrumen:', err);
      this.stop();
      return false;
    }

    return true;
  }

  // --- PLAY UPLOADED BLOB AUDIO ---
  playAudioBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      this.currentAudioElement = audio;
      audio.volume = this.volume;
      audio.src = url;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentPlayingName = null;
        this.currentAudioElement = null;
        this.notifyState();
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentPlayingName = null;
        this.currentAudioElement = null;
        this.notifyState();
        reject(e);
      };

      audio.play().catch(reject);
    });
  }

  // --- SYNTHETIC BELL SOUNDS GENERATOR ---
  // Real tubular bell physical acoustic simulation: Fundamental + overtone partials with exponential decay
  playBellTone(freq, startTime, duration = 2.5, intensity = 1.0) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    // Harmonic partial ratios for realistic church / school bronze tubular bells:
    // f0 (fundamental), 2.0 (octave), 2.76 (tierce), 4.07 (quint), 5.43 (nominal)
    const partials = [
      { ratio: 1.0,  amp: 0.6 * intensity, decay: duration },
      { ratio: 2.0,  amp: 0.35 * intensity, decay: duration * 0.8 },
      { ratio: 2.76, amp: 0.25 * intensity, decay: duration * 0.6 },
      { ratio: 4.07, amp: 0.15 * intensity, decay: duration * 0.4 },
      { ratio: 5.43, amp: 0.10 * intensity, decay: duration * 0.25 }
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, startTime);

      // Strike attack & bell decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(p.amp * this.volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + p.decay);

      this.currentNodes.push(osc);
      this.currentNodes.push(gain);
    }
  }

  async playSyntheticChime(chimeType) {
    if (!this.audioCtx) this.init();
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
    const ctx = this.audioCtx;
    const now = ctx.currentTime + 0.05;

    // Standard musical notes (Hz)
    const notes = {
      C4: 261.63,
      D4: 293.66,
      E4: 329.63,
      F4: 349.23,
      G4: 392.00,
      A4: 440.00,
      B3: 246.94,
      B4: 493.88,
      C5: 523.25,
      D5: 587.33,
      E5: 659.25,
      F5: 698.46,
      G5: 783.99,
      A5: 880.00,
      Gs4: 415.30, // G#4
      Fs4: 369.99  // F#4
    };

    let totalDuration = 5.0;

    switch (chimeType) {
      case 'inst-builtin-1': {
        // Westminster Chimes SMUQ (Famous 8-bell school chime)
        // Quarter 1: G#4 - F#4 - E4 - B3
        // Quarter 2: E4 - G#4 - F#4 - B3
        const sequence = [
          { note: notes.Gs4, time: 0.0, dur: 2.2 },
          { note: notes.Fs4, time: 0.9, dur: 2.2 },
          { note: notes.E4,  time: 1.8, dur: 2.2 },
          { note: notes.B3,  time: 2.7, dur: 3.2 },
          // Second phrase
          { note: notes.E4,  time: 4.2, dur: 2.2 },
          { note: notes.Gs4, time: 5.1, dur: 2.2 },
          { note: notes.Fs4, time: 6.0, dur: 2.2 },
          { note: notes.B3,  time: 6.9, dur: 4.0 }
        ];
        for (const item of sequence) {
          this.playBellTone(item.note, now + item.time, item.dur, 1.0);
        }
        totalDuration = 11.5;
        break;
      }

      case 'inst-builtin-2': {
        // Chime 2-Nada (Ding - Dong Masuk Kelas)
        this.playBellTone(notes.G5, now + 0.0, 2.5, 1.1);
        this.playBellTone(notes.E5, now + 1.1, 3.2, 1.2);
        totalDuration = 4.5;
        break;
      }

      case 'inst-builtin-3': {
        // Chime 3-Nada (Pergantian Jam Pelajaran: C5 - E5 - G5)
        this.playBellTone(notes.C5, now + 0.0, 2.2, 1.0);
        this.playBellTone(notes.E5, now + 0.8, 2.2, 1.0);
        this.playBellTone(notes.G5, now + 1.6, 3.2, 1.2);
        totalDuration = 5.0;
        break;
      }

      case 'inst-builtin-4': {
        // Nada Bel Masuk Sekolah (Upbeat 4-note motif: E5 - G#4 - B4 - E5)
        this.playBellTone(notes.E4, now + 0.0, 2.0, 1.0);
        this.playBellTone(notes.Gs4, now + 0.7, 2.0, 1.0);
        this.playBellTone(notes.B4, now + 1.4, 2.0, 1.0);
        this.playBellTone(notes.E5, now + 2.1, 3.8, 1.3);
        totalDuration = 6.2;
        break;
      }

      case 'inst-builtin-5': {
        // Nada Bel Istirahat (Descending relaxing chime: G5 - E5 - C5 - A4)
        this.playBellTone(notes.G5, now + 0.0, 2.2, 1.0);
        this.playBellTone(notes.E5, now + 0.75, 2.2, 1.0);
        this.playBellTone(notes.C5, now + 1.5, 2.2, 1.0);
        this.playBellTone(notes.A4, now + 2.25, 3.5, 1.2);
        totalDuration = 6.0;
        break;
      }

      case 'inst-builtin-6': {
        // Nada Bel Pulang Sekolah (Grand school finish fanfare)
        const seq = [
          { note: notes.C5, time: 0.0, dur: 1.8 },
          { note: notes.D5, time: 0.6, dur: 1.8 },
          { note: notes.E5, time: 1.2, dur: 1.8 },
          { note: notes.G5, time: 1.8, dur: 2.2 },
          { note: notes.E5, time: 2.6, dur: 1.8 },
          { note: notes.G5, time: 3.3, dur: 4.5 }
        ];
        for (const item of seq) {
          this.playBellTone(item.note, now + item.time, item.dur, 1.1);
        }
        totalDuration = 8.0;
        break;
      }

      default: {
        this.playBellTone(notes.A4, now + 0.0, 3.0, 1.0);
        totalDuration = 3.5;
        break;
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        this.isPlaying = false;
        this.currentPlayingName = null;
        this.notifyState();
        resolve();
      }, totalDuration * 1000);
    });
  }
}

// Global instance
window.audioManager = new AudioManager();
