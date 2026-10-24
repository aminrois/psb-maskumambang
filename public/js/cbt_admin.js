/**
 * ============================================================================
 * CBT MODULE — SUPER ADMIN INTERFACE
 * ============================================================================
 * Includes:
 * 1. Dashboard CBT (Stats + Tree of School -> Major -> Program Kelas)
 * 2. Kelola Ujian & Soal (Cascading selectors + Exam Config + Question CRUD)
 * 3. Hasil Ujian & Penilaian Essay (Filterable table + Detailed Grading Modal)
 */

// Global state for CBT Admin
window.cbtAdminState = {
  selectedSchoolId: '',
  selectedMajorId: '',
  selectedProgramId: '',
  currentExam: null,
  cachedStructure: [],
};

// ============================================================================
// 1. DASHBOARD CBT SUPER ADMIN
// ============================================================================

async function renderCbtAdminDashboard() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Dashboard CBT...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/cbt/admin/dashboard');
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data dashboard CBT.');

    const { stats, structure } = res.data;
    window.cbtAdminState.cachedStructure = structure;

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800;">Dashboard CBT</h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">Ringkasan & Monitoring Ujian Online Calon Santri</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="#cbt-manage" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-check"></i> Kelola Ujian & Soal
            </a>
            <a href="#cbt-results" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-square-poll-vertical"></i> Hasil Ujian
            </a>
          </div>
        </div>

        <!-- 4 Stat Metric Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px;">
          
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(34, 197, 94, 0.12); color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              <i class="fa-solid fa-user-check"></i>
            </div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Eligible (Siap Ujian)</div>
              <div style="font-size: 1.65rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${stats.eligibleCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Santri Terverifikasi</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(245, 158, 11, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              <i class="fa-solid fa-clock"></i>
            </div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Belum Ujian</div>
              <div style="font-size: 1.65rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${stats.notStartedCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Belum Mulai</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(14, 165, 233, 0.12); color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Sedang Ujian</div>
              <div style="font-size: 1.65rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${stats.inProgressCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Sedang Mengerjakan</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(139, 92, 246, 0.12); color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Selesai Ujian</div>
              <div style="font-size: 1.65rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${stats.completedCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Telah Submit</div>
            </div>
          </div>

        </div>

        <!-- Status Ujian Per Lembaga -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
          <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-sitemap" style="color: var(--primary-600);"></i>
                Status Ujian Per Lembaga
              </h3>
              <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">1 Lembaga = 1 Set Soal CBT (berlaku untuk semua jurusan di lembaga tersebut)</p>
            </div>
          </div>

          ${structure.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
              Belum ada data Master Lembaga.
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-subtle); color: var(--text-muted); text-align: left; background: var(--bg-body);">
                    <th style="padding: 10px 12px; width: 26%;">Lembaga</th>
                    <th style="padding: 10px 12px; width: 14%;">Jumlah Soal</th>
                    <th style="padding: 10px 12px; width: 14%;">Durasi Ujian</th>
                    <th style="padding: 10px 12px; width: 16%;">Urutan Soal</th>
                    <th style="padding: 10px 12px; width: 12%;">Status</th>
                    <th style="padding: 10px 12px; width: 18%; text-align: right;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${structure.map(school => `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <i class="fa-solid fa-school" style="color: var(--primary-600);"></i>
                          <div>
                            <div style="font-weight: 700; color: var(--text-heading);">${school.name}</div>
                            ${school.initial ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${school.initial}</div>` : ''}
                          </div>
                        </div>
                      </td>
                      <td style="padding: 10px 12px; color: var(--text-main);">
                        ${school.exam ? `<strong>${school.exam.totalQuestions}</strong> Soal` : '<span style="color: var(--text-dim);">-</span>'}
                      </td>
                      <td style="padding: 10px 12px; color: var(--text-main);">
                        ${school.exam ? `<strong>${school.exam.durationMinutes}</strong> Menit` : '<span style="color: var(--text-dim);">-</span>'}
                      </td>
                      <td style="padding: 10px 12px;">
                        ${school.exam 
                          ? (school.exam.randomizeQuestions !== false 
                            ? '<span class="badge" style="background: rgba(14, 165, 233, 0.12); color: #0284c7; font-size: 0.75rem;"><i class="fa-solid fa-shuffle"></i> Acak</span>' 
                            : '<span class="badge" style="background: rgba(168, 85, 247, 0.12); color: #9333ea; font-size: 0.75rem;"><i class="fa-solid fa-arrow-down-1-9"></i> Urut</span>') 
                          : '<span style="color: var(--text-dim);">-</span>'}
                      </td>
                      <td style="padding: 10px 12px;">
                        ${school.exam 
                          ? (school.exam.isActive 
                            ? '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-check"></i> Aktif</span>' 
                            : '<span class="badge badge-secondary" style="font-size: 0.75rem;"><i class="fa-solid fa-pause"></i> Nonaktif</span>') 
                          : '<span class="badge badge-warning" style="font-size: 0.75rem;">Belum dibuat</span>'}
                      </td>
                      <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
                        ${school.exam && school.exam.totalQuestions > 0 ? `
                          <button type="button" class="btn btn-xs btn-outline-primary" onclick="openDuplicateCbtModal('${school.id}')" style="margin-right: 6px; white-space: nowrap;" title="Duplikasi Soal ke Lembaga Lain">
                            <i class="fa-solid fa-copy"></i> Duplikasi
                          </button>
                        ` : ''}
                        <button type="button" class="btn btn-xs btn-primary" onclick="openCbtManageDirectly('${school.id}')" style="white-space: nowrap;">
                          <i class="fa-solid fa-gear"></i> Kelola
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger" style="max-width: 800px; margin: 20px auto;">
        <h4><i class="fa-solid fa-triangle-exclamation"></i> Gagal Memuat Dashboard CBT</h4>
        <p>${err.message}</p>
        <button type="button" class="btn btn-sm btn-secondary" onclick="renderCbtAdminDashboard()" style="margin-top: 10px;">
          <i class="fa-solid fa-rotate"></i> Coba Lagi
        </button>
      </div>
    `;
  }
}

function openCbtManageDirectly(schoolId) {
  window.cbtAdminState.selectedSchoolId = schoolId;
  window.location.hash = `#cbt-manage/${schoolId}`;
}

// ----------------------------------------------------------------------------
// DUPLIKASI SOAL UJIAN PER LEMBAGA
// ----------------------------------------------------------------------------

function openDuplicateCbtModal(sourceSchoolId) {
  const structure = window.cbtAdminState.cachedStructure || [];
  const source = structure.find(s => s.id === sourceSchoolId);
  if (!source || !source.exam || !source.exam.totalQuestions) {
    showToast('Lembaga sumber belum memiliki butir soal untuk diduplikasi.', 'warning');
    return;
  }

  const targets = structure.filter(s => s.id !== sourceSchoolId);
  if (targets.length === 0) {
    showToast('Tidak ada lembaga tujuan lain yang tersedia di sistem.', 'warning');
    return;
  }

  const bodyHtml = `
    <div style="font-size: 0.9rem;">
      <div style="padding: 12px 16px; background: var(--bg-body); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 16px;">
        <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--primary-600); margin-bottom: 2px;">Lembaga Asal (Sumber Soal)</div>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-heading);">
            <i class="fa-solid fa-school" style="margin-right: 6px; color: var(--primary-600);"></i>
            ${escapeHtml(source.name)}
          </div>
          <span class="badge badge-primary" style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px;">
            <i class="fa-solid fa-list-check"></i> ${source.exam.totalQuestions} Butir Soal
          </span>
        </div>
      </div>

      <form id="form-duplicate-cbt" onsubmit="handleDuplicateCbtSubmit(event, '${sourceSchoolId}')">
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
            Pilih Lembaga Tujuan (Penerima Salinan Soal)
          </label>
          <select id="duplicate-target-school-id" class="form-select" onchange="onDuplicateTargetChange(this)" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.9rem;">
            <option value="">-- Pilih Lembaga Tujuan --</option>
            ${targets.map(t => {
              const hasQ = t.exam && t.exam.totalQuestions > 0;
              const hasAttempts = t.exam && t.exam.totalAttempts > 0;
              const statusText = hasAttempts
                ? `(Terkunci: Sudah ada ${t.exam.totalAttempts} Peserta Ujian)`
                : hasQ
                  ? `(Sudah ada ${t.exam.totalQuestions} butir soal)`
                  : '(Belum ada soal)';
              return `<option value="${t.id}" data-has-questions="${hasQ}" data-has-attempts="${hasAttempts}" data-questions="${hasQ ? t.exam.totalQuestions : 0}" ${hasAttempts ? 'disabled style="color: #94a3b8;"' : ''}>
                ${escapeHtml(t.name)} — ${statusText}
              </option>`;
            }).join('')}
          </select>
          <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 4px;">
            Seluruh pertanyaan, kunci jawaban, pilihan ganda, bobot nilai, dan pengaturan ujian akan disalin utuh ke lembaga tujuan.
          </small>
        </div>

        <div id="duplicate-warning-box" style="display: none; padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 0.85rem; line-height: 1.4;">
        </div>

        <div id="duplicate-overwrite-wrap" style="display: none; margin-bottom: 18px; padding: 12px 14px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md);">
          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin: 0;">
            <input type="checkbox" id="duplicate-overwrite-check" style="margin-top: 3px;">
            <span style="font-size: 0.825rem; color: #dc2626; font-weight: 600;">
              Ya, saya mengerti dan setuju untuk menimpa (mengganti) seluruh butir soal lama di lembaga tujuan dengan salinan soal baru ini.
            </span>
          </label>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="submit" id="btn-submit-duplicate" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;">
            <i class="fa-solid fa-copy"></i> Duplikasi Sekarang
          </button>
        </div>
      </form>
    </div>
  `;

  openModal('Duplikasi Soal CBT Antar Lembaga', bodyHtml);
}

function onDuplicateTargetChange(selectEl) {
  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  const hasQuestions = selectedOpt && selectedOpt.getAttribute('data-has-questions') === 'true';
  const hasAttempts = selectedOpt && selectedOpt.getAttribute('data-has-attempts') === 'true';
  const qCount = selectedOpt ? selectedOpt.getAttribute('data-questions') : 0;

  const warnBox = document.getElementById('duplicate-warning-box');
  const overwriteWrap = document.getElementById('duplicate-overwrite-wrap');
  const overwriteCheck = document.getElementById('duplicate-overwrite-check');
  const submitBtn = document.getElementById('btn-submit-duplicate');

  if (overwriteCheck) overwriteCheck.checked = false;

  if (hasAttempts) {
    if (warnBox) {
      warnBox.style.display = 'block';
      warnBox.className = 'alert alert-danger';
      warnBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lembaga target ini sudah memiliki data pengerjaan peserta ujian CBT. Demi menjaga integritas data nilai santri, duplikasi ke lembaga ini tidak diizinkan.';
    }
    if (overwriteWrap) overwriteWrap.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (hasQuestions) {
    if (warnBox) {
      warnBox.style.display = 'block';
      warnBox.className = 'alert alert-warning';
      warnBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Perhatian:</strong> Lembaga target ini sudah memiliki <strong>${qCount} butir soal</strong>. Jika Anda ingin melanjutkan, harap centang kotak konfirmasi di bawah untuk menimpa soal lama.`;
    }
    if (overwriteWrap) overwriteWrap.style.display = 'block';
    if (submitBtn) submitBtn.disabled = false;
  } else {
    if (warnBox) warnBox.style.display = 'none';
    if (overwriteWrap) overwriteWrap.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleDuplicateCbtSubmit(e, sourceSchoolId) {
  e.preventDefault();
  const selectEl = document.getElementById('duplicate-target-school-id');
  const targetSchoolId = selectEl?.value;
  if (!targetSchoolId) {
    showToast('Silakan pilih lembaga tujuan terlebih dahulu.', 'warning');
    return;
  }

  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  const hasQuestions = selectedOpt && selectedOpt.getAttribute('data-has-questions') === 'true';
  const overwriteCheck = document.getElementById('duplicate-overwrite-check');

  if (hasQuestions && (!overwriteCheck || !overwriteCheck.checked)) {
    showToast('Harap centang persetujuan penimpaan soal lama terlebih dahulu.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-submit-duplicate');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menduplikasi Soal...';

  try {
    const res = await apiRequest('/api/cbt/admin/exams/duplicate', {
      method: 'POST',
      body: {
        sourceSchoolId,
        targetSchoolId,
        overwriteExisting: hasQuestions ? true : false,
      },
    });

    if (res.success) {
      showToast(res.message || 'Berhasil menduplikasi soal!', 'success');
      closeModal();
      window.cbtAdminState.cachedStructure = [];
      
      const targetName = res.data?.targetSchoolName || 'Lembaga Target';
      setTimeout(() => {
        if (confirm(`Duplikasi berhasil!\n\nApakah Anda ingin langsung membuka halaman "Kelola Ujian & Soal" untuk ${targetName}?`)) {
          openCbtManageDirectly(targetSchoolId);
        } else {
          renderCbtAdminDashboard();
        }
      }, 250);
    } else {
      showToast(res.message || 'Gagal menduplikasi soal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat menduplikasi soal.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-copy"></i> Duplikasi Sekarang';
    }
  }
}

// ============================================================================
// 2. KELOLA UJIAN & SOAL (CASCADING FILTER + CRUD)
// ============================================================================

async function renderCbtManageView(paramSchoolId) {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Pengaturan Ujian & Soal...</p>
    </div>
  `;

  try {
    // 1. Fetch Structure if not cached
    if (!window.cbtAdminState.cachedStructure || window.cbtAdminState.cachedStructure.length === 0) {
      const dashRes = await apiRequest('/api/cbt/admin/dashboard');
      if (dashRes.success && dashRes.data) {
        window.cbtAdminState.cachedStructure = dashRes.data.structure;
      }
    }

    const structure = window.cbtAdminState.cachedStructure || [];
    if (structure.length === 0) {
      container.innerHTML = '<div class="alert alert-warning">Belum ada struktur master data lembaga/sekolah.</div>';
      return;
    }

    // Auto-select initial school if paramSchoolId is provided
    if (paramSchoolId && structure.some(s => s.id === paramSchoolId)) {
      window.cbtAdminState.selectedSchoolId = paramSchoolId;
    } else if (!window.cbtAdminState.selectedSchoolId || !structure.some(s => s.id === window.cbtAdminState.selectedSchoolId)) {
      window.cbtAdminState.selectedSchoolId = structure[0].id;
    }

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800;">Kelola Ujian & Soal</h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">Konfigurasi ujian, durasi, dan bank soal per Lembaga (1 Soal untuk seluruh jurusan dalam 1 Lembaga)</p>
          </div>
          <div>
            <a href="#cbt-dashboard" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard CBT
            </a>
          </div>
        </div>

        <!-- School Filter Section -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-school" style="color: var(--primary-600);"></i>
            Pilih Lembaga / Unit Sekolah:
          </div>

          <div style="max-width: 400px;">
            <div class="form-group" style="margin: 0;">
              <select id="cbt-filter-school" class="form-select" onchange="onCbtSchoolFilterChange(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-weight: 600;">
                ${structure.map(s => `
                  <option value="${s.id}" ${s.id === window.cbtAdminState.selectedSchoolId ? 'selected' : ''}>${s.name} ${s.initial ? `(${s.initial})` : ''}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Main Configuration Area -->
        <div id="cbt-school-config-slot">
          <!-- Injected by loadCbtSchoolExamDetails() -->
        </div>

      </div>
    `;

    if (window.cbtAdminState.selectedSchoolId) {
      await loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
    } else {
      document.getElementById('cbt-school-config-slot').innerHTML = `
        <div class="alert alert-info">Pilihlah Lembaga untuk mengelola Ujian CBT.</div>
      `;
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function onCbtSchoolFilterChange(schoolId) {
  window.cbtAdminState.selectedSchoolId = schoolId;
  loadCbtSchoolExamDetails(schoolId);
}

// Backward compatibility helper
function onCbtMajorFilterChange() {}
function onCbtProgramFilterChange() {}

async function loadCbtSchoolExamDetails(schoolId) {
  const slot = document.getElementById('cbt-school-config-slot');
  if (!slot) return;

  slot.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat konfigurasi ujian...</div>';

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/by-school/${schoolId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data ujian Lembaga.');

    const { school, exam } = res.data;
    window.cbtAdminState.currentSchool = school;
    window.cbtAdminState.currentExam = exam ? { ...exam, school } : null;

    if (!exam) {
      // Belum dibuat
      slot.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 2px dashed var(--border-subtle); border-radius: var(--radius-xl); padding: 40px 24px; text-align: center;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 16px;">
            <i class="fa-solid fa-laptop-file"></i>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-heading); margin-bottom: 6px;">Ujian CBT Belum Dibuat</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 500px; margin: 0 auto 20px;">
            Lembaga <strong>${school.name}</strong> belum memiliki konfigurasi ujian online. 1 set soal ujian ini akan berlaku untuk semua jurusan di bawah lembaga ini.
          </p>
          <button type="button" class="btn btn-primary" onclick="openCreateExamModal('${school.id}', '${school.name.replace(/'/g, "\\'")}')" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-plus"></i> Buat Ujian CBT Sekarang
          </button>
        </div>
      `;
      return;
    }

    // Exam exists: Render Exam Settings Card & Questions Table
    const questions = exam.questions || [];
    const totalScore = questions.reduce((sum, q) => sum + Number(q.score), 0);

    slot.innerHTML = `
      <!-- Exam Config Banner -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-600); text-transform: uppercase;">Konfigurasi CBT Lembaga</div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-heading); margin: 2px 0;">${exam.title || `Ujian CBT ${school.name}`}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${school.name}</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            ${exam.isActive ? '<span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-circle-check"></i> Ujian Aktif</span>' : '<span class="badge badge-secondary" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-pause"></i> Ujian Nonaktif</span>'}
            ${exam.randomizeQuestions !== false ? '<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-shuffle"></i> Soal Diacak</span>' : '<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #9333ea; font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-arrow-down-1-9"></i> Soal Urut</span>'}
          </div>
        </div>

        <form id="form-exam-settings" onsubmit="handleSaveExamSettings(event, '${exam.id}')" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto; gap: 16px; align-items: flex-end; background: var(--bg-body); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Status Ujian</label>
            <select id="exam-is-active" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="true" ${exam.isActive ? 'selected' : ''}>Aktif (Dapat Dikerjakan)</option>
              <option value="false" ${!exam.isActive ? 'selected' : ''}>Nonaktif (Ditutup)</option>
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Durasi Ujian (Menit)</label>
            <input type="number" id="exam-duration" class="form-control" value="${exam.durationMinutes || 60}" min="5" max="360" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>

          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Urutan Soal</label>
            <select id="exam-randomize" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="true" ${exam.randomizeQuestions !== false ? 'selected' : ''}>Acak (Diacak untuk Setiap Peserta)</option>
              <option value="false" ${exam.randomizeQuestions === false ? 'selected' : ''}>Urut (Sesuai Nomor Urut Soal)</option>
            </select>
          </div>

          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Total Soal</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-heading);">${questions.length} Soal</div>
            </div>
            <div style="padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Total Bobot Nilai</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #16a34a;">${totalScore} Poin</div>
            </div>
          </div>

          <div>
            <button type="submit" id="btn-save-exam" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Pengaturan
            </button>
          </div>

        </form>
      </div>

      <!-- Questions List Card -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-clipboard-question" style="color: var(--primary-600);"></i>
              Daftar Soal Ujian (${questions.length})
            </h3>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Soal berlaku untuk semua peserta di lembaga <strong>${school.name}</strong></p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="downloadQuestionTemplate()" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-excel"></i> Template Excel
            </button>
            <button type="button" class="btn btn-sm btn-secondary" data-exam-id="${exam.id}" onclick="exportQuestionsToExcel(this)" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-export"></i> Export Soal
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="openImportQuestionsModal('${exam.id}')" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-import"></i> Import Soal
            </button>
            <button type="button" class="btn btn-sm btn-primary" onclick="openAddQuestionModal('${exam.id}')" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-plus"></i> Tambah Soal
            </button>
          </div>
        </div>

        ${questions.length === 0 ? `
          <div style="text-align: center; padding: 36px; border: 2px dashed var(--border-subtle); border-radius: var(--radius-lg); color: var(--text-muted);">
            <i class="fa-solid fa-file-circle-question" style="font-size: 2rem; color: var(--primary-500); margin-bottom: 8px;"></i>
            <p style="margin-bottom: 12px; font-weight: 600;">Belum ada soal pada ujian ini.</p>
            <button type="button" class="btn btn-sm btn-primary" onclick="openAddQuestionModal('${exam.id}')">
              <i class="fa-solid fa-plus"></i> Buat Soal Pertama
            </button>
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-heading);">
                  <th style="padding: 10px 12px; width: 6%; text-align: center;">No</th>
                  <th style="padding: 10px 12px; width: 54%;">Pertanyaan</th>
                  <th style="padding: 10px 12px; width: 18%;">Jenis Soal</th>
                  <th style="padding: 10px 12px; width: 10%; text-align: center;">Nilai</th>
                  <th style="padding: 10px 12px; width: 12%; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${questions.map((q, idx) => `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 12px; text-align: center; font-weight: 700; color: var(--text-muted);">${String(idx + 1).padStart(2, '0')}</td>
                    <td style="padding: 12px;">
                      <div class="cbt-question-preview" style="font-weight: 500; color: var(--text-heading); margin-bottom: 4px; line-height: 1.4; max-height: 100px; overflow-y: auto;">${q.question}</div>
                      ${q.type === 'MULTIPLE_CHOICE' ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.75rem; margin-top: 6px;">
                          ${(q.options || []).map((opt, oIdx) => renderAdminOptionBadge(opt, oIdx)).join('')}
                        </div>
                      ` : `
                        <div style="font-size: 0.75rem; color: #6366f1; font-weight: 600; margin-top: 4px;">
                          <i class="fa-solid fa-align-left"></i> Jawaban essay dinilai secara manual oleh Super Admin
                        </div>
                      `}
                    </td>
                    <td style="padding: 12px;">
                      ${q.type === 'MULTIPLE_CHOICE' ? '<span class="badge badge-primary" style="font-size: 0.75rem;">Pilihan Ganda</span>' : '<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: #6366f1; font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 4px;">Essay</span>'}
                    </td>
                    <td style="padding: 12px; text-align: center; font-weight: 700; color: var(--text-heading);">
                      ${Number(q.score)}
                    </td>
                    <td style="padding: 12px; text-align: right; white-space: nowrap;">
                      <button type="button" class="btn btn-xs btn-outline-primary" onclick="openEditQuestionModal('${q.id}')" title="Edit Soal" style="margin-right: 4px;">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button type="button" class="btn btn-xs btn-outline-danger" onclick="handleDeleteQuestion('${q.id}')" title="Hapus Soal">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}

      </div>
    `;

    renderKaTeXInElement(slot);

  } catch (err) {
    slot.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// Backward compatibility
const loadCbtProgramExamDetails = loadCbtSchoolExamDetails;

// ----------------------------------------------------------------------------
// EXAM SETTINGS & QUESTION MODALS
// ----------------------------------------------------------------------------

function openCreateExamModal(schoolId, schoolName) {
  const bodyHtml = `
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">Lembaga: <strong>${schoolName}</strong></p>

    <form onsubmit="handleCreateExamSubmit(event, '${schoolId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Judul Ujian</label>
        <input type="text" id="new-exam-title" class="form-control" value="Ujian CBT — ${schoolName}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Durasi Ujian (Menit)</label>
        <input type="number" id="new-exam-duration" class="form-control" value="60" min="5" max="360" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Urutan Soal</label>
        <select id="new-exam-randomize" class="form-select" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="true" selected>Acak (Diacak untuk Setiap Peserta)</option>
          <option value="false">Urut (Sesuai Nomor Urut Soal)</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Status Awal</label>
        <select id="new-exam-status" class="form-select" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="true">Aktif (Dapat diakses peserta bila eligible)</option>
          <option value="false">Nonaktif (Belum dapat diakses)</option>
        </select>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-submit-create-exam" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Buat Ujian
        </button>
      </div>

    </form>
  `;

  openModal('Buat Ujian CBT Baru', bodyHtml);
}

async function handleCreateExamSubmit(e, schoolId) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-create-exam');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const title = document.getElementById('new-exam-title')?.value.trim();
  const durationMinutes = Number(document.getElementById('new-exam-duration')?.value);
  const isActive = document.getElementById('new-exam-status')?.value === 'true';
  const randomizeQuestions = document.getElementById('new-exam-randomize')?.value === 'true';

  try {
    const res = await apiRequest('/api/cbt/admin/exams', {
      method: 'POST',
      body: { schoolId, title, durationMinutes, isActive, randomizeQuestions },
    });
    if (res.success) {
      showToast('Ujian CBT berhasil dibuat!', 'success');
      closeModal();
      // Invalidate cached structure to update badge
      window.cbtAdminState.cachedStructure = [];
      loadCbtSchoolExamDetails(schoolId);
    } else {
      showToast(res.message || 'Gagal membuat ujian CBT.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Buat Ujian';
  }
}

async function handleSaveExamSettings(e, examId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-exam');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const durationMinutes = Number(document.getElementById('exam-duration')?.value);
  const isActive = document.getElementById('exam-is-active')?.value === 'true';
  const randomizeQuestions = document.getElementById('exam-randomize')?.value === 'true';

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}`, {
      method: 'PATCH',
      body: { durationMinutes, isActive, randomizeQuestions },
    });
    if (res.success) {
      showToast('Pengaturan ujian berhasil disimpan!', 'success');
      window.cbtAdminState.cachedStructure = [];
      loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
    } else {
      showToast(res.message || 'Gagal menyimpan pengaturan.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Pengaturan';
  }
}

// ----------------------------------------------------------------------------
// CBT RICH TEXT & IMAGE UTILITIES
// ----------------------------------------------------------------------------

function sanitizeCbtHtml(html) {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return escapeHtml(html);
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove dangerous tags
  const forbiddenTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'applet', 'base'];
  forbiddenTags.forEach(tag => {
    temp.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Remove inline event handlers and dangerous protocols
  temp.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });

    if (el.tagName === 'IMG') {
      el.loading = 'lazy';
      el.classList.add('cbt-zoomable-img');
      el.title = 'Klik untuk memperbesar gambar';
      el.setAttribute('onclick', 'event.stopPropagation(); if (typeof window.showImageZoomModal === "function") window.showImageZoomModal(this.src);');
    }
  });

  return temp.innerHTML;
}

window.sanitizeCbtHtml = sanitizeCbtHtml;
window.renderCbtRichContent = sanitizeCbtHtml;

function showImageZoomModal(src, title = 'Pratinjau Gambar') {
  if (typeof openModal === 'function') {
    openModal(title, `
      <div style="text-align: center; padding: 10px;">
        <img src="${src}" alt="Gambar Soal / Pilihan" style="max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: var(--radius-md, 8px); box-shadow: var(--shadow-md);">
        <div style="margin-top: 14px; display: flex; justify-content: center; gap: 10px;">
          <a href="${src}" target="_blank" class="btn btn-sm btn-outline-secondary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Gambar Penuh
          </a>
          <button type="button" class="btn btn-sm btn-secondary" onclick="closeModal()">Tutup</button>
        </div>
      </div>
    `, 'modal-lg');
  } else {
    window.open(src, '_blank');
  }
}

window.showImageZoomModal = showImageZoomModal;

function renderKaTeXInElement(container) {
  if (!container || typeof window.katex === 'undefined') return;
  const formulas = container.querySelectorAll('.ql-formula');
  formulas.forEach(el => {
    const tex = el.getAttribute('data-value');
    if (tex && !el.getAttribute('data-rendered')) {
      try {
        window.katex.render(tex, el, { throwOnError: false, displayMode: false });
        el.setAttribute('data-rendered', 'true');
      } catch (err) {
        console.warn('KaTeX render error:', err);
      }
    }
  });
}

window.renderKaTeXInElement = renderKaTeXInElement;

function renderAdminOptionBadge(opt, oIdx) {
  const letter = String.fromCharCode(65 + oIdx);
  const isCorrect = !!opt.isCorrect;
  const content = opt.content || '';

  // Extract clean text and image preview
  const temp = document.createElement('div');
  temp.innerHTML = content;
  const imgEl = temp.querySelector('img');
  const text = temp.textContent?.trim() || '';

  let inner = '';
  if (text) {
    inner += escapeHtml(text.length > 25 ? text.substring(0, 25) + '...' : text);
  }
  if (imgEl && imgEl.src) {
    inner += `${text ? ' ' : ''}<img src="${imgEl.src}" style="height: 20px; max-width: 32px; object-fit: cover; border-radius: 2px; vertical-align: middle; border: 1px solid var(--border-subtle); display: inline-block;">`;
  }
  if (!text && !imgEl) {
    inner = escapeHtml(content);
  }

  const bg = isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-body)';
  const color = isCorrect ? '#15803d' : 'var(--text-muted)';
  const border = isCorrect ? '#22c55e' : 'var(--border-subtle)';
  const weight = isCorrect ? '700' : '500';

  return `
    <span style="padding: 2px 8px; border-radius: 4px; background: ${bg}; color: ${color}; border: 1px solid ${border}; font-weight: ${weight}; display: inline-flex; align-items: center; gap: 4px;">
      ${letter}. ${inner} ${isCorrect ? '✓' : ''}
    </span>
  `;
}

async function uploadCbtImage(file) {
  if (!file) throw new Error('File tidak ditemukan.');
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Format file tidak didukung. Harap upload gambar berformat PNG, JPG, WEBP, atau GIF.');
  }

  let fileToUpload = file;
  if (typeof compressImageFile === 'function') {
    try {
      fileToUpload = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
    } catch (e) {
      console.warn('Compress image error:', e);
    }
  }

  const formData = new FormData();
  formData.append('image', fileToUpload);

  const res = await apiRequest('/api/cbt/admin/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.success || !res.data?.url) {
    throw new Error(res.message || 'Gagal mengunggah gambar.');
  }

  return res.data.url;
}

function selectAndUploadImageForQuill(quill, successMessage = 'Gambar berhasil disisipkan!') {
  if (!quill) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg, image/webp, image/gif';
  input.style.display = 'none';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    showToast('Mengunggah gambar...', 'info');
    try {
      const url = await uploadCbtImage(file);
      const range = quill.getSelection(true) || { index: quill.getLength() };
      quill.insertEmbed(range.index, 'image', url);
      quill.setSelection(range.index + 1);
      showToast(successMessage, 'success');
    } catch (err) {
      showToast(err.message || 'Gagal mengunggah gambar.', 'danger');
    } finally {
      input.remove();
    }
  };

  document.body.appendChild(input);
  input.click();
}

// ----------------------------------------------------------------------------
// ADD & EDIT QUESTION
// ----------------------------------------------------------------------------

// Initialize Quill for CBT Question Form
function initQuestionQuill(initialHtml = '') {
  window._questionQuill = null;
  setTimeout(() => {
    const editorContainer = document.getElementById('q-text-editor');
    if (!editorContainer || typeof Quill === 'undefined') return;

    const toolbarOptions = [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'formula'],
      ['clean']
    ];

    window._questionQuill = new Quill('#q-text-editor', {
      theme: 'snow',
      placeholder: 'Tuliskan butir soal, teks bacaan, upload gambar, atau rumus matematika di sini...',
      modules: {
        toolbar: toolbarOptions
      }
    });

    // Custom Image Handler for Question Toolbar
    const toolbar = window._questionQuill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('image', () => {
        selectAndUploadImageForQuill(window._questionQuill, 'Gambar butir soal berhasil disisipkan!');
      });
    }

    // Paste handler for images
    window._questionQuill.root.addEventListener('paste', async (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (!items) return;
      for (let k = 0; k < items.length; k++) {
        if (items[k].type.indexOf('image') !== -1) {
          const file = items[k].getAsFile();
          if (file) {
            e.preventDefault();
            showToast('Mengunggah gambar butir soal...', 'info');
            try {
              const url = await uploadCbtImage(file);
              const range = window._questionQuill.getSelection(true) || { index: window._questionQuill.getLength() };
              window._questionQuill.insertEmbed(range.index, 'image', url);
              window._questionQuill.setSelection(range.index + 1);
              showToast('Gambar butir soal berhasil disisipkan!', 'success');
            } catch (err) {
              showToast(err.message || 'Gagal mengunggah gambar.', 'danger');
            }
            break;
          }
        }
      }
    });

    if (initialHtml) {
      window._questionQuill.root.innerHTML = initialHtml;
    }
  }, 120);
}

function triggerQuestionImageUpload() {
  if (window._questionQuill) {
    selectAndUploadImageForQuill(window._questionQuill, 'Gambar butir soal berhasil disisipkan!');
  }
}

// Helper to detect current school name from state
function getCurrentSchoolName() {
  if (window.cbtAdminState?.currentSchool?.name) {
    return window.cbtAdminState.currentSchool.name;
  }
  if (window.cbtAdminState?.currentExam?.school?.name) {
    return window.cbtAdminState.currentExam.school.name;
  }
  if (window.cbtAdminState?.cachedStructure && window.cbtAdminState?.selectedSchoolId) {
    const found = window.cbtAdminState.cachedStructure.find(s => s.id === window.cbtAdminState.selectedSchoolId);
    if (found) return found.name || found.initial || '';
  }
  return '';
}

// Auto-detect default option count based on school level:
// SMA / SMK / MA / ALIYAH -> 5 opsi (A - E)
// SD / MI / SMP / MTS -> 4 opsi (A - D)
function detectSchoolDefaultOptionCount(schoolName = '') {
  const s = (schoolName || getCurrentSchoolName() || '').toUpperCase();
  const isHighSchool = /\b(SMA|SMK|MA|ALIYAH|KEJURUAN|SLTA|SENIOR)\b/i.test(s) || s.includes('SMA') || s.includes('SMK');
  return isHighSchool ? 5 : 4;
}

// Switch between 4 options (A-D) and 5 options (A-E) in the modal
function setQuestionOptionCount(count, silent = false) {
  const targetCount = Number(count) === 5 ? 5 : 4;
  window._currentModalOptionCount = targetCount;

  // Toggle switcher buttons
  const btn4 = document.getElementById('btn-opt-count-4');
  const btn5 = document.getElementById('btn-opt-count-5');
  if (btn4 && btn5) {
    if (targetCount === 4) {
      btn4.className = 'btn btn-xs btn-primary';
      btn5.className = 'btn btn-xs btn-outline-secondary';
    } else {
      btn4.className = 'btn btn-xs btn-outline-secondary';
      btn5.className = 'btn btn-xs btn-primary';
    }
  }

  // Card Option E (index 4) and quick add button container
  const cardE = document.getElementById('cbt-opt-card-4');
  const quickAddE = document.getElementById('quick-add-e-container');

  if (targetCount === 4) {
    if (cardE) cardE.style.display = 'none';
    if (quickAddE) quickAddE.style.display = 'block';

    // If Option E was marked as correct key, redirect to Option A (index 0)
    const radioE = document.getElementById('radio-opt-4');
    if (radioE && radioE.checked) {
      const radioA = document.getElementById('radio-opt-0');
      if (radioA) radioA.checked = true;
      updateCorrectOptionBadge();
      if (!silent) {
        showToast('Kunci jawaban dialihkan ke Pilihan A karena Opsi E dinonaktifkan.', 'info');
      }
    }
  } else {
    if (cardE) cardE.style.display = 'block';
    if (quickAddE) quickAddE.style.display = 'none';

    // Refresh Quill editor 4 in case layout changed
    if (window._optionQuills && window._optionQuills[4]) {
      try {
        window._optionQuills[4].update();
      } catch (err) {}
    }
  }
}

// Initialize Quill for Multiple Choice Option Editors
function initOptionQuills(optionsData = [], initialCount = 4) {
  window._optionQuills = [];
  const letters = ['A', 'B', 'C', 'D', 'E'];

  setTimeout(() => {
    for (let idx = 0; idx < 5; idx++) {
      const container = document.getElementById(`opt-editor-${idx}`);
      if (!container || typeof Quill === 'undefined') continue;

      const optToolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        ['formula', 'image'],
        ['clean']
      ];

      const quill = new Quill(`#opt-editor-${idx}`, {
        theme: 'snow',
        placeholder: `Tuliskan pilihan jawaban ${letters[idx]} (teks, rumus, atau upload gambar)...`,
        modules: {
          toolbar: optToolbarOptions
        }
      });

      // Override image handler
      const toolbar = quill.getModule('toolbar');
      if (toolbar) {
        toolbar.addHandler('image', () => {
          triggerOptionImageUpload(idx);
        });
      }

      // Paste listener for images in option editor
      quill.root.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;
        for (let k = 0; k < items.length; k++) {
          if (items[k].type.indexOf('image') !== -1) {
            const file = items[k].getAsFile();
            if (file) {
              e.preventDefault();
              showToast(`Mengunggah gambar untuk Pilihan ${letters[idx]}...`, 'info');
              try {
                const url = await uploadCbtImage(file);
                const range = quill.getSelection(true) || { index: quill.getLength() };
                quill.insertEmbed(range.index, 'image', url);
                quill.setSelection(range.index + 1);
                showToast(`Gambar berhasil disisipkan pada Pilihan ${letters[idx]}!`, 'success');
              } catch (err) {
                showToast(err.message || 'Gagal mengunggah gambar.', 'danger');
              }
              break;
            }
          }
        }
      });

      // Pre-populate content if present
      const opt = optionsData && optionsData[idx];
      if (opt && opt.content) {
        quill.root.innerHTML = opt.content;
      }

      window._optionQuills[idx] = quill;
    }

    setQuestionOptionCount(initialCount, true);
  }, 140);
}

function triggerOptionImageUpload(idx) {
  const quill = window._optionQuills && window._optionQuills[idx];
  if (!quill) return;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  selectAndUploadImageForQuill(quill, `Gambar berhasil disisipkan pada Pilihan ${letters[idx]}!`);
}

function clearOptionContent(idx) {
  const quill = window._optionQuills && window._optionQuills[idx];
  if (quill) {
    quill.setText('');
    showToast(`Pilihan ${String.fromCharCode(65 + idx)} dikosongkan.`, 'info');
  }
}

function updateCorrectOptionBadge() {
  const selected = document.querySelector('input[name="mc-correct-key"]:checked');
  const checkedVal = selected ? Number(selected.value) : 0;
  for (let i = 0; i < 5; i++) {
    const badge = document.getElementById(`opt-badge-${i}`);
    const card = document.getElementById(`cbt-opt-card-${i}`);
    if (badge) {
      badge.style.display = (i === checkedVal) ? 'inline-block' : 'none';
    }
    if (card) {
      if (i === checkedVal) {
        card.style.borderColor = 'var(--primary-600)';
        card.style.background = 'rgba(14, 165, 233, 0.04)';
      } else {
        card.style.borderColor = 'var(--border-subtle)';
        card.style.background = 'var(--bg-card)';
      }
    }
  }
}

function openAddQuestionModal(examId) {
  const schoolName = getCurrentSchoolName();
  const defaultCount = detectSchoolDefaultOptionCount(schoolName);
  window._currentModalOptionCount = defaultCount;

  const schoolBadgeText = defaultCount === 5 
    ? 'Jenjang SMA/MA/SMK (Rekomendasi 5 Opsi: A - E)' 
    : 'Jenjang SD/MI/SMP/MTs (Rekomendasi 4 Opsi: A - D)';

  const bodyHtml = `
    <form onsubmit="handleSaveQuestionSubmit(event, '${examId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">Jenis Soal</label>
        <select id="q-type" class="form-select" onchange="toggleQuestionTypeFields(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="MULTIPLE_CHOICE" selected>Pilihan Ganda</option>
          <option value="ESSAY">Essay</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
          <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin: 0;">
            Pertanyaan & Butir Soal (Rich Text)
          </label>
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="triggerQuestionImageUpload()" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);">
            <i class="fa-solid fa-image"></i> Sisipkan Gambar ke Soal
          </button>
        </div>
        <div id="q-text-editor"></div>
        <input type="hidden" id="q-text">
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
          Gunakan toolbar di atas untuk format teks, tata letak, upload gambar, atau rumus matematika (&Sigma;, &radic;).
        </small>
      </div>

      <!-- Multiple Choice Options Box -->
      <div id="box-mc-options" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
          <div>
            <label style="font-weight: 800; font-size: 0.95rem; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--text-heading);">
              <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i>
              Pilihan Jawaban — Rich Text & Gambar
            </label>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 2px;">
              ${schoolName ? `Lembaga: <strong>${escapeHtml(schoolName)}</strong> &bull; <span style="color: var(--primary-600); font-weight: 600;">${schoolBadgeText}</span>` : 'Tiap opsi dapat berupa teks, rumus matematika, atau upload gambar.'}
            </span>
          </div>

          <!-- Switcher 4 Opsi vs 5 Opsi -->
          <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-card); padding: 4px 6px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); padding: 0 4px;">Jumlah Opsi:</span>
            <button type="button" id="btn-opt-count-4" onclick="setQuestionOptionCount(4)" class="btn btn-xs ${defaultCount === 4 ? 'btn-primary' : 'btn-outline-secondary'}" style="font-weight: 700; border-radius: var(--radius-sm); font-size: 0.75rem;" title="Pilihan A, B, C, D (Standar SD/MI/SMP/MTs)">
              4 Opsi (A - D) ${defaultCount === 4 ? '★' : ''}
            </button>
            <button type="button" id="btn-opt-count-5" onclick="setQuestionOptionCount(5)" class="btn btn-xs ${defaultCount === 5 ? 'btn-primary' : 'btn-outline-secondary'}" style="font-weight: 700; border-radius: var(--radius-sm); font-size: 0.75rem;" title="Pilihan A, B, C, D, E (Standar SMA/MA/SMK)">
              5 Opsi (A - E) ${defaultCount === 5 ? '★' : ''}
            </button>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${['A', 'B', 'C', 'D', 'E'].map((letter, idx) => `
            ${idx === 4 ? `
              <div id="quick-add-e-container" style="display: ${defaultCount === 4 ? 'block' : 'none'}; text-align: center; margin: 4px 0;">
                <button type="button" id="btn-quick-add-e" class="btn btn-xs btn-outline-primary" onclick="setQuestionOptionCount(5)" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-style: dashed; border-width: 1.5px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.8rem;">
                  <i class="fa-solid fa-plus-circle"></i> Tambah Pilihan E (Opsional untuk SMA/MA/SMK)
                </button>
              </div>
            ` : ''}
            <div class="cbt-option-edit-card" id="cbt-opt-card-${idx}" style="background: ${idx === 0 ? 'rgba(14, 165, 233, 0.04)' : 'var(--bg-card)'}; border: 1px solid ${idx === 0 ? 'var(--primary-600)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 10px 14px; transition: all 0.2s; ${idx === 4 && defaultCount === 4 ? 'display: none;' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="radio" name="mc-correct-key" value="${idx}" id="radio-opt-${idx}" ${idx === 0 ? 'checked' : ''} onchange="updateCorrectOptionBadge()" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary-600);">
                  <label for="radio-opt-${idx}" style="font-weight: 800; font-size: 0.9rem; color: var(--text-heading); cursor: pointer; margin: 0; display: flex; align-items: center; gap: 6px;">
                    <span>Pilihan ${letter}</span>
                    <span class="badge-correct-indicator" id="opt-badge-${idx}" style="display: ${idx === 0 ? 'inline-block' : 'none'}; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: #16a34a; font-weight: 700; border: 1px solid #22c55e;">
                      <i class="fa-solid fa-check"></i> Kunci Benar
                    </span>
                  </label>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${idx === 4 ? `
                    <button type="button" class="btn btn-xs btn-outline-secondary" onclick="setQuestionOptionCount(4)" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; padding: 3px 8px; border-radius: var(--radius-sm);" title="Sembunyikan Opsi E (kembali ke 4 Opsi)">
                      <i class="fa-solid fa-eye-slash"></i> Sembunyikan Opsi E
                    </button>
                  ` : ''}
                  <button type="button" class="btn btn-xs btn-outline-secondary" onclick="triggerOptionImageUpload(${idx})" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);" title="Upload gambar untuk Pilihan ${letter}">
                    <i class="fa-solid fa-image"></i> Sisipkan Gambar
                  </button>
                  <button type="button" class="btn btn-xs btn-outline-danger" onclick="clearOptionContent(${idx})" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);" title="Kosongkan Pilihan ${letter}">
                    <i class="fa-solid fa-eraser"></i> Kosongkan
                  </button>
                </div>
              </div>

              <div id="opt-editor-${idx}" class="cbt-opt-quill-editor"></div>
              <small style="color: var(--text-dim); font-size: 0.7rem; margin-top: 4px; display: block;">
                ${idx === 4 ? '* Pilihan E opsional (hanya diaktifkan jika menggunakan format 5 opsi A-E)' : `* Pilihan ${letter} wajib diisi (teks, rumus, atau gambar)`}
              </small>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Score Weight Box -->
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" id="lbl-score" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">Nilai / Bobot Soal</label>
        <input type="number" id="q-score" class="form-control" value="5" min="1" max="100" step="1" required style="width: 140px; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-save-question" class="btn btn-primary">
          <i class="fa-solid fa-floppy-disk"></i> Simpan Soal
        </button>
      </div>

    </form>
  `;

  openModal('Tambah Soal Baru', bodyHtml, 'modal-xl');
  initQuestionQuill('');
  initOptionQuills([], defaultCount);
}

function toggleQuestionTypeFields(type) {
  const mcBox = document.getElementById('box-mc-options');
  const scoreLbl = document.getElementById('lbl-score');
  if (type === 'ESSAY') {
    if (mcBox) mcBox.style.display = 'none';
    if (scoreLbl) scoreLbl.innerText = 'Nilai Maksimal Soal Essay';
  } else {
    if (mcBox) mcBox.style.display = 'block';
    if (scoreLbl) scoreLbl.innerText = 'Nilai / Bobot Soal Pilihan Ganda';
    if (!window._optionQuills || window._optionQuills.length === 0) {
      initOptionQuills([], window._currentModalOptionCount || 4);
    }
  }
}

async function handleSaveQuestionSubmit(e, examId, editQuestionId = null) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-question');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const type = document.getElementById('q-type')?.value;
  let question = '';
  if (window._questionQuill) {
    const html = window._questionQuill.root.innerHTML;
    const plain = window._questionQuill.getText().trim();
    if (plain.length === 0 && !html.includes('<img') && !html.includes('ql-formula')) {
      question = '';
    } else {
      question = html;
    }
  } else {
    question = (document.getElementById('q-text')?.value || '').trim();
  }

  if (!question || question === '<p><br></p>') {
    showToast('Pertanyaan soal wajib diisi.', 'warning');
    btn.disabled = false;
    btn.innerHTML = editQuestionId ? '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan' : '<i class="fa-solid fa-floppy-disk"></i> Simpan Soal';
    return;
  }

  const score = Number(document.getElementById('q-score')?.value);

  // Saat edit (PATCH), jangan kirim 'type' karena UpdateCbtQuestionDto tidak memiliki field tersebut
  // Backend akan reject dengan "property type should not exist" jika dikirim
  const payload = editQuestionId
    ? { question, score }
    : { type, question, score };

  if (type === 'MULTIPLE_CHOICE') {
    const selectedRadio = document.querySelector('input[name="mc-correct-key"]:checked');
    const correctIdx = selectedRadio ? Number(selectedRadio.value) : 0;
    const optionLimit = (window._currentModalOptionCount === 4) ? 4 : 5;

    const options = [];
    for (let i = 0; i < optionLimit; i++) {
      let content = '';
      if (window._optionQuills && window._optionQuills[i]) {
        const q = window._optionQuills[i];
        const plain = q.getText().trim();
        const html = q.root.innerHTML.trim();
        if (plain.length > 0 || html.includes('<img') || html.includes('ql-formula')) {
          content = html;
        }
      } else {
        const val = document.getElementById(`opt-input-${i}`)?.value?.trim();
        if (val) content = val;
      }

      if (content && content !== '<p><br></p>') {
        options.push({
          content: content,
          isCorrect: (i === correctIdx),
          orderNumber: i + 1,
        });
      }
    }

    if (optionLimit === 4 && options.length < 4) {
      showToast('Soal Pilihan Ganda (4 Opsi) harus mengisi semua pilihan jawaban A, B, C, dan D.', 'danger');
      btn.disabled = false;
      btn.innerHTML = editQuestionId ? '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan' : '<i class="fa-solid fa-floppy-disk"></i> Simpan Soal';
      return;
    }

    if (optionLimit === 5 && options.length < 4) {
      showToast('Soal Pilihan Ganda harus memiliki minimal 4 pilihan jawaban (A, B, C, D).', 'danger');
      btn.disabled = false;
      btn.innerHTML = editQuestionId ? '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan' : '<i class="fa-solid fa-floppy-disk"></i> Simpan Soal';
      return;
    }

    const hasCorrect = options.some(o => o.isCorrect);
    if (!hasCorrect) {
      showToast('Pilihan jawaban yang dipilih sebagai kunci benar belum diisi.', 'danger');
      btn.disabled = false;
      btn.innerHTML = editQuestionId ? '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan' : '<i class="fa-solid fa-floppy-disk"></i> Simpan Soal';
      return;
    }

    payload.options = options;
  }

  try {
    const url = editQuestionId
      ? `/api/cbt/admin/questions/${editQuestionId}`
      : `/api/cbt/admin/exams/${examId}/questions`;
    const method = editQuestionId ? 'PATCH' : 'POST';

    const res = await apiRequest(url, { method, body: payload });
    if (res.success) {
      showToast(editQuestionId ? 'Soal berhasil diperbarui!' : 'Soal berhasil ditambahkan!', 'success');
      closeModal();
      loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
    } else {
      showToast(res.message || 'Gagal menyimpan soal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editQuestionId ? '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan' : '<i class="fa-solid fa-floppy-disk"></i> Simpan Soal';
  }
}

function openEditQuestionModal(questionId) {
  const exam = window.cbtAdminState.currentExam;
  if (!exam) return;

  const q = (exam.questions || []).find(item => item.id === questionId);
  if (!q) return;

  const schoolName = getCurrentSchoolName();
  const schoolDefaultCount = detectSchoolDefaultOptionCount(schoolName);

  let activeCount = schoolDefaultCount;
  if (q.type === 'MULTIPLE_CHOICE') {
    const opts = q.options || [];
    const hasFifthOption = opts.length >= 5 && opts[4]?.content && opts[4].content.trim() !== '' && opts[4].content !== '<p><br></p>';
    if (hasFifthOption) {
      activeCount = 5;
    } else if (opts.length === 4) {
      activeCount = 4;
    }
  }
  window._currentModalOptionCount = activeCount;

  const schoolBadgeText = schoolDefaultCount === 5 
    ? 'Jenjang SMA/MA/SMK (Rekomendasi 5 Opsi: A - E)' 
    : 'Jenjang SD/MI/SMP/MTs (Rekomendasi 4 Opsi: A - D)';

  const bodyHtml = `
    <form onsubmit="handleSaveQuestionSubmit(event, '${exam.id}', '${questionId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">Jenis Soal</label>
        <input type="text" class="form-control" value="${q.type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Essay'}" disabled style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--bg-body); color: var(--text-dim); border-radius: var(--radius-md);">
        <input type="hidden" id="q-type" value="${q.type}">
      </div>

      <div class="form-group" style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
          <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin: 0;">
            Pertanyaan & Butir Soal (Rich Text)
          </label>
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="triggerQuestionImageUpload()" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);">
            <i class="fa-solid fa-image"></i> Sisipkan Gambar ke Soal
          </button>
        </div>
        <div id="q-text-editor"></div>
        <input type="hidden" id="q-text">
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
          Gunakan toolbar di atas untuk format teks, tata letak, upload gambar, atau rumus matematika (&Sigma;, &radic;).
        </small>
      </div>

      <!-- Multiple Choice Options Box -->
      ${q.type === 'MULTIPLE_CHOICE' ? `
        <div id="box-mc-options" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <label style="font-weight: 800; font-size: 0.95rem; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--text-heading);">
                <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i>
                Pilihan Jawaban — Rich Text & Gambar
              </label>
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 2px;">
                ${schoolName ? `Lembaga: <strong>${escapeHtml(schoolName)}</strong> &bull; <span style="color: var(--primary-600); font-weight: 600;">${schoolBadgeText}</span>` : 'Tiap opsi dapat berupa teks, rumus matematika, atau upload gambar.'}
              </span>
            </div>

            <!-- Switcher 4 Opsi vs 5 Opsi -->
            <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-card); padding: 4px 6px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); padding: 0 4px;">Jumlah Opsi:</span>
              <button type="button" id="btn-opt-count-4" onclick="setQuestionOptionCount(4)" class="btn btn-xs ${activeCount === 4 ? 'btn-primary' : 'btn-outline-secondary'}" style="font-weight: 700; border-radius: var(--radius-sm); font-size: 0.75rem;" title="Pilihan A, B, C, D (Standar SD/MI/SMP/MTs)">
                4 Opsi (A - D) ${schoolDefaultCount === 4 ? '★' : ''}
              </button>
              <button type="button" id="btn-opt-count-5" onclick="setQuestionOptionCount(5)" class="btn btn-xs ${activeCount === 5 ? 'btn-primary' : 'btn-outline-secondary'}" style="font-weight: 700; border-radius: var(--radius-sm); font-size: 0.75rem;" title="Pilihan A, B, C, D, E (Standar SMA/MA/SMK)">
                5 Opsi (A - E) ${schoolDefaultCount === 5 ? '★' : ''}
              </button>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${['A', 'B', 'C', 'D', 'E'].map((letter, idx) => {
              const opt = q.options && q.options[idx] ? q.options[idx] : null;
              const isChecked = opt ? opt.isCorrect : (idx === 0);
              return `
                ${idx === 4 ? `
                  <div id="quick-add-e-container" style="display: ${activeCount === 4 ? 'block' : 'none'}; text-align: center; margin: 4px 0;">
                    <button type="button" id="btn-quick-add-e" class="btn btn-xs btn-outline-primary" onclick="setQuestionOptionCount(5)" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-style: dashed; border-width: 1.5px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.8rem;">
                      <i class="fa-solid fa-plus-circle"></i> Tambah Pilihan E (Opsional untuk SMA/MA/SMK)
                    </button>
                  </div>
                ` : ''}
                <div class="cbt-option-edit-card" id="cbt-opt-card-${idx}" style="background: ${isChecked ? 'rgba(14, 165, 233, 0.04)' : 'var(--bg-card)'}; border: 1px solid ${isChecked ? 'var(--primary-600)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 10px 14px; transition: all 0.2s; ${idx === 4 && activeCount === 4 ? 'display: none;' : ''}">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <input type="radio" name="mc-correct-key" value="${idx}" id="radio-opt-${idx}" ${isChecked ? 'checked' : ''} onchange="updateCorrectOptionBadge()" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary-600);">
                      <label for="radio-opt-${idx}" style="font-weight: 800; font-size: 0.9rem; color: var(--text-heading); cursor: pointer; margin: 0; display: flex; align-items: center; gap: 6px;">
                        <span>Pilihan ${letter}</span>
                        <span class="badge-correct-indicator" id="opt-badge-${idx}" style="display: ${isChecked ? 'inline-block' : 'none'}; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: #16a34a; font-weight: 700; border: 1px solid #22c55e;">
                          <i class="fa-solid fa-check"></i> Kunci Benar
                        </span>
                      </label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${idx === 4 ? `
                        <button type="button" class="btn btn-xs btn-outline-secondary" onclick="setQuestionOptionCount(4)" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; padding: 3px 8px; border-radius: var(--radius-sm);" title="Sembunyikan Opsi E (kembali ke 4 Opsi)">
                          <i class="fa-solid fa-eye-slash"></i> Sembunyikan Opsi E
                        </button>
                      ` : ''}
                      <button type="button" class="btn btn-xs btn-outline-secondary" onclick="triggerOptionImageUpload(${idx})" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);" title="Upload gambar untuk Pilihan ${letter}">
                        <i class="fa-solid fa-image"></i> Sisipkan Gambar
                      </button>
                      <button type="button" class="btn btn-xs btn-outline-danger" onclick="clearOptionContent(${idx})" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 4px 8px; border-radius: var(--radius-sm);" title="Kosongkan Pilihan ${letter}">
                        <i class="fa-solid fa-eraser"></i> Kosongkan
                      </button>
                    </div>
                  </div>

                  <div id="opt-editor-${idx}" class="cbt-opt-quill-editor"></div>
                  <small style="color: var(--text-dim); font-size: 0.7rem; margin-top: 4px; display: block;">
                    ${idx === 4 ? '* Pilihan E opsional (hanya diaktifkan jika menggunakan format 5 opsi A-E)' : `* Pilihan ${letter} wajib diisi (teks, rumus, atau gambar)`}
                  </small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Score Weight Box -->
      <div class="form-group" style="margin-bottom: 20px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">${q.type === 'MULTIPLE_CHOICE' ? 'Nilai / Bobot Soal' : 'Nilai Maksimal Essay'}</label>
        <input type="number" id="q-score" class="form-control" value="${Number(q.score)}" min="1" max="100" step="1" required style="width: 140px; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-save-question" class="btn btn-primary">
          <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan
        </button>
      </div>

    </form>
  `;

  openModal('Edit Soal', bodyHtml, 'modal-xl');
  initQuestionQuill(q.question);
  if (q.type === 'MULTIPLE_CHOICE') {
    initOptionQuills(q.options || [], activeCount);
  }
}

async function handleDeleteQuestion(questionId) {
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Hapus Soal CBT',
        message: 'Apakah Anda yakin ingin menghapus butir soal ujian ini?',
        confirmText: 'Ya, Hapus Soal',
        cancelText: 'Batal',
        type: 'danger'
      })
    : confirm('Apakah Anda yakin ingin menghapus soal ini?');
  if (!ok) return;

  try {
    const res = await apiRequest(`/api/cbt/admin/questions/${questionId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Soal berhasil dihapus.', 'success');
      loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
    } else {
      showToast(res.message || 'Gagal menghapus soal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  }
}

// ============================================================================
// 3. HASIL UJIAN & PENILAIAN ESSAY
// ============================================================================

async function renderCbtResultsView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Hasil Ujian CBT...</p>
    </div>
  `;

  try {
    // 1. Fetch Structure if not cached
    if (!window.cbtAdminState.cachedStructure || window.cbtAdminState.cachedStructure.length === 0) {
      const dashRes = await apiRequest('/api/cbt/admin/dashboard');
      if (dashRes.success && dashRes.data) {
        window.cbtAdminState.cachedStructure = dashRes.data.structure;
      }
    }

    const structure = window.cbtAdminState.cachedStructure || [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800;">Hasil Ujian CBT</h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">Daftar nilai, rekap skor pilihan ganda, dan penilaian essay</p>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" onclick="loadCbtResultsTable()" style="display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-rotate"></i> Refresh Data
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 18px 22px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) 1.5fr; gap: 12px; align-items: flex-end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Sekolah</label>
              <select id="res-filter-school" class="form-select" onchange="loadCbtResultsTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Sekolah</option>
                ${structure.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Ujian</label>
              <select id="res-filter-attempt-status" class="form-select" onchange="loadCbtResultsTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Status</option>
                <option value="NOT_STARTED">Belum Mulai</option>
                <option value="IN_PROGRESS">Sedang Ujian</option>
                <option value="COMPLETED">Selesai</option>
                <option value="EXPIRED">Waktu Habis</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Penilaian</label>
              <select id="res-filter-grading-status" class="form-select" onchange="loadCbtResultsTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua</option>
                <option value="NEEDS_ESSAY_GRADING">Perlu Penilaian Essay</option>
                <option value="GRADED">Sudah Dinilai</option>
                <option value="UNGRADED">Belum Dinilai</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Cari Santri / No. Pendaftaran</label>
              <div style="position: relative;">
                <input type="text" id="res-filter-search" class="form-control" placeholder="Ketik nama atau no. daftar..." onkeyup="if(event.key==='Enter') loadCbtResultsTable()" style="width: 100%; padding: 8px 34px 8px 12px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer;" onclick="loadCbtResultsTable()"></i>
              </div>
            </div>

          </div>
        </div>

        <!-- Results Table Slot -->
        <div id="cbt-results-table-slot">
          <!-- Injected by loadCbtResultsTable() -->
        </div>

      </div>
    `;

    loadCbtResultsTable();

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function loadCbtResultsTable() {
  const slot = document.getElementById('cbt-results-table-slot');
  if (!slot) return;

  const schoolId = document.getElementById('res-filter-school')?.value || '';
  const attemptStatus = document.getElementById('res-filter-attempt-status')?.value || '';
  const gradingStatus = document.getElementById('res-filter-grading-status')?.value || '';
  const search = document.getElementById('res-filter-search')?.value || '';

  slot.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data tabel...</div>';

  try {
    const queryParams = new URLSearchParams();
    if (schoolId) queryParams.append('schoolId', schoolId);
    if (attemptStatus) queryParams.append('attemptStatus', attemptStatus);
    if (gradingStatus) queryParams.append('gradingStatus', gradingStatus);
    if (search) queryParams.append('search', search);

    const res = await apiRequest(`/api/cbt/admin/results?${queryParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data hasil ujian.');

    const data = res.data;

    slot.innerHTML = `
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
          Total <strong>${data.length}</strong> peserta pendaftaran eligible.
        </div>

        ${data.length === 0 ? `
          <div style="text-align: center; padding: 36px; color: var(--text-muted);">
            Tidak ada data peserta yang cocok dengan filter.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-heading);">
                  <th style="padding: 10px 8px; width: 4%; text-align: center;">No</th>
                  <th style="padding: 10px 8px; width: 22%;">Nama & No. Pendaftaran</th>
                  <th style="padding: 10px 8px; width: 18%;">Program Kelas</th>
                  <th style="padding: 10px 8px; width: 12%;">Status Ujian</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Nilai PG</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Nilai Essay</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Total</th>
                  <th style="padding: 10px 8px; width: 12%;">Penilaian</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((row, idx) => {
                  const att = row.attempt;

                  let statusBadge = '<span class="badge badge-secondary" style="font-size: 0.75rem;">Belum Mulai</span>';
                  if (att) {
                    if (att.status === 'IN_PROGRESS') {
                      statusBadge = '<span class="badge badge-warning" style="font-size: 0.75rem;"><i class="fa-solid fa-clock fa-spin"></i> Sedang Ujian</span>';
                    } else if (att.status === 'COMPLETED') {
                      statusBadge = '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-circle-check"></i> Selesai</span>';
                    } else if (att.status === 'EXPIRED') {
                      statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; font-size: 0.75rem; font-weight: 700;">Waktu Habis</span>';
                    }
                  }

                  let gradingBadge = '-';
                  if (att && (att.status === 'COMPLETED' || att.status === 'EXPIRED')) {
                    if (att.gradingStatus === 'GRADED') {
                      gradingBadge = '<span class="badge badge-success" style="font-size: 0.7rem;"><i class="fa-solid fa-check"></i> Sudah Dinilai</span>';
                    } else if (att.gradingStatus === 'NEEDS_ESSAY_GRADING') {
                      gradingBadge = '<span class="badge badge-warning" style="font-size: 0.7rem;"><i class="fa-solid fa-triangle-exclamation"></i> Perlu Nilai Essay</span>';
                    } else {
                      gradingBadge = '<span class="badge badge-secondary" style="font-size: 0.7rem;">Belum Dinilai</span>';
                    }
                  }

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 8px; text-align: center; color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                      <td style="padding: 10px 8px;">
                        <strong style="color: var(--text-heading); font-size: 0.9rem;">${escapeHtml(row.candidateName)}</strong>
                        <div style="font-size: 0.75rem; color: var(--primary-600); font-family: monospace; font-weight: 700;">${row.registrationNumber}</div>
                      </td>
                      <td style="padding: 10px 8px;">
                        <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(row.classProgramName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.schoolName)}</div>
                      </td>
                      <td style="padding: 10px 8px;">
                        ${statusBadge}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: var(--text-heading);">
                        ${att && (att.status === 'COMPLETED' || att.status === 'EXPIRED') ? att.multipleChoiceScore : '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #6366f1;">
                        ${att && (att.status === 'COMPLETED' || att.status === 'EXPIRED') ? att.essayScore : '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 800; color: #16a34a; font-size: 0.95rem;">
                        ${att && (att.status === 'COMPLETED' || att.status === 'EXPIRED') ? att.totalScore : '-'}
                      </td>
                      <td style="padding: 10px 8px;">
                        ${gradingBadge}
                      </td>
                      <td style="padding: 10px 8px; text-align: right; white-space: nowrap;">
                        ${att ? `
                          <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="openCbtResultDetailModal('${att.id}')" title="Buka Detail & Penilaian">
                              <i class="fa-solid fa-eye"></i> Detail
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-danger" data-attempt-id="${att.id}" data-candidate-name="${escapeHtml(row.candidateName)}" onclick="openResetCbtModal(this)" title="Reset Ujian Peserta">
                              <i class="fa-solid fa-rotate-left"></i> Reset
                            </button>
                          </div>
                        ` : `
                          <span style="font-size: 0.75rem; color: var(--text-dim);">-</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

  } catch (err) {
    slot.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ----------------------------------------------------------------------------
// RESULT DETAIL & ESSAY GRADING MODAL
// ----------------------------------------------------------------------------

async function openCbtResultDetailModal(attemptId) {
  openModal('Detail & Penilaian Ujian CBT', '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat detail hasil pengerjaan...</div>', 'modal-xl');

  const modalBody = document.querySelector('#app-modal-body .modal-inner-content') || document.getElementById('app-modal-body');
  if (!modalBody) return;

  try {
    const res = await apiRequest(`/api/cbt/admin/results/${attemptId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat detail hasil.');

    const d = res.data;
    const { attempt, candidate, questions } = d;

    modalBody.innerHTML = `
      <!-- Candidate & Exam Info Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: var(--bg-body); padding: 14px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); margin-bottom: 20px; font-size: 0.85rem;">
        <div>Nama: <strong>${candidate.name}</strong> (<span style="font-family: monospace; font-weight: 700; color: var(--primary-600);">${candidate.registrationNumber}</span>)</div>
        <div>Program Kelas: <strong>${candidate.classProgramName}</strong> (${candidate.schoolName})</div>
        <div>Status: <strong>${attempt.status}</strong></div>
        <div>Waktu Mulai: <strong>${attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('id-ID') : '-'}</strong></div>
        <div>Waktu Selesai: <strong>${attempt.completedAt ? new Date(attempt.completedAt).toLocaleString('id-ID') : '-'}</strong></div>
      </div>

      <!-- Score Summary Banner -->
      <div style="display: flex; justify-content: space-around; align-items: center; background: var(--bg-card); border: 2px solid var(--primary-600); border-radius: var(--radius-lg); padding: 14px; margin-bottom: 20px;">
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Nilai PG</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-600);">${attempt.multipleChoiceScore}</div>
        </div>
        <div style="font-size: 1.5rem; color: var(--text-dim);">+</div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Nilai Essay</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #6366f1;">${attempt.essayScore}</div>
        </div>
        <div style="font-size: 1.5rem; color: var(--text-dim);">=</div>
        <div style="text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Nilai Total</div>
          <div style="font-size: 1.7rem; font-weight: 800; color: #16a34a;">${attempt.totalScore}</div>
        </div>
      </div>

      <!-- Form for Essay Grading -->
      <form onsubmit="handleSaveEssayGrading(event, '${attempt.id}')">
        
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-heading); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i>
          Rincian Jawaban Soal (${questions.length})
        </h4>

        <div style="display: flex; flex-direction: column; gap: 16px; max-height: 480px; overflow-y: auto; padding-right: 6px; margin-bottom: 20px;">
          ${questions.map((q, idx) => {
            const isMC = q.type === 'MULTIPLE_CHOICE';
            const ans = q.answer;

            return `
              <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
                    Soal #${q.questionOrder}
                    <span class="badge ${isMC ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.7rem; margin-left: 6px;">
                      ${isMC ? 'Pilihan Ganda' : 'Essay'}
                    </span>
                  </div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">
                    Bobot: ${q.maxScore} Poin
                  </div>
                </div>

                <div class="cbt-question-content" style="color: var(--text-main); font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
                  ${q.questionText}
                </div>

                ${isMC ? `
                  <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; margin-bottom: 8px;">
                    ${q.options.map((opt, oIdx) => {
                      const isSelected = ans && ans.selectedOptionId === opt.id;
                      const isKey = opt.isCorrect;

                      let bg = 'var(--bg-body)';
                      let border = 'var(--border-subtle)';
                      let labelBadge = '';

                      if (isSelected && isKey) {
                        bg = 'rgba(34, 197, 94, 0.15)';
                        border = '#22c55e';
                        labelBadge = '<span class="badge badge-success" style="font-size: 0.65rem; margin-left: auto;">✓ Jawaban Peserta (Benar)</span>';
                      } else if (isSelected && !isKey) {
                        bg = 'rgba(239, 68, 68, 0.12)';
                        border = '#ef4444';
                        labelBadge = '<span class="badge badge-danger" style="font-size: 0.65rem; margin-left: auto;">✕ Jawaban Peserta (Salah)</span>';
                      } else if (isKey) {
                        bg = 'rgba(34, 197, 94, 0.08)';
                        border = 'rgba(34, 197, 94, 0.4)';
                        labelBadge = '<span style="color: #16a34a; font-size: 0.7rem; font-weight: 700; margin-left: auto;">Kunci Benar</span>';
                      }

                      return `
                        <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; border-radius: var(--radius-md); background: ${bg}; border: 1px solid ${border};">
                          <strong style="width: 20px; color: var(--primary-600); margin-top: 2px;">${String.fromCharCode(65 + oIdx)}.</strong>
                          <div class="cbt-option-content" style="flex: 1; min-width: 0; line-height: 1.4;">
                            ${sanitizeCbtHtml(opt.content)}
                          </div>
                          ${labelBadge}
                        </div>
                      `;
                    }).join('')}
                  </div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: ${ans && ans.isCorrect ? '#16a34a' : '#ef4444'};">
                    Nilai Diperoleh: ${ans ? ans.score : 0} / ${q.maxScore}
                  </div>
                ` : `
                  <!-- Essay Answer & Grading Input -->
                  <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Jawaban Peserta:</div>
                    <div style="font-size: 0.9rem; color: var(--text-heading); white-space: pre-wrap; line-height: 1.4;">${ans && ans.essayAnswer ? escapeHtml(ans.essayAnswer) : '<em style="color: var(--text-dim);">(Peserta tidak mengisi jawaban)</em>'}</div>
                  </div>

                  <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-heading); white-space: nowrap;">Beri Nilai Peserta (Maks. ${q.maxScore}):</label>
                      <input type="number" class="form-control essay-score-input" data-qid="${q.questionId}" value="${ans ? ans.score : 0}" min="0" max="${q.maxScore}" step="0.5" required style="width: 90px; padding: 6px 8px; font-weight: 700; text-align: center; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                      <input type="text" class="form-control essay-feedback-input" data-qid="${q.questionId}" value="${ans && ans.essayFeedback ? escapeHtml(ans.essayFeedback) : ''}" placeholder="Catatan / Feedback korektor (opsional)..." style="width: 100%; padding: 6px 10px; font-size: 0.8rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                    </div>
                  </div>
                `}

              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid var(--border-subtle); padding-top: 14px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>
          <button type="submit" id="btn-save-grades" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Penilaian Essay
          </button>
        </div>

      </form>
    `;

    renderKaTeXInElement(modalBody);

  } catch (err) {
    modalBody.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function handleSaveEssayGrading(e, attemptId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-grades');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Nilai...';

  const scoreInputs = document.querySelectorAll('.essay-score-input');
  const grades = [];

  for (const inp of scoreInputs) {
    const questionId = inp.getAttribute('data-qid');
    const score = Number(inp.value);
    const feedbackInp = document.querySelector(`.essay-feedback-input[data-qid="${questionId}"]`);
    const feedback = feedbackInp ? feedbackInp.value.trim() : undefined;

    grades.push({ questionId, score, feedback });
  }

  try {
    const res = await apiRequest(`/api/cbt/admin/results/${attemptId}/grade`, {
      method: 'POST',
      body: { grades },
    });

    if (res.success) {
      showToast('Penilaian essay berhasil disimpan!', 'success');
      closeModal();
      loadCbtResultsTable();
    } else {
      showToast(res.message || 'Gagal menyimpan penilaian.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Penilaian Essay';
  }
}

// ============================================================================
// 4. IMPORT, EXPORT, AND TEMPLATE SOAL CBT
// ============================================================================

/**
 * Helper: Buat workbook Excel dengan styling header menggunakan SheetJS
 * @param {string[][]} headers - Array nama kolom
 * @param {any[][]} rows - Array baris data
 * @param {string} sheetName - Nama sheet
 */
function _buildExcelWorkbook(headers, rows, sheetName = 'Soal CBT') {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('Library SheetJS (XLSX) belum termuat. Coba refresh halaman.');

  // Gabung header + rows
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Lebar kolom otomatis
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = String(h).length;
    rows.forEach(row => {
      const cell = row[colIdx];
      if (cell !== undefined && cell !== null) {
        maxLen = Math.max(maxLen, String(cell).length);
      }
    });
    return { wch: Math.min(maxLen + 4, 60) };
  });
  ws['!cols'] = colWidths;

  // Style header (baris pertama) — warna biru tua, teks putih, bold
  const headerStyle = {
    fill: { fgColor: { rgb: '1e40af' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    },
  };
  headers.forEach((_, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (ws[cellAddr]) ws[cellAddr].s = headerStyle;
  });

  // Style baris data — border tipis, baris genap warna abu muda
  rows.forEach((row, rowIdx) => {
    const isEven = rowIdx % 2 === 1;
    row.forEach((_, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      if (ws[cellAddr]) {
        ws[cellAddr].s = {
          fill: isEven ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'top', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

/**
 * Download template Excel dengan dukungan kolom gambar soal dan gambar opsi
 */
function downloadQuestionTemplate() {
  const XLSX = window.XLSX;
  if (!XLSX) {
    showToast('Library Excel belum termuat. Coba refresh halaman.', 'danger');
    return;
  }

  const headers = [
    'type',
    'question',
    'gambar_soal',
    'score',
    'option_a',
    'gambar_a',
    'option_b',
    'gambar_b',
    'option_c',
    'gambar_c',
    'option_d',
    'gambar_d',
    'option_e',
    'gambar_e',
    'correct_key',
  ];

  const sampleRows = [
    [
      'MULTIPLE_CHOICE',
      'Berapa hasil penjumlahan dari 15 + 25?',
      '',
      5,
      '30',
      '',
      '35',
      '',
      '40',
      '',
      '45',
      '',
      '50',
      '',
      'C',
    ],
    [
      'MULTIPLE_CHOICE',
      'Perhatikan gambar peta Indonesia berikut! Pulau yang ditunjukkan oleh tanda panah merah adalah pulau...?',
      'peta_indonesia.png',
      5,
      'Pulau Sumatera',
      '',
      'Pulau Jawa',
      '',
      'Pulau Kalimantan',
      '',
      'Pulau Sulawesi',
      '',
      'Pulau Papua',
      '',
      'A',
    ],
    [
      'MULTIPLE_CHOICE',
      'Manakah di bawah ini yang merupakan jaring-jaring bangun ruang prisma segitiga?',
      '',
      5,
      'Gambar A',
      'prisma.png',
      'Gambar B',
      'kubus.png',
      'Gambar C',
      'balok.png',
      'Gambar D',
      'limas.png',
      '',
      '',
      'A',
    ],
    [
      'ESSAY',
      'Amatilah struktur mikroskop pada gambar di bawah! Jelaskan fungsi dari lensa objektif!',
      'mikroskop.jpg',
      10,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'ESSAY',
      'Sebutkan 5 rukun Islam secara berurutan dan jelaskan maknanya secara singkat!',
      '',
      10,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  try {
    const wb = _buildExcelWorkbook(headers, sampleRows, 'Template Soal CBT');

    // Sheet panduan
    const guideData = [
      ['PANDUAN PENGISIAN TEMPLATE SOAL CBT (DILENGKAPI GAMBAR)'],
      [''],
      ['Kolom', 'Keterangan', 'Contoh Nilai'],
      ['type', 'Jenis soal. Wajib diisi: MULTIPLE_CHOICE (PG) atau ESSAY (Esai).', 'MULTIPLE_CHOICE atau ESSAY'],
      ['question', 'Teks pertanyaan butir soal. Wajib diisi.', 'Perhatikan gambar peta di samping!'],
      ['gambar_soal', 'Nama file gambar soal (misal: soal1.png) atau URL gambar. Kosongkan jika tanpa gambar.', 'soal1.png atau https://...'],
      ['score', 'Nilai/bobot soal (angka desimal/bulat). Default: 5 untuk PG, 10 untuk Essay.', '5'],
      ['option_a', 'Teks pilihan jawaban A (wajib untuk PG).', 'Pulau Sumatera'],
      ['gambar_a', 'Nama file gambar untuk pilihan A (opsional, jika opsi berupa gambar).', 'opsi_a.png'],
      ['option_b', 'Teks pilihan jawaban B (wajib untuk PG).', 'Pulau Jawa'],
      ['gambar_b', 'Nama file gambar untuk pilihan B (opsional).', 'opsi_b.png'],
      ['option_c', 'Teks pilihan jawaban C (wajib untuk PG).', 'Pulau Kalimantan'],
      ['gambar_c', 'Nama file gambar untuk pilihan C (opsional).', ''],
      ['option_d', 'Teks pilihan jawaban D (wajib untuk PG).', 'Pulau Sulawesi'],
      ['gambar_d', 'Nama file gambar untuk pilihan D (opsional).', ''],
      ['option_e', 'Teks pilihan jawaban E (opsional untuk PG).', 'Pulau Papua'],
      ['gambar_e', 'Nama file gambar untuk pilihan E (opsional).', ''],
      ['correct_key', 'Kunci jawaban benar: A, B, C, D, atau E (hanya untuk PG).', 'A'],
      [''],
      ['PETUNJUK IMPORT SOAL BERGAMBAR:'],
      ['1. Cara ZIP (Paling Praktis)', 'Kumpulkan file Excel ini dan file-file gambar ke dalam 1 file .zip (bisa di dalam folder atau langsung). Lalu upload file .zip tersebut saat import.', 'soal_ujian.zip'],
      ['2. Cara Excel + Foto', 'Pilih file Excel ini, lalu di kotak file gambar pendukung, pilih semua file foto soalnya sekaligus (Ctrl+A).', 'soal.xlsx + foto-foto'],
      ['3. Format Gambar', 'Mendukung format gambar: PNG, JPG, JPEG, WEBP, GIF.', 'soal1.png'],
      ['4. Untuk Soal Esai', 'Kosongkan kolom option_a s/d option_e, gambar_a s/d gambar_e, dan correct_key.', ''],
    ];

    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    wsGuide['!cols'] = [{ wch: 18 }, { wch: 65 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');

    XLSX.writeFile(wb, 'template_import_soal_cbt.xlsx');
    showToast('Template Excel berhasil diunduh!', 'success');
  } catch (err) {
    showToast('Gagal membuat template: ' + (err.message || err), 'danger');
  }
}

/**
 * Export semua soal ujian ke file Excel (.xlsx) atau file ZIP jika memiliki gambar
 */
async function exportQuestionsToExcel(target, examTitle) {
  const XLSX = window.XLSX;
  if (!XLSX) {
    showToast('Library Excel belum termuat. Coba refresh halaman.', 'danger');
    return;
  }

  let examId = target;
  let btnEl = null;
  if (target && typeof target === 'object' && target.nodeType) {
    btnEl = target;
    examId = target.dataset?.examId || target.getAttribute('data-exam-id');
  }
  if (!examTitle) {
    const currentExam = window.cbtAdminState?.currentExam;
    examTitle = (currentExam && currentExam.id === examId) ? (currentExam.title || 'Soal_Ujian') : 'Soal_Ujian';
  }

  const originalBtnHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengekspor...';
  }

  try {
    let exam = null;
    const currentExam = window.cbtAdminState?.currentExam;
    if (currentExam && currentExam.id === examId && Array.isArray(currentExam.questions)) {
      exam = currentExam;
    } else {
      const res = await apiRequest(`/api/cbt/admin/exams/${examId}`);
      if (!res.success || !res.data) throw new Error(res.message || 'Gagal mengambil data soal ujian.');
      exam = res.data;
    }

    const questions = exam.questions || [];

    if (questions.length === 0) {
      showToast('Ujian ini belum memiliki soal untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'type',
      'question',
      'gambar_soal',
      'score',
      'option_a',
      'gambar_a',
      'option_b',
      'gambar_b',
      'option_c',
      'gambar_c',
      'option_d',
      'gambar_d',
      'option_e',
      'gambar_e',
      'correct_key',
    ];

    const allImagesToExport = []; // Array of { url: string, filename: string }
    const usedFilenames = new Set();

    const getCleanFilename = (originalSrc, defaultPrefix) => {
      let ext = 'png';
      let originalName = '';
      try {
        const cleanPath = originalSrc.split('?')[0].split('#')[0];
        const parts = cleanPath.split('/');
        originalName = parts[parts.length - 1];
        const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
        if (match) ext = match[1].toLowerCase();
      } catch (e) {}

      let baseName = originalName || `${defaultPrefix}.${ext}`;
      let candidate = baseName;
      let counter = 1;
      while (usedFilenames.has(candidate)) {
        const dotIdx = baseName.lastIndexOf('.');
        const namePart = dotIdx > 0 ? baseName.substring(0, dotIdx) : baseName;
        candidate = `${namePart}_${counter}.${ext}`;
        counter++;
      }
      usedFilenames.add(candidate);
      return candidate;
    };

    const extractTextAndImages = (htmlStr, defaultPrefix) => {
      if (!htmlStr) return { text: '', imageName: '' };
      const div = document.createElement('div');
      div.innerHTML = htmlStr;

      let imageName = '';
      const img = div.querySelector('img');
      if (img) {
        const src = img.getAttribute('src');
        if (src) {
          imageName = getCleanFilename(src, defaultPrefix);
          allImagesToExport.push({ url: src, filename: imageName });
        }
        img.remove();
      }

      const text = div.innerText.trim();
      return { text, imageName };
    };

    const rows = questions.map((q, idx) => {
      const qNum = idx + 1;
      const qParsed = extractTextAndImages(q.question, `soal_${qNum}`);
      const score = Number(q.score) || 5;
      const opts = (q.options || []).sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));

      let optA = '', imgA = '';
      let optB = '', imgB = '';
      let optC = '', imgC = '';
      let optD = '', imgD = '';
      let optE = '', imgE = '';
      let correctKey = '';

      if (q.type === 'MULTIPLE_CHOICE') {
        const pA = extractTextAndImages(opts[0]?.content, `soal_${qNum}_opt_a`);
        optA = pA.text; imgA = pA.imageName;

        const pB = extractTextAndImages(opts[1]?.content, `soal_${qNum}_opt_b`);
        optB = pB.text; imgB = pB.imageName;

        const pC = extractTextAndImages(opts[2]?.content, `soal_${qNum}_opt_c`);
        optC = pC.text; imgC = pC.imageName;

        const pD = extractTextAndImages(opts[3]?.content, `soal_${qNum}_opt_d`);
        optD = pD.text; imgD = pD.imageName;

        const pE = extractTextAndImages(opts[4]?.content, `soal_${qNum}_opt_e`);
        optE = pE.text; imgE = pE.imageName;

        const correctIdx = opts.findIndex(o => o.isCorrect);
        if (correctIdx >= 0) correctKey = String.fromCharCode(65 + correctIdx);
      }

      return [
        q.type,
        qParsed.text,
        qParsed.imageName,
        score,
        optA,
        imgA,
        optB,
        imgB,
        optC,
        imgC,
        optD,
        imgD,
        optE,
        imgE,
        correctKey,
      ];
    });

    const wb = _buildExcelWorkbook(headers, rows, 'Soal CBT');
    const cleanTitle = (examTitle || 'Soal_Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);

    // If there are images and JSZip is available, bundle into ZIP with images folder!
    if (allImagesToExport.length > 0 && typeof window.JSZip !== 'undefined') {
      showToast(`Mengemas ${questions.length} butir soal dan ${allImagesToExport.length} berkas gambar ke ZIP...`, 'info');
      const zip = new window.JSZip();

      const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(`soal_${cleanTitle}.xlsx`, wbArray);

      const imgFolder = zip.folder('gambar');
      for (const item of allImagesToExport) {
        try {
          const fetchUrl = item.url.startsWith('http')
            ? item.url
            : (window.location.origin + (item.url.startsWith('/') ? '' : '/') + item.url);
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const blob = await response.blob();
            imgFolder.file(item.filename, blob);
          }
        } catch (fetchErr) {
          console.warn('Gagal mengunduh gambar untuk diekspor:', item.url, fetchErr);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `soal_${cleanTitle}_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      showToast(`Berhasil mengekspor ${questions.length} soal dan ${allImagesToExport.length} gambar ke file ZIP!`, 'success');
    } else {
      // Plain Excel export
      XLSX.writeFile(wb, `soal_${cleanTitle}_${dateStr}.xlsx`);
      showToast(`Berhasil mengekspor ${questions.length} soal ke Excel!`, 'success');
    }
  } catch (err) {
    showToast(err.message || 'Gagal mengekspor soal.', 'danger');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalBtnHtml;
    }
  }
}

/**
 * Parse file Excel (.xlsx atau .xls) menjadi array soal dengan pencocokan gambar
 * @param {ArrayBuffer} arrayBuffer
 * @param {Map<string, File>} imageFilesMap - Map nama file gambar (lowercase) -> File
 * @returns {Array} questions
 */
function parseExcelToQuestions(arrayBuffer, imageFilesMap = new Map()) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('Library SheetJS (XLSX) belum termuat. Coba refresh halaman.');

  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => !/panduan/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Sheet tidak ditemukan dalam file Excel.');

  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki baris data soal.');
  }

  const questions = [];

  const findMatchedImage = (imgName) => {
    if (!imgName) return null;
    const cleanName = String(imgName).trim();
    if (!cleanName) return null;

    if (cleanName.startsWith('http://') || cleanName.startsWith('https://') || cleanName.startsWith('/uploads/')) {
      return { url: cleanName, isRemote: true, name: cleanName };
    }

    if (!imageFilesMap || imageFilesMap.size === 0) return null;

    const lower = cleanName.toLowerCase();
    const base = lower.split('/').pop()?.split('\\').pop() || lower;

    if (imageFilesMap.has(lower)) {
      const f = imageFilesMap.get(lower);
      return { file: f, url: URL.createObjectURL(f), name: f.name };
    }
    if (imageFilesMap.has(base)) {
      const f = imageFilesMap.get(base);
      return { file: f, url: URL.createObjectURL(f), name: f.name };
    }
    return null;
  };

  rawRows.forEach((rowObj, rIdx) => {
    const row = {};
    Object.keys(rowObj).forEach(k => {
      row[k.toLowerCase().replace(/[^a-z0-9_]/g, '')] = rowObj[k];
    });

    const typeRaw = String(row.type || row.questiontype || row.jenissoal || '').toUpperCase().trim();
    const type = (typeRaw.includes('ESSAY') || typeRaw.includes('ESAI')) ? 'ESSAY' : 'MULTIPLE_CHOICE';
    const questionText = String(row.question || row.pertanyaan || row.soal || '').trim();
    const imageSoalName = String(row.gambar_soal || row.gambar || row.imagesoal || row.image || row.foto_soal || row.foto || '').trim();

    if (!questionText && !imageSoalName) return;

    const score = parseFloat(row.score || row.nilai || row.bobot || '5') || 5;
    const qImageMatch = findMatchedImage(imageSoalName);

    if (type === 'ESSAY') {
      questions.push({
        type: 'ESSAY',
        question: questionText,
        imageFileName: imageSoalName,
        imageMatch: qImageMatch,
        score,
        options: [],
      });
    } else {
      const optA = String(row.option_a || row.opsia || row.piliha || row.pilihana || '').trim();
      const imgOptA = String(row.gambar_a || row.image_a || row.gambara || row.foto_a || '').trim();

      const optB = String(row.option_b || row.opsib || row.pilihb || row.pilihanb || '').trim();
      const imgOptB = String(row.gambar_b || row.image_b || row.gambarb || row.foto_b || '').trim();

      const optC = String(row.option_c || row.opsic || row.pilihc || row.pilihanc || '').trim();
      const imgOptC = String(row.gambar_c || row.image_c || row.gambarc || row.foto_c || '').trim();

      const optD = String(row.option_d || row.opsid || row.pilihd || row.pilihand || '').trim();
      const imgOptD = String(row.gambar_d || row.image_d || row.gambard || row.foto_d || '').trim();

      const optE = String(row.option_e || row.opsie || row.pilihe || row.pilihane || '').trim();
      const imgOptE = String(row.gambar_e || row.image_e || row.gambare || row.foto_e || '').trim();

      const rawOpts = [
        { text: optA, imgName: imgOptA, match: findMatchedImage(imgOptA) },
        { text: optB, imgName: imgOptB, match: findMatchedImage(imgOptB) },
        { text: optC, imgName: imgOptC, match: findMatchedImage(imgOptC) },
        { text: optD, imgName: imgOptD, match: findMatchedImage(imgOptD) },
        { text: optE, imgName: imgOptE, match: findMatchedImage(imgOptE) },
      ].filter(o => o.text !== '' || o.imgName !== '');

      if (rawOpts.length < 2) {
        throw new Error(`Baris ${rIdx + 2}: Soal pilihan ganda harus memiliki minimal 2 opsi jawaban.`);
      }

      const correctKeyRaw = String(row.correct_key || row.kuncijawaban || row.kunci || 'A').toUpperCase().trim();
      let correctIdx = 0;
      if (correctKeyRaw === 'B' || correctKeyRaw === '1') correctIdx = 1;
      else if (correctKeyRaw === 'C' || correctKeyRaw === '2') correctIdx = 2;
      else if (correctKeyRaw === 'D' || correctKeyRaw === '3') correctIdx = 3;
      else if (correctKeyRaw === 'E' || correctKeyRaw === '4') correctIdx = 4;

      const options = rawOpts.map((o, idx) => ({
        content: o.text,
        imageFileName: o.imgName,
        imageMatch: o.match,
        isCorrect: idx === correctIdx,
        orderNumber: idx + 1,
      }));
      if (!options.some(o => o.isCorrect)) options[0].isCorrect = true;

      questions.push({
        type: 'MULTIPLE_CHOICE',
        question: questionText,
        imageFileName: imageSoalName,
        imageMatch: qImageMatch,
        score,
        options,
      });
    }
  });

  if (questions.length === 0) throw new Error('Tidak ada data soal yang valid ditemukan.');
  return questions;
}

window.parsedImportQuestions = [];
window.importImagesMap = new Map();
window.importRawExcelBuffer = null;

/**
 * Render tabel pratinjau soal di modal import
 */
function renderImportPreviewTable() {
  const questions = window.parsedImportQuestions || [];
  const previewContainer = document.getElementById('import-preview-container');
  const previewCount = document.getElementById('import-preview-count');
  const previewImagesCount = document.getElementById('import-preview-images-count');
  const previewTbody = document.getElementById('import-preview-tbody');
  const btnSubmit = document.getElementById('btn-submit-import');

  if (previewCount) previewCount.innerText = String(questions.length);

  let totalImagesMatched = 0;
  let totalImagesNeeded = 0;

  questions.forEach(q => {
    if (q.imageFileName) {
      totalImagesNeeded++;
      if (q.imageMatch) totalImagesMatched++;
    }
    (q.options || []).forEach(o => {
      if (o.imageFileName) {
        totalImagesNeeded++;
        if (o.imageMatch) totalImagesMatched++;
      }
    });
  });

  if (previewImagesCount) {
    if (totalImagesNeeded > 0) {
      previewImagesCount.style.display = 'inline-block';
      previewImagesCount.innerHTML = `&bull; <span style="color: ${totalImagesMatched === totalImagesNeeded ? '#16a34a' : '#d97706'}; font-weight: 700;">${totalImagesMatched}/${totalImagesNeeded} Gambar Terhubung</span>`;
    } else {
      previewImagesCount.style.display = 'none';
    }
  }

  if (previewTbody) {
    previewTbody.innerHTML = questions.map((q, idx) => {
      let correctKeyStr = '-';
      if (q.type === 'MULTIPLE_CHOICE') {
        const correctIdx = (q.options || []).findIndex(o => o.isCorrect);
        if (correctIdx >= 0) correctKeyStr = String.fromCharCode(65 + correctIdx);
      }

      // Render Question Thumbnail if image exists
      let qImageBadge = '';
      if (q.imageMatch && q.imageMatch.url) {
        qImageBadge = `
          <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.08); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.25);">
            <img src="${q.imageMatch.url}" style="height: 38px; max-width: 65px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-subtle); background: #000; cursor: pointer;" onclick="window.showImageZoomModal('${q.imageMatch.url}', 'Gambar Soal No. ${idx + 1}')" title="Klik untuk memperbesar">
            <span style="font-size: 0.72rem; color: #15803d; font-weight: 600;"><i class="fa-solid fa-image"></i> ${escapeHtml(q.imageFileName || 'Gambar')}</span>
          </div>
        `;
      } else if (q.imageFileName) {
        qImageBadge = `
          <div style="margin-top: 4px;">
            <span class="badge badge-warning" style="font-size: 0.7rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a;">
              <i class="fa-solid fa-triangle-exclamation"></i> Foto belum dipilih: ${escapeHtml(q.imageFileName)}
            </span>
          </div>
        `;
      }

      // Render Options details for Multiple Choice
      let optionsHtml = '';
      if (q.type === 'MULTIPLE_CHOICE') {
        optionsHtml = `
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 3px; font-size: 0.75rem;">
            ${(q.options || []).map((o, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              let optImg = '';
              if (o.imageMatch && o.imageMatch.url) {
                optImg = `<img src="${o.imageMatch.url}" style="height: 20px; max-width: 32px; object-fit: cover; border-radius: 2px; vertical-align: middle; border: 1px solid var(--border-subtle); cursor: pointer;" onclick="window.showImageZoomModal('${o.imageMatch.url}', 'Gambar Pilihan ${letter}')">`;
              } else if (o.imageFileName) {
                optImg = `<span style="color:#d97706; font-size:0.65rem;">[${escapeHtml(o.imageFileName)}]</span>`;
              }
              const isCor = o.isCorrect;
              return `
                <div style="color: ${isCor ? '#15803d' : 'var(--text-muted)'}; font-weight: ${isCor ? '700' : '400'};">
                  <strong>${letter}.</strong> ${escapeHtml(o.content || '')} ${optImg} ${isCor ? '✓' : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-subtle); vertical-align: top;">
          <td style="padding: 8px 10px; font-weight: 700; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px 10px;">
            <span class="badge ${q.type === 'MULTIPLE_CHOICE' ? 'badge-primary' : 'badge-info'}" style="font-size: 0.7rem;">
              ${q.type === 'MULTIPLE_CHOICE' ? 'PG' : 'ESSAY'}
            </span>
          </td>
          <td style="padding: 8px 10px; max-width: 360px;">
            <div style="font-weight: 600; color: var(--text-heading); line-height: 1.4;">${escapeHtml(q.question || '(Tanpa Teks - Hanya Gambar)')}</div>
            ${qImageBadge}
            ${optionsHtml}
          </td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #16a34a;">${q.score}</td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: var(--primary-600);">${correctKeyStr}</td>
        </tr>
      `;
    }).join('');
  }

  if (previewContainer) previewContainer.style.display = questions.length > 0 ? 'block' : 'none';
  if (btnSubmit) btnSubmit.disabled = questions.length === 0;
}

/**
 * Buka modal Import Soal Ujian (Mendukung .xlsx, .xls, dan .zip)
 */
function openImportQuestionsModal(examId) {
  window.parsedImportQuestions = [];
  window.importImagesMap = new Map();
  window.importRawExcelBuffer = null;

  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="alert alert-info" style="font-size: 0.85rem; padding: 12px 16px; margin: 0; display: flex; align-items: flex-start; gap: 10px;">
        <i class="fa-solid fa-circle-info" style="font-size: 1.2rem; margin-top: 2px; color: var(--primary-600);"></i>
        <div>
          <strong style="color: var(--text-heading);">Panduan Import Soal CBT (Mendukung Gambar):</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5; color: var(--text-main);">
            <li><strong>Cara 1 (File ZIP):</strong> Unggah 1 file <code>.zip</code> yang berisi file Excel beserta gambar-gambarnya. Sistem akan otomatis menghubungkannya.</li>
            <li><strong>Cara 2 (File Excel + Foto):</strong> Unggah file <code>.xlsx</code> / <code>.xls</code>, lalu pilih foto-foto soalnya sekaligus di kotak file gambar pendukung.</li>
            <li><strong>Cara 3 (File Excel Teks):</strong> Langsung unggah file Excel untuk soal biasa tanpa gambar.</li>
          </ul>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="downloadQuestionTemplate()" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-file-excel" style="color: #16a34a;"></i> Download Template Excel Terbaru
        </button>
      </div>

      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
          1. Pilih File Soal (.xlsx / .xls / .zip) <span style="color: var(--danger-600); font-weight: 800;">*</span>
        </label>
        <input 
          type="file" 
          id="import-excel-file" 
          accept=".xlsx,.xls,.zip,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
          class="form-control" 
          onchange="handleImportFileSelected(event)" 
          style="padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); width: 100%;"
        >
      </div>

      <!-- Supporting Images Upload Group (Shown if Excel has images or optional) -->
      <div id="import-supporting-images-group" class="form-group" style="display: none; margin: 0; background: var(--bg-body); padding: 14px; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <label class="form-label" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center; gap: 6px; color: var(--text-heading);">
            <i class="fa-solid fa-images" style="color: var(--primary-600);"></i> 2. Pilih File Gambar Pendukung Soal
          </span>
          <span id="selected-images-count-badge" class="badge badge-info" style="font-size: 0.72rem;">0 Gambar Terpilih</span>
        </label>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 8px 0; line-height: 1.4;">
          Pilih semua file foto/gambar yang tercantum di kolom <code>gambar_soal</code> atau gambar pilihan (bisa pilih banyak gambar sekaligus / blok <code>Ctrl+A</code>).
        </p>
        <input 
          type="file" 
          id="import-images-file" 
          accept="image/png,image/jpeg,image/webp,image/gif" 
          multiple 
          class="form-control" 
          onchange="handleSupportingImagesSelected(event)" 
          style="padding: 8px 12px; font-size: 0.85rem; width: 100%;"
        >
      </div>

      <!-- Preview Container -->
      <div id="import-preview-container" style="display: none;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-heading); margin: 0 0 8px 0; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-list-check" style="color: var(--primary-600);"></i> Preview Butir Soal (<span id="import-preview-count">0</span> Soal)
          </span>
          <span id="import-preview-images-count" style="font-size: 0.8rem; display: none;"></span>
        </h4>
        <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-body); padding: 4px;">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-heading); background: var(--bg-card); position: sticky; top: 0; z-index: 1;">
                <th style="padding: 8px 10px; width: 6%; text-align: center;">No</th>
                <th style="padding: 8px 10px; width: 14%;">Jenis</th>
                <th style="padding: 8px 10px; width: 60%;">Pertanyaan & Gambar</th>
                <th style="padding: 8px 10px; width: 10%; text-align: center;">Nilai</th>
                <th style="padding: 8px 10px; width: 10%; text-align: center;">Kunci</th>
              </tr>
            </thead>
            <tbody id="import-preview-tbody"></tbody>
          </table>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="button" id="btn-submit-import" class="btn btn-primary" onclick="handleProcessImportQuestions('${examId}')" disabled style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-cloud-arrow-up"></i> Proses Import Soal
        </button>
      </div>
    </div>
  `;

  openModal('Import Soal Ujian (Excel / ZIP Bergambar)', bodyHtml, 'modal-lg');
}

/**
 * Handler: Saat file soal dipilih (baik .zip maupun .xlsx/.xls)
 */
async function handleImportFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const btnSubmit = document.getElementById('btn-submit-import');
  if (btnSubmit) btnSubmit.disabled = true;

  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip');

  if (isZip) {
    if (typeof window.JSZip === 'undefined') {
      showToast('Library ZIP belum termuat. Coba refresh halaman.', 'danger');
      return;
    }

    try {
      showToast('Membaca berkas ZIP dan mengekstrak aset...', 'info');
      const zip = await window.JSZip.loadAsync(file);

      // 1. Cari file Excel di dalam ZIP
      let excelEntry = null;
      let excelFileName = '';
      const zipFiles = Object.keys(zip.files);

      for (const p of zipFiles) {
        if (p.includes('__MACOSX') || p.endsWith('.DS_Store') || zip.files[p].dir) continue;
        const low = p.toLowerCase();
        if (low.endsWith('.xlsx') || low.endsWith('.xls')) {
          excelEntry = zip.files[p];
          excelFileName = p;
          break;
        }
      }

      if (!excelEntry) {
        throw new Error('Tidak ditemukan file Excel (.xlsx / .xls) di dalam berkas ZIP ini.');
      }

      // 2. Ekstrak seluruh file gambar di dalam ZIP ke Map
      window.importImagesMap = new Map();
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

      for (const p of zipFiles) {
        if (p.includes('__MACOSX') || p.endsWith('.DS_Store') || zip.files[p].dir) continue;
        const low = p.toLowerCase();
        if (imageExtensions.some(ext => low.endsWith(ext))) {
          const blob = await zip.files[p].async('blob');
          const baseName = p.split('/').pop()?.split('\\').pop() || p;
          const mimeType = low.endsWith('.png') ? 'image/png' : (low.endsWith('.webp') ? 'image/webp' : (low.endsWith('.gif') ? 'image/gif' : 'image/jpeg'));
          const imgFile = new File([blob], baseName, { type: mimeType });

          window.importImagesMap.set(baseName.toLowerCase(), imgFile);
          window.importImagesMap.set(low, imgFile);
        }
      }

      // 3. Baca dan parse file Excel
      const excelBuffer = await excelEntry.async('arraybuffer');
      window.importRawExcelBuffer = excelBuffer;
      const questions = parseExcelToQuestions(excelBuffer, window.importImagesMap);
      window.parsedImportQuestions = questions;

      // Sembunyikan input gambar terpisah karena sudah diambil dari ZIP
      const supportingGroup = document.getElementById('import-supporting-images-group');
      if (supportingGroup) supportingGroup.style.display = 'none';

      renderImportPreviewTable();
      showToast(`Berhasil membaca ${questions.length} butir soal dan ${window.importImagesMap.size} gambar dari ZIP!`, 'success');
    } catch (err) {
      showToast(err.message || 'Gagal memproses file ZIP.', 'danger');
      window.parsedImportQuestions = [];
      renderImportPreviewTable();
    }
  } else {
    // File Excel (.xlsx / .xls) biasa
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        window.importRawExcelBuffer = e.target.result;
        const questions = parseExcelToQuestions(window.importRawExcelBuffer, window.importImagesMap || new Map());
        window.parsedImportQuestions = questions;

        // Cek apakah ada soal yang membutuhkan gambar
        const hasImageRef = questions.some(q => q.imageFileName || (q.options || []).some(o => o.imageFileName));
        const supportingGroup = document.getElementById('import-supporting-images-group');
        if (supportingGroup) {
          supportingGroup.style.display = hasImageRef ? 'block' : 'none';
        }

        renderImportPreviewTable();
        showToast(`Berhasil membaca ${questions.length} butir soal dari file Excel.`, 'success');
      } catch (err) {
        showToast(err.message || 'Gagal memproses file Excel.', 'danger');
        window.parsedImportQuestions = [];
        renderImportPreviewTable();
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

/**
 * Handler: Saat file gambar pendukung dipilih (multi-select)
 */
function handleSupportingImagesSelected(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (!window.importImagesMap) window.importImagesMap = new Map();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    window.importImagesMap.set(f.name.toLowerCase().trim(), f);
    const base = f.name.split('/').pop()?.split('\\').pop()?.toLowerCase().trim() || f.name.toLowerCase().trim();
    window.importImagesMap.set(base, f);
  }

  const badge = document.getElementById('selected-images-count-badge');
  if (badge) badge.innerText = `${window.importImagesMap.size} Gambar Terpilih`;

  // Re-parse jika buffer excel tersedia
  if (window.importRawExcelBuffer) {
    try {
      const questions = parseExcelToQuestions(window.importRawExcelBuffer, window.importImagesMap);
      window.parsedImportQuestions = questions;
      renderImportPreviewTable();
      showToast(`Menghubungkan ${window.importImagesMap.size} berkas gambar dengan soal...`, 'info');
    } catch (err) {
      console.warn('Re-parse error with images:', err);
    }
  }
}

/**
 * Handler: Eksekusi upload gambar dan simpan soal ke database
 */
async function handleProcessImportQuestions(examId) {
  const questions = window.parsedImportQuestions;
  if (!questions || questions.length === 0) {
    showToast('Tidak ada data soal yang siap diimpor.', 'warning');
    return;
  }

  // Cek apakah ada gambar yang belum terhubung
  let missingImagesCount = 0;
  questions.forEach(q => {
    if (q.imageFileName && !q.imageMatch) missingImagesCount++;
    (q.options || []).forEach(o => {
      if (o.imageFileName && !o.imageMatch) missingImagesCount++;
    });
  });

  if (missingImagesCount > 0) {
    const proceed = confirm(
      `Perhatian: Terdapat ${missingImagesCount} referensi gambar di Excel yang belum terhubung atau belum diunggah.\n\nApakah Anda ingin tetap melanjutkan proses import? (Soal akan tetap diimpor dengan teksnya).`
    );
    if (!proceed) return;
  }

  const btn = document.getElementById('btn-submit-import');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah Berkas & Menyimpan Soal...';
  }

  try {
    // Cache URL upload agar jika file gambar yang sama dipakai ulang, tidak diupload ganda
    const uploadedUrlCache = new Map();

    const uploadFileIfNeeded = async (imageMatch) => {
      if (!imageMatch) return null;
      if (imageMatch.isRemote && imageMatch.url) return imageMatch.url;
      if (!imageMatch.file) return null;

      const cacheKey = imageMatch.file.name.toLowerCase().trim();
      if (uploadedUrlCache.has(cacheKey)) {
        return uploadedUrlCache.get(cacheKey);
      }

      const uploadedUrl = await uploadCbtImage(imageMatch.file);
      uploadedUrlCache.set(cacheKey, uploadedUrl);
      return uploadedUrl;
    };

    // Siapkan array butir soal dengan tag HTML <img>
    const payloadQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let finalQuestionHtml = q.question || '';

      if (q.imageMatch) {
        try {
          const imgUrl = await uploadFileIfNeeded(q.imageMatch);
          if (imgUrl) {
            finalQuestionHtml += `<p><img src="${imgUrl}" alt="${escapeHtml(q.imageMatch.name || 'Gambar Soal')}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; display: block; border: 1px solid var(--border-subtle);"></p>`;
          }
        } catch (uploadErr) {
          console.warn('Gagal mengunggah gambar soal:', q.imageFileName, uploadErr);
        }
      }

      let payloadOptions = undefined;
      if (q.type === 'MULTIPLE_CHOICE' && Array.isArray(q.options)) {
        payloadOptions = [];
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          let finalOptHtml = opt.content || '';

          if (opt.imageMatch) {
            try {
              const optImgUrl = await uploadFileIfNeeded(opt.imageMatch);
              if (optImgUrl) {
                finalOptHtml += `<p><img src="${optImgUrl}" alt="${escapeHtml(opt.imageMatch.name || 'Gambar Opsi')}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0; display: block; border: 1px solid var(--border-subtle);"></p>`;
              }
            } catch (uploadErr) {
              console.warn('Gagal mengunggah gambar opsi:', opt.imageFileName, uploadErr);
            }
          }

          payloadOptions.push({
            content: finalOptHtml.trim(),
            isCorrect: !!opt.isCorrect,
            orderNumber: opt.orderNumber || (j + 1),
          });
        }
      }

      payloadQuestions.push({
        type: q.type,
        question: finalQuestionHtml.trim(),
        score: q.score || 5,
        options: payloadOptions,
      });
    }

    const res = await apiRequest(`/api/cbt/admin/exams/${examId}/questions/import`, {
      method: 'POST',
      body: { questions: payloadQuestions },
    });

    if (res.success) {
      showToast(`Berhasil mengimpor ${payloadQuestions.length} butir soal beserta gambarnya!`, 'success');
      closeModal();
      if (window.cbtAdminState && window.cbtAdminState.selectedSchoolId) {
        loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
      } else {
        renderCbtManageView();
      }
    } else {
      showToast(res.message || 'Gagal mengimpor soal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat mengimpor soal.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Proses Import Soal';
    }
  }
}

// ============================================================================
// 5. VERIFIKASI CBT SUPER ADMIN
// ============================================================================

async function renderCbtVerificationView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Verifikasi CBT...</p>
    </div>
  `;

  try {
    const structRes = await apiRequest('/api/cbt/admin/dashboard');
    const structure = structRes.success && structRes.data ? structRes.data.structure : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-clipboard-check" style="color: var(--primary-600);"></i>
              Verifikasi CBT Calon Santri
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Verifikasi kelulusan ujian calon santri yang telah menyelesaikan CBT sebelum melanjutkan ke tahap Wawancara.
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="openExemptCbtModal()" style="display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-user-check"></i> + Bebas CBT (Ujian Offline)
            </button>
            <a href="#cbt-results" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-square-poll-vertical"></i> Hasil Ujian
            </a>
            <a href="#cbt-reset" class="btn btn-outline-danger" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-rotate-left"></i> Reset Ujian Peserta
            </a>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 18px 22px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) 1.5fr; gap: 12px; align-items: flex-end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Sekolah</label>
              <select id="verif-filter-school" class="form-select" onchange="loadCbtVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Sekolah</option>
                ${structure.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Verifikasi</label>
              <select id="verif-filter-status" class="form-select" onchange="loadCbtVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Status</option>
                <option value="PENDING" selected>Menunggu Verifikasi (Pending)</option>
                <option value="VERIFIED">Lulus Verifikasi (Lanjut Wawancara)</option>
                <option value="REJECTED">Ditolak / Tidak Lulus CBT</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Cari Peserta / No. Registrasi</label>
              <div style="position: relative;">
                <input type="text" id="verif-filter-search" class="form-control" placeholder="Ketik nama, no. peserta, sekolah..." onkeyup="if(event.key==='Enter') loadCbtVerificationTable()" style="width: 100%; padding: 8px 34px 8px 12px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer;" onclick="loadCbtVerificationTable()"></i>
              </div>
            </div>

          </div>
        </div>

        <!-- Verification Table Slot -->
        <div id="cbt-verification-table-slot">
          <!-- Injected by loadCbtVerificationTable() -->
        </div>

      </div>
    `;

    loadCbtVerificationTable();

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function loadCbtVerificationTable() {
  const slot = document.getElementById('cbt-verification-table-slot');
  if (!slot) return;

  const schoolId = document.getElementById('verif-filter-school')?.value || '';
  const verificationStatus = document.getElementById('verif-filter-status')?.value || '';
  const search = document.getElementById('verif-filter-search')?.value || '';

  slot.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data verifikasi CBT...</div>';

  try {
    const queryParams = new URLSearchParams();
    if (schoolId) queryParams.append('schoolId', schoolId);
    if (verificationStatus) queryParams.append('verificationStatus', verificationStatus);
    if (search) queryParams.append('search', search);

    const res = await apiRequest(`/api/cbt/admin/verifications?${queryParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data verifikasi CBT.');

    const data = res.data;

    const pendingCount = data.filter(d => d.verificationStatus === 'PENDING').length;
    const verifiedCount = data.filter(d => d.verificationStatus === 'VERIFIED').length;
    const rejectedCount = data.filter(d => d.verificationStatus === 'REJECTED').length;

    slot.innerHTML = `
      <!-- Metric Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Total Peserta Selesai CBT</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">${data.length}</div>
        </div>
        <div class="card" style="background: var(--bg-card); border: 1px solid #f59e0b; border-radius: var(--radius-lg); padding: 14px 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.8rem; color: #d97706; font-weight: 600;">Menunggu Verifikasi</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #d97706; margin-top: 4px;">${pendingCount}</div>
        </div>
        <div class="card" style="background: var(--bg-card); border: 1px solid #22c55e; border-radius: var(--radius-lg); padding: 14px 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.8rem; color: #16a34a; font-weight: 600;">Lulus Verifikasi (Lanjut Wawancara)</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #16a34a; margin-top: 4px;">${verifiedCount}</div>
        </div>
        <div class="card" style="background: var(--bg-card); border: 1px solid #ef4444; border-radius: var(--radius-lg); padding: 14px 18px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.8rem; color: #dc2626; font-weight: 600;">Ditolak / Tidak Lulus</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #dc2626; margin-top: 4px;">${rejectedCount}</div>
        </div>
      </div>

      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan <strong>${data.length}</strong> data peserta ujian CBT.
          </div>
        </div>

        ${data.length === 0 ? `
          <div style="text-align: center; padding: 36px; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 8px; display: block;"></i>
            Tidak ada peserta ujian yang cocok dengan filter.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-heading);">
                  <th style="padding: 10px 8px; width: 4%; text-align: center;">No</th>
                  <th style="padding: 10px 8px; width: 14%;">No. Peserta</th>
                  <th style="padding: 10px 8px; width: 18%;">Nama & Asal Sekolah</th>
                  <th style="padding: 10px 8px; width: 16%;">Sekolah & Program</th>
                  <th style="padding: 10px 8px; width: 7%; text-align: center;">Nilai PG</th>
                  <th style="padding: 10px 8px; width: 7%; text-align: center;">Nilai Essay</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Total</th>
                  <th style="padding: 10px 8px; width: 12%;">Status Verifikasi</th>
                  <th style="padding: 10px 8px; width: 14%; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((row, idx) => {
                  let verifBadge = '<span class="badge badge-warning" style="font-size: 0.75rem;"><i class="fa-solid fa-clock"></i> Pending</span>';
                  if (row.verificationStatus === 'VERIFIED') {
                    verifBadge = '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-circle-check"></i> Lulus Verifikasi</span>';
                  } else if (row.verificationStatus === 'REJECTED') {
                    verifBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; font-size: 0.75rem; font-weight: 700;"><i class="fa-solid fa-circle-xmark"></i> Ditolak</span>';
                  }

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
                      <td style="padding: 12px 8px;">
                        <code style="font-weight: 800; color: var(--primary-600); font-size: 0.85rem;">${row.registrationNumber}</code>
                      </td>
                      <td style="padding: 12px 8px;">
                        <div style="font-weight: 700; color: var(--text-heading);">${escapeHtml(row.candidateName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                          <i class="fa-solid fa-school" style="font-size: 0.7rem;"></i> ${escapeHtml(row.schoolOrigin || '-')}
                        </div>
                      </td>
                      <td style="padding: 12px 8px;">
                        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(row.classProgramName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.schoolName)} &bull; ${escapeHtml(row.majorName)}</div>
                      </td>
                      <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: var(--text-main);">${row.multipleChoiceScore}</td>
                      <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: var(--text-main);">${row.essayScore}</td>
                      <td style="padding: 12px 8px; text-align: center;">
                        <span style="font-weight: 800; font-size: 0.95rem; color: #16a34a; background: rgba(34, 197, 94, 0.1); padding: 4px 8px; border-radius: 6px;">
                          ${row.totalScore}
                        </span>
                      </td>
                      <td style="padding: 12px 8px;">
                        <div>${verifBadge}</div>
                        ${row.verifiedByName ? `
                          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">
                            Oleh: <strong>${escapeHtml(row.verifiedByName)}</strong>
                          </div>
                        ` : ''}
                        ${row.verificationNotes ? `
                          <div style="font-size: 0.7rem; color: var(--text-dim); font-style: italic; margin-top: 2px;">
                            "${escapeHtml(row.verificationNotes)}"
                          </div>
                        ` : ''}
                      </td>
                      <td style="padding: 12px 8px; text-align: right;">
                        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                          <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="openCbtResultDetailModal('${row.attemptId}')" style="padding: 3px 8px; font-size: 0.75rem; white-space: nowrap;">
                              <i class="fa-solid fa-eye"></i> Detail
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-attempt-id="${row.attemptId}" data-candidate-name="${escapeHtml(row.candidateName)}" onclick="openResetCbtModal(this)" style="padding: 3px 8px; font-size: 0.75rem;" title="Reset Ujian Peserta">
                              <i class="fa-solid fa-rotate-left"></i> Reset
                            </button>
                          </div>
                          
                          <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-sm btn-success" data-attempt-id="${row.attemptId}" data-candidate-name="${escapeHtml(row.candidateName)}" onclick="openVerifyCbtModal(this)" style="padding: 3px 8px; font-size: 0.75rem;" title="Luluskan Verifikasi CBT">
                              <i class="fa-solid fa-check"></i> Verifikasi
                            </button>
                            <button type="button" class="btn btn-sm btn-danger" data-attempt-id="${row.attemptId}" data-candidate-name="${escapeHtml(row.candidateName)}" onclick="openRejectCbtModal(this)" style="padding: 3px 8px; font-size: 0.75rem;" title="Tolak / Tidak Lulus CBT">
                              <i class="fa-solid fa-xmark"></i> Tolak
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}

      </div>
    `;

  } catch (err) {
    slot.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function openVerifyCbtModal(target, candidateName) {
  let attemptId = target;
  if (target && typeof target === 'object' && target.nodeType) {
    attemptId = target.getAttribute('data-attempt-id') || target.dataset?.attemptId;
    candidateName = target.getAttribute('data-candidate-name') || target.dataset?.candidateName;
  }
  const safeName = escapeHtml(candidateName || 'Calon Santri');
  const safeAttemptId = escapeHtml(attemptId || '');
  const bodyHtml = `
    <form onsubmit="handleConfirmVerifyCbt(event, '${safeAttemptId}')">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
          Apakah Anda yakin ingin <strong>Memverifikasi & Meluluskan</strong> ujian CBT untuk calon santri:
        </p>
        <div style="margin: 10px 0; padding: 12px 14px; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: var(--radius-md); font-weight: 700; color: #15803d; font-size: 1rem;">
          ${safeName}
        </div>
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
          * Setelah diverifikasi, status calon santri akan menjadi <strong>LULUS CBT</strong> dan berhak melanjutkan ke tahapan wawancara / pengumuman.
        </p>
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Catatan Verifikasi (Opsional):</label>
        <textarea id="verif-notes-input" class="form-control" rows="2" placeholder="Catatan rekomendasi atau keterangan lulus..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;"></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-confirm-verify" class="btn btn-success" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-check"></i> Konfirmasi Luluskan
        </button>
      </div>
    </form>
  `;

  openModal('Verifikasi Ujian CBT Calon Santri', bodyHtml);
}

async function handleConfirmVerifyCbt(event, attemptId) {
  event.preventDefault();
  const btn = document.getElementById('btn-confirm-verify');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const notes = document.getElementById('verif-notes-input')?.value || '';

  try {
    const res = await apiRequest(`/api/cbt/admin/verifications/${attemptId}/verify`, {
      method: 'POST',
      body: { notes },
    });

    if (res.success) {
      showToast(res.message || 'Ujian CBT calon santri berhasil diverifikasi!', 'success');
      closeModal();
      loadCbtVerificationTable();
    } else {
      showToast(res.message || 'Gagal memverifikasi CBT.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Konfirmasi Luluskan';
    }
  }
}

function openRejectCbtModal(target, candidateName) {
  let attemptId = target;
  if (target && typeof target === 'object' && target.nodeType) {
    attemptId = target.getAttribute('data-attempt-id') || target.dataset?.attemptId;
    candidateName = target.getAttribute('data-candidate-name') || target.dataset?.candidateName;
  }
  const safeName = escapeHtml(candidateName || 'Calon Santri');
  const safeAttemptId = escapeHtml(attemptId || '');
  const bodyHtml = `
    <form onsubmit="handleConfirmRejectCbt(event, '${safeAttemptId}')">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
          Apakah Anda yakin ingin menandai <strong>Ditolak / Tidak Lulus</strong> CBT untuk calon santri:
        </p>
        <div style="margin: 10px 0; padding: 12px 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--radius-md); font-weight: 700; color: #b91c1c; font-size: 1rem;">
          ${safeName}
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Alasan / Catatan Penolakan (Opsional):</label>
        <textarea id="reject-notes-input" class="form-control" rows="2" placeholder="Alasan tidak lulus atau keterangan tambahan..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;"></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-confirm-reject" class="btn btn-danger" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-xmark"></i> Konfirmasi Tolak CBT
        </button>
      </div>
    </form>
  `;

  openModal('Tolak Ujian CBT Calon Santri', bodyHtml);
}

async function handleConfirmRejectCbt(event, attemptId) {
  event.preventDefault();
  const btn = document.getElementById('btn-confirm-reject');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const notes = document.getElementById('reject-notes-input')?.value || '';

  try {
    const res = await apiRequest(`/api/cbt/admin/verifications/${attemptId}/reject`, {
      method: 'POST',
      body: { notes },
    });

    if (res.success) {
      showToast(res.message || 'Status CBT berhasil ditandai ditolak.', 'warning');
      closeModal();
      loadCbtVerificationTable();
    } else {
      showToast(res.message || 'Gagal mengubah status CBT.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Konfirmasi Tolak CBT';
    }
  }
}

// ============================================================================
// 5.1 BEBAS CBT / UJIAN OFFLINE / MANDIRI
// ============================================================================

let exemptCandidateSearchTimer = null;
let currentSelectedExemptRegId = null;

function openExemptCbtModal(prefillRegId, prefillRegNum, prefillName, prefillSchool) {
  currentSelectedExemptRegId = prefillRegId || null;

  const isPrefilled = Boolean(prefillRegId);
  const safeName = escapeHtml(prefillName || '');
  const safeRegNum = escapeHtml(prefillRegNum || '');
  const safeSchool = escapeHtml(prefillSchool || '');

  const bodyHtml = `
    <form onsubmit="handleConfirmExemptCbt(event)">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-main); line-height: 1.5;">
          Fitur ini digunakan jika calon santri tidak perlu mengerjakan ujian CBT online (misalnya karena telah mengikuti <strong>Ujian Offline / Tes Mandiri / Ujian Tersendiri</strong>).
        </p>
      </div>

      <!-- Candidate Selection -->
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 6px; display: block;">
          Calon Santri:
        </label>
        
        ${isPrefilled ? `
          <input type="hidden" id="exempt-reg-id" value="${escapeHtml(prefillRegId)}">
          <div style="padding: 12px 14px; background: rgba(14, 165, 233, 0.08); border: 1.5px solid #0284c7; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">${safeName}</div>
              <div style="font-size: 0.8rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
                No. Registrasi: <code>${safeRegNum}</code> ${safeSchool ? `&bull; ${safeSchool}` : ''}
              </div>
            </div>
            <span class="badge badge-primary" style="font-size: 0.75rem;">Terpilih</span>
          </div>
        ` : `
          <div style="position: relative;">
            <input type="hidden" id="exempt-reg-id" value="">
            <input type="text" id="exempt-search-input" class="form-control" placeholder="Cari nama santri atau no. registrasi..." oninput="handleExemptCandidateSearch(this.value)" autocomplete="off" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            <div id="exempt-candidate-results" style="display: none; position: absolute; left: 0; right: 0; top: 100%; z-index: 1050; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); max-height: 220px; overflow-y: auto; box-shadow: var(--shadow-lg); margin-top: 4px;"></div>
          </div>
          <div id="exempt-selected-box" style="display: none; margin-top: 10px; padding: 12px 14px; background: rgba(14, 165, 233, 0.08); border: 1.5px solid #0284c7; border-radius: var(--radius-md);">
            <!-- Populated on select -->
          </div>
        `}
      </div>

      <!-- Optional Score Input -->
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Nilai Tes Offline / Mandiri:</span>
          <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">(Opsional, default: 100)</span>
        </label>
        <input type="number" id="exempt-score-input" class="form-control" placeholder="Kosongkan jika tidak ada rincian nilai (otomatis 100)" min="0" max="100" step="0.1" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          Bisa diisi dengan nilai riil tes offline santri (misal: 85), atau dibiarkan kosong agar sistem mencatat nilai kelulusan penuh (100).
        </div>
      </div>

      <!-- Optional Notes Input -->
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Keterangan / Catatan Verifikasi:</span>
          <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">(Opsional)</span>
        </label>
        <textarea id="exempt-notes-input" class="form-control" rows="2" placeholder="Contoh: Lulus Ujian Offline / Jalur Tes Mandiri / Santri Pindahan" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;"></textarea>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          Catatan verifikasi internal untuk arsip panitia (tidak diumumkan secara khusus ke akun peserta).
        </div>
      </div>

      <div style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; font-size: 0.8rem; color: #15803d;">
        <i class="fa-solid fa-circle-check"></i> Status CBT santri akan langsung <strong>Terverifikasi (LULUS CBT)</strong> sehingga santri dapat langsung lanjut ke tahap Tes Praktik & Wawancara.
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-confirm-exempt" class="btn btn-success" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
          <i class="fa-solid fa-check-double"></i> Simpan & Luluskan CBT
        </button>
      </div>
    </form>
  `;

  openModal('Tandai Bebas CBT / Ujian Offline', bodyHtml);
}

function handleExemptCandidateSearch(searchTerm) {
  clearTimeout(exemptCandidateSearchTimer);
  const resultsDiv = document.getElementById('exempt-candidate-results');
  if (!resultsDiv) return;

  const term = searchTerm?.trim();
  if (!term || term.length < 2) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
    return;
  }

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari santri...</div>';

  exemptCandidateSearchTimer = setTimeout(async () => {
    try {
      const res = await apiRequest(`/api/cbt/admin/candidates-for-exemption?search=${encodeURIComponent(term)}`);
      if (!res.success || !res.data) throw new Error(res.message || 'Gagal mencari calon santri.');

      const candidates = res.data;
      if (candidates.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Tidak ditemukan calon santri terverifikasi dengan kata kunci tersebut.</div>';
        return;
      }

      resultsDiv.innerHTML = candidates.map(c => `
        <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.2s;" 
             onmouseover="this.style.background='var(--bg-body)'" 
             onmouseout="this.style.background='transparent'" 
             onclick="selectExemptCandidate('${c.registrationId}', '${escapeHtml(c.registrationNumber)}', '${escapeHtml(c.candidateName)}', '${escapeHtml(c.schoolName)} &bull; ${escapeHtml(c.classProgramName)}', ${c.isCbtVerified})">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: var(--text-heading); font-size: 0.875rem;">${escapeHtml(c.candidateName)}</div>
            ${c.isCbtVerified ? '<span class="badge badge-success" style="font-size: 0.65rem;">Sudah Lulus CBT</span>' : '<span class="badge badge-secondary" style="font-size: 0.65rem;">Belum CBT</span>'}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            <code>${escapeHtml(c.registrationNumber)}</code> &bull; ${escapeHtml(c.schoolName)} - ${escapeHtml(c.classProgramName)}
          </div>
        </div>
      `).join('');
    } catch (err) {
      resultsDiv.innerHTML = `<div style="padding: 12px; color: #dc2626; font-size: 0.8rem;">${err.message}</div>`;
    }
  }, 300);
}

function selectExemptCandidate(regId, regNum, name, schoolProgram, isAlreadyVerified) {
  const hiddenInput = document.getElementById('exempt-reg-id');
  const resultsDiv = document.getElementById('exempt-candidate-results');
  const searchInput = document.getElementById('exempt-search-input');
  const selectedBox = document.getElementById('exempt-selected-box');

  if (hiddenInput) hiddenInput.value = regId;
  if (resultsDiv) resultsDiv.style.display = 'none';
  if (searchInput) searchInput.value = `${name} (${regNum})`;

  if (selectedBox) {
    selectedBox.style.display = 'block';
    selectedBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div>
          <div style="font-weight: 800; color: var(--text-heading); font-size: 0.9rem;">${name}</div>
          <div style="font-size: 0.775rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
            <code>${regNum}</code> &bull; ${schoolProgram}
          </div>
          ${isAlreadyVerified ? '<div style="font-size: 0.72rem; color: #16a34a; font-weight: 700; margin-top: 3px;"><i class="fa-solid fa-circle-check"></i> Santri ini sudah berstatus Lulus CBT sebelumnya (nilai/catatan akan diperbarui).</div>' : ''}
        </div>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="clearSelectedExemptCandidate()" style="padding: 4px 8px; font-size: 0.75rem;">
          <i class="fa-solid fa-xmark"></i> Ganti
        </button>
      </div>
    `;
  }
}

function clearSelectedExemptCandidate() {
  const hiddenInput = document.getElementById('exempt-reg-id');
  const searchInput = document.getElementById('exempt-search-input');
  const selectedBox = document.getElementById('exempt-selected-box');

  if (hiddenInput) hiddenInput.value = '';
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (selectedBox) {
    selectedBox.style.display = 'none';
    selectedBox.innerHTML = '';
  }
}

async function handleConfirmExemptCbt(event) {
  event.preventDefault();
  const regId = document.getElementById('exempt-reg-id')?.value;
  if (!regId) {
    showToast('Silakan pilih calon santri terlebih dahulu.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-confirm-exempt');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  const scoreRaw = document.getElementById('exempt-score-input')?.value;
  const notes = document.getElementById('exempt-notes-input')?.value || '';

  const payload = {
    registrationId: regId,
    notes: notes.trim() || undefined,
  };

  if (scoreRaw !== '' && scoreRaw !== undefined && scoreRaw !== null) {
    const parsed = parseFloat(scoreRaw);
    if (!isNaN(parsed)) {
      payload.score = parsed;
    }
  }

  try {
    const res = await apiRequest('/api/cbt/admin/exempt', {
      method: 'POST',
      body: payload,
    });

    if (res.success) {
      showToast(res.message || 'Status CBT calon santri berhasil diverifikasi sebagai Bebas CBT!', 'success');
      closeModal();

      // Refresh verification table if present
      if (typeof loadCbtVerificationTable === 'function' && document.getElementById('cbt-verification-table-slot')) {
        loadCbtVerificationTable();
      }
      // Refresh final verification table if present
      if (typeof loadFinalVerificationTable === 'function' && document.getElementById('final-verification-table-container')) {
        loadFinalVerificationTable();
      }
    } else {
      showToast(res.message || 'Gagal menyimpan status bebas CBT.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Simpan & Luluskan CBT';
    }
  }
}

// ============================================================================
// 6. RESET UJIAN PESERTA CBT
// ============================================================================


function openResetCbtModal(target, candidateName) {
  let attemptId = target;
  if (target && typeof target === 'object' && target.nodeType) {
    attemptId = target.getAttribute('data-attempt-id') || target.dataset?.attemptId;
    candidateName = target.getAttribute('data-candidate-name') || target.dataset?.candidateName;
  }
  const safeName = escapeHtml(candidateName || 'Calon Santri');
  const safeAttemptId = escapeHtml(attemptId || '');
  const bodyHtml = `
    <form onsubmit="handleConfirmResetCbt(event, '${safeAttemptId}')">
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 14px;">
          <i class="fa-solid fa-triangle-exclamation" style="color: #dc2626; font-size: 1.5rem; margin-top: 2px;"></i>
          <div>
            <strong style="color: #991b1b; font-size: 0.95rem;">Perhatian: Tindakan Ini Tidak Dapat Dibatalkan</strong>
            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 0.85rem; line-height: 1.5;">
              Me-reset ujian akan <strong>menghapus seluruh jawaban, nilai skor, dan riwayat pengerjaan</strong> peserta saat ini. Calon santri dapat memulai kembali ujian CBT dari nomor 1 dengan durasi waktu penuh.
            </p>
          </div>
        </div>

        <p style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--text-main);">
          Apakah Anda yakin ingin me-reset sesi ujian CBT untuk peserta:
        </p>
        <div style="padding: 12px 14px; background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-weight: 800; color: var(--text-heading); font-size: 1.05rem;">
          ${safeName}
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-confirm-reset" class="btn btn-danger" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-rotate-left"></i> Ya, Reset Ujian Sekarang
        </button>
      </div>
    </form>
  `;

  openModal('Reset Sesi Ujian CBT Peserta', bodyHtml);
}

async function handleConfirmResetCbt(event, attemptId) {
  event.preventDefault();
  const btn = document.getElementById('btn-confirm-reset');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mereset...';
  }

  try {
    const res = await apiRequest(`/api/cbt/admin/attempts/${attemptId}/reset`, {
      method: 'POST',
    });

    if (res.success) {
      showToast(res.message || 'Ujian CBT peserta berhasil di-reset!', 'success');
      closeModal();
      
      // Auto refresh table based on current view
      if (typeof loadCbtResetTable === 'function' && document.getElementById('cbt-reset-table-slot')) {
        loadCbtResetTable();
      }
      if (typeof loadCbtVerificationTable === 'function' && document.getElementById('cbt-verification-table-slot')) {
        loadCbtVerificationTable();
      }
      if (typeof loadCbtResultsTable === 'function' && document.getElementById('cbt-results-table-slot')) {
        loadCbtResultsTable();
      }
    } else {
      showToast(res.message || 'Gagal me-reset ujian.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat me-reset ujian.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Ya, Reset Ujian Sekarang';
    }
  }
}

async function renderCbtResetView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Menu Reset Ujian CBT...</p>
    </div>
  `;

  try {
    const structRes = await apiRequest('/api/cbt/admin/dashboard');
    const structure = structRes.success && structRes.data ? structRes.data.structure : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-rotate-left" style="color: #dc2626;"></i>
              Reset Sesi Ujian CBT Peserta
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Fitur khusus untuk memberikan kesempatan ujian ulang kepada calon santri yang mengalami kendala teknis atau waktu habis.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="#cbt-results" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-square-poll-vertical"></i> Hasil Ujian
            </a>
            <a href="#cbt-verification" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-clipboard-check"></i> Verifikasi CBT
            </a>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 18px 22px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) 1.5fr; gap: 12px; align-items: flex-end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Sekolah</label>
              <select id="reset-filter-school" class="form-select" onchange="loadCbtResetTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Sekolah</option>
                ${structure.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Ujian</label>
              <select id="reset-filter-attempt-status" class="form-select" onchange="loadCbtResetTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Status Berjalan/Selesai</option>
                <option value="IN_PROGRESS">Sedang Ujian (Terkunci/Kendala)</option>
                <option value="COMPLETED">Selesai Ujian</option>
                <option value="EXPIRED">Waktu Habis</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Cari Peserta / No. Registrasi</label>
              <div style="position: relative;">
                <input type="text" id="reset-filter-search" class="form-control" placeholder="Ketik nama santri atau no. daftar..." onkeyup="if(event.key==='Enter') loadCbtResetTable()" style="width: 100%; padding: 8px 34px 8px 12px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer;" onclick="loadCbtResetTable()"></i>
              </div>
            </div>

          </div>
        </div>

        <!-- Reset Table Slot -->
        <div id="cbt-reset-table-slot">
          <!-- Injected by loadCbtResetTable() -->
        </div>

      </div>
    `;

    loadCbtResetTable();

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function loadCbtResetTable() {
  const slot = document.getElementById('cbt-reset-table-slot');
  if (!slot) return;

  const schoolId = document.getElementById('reset-filter-school')?.value || '';
  const attemptStatus = document.getElementById('reset-filter-attempt-status')?.value || '';
  const search = document.getElementById('reset-filter-search')?.value || '';

  slot.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data peserta...</div>';

  try {
    const queryParams = new URLSearchParams();
    if (schoolId) queryParams.append('schoolId', schoolId);
    if (attemptStatus) queryParams.append('attemptStatus', attemptStatus);
    if (search) queryParams.append('search', search);

    const res = await apiRequest(`/api/cbt/admin/results?${queryParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data peserta CBT.');

    // Filter only participants that have an active attempt
    const data = res.data.filter(row => row.attempt !== null);

    slot.innerHTML = `
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
          Ditemukan <strong>${data.length}</strong> peserta yang memiliki sesi ujian aktif/selesai.
        </div>

        ${data.length === 0 ? `
          <div style="text-align: center; padding: 36px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-check" style="font-size: 2rem; color: #10b981; margin-bottom: 8px; display: block;"></i>
            Tidak ada data sesi ujian yang memerlukan reset.
          </div>
        ` : `
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-heading);">
                  <th style="padding: 10px 8px; width: 4%; text-align: center;">No</th>
                  <th style="padding: 10px 8px; width: 22%;">Nama & No. Registrasi</th>
                  <th style="padding: 10px 8px; width: 20%;">Program Kelas</th>
                  <th style="padding: 10px 8px; width: 14%;">Status Ujian</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Nilai PG</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Nilai Essay</th>
                  <th style="padding: 10px 8px; width: 8%; text-align: center;">Total</th>
                  <th style="padding: 10px 8px; width: 16%; text-align: right;">Aksi Reset</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((row, idx) => {
                  const att = row.attempt;

                  let statusBadge = '<span class="badge badge-secondary" style="font-size: 0.75rem;">Belum Mulai</span>';
                  if (att) {
                    if (att.status === 'IN_PROGRESS') {
                      statusBadge = '<span class="badge badge-warning" style="font-size: 0.75rem;"><i class="fa-solid fa-clock fa-spin"></i> Sedang Ujian</span>';
                    } else if (att.status === 'COMPLETED') {
                      statusBadge = '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-circle-check"></i> Selesai</span>';
                    } else if (att.status === 'EXPIRED') {
                      statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; font-size: 0.75rem; font-weight: 700;">Waktu Habis</span>';
                    }
                  }

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 8px; text-align: center; color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                      <td style="padding: 10px 8px;">
                        <strong style="color: var(--text-heading); font-size: 0.9rem;">${escapeHtml(row.candidateName)}</strong>
                        <div style="font-size: 0.75rem; color: var(--primary-600); font-family: monospace; font-weight: 700;">${row.registrationNumber}</div>
                      </td>
                      <td style="padding: 10px 8px;">
                        <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(row.classProgramName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.schoolName)}</div>
                      </td>
                      <td style="padding: 10px 8px;">
                        ${statusBadge}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 700;">
                        ${att ? att.multipleChoiceScore : '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #6366f1;">
                        ${att ? att.essayScore : '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: 800; color: #16a34a; font-size: 0.95rem;">
                        ${att ? att.totalScore : '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                          <button type="button" class="btn btn-sm btn-outline-danger" data-attempt-id="${att.id}" data-candidate-name="${escapeHtml(row.candidateName)}" onclick="openResetCbtModal(this)" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                            <i class="fa-solid fa-rotate-left"></i> Reset Ujian
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

  } catch (err) {
    slot.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export to window
window.renderCbtAdminDashboard = renderCbtAdminDashboard;
window.renderCbtManageView = renderCbtManageView;
window.renderCbtResultsView = renderCbtResultsView;
window.renderCbtVerificationView = renderCbtVerificationView;
window.loadCbtVerificationTable = loadCbtVerificationTable;
window.renderCbtResetView = renderCbtResetView;
window.loadCbtResetTable = loadCbtResetTable;
window.openResetCbtModal = openResetCbtModal;
window.handleConfirmResetCbt = handleConfirmResetCbt;
window.openVerifyCbtModal = openVerifyCbtModal;
window.handleConfirmVerifyCbt = handleConfirmVerifyCbt;
window.openRejectCbtModal = openRejectCbtModal;
window.handleConfirmRejectCbt = handleConfirmRejectCbt;
window.openExemptCbtModal = openExemptCbtModal;
window.handleExemptCandidateSearch = handleExemptCandidateSearch;
window.selectExemptCandidate = selectExemptCandidate;
window.clearSelectedExemptCandidate = clearSelectedExemptCandidate;
window.handleConfirmExemptCbt = handleConfirmExemptCbt;
window.openCbtManageDirectly = openCbtManageDirectly;
window.onCbtSchoolFilterChange = onCbtSchoolFilterChange;
window.onCbtMajorFilterChange = onCbtMajorFilterChange;
window.onCbtProgramFilterChange = onCbtProgramFilterChange;
window.loadCbtSchoolExamDetails = loadCbtSchoolExamDetails;
window.loadCbtProgramExamDetails = loadCbtProgramExamDetails;
window.openCreateExamModal = openCreateExamModal;
window.handleCreateExamSubmit = handleCreateExamSubmit;
window.handleSaveExamSettings = handleSaveExamSettings;
window.openAddQuestionModal = openAddQuestionModal;
window.toggleQuestionTypeFields = toggleQuestionTypeFields;
window.handleSaveQuestionSubmit = handleSaveQuestionSubmit;
window.openEditQuestionModal = openEditQuestionModal;
window.handleDeleteQuestion = handleDeleteQuestion;
window.loadCbtResultsTable = loadCbtResultsTable;
window.openCbtResultDetailModal = openCbtResultDetailModal;
window.handleSaveEssayGrading = handleSaveEssayGrading;
window.downloadQuestionTemplate = downloadQuestionTemplate;
window.exportQuestionsToCSV = exportQuestionsToCSV;
window.exportQuestionsToExcel = exportQuestionsToExcel;
window.openImportQuestionsModal = openImportQuestionsModal;
window.handleImportFileSelected = handleImportFileSelected;
window.handleSupportingImagesSelected = handleSupportingImagesSelected;
window.handleCsvFileSelected = handleCsvFileSelected;
window.handleProcessImportQuestions = handleProcessImportQuestions;
window.detectSchoolDefaultOptionCount = detectSchoolDefaultOptionCount;
window.setQuestionOptionCount = setQuestionOptionCount;
window.triggerOptionImageUpload = triggerOptionImageUpload;
window.clearOptionContent = clearOptionContent;
window.updateCorrectOptionBadge = updateCorrectOptionBadge;
window.triggerQuestionImageUpload = triggerQuestionImageUpload;


