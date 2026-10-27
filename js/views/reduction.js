/**
 * Halaman Pengurangan Jam Pelajaran (Smart Period Reducer)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const ReductionView = {
  currentConfig: null,
  selectedDay: 'Hari Ini',
  previewSchedules: [],

  async render(container) {
    container.innerHTML = `
      <div class="view-reduction">
        <!-- Header Card -->
        <div class="page-header-card card">
          <div class="header-left">
            <h1 class="page-title">
              ${getIcon('sliders', '', 24)} Pengaturan Pengurangan Jam Pelajaran
            </h1>
            <p class="page-desc">
              Kurangi durasi jam pelajaran secara otomatis pada hari tertentu (misal: Hari Jumat, acara rapat guru, atau agenda khusus).
            </p>
          </div>
          <div class="header-right-actions">
            <button class="btn btn-outline-danger" onclick="ReductionView.resetToNormal()">
              ${getIcon('refresh', '', 16)} Kembalikan ke Normal (Reset)
            </button>
          </div>
        </div>

        <!-- Aturan Cerdas Alert -->
        <div class="alert alert-info smart-rule-alert">
          <div class="alert-icon-wrap">${getIcon('shield', '', 24)}</div>
          <div>
            <h4 class="alert-heading">Aturan Cerdas Pengurangan Jam Bawaan SMUQ:</h4>
            <p>
              Secara standar, sistem <strong>HANYA MEMOTONG JAM PELAJARAN BIASA</strong>, 
              <strong>TIDAK MEMOTONG WAKTU ISTIRAHAT</strong>, dan 
              <strong>TIDAK MEMOTONG JAM PERTAMA (07.00 - 07.20)</strong> yang tetap berdurasi utuh.
              Waktu bel masuk setelah istirahat dan jam-jam berikutnya akan disesuaikan dan dimajukan secara berurutan secara otomatis.
            </p>
          </div>
        </div>

        <!-- Configuration Grid -->
        <div class="reduction-grid">
          <!-- Left: Settings Card -->
          <div class="card reduction-form-card">
            <div class="card-header">
              <h2 class="card-title">${getIcon('sliders', '', 18)} Konfigurasi Pengurangan Jam</h2>
            </div>
            <div class="card-body">
              <form id="form-reduction" onsubmit="ReductionView.onApply(event)">
                <!-- Toggle Aktif -->
                <div class="form-group mb-4">
                  <div class="toggle-control-card">
                    <div>
                      <strong class="d-block">Status Pengurangan Jam:</strong>
                      <span class="text-muted small" id="reduction-toggle-desc">Aktifkan untuk menerapkan pemotongan waktu pada jadwal bel.</span>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" id="reduction-enable-cb" onchange="ReductionView.onToggleEnable(this.checked)">
                      <span class="slider round"></span>
                    </label>
                  </div>
                </div>

                <!-- Pilihan Hari yang Diterapkan -->
                <div class="form-group">
                  <label class="form-label">Terapkan Pada Hari:</label>
                  <select id="reduction-applied-day" class="form-control" onchange="ReductionView.onConfigChanged()">
                    <option value="Hari Ini">Khusus Hari Ini Saja (${BellScheduler.getTodayName()})</option>
                    <option value="Jumat">Khusus Hari Jumat Saja</option>
                    <option value="Senin">Khusus Hari Senin Saja</option>
                    <option value="Selasa">Khusus Hari Selasa Saja</option>
                    <option value="Rabu">Khusus Hari Rabu Saja</option>
                    <option value="Kamis">Khusus Hari Kamis Saja</option>
                    <option value="Sabtu">Khusus Hari Sabtu Saja</option>
                    <option value="Semua Hari">Semua Hari Sekolah (Senin - Jumat)</option>
                  </select>
                </div>

                <!-- Jumlah Menit Pengurangan -->
                <div class="form-group">
                  <label class="form-label">Durasi Pengurangan Per Jam Pelajaran (Menit):</label>
                  <div class="minute-pill-group">
                    <button type="button" class="btn-min-preset" data-min="5" onclick="ReductionView.setMinutesPreset(5)">-5 Menit</button>
                    <button type="button" class="btn-min-preset" data-min="10" onclick="ReductionView.setMinutesPreset(10)">-10 Menit</button>
                    <button type="button" class="btn-min-preset" data-min="15" onclick="ReductionView.setMinutesPreset(15)">-15 Menit</button>
                  </div>
                  <div class="input-group mt-2">
                    <input type="number" id="reduction-minutes-input" class="form-control" min="1" max="30" value="5" oninput="ReductionView.onConfigChanged()" required>
                    <span class="input-group-addon">Menit / Jam</span>
                  </div>
                  <small class="text-muted">Setiap slot jam pelajaran akan dipotong durasinya sebesar angka ini.</small>
                </div>

                <!-- Checkbox Jam Istirahat (Default: Unchecked) -->
                <div class="form-group mt-3">
                  <div class="checkbox-highlight-box">
                    <label class="checkbox-label">
                      <input type="checkbox" id="reduction-reduce-breaks" onchange="ReductionView.onConfigChanged()">
                      <span><strong>Ikut memotong jam istirahat juga</strong></span>
                    </label>
                    <small class="text-muted d-block mt-1">
                      (Bawaan: TIDAK dicentang. Biarkan kosong agar waktu istirahat siswa dan guru tidak berkurang).
                    </small>
                  </div>
                </div>

                <div class="form-actions mt-4">
                  <button type="submit" class="btn btn-primary btn-block">
                    ${getIcon('check', '', 16)} Terapkan & Simpan Pengaturan
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Right: Live Comparison Preview Card -->
          <div class="card reduction-preview-card">
            <div class="card-header-flex">
              <div>
                <h2 class="card-title">${getIcon('clock', '', 18)} Pratinjau Perubahan Jadwal</h2>
                <p class="section-subtitle" id="preview-subtitle">Perbandingan Jadwal Normal vs Jadwal Setelah Dipotong</p>
              </div>
              <span class="badge" id="preview-status-badge">Pratinjau</span>
            </div>

            <div class="table-responsive">
              <table class="table" id="table-reduction-preview">
                <thead>
                  <tr>
                    <th>JAM PELAJARAN</th>
                    <th>JENIS</th>
                    <th style="width: 100px;">JAM ASLI</th>
                    <th style="width: 110px;">JAM BARU</th>
                    <th style="width: 90px; text-align: right;">DURASI</th>
                  </tr>
                </thead>
                <tbody id="reduction-preview-tbody">
                  <tr>
                    <td colspan="5" class="text-center py-4">Memuat pratinjau...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    this.currentConfig = await window.bellDB.getReductionSettings();
    this.populateForm();
    await this.updatePreview();
  },

  populateForm() {
    const config = this.currentConfig;
    const enableCb = document.getElementById('reduction-enable-cb');
    const daySelect = document.getElementById('reduction-applied-day');
    const minInput = document.getElementById('reduction-minutes-input');
    const breaksCb = document.getElementById('reduction-reduce-breaks');

    if (enableCb) enableCb.checked = !!config.enabled;
    if (daySelect && config.appliedDays && config.appliedDays.length) {
      daySelect.value = config.appliedDays[0];
    }
    if (minInput) minInput.value = config.minutesPerLesson || 5;
    if (breaksCb) breaksCb.checked = !!config.reduceBreaks;

    this.highlightMinutePreset(config.minutesPerLesson || 5);
  },

  setMinutesPreset(min) {
    const minInput = document.getElementById('reduction-minutes-input');
    if (minInput) minInput.value = min;
    this.highlightMinutePreset(min);
    this.onConfigChanged();
  },

  highlightMinutePreset(min) {
    const buttons = document.querySelectorAll('.btn-min-preset');
    buttons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-min')) === parseInt(min));
    });
  },

  onToggleEnable(enabled) {
    const desc = document.getElementById('reduction-toggle-desc');
    if (desc) {
      desc.textContent = enabled
        ? '✅ Pengurangan jam aktif. Jadwal harian otomatis dipotong.'
        : 'Pengurangan jam nonaktif (berjalan dengan jadwal normal).';
    }
    this.onConfigChanged();
  },

  onConfigChanged() {
    this.updatePreview();
  },

  getFormData() {
    const enabled = document.getElementById('reduction-enable-cb').checked;
    const day = document.getElementById('reduction-applied-day').value;
    const minutes = parseInt(document.getElementById('reduction-minutes-input').value) || 5;
    const reduceBreaks = document.getElementById('reduction-reduce-breaks').checked;

    let appliedDays = [day];
    if (day === 'Hari Ini') {
      appliedDays = [BellScheduler.getTodayName()];
    }

    return {
      enabled,
      appliedDays,
      minutesPerLesson: minutes,
      reduceBreaks
    };
  },

  async updatePreview() {
    const config = this.getFormData();
    const targetDay = config.appliedDays[0] || BellScheduler.getTodayName();
    const rawSchedules = await window.bellDB.getSchedulesByDay(targetDay === 'Semua Hari' ? 'Senin' : targetDay);

    const calculated = window.bellScheduler.calculateScheduleWithReduction(rawSchedules, config);
    this.previewSchedules = calculated;

    const tbody = document.getElementById('reduction-preview-tbody');
    const subtitle = document.getElementById('preview-subtitle');
    const statusBadge = document.getElementById('preview-status-badge');

    if (subtitle) {
      subtitle.textContent = `Pratinjau untuk hari: ${targetDay} (${config.enabled ? `Dipangkas ${config.minutesPerLesson} mnt/jam` : 'Jadwal Normal'})`;
    }

    if (statusBadge) {
      statusBadge.textContent = config.enabled ? 'PENGURANGAN AKTIF' : 'NORMAL';
      statusBadge.className = 'badge ' + (config.enabled ? 'badge-warning' : 'badge-secondary');
    }

    if (!tbody) return;

    if (!calculated.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada jadwal pada hari ${targetDay} untuk dipratinjau.</td></tr>`;
      return;
    }

    let html = '';
    for (const item of calculated) {
      const isShifted = item.effectiveTime !== item.originalTime;
      const isBreak = item.isBreak;
      const typeBadgeClass = DashboardView.getTypeBadgeClass(item.type);

      html += `
        <tr>
          <td>
            <strong>${DashboardView.escapeHtml(item.period)}</strong>
            ${isBreak ? `<span class="badge badge-sm badge-warning ml-1">Istirahat</span>` : ''}
            ${item.isFirstMorningPeriod ? `<span class="badge badge-sm badge-info ml-1">Jam Pagi (Utuh)</span>` : ''}
          </td>
          <td><span class="badge badge-${typeBadgeClass}">${item.type}</span></td>
          <td><span class="text-muted">${item.originalTime}</span></td>
          <td>
            ${isShifted ? `<strong class="text-success">${item.effectiveTime}</strong>` : `<strong>${item.effectiveTime}</strong>`}
            ${item.cumulativeShift > 0 ? `<div class="shift-diff text-muted small">(-${item.cumulativeShift} mnt)</div>` : ''}
          </td>
          <td style="text-align: right;">
            ${item.newDuration ? `${item.newDuration} mnt` : '-'}
            ${item.reducedBy > 0 ? `<div class="text-danger small">(-${item.reducedBy})</div>` : (item.isFirstMorningPeriod || (isBreak && !config.reduceBreaks) ? `<div class="text-success small">(utuh)</div>` : '')}
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  async onApply(e) {
    e.preventDefault();
    const config = this.getFormData();
    await window.bellDB.saveReductionSettings(config);
    this.currentConfig = config;

    App.showToast(
      'Pengaturan Pengurangan Jam Disimpan',
      config.enabled
        ? `Pengurangan jam aktif (-${config.minutesPerLesson} menit/jam) pada ${config.appliedDays.join(', ')}.`
        : 'Sistem kembali berjalan dengan jadwal normal.',
      config.enabled ? 'success' : 'info'
    );

    await window.bellScheduler.refreshTodaySchedules();
  },

  async resetToNormal() {
    if (confirm('Apakah Anda ingin mematikan pengurangan jam dan kembali ke Jadwal Normal?')) {
      const config = {
        enabled: false,
        appliedDays: ['Semua Hari'],
        minutesPerLesson: 5,
        reduceBreaks: false
      };
      await window.bellDB.saveReductionSettings(config);
      this.currentConfig = config;
      this.populateForm();
      await this.updatePreview();
      await window.bellScheduler.refreshTodaySchedules();
      App.showToast('Jadwal Normal Aktif', 'Pengurangan jam dinonaktifkan. Jadwal berjalan normal.', 'info');
    }
  }
};
