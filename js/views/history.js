/**
 * Halaman Riwayat Bel (Audit Log Bel Otomatis & Manual)
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const HistoryView = {
  historyLogs: [],
  currentFilter: 'all',

  async render(container) {
    container.innerHTML = `
      <div class="view-history">
        <!-- Header Card -->
        <div class="page-header-card card">
          <div class="header-left">
            <h1 class="page-title">
              ${getIcon('history', '', 24)} Riwayat Aktivitas Bel Sekolah
            </h1>
            <p class="page-desc">
              Catatan riwayat seluruh pembunyian bel sekolah, baik yang berbunyi otomatis sesuai jadwal maupun pemicuan manual oleh operator.
            </p>
          </div>
          <div class="header-right-actions">
            <button class="btn btn-secondary" onclick="HistoryView.exportCSV()">
              ${getIcon('download', '', 16)} Ekspor ke CSV / Excel
            </button>
            <button class="btn btn-outline-danger" onclick="HistoryView.confirmClear()">
              ${getIcon('trash', '', 16)} Bersihkan Riwayat
            </button>
          </div>
        </div>

        <!-- Info Pembersihan Otomatis Mingguan -->
        <div class="alert alert-info py-2 px-3 text-sm mb-3">
          ${getIcon('info', '', 16)} <strong>Pembersihan Otomatis Mingguan:</strong> Riwayat bel akan dibersihkan secara otomatis seminggu sekali (menghapus catatan lebih dari 7 hari) untuk menjaga kecepatan database.
        </div>

        <!-- Filter & Search Bar -->
        <div class="filter-day-container">
          <div class="filter-day-pills">
            <button class="day-pill active" id="hist-filter-all" onclick="HistoryView.setFilter('all')">Semua Riwayat</button>
            <button class="day-pill" id="hist-filter-auto" onclick="HistoryView.setFilter('auto')">Otomatis (Jadwal)</button>
            <button class="day-pill" id="hist-filter-manual" onclick="HistoryView.setFilter('manual')">Pemicuan Manual</button>
          </div>
          <div class="search-wrap">
            <input type="text" id="history-search-input" class="form-control" placeholder="Cari jam / jenis / instrumen..." oninput="HistoryView.onSearch(this.value)">
          </div>
        </div>

        <!-- Table Card -->
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover" id="table-history">
              <thead>
                <tr>
                  <th style="width: 180px;">WAKTU & TANGGAL</th>
                  <th style="width: 130px;">METODE</th>
                  <th>JAM PELAJARAN / ACARA</th>
                  <th style="width: 140px;">JENIS BEL</th>
                  <th>INSTRUMEN</th>
                  <th style="width: 180px;">STATUS</th>
                </tr>
              </thead>
              <tbody id="history-tbody">
                <tr>
                  <td colspan="6" class="text-center py-4">Memuat riwayat...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    this.historyLogs = await window.bellDB.getAllHistory(300);
    this.renderTable();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-day-pills .day-pill').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`hist-filter-${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
    this.renderTable();
  },

  onSearch(keyword) {
    this.renderTable(keyword);
  },

  renderTable(keyword = '') {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    let list = this.historyLogs;

    if (this.currentFilter === 'auto') {
      list = list.filter(l => l.triggerType === 'auto');
    } else if (this.currentFilter === 'manual') {
      list = list.filter(l => l.triggerType === 'manual');
    }

    if (keyword && keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      list = list.filter(l =>
        l.dateStr.toLowerCase().includes(q) ||
        l.timeStr.toLowerCase().includes(q) ||
        (l.period && l.period.toLowerCase().includes(q)) ||
        (l.bellType && l.bellType.toLowerCase().includes(q)) ||
        (l.instrumentName && l.instrumentName.toLowerCase().includes(q)) ||
        (l.status && l.status.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5 text-muted">
            Belum ada riwayat aktivitas bel tercatat.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    for (const item of list) {
      const isAuto = item.triggerType === 'auto';
      const isSuccess = item.status === 'Berhasil';

      let statusBadge = '';
      if (isSuccess) {
        statusBadge = `<span class="badge badge-success">${getIcon('check', '', 12)} Berhasil</span>`;
      } else if (item.status && item.status.includes('Nonaktif')) {
        statusBadge = `<span class="badge badge-warning">${getIcon('alert', '', 12)} Dilewati (Nonaktif)</span>`;
      } else {
        statusBadge = `<span class="badge badge-danger">${item.status}</span>`;
      }

      html += `
        <tr>
          <td>
            <strong>${item.timeStr}</strong>
            <div class="text-muted small">${item.dateStr}</div>
          </td>
          <td>
            <span class="badge ${isAuto ? 'badge-primary' : 'badge-info'}">
              ${isAuto ? getIcon('clock', '', 12) + ' Otomatis' : getIcon('zap', '', 12) + ' Manual'}
            </span>
          </td>
          <td>
            <strong>${DashboardView.escapeHtml(item.period)}</strong>
            ${item.notes ? `<div class="text-muted small">${DashboardView.escapeHtml(item.notes)}</div>` : ''}
          </td>
          <td>
            <span class="badge badge-${DashboardView.getTypeBadgeClass(item.bellType)}">
              ${DashboardView.escapeHtml(item.bellType || '-')}
            </span>
          </td>
          <td>
            <span class="inst-tag">
              ${getIcon('music', '', 13)} ${DashboardView.escapeHtml(item.instrumentName || '-')}
            </span>
          </td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  async confirmClear() {
    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh riwayat bel? Data yang dihapus tidak dapat dikembalikan.')) {
      await window.bellDB.clearHistory();
      App.showToast('Riwayat Dibersihkan', 'Seluruh log aktivitas bel telah dikosongkan.', 'info');
      await this.loadData();
    }
  },

  exportCSV() {
    if (this.historyLogs.length === 0) {
      alert('Tidak ada data riwayat untuk diekspor.');
      return;
    }

    let csvContent = 'ID,Waktu,Tanggal,Metode,Jam Pelajaran,Jenis Bel,Instrumen,Status,Catatan\n';

    for (const item of this.historyLogs) {
      const row = [
        item.id,
        `"${item.timeStr}"`,
        `"${item.dateStr}"`,
        `"${item.triggerType === 'auto' ? 'Otomatis' : 'Manual'}"`,
        `"${(item.period || '').replace(/"/g, '""')}"`,
        `"${(item.bellType || '').replace(/"/g, '""')}"`,
        `"${(item.instrumentName || '').replace(/"/g, '""')}"`,
        `"${(item.status || '').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Riwayat_Bel_SMUQ_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    App.showToast('Ekspor Berhasil', 'File CSV riwayat bel telah berhasil diunduh.', 'success');
  }
};
