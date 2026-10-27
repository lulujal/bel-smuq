/**
 * Halaman Jadwal Bel (CRUD Jadwal & Salin Jadwal Antar Hari)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const SchedulesView = {
  currentFilterDay: 'Semua',
  schedulesCache: [],
  instrumentsCache: [],

  async render(container) {
    container.innerHTML = `
      <div class="view-schedules">
        <!-- Header & Action Bar -->
        <div class="page-header-card card">
          <div class="header-left">
            <h1 class="page-title">
              ${getIcon('calendar', '', 24)} Kelola Jadwal Bel Sekolah
            </h1>
            <p class="page-desc">Atur waktu, instrumen suara, jam pelajaran, dan jenis bel untuk setiap hari sekolah.</p>
          </div>
          <div class="header-right-actions">
            <button class="btn btn-secondary" onclick="SchedulesView.openCopyModal()">
              ${getIcon('copy', '', 16)} Salin Jadwal Antar Hari
            </button>
            <button class="btn btn-primary" onclick="SchedulesView.openAddModal()">
              ${getIcon('plus', '', 16)} Tambah Jadwal Baru
            </button>
          </div>
        </div>

        <!-- Filter Bar Hari -->
        <div class="filter-day-container">
          <div class="filter-day-pills" id="schedule-day-pills">
            <button class="day-pill active" data-day="Semua" onclick="SchedulesView.setFilterDay('Semua')">Semua Hari</button>
            <button class="day-pill" data-day="Senin" onclick="SchedulesView.setFilterDay('Senin')">Senin</button>
            <button class="day-pill" data-day="Selasa" onclick="SchedulesView.setFilterDay('Selasa')">Selasa</button>
            <button class="day-pill" data-day="Rabu" onclick="SchedulesView.setFilterDay('Rabu')">Rabu</button>
            <button class="day-pill" data-day="Kamis" onclick="SchedulesView.setFilterDay('Kamis')">Kamis</button>
            <button class="day-pill" data-day="Jumat" onclick="SchedulesView.setFilterDay('Jumat')">Jumat</button>
            <button class="day-pill" data-day="Sabtu" onclick="SchedulesView.setFilterDay('Sabtu')">Sabtu</button>
            <button class="day-pill" data-day="Minggu" onclick="SchedulesView.setFilterDay('Minggu')">Minggu</button>
          </div>
          <div class="search-wrap">
            <input type="text" id="schedule-search-input" class="form-control" placeholder="Cari jam pelajaran/jenis..." oninput="SchedulesView.onSearch(this.value)">
          </div>
        </div>

        <!-- Schedules Table Card -->
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover" id="schedules-table">
              <thead>
                <tr>
                  <th style="width: 100px;">HARI</th>
                  <th style="width: 100px;">WAKTU</th>
                  <th>JAM PELAJARAN / KEGIATAN</th>
                  <th style="width: 160px;">JENIS BEL</th>
                  <th>INSTRUMEN SUARA</th>
                  <th style="width: 100px; text-align: center;">STATUS</th>
                  <th style="width: 130px; text-align: right;">AKSI</th>
                </tr>
              </thead>
              <tbody id="schedules-tbody">
                <tr>
                  <td colspan="7" class="text-center py-4">Memuat data jadwal...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MODAL FORM JADWAL (Tambah / Edit) -->
      <div class="modal-overlay" id="modal-schedule" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-schedule-title">Tambah Jadwal Bel</h3>
            <button class="btn-close" onclick="SchedulesView.closeModal()">&times;</button>
          </div>
          <form id="form-schedule" onsubmit="SchedulesView.onSaveForm(event)">
            <input type="hidden" id="sch-form-id">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group col-6">
                  <label class="form-label" for="sch-form-day">Hari <span class="text-danger">*</span></label>
                  <select id="sch-form-day" class="form-control" required>
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>
                <div class="form-group col-6">
                  <label class="form-label" for="sch-form-time">Waktu Bel (Jam:Menit) <span class="text-danger">*</span></label>
                  <input type="time" id="sch-form-time" class="form-control" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="sch-form-period">Jam Pelajaran / Keterangan Acara <span class="text-danger">*</span></label>
                <input type="text" id="sch-form-period" class="form-control" placeholder="Contoh: Jam Ke-1, Istirahat 1, Upacara, Pulang" required>
                <div class="quick-tags mt-1">
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Upacara Bendera', 'Masuk')">+ Upacara</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Doa & Renungan Pagi', 'Masuk')">+ Doa Pagi</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Jam Ke-1', 'Masuk')">+ Jam Ke-1</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Pergantian Jam', 'Pergantian Jam')">+ Pergantian</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Istirahat 1', 'Istirahat')">+ Istirahat 1</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Istirahat 2 (Makan Siang)', 'Istirahat')">+ Istirahat 2</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Ibadah Bersama SMUQ', 'Masuk')">+ Ibadah</span>
                  <span class="quick-tag" onclick="SchedulesView.setPeriodQuick('Doa Bersama & Pulang', 'Pulang')">+ Pulang</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-6">
                  <label class="form-label" for="sch-form-type">Jenis Bel <span class="text-danger">*</span></label>
                  <select id="sch-form-type" class="form-control" required>
                    <option value="Masuk">Masuk Kelas / Kegiatan</option>
                    <option value="Pergantian Jam">Pergantian Jam Pelajaran</option>
                    <option value="Istirahat">Istirahat</option>
                    <option value="Pulang">Pulang Sekolah</option>
                    <option value="Khusus">Khusus / Acara Sekolah</option>
                  </select>
                </div>
                <div class="form-group col-6">
                  <label class="form-label" for="sch-form-inst">Instrumen Bel <span class="text-danger">*</span></label>
                  <select id="sch-form-inst" class="form-control" required></select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="sch-form-notes">Catatan Tambahan (Opsional)</label>
                <input type="text" id="sch-form-notes" class="form-control" placeholder="Contoh: Bunyikan 5 menit lebih awal saat ujian">
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="sch-form-enabled" checked>
                  <span>Aktifkan jadwal bel ini</span>
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="SchedulesView.closeModal()">Batal</button>
              <button type="submit" class="btn btn-primary">${getIcon('check', '', 16)} Simpan Jadwal</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL SALIN JADWAL -->
      <div class="modal-overlay" id="modal-copy-schedule" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Salin Jadwal Antar Hari</h3>
            <button class="btn-close" onclick="SchedulesView.closeCopyModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="text-muted">Salin seluruh susunan jadwal dari satu hari ke hari-hari lainnya secara instan.</p>
            <div class="form-group">
              <label class="form-label">Pilih Hari Sumber (Asal)</label>
              <select id="copy-source-day" class="form-control">
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Salin Ke Hari Tujuan (Bisa pilih lebih dari satu):</label>
              <div class="target-days-checkboxes">
                <label class="checkbox-item"><input type="checkbox" value="Senin" class="copy-target-cb"> Senin</label>
                <label class="checkbox-item"><input type="checkbox" value="Selasa" class="copy-target-cb" checked> Selasa</label>
                <label class="checkbox-item"><input type="checkbox" value="Rabu" class="copy-target-cb" checked> Rabu</label>
                <label class="checkbox-item"><input type="checkbox" value="Kamis" class="copy-target-cb" checked> Kamis</label>
                <label class="checkbox-item"><input type="checkbox" value="Jumat" class="copy-target-cb"> Jumat</label>
                <label class="checkbox-item"><input type="checkbox" value="Sabtu" class="copy-target-cb"> Sabtu</label>
              </div>
            </div>
            <div class="alert alert-warning text-sm">
              ${getIcon('alert', '', 16)} <strong>Perhatian:</strong> Jadwal yang ada di hari tujuan yang dipilih akan digantikan dengan jadwal baru hasil salinan.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="SchedulesView.closeCopyModal()">Batal</button>
            <button type="button" class="btn btn-primary" onclick="SchedulesView.executeCopy()">
              ${getIcon('copy', '', 16)} Mulai Salin Jadwal
            </button>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    this.schedulesCache = await window.bellDB.getAllSchedules();
    this.instrumentsCache = await window.bellDB.getAllInstruments();
    this.renderTable();
    this.populateInstrumentSelect();
  },

  setFilterDay(day) {
    this.currentFilterDay = day;
    const pills = document.querySelectorAll('#schedule-day-pills .day-pill');
    pills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-day') === day);
    });
    this.renderTable();
  },

  onSearch(keyword) {
    this.renderTable(keyword);
  },

  renderTable(keyword = '') {
    const tbody = document.getElementById('schedules-tbody');
    if (!tbody) return;

    let list = this.schedulesCache;

    if (this.currentFilterDay !== 'Semua') {
      list = list.filter(s => s.day === this.currentFilterDay);
    }

    if (keyword && keyword.trim() !== '') {
      const q = keyword.toLowerCase().trim();
      list = list.filter(s =>
        s.period.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.time.includes(q) ||
        (s.instrumentName && s.instrumentName.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    // Sort by day order then time
    const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7 };
    list.sort((a, b) => {
      if (this.currentFilterDay === 'Semua') {
        const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        if (dDiff !== 0) return dDiff;
      }
      return a.time.localeCompare(b.time);
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">
            Tidak ada jadwal bel ditemukan ${this.currentFilterDay !== 'Semua' ? `untuk hari ${this.currentFilterDay}` : ''}.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    for (const item of list) {
      const typeBadgeClass = DashboardView.getTypeBadgeClass(item.type);
      const isEnabled = item.enabled !== false;

      html += `
        <tr class="${!isEnabled ? 'row-disabled' : ''}">
          <td><strong>${item.day}</strong></td>
          <td><span class="badge badge-time">${item.time}</span></td>
          <td>
            <strong>${DashboardView.escapeHtml(item.period)}</strong>
            ${item.notes ? `<div class="text-muted small">${DashboardView.escapeHtml(item.notes)}</div>` : ''}
          </td>
          <td><span class="badge badge-${typeBadgeClass}">${item.type}</span></td>
          <td>
            <span class="inst-tag">
              ${getIcon('music', '', 13)} ${DashboardView.escapeHtml(item.instrumentName || 'Instrumen')}
            </span>
          </td>
          <td style="text-align: center;">
            <label class="toggle-switch-sm" title="Aktif/Nonaktif">
              <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="SchedulesView.toggleEnable('${item.id}', this.checked)">
              <span class="slider-sm round"></span>
            </label>
          </td>
          <td style="text-align: right;">
            <div class="btn-group-action">
              <button class="btn btn-icon btn-sm btn-ghost" title="Uji Suara Bel" onclick="window.audioManager.playInstrument('${item.instrumentId}', '${DashboardView.escapeHtml(item.period)}')">
                ${getIcon('play', '', 14)}
              </button>
              <button class="btn btn-icon btn-sm btn-outline-primary" title="Edit Jadwal" onclick="SchedulesView.openEditModal('${item.id}')">
                ${getIcon('edit', '', 14)}
              </button>
              <button class="btn btn-icon btn-sm btn-outline-danger" title="Hapus Jadwal" onclick="SchedulesView.confirmDelete('${item.id}', '${DashboardView.escapeHtml(item.period)}')">
                ${getIcon('trash', '', 14)}
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  populateInstrumentSelect() {
    const select = document.getElementById('sch-form-inst');
    if (!select) return;

    select.innerHTML = this.instrumentsCache.map(inst => `
      <option value="${inst.id}">${DashboardView.escapeHtml(inst.name)}</option>
    `).join('');
  },

  setPeriodQuick(periodName, bellType) {
    const periodInput = document.getElementById('sch-form-period');
    const typeSelect = document.getElementById('sch-form-type');
    if (periodInput) periodInput.value = periodName;
    if (typeSelect) typeSelect.value = bellType;
  },

  openAddModal() {
    document.getElementById('modal-schedule-title').textContent = 'Tambah Jadwal Bel';
    document.getElementById('sch-form-id').value = '';
    document.getElementById('sch-form-day').value = this.currentFilterDay !== 'Semua' ? this.currentFilterDay : 'Senin';
    document.getElementById('sch-form-time').value = '07:00';
    document.getElementById('sch-form-period').value = '';
    document.getElementById('sch-form-type').value = 'Masuk';
    document.getElementById('sch-form-notes').value = '';
    document.getElementById('sch-form-enabled').checked = true;

    if (this.instrumentsCache.length > 0) {
      document.getElementById('sch-form-inst').value = this.instrumentsCache[0].id;
    }

    document.getElementById('modal-schedule').style.display = 'flex';
  },

  async openEditModal(id) {
    const item = this.schedulesCache.find(s => s.id === id);
    if (!item) return;

    document.getElementById('modal-schedule-title').textContent = 'Ubah Jadwal Bel';
    document.getElementById('sch-form-id').value = item.id;
    document.getElementById('sch-form-day').value = item.day;
    document.getElementById('sch-form-time').value = item.time;
    document.getElementById('sch-form-period').value = item.period;
    document.getElementById('sch-form-type').value = item.type;
    document.getElementById('sch-form-inst').value = item.instrumentId;
    document.getElementById('sch-form-notes').value = item.notes || '';
    document.getElementById('sch-form-enabled').checked = item.enabled !== false;

    document.getElementById('modal-schedule').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modal-schedule').style.display = 'none';
  },

  async onSaveForm(e) {
    e.preventDefault();

    const id = document.getElementById('sch-form-id').value;
    const day = document.getElementById('sch-form-day').value;
    const time = document.getElementById('sch-form-time').value;
    const period = document.getElementById('sch-form-period').value.trim();
    const type = document.getElementById('sch-form-type').value;
    const instrumentId = document.getElementById('sch-form-inst').value;
    const notes = document.getElementById('sch-form-notes').value.trim();
    const enabled = document.getElementById('sch-form-enabled').checked;

    const inst = this.instrumentsCache.find(i => i.id === instrumentId);
    const instrumentName = inst ? inst.name : 'Instrumen';

    await window.bellDB.saveSchedule({
      id: id || undefined,
      day,
      time,
      period,
      type,
      instrumentId,
      instrumentName,
      notes,
      enabled
    });

    this.closeModal();
    App.showToast('Jadwal Disimpan', `Jadwal ${period} pada ${day} ${time} berhasil disimpan.`, 'success');
    await this.loadData();
    await window.bellScheduler.refreshTodaySchedules();
  },

  async toggleEnable(id, enabled) {
    const item = this.schedulesCache.find(s => s.id === id);
    if (!item) return;
    item.enabled = enabled;
    await window.bellDB.saveSchedule(item);
    await window.bellScheduler.refreshTodaySchedules();
  },

  async confirmDelete(id, period) {
    if (confirm(`Apakah Anda yakin ingin menghapus jadwal "${period}"?`)) {
      await window.bellDB.deleteSchedule(id);
      App.showToast('Jadwal Dihapus', `Jadwal "${period}" telah dihapus.`, 'info');
      await this.loadData();
      await window.bellScheduler.refreshTodaySchedules();
    }
  },

  // --- MODAL COPY JADWAL ---
  openCopyModal() {
    const sourceSelect = document.getElementById('copy-source-day');
    if (this.currentFilterDay !== 'Semua') {
      sourceSelect.value = this.currentFilterDay;
    }
    document.getElementById('modal-copy-schedule').style.display = 'flex';
  },

  closeCopyModal() {
    document.getElementById('modal-copy-schedule').style.display = 'none';
  },

  async executeCopy() {
    const sourceDay = document.getElementById('copy-source-day').value;
    const checkboxes = document.querySelectorAll('.copy-target-cb:checked');
    const targetDays = Array.from(checkboxes).map(cb => cb.value).filter(d => d !== sourceDay);

    if (targetDays.length === 0) {
      alert('Silakan pilih minimal satu hari tujuan yang berbeda dari hari sumber.');
      return;
    }

    try {
      await window.bellDB.copySchedulesFromDay(sourceDay, targetDays);
      this.closeCopyModal();
      App.showToast(
        'Salin Jadwal Berhasil',
        `Jadwal hari ${sourceDay} berhasil diduplikasi ke: ${targetDays.join(', ')}.`,
        'success'
      );
      await this.loadData();
      await window.bellScheduler.refreshTodaySchedules();
    } catch (err) {
      alert('Gagal menyalin jadwal: ' + err.message);
    }
  }
};
