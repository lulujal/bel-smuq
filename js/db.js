/**
 * Database Storage Manager (IndexedDB + LocalStorage)
 * 100% Offline & Permanen di Harddisk Komputer
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const DB_NAME = 'smuq_bell_db';
const DB_VERSION = 1;

class BellDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.readyCallbacks = [];
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Request browser persistent storage to prevent automatic cache clearance
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
          if (granted) console.log('✅ Storage ditandai PERSISTENT (Aman & Permanen di Harddisk).');
        }).catch(err => console.log('Storage persist status:', err));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for audio binary files (MP3/WAV Blobs)
        if (!db.objectStoreNames.contains('audio_files')) {
          db.createObjectStore('audio_files', { keyPath: 'id' });
        }
        
        // Store for schedules
        if (!db.objectStoreNames.contains('schedules')) {
          const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
          scheduleStore.createIndex('day', 'day', { unique: false });
        }

        // Store for settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Store for history logs
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for period reduction rules
        if (!db.objectStoreNames.contains('reductions')) {
          db.createObjectStore('reductions', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;
        await this.seedInitialData();
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- SETTINGS METHODS ---
  async getSetting(key, defaultValue = null) {
    return new Promise((resolve) => {
      if (!this.db) {
        const local = localStorage.getItem(`smuq_setting_${key}`);
        return resolve(local !== null ? JSON.parse(local) : defaultValue);
      }
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result !== undefined) {
          resolve(req.result.value);
        } else {
          // fallback to localStorage
          const local = localStorage.getItem(`smuq_setting_${key}`);
          resolve(local !== null ? JSON.parse(local) : defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  async setSetting(key, value) {
    localStorage.setItem(`smuq_setting_${key}`, JSON.stringify(value));
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(value);
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  // --- AUDIO INSTRUMENTS METHODS ---
  async getAllInstruments() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_files', 'readonly');
      const store = tx.objectStore('audio_files');
      const req = store.getAll();
      req.onsuccess = () => {
        // Return instruments metadata (don't retain heavy blob in simple lists)
        resolve(req.result.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          duration: item.duration || 0,
          isBuiltin: item.isBuiltin,
          createdAt: item.createdAt,
          hasBlob: !!item.blob
        })));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getInstrumentById(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_files', 'readonly');
      const store = tx.objectStore('audio_files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveInstrument(instrument) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_files', 'readwrite');
      const store = tx.objectStore('audio_files');
      const data = {
        id: instrument.id || 'inst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        name: instrument.name,
        type: instrument.type || 'audio/wav',
        size: instrument.size || (instrument.blob ? instrument.blob.size : 0),
        duration: instrument.duration || 0,
        isBuiltin: instrument.isBuiltin || false,
        blob: instrument.blob || null,
        createdAt: instrument.createdAt || new Date().toISOString()
      };
      const req = store.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteInstrument(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_files', 'readwrite');
      const store = tx.objectStore('audio_files');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async updateInstrument(id, updateData = {}) {
    const inst = await this.getInstrumentById(id);
    if (!inst) throw new Error('Instrumen tidak ditemukan');
    
    if (updateData.name) {
      inst.name = updateData.name;
    }
    if (updateData.blob) {
      inst.blob = updateData.blob;
      inst.size = updateData.size || updateData.blob.size || 0;
      inst.type = updateData.type || updateData.blob.type || 'audio/mpeg';
      inst.duration = updateData.duration || 0;
      inst.isBuiltin = false; // Karena audio diganti file kustom
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_files', 'readwrite');
      const store = tx.objectStore('audio_files');
      const req = store.put(inst);
      req.onsuccess = () => resolve(inst);
      req.onerror = () => reject(req.error);
    });
  }

  async updateInstrumentName(id, newName) {
    return this.updateInstrument(id, { name: newName });
  }

  // --- SCHEDULE METHODS ---
  async getAllSchedules() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('schedules', 'readonly');
      const store = tx.objectStore('schedules');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => a.time.localeCompare(b.time));
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSchedulesByDay(dayName) {
    const all = await this.getAllSchedules();
    return all.filter(s => s.day.toLowerCase() === dayName.toLowerCase());
  }

  async saveSchedule(schedule) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('schedules', 'readwrite');
      const store = tx.objectStore('schedules');
      const item = {
        id: schedule.id || 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        day: schedule.day, // 'Senin', 'Selasa', dll
        time: schedule.time, // '07:00'
        period: schedule.period || 'Jam Pelajaran',
        type: schedule.type || 'Pergantian Jam', // 'Masuk', 'Pergantian Jam', 'Istirahat', 'Pulang', 'Khusus'
        instrumentId: schedule.instrumentId || 'inst-builtin-1',
        instrumentName: schedule.instrumentName || 'Westminster Chimes SMUQ',
        notes: schedule.notes || '',
        enabled: schedule.enabled !== false
      };
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSchedule(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('schedules', 'readwrite');
      const store = tx.objectStore('schedules');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async copySchedulesFromDay(sourceDay, targetDays) {
    const sourceSchedules = await this.getSchedulesByDay(sourceDay);
    if (!sourceSchedules.length) {
      throw new Error(`Tidak ada jadwal di hari ${sourceDay} untuk disalin.`);
    }

    const all = await this.getAllSchedules();
    const newItems = [];

    // Delete existing target days schedules first
    for (const targetDay of targetDays) {
      if (targetDay.toLowerCase() === sourceDay.toLowerCase()) continue;
      
      for (const s of sourceSchedules) {
        newItems.push({
          id: 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7),
          day: targetDay,
          time: s.time,
          period: s.period,
          type: s.type,
          instrumentId: s.instrumentId,
          instrumentName: s.instrumentName,
          notes: s.notes,
          enabled: s.enabled
        });
      }
    }

    // Save in transaction
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('schedules', 'readwrite');
      const store = tx.objectStore('schedules');
      
      // Remove previous schedules on target days
      const reqAll = store.getAll();
      reqAll.onsuccess = () => {
        const existing = reqAll.result;
        for (const item of existing) {
          if (targetDays.includes(item.day) && item.day !== sourceDay) {
            store.delete(item.id);
          }
        }
        for (const newItem of newItems) {
          store.put(newItem);
        }
      };

      tx.oncomplete = () => resolve(newItems);
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- REDUCTION SETTINGS METHODS ---
  async getReductionSettings() {
    return this.getSetting('reduction_config', {
      enabled: false,
      appliedDays: ['Semua Hari'], // or ['Jumat'], etc.
      minutesPerLesson: 5,
      reduceBreaks: false, // Default: HANYA jam pelajaran bukan istirahat!
      referenceDay: 'Senin',
      customTimes: {} // optional manual override
    });
  }

  async saveReductionSettings(config) {
    return this.setSetting('reduction_config', config);
  }

  // --- HISTORY LOGS METHODS ---
  async addHistoryLog(log) {
    const now = new Date();
    const entry = {
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: now.getTime(),
      dateStr: now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      triggerType: log.triggerType || 'auto', // 'auto' | 'manual'
      period: log.period || '-',
      bellType: log.bellType || '-',
      instrumentName: log.instrumentName || '-',
      status: log.status || 'Berhasil', // 'Berhasil', 'Dilewati (Sistem Nonaktif)', 'Gagal'
      notes: log.notes || ''
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const req = store.put(entry);
      req.onsuccess = () => resolve(entry);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllHistory(limit = 200) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearHistory() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // --- PEMBERSIHAN OTOMATIS RIWAYAT BEL MINGGUAN (LEBIH DARI 7 HARI) ---
  async cleanWeeklyHistory() {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ONE_WEEK_MS;

    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(0);
      const tx = this.db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        let deletedCount = 0;
        for (const item of items) {
          if (item.timestamp && item.timestamp < cutoff) {
            store.delete(item.id);
            deletedCount++;
          }
        }
        if (deletedCount > 0) {
          console.log(`🧹 Pembersihan Otomatis Mingguan: ${deletedCount} riwayat bel lama (>7 hari) berhasil dibersihkan.`);
        }
        resolve(deletedCount);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- SEED INITIAL DATA ---
  async seedInitialData() {
    // 1. Settings
    const masterEnabled = await this.getSetting('master_bell_enabled', null);
    if (masterEnabled === null) {
      await this.setSetting('master_bell_enabled', true); // Default: ON
      await this.setSetting('master_volume', 0.9);
      await this.setSetting('school_name', 'SMA Kristen 1 Salatiga (SMUQ)');
      await this.setSetting('school_tagline', 'Sistem Bel Otomatis SMUQ • Kolaborasi PPG Informatika UKSW 2026');
      await this.setSetting('session_timeout_minutes', 15); // Default: 15 menit
    }

    const currentPwd = await this.getSetting('lock_password', null);
    if (!currentPwd) {
      await this.setSetting('lock_password', 'smak1pwd');
    }

    // Always check & clean weekly history on startup
    await this.cleanWeeklyHistory();

    // 2. Default Instruments Metadata (Built-in Web Audio synthesisers)
    const instruments = await this.getAllInstruments();
    if (instruments.length === 0) {
      const builtins = [
        { id: 'inst-builtin-1', name: 'Westminster Chimes SMUQ', type: 'audio/synthetic', isBuiltin: true, duration: 12 },
        { id: 'inst-builtin-2', name: 'Chime 2-Nada (Masuk Kelas)', type: 'audio/synthetic', isBuiltin: true, duration: 4 },
        { id: 'inst-builtin-3', name: 'Chime 3-Nada (Pergantian Jam)', type: 'audio/synthetic', isBuiltin: true, duration: 5 },
        { id: 'inst-builtin-4', name: 'Nada Bel Masuk Sekolah', type: 'audio/synthetic', isBuiltin: true, duration: 8 },
        { id: 'inst-builtin-5', name: 'Nada Bel Istirahat', type: 'audio/synthetic', isBuiltin: true, duration: 6 },
        { id: 'inst-builtin-6', name: 'Nada Bel Pulang Sekolah', type: 'audio/synthetic', isBuiltin: true, duration: 10 }
      ];
      for (const inst of builtins) {
        await this.saveInstrument(inst);
      }
    }

    // 3. Default Realistic Schedules for SMA Kristen 1 Salatiga (Senin - Jumat)
    const schedules = await this.getAllSchedules();
    if (schedules.length === 0) {
      const defaultSchedules = [
        // SENIN
        { day: 'Senin', time: '07:00', period: 'Upacara Bendera', type: 'Masuk', instrumentId: 'inst-builtin-1', instrumentName: 'Westminster Chimes SMUQ' },
        { day: 'Senin', time: '07:45', period: 'Jam Ke-1', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Senin', time: '08:30', period: 'Jam Ke-2', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Senin', time: '09:15', period: 'Jam Ke-3', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Senin', time: '10:00', period: 'Istirahat 1', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Senin', time: '10:30', period: 'Jam Ke-4', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Senin', time: '11:15', period: 'Jam Ke-5', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Senin', time: '12:00', period: 'Istirahat 2 (Makan Siang)', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Senin', time: '12:30', period: 'Jam Ke-6', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Senin', time: '13:15', period: 'Jam Ke-7', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Senin', time: '14:00', period: 'Jam Ke-8', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Senin', time: '14:45', period: 'Doa Bersama & Pulang', type: 'Pulang', instrumentId: 'inst-builtin-6', instrumentName: 'Nada Bel Pulang Sekolah' },

        // SELASA
        { day: 'Selasa', time: '07:00', period: 'Renungan & Doa Pagi', type: 'Masuk', instrumentId: 'inst-builtin-1', instrumentName: 'Westminster Chimes SMUQ' },
        { day: 'Selasa', time: '07:30', period: 'Jam Ke-1', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Selasa', time: '08:15', period: 'Jam Ke-2', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Selasa', time: '09:00', period: 'Jam Ke-3', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Selasa', time: '09:45', period: 'Jam Ke-4', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Selasa', time: '10:30', period: 'Istirahat 1', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Selasa', time: '11:00', period: 'Jam Ke-5', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Selasa', time: '11:45', period: 'Jam Ke-6', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Selasa', time: '12:30', period: 'Istirahat 2 (Makan Siang)', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Selasa', time: '13:00', period: 'Jam Ke-7', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Selasa', time: '13:45', period: 'Jam Ke-8', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Selasa', time: '14:30', period: 'Doa Bersama & Pulang', type: 'Pulang', instrumentId: 'inst-builtin-6', instrumentName: 'Nada Bel Pulang Sekolah' },

        // RABU
        { day: 'Rabu', time: '07:00', period: 'Renungan & Doa Pagi', type: 'Masuk', instrumentId: 'inst-builtin-1', instrumentName: 'Westminster Chimes SMUQ' },
        { day: 'Rabu', time: '07:30', period: 'Jam Ke-1', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Rabu', time: '08:15', period: 'Jam Ke-2', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Rabu', time: '09:00', period: 'Jam Ke-3', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Rabu', time: '09:45', period: 'Jam Ke-4', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Rabu', time: '10:30', period: 'Istirahat 1', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Rabu', time: '11:00', period: 'Jam Ke-5', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Rabu', time: '11:45', period: 'Jam Ke-6', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Rabu', time: '12:30', period: 'Istirahat 2 (Makan Siang)', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Rabu', time: '13:00', period: 'Jam Ke-7', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Rabu', time: '13:45', period: 'Jam Ke-8', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Rabu', time: '14:30', period: 'Doa Bersama & Pulang', type: 'Pulang', instrumentId: 'inst-builtin-6', instrumentName: 'Nada Bel Pulang Sekolah' },

        // KAMIS
        { day: 'Kamis', time: '07:00', period: 'Renungan & Doa Pagi', type: 'Masuk', instrumentId: 'inst-builtin-1', instrumentName: 'Westminster Chimes SMUQ' },
        { day: 'Kamis', time: '07:30', period: 'Jam Ke-1', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Kamis', time: '08:15', period: 'Jam Ke-2', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Kamis', time: '09:00', period: 'Jam Ke-3', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Kamis', time: '09:45', period: 'Jam Ke-4', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Kamis', time: '10:30', period: 'Istirahat 1', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Kamis', time: '11:00', period: 'Jam Ke-5', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Kamis', time: '11:45', period: 'Jam Ke-6', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Kamis', time: '12:30', period: 'Istirahat 2 (Makan Siang)', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Kamis', time: '13:00', period: 'Jam Ke-7', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Kamis', time: '13:45', period: 'Jam Ke-8', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Kamis', time: '14:30', period: 'Doa Bersama & Pulang', type: 'Pulang', instrumentId: 'inst-builtin-6', instrumentName: 'Nada Bel Pulang Sekolah' },

        // JUMAT (Jadwal Khusus Ibadah / Ekstrakurikuler)
        { day: 'Jumat', time: '07:00', period: 'Ibadah Bersama SMUQ', type: 'Masuk', instrumentId: 'inst-builtin-1', instrumentName: 'Westminster Chimes SMUQ' },
        { day: 'Jumat', time: '07:50', period: 'Jam Ke-1', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Jumat', time: '08:35', period: 'Jam Ke-2', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Jumat', time: '09:20', period: 'Jam Ke-3', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Jumat', time: '10:05', period: 'Istirahat & Snack', type: 'Istirahat', instrumentId: 'inst-builtin-5', instrumentName: 'Nada Bel Istirahat' },
        { day: 'Jumat', time: '10:30', period: 'Jam Ke-4', type: 'Masuk', instrumentId: 'inst-builtin-2', instrumentName: 'Chime 2-Nada (Masuk Kelas)' },
        { day: 'Jumat', time: '11:15', period: 'Jam Ke-5', type: 'Pergantian Jam', instrumentId: 'inst-builtin-3', instrumentName: 'Chime 3-Nada (Pergantian Jam)' },
        { day: 'Jumat', time: '12:00', period: 'Doa Bersama & Pulang', type: 'Pulang', instrumentId: 'inst-builtin-6', instrumentName: 'Nada Bel Pulang Sekolah' }
      ];

      for (const item of defaultSchedules) {
        await this.saveSchedule(item);
      }
    }
  }

  // --- BACKUP & RESTORE ---
  async exportBackupJSON() {
    const schedules = await this.getAllSchedules();
    const history = await this.getAllHistory(500);
    const reduction = await this.getReductionSettings();
    const masterEnabled = await this.getSetting('master_bell_enabled', true);
    const volume = await this.getSetting('master_volume', 0.9);
    
    // Export instruments (convert Blobs to Base64 data URL)
    const rawInstruments = await new Promise((resolve) => {
      const tx = this.db.transaction('audio_files', 'readonly');
      const req = tx.objectStore('audio_files').getAll();
      req.onsuccess = () => resolve(req.result || []);
    });

    const instrumentsData = [];
    for (const inst of rawInstruments) {
      let base64 = null;
      if (inst.blob) {
        base64 = await new Promise((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.readAsDataURL(inst.blob);
        });
      }
      instrumentsData.push({
        id: inst.id,
        name: inst.name,
        type: inst.type,
        size: inst.size,
        duration: inst.duration,
        isBuiltin: inst.isBuiltin,
        createdAt: inst.createdAt,
        base64Data: base64
      });
    }

    const backup = {
      version: '1.0',
      appName: 'Sistem Bel Sekolah SMUQ',
      school: 'SMA Kristen 1 Salatiga',
      developer: 'PPG Informatika UKSW 2026',
      exportedAt: new Date().toISOString(),
      settings: {
        masterEnabled,
        volume
      },
      reduction,
      schedules,
      history,
      instruments: instrumentsData
    };

    return JSON.stringify(backup, null, 2);
  }

  async importBackupJSON(jsonString) {
    const backup = JSON.parse(jsonString);
    if (!backup.schedules && !backup.instruments) {
      throw new Error('Format file cadangan tidak valid.');
    }

    if (backup.settings) {
      if (backup.settings.masterEnabled !== undefined) {
        await this.setSetting('master_bell_enabled', backup.settings.masterEnabled);
      }
      if (backup.settings.volume !== undefined) {
        await this.setSetting('master_volume', backup.settings.volume);
      }
    }

    if (backup.reduction) {
      await this.saveReductionSettings(backup.reduction);
    }

    if (Array.isArray(backup.schedules)) {
      // Clear and restore schedules
      const tx = this.db.transaction('schedules', 'readwrite');
      const store = tx.objectStore('schedules');
      store.clear();
      for (const item of backup.schedules) {
        store.put(item);
      }
    }

    if (Array.isArray(backup.instruments)) {
      for (const inst of backup.instruments) {
        let blob = null;
        if (inst.base64Data) {
          const res = await fetch(inst.base64Data);
          blob = await res.blob();
        }
        await this.saveInstrument({
          id: inst.id,
          name: inst.name,
          type: inst.type,
          size: inst.size,
          duration: inst.duration,
          isBuiltin: inst.isBuiltin,
          createdAt: inst.createdAt,
          blob: blob
        });
      }
    }

    return true;
  }
}

// Global instance
window.bellDB = new BellDatabase();
