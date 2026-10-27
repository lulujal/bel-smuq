/**
 * Main Application Controller & Router (100% Offline Standalone)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const App = {
  currentView: 'dashboard',
  views: {
    dashboard: DashboardView,
    schedules: SchedulesView,
    manual: ManualView,
    reduction: ReductionView,
    instruments: InstrumentsView,
    history: HistoryView
  },

  async init() {
    console.log('Inisialisasi Sistem Bel Sekolah SMUQ 2026...');

    // 1. Initialize IndexedDB
    try {
      await window.bellDB.init();
    } catch (e) {
      console.error('Gagal inisialisasi database:', e);
      alert('Gagal menginisialisasi penyimpanan browser IndexedDB. Pastikan browser mendukung IndexedDB.');
    }

    // 2. Initialize Audio Manager & Scheduler
    window.audioManager.init();
    await window.bellScheduler.init();

    // 3. Setup Navbar and Router
    this.setupNavigation();

    // 4. Setup Audio Unlock Banner (Autoplay policy handler)
    this.setupAudioAutoplayUnlock();

    // 5. Setup Bell Ringing Global Floating Toast / Banner
    this.setupGlobalBellAlert();

    // 6. Setup Session Timeout & Screen Lock Manager
    await this.setupSessionTimeout();

    // 7. Navigate to default view (dashboard)
    this.navigate('dashboard');

    // 8. Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist();
    }
  },

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        if (targetView) {
          this.navigate(targetView);
        }
      });
    });
  },

  navigate(viewName) {
    if (!this.views[viewName]) {
      console.warn('View not found:', viewName);
      viewName = 'dashboard';
    }

    this.currentView = viewName;

    // Update active class on nav items
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === viewName);
    });

    // Render view
    const mainContainer = document.getElementById('main-content');
    if (mainContainer) {
      this.views[viewName].render(mainContainer);
      window.scrollTo(0, 0);
    }
  },

  // --- AUDIO AUTOPLAY UNLOCKER ---
  setupAudioAutoplayUnlock() {
    const unlockModal = document.getElementById('audio-unlock-overlay');
    if (!unlockModal) return;

    // Any first click in document unlocks audio
    const unlockFn = async () => {
      await window.audioManager.unlockAudio();
      unlockModal.style.display = 'none';
      document.removeEventListener('click', unlockFn);
    };

    // If context is already running, hide modal
    if (window.audioManager.audioCtx && window.audioManager.audioCtx.state === 'running') {
      unlockModal.style.display = 'none';
    } else {
      unlockModal.style.display = 'flex';
      const btnUnlock = document.getElementById('btn-unlock-audio');
      if (btnUnlock) btnUnlock.addEventListener('click', unlockFn);
    }
  },

  // --- GLOBAL BELL RINGING EVENT ---
  setupGlobalBellAlert() {
    const banner = document.getElementById('global-ringing-banner');
    const bannerText = document.getElementById('ringing-banner-text');

    window.bellScheduler.subscribe((event, data) => {
      if (event === 'bell_ringing') {
        const sch = data.schedule;
        if (banner && bannerText) {
          bannerText.innerHTML = `<strong>BEL SEDANG BERBUNYI:</strong> ${sch.period || 'Bel Sekolah'} (${sch.type || 'Manual'})`;
          banner.style.display = 'flex';
        }
      }
    });

    window.audioManager.onStateChange((state) => {
      if (!state.isPlaying && banner) {
        banner.style.display = 'none';
      }
    });
  },

  // --- TOAST NOTIFICATIONS ---
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type} animate-slide-in`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check';
    if (type === 'warning') iconName = 'alert';
    if (type === 'danger') iconName = 'alert';

    toast.innerHTML = `
      <div class="toast-icon-box">${getIcon(iconName, '', 18)}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  },

  // --- BACKUP & RESTORE MODAL ---
  openBackupModal() {
    document.getElementById('modal-backup-restore').style.display = 'flex';
  },

  closeBackupModal() {
    document.getElementById('modal-backup-restore').style.display = 'none';
  },

  async downloadBackup() {
    try {
      App.showToast('Memproses Cadangan...', 'Menyiapkan berkas cadangan data & audio.', 'info');
      const jsonStr = await window.bellDB.exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Bel_SMUQ_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      App.showToast('Cadangan Berhasil Diunduh', 'File backup tersimpan. Simpan file ini di flashdisk untuk keamanan ekstra.', 'success');
    } catch (err) {
      alert('Gagal membuat cadangan: ' + err.message);
    }
  },

  async onRestoreFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Memulihkan cadangan akan menggantikan jadwal dan instrumen yang ada saat ini dengan data dari file cadangan. Lanjutkan?')) {
      input.value = '';
      return;
    }

    try {
      const text = await file.text();
      await window.bellDB.importBackupJSON(text);
      this.closeBackupModal();
      alert('Data berhasil dipulihkan dari file cadangan! Halaman akan disegarkan.');
      location.reload();
    } catch (err) {
      alert('Gagal memulihkan file cadangan: ' + err.message);
    }
  },

  // --- SESSION TIMEOUT & LOCK SCREEN MANAGER ---
  isLocked: false,
  sessionTimeoutMinutes: 15,
  idleTimer: null,
  LOCK_PASSWORD: 'smak1pwd',

  async setupSessionTimeout() {
    this.sessionTimeoutMinutes = await window.bellDB.getSetting('session_timeout_minutes', 15);
    this.LOCK_PASSWORD = await window.bellDB.getSetting('lock_password', 'smak1pwd');
    
    // Track user interaction to reset idle timer
    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    const resetFn = () => this.resetIdleTimer();

    activityEvents.forEach(event => {
      window.addEventListener(event, resetFn, { passive: true });
    });

    // Sync status bel otomatis di lock screen secara realtime jika terjadi perubahan
    if (window.bellScheduler) {
      window.bellScheduler.subscribe((event, data) => {
        if (event === 'master_switch_changed' || event === 'tick') {
          this.updateLockStatusBadge();
        }
      });
    }

    this.resetIdleTimer();
  },

  resetIdleTimer() {
    if (this.isLocked) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);

    const timeoutMins = parseInt(this.sessionTimeoutMinutes);
    if (timeoutMins > 0) {
      const timeoutMs = timeoutMins * 60 * 1000;
      this.idleTimer = setTimeout(() => {
        this.lockSession(false);
      }, timeoutMs);
    }
  },

  lockSession(isManual = false) {
    this.isLocked = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);

    // Apply blur class to page elements
    document.body.classList.add('app-session-locked');

    // Update status bel otomatis di overlay
    this.updateLockStatusBadge();

    // Reset overlay form
    const overlay = document.getElementById('session-lock-overlay');
    const pwdInput = document.getElementById('session-lock-password');
    const errBox = document.getElementById('session-lock-error');

    if (pwdInput) {
      pwdInput.value = '';
    }
    if (errBox) {
      errBox.style.display = 'none';
    }
    if (overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => {
        if (pwdInput) pwdInput.focus();
      }, 100);
    }

    if (isManual) {
      this.showToast('Sesi Terkunci', 'Layar berhasil dikunci secara manual.', 'info');
    } else {
      this.showToast('Sesi Terkunci (Timeout)', 'Tidak ada aktivitas selama beberapa menit. Layar dikunci.', 'warning');
    }
  },

  updateLockStatusBadge() {
    const badge = document.getElementById('lock-bell-status-badge');
    if (!badge) return;

    const isActive = window.bellScheduler ? window.bellScheduler.isMasterActive : true;
    if (isActive) {
      badge.textContent = 'AKTIF (ON)';
      badge.className = 'badge badge-success';
    } else {
      badge.textContent = 'NONAKTIF (OFF)';
      badge.className = 'badge badge-danger';
    }
  },

  onUnlockSubmit(e) {
    e.preventDefault();
    const pwdInput = document.getElementById('session-lock-password');
    const errBox = document.getElementById('session-lock-error');
    const overlay = document.getElementById('session-lock-overlay');

    if (!pwdInput) return;

    const inputVal = pwdInput.value.trim();
    if (inputVal === this.LOCK_PASSWORD) {
      // Sandi benar -> buka kunci!
      this.isLocked = false;
      document.body.classList.remove('app-session-locked');
      if (overlay) overlay.style.display = 'none';
      if (errBox) errBox.style.display = 'none';

      this.showToast('Kunci Dibuka', 'Sesi berhasil dibuka kembali.', 'success');
      this.resetIdleTimer();
    } else {
      // Sandi salah!
      if (errBox) {
        errBox.style.display = 'block';
        errBox.textContent = '❌ Kata sandi salah! Silakan coba lagi.';
      }
      pwdInput.select();
      pwdInput.focus();
    }
  },

  async setSessionTimeoutDuration(minutes) {
    const min = parseInt(minutes);
    this.sessionTimeoutMinutes = min;
    await window.bellDB.setSetting('session_timeout_minutes', min);
    this.resetIdleTimer();
    this.showToast(
      'Pengaturan Timeout Diperbarui',
      min > 0 ? `Layar akan terkunci otomatis jika tidak ada aktivitas selama ${min} menit.` : 'Session timeout dinonaktifkan.',
      'info'
    );
  },

  // --- GANTI KATA SANDI (DENGAN VERIFIKASI SANDI SAAT INI) ---
  openChangePasswordModal() {
    const modal = document.getElementById('modal-change-password');
    const pwdCurrent = document.getElementById('pwd-current');
    const pwdNew = document.getElementById('pwd-new');
    const pwdConfirm = document.getElementById('pwd-confirm');
    const msgBox = document.getElementById('pwd-change-msg');

    if (pwdCurrent) pwdCurrent.value = '';
    if (pwdNew) pwdNew.value = '';
    if (pwdConfirm) pwdConfirm.value = '';
    if (msgBox) {
      msgBox.style.display = 'none';
      msgBox.textContent = '';
      msgBox.className = 'alert text-sm mt-2';
    }

    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => {
        if (pwdCurrent) pwdCurrent.focus();
      }, 100);
    }
  },

  closeChangePasswordModal() {
    const modal = document.getElementById('modal-change-password');
    if (modal) modal.style.display = 'none';
  },

  async onChangePasswordSubmit(e) {
    e.preventDefault();
    const pwdCurrent = document.getElementById('pwd-current');
    const pwdNew = document.getElementById('pwd-new');
    const pwdConfirm = document.getElementById('pwd-confirm');
    const msgBox = document.getElementById('pwd-change-msg');
    const btnSave = document.getElementById('btn-save-pwd');

    if (!pwdCurrent || !pwdNew || !pwdConfirm) return;

    const currentVal = pwdCurrent.value.trim();
    const newVal = pwdNew.value.trim();
    const confirmVal = pwdConfirm.value.trim();

    // 1. Verifikasi sandi saat ini
    if (currentVal !== this.LOCK_PASSWORD) {
      if (msgBox) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert alert-danger text-sm mt-2';
        msgBox.textContent = '❌ Kata sandi saat ini salah! Masukkan sandi yang berlaku sekarang.';
      }
      pwdCurrent.select();
      pwdCurrent.focus();
      return;
    }

    // 2. Validasi panjang sandi baru
    if (newVal.length < 4) {
      if (msgBox) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert alert-danger text-sm mt-2';
        msgBox.textContent = '❌ Kata sandi baru minimal 4 karakter.';
      }
      pwdNew.focus();
      return;
    }

    // 3. Validasi konfirmasi sandi baru
    if (newVal !== confirmVal) {
      if (msgBox) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert alert-danger text-sm mt-2';
        msgBox.textContent = '❌ Konfirmasi kata sandi baru tidak cocok!';
      }
      pwdConfirm.focus();
      return;
    }

    // 4. Simpan sandi baru
    btnSave.disabled = true;
    try {
      this.LOCK_PASSWORD = newVal;
      await window.bellDB.setSetting('lock_password', newVal);

      if (msgBox) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert alert-success text-sm mt-2';
        msgBox.textContent = '✅ Kata sandi berhasil diubah! Gunakan sandi baru ini saat membuka kunci.';
      }

      this.showToast('Kata Sandi Diperbarui', 'Kata sandi kunci layar berhasil diganti.', 'success');

      setTimeout(() => {
        this.closeChangePasswordModal();
        btnSave.disabled = false;
      }, 1200);
    } catch (err) {
      if (msgBox) {
        msgBox.style.display = 'block';
        msgBox.className = 'alert alert-danger text-sm mt-2';
        msgBox.textContent = 'Gagal menyimpan sandi: ' + err.message;
      }
      btnSave.disabled = false;
    }
  }
};

// Global App ready trigger
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
