/**
 * Engine Penjadwalan Waktu Presisi & Kalkulator Pengurangan Jam
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

class BellScheduler {
  constructor() {
    this.timerInterval = null;
    this.lastTriggeredKey = null;
    this.lastCheckedMinute = null;
    this.listeners = [];
    this.todayEffectiveSchedules = [];
    this.isMasterActive = true;
    this.currentReductionConfig = null;
  }

  // Indonesian day names mapping
  static DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  static getTodayName(date = new Date()) {
    return BellScheduler.DAYS[date.getDay()];
  }

  static formatIndonesianDate(date = new Date()) {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  static formatTime(date = new Date()) {
    return date.toTimeString().split(' ')[0]; // 'HH:mm:ss'
  }

  static parseMinutes(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  static formatHHMM(totalMinutes) {
    let m = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(m / 60) % 24;
    const mins = m % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  async init() {
    this.isMasterActive = await window.bellDB.getSetting('master_bell_enabled', true);
    this.currentReductionConfig = await window.bellDB.getReductionSettings();
    await this.refreshTodaySchedules();

    // Start 1-second interval loop
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 1000);
  }

  // Register listener for UI updates (clock, upcoming countdown, bell trigger)
  subscribe(fn) {
    this.listeners.push(fn);
  }

  emit(eventType, data) {
    for (const fn of this.listeners) {
      try {
        fn(eventType, data);
      } catch (e) {
        console.error('Error in scheduler listener:', e);
      }
    }
  }

  async setMasterActive(active) {
    this.isMasterActive = !!active;
    await window.bellDB.setSetting('master_bell_enabled', this.isMasterActive);
    this.emit('master_switch_changed', { isMasterActive: this.isMasterActive });
  }

  /**
   * KALKULASI CERDAS PENGURANGAN JAM PELAJARAN
   * Default: HANYA jam pelajaran (belajar mengajar) yang dipotong durasinya.
   * Jam istirahat TIDAK DIKURANGI sama sekali (durasi tetap utuh),
   * kecuali jika user secara eksplisit mencentang 'reduceBreaks'.
   */
  calculateScheduleWithReduction(schedules, reductionConfig) {
    if (!schedules || !schedules.length) return [];
    
    // Sort schedules chronologically
    const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time));

    const isEnabled = reductionConfig && reductionConfig.enabled;
    const reductionMins = (reductionConfig && reductionConfig.minutesPerLesson) || 0;
    const reduceBreaks = (reductionConfig && reductionConfig.reduceBreaks) || false;

    if (!isEnabled || reductionMins <= 0) {
      // Normal schedule (tanpa pengurangan)
      return sorted.map(s => ({
        ...s,
        originalTime: s.time,
        effectiveTime: s.time,
        durationMinutes: 0,
        isReduced: false,
        timeShiftMinutes: 0
      }));
    }

    // Hitung durasi awal antar jam
    const calculated = [];
    let cumulativeShift = 0;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentMins = BellScheduler.parseMinutes(current.time);
      const nextMins = next ? BellScheduler.parseMinutes(next.time) : (currentMins + 45);
      const originalDuration = Math.max(5, nextMins - currentMins);

      // Waktu efektif baru = Waktu asli dikurangi total pergeseran kumulatif sebelumnya
      const effectiveMins = Math.max(0, currentMins - cumulativeShift);
      const effectiveTime = BellScheduler.formatHHMM(effectiveMins);

      const isBreak = (current.type && current.type.toLowerCase().includes('istirahat')) ||
                      (current.period && current.period.toLowerCase().includes('istirahat'));

      // Jam pertama (07.00 - 07.20) tidak dipotong durasinya:
      const isFirstMorningPeriod = (currentMins >= 420 && currentMins < 440) ||
                                   (current.time >= '07:00' && current.time < '07:20');

      let reducedBy = 0;

      if (isFirstMorningPeriod) {
        // Jam pertama 07.00 - 07.20: TIDAK DIKURANGI / TETAP UTUH
        reducedBy = 0;
      } else if (!isBreak) {
        // Ini adalah Jam Pelajaran biasa -> potong durasi!
        // Pastikan durasi tidak sampai 0 atau minus (minimal 15 menit)
        reducedBy = Math.min(reductionMins, Math.max(0, originalDuration - 15));
      } else if (reduceBreaks) {
        // User memilih untuk ikut memotong jam istirahat
        reducedBy = Math.min(reductionMins, Math.max(0, originalDuration - 10));
      } else {
        // ISTIRAHAT: JANGAN DIPOTONG! (reducedBy = 0)
        reducedBy = 0;
      }

      calculated.push({
        ...current,
        originalTime: current.time,
        effectiveTime: effectiveTime,
        originalDuration: originalDuration,
        newDuration: originalDuration - reducedBy,
        reducedBy: reducedBy,
        cumulativeShift: cumulativeShift,
        isReduced: cumulativeShift > 0 || reducedBy > 0,
        isBreak: isBreak,
        isFirstMorningPeriod: isFirstMorningPeriod
      });

      // Akumulasikan pergeseran waktu ke jam-jam berikutnya
      cumulativeShift += reducedBy;
    }

    return calculated;
  }

  // --- OVERRIDE JADWAL HARI INI (MISAL SENIN TANPA UPACARA -> TERAPKAN SELASA) ---
  async getTodayScheduleOverride() {
    return await window.bellDB.getSetting('today_schedule_override', null);
  }

  async setTodayScheduleOverride(targetDay) {
    await window.bellDB.setSetting('today_schedule_override', targetDay);
    await this.refreshTodaySchedules();
    return targetDay;
  }

  async clearTodayScheduleOverride() {
    await window.bellDB.setSetting('today_schedule_override', null);
    await this.refreshTodaySchedules();
    return null;
  }

  async refreshTodaySchedules() {
    const actualToday = BellScheduler.getTodayName();
    const overrideDay = await this.getTodayScheduleOverride();
    const effectiveDay = overrideDay || actualToday;

    const rawSchedules = await window.bellDB.getSchedulesByDay(effectiveDay);
    this.currentReductionConfig = await window.bellDB.getReductionSettings();

    // Check if reduction applies to today
    const appliesToToday = this.currentReductionConfig &&
      this.currentReductionConfig.enabled &&
      (this.currentReductionConfig.appliedDays.includes('Semua Hari') ||
       this.currentReductionConfig.appliedDays.includes(actualToday) ||
       this.currentReductionConfig.appliedDays.includes(effectiveDay));

    const activeConfig = appliesToToday ? this.currentReductionConfig : { enabled: false };

    this.todayEffectiveSchedules = this.calculateScheduleWithReduction(rawSchedules, activeConfig);
    this.emit('schedule_refreshed', {
      today: actualToday,
      effectiveDay: effectiveDay,
      isOverridden: !!overrideDay,
      overrideDay: overrideDay,
      schedules: this.todayEffectiveSchedules,
      isReductionActive: appliesToToday,
      reductionConfig: this.currentReductionConfig
    });

    return this.todayEffectiveSchedules;
  }

  // Find next upcoming bell for countdown
  getNextUpcomingBell() {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const currentSecs = now.getSeconds();
    const currentTotalSec = currentMins * 60 + currentSecs;

    for (const sch of this.todayEffectiveSchedules) {
      if (sch.enabled === false) continue;
      const schMins = BellScheduler.parseMinutes(sch.effectiveTime);
      const schTotalSec = schMins * 60;

      if (schTotalSec > currentTotalSec) {
        const diffSec = schTotalSec - currentTotalSec;
        const diffH = Math.floor(diffSec / 3600);
        const diffM = Math.floor((diffSec % 3600) / 60);
        const diffS = diffSec % 60;

        let countdownText = '';
        if (diffH > 0) {
          countdownText = `${diffH}j ${diffM}m ${diffS}d`;
        } else {
          countdownText = `${String(diffM).padStart(2, '0')}m ${String(diffS).padStart(2, '0')}d`;
        }

        return {
          schedule: sch,
          remainingSeconds: diffSec,
          countdownText: countdownText
        };
      }
    }

    return null; // Semua jadwal hari ini sudah lewat
  }

  // Ticking function executed every second
  async tick() {
    const now = new Date();
    const today = BellScheduler.getTodayName(now);
    const timeStr = BellScheduler.formatTime(now);
    const hhmm = timeStr.substring(0, 5); // 'HH:mm'
    const seconds = now.getSeconds();

    const nextUpcoming = this.getNextUpcomingBell();

    // Broadcast tick event for clock and countdown UI
    this.emit('tick', {
      now,
      today,
      dateStr: BellScheduler.formatIndonesianDate(now),
      timeStr,
      hhmm,
      seconds,
      nextUpcoming,
      isMasterActive: this.isMasterActive
    });

    // Pengecekan pemicuan bel:
    // Cek pada detik 0 (atau 1-2 detik jika tab browser sempat throttling)
    if (seconds <= 2) {
      const minuteKey = `${today}-${hhmm}`;
      if (this.lastCheckedMinute !== minuteKey) {
        this.lastCheckedMinute = minuteKey;
        await this.checkAndTriggerBell(today, hhmm);
      }
    }
  }

  async checkAndTriggerBell(today, hhmm) {
    if (!this.todayEffectiveSchedules || !this.todayEffectiveSchedules.length) {
      return;
    }

    for (const item of this.todayEffectiveSchedules) {
      if (item.enabled === false) continue;

      if (item.effectiveTime === hhmm) {
        const triggerKey = `${today}-${item.effectiveTime}-${item.id}`;
        if (this.lastTriggeredKey === triggerKey) continue;
        this.lastTriggeredKey = triggerKey;

        // Jadwal cocok dengan jam saat ini!
        console.log(`🔔 Pemicu Bel Tepat Waktu: ${item.period} (${item.type}) pada ${hhmm}`);

        if (!this.isMasterActive) {
          // Sistem Bel sedang dinonaktifkan oleh master switch
          await window.bellDB.addHistoryLog({
            triggerType: 'auto',
            period: item.period,
            bellType: item.type,
            instrumentName: item.instrumentName || 'Instrumen',
            status: 'Dilewati (Sistem Nonaktif)',
            notes: `Jadwal ${item.effectiveTime} dilewati karena saklar master bel mati.`
          });

          this.emit('bell_skipped', {
            schedule: item,
            reason: 'Master Switch Nonaktif'
          });
        } else {
          // Sistem bel aktif -> BUNYIKAN BEL!
          await window.bellDB.addHistoryLog({
            triggerType: 'auto',
            period: item.period,
            bellType: item.type,
            instrumentName: item.instrumentName || 'Instrumen',
            status: 'Berhasil',
            notes: `Otomatis sesuai jadwal ${item.effectiveTime}`
          });

          this.emit('bell_ringing', {
            schedule: item,
            triggerType: 'auto'
          });

          // Mainkan audio
          window.audioManager.playInstrument(item.instrumentId, `${item.period} (${item.type})`);
        }
      }
    }
  }

  // Trigger bel secara manual
  async triggerManual(instrumentId, customLabel = 'Bel Manual') {
    const inst = await window.bellDB.getInstrumentById(instrumentId);
    const instName = inst ? inst.name : 'Instrumen Bel';

    await window.bellDB.addHistoryLog({
      triggerType: 'manual',
      period: customLabel,
      bellType: 'Manual',
      instrumentName: instName,
      status: 'Berhasil',
      notes: 'Dibunyikan secara manual melalui panel Bel Manual'
    });

    this.emit('bell_ringing', {
      schedule: {
        period: customLabel,
        type: 'Manual',
        instrumentName: instName
      },
      triggerType: 'manual'
    });

    await window.audioManager.playInstrument(instrumentId, customLabel);
  }
}

// Global instance
window.bellScheduler = new BellScheduler();
