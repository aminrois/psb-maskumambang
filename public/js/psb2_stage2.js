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
              <button class="btn btn-sm btn-secondary" data-period-id="${p.id}" data-period-name="${escapeHtml(p.name)}" onclick="openEditPeriodModal(this)"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              <button class="btn btn-sm ${p.isActive ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="togglePeriodStatus('${p.id}')">
                ${p.isActive ? 'Nonaktifkan' : '<i class="fa-solid fa-circle-check"></i> Aktifkan'}
              </button>
              <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" title="Hapus Periode" data-period-id="${p.id}" data-period-name="${escapeHtml(p.name)}" onclick="executeDeletePeriod(this)"><i class="fa-solid fa-trash-can"></i></button>
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

function openEditPeriodModal(target, currentName) {
  let id = target;
  if (target && typeof target === 'object' && target.nodeType) {
    id = target.getAttribute('data-period-id') || target.dataset?.periodId;
    currentName = target.getAttribute('data-period-name') || target.dataset?.periodName;
  }
  openModal('Edit Periode Tahun Pelajaran', `
    <form id="edit-period-form" onsubmit="submitEditPeriod(event, '${escapeHtml(id)}')">
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Periode / Tahun Pelajaran</label>
        <input type="text" id="m-edit-period-name" class="form-control" value="${escapeHtml(currentName || '')}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
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

async function executeDeletePeriod(target, name) {
  let id = target;
  if (target && typeof target === 'object' && target.nodeType) {
    id = target.getAttribute('data-period-id') || target.dataset?.periodId;
    name = target.getAttribute('data-period-name') || target.dataset?.periodName;
  }
  const safeName = name || '';
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Hapus Periode Pendaftaran',
        message: `Apakah Anda yakin ingin menghapus periode "${safeName}"?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger'
      })
    : confirm(`Apakah Anda yakin ingin menghapus periode "${safeName}"?`);
  if (!ok) return;
  try {
    const res = await apiRequest(`/api/competitions/periods/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Periode berhasil dihapus.', 'success');
      renderAdminPeriodsView();
    } else {
      showToast(res.message || 'Gagal menghapus periode.', 'danger');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ============================================================================
// 2. MASTER DATA: GELOMBANG PENDAFTARAN (SUPER ADMIN)
// ============================================================================

async function renderAdminWavesView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat master kuota pendaftaran...</div>';

  try {
    const res = await apiRequest('/api/competitions/waves');
    const waves = res.success ? res.data : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Kuota & Gelombang Pendaftaran</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Kelola kuota pendaftaran santri baru per sekolah, batas kuota terverifikasi, jadwal, dan biaya formulir.</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateWaveModal()"><i class="fa-solid fa-plus"></i> Tambah Kuota Pendaftaran</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        ${waves.length === 0 ? '<div class="alert alert-info">Belum ada data kuota pendaftaran.</div>' : waves.map(w => {
      const now = new Date();
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      const isDateActive = now >= start && now <= end;
      const verified = w.verifiedCount || 0;
      const total = w.totalCount || w._count?.registrations || 0;
      const quota = w.quota;
      const hasQuota = quota !== null && quota !== undefined && quota > 0;
      const percent = hasQuota ? Math.min(100, Math.round((verified / quota) * 100)) : 0;
      const isFull = hasQuota && verified >= quota;
      const schoolQuotas = w.schoolQuotas || [];

      return `
            <div class="card" style="background: var(--bg-card); border: 1px solid ${isFull ? 'var(--danger-300, #fca5a5)' : 'var(--border-subtle)'}; border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <span class="badge badge-primary" style="margin-bottom: 4px;"><i class="fa-solid fa-calendar"></i> Periode ${w.academicPeriod?.name || '-'}</span>
                    <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 2px 0;">${w.name}</h3>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${w.isActive ? 'badge-success' : 'badge-danger'}">${w.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                    <div style="font-size: 0.75rem; margin-top: 4px; color: ${isDateActive ? 'var(--success-600)' : 'var(--text-dim)'}; font-weight: 600;">
                      ${isDateActive ? '● Sedang Berlangsung' : (now < start ? '○ Belum Dibuka' : '✕ Sudah Berakhir')}
                    </div>
                  </div>
                </div>

                <!-- Kuota & Status Keterisian Box -->
                <div style="background: var(--bg-body); border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-users" style="color: var(--primary-600); margin-right: 4px;"></i> Total Kuota:</span>
                    <strong style="font-size: 0.95rem; color: var(--text-heading);">${hasQuota ? `${quota} Santri` : '<span class="badge badge-secondary" style="font-size: 0.75rem;">Tanpa Batas</span>'}</strong>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-circle-check" style="color: var(--success-600); margin-right: 4px;"></i> Terverifikasi:</span>
                    <strong style="font-size: 0.95rem; color: ${isFull ? 'var(--danger-600)' : 'var(--success-600)'};">${verified} ${hasQuota ? `/ ${quota}` : 'Santri'}</strong>
                  </div>

                  ${hasQuota ? `
                    <div style="width: 100%; background: var(--border-subtle); border-radius: 999px; height: 7px; overflow: hidden; margin: 8px 0 6px 0;">
                      <div style="width: ${percent}%; height: 100%; background: ${isFull ? 'var(--danger-500, #ef4444)' : percent > 75 ? 'var(--warning-500, #f59e0b)' : 'var(--primary-600)'}; border-radius: 999px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim);">
                      <span>${percent}% Terisi</span>
                      <span>Sisa Kuota: <strong>${Math.max(0, quota - verified)}</strong></span>
                    </div>
                  ` : ''}

                  <!-- Rincian Kuota per Sekolah -->
                  ${schoolQuotas.length > 0 ? `
                    <div style="margin-top: 10px; border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
                      <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-heading); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-school" style="color: var(--primary-600);"></i> Kuota per Sekolah:
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px;">
                        ${schoolQuotas.map(sq => {
        const sqPercent = sq.quota > 0 ? Math.min(100, Math.round((sq.verifiedCount / sq.quota) * 100)) : 0;
        return `
                            <div style="background: var(--bg-card); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-subtle); font-size: 0.75rem;">
                              <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
                                <span>${sq.schoolName || sq.schoolInitial || 'Sekolah'}</span>
                                <span style="color: ${sq.isFull ? 'var(--danger-600)' : 'var(--primary-600)'};">
                                  ${sq.verifiedCount}/${sq.quota}
                                </span>
                              </div>
                              <div style="width: 100%; background: var(--border-subtle); border-radius: 999px; height: 4px; overflow: hidden; margin-top: 4px;">
                                <div style="width: ${sqPercent}%; height: 100%; background: ${sq.isFull ? 'var(--danger-500)' : 'var(--primary-600)'};"></div>
                              </div>
                            </div>
                          `;
      }).join('')}
                      </div>
                    </div>
                  ` : ''}

                  <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border-subtle); display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                    <span>Total Pendaftar (Semua Status):</span>
                    <strong>${total} Pendaftar</strong>
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
                <button class="btn btn-sm btn-danger" style="padding: 4px 8px;" title="Hapus Kuota Pendaftaran" data-wave-id="${w.id}" data-wave-name="${escapeHtml(w.name)}" onclick="executeDeleteWave(this)"><i class="fa-solid fa-trash-can"></i></button>
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

function toDateInputValue(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

async function fetchAdminPeriodsList() {
  try {
    const res = await apiRequest('/api/competitions/periods');
    return res.success && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch (e) {
    console.warn('Gagal memuat periode:', e);
    return [];
  }
}

async function fetchAdminSchoolsList() {
  if (typeof state !== 'undefined' && state.competitionTree && Array.isArray(state.competitionTree) && state.competitionTree.length > 0) {
    return state.competitionTree;
  }
  try {
    const res = await apiRequest('/api/competitions/categories').catch(() => apiRequest('/api/competitions/schools'));
    const list = res && res.success && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    if (list.length > 0) return list;
  } catch (e) {
    console.warn('Gagal memuat sekolah:', e);
  }
  return [];
}

async function openCreateWaveModal() {
  try {
    const [periods, schools] = await Promise.all([
      fetchAdminPeriodsList(),
      fetchAdminSchoolsList(),
    ]);

    openModal('Tambah Kuota / Gelombang Pendaftaran', `
      <form id="create-wave-form" onsubmit="submitCreateWave(event)">
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih Periode Tahun Pelajaran</label>
          <select id="m-wave-period" class="form-select" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <option value="">-- Pilih Periode --</option>
            ${periods.map(p => `<option value="${p.id}" ${p.isActive ? 'selected' : ''}>${p.name} ${p.isActive ? '(Aktif)' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Kuota / Gelombang</label>
          <input type="text" id="m-wave-name" class="form-control" placeholder="Contoh: Gelombang 1 / Kuota Reguler" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
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

        <!-- SECTION: KUOTA PER SEKOLAH -->
        <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 8px; color: var(--text-heading);">
            <i class="fa-solid fa-school" style="color: var(--primary-600); margin-right: 4px;"></i> Kuota Pendaftar per Sekolah (Santri)
          </label>
          ${schools.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted);">Tidak ada data sekolah.</div>' : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
              ${schools.map(s => `
                <div style="background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                  <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px; color: var(--text-heading);">${s.name}</label>
                  <input type="number" class="form-control m-create-school-quota-input" data-school-id="${s.id}" placeholder="Contoh: 30" min="0" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 4px;">
                </div>
              `).join('')}
            </div>
          `}
          <small style="color: var(--text-muted); font-size: 0.775rem; margin-top: 8px; display: block;">
            * Isi kuota untuk masing-masing sekolah (contoh: SMK 30, MA 40, dst).
          </small>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Biaya Pendaftaran (Rp)</label>
          <input type="number" id="m-wave-fee" class="form-control" placeholder="500000" min="0" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 20px; background: var(--bg-body); padding: 8px 12px; border-radius: 6px;">
          <i class="fa-solid fa-circle-info" style="color: var(--primary-600);"></i> <em>Catatan: Pemenuhan kuota dihitung dari santri yang pembayarannya telah terverifikasi/disetujui (Approved).</em>
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" id="btn-save-wave" class="btn btn-primary"><i class="fa-solid fa-save"></i> Simpan Kuota Pendaftaran</button>
        </div>
      </form>
    `);
  } catch (err) {
    console.error('openCreateWaveModal error:', err);
    alert('Gagal membuka modal tambah kuota: ' + err.message);
  }
}

async function submitCreateWave(e) {
  e.preventDefault();
  const academicPeriodId = document.getElementById('m-wave-period').value;
  const name = document.getElementById('m-wave-name').value;
  const startDate = document.getElementById('m-wave-start').value;
  const endDate = document.getElementById('m-wave-end').value;
  const registrationFee = Number(document.getElementById('m-wave-fee').value);

  const schoolQuotaInputs = document.querySelectorAll('.m-create-school-quota-input');
  const schoolQuotas = [];
  let totalQuotaSum = 0;
  schoolQuotaInputs.forEach(input => {
    const sId = input.getAttribute('data-school-id');
    const qVal = input.value;
    if (sId && qVal !== '') {
      const qNum = Number(qVal);
      schoolQuotas.push({ schoolId: sId, quota: qNum });
      totalQuotaSum += qNum;
    }
  });

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
      body: {
        academicPeriodId,
        name,
        startDate,
        endDate,
        registrationFee,
        quota: totalQuotaSum > 0 ? totalQuotaSum : null,
        schoolQuotas,
        isActive: true,
      },
    });
    if (res.success) {
      showToast('Kuota pendaftaran berhasil dibuat.', 'success');
      closeModal();
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal membuat kuota pendaftaran.');
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Kuota Pendaftaran';
  }
}

async function openEditWaveModal(waveId) {
  try {
    const [wRes, periods, schools] = await Promise.all([
      apiRequest('/api/competitions/waves'),
      fetchAdminPeriodsList(),
      fetchAdminSchoolsList(),
    ]);
    const waveList = wRes.success && Array.isArray(wRes.data) ? wRes.data : (Array.isArray(wRes) ? wRes : []);
    const wave = waveList.find(w => w.id === waveId);
    if (!wave) {
      alert('Data gelombang tidak ditemukan.');
      return;
    }

    const startVal = toDateInputValue(wave.startDate);
    const endVal = toDateInputValue(wave.endDate);
    const existingSchoolQuotas = wave.schoolQuotas || [];

    openModal('Edit Kuota / Gelombang Pendaftaran', `
      <form id="edit-wave-form" onsubmit="submitEditWave(event, '${waveId}')">
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih Periode</label>
          <select id="m-edit-wave-period" class="form-select" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            ${periods.map(p => `<option value="${p.id}" ${p.id === wave.academicPeriodId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Kuota / Gelombang</label>
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

        <!-- SECTION: KUOTA PER SEKOLAH -->
        <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 8px; color: var(--text-heading);">
            <i class="fa-solid fa-school" style="color: var(--primary-600); margin-right: 4px;"></i> Kuota Pendaftar per Sekolah (Santri)
          </label>
          ${schools.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted);">Tidak ada data sekolah.</div>' : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
              ${schools.map(s => {
      const match = existingSchoolQuotas.find(sq => sq.schoolId === s.id);
      const val = match ? match.quota : '';
      return `
                  <div style="background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px; color: var(--text-heading);">${s.name}</label>
                    <input type="number" class="form-control m-edit-school-quota-input" data-school-id="${s.id}" value="${val !== undefined ? val : ''}" placeholder="Contoh: 30" min="0" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 4px;">
                  </div>
                `;
    }).join('')}
            </div>
          `}
          <small style="color: var(--text-muted); font-size: 0.775rem; margin-top: 8px; display: block;">
            * Isi kuota untuk masing-masing sekolah (contoh: SMK 30, MA 40, dst).
          </small>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Biaya Pendaftaran (Rp)</label>
          <input type="number" id="m-edit-wave-fee" class="form-control" value="${Number(wave.registrationFee)}" min="0" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 20px; background: var(--bg-body); padding: 8px 12px; border-radius: 6px;">
          <i class="fa-solid fa-circle-info" style="color: var(--primary-600);"></i> <em>Catatan: Pemenuhan kuota dihitung dari santri yang pembayarannya telah terverifikasi/disetujui (Approved).</em>
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" id="btn-update-wave" class="btn btn-primary"><i class="fa-solid fa-save"></i> Perbarui Kuota</button>
        </div>
      </form>
    `);
  } catch (err) {
    console.error('openEditWaveModal error:', err);
    alert('Gagal membuka modal edit kuota: ' + err.message);
  }
}

async function submitEditWave(e, id) {
  e.preventDefault();
  const academicPeriodId = document.getElementById('m-edit-wave-period').value;
  const name = document.getElementById('m-edit-wave-name').value;
  const startDate = document.getElementById('m-edit-wave-start').value;
  const endDate = document.getElementById('m-edit-wave-end').value;
  const registrationFee = Number(document.getElementById('m-edit-wave-fee').value);

  const schoolQuotaInputs = document.querySelectorAll('.m-edit-school-quota-input');
  const schoolQuotas = [];
  let totalQuotaSum = 0;
  schoolQuotaInputs.forEach(input => {
    const sId = input.getAttribute('data-school-id');
    const qVal = input.value;
    if (sId && qVal !== '') {
      const qNum = Number(qVal);
      schoolQuotas.push({ schoolId: sId, quota: qNum });
      totalQuotaSum += qNum;
    }
  });

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
      body: {
        academicPeriodId,
        name,
        startDate,
        endDate,
        registrationFee,
        quota: totalQuotaSum > 0 ? totalQuotaSum : null,
        schoolQuotas,
      },
    });
    if (res.success) {
      showToast('Kuota pendaftaran berhasil diperbarui.', 'success');
      closeModal();
      renderAdminWavesView();
    } else {
      alert(res.message || 'Gagal memperbarui kuota pendaftaran.');
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

async function executeDeleteWave(target, name) {
  let id = target;
  if (target && typeof target === 'object' && target.nodeType) {
    id = target.getAttribute('data-wave-id') || target.dataset?.waveId;
    name = target.getAttribute('data-wave-name') || target.dataset?.waveName;
  }
  const safeName = name || '';
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Hapus Gelombang Pendaftaran',
        message: `Apakah Anda yakin ingin menghapus gelombang "${safeName}"?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger'
      })
    : confirm(`Apakah Anda yakin ingin menghapus gelombang "${safeName}"?`);
  if (!ok) return;
  try {
    const res = await apiRequest(`/api/competitions/waves/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Gelombang berhasil dihapus.', 'success');
      renderAdminWavesView();
    } else {
      showToast(res.message || 'Gagal menghapus gelombang.', 'danger');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ============================================================================
// 3. VERIFIKASI DATA CALON SANTRI (SUPER ADMIN)
// ============================================================================

async function renderAdminVerificationView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat antrean verifikasi berkas calon santri...</div>';

  try {
    const res = await apiRequest('/api/registrations/admin/verification-list?perPage=500');
    let items = res.success ? (res.data || []) : [];

    const statusPriority = {
      SUBMITTED: 1,
      UNDER_REVIEW: 1,
      REVISION_REQUIRED: 2,
      DRAFT: 3,
      VERIFIED: 4,
      LOCKED: 5,
    };

    items.sort((a, b) => {
      const pA = statusPriority[a.formStatus] !== undefined ? statusPriority[a.formStatus] : 99;
      const pB = statusPriority[b.formStatus] !== undefined ? statusPriority[b.formStatus] : 99;
      if (pA !== pB) return pA - pB;
      const timeA = new Date(a.submittedAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

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
            <button type="button" class="btn btn-sm btn-primary" onclick="openAdminEditStudentModal('${regId}')" title="Edit Data Calon Santri">
              <i class="fa-solid fa-pen-to-square"></i> Edit Data Calon Santri
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="printFullStudentForm('${regId}')">
              <i class="fa-solid fa-print"></i> Print Data
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="printFullStudentForm('${regId}')">
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

        <!-- SECTION D: DATA ORANG TUA & KONDISI RUMAH TANGGA -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-users"></i> D. Data Orang Tua Kandung & Kondisi Rumah Tangga</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 14px;">
          <div style="background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary-600);"><i class="fa-solid fa-user-tie"></i> DATA AYAH:</strong>
            <div style="margin-top: 6px;">Nama: <strong>${st.fatherName || '-'}</strong> (${formatParentStatus(st.fatherStatus)})</div>
            <div>NIK: <strong>${st.fatherNik || '-'}</strong></div>
            <div>Tempat/Tgl Lahir: <strong>${st.fatherBirthPlace || '-'}, ${formatBirthDate(st.fatherBirthDate)}</strong></div>
            <div>Pendidikan: <strong>${formatEducation(st.fatherEducation)}</strong></div>
            <div>Pekerjaan: <strong>${st.fatherOccupation || '-'}</strong></div>
            <div>Penghasilan: <strong>${formatIncome(st.fatherMonthlyIncome)}</strong></div>
            <div>WhatsApp: <strong>${st.fatherWhatsapp || '-'}</strong></div>
          </div>
          <div style="background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary-600);"><i class="fa-solid fa-person-dress"></i> DATA IBU:</strong>
            <div style="margin-top: 6px;">Nama: <strong>${st.motherName || '-'}</strong> (${formatParentStatus(st.motherStatus)})</div>
            <div>NIK: <strong>${st.motherNik || '-'}</strong></div>
            <div>Tempat/Tgl Lahir: <strong>${st.motherBirthPlace || '-'}, ${formatBirthDate(st.motherBirthDate)}</strong></div>
            <div>Pendidikan: <strong>${formatEducation(st.motherEducation)}</strong></div>
            <div>Pekerjaan: <strong>${st.motherOccupation || '-'}</strong></div>
            <div>Penghasilan: <strong>${formatIncome(st.motherMonthlyIncome)}</strong></div>
            <div>WhatsApp: <strong>${st.motherWhatsapp || '-'}</strong></div>
          </div>
        </div>
        <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; margin-bottom: 20px;">
          <strong style="color: var(--primary-600);"><i class="fa-solid fa-house-user"></i> KONDISI RUMAH TANGGA:</strong>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 6px;">
            <div>Status Pernikahan Ortu: <strong>${st.parentsMaritalStatus || 'Bersama (Utuh)'}</strong></div>
            ${st.parentsMaritalStatus === 'Bercerai' ? `
              <div>Hak Asuh Anak: <strong>${st.childCustody || '-'}</strong></div>
              <div>Tempat Tinggal Anak: <strong>${st.childLivingWith || '-'}</strong></div>
            ` : ''}
          </div>
        </div>

        <!-- SECTION E: DATA WALI -->
        ${(st.hasGuardian || st.fatherStatus === 'SUDAH_MENINGGAL') ? `
          <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-user-shield"></i> E. Data Wali</h4>
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

        <!-- SECTION F: TEMPAT TINGGAL & FASILITAS -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-house-chimney"></i> F. Tempat Tinggal & Fasilitas</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Jarak ke Sekolah: <strong>${st.distanceToSchool || '-'}</strong></div>
          <div>Transportasi: <strong>${st.transportationMode || '-'}</strong></div>
          <div>Kepemilikan Rumah: <strong>${st.homeOwnership || '-'}</strong></div>
          <div>Daya Listrik: <strong>${st.electricityPower || '-'}</strong></div>
          <div>Sumber Air: <strong>${st.waterSource || '-'}</strong></div>
          <div>Akses Internet: <strong>${st.internetAccess || '-'}</strong></div>
          <div>Kepemilikan HP: <strong>${st.phoneOwnership || '-'}</strong></div>
          <div>No. HP/WA Santri: <strong>${st.studentPhone || '-'}</strong></div>
        </div>

        <!-- SECTION G: MEDIA SOSIAL -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-hashtag"></i> G. Akun & Media Sosial</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Email: <strong>${st.socialEmail || '-'}</strong></div>
          <div>Facebook: <strong>${st.socialFacebook || '-'}</strong></div>
          <div>Instagram: <strong>${st.socialInstagram || '-'}</strong></div>
          <div>Twitter / X: <strong>${st.socialTwitter || '-'}</strong></div>
          <div>TikTok: <strong>${st.socialTiktok || '-'}</strong></div>
        </div>

        <!-- SECTION H: RIWAYAT KESEHATAN & FISIK -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-heart-pulse"></i> H. Riwayat Kesehatan & Kondisi Khusus</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Tinggi Badan: <strong>${st.heightCm ? st.heightCm + ' cm' : '-'}</strong></div>
          <div>Berat Badan: <strong>${st.weightKg ? st.weightKg + ' kg' : '-'}</strong></div>
          <div>Riwayat Merokok: <strong>${st.smokingStatus || '-'}</strong></div>
          <div>Status Buta Warna: <strong>${st.colorBlindStatus || '-'}</strong></div>
          <div>Mata Kiri: <strong>${(st.eyeMinusLeft || st.eyeCylLeft) ? `Minus: ${st.eyeMinusLeft || '0'}, Cyl: ${st.eyeCylLeft || '0'}` : 'Normal'}</strong></div>
          <div>Mata Kanan: <strong>${(st.eyeMinusRight || st.eyeCylRight) ? `Minus: ${st.eyeMinusRight || '0'}, Cyl: ${st.eyeCylRight || '0'}` : 'Normal'}</strong></div>
          <div>Riwayat Penyakit: <strong>${st.diseaseHistory || '-'}</strong></div>
          <div>Riwayat Alergi: <strong>${st.allergyHistory || '-'}</strong></div>
          <div>Riwayat Operasi: <strong>${st.surgeryHistory || '-'}</strong></div>
          <div>Kebutuhan Khusus: <strong>${st.hasSpecialNeeds ? `Ya (${st.specialNeedsDescription || '-'})` : 'Tidak Ada'}</strong></div>
        </div>

        <!-- SECTION I: KONTAK UTAMA -->
        <h4 style="color: var(--primary-600); border-bottom: 2px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: 12px;"><i class="fa-solid fa-address-book"></i> I. Kontak Utama / Darurat</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div>Nama Kontak Utama: <strong>${st.primaryContactName || '-'}</strong></div>
          <div>Hubungan: <strong>${st.primaryContactRelation || '-'}</strong></div>
          <div>No. WhatsApp: <strong>${st.primaryContactWhatsapp || '-'}</strong></div>
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
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
            <button type="button" class="btn btn-primary" onclick="openAdminEditStudentModal('${regId}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit Data Calon Santri
            </button>
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
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Verifikasi Berkas Calon Santri',
        message: 'Apakah Anda yakin data calon santri ini sudah LENGKAP dan BENAR? Status akan diubah menjadi VERIFIED dan santri siap mengikuti tahapan tes.',
        confirmText: 'Ya, Verifikasi (VERIFIED)',
        cancelText: 'Batal',
        type: 'primary',
        icon: 'fa-circle-check'
      })
    : confirm('Apakah Anda yakin data calon santri ini sudah LENGKAP dan BENAR? Status akan diubah menjadi VERIFIED.');
  if (!ok) return;
  try {
    const res = await apiRequest(`/api/registrations/${regId}/verify`, { method: 'POST' });
    if (res.success) {
      showToast('Data calon santri berhasil diverifikasi (VERIFIED).', 'success');
      closeModal();
      renderAdminVerificationView();
    } else {
      showToast(res.message || 'Gagal memverifikasi data.', 'danger');
    }
  } catch (err) {
    showToast(err.message, 'danger');
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
// MODAL EDIT DATA CALON SANTRI OLEH ADMIN / SUPER ADMIN (SINGLE PAGE FORM)
// ============================================================================

async function openAdminEditStudentModal(regId) {
  openModal('Memuat Data...', '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat form edit data calon santri...</div>', 'modal-xl');

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form`);
    if (!res.success || !res.data) throw new Error('Gagal memuat data formulir.');

    const d = res.data;
    const st = d.studentDetail || {};
    const ip = d.individualParticipant || {};

    const birthDateVal = st.birthDate ? new Date(st.birthDate).toISOString().split('T')[0] : '';
    const fatherBirthVal = st.fatherBirthDate ? new Date(st.fatherBirthDate).toISOString().split('T')[0] : '';
    const motherBirthVal = st.motherBirthDate ? new Date(st.motherBirthDate).toISOString().split('T')[0] : '';
    const guardianBirthVal = st.guardianBirthDate ? new Date(st.guardianBirthDate).toISOString().split('T')[0] : '';

    const modalBody = `
      <div style="font-size: 0.9rem;">
        
        <!-- Header Banner & Quick Actions -->
        <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-left: 4px solid var(--primary-600); box-shadow: var(--shadow-sm);">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Edit Data Pendaftaran Calon Santri</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-heading); margin-top: 2px;">
              ${escapeHtml(st.fullName || ip.fullName || 'Calon Santri')} &mdash; <code style="color: var(--primary-600); font-weight: 800;">${d.registrationNumber}</code>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px;">
              Pilihan: <strong>${escapeHtml(d.schoolName || '-')} &bull; ${escapeHtml(d.majorName || '-')} &bull; ${escapeHtml(d.classProgramName || '-')}</strong>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="openAdminVerificationDetailModal('${regId}')">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Detail
            </button>
            <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('admin-edit-student-form').requestSubmit()" style="font-weight: 700;">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan
            </button>
          </div>
        </div>

        <form id="admin-edit-student-form" onsubmit="handleAdminSaveStudentData(event, '${regId}')">

          <!-- SECTION A: IDENTITAS CALON SANTRI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">A</span>
              Identitas Calon Santri
            </h4>
            
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap <span style="color: red;">*</span></label>
              <input type="text" id="aedit-fullName" class="form-control" value="${escapeHtml(st.fullName || ip.fullName || '')}" required style="width: 100%; padding: 9px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">NIK (16 Digit)</label>
                <input type="text" id="aedit-nik" class="form-control" maxlength="16" value="${escapeHtml(st.nik || '')}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">No. Kartu Keluarga (KK)</label>
                <input type="text" id="aedit-familyCardNumber" class="form-control" maxlength="16" value="${escapeHtml(st.familyCardNumber || '')}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">NISN (10 Digit)</label>
                <input type="text" id="aedit-nisn" class="form-control" maxlength="10" value="${escapeHtml(st.nisn || '')}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">No. Akta Kelahiran</label>
                <input type="text" id="aedit-birthCertificateNumber" class="form-control" value="${escapeHtml(st.birthCertificateNumber || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Jenis Kelamin</label>
                <select id="aedit-gender" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="L" ${(st.gender === 'L' || ip.gender === 'L') ? 'selected' : ''}>Laki-laki</option>
                  <option value="P" ${(st.gender === 'P' || ip.gender === 'P') ? 'selected' : ''}>Perempuan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir</label>
                <input type="text" id="aedit-birthPlace" class="form-control" value="${escapeHtml(st.birthPlace || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir</label>
                <input type="date" id="aedit-birthDate" class="form-control" value="${birthDateVal}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Agama</label>
                <input type="text" id="aedit-religion" class="form-control" value="${escapeHtml(st.religion || 'Islam')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Golongan Darah</label>
                <select id="aedit-bloodType" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="" ${!st.bloodType ? 'selected' : ''}>-- Pilih --</option>
                  <option value="A" ${st.bloodType === 'A' ? 'selected' : ''}>A</option>
                  <option value="B" ${st.bloodType === 'B' ? 'selected' : ''}>B</option>
                  <option value="AB" ${st.bloodType === 'AB' ? 'selected' : ''}>AB</option>
                  <option value="O" ${st.bloodType === 'O' ? 'selected' : ''}>O</option>
                  <option value="-" ${st.bloodType === '-' ? 'selected' : ''}>Tidak Tahu / -</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Anak Ke-</label>
                <input type="number" id="aedit-childOrder" class="form-control" min="1" max="30" value="${st.childOrder !== undefined && st.childOrder !== null ? st.childOrder : ''}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Jumlah Saudara</label>
                <input type="number" id="aedit-siblingsCount" class="form-control" min="0" max="30" value="${st.siblingsCount !== undefined && st.siblingsCount !== null ? st.siblingsCount : ''}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Status Anak</label>
                <select id="aedit-childStatus" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="KANDUNG" ${st.childStatus === 'KANDUNG' || !st.childStatus ? 'selected' : ''}>Anak Kandung</option>
                  <option value="TIRI" ${st.childStatus === 'TIRI' ? 'selected' : ''}>Anak Tiri</option>
                  <option value="ANGKAT" ${st.childStatus === 'ANGKAT' ? 'selected' : ''}>Anak Angkat</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Status Mukim</label>
                <select id="aedit-boardingStatus" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="MUKIM" ${d.boardingStatus === 'MUKIM' || !d.boardingStatus ? 'selected' : ''}>MUKIM (Mondok)</option>
                  <option value="NON_MUKIM" ${d.boardingStatus === 'NON_MUKIM' ? 'selected' : ''}>NON MUKIM (Laju)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- SECTION B: ALAMAT -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">B</span>
              Alamat Tempat Tinggal
            </h4>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Negara</label>
                <input type="text" id="aedit-country" class="form-control" value="${escapeHtml(st.country || 'Indonesia')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Provinsi</label>
                <input type="text" id="aedit-province" class="form-control" value="${escapeHtml(st.province || '')}" placeholder="Nama Provinsi" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Kabupaten / Kota</label>
                <input type="text" id="aedit-cityDistrict" class="form-control" value="${escapeHtml(st.cityDistrict || '')}" placeholder="Nama Kab/Kota" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Kecamatan</label>
                <input type="text" id="aedit-subDistrict" class="form-control" value="${escapeHtml(st.subDistrict || '')}" placeholder="Nama Kecamatan" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Desa / Kelurahan</label>
                <input type="text" id="aedit-village" class="form-control" value="${escapeHtml(st.village || '')}" placeholder="Nama Desa/Kelurahan" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">RT / RW</label>
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="aedit-rt" class="form-control" placeholder="RT" value="${escapeHtml(st.rt || '')}" style="flex: 1; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <input type="text" id="aedit-rw" class="form-control" placeholder="RW" value="${escapeHtml(st.rw || '')}" style="flex: 1; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Kode Pos</label>
                <input type="text" id="aedit-postalCode" class="form-control" maxlength="10" value="${escapeHtml(st.postalCode || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Alamat Lengkap (Dusun, Jalan, No Rumah)</label>
              <textarea id="aedit-fullAddress" class="form-control" rows="2" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${escapeHtml(st.fullAddress || '')}</textarea>
            </div>
          </div>

          <!-- SECTION C: ASAL SEKOLAH -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">C</span>
              Data Asal Sekolah
            </h4>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Nama Sekolah Asal</label>
                <input type="text" id="aedit-previousSchoolName" class="form-control" value="${escapeHtml(st.previousSchoolName || ip.schoolName || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Jenjang Sekolah Asal</label>
                <select id="aedit-previousSchoolLevel" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Jenjang --</option>
                  <option value="TK" ${st.previousSchoolLevel === 'TK' ? 'selected' : ''}>TK / PAUD / RA</option>
                  <option value="SD_MI" ${st.previousSchoolLevel === 'SD_MI' ? 'selected' : ''}>SD / MI</option>
                  <option value="SMP_MTS" ${st.previousSchoolLevel === 'SMP_MTS' ? 'selected' : ''}>SMP / MTs</option>
                  <option value="SMA_MA_SMK" ${st.previousSchoolLevel === 'SMA_MA_SMK' ? 'selected' : ''}>SMA / MA / SMK</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">NPSN Sekolah Asal</label>
                <input type="text" id="aedit-previousSchoolNpsn" class="form-control" value="${escapeHtml(st.previousSchoolNpsn || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Tahun Lulus</label>
                <input type="text" id="aedit-graduationYear" class="form-control" value="${escapeHtml(st.graduationYear || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">No. Ijazah / SKL</label>
                <input type="text" id="aedit-diplomaNumber" class="form-control" value="${escapeHtml(st.diplomaNumber || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">Alamat Sekolah Asal</label>
              <textarea id="aedit-previousSchoolAddress" class="form-control" rows="2" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${escapeHtml(st.previousSchoolAddress || '')}</textarea>
            </div>
          </div>

          <!-- SECTION D: ORANG TUA & KONDISI RUMAH TANGGA -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">D</span>
              Data Orang Tua Kandung & Kondisi Rumah Tangga
            </h4>
            
            <!-- DATA AYAH -->
            <div style="background: var(--bg-body); padding: 14px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid var(--primary-600);">
              <h5 style="color: var(--primary-600); margin-top: 0; margin-bottom: 12px; font-size: 0.95rem;"><i class="fa-solid fa-user-tie"></i> Data Ayah Kandung</h5>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Nama Lengkap Ayah</label>
                  <input type="text" id="aedit-fatherName" class="form-control" value="${escapeHtml(st.fatherName || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Status Ayah</label>
                  <select id="aedit-fatherStatus" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="MASIH_HIDUP" ${st.fatherStatus === 'MASIH_HIDUP' || !st.fatherStatus ? 'selected' : ''}>Masih Hidup</option>
                    <option value="SUDAH_MENINGGAL" ${st.fatherStatus === 'SUDAH_MENINGGAL' ? 'selected' : ''}>Sudah Meninggal</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">NIK Ayah (16 digit)</label>
                  <input type="text" id="aedit-fatherNik" class="form-control" maxlength="16" value="${escapeHtml(st.fatherNik || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tempat Lahir Ayah</label>
                  <input type="text" id="aedit-fatherBirthPlace" class="form-control" value="${escapeHtml(st.fatherBirthPlace || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tgl Lahir Ayah</label>
                  <input type="date" id="aedit-fatherBirthDate" class="form-control" value="${fatherBirthVal}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pendidikan Ayah</label>
                  <select id="aedit-fatherEducation" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Pendidikan --</option>
                    ${PSB_EDUCATION_OPTIONS.map(o => `<option value="${o.value}" ${st.fatherEducation === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pekerjaan Ayah</label>
                  <input type="text" id="aedit-fatherOccupation" class="form-control" value="${escapeHtml(st.fatherOccupation || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Penghasilan Ayah</label>
                  <select id="aedit-fatherMonthlyIncome" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Penghasilan --</option>
                    ${PSB_INCOME_OPTIONS.map(o => `<option value="${o.value}" ${st.fatherMonthlyIncome === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">No. WhatsApp Ayah</label>
                  <input type="text" id="aedit-fatherWhatsapp" class="form-control" value="${escapeHtml(st.fatherWhatsapp || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
              </div>
            </div>

            <!-- DATA IBU -->
            <div style="background: var(--bg-body); padding: 14px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid #ec4899;">
              <h5 style="color: #db2777; margin-top: 0; margin-bottom: 12px; font-size: 0.95rem;"><i class="fa-solid fa-person-dress"></i> Data Ibu Kandung</h5>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Nama Lengkap Ibu</label>
                  <input type="text" id="aedit-motherName" class="form-control" value="${escapeHtml(st.motherName || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Status Ibu</label>
                  <select id="aedit-motherStatus" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="MASIH_HIDUP" ${st.motherStatus === 'MASIH_HIDUP' || !st.motherStatus ? 'selected' : ''}>Masih Hidup</option>
                    <option value="SUDAH_MENINGGAL" ${st.motherStatus === 'SUDAH_MENINGGAL' ? 'selected' : ''}>Sudah Meninggal</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">NIK Ibu (16 digit)</label>
                  <input type="text" id="aedit-motherNik" class="form-control" maxlength="16" value="${escapeHtml(st.motherNik || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tempat Lahir Ibu</label>
                  <input type="text" id="aedit-motherBirthPlace" class="form-control" value="${escapeHtml(st.motherBirthPlace || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tgl Lahir Ibu</label>
                  <input type="date" id="aedit-motherBirthDate" class="form-control" value="${motherBirthVal}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pendidikan Ibu</label>
                  <select id="aedit-motherEducation" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Pendidikan --</option>
                    ${PSB_EDUCATION_OPTIONS.map(o => `<option value="${o.value}" ${st.motherEducation === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pekerjaan Ibu</label>
                  <input type="text" id="aedit-motherOccupation" class="form-control" value="${escapeHtml(st.motherOccupation || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Penghasilan Ibu</label>
                  <select id="aedit-motherMonthlyIncome" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Penghasilan --</option>
                    ${PSB_INCOME_OPTIONS.map(o => `<option value="${o.value}" ${st.motherMonthlyIncome === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">No. WhatsApp Ibu</label>
                  <input type="text" id="aedit-motherWhatsapp" class="form-control" value="${escapeHtml(st.motherWhatsapp || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
              </div>
            </div>

            <!-- KONDISI RUMAH TANGGA -->
            <div style="background: var(--bg-body); padding: 14px; border-radius: 8px;">
              <h5 style="color: var(--primary-600); margin-top: 0; margin-bottom: 12px; font-size: 0.95rem;"><i class="fa-solid fa-house-user"></i> Kondisi Rumah Tangga</h5>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Status Pernikahan Orang Tua</label>
                  <select id="aedit-parentsMaritalStatus" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="Bersama (Utuh)" ${st.parentsMaritalStatus === 'Bersama (Utuh)' || !st.parentsMaritalStatus ? 'selected' : ''}>Bersama (Utuh)</option>
                    <option value="Bercerai" ${st.parentsMaritalStatus === 'Bercerai' ? 'selected' : ''}>Bercerai</option>
                    <option value="Pisah Ranjang" ${st.parentsMaritalStatus === 'Pisah Ranjang' ? 'selected' : ''}>Pisah Ranjang</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Hak Asuh Anak (jika cerai)</label>
                  <input type="text" id="aedit-childCustody" class="form-control" value="${escapeHtml(st.childCustody || '')}" placeholder="Ayah / Ibu / Bersama" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Anak Tinggal Bersama</label>
                  <input type="text" id="aedit-childLivingWith" class="form-control" value="${escapeHtml(st.childLivingWith || '')}" placeholder="Orang Tua / Ayah / Ibu / Wali" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
              </div>
            </div>

          </div>

          <!-- SECTION E: DATA WALI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <h4 style="color: var(--primary-600); margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">E</span>
                Data Wali (Opsional / Jika Ada)
              </h4>
              <label style="font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="aedit-hasGuardian" ${st.hasGuardian ? 'checked' : ''} onchange="document.getElementById('aedit-guardian-box').style.display = this.checked ? 'block' : 'none';">
                Memiliki Wali
              </label>
            </div>
            
            <div id="aedit-guardian-box" style="display: ${st.hasGuardian ? 'block' : 'none'};">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 12px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Hubungan Wali</label>
                  <input type="text" id="aedit-guardianRelation" class="form-control" value="${escapeHtml(st.guardianRelation || '')}" placeholder="Paman / Kakek / dll" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Nama Lengkap Wali</label>
                  <input type="text" id="aedit-guardianName" class="form-control" value="${escapeHtml(st.guardianName || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">NIK Wali</label>
                  <input type="text" id="aedit-guardianNik" class="form-control" maxlength="16" value="${escapeHtml(st.guardianNik || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tempat Lahir Wali</label>
                  <input type="text" id="aedit-guardianBirthPlace" class="form-control" value="${escapeHtml(st.guardianBirthPlace || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tgl Lahir Wali</label>
                  <input type="date" id="aedit-guardianBirthDate" class="form-control" value="${guardianBirthVal}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pendidikan Wali</label>
                  <select id="aedit-guardianEducation" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Pendidikan --</option>
                    ${PSB_EDUCATION_OPTIONS.map(o => `<option value="${o.value}" ${st.guardianEducation === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Pekerjaan Wali</label>
                  <input type="text" id="aedit-guardianOccupation" class="form-control" value="${escapeHtml(st.guardianOccupation || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Penghasilan Wali</label>
                  <select id="aedit-guardianMonthlyIncome" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                    <option value="">-- Pilih Penghasilan --</option>
                    ${PSB_INCOME_OPTIONS.map(o => `<option value="${o.value}" ${st.guardianMonthlyIncome === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">WhatsApp Wali</label>
                  <input type="text" id="aedit-guardianWhatsapp" class="form-control" value="${escapeHtml(st.guardianWhatsapp || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Alamat Lengkap Wali</label>
                <textarea id="aedit-guardianAddress" class="form-control" rows="2" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">${escapeHtml(st.guardianAddress || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- SECTION F: FASILITAS, MEDSOS & KONTAK UTAMA -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">F</span>
              Fasilitas, Media Sosial & Kontak Darurat
            </h4>
            
            <h5 style="color: var(--text-heading); margin-top: 0; margin-bottom: 10px; font-size: 0.9rem;"><i class="fa-solid fa-house-chimney"></i> Tempat Tinggal & Fasilitas</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Jarak ke Sekolah</label>
                <select id="aedit-distanceToSchool" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Jarak --</option>
                  ${PSB_DISTANCE_OPTIONS.map(o => `<option value="${o}" ${st.distanceToSchool === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Moda Transportasi</label>
                <select id="aedit-transportationMode" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Transportasi --</option>
                  ${PSB_TRANSPORT_OPTIONS.map(o => `<option value="${o}" ${st.transportationMode === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Kepemilikan Rumah</label>
                <select id="aedit-homeOwnership" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Status Rumah --</option>
                  ${PSB_HOME_OWNERSHIP_OPTIONS.map(o => `<option value="${o}" ${st.homeOwnership === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Daya Listrik</label>
                <select id="aedit-electricityPower" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Daya Listrik --</option>
                  ${PSB_ELECTRICITY_OPTIONS.map(o => `<option value="${o}" ${st.electricityPower === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Sumber Air</label>
                <select id="aedit-waterSource" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Sumber Air --</option>
                  ${PSB_WATER_OPTIONS.map(o => `<option value="${o}" ${st.waterSource === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Akses Internet</label>
                <select id="aedit-internetAccess" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih Akses Internet --</option>
                  ${PSB_INTERNET_OPTIONS.map(o => `<option value="${o}" ${st.internetAccess === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Kepemilikan HP Santri</label>
                <select id="aedit-phoneOwnership" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih --</option>
                  ${PSB_PHONE_OWNERSHIP_OPTIONS.map(o => `<option value="${o}" ${st.phoneOwnership === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">No. HP Santri</label>
                <input type="text" id="aedit-studentPhone" class="form-control" value="${escapeHtml(st.studentPhone || ip.whatsappNumber || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
            </div>

            <h5 style="color: var(--text-heading); margin-top: 0; margin-bottom: 10px; font-size: 0.9rem;"><i class="fa-solid fa-hashtag"></i> Media Sosial</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Email</label>
                <input type="email" id="aedit-socialEmail" class="form-control" value="${escapeHtml(st.socialEmail || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Facebook</label>
                <input type="text" id="aedit-socialFacebook" class="form-control" value="${escapeHtml(st.socialFacebook || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Instagram</label>
                <input type="text" id="aedit-socialInstagram" class="form-control" value="${escapeHtml(st.socialInstagram || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Twitter / X</label>
                <input type="text" id="aedit-socialTwitter" class="form-control" value="${escapeHtml(st.socialTwitter || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">TikTok</label>
                <input type="text" id="aedit-socialTiktok" class="form-control" value="${escapeHtml(st.socialTiktok || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
            </div>

            <h5 style="color: var(--text-heading); margin-top: 0; margin-bottom: 10px; font-size: 0.9rem;"><i class="fa-solid fa-address-book"></i> Kontak Utama / Darurat</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Nama Kontak Utama</label>
                <input type="text" id="aedit-primaryContactName" class="form-control" value="${escapeHtml(st.primaryContactName || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Hubungan</label>
                <input type="text" id="aedit-primaryContactRelation" class="form-control" value="${escapeHtml(st.primaryContactRelation || '')}" placeholder="Orang Tua / Wali / dll" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">No. WhatsApp</label>
                <input type="text" id="aedit-primaryContactWhatsapp" class="form-control" value="${escapeHtml(st.primaryContactWhatsapp || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
            </div>

          </div>

          <!-- SECTION G: KESEHATAN & FISIK -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
            <h4 style="color: var(--primary-600); margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">G</span>
              Riwayat Kesehatan & Kondisi Khusus
            </h4>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Tinggi Badan (cm)</label>
                <input type="number" id="aedit-heightCm" class="form-control" value="${st.heightCm || ''}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Berat Badan (kg)</label>
                <input type="number" id="aedit-weightKg" class="form-control" value="${st.weightKg || ''}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Riwayat Merokok</label>
                <select id="aedit-smokingStatus" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih --</option>
                  ${PSB_SMOKING_OPTIONS.map(o => `<option value="${o}" ${st.smokingStatus === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Status Buta Warna</label>
                <select id="aedit-colorBlindStatus" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
                  <option value="">-- Pilih --</option>
                  ${PSB_COLOR_BLIND_OPTIONS.map(o => `<option value="${o}" ${st.colorBlindStatus === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Mata Kiri Minus</label>
                <input type="text" id="aedit-eyeMinusLeft" class="form-control" value="${escapeHtml(st.eyeMinusLeft || '')}" placeholder="Contoh: 0.5" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Mata Kiri Cyl</label>
                <input type="text" id="aedit-eyeCylLeft" class="form-control" value="${escapeHtml(st.eyeCylLeft || '')}" placeholder="Contoh: 0.25" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Mata Kanan Minus</label>
                <input type="text" id="aedit-eyeMinusRight" class="form-control" value="${escapeHtml(st.eyeMinusRight || '')}" placeholder="Contoh: 0.5" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Mata Kanan Cyl</label>
                <input type="text" id="aedit-eyeCylRight" class="form-control" value="${escapeHtml(st.eyeCylRight || '')}" placeholder="Contoh: 0.25" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Riwayat Penyakit</label>
                <input type="text" id="aedit-diseaseHistory" class="form-control" value="${escapeHtml(st.diseaseHistory || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Riwayat Alergi</label>
                <input type="text" id="aedit-allergyHistory" class="form-control" value="${escapeHtml(st.allergyHistory || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Riwayat Operasi</label>
                <input type="text" id="aedit-surgeryHistory" class="form-control" value="${escapeHtml(st.surgeryHistory || '')}" style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">
              </div>
            </div>

            <div style="background: var(--bg-body); padding: 14px; border-radius: 8px;">
              <label style="font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 8px;">
                <input type="checkbox" id="aedit-hasSpecialNeeds" ${st.hasSpecialNeeds ? 'checked' : ''} onchange="document.getElementById('aedit-special-needs-desc').style.display = this.checked ? 'block' : 'none';">
                Memiliki Kebutuhan Khusus / Disabilitas
              </label>
              <div id="aedit-special-needs-desc" style="display: ${st.hasSpecialNeeds ? 'block' : 'none'};">
                <textarea id="aedit-specialNeedsDescription" class="form-control" rows="2" placeholder="Tuliskan keterangan kebutuhan khusus..." style="width: 100%; padding: 7px 10px; font-size: 0.85rem;">${escapeHtml(st.specialNeedsDescription || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 2px solid var(--border-subtle); padding-top: 18px; margin-top: 10px; position: sticky; bottom: 0; background: var(--bg-card); z-index: 10;">
            <button type="button" class="btn btn-secondary" onclick="openAdminVerificationDetailModal('${regId}')">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Detail
            </button>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
              <button type="submit" id="btn-admin-save-student" class="btn btn-primary" style="padding: 11px 26px; font-weight: 700; font-size: 0.95rem;">
                <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Data
              </button>
            </div>
          </div>

        </form>

      </div>
    `;

    openModal(`Edit Data Calon Santri: ${d.registrationNumber}`, modalBody, 'modal-xl');
  } catch (err) {
    openModal('Error', `<div class="alert alert-danger">${err.message}</div>`);
  }
}

async function handleAdminSaveStudentData(e, regId) {
  e.preventDefault();
  const btn = document.getElementById('btn-admin-save-student');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const getV = (id) => {
    const el = document.getElementById(id);
    return el && el.value !== undefined ? el.value.trim() : undefined;
  };
  const getN = (id) => {
    const v = document.getElementById(id)?.value;
    return v !== '' && v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : undefined;
  };
  const getC = (id) => document.getElementById(id)?.checked;

  const payload = {
    // Identitas
    fullName: getV('aedit-fullName'),
    nik: getV('aedit-nik') || undefined,
    familyCardNumber: getV('aedit-familyCardNumber') || undefined,
    nisn: getV('aedit-nisn') || undefined,
    birthCertificateNumber: getV('aedit-birthCertificateNumber') || undefined,
    gender: getV('aedit-gender') || undefined,
    birthPlace: getV('aedit-birthPlace') || undefined,
    birthDate: getV('aedit-birthDate') || undefined,
    religion: getV('aedit-religion') || undefined,
    bloodType: getV('aedit-bloodType') || undefined,
    childOrder: getN('aedit-childOrder'),
    siblingsCount: getN('aedit-siblingsCount'),
    childStatus: getV('aedit-childStatus') || undefined,
    boardingStatus: getV('aedit-boardingStatus') || undefined,

    // Alamat
    country: getV('aedit-country') || 'Indonesia',
    province: getV('aedit-province') || undefined,
    cityDistrict: getV('aedit-cityDistrict') || undefined,
    subDistrict: getV('aedit-subDistrict') || undefined,
    village: getV('aedit-village') || undefined,
    rt: getV('aedit-rt') || undefined,
    rw: getV('aedit-rw') || undefined,
    postalCode: getV('aedit-postalCode') || undefined,
    fullAddress: getV('aedit-fullAddress') || undefined,

    // Asal Sekolah
    previousSchoolName: getV('aedit-previousSchoolName') || undefined,
    previousSchoolLevel: getV('aedit-previousSchoolLevel') || undefined,
    previousSchoolNpsn: getV('aedit-previousSchoolNpsn') || undefined,
    graduationYear: getV('aedit-graduationYear') || undefined,
    diplomaNumber: getV('aedit-diplomaNumber') || undefined,
    previousSchoolAddress: getV('aedit-previousSchoolAddress') || undefined,

    // Ayah
    fatherName: getV('aedit-fatherName') || undefined,
    fatherStatus: getV('aedit-fatherStatus') || undefined,
    fatherNik: getV('aedit-fatherNik') || undefined,
    fatherBirthPlace: getV('aedit-fatherBirthPlace') || undefined,
    fatherBirthDate: getV('aedit-fatherBirthDate') || undefined,
    fatherEducation: getV('aedit-fatherEducation') || undefined,
    fatherOccupation: getV('aedit-fatherOccupation') || undefined,
    fatherMonthlyIncome: getV('aedit-fatherMonthlyIncome') || undefined,
    fatherWhatsapp: getV('aedit-fatherWhatsapp') || undefined,

    // Ibu
    motherName: getV('aedit-motherName') || undefined,
    motherStatus: getV('aedit-motherStatus') || undefined,
    motherNik: getV('aedit-motherNik') || undefined,
    motherBirthPlace: getV('aedit-motherBirthPlace') || undefined,
    motherBirthDate: getV('aedit-motherBirthDate') || undefined,
    motherEducation: getV('aedit-motherEducation') || undefined,
    motherOccupation: getV('aedit-motherOccupation') || undefined,
    motherMonthlyIncome: getV('aedit-motherMonthlyIncome') || undefined,
    motherWhatsapp: getV('aedit-motherWhatsapp') || undefined,

    // Kondisi RT
    parentsMaritalStatus: getV('aedit-parentsMaritalStatus') || undefined,
    childCustody: getV('aedit-childCustody') || undefined,
    childLivingWith: getV('aedit-childLivingWith') || undefined,

    // Wali
    hasGuardian: getC('aedit-hasGuardian'),
    guardianRelation: getC('aedit-hasGuardian') ? getV('aedit-guardianRelation') : undefined,
    guardianName: getC('aedit-hasGuardian') ? getV('aedit-guardianName') : undefined,
    guardianNik: getC('aedit-hasGuardian') ? getV('aedit-guardianNik') : undefined,
    guardianBirthPlace: getC('aedit-hasGuardian') ? getV('aedit-guardianBirthPlace') : undefined,
    guardianBirthDate: getC('aedit-hasGuardian') ? getV('aedit-guardianBirthDate') : undefined,
    guardianEducation: getC('aedit-hasGuardian') ? getV('aedit-guardianEducation') : undefined,
    guardianOccupation: getC('aedit-hasGuardian') ? getV('aedit-guardianOccupation') : undefined,
    guardianMonthlyIncome: getC('aedit-hasGuardian') ? getV('aedit-guardianMonthlyIncome') : undefined,
    guardianWhatsapp: getC('aedit-hasGuardian') ? getV('aedit-guardianWhatsapp') : undefined,
    guardianAddress: getC('aedit-hasGuardian') ? getV('aedit-guardianAddress') : undefined,

    // Fasilitas
    distanceToSchool: getV('aedit-distanceToSchool') || undefined,
    transportationMode: getV('aedit-transportationMode') || undefined,
    homeOwnership: getV('aedit-homeOwnership') || undefined,
    electricityPower: getV('aedit-electricityPower') || undefined,
    waterSource: getV('aedit-waterSource') || undefined,
    internetAccess: getV('aedit-internetAccess') || undefined,
    phoneOwnership: getV('aedit-phoneOwnership') || undefined,
    studentPhone: getV('aedit-studentPhone') || undefined,

    // Medsos
    socialEmail: getV('aedit-socialEmail') || undefined,
    socialFacebook: getV('aedit-socialFacebook') || undefined,
    socialInstagram: getV('aedit-socialInstagram') || undefined,
    socialTwitter: getV('aedit-socialTwitter') || undefined,
    socialTiktok: getV('aedit-socialTiktok') || undefined,

    // Kontak
    primaryContactName: getV('aedit-primaryContactName') || undefined,
    primaryContactRelation: getV('aedit-primaryContactRelation') || undefined,
    primaryContactWhatsapp: getV('aedit-primaryContactWhatsapp') || undefined,

    // Kesehatan
    heightCm: getN('aedit-heightCm'),
    weightKg: getN('aedit-weightKg'),
    smokingStatus: getV('aedit-smokingStatus') || undefined,
    colorBlindStatus: getV('aedit-colorBlindStatus') || undefined,
    eyeMinusLeft: getV('aedit-eyeMinusLeft') || undefined,
    eyeCylLeft: getV('aedit-eyeCylLeft') || undefined,
    eyeMinusRight: getV('aedit-eyeMinusRight') || undefined,
    eyeCylRight: getV('aedit-eyeCylRight') || undefined,
    diseaseHistory: getV('aedit-diseaseHistory') || undefined,
    allergyHistory: getV('aedit-allergyHistory') || undefined,
    surgeryHistory: getV('aedit-surgeryHistory') || undefined,
    hasSpecialNeeds: getC('aedit-hasSpecialNeeds'),
    specialNeedsDescription: getC('aedit-hasSpecialNeeds') ? getV('aedit-specialNeedsDescription') : undefined,
  };

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form/draft`, {
      method: 'PUT',
      body: payload,
    });

    if (res.success) {
      showToast('Data calon santri berhasil diperbarui!', 'success');
      // Re-open detail modal to show fresh updated data
      await openAdminVerificationDetailModal(regId);
      // Refresh background table if active
      if (typeof filterVerificationTable === 'function' && document.getElementById('table-verification-list')) {
        renderAdminVerificationView();
      } else if (typeof updateUniversalTable === 'function' && document.getElementById('admin-registrations-table-slot')) {
        renderAdminRegistrationsView();
      }
    } else {
      alert(res.message || 'Gagal menyimpan perubahan.');
    }
  } catch (err) {
    alert(err.message || 'Terjadi kesalahan: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Data';
    }
  }
}

window.openAdminEditStudentModal = openAdminEditStudentModal;
window.handleAdminSaveStudentData = handleAdminSaveStudentData;

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
  { value: 'SEPULUH_SAMPAI_20JT', label: 'Rp 10 - 20 Juta' },
  { value: 'LEBIH_DARI_20JT', label: '> Rp 20 Juta' }
];

const PSB_CHILD_STATUS_OPTIONS = [
  { value: 'KANDUNG', label: 'Anak Kandung' },
  { value: 'TIRI', label: 'Anak Tiri' },
  { value: 'ANGKAT', label: 'Anak Angkat' }
];

const PSB_DISTANCE_OPTIONS = [
  'Kurang dari 1 km',
  '1 - 5 km',
  '5 - 10 km',
  'Lebih dari 10 km'
];

const PSB_TRANSPORT_OPTIONS = [
  'Jalan Kaki',
  'Sepeda Motor',
  'Mobil / Antar Jemput',
  'Angkutan Umum',
  'Sepeda',
  'Lainnya'
];

const PSB_HOME_OWNERSHIP_OPTIONS = [
  'Milik Sendiri',
  'Sewa / Kontrak',
  'Menumpang / Ikut Keluarga',
  'Rumah Dinas',
  'Lainnya'
];

const PSB_ELECTRICITY_OPTIONS = [
  '450 VA',
  '900 VA',
  '1300 VA',
  '2200 VA',
  '> 2200 VA',
  'Tidak Ada Listrik'
];

const PSB_WATER_OPTIONS = [
  'PAM / PDAM',
  'Sumur Bor / Gali',
  'Air Isi Ulang',
  'Mata Air / Sungai',
  'Lainnya'
];

const PSB_PHONE_OWNERSHIP_OPTIONS = [
  'Pribadi (Santri)',
  'Orang Tua / Bersama',
  'Tidak Memiliki'
];

const PSB_INTERNET_OPTIONS = [
  'WiFi Rumah (Indihome/Biznet dll)',
  'Paket Data Seluler',
  'Tidak Ada Akses Internet'
];

const PSB_SMOKING_OPTIONS = [
  'Tidak Merokok',
  'Pernah Merokok',
  'Aktif Merokok'
];

const PSB_COLOR_BLIND_OPTIONS = [
  'Normal (Tidak Buta Warna)',
  'Buta Warna Parsial',
  'Buta Warna Total'
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

function handleFatherStatusChange(val) {
  const isDeceased = val === 'SUDAH_MENINGGAL';
  const guardianNotice = document.getElementById('guardian-required-notice');
  const guardianAsterisk = document.getElementById('guardian-req-asterisk');
  const guardianCheckbox = document.getElementById('ff-hasGuardian');
  const guardianFields = document.getElementById('guardian-fields');

  if (guardianNotice) guardianNotice.style.display = isDeceased ? 'block' : 'none';
  if (guardianAsterisk) guardianAsterisk.style.display = isDeceased ? 'inline' : 'none';

  if (isDeceased) {
    if (guardianCheckbox) {
      guardianCheckbox.checked = true;
      guardianCheckbox.disabled = true;
    }
    if (guardianFields) guardianFields.style.display = 'block';
  } else {
    if (guardianCheckbox) {
      guardianCheckbox.disabled = false;
    }
  }
}
window.handleFatherStatusChange = handleFatherStatusChange;

function handleMaritalStatusChange(val) {
  const divorcedFields = document.getElementById('divorced-fields');
  if (divorcedFields) {
    divorcedFields.style.display = (val === 'Bercerai') ? 'block' : 'none';
  }
}
window.handleMaritalStatusChange = handleMaritalStatusChange;

function handleColorBlindChange(val) {
  const container = document.getElementById('eye-condition-container');
  if (!container) return;
  if (val && !val.includes('Normal')) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}
window.handleColorBlindChange = handleColorBlindChange;

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
    const isAdmin = (typeof state !== 'undefined' && state?.user?.role && ['SUPER_ADMIN', 'ADMIN'].includes(state.user.role));
    const isReadOnly = !isAdmin && (d.formStatus === 'SUBMITTED' || d.formStatus === 'VERIFIED');
    const isRevision = d.formStatus === 'REVISION_REQUIRED';

    const isFatherDeceased = st.fatherStatus === 'SUDAH_MENINGGAL';
    const isGuardianMandatory = isFatherDeceased || !!st.hasGuardian;
    const isDivorced = st.parentsMaritalStatus === 'Bercerai';
    const maxToday = new Date().toISOString().split('T')[0];
    const birthDateVal = st.birthDate ? new Date(st.birthDate).toISOString().split('T')[0] : '';
    const fatherBirthVal = st.fatherBirthDate ? new Date(st.fatherBirthDate).toISOString().split('T')[0] : '';
    const motherBirthVal = st.motherBirthDate ? new Date(st.motherBirthDate).toISOString().split('T')[0] : '';
    const guardianBirthVal = st.guardianBirthDate ? new Date(st.guardianBirthDate).toISOString().split('T')[0] : '';

    const fatherIncomeVal = st.fatherMonthlyIncome || 'LEBIH_DARI_20JT';
    const motherIncomeVal = st.motherMonthlyIncome || 'LEBIH_DARI_20JT';
    const guardianIncomeVal = st.guardianMonthlyIncome || 'LEBIH_DARI_20JT';

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto;">
        
        <!-- Admin Banner if in Admin/Super Admin mode -->
        ${isAdmin ? `
          <div class="alert alert-info" style="margin-bottom: 20px; background: rgba(14, 165, 233, 0.1); border: 1.5px solid #0284c7; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <strong style="color: #0369a1;"><i class="fa-solid fa-user-shield"></i> Mode Admin: Edit Data Calon Santri</strong>
              <div style="font-size: 0.85rem; color: #0284c7;">Sebagai Administrator/Super Admin, Anda memiliki hak akses penuh untuk mengedit dan memperbarui data pendaftaran calon santri ini.</div>
            </div>
            <div>
              <button type="button" class="btn btn-sm btn-primary" onclick="handleSaveFormDraft('${regId}')">
                <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan (Admin)
              </button>
            </div>
          </div>
        ` : ''}

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
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap (sesuai Akta/Ijazah) <span style="color: red;">*</span></label>
              <input type="text" id="ff-fullName" class="form-control" value="${escapeHtml(st.fullName || d.individualParticipant?.fullName || '')}" ${isReadOnly ? 'disabled' : ''} required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Calon Santri (No. KTP/KIA) <span style="color: red;">*</span></label>
                <input type="text" id="ff-nik" class="form-control" placeholder="16 digit NIK" maxlength="16" minlength="16" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" value="${escapeHtml(st.nik || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nomor Kartu Keluarga (KK) <span style="color: red;">*</span></label>
                <input type="text" id="ff-familyCardNumber" class="form-control" placeholder="16 digit Nomor KK" maxlength="16" minlength="16" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" value="${escapeHtml(st.familyCardNumber || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NISN <span style="color: red;">*</span></label>
                <input type="text" id="ff-nisn" class="form-control" placeholder="10 digit NISN" maxlength="10" minlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10)" value="${escapeHtml(st.nisn || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nomor Akta Kelahiran <span style="color: red;">*</span></label>
                <input type="text" id="ff-birthCertificateNumber" class="form-control" value="${escapeHtml(st.birthCertificateNumber || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
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
                <input type="text" id="ff-birthPlace" class="form-control" value="${escapeHtml(st.birthPlace || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir</label>
                <input type="date" id="ff-birthDate" class="form-control" value="${birthDateVal}" max="${maxToday}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-4" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Agama</label>
                <input type="text" id="ff-religion" class="form-control" value="${escapeHtml(st.religion || 'Islam')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tinggi Badan (cm)</label>
                <input type="number" id="ff-heightCm" class="form-control" min="50" max="250" placeholder="Contoh: 155" value="${st.heightCm || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Berat Badan (kg)</label>
                <input type="number" id="ff-weightKg" class="form-control" min="20" max="200" placeholder="Contoh: 45" value="${st.weightKg || ''}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Golongan Darah</label>
                <select id="ff-bloodType" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">- Belum Tahu -</option>
                  <option value="A" ${st.bloodType === 'A' ? 'selected' : ''}>A</option>
                  <option value="B" ${st.bloodType === 'B' ? 'selected' : ''}>B</option>
                  <option value="AB" ${st.bloodType === 'AB' ? 'selected' : ''}>AB</option>
                  <option value="O" ${st.bloodType === 'O' ? 'selected' : ''}>O</option>
                </select>
              </div>
            </div>

            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Anak Ke-</label>
                <input type="number" id="ff-childOrder" class="form-control" min="1" value="${st.childOrder || 1}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jumlah Saudara Kandung</label>
                <input type="number" id="ff-siblingsCount" class="form-control" min="0" value="${st.siblingsCount || 0}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Anak</label>
                <select id="ff-childStatus" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_CHILD_STATUS_OPTIONS.map(opt => `
                    <option value="${opt.value}" ${st.childStatus === opt.value ? 'selected' : ''}>${opt.label}</option>
                  `).join('')}
                </select>
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
                  <input type="text" id="ff-rt" class="form-control" placeholder="01" value="${escapeHtml(st.rt || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">RW <span style="color: red;">*</span></label>
                  <input type="text" id="ff-rw" class="form-control" placeholder="02" value="${escapeHtml(st.rw || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kode Pos <span style="color: red;">*</span></label>
                  <input type="text" id="ff-postalCode" class="form-control" placeholder="61155" value="${escapeHtml(st.postalCode || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Lengkap (Jalan, No. Rumah, Dusun) <span style="color: red;">*</span></label>
              <textarea id="ff-fullAddress" class="form-control" rows="3" placeholder="Contoh: Jl. Maskumambang No. 12 RT 01 RW 02 Dusun Sembungan" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${escapeHtml(st.fullAddress || '')}</textarea>
            </div>
          </div>

          <!-- SECTION C: ASAL SEKOLAH -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">C</span>
              Data Asal Sekolah / Madrasah
            </h3>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Sekolah / Madrasah Asal <span style="color: red;">*</span></label>
              <input type="text" id="ff-previousSchoolName" class="form-control" value="${escapeHtml(st.previousSchoolName || d.individualParticipant?.schoolName || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jenjang Sekolah Asal</label>
                <select id="ff-previousSchoolLevel" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="TK" ${st.previousSchoolLevel === 'TK' ? 'selected' : ''}>TK / PAUD / RA</option>
                  <option value="SD_MI" ${st.previousSchoolLevel === 'SD_MI' ? 'selected' : ''}>SD / MI</option>
                  <option value="SMP_MTS" ${(!st.previousSchoolLevel || st.previousSchoolLevel === 'SMP_MTS') ? 'selected' : ''}>SMP / MTs</option>
                  <option value="SMA_MA_SMK" ${st.previousSchoolLevel === 'SMA_MA_SMK' ? 'selected' : ''}>SMA / MA / SMK</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tahun Lulus</label>
                <input type="text" id="ff-graduationYear" class="form-control" placeholder="2026" value="${escapeHtml(st.graduationYear || '2026')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">No. Ijazah / SKL (Opsional)</label>
                <input type="text" id="ff-diplomaNumber" class="form-control" value="${escapeHtml(st.diplomaNumber || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Sekolah Asal</label>
              <input type="text" id="ff-previousSchoolAddress" class="form-control" value="${escapeHtml(st.previousSchoolAddress || d.individualParticipant?.schoolAddress || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>
          </div>

          <!-- SECTION D: DATA ORANG TUA & KONDISI RUMAH TANGGA -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">D</span>
              Data Orang Tua Kandung & Kondisi Rumah Tangga
            </h3>

            <!-- D1: AYAH KANDUNG -->
            <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 16px; margin-bottom: 18px; border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary-600); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-user-tie"></i> Data Ayah Kandung
              </h4>

              <div class="form-grid-2-1" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Ayah <span style="color: red;">*</span></label>
                  <input type="text" id="ff-fatherName" class="form-control" value="${escapeHtml(st.fatherName || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Ayah</label>
                  <select id="ff-fatherStatus" class="form-select" onchange="handleFatherStatusChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    <option value="MASIH_HIDUP" ${(!st.fatherStatus || st.fatherStatus === 'MASIH_HIDUP') ? 'selected' : ''}>Masih Hidup</option>
                    <option value="SUDAH_MENINGGAL" ${st.fatherStatus === 'SUDAH_MENINGGAL' ? 'selected' : ''}>Sudah Meninggal</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-3" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Ayah</label>
                  <input type="text" id="ff-fatherNik" class="form-control" placeholder="16 digit NIK" maxlength="16" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" value="${escapeHtml(st.fatherNik || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir Ayah</label>
                  <input type="text" id="ff-fatherBirthPlace" class="form-control" value="${escapeHtml(st.fatherBirthPlace || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir Ayah</label>
                  <input type="date" id="ff-fatherBirthDate" class="form-control" value="${fatherBirthVal}" max="${maxToday}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-4">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan Ayah</label>
                  <select id="ff-fatherEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_EDUCATION_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${st.fatherEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                ${renderOccupationFieldHtml('ff-fatherOccupation', 'Pekerjaan Ayah', st.fatherOccupation, isReadOnly)}
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan Ayah / Bln</label>
                  <select id="ff-fatherMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_INCOME_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${fatherIncomeVal === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Ayah</label>
                  <input type="text" id="ff-fatherWhatsapp" class="form-control" placeholder="08..." value="${escapeHtml(st.fatherWhatsapp || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>
            </div>

            <!-- D2: IBU KANDUNG -->
            <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 16px; margin-bottom: 18px; border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary-600); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-person-dress"></i> Data Ibu Kandung
              </h4>

              <div class="form-grid-2-1" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Ibu <span style="color: red;">*</span></label>
                  <input type="text" id="ff-motherName" class="form-control" value="${escapeHtml(st.motherName || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
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
                  <input type="text" id="ff-motherNik" class="form-control" placeholder="16 digit NIK" maxlength="16" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" value="${escapeHtml(st.motherNik || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir Ibu</label>
                  <input type="text" id="ff-motherBirthPlace" class="form-control" value="${escapeHtml(st.motherBirthPlace || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir Ibu</label>
                  <input type="date" id="ff-motherBirthDate" class="form-control" value="${motherBirthVal}" max="${maxToday}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-4">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan Ibu</label>
                  <select id="ff-motherEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_EDUCATION_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${st.motherEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                ${renderOccupationFieldHtml('ff-motherOccupation', 'Pekerjaan Ibu', st.motherOccupation, isReadOnly)}
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan Ibu / Bln</label>
                  <select id="ff-motherMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_INCOME_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${motherIncomeVal === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Ibu</label>
                  <input type="text" id="ff-motherWhatsapp" class="form-control" placeholder="08..." value="${escapeHtml(st.motherWhatsapp || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>
            </div>

            <!-- D3: KONDISI RUMAH TANGGA -->
            <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary-600); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-house-user"></i> Kondisi Rumah Tangga
              </h4>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Pernikahan / Hubungan Orang Tua <span style="color: red;">*</span></label>
                <select id="ff-parentsMaritalStatus" class="form-select" onchange="handleMaritalStatusChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="Bersama (Utuh)" ${(!st.parentsMaritalStatus || st.parentsMaritalStatus === 'Bersama (Utuh)') ? 'selected' : ''}>Bersama (Utuh)</option>
                  <option value="Bercerai" ${st.parentsMaritalStatus === 'Bercerai' ? 'selected' : ''}>Bercerai</option>
                </select>
              </div>

              <div id="divorced-fields" style="${isDivorced ? 'display: block;' : 'display: none;'} background: rgba(239, 68, 68, 0.04); border: 1px dashed var(--danger-300, #fca5a5); border-radius: 6px; padding: 14px; margin-top: 10px;">
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Hak Asuh Anak <span style="color: red;">*</span></label>
                    <select id="ff-childCustody" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                      <option value="Pihak Ayah" ${st.childCustody === 'Pihak Ayah' ? 'selected' : ''}>Pihak Ayah</option>
                      <option value="Pihak Ibu" ${(!st.childCustody || st.childCustody === 'Pihak Ibu') ? 'selected' : ''}>Pihak Ibu</option>
                      <option value="Bersama" ${st.childCustody === 'Bersama' ? 'selected' : ''}>Bersama</option>
                      <option value="Lainnya" ${st.childCustody === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Tinggal Anak Saat Ini <span style="color: red;">*</span></label>
                    <select id="ff-childLivingWith" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                      <option value="Bersama Ayah" ${st.childLivingWith === 'Bersama Ayah' ? 'selected' : ''}>Bersama Ayah</option>
                      <option value="Bersama Ibu" ${(!st.childLivingWith || st.childLivingWith === 'Bersama Ibu') ? 'selected' : ''}>Bersama Ibu</option>
                      <option value="Saudara Ayah/Ibu" ${st.childLivingWith === 'Saudara Ayah/Ibu' ? 'selected' : ''}>Saudara Ayah/Ibu</option>
                      <option value="Kakek/Nenek" ${st.childLivingWith === 'Kakek/Nenek' ? 'selected' : ''}>Kakek/Nenek</option>
                      <option value="Lainnya" ${st.childLivingWith === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION E: DATA WALI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">E</span>
                Data Wali Calon Santri <span id="guardian-req-asterisk" style="color: red; ${isFatherDeceased ? '' : 'display: none;'}">*</span>
              </h3>
              <label style="display: inline-flex !important; align-items: center !important; gap: 8px !important; cursor: pointer; font-size: 0.875rem; font-weight: 600; width: auto; margin: 0; color: var(--text-heading); user-select: none;">
                <input type="checkbox" id="ff-hasGuardian" onchange="toggleGuardianSection(this.checked)" ${isGuardianMandatory ? 'checked' : ''} ${isFatherDeceased ? 'disabled' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 18px; height: 18px; margin: 0 !important; cursor: pointer; accent-color: var(--primary-600); flex-shrink: 0;">
                <span style="line-height: 1.2;">Memiliki Wali Selain Orang Tua</span>
              </label>
            </div>

            <div id="guardian-required-notice" style="${isFatherDeceased ? 'display: block;' : 'display: none;'} background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 6px; font-size: 0.825rem; font-weight: 600; margin-bottom: 14px;">
              <i class="fa-solid fa-circle-info"></i> Karena status Ayah adalah <strong>Sudah Meninggal</strong>, pengisian data Wali adalah <strong>WAJIB</strong>.
            </div>

            <div id="guardian-fields" style="${isGuardianMandatory ? '' : 'display: none;'} border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <div class="form-grid-3" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Hubungan Wali</label>
                  <input type="text" id="ff-guardianRelation" class="form-control" placeholder="Paman / Kakek / Bibi" value="${escapeHtml(st.guardianRelation || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Lengkap Wali</label>
                  <input type="text" id="ff-guardianName" class="form-control" value="${escapeHtml(st.guardianName || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">NIK Wali</label>
                  <input type="text" id="ff-guardianNik" class="form-control" placeholder="16 digit NIK" maxlength="16" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 16)" value="${escapeHtml(st.guardianNik || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-2" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tempat Lahir Wali</label>
                  <input type="text" id="ff-guardianBirthPlace" class="form-control" value="${escapeHtml(st.guardianBirthPlace || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Tanggal Lahir Wali</label>
                  <input type="date" id="ff-guardianBirthDate" class="form-control" value="${guardianBirthVal}" max="${maxToday}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-grid-4" style="margin-bottom: 14px;">
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Pendidikan Wali</label>
                  <select id="ff-guardianEducation" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_EDUCATION_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${st.guardianEducation === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                ${renderOccupationFieldHtml('ff-guardianOccupation', 'Pekerjaan Wali', st.guardianOccupation, isReadOnly)}
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Penghasilan / Bln</label>
                  <select id="ff-guardianMonthlyIncome" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    ${PSB_INCOME_OPTIONS.map(opt => `
                      <option value="${opt.value}" ${guardianIncomeVal === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Wali</label>
                  <input type="text" id="ff-guardianWhatsapp" class="form-control" placeholder="08..." value="${escapeHtml(st.guardianWhatsapp || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Alamat Lengkap Wali</label>
                <input type="text" id="ff-guardianAddress" class="form-control" value="${escapeHtml(st.guardianAddress || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION F: TEMPAT TINGGAL & FASILITAS -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">F</span>
              Data Tempat Tinggal & Fasilitas
            </h3>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Jarak Tempat Tinggal ke Sekolah</label>
                <select id="ff-distanceToSchool" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Jarak --</option>
                  ${PSB_DISTANCE_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.distanceToSchool === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Transportasi ke Sekolah</label>
                <select id="ff-transportationMode" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Transportasi --</option>
                  ${PSB_TRANSPORT_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.transportationMode === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Kepemilikan Rumah</label>
                <select id="ff-homeOwnership" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Status Rumah --</option>
                  ${PSB_HOME_OWNERSHIP_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.homeOwnership === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Daya Listrik Rumah</label>
                <select id="ff-electricityPower" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Daya Listrik --</option>
                  ${PSB_ELECTRICITY_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.electricityPower === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Sumber Air Bersih</label>
                <select id="ff-waterSource" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Sumber Air --</option>
                  ${PSB_WATER_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.waterSource === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Akses Internet di Rumah</label>
                <select id="ff-internetAccess" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Akses Internet --</option>
                  ${PSB_INTERNET_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.internetAccess === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Kepemilikan HP / Smartphone</label>
                <select id="ff-phoneOwnership" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">-- Pilih Kepemilikan HP --</option>
                  ${PSB_PHONE_OWNERSHIP_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.phoneOwnership === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nomor HP / WhatsApp Santri (Jika Ada)</label>
                <input type="text" id="ff-studentPhone" class="form-control" placeholder="08..." value="${escapeHtml(st.studentPhone || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION G: DATA MEDIA SOSIAL -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">G</span>
              Data Akun & Media Sosial (Santri / Orang Tua)
            </h3>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;"><i class="fa-solid fa-envelope" style="color: var(--primary-600);"></i> Email Aktif</label>
                <input type="email" id="ff-socialEmail" class="form-control" placeholder="contoh@gmail.com" value="${escapeHtml(st.socialEmail || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;"><i class="fa-brands fa-facebook" style="color: #1877f2;"></i> Facebook</label>
                <input type="text" id="ff-socialFacebook" class="form-control" placeholder="Nama / Link Akun" value="${escapeHtml(st.socialFacebook || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;"><i class="fa-brands fa-instagram" style="color: #e4405f;"></i> Instagram</label>
                <input type="text" id="ff-socialInstagram" class="form-control" placeholder="@username" value="${escapeHtml(st.socialInstagram || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;"><i class="fa-brands fa-x-twitter"></i> Twitter / X</label>
                <input type="text" id="ff-socialTwitter" class="form-control" placeholder="@username" value="${escapeHtml(st.socialTwitter || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;"><i class="fa-brands fa-tiktok"></i> TikTok</label>
                <input type="text" id="ff-socialTiktok" class="form-control" placeholder="@username" value="${escapeHtml(st.socialTiktok || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION H: RIWAYAT KESEHATAN & FISIK -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">H</span>
              Riwayat Kesehatan & Kondisi Khusus
            </h3>

            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Riwayat Merokok</label>
                <select id="ff-smokingStatus" class="form-select" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_SMOKING_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.smokingStatus === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Status Buta Warna</label>
                <select id="ff-colorBlindStatus" class="form-select" onchange="handleColorBlindChange(this.value)" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  ${PSB_COLOR_BLIND_OPTIONS.map(opt => `
                    <option value="${opt}" ${st.colorBlindStatus === opt ? 'selected' : ''}>${opt}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- KONDISI MATA (Otomatis tersembunyi jika Normal) -->
            <div id="eye-condition-container" style="${(st.colorBlindStatus && !st.colorBlindStatus.includes('Normal')) || Boolean(st.eyeMinusLeft || st.eyeCylLeft || st.eyeMinusRight || st.eyeCylRight) ? 'display: block;' : 'display: none;'} background: var(--bg-body); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; border: 1px solid var(--border-subtle);">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 8px; color: var(--text-heading);">
                <i class="fa-solid fa-eye" style="color: var(--primary-600); margin-right: 4px;"></i> Riwayat Mata (Minus & Silinder)
              </label>
              <div class="form-grid-2">
                <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                  <strong style="font-size: 0.8rem; display: block; margin-bottom: 6px; color: var(--text-heading);">Mata Kiri</strong>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label style="font-size: 0.75rem; color: var(--text-muted);">Minus (-)</label>
                      <input type="text" id="ff-eyeMinusLeft" class="form-control" placeholder="Contoh: 0.5" value="${escapeHtml(st.eyeMinusLeft || '')}" ${isReadOnly ? 'disabled' : ''} style="padding: 6px 10px; font-size: 0.85rem;">
                    </div>
                    <div>
                      <label style="font-size: 0.75rem; color: var(--text-muted);">Silinder (Cyl)</label>
                      <input type="text" id="ff-eyeCylLeft" class="form-control" placeholder="Contoh: 0.25" value="${escapeHtml(st.eyeCylLeft || '')}" ${isReadOnly ? 'disabled' : ''} style="padding: 6px 10px; font-size: 0.85rem;">
                    </div>
                  </div>
                </div>
                <div style="background: var(--bg-card); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                  <strong style="font-size: 0.8rem; display: block; margin-bottom: 6px; color: var(--text-heading);">Mata Kanan</strong>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label style="font-size: 0.75rem; color: var(--text-muted);">Minus (-)</label>
                      <input type="text" id="ff-eyeMinusRight" class="form-control" placeholder="Contoh: 0.5" value="${escapeHtml(st.eyeMinusRight || '')}" ${isReadOnly ? 'disabled' : ''} style="padding: 6px 10px; font-size: 0.85rem;">
                    </div>
                    <div>
                      <label style="font-size: 0.75rem; color: var(--text-muted);">Silinder (Cyl)</label>
                      <input type="text" id="ff-eyeCylRight" class="form-control" placeholder="Contoh: 0.25" value="${escapeHtml(st.eyeCylRight || '')}" ${isReadOnly ? 'disabled' : ''} style="padding: 6px 10px; font-size: 0.85rem;">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-grid-3" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Riwayat Penyakit Berat/Kronis</label>
                <input type="text" id="ff-diseaseHistory" class="form-control" placeholder="Contoh: Asma, Tipus dll" value="${escapeHtml(st.diseaseHistory || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Riwayat Alergi (Makanan/Obat)</label>
                <input type="text" id="ff-allergyHistory" class="form-control" placeholder="Contoh: Alergi Seafood/Debu" value="${escapeHtml(st.allergyHistory || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Riwayat Operasi</label>
                <input type="text" id="ff-surgeryHistory" class="form-control" placeholder="Contoh: Usus Buntu (2023)" value="${escapeHtml(st.surgeryHistory || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 6px;">
              <label style="display: inline-flex !important; align-items: center !important; gap: 8px !important; cursor: pointer; font-size: 0.875rem; font-weight: 600; width: auto; margin: 0; color: var(--text-heading); user-select: none;">
                <input type="checkbox" id="ff-hasSpecialNeeds" onchange="toggleSpecialNeedsField(this.checked)" ${st.hasSpecialNeeds ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 18px; height: 18px; margin: 0 !important; cursor: pointer; accent-color: var(--primary-600); flex-shrink: 0;">
                <span style="line-height: 1.2;">Memiliki Kebutuhan Khusus / Disabilitas</span>
              </label>
              <div id="special-needs-container" style="${st.hasSpecialNeeds ? '' : 'display: none;'} margin-top: 10px;">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Keterangan Kebutuhan Khusus <span style="color:red;">*</span></label>
                <textarea id="ff-specialNeedsDescription" class="form-control" rows="2" placeholder="Jelaskan kebutuhan khusus calon santri..." ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${escapeHtml(st.specialNeedsDescription || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- SECTION I: KONTAK UTAMA -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">I</span>
              Kontak Utama / Darurat Pendaftaran
            </h3>

            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Nama Kontak Utama <span style="color: red;">*</span></label>
                <input type="text" id="ff-primaryContactName" class="form-control" value="${escapeHtml(st.primaryContactName || d.individualParticipant?.mentorName || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">Hubungan</label>
                <input type="text" id="ff-primaryContactRelation" class="form-control" placeholder="Ayah / Ibu / Wali" value="${escapeHtml(st.primaryContactRelation || 'Orang Tua')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 4px;">WhatsApp Utama <span style="color: red;">*</span></label>
                <input type="text" id="ff-primaryContactWhatsapp" class="form-control" value="${escapeHtml(st.primaryContactWhatsapp || d.individualParticipant?.whatsappNumber || '')}" ${isReadOnly ? 'disabled' : ''} style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>
          </div>

          <!-- SECTION J: CATATAN PRESTASI SANTRI -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">J</span>
                Catatan Prestasi Santri (Opsional)
              </h3>
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

          <!-- SECTION K: UPLOAD BERKAS PERSYARATAN -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 28px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">K</span>
              Upload Dokumen Persyaratan
            </h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
              Format file yang diizinkan: <strong>PDF, JPG, PNG</strong> (Maksimum 5MB per file). Dokumen bertanda <span style="color: red;">*</span> wajib diunggah sebelum submit final.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${renderDocUploadCard(regId, 'FAMILY_CARD', 'Kartu Keluarga (KK)', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'BIRTH_CERTIFICATE', 'Akta Kelahiran', true, docs, isReadOnly)}
              ${renderDocUploadCard(regId, 'FATHER_ID_CARD', 'KTP Ayah', false, docs, isReadOnly, 'Opsional')}
              ${renderDocUploadCard(regId, 'MOTHER_ID_CARD', 'KTP Ibu', false, docs, isReadOnly, 'Opsional')}
              ${renderDocUploadCard(regId, 'GUARDIAN_ID_CARD', 'KTP Wali', false, docs, isReadOnly, 'Opsional')}
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
                  <i class="fa-solid fa-floppy-disk"></i> ${isAdmin ? 'Simpan Perubahan' : 'Simpan Sementara'}
                </button>
              </div>
              <div>
                ${isAdmin ? `
                  <button type="button" class="btn btn-primary" style="padding: 12px 24px; font-weight: 700;" onclick="handleSaveFormDraft('${regId}')">
                    <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Data (Admin)
                  </button>
                ` : `
                  <button type="button" class="btn btn-primary" style="padding: 12px 24px; font-weight: 700;" onclick="handleFinalFormSubmit('${regId}')">
                    <i class="fa-solid fa-paper-plane"></i> ${isRevision ? 'Kirim Data Final Ulang' : 'Kirim Data Final'}
                  </button>
                `}
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
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Hapus Dokumen',
        message: 'Apakah Anda yakin ingin menghapus file dokumen persyaratan ini?',
        confirmText: 'Ya, Hapus Dokumen',
        cancelText: 'Batal',
        type: 'danger'
      })
    : confirm('Apakah Anda yakin ingin menghapus dokumen ini?');
  if (!ok) return;
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
    // A: Identitas
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
    childStatus: document.getElementById('ff-childStatus')?.value,
    heightCm: getNum('ff-heightCm'),
    weightKg: getNum('ff-weightKg'),

    // B: Alamat
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

    // C: Asal Sekolah
    previousSchoolName: getVal('ff-previousSchoolName'),
    previousSchoolNpsn: getVal('ff-previousSchoolNpsn') || undefined,
    previousSchoolLevel: document.getElementById('ff-previousSchoolLevel')?.value,
    graduationYear: getVal('ff-graduationYear'),
    diplomaNumber: getVal('ff-diplomaNumber'),
    previousSchoolAddress: getVal('ff-previousSchoolAddress'),

    // D: Data Orang Tua - Ayah
    fatherName: getVal('ff-fatherName'),
    fatherStatus: document.getElementById('ff-fatherStatus')?.value,
    fatherNik: getVal('ff-fatherNik'),
    fatherBirthPlace: getVal('ff-fatherBirthPlace'),
    fatherBirthDate: getVal('ff-fatherBirthDate'),
    fatherEducation: document.getElementById('ff-fatherEducation')?.value,
    fatherOccupation: getOccupationFormValue('ff-fatherOccupation'),
    fatherMonthlyIncome: document.getElementById('ff-fatherMonthlyIncome')?.value,
    fatherWhatsapp: getVal('ff-fatherWhatsapp'),

    // D: Data Orang Tua - Ibu
    motherName: getVal('ff-motherName'),
    motherStatus: document.getElementById('ff-motherStatus')?.value,
    motherNik: getVal('ff-motherNik'),
    motherBirthPlace: getVal('ff-motherBirthPlace'),
    motherBirthDate: getVal('ff-motherBirthDate'),
    motherEducation: document.getElementById('ff-motherEducation')?.value,
    motherOccupation: getOccupationFormValue('ff-motherOccupation'),
    motherMonthlyIncome: document.getElementById('ff-motherMonthlyIncome')?.value,
    motherWhatsapp: getVal('ff-motherWhatsapp'),

    // D3: Kondisi Rumah Tangga
    parentsMaritalStatus: document.getElementById('ff-parentsMaritalStatus')?.value,
    childCustody: document.getElementById('ff-childCustody')?.value,
    childLivingWith: document.getElementById('ff-childLivingWith')?.value,

    // E: Data Wali
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

    // F: Tempat Tinggal & Fasilitas
    distanceToSchool: document.getElementById('ff-distanceToSchool')?.value,
    transportationMode: document.getElementById('ff-transportationMode')?.value,
    homeOwnership: document.getElementById('ff-homeOwnership')?.value,
    electricityPower: document.getElementById('ff-electricityPower')?.value,
    waterSource: document.getElementById('ff-waterSource')?.value,
    internetAccess: document.getElementById('ff-internetAccess')?.value,
    phoneOwnership: document.getElementById('ff-phoneOwnership')?.value,
    studentPhone: getVal('ff-studentPhone'),

    // G: Media Sosial
    socialEmail: getVal('ff-socialEmail'),
    socialFacebook: getVal('ff-socialFacebook'),
    socialInstagram: getVal('ff-socialInstagram'),
    socialTwitter: getVal('ff-socialTwitter'),
    socialTiktok: getVal('ff-socialTiktok'),

    // H: Riwayat Kesehatan
    smokingStatus: document.getElementById('ff-smokingStatus')?.value,
    colorBlindStatus: document.getElementById('ff-colorBlindStatus')?.value,
    eyeMinusLeft: getVal('ff-eyeMinusLeft'),
    eyeCylLeft: getVal('ff-eyeCylLeft'),
    eyeMinusRight: getVal('ff-eyeMinusRight'),
    eyeCylRight: getVal('ff-eyeCylRight'),
    diseaseHistory: getVal('ff-diseaseHistory'),
    allergyHistory: getVal('ff-allergyHistory'),
    surgeryHistory: getVal('ff-surgeryHistory'),
    hasSpecialNeeds: getChk('ff-hasSpecialNeeds'),
    specialNeedsDescription: getVal('ff-specialNeedsDescription'),

    // I: Kontak Utama
    primaryContactName: getVal('ff-primaryContactName'),
    primaryContactRelation: getVal('ff-primaryContactRelation'),
    primaryContactWhatsapp: getVal('ff-primaryContactWhatsapp'),

    // J: Prestasi
    achievements,
  };
}

function clearFormError(el) {
  if (!el) return;
  el.style.borderColor = '';
  el.style.boxShadow = '';
  const parent = el.closest('.form-group') || el.parentElement;
  if (parent) {
    const existingMsg = parent.querySelector('.psb-field-error-msg');
    if (existingMsg) existingMsg.remove();
  }
}

function clearAllFormErrors() {
  document.querySelectorAll('.psb-field-error-msg').forEach(el => el.remove());
  document.querySelectorAll('#psb-full-form input, #psb-full-form select, #psb-full-form textarea').forEach(el => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  });
}

function setFormError(idOrEl, message) {
  const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return;

  el.style.borderColor = '#ef4444';
  el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';

  const parent = el.closest('.form-group') || el.parentElement;
  if (parent) {
    let msgEl = parent.querySelector('.psb-field-error-msg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'psb-field-error-msg';
      msgEl.style.cssText = 'color: #dc2626; font-size: 0.78rem; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px;';
      parent.appendChild(msgEl);
    }
    msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
  }

  // Auto clear error when candidate modifies the input
  const clearHandler = () => {
    clearFormError(el);
    el.removeEventListener('input', clearHandler);
    el.removeEventListener('change', clearHandler);
  };
  el.addEventListener('input', clearHandler);
  el.addEventListener('change', clearHandler);
}

function validateFullFormClient(payload, isDraft = false) {
  clearAllFormErrors();
  let firstInvalidEl = null;
  let errorCount = 0;

  const markError = (id, msg) => {
    setFormError(id, msg);
    errorCount++;
    const el = document.getElementById(id);
    if (!firstInvalidEl && el) {
      firstInvalidEl = el;
    }
  };

  const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== '';

  // 1. Strict Digit Rules: NIK (16), KK (16), NISN (10)
  const cleanNik = String(payload.nik || '').replace(/[^0-9]/g, '').trim();
  if (isFilled(payload.nik)) {
    if (cleanNik.length !== 16) {
      markError('ff-nik', 'NIK harus terdiri dari tepat 16 digit angka.');
    }
  } else if (!isDraft) {
    markError('ff-nik', 'NIK calon santri wajib diisi (16 digit angka).');
  }

  const cleanKk = String(payload.familyCardNumber || '').replace(/[^0-9]/g, '').trim();
  if (isFilled(payload.familyCardNumber)) {
    if (cleanKk.length !== 16) {
      markError('ff-familyCardNumber', 'Nomor KK harus terdiri dari tepat 16 digit angka.');
    }
  } else if (!isDraft) {
    markError('ff-familyCardNumber', 'Nomor Kartu Keluarga (KK) wajib diisi (16 digit angka).');
  }

  const cleanNisn = String(payload.nisn || '').replace(/[^0-9]/g, '').trim();
  if (isFilled(payload.nisn)) {
    if (cleanNisn.length !== 10) {
      markError('ff-nisn', 'NISN harus terdiri dari tepat 10 digit angka.');
    }
  } else if (!isDraft) {
    markError('ff-nisn', 'NISN calon santri wajib diisi (10 digit angka).');
  }

  // Parents / Guardian NIK (16 digit if filled)
  if (isFilled(payload.fatherNik) && String(payload.fatherNik).replace(/[^0-9]/g, '').trim().length !== 16) {
    markError('ff-fatherNik', 'NIK Ayah harus terdiri dari 16 digit angka.');
  }
  if (isFilled(payload.motherNik) && String(payload.motherNik).replace(/[^0-9]/g, '').trim().length !== 16) {
    markError('ff-motherNik', 'NIK Ibu harus terdiri dari 16 digit angka.');
  }
  if (isFilled(payload.guardianNik) && String(payload.guardianNik).replace(/[^0-9]/g, '').trim().length !== 16) {
    markError('ff-guardianNik', 'NIK Wali harus terdiri dari 16 digit angka.');
  }

  // For Draft saving: allow empty fields, only reject invalid digit formats
  if (isDraft) {
    if (errorCount > 0 && firstInvalidEl) {
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { firstInvalidEl.focus(); } catch (e) {}
      showToast('Periksa kembali data NIK / KK / NISN bertanda merah.', 'warning');
      return false;
    }
    return true;
  }

  // 2. Strict Validations for Final Submission:
  // Section A: Identitas Calon Santri
  const todayDateStr = new Date().toISOString().split('T')[0];
  if (!isFilled(payload.fullName)) markError('ff-fullName', 'Nama Lengkap calon santri wajib diisi.');
  if (!isFilled(payload.birthCertificateNumber)) markError('ff-birthCertificateNumber', 'Nomor Akta Kelahiran wajib diisi.');
  if (!isFilled(payload.gender)) markError('ff-gender', 'Jenis Kelamin wajib dipilih.');
  if (!isFilled(payload.birthPlace)) markError('ff-birthPlace', 'Tempat Lahir wajib diisi.');
  if (!isFilled(payload.birthDate)) {
    markError('ff-birthDate', 'Tanggal Lahir wajib diisi.');
  } else if (payload.birthDate > todayDateStr) {
    markError('ff-birthDate', 'Tanggal lahir tidak boleh melebihi tanggal hari ini.');
  }
  if (isFilled(payload.fatherBirthDate) && payload.fatherBirthDate > todayDateStr) {
    markError('ff-fatherBirthDate', 'Tanggal lahir Ayah tidak boleh melebihi tanggal hari ini.');
  }
  if (isFilled(payload.motherBirthDate) && payload.motherBirthDate > todayDateStr) {
    markError('ff-motherBirthDate', 'Tanggal lahir Ibu tidak boleh melebihi tanggal hari ini.');
  }
  if (isFilled(payload.guardianBirthDate) && payload.guardianBirthDate > todayDateStr) {
    markError('ff-guardianBirthDate', 'Tanggal lahir Wali tidak boleh melebihi tanggal hari ini.');
  }
  if (!isFilled(payload.religion)) markError('ff-religion', 'Agama wajib diisi.');
  if (payload.childOrder === undefined || payload.childOrder === null || payload.childOrder === '') markError('ff-childOrder', 'Anak Ke- wajib diisi.');
  if (payload.siblingsCount === undefined || payload.siblingsCount === null || payload.siblingsCount === '') markError('ff-siblingsCount', 'Jumlah Saudara Kandung wajib diisi.');
  if (!isFilled(payload.childStatus)) markError('ff-childStatus', 'Status Anak wajib dipilih.');

  // Section B: Alamat
  if (!isFilled(payload.country)) markError('ff-country', 'Negara tempat tinggal wajib diisi.');
  if (!isFilled(payload.fullAddress)) markError('ff-fullAddress', 'Alamat Lengkap wajib diisi.');
  if (payload.country === 'Indonesia') {
    if (!isFilled(payload.province)) markError('ff-province-select', 'Provinsi wajib dipilih.');
    if (!isFilled(payload.cityDistrict)) markError('ff-regency-select', 'Kabupaten/Kota wajib dipilih.');
    if (!isFilled(payload.subDistrict)) markError('ff-district-select', 'Kecamatan wajib dipilih.');
    if (!isFilled(payload.village)) markError('ff-village-select', 'Kelurahan/Desa wajib dipilih.');
    if (!isFilled(payload.rt)) markError('ff-rt', 'RT wajib diisi.');
    if (!isFilled(payload.rw)) markError('ff-rw', 'RW wajib diisi.');
    if (!isFilled(payload.postalCode)) markError('ff-postalCode', 'Kode Pos wajib diisi.');
  }

  // Section C: Asal Sekolah
  if (!isFilled(payload.previousSchoolName)) markError('ff-previousSchoolName', 'Nama Sekolah Asal wajib diisi.');
  if (!isFilled(payload.previousSchoolLevel)) markError('ff-previousSchoolLevel', 'Jenjang Sekolah Asal wajib dipilih.');
  if (!isFilled(payload.previousSchoolAddress)) markError('ff-previousSchoolAddress', 'Alamat Sekolah Asal wajib diisi.');
  if (!isFilled(payload.graduationYear)) markError('ff-graduationYear', 'Tahun Lulus wajib diisi.');

  // Section D: Orang Tua
  if (!isFilled(payload.fatherName)) markError('ff-fatherName', 'Nama Lengkap Ayah wajib diisi.');
  if (!isFilled(payload.fatherStatus)) markError('ff-fatherStatus', 'Status Ayah wajib dipilih.');
  if (payload.fatherStatus !== 'SUDAH_MENINGGAL') {
    if (!isFilled(payload.fatherEducation)) markError('ff-fatherEducation', 'Pendidikan Ayah wajib dipilih.');
    if (!isFilled(payload.fatherOccupation)) markError('ff-fatherOccupation-select', 'Pekerjaan Ayah wajib dipilih.');
  }

  if (!isFilled(payload.motherName)) markError('ff-motherName', 'Nama Lengkap Ibu wajib diisi.');
  if (!isFilled(payload.motherStatus)) markError('ff-motherStatus', 'Status Ibu wajib dipilih.');
  if (payload.motherStatus !== 'SUDAH_MENINGGAL') {
    if (!isFilled(payload.motherEducation)) markError('ff-motherEducation', 'Pendidikan Ibu wajib dipilih.');
    if (!isFilled(payload.motherOccupation)) markError('ff-motherOccupation-select', 'Pekerjaan Ibu wajib dipilih.');
  }

  // Section D3: Kondisi Rumah Tangga
  if (payload.parentsMaritalStatus === 'Bercerai') {
    if (!isFilled(payload.childCustody)) markError('ff-childCustody', 'Hak Asuh Anak wajib dipilih.');
    if (!isFilled(payload.childLivingWith)) markError('ff-childLivingWith', 'Tempat Tinggal Anak wajib dipilih.');
  }

  // Section E: Data Wali
  const isFatherDead = payload.fatherStatus === 'SUDAH_MENINGGAL';
  if (isFatherDead || payload.hasGuardian) {
    if (!isFilled(payload.guardianName)) markError('ff-guardianName', 'Nama Lengkap Wali wajib diisi.');
    if (!isFilled(payload.guardianRelation)) markError('ff-guardianRelation', 'Hubungan Wali wajib diisi.');
    if (!isFilled(payload.guardianOccupation)) markError('ff-guardianOccupation-select', 'Pekerjaan Wali wajib dipilih.');
  }

  // Section H: Kebutuhan Khusus
  if (payload.hasSpecialNeeds) {
    if (!isFilled(payload.specialNeedsDescription)) markError('ff-specialNeedsDescription', 'Keterangan Kebutuhan Khusus wajib diisi.');
  }

  // Section I: Kontak Utama
  if (!isFilled(payload.primaryContactName)) markError('ff-primaryContactName', 'Nama Kontak Utama wajib diisi.');
  if (!isFilled(payload.primaryContactWhatsapp)) {
    markError('ff-primaryContactWhatsapp', 'Nomor WhatsApp Utama wajib diisi.');
  } else if (!/^[0-9+]{9,16}$/.test(payload.primaryContactWhatsapp.trim())) {
    markError('ff-primaryContactWhatsapp', 'Nomor WhatsApp tidak valid (minimal 10 digit angka).');
  }

  if (errorCount > 0 && firstInvalidEl) {
    firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { firstInvalidEl.focus(); } catch (e) {}
    showToast(`Terdapat ${errorCount} kolom yang belum lengkap atau tidak valid (ditandai warna merah).`, 'danger');
    return false;
  }

  return true;
}

async function handleSaveFormDraft(regId) {
  const payload = gatherFormData();

  // Validate draft format (e.g. NIK digits)
  if (!validateFullFormClient(payload, true)) {
    return;
  }

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form/draft`, {
      method: 'PUT',
      body: payload,
    });
    if (res.success) {
      clearAllFormErrors();
      showToast('Draft formulir berhasil disimpan!', 'success');
    } else {
      showToast(res.message || 'Gagal menyimpan draft.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat menyimpan draft.', 'danger');
  }
}

async function handleFinalFormSubmit(regId) {
  const payload = gatherFormData();

  // Validate full form before submit
  if (!validateFullFormClient(payload, false)) {
    return;
  }

  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Kirim Final Formulir Pendaftaran',
        message: 'Pastikan seluruh data dan dokumen persyaratan yang Anda masukkan sudah LENGKAP dan BENAR.\n\nSetelah dikirim, data tidak dapat diubah kembali kecuali panitia meminta revisi.\n\nLanjutkan kirim final?',
        confirmText: 'Ya, Kirim Formulir Final',
        cancelText: 'Periksa Kembali',
        type: 'primary',
        icon: 'fa-paper-plane'
      })
    : confirm('Pastikan seluruh data dan dokumen persyaratan yang Anda masukkan sudah LENGKAP dan BENAR.\n\nSetelah dikirim, data tidak dapat diubah kembali kecuali panitia meminta revisi.\n\nLanjutkan kirim final?');
  if (!ok) return;

  try {
    const res = await apiRequest(`/api/registrations/${regId}/form/submit`, {
      method: 'POST',
      body: payload,
    });
    if (res.success) {
      clearAllFormErrors();
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
    'SEPULUH_SAMPAI_20JT': 'Rp 10.000.000 - Rp 20.000.000',
    'LEBIH_DARI_20JT': '> Rp 20.000.000',
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

    <div class="sub-section-title">• KONDISI RUMAH TANGGA</div>
    <table class="data-table">
      <tr>
        <td class="label">Status Pernikahan Orang Tua</td><td class="colon">:</td><td class="val">${st.parentsMaritalStatus || 'Bersama (Utuh)'}</td>
      </tr>
      ${st.parentsMaritalStatus === 'Bercerai' ? `
        <tr>
          <td class="label">Hak Asuh Anak</td><td class="colon">:</td><td class="val">${st.childCustody || '-'}</td>
        </tr>
        <tr>
          <td class="label">Tempat Tinggal Anak</td><td class="colon">:</td><td class="val">${st.childLivingWith || '-'}</td>
        </tr>
      ` : ''}
    </table>

    <!-- E. DATA WALI (JIKA ADA / AYAH MENINGGAL) -->
    ${(st.hasGuardian || st.fatherStatus === 'SUDAH_MENINGGAL') ? `
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

    <!-- F. TEMPAT TINGGAL & FASILITAS -->
    <div class="section-title">F. Tempat Tinggal & Fasilitas</div>
    <table class="data-table">
      <tr>
        <td class="label">Jarak ke Sekolah</td><td class="colon">:</td><td class="val">${st.distanceToSchool || '-'}</td>
      </tr>
      <tr>
        <td class="label">Transportasi ke Sekolah</td><td class="colon">:</td><td class="val">${st.transportationMode || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Kepemilikan Rumah</td><td class="colon">:</td><td class="val">${st.homeOwnership || '-'}</td>
      </tr>
      <tr>
        <td class="label">Daya Listrik Rumah</td><td class="colon">:</td><td class="val">${st.electricityPower || '-'}</td>
      </tr>
      <tr>
        <td class="label">Sumber Air Bersih</td><td class="colon">:</td><td class="val">${st.waterSource || '-'}</td>
      </tr>
      <tr>
        <td class="label">Akses Internet di Rumah</td><td class="colon">:</td><td class="val">${st.internetAccess || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kepemilikan Smartphone/HP</td><td class="colon">:</td><td class="val">${st.phoneOwnership || '-'}</td>
      </tr>
      <tr>
        <td class="label">No. HP/WA Calon Santri</td><td class="colon">:</td><td class="val">${st.studentPhone || '-'}</td>
      </tr>
    </table>

    <!-- G. MEDIA SOSIAL -->
    <div class="section-title">G. Akun & Media Sosial</div>
    <table class="data-table">
      <tr>
        <td class="label">Email</td><td class="colon">:</td><td class="val">${st.socialEmail || '-'}</td>
      </tr>
      <tr>
        <td class="label">Facebook</td><td class="colon">:</td><td class="val">${st.socialFacebook || '-'}</td>
      </tr>
      <tr>
        <td class="label">Instagram</td><td class="colon">:</td><td class="val">${st.socialInstagram || '-'}</td>
      </tr>
      <tr>
        <td class="label">Twitter / X</td><td class="colon">:</td><td class="val">${st.socialTwitter || '-'}</td>
      </tr>
      <tr>
        <td class="label">TikTok</td><td class="colon">:</td><td class="val">${st.socialTiktok || '-'}</td>
      </tr>
    </table>

    <!-- H. RIWAYAT KESEHATAN & FISIK -->
    <div class="section-title">H. Riwayat Kesehatan & Kondisi Khusus</div>
    <table class="data-table">
      <tr>
        <td class="label">Tinggi / Berat Badan</td><td class="colon">:</td><td class="val">${st.heightCm ? st.heightCm + ' cm' : '-'} / ${st.weightKg ? st.weightKg + ' kg' : '-'}</td>
      </tr>
      <tr>
        <td class="label">Riwayat Merokok</td><td class="colon">:</td><td class="val">${st.smokingStatus || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Buta Warna</td><td class="colon">:</td><td class="val">${st.colorBlindStatus || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kondisi Mata Kiri</td><td class="colon">:</td><td class="val">${(st.eyeMinusLeft || st.eyeCylLeft) ? `Minus: ${st.eyeMinusLeft || '0'}, Cyl: ${st.eyeCylLeft || '0'}` : 'Normal'}</td>
      </tr>
      <tr>
        <td class="label">Kondisi Mata Kanan</td><td class="colon">:</td><td class="val">${(st.eyeMinusRight || st.eyeCylRight) ? `Minus: ${st.eyeMinusRight || '0'}, Cyl: ${st.eyeCylRight || '0'}` : 'Normal'}</td>
      </tr>
      <tr>
        <td class="label">Riwayat Penyakit Berat</td><td class="colon">:</td><td class="val">${st.diseaseHistory || '-'}</td>
      </tr>
      <tr>
        <td class="label">Riwayat Alergi</td><td class="colon">:</td><td class="val">${st.allergyHistory || '-'}</td>
      </tr>
      <tr>
        <td class="label">Riwayat Operasi</td><td class="colon">:</td><td class="val">${st.surgeryHistory || '-'}</td>
      </tr>
      <tr>
        <td class="label">Kebutuhan Khusus</td><td class="colon">:</td><td class="val">${st.hasSpecialNeeds ? ('Ya' + (st.specialNeedsDescription ? ' (' + st.specialNeedsDescription + ')' : '')) : 'Tidak Ada'}</td>
      </tr>
    </table>

    <!-- I. KONTAK UTAMA -->
    <div class="section-title">I. Kontak Utama / Darurat</div>
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
    </table>

    <!-- J. PRESTASI -->
    <div class="section-title">J. Catatan Prestasi Santri (${achs.length})</div>
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

    <!-- K. DOKUMEN & BERKAS TERLAMPIR -->
    <div class="section-title">K. Dokumen Berkas Terlampir (${docs.length})</div>
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
    const res = await apiRequest('/api/registrations/admin/final-verification-list?perPage=5000');
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
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline-success" onclick="exportFinalVerificationExcel()" style="border: 1px solid #10b981; color: #10b981; background: transparent; padding: 8px 16px; border-radius: var(--radius-md, 8px); font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.1)'" onmouseout="this.style.background='transparent'" title="Export Semua Data Verifikasi Final ke Excel (.xlsx / .csv)">
              <i class="fa-solid fa-file-excel"></i> Export Excel
            </button>
            <button type="button" class="btn btn-secondary" onclick="renderAdminFinalVerificationView()" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
              <i class="fa-solid fa-rotate-right"></i> Refresh Data
            </button>
          </div>
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
      const originSchool = (reg.studentDetail?.previousSchoolName || reg.individualParticipant?.schoolName || '').toLowerCase();
      const prog = (reg.classProgramName || '').toLowerCase();
      return name.includes(search) || num.includes(search) || school.includes(search) || originSchool.includes(search) || prog.includes(search);
    });
  }

  if (status) {
    if (status === 'UNDECIDED') {
      filtered = filtered.filter(reg => !reg.finalStatus || reg.finalStatus === 'UNDECIDED');
    } else {
      filtered = filtered.filter(reg => reg.finalStatus === status);
    }
  }

  window.finalVerificationState.filteredItems = filtered;

  const tbody = document.getElementById('final-verif-table-body');
  if (tbody) {
    tbody.innerHTML = renderFinalTableRows(filtered);
  }
}
window.filterFinalVerificationTable = filterFinalVerificationTable;

async function exportFinalVerificationExcel() {
  // Always ensure fresh full list from server (perPage=5000) so no candidate is omitted
  let allList = window.finalVerificationState.allItems || [];
  if (!allList.length) {
    try {
      const res = await apiRequest('/api/registrations/admin/final-verification-list?perPage=5000');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        allList = res.data;
        window.finalVerificationState.allItems = allList;
      }
    } catch (e) {
      console.warn('Gagal memuat ulang data verifikasi final untuk export:', e);
    }
  }

  // Filter based on active tab mode (Siap Verifikasi Final vs Semua Calon Santri)
  const isShowingCompletedOnly = window.finalVerificationTabMode === 'completed';
  let activeList = isShowingCompletedOnly ? allList.filter(reg => {
    const isDocOk = reg.formStatus === 'VERIFIED';
    const isCbtOk = reg.cbtAttempt && (reg.cbtAttempt.status === 'COMPLETED' || reg.cbtAttempt.status === 'EXPIRED' || reg.cbtAttempt.verificationStatus === 'VERIFIED');
    const isInterviewOk = reg.interview && reg.interview.status === 'COMPLETED';
    return isDocOk && isCbtOk && isInterviewOk;
  }) : allList;

  // Apply active search filter from UI if set
  const searchInput = (document.getElementById('final-search')?.value || '').toLowerCase().trim();
  if (searchInput) {
    activeList = activeList.filter(reg => {
      const name = (reg.studentDetail?.fullName || reg.individualParticipant?.fullName || reg.user?.name || '').toLowerCase();
      const num = (reg.registrationNumber || '').toLowerCase();
      const school = (reg.schoolName || '').toLowerCase();
      const originSchool = (reg.studentDetail?.previousSchoolName || reg.individualParticipant?.schoolName || '').toLowerCase();
      const prog = (reg.classProgramName || '').toLowerCase();
      return name.includes(searchInput) || num.includes(searchInput) || school.includes(searchInput) || originSchool.includes(searchInput) || prog.includes(searchInput);
    });
  }

  // Apply active status filter from UI if set
  const statusFilter = document.getElementById('final-status-filter')?.value || '';
  if (statusFilter) {
    if (statusFilter === 'UNDECIDED') {
      activeList = activeList.filter(reg => !reg.finalStatus || reg.finalStatus === 'UNDECIDED');
    } else {
      activeList = activeList.filter(reg => reg.finalStatus === statusFilter);
    }
  }

  if (!activeList || !activeList.length) {
    alert('Tidak ada data calon santri verifikasi final untuk diekspor.');
    return;
  }

  const cols = [
    { header: 'No.', exportValue: (r, idx) => idx + 1 },
    { header: 'No. Pendaftaran', key: 'registrationNumber' },
    { header: 'Nama Calon Santri', exportValue: r => r.studentDetail?.fullName || r.individualParticipant?.fullName || r.user?.name || '-' },
    { header: 'Jenis Kelamin', exportValue: r => ((r.studentDetail?.gender || r.individualParticipant?.gender || '') === 'P' ? 'Perempuan' : ((r.studentDetail?.gender || r.individualParticipant?.gender || '') === 'L' ? 'Laki-laki' : '-')) },
    { header: 'NISN', exportValue: r => r.studentDetail?.nisn || '-' },
    { header: 'NIK', exportValue: r => r.studentDetail?.nik || '-' },
    { header: 'Asal Sekolah', exportValue: r => r.studentDetail?.previousSchoolName || r.individualParticipant?.schoolName || '-' },
    { header: 'Sekolah Tujuan', exportValue: r => r.schoolName || r.classProgram?.major?.school?.name || '-' },
    { header: 'Jurusan', exportValue: r => r.majorName || r.classProgram?.major?.name || '-' },
    { header: 'Program Kelas', exportValue: r => r.classProgramName || r.classProgram?.name || '-' },
    { header: 'Gelombang', exportValue: r => r.admissionWave?.name || '-' },
    { header: 'Periode TP', exportValue: r => r.academicPeriod?.name || '-' },
    { header: 'Status Berkas', exportValue: r => r.formStatus === 'VERIFIED' ? 'Terverifikasi (OK)' : (r.formStatus || 'DRAFT') },
    { header: 'Status Pembayaran', exportValue: r => r.status === 'APPROVED' ? 'Lunas (Disetujui)' : (r.status || '-') },
    { header: 'Nilai CBT', exportValue: r => (r.cbtAttempt?.totalScore !== undefined && r.cbtAttempt?.totalScore !== null) ? Number(r.cbtAttempt.totalScore).toFixed(1) : '-' },
    { header: 'Status CBT', exportValue: r => r.cbtAttempt?.verificationStatus === 'VERIFIED' ? 'LULUS CBT' : ((r.cbtAttempt?.status === 'COMPLETED' || r.cbtAttempt?.status === 'EXPIRED') ? 'SUDAH CBT' : 'BELUM CBT') },
    { header: 'Status Wawancara', exportValue: r => r.interview?.status === 'COMPLETED' ? 'SELESAI' : 'BELUM SELESAI' },
    { header: 'Rekomendasi Wawancara', exportValue: r => r.interview?.recommendation || '-' },
    { header: 'Ruang Wawancara', exportValue: r => r.interview?.schedule?.roomLocation || '-' },
    { header: 'Catatan Wawancara', exportValue: r => r.interview?.notes || '-' },
    { header: 'Keputusan Final', exportValue: r => r.finalStatus === 'ACCEPTED' ? 'Diterima / Lolos' : (r.finalStatus === 'WAITLISTED' ? 'Cadangan / Pending' : (r.finalStatus === 'REJECTED' ? 'Ditolak / Tidak Lolos' : 'Belum Diputuskan')) },
    { header: 'Catatan Keputusan Final', exportValue: r => r.finalNotes || '-' },
    { header: 'Tanggal Penetapan', exportValue: r => r.finalVerifiedAt ? formatDate(r.finalVerifiedAt) : '-' },
    { header: 'Diverifikasi Oleh', exportValue: r => r.finalVerifiedBy?.name || '-' },
    { header: 'Nama Akun Pendaftar', exportValue: r => r.user?.name || '-' },
    { header: 'Email Akun Pendaftar', exportValue: r => r.user?.email || '-' },
    { header: 'No. WhatsApp / HP', exportValue: r => r.individualParticipant?.whatsappNumber || r.studentDetail?.phone || r.user?.phoneNumber || '-' },
  ];

  const tabSuffix = isShowingCompletedOnly ? 'siap_verifikasi' : 'semua_peserta';
  exportTableDataToExcel(`data_verifikasi_final_${tabSuffix}`, cols, activeList);
}
window.exportFinalVerificationExcel = exportFinalVerificationExcel;

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
window.executeVerifyCandidate = executeVerifyCandidate;
window.submitAdminVerification = executeVerifyCandidate; // Alias for compatibility
window.openRequestRevisionModal = openRequestRevisionModal;
window.executeRequestRevision = executeRequestRevision;
window.submitAdminRevision = executeRequestRevision; // Alias for compatibility
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




