/**
 * Halaman Beranda (Dashboard)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const DashboardView = {
  render(container) {
    container.innerHTML = `
      <div class="view-dashboard">
        <!-- Hero Branding & Status Bar -->
        <div class="dashboard-hero card">
          <div class="hero-left">
            <div class="school-badge">
              ${getIcon('school', '', 28)}
              <div>
                <h1 class="school-title">SISTEM BEL SEKOLAH SMUQ</h1>
                <p class="school-subtitle">SMA Kristen 1 Salatiga • <span class="ppg-badge">PPG Informatika UKSW 2026</span></p>
              </div>
            </div>
            <div class="live-clock-container">
              <div class="live-clock" id="dash-live-clock">--:--:--</div>
              <div class="live-date" id="dash-live-date">Memuat waktu...</div>
            </div>
          </div>

          <div class="hero-right">
            <!-- Master Bell Switch Card -->
            <div class="master-switch-box" id="master-switch-box">
              <div class="switch-header">
                <span class="switch-label">STATUS SISTEM BEL</span>
                <span class="status-indicator-badge" id="master-status-badge">AKTIF</span>
              </div>
              <div class="switch-control-wrap">
                <label class="toggle-switch">
                  <input type="checkbox" id="master-toggle-input" checked>
                  <span class="slider round"></span>
                </label>
                <div class="switch-desc" id="master-switch-desc">
                  Sistem aktif berbunyi otomatis sesuai jadwal.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metric & Countdown Cards Grid -->
        <div class="metric-grid">
          <!-- Next Bell Countdown Card -->
          <div class="card metric-card next-bell-card" id="next-bell-card">
            <div class="metric-header">
              <div class="metric-icon-wrap primary">
                ${getIcon('bell-ring', '', 22)}
              </div>
              <span class="metric-title">BEL BERIKUTNYA HARI INI</span>
            </div>
            <div class="metric-body" id="next-bell-content">
              <div class="next-bell-name" id="next-bell-period">Memeriksa jadwal...</div>
              <div class="next-bell-meta">
                <span class="badge" id="next-bell-type">-</span>
                <span class="next-bell-time" id="next-bell-time">--:--</span>
              </div>
              <div class="countdown-display">
                <div class="countdown-value" id="next-bell-countdown">--:--</div>
                <div class="countdown-label">Menuju bel berbunyi</div>
              </div>
            </div>
          </div>

          <!-- Reduction Status Card -->
          <div class="card metric-card reduction-card" id="dash-reduction-card">
            <div class="metric-header">
              <div class="metric-icon-wrap warning">
                ${getIcon('sliders', '', 22)}
              </div>
              <span class="metric-title">PENGURANGAN JAM HARI INI</span>
            </div>
            <div class="metric-body">
              <div class="reduction-status-badge" id="dash-reduction-badge">
                <span class="badge badge-normal">Jadwal Normal</span>
              </div>
              <div class="reduction-detail-text" id="dash-reduction-desc">
                Tidak ada pemotongan jam pelajaran aktif hari ini.
              </div>
              <button class="btn btn-sm btn-outline-primary" style="margin-top:10px" onclick="App.navigate('reduction')">
                ${getIcon('sliders', '', 14)} Atur Pengurangan Jam
              </button>
            </div>
          </div>

          <!-- Quick Actions Card -->
          <div class="card metric-card quick-actions-card">
            <div class="metric-header">
              <div class="metric-icon-wrap success">
                ${getIcon('zap', '', 22)}
              </div>
              <span class="metric-title">AKSI CEPAT</span>
            </div>
            <div class="metric-body quick-actions-body">
              <button class="btn btn-primary btn-block" onclick="App.navigate('manual')">
                ${getIcon('bell', '', 16)} Buka Panel Bel Manual
              </button>
              <button class="btn btn-secondary btn-block" onclick="App.navigate('schedules')">
                ${getIcon('calendar', '', 16)} Kelola Jadwal Bel
              </button>
              <button class="btn btn-danger btn-block btn-stop-all" onclick="window.audioManager.stop()">
                ${getIcon('stop', '', 16)} Hentikan Suara Bel (Stop)
              </button>
            </div>
          </div>

          <!-- Session Timeout & Security Card -->
          <div class="card metric-card security-card">
            <div class="metric-header">
              <div class="metric-icon-wrap info">
                ${getIcon('shield', '', 22)}
              </div>
              <span class="metric-title">KEAMANAN & TIMEOUT SESI</span>
            </div>
            <div class="metric-body">
              <div class="form-group mb-2">
                <label class="form-label text-sm mb-1" for="dash-timeout-select">Timeout Sesi (Inaktivitas):</label>
                <select id="dash-timeout-select" class="form-control form-control-sm" onchange="App.setSessionTimeoutDuration(this.value)">
                  <option value="5">5 Menit Inaktif</option>
                  <option value="10">10 Menit Inaktif</option>
                  <option value="15">15 Menit (Default)</option>
                  <option value="30">30 Menit Inaktif</option>
                  <option value="60">60 Menit (1 Jam)</option>
                  <option value="0">Matikan Timeout</option>
                </select>
              </div>
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-sm btn-outline-primary style-btn-lock" style="flex:1" onclick="App.lockSession(true)" title="Kunci Sesi Layar">
                  ${getIcon('power', '', 14)} Kunci Layar
                </button>
                <button class="btn btn-sm btn-outline-secondary" style="flex:1" onclick="App.openChangePasswordModal()" title="Ganti Kata Sandi">
                  ${getIcon('edit', '', 14)} Ganti Sandi
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Schedule Section -->
        <div class="card today-schedule-card">
          <div class="card-header-flex">
            <div>
              <h2 class="section-title">
                ${getIcon('calendar', '', 20)} Jadwal Bel Hari Ini (<span id="dash-today-name">...</span>)
              </h2>
              <p class="section-subtitle" id="dash-today-subtitle">Daftar urutan bel otomatis yang dijadwalkan berbunyi pada hari ini</p>
            </div>
            <div class="header-actions">
              <button class="btn btn-sm btn-outline" onclick="DashboardView.refresh()">
                ${getIcon('refresh', '', 14)} Segarkan
              </button>
              <button class="btn btn-sm btn-primary" onclick="App.navigate('schedules')">
                ${getIcon('plus', '', 14)} Tambah / Ubah Jadwal
              </button>
            </div>
          </div>

          <!-- Fitur Terapkan Jadwal Hari Lain untuk Hari Ini (Override) -->
          <div id="dash-override-container" class="mb-3"></div>

          <div class="table-responsive">
            <table class="table" id="table-today-schedules">
              <thead>
                <tr>
                  <th style="width: 120px;">WAKTU</th>
                  <th>JAM PELAJARAN / ACARA</th>
                  <th style="width: 160px;">JENIS BEL</th>
                  <th>INSTRUMEN SUARA</th>
                  <th style="width: 140px; text-align: center;">STATUS</th>
                  <th style="width: 90px; text-align: center;">AKSI</th>
                </tr>
              </thead>
              <tbody id="today-schedules-tbody">
                <tr>
                  <td colspan="6" class="text-center py-4">Memuat jadwal bel hari ini...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateClock();
    this.refresh();
  },

  bindEvents() {
    const toggleInput = document.getElementById('master-toggle-input');
    if (toggleInput) {
      toggleInput.checked = window.bellScheduler.isMasterActive;
      this.updateMasterSwitchUI(window.bellScheduler.isMasterActive);

      toggleInput.addEventListener('change', (e) => {
        const active = e.target.checked;
        window.bellScheduler.setMasterActive(active);
        this.updateMasterSwitchUI(active);
        App.showToast(
          active ? 'Sistem Bel Diaktifkan' : 'Sistem Bel Dinonaktifkan',
          active ? 'Bel akan otomatis berbunyi sesuai jadwal.' : 'Bel otomatis tidak akan berbunyi.',
          active ? 'success' : 'warning'
        );
      });
    }

    // Subscribe to scheduler ticks
    window.bellScheduler.subscribe((event, data) => {
      if (event === 'tick') {
        this.onSchedulerTick(data);
      } else if (event === 'schedule_refreshed') {
        this.renderTodayTable(data.schedules, data.isReductionActive);
        this.updateReductionCard(data.isReductionActive, data.reductionConfig);
        this.renderOverrideControl(data.isOverridden, data.today, data.overrideDay);
      } else if (event === 'master_switch_changed') {
        this.updateMasterSwitchUI(data.isMasterActive);
      }
    });
  },

  updateClock() {
    const clockEl = document.getElementById('dash-live-clock');
    const dateEl = document.getElementById('dash-live-date');
    const todayNameEl = document.getElementById('dash-today-name');

    const now = new Date();
    if (clockEl) clockEl.textContent = BellScheduler.formatTime(now);
    if (dateEl) dateEl.textContent = BellScheduler.formatIndonesianDate(now);
    if (todayNameEl) todayNameEl.textContent = BellScheduler.getTodayName(now);
  },

  onSchedulerTick(data) {
    const clockEl = document.getElementById('dash-live-clock');
    const dateEl = document.getElementById('dash-live-date');
    if (clockEl) clockEl.textContent = data.timeStr;
    if (dateEl) dateEl.textContent = data.dateStr;

    // Update countdown card
    const nextBellPeriodEl = document.getElementById('next-bell-period');
    const nextBellTypeEl = document.getElementById('next-bell-type');
    const nextBellTimeEl = document.getElementById('next-bell-time');
    const nextBellCountdownEl = document.getElementById('next-bell-countdown');

    if (data.nextUpcoming) {
      const sch = data.nextUpcoming.schedule;
      if (nextBellPeriodEl) nextBellPeriodEl.textContent = sch.period;
      if (nextBellTypeEl) {
        nextBellTypeEl.textContent = sch.type;
        nextBellTypeEl.className = 'badge badge-' + this.getTypeBadgeClass(sch.type);
      }
      if (nextBellTimeEl) nextBellTimeEl.textContent = sch.effectiveTime + ' WIB';
      if (nextBellCountdownEl) nextBellCountdownEl.textContent = data.nextUpcoming.countdownText;
    } else {
      if (nextBellPeriodEl) nextBellPeriodEl.textContent = 'Semua Bel Hari Ini Selesai';
      if (nextBellTypeEl) {
        nextBellTypeEl.textContent = 'Selesai';
        nextBellTypeEl.className = 'badge badge-secondary';
      }
      if (nextBellTimeEl) nextBellTimeEl.textContent = '--:--';
      if (nextBellCountdownEl) nextBellCountdownEl.textContent = '00m 00d';
    }

    // Highlight active row in today's table
    this.updateRowStatuses(data.hhmm);
  },

  updateMasterSwitchUI(active) {
    const badge = document.getElementById('master-status-badge');
    const desc = document.getElementById('master-switch-desc');
    const box = document.getElementById('master-switch-box');
    const toggle = document.getElementById('master-toggle-input');

    if (toggle) toggle.checked = active;

    if (active) {
      if (badge) {
        badge.textContent = 'AKTIF (ON)';
        badge.className = 'status-indicator-badge active';
      }
      if (desc) desc.textContent = 'Sistem aktif berbunyi otomatis sesuai jadwal.';
      if (box) box.classList.remove('disabled-state');
    } else {
      if (badge) {
        badge.textContent = 'NONAKTIF (OFF)';
        badge.className = 'status-indicator-badge inactive';
      }
      if (desc) desc.textContent = '⚠️ Sistem DIMATIKAN: Bel otomatis tidak akan berbunyi!';
      if (box) box.classList.add('disabled-state');
    }
  },

  updateReductionCard(isReductionActive, config) {
    const badge = document.getElementById('dash-reduction-badge');
    const desc = document.getElementById('dash-reduction-desc');
    if (!badge || !desc) return;

    if (isReductionActive && config && config.minutesPerLesson > 0) {
      badge.innerHTML = `<span class="badge badge-warning">Pengurangan Aktif (-${config.minutesPerLesson} Menit/Jam)</span>`;
      desc.innerHTML = `Setiap jam pelajaran dipotong <strong>${config.minutesPerLesson} menit</strong>. ` +
        (config.reduceBreaks ? 'Jam istirahat juga dipotong.' : '<strong>Jam istirahat tetap utuh (tidak dipotong)</strong>.');
    } else {
      badge.innerHTML = `<span class="badge badge-normal">Jadwal Normal</span>`;
      desc.textContent = 'Tidak ada pengurangan jam pelajaran aktif hari ini.';
    }
  },

  async refresh() {
    const timeoutSelect = document.getElementById('dash-timeout-select');
    if (timeoutSelect && window.App) {
      timeoutSelect.value = String(window.App.sessionTimeoutMinutes);
    }
    await window.bellScheduler.refreshTodaySchedules();
  },

  renderOverrideControl(isOverridden, actualDay, overrideDay) {
    const container = document.getElementById('dash-override-container');
    const todayNameEl = document.getElementById('dash-today-name');
    const subtitleEl = document.getElementById('dash-today-subtitle');
    if (!container) return;

    if (isOverridden && overrideDay) {
      if (todayNameEl) {
        todayNameEl.innerHTML = `${actualDay} <span class="badge badge-warning" style="font-size:0.75rem;vertical-align:middle;">Jadwal ${overrideDay}</span>`;
      }
      if (subtitleEl) {
        subtitleEl.innerHTML = `⚠️ Hari ini (${actualDay}) sedang menerapkan susunan jadwal <strong>HARI ${overrideDay.toUpperCase()}</strong>.`;
      }

      container.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center justify-content-between p-3" style="border-left: 5px solid #f59e0b; background: #fffbeb; border-radius: 8px;">
          <div class="d-flex align-items-center gap-3">
            <span class="svg-icon text-warning" style="display:flex;align-items:center;color:#d97706">${getIcon('alert', '', 24)}</span>
            <div>
              <strong style="color: #b45309; font-size: 0.95rem;">Jadwal Khusus Hari Ini Sedang Aktif!</strong>
              <div class="text-sm text-muted">Hari ini (${actualDay}) sedang menggunakan jadwal hari <strong>${overrideDay}</strong> (misal: Senin tanpa upacara).</div>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="DashboardView.resetScheduleOverride()">
            ${getIcon('refresh', '', 14)} Kembalikan ke Jadwal ${actualDay} Semula
          </button>
        </div>
      `;
    } else {
      if (todayNameEl) {
        todayNameEl.textContent = actualDay;
      }
      if (subtitleEl) {
        subtitleEl.textContent = 'Daftar urutan bel otomatis yang dijadwalkan berbunyi pada hari ini';
      }

      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const defaultSuggest = actualDay === 'Senin' ? 'Selasa' : (days.find(d => d !== actualDay) || 'Senin');

      container.innerHTML = `
        <div class="p-2 px-3 rounded" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              ${getIcon('calendar', '', 16)}
              <span class="text-sm font-semibold" style="color:#475569">Terapkan Jadwal Hari Lain untuk Hari Ini:</span>
              <span class="text-xs text-muted">(contoh: jika hari Senin tidak ada upacara, terapkan jadwal Selasa)</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <select id="dash-select-override-day" class="form-control form-control-sm" style="width: auto; padding: 4px 8px; font-size: 0.82rem;">
                ${days.filter(d => d !== actualDay).map(d => `
                  <option value="${d}" ${d === defaultSuggest ? 'selected' : ''}>Gunakan Jadwal ${d}</option>
                `).join('')}
              </select>
              <button class="btn btn-sm btn-outline-primary" style="padding: 4px 10px; font-size: 0.82rem;" onclick="DashboardView.applyScheduleOverride()">
                Terapkan Hari Ini
              </button>
            </div>
          </div>
        </div>
      `;
    }
  },

  async applyScheduleOverride() {
    const select = document.getElementById('dash-select-override-day');
    if (!select) return;
    const targetDay = select.value;
    const actualToday = BellScheduler.getTodayName();
    await window.bellScheduler.setTodayScheduleOverride(targetDay);
    App.showToast('Jadwal Khusus Diterapkan', `Hari ini (${actualToday}) berhasil diubah menerapkan jadwal ${targetDay}.`, 'success');
  },

  async resetScheduleOverride() {
    const actualToday = BellScheduler.getTodayName();
    await window.bellScheduler.clearTodayScheduleOverride();
    App.showToast('Jadwal Normal Dikembalikan', `Jadwal hari ini telah kembali ke jadwal ${actualToday} semula.`, 'info');
  },

  renderTodayTable(schedules, isReductionActive) {
    const tbody = document.getElementById('today-schedules-tbody');
    if (!tbody) return;

    if (!schedules || schedules.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5">
            <div class="empty-state">
              ${getIcon('calendar', 'empty-icon', 48)}
              <h3>Belum ada jadwal untuk hari ini</h3>
              <p>Tambahkan jadwal bel untuk hari ${BellScheduler.getTodayName()} di menu Jadwal Bel.</p>
              <button class="btn btn-primary" onclick="App.navigate('schedules')">
                ${getIcon('plus', '', 16)} Tambah Jadwal Sekarang
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const now = new Date();
    const currentHHMM = BellScheduler.formatTime(now).substring(0, 5);

    let html = '';
    for (const item of schedules) {
      const isPast = item.effectiveTime < currentHHMM;
      const isCurrent = item.effectiveTime === currentHHMM;

      let statusBadge = '';
      if (isCurrent) {
        statusBadge = `<span class="badge badge-success pulse">🔔 Sedang Berbunyi</span>`;
      } else if (isPast) {
        statusBadge = `<span class="badge badge-secondary">Sudah Lewat</span>`;
      } else {
        statusBadge = `<span class="badge badge-primary">Akan Datang</span>`;
      }

      let timeDisplay = `<strong>${item.effectiveTime}</strong>`;
      if (isReductionActive && item.originalTime && item.originalTime !== item.effectiveTime) {
        timeDisplay = `
          <div class="time-adjusted-box">
            <span class="time-effective">${item.effectiveTime}</span>
            <span class="time-original"><del>${item.originalTime}</del></span>
          </div>
        `;
      }

      const typeBadgeClass = this.getTypeBadgeClass(item.type);

      html += `
        <tr class="schedule-row ${isCurrent ? 'row-current' : ''} ${isPast ? 'row-past' : ''}" data-time="${item.effectiveTime}">
          <td>${timeDisplay}</td>
          <td>
            <strong>${this.escapeHtml(item.period)}</strong>
            ${item.notes ? `<div class="text-muted small">${this.escapeHtml(item.notes)}</div>` : ''}
          </td>
          <td><span class="badge badge-${typeBadgeClass}">${item.type}</span></td>
          <td>
            <span class="inst-tag">
              ${getIcon('music', '', 13)} ${this.escapeHtml(item.instrumentName || 'Instrumen')}
            </span>
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">
            <button class="btn btn-icon btn-sm btn-ghost" title="Bunyikan Sekarang" onclick="window.bellScheduler.triggerManual('${item.instrumentId}', '${this.escapeHtml(item.period)}')">
              ${getIcon('play', '', 14)}
            </button>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  updateRowStatuses(currentHHMM) {
    const rows = document.querySelectorAll('#today-schedules-tbody .schedule-row');
    rows.forEach(row => {
      const time = row.getAttribute('data-time');
      if (time) {
        if (time < currentHHMM) {
          row.classList.add('row-past');
          row.classList.remove('row-current');
        } else if (time === currentHHMM) {
          row.classList.add('row-current');
          row.classList.remove('row-past');
        } else {
          row.classList.remove('row-past', 'row-current');
        }
      }
    });
  },

  getTypeBadgeClass(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('masuk')) return 'success';
    if (t.includes('istirahat')) return 'warning';
    if (t.includes('pulang')) return 'danger';
    if (t.includes('ganti') || t.includes('pergantian')) return 'info';
    return 'primary';
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }
};
