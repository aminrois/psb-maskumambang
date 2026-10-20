/**
 * Module: Download Data Santri (Arsip ZIP, PDF & Excel)
 * Format Nama File: [NAMA_Nomorpendaftaran]
 */

const downloadDataState = {
  filters: {
    schoolId: '',
    admissionWaveId: '',
    academicPeriodId: '',
    formStatus: '',
    finalStatus: '',
    paymentStatus: '',
    search: '',
  },
  filterOptions: {
    schools: [],
    waves: [],
    periods: [],
    formStatuses: [],
    finalStatuses: [],
    paymentStatuses: [],
  },
  items: [],
  selectedIds: new Set(),
  pagination: {
    page: 1,
    perPage: 25,
    total: 0,
    totalPages: 1,
  },
  loading: false,
  isDownloading: false,
};

/**
 * Main View Renderer called by router (#download-data)
 */
async function renderAdminDownloadDataView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-file-zipper" style="color: #059669;"></i> Download Data Santri
          </h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">
            Ekspor arsip berkas pendaftaran calon santri ke dalam file ZIP (PDF Biodata, Excel Biodata, dan Dokumen Upload).
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 0.8rem; background: rgba(5, 150, 105, 0.1); color: #059669; border: 1px solid rgba(5, 150, 105, 0.25); padding: 5px 12px; border-radius: 9999px; font-weight: 700;">
            <i class="fa-solid fa-tag"></i> Penamaan: NAMA_Nomorpendaftaran
          </span>
        </div>
      </div>
    </div>

    <!-- Summary Counter Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;" id="dl-stats-cards">
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px;">
        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Santri Sesuai Filter</div>
        <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-heading); margin-top: 6px;" id="dl-stat-total">-</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Pendaftar dalam database</div>
      </div>
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px;">
        <div style="font-size: 0.8rem; color: #059669; font-weight: 600; text-transform: uppercase;">Berkas Terverifikasi</div>
        <div style="font-size: 1.8rem; font-weight: 800; color: #059669; margin-top: 6px;" id="dl-stat-verified">-</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Status Formulir VERIFIED</div>
      </div>
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px;">
        <div style="font-size: 0.8rem; color: #2563eb; font-weight: 600; text-transform: uppercase;">Lulus Seleksi</div>
        <div style="font-size: 1.8rem; font-weight: 800; color: #2563eb; margin-top: 6px;" id="dl-stat-passed">-</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Status Akhir LULUS</div>
      </div>
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px;">
        <div style="font-size: 0.8rem; color: #d97706; font-weight: 600; text-transform: uppercase;">Santri Dipilih</div>
        <div style="font-size: 1.8rem; font-weight: 800; color: #d97706; margin-top: 6px;" id="dl-stat-selected">0</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Siap diunduh secara serentak</div>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-heading); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-filter" style="color: #6366f1;"></i> Filter Ekspor Data
        </span>
        <button type="button" onclick="resetDownloadFilters()" style="background: none; border: none; color: var(--primary-600); font-size: 0.85rem; font-weight: 600; cursor: pointer;">
          <i class="fa-solid fa-rotate-left"></i> Reset Filter
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 14px;">
        <!-- Lembaga / Sekolah -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Lembaga / Sekolah</label>
          <select id="dl-filter-school" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Lembaga --</option>
          </select>
        </div>

        <!-- Gelombang -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Gelombang Pendaftaran</label>
          <select id="dl-filter-wave" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Gelombang --</option>
          </select>
        </div>

        <!-- Periode / Tahun Pelajaran -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Tahun Pelajaran</label>
          <select id="dl-filter-period" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Periode --</option>
          </select>
        </div>

        <!-- Status Formulir -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Status Berkas / Form</label>
          <select id="dl-filter-form-status" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Status Berkas --</option>
            <option value="VERIFIED">Terverifikasi (VERIFIED)</option>
            <option value="SUBMITTED">Menunggu Verifikasi (SUBMITTED)</option>
            <option value="REVISION_REQUIRED">Perlu Revisi (REVISION_REQUIRED)</option>
            <option value="DRAFT">Draft Belum Kirim</option>
          </select>
        </div>

        <!-- Status Kelulusan -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Status Kelulusan</label>
          <select id="dl-filter-final-status" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Kelulusan --</option>
            <option value="LULUS">LULUS</option>
            <option value="CADANGAN">CADANGAN</option>
            <option value="TIDAK_LULUS">TIDAK LULUS</option>
            <option value="UNDECIDED">Belum Ditentukan</option>
          </select>
        </div>

        <!-- Status Pembayaran -->
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Status Pembayaran</label>
          <select id="dl-filter-payment" onchange="onDownloadFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <option value="">-- Semua Pembayaran --</option>
            <option value="APPROVED">Lunas / Disetujui</option>
            <option value="WAITING_VERIFICATION">Menunggu Verifikasi</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
      </div>

      <!-- Search Box -->
      <div style="position: relative;">
        <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass"></i>
        </span>
        <input type="text" id="dl-filter-search" oninput="debounceDownloadSearch()" placeholder="Cari santri berdasarkan Nama Lengkap, Nomor Pendaftaran, NISN, NIK, atau Nama Sekolah Asal..." style="width: 100%; padding: 10px 14px 10px 40px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.9rem;">
      </div>
    </div>

    <!-- Actions & Toolbar -->
    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-main);">
          <input type="checkbox" id="dl-select-all" onchange="toggleSelectAllDownload(event)" style="width: 17px; height: 17px; cursor: pointer; accent-color: #059669;">
          <span>Pilih Semua Santri di Halaman Ini</span>
        </label>
        <span id="dl-selected-pill" style="display: none; background: rgba(217, 119, 6, 0.15); color: #d97706; padding: 3px 10px; border-radius: 9999px; font-size: 0.78rem; font-weight: 700;">
          0 dipilih
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" id="btn-download-selected" onclick="downloadSelectedStudentsZip()" disabled style="background: #2563eb; color: #ffffff; border: none; padding: 9px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; opacity: 0.5; transition: all 0.2s;">
          <i class="fa-solid fa-file-zipper"></i>
          <span id="btn-download-selected-label">Download Terpilih (0)</span>
        </button>

        <button type="button" id="btn-download-all" onclick="downloadAllFilteredStudentsZip()" style="background: #059669; color: #ffffff; border: none; padding: 9px 18px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25); transition: all 0.2s;">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          <span>Download Semua Sesuai Filter</span>
        </button>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 24px;">
      <div class="table-responsive">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted);">
            <tr>
              <th style="padding: 12px 14px; width: 44px; text-align: center;">#</th>
              <th style="padding: 12px 14px; width: 50px;">No</th>
              <th style="padding: 12px 14px;">No. Pendaftaran</th>
              <th style="padding: 12px 14px;">Nama Calon Santri</th>
              <th style="padding: 12px 14px;">Lembaga &amp; Program</th>
              <th style="padding: 12px 14px;">Status Form</th>
              <th style="padding: 12px 14px;">Kelulusan</th>
              <th style="padding: 12px 14px; text-align: center;">Kelengkapan Berkas ZIP</th>
              <th style="padding: 12px 14px; text-align: right; width: 150px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="dl-table-body" style="font-size: 0.85rem;">
            <tr>
              <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: #059669;"></i>
                <div style="margin-top: 8px;">Memuat daftar data santri...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div id="dl-pagination-bar" style="padding: 14px 18px; border-top: 1px solid var(--border-subtle); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.85rem; background: var(--bg-card);">
        <div style="color: var(--text-muted);">
          Menampilkan <span id="dl-page-start" style="font-weight: 700; color: var(--text-heading);">-</span> s/d <span id="dl-page-end" style="font-weight: 700; color: var(--text-heading);">-</span> dari <span id="dl-page-total" style="font-weight: 700; color: var(--text-heading);">-</span> santri
        </div>
        <div style="display: flex; align-items: center; gap: 6px;" id="dl-pagination-buttons">
          <!-- Injected pagination controls -->
        </div>
      </div>
    </div>
  `;

  // Initialize data
  await loadExportFilterOptions();
  await fetchDownloadDataList(1);
}

/**
 * Loads dynamic filter options from backend
 */
async function loadExportFilterOptions() {
  try {
    const res = await apiRequest('/api/registrations/admin/export/filter-options');
    if (res && res.success && res.data) {
      downloadDataState.filterOptions = res.data;

      // Populate Schools
      const schoolSelect = document.getElementById('dl-filter-school');
      if (schoolSelect && res.data.schools) {
        schoolSelect.innerHTML = '<option value="">-- Semua Lembaga --</option>' +
          res.data.schools.map(s => `<option value="${s.id}">${s.name} (${s.initial || s.name})</option>`).join('');
      }

      // Populate Waves
      const waveSelect = document.getElementById('dl-filter-wave');
      if (waveSelect && res.data.waves) {
        waveSelect.innerHTML = '<option value="">-- Semua Gelombang --</option>' +
          res.data.waves.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
      }

      // Populate Periods
      const periodSelect = document.getElementById('dl-filter-period');
      if (periodSelect && res.data.periods) {
        periodSelect.innerHTML = '<option value="">-- Semua Periode --</option>' +
          res.data.periods.map(p => `<option value="${p.id}">T.P. ${p.name} ${p.isActive ? '(Aktif)' : ''}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load export filter options:', err);
  }
}

let downloadSearchTimeout = null;
function debounceDownloadSearch() {
  clearTimeout(downloadSearchTimeout);
  downloadSearchTimeout = setTimeout(() => {
    onDownloadFilterChange();
  }, 350);
}

function onDownloadFilterChange() {
  const schoolSelect = document.getElementById('dl-filter-school');
  const waveSelect = document.getElementById('dl-filter-wave');
  const periodSelect = document.getElementById('dl-filter-period');
  const formStatusSelect = document.getElementById('dl-filter-form-status');
  const finalStatusSelect = document.getElementById('dl-filter-final-status');
  const paymentSelect = document.getElementById('dl-filter-payment');
  const searchInput = document.getElementById('dl-filter-search');

  downloadDataState.filters.schoolId = schoolSelect ? schoolSelect.value : '';
  downloadDataState.filters.admissionWaveId = waveSelect ? waveSelect.value : '';
  downloadDataState.filters.academicPeriodId = periodSelect ? periodSelect.value : '';
  downloadDataState.filters.formStatus = formStatusSelect ? formStatusSelect.value : '';
  downloadDataState.filters.finalStatus = finalStatusSelect ? finalStatusSelect.value : '';
  downloadDataState.filters.paymentStatus = paymentSelect ? paymentSelect.value : '';
  downloadDataState.filters.search = searchInput ? searchInput.value.trim() : '';

  fetchDownloadDataList(1);
}

function resetDownloadFilters() {
  const schoolSelect = document.getElementById('dl-filter-school');
  const waveSelect = document.getElementById('dl-filter-wave');
  const periodSelect = document.getElementById('dl-filter-period');
  const formStatusSelect = document.getElementById('dl-filter-form-status');
  const finalStatusSelect = document.getElementById('dl-filter-final-status');
  const paymentSelect = document.getElementById('dl-filter-payment');
  const searchInput = document.getElementById('dl-filter-search');

  if (schoolSelect) schoolSelect.value = '';
  if (waveSelect) waveSelect.value = '';
  if (periodSelect) periodSelect.value = '';
  if (formStatusSelect) formStatusSelect.value = '';
  if (finalStatusSelect) finalStatusSelect.value = '';
  if (paymentSelect) paymentSelect.value = '';
  if (searchInput) searchInput.value = '';

  downloadDataState.filters = {
    schoolId: '',
    admissionWaveId: '',
    academicPeriodId: '',
    formStatus: '',
    finalStatus: '',
    paymentStatus: '',
    search: '',
  };

  fetchDownloadDataList(1);
}

/**
 * Fetches preview list of students matching filter
 */
async function fetchDownloadDataList(page = 1) {
  downloadDataState.loading = true;
  downloadDataState.pagination.page = page;

  const tbody = document.getElementById('dl-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: #059669;"></i>
          <div style="margin-top: 8px;">Memperbarui daftar santri...</div>
        </td>
      </tr>
    `;
  }

  try {
    const f = downloadDataState.filters;
    const queryParams = new URLSearchParams({
      page: String(page),
      perPage: String(downloadDataState.pagination.perPage),
    });

    if (f.schoolId) queryParams.set('schoolId', f.schoolId);
    if (f.admissionWaveId) queryParams.set('admissionWaveId', f.admissionWaveId);
    if (f.academicPeriodId) queryParams.set('academicPeriodId', f.academicPeriodId);
    if (f.formStatus) queryParams.set('formStatus', f.formStatus);
    if (f.finalStatus) queryParams.set('finalStatus', f.finalStatus);
    if (f.paymentStatus) queryParams.set('paymentStatus', f.paymentStatus);
    if (f.search) queryParams.set('search', f.search);

    const res = await apiRequest(`/api/registrations/admin/export/preview-list?${queryParams.toString()}`);

    if (res && res.success) {
      downloadDataState.items = res.data || [];
      downloadDataState.pagination = res.pagination || {
        page,
        perPage: 25,
        total: res.data.length,
        totalPages: 1,
      };

      // Update counters
      const totalCount = res.pagination ? res.pagination.total : res.data.length;
      const elTotal = document.getElementById('dl-stat-total');
      if (elTotal) elTotal.innerText = totalCount.toLocaleString('id-ID');

      // Count verified and passed in current view
      const verifiedCount = downloadDataState.items.filter(x => x.formStatus === 'VERIFIED').length;
      const passedCount = downloadDataState.items.filter(x => x.finalStatus === 'LULUS').length;

      const elVerified = document.getElementById('dl-stat-verified');
      if (elVerified) elVerified.innerText = `${verifiedCount}`;

      const elPassed = document.getElementById('dl-stat-passed');
      if (elPassed) elPassed.innerText = `${passedCount}`;

      renderDownloadDataTable();
      renderDownloadPagination();
    } else {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--danger-500);">Gagal memuat data.</td></tr>`;
      }
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--danger-500);">${err.message}</td></tr>`;
    }
  } finally {
    downloadDataState.loading = false;
  }
}

/**
 * Builds table rows
 */
function renderDownloadDataTable() {
  const tbody = document.getElementById('dl-table-body');
  if (!tbody) return;

  const items = downloadDataState.items;
  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 10px;"></i>
          <div>Tidak ada data santri yang cocok dengan kriteria filter saat ini.</div>
        </td>
      </tr>
    `;
    updateSelectionUI();
    return;
  }

  const startIndex = (downloadDataState.pagination.page - 1) * downloadDataState.pagination.perPage;

  tbody.innerHTML = items.map((reg, idx) => {
    const isChecked = downloadDataState.selectedIds.has(reg.id);
    const num = startIndex + idx + 1;

    // Form Status Badge
    let formBadge = `<span style="background: rgba(148, 163, 184, 0.15); color: #64748b; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">DRAFT</span>`;
    if (reg.formStatus === 'VERIFIED') {
      formBadge = `<span style="background: rgba(5, 150, 105, 0.15); color: #059669; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;"><i class="fa-solid fa-check"></i> VERIFIED</span>`;
    } else if (reg.formStatus === 'SUBMITTED') {
      formBadge = `<span style="background: rgba(37, 99, 235, 0.15); color: #2563eb; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;"><i class="fa-solid fa-clock"></i> SUBMITTED</span>`;
    } else if (reg.formStatus === 'REVISION_REQUIRED') {
      formBadge = `<span style="background: rgba(220, 38, 38, 0.15); color: #dc2626; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;"><i class="fa-solid fa-circle-exclamation"></i> REVISI</span>`;
    }

    // Final Status Badge
    let finalBadge = `<span style="color: var(--text-dim); font-size: 0.75rem;">-</span>`;
    if (reg.finalStatus === 'LULUS') {
      finalBadge = `<span style="background: #059669; color: #ffffff; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 800;">LULUS</span>`;
    } else if (reg.finalStatus === 'CADANGAN') {
      finalBadge = `<span style="background: #d97706; color: #ffffff; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 800;">CADANGAN</span>`;
    } else if (reg.finalStatus === 'TIDAK_LULUS') {
      finalBadge = `<span style="background: #dc2626; color: #ffffff; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 800;">TIDAK LULUS</span>`;
    }

    // Document inclusion badges
    const ds = reg.documentSummary || {};
    const photoIcon = ds.hasPhoto
      ? `<span title="Pas Foto Santri: Tersedia" style="color: #059669;"><i class="fa-solid fa-image"></i></span>`
      : `<span title="Pas Foto Santri: Belum Diupload" style="color: #cbd5e1;"><i class="fa-solid fa-image"></i></span>`;

    const kkIcon = ds.hasKK
      ? `<span title="Kartu Keluarga: Tersedia" style="color: #059669;"><i class="fa-solid fa-id-card"></i></span>`
      : `<span title="Kartu Keluarga: Belum Diupload" style="color: #cbd5e1;"><i class="fa-solid fa-id-card"></i></span>`;

    const aktaIcon = ds.hasAkta
      ? `<span title="Akta Kelahiran: Tersedia" style="color: #059669;"><i class="fa-solid fa-certificate"></i></span>`
      : `<span title="Akta Kelahiran: Belum Diupload" style="color: #cbd5e1;"><i class="fa-solid fa-certificate"></i></span>`;

    const ijazahIcon = ds.hasIjazah
      ? `<span title="Ijazah / SKL: Tersedia" style="color: #059669;"><i class="fa-solid fa-graduation-cap"></i></span>`
      : `<span title="Ijazah / SKL: Belum Diupload" style="color: #cbd5e1;"><i class="fa-solid fa-graduation-cap"></i></span>`;

    const payIcon = ds.hasPayment
      ? `<span title="Bukti Pembayaran: Tersedia" style="color: #059669;"><i class="fa-solid fa-receipt"></i></span>`
      : `<span title="Bukti Pembayaran: Belum Tersedia" style="color: #cbd5e1;"><i class="fa-solid fa-receipt"></i></span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s; ${isChecked ? 'background: rgba(5, 150, 105, 0.05);' : ''}">
        <td style="padding: 12px 14px; text-align: center;">
          <input type="checkbox" class="dl-row-checkbox" value="${reg.id}" onchange="toggleSelectDownloadItem('${reg.id}')" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #059669;">
        </td>
        <td style="padding: 12px 14px; color: var(--text-muted);">${num}</td>
        <td style="padding: 12px 14px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="font-weight: 800; color: #059669; background: rgba(5, 150, 105, 0.08); padding: 2px 6px; border-radius: 4px;">${reg.registrationNumber}</code>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 3px;">ZIP: <code>${reg.zipFilename}</code></div>
        </td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: var(--text-heading);">${reg.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">NISN: ${reg.nisn} &bull; JK: ${reg.gender}</div>
        </td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 600; color: var(--text-main);">${reg.schoolInitial} &mdash; ${reg.programName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${reg.waveName} (${reg.periodName})</div>
        </td>
        <td style="padding: 12px 14px;">${formBadge}</td>
        <td style="padding: 12px 14px;">${finalBadge}</td>
        <td style="padding: 12px 14px; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.95rem; background: var(--bg-body); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
            <span title="Formulir PDF Resmi (Generated)" style="color: #ef4444;"><i class="fa-solid fa-file-pdf"></i></span>
            <span title="Formulir Excel (Generated)" style="color: #10b981;"><i class="fa-solid fa-file-excel"></i></span>
            <span style="color: var(--border-subtle);">|</span>
            ${photoIcon}
            ${kkIcon}
            ${aktaIcon}
            ${ijazahIcon}
            ${payIcon}
          </div>
        </td>
        <td style="padding: 12px 14px; text-align: right;">
          <button type="button" onclick="downloadSingleStudentZip('${reg.id}', '${reg.zipFilename}')" title="Unduh Arsip ZIP Santri Ini" style="background: #059669; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s;">
            <i class="fa-solid fa-file-zipper"></i> Download ZIP
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectionUI();
}

/**
 * Updates selection checkbox state and counter badges
 */
function updateSelectionUI() {
  const items = downloadDataState.items;
  const selectAll = document.getElementById('dl-select-all');
  if (selectAll && items.length > 0) {
    const allChecked = items.every(x => downloadDataState.selectedIds.has(x.id));
    const someChecked = items.some(x => downloadDataState.selectedIds.has(x.id));
    selectAll.checked = allChecked;
    selectAll.indeterminate = someChecked && !allChecked;
  } else if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }

  const selectedCount = downloadDataState.selectedIds.size;
  const elSelectedStat = document.getElementById('dl-stat-selected');
  if (elSelectedStat) elSelectedStat.innerText = selectedCount;

  const pill = document.getElementById('dl-selected-pill');
  if (pill) {
    if (selectedCount > 0) {
      pill.style.display = 'inline-block';
      pill.innerText = `${selectedCount} dipilih`;
    } else {
      pill.style.display = 'none';
    }
  }

  const btnSelected = document.getElementById('btn-download-selected');
  const btnLabel = document.getElementById('btn-download-selected-label');
  if (btnSelected && btnLabel) {
    btnLabel.innerText = `Download Terpilih (${selectedCount})`;
    if (selectedCount > 0) {
      btnSelected.disabled = false;
      btnSelected.style.opacity = '1';
    } else {
      btnSelected.disabled = true;
      btnSelected.style.opacity = '0.5';
    }
  }
}

function toggleSelectAllDownload(e) {
  const checked = e.target.checked;
  downloadDataState.items.forEach(item => {
    if (checked) {
      downloadDataState.selectedIds.add(item.id);
    } else {
      downloadDataState.selectedIds.delete(item.id);
    }
  });
  renderDownloadDataTable();
}

function toggleSelectDownloadItem(id) {
  if (downloadDataState.selectedIds.has(id)) {
    downloadDataState.selectedIds.delete(id);
  } else {
    downloadDataState.selectedIds.add(id);
  }
  renderDownloadDataTable();
}

/**
 * Render pagination numbers
 */
function renderDownloadPagination() {
  const p = downloadDataState.pagination;
  const elStart = document.getElementById('dl-page-start');
  const elEnd = document.getElementById('dl-page-end');
  const elTotal = document.getElementById('dl-page-total');
  const btnContainer = document.getElementById('dl-pagination-buttons');

  if (!btnContainer) return;

  const start = p.total === 0 ? 0 : (p.page - 1) * p.perPage + 1;
  const end = Math.min(p.page * p.perPage, p.total);

  if (elStart) elStart.innerText = start;
  if (elEnd) elEnd.innerText = end;
  if (elTotal) elTotal.innerText = p.total.toLocaleString('id-ID');

  let html = '';

  // Prev button
  html += `
    <button type="button" onclick="fetchDownloadDataList(${p.page - 1})" ${p.page <= 1 ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.8rem; cursor: pointer; ${p.page <= 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  // Page Numbers
  for (let i = 1; i <= p.totalPages; i++) {
    if (i === 1 || i === p.totalPages || (i >= p.page - 1 && i <= p.page + 1)) {
      const active = i === p.page;
      html += `
        <button type="button" onclick="fetchDownloadDataList(${i})" style="padding: 6px 12px; border: 1px solid ${active ? '#059669' : 'var(--border-subtle)'}; background: ${active ? '#059669' : 'var(--bg-card)'}; color: ${active ? '#ffffff' : 'var(--text-main)'}; border-radius: var(--radius-md); font-size: 0.8rem; font-weight: ${active ? '700' : '400'}; cursor: pointer;">
          ${i}
        </button>
      `;
    } else if (i === p.page - 2 || i === p.page + 2) {
      html += `<span style="padding: 0 4px; color: var(--text-dim);">...</span>`;
    }
  }

  // Next button
  html += `
    <button type="button" onclick="fetchDownloadDataList(${p.page + 1})" ${p.page >= p.totalPages ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.8rem; cursor: pointer; ${p.page >= p.totalPages ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  btnContainer.innerHTML = html;
}

/**
 * Downloads a single student ZIP
 */
async function downloadSingleStudentZip(id, fallbackFilename) {
  if (downloadDataState.isDownloading) {
    if (typeof showToast === 'function') showToast('Proses download lain sedang berjalan. Harap tunggu.', 'warning');
    return;
  }

  downloadDataState.isDownloading = true;
  if (typeof showToast === 'function') {
    showToast(`Sedang menyiapkan arsip ZIP ${fallbackFilename}...`, 'info');
  }

  try {
    const token = state.token || safeStorage.getItem('lomba_jwt_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`/api/registrations/admin/export/single/${id}`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!resp.ok) {
      let errMsg = `Gagal mengunduh ZIP (${resp.status})`;
      try {
        const errJson = await resp.json();
        if (errJson && errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg);
    }

    let downloadFilename = fallbackFilename;
    const disp = resp.headers.get('content-disposition');
    if (disp && disp.includes('filename=')) {
      const match = disp.match(/filename="?([^";]+)"?/);
      if (match && match[1]) downloadFilename = match[1];
    }

    const blob = await resp.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 2000);

    if (typeof showToast === 'function') {
      showToast(`Berhasil mengunduh arsip ${downloadFilename}!`, 'success');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    } else {
      alert(err.message);
    }
  } finally {
    downloadDataState.isDownloading = false;
  }
}

/**
 * Downloads selected students ZIP (batch)
 */
async function downloadSelectedStudentsZip() {
  const selectedIds = Array.from(downloadDataState.selectedIds);
  if (selectedIds.length === 0) {
    if (typeof showToast === 'function') showToast('Pilih setidaknya 1 santri terlebih dahulu.', 'warning');
    return;
  }

  if (downloadDataState.isDownloading) {
    if (typeof showToast === 'function') showToast('Proses download sedang berlangsung. Harap tunggu.', 'warning');
    return;
  }

  // If exactly 1 student selected, download their individual ZIP directly!
  if (selectedIds.length === 1) {
    const single = downloadDataState.items.find(x => x.id === selectedIds[0]);
    const fn = single ? single.zipFilename : `santri_${selectedIds[0]}.zip`;
    await downloadSingleStudentZip(selectedIds[0], fn);
    return;
  }

  downloadDataState.isDownloading = true;
  if (typeof showToast === 'function') {
    showToast(`Sedang membuat paket ZIP masal untuk ${selectedIds.length} santri...`, 'info');
  }

  try {
    const token = state.token || safeStorage.getItem('lomba_jwt_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch('/api/registrations/admin/export/batch', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ registrationIds: selectedIds }),
    });

    if (!resp.ok) {
      let errMsg = `Gagal mengunduh ZIP masal (${resp.status})`;
      try {
        const errJson = await resp.json();
        if (errJson && errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg);
    }

    let downloadFilename = `DOWNLOAD_DATA_${selectedIds.length}_SANTRI.zip`;
    const disp = resp.headers.get('content-disposition');
    if (disp && disp.includes('filename=')) {
      const match = disp.match(/filename="?([^";]+)"?/);
      if (match && match[1]) downloadFilename = match[1];
    }

    const blob = await resp.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 2000);

    if (typeof showToast === 'function') {
      showToast(`Berhasil mengunduh ${selectedIds.length} arsip ZIP santri!`, 'success');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    } else {
      alert(err.message);
    }
  } finally {
    downloadDataState.isDownloading = false;
  }
}

/**
 * Downloads all students matching filter
 */
async function downloadAllFilteredStudentsZip() {
  const total = downloadDataState.pagination.total;
  if (total === 0) {
    if (typeof showToast === 'function') showToast('Tidak ada data santri yang memenuhi filter saat ini.', 'warning');
    return;
  }

  if (downloadDataState.isDownloading) {
    if (typeof showToast === 'function') showToast('Proses download sedang berlangsung. Harap tunggu.', 'warning');
    return;
  }

  const ok = confirm(`Apakah Anda yakin ingin mengunduh seluruh data santri (${total} santri) sesuai filter saat ini?\nSetiap santri akan dibungkus dalam 1 file ZIP tersendiri [NAMA_Nomorpendaftaran].zip`);
  if (!ok) return;

  downloadDataState.isDownloading = true;
  if (typeof showToast === 'function') {
    showToast(`Sedang mengemas seluruh arsip ZIP (${total} santri), mohon tunggu...`, 'info');
  }

  try {
    const f = downloadDataState.filters;
    const payload = {};
    if (f.schoolId) payload.schoolId = f.schoolId;
    if (f.admissionWaveId) payload.admissionWaveId = f.admissionWaveId;
    if (f.academicPeriodId) payload.academicPeriodId = f.academicPeriodId;
    if (f.formStatus) payload.formStatus = f.formStatus;
    if (f.finalStatus) payload.finalStatus = f.finalStatus;
    if (f.paymentStatus) payload.paymentStatus = f.paymentStatus;
    if (f.search) payload.search = f.search;

    const token = state.token || safeStorage.getItem('lomba_jwt_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch('/api/registrations/admin/export/batch', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      let errMsg = `Gagal mengunduh arsip masal (${resp.status})`;
      try {
        const errJson = await resp.json();
        if (errJson && errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg);
    }

    let downloadFilename = `DOWNLOAD_DATA_PSB_${total}_SANTRI.zip`;
    const disp = resp.headers.get('content-disposition');
    if (disp && disp.includes('filename=')) {
      const match = disp.match(/filename="?([^";]+)"?/);
      if (match && match[1]) downloadFilename = match[1];
    }

    const blob = await resp.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 2000);

    if (typeof showToast === 'function') {
      showToast(`Berhasil mengunduh seluruh data (${total} santri)!`, 'success');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'danger');
    } else {
      alert(err.message);
    }
  } finally {
    downloadDataState.isDownloading = false;
  }
}

// Expose globally so router & inline event handlers can call it
window.renderAdminDownloadDataView = renderAdminDownloadDataView;
window.onDownloadFilterChange = onDownloadFilterChange;
window.resetDownloadFilters = resetDownloadFilters;
window.debounceDownloadSearch = debounceDownloadSearch;
window.fetchDownloadDataList = fetchDownloadDataList;
window.toggleSelectAllDownload = toggleSelectAllDownload;
window.toggleSelectDownloadItem = toggleSelectDownloadItem;
window.downloadSingleStudentZip = downloadSingleStudentZip;
window.downloadSelectedStudentsZip = downloadSelectedStudentsZip;
window.downloadAllFilteredStudentsZip = downloadAllFilteredStudentsZip;
