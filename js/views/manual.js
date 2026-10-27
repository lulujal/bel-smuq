/**
 * Halaman Bel Manual
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const ManualView = {
  instruments: [],

  async render(container) {
    container.innerHTML = `
      <div class="view-manual">
        <!-- Header Card -->
        <div class="page-header-card card">
          <div class="header-left">
            <h1 class="page-title">
              ${getIcon('bell-ring', '', 24)} Panel Bel Manual
            </h1>
            <p class="page-desc">Bunyikan instrumen lonceng sekolah seketika dengan satu klik tombol. Setiap pemanggilan manual otomatis dicatat di riwayat.</p>
          </div>
          <div class="header-right-actions">
            <button class="btn btn-danger btn-emergency-stop" onclick="ManualView.stopAudio()">
              ${getIcon('stop', '', 18)} EMERGENCY STOP (Hentikan Suara)
            </button>
          </div>
        </div>

        <!-- Volume & Sound Control Bar -->
        <div class="card volume-control-card">
          <div class="volume-bar-wrap">
            <div class="volume-label">
              ${getIcon('volume', '', 20)}
              <span>Volume Master Suara:</span>
              <strong id="manual-vol-percent">90%</strong>
            </div>
            <div class="volume-slider-wrap">
              <input type="range" id="manual-volume-slider" min="0" max="1" step="0.05" value="0.9" oninput="ManualView.onVolumeChange(this.value)">
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="ManualView.stopAudio()">
              ${getIcon('volume-x', '', 16)} Hentikan Suara
            </button>
          </div>
        </div>

        <!-- Playing Status Alert Banner -->
        <div class="now-playing-banner" id="manual-playing-banner" style="display: none;">
          <div class="banner-content">
            <span class="pulse-ring"></span>
            ${getIcon('bell-ring', 'ringing-icon', 24)}
            <div>
              <div class="banner-title">BEL SEDANG BERBUNYI!</div>
              <div class="banner-sub" id="manual-playing-name">Nama Instrumen</div>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="ManualView.stopAudio()">
            ${getIcon('stop', '', 14)} Hentikan
          </button>
        </div>

        <!-- Instruments Card Grid -->
        <div class="section-heading">
          <h2>Pilih Instrumen Bel untuk Dibunyikan:</h2>
          <span class="text-muted" id="inst-count-label">Memuat daftar instrumen...</span>
        </div>

        <div class="instrument-grid" id="manual-instrument-grid">
          <!-- Cards injected dynamically -->
        </div>
      </div>
    `;

    await this.loadData();
    this.setupAudioListeners();
  },

  async loadData() {
    this.instruments = await window.bellDB.getAllInstruments();
    const countEl = document.getElementById('inst-count-label');
    if (countEl) countEl.textContent = `${this.instruments.length} instrumen audio tersedia`;

    const slider = document.getElementById('manual-volume-slider');
    const volPercent = document.getElementById('manual-vol-percent');
    if (slider) {
      slider.value = window.audioManager.volume;
      if (volPercent) volPercent.textContent = Math.round(window.audioManager.volume * 100) + '%';
    }

    this.renderGrid();
  },

  renderGrid() {
    const grid = document.getElementById('manual-instrument-grid');
    if (!grid) return;

    if (this.instruments.length === 0) {
      grid.innerHTML = `
        <div class="card p-5 text-center text-muted" style="grid-column: 1 / -1;">
          Belum ada instrumen audio terdaftar. Silakan buka menu Instrumen untuk mengunggah atau membuat audio.
        </div>
      `;
      return;
    }

    let html = '';
    for (const inst of this.instruments) {
      const isBuiltin = inst.isBuiltin;
      const typeLabel = isBuiltin ? 'Bawaan SMUQ' : 'Lokal / Upload';

      html += `
        <div class="card instrument-card" id="card-inst-${inst.id}">
          <div class="inst-card-top">
            <div class="inst-icon-wrap">
              ${getIcon('music', '', 22)}
            </div>
            <span class="badge ${isBuiltin ? 'badge-primary' : 'badge-info'}">${typeLabel}</span>
          </div>
          <h3 class="inst-card-title">${DashboardView.escapeHtml(inst.name)}</h3>
          <div class="inst-card-meta">
            <span>Tipe: ${inst.type || 'audio'}</span>
            ${inst.duration ? `<span>• Durasi: ~${inst.duration}s</span>` : ''}
          </div>
          <div class="inst-card-actions">
            <button class="btn btn-primary btn-block btn-ring-now" onclick="ManualView.ringInstrument('${inst.id}', '${DashboardView.escapeHtml(inst.name)}')">
              ${getIcon('bell', '', 16)} Bunyikan Sekarang
            </button>
          </div>
        </div>
      `;
    }

    grid.innerHTML = html;
  },

  setupAudioListeners() {
    window.audioManager.onStateChange((state) => {
      const banner = document.getElementById('manual-playing-banner');
      const bannerName = document.getElementById('manual-playing-name');
      
      if (banner && bannerName) {
        if (state.isPlaying) {
          banner.style.display = 'flex';
          bannerName.textContent = state.currentPlayingName || 'Suara Bel';
        } else {
          banner.style.display = 'none';
        }
      }

      // Highlight active card
      const cards = document.querySelectorAll('.instrument-card');
      cards.forEach(c => c.classList.remove('card-ringing'));
    });
  },

  async ringInstrument(id, name) {
    // Unlock and trigger manual bell through scheduler (records to history log)
    await window.audioManager.unlockAudio();
    
    // Add visual ringing effect to card
    const card = document.getElementById(`card-inst-${id}`);
    if (card) card.classList.add('card-ringing');

    await window.bellScheduler.triggerManual(id, `Manual: ${name}`);

    App.showToast('Bel Manual Dibunyikan', `Sedang memutar: "${name}"`, 'info');
  },

  stopAudio() {
    window.audioManager.stop();
    App.showToast('Suara Dihentikan', 'Semua audio bel berhasil dihentikan seketika.', 'warning');
  },

  onVolumeChange(val) {
    window.audioManager.setVolume(val);
    const volPercent = document.getElementById('manual-vol-percent');
    if (volPercent) volPercent.textContent = Math.round(val * 100) + '%';
  }
};
