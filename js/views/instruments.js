/**
 * Halaman Manajemen Instrumen Suara Bel
 * Sistem Bel Sekolah SMUQ - SMA Kristen 1 Salatiga & PPG Informatika UKSW 2026
 */

const InstrumentsView = {
  instruments: [],
  currentlyPlayingId: null,

  async render(container) {
    container.innerHTML = `
      <div class="view-instruments">
        <!-- Header Card -->
        <div class="page-header-card card">
          <div class="header-left">
            <h1 class="page-title">
              ${getIcon('music', '', 24)} Manajemen Instrumen Audio Bel
            </h1>
            <p class="page-desc">
              Kelola nada lonceng sekolah. Anda dapat mengunggah file audio lokal (.mp3, .wav, .ogg) dari komputer Anda atau menggunakan instrumen bawaan berkualitas jernih.
            </p>
          </div>
          <div class="header-right-actions">
            <button class="btn btn-primary" onclick="InstrumentsView.openUploadModal()">
              ${getIcon('upload', '', 16)} Unggah File Audio Baru
            </button>
          </div>
        </div>

        <!-- Info Box -->
        <div class="alert alert-info">
          <div class="alert-icon-wrap">${getIcon('info', '', 20)}</div>
          <div>
            <strong>Penyimpanan Permanen (IndexedDB):</strong> 
            Semua file audio yang diunggah akan disimpan langsung ke memori harddisk browser komputer ini (kapasitas hingga puluhan GB).
            File audio tidak akan hilang saat komputer dimatikan.
          </div>
        </div>

        <!-- Table Card -->
        <div class="card">
          <div class="card-header-flex">
            <div>
              <h2 class="card-title">Daftar Instrumen Bel Terdaftar</h2>
              <p class="section-subtitle" id="inst-total-label">Memuat daftar instrumen...</p>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-danger" onclick="InstrumentsView.stopAudio()">
                ${getIcon('stop', '', 14)} Hentikan Pratinjau
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-hover" id="table-instruments">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">PUTAR</th>
                  <th>NAMA INSTRUMEN</th>
                  <th style="width: 140px;">TIPE</th>
                  <th style="width: 100px;">DURASI</th>
                  <th style="width: 110px;">UKURAN</th>
                  <th style="width: 130px; text-align: right;">AKSI</th>
                </tr>
              </thead>
              <tbody id="instruments-tbody">
                <tr>
                  <td colspan="6" class="text-center py-4">Memuat instrumen...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MODAL UNGGAH INSTRUMEN -->
      <div class="modal-overlay" id="modal-upload-inst" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Unggah File Audio Instrumen</h3>
            <button class="btn-close" onclick="InstrumentsView.closeUploadModal()">&times;</button>
          </div>
          <form id="form-upload-inst" onsubmit="InstrumentsView.onSaveUpload(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="inst-file-input">Pilih File Audio dari Komputer <span class="text-danger">*</span></label>
                <div class="file-drop-zone" onclick="document.getElementById('inst-file-input').click()">
                  ${getIcon('upload', 'drop-icon', 32)}
                  <p class="drop-text" id="file-drop-label">Klik untuk memilih file audio (.mp3, .wav, .ogg)</p>
                  <span class="text-muted small">Maksimal ukuran: 50 MB</span>
                </div>
                <input type="file" id="inst-file-input" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg" style="display: none;" onchange="InstrumentsView.onFileSelected(this)">
              </div>

              <div class="form-group">
                <label class="form-label" for="inst-name-input">Nama Label Instrumen <span class="text-danger">*</span></label>
                <input type="text" id="inst-name-input" class="form-control" placeholder="Contoh: Bel Masuk SMUQ, Lagu Mars Sekolah, dll." required>
              </div>

              <div id="upload-preview-meta" class="alert alert-secondary text-sm" style="display: none;">
                <!-- Audio file info preview -->
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="InstrumentsView.closeUploadModal()">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-upload" disabled>
                ${getIcon('check', '', 16)} Simpan ke Database
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL GANTI NAMA & FILE AUDIO INSTRUMEN -->
      <div class="modal-overlay" id="modal-rename-inst" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Ubah / Edit Instrumen Bel</h3>
            <button class="btn-close" onclick="InstrumentsView.closeRenameModal()">&times;</button>
          </div>
          <form id="form-rename-inst" onsubmit="InstrumentsView.onSaveRename(event)">
            <input type="hidden" id="rename-inst-id">
            <div class="modal-body">
              <div class="form-group mb-3">
                <label class="form-label" for="rename-inst-input">Nama Label Instrumen <span class="text-danger">*</span></label>
                <input type="text" id="rename-inst-input" class="form-control" placeholder="Contoh: Bel Masuk SMUQ" required>
              </div>

              <div class="form-group mb-2">
                <label class="form-label">Ganti File Audio (Opsional):</label>
                <div class="file-drop-zone py-3" onclick="document.getElementById('edit-file-input').click()">
                  ${getIcon('upload', 'drop-icon', 26)}
                  <p class="drop-text small mb-0" id="edit-file-drop-label">Klik untuk memilih file audio pengganti (.mp3, .wav, .ogg)</p>
                  <span class="text-muted small" style="font-size:0.75rem">Biarkan kosong jika hanya ingin mengubah nama instrumen saja.</span>
                </div>
                <input type="file" id="edit-file-input" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg" style="display: none;" onchange="InstrumentsView.onEditFileSelected(this)">
              </div>

              <div id="edit-preview-meta" class="alert alert-secondary text-sm mt-2" style="display: none;">
                <!-- Audio file info preview -->
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="InstrumentsView.closeRenameModal()">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-save-edit-inst">
                ${getIcon('check', '', 16)} Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    await this.loadData();
    this.setupAudioListeners();
  },

  async loadData() {
    this.instruments = await window.bellDB.getAllInstruments();
    const label = document.getElementById('inst-total-label');
    if (label) label.textContent = `Total ${this.instruments.length} instrumen audio tersimpan.`;
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('instruments-tbody');
    if (!tbody) return;

    if (this.instruments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Belum ada instrumen audio.</td></tr>`;
      return;
    }

    let html = '';
    for (const inst of this.instruments) {
      const isBuiltin = inst.isBuiltin;
      const isPlaying = this.currentlyPlayingId === inst.id;
      const sizeStr = inst.size ? `${(inst.size / 1024).toFixed(1)} KB` : (isBuiltin ? 'Built-in' : '-');
      const durStr = inst.duration ? `~${Math.round(inst.duration)} dtk` : '-';

      html += `
        <tr class="${isPlaying ? 'table-row-playing' : ''}">
          <td style="text-align: center;">
            <button class="btn btn-icon btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}" title="${isPlaying ? 'Hentikan' : 'Putar'}" onclick="InstrumentsView.togglePlay('${inst.id}', '${DashboardView.escapeHtml(inst.name)}')">
              ${isPlaying ? getIcon('stop', '', 14) : getIcon('play', '', 14)}
            </button>
          </td>
          <td>
            <strong>${DashboardView.escapeHtml(inst.name)}</strong>
            ${isPlaying ? `<span class="badge badge-sm badge-success ml-2 pulse">Memutar...</span>` : ''}
          </td>
          <td>
            <span class="badge ${isBuiltin ? 'badge-primary' : 'badge-info'}">
              ${isBuiltin ? 'Bawaan SMUQ' : 'Upload Lokal'}
            </span>
          </td>
          <td>${durStr}</td>
          <td><span class="text-muted small">${sizeStr}</span></td>
          <td style="text-align: right;">
            <div class="btn-group-action">
              <button class="btn btn-icon btn-sm btn-outline-primary" title="Ubah Nama" onclick="InstrumentsView.openRenameModal('${inst.id}', '${DashboardView.escapeHtml(inst.name)}')">
                ${getIcon('edit', '', 14)}
              </button>
              <button class="btn btn-icon btn-sm btn-outline-danger" title="Hapus Instrumen" onclick="InstrumentsView.confirmDelete('${inst.id}', '${DashboardView.escapeHtml(inst.name)}')">
                ${getIcon('trash', '', 14)}
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  },

  setupAudioListeners() {
    window.audioManager.onStateChange((state) => {
      if (!state.isPlaying) {
        this.currentlyPlayingId = null;
      }
      this.renderTable();
    });
  },

  async togglePlay(id, name) {
    if (this.currentlyPlayingId === id) {
      window.audioManager.stop();
      this.currentlyPlayingId = null;
    } else {
      this.currentlyPlayingId = id;
      await window.audioManager.playInstrument(id, name);
    }
    this.renderTable();
  },

  stopAudio() {
    window.audioManager.stop();
    this.currentlyPlayingId = null;
    this.renderTable();
  },

  // --- UPLOAD MODAL ---
  openUploadModal() {
    this.selectedFile = null;
    document.getElementById('inst-file-input').value = '';
    document.getElementById('inst-name-input').value = '';
    document.getElementById('file-drop-label').textContent = 'Klik untuk memilih file audio (.mp3, .wav, .ogg)';
    document.getElementById('upload-preview-meta').style.display = 'none';
    document.getElementById('btn-submit-upload').disabled = true;
    document.getElementById('modal-upload-inst').style.display = 'flex';
  },

  closeUploadModal() {
    document.getElementById('modal-upload-inst').style.display = 'none';
  },

  async onFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 50 MB.');
      return;
    }

    this.selectedFile = file;
    document.getElementById('file-drop-label').textContent = `File terpilih: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    // Auto-fill instrument name from file name without extension
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const nameInput = document.getElementById('inst-name-input');
    if (nameInput && !nameInput.value) {
      nameInput.value = baseName;
    }

    // Try to detect audio duration
    let duration = 0;
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.src = url;
      await new Promise((res) => {
        audio.onloadedmetadata = () => {
          duration = audio.duration;
          URL.revokeObjectURL(url);
          res();
        };
        audio.onerror = () => res();
      });
    } catch (e) {}

    this.selectedFileDuration = duration;

    const metaBox = document.getElementById('upload-preview-meta');
    metaBox.style.display = 'block';
    metaBox.innerHTML = `
      <strong>Format:</strong> ${file.type || 'audio'} | 
      <strong>Ukuran:</strong> ${(file.size / 1024).toFixed(1)} KB | 
      <strong>Estimasi Durasi:</strong> ${duration ? `~${Math.round(duration)} detik` : 'Mendeteksi...'}
    `;

    document.getElementById('btn-submit-upload').disabled = false;
  },

  async onSaveUpload(e) {
    e.preventDefault();
    if (!this.selectedFile) return;

    const name = document.getElementById('inst-name-input').value.trim();
    if (!name) return;

    const btn = document.getElementById('btn-submit-upload');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      await window.bellDB.saveInstrument({
        name: name,
        type: this.selectedFile.type,
        size: this.selectedFile.size,
        duration: this.selectedFileDuration || 0,
        isBuiltin: false,
        blob: this.selectedFile
      });

      this.closeUploadModal();
      App.showToast('Instrumen Berhasil Ditambahkan', `"${name}" siap digunakan dalam jadwal bel.`, 'success');
      await this.loadData();
    } catch (err) {
      alert('Gagal menyimpan file audio: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan ke Database';
    }
  },

  selectedEditFile: null,
  selectedEditFileDuration: 0,

  // --- RENAME & GANTI FILE AUDIO MODAL ---
  openRenameModal(id, currentName) {
    this.selectedEditFile = null;
    this.selectedEditFileDuration = 0;
    document.getElementById('rename-inst-id').value = id;
    document.getElementById('rename-inst-input').value = currentName;
    document.getElementById('edit-file-input').value = '';
    document.getElementById('edit-file-drop-label').textContent = 'Klik untuk memilih file audio pengganti (.mp3, .wav, .ogg)';
    document.getElementById('edit-preview-meta').style.display = 'none';
    document.getElementById('modal-rename-inst').style.display = 'flex';
  },

  closeRenameModal() {
    this.selectedEditFile = null;
    this.selectedEditFileDuration = 0;
    document.getElementById('modal-rename-inst').style.display = 'none';
  },

  async onEditFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 50 MB.');
      return;
    }

    this.selectedEditFile = file;
    document.getElementById('edit-file-drop-label').textContent = `File baru: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    // Detect duration
    let duration = 0;
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.src = url;
      await new Promise((res) => {
        audio.onloadedmetadata = () => {
          duration = audio.duration;
          URL.revokeObjectURL(url);
          res();
        };
        audio.onerror = () => res();
      });
    } catch (e) {}

    this.selectedEditFileDuration = duration;

    const metaBox = document.getElementById('edit-preview-meta');
    metaBox.style.display = 'block';
    metaBox.innerHTML = `
      <strong>File Pengganti:</strong> ${file.name} | 
      <strong>Ukuran:</strong> ${(file.size / 1024).toFixed(1)} KB | 
      <strong>Estimasi Durasi:</strong> ${duration ? `~${Math.round(duration)} detik` : 'Mendeteksi...'}
    `;
  },

  async onSaveRename(e) {
    e.preventDefault();
    const id = document.getElementById('rename-inst-id').value;
    const newName = document.getElementById('rename-inst-input').value.trim();
    if (!newName) return;

    const btn = document.getElementById('btn-save-edit-inst');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';
    }

    try {
      if (this.selectedEditFile) {
        await window.bellDB.updateInstrument(id, {
          name: newName,
          blob: this.selectedEditFile,
          size: this.selectedEditFile.size,
          type: this.selectedEditFile.type,
          duration: this.selectedEditFileDuration || 0
        });
        App.showToast('Instrumen Diperbarui', `Nama dan file audio untuk "${newName}" berhasil diganti.`, 'success');
      } else {
        await window.bellDB.updateInstrument(id, { name: newName });
        App.showToast('Nama Diperbarui', `Nama instrumen diubah menjadi "${newName}".`, 'success');
      }

      this.closeRenameModal();
      await this.loadData();
    } catch (err) {
      alert('Gagal memperbarui instrumen: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${getIcon('check', '', 16)} Simpan Perubahan`;
      }
    }
  },

  async confirmDelete(id, name) {
    // Check if any schedule uses this instrument
    const schedules = await window.bellDB.getAllSchedules();
    const usedCount = schedules.filter(s => s.instrumentId === id).length;

    let warning = `Apakah Anda yakin ingin menghapus instrumen "${name}"?`;
    if (usedCount > 0) {
      warning = `⚠️ PERINGATAN: Instrumen "${name}" sedang digunakan oleh ${usedCount} jadwal bel aktif!\n\nApakah Anda tetap ingin menghapusnya?`;
    }

    if (confirm(warning)) {
      await window.bellDB.deleteInstrument(id);
      App.showToast('Instrumen Dihapus', `Instrumen "${name}" telah dihapus.`, 'info');
      await this.loadData();
    }
  }
};
