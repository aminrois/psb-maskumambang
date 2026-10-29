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

          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div style="padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Total Soal</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-heading);">${questions.length} Soal</div>
            </div>
            <div style="padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Total Bobot Nilai</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #16a34a;">${totalScore} Poin</div>
            </div>
            ${questions.length > 0 ? `
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="openSetUniformWeightModal('${exam.id}', ${questions[0]?.score || 2})" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; border-radius: var(--radius-md);" title="Samakan bobot seluruh butir soal di paket ini">
                <i class="fa-solid fa-sliders"></i> Ubah Bobot Seragam (${questions[0]?.score || 2})
              </button>
            ` : ''}
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
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <input type="number" id="q-score" class="form-control" value="${(window.cbtAdminState?.currentExam?.questions?.length > 0) ? (window.cbtAdminState.currentExam.questions[0].score || 2) : 2}" min="1" max="100" step="1" required style="width: 140px; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          ${(window.cbtAdminState?.currentExam?.questions?.length > 0) ? `
            <span class="badge" style="background: rgba(14, 165, 233, 0.12); color: var(--primary-600); border: 1px solid rgba(14, 165, 233, 0.3); padding: 6px 12px; font-size: 0.75rem; font-weight: 700; border-radius: 6px;">
              <i class="fa-solid fa-lock"></i> Bobot Seragam Paket: ${window.cbtAdminState.currentExam.questions[0].score || 2}
            </span>
          ` : '<span style="font-size:0.75rem; color:var(--text-muted);">(Seluruh butir soal berikutnya akan otomatis mengikuti bobot ini)</span>'}
        </div>
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
          Ketentuan: Seluruh butir soal dalam 1 paket ujian CBT wajib memiliki nilai bobot yang sama.
        </small>
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

        <!-- Filter & Action Toolbar (Compact & Sleek) -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 12px 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
            
            <!-- Left: Dropdown Filters -->
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <label for="res-filter-school" style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); white-space: nowrap;">Sekolah:</label>
                <select id="res-filter-school" class="form-select" onchange="loadCbtResultsTable()" style="width: 155px; padding: 6px 8px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">Semua Sekolah</option>
                  ${structure.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                </select>
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <label for="res-filter-attempt-status" style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); white-space: nowrap;">Status Ujian:</label>
                <select id="res-filter-attempt-status" class="form-select" onchange="loadCbtResultsTable()" style="width: 135px; padding: 6px 8px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">Semua Status</option>
                  <option value="NOT_STARTED">Belum Mulai</option>
                  <option value="IN_PROGRESS">Sedang Ujian</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="EXPIRED">Waktu Habis</option>
                </select>
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <label for="res-filter-grading-status" style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); white-space: nowrap;">Penilaian:</label>
                <select id="res-filter-grading-status" class="form-select" onchange="loadCbtResultsTable()" style="width: 145px; padding: 6px 8px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                  <option value="">Semua</option>
                  <option value="NEEDS_ESSAY_GRADING">Perlu Nilai Essay</option>
                  <option value="GRADED">Sudah Dinilai</option>
                  <option value="UNGRADED">Belum Dinilai</option>
                </select>
              </div>
            </div>

            <!-- Right: Search Input & Rekap Excel Button -->
            <div style="display: flex; align-items: center; gap: 8px; flex-grow: 1; justify-content: flex-end; min-width: 250px;">
              <div style="position: relative; max-width: 220px; width: 100%;">
                <input type="text" id="res-filter-search" class="form-control" placeholder="Cari santri / no. daftar..." onkeyup="if(event.key==='Enter') loadCbtResultsTable()" style="width: 100%; padding: 6px 28px 6px 10px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer; font-size: 0.75rem;" onclick="loadCbtResultsTable()"></i>
              </div>

              <button type="button" class="btn btn-sm btn-outline-success" onclick="exportCbtResultsSummaryExcel()" title="Export Rekap Nilai Seluruh Siswa ke Excel" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.8rem; white-space: nowrap; font-weight: 700;">
                <i class="fa-solid fa-file-excel"></i> Rekap Excel
              </button>
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

function _escapeQuotes(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function toggleCbtActionDropdown(e, attemptId) {
  if (e) e.stopPropagation();
  const menu = document.getElementById(`cbt-dd-${attemptId}`);
  if (!menu) return;
  const isShown = menu.style.display === 'block';
  closeAllCbtActionDropdowns();
  if (!isShown) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 210) {
      menu.style.top = 'auto';
      menu.style.bottom = 'calc(100% + 4px)';
    } else {
      menu.style.top = 'calc(100% + 4px)';
      menu.style.bottom = 'auto';
    }
    menu.style.display = 'block';
  }
}

function closeAllCbtActionDropdowns() {
  document.querySelectorAll('.cbt-action-dropdown-menu').forEach(el => {
    el.style.display = 'none';
  });
}

document.addEventListener('click', () => {
  closeAllCbtActionDropdowns();
});

function enableCbtTableDragToScroll(container) {
  if (!container) return;
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, a, input, select, .cbt-action-dropdown-menu')) return;
    isDown = true;
    container.classList.add('is-dragging');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      container.classList.remove('is-dragging');
    }
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.classList.remove('is-dragging');
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });
}

// State for CBT Results Pagination
window.cbtResultsPageState = {
  currentPage: 1,
  pageSize: 25,
};

function setCbtResultsPageSize(size) {
  window.cbtResultsPageState.pageSize = Number(size) || 25;
  window.cbtResultsPageState.currentPage = 1;
  renderCbtResultsTable();
}

function changeCbtResultsPage(page) {
  window.cbtResultsPageState.currentPage = Number(page) || 1;
  renderCbtResultsTable();
}

function enableCbtTableColumnResize(table) {
  if (!table) return;
  const resizers = table.querySelectorAll('.cbt-col-resizer');
  let currentTh = null;
  let startX = 0;
  let startWidth = 0;
  let isResizing = false;

  resizers.forEach((resizer) => {
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      currentTh = resizer.parentElement;
      startX = e.pageX;
      startWidth = currentTh.offsetWidth;
      isResizing = true;
      resizer.classList.add('is-resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        if (!isResizing || !currentTh) return;
        const diff = moveEvent.pageX - startX;
        const minW = parseInt(currentTh.getAttribute('data-min-width') || '60', 10);
        const newWidth = Math.max(minW, startWidth + diff);
        currentTh.style.width = newWidth + 'px';
        currentTh.style.minWidth = newWidth + 'px';
      };

      const onMouseUp = () => {
        isResizing = false;
        if (resizer) resizer.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });
}

function renderCbtResultsTable() {
  const data = window.cbtResultsData || [];
  const tbody = document.getElementById('cbt-results-tbody');
  const paginationContainer = document.getElementById('cbt-results-pagination-container');
  if (!tbody) return;

  const totalItems = data.length;
  const pageSize = window.cbtResultsPageState.pageSize || 25;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  let currentPage = window.cbtResultsPageState.currentPage || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.cbtResultsPageState.currentPage = currentPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageRows = data.slice(startIndex, endIndex);

  if (pageRows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 36px; color: var(--text-muted);">
          Tidak ada data peserta yang cocok dengan filter.
        </td>
      </tr>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageRows.map((row, idx) => {
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

    const isCompleted = att && (att.status === 'COMPLETED' || att.status === 'EXPIRED');

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <!-- 1. Nama & No. Pendaftaran (Freeze Left) -->
        <td class="cbt-freeze-left" style="padding: 12px 10px; border-bottom: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle);">
          <strong style="color: var(--text-heading); font-size: 0.9rem;">${escapeHtml(row.candidateName)}</strong>
          <div style="font-size: 0.75rem; color: var(--primary-600); font-family: monospace; font-weight: 700;">${row.registrationNumber}</div>
        </td>

        <!-- 3. Program Kelas -->
        <td style="padding: 12px 10px; border-bottom: 1px solid var(--border-subtle);">
          <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(row.classProgramName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.schoolName)}</div>
        </td>

        <!-- 4. Durasi -->
        <td style="padding: 12px 10px; text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--text-dim); border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted ? (att.durationFormatted || '-') : '-'}
        </td>

        <!-- 5. Benar -->
        <td style="padding: 12px 10px; text-align: center; border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted ? `
            <span class="badge" style="background: rgba(22, 163, 74, 0.12); color: #16a34a; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" title="${att.mcCorrect || 0} Soal PG Benar">
              <i class="fa-solid fa-check"></i> ${att.mcCorrect || 0}
            </span>
          ` : '-'}
        </td>

        <!-- 6. Salah -->
        <td style="padding: 12px 10px; text-align: center; border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted ? `
            <span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" title="${att.mcIncorrect || 0} Soal PG Salah">
              <i class="fa-solid fa-xmark"></i> ${att.mcIncorrect || 0}
            </span>
            ${att.mcUnanswered > 0 ? `<div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 3px;" title="${att.mcUnanswered} soal kosong">(${att.mcUnanswered} Kosong)</div>` : ''}
          ` : '-'}
        </td>

        <!-- 7. Nilai PG -->
        <td style="padding: 12px 10px; text-align: center; font-weight: 700; color: var(--text-heading); border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted && att.multipleChoiceScore != null ? att.multipleChoiceScore.toFixed(2) : '-'}
        </td>

        <!-- 8. Nilai Essay -->
        <td style="padding: 12px 10px; text-align: center; font-weight: 700; color: #6366f1; border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted && att.essayScore != null ? att.essayScore.toFixed(2) : '-'}
        </td>

        <!-- 9. Total (Renamed from Total (0-100)) -->
        <td style="padding: 12px 10px; text-align: center; font-weight: 800; color: #16a34a; font-size: 1rem; border-bottom: 1px solid var(--border-subtle);">
          ${isCompleted && att.totalScore != null ? att.totalScore.toFixed(2) : '-'}
        </td>

        <!-- 10. Status Ujian (Dipindah ke SETELAH Total) -->
        <td style="padding: 12px 10px; text-align: center; border-bottom: 1px solid var(--border-subtle);">
          ${statusBadge}
        </td>

        <!-- 11. Penilaian -->
        <td style="padding: 12px 10px; border-bottom: 1px solid var(--border-subtle);">
          ${gradingBadge}
        </td>

        <!-- 12. Aksi (Freeze Right) -->
        <td class="cbt-freeze-right" style="padding: 12px 10px; text-align: center; white-space: nowrap; border-bottom: 1px solid var(--border-subtle); border-left: 1px solid var(--border-subtle);">
          ${att ? `
            <div class="dropdown" style="position: relative; display: inline-block;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="toggleCbtActionDropdown(event, '${att.id}')" style="padding: 5px 12px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; border-radius: var(--radius-md);">
                <span>Aksi</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem;"></i>
              </button>
              <div id="cbt-dd-${att.id}" class="cbt-action-dropdown-menu">
                <a href="javascript:void(0)" onclick="openCbtResultDetailModal('${att.id}'); closeAllCbtActionDropdowns();" style="display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-eye" style="width: 16px; color: var(--primary-600);"></i>
                  <span>Detail & Penilaian</span>
                </a>
                <a href="javascript:void(0)" onclick="printSingleStudentCbtResult('${att.id}'); closeAllCbtActionDropdowns();" style="display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-print" style="width: 16px; color: #64748b;"></i>
                  <span>Cetak Hasil CBT</span>
                </a>
                <a href="javascript:void(0)" onclick="exportSingleStudentCbtExcel('${att.id}', this); closeAllCbtActionDropdowns();" style="display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-file-excel" style="width: 16px; color: #16a34a;"></i>
                  <span>Unduh Excel Siswa</span>
                </a>
                <div style="border-top: 1px solid var(--border-subtle); margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="openResetCbtModal('${att.id}', '${_escapeQuotes(row.candidateName)}'); closeAllCbtActionDropdowns();" style="display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 0.82rem; color: var(--danger-600); text-decoration: none; font-weight: 600;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-rotate-left" style="width: 16px; color: var(--danger-600);"></i>
                  <span>Reset Ujian</span>
                </a>
              </div>
            </div>
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-dim);">-</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Generate pagination buttons
  if (paginationContainer) {
    let pageButtons = '';
    const maxVisible = 5;
    let pStart = Math.max(1, currentPage - 2);
    let pEnd = Math.min(totalPages, pStart + maxVisible - 1);
    if (pEnd - pStart < maxVisible - 1) {
      pStart = Math.max(1, pEnd - maxVisible + 1);
    }

    if (pStart > 1) {
      pageButtons += `<button type="button" class="cbt-page-btn" onclick="changeCbtResultsPage(1)">1</button>`;
      if (pStart > 2) pageButtons += `<span style="padding: 0 4px; color: var(--text-dim);">...</span>`;
    }

    for (let p = pStart; p <= pEnd; p++) {
      pageButtons += `<button type="button" class="cbt-page-btn ${p === currentPage ? 'active' : ''}" onclick="changeCbtResultsPage(${p})">${p}</button>`;
    }

    if (pEnd < totalPages) {
      if (pEnd < totalPages - 1) pageButtons += `<span style="padding: 0 4px; color: var(--text-dim);">...</span>`;
      pageButtons += `<button type="button" class="cbt-page-btn" onclick="changeCbtResultsPage(${totalPages})">${totalPages}</button>`;
    }

    paginationContainer.innerHTML = `
      <div class="cbt-pagination-wrapper">
        <div>
          Menampilkan <strong>${totalItems > 0 ? startIndex + 1 : 0}</strong> s/d <strong>${endIndex}</strong> dari <strong>${totalItems}</strong> peserta
        </div>
        <div class="cbt-pagination-pages">
          <button type="button" class="cbt-page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changeCbtResultsPage(${currentPage - 1})" title="Halaman Sebelumnya">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          ${pageButtons}
          <button type="button" class="cbt-page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changeCbtResultsPage(${currentPage + 1})" title="Halaman Berikutnya">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  // Enable column resizer
  const tableEl = document.getElementById('cbt-results-main-table');
  if (tableEl) {
    enableCbtTableColumnResize(tableEl);
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

    // 1. Default sort: Urutkan dari yang sudah mengerjakan CBT
    data.sort((a, b) => {
      const getPriority = (item) => {
        if (!item.attempt) return 4;
        if (item.attempt.status === 'COMPLETED') return 1;
        if (item.attempt.status === 'IN_PROGRESS') return 2;
        if (item.attempt.status === 'EXPIRED') return 3;
        return 4;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;

      if (pA === 1) {
        const timeA = a.attempt?.completedAt ? new Date(a.attempt.completedAt).getTime() : 0;
        const timeB = b.attempt?.completedAt ? new Date(b.attempt.completedAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.attempt?.totalScore || 0) - (a.attempt?.totalScore || 0);
      }

      return (a.candidateName || '').localeCompare(b.candidateName || '');
    });

    window.cbtResultsData = data;
    window.cbtResultsPageState.currentPage = 1;

    // Compute summary statistics
    const completedList = data.filter(r => r.attempt && (r.attempt.status === 'COMPLETED' || r.attempt.status === 'EXPIRED'));
    const scores = completedList.map(r => r.attempt.totalScore != null ? Number(r.attempt.totalScore) : 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : '-';
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(1) : '-';

    const durations = completedList.filter(r => r.attempt.durationSeconds > 0).map(r => r.attempt.durationSeconds);
    const avgDurSec = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgDurationStr = avgDurSec > 0 ? `${Math.floor(avgDurSec / 60)}m ${avgDurSec % 60}s` : '-';

    slot.innerHTML = `
        <!-- Executive Statistics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; border-left: 4px solid var(--primary-600);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Peserta Selesai / Total</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">
              ${completedList.length} <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">/ ${data.length} Calon Santri</span>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; border-left: 4px solid #16a34a;">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Rata-Rata Nilai (Skala 100)</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #16a34a; margin-top: 4px;">
              ${avgScore}
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; border-left: 4px solid #6366f1;">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Nilai Tertinggi / Terendah</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">
              <span style="color: #16a34a;">${maxScore}</span> <span style="font-size: 0.9rem; color: var(--text-dim);">/</span> <span style="color: #ef4444;">${minScore}</span>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Rata-Rata Durasi Ujian</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">
              ${avgDurationStr}
            </div>
          </div>
        </div>

        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div>Total <strong>${data.length}</strong> peserta eligible.</div>
              <!-- 6. Pilihan Tampil 10 s/d 100 data -->
              <div style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-body); padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <label for="cbt-res-pagesize" style="font-size: 0.78rem; color: var(--text-heading); font-weight: 700;">Tampil:</label>
                <select id="cbt-res-pagesize" style="border: none; background: transparent; font-size: 0.8rem; font-weight: 700; color: var(--primary-600); cursor: pointer; outline: none;" onchange="setCbtResultsPageSize(this.value)">
                  <option value="10" ${window.cbtResultsPageState.pageSize === 10 ? 'selected' : ''}>10</option>
                  <option value="25" ${window.cbtResultsPageState.pageSize === 25 ? 'selected' : ''}>25</option>
                  <option value="50" ${window.cbtResultsPageState.pageSize === 50 ? 'selected' : ''}>50</option>
                  <option value="100" ${window.cbtResultsPageState.pageSize === 100 ? 'selected' : ''}>100</option>
                </select>
                <span style="font-size: 0.78rem; color: var(--text-dim);">data/hal</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div style="font-size: 0.75rem; color: var(--primary-600); font-weight: 600; display: inline-flex; align-items: center; gap: 5px;" title="Tarik garis tepi kolom untuk melebarkan/menyempitkan kolom">
                <i class="fa-solid fa-arrows-left-right"></i> Kolom dapat diatur lebarnya & freeze nama/aksi
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim);"><i class="fa-solid fa-calculator"></i> Skala nilai 0 s.d. 100</div>
            </div>
          </div>

          <div class="cbt-table-responsive-wrapper" id="cbt-results-scroll-container">
            <table id="cbt-results-main-table" class="table" style="width: 100%; min-width: 1350px; border-collapse: separate; border-spacing: 0; font-size: 0.85rem; margin-bottom: 0;">
              <thead>
                <tr style="text-align: left; color: var(--text-heading); background: var(--bg-card); position: sticky; top: 0; z-index: 10;">
                  <!-- 1. Nama & No. Pendaftaran (Freeze Left, Resizable) -->
                  <th class="cbt-freeze-left cbt-resizable-th" data-min-width="200" style="padding: 12px 10px; min-width: 240px; border-bottom: 2px solid var(--border-subtle); border-right: 1px solid var(--border-subtle);">
                    <span>Nama & No. Pendaftaran</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 3. Program Kelas (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="130" style="padding: 12px 10px; min-width: 160px; border-bottom: 2px solid var(--border-subtle);">
                    <span>Program Kelas</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 4. Durasi (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="90" style="padding: 12px 10px; min-width: 110px; text-align: center; border-bottom: 2px solid var(--border-subtle);">
                    <span>Durasi</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 5. Benar (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="70" style="padding: 12px 10px; min-width: 80px; text-align: center; color: #16a34a; border-bottom: 2px solid var(--border-subtle);">
                    <span>Benar</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 6. Salah (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="70" style="padding: 12px 10px; min-width: 80px; text-align: center; color: #ef4444; border-bottom: 2px solid var(--border-subtle);">
                    <span>Salah</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 7. Nilai PG (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="80" style="padding: 12px 10px; min-width: 90px; text-align: center; border-bottom: 2px solid var(--border-subtle);">
                    <span>Nilai PG</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 8. Nilai Essay (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="80" style="padding: 12px 10px; min-width: 90px; text-align: center; color: #6366f1; border-bottom: 2px solid var(--border-subtle);">
                    <span>Nilai Essay</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 9. Total (Renamed from Total (0-100), Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="80" style="padding: 12px 10px; min-width: 95px; text-align: center; color: #16a34a; border-bottom: 2px solid var(--border-subtle);">
                    <span>Total</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 10. Status Ujian (Dipindah ke SETELAH Total, Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="110" style="padding: 12px 10px; min-width: 120px; text-align: center; border-bottom: 2px solid var(--border-subtle);">
                    <span>Status Ujian</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 11. Penilaian (Resizable) -->
                  <th class="cbt-resizable-th" data-min-width="110" style="padding: 12px 10px; min-width: 125px; border-bottom: 2px solid var(--border-subtle);">
                    <span>Penilaian</span>
                    <div class="cbt-col-resizer" title="Geser untuk mengatur lebar kolom"></div>
                  </th>

                  <!-- 12. Aksi (Freeze Right) -->
                  <th class="cbt-freeze-right" style="padding: 12px 10px; width: 95px; min-width: 95px; text-align: center; border-bottom: 2px solid var(--border-subtle); border-left: 1px solid var(--border-subtle);">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody id="cbt-results-tbody">
                <!-- Sliced and rendered dynamically by renderCbtResultsTable -->
              </tbody>
            </table>
          </div>

          <!-- Pagination Container -->
          <div id="cbt-results-pagination-container"></div>
        </div>
      `;

    // Render paginated rows and enable handlers
    renderCbtResultsTable();

    // Enable drag to scroll for horizontal container navigation
    const scrollContainer = document.getElementById('cbt-results-scroll-container');
    if (scrollContainer) {
      enableCbtTableDragToScroll(scrollContainer);
    }

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
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: var(--bg-body); padding: 14px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); margin-bottom: 16px; font-size: 0.85rem;">
        <div>Nama: <strong>${candidate.name}</strong> (<span style="font-family: monospace; font-weight: 700; color: var(--primary-600);">${candidate.registrationNumber}</span>)</div>
        <div>Program Kelas: <strong>${candidate.classProgramName}</strong> (${candidate.schoolName})</div>
        <div>Status: <strong>${attempt.status}</strong></div>
        <div>Waktu Mulai: <strong>${attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('id-ID') : '-'}</strong></div>
        <div>Waktu Selesai: <strong>${attempt.completedAt ? new Date(attempt.completedAt).toLocaleString('id-ID') : '-'}</strong></div>
      </div>

      <!-- Detailed Exam Metrics Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Durasi Pengerjaan</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">
            ${attempt.durationFormatted || '-'}
          </div>
        </div>
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Jawaban Pilihan Ganda</div>
          <div style="font-size: 1rem; font-weight: 800; margin-top: 4px;">
            <span style="color: #16a34a;">${attempt.mcCorrect || 0} Benar</span> <span style="color: var(--text-dim);">|</span> <span style="color: #ef4444;">${attempt.mcIncorrect || 0} Salah</span>
          </div>
          ${(attempt.mcUnanswered || 0) > 0 ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${attempt.mcUnanswered} Tidak Dijawab</div>` : ''}
        </div>
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Tingkat Akurasi PG</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #0284c7; margin-top: 4px;">
            ${attempt.accuracyPercentage || 0}%
          </div>
        </div>
        <div style="background: var(--bg-card); border: 2px solid #16a34a; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Nilai Akhir (Skala 100)</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #16a34a; margin-top: 2px;">
            ${attempt.totalScore != null ? Number(attempt.totalScore).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <!-- Form for Essay Grading -->
      <form onsubmit="handleSaveEssayGrading(event, '${attempt.id}')">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i>
            Rincian Jawaban Soal (${questions.length})
          </h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printSingleStudentCbtResult('${attempt.id}')" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
              <i class="fa-solid fa-print"></i> Cetak Lembar Hasil
            </button>
            <button type="button" class="btn btn-sm btn-outline-success" onclick="exportSingleStudentCbtExcel('${attempt.id}', this)" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
              <i class="fa-solid fa-file-excel"></i> Unduh Excel
            </button>
          </div>
        </div>

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

/**
 * Helper: Bersihkan tag HTML dari string untuk teks Excel
 */
function _stripHtml(htmlStr) {
  if (!htmlStr) return '';
  const div = document.createElement('div');
  div.innerHTML = htmlStr;
  return (div.innerText || div.textContent || '').trim();
}

/**
 * Ekspor Lembar Evaluasi & Hasil Ujian CBT per Santri ke file Excel (.xlsx)
 */
async function exportSingleStudentCbtExcel(attemptId, btnEl) {
  const originalBtnHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  }

  try {
    const res = await apiRequest(`/api/cbt/admin/results/${attemptId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal mengambil data detail hasil ujian.');

    const d = res.data;
    const { attempt, candidate, questions, examTitle } = d;

    const ExcelJS = window.ExcelJS;
    if (!ExcelJS) throw new Error('Library ExcelJS belum termuat. Coba refresh halaman.');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PSB Maskumambang';
    wb.created = new Date();

    const ws = wb.addWorksheet('Evaluasi Siswa', { views: [{ showGridLines: true }] });

    // Set columns
    ws.columns = [
      { key: 'colA', width: 6 },
      { key: 'colB', width: 16 },
      { key: 'colC', width: 45 },
      { key: 'colD', width: 28 },
      { key: 'colE', width: 32 },
      { key: 'colF', width: 14 },
      { key: 'colG', width: 14 },
      { key: 'colH', width: 12 },
      { key: 'colI', width: 26 },
    ];

    // Row 1: Title
    ws.mergeCells('A1:I1');
    const r1 = ws.getCell('A1');
    r1.value = 'LEMBAR EVALUASI & HASIL UJIAN CBT SANTRI';
    r1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    // Row 2: Subtitle
    ws.mergeCells('A2:I2');
    const r2 = ws.getCell('A2');
    r2.value = 'Penerimaan Santri Baru (PSB) Pondok Pesantren Maskumambang';
    r2.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 18;

    // Row 3: Spacer
    ws.getRow(3).height = 8;

    // Row 4-7: Metadata Info Block
    const startedStr = attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('id-ID') : '-';
    const completedStr = attempt.completedAt ? new Date(attempt.completedAt).toLocaleString('id-ID') : '-';

    const metaRows = [
      ['Nama Santri', candidate.name, 'Ujian CBT', examTitle || 'Ujian Masuk CBT'],
      ['No. Pendaftaran', candidate.registrationNumber, 'Waktu Mulai', startedStr],
      ['Lembaga / Sekolah', candidate.schoolName, 'Waktu Selesai', completedStr],
      ['Program / Jurusan', `${candidate.classProgramName} (${candidate.majorName})`, 'Status Ujian', attempt.status],
    ];

    metaRows.forEach((m, idx) => {
      const rowNum = 4 + idx;
      ws.getCell(`A${rowNum}`).value = m[0];
      ws.getCell(`A${rowNum}`).font = { bold: true, size: 9, color: { argb: 'FF334155' } };
      ws.mergeCells(`B${rowNum}:D${rowNum}`);
      ws.getCell(`B${rowNum}`).value = m[1];
      ws.getCell(`B${rowNum}`).font = { size: 9, bold: m[0] === 'Nama Santri' };

      ws.getCell(`E${rowNum}`).value = m[2];
      ws.getCell(`E${rowNum}`).font = { bold: true, size: 9, color: { argb: 'FF334155' } };
      ws.mergeCells(`F${rowNum}:I${rowNum}`);
      ws.getCell(`F${rowNum}`).value = m[3];
      ws.getCell(`F${rowNum}`).font = { size: 9, bold: m[2] === 'Status Ujian' };
      ws.getRow(rowNum).height = 20;
    });

    // Row 8: Score Banner Summary
    ws.getRow(8).height = 26;
    ws.mergeCells('A8:I8');
    const scoreCell = ws.getCell('A8');
    scoreCell.value = `HASIL NILAI:  Pilihan Ganda = ${attempt.multipleChoiceScore}   |   Essay = ${attempt.essayScore}   |   TOTAL NILAI AKHIR = ${attempt.totalScore}`;
    scoreCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal 700
    scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 9: Spacer
    ws.getRow(9).height = 10;

    // Row 10: Table Headers
    const tableHeaderRow = ws.getRow(10);
    tableHeaderRow.height = 24;
    const tableHeaders = ['No', 'Tipe Soal', 'Pertanyaan Butir Soal', 'Kunci Jawaban Benar', 'Jawaban Santri', 'Status', 'Skor Diperoleh', 'Skor Maks', 'Catatan / Evaluasi'];
    tableHeaders.forEach((h, hIdx) => {
      const cell = tableHeaderRow.getCell(hIdx + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    // Populate Questions
    let startDataRow = 11;
    let totalMaxScore = 0;
    let totalAwardedScore = 0;

    questions.forEach((q, idx) => {
      const rowNum = startDataRow + idx;
      const row = ws.getRow(rowNum);
      const isMC = q.type === 'MULTIPLE_CHOICE';
      const ans = q.answer;

      const qOrder = q.questionOrder || (idx + 1);
      const qTypeText = isMC ? 'Pilihan Ganda' : 'Essay';
      const qText = _stripHtml(q.questionText);
      const maxScore = Number(q.maxScore) || 0;
      totalMaxScore += maxScore;

      let kunciJawaban = '-';
      let jawabanSantri = '(Tidak Dijawab)';
      let statusText = 'KOSONG';
      let statusFg = 'FF64748B';
      let statusBg = 'FFF1F5F9';
      let skorDiperoleh = 0;
      let catatan = '-';

      if (isMC) {
        const correctOpt = (q.options || []).find(o => o.isCorrect);
        kunciJawaban = correctOpt ? _stripHtml(correctOpt.content) : '-';

        if (ans && ans.selectedOptionContent) {
          jawabanSantri = _stripHtml(ans.selectedOptionContent);
          if (ans.isCorrect) {
            statusText = 'BENAR';
            statusFg = 'FF166534'; // Green 800
            statusBg = 'FFDCFCE7'; // Green 100
            skorDiperoleh = Number(ans.score) || maxScore;
          } else {
            statusText = 'SALAH';
            statusFg = 'FF991B1B'; // Red 800
            statusBg = 'FFFEE2E2'; // Red 100
            skorDiperoleh = 0;
          }
        }
      } else {
        // Essay
        kunciJawaban = '- (Evaluasi Penguji)';
        if (ans && ans.essayAnswer) {
          jawabanSantri = ans.essayAnswer;
          skorDiperoleh = Number(ans.score) || 0;
          if (skorDiperoleh > 0) {
            statusText = 'DINILAI';
            statusFg = 'FF1E40AF'; // Blue 800
            statusBg = 'FFDBEAFE'; // Blue 100
          } else {
            statusText = 'BELUM DINILAI';
            statusFg = 'FF854D0E'; // Yellow 800
            statusBg = 'FFFEF9C3'; // Yellow 100
          }
          if (ans.essayFeedback) catatan = ans.essayFeedback;
        }
      }

      totalAwardedScore += skorDiperoleh;

      row.getCell(1).value = qOrder;
      row.getCell(2).value = qTypeText;
      row.getCell(3).value = qText;
      row.getCell(4).value = kunciJawaban;
      row.getCell(5).value = jawabanSantri;

      const cellStatus = row.getCell(6);
      cellStatus.value = statusText;
      cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
      cellStatus.font = { name: 'Arial', size: 9, bold: true, color: { argb: statusFg } };

      row.getCell(7).value = skorDiperoleh;
      row.getCell(8).value = maxScore;
      row.getCell(9).value = catatan;

      // Alignments & borders
      row.alignment = { vertical: 'middle', wrapText: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

      for (let c = 1; c <= 9; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });

    // Summary Total Row
    const summaryRowNum = startDataRow + questions.length;
    const summaryRow = ws.getRow(summaryRowNum);
    summaryRow.height = 24;
    ws.mergeCells(`A${summaryRowNum}:F${summaryRowNum}`);
    const sumLabel = summaryRow.getCell(1);
    sumLabel.value = 'TOTAL SKOR KESELURUHAN';
    sumLabel.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    sumLabel.alignment = { vertical: 'middle', horizontal: 'right' };

    summaryRow.getCell(7).value = attempt.totalScore ?? totalAwardedScore;
    summaryRow.getCell(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF166534' } };
    summaryRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    summaryRow.getCell(8).value = totalMaxScore;
    summaryRow.getCell(8).font = { name: 'Arial', size: 10, bold: true };
    summaryRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 9; c++) {
      summaryRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      summaryRow.getCell(c).border = {
        top: { style: 'medium', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    }

    const xlsxBuffer = await wb.xlsx.writeBuffer();
    const cleanName = (candidate.name || 'Santri').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanReg = (candidate.registrationNumber || 'PSB').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `Evaluasi_CBT_${cleanName}_${cleanReg}.xlsx`;

    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    showToast(`Berhasil mengekspor lembar evaluasi CBT untuk ${candidate.name}!`, 'success');

  } catch (err) {
    showToast('Gagal mengekspor lembar evaluasi: ' + (err.message || err), 'danger');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalBtnHtml;
    }
  }
}

/**
 * Cetak Lembar Hasil Ujian CBT per Santri (Printable Document / PDF)
 */
async function printSingleStudentCbtResult(attemptId) {
  let appSettings = window.appSettings || {};
  let resData = null;

  try {
    const [res, settingsRes] = await Promise.all([
      apiRequest(`/api/cbt/admin/results/${attemptId}`),
      apiRequest('/api/settings').catch(() => ({ success: false })),
    ]);

    if (!res.success || !res.data) {
      throw new Error(res.message || 'Gagal memuat data hasil ujian.');
    }
    resData = res.data;
    if (settingsRes && settingsRes.success && settingsRes.data) {
      appSettings = settingsRes.data;
    }
  } catch (err) {
    showToast(err.message || 'Gagal memuat dokumen untuk dicetak.', 'danger');
    return;
  }

  const { attempt, candidate, questions, examTitle, durationMinutes } = resData;

  const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
  const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
    ? rawLogo
    : `/static/img/${rawLogo}`;
  const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

  const dateNow = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const startedAtFormatted = attempt.startedAt
    ? new Date(attempt.startedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const completedAtFormatted = attempt.completedAt
    ? new Date(attempt.completedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

  const totalScoreVal = attempt.totalScore != null ? Number(attempt.totalScore).toFixed(2) : '0.00';
  const mcScoreVal = attempt.multipleChoiceScore != null ? Number(attempt.multipleChoiceScore).toFixed(2) : '0.00';
  const essayScoreVal = attempt.essayScore != null ? Number(attempt.essayScore).toFixed(2) : '0.00';

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Hasil CBT - ${escapeHtml(candidate.name)} - ${escapeHtml(candidate.registrationNumber)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #1e293b;
          background: #fff;
          font-size: 12px;
          line-height: 1.5;
          padding: 24px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm 15mm; }
        }
        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px double #0f172a;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }
        .header img {
          width: 68px;
          height: 68px;
          object-fit: contain;
        }
        .header-text {
          flex: 1;
          text-align: center;
        }
        .header-text h2 {
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .header-text h3 {
          font-size: 14px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 4px;
        }
        .header-text p {
          font-size: 11px;
          color: #64748b;
        }
        .doc-title {
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 16px;
          padding: 6px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }
        .grid-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .info-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          background: #f8fafc;
        }
        .info-box h4 {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table td {
          padding: 3px 0;
          font-size: 11.5px;
          vertical-align: top;
        }
        .info-table td.label {
          width: 110px;
          color: #64748b;
          font-weight: 600;
        }
        .info-table td.colon {
          width: 12px;
          color: #64748b;
        }
        .info-table td.value {
          font-weight: 700;
          color: #0f172a;
        }
        .score-banner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .score-card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
          background: #ffffff;
        }
        .score-card.final {
          background: #ecfdf5;
          border-color: #86efac;
        }
        .score-card .title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
        }
        .score-card .val {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .score-card.final .val {
          font-size: 24px;
          color: #15803d;
        }
        .score-card .sub {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        table.results {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        table.results th, table.results td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          vertical-align: middle;
        }
        table.results th {
          background: #f1f5f9;
          font-weight: 700;
          text-align: center;
          color: #334155;
        }
        .tag-correct {
          background: #dcfce7;
          color: #15803d;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }
        .tag-wrong {
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }
        .tag-empty {
          background: #f1f5f9;
          color: #64748b;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }
        .signature-section {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sig-box {
          text-align: center;
          width: 220px;
        }
        .sig-box .date {
          margin-bottom: 50px;
          font-size: 11px;
        }
        .sig-box .name {
          font-weight: 700;
          text-decoration: underline;
          font-size: 11.5px;
        }
        .sig-box .title {
          font-size: 10.5px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #166534; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          🖨 Cetak Dokumen / Simpan PDF
        </button>
        <button onclick="window.close()" style="padding: 8px 16px; background: #64748b; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          Tutup
        </button>
      </div>

      <div class="header">
        <img src="${logoUrl}" alt="Logo">
        <div class="header-text">
          <h2>${appName}</h2>
          <h3>PANITIA PENERIMAAN SANTRI BARU (PSB)</h3>
          <p>Jl. Raya Sembungan Kidul Dukun Gresik Jawa Timur | psb.maskumambang.ac.id</p>
        </div>
      </div>

      <div class="doc-title">LEMBAR HASIL UJIAN COMPUTER BASED TEST (CBT)</div>

      <div class="grid-info">
        <div class="info-box">
          <h4>Identitas Calon Santri</h4>
          <table class="info-table">
            <tr><td class="label">No. Pendaftaran</td><td class="colon">:</td><td class="value">${escapeHtml(candidate.registrationNumber || '-')}</td></tr>
            <tr><td class="label">Nama Lengkap</td><td class="colon">:</td><td class="value">${escapeHtml(candidate.name || '-')}</td></tr>
            <tr><td class="label">Lembaga / Unit</td><td class="colon">:</td><td class="value">${escapeHtml(candidate.schoolName || '-')}</td></tr>
            <tr><td class="label">Peminatan/Jurusan</td><td class="colon">:</td><td class="value">${escapeHtml(candidate.majorName || '-')}</td></tr>
            <tr><td class="label">Program Kelas</td><td class="colon">:</td><td class="value">${escapeHtml(candidate.classProgramName || '-')}</td></tr>
          </table>
        </div>

        <div class="info-box">
          <h4>Pelaksanaan Ujian</h4>
          <table class="info-table">
            <tr><td class="label">Paket Ujian</td><td class="colon">:</td><td class="value">${escapeHtml(examTitle || '-')}</td></tr>
            <tr><td class="label">Waktu Mulai</td><td class="colon">:</td><td class="value">${startedAtFormatted}</td></tr>
            <tr><td class="label">Waktu Selesai</td><td class="colon">:</td><td class="value">${completedAtFormatted}</td></tr>
            <tr><td class="label">Durasi Ujian</td><td class="colon">:</td><td class="value">${escapeHtml(attempt.durationFormatted || '-')}</td></tr>
            <tr><td class="label">Status Selesai</td><td class="colon">:</td><td class="value" style="color: #166534;">SELESAI</td></tr>
          </table>
        </div>
      </div>

      <div class="score-banner">
        <div class="score-card final">
          <div class="title">NILAI AKHIR CBT</div>
          <div class="val">${totalScoreVal}</div>
          <div class="sub">Skala 0 - 100</div>
        </div>
        <div class="score-card">
          <div class="title">AKURASI PILIHAN GANDA</div>
          <div class="val" style="color: #2563eb;">${attempt.accuracyPercentage != null ? attempt.accuracyPercentage : 0}%</div>
          <div class="sub">${attempt.mcCorrect || 0} Benar dari ${attempt.mcTotal || 0} Soal</div>
        </div>
        <div class="score-card">
          <div class="title">ANALISIS JAWABAN PG</div>
          <div class="val" style="font-size: 14px; margin-top: 4px; display: flex; justify-content: center; gap: 8px;">
            <span style="color:#15803d;">✔ ${attempt.mcCorrect || 0}</span>
            <span style="color:#b91c1c;">✕ ${attempt.mcIncorrect || 0}</span>
            <span style="color:#64748b;">- ${attempt.mcUnanswered || 0}</span>
          </div>
          <div class="sub">Benar / Salah / Kosong</div>
        </div>
        <div class="score-card">
          <div class="title">KOMPOSISI NILAI</div>
          <div class="val" style="font-size: 13px; margin-top: 4px;">
            PG: ${mcScoreVal} | Essay: ${essayScoreVal}
          </div>
          <div class="sub">Total ${questions.length} Butir Soal</div>
        </div>
      </div>

      <table class="results">
        <thead>
          <tr>
            <th style="width: 35px;">No.</th>
            <th style="width: 70px;">Tipe</th>
            <th>Soal (Ringkasan)</th>
            <th style="width: 140px;">Kunci Jawaban</th>
            <th style="width: 140px;">Jawaban Peserta</th>
            <th style="width: 85px;">Hasil</th>
            <th style="width: 45px;">Skor</th>
          </tr>
        </thead>
        <tbody>
          ${questions.map((q, idx) => {
            const isMC = q.type === 'MULTIPLE_CHOICE';
            const ans = q.answer;
            const qClean = _stripHtml(q.questionText).substring(0, 100) + (_stripHtml(q.questionText).length > 100 ? '...' : '');

            let keyText = '-';
            let studentText = '(Kosong)';
            let statusBadge = '<span class="tag-empty">KOSONG</span>';
            let awardedScore = 0;

            if (isMC) {
              const correctOpt = (q.options || []).find(o => o.isCorrect);
              keyText = correctOpt ? _stripHtml(correctOpt.content) : '-';
              if (ans && ans.selectedOptionContent) {
                studentText = _stripHtml(ans.selectedOptionContent);
                if (ans.isCorrect) {
                  statusBadge = '<span class="tag-correct">BENAR</span>';
                  awardedScore = ans.score != null ? ans.score : q.maxScore;
                } else {
                  statusBadge = '<span class="tag-wrong">SALAH</span>';
                  awardedScore = 0;
                }
              }
            } else {
              keyText = 'Rubrik Penguji';
              if (ans && ans.essayAnswer) {
                studentText = _stripHtml(ans.essayAnswer).substring(0, 80);
                awardedScore = ans.score || 0;
                statusBadge = awardedScore > 0
                  ? '<span class="tag-correct">DINILAI</span>'
                  : '<span class="tag-empty">0 POIN</span>';
              }
            }

            return `
              <tr>
                <td style="text-align: center; font-weight: 700;">${q.questionOrder || (idx + 1)}</td>
                <td style="text-align: center; font-size: 10px;">${isMC ? 'PG' : 'ESSAY'}</td>
                <td>${escapeHtml(qClean)}</td>
                <td>${escapeHtml(keyText)}</td>
                <td>${escapeHtml(studentText)}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center; font-weight: 700;">${awardedScore}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="sig-box">
          <div class="date">&nbsp;</div>
          <div class="name">Petugas / Tim CBT</div>
          <div class="title">Panitia PSB Putra/Putri</div>
        </div>
        <div class="sig-box">
          <div class="date">Gresik, ${dateNow}</div>
          <div class="name">Ketua Panitia PSB</div>
          <div class="title">Pondok Pesantren Maskumambang</div>
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 350);
        });
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank', 'width=950,height=850');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  } else {
    showToast('Popup cetak terblokir oleh browser. Harap izinkan pop-up untuk situs ini.', 'warning');
  }
}

/**
 * Ekspor Rekap Hasil Ujian CBT seluruh siswa yang sedang tampil ke file Excel
 */
async function exportCbtResultsSummaryExcel() {
  const data = window.cbtResultsData;
  if (!data || !Array.isArray(data) || data.length === 0) {
    showToast('Tidak ada data hasil ujian yang dapat diekspor.', 'warning');
    return;
  }

  try {
    const ExcelJS = window.ExcelJS;
    if (!ExcelJS) throw new Error('Library ExcelJS belum termuat. Coba refresh halaman.');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PSB Maskumambang';
    wb.created = new Date();

    const ws = wb.addWorksheet('Rekap Hasil CBT', { views: [{ showGridLines: true }] });

    // Determine the max number of MC questions across the data
    const sampleWithAnswers = data.find(d => Array.isArray(d.mcAnswers) && d.mcAnswers.length > 0);
    const mcQuestionsCount = sampleWithAnswers ? sampleWithAnswers.mcAnswers.length : 0;

    // Define Base Columns (1 to 15)
    const baseColumns = [
      { key: 'no', width: 6 },
      { key: 'regNo', width: 18 },
      { key: 'name', width: 28 },
      { key: 'school', width: 22 },
      { key: 'classProgram', width: 20 },
      { key: 'status', width: 14 },
      { key: 'duration', width: 14 },
      { key: 'mcCorrect', width: 10 },
      { key: 'mcIncorrect', width: 10 },
      { key: 'mcUnanswered', width: 10 },
      { key: 'accuracy', width: 12 },
      { key: 'mcScore', width: 12 },
      { key: 'essayScore', width: 12 },
      { key: 'totalScore', width: 14 },
      { key: 'gradingStatus', width: 16 },
    ];

    const baseHeaders = [
      'No',
      'No. Pendaftaran',
      'Nama Lengkap Santri',
      'Lembaga / Sekolah',
      'Program Kelas',
      'Status Ujian',
      'Durasi Ujian',
      'Benar',
      'Salah',
      'Kosong',
      'Akurasi (%)',
      'Nilai PG',
      'Nilai Essay',
      'Total',
      'Status Penilaian',
    ];

    // Combine base columns with dynamic question columns (width: 5.5 each)
    const allColumns = [...baseColumns];
    for (let q = 1; q <= mcQuestionsCount; q++) {
      allColumns.push({ key: `q_${q}`, width: 5.5 });
    }
    ws.columns = allColumns;

    // Row 1 & Row 2: Headers
    const r1 = ws.getRow(1);
    r1.height = 24;
    const r2 = ws.getRow(2);
    r2.height = 24;

    baseHeaders.forEach((title, idx) => {
      const colNum = idx + 1;
      ws.mergeCells(1, colNum, 2, colNum);
      const cell = ws.getCell(1, colNum);
      cell.value = title;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    // Populate Row 1 & Row 2 for MC Question Columns
    for (let q = 0; q < mcQuestionsCount; q++) {
      const colNum = 16 + q;
      const qNum = q + 1;
      const keyLetter = sampleWithAnswers?.mcAnswers?.[q]?.key || '-';

      // Row 1: Question Number (1, 2, 3...)
      const cell1 = ws.getCell(1, colNum);
      cell1.value = qNum;
      cell1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell1.alignment = { horizontal: 'center', vertical: 'middle' };
      cell1.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      // Row 2: Answer Key (C, B, A, A, B...)
      const cell2 = ws.getCell(2, colNum);
      cell2.value = keyLetter;
      cell2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell2.alignment = { horizontal: 'center', vertical: 'middle' };
      cell2.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF64748B' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }

    // Populate Data Rows starting from Row 3
    data.forEach((row, idx) => {
      const rowNum = 3 + idx;
      const att = row.attempt;
      let statusStr = 'Belum Mulai';
      if (att) {
        if (att.status === 'IN_PROGRESS') statusStr = 'Sedang Ujian';
        else if (att.status === 'COMPLETED') statusStr = 'Selesai';
        else if (att.status === 'EXPIRED') statusStr = 'Waktu Habis';
      }

      let gradingStr = '-';
      if (att && (att.status === 'COMPLETED' || att.status === 'EXPIRED')) {
        if (att.gradingStatus === 'GRADED') gradingStr = 'Sudah Dinilai';
        else if (att.gradingStatus === 'NEEDS_ESSAY_GRADING') gradingStr = 'Perlu Nilai Essay';
        else gradingStr = 'Belum Dinilai';
      }

      const isCompleted = att && (att.status === 'COMPLETED' || att.status === 'EXPIRED');

      const r = ws.getRow(rowNum);
      r.height = 20;

      // Base Columns Values
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = row.registrationNumber;
      r.getCell(3).value = row.candidateName;
      r.getCell(4).value = row.schoolName;
      r.getCell(5).value = row.classProgramName;
      r.getCell(6).value = statusStr;
      r.getCell(7).value = isCompleted ? (att.durationFormatted || '-') : '-';
      r.getCell(8).value = isCompleted ? (att.mcCorrect || 0) : 0;
      r.getCell(9).value = isCompleted ? (att.mcIncorrect || 0) : 0;
      r.getCell(10).value = isCompleted ? (att.mcUnanswered || 0) : 0;
      r.getCell(11).value = isCompleted ? `${att.accuracyPercentage || 0}%` : '-';
      r.getCell(12).value = isCompleted && att.multipleChoiceScore != null ? Number(att.multipleChoiceScore).toFixed(2) : 0;
      r.getCell(13).value = isCompleted && att.essayScore != null ? Number(att.essayScore).toFixed(2) : 0;
      r.getCell(14).value = isCompleted && att.totalScore != null ? Number(att.totalScore).toFixed(2) : 0;
      r.getCell(15).value = gradingStr;

      // Alignments & borders for base columns
      for (let c = 1; c <= 15; c++) {
        const cell = r.getCell(c);
        cell.alignment = { vertical: 'middle', horizontal: [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(c) ? 'center' : 'left' };
        cell.font = { name: 'Arial', size: 9 };
        if (c === 14) {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      // Populate Question Answer Columns (16 onwards)
      for (let q = 0; q < mcQuestionsCount; q++) {
        const colNum = 16 + q;
        const cell = r.getCell(colNum);
        const item = row.mcAnswers ? row.mcAnswers[q] : null;

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        if (!item || !item.answer || item.answer === '-') {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };
        } else {
          cell.value = item.answer;

          if (item.isCorrect === true) {
            // BENAR -> Background Hijau
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF16A34A' },
            };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          } else if (item.isCorrect === false) {
            // SALAH -> Background Merah
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEF4444' },
            };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
          } else {
            cell.font = { name: 'Arial', size: 9 };
          }
        }
      }
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const xlsxBuffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Rekap_Hasil_CBT_${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    showToast(`Berhasil mengekspor rekap ${data.length} hasil ujian santri ke Excel!`, 'success');
  } catch (err) {
    showToast('Gagal mengekspor rekap hasil: ' + (err.message || err), 'danger');
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
/**
 * Helper: Convert Base64 Data URI to Uint8Array safely
 */
function _base64ToUint8Array(dataUri) {
  try {
    const commaIdx = dataUri.indexOf(',');
    const b64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
    const cleanB64 = b64.replace(/\s/g, '');
    const byteCharacters = atob(cleanB64);
    const bytes = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      bytes[i] = byteCharacters.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error('Error decoding base64 to Uint8Array:', e);
    return null;
  }
}

/**
 * Ekspor butir soal ujian ke file Excel (.xlsx) dengan gambar tertanam di sel (Option C)
 * serta dikemas ke dalam .zip dengan folder gambar/ jika soal memiliki gambar.
 */
async function exportQuestionsToExcel(target, examTitle) {
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
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal mengambil data soal ujian.');
    const exam = res.data;

    const questions = exam.questions || [];
    if (questions.length === 0) {
      showToast('Ujian ini belum memiliki soal untuk diekspor.', 'warning');
      return;
    }

    const cleanTitle = (examTitle || 'Soal_Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const usedFilenames = new Set();

    const getUniqueFilename = (baseCandidate, ext) => {
      let candidate = `${baseCandidate}.${ext}`;
      let counter = 1;
      while (usedFilenames.has(candidate.toLowerCase())) {
        candidate = `${baseCandidate}_${counter}.${ext}`;
        counter++;
      }
      usedFilenames.add(candidate.toLowerCase());
      return candidate;
    };

    // Helper: Parse HTML string and extract text + image info
    const parseHtmlCell = (htmlStr, defaultPrefix) => {
      if (!htmlStr) return { text: '', image: null };
      const div = document.createElement('div');
      div.innerHTML = htmlStr;

      let image = null;
      const img = div.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || '';
        if (src) {
          if (src.startsWith('data:image/')) {
            const mimeMatch = src.match(/^data:image\/([a-zA-Z0-9+]+);base64,/i);
            let rawExt = (mimeMatch ? mimeMatch[1] : 'png').toLowerCase();
            let ext = 'png';
            if (rawExt === 'jpeg' || rawExt === 'jpg') ext = 'jpeg';
            else if (rawExt === 'png') ext = 'png';
            else if (rawExt === 'gif') ext = 'gif';
            else ext = 'png';

            const filename = getUniqueFilename(defaultPrefix, ext === 'jpeg' ? 'jpg' : ext);
            image = {
              src,
              isBase64: true,
              ext,
              filename,
            };
          } else {
            // URL format (e.g. /uploads/cbt/... or http...)
            let ext = 'png';
            let originalName = '';
            try {
              const cleanPath = src.split('?')[0].split('#')[0];
              const parts = cleanPath.split('/');
              originalName = parts[parts.length - 1] || '';
              const m = originalName.match(/\.([a-zA-Z0-9]+)$/);
              if (m) {
                const rawExt = m[1].toLowerCase();
                ext = (rawExt === 'jpg' || rawExt === 'jpeg') ? 'jpeg' : rawExt;
              }
            } catch (e) {}

            const baseCandidate = originalName ? originalName.replace(/\.[^.]+$/, '') : defaultPrefix;
            const filename = getUniqueFilename(baseCandidate, ext === 'jpeg' ? 'jpg' : ext);
            image = {
              src,
              isBase64: false,
              ext,
              filename,
            };
          }
        }
        img.remove();
      }

      const text = div.innerText.trim();
      return { text, image };
    };

    // 1. Kumpulkan semua butir soal dan gambar
    const parsedQuestions = [];
    const allImagesList = [];

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const qParsed = parseHtmlCell(q.question, `soal_${qNum}`);
      if (qParsed.image) allImagesList.push(qParsed.image);

      const score = Number(q.score) || 5;
      const opts = (q.options || []).sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));

      let optA = '', imgA = null;
      let optB = '', imgB = null;
      let optC = '', imgC = null;
      let optD = '', imgD = null;
      let optE = '', imgE = null;
      let correctKey = '';

      if (q.type === 'MULTIPLE_CHOICE') {
        if (opts[0]) { const p = parseHtmlCell(opts[0].content, `soal_${qNum}_a`); optA = p.text; imgA = p.image; if (imgA) allImagesList.push(imgA); }
        if (opts[1]) { const p = parseHtmlCell(opts[1].content, `soal_${qNum}_b`); optB = p.text; imgB = p.image; if (imgB) allImagesList.push(imgB); }
        if (opts[2]) { const p = parseHtmlCell(opts[2].content, `soal_${qNum}_c`); optC = p.text; imgC = p.image; if (imgC) allImagesList.push(imgC); }
        if (opts[3]) { const p = parseHtmlCell(opts[3].content, `soal_${qNum}_d`); optD = p.text; imgD = p.image; if (imgD) allImagesList.push(imgD); }
        if (opts[4]) { const p = parseHtmlCell(opts[4].content, `soal_${qNum}_e`); optE = p.text; imgE = p.image; if (imgE) allImagesList.push(imgE); }

        const correctIdx = opts.findIndex(o => o.isCorrect);
        if (correctIdx >= 0) correctKey = String.fromCharCode(65 + correctIdx);
      }

      parsedQuestions.push({
        type: q.type,
        question: qParsed.text,
        imgSoal: qParsed.image,
        score,
        optA, imgA,
        optB, imgB,
        optC, imgC,
        optD, imgD,
        optE, imgE,
        correctKey,
      });
    });

    // 2. Unduh dan konversi gambar yang diperlukan
    if (allImagesList.length > 0) {
      showToast(`Memproses ${allImagesList.length} gambar soal...`, 'info');
      for (const imgItem of allImagesList) {
        if (imgItem.isBase64) {
          imgItem.uint8 = _base64ToUint8Array(imgItem.src);
        } else {
          try {
            const fetchUrl = imgItem.src.startsWith('http')
              ? imgItem.src
              : (window.location.origin + (imgItem.src.startsWith('/') ? '' : '/') + imgItem.src);
            const resp = await fetch(fetchUrl);
            if (resp.ok) {
              imgItem.arrayBuffer = await resp.arrayBuffer();
            }
          } catch (e) {
            console.warn('Gagal fetch image:', imgItem.src, e);
          }
        }
      }
    }

    // 3. Bangun Excel menggunakan ExcelJS (gambar tertanam di dalam sel)
    const ExcelJS = window.ExcelJS;
    let xlsxBuffer = null;

    if (ExcelJS) {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PSB Maskumambang';
      wb.created = new Date();

      const ws = wb.addWorksheet('Soal CBT', { views: [{ showGridLines: true }] });

      ws.columns = [
        { header: 'type', key: 'type', width: 18 },
        { header: 'question', key: 'question', width: 45 },
        { header: 'gambar_soal', key: 'gambar_soal', width: 22 },
        { header: 'score', key: 'score', width: 8 },
        { header: 'option_a', key: 'option_a', width: 25 },
        { header: 'gambar_a', key: 'gambar_a', width: 20 },
        { header: 'option_b', key: 'option_b', width: 25 },
        { header: 'gambar_b', key: 'gambar_b', width: 20 },
        { header: 'option_c', key: 'option_c', width: 25 },
        { header: 'gambar_c', key: 'gambar_c', width: 20 },
        { header: 'option_d', key: 'option_d', width: 25 },
        { header: 'gambar_d', key: 'gambar_d', width: 20 },
        { header: 'option_e', key: 'option_e', width: 25 },
        { header: 'gambar_e', key: 'gambar_e', width: 20 },
        { header: 'correct_key', key: 'correct_key', width: 14 },
      ];

      // Style Header (Baris 1)
      const headerRow = ws.getRow(1);
      headerRow.height = 28;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Helper untuk embed gambar ke sel ExcelJS
      const embedImageToCell = (imgObj, colIdx, rowNum) => {
        if (!imgObj) return;
        try {
          let validExt = imgObj.ext;
          if (validExt !== 'png' && validExt !== 'jpeg' && validExt !== 'gif') {
            validExt = 'png';
          }
          let imgId = null;
          if (imgObj.isBase64) {
            imgId = wb.addImage({
              base64: imgObj.src,
              extension: validExt,
            });
          } else if (imgObj.arrayBuffer) {
            imgId = wb.addImage({
              buffer: imgObj.arrayBuffer,
              extension: validExt,
            });
          }

          if (imgId !== null) {
            ws.addImage(imgId, {
              tl: { col: colIdx + 0.08, row: rowNum - 1 + 0.08 },
              ext: { width: 90, height: 58 },
              editAs: 'oneCell',
            });
          }
        } catch (embErr) {
          console.warn('Gagal menempelkan gambar ke sel Excel:', imgObj.filename, embErr);
        }
      };

      // Tambahkan data baris per soal
      parsedQuestions.forEach(p => {
        const hasRowImg = Boolean(p.imgSoal || p.imgA || p.imgB || p.imgC || p.imgD || p.imgE);
        const row = ws.addRow({
          type: p.type,
          question: p.question,
          gambar_soal: p.imgSoal ? p.imgSoal.filename : '',
          score: p.score,
          option_a: p.optA,
          gambar_a: p.imgA ? p.imgA.filename : '',
          option_b: p.optB,
          gambar_b: p.imgB ? p.imgB.filename : '',
          option_c: p.optC,
          gambar_c: p.imgC ? p.imgC.filename : '',
          option_d: p.optD,
          gambar_d: p.imgD ? p.imgD.filename : '',
          option_e: p.optE,
          gambar_e: p.imgE ? p.imgE.filename : '',
          correct_key: p.correctKey,
        });

        row.height = hasRowImg ? 70 : 26;
        row.alignment = { vertical: 'middle', wrapText: true };
        row.getCell('type').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('score').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('correct_key').alignment = { vertical: 'middle', horizontal: 'center' };

        // Formatting kolom gambar (nama file di bawah gambar)
        ['gambar_soal', 'gambar_a', 'gambar_b', 'gambar_c', 'gambar_d', 'gambar_e'].forEach(colKey => {
          const cell = row.getCell(colKey);
          cell.alignment = { vertical: 'bottom', horizontal: 'center' };
          cell.font = { size: 8, color: { argb: 'FF64748B' } };
        });

        // Tempelkan gambar ke sel yang sesuai (0-indexed col: gambar_soal = 2, gambar_a = 5, dst)
        embedImageToCell(p.imgSoal, 2, row.number);
        embedImageToCell(p.imgA, 5, row.number);
        embedImageToCell(p.imgB, 7, row.number);
        embedImageToCell(p.imgC, 9, row.number);
        embedImageToCell(p.imgD, 11, row.number);
        embedImageToCell(p.imgE, 13, row.number);
      });

      // Tambahkan sheet Panduan
      const wsGuide = wb.addWorksheet('Panduan');
      wsGuide.columns = [
        { header: 'Kolom', key: 'col', width: 18 },
        { header: 'Keterangan', key: 'desc', width: 65 },
        { header: 'Contoh Nilai', key: 'sample', width: 30 },
      ];
      const guideHead = wsGuide.getRow(1);
      guideHead.height = 24;
      guideHead.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      guideHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      const guides = [
        ['type', 'Jenis soal: MULTIPLE_CHOICE (Pilihan Ganda) atau ESSAY (Esai).', 'MULTIPLE_CHOICE'],
        ['question', 'Teks pertanyaan butir soal.', 'Perhatikan gambar berikut!'],
        ['gambar_soal', 'Nama file gambar soal (gambar juga tertanam langsung di sel).', 'soal_1.png'],
        ['score', 'Nilai/bobot butir soal.', '5'],
        ['option_a', 'Teks pilihan jawaban A.', 'Opsi A'],
        ['gambar_a', 'Nama file gambar untuk opsi A (opsional).', 'soal_1_a.png'],
        ['option_b', 'Teks pilihan jawaban B.', 'Opsi B'],
        ['gambar_b', 'Nama file gambar untuk opsi B (opsional).', 'soal_1_b.png'],
        ['option_c', 'Teks pilihan jawaban C.', 'Opsi C'],
        ['gambar_c', 'Nama file gambar untuk opsi C (opsional).', ''],
        ['option_d', 'Teks pilihan jawaban D.', 'Opsi D'],
        ['gambar_d', 'Nama file gambar untuk opsi D (opsional).', ''],
        ['option_e', 'Teks pilihan jawaban E.', 'Opsi E'],
        ['gambar_e', 'Nama file gambar untuk opsi E (opsional).', ''],
        ['correct_key', 'Kunci jawaban benar (A, B, C, D, atau E).', 'A'],
      ];
      guides.forEach(g => {
        const r = wsGuide.addRow({ col: g[0], desc: g[1], sample: g[2] });
        r.alignment = { vertical: 'middle', wrapText: true };
      });

      xlsxBuffer = await wb.xlsx.writeBuffer();
    } else {
      // Fallback jika ExcelJS tidak ada: gunakan SheetJS
      const XLSX = window.XLSX;
      const headers = ['type', 'question', 'gambar_soal', 'score', 'option_a', 'gambar_a', 'option_b', 'gambar_b', 'option_c', 'gambar_c', 'option_d', 'gambar_d', 'option_e', 'gambar_e', 'correct_key'];
      const rows = parsedQuestions.map(p => [
        p.type, p.question, p.imgSoal ? p.imgSoal.filename : '', p.score,
        p.optA, p.imgA ? p.imgA.filename : '',
        p.optB, p.imgB ? p.imgB.filename : '',
        p.optC, p.imgC ? p.imgC.filename : '',
        p.optD, p.imgD ? p.imgD.filename : '',
        p.optE, p.imgE ? p.imgE.filename : '',
        p.correctKey,
      ]);
      const wbFallback = _buildExcelWorkbook(headers, rows, 'Soal CBT');
      xlsxBuffer = XLSX.write(wbFallback, { bookType: 'xlsx', type: 'array' });
    }

    // 4. Pengemasan ZIP (Option C: File Excel bergambar di sel + Folder gambar/ di ZIP)
    if (allImagesList.length > 0 && typeof window.JSZip !== 'undefined') {
      showToast(`Mengemas ${questions.length} soal dan ${allImagesList.length} gambar ke file ZIP...`, 'info');
      const zip = new window.JSZip();

      // Masukkan file Excel (dengan gambar tertanam di dalamnya)
      zip.file(`soal_${cleanTitle}.xlsx`, xlsxBuffer);

      // Masukkan folder gambar/ berisi file fisik foto untuk backup/re-import
      const imgFolder = zip.folder('gambar');
      for (const item of allImagesList) {
        if (item.uint8) {
          imgFolder.file(item.filename, item.uint8);
        } else if (item.arrayBuffer) {
          imgFolder.file(item.filename, item.arrayBuffer);
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

      showToast(`Berhasil mengekspor ${questions.length} butir soal dan ${allImagesList.length} gambar ke file ZIP!`, 'success');
    } else {
      // Tidak ada gambar atau tanpa ZIP: langsung unduh file .xlsx
      const xlsxBlob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = URL.createObjectURL(xlsxBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `soal_${cleanTitle}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      showToast(`Berhasil mengekspor ${questions.length} butir soal ke Excel!`, 'success');
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
window.exportSingleStudentCbtExcel = exportSingleStudentCbtExcel;
function openSetUniformWeightModal(examId, currentWeight = 2) {
  const currentExam = window.cbtAdminState?.currentExam;
  const qCount = currentExam?.questions?.length || 0;

  const bodyHtml = `
    <form onsubmit="handleSaveUniformWeight(event, '${examId}')">
      <div style="margin-bottom: 16px;">
        <p style="font-size: 0.875rem; color: var(--text-main); line-height: 1.5; margin-bottom: 12px;">
          Fitur ini akan menyamakan bobot nilai seluruh <strong>${qCount} butir soal</strong> di paket ini ke satu angka yang sama sesuai ketentuan rumus penilaian CBT:
        </p>
        <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; font-size: 0.8rem; color: var(--text-dim); margin-bottom: 16px;">
          <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">Rumus Penilaian Akhir CBT:</div>
          <code>(Jumlah Skor / (Jumlah Soal &times; Bobot)) &times; 100</code>
        </div>
        <label style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
          Tentukan Bobot Nilai per Soal (Contoh: 2, 3, dst.) <span style="color: #ef4444;">*</span>
        </label>
        <input type="number" id="modal-uniform-weight" class="form-control" value="${currentWeight}" min="1" max="100" step="1" required style="width: 140px; padding: 10px 12px; font-weight: 700; font-size: 1rem;">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-save-uniform-weight" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-check"></i> Terapkan ke Seluruh Soal
        </button>
      </div>
    </form>
  `;

  openModal('Atur Bobot Seragam Paket Soal', bodyHtml, 'modal-md');
}

async function handleSaveUniformWeight(e, examId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-uniform-weight');
  const weightInput = document.getElementById('modal-uniform-weight');
  const weight = parseFloat(weightInput?.value);

  if (!weight || weight <= 0) {
    showToast('Nilai bobot harus berupa angka positif lebih dari 0.', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}/uniform-weight`, {
      method: 'PATCH',
      data: { weight }
    });

    if (!res.success) throw new Error(res.message || 'Gagal mengubah bobot soal.');

    closeModal();
    showToast(res.message || 'Bobot seluruh soal berhasil diseragamkan.', 'success');

    if (window.cbtAdminState?.selectedSchoolId) {
      await loadCbtSchoolExamDetails(window.cbtAdminState.selectedSchoolId);
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Terapkan ke Seluruh Soal';
    }
  }
}

window.openSetUniformWeightModal = openSetUniformWeightModal;
window.handleSaveUniformWeight = handleSaveUniformWeight;
window.printSingleStudentCbtResult = printSingleStudentCbtResult;
window.toggleCbtActionDropdown = toggleCbtActionDropdown;
window.closeAllCbtActionDropdowns = closeAllCbtActionDropdowns;
window.setCbtResultsPageSize = setCbtResultsPageSize;
window.changeCbtResultsPage = changeCbtResultsPage;
window.renderCbtResultsTable = renderCbtResultsTable;
window.enableCbtTableColumnResize = enableCbtTableColumnResize;



