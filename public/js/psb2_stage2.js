// Helper to get auth token query param for direct document/file links
function getAuthTokenForUrl() {
  try {
    const t = (typeof state !== 'undefined' && state?.token)
      || (typeof safeStorage !== 'undefined' && safeStorage?.getItem('lomba_jwt_token'))
      || localStorage.getItem('lomba_jwt_token')
      || '';
    return t ? `?token=${encodeURIComponent(t)}` : '';
  } catch (e) {
    return '';
  }
}

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; max-width: 380px; pointer-events: none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  let bg = '#0284c7';
  let icon = 'fa-circle-info';
  if (type === 'success') {
    bg = '#16a34a';
    icon = 'fa-circle-check';
  } else if (type === 'error' || type === 'danger') {
    bg = '#dc2626';
    icon = 'fa-circle-exclamation';
  } else if (type === 'warning') {
    bg = '#d97706';
    icon = 'fa-triangle-exclamation';
  }

  toast.style.cssText = `
    background: ${bg};
    color: #ffffff;
    padding: 12px 18px;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="font-size: 1.2rem; flex-shrink: 0;"></i>
    <div style="flex: 1; line-height: 1.4;">${message}</div>
    <button type="button" style="background: none; border: none; color: rgba(255,255,255,0.8); font-size: 1.2rem; cursor: pointer; padding: 0; line-height: 1;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
window.showToast = showToast;

// Global Modal Helpers
function openModal(title = '', bodyHtml = '', sizeClass = '') {
  const modal = document.getElementById('app-modal');
  const body = document.getElementById('app-modal-body');
  if (!modal || !body) return;

  if (sizeClass === 'modal-xl') {
    body.style.maxWidth = '960px';
  } else if (sizeClass === 'modal-lg') {
    body.style.maxWidth = '750px';
  } else {
    body.style.maxWidth = '550px';
  }

  if (bodyHtml) {
    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
        <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0; font-weight: 800;">${title || 'Informasi'}</h3>
        <button type="button" onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; line-height: 1;">&times;</button>
      </div>
      <div class="modal-inner-content">
        ${bodyHtml}
      </div>
    `;
  }
  modal.classList.add('active', 'open', 'show');
  modal.style.display = 'flex';
}
window.openModal = openModal;

function closeModal() {
  const modal = document.getElementById('app-modal');
  if (modal) {
    modal.classList.remove('active', 'open', 'show');
    modal.style.display = 'none';
  }
}
window.closeModal = closeModal;

function getFormStatusBadge(formStatus) {
  switch (formStatus) {
    case 'LOCKED':
      return '<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.3);"><i class="fa-solid fa-lock"></i> Terkunci</span>';
    case 'DRAFT':
      return '<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.3);"><i class="fa-solid fa-pen-to-square"></i> Draft</span>';
    case 'SUBMITTED':
      return '<span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #b45309; border: 1px solid rgba(234, 179, 8, 0.3);"><i class="fa-solid fa-clock"></i> Menunggu Verifikasi</span>';
    case 'UNDER_REVIEW':
      return '<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #7e22ce; border: 1px solid rgba(168, 85, 247, 0.3);"><i class="fa-solid fa-magnifying-glass"></i> Sedang Diperiksa</span>';
    case 'REVISION_REQUIRED':
      return '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3);"><i class="fa-solid fa-triangle-exclamation"></i> Perlu Revisi</span>';
    case 'VERIFIED':
      return '<span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.3);"><i class="fa-solid fa-circle-check"></i> Terverifikasi</span>';
    default:
      return '<span class="badge badge-secondary">-</span>';
  }
}

// ============================================================================
// 1. MASTER DATA: PERIODE TAHUN PELAJARAN (SUPER ADMIN)
// ============================================================================

async function renderAdminPeriodsView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat master periode tahun pelajaran...</div>';

  try {
    const res = await apiRequest('/api/competitions/periods');
    const periods = res.success ? res.data : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Periode Tahun Pelajaran</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Kelola tahun pelajaran PSB. Hanya 1 (satu) periode yang dapat berstatus aktif pada satu waktu.</p>
        </div>
        <button class="btn btn-primary" onclick="openCreatePeriodModal()"><i class="fa-solid fa-plus"></i> Tambah Periode</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        ${periods.length === 0 ? '<div class="alert alert-info">Belum ada periode tahun pelajaran.</div>' : periods.map(p => `
          <div class="card" style="background: var(--bg-card); border: 2px solid ${p.isActive ? 'var(--primary-500)' : 'var(--border-subtle)'}; border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h3 style="font-size: 1.3rem; color: var(--text-heading); margin: 0;">
                  <i class="fa-solid fa-calendar-days" style="color: ${p.isActive ? 'var(--primary-500)' : 'var(--text-dim)'}; margin-right: 8px;"></i>
                  ${p.name}
                </h3>
                <span class="badge ${p.isActive ? 'badge-success' : 'badge-danger'}">${p.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
              </div>
              <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 16px;">
                <div>Jumlah Gelombang: <strong>${p.admissionWaves?.length || 0} Gelombang</strong></div>
                <div>Total Pendaftar: <strong>${p._count?.registrations || 0} Calon Santri</strong></div>
              </div>
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
              <button class="btn btn-sm btn-secondary" onclick="openEditPeriodModal('${p.id}', '${p.name}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              <button class="btn btn-sm ${p.isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="togglePeriodStatus('${p.id}')">
                ${p.isActive ? 'Nonaktifkan' : '<i class="fa-solid fa-circle-check"></i> Aktifkan'}
              </button>
              <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" title="Hapus Periode" onclick="executeDeletePeriod('${p.id}', '${p.name}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function openCreatePeriodModal() {
  openModal('Tambah Periode Tahun Pelajaran', `
    <form id="create-period-form" onsubmit="submitCreatePeriod(event)">
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Periode / Tahun Pelajaran</label>
        <input type="text" id="m-period-name" class="form-control" placeholder="Contoh: 2026/2027" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem;">
          <input type="checkbox" id="m-period-active" style="width: 16px; height: 16px;">
          <span>Set sebagai <strong>Periode Aktif</strong> (otomatis menonaktifkan periode lain)</span>
        </label>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-save-period" class="btn btn-primary"><i class="fa-solid fa-save"></i> Simpan Periode</button>
      </div>
    </form>
  `);
}

async function submitCreatePeriod(e) {
  e.preventDefault();
  const name = document.getElementById('m-period-name').value;
  const isActive = document.getElementById('m-period-active').checked;
  const btn = document.getElementById('btn-save-period');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await apiRequest('/api/competitions/periods', {
      method: 'POST',
      body: { name, isActive },
    });
    if (res.success) {
      showToast('Periode berhasil dibuat.', 'success');
      closeModal();
      renderAdminPeriodsView();
    } else {
      alert(res.message || 'Gagal membuat periode.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Periode';
  }
}

function openEditPeriodModal(id, currentName) {
  openModal('Edit Periode Tahun Pelajaran', `
    <form id="edit-period-form" onsubmit="submitEditPeriod(event, '${id}')">
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Periode / Tahun Pelajaran</label>
        <input type="text" id="m-edit-period-name" class="form-control" value="${currentName}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-update-period" class="btn btn-primary"><i class="fa-solid fa-save"></i> Perbarui</button>
      </div>
    </form>
  `);
}

async function submitEditPeriod(e, id) {
  e.preventDefault();
  const name = document.getElementById('m-edit-period-name').value;
  const btn = document.getElementById('btn-update-period');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memperbarui...';

  try {
    const res = await apiRequest(`/api/competitions/periods/${id}`, {
      method: 'PATCH',
      body: { name },
    });
    if (res.success) {
      showToast('Periode berhasil diperbarui.', 'success');
      closeModal();
      renderAdminPeriodsView();
    } else {
      alert(res.message || 'Gagal memperbarui periode.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Perbarui';
  }
}

async function togglePeriodStatus(id) {
  try {
    const res = await apiRequest(`/api/competitions/periods/${id}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message || 'Status periode berhasil diubah.', 'success');
      renderAdminPeriodsView();
    } else {
      alert(res.message || 'Gagal mengubah status periode.');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function executeDeletePeriod(id, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus periode "${name}"?`)) return;
  try {
    const res = await apiRequest(`/api/competitions/periods/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Periode berhasil dihapus.', 'success');
      renderAdminPeriodsView();
    } else {
      alert(res.message || 'Gagal menghapus periode.');
    }
  } catch (err) {
    alert(err.message);
  }
}

// ============================================================================
// 2. MASTER DATA: GELOMBANG PENDAFTARAN (SUPER ADMIN)
// ============================================================================

async function renderAdminWavesView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat master gelombang pendaftaran...</div>';

  try {
    const res = await apiRequest('/api/competitions/waves');
    const waves = res.success ? res.data : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Gelombang Pendaftaran</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Kelola gelombang pendaftaran, jadwal pembukaan/penutupan, dan biaya formulir pendaftaran.</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateWaveModal()"><i class="fa-solid fa-plus"></i> Tambah Gelombang</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px;">
        ${waves.length === 0 ? '<div class="alert alert-info">Belum ada gelombang pendaftaran.</div>' : waves.map(w => {
      const now = new Date();
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      const isDateActive = now >= start && now <= end;

      return `
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <span class="badge badge-primary" style="margin-bottom: 4px;"><i class="fa-solid fa-calendar"></i> Periode ${w.academicPeriod?.name || '-'}</span>
                    <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 2px 0;">${w.name}</h3>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${w.isActive ? 'badge-success' : 'badge-danger'}">${w.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                    <div style="font-size: 0.75rem; margin-top: 4px; color: ${isDateActive ? 'var(--success-600)' : 'var(--text-dim)'};">
                      ${isDateActive ? '● Sedang Berlangsung' : (now < start ? '○ Belum Dibuka' : '✕ Sudah Berakhir')}
                    </div>
                  </div>
                </div>

                <div style="background: var(--bg-body); border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 0.875rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: var(--text-muted);">Mulai:</span>
                    <strong>${formatDate(w.startDate)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: var(--text-muted);">Berakhir:</span>
                    <strong>${formatDate(w.endDate)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 6px; margin-top: 4px;">
                    <span style="color: var(--text-muted);">Biaya Formulir:</span>
                    <strong style="color: var(--primary-600); font-size: 1.05rem;">${formatCurrency(w.registrationFee)}</strong>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                <button class="btn btn-sm btn-secondary" onclick="openEditWaveModal('${w.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="btn btn-sm ${w.isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="toggleWaveStatus('${w.id}')">
                  ${w.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" title="Hapus Gelombang" onclick="executeDeleteWave('${w.id}', '${w.name}')"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function openCreateWaveModal() {
  const pRes = await apiRequest('/api/competitions/periods');
  const periods = pRes.success ? pRes.data : [];

  openModal('Tambah Gelombang Pendaftaran', `
    <form id="create-wave-form" onsubmit="submitCreateWave(event)">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih Periode Tahun Pelajaran</label>
        <select id="m-wave-period" class="form-select" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="">-- Pilih Periode --</option>
          ${periods.map(p => `<option value="${p.id}" ${p.isActive ? 'selected' : ''}>${p.name} ${p.isActive ? '(Aktif)' : ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Gelombang</label>
        <input type="text" id="m-wave-name" class="form-control" placeholder="Contoh: Gelombang 1" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div class="form-group">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Tanggal Mulai</label>
          <input type="date" id="m-wave-start" class="form-control" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
        <div class="form-group">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Tanggal Berakhir</label>
          <input type="date" id="m-wave-end" class="form-control" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Biaya Pendaftaran (Rp)</label>
        <input type="number" id="m-wave-fee" class="form-control" placeholder="500000" min="0" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-save-wave" class="btn btn-primary"><i class="fa-solid fa-save"></i> Simpan Gelombang</button>
      </div>
    </form>
  `);
}

async function submitCreateWave(e) {
  e.preventDefault();
  const academicPeriodId = document.getElementById('m-wave-period').value;
  const name = document.getElementById('m-wave-name').value;
  const startDate = document.getElementById('m-wave-start').value;
  const endDate = document.getElementById('m-wave-end').value;
  const registrationFee = Number(document.getElementById('m-wave-fee').value);
  const btn = document.getElementById('btn-save-wave');

  if (new Date(startDate) >= new Date(endDate)) {
    alert('Tanggal mulai gelombang harus sebelum tanggal berakhir.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await apiRequest('/api/competitions/waves', {
      method: 'POST',
      body: { academicPeriodId, name, startDate, endDate, registrationFee, isActive: true },
    });
    if (res.success) {
      showToast('Gelombang berhasil dibuat.', 'success');
      closeModal();
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal membuat gelombang.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Gelombang';
  }
}

async function openEditWaveModal(waveId) {
  const [wRes, pRes] = await Promise.all([
    apiRequest('/api/competitions/waves'),
    apiRequest('/api/competitions/periods'),
  ]);
  const wave = (wRes.data || []).find(w => w.id === waveId);
  const periods = pRes.data || [];
  if (!wave) return;

  const startVal = new Date(wave.startDate).toISOString().split('T')[0];
  const endVal = new Date(wave.endDate).toISOString().split('T')[0];

  openModal('Edit Gelombang Pendaftaran', `
    <form id="edit-wave-form" onsubmit="submitEditWave(event, '${waveId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih Periode</label>
        <select id="m-edit-wave-period" class="form-select" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          ${periods.map(p => `<option value="${p.id}" ${p.id === wave.academicPeriodId ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Gelombang</label>
        <input type="text" id="m-edit-wave-name" class="form-control" value="${wave.name}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div class="form-group">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Tanggal Mulai</label>
          <input type="date" id="m-edit-wave-start" class="form-control" value="${startVal}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
        <div class="form-group">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Tanggal Berakhir</label>
          <input type="date" id="m-edit-wave-end" class="form-control" value="${endVal}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Biaya Pendaftaran (Rp)</label>
        <input type="number" id="m-edit-wave-fee" class="form-control" value="${Number(wave.registrationFee)}" min="0" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-update-wave" class="btn btn-primary"><i class="fa-solid fa-save"></i> Perbarui</button>
      </div>
    </form>
  `);
}

async function submitEditWave(e, id) {
  e.preventDefault();
  const academicPeriodId = document.getElementById('m-edit-wave-period').value;
  const name = document.getElementById('m-edit-wave-name').value;
  const startDate = document.getElementById('m-edit-wave-start').value;
  const endDate = document.getElementById('m-edit-wave-end').value;
  const registrationFee = Number(document.getElementById('m-edit-wave-fee').value);
  const btn = document.getElementById('btn-update-wave');

  if (new Date(startDate) >= new Date(endDate)) {
    alert('Tanggal mulai gelombang harus sebelum tanggal berakhir.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memperbarui...';

  try {
    const res = await apiRequest(`/api/competitions/waves/${id}`, {
      method: 'PATCH',
      body: { academicPeriodId, name, startDate, endDate, registrationFee },
    });
    if (res.success) {
      showToast('Gelombang berhasil diperbarui.', 'success');
      closeModal();
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal memperbarui gelombang.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Perbarui';
  }
}

async function toggleWaveStatus(id) {
  try {
    const res = await apiRequest(`/api/competitions/waves/${id}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message || 'Status gelombang berhasil diubah.', 'success');
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal mengubah status.');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function executeDeleteWave(id, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus gelombang "${name}"?`)) return;
  try {
    const res = await apiRequest(`/api/competitions/waves/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Gelombang berhasil dihapus.', 'success');
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal menghapus gelombang.');
    }
  } catch (err) {
    alert(err.message);
  }
}

// ============================================================================
// 3. VERIFIKASI DATA CALON SANTRI (SUPER ADMIN)
// ============================================================================

async function renderAdminVerificationView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat antrean verifikasi berkas calon santri...</div>';

  try {
    const res = await apiRequest('/api/registrations/admin/verification-list');
    const items = res.success ? (res.data || []) : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Verifikasi Data Calon Santri</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Periksa kelengkapan biodata, dokumen persyaratan, dan validasi data pendaftaran calon santri baru.</p>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          <input type="text" id="verif-search" placeholder="Cari nama / nomor pendaftaran / NIK..." class="form-control" oninput="filterVerificationTable()" style="flex: 1; min-width: 240px; padding: 9px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <select id="verif-status-filter" class="form-select" onchange="filterVerificationTable()" style="padding: 9px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <option value="">-- Semua Status Formulir --</option>
            <option value="SUBMITTED">Menunggu Verifikasi (SUBMITTED)</option>
            <option value="REVISION_REQUIRED">Perlu Revisi (REVISION_REQUIRED)</option>
            <option value="VERIFIED">Terverifikasi (VERIFIED)</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      <!-- Data Table -->
      <div class="table-responsive card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden;">
        <table class="table" id="table-verification-list" style="width: 100%; border-collapse: collapse;">
          <thead style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); text-align: left; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
            <tr>
              <th style="padding: 12px 16px;">No. Pendaftaran</th>
              <th style="padding: 12px 16px;">Nama Calon Santri</th>
              <th style="padding: 12px 16px;">Pilihan Sekolah & Program</th>
              <th style="padding: 12px 16px;">Gelombang</th>
              <th style="padding: 12px 16px;">Status Form</th>
              <th style="padding: 12px 16px; text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="verif-table-body" style="font-size: 0.875rem;">
            ${items.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Belum ada berkas pendaftaran yang dikirim.</td></tr>' : items.map(reg => `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 12px 16px;">
                  <code style="font-weight: 700; color: var(--primary-600);">${reg.registrationNumber}</code>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(reg.submittedAt || reg.createdAt)}</div>
                </td>
                <td style="padding: 12px 16px;">
                  <div style="font-weight: 700; color: var(--text-heading);">${reg.studentDetail?.fullName || reg.individualParticipant?.fullName || '-'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">NIK: ${reg.studentDetail?.nik || '-'} | Asal: ${reg.studentDetail?.previousSchoolName || reg.individualParticipant?.schoolName || '-'}</div>
                </td>
                <td style="padding: 12px 16px;">
                  <div><strong>${reg.schoolName || '-'}</strong></div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${reg.majorName || '-'} &bull; ${reg.classProgramName || '-'}</div>
                </td>
                <td style="padding: 12px 16px;">
                  <span class="badge badge-secondary">${reg.admissionWave?.name || '-'}</span>
                </td>
                <td style="padding: 12px 16px;">
                  ${getFormStatusBadge(reg.formStatus)}
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  <button class="btn btn-sm btn-primary" onclick="openAdminVerificationDetailModal('${reg.id}')">
                    <i class="fa-solid fa-file-circle-check"></i> Periksa Berkas
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function filterVerificationTable() {
  const q = (document.getElementById('verif-search')?.value || '').toLowerCase();
  const st = document.getElementById('verif-status-filter')?.value;
  const rows = document.querySelectorAll('#verif-table-body tr');

  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    const matchQ = !q || text.includes(q);
    const matchSt = !st || text.includes(st.toLowerCase()) || (st === 'SUBMITTED' && text.includes('menunggu')) || (st === 'VERIFIED' && text.includes('terverifikasi')) || (st === 'REVISION_REQUIRED' && text.includes('revisi'));
    r.style.display = matchQ && matchSt ? '' : 'none';
  });
}

async function openAdminVerificationDetailModal(regId) {
  openModal('Memuat Berkas...', '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data lengkap calon santri...</div>', 'modal-xl');

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form`);
    if (!res.success || !res.data) throw new Error('Gagal memuat formulir.');

    const d = res.data;
    const st = d.studentDetail || {};
    const achs = d.achievements || [];
    const docs = d.documents || [];

    const modalBody = `
      <div style="font-size: 0.9rem;">
        
        <!-- Header Info Card -->
        <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">NOMOR PENDAFTARAN:</div>
            <code style="font-size: 1.3rem; font-weight: 800; color: var(--primary-600);">${d.registrationNumber}</code>
            <div style="margin-top: 4px;">Status Formulir: ${getFormStatusBadge(d.formStatus)}</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="printFullStudentForm('${regId}')">
              <i class="fa-solid fa-print"></i> Print Data
            </button>
            <button type="button" class="btn btn-sm btn-primary" onclick="printFullStudentForm('${regId}')">
              <i class="fa-solid fa-file-pdf"></i> Download PDF
            </button>
          </div>
          <div style="text-align: right; width: 100%; border-top: 1px dashed var(--border-subtle); padding-top: 8px; margin-top: 6px;">
            <div>Pilihan: <strong>${d.schoolName || '-'} &bull; ${d.majorName || '-'} &bull; ${d.classProgramName || '-'}</strong></div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">Gelombang: ${d.admissionWave?.name || '-'} | Status Mukim: <strong>${d.boardingStatus || 'MUKIM'}</strong></div>
          </div>
        </div>

        ${d.revisionNotes ? `
          <div class="alert alert-warning" style="margin-bottom: 20px;">
            <strong>Catatan Revisi Sebelumnya:</strong> ${d.revisionNotes}
          </div>
        ` : ''}

        <!-- SECTION A: IDENTITAS -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-user"></i> A. Identitas Calon Santri</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Nama Lengkap: <strong>${st.fullName || '-'}</strong></div>
          <div>NIK: <strong>${st.nik || '-'}</strong></div>
          <div>No. Kartu Keluarga (KK): <strong>${st.familyCardNumber || '-'}</strong></div>
          <div>NISN: <strong>${st.nisn || '-'}</strong></div>
          <div>No. Akta Kelahiran: <strong>${st.birthCertificateNumber || '-'}</strong></div>
          <div>Jenis Kelamin: <strong>${st.gender === 'L' ? 'Laki-laki' : (st.gender === 'P' ? 'Perempuan' : '-')}</strong></div>
          <div>Tempat Lahir: <strong>${st.birthPlace || '-'}</strong></div>
          <div>Tanggal Lahir: <strong>${formatBirthDate(st.birthDate)}</strong></div>
          <div>Agama: <strong>${st.religion || 'Islam'}</strong> | Gol. Darah: <strong>${st.bloodType || '-'}</strong></div>
          <div>Anak Ke: <strong>${st.childOrder || '-'}</strong> dari <strong>${st.siblingsCount || '-'}</strong> bersaudara (${formatChildStatus(st.childStatus)})</div>
        </div>

        <!-- SECTION B: ALAMAT -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-location-dot"></i> B. Alamat Tempat Tinggal</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Negara: <strong>${st.country || 'Indonesia'}</strong></div>
          <div>Provinsi: <strong>${st.province || '-'}</strong></div>
          <div>Kabupaten/Kota: <strong>${st.cityDistrict || '-'}</strong></div>
          <div>Kecamatan: <strong>${st.subDistrict || '-'}</strong></div>
          <div>Desa/Kelurahan: <strong>${st.village || '-'}</strong></div>
          <div>RT / RW: <strong>RT ${st.rt || '-'} / RW ${st.rw || '-'}</strong></div>
          <div>Kode Pos: <strong>${st.postalCode || '-'}</strong></div>
          <div style="grid-column: 1 / -1;">Alamat Lengkap: <strong>${st.fullAddress || '-'}</strong></div>
        </div>

        <!-- SECTION C: ASAL SEKOLAH -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-school"></i> C. Data Asal Sekolah</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Nama Sekolah Asal: <strong>${st.previousSchoolName || '-'}</strong></div>
          <div>Jenjang: <strong>${formatSchoolLevel(st.previousSchoolLevel)}</strong></div>
          ${st.previousSchoolNpsn ? `<div>NPSN Sekolah Asal: <strong>${st.previousSchoolNpsn}</strong></div>` : ''}
          <div>Tahun Lulus: <strong>${st.graduationYear || '-'}</strong></div>
          <div>No. Ijazah/SKL: <strong>${st.diplomaNumber || '-'}</strong></div>
          <div style="grid-column: 1 / -1;">Alamat Sekolah Asal: <strong>${st.previousSchoolAddress || '-'}</strong></div>
        </div>

        <!-- SECTION D & E: ORANG TUA -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-users"></i> D & E. Data Orang Tua</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary-600);">DATA AYAH:</strong>
            <div style="margin-top: 6px;">Nama: <strong>${st.fatherName || '-'}</strong> (${formatParentStatus(st.fatherStatus)})</div>
            <div>NIK: <strong>${st.fatherNik || '-'}</strong></div>
            <div>Tempat/Tgl Lahir: <strong>${st.fatherBirthPlace || '-'}, ${formatBirthDate(st.fatherBirthDate)}</strong></div>
            <div>Pendidikan: <strong>${formatEducation(st.fatherEducation)}</strong></div>
            <div>Pekerjaan: <strong>${st.fatherOccupation || '-'}</strong></div>
            <div>Penghasilan: <strong>${formatIncome(st.fatherMonthlyIncome)}</strong></div>
            <div>WhatsApp: <strong>${st.fatherWhatsapp || '-'}</strong></div>
          </div>
          <div style="background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary-600);">DATA IBU:</strong>
            <div style="margin-top: 6px;">Nama: <strong>${st.motherName || '-'}</strong> (${formatParentStatus(st.motherStatus)})</div>
            <div>NIK: <strong>${st.motherNik || '-'}</strong></div>
            <div>Tempat/Tgl Lahir: <strong>${st.motherBirthPlace || '-'}, ${formatBirthDate(st.motherBirthDate)}</strong></div>
            <div>Pendidikan: <strong>${formatEducation(st.motherEducation)}</strong></div>
            <div>Pekerjaan: <strong>${st.motherOccupation || '-'}</strong></div>
            <div>Penghasilan: <strong>${formatIncome(st.motherMonthlyIncome)}</strong></div>
            <div>WhatsApp: <strong>${st.motherWhatsapp || '-'}</strong></div>
          </div>
        </div>

        <!-- SECTION F: DATA WALI -->
        ${st.hasGuardian ? `
          <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-user-shield"></i> F. Data Wali</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px; background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <div>Nama Wali: <strong>${st.guardianName || '-'}</strong> (${st.guardianRelation || '-'})</div>
            <div>NIK Wali: <strong>${st.guardianNik || '-'}</strong></div>
            <div>Tempat/Tgl Lahir: <strong>${st.guardianBirthPlace || '-'}, ${formatBirthDate(st.guardianBirthDate)}</strong></div>
            <div>Pendidikan: <strong>${formatEducation(st.guardianEducation)}</strong></div>
            <div>Pekerjaan: <strong>${st.guardianOccupation || '-'}</strong></div>
            <div>Penghasilan: <strong>${formatIncome(st.guardianMonthlyIncome)}</strong></div>
            <div>WhatsApp: <strong>${st.guardianWhatsapp || '-'}</strong></div>
            <div style="grid-column: 1 / -1;">Alamat Wali: <strong>${st.guardianAddress || '-'}</strong></div>
          </div>
        ` : ''}

        <!-- SECTION G & H: KONTAK & TAMBAHAN -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-address-book"></i> G & H. Kontak Utama & Data Tambahan</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Kontak Utama: <strong>${st.primaryContactName || '-'}</strong></div>
          <div>Hubungan Kontak: <strong>${st.primaryContactRelation || '-'}</strong></div>
          <div>No. WhatsApp Utama: <strong>${st.primaryContactWhatsapp || '-'}</strong></div>
          <div>Tinggi Badan: <strong>${st.heightCm ? st.heightCm + ' cm' : '-'}</strong></div>
          <div>Berat Badan: <strong>${st.weightKg ? st.weightKg + ' kg' : '-'}</strong></div>
          <div>Kebutuhan Khusus: <strong>${st.hasSpecialNeeds ? `Ya (${st.specialNeedsDescription || '-'})` : 'Tidak Ada'}</strong></div>
        </div>

        <!-- PRESTASI -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-trophy"></i> Prestasi Calon Santri (${achs.length})</h4>
        ${achs.length === 0 ? '<div style="color: var(--text-muted); margin-bottom: 20px;">Tidak ada catatan prestasi.</div>' : `
          <table style="width: 100%; font-size: 0.85rem; margin-bottom: 20px; border-collapse: collapse;">
            <thead style="background: var(--bg-body); text-align: left;">
              <tr><th style="padding: 6px 10px;">Nama Prestasi</th><th style="padding: 6px 10px;">Jenis</th><th style="padding: 6px 10px;">Tingkat</th><th style="padding: 6px 10px;">Peringkat / Tahun</th></tr>
            </thead>
            <tbody>
              ${achs.map(a => `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 6px 10px;"><strong>${a.name}</strong></td>
                  <td style="padding: 6px 10px;">${a.type}</td>
                  <td style="padding: 6px 10px;">${a.level}</td>
                  <td style="padding: 6px 10px;">${a.rank} (${a.year})</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- DOKUMEN PERSYARATAN -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-file-pdf"></i> Dokumen Berkas (${docs.length})</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px;">
          ${docs.map(doc => `
            <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 10px; background: var(--bg-body);">
              <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-heading);">${formatDocumentType(doc.documentType)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin: 4px 0;">${doc.originalFileName || '-'}</div>
              <a href="/api/registrations/${regId}/documents/${doc.id}/file${getAuthTokenForUrl()}" target="_blank" class="btn btn-xs btn-outline-primary" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none; padding: 4px 8px; font-size: 0.75rem;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka File
              </a>
            </div>
          `).join('')}
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 2px solid var(--border-subtle); padding-top: 16px;">
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="printFullStudentForm('${regId}')">
              <i class="fa-solid fa-print"></i> Cetak / Print
            </button>
            <button type="button" class="btn btn-outline-primary" onclick="printFullStudentForm('${regId}')">
              <i class="fa-solid fa-file-pdf"></i> Download PDF
            </button>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
            <button type="button" class="btn btn-warning" onclick="openRequestRevisionModal('${regId}')">
              <i class="fa-solid fa-rotate-left"></i> Minta Revisi / Perbaikan
            </button>
            <button type="button" class="btn btn-success" onclick="executeVerifyCandidate('${regId}')">
              <i class="fa-solid fa-circle-check"></i> Verifikasi Data (Setujui)
            </button>
          </div>
        </div>

      </div>
    `;

    openModal(`Verifikasi Berkas: ${d.registrationNumber}`, modalBody, 'modal-xl');
  } catch (err) {
    openModal('Error', `<div class="alert alert-danger">${err.message}</div>`);
  }
}

async function executeVerifyCandidate(regId) {
  if (!confirm('Apakah Anda yakin data calon santri ini sudah LENGKAP dan BENAR? Status akan diubah menjadi VERIFIED.')) return;
  try {
    const res = await apiRequest(`/api/registrations/${regId}/verify`, { method: 'POST' });
    if (res.success) {
      showToast('Data calon santri berhasil diverifikasi (VERIFIED).', 'success');
      closeModal();
      renderAdminVerificationView();
    } else {
      alert(res.message || 'Gagal memverifikasi data.');
    }
  } catch (err) {
    alert(err.message);
  }
}

function openRequestRevisionModal(regId) {
  openModal('Permintaan Revisi Berkas', `
    <form onsubmit="executeRequestRevision(event, '${regId}')">
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">
          Catatan / Alasan Revisi <span style="color: var(--danger-500);">*</span>
        </label>
        <textarea id="m-revision-notes" class="form-control" rows="4" placeholder="Tuliskan secara spesifik bagian mana yang harus diperbaiki calon santri (misal: Foto KTP Ayah buram, NIK tidak sesuai KK, dll)..." required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);"></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-submit-revision" class="btn btn-warning"><i class="fa-solid fa-paper-plane"></i> Kirim Catatan Revisi</button>
      </div>
    </form>
  `);
}

async function executeRequestRevision(e, regId) {
  e.preventDefault();
  const notes = document.getElementById('m-revision-notes').value;
  const btn = document.getElementById('btn-submit-revision');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';

  try {
    const res = await apiRequest(`/api/registrations/${regId}/request-revision`, {
      method: 'POST',
      body: { revisionNotes: notes },
    });
    if (res.success) {
      showToast('Permintaan revisi berhasil dikirim ke calon santri.', 'success');
      closeModal();
      renderAdminVerificationView();
    } else {
      alert(res.message || 'Gagal mengirim revisi.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Catatan Revisi';
  }
}

// ============================================================================
// 4. FORMULIR PENDAFTARAN LENGKAP CALON SANTRI (PESERTA)
// ============================================================================

const PSB_OCCUPATION_OPTIONS = [
  'PNS/PPPK',
  'TNI/POLRI',
  'Pegawai Swasta',
  'Wiraswasta',
  'Petani/Nelayan',
  'Buruh',
  'Guru/Dosen',
  'Ibu Rumah Tangga',
  'Tidak Bekerja',
  'Pensiunan',
  'Lainnya'
];

const PSB_EDUCATION_OPTIONS = [
  { value: 'TIDAK_SEKOLAH', label: 'Tidak Sekolah / Belum Sekolah' },
  { value: 'SD_MI', label: 'SD / MI Sederajat' },
  { value: 'SMP_MTS', label: 'SMP / MTs Sederajat' },
  { value: 'SMA_MA_SMK', label: 'SMA / MA / SMK Sederajat' },
  { value: 'DIPLOMA', label: 'Diploma (D1 / D2 / D3 / D4)' },
  { value: 'S1', label: 'S1 / Sarjana' },
  { value: 'S2', label: 'S2 / Magister' },
  { value: 'S3', label: 'S3 / Doktor' }
];

const PSB_INCOME_OPTIONS = [
  { value: 'TIDAK_BERPENGHASILAN', label: 'Tidak Berpenghasilan' },
  { value: 'KURANG_DARI_1JT', label: '< Rp 1 Juta' },
  { value: 'SATU_SAMPAI_3JT', label: 'Rp 1 - 3 Juta' },
  { value: 'TIGA_SAMPAI_5JT', label: 'Rp 3 - 5 Juta' },
  { value: 'LIMA_SAMPAI_10JT', label: 'Rp 5 - 10 Juta' },
  { value: 'LEBIH_DARI_10JT', label: '> Rp 10 Juta' }
];

function renderOccupationFieldHtml(idPrefix, label, currentValue = '', isReadOnly = false) {
  const isCustom = currentValue && !PSB_OCCUPATION_OPTIONS.includes(currentValue) && currentValue !== 'Lainnya';
  const selectedOption = isCustom ? 'Lainnya' : (currentValue || '');
  const customVal = isCustom ? currentValue : '';

  return `
    <div class="form-group">
      <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">${label}</label>
      <select id="${idPrefix}-select" class="form-select" onchange="handleOccupationSelectChange('${idPrefix}')" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        <option value="">-- Pilih Pekerjaan --</option>
        ${PSB_OCCUPATION_OPTIONS.map(opt => `
          <option value="${opt}" ${selectedOption === opt ? 'selected' : ''}>${opt}</option>
        `).join('')}
      </select>
      <input type="text" id="${idPrefix}-custom" class="form-control" placeholder="Ketikkan pekerjaan..." value="${escapeHtml(customVal)}" ${isReadOnly ? 'disabled' : ''} style="${selectedOption === 'Lainnya' ? 'display: block;' : 'display: none;'} margin-top: 8px; width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
    </div>
  `;
}

function handleOccupationSelectChange(idPrefix) {
  const sel = document.getElementById(`${idPrefix}-select`);
  const custom = document.getElementById(`${idPrefix}-custom`);
  if (!sel || !custom) return;
  if (sel.value === 'Lainnya') {
    custom.style.display = 'block';
    custom.focus();
  } else {
    custom.style.display = 'none';
  }
}
window.handleOccupationSelectChange = handleOccupationSelectChange;

function getOccupationFormValue(idPrefix) {
  const sel = document.getElementById(`${idPrefix}-select`);
  const custom = document.getElementById(`${idPrefix}-custom`);
  if (!sel) return '';
  if (sel.value === 'Lainnya') {
    return custom ? custom.value.trim() : 'Lainnya';
  }
  return sel.value.trim();
}

async function renderPesertaFullFormView(regId) {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat formulir pendaftaran lengkap...</div>';

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form`);
    if (!res.success || !res.data) throw new Error('Gagal memuat formulir.');

    const d = res.data;
    const st = d.studentDetail || {};
    const achs = d.achievements || [];
    const docs = d.documents || [];
    const isReadOnly = d.formStatus === 'SUBMITTED' || d.formStatus === 'VERIFIED';
    const isRevision = d.formStatus === 'REVISION_REQUIRED';

    const birthDateVal = st.birthDate ? new Date(st.birthDate).toISOString().split('T')[0] : '';
    const fatherBirthVal = st.fatherBirthDate ? new Date(st.fatherBirthDate).toISOString().split('T')[0] : '';
    const motherBirthVal = st.motherBirthDate ? new Date(st.motherBirthDate).toISOString().split('T')[0] : '';
    const guardianBirthVal = st.guardianBirthDate ? new Date(st.guardianBirthDate).toISOString().split('T')[0] : '';

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <a href="#detail/${regId}" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Ringkasan
            </a>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0;">Formulir Pendaftaran Lengkap Calon Santri</h2>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="printFullStudentForm('${regId}')" title="Print formulir pendaftaran">
              <i class="fa-solid fa-print"></i> Print
            </button>
            <button type="button" class="btn btn-sm btn-primary" onclick="printFullStudentForm('${regId}')" title="Download formulir sebagai PDF">
              <i class="fa-solid fa-file-pdf"></i> Download PDF
            </button>
            ${getFormStatusBadge(d.formStatus)}
          </div>
        </div>

        ${isRevision ? `
          <div class="alert alert-danger" style="margin-bottom: 24px; border: 2px solid #dc2626; background: #fee2e2 !important; border-radius: 10px; padding: 18px 20px;">
            <h4 style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #7f1d1d !important; font-size: 1rem; font-weight: 800;">
              <span style="display: inline-flex; align-items: center; justify-content: center; background: #dc2626; color: #fff; border-radius: 6px; padding: 4px 8px; font-size: 0.85rem;">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> CATATAN REVISI DARI SUPER ADMIN
              </span>
            </h4>
            <div style="font-size: 0.95rem; font-weight: 700; line-height: 1.6; color: #7f1d1d !important; background: #fecaca; border-radius: 6px; padding: 10px 14px; border-left: 4px solid #dc2626;">
              "${d.revisionNotes || 'Harap perbaiki data/dokumen Anda.'}"
            </div>
            <div style="font-size: 0.82rem; margin-top: 10px; color: #991b1b !important; font-weight: 500;">
              Silakan perbaiki data di bawah ini, lalu klik tombol <strong style="color: #7f1d1d;">"Kirim Data Final Ulang"</strong> di bagian bawah.
            </div>
          </div>
        ` : ''}

        ${d.formStatus === 'SUBMITTED' ? `
          <div class="alert alert-warning" style="margin-bottom: 24px;">
            <i class="fa-solid fa-clock"></i> Formulir pendaftaran telah berhasil dikirim pada <strong>${formatDate(d.submittedAt)}</strong> dan sedang dalam verifikasi. Formulir tidak dapat diedit saat ini.
          </div>
        ` : ''}

        ${d.formStatus === 'VERIFIED' ? `
          <div class="alert alert-success" style="margin-bottom: 24px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: var(--radius-lg); padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 42px; height: 42px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <strong style="color: #065f46; font-size: 1rem; display: block; margin-bottom: 3px;">
                  Selamat! Seluruh berkas pendaftaran Anda telah RESMI DIVERIFIKASI (VERIFIED).
                </strong>
                <span style="color: #047857; font-size: 0.88rem;">
                  Anda dapat melanjutkan ke tahapan <strong>Ujian Online (CBT)</strong> sesuai dengan jadwal yang telah ditentukan.
                </span>
              </div>
            </div>
            <a href="#cbt-peserta" class="btn btn-success" style="font-weight: 700; display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;">
              <i class="fa-solid fa-laptop-code"></i> Menuju Ujian Online CBT
            </a>
          </div>
        ` : ''}

        <form id="psb-full-form">

          <!-- SECTION A: DATA IDENTITAS CALON SANTRI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">A</span>
              Identitas & Keluarga Calon Santri
            </h3>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap (sesuai Akta/Ijazah)</label>
              <input type="text" id="ff-fullName" class="form-control" value="${st.fullName || d.individualParticipant?.fullName || ''}" ${isReadOnly ? 'disabled' : ''} required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Calon Santri</label>
                <input type="text" id="ff-nik" class="form-control" placeholder="16 digit NIK" value="${st.nik || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nomor Kartu Keluarga (KK)</label>
                <input type="text" id="ff-familyCardNumber" class="form-control" placeholder="16 digit Nomor KK" value="${st.familyCardNumber || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NISN</label>
                <input type="text" id="ff-nisn" class="form-control" placeholder="10 digit NISN" value="${st.nisn || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nomor Akta Kelahiran</label>
                <input type="text" id="ff-birthCertificateNumber" class="form-control" value="${st.birthCertificateNumber || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jenis Kelamin</label>
                <select id="ff-gender" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="L" ${st.gender === 'L' ? 'selected' : ''}>Laki-laki (L)</option>
                  <option value="P" ${st.gender === 'P' ? 'selected' : ''}>Perempuan (P)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir</label>
                <input type="text" id="ff-birthPlace" class="form-control" value="${st.birthPlace || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir</label>
                <input type="date" id="ff-birthDate" class="form-control" value="${birthDateVal}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-4">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Agama</label>
                <input type="text" id="ff-religion" class="form-control" value="${st.religion || 'Islam'}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Golongan Darah</label>
                <select id="ff-bloodType" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-</option>
                  <option value="A" ${st.bloodType === 'A' ? 'selected' : ''}>A</option>
                  <option value="B" ${st.bloodType === 'B' ? 'selected' : ''}>B</option>
                  <option value="AB" ${st.bloodType === 'AB' ? 'selected' : ''}>AB</option>
                  <option value="O" ${st.bloodType === 'O' ? 'selected' : ''}>O</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Anak Ke-</label>
                <input type="number" id="ff-childOrder" class="form-control" min="1" value="${st.childOrder || 1}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jml Sdr Kandung</label>
                <input type="number" id="ff-siblingsCount" class="form-control" min="0" value="${st.siblingsCount || 0}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION B: ALAMAT -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">B</span>
              Alamat Tempat Tinggal
            </h3>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Negara</label>
              <select id="ff-country" class="form-select" onchange="toggleCountryFields(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="Indonesia" ${(!st.country || st.country === 'Indonesia') ? 'selected' : ''}>Indonesia</option>
                <option value="Malaysia" ${st.country === 'Malaysia' ? 'selected' : ''}>Malaysia</option>
                <option value="Singapura" ${st.country === 'Singapura' ? 'selected' : ''}>Singapura</option>
                <option value="Negara Lain" ${(st.country && !['Indonesia', 'Malaysia', 'Singapura'].includes(st.country)) ? 'selected' : ''}>Lainnya</option>
              </select>
            </div>

            <div id="indo-address-fields" style="${st.country && st.country !== 'Indonesia' ? 'display: none;' : ''}">
              <div class="form-grid-2" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Provinsi <span style="color: red;">*</span></label>
                  <select id="ff-province" class="form-select" onchange="handleProvinceChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    <option value="${st.provinceCode || ''}">${st.province || '-- Pilih Provinsi --'}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kabupaten / Kota <span style="color: red;">*</span></label>
                  <select id="ff-cityDistrict" class="form-select" onchange="handleRegencyChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    <option value="${st.regencyCode || ''}">${st.cityDistrict || '-- Pilih Kabupaten / Kota --'}</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kecamatan <span style="color: red;">*</span></label>
                  <select id="ff-subDistrict" class="form-select" onchange="handleDistrictChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    <option value="${st.districtCode || ''}">${st.subDistrict || '-- Pilih Kecamatan --'}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kelurahan / Desa <span style="color: red;">*</span></label>
                  <select id="ff-village" class="form-select" onchange="handleVillageChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    <option value="${st.villageCode || ''}">${st.village || '-- Pilih Kelurahan / Desa --'}</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-3" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">RT <span style="color: red;">*</span></label>
                  <input type="text" id="ff-rt" class="form-control" placeholder="01" value="${st.rt || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">RW <span style="color: red;">*</span></label>
                  <input type="text" id="ff-rw" class="form-control" placeholder="02" value="${st.rw || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kode Pos <span style="color: red;">*</span></label>
                  <input type="text" id="ff-postalCode" class="form-control" placeholder="61155" value="${st.postalCode || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Lengkap (Jalan, No. Rumah, Dusun)</label>
              <textarea id="ff-fullAddress" class="form-control" rows="3" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${st.fullAddress || ''}</textarea>
            </div>
          </div>

          <!-- SECTION C: ASAL SEKOLAH -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">C</span>
              Data Asal Sekolah
            </h3>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Sekolah / Madrasah Asal</label>
              <input type="text" id="ff-previousSchoolName" class="form-control" value="${st.previousSchoolName || d.individualParticipant?.schoolName || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jenjang Sekolah Asal</label>
                <select id="ff-previousSchoolLevel" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="TK" ${st.previousSchoolLevel === 'TK' ? 'selected' : ''}>TK / PAUD</option>
                  <option value="SD_MI" ${st.previousSchoolLevel === 'SD_MI' ? 'selected' : ''}>SD / MI</option>
                  <option value="SMP_MTS" ${(!st.previousSchoolLevel || st.previousSchoolLevel === 'SMP_MTS') ? 'selected' : ''}>SMP / MTs</option>
                  <option value="SMA_MA_SMK" ${st.previousSchoolLevel === 'SMA_MA_SMK' ? 'selected' : ''}>SMA / MA / SMK</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tahun Lulus</label>
                <input type="text" id="ff-graduationYear" class="form-control" placeholder="2026" value="${st.graduationYear || '2026'}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">No. Ijazah / SKL (Opsional)</label>
                <input type="text" id="ff-diplomaNumber" class="form-control" value="${st.diplomaNumber || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Sekolah Asal</label>
              <input type="text" id="ff-previousSchoolAddress" class="form-control" value="${st.previousSchoolAddress || d.individualParticipant?.schoolAddress || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>
          </div>

          <!-- SECTION D: DATA AYAH -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">D</span>
              Data Ayah Kandung
            </h3>

            <div class="form-grid-2-1" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Ayah</label>
                <input type="text" id="ff-fatherName" class="form-control" value="${st.fatherName || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Ayah</label>
                <select id="ff-fatherStatus" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="MASIH_HIDUP" ${(!st.fatherStatus || st.fatherStatus === 'MASIH_HIDUP') ? 'selected' : ''}>Masih Hidup</option>
                  <option value="SUDAH_MENINGGAL" ${st.fatherStatus === 'SUDAH_MENINGGAL' ? 'selected' : ''}>Sudah Meninggal</option>
                </select>
              </div>
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Ayah</label>
                <input type="text" id="ff-fatherNik" class="form-control" value="${st.fatherNik || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir Ayah</label>
                <input type="text" id="ff-fatherBirthPlace" class="form-control" value="${st.fatherBirthPlace || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir Ayah</label>
                <input type="date" id="ff-fatherBirthDate" class="form-control" value="${fatherBirthVal}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-4">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan</label>
                <select id="ff-fatherEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_EDUCATION_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${st.fatherEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                  `).join('')}
                </select>
              </div>
              ${renderOccupationFieldHtml('ff-fatherOccupation', 'Pekerjaan', st.fatherOccupation, isReadOnly)}
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan / Bln</label>
                <select id="ff-fatherMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_INCOME_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${st.fatherMonthlyIncome === opt.value ? 'selected' : ''}>${opt.label}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Ayah</label>
                <input type="text" id="ff-fatherWhatsapp" class="form-control" placeholder="08..." value="${st.fatherWhatsapp || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION E: DATA IBU -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">E</span>
              Data Ibu Kandung
            </h3>

            <div class="form-grid-2-1" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Ibu</label>
                <input type="text" id="ff-motherName" class="form-control" value="${st.motherName || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Ibu</label>
                <select id="ff-motherStatus" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="MASIH_HIDUP" ${(!st.motherStatus || st.motherStatus === 'MASIH_HIDUP') ? 'selected' : ''}>Masih Hidup</option>
                  <option value="SUDAH_MENINGGAL" ${st.motherStatus === 'SUDAH_MENINGGAL' ? 'selected' : ''}>Sudah Meninggal</option>
                </select>
              </div>
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Ibu</label>
                <input type="text" id="ff-motherNik" class="form-control" value="${st.motherNik || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir Ibu</label>
                <input type="text" id="ff-motherBirthPlace" class="form-control" value="${st.motherBirthPlace || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir Ibu</label>
                <input type="date" id="ff-motherBirthDate" class="form-control" value="${motherBirthVal}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-4">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan</label>
                <select id="ff-motherEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_EDUCATION_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${st.motherEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                  `).join('')}
                </select>
              </div>
              ${renderOccupationFieldHtml('ff-motherOccupation', 'Pekerjaan', st.motherOccupation, isReadOnly)}
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan / Bln</label>
                <select id="ff-motherMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_INCOME_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${st.motherMonthlyIncome === opt.value ? 'selected' : ''}>${opt.label}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Ibu</label>
                <input type="text" id="ff-motherWhatsapp" class="form-control" placeholder="08..." value="${st.motherWhatsapp || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION F: DATA WALI (CONDITIONAL) -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">F</span>
                Data Wali (Jika Ada)
              </h3>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600;">
                <input type="checkbox" id="ff-hasGuardian" onchange="toggleGuardianSection(this.checked)" ${st.hasGuardian ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 16px; height: 16px;">
                <span>Memiliki Wali Selain Orang Tua</span>
              </label>
            </div>

            <div id="guardian-fields" style="${st.hasGuardian ? '' : 'display: none;'} border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <div class="form-grid-3" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Hubungan Wali</label>
                  <input type="text" id="ff-guardianRelation" class="form-control" placeholder="Paman / Kakek dll" value="${st.guardianRelation || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Wali</label>
                  <input type="text" id="ff-guardianName" class="form-control" value="${st.guardianName || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Wali</label>
                  <input type="text" id="ff-guardianNik" class="form-control" value="${st.guardianNik || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir</label>
                  <input type="text" id="ff-guardianBirthPlace" class="form-control" value="${st.guardianBirthPlace || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir</label>
                  <input type="date" id="ff-guardianBirthDate" class="form-control" value="${guardianBirthVal}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-4" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan</label>
                  <select id="ff-guardianEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_EDUCATION_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${st.guardianEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                ${renderOccupationFieldHtml('ff-guardianOccupation', 'Pekerjaan', st.guardianOccupation, isReadOnly)}
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan / Bln</label>
                  <select id="ff-guardianMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_INCOME_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${st.guardianMonthlyIncome === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Wali</label>
                  <input type="text" id="ff-guardianWhatsapp" class="form-control" placeholder="08..." value="${st.guardianWhatsapp || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Lengkap Wali</label>
                <input type="text" id="ff-guardianAddress" class="form-control" value="${st.guardianAddress || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION G: KONTAK UTAMA -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">G</span>
              Kontak Utama Pendaftaran
            </h3>

            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Kontak Utama</label>
                <input type="text" id="ff-primaryContactName" class="form-control" value="${st.primaryContactName || d.individualParticipant?.mentorName || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Hubungan</label>
                <input type="text" id="ff-primaryContactRelation" class="form-control" placeholder="Ayah / Ibu / Wali" value="${st.primaryContactRelation || 'Orang Tua'}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Utama</label>
                <input type="text" id="ff-primaryContactWhatsapp" class="form-control" value="${st.primaryContactWhatsapp || d.individualParticipant?.whatsappNumber || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION H: DATA TAMBAHAN & PRESTASI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">H</span>
              Kondisi Fisik, Kebutuhan Khusus & Prestasi
            </h3>

            <div class="form-grid-3" style="margin-bottom: 16px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tinggi Badan (cm)</label>
                <input type="number" id="ff-heightCm" class="form-control" min="50" max="250" placeholder="160" value="${st.heightCm || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Berat Badan (kg)</label>
                <input type="number" id="ff-weightKg" class="form-control" min="20" max="200" placeholder="50" value="${st.weightKg || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kebutuhan Khusus</label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding-top: 8px;">
                  <input type="checkbox" id="ff-hasSpecialNeeds" onchange="toggleSpecialNeedsField(this.checked)" ${st.hasSpecialNeeds ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 16px; height: 16px;">
                  <span>Memiliki Kebutuhan Khusus</span>
                </label>
              </div>
            </div>

            <div id="special-needs-container" style="${st.hasSpecialNeeds ? '' : 'display: none;'} margin-bottom: 18px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Keterangan Kebutuhan Khusus <span style="color:red;">*</span></label>
              <textarea id="ff-specialNeedsDescription" class="form-control" rows="2" placeholder="Jelaskan kebutuhan khusus calon santri..." ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${st.specialNeedsDescription || ''}</textarea>
            </div>

            <!-- PRESTASI -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <label class="form-label" style="font-size: 0.95rem; font-weight: 700; color: var(--text-heading); margin: 0;">
                  <i class="fa-solid fa-trophy" style="color: var(--accent-500);"></i> Prestasi Yang Pernah Diraih (Opsional)
                </label>
                ${!isReadOnly ? `
                  <button type="button" class="btn btn-xs btn-outline-primary" onclick="addAchievementRow()">
                    <i class="fa-solid fa-plus"></i> Tambah Prestasi
                  </button>
                ` : ''}
              </div>

              <div id="achievements-list">
                ${achs.length === 0 ? '<div id="no-ach-label" style="color: var(--text-dim); font-size: 0.85rem; font-style: italic;">Belum ada prestasi yang ditambahkan.</div>' : ''}
                ${achs.map((ach, idx) => renderAchievementRowHtml(idx, ach, isReadOnly)).join('')}
              </div>
            </div>
          </div>

          <!-- SECTION DOKUMEN: UPLOAD BERKAS -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 28px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;"><i class="fa-solid fa-folder-open"></i></span>
              Upload Dokumen Persyaratan
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
              Format file yang diizinkan: <strong>PDF, JPG, PNG</strong> (Maksimum 5MB per file). Dokumen bertanda <span style="color: red;">*</span> wajib diunggah sebelum submit final.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${renderDocUploadCard(regId, 'FAMILY_CARD', 'Kartu Keluarga (KK)', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'BIRTH_CERTIFICATE', 'Akta Kelahiran', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'FATHER_ID_CARD', 'KTP Ayah', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'MOTHER_ID_CARD', 'KTP Ibu', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'GUARDIAN_ID_CARD', 'KTP Wali', false, docs, isReadOnly, 'Wajib jika memiliki wali')}
              ${renderDocUploadCard(regId, 'PHOTO', 'Pas Foto Berwarna (3x4)', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'DIPLOMA_OR_SKL', 'Ijazah / SKL', false, docs, isReadOnly, 'Opsional jika belum terbit')}
              ${renderDocUploadCard(regId, 'REPORT_CARD', 'Rapor Nilai Terakhir', false, docs, isReadOnly, 'Opsional')}
              ${renderDocUploadCard(regId, 'ACHIEVEMENT_CERTIFICATE', 'Sertifikat Prestasi', false, docs, isReadOnly, 'Opsional')}
            </div>
          </div>

          <!-- FORM ACTIONS -->
          ${!isReadOnly ? `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 24px; box-shadow: var(--shadow-sm); position: sticky; bottom: 16px; z-index: 10;">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary" onclick="handleSaveFormDraft('${regId}')">
                  <i class="fa-solid fa-floppy-disk"></i> Simpan Sementara
                </button>
              </div>
              <div>
                <button type="button" class="btn btn-primary" style="padding: 12px 24px; font-weight: 700;" onclick="handleFinalFormSubmit('${regId}')">
                  <i class="fa-solid fa-paper-plane"></i> ${isRevision ? 'Kirim Data Final Ulang' : 'Kirim Data Final'}
                </button>
              </div>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 24px; margin-top: 20px; box-shadow: var(--shadow-sm);">
              <div>
                <div style="font-weight: 700; color: var(--text-heading);">Formulir Telah Terkirim</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Anda dapat mencetak atau mengunduh rangkuman biodata lengkap pendaftaran santri.</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary" onclick="printFullStudentForm('${regId}')">
                  <i class="fa-solid fa-print"></i> Cetak / Print
                </button>
                <button type="button" class="btn btn-primary" onclick="printFullStudentForm('${regId}')">
                  <i class="fa-solid fa-file-pdf"></i> Download PDF
                </button>
              </div>
            </div>
          `}

        </form>
      </div>
    `;

    // Initialize cascading Indonesian region dropdowns if country is Indonesia
    if (!st.country || st.country === 'Indonesia') {
      initWilayahDropdowns({
        province: st.province,
        provinceCode: st.provinceCode,
        cityDistrict: st.cityDistrict,
        regencyCode: st.regencyCode,
        subDistrict: st.subDistrict,
        districtCode: st.districtCode,
        village: st.village,
        villageCode: st.villageCode,
        isReadOnly: isReadOnly,
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ============================================================================
// WILAYAH INDONESIA CASCADING DROPDOWNS
// ============================================================================

async function initWilayahDropdowns(initialData = {}) {
  const provSelect = document.getElementById('ff-province');
  if (!provSelect) return;

  const isReadOnly = !!initialData.isReadOnly;

  try {
    provSelect.innerHTML = '<option value="">Memuat data Provinsi...</option>';
    const res = await apiRequest('/api/wilayah/provinces');
    const provinces = (res && res.success && Array.isArray(res.data)) ? res.data : [];

    let provHtml = '<option value="">-- Pilih Provinsi --</option>';
    let selectedProvCode = '';

    provinces.forEach(p => {
      const isSelected = (initialData.provinceCode && initialData.provinceCode === p.code) ||
        (initialData.province && initialData.province.toLowerCase() === p.name.toLowerCase());
      if (isSelected) selectedProvCode = p.code;
      provHtml += `<option value="${p.code}" data-name="${p.name}" ${isSelected ? 'selected' : ''}>${p.name}</option>`;
    });

    provSelect.innerHTML = provHtml;
    if (isReadOnly) provSelect.disabled = true;

    if (selectedProvCode) {
      await loadRegencies(selectedProvCode, {
        cityDistrict: initialData.cityDistrict,
        regencyCode: initialData.regencyCode,
        subDistrict: initialData.subDistrict,
        districtCode: initialData.districtCode,
        village: initialData.village,
        villageCode: initialData.villageCode,
        isReadOnly: isReadOnly,
      });
    } else {
      resetWilayahChildSelects(['ff-cityDistrict', 'ff-subDistrict', 'ff-village']);
    }
  } catch (err) {
    console.error('Gagal memuat provinsi:', err);
    provSelect.innerHTML = '<option value="">Gagal memuat provinsi</option>';
  }
}

async function loadRegencies(provinceCode, cascadeData = {}) {
  const regSelect = document.getElementById('ff-cityDistrict');
  if (!regSelect) return;

  if (!provinceCode) {
    resetWilayahChildSelects(['ff-cityDistrict', 'ff-subDistrict', 'ff-village']);
    return;
  }

  regSelect.disabled = true;
  regSelect.innerHTML = '<option value="">Memuat data Kab/Kota...</option>';
  resetWilayahChildSelects(['ff-subDistrict', 'ff-village']);

  try {
    const res = await apiRequest(`/api/wilayah/regencies/${encodeURIComponent(provinceCode)}`);
    const regencies = (res && res.success && Array.isArray(res.data)) ? res.data : [];

    let regHtml = '<option value="">-- Pilih Kabupaten / Kota --</option>';
    let selectedRegCode = '';

    regencies.forEach(r => {
      const isSelected = (cascadeData.regencyCode && (cascadeData.regencyCode === r.code || cascadeData.regencyCode.replace(/\./g, '') === r.code.replace(/\./g, ''))) ||
        (cascadeData.cityDistrict && cascadeData.cityDistrict.toLowerCase() === r.name.toLowerCase());
      if (isSelected) selectedRegCode = r.code;
      regHtml += `<option value="${r.code}" data-name="${r.name}" ${isSelected ? 'selected' : ''}>${r.name}</option>`;
    });

    regSelect.innerHTML = regHtml;
    regSelect.disabled = !!cascadeData.isReadOnly;

    if (selectedRegCode) {
      await loadDistricts(selectedRegCode, cascadeData);
    }
  } catch (err) {
    console.error('Gagal memuat kabupaten/kota:', err);
    regSelect.innerHTML = '<option value="">Gagal memuat kab/kota</option>';
  }
}

async function loadDistricts(regencyCode, cascadeData = {}) {
  const distSelect = document.getElementById('ff-subDistrict');
  if (!distSelect) return;

  if (!regencyCode) {
    resetWilayahChildSelects(['ff-subDistrict', 'ff-village']);
    return;
  }

  distSelect.disabled = true;
  distSelect.innerHTML = '<option value="">Memuat data Kecamatan...</option>';
  resetWilayahChildSelects(['ff-village']);

  try {
    const res = await apiRequest(`/api/wilayah/districts/${encodeURIComponent(regencyCode)}`);
    const districts = (res && res.success && Array.isArray(res.data)) ? res.data : [];

    let distHtml = '<option value="">-- Pilih Kecamatan --</option>';
    let selectedDistCode = '';

    districts.forEach(d => {
      const isSelected = (cascadeData.districtCode && (cascadeData.districtCode === d.code || cascadeData.districtCode.replace(/\./g, '') === d.code.replace(/\./g, ''))) ||
        (cascadeData.subDistrict && cascadeData.subDistrict.toLowerCase() === d.name.toLowerCase());
      if (isSelected) selectedDistCode = d.code;
      distHtml += `<option value="${d.code}" data-name="${d.name}" ${isSelected ? 'selected' : ''}>${d.name}</option>`;
    });

    distSelect.innerHTML = distHtml;
    distSelect.disabled = !!cascadeData.isReadOnly;

    if (selectedDistCode) {
      await loadVillages(selectedDistCode, cascadeData);
    }
  } catch (err) {
    console.error('Gagal memuat kecamatan:', err);
    distSelect.innerHTML = '<option value="">Gagal memuat kecamatan</option>';
  }
}

async function loadVillages(districtCode, cascadeData = {}) {
  const villSelect = document.getElementById('ff-village');
  if (!villSelect) return;

  if (!districtCode) {
    resetWilayahChildSelects(['ff-village']);
    return;
  }

  villSelect.disabled = true;
  villSelect.innerHTML = '<option value="">Memuat data Kelurahan/Desa...</option>';

  try {
    const res = await apiRequest(`/api/wilayah/villages/${encodeURIComponent(districtCode)}`);
    const villages = (res && res.success && Array.isArray(res.data)) ? res.data : [];

    let villHtml = '<option value="">-- Pilih Kelurahan / Desa --</option>';

    villages.forEach(v => {
      const isSelected = (cascadeData.villageCode && (cascadeData.villageCode === v.code || cascadeData.villageCode.replace(/\./g, '') === v.code.replace(/\./g, ''))) ||
        (cascadeData.village && cascadeData.village.toLowerCase() === v.name.toLowerCase());
      villHtml += `<option value="${v.code}" data-name="${v.name}" ${isSelected ? 'selected' : ''}>${v.name}</option>`;
    });

    villSelect.innerHTML = villHtml;
    villSelect.disabled = !!cascadeData.isReadOnly;
  } catch (err) {
    console.error('Gagal memuat kelurahan/desa:', err);
    villSelect.innerHTML = '<option value="">Gagal memuat kelurahan/desa</option>';
  }
}

function resetWilayahChildSelects(ids) {
  const placeholders = {
    'ff-cityDistrict': '-- Pilih Kabupaten / Kota --',
    'ff-subDistrict': '-- Pilih Kecamatan --',
    'ff-village': '-- Pilih Kelurahan / Desa --'
  };
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<option value="">${placeholders[id] || '-- Pilih --'}</option>`;
      el.disabled = true;
    }
  });
}

async function handleProvinceChange(val) {
  await loadRegencies(val);
}

async function handleRegencyChange(val) {
  await loadDistricts(val);
}

async function handleDistrictChange(val) {
  await loadVillages(val);
}

function handleVillageChange(val) {
  // village selected
}

function toggleCountryFields(val) {
  const el = document.getElementById('indo-address-fields');
  if (el) el.style.display = val === 'Indonesia' ? 'block' : 'none';
  if (val === 'Indonesia') {
    const provSelect = document.getElementById('ff-province');
    if (provSelect && (!provSelect.options || provSelect.options.length <= 1)) {
      initWilayahDropdowns();
    }
  }
}

function toggleGuardianSection(checked) {
  const el = document.getElementById('guardian-fields');
  if (el) el.style.display = checked ? 'block' : 'none';
}

function toggleSpecialNeedsField(checked) {
  const el = document.getElementById('special-needs-container');
  if (el) el.style.display = checked ? 'block' : 'none';
}

function renderAchievementRowHtml(index, data = {}, isReadOnly = false) {
  return `
    <div class="achievement-row card" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 10px;">
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 8px; align-items: center;">
        <input type="text" class="ach-name form-control" placeholder="Nama Kejuaraan/Lomba" value="${data.name || ''}" ${isReadOnly ? 'disabled' : ''} style="font-size: 0.8rem; padding: 6px 8px;">
        <select class="ach-type form-control" ${isReadOnly ? 'disabled' : ''} style="font-size: 0.8rem; padding: 6px 8px;">
          <option value="" ${!data.type ? 'selected' : ''}>-- Jenis --</option>
          <option value="Akademik" ${data.type === 'Akademik' ? 'selected' : ''}>Akademik</option>
          <option value="Non Akademik" ${data.type === 'Non Akademik' ? 'selected' : ''}>Non Akademik</option>
        </select>
        <select class="ach-level form-control" ${isReadOnly ? 'disabled' : ''} style="font-size: 0.8rem; padding: 6px 8px;">
          <option value="" ${!data.level ? 'selected' : ''}>-- Tingkat --</option>
          <option value="Kecamatan" ${data.level === 'Kecamatan' ? 'selected' : ''}>Kecamatan</option>
          <option value="Kabupaten" ${data.level === 'Kabupaten' ? 'selected' : ''}>Kabupaten</option>
          <option value="Provinsi" ${data.level === 'Provinsi' ? 'selected' : ''}>Provinsi</option>
          <option value="Nasional" ${data.level === 'Nasional' ? 'selected' : ''}>Nasional</option>
          <option value="Internasional" ${data.level === 'Internasional' ? 'selected' : ''}>Internasional</option>
        </select>
        <input type="text" class="ach-year form-control" placeholder="Tahun (2025)" value="${data.year || ''}" ${isReadOnly ? 'disabled' : ''} style="font-size: 0.8rem; padding: 6px 8px;">
        <input type="text" class="ach-rank form-control" placeholder="Juara 1" value="${data.rank || ''}" ${isReadOnly ? 'disabled' : ''} style="font-size: 0.8rem; padding: 6px 8px;">
        ${!isReadOnly ? `
          <button type="button" class="btn btn-xs btn-danger" onclick="this.closest('.achievement-row').remove()"><i class="fa-solid fa-trash"></i></button>
        ` : ''}
      </div>
    </div>
  `;
}

function addAchievementRow() {
  const noAch = document.getElementById('no-ach-label');
  if (noAch) noAch.style.display = 'none';
  const list = document.getElementById('achievements-list');
  const div = document.createElement('div');
  div.innerHTML = renderAchievementRowHtml(Date.now());
  list.appendChild(div.firstElementChild);
}

function renderDocUploadCard(regId, docType, label, isRequired, existingDocs, isReadOnly, note = '') {
  const doc = (existingDocs || []).find(d => d && d.documentType === docType);
  const safeLabel = (label || docType).replace(/'/g, "\\'");
  const safeNote = (note || '').replace(/'/g, "\\'");

  return `
    <div id="doc-card-${docType}" class="card" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <strong style="font-size: 0.875rem; color: var(--text-heading);">
            ${label} ${isRequired ? '<span style="color: red;">*</span>' : ''}
          </strong>
          ${doc ? '<span class="badge badge-success" style="font-size: 0.7rem;"><i class="fa-solid fa-check"></i> Terunggah</span>' : '<span class="badge badge-secondary" style="font-size: 0.7rem;">Belum Ada</span>'}
        </div>
        ${note ? `<div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 8px;">${note}</div>` : ''}

        ${doc ? `
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px; word-break: break-all;">
            <i class="fa-solid fa-file"></i> ${doc.originalFileName || 'File'} (${Math.round((doc.fileSize || 0) / 1024)} KB)
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <a href="/api/registrations/${regId}/documents/${doc.id}/file${getAuthTokenForUrl()}" target="_blank" class="btn btn-xs btn-outline-primary" style="text-decoration: none;">
              <i class="fa-solid fa-eye"></i> Lihat File
            </a>
            ${!isReadOnly ? `
              <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteFormDocument('${regId}', '${doc.id}', '${docType}', '${safeLabel}', ${isRequired ? 'true' : 'false'}, '${safeNote}')">
                <i class="fa-solid fa-trash"></i> Hapus
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      ${!isReadOnly ? `
        <div style="margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--primary-600); cursor: pointer;">
            <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" style="display: none;" onchange="uploadFormDocument('${regId}', '${docType}', this, '${safeLabel}', ${isRequired ? 'true' : 'false'}, '${safeNote}')">
            <span class="btn btn-xs btn-secondary" style="width: 100%; text-align: center; display: inline-block;">
              <i class="fa-solid fa-cloud-arrow-up"></i> ${doc ? 'Ganti File' : 'Upload Dokumen'}
            </span>
          </label>
        </div>
      ` : ''}
    </div>
  `;
}

async function uploadFormDocument(regId, docType, input, label = '', isRequired = false, note = '') {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  const formData = new FormData();
  formData.append('documentType', docType);
  formData.append('file', file);

  const prevHTML = input.nextElementSibling ? input.nextElementSibling.innerHTML : '';
  if (input.nextElementSibling) input.nextElementSibling.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';

  try {
    const res = await apiRequest(`/api/registrations/${regId}/documents`, {
      method: 'POST',
      body: formData,
    });
    if (res.success && res.data) {
      showToast(`Dokumen ${label || docType} berhasil diunggah!`, 'success');

      // Update HANYA card upload dokumen yang bersangkutan di DOM tanpa reload formulir!
      const cardEl = document.getElementById(`doc-card-${docType}`);
      if (cardEl) {
        cardEl.outerHTML = renderDocUploadCard(regId, docType, label || docType, isRequired, [res.data], false, note);
      }

      // Auto-simpan draft form di background agar semua ketikan user tersimpan aman
      try {
        const formDataPayload = gatherFormData();
        await apiRequest(`/api/registrations/${regId}/form/draft`, {
          method: 'POST',
          body: formDataPayload,
        });
      } catch (saveErr) {
        // silent auto-save
      }
    } else {
      showToast(res.message || 'Gagal mengunggah dokumen.', 'danger');
      if (input.nextElementSibling) input.nextElementSibling.innerHTML = prevHTML;
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat upload.', 'danger');
    if (input.nextElementSibling) input.nextElementSibling.innerHTML = prevHTML;
  }
}

async function deleteFormDocument(regId, docId, docType, label = '', isRequired = false, note = '') {
  if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
  try {
    const res = await apiRequest(`/api/registrations/${regId}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      showToast('Dokumen berhasil dihapus.', 'success');
      // Update HANYA card upload dokumen yang bersangkutan di DOM tanpa reload formulir!
      const cardEl = document.getElementById(`doc-card-${docType}`);
      if (cardEl) {
        cardEl.outerHTML = renderDocUploadCard(regId, docType, label || docType, isRequired, [], false, note);
      }
    } else {
      showToast(res.message || 'Gagal menghapus dokumen.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat menghapus.', 'danger');
  }
}

function gatherFormData() {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || undefined;
  const getNum = (id) => {
    const v = document.getElementById(id)?.value;
    return v !== '' && !isNaN(Number(v)) ? Number(v) : undefined;
  };
  const getChk = (id) => document.getElementById(id)?.checked;

  const provEl = document.getElementById('ff-province');
  const regEl = document.getElementById('ff-cityDistrict');
  const distEl = document.getElementById('ff-subDistrict');
  const villEl = document.getElementById('ff-village');

  const getSelectName = (el) => {
    if (!el || el.selectedIndex < 0) return undefined;
    const opt = el.options[el.selectedIndex];
    if (!opt || !opt.value) return undefined;
    return opt.getAttribute('data-name') || opt.text || undefined;
  };
  const getSelectVal = (el) => {
    if (!el || !el.value) return undefined;
    return el.value;
  };

  const isIndo = (document.getElementById('ff-country')?.value || 'Indonesia') === 'Indonesia';

  const achievements = [];
  document.querySelectorAll('.achievement-row').forEach(row => {
    const name = row.querySelector('.ach-name')?.value?.trim();
    const type = row.querySelector('.ach-type')?.value?.trim();
    const level = row.querySelector('.ach-level')?.value?.trim();
    const year = row.querySelector('.ach-year')?.value?.trim();
    const rank = row.querySelector('.ach-rank')?.value?.trim();
    if (name && type) {
      achievements.push({ name, type, level: level || '-', year: year || '2026', rank: rank || 'Juara' });
    }
  });

  return {
    fullName: getVal('ff-fullName'),
    nik: getVal('ff-nik'),
    familyCardNumber: getVal('ff-familyCardNumber'),
    nisn: getVal('ff-nisn'),
    birthCertificateNumber: getVal('ff-birthCertificateNumber'),
    gender: document.getElementById('ff-gender')?.value,
    birthPlace: getVal('ff-birthPlace'),
    birthDate: getVal('ff-birthDate'),
    religion: getVal('ff-religion'),
    bloodType: getVal('ff-bloodType'),
    childOrder: getNum('ff-childOrder'),
    siblingsCount: getNum('ff-siblingsCount'),

    country: getVal('ff-country') || 'Indonesia',
    province: isIndo ? (getSelectName(provEl) || getVal('ff-province')) : undefined,
    provinceCode: isIndo ? getSelectVal(provEl) : undefined,
    cityDistrict: isIndo ? (getSelectName(regEl) || getVal('ff-cityDistrict')) : undefined,
    regencyCode: isIndo ? getSelectVal(regEl) : undefined,
    subDistrict: isIndo ? (getSelectName(distEl) || getVal('ff-subDistrict')) : undefined,
    districtCode: isIndo ? getSelectVal(distEl) : undefined,
    village: isIndo ? (getSelectName(villEl) || getVal('ff-village')) : undefined,
    villageCode: isIndo ? getSelectVal(villEl) : undefined,
    rt: isIndo ? getVal('ff-rt') : undefined,
    rw: isIndo ? getVal('ff-rw') : undefined,
    postalCode: isIndo ? getVal('ff-postalCode') : undefined,
    fullAddress: getVal('ff-fullAddress'),

    previousSchoolName: getVal('ff-previousSchoolName'),
    previousSchoolNpsn: getVal('ff-previousSchoolNpsn') || undefined,
    previousSchoolLevel: document.getElementById('ff-previousSchoolLevel')?.value,
    graduationYear: getVal('ff-graduationYear'),
    diplomaNumber: getVal('ff-diplomaNumber'),
    previousSchoolAddress: getVal('ff-previousSchoolAddress'),

    fatherName: getVal('ff-fatherName'),
    fatherStatus: document.getElementById('ff-fatherStatus')?.value,
    fatherNik: getVal('ff-fatherNik'),
    fatherBirthPlace: getVal('ff-fatherBirthPlace'),
    fatherBirthDate: getVal('ff-fatherBirthDate'),
    fatherEducation: document.getElementById('ff-fatherEducation')?.value,
    fatherOccupation: getOccupationFormValue('ff-fatherOccupation'),
    fatherMonthlyIncome: document.getElementById('ff-fatherMonthlyIncome')?.value,
    fatherWhatsapp: getVal('ff-fatherWhatsapp'),

    motherName: getVal('ff-motherName'),
    motherStatus: document.getElementById('ff-motherStatus')?.value,
    motherNik: getVal('ff-motherNik'),
    motherBirthPlace: getVal('ff-motherBirthPlace'),
    motherBirthDate: getVal('ff-motherBirthDate'),
    motherEducation: document.getElementById('ff-motherEducation')?.value,
    motherOccupation: getOccupationFormValue('ff-motherOccupation'),
    motherMonthlyIncome: document.getElementById('ff-motherMonthlyIncome')?.value,
    motherWhatsapp: getVal('ff-motherWhatsapp'),

    hasGuardian: getChk('ff-hasGuardian'),
    guardianRelation: getChk('ff-hasGuardian') ? getVal('ff-guardianRelation') : undefined,
    guardianName: getChk('ff-hasGuardian') ? getVal('ff-guardianName') : undefined,
    guardianNik: getChk('ff-hasGuardian') ? getVal('ff-guardianNik') : undefined,
    guardianBirthPlace: getChk('ff-hasGuardian') ? getVal('ff-guardianBirthPlace') : undefined,
    guardianBirthDate: getChk('ff-hasGuardian') ? getVal('ff-guardianBirthDate') : undefined,
    guardianEducation: getChk('ff-hasGuardian') ? document.getElementById('ff-guardianEducation')?.value : undefined,
    guardianOccupation: getChk('ff-hasGuardian') ? getOccupationFormValue('ff-guardianOccupation') : undefined,
    guardianMonthlyIncome: getChk('ff-hasGuardian') ? document.getElementById('ff-guardianMonthlyIncome')?.value : undefined,
    guardianWhatsapp: getChk('ff-hasGuardian') ? getVal('ff-guardianWhatsapp') : undefined,
    guardianAddress: getChk('ff-hasGuardian') ? getVal('ff-guardianAddress') : undefined,

    primaryContactName: getVal('ff-primaryContactName'),
    primaryContactRelation: getVal('ff-primaryContactRelation'),
    primaryContactWhatsapp: getVal('ff-primaryContactWhatsapp'),

    heightCm: getNum('ff-heightCm'),
    weightKg: getNum('ff-weightKg'),
    hasSpecialNeeds: getChk('ff-hasSpecialNeeds'),
    specialNeedsDescription: getVal('ff-specialNeedsDescription'),

    achievements,
  };
}

async function handleSaveFormDraft(regId) {
  const payload = gatherFormData();
  try {
    const res = await apiRequest(`/api/registrations/${regId}/form/draft`, {
      method: 'PUT',
      body: payload,
    });
    if (res.success) {
      showToast('Draft formulir berhasil disimpan!', 'success');
    } else {
      showToast(res.message || 'Gagal menyimpan draft.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat menyimpan draft.', 'danger');
  }
}

async function handleFinalFormSubmit(regId) {
  if (!confirm('Pastikan seluruh data dan dokumen persyaratan yang Anda masukkan sudah LENGKAP dan BENAR.\n\nSetelah dikirim, data tidak dapat diubah kembali kecuali Super Admin meminta revisi.\n\nLanjutkan kirim final?')) {
    return;
  }

  const payload = gatherFormData();
  try {
    const res = await apiRequest(`/api/registrations/${regId}/form/submit`, {
      method: 'POST',
      body: payload,
    });
    if (res.success) {
      showToast('Formulir pendaftaran berhasil dikirim!', 'success');
      renderPesertaFullFormView(regId);
    } else {
      showToast(res.message || 'Gagal mengirim formulir.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Gagal mengirim formulir.', 'danger');
  }
}

// Dedicated menu router for candidate full form
async function renderPesertaFullFormMenu(regIdParam) {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memeriksa status formulir pendaftaran...</div>';

  try {
    let regId = regIdParam;
    if (!regId) {
      const myRegsRes = await apiRequest('/api/registrations/my');
      const myRegs = myRegsRes.success ? (myRegsRes.data || myRegsRes.registrations || []) : (Array.isArray(myRegsRes) ? myRegsRes : []);
      if (!myRegs || myRegs.length === 0) {
        container.innerHTML = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px; text-align: center; max-width: 600px; margin: 40px auto;">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(14, 165, 233, 0.1); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-file-lines"></i>
            </div>
            <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 8px;">Belum Ada Pendaftaran</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px;">Anda belum melakukan pendaftaran awal calon siswa. Silakan klik tombol di bawah untuk memulai pendaftaran.</p>
            <a href="#daftar" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700;">
              <i class="fa-solid fa-user-plus"></i> Daftar Siswa Baru
            </a>
          </div>
        `;
        return;
      }
      regId = myRegs[0].id;
    }

    // Call Form-Gate API safely
    let gateRes;
    try {
      gateRes = await apiRequest(`/api/registrations/${regId}/form-gate`);
    } catch (gateErr) {
      // 403 Forbidden or payment not yet approved
      container.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px; max-width: 650px; margin: 30px auto; text-align: center; box-shadow: var(--shadow-md);">
          <div style="margin-bottom: 16px;"><span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Formulir Belum Terbuka</span></div>
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(234, 179, 8, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
            <i class="fa-solid fa-lock"></i>
          </div>
          <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 10px;">Formulir Pendaftaran Belum Terbuka</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">${gateErr.message || 'Silakan selesaikan pembayaran biaya pendaftaran untuk membuka akses formulir.'}</p>
          <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <a href="#detail/${regId}" class="btn btn-primary"><i class="fa-solid fa-receipt"></i> Lihat Bukti / Status Pembayaran</a>
            <a href="#overview" class="btn btn-secondary"><i class="fa-solid fa-house"></i> Kembali ke Dashboard</a>
          </div>
        </div>
      `;
      return;
    }

    const gate = (gateRes && gateRes.data) ? gateRes.data : (gateRes || {});
    const isUnlocked = gate.unlocked || gate.canAccessForm || gate.isFormUnlocked || (gate.success && !gate.locked);

    if (!isUnlocked) {
      let statusBadge = '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Menunggu Pembayaran</span>';
      let title = 'Formulir Pendaftaran Belum Terbuka';
      let desc = gate.message || 'Silakan selesaikan pembayaran biaya formulir pendaftaran untuk membuka akses pengisian biodata lengkap.';
      let actionBtn = `<a href="#detail/${regId}" class="btn btn-primary"><i class="fa-solid fa-receipt"></i> Lihat Bukti / Status Pembayaran</a>`;

      if (gate.paymentStatus === 'WAITING_VERIFICATION') {
        statusBadge = '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Menunggu Verifikasi Pembayaran</span>';
        title = 'Pembayaran Sedang Diverifikasi Panitia';
        desc = 'Bukti pembayaran Anda telah dikirim dan sedang menunggu verifikasi oleh panitia PSB. Formulir pendaftaran akan terbuka otomatis setelah pembayaran disetujui.';
        actionBtn = `<a href="#detail/${regId}" class="btn btn-secondary"><i class="fa-solid fa-clock"></i> Cek Status Pembayaran</a>`;
      } else if (gate.paymentStatus === 'PAYMENT_REJECTED') {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Pembayaran Ditolak</span>';
        title = 'Pembayaran Ditolak';
        desc = `Bukti pembayaran Anda ditolak oleh panitia: "${gate.rejectionReason || 'Bukti transfer tidak valid'}". Silakan upload ulang bukti transfer yang benar.`;
        actionBtn = `<a href="#detail/${regId}" class="btn btn-primary"><i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Ulang Pembayaran</a>`;
      }

      container.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px; max-width: 650px; margin: 30px auto; text-align: center; box-shadow: var(--shadow-md);">
          <div style="margin-bottom: 16px;">${statusBadge}</div>
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(234, 179, 8, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
            <i class="fa-solid fa-lock"></i>
          </div>
          <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 10px;">${title}</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">${desc}</p>
          <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            ${actionBtn}
            <a href="#overview" class="btn btn-secondary"><i class="fa-solid fa-house"></i> Kembali ke Dashboard</a>
          </div>
        </div>
      `;
      return;
    }

    renderPesertaFullFormView(regId);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ============================================================================
// FORMATTERS & HELPER FUNCTIONS
// ============================================================================

function formatBirthDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

function formatIncome(val) {
  if (!val) return '-';
  const map = {
    'TIDAK_BERPENGHASILAN': 'Tidak Berpenghasilan',
    'KURANG_DARI_1JT': '< Rp 1.000.000',
    'SATU_SAMPAI_3JT': 'Rp 1.000.000 - Rp 3.000.000',
    'TIGA_SAMPAI_5JT': 'Rp 3.000.000 - Rp 5.000.000',
    'LIMA_SAMPAI_10JT': 'Rp 5.000.000 - Rp 10.000.000',
    'LEBIH_DARI_10JT': '> Rp 10.000.000',
  };
  if (map[val]) return map[val];
  if (!isNaN(Number(val))) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(val));
  }
  return val;
}

function formatParentStatus(val) {
  if (!val) return 'Masih Hidup';
  const map = {
    'MASIH_HIDUP': 'Masih Hidup',
    'SUDAH_MENINGGAL': 'Sudah Meninggal',
  };
  return map[val] || val;
}

function formatEducation(val) {
  if (!val) return '-';
  const map = {
    'TIDAK_SEKOLAH': 'Tidak Sekolah',
    'SD_MI': 'SD / MI',
    'SMP_MTS': 'SMP / MTs',
    'SMA_MA_SMK': 'SMA / MA / SMK',
    'DIPLOMA': 'Diploma (D1 - D4)',
    'S1': 'Sarjana (S1)',
    'S2': 'Magister (S2)',
    'S3': 'Doktor (S3)',
  };
  return map[val] || val;
}

function formatSchoolLevel(val) {
  if (!val) return '-';
  const map = {
    'TK': 'TK / RA / PAUD',
    'SD_MI': 'SD / MI',
    'SMP_MTS': 'SMP / MTs',
    'SMA_MA_SMK': 'SMA / MA / SMK',
  };
  return map[val] || val;
}

function formatChildStatus(val) {
  if (!val) return 'Anak Kandung';
  const map = {
    'KANDUNG': 'Anak Kandung',
    'TIRI': 'Anak Tiri',
    'ANGKAT': 'Anak Angkat',
  };
  return map[val] || val;
}

function formatDocumentType(val) {
  if (!val) return '-';
  const map = {
    'FAMILY_CARD': 'Kartu Keluarga',
    'BIRTH_CERTIFICATE': 'Akta Kelahiran',
    'FATHER_ID_CARD': 'KTP Ayah',
    'MOTHER_ID_CARD': 'KTP Ibu',
    'GUARDIAN_ID_CARD': 'KTP Wali',
    'PHOTO': 'Foto',
    'DIPLOMA_OR_SKL': 'Ijazah / SKL',
    'REPORT_CARD': 'Rapor',
    'ACHIEVEMENT_CERTIFICATE': 'Sertifikat Prestasi',
  };
  return map[val] || val;
}

/**
 * Print & Download PDF feature for complete student application form.
 */
async function printFullStudentForm(regId) {
  try {
    const [res, settingsRes] = await Promise.all([
      apiRequest(`/api/registrations/${regId}/form`),
      apiRequest('/api/settings').catch(() => ({ success: false })),
    ]);
    if (!res.success || !res.data) throw new Error('Gagal memuat data formulir untuk dicetak.');

    const d = res.data;
    const st = d.studentDetail || {};
    const achs = d.achievements || [];
    const docs = d.documents || [];

    const appSettings = (settingsRes && settingsRes.success && settingsRes.data) || window.appSettings || {};
    const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
    const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
      ? rawLogo
      : `/static/img/${rawLogo}`;
    const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Popup blocker browser aktif. Mohon izinkan popup untuk mencetak/mengunduh PDF formulir.');
      return;
    }

    const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Formulir Pendaftaran - ${d.registrationNumber} - ${st.fullName || 'Calon Santri'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      font-size: 9.5pt;
      line-height: 1.4;
      padding: 20px;
    }
    .no-print {
      max-width: 210mm;
      margin: 0 auto 16px auto;
      background: #0f172a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print button {
      cursor: pointer;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print { background: #0284c7; color: #fff; }
    .btn-pdf { background: #10b981; color: #fff; }
    .btn-close { background: #475569; color: #fff; }

    .sheet {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      padding: 14mm 16mm;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .kop {
      display: flex;
      align-items: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      gap: 16px;
    }
    .kop-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
    }
    .kop-text {
      flex: 1;
      text-align: center;
    }
    .kop-text h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kop-text h2 {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 2px 0;
    }
    .kop-text p {
      font-size: 8.5pt;
      color: #64748b;
    }

    .doc-title {
      text-align: center;
      margin-bottom: 12px;
    }
    .doc-title h1 {
      font-size: 12pt;
      font-weight: 800;
      text-decoration: underline;
      color: #0f172a;
    }
    .doc-title p {
      font-size: 9pt;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }

    .reg-meta-box {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: grid;
      grid-template-columns: 2fr 1.5fr;
      gap: 8px;
      background: #f8fafc;
      font-size: 8.5pt;
    }
    .reg-meta-box .num {
      font-size: 11.5pt;
      font-weight: 800;
      color: #0284c7;
      font-family: monospace;
    }

    .section-title {
      font-size: 9pt;
      font-weight: 700;
      background: #f1f5f9;
      color: #0f172a;
      padding: 4px 8px;
      border-left: 4px solid #0284c7;
      margin: 10px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      page-break-after: avoid;
    }

    .sub-section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0369a1;
      padding: 3px 6px;
      margin: 6px 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      background: #f0f9ff;
      border-bottom: 1px solid #e0f2fe;
      page-break-after: avoid;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 4px;
    }
    .data-table tr {
      border-bottom: 1px dotted #f1f5f9;
    }
    .data-table td {
      padding: 2.5px 6px;
      vertical-align: top;
    }
    .data-table td.label {
      width: 32%;
      color: #475569;
      font-weight: 600;
    }
    .data-table td.colon {
      width: 2%;
      text-align: center;
      color: #64748b;
    }
    .data-table td.val {
      width: 66%;
      color: #0f172a;
      font-weight: 600;
    }

    .table-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 4px;
      page-break-inside: avoid;
    }
    .table-grid th, .table-grid td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      text-align: left;
    }
    .table-grid th {
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
    }

    .signatures {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    .sig-space {
      height: 50px;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
      .sheet {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
        margin: 0;
      }
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <div>
      <strong>🖨️ Cetak & Download PDF Biodata Lengkap Calon Santri</strong>
      <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">
        Pilih opsi "Save as PDF" / "Simpan sebagai PDF" pada dialog cetak browser untuk menyimpan file PDF.
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-print" onclick="window.print()">🖨️ CETAK / PRINT</button>
      <button class="btn-pdf" onclick="window.print()">📥 SIMPAN PDF</button>
      <button class="btn-close" onclick="window.close()">✕ TUTUP</button>
    </div>
  </div>

  <div class="sheet">
    
    <!-- KOP SURAT -->
    <div class="kop">
      <img class="kop-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'">
      <div class="kop-text">
        <h3>PANITIA PENERIMAAN SANTRI BARU (PSB)</h3>
        <h2>PONDOK PESANTREN MASKUMAMBANG</h2>
        <p>Jalan Raya Sembungan Kidul, Kalirejo, Kec. Dukun, Kabupaten Gresik, Jawa Timur 61155 <br>Telp: 0817881859 | Website: maskumambang.ac.id</p>
      </div>
    </div>

    <div class="doc-title">
      <h1>FORMULIR PENDAFTARAN LENGKAP CALON SANTRI</h1>
      <p>TAHUN PELAJARAN ${d.academicPeriod?.name || '2026/2027'} &bull; ${d.admissionWave?.name || 'GELOMBANG 1'}</p>
    </div>

    <div class="reg-meta-box">
      <div>
        <div>NO. PENDAFTARAN: <span class="num">${d.registrationNumber}</span></div>
        <div style="margin-top: 2px;">PILIHAN: <strong>${d.schoolName || '-'} &bull; ${d.majorName || '-'} &bull; ${d.classProgramName || '-'}</strong></div>
      </div>
      <div style="text-align: right;">
        <div>STATUS TINGGAL: <strong>${d.boardingStatus === 'MUKIM' ? 'MUKIM (MONDOK)' : 'NON-MUKIM (LAJU)'}</strong></div>
        <div style="margin-top: 2px;">STATUS VERIFIKASI: <strong>${d.formStatus || 'DRAFT'}</strong></div>
      </div>
    </div>

    <!-- A. IDENTITAS CALON SANTRI -->
    <div class="section-title">A. Data Pribadi Calon Santri</div>
    <table class="data-table">
      <tr>
        <td class="label">Nama Lengkap</td><td class="colon">:</td><td class="val">${st.fullName || '-'}</td>
      </tr>
      <tr>
        <td class="label">NIK (No. KTP/KIA)</td><td class="colon">:</td><td class="val">${st.nik || '-'}</td>
      </tr>
      <tr>
        <td class="label">No. Kartu Keluarga (KK)</td><td class="colon">:</td><td class="val">${st.familyCardNumber || '-'}</td>
      </tr>
      <tr>
        <td class="label">NISN</td><td class="colon">:</td><td class="val">${st.nisn || '-'}</td>
      </tr>
      <tr>
        <td class="label">No. Akta Kelahiran</td><td class="colon">:</td><td class="val">${st.birthCertificateNumber || '-'}</td>
      </tr>
      <tr>
        <td class="label">Jenis Kelamin</td><td class="colon">:</td><td class="val">${st.gender === 'L' ? 'Laki-laki' : (st.gender === 'P' ? 'Perempuan' : '-')}</td>
      </tr>
      <tr>
        <td class="label">Tempat Lahir</td><td class="colon">:</td><td class="val">${st.birthPlace || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal Lahir</td><td class="colon">:</td><td class="val">${formatBirthDate(st.birthDate)}</td>
      </tr>
      <tr>
        <td class="label">Agama</td><td class="colon">:</td><td class="val">${st.religion || 'Islam'}</td>
      </tr>
      <tr>
        <td class="label">Golongan Darah</td><td class="colon">:</td><td class="val">${st.bloodType || '-'}</td>
      </tr>
      <tr>
        <td class="label">Anak Ke / Jumlah Saudara</td><td class="colon">:</td><td class="val">Anak ke-${st.childOrder || '-'} dari ${st.siblingsCount || '-'} bersaudara</td>
      </tr>
      <tr>
        <td class="label">Status Anak</td><td class="colon">:</td><td class="val">${formatChildStatus(st.childStatus)}</td>
      </tr>
    </table>

    <!-- B. ALAMAT TEMPAT TINGGAL -->
    <div class="section-title">B. Alamat Tempat Tinggal</div>
    <table class="data-table">
      <tr>
        <td class="label">Alamat Lengkap (Jalan/Dusun)</td><td class="colon">:</td><td class="val">${st.fullAddress || '-'}</td>
      </tr>
      <tr>
        <td class="label">RT</td><td class="colon">:</td><td class="val">${st.rt || '-'}</td>
      </tr>
      <tr>
        <td class="label">RW</td><td class="colon">:</td><td class="val">${st.rw || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kelurahan / Desa</td><td class="colon">:</td><td class="val">${st.village || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kecamatan</td><td class="colon">:</td><td class="val">${st.subDistrict || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kabupaten / Kota</td><td class="colon">:</td><td class="val">${st.cityDistrict || '-'}</td>
      </tr>
      <tr>
        <td class="label">Provinsi</td><td class="colon">:</td><td class="val">${st.province || '-'}</td>
      </tr>
      <tr>
        <td class="label">Negara</td><td class="colon">:</td><td class="val">${st.country || 'Indonesia'}</td>
      </tr>
      <tr>
        <td class="label">Kode Pos</td><td class="colon">:</td><td class="val">${st.postalCode || '-'}</td>
      </tr>
    </table>

    <!-- C. ASAL SEKOLAH -->
    <div class="section-title">C. Data Asal Sekolah / Madrasah</div>
    <table class="data-table">
      <tr>
        <td class="label">Nama Sekolah Asal</td><td class="colon">:</td><td class="val">${st.previousSchoolName || '-'}</td>
      </tr>
      <tr>
        <td class="label">Jenjang Sekolah</td><td class="colon">:</td><td class="val">${formatSchoolLevel(st.previousSchoolLevel)}</td>
      </tr>
      ${st.previousSchoolNpsn ? `<tr>
        <td class="label">NPSN Sekolah Asal</td><td class="colon">:</td><td class="val">${st.previousSchoolNpsn}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Tahun Lulus</td><td class="colon">:</td><td class="val">${st.graduationYear || '-'}</td>
      </tr>
      <tr>
        <td class="label">No. Seri Ijazah / SKL</td><td class="colon">:</td><td class="val">${st.diplomaNumber || '-'}</td>
      </tr>
      <tr>
        <td class="label">Alamat Sekolah Asal</td><td class="colon">:</td><td class="val">${st.previousSchoolAddress || '-'}</td>
      </tr>
    </table>

    <!-- D. DATA ORANG TUA KANDUNG -->
    <div class="section-title">D. Data Orang Tua Kandung</div>
    
    <div class="sub-section-title">• DATA AYAH KANDUNG</div>
    <table class="data-table">
      <tr>
        <td class="label">Nama Ayah Kandung</td><td class="colon">:</td><td class="val">${st.fatherName || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Ayah</td><td class="colon">:</td><td class="val">${formatParentStatus(st.fatherStatus)}</td>
      </tr>
      <tr>
        <td class="label">NIK Ayah</td><td class="colon">:</td><td class="val">${st.fatherNik || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tempat Lahir Ayah</td><td class="colon">:</td><td class="val">${st.fatherBirthPlace || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal Lahir Ayah</td><td class="colon">:</td><td class="val">${formatBirthDate(st.fatherBirthDate)}</td>
      </tr>
      <tr>
        <td class="label">Pendidikan Ayah</td><td class="colon">:</td><td class="val">${formatEducation(st.fatherEducation)}</td>
      </tr>
      <tr>
        <td class="label">Pekerjaan Ayah</td><td class="colon">:</td><td class="val">${st.fatherOccupation || '-'}</td>
      </tr>
      <tr>
        <td class="label">Penghasilan Ayah</td><td class="colon">:</td><td class="val">${formatIncome(st.fatherMonthlyIncome)}</td>
      </tr>
      <tr>
        <td class="label">No. WhatsApp Ayah</td><td class="colon">:</td><td class="val">${st.fatherWhatsapp || '-'}</td>
      </tr>
    </table>

    <div class="sub-section-title">• DATA IBU KANDUNG</div>
    <table class="data-table">
      <tr>
        <td class="label">Nama Ibu Kandung</td><td class="colon">:</td><td class="val">${st.motherName || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Ibu</td><td class="colon">:</td><td class="val">${formatParentStatus(st.motherStatus)}</td>
      </tr>
      <tr>
        <td class="label">NIK Ibu</td><td class="colon">:</td><td class="val">${st.motherNik || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tempat Lahir Ibu</td><td class="colon">:</td><td class="val">${st.motherBirthPlace || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal Lahir Ibu</td><td class="colon">:</td><td class="val">${formatBirthDate(st.motherBirthDate)}</td>
      </tr>
      <tr>
        <td class="label">Pendidikan Ibu</td><td class="colon">:</td><td class="val">${formatEducation(st.motherEducation)}</td>
      </tr>
      <tr>
        <td class="label">Pekerjaan Ibu</td><td class="colon">:</td><td class="val">${st.motherOccupation || '-'}</td>
      </tr>
      <tr>
        <td class="label">Penghasilan Ibu</td><td class="colon">:</td><td class="val">${formatIncome(st.motherMonthlyIncome)}</td>
      </tr>
      <tr>
        <td class="label">No. WhatsApp Ibu</td><td class="colon">:</td><td class="val">${st.motherWhatsapp || '-'}</td>
      </tr>
    </table>

    <!-- E. DATA WALI (JIKA ADA) -->
    ${st.hasGuardian ? `
      <div class="section-title">E. Data Wali Calon Santri</div>
      <table class="data-table">
        <tr>
          <td class="label">Nama Wali</td><td class="colon">:</td><td class="val">${st.guardianName || '-'}</td>
        </tr>
        <tr>
          <td class="label">Hubungan dengan Santri</td><td class="colon">:</td><td class="val">${st.guardianRelation || '-'}</td>
        </tr>
        <tr>
          <td class="label">NIK Wali</td><td class="colon">:</td><td class="val">${st.guardianNik || '-'}</td>
        </tr>
        <tr>
          <td class="label">Tempat Lahir Wali</td><td class="colon">:</td><td class="val">${st.guardianBirthPlace || '-'}</td>
        </tr>
        <tr>
          <td class="label">Tanggal Lahir Wali</td><td class="colon">:</td><td class="val">${formatBirthDate(st.guardianBirthDate)}</td>
        </tr>
        <tr>
          <td class="label">Pendidikan Wali</td><td class="colon">:</td><td class="val">${formatEducation(st.guardianEducation)}</td>
        </tr>
        <tr>
          <td class="label">Pekerjaan Wali</td><td class="colon">:</td><td class="val">${st.guardianOccupation || '-'}</td>
        </tr>
        <tr>
          <td class="label">Penghasilan Wali</td><td class="colon">:</td><td class="val">${formatIncome(st.guardianMonthlyIncome)}</td>
        </tr>
        <tr>
          <td class="label">No. WhatsApp Wali</td><td class="colon">:</td><td class="val">${st.guardianWhatsapp || '-'}</td>
        </tr>
        <tr>
          <td class="label">Alamat Wali</td><td class="colon">:</td><td class="val">${st.guardianAddress || '-'}</td>
        </tr>
      </table>
    ` : ''}

    <!-- F. KONTAK DARURAT & FISIK -->
    <div class="section-title">F. Kontak Utama & Kondisi Fisik</div>
    <table class="data-table">
      <tr>
        <td class="label">Nama Kontak Utama</td><td class="colon">:</td><td class="val">${st.primaryContactName || '-'}</td>
      </tr>
      <tr>
        <td class="label">Hubungan Kontak Utama</td><td class="colon">:</td><td class="val">${st.primaryContactRelation || '-'}</td>
      </tr>
      <tr>
        <td class="label">No. WhatsApp Kontak Utama</td><td class="colon">:</td><td class="val"><strong>${st.primaryContactWhatsapp || '-'}</strong></td>
      </tr>
      <tr>
        <td class="label">Tinggi Badan</td><td class="colon">:</td><td class="val">${st.heightCm ? st.heightCm + ' cm' : '-'}</td>
      </tr>
      <tr>
        <td class="label">Berat Badan</td><td class="colon">:</td><td class="val">${st.weightKg ? st.weightKg + ' kg' : '-'}</td>
      </tr>
      <tr>
        <td class="label">Kebutuhan Khusus</td><td class="colon">:</td><td class="val">${st.hasSpecialNeeds ? ('Ya' + (st.specialNeedsDescription ? ' (' + st.specialNeedsDescription + ')' : '')) : 'Tidak Ada'}</td>
      </tr>
    </table>

    <!-- G. PRESTASI -->
    <div class="section-title">G. Catatan Prestasi Santri (${achs.length})</div>
    ${achs.length === 0 ? '<div style="font-size: 8pt; color: #64748b; margin-bottom: 4px;">- Tidak ada catatan prestasi khusus terdaftar -</div>' : `
      <table class="table-grid">
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">No</th>
            <th>Nama Kejuaraan / Prestasi</th>
            <th>Jenis</th>
            <th>Tingkat</th>
            <th>Peringkat / Tahun</th>
          </tr>
        </thead>
        <tbody>
          ${achs.map((a, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${a.name}</strong></td>
              <td>${a.type}</td>
              <td>${a.level}</td>
              <td>${a.rank} (${a.year})</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <!-- H. DOKUMEN & BERKAS TERLAMPIR -->
    <div class="section-title">H. Dokumen Berkas Terlampir (${docs.length})</div>
    <table class="table-grid">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">No</th>
          <th>Jenis Dokumen Persyaratan</th>
          <th>Nama File Terunggah</th>
          <th>Status Berkas</th>
        </tr>
      </thead>
      <tbody>
        ${docs.map((doc, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td><strong>${formatDocumentType(doc.documentType)}</strong></td>
            <td>${doc.originalFileName || '-'}</td>
            <td><span style="color: #16a34a; font-weight: 700;">✓ Terunggah</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TANDA TANGAN & PENGESAHAN -->
    <div class="signatures">
      <div>
        <p>Calon Santri / Orang Tua / Wali,</p>
        <div class="sig-space"></div>
        <p><strong>( ${st.fullName || '...........................................'} )</strong></p>
      </div>
      <div>
        <p>Gresik, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Petugas Verifikasi Panitia PSB,</p>
        <div class="sig-space"></div>
        <p><strong>( Panitia Penerimaan Santri Baru )</strong></p>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  <\/script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();

  } catch (err) {
    alert('Gagal mencetak formulir: ' + err.message);
  }
}

// Aliases for compatibility
const toggleGuardianFields = toggleGuardianSection;
const toggleSpecialNeedsFields = toggleSpecialNeedsField;

// ============================================================================
// 4. VERIFIKASI FINAL / KEPUTUSAN KELULUSAN (SUPER ADMIN)
// ============================================================================

window.finalVerificationState = {
  items: [],
  filteredItems: [],
  selectedItem: null,
};

function getFinalAdmissionStatusBadge(status) {
  switch (status) {
    case 'ACCEPTED':
      return '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-check"></i> DITERIMA</span>';
    case 'REJECTED':
      return '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark"></i> DITOLAK</span>';
    case 'WAITLISTED':
      return '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-clock"></i> CADANGAN</span>';
    default:
      return '<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-weight:700; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-hourglass"></i> BELUM DIPUTUSKAN</span>';
  }
}
window.getFinalAdmissionStatusBadge = getFinalAdmissionStatusBadge;

window.finalVerificationTabMode = 'completed'; // 'completed' | 'all'

async function renderAdminFinalVerificationView(tabMode = null) {
  if (tabMode) window.finalVerificationTabMode = tabMode;
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: #10b981;"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Memuat Antrean Verifikasi Final & Kelulusan...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/registrations/admin/final-verification-list?perPage=200');
    const allItems = res.success ? (res.data || []) : [];
    window.finalVerificationState.allItems = allItems;

    // Filter items based on stage completion
    const readyItems = allItems.filter(reg => {
      const isDocOk = reg.formStatus === 'VERIFIED';
      const isCbtOk = reg.cbtAttempt && (reg.cbtAttempt.status === 'COMPLETED' || reg.cbtAttempt.status === 'EXPIRED' || reg.cbtAttempt.verificationStatus === 'VERIFIED');
      const isInterviewOk = reg.interview && reg.interview.status === 'COMPLETED';
      return isDocOk && isCbtOk && isInterviewOk;
    });

    const isShowingCompletedOnly = window.finalVerificationTabMode === 'completed';
    const activeList = isShowingCompletedOnly ? readyItems : allItems;
    window.finalVerificationState.items = activeList;
    window.finalVerificationState.filteredItems = activeList;

    const totalCount = activeList.length;
    const acceptedCount = activeList.filter(i => i.finalStatus === 'ACCEPTED').length;
    const rejectedCount = activeList.filter(i => i.finalStatus === 'REJECTED').length;
    const waitlistedCount = activeList.filter(i => i.finalStatus === 'WAITLISTED').length;
    const undecidedCount = activeList.filter(i => !i.finalStatus || i.finalStatus === 'UNDECIDED').length;

    container.innerHTML = `
      <div style="max-width: 1300px; margin: 0 auto; padding-bottom: 50px;">
        
        <!-- Header -->
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.65rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-award" style="color: #10b981;"></i>
              Verifikasi Final & Keputusan Kelulusan
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
              Daftar siswa yang telah menyelesaikan Verifikasi Berkas, Ujian CBT, dan Wawancara untuk penetapan keputusan akhir.
            </p>
          </div>
          <button type="button" class="btn btn-secondary" onclick="renderAdminFinalVerificationView()" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
            <i class="fa-solid fa-rotate-right"></i> Refresh Data
          </button>
        </div>

        <!-- Tab Mode Switcher -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          <button type="button" onclick="renderAdminFinalVerificationView('completed')" class="btn ${isShowingCompletedOnly ? 'btn-primary' : 'btn-outline'}" style="font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 8px 16px;">
            <i class="fa-solid fa-circle-check"></i> Siap Verifikasi Final (Lengkap 3 Tahap)
            <span class="badge" style="background: ${isShowingCompletedOnly ? 'rgba(255,255,255,0.25)' : 'var(--primary-600)'}; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${readyItems.length}</span>
          </button>
          <button type="button" onclick="renderAdminFinalVerificationView('all')" class="btn ${!isShowingCompletedOnly ? 'btn-primary' : 'btn-outline'}" style="font-weight: 700; border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 8px 16px;">
            <i class="fa-solid fa-users"></i> Semua Calon Santri
            <span class="badge" style="background: ${!isShowingCompletedOnly ? 'rgba(255,255,255,0.25)' : '#64748b'}; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${allItems.length}</span>
          </button>
        </div>

        <!-- 5 Summary Metric Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Antrean</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">${totalCount}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">Calon Santri</div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid #86efac; border-radius: var(--radius-lg, 12px); padding: 18px; box-shadow: var(--shadow-sm); background: rgba(34,197,94,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #15803d; text-transform: uppercase;">Diterima / Lolos</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #16a34a; margin-top: 4px;">${acceptedCount}</div>
            <div style="font-size: 0.75rem; color: #15803d; margin-top: 2px;">Santri Baru Resmi</div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid #fde68a; border-radius: var(--radius-lg, 12px); padding: 18px; box-shadow: var(--shadow-sm); background: rgba(245,158,11,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Cadangan / Pending</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #d97706; margin-top: 4px;">${waitlistedCount}</div>
            <div style="font-size: 0.75rem; color: #b45309; margin-top: 2px;">Menunggu Kuota</div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid #fca5a5; border-radius: var(--radius-lg, 12px); padding: 18px; box-shadow: var(--shadow-sm); background: rgba(239,68,68,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Ditolak / Tidak Lolos</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #dc2626; margin-top: 4px;">${rejectedCount}</div>
            <div style="font-size: 0.75rem; color: #b91c1c; margin-top: 2px;">Tidak Memenuhi Syarat</div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Belum Diputuskan</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #64748b; margin-top: 4px;">${undecidedCount}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">Menunggu Keputusan</div>
          </div>

        </div>

        <!-- Filter & Search Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
            <div style="flex: 1; min-width: 250px; position: relative;">
              <i class="fa-solid fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
              <input type="text" id="final-search" placeholder="Cari nama calon santri / nomor registrasi..." oninput="filterFinalVerificationTable()" style="width: 100%; padding: 10px 12px 10px 36px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 8px; font-size: 0.9rem;">
            </div>
            <select id="final-status-filter" onchange="filterFinalVerificationTable()" style="padding: 10px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 8px; font-size: 0.875rem;">
              <option value="">-- Semua Status Keputusan --</option>
              <option value="UNDECIDED">Belum Diputuskan</option>
              <option value="ACCEPTED">Diterima / Lolos</option>
              <option value="WAITLISTED">Cadangan / Pending</option>
              <option value="REJECTED">Ditolak / Tidak Lolos</option>
            </select>
          </div>
        </div>

        <!-- Candidate Final Verification Table -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); overflow: visible; box-shadow: var(--shadow-sm);">
          <div class="table-responsive" style="overflow-x: auto; min-height: 250px;">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                  <th style="padding: 14px 16px; width: 45px;">No</th>
                  <th style="padding: 14px 16px; min-width: 180px;">Calon Santri</th>
                  <th style="padding: 14px 16px; min-width: 160px;">Sekolah & Program</th>
                  <th style="padding: 14px 16px; text-align: center; min-width: 120px;">1. Berkas & Bayar</th>
                  <th style="padding: 14px 16px; text-align: center; min-width: 110px;">2. Ujian CBT</th>
                  <th style="padding: 14px 16px; text-align: center; min-width: 130px;">3. Wawancara</th>
                  <th style="padding: 14px 16px; text-align: center; min-width: 130px;">Keputusan Final</th>
                  <th class="final-verif-col-action" style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-body); z-index: 5; box-shadow: -4px 0 8px rgba(0,0,0,0.06); width: 140px;">Aksi</th>
                </tr>
              </thead>
              <tbody id="final-verif-table-body" style="font-size: 0.875rem;">
                ${renderFinalTableRows(activeList)}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">${err.message}</div>`;
  }
}
window.renderAdminFinalVerificationView = renderAdminFinalVerificationView;

function renderFinalTableRows(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Tidak ada data calon santri yang sesuai kriteria filter.
        </td>
      </tr>
    `;
  }

  return items.map((reg, idx) => {
    const name = reg.studentDetail?.fullName || reg.individualParticipant?.fullName || reg.user?.name || 'Calon Santri';
    const regNum = reg.registrationNumber || reg.id;
    const schoolProgram = reg.schoolName ? `${reg.schoolName} (${reg.classProgramName || reg.majorName || '-'})` : (reg.classProgramName || '-');
    const g = (reg.studentDetail?.gender || reg.individualParticipant?.gender || 'L').toUpperCase();
    const isMale = g === 'L';
    const genderBadge = isMale
      ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♂ L</span>`
      : `<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♀ P</span>`;

    // 1. Berkas & Bayar
    const isFormVerified = reg.formStatus === 'VERIFIED';
    const isPayApproved = reg.status === 'APPROVED';
    const docPayHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <span class="badge" style="background:${isFormVerified ? '#dcfce7' : '#fef3c7'}; color:${isFormVerified ? '#15803d' : '#b45309'}; border:1px solid ${isFormVerified ? '#86efac' : '#fde68a'}; font-size:0.72rem; padding:2px 6px; border-radius:4px;">
          ${isFormVerified ? 'Berkas: OK' : (reg.formStatus || 'DRAFT')}
        </span>
        <span class="badge" style="background:${isPayApproved ? '#dcfce7' : '#fee2e2'}; color:${isPayApproved ? '#15803d' : '#b91c1c'}; border:1px solid ${isPayApproved ? '#86efac' : '#fca5a5'}; font-size:0.72rem; padding:2px 6px; border-radius:4px;">
          ${isPayApproved ? 'Bayar: LUNAS' : 'Bayar: BELUM'}
        </span>
      </div>
    `;

    // 2. CBT
    const cbt = reg.cbtAttempt;
    const cbtScore = cbt?.totalScore !== undefined && cbt?.totalScore !== null ? Number(cbt.totalScore).toFixed(1) : '-';
    const isCbtVerified = cbt?.verificationStatus === 'VERIFIED';
    const isCbtCompleted = cbt?.status === 'COMPLETED' || cbt?.status === 'EXPIRED';
    const cbtHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <strong style="color: #16a34a; font-size: 0.95rem;">${cbtScore}</strong>
        <span class="badge" style="background:${isCbtVerified ? '#dcfce7' : isCbtCompleted ? '#e0f2fe' : '#f1f5f9'}; color:${isCbtVerified ? '#15803d' : isCbtCompleted ? '#0284c7' : '#64748b'}; border:1px solid ${isCbtVerified ? '#86efac' : isCbtCompleted ? '#7dd3fc' : '#cbd5e1'}; font-size:0.7rem; padding:2px 6px; border-radius:4px;">
          ${isCbtVerified ? 'LULUS CBT' : isCbtCompleted ? 'SUDAH CBT' : 'BELUM CBT'}
        </span>
      </div>
    `;

    // 3. Wawancara
    const iw = reg.interview;
    const iwCompleted = iw?.status === 'COMPLETED';
    const recBadge = typeof getRecommendationBadge === 'function' ? getRecommendationBadge(iw?.recommendation) : (iw?.recommendation || '-');
    const iwHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        ${iwCompleted ? recBadge : `<span class="badge badge-secondary" style="font-size:0.72rem;">Belum Selesai</span>`}
        ${iw?.schedule?.roomLocation ? `<span style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(iw.schedule.roomLocation)}</span>` : ''}
      </div>
    `;

    // 4. Final Status
    const finalBadge = getFinalAdmissionStatusBadge(reg.finalStatus || 'UNDECIDED');
    const finalNotesStr = reg.finalNotes ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(reg.finalNotes)}">"${escapeHtml(reg.finalNotes)}"</div>` : '';

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${idx + 1}</td>
        <td style="padding: 14px 16px;">
          <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
            ${escapeHtml(name)} ${genderBadge}
          </div>
          <div style="font-size: 0.775rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
            No. Reg: <strong>${escapeHtml(regNum)}</strong>
          </div>
        </td>
        <td style="padding: 14px 16px; font-size: 0.825rem;">
          <strong>${escapeHtml(schoolProgram)}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            Asal: ${escapeHtml(reg.studentDetail?.previousSchoolName || reg.individualParticipant?.schoolName || '-')}
          </div>
        </td>
        <td style="padding: 14px 16px; text-align: center;">
          ${docPayHtml}
        </td>
        <td style="padding: 14px 16px; text-align: center;">
          ${cbtHtml}
        </td>
        <td style="padding: 14px 16px; text-align: center;">
          ${iwHtml}
        </td>
        <td style="padding: 14px 16px; text-align: center;">
          ${finalBadge}
          ${finalNotesStr}
        </td>
        <td class="final-verif-col-action" style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-card); z-index: 6; box-shadow: -4px 0 8px rgba(0,0,0,0.06); white-space: nowrap;">
          <div class="final-decision-dropdown" id="dropdown-wrapper-${reg.id}">
            <button type="button" class="btn btn-sm ${reg.finalStatus === 'ACCEPTED' ? 'btn-success' : reg.finalStatus === 'WAITLISTED' ? 'btn-warning' : reg.finalStatus === 'REJECTED' ? 'btn-danger' : 'btn-outline-primary'}" style="padding: 6px 12px; font-weight: 700; font-size: 0.775rem; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;" onclick="toggleFinalActionDropdown('${reg.id}', event)">
              <i class="fa-solid fa-gavel"></i>
              <span>${reg.finalStatus === 'ACCEPTED' ? 'Diterima' : reg.finalStatus === 'WAITLISTED' ? 'Cadangan' : reg.finalStatus === 'REJECTED' ? 'Ditolak' : 'Keputusan'}</span>
              <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem;"></i>
            </button>
            <div id="final-menu-${reg.id}" class="final-decision-menu" style="display: none;">
              <button type="button" class="final-decision-item accept" onclick="selectFinalDecision('${reg.id}', 'ACCEPTED')">
                <i class="fa-solid fa-check" style="width: 14px;"></i> <span>Terima / Lolos</span>
              </button>
              <button type="button" class="final-decision-item waitlist" onclick="selectFinalDecision('${reg.id}', 'WAITLISTED')">
                <i class="fa-solid fa-clock" style="width: 14px;"></i> <span>Cadangan / Pending</span>
              </button>
              <button type="button" class="final-decision-item reject" onclick="selectFinalDecision('${reg.id}', 'REJECTED')">
                <i class="fa-solid fa-xmark" style="width: 14px;"></i> <span>Tolak / Tidak Lolos</span>
              </button>
              ${reg.finalStatus && reg.finalStatus !== 'UNDECIDED' ? `
                <div style="height: 1px; background: var(--border-subtle); margin: 2px 0;"></div>
                <button type="button" class="final-decision-item reset" onclick="selectFinalDecision('${reg.id}', 'UNDECIDED')">
                  <i class="fa-solid fa-rotate-left" style="width: 14px;"></i> <span>Reset Status</span>
                </button>
              ` : ''}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Global click handler to close open final decision dropdowns
document.addEventListener('click', function (e) {
  if (!e.target.closest('.final-decision-dropdown')) {
    document.querySelectorAll('.final-decision-menu').forEach(menu => {
      menu.style.display = 'none';
      menu.classList.remove('dropup');
    });
    document.querySelectorAll('.final-verif-col-action').forEach(td => td.classList.remove('active-dropdown'));
    document.querySelectorAll('tr').forEach(tr => tr.classList.remove('has-active-dropdown'));
    document.querySelectorAll('.final-decision-dropdown').forEach(dd => dd.classList.remove('active'));
  }
});

function toggleFinalActionDropdown(regId, event) {
  if (event) event.stopPropagation();
  const targetMenu = document.getElementById(`final-menu-${regId}`);
  const dropdownWrapper = document.getElementById(`dropdown-wrapper-${regId}`);
  const parentTd = dropdownWrapper ? dropdownWrapper.closest('td') : null;
  const parentTr = dropdownWrapper ? dropdownWrapper.closest('tr') : null;
  const isAlreadyOpen = targetMenu && targetMenu.style.display === 'flex';

  // Close all open menus first
  document.querySelectorAll('.final-decision-menu').forEach(m => {
    m.style.display = 'none';
    m.classList.remove('dropup');
  });
  document.querySelectorAll('.final-verif-col-action').forEach(td => td.classList.remove('active-dropdown'));
  document.querySelectorAll('tr').forEach(tr => tr.classList.remove('has-active-dropdown'));
  document.querySelectorAll('.final-decision-dropdown').forEach(dd => dd.classList.remove('active'));

  if (targetMenu && !isAlreadyOpen) {
    // Check if dropdown is near bottom of screen
    const btn = dropdownWrapper ? dropdownWrapper.querySelector('button') : null;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220) {
        targetMenu.classList.add('dropup');
      }
    }

    if (dropdownWrapper) dropdownWrapper.classList.add('active');
    if (parentTd) parentTd.classList.add('active-dropdown');
    if (parentTr) parentTr.classList.add('has-active-dropdown');
    targetMenu.style.display = 'flex';
  }
}
window.toggleFinalActionDropdown = toggleFinalActionDropdown;

function selectFinalDecision(regId, status) {
  // Close menu & clean classes
  const menu = document.getElementById(`final-menu-${regId}`);
  if (menu) {
    menu.style.display = 'none';
    menu.classList.remove('dropup');
  }
  document.querySelectorAll('.final-verif-col-action').forEach(td => td.classList.remove('active-dropdown'));
  document.querySelectorAll('tr').forEach(tr => tr.classList.remove('has-active-dropdown'));
  document.querySelectorAll('.final-decision-dropdown').forEach(dd => dd.classList.remove('active'));

  openFinalDecisionModal(regId, status);
}
window.selectFinalDecision = selectFinalDecision;

function filterFinalVerificationTable() {
  const search = (document.getElementById('final-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('final-status-filter')?.value || '';

  let filtered = window.finalVerificationState.items || [];

  if (search) {
    filtered = filtered.filter(reg => {
      const name = (reg.studentDetail?.fullName || reg.individualParticipant?.fullName || reg.user?.name || '').toLowerCase();
      const num = (reg.registrationNumber || '').toLowerCase();
      const school = (reg.schoolName || '').toLowerCase();
      return name.includes(search) || num.includes(search) || school.includes(search);
    });
  }

  if (status) {
    if (status === 'UNDECIDED') {
      filtered = filtered.filter(reg => !reg.finalStatus || reg.finalStatus === 'UNDECIDED');
    } else {
      filtered = filtered.filter(reg => reg.finalStatus === status);
    }
  }

  const tbody = document.getElementById('final-verif-table-body');
  if (tbody) {
    tbody.innerHTML = renderFinalTableRows(filtered);
  }
}
window.filterFinalVerificationTable = filterFinalVerificationTable;

function openFinalDecisionModal(regId, targetStatus) {
  const allList = window.finalVerificationState.allItems || window.finalVerificationState.items || [];
  const reg = allList.find(r => r.id === regId);
  if (!reg) return;

  const name = reg.studentDetail?.fullName || reg.individualParticipant?.fullName || reg.user?.name || 'Calon Santri';
  const modal = document.getElementById('app-modal');
  const modalBody = document.getElementById('app-modal-body');
  if (!modal || !modalBody) return;

  let actionTitle = 'Terima Calon Santri';
  let actionColor = '#16a34a';
  let actionIcon = 'fa-circle-check';
  let defaultNote = 'Selamat! Anda dinyatakan LULUS dan DITERIMA sebagai Calon Santri Baru.';

  if (targetStatus === 'REJECTED') {
    actionTitle = 'Tolak Calon Santri';
    actionColor = '#dc2626';
    actionIcon = 'fa-circle-xmark';
    defaultNote = 'Mohon maaf, Anda belum memenuhi kriteria kelulusan seleksi penerimaan santri baru tahun ini.';
  } else if (targetStatus === 'WAITLISTED') {
    actionTitle = 'Tetapkan Sebagai Cadangan / Pending';
    actionColor = '#d97706';
    actionIcon = 'fa-clock';
    defaultNote = 'Anda masuk dalam daftar cadangan seleksi penerimaan santri baru.';
  } else if (targetStatus === 'UNDECIDED') {
    actionTitle = 'Reset Keputusan Kelulusan';
    actionColor = '#64748b';
    actionIcon = 'fa-rotate-left';
    defaultNote = '';
  }

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: ${actionColor}20; color: ${actionColor}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
          <i class="fa-solid ${actionIcon}"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">${actionTitle}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(name)} &bull; ${escapeHtml(reg.registrationNumber || reg.id)}</div>
        </div>
      </div>
      <p style="margin: 0; font-size: 0.9rem; color: var(--text-main); line-height: 1.5;">
        ${targetStatus === 'UNDECIDED'
      ? 'Status calon santri akan dikembalikan ke antrean belum diputuskan.'
      : 'Keputusan ini akan langsung mengubah status di dashboard calon santri dan menerbitkan notifikasi kelulusan.'}
      </p>
    </div>

    <div style="margin-bottom: 18px;">
      <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px;">
        Catatan / Keterangan Resmi untuk Santri (Opsional):
      </label>
      <textarea id="final-decision-notes" class="form-control" rows="3" placeholder="Masukkan catatan atau keterangan..." style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 8px; font-size: 0.9rem;">${escapeHtml(targetStatus === 'UNDECIDED' ? '' : (reg.finalNotes || defaultNote))}</textarea>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 10px;">
      <button type="button" class="btn btn-secondary" onclick="closeAppModal()">Batal</button>
      <button type="button" class="btn" style="background: ${actionColor}; color: #ffffff; font-weight: 800; border-color: ${actionColor}; padding: 10px 20px;" onclick="submitFinalDecision('${regId}', '${targetStatus}')">
        <i class="fa-solid fa-check"></i> Simpan Keputusan
      </button>
    </div>
  `;

  modal.classList.add('active');
}
window.openFinalDecisionModal = openFinalDecisionModal;

function closeAppModal() {
  const modal = document.getElementById('app-modal');
  if (modal) modal.classList.remove('active');
}
window.closeAppModal = closeAppModal;

async function submitFinalDecision(regId, finalStatus) {
  const notes = document.getElementById('final-decision-notes')?.value || '';

  try {
    const res = await apiRequest(`/api/registrations/${regId}/final-verification`, 'POST', {
      finalStatus,
      notes,
    });

    if (!res.success) throw new Error(res.message || 'Gagal menyimpan keputusan verifikasi final.');

    closeAppModal();
    if (typeof showInterviewToast === 'function') {
      showInterviewToast('Keputusan final berhasil disimpan dan diterbitkan ke calon santri!', 'success');
    } else if (typeof showToast === 'function') {
      showToast('Keputusan final berhasil disimpan!', 'success');
    }

    renderAdminFinalVerificationView();
  } catch (err) {
    alert(err.message);
  }
}
window.submitFinalDecision = submitFinalDecision;

// Export all Stage 2 functions to window
window.renderAdminPeriodsView = renderAdminPeriodsView;
window.openCreatePeriodModal = openCreatePeriodModal;
window.submitCreatePeriod = submitCreatePeriod;
window.openEditPeriodModal = openEditPeriodModal;
window.submitEditPeriod = submitEditPeriod;
window.togglePeriodStatus = togglePeriodStatus;
window.executeDeletePeriod = executeDeletePeriod;

window.renderAdminWavesView = renderAdminWavesView;
window.openCreateWaveModal = openCreateWaveModal;
window.submitCreateWave = submitCreateWave;
window.openEditWaveModal = openEditWaveModal;
window.submitEditWave = submitEditWave;
window.toggleWaveStatus = toggleWaveStatus;
window.executeDeleteWave = executeDeleteWave;

window.renderAdminVerificationView = renderAdminVerificationView;
window.openAdminVerificationDetailModal = openAdminVerificationDetailModal;
window.openVerificationDetailModal = openAdminVerificationDetailModal;
window.submitAdminVerification = submitAdminVerification;
window.openRequestRevisionModal = openRequestRevisionModal;
window.submitAdminRevision = submitAdminRevision;
window.filterVerificationTable = filterVerificationTable;

window.renderPesertaFullFormView = renderPesertaFullFormView;
window.renderPesertaFullFormMenu = renderPesertaFullFormMenu;
window.printFullStudentForm = printFullStudentForm;
window.downloadFullStudentFormPDF = printFullStudentForm;
window.uploadFormDocument = uploadFormDocument;
window.deleteFormDocument = deleteFormDocument;
window.handleSaveFormDraft = handleSaveFormDraft;
window.handleFinalFormSubmit = handleFinalFormSubmit;
window.addAchievementRow = addAchievementRow;
window.toggleGuardianSection = toggleGuardianSection;
window.toggleGuardianFields = toggleGuardianFields;
window.toggleSpecialNeedsField = toggleSpecialNeedsField;
window.toggleSpecialNeedsFields = toggleSpecialNeedsFields;
window.toggleCountryFields = toggleCountryFields;
window.getFormStatusBadge = getFormStatusBadge;

window.formatBirthDate = formatBirthDate;
window.formatIncome = formatIncome;
window.formatParentStatus = formatParentStatus;
window.formatEducation = formatEducation;
window.formatSchoolLevel = formatSchoolLevel;
window.formatChildStatus = formatChildStatus;
window.formatDocumentType = formatDocumentType;

window.initWilayahDropdowns = initWilayahDropdowns;
window.loadRegencies = loadRegencies;
window.loadDistricts = loadDistricts;
window.loadVillages = loadVillages;
window.handleProvinceChange = handleProvinceChange;
window.handleRegencyChange = handleRegencyChange;
window.handleDistrictChange = handleDistrictChange;
window.handleVillageChange = handleVillageChange;




