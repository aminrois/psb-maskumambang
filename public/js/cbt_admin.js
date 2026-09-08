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

        <!-- Ujian Berdasarkan Program Kelas (Tree / Hierarchy) -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm);">
          <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-sitemap" style="color: var(--primary-600);"></i>
                Status Ujian Berdasarkan Program Kelas
              </h3>
              <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Struktur: Sekolah &bull; Jurusan &bull; Program Kelas</p>
            </div>
          </div>

          ${structure.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
              Belum ada data Master Sekolah/Jurusan/Program Kelas.
            </div>
          ` : `
            <div class="cbt-tree-container" style="display: flex; flex-direction: column; gap: 16px;">
              ${structure.map(school => `
                <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-body);">
                  
                  <!-- School Header -->
                  <div style="background: var(--bg-card); padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px; font-weight: 800; color: var(--text-heading); font-size: 1rem;">
                      <i class="fa-solid fa-school" style="color: var(--primary-600);"></i>
                      <span>${school.name}</span>
                      ${school.initial ? `<span class="badge badge-secondary" style="font-size: 0.7rem;">${school.initial}</span>` : ''}
                    </div>
                  </div>

                  <!-- Majors List -->
                  <div style="padding: 12px 18px;">
                    ${school.majors.length === 0 ? `
                      <div style="font-size: 0.85rem; color: var(--text-dim); padding: 8px 0;">Belum ada jurusan pada sekolah ini.</div>
                    ` : school.majors.map(major => `
                      <div style="margin-bottom: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px;">
                        
                        <div style="font-weight: 700; color: var(--primary-600); font-size: 0.9rem; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                          <i class="fa-solid fa-code-branch"></i>
                          <span>${major.name}</span>
                        </div>

                        <!-- Class Programs Table -->
                        <div style="overflow-x: auto;">
                          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                              <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); text-align: left;">
                                <th style="padding: 6px 8px; width: 35%;">Program Kelas</th>
                                <th style="padding: 6px 8px; width: 20%;">Jumlah Soal</th>
                                <th style="padding: 6px 8px; width: 20%;">Durasi Ujian</th>
                                <th style="padding: 6px 8px; width: 15%;">Status Ujian</th>
                                <th style="padding: 6px 8px; width: 10%; text-align: right;">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${major.classPrograms.length === 0 ? `
                                <tr><td colspan="5" style="padding: 10px; color: var(--text-dim); text-align: center;">Belum ada program kelas pada jurusan ini.</td></tr>
                              ` : major.classPrograms.map(cp => `
                                <tr style="border-bottom: 1px solid var(--border-subtle);">
                                  <td style="padding: 8px; font-weight: 600; color: var(--text-heading);">
                                    <i class="fa-solid fa-caret-right" style="color: var(--primary-500); margin-right: 6px;"></i>
                                    ${cp.name}
                                  </td>
                                  <td style="padding: 8px; color: var(--text-main);">
                                    ${cp.exam ? `<strong>${cp.exam.totalQuestions}</strong> Soal` : '<span style="color: var(--text-dim);">-</span>'}
                                  </td>
                                  <td style="padding: 8px; color: var(--text-main);">
                                    ${cp.exam ? `<strong>${cp.exam.durationMinutes}</strong> Menit` : '<span style="color: var(--text-dim);">-</span>'}
                                  </td>
                                  <td style="padding: 8px;">
                                    ${cp.exam ? (cp.exam.isActive ? '<span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-check"></i> Aktif</span>' : '<span class="badge badge-secondary" style="font-size: 0.75rem;"><i class="fa-solid fa-pause"></i> Nonaktif</span>') : '<span class="badge badge-warning" style="font-size: 0.75rem;">Belum dibuat</span>'}
                                  </td>
                                  <td style="padding: 8px; text-align: right;">
                                    <button type="button" class="btn btn-xs btn-primary" onclick="openCbtManageDirectly('${school.id}', '${major.id}', '${cp.id}')" style="white-space: nowrap;">
                                      <i class="fa-solid fa-gear"></i> Kelola
                                    </button>
                                  </td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    `).join('')}
                  </div>

                </div>
              `).join('')}
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

function openCbtManageDirectly(schoolId, majorId, programId) {
  window.cbtAdminState.selectedSchoolId = schoolId;
  window.cbtAdminState.selectedMajorId = majorId;
  window.cbtAdminState.selectedProgramId = programId;
  window.location.hash = `#cbt-manage/${programId}`;
}

// ============================================================================
// 2. KELOLA UJIAN & SOAL (CASCADING FILTER + CRUD)
// ============================================================================

async function renderCbtManageView(paramProgramId) {
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
      container.innerHTML = '<div class="alert alert-warning">Belum ada struktur master data sekolah/jurusan.</div>';
      return;
    }

    // Auto-select initial values if paramProgramId is provided
    if (paramProgramId) {
      for (const s of structure) {
        for (const m of s.majors) {
          for (const cp of m.classPrograms) {
            if (cp.id === paramProgramId) {
              window.cbtAdminState.selectedSchoolId = s.id;
              window.cbtAdminState.selectedMajorId = m.id;
              window.cbtAdminState.selectedProgramId = cp.id;
              break;
            }
          }
        }
      }
    }

    // If still no school selected, default to first school
    if (!window.cbtAdminState.selectedSchoolId && structure.length > 0) {
      window.cbtAdminState.selectedSchoolId = structure[0].id;
    }

    // If still no major selected, default to first major of selected school
    const currentSchool = structure.find(s => s.id === window.cbtAdminState.selectedSchoolId) || structure[0];
    if (currentSchool && (!window.cbtAdminState.selectedMajorId || !currentSchool.majors.some(m => m.id === window.cbtAdminState.selectedMajorId))) {
      window.cbtAdminState.selectedMajorId = currentSchool.majors[0]?.id || '';
    }

    // If still no program selected, default to first program of selected major
    const currentMajor = currentSchool?.majors.find(m => m.id === window.cbtAdminState.selectedMajorId) || currentSchool?.majors[0];
    if (currentMajor && (!window.cbtAdminState.selectedProgramId || !currentMajor.classPrograms.some(p => p.id === window.cbtAdminState.selectedProgramId))) {
      window.cbtAdminState.selectedProgramId = currentMajor.classPrograms[0]?.id || '';
    }

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800;">Kelola Ujian & Soal</h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">Konfigurasi ujian, durasi, dan bank soal per Program Kelas</p>
          </div>
          <div>
            <a href="#cbt-dashboard" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard CBT
            </a>
          </div>
        </div>

        <!-- Cascading Filter Section -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-filter" style="color: var(--primary-600);"></i>
            Pilih Struktur Program Kelas:
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            
            <div class="form-group">
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Sekolah</label>
              <select id="cbt-filter-school" class="form-select" onchange="onCbtSchoolFilterChange(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                ${structure.map(s => `
                  <option value="${s.id}" ${s.id === window.cbtAdminState.selectedSchoolId ? 'selected' : ''}>${s.name}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Jurusan</label>
              <select id="cbt-filter-major" class="form-select" onchange="onCbtMajorFilterChange(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                ${(currentSchool?.majors || []).map(m => `
                  <option value="${m.id}" ${m.id === window.cbtAdminState.selectedMajorId ? 'selected' : ''}>${m.name}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: block;">Program Kelas</label>
              <select id="cbt-filter-program" class="form-select" onchange="onCbtProgramFilterChange(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                ${(currentMajor?.classPrograms || []).map(cp => `
                  <option value="${cp.id}" ${cp.id === window.cbtAdminState.selectedProgramId ? 'selected' : ''}>${cp.name}</option>
                `).join('')}
              </select>
            </div>

          </div>
        </div>

        <!-- Main Configuration Area -->
        <div id="cbt-program-config-slot">
          <!-- Injected by loadCbtProgramExamDetails() -->
        </div>

      </div>
    `;

    if (window.cbtAdminState.selectedProgramId) {
      await loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
    } else {
      document.getElementById('cbt-program-config-slot').innerHTML = `
        <div class="alert alert-info">Pilihlah Program Kelas untuk mengelola Ujian CBT.</div>
      `;
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function onCbtSchoolFilterChange(schoolId) {
  window.cbtAdminState.selectedSchoolId = schoolId;
  const structure = window.cbtAdminState.cachedStructure || [];
  const school = structure.find(s => s.id === schoolId);
  const majorSelect = document.getElementById('cbt-filter-major');
  const programSelect = document.getElementById('cbt-filter-program');

  if (school && school.majors.length > 0) {
    window.cbtAdminState.selectedMajorId = school.majors[0].id;
    majorSelect.innerHTML = school.majors.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

    const firstMajor = school.majors[0];
    if (firstMajor && firstMajor.classPrograms.length > 0) {
      window.cbtAdminState.selectedProgramId = firstMajor.classPrograms[0].id;
      programSelect.innerHTML = firstMajor.classPrograms.map(cp => `<option value="${cp.id}">${cp.name}</option>`).join('');
      loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
    } else {
      window.cbtAdminState.selectedProgramId = '';
      programSelect.innerHTML = '<option value="">(Tidak ada Program Kelas)</option>';
      document.getElementById('cbt-program-config-slot').innerHTML = '<div class="alert alert-warning">Tidak ada Program Kelas pada Jurusan ini.</div>';
    }
  } else {
    window.cbtAdminState.selectedMajorId = '';
    window.cbtAdminState.selectedProgramId = '';
    majorSelect.innerHTML = '<option value="">(Tidak ada Jurusan)</option>';
    programSelect.innerHTML = '<option value="">(Tidak ada Program Kelas)</option>';
    document.getElementById('cbt-program-config-slot').innerHTML = '<div class="alert alert-warning">Tidak ada Jurusan pada Sekolah ini.</div>';
  }
}

function onCbtMajorFilterChange(majorId) {
  window.cbtAdminState.selectedMajorId = majorId;
  const structure = window.cbtAdminState.cachedStructure || [];
  const school = structure.find(s => s.id === window.cbtAdminState.selectedSchoolId);
  const major = school?.majors.find(m => m.id === majorId);
  const programSelect = document.getElementById('cbt-filter-program');

  if (major && major.classPrograms.length > 0) {
    window.cbtAdminState.selectedProgramId = major.classPrograms[0].id;
    programSelect.innerHTML = major.classPrograms.map(cp => `<option value="${cp.id}">${cp.name}</option>`).join('');
    loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
  } else {
    window.cbtAdminState.selectedProgramId = '';
    programSelect.innerHTML = '<option value="">(Tidak ada Program Kelas)</option>';
    document.getElementById('cbt-program-config-slot').innerHTML = '<div class="alert alert-warning">Tidak ada Program Kelas pada Jurusan ini.</div>';
  }
}

function onCbtProgramFilterChange(programId) {
  window.cbtAdminState.selectedProgramId = programId;
  loadCbtProgramExamDetails(programId);
}

async function loadCbtProgramExamDetails(classProgramId) {
  const slot = document.getElementById('cbt-program-config-slot');
  if (!slot) return;

  slot.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat konfigurasi ujian...</div>';

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/by-program/${classProgramId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data ujian Program Kelas.');

    const { classProgram, exam } = res.data;
    window.cbtAdminState.currentExam = exam;

    if (!exam) {
      // Belum dibuat
      slot.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 2px dashed var(--border-subtle); border-radius: var(--radius-xl); padding: 40px 24px; text-align: center;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 16px;">
            <i class="fa-solid fa-laptop-file"></i>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-heading); margin-bottom: 6px;">Ujian CBT Belum Dibuat</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 500px; margin: 0 auto 20px;">
            Program Kelas <strong>${classProgram.schoolName} &bull; ${classProgram.majorName} &bull; ${classProgram.name}</strong> belum memiliki konfigurasi ujian online.
          </p>
          <button type="button" class="btn btn-primary" onclick="openCreateExamModal('${classProgram.id}', '${classProgram.name.replace(/'/g, "\\'")}')" style="display: inline-flex; align-items: center; gap: 8px;">
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
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-600); text-transform: uppercase;">Konfigurasi CBT — ${classProgram.name}</div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-heading); margin: 2px 0;">${exam.title || `Ujian CBT ${classProgram.name}`}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${classProgram.schoolName} &bull; ${classProgram.majorName}</div>
          </div>
          <div>
            ${exam.isActive ? '<span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-circle-check"></i> Ujian Aktif</span>' : '<span class="badge badge-secondary" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-pause"></i> Ujian Nonaktif</span>'}
          </div>
        </div>

        <form id="form-exam-settings" onsubmit="handleSaveExamSettings(event, '${exam.id}')" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) auto; gap: 16px; align-items: flex-end; background: var(--bg-body); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          
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
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Soal hanya akan muncul pada ujian Program Kelas ini</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="downloadQuestionTemplate()" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-arrow-down"></i> Template CSV
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="exportQuestionsToCSV('${exam.id}', '${escapeHtml(exam.title || 'Soal_Ujian')}')" style="display: inline-flex; align-items: center; gap: 6px;">
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
                          ${(q.options || []).map((opt, oIdx) => `
                            <span style="padding: 2px 8px; border-radius: 4px; background: ${opt.isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-body)'}; color: ${opt.isCorrect ? '#15803d' : 'var(--text-muted)'}; border: 1px solid ${opt.isCorrect ? '#22c55e' : 'var(--border-subtle)'}; font-weight: ${opt.isCorrect ? '700' : '500'};">
                              ${String.fromCharCode(65 + oIdx)}. ${escapeHtml(opt.content)} ${opt.isCorrect ? '✓' : ''}
                            </span>
                          `).join('')}
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

  } catch (err) {
    slot.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ----------------------------------------------------------------------------
// EXAM SETTINGS & QUESTION MODALS
// ----------------------------------------------------------------------------

function openCreateExamModal(classProgramId, programName) {
  const bodyHtml = `
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">Program Kelas: <strong>${programName}</strong></p>

    <form onsubmit="handleCreateExamSubmit(event, '${classProgramId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Judul Ujian</label>
        <input type="text" id="new-exam-title" class="form-control" value="Ujian CBT — ${programName}" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 4px; display: block;">Durasi Ujian (Menit)</label>
        <input type="number" id="new-exam-duration" class="form-control" value="60" min="5" max="360" required style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
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

async function handleCreateExamSubmit(e, classProgramId) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-create-exam');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const title = document.getElementById('new-exam-title')?.value.trim();
  const durationMinutes = Number(document.getElementById('new-exam-duration')?.value);
  const isActive = document.getElementById('new-exam-status')?.value === 'true';

  try {
    const res = await apiRequest('/api/cbt/admin/exams', {
      method: 'POST',
      body: { classProgramId, title, durationMinutes, isActive },
    });
    if (res.success) {
      showToast('Ujian CBT berhasil dibuat!', 'success');
      closeModal();
      // Invalidate cached structure to update badge
      window.cbtAdminState.cachedStructure = [];
      loadCbtProgramExamDetails(classProgramId);
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

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}`, {
      method: 'PATCH',
      body: { durationMinutes, isActive },
    });
    if (res.success) {
      showToast('Pengaturan ujian berhasil disimpan!', 'success');
      window.cbtAdminState.cachedStructure = [];
      loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
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

    if (initialHtml) {
      window._questionQuill.root.innerHTML = initialHtml;
    }
  }, 120);
}

function openAddQuestionModal(examId) {
  const bodyHtml = `
    <form onsubmit="handleSaveQuestionSubmit(event, '${examId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">Jenis Soal</label>
        <select id="q-type" class="form-select" onchange="toggleQuestionTypeFields(this.value)" style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="MULTIPLE_CHOICE" selected>Pilihan Ganda</option>
          <option value="ESSAY">Essay</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
          Pertanyaan & Butir Soal (Rich Text)
        </label>
        <div id="q-text-editor"></div>
        <input type="hidden" id="q-text">
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
          Gunakan toolbar di atas untuk format teks, tata letak, gambar, atau rumus matematika (&Sigma;, &radic;).
        </small>
      </div>

      <!-- Multiple Choice Options Box -->
      <div id="box-mc-options" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px;">
        <label style="font-weight: 700; font-size: 0.875rem; margin-bottom: 10px; display: block; color: var(--text-heading);">
          Pilihan Jawaban (Minimal 4 Opsi):
        </label>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${['A', 'B', 'C', 'D', 'E'].map((letter, idx) => `
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="radio" name="mc-correct-key" value="${idx}" id="radio-opt-${idx}" ${idx === 0 ? 'checked' : ''} style="cursor: pointer;" title="Pilih sebagai kunci jawaban yang benar">
              <span style="font-weight: 700; width: 20px; text-align: center; color: var(--primary-600);">${letter}.</span>
              <input type="text" class="form-control mc-option-input" id="opt-input-${idx}" placeholder="Pilihan jawaban ${letter}${idx === 4 ? ' (Opsional)' : ''}" ${idx < 4 ? 'required' : ''} style="flex: 1; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>
          `).join('')}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 8px;">
          * Pilih radio button pada opsi yang merupakan <strong>Jawaban Benar</strong>.
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

  openModal('Tambah Soal Baru', bodyHtml, 'modal-lg');
  initQuestionQuill('');
}

function toggleQuestionTypeFields(type) {
  const mcBox = document.getElementById('box-mc-options');
  const scoreLbl = document.getElementById('lbl-score');
  if (type === 'ESSAY') {
    if (mcBox) mcBox.style.display = 'none';
    if (scoreLbl) scoreLbl.innerText = 'Nilai Maksimal Soal Essay';
    // Remove required from MC inputs
    document.querySelectorAll('.mc-option-input').forEach(inp => inp.required = false);
  } else {
    if (mcBox) mcBox.style.display = 'block';
    if (scoreLbl) scoreLbl.innerText = 'Nilai / Bobot Soal Pilihan Ganda';
    // Add required back to first 4 MC inputs
    for (let i = 0; i < 4; i++) {
      const inp = document.getElementById(`opt-input-${i}`);
      if (inp) inp.required = true;
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

  const payload = { type, question, score };

  if (type === 'MULTIPLE_CHOICE') {
    const selectedRadio = document.querySelector('input[name="mc-correct-key"]:checked');
    const correctIdx = selectedRadio ? Number(selectedRadio.value) : 0;

    const options = [];
    for (let i = 0; i < 5; i++) {
      const val = document.getElementById(`opt-input-${i}`)?.value.trim();
      if (val) {
        options.push({
          content: val,
          isCorrect: (i === correctIdx),
          orderNumber: i + 1,
        });
      }
    }

    if (options.length < 4) {
      showToast('Soal Pilihan Ganda minimal harus memiliki 4 pilihan jawaban.', 'danger');
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
      loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
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

  const bodyHtml = `
    <form onsubmit="handleSaveQuestionSubmit(event, '${exam.id}', '${questionId}')">
      
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 4px; display: block;">Jenis Soal</label>
        <input type="text" class="form-control" value="${q.type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Essay'}" disabled style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--bg-body); color: var(--text-dim); border-radius: var(--radius-md);">
        <input type="hidden" id="q-type" value="${q.type}">
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
          Pertanyaan & Butir Soal (Rich Text)
        </label>
        <div id="q-text-editor"></div>
        <input type="hidden" id="q-text">
        <small style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px; display: block;">
          Gunakan toolbar di atas untuk format teks, tata letak, gambar, atau rumus matematika (&Sigma;, &radic;).
        </small>
      </div>

      <!-- Multiple Choice Options Box -->
      ${q.type === 'MULTIPLE_CHOICE' ? `
        <div id="box-mc-options" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px;">
          <label style="font-weight: 700; font-size: 0.875rem; margin-bottom: 10px; display: block; color: var(--text-heading);">
            Pilihan Jawaban (Minimal 4 Opsi):
          </label>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${['A', 'B', 'C', 'D', 'E'].map((letter, idx) => {
              const opt = q.options && q.options[idx] ? q.options[idx] : null;
              const isChecked = opt ? opt.isCorrect : (idx === 0);
              const content = opt ? opt.content : '';
              return `
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="radio" name="mc-correct-key" value="${idx}" id="radio-opt-${idx}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
                  <span style="font-weight: 700; width: 20px; text-align: center; color: var(--primary-600);">${letter}.</span>
                  <input type="text" class="form-control mc-option-input" id="opt-input-${idx}" value="${escapeHtml(content)}" placeholder="Pilihan jawaban ${letter}${idx === 4 ? ' (Opsional)' : ''}" ${idx < 4 ? 'required' : ''} style="flex: 1; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
              `;
            }).join('')}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 8px;">
            * Pilih radio button pada opsi yang merupakan <strong>Jawaban Benar</strong>.
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

  openModal('Edit Soal', bodyHtml, 'modal-lg');
  initQuestionQuill(q.question);
}

async function handleDeleteQuestion(questionId) {
  if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;

  try {
    const res = await apiRequest(`/api/cbt/admin/questions/${questionId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Soal berhasil dihapus.', 'success');
      loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
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
                            <button type="button" class="btn btn-xs btn-outline-danger" onclick="openResetCbtModal('${att.id}', '${escapeHtml(row.candidateName)}')" title="Reset Ujian Peserta">
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
                        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-md); background: ${bg}; border: 1px solid ${border};">
                          <strong style="width: 20px; color: var(--primary-600);">${String.fromCharCode(65 + oIdx)}.</strong>
                          <span>${escapeHtml(opt.content)}</span>
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

function downloadQuestionTemplate() {
  const headers = ['type', 'question', 'score', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_key'];
  const sampleRows = [
    ['MULTIPLE_CHOICE', 'Berapa hasil dari 15 + 25?', '5', '30', '35', '40', '45', '50', 'C'],
    ['MULTIPLE_CHOICE', 'Rukun iman yang kedua adalah beriman kepada...?', '5', 'Allah SWT', 'Malaikat-malaikat Allah', 'Kitab-kitab Allah', 'Rasul-rasul Allah', 'Hari Kiamat', 'B'],
    ['MULTIPLE_CHOICE', 'Ibu kota negara Indonesia saat ini adalah...?', '5', 'Surabaya', 'Bandung', 'Jakarta', 'Nusantara', 'Medan', 'C'],
    ['ESSAY', 'Jelaskan secara singkat apa yang dimaksud dengan Ihsan menurut hadits Jibril!', '10', '', '', '', '', '', ''],
    ['ESSAY', 'Sebutkan 5 rukun Islam secara berurutan!', '10', '', '', '', '', '', ''],
  ];

  const csvContent = '\uFEFF' + [
    headers.map(h => `"${h}"`).join(','),
    ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_import_soal_cbt.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportQuestionsToCSV(examId, examTitle) {
  try {
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal mengambil data soal ujian.');

    const exam = res.data;
    const questions = exam.questions || [];

    if (questions.length === 0) {
      showToast('Ujian ini belum memiliki soal untuk diekspor.', 'warning');
      return;
    }

    const headers = ['type', 'question', 'score', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_key'];
    const rows = questions.map(q => {
      const type = q.type;
      const questionText = q.question.replace(/<[^>]*>?/gm, '').trim() || q.question;
      const score = Number(q.score);
      const opts = q.options || [];

      let optA = '', optB = '', optC = '', optD = '', optE = '';
      let correctKey = '';

      if (type === 'MULTIPLE_CHOICE') {
        optA = opts[0]?.content || '';
        optB = opts[1]?.content || '';
        optC = opts[2]?.content || '';
        optD = opts[3]?.content || '';
        optE = opts[4]?.content || '';

        const correctIdx = opts.findIndex(o => o.isCorrect);
        if (correctIdx >= 0) {
          correctKey = String.fromCharCode(65 + correctIdx);
        }
      }

      return [type, questionText, score, optA, optB, optC, optD, optE, correctKey];
    });

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const cleanTitle = (examTitle || 'Soal_Ujian').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `soal_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message || 'Gagal mengekspor soal.', 'danger');
  }
}

function parseCsvToRows(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') {
      rows.push(currentRow);
    }
  }
  return rows;
}

function parseCsvToQuestions(csvText) {
  const rawRows = parseCsvToRows(csvText);
  if (!rawRows || rawRows.length < 2) {
    throw new Error('File CSV kosong atau tidak memiliki baris data soal.');
  }

  const headers = rawRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const questions = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] !== undefined ? row[idx] : '';
    });

    const typeRaw = (rowObj.type || rowObj.question_type || rowObj.jenis_soal || row[0] || '').toUpperCase().trim();
    const type = (typeRaw.includes('ESSAY') || typeRaw.includes('ESAI')) ? 'ESSAY' : 'MULTIPLE_CHOICE';
    const questionText = rowObj.question || rowObj.pertanyaan || rowObj.soal || row[1] || '';
    if (!questionText) continue;

    const score = parseFloat(rowObj.score || rowObj.nilai || rowObj.bobot || row[2] || '5') || 5;

    if (type === 'ESSAY') {
      questions.push({
        type: 'ESSAY',
        question: questionText,
        score: score,
        options: [],
      });
    } else {
      const optA = rowObj.option_a || rowObj.opsi_a || rowObj.pilihan_a || row[3] || '';
      const optB = rowObj.option_b || rowObj.opsi_b || rowObj.pilihan_b || row[4] || '';
      const optC = rowObj.option_c || rowObj.opsi_c || rowObj.pilihan_c || row[5] || '';
      const optD = rowObj.option_d || rowObj.opsi_d || rowObj.pilihan_d || row[6] || '';
      const optE = rowObj.option_e || rowObj.opsi_e || rowObj.pilihan_e || row[7] || '';

      const correctKeyRaw = (rowObj.correct_key || rowObj.kunci_jawaban || rowObj.kunci || row[8] || 'A').toUpperCase().trim();
      let correctIdx = 0;
      if (correctKeyRaw === 'B' || correctKeyRaw === '1') correctIdx = 1;
      else if (correctKeyRaw === 'C' || correctKeyRaw === '2') correctIdx = 2;
      else if (correctKeyRaw === 'D' || correctKeyRaw === '3') correctIdx = 3;
      else if (correctKeyRaw === 'E' || correctKeyRaw === '4') correctIdx = 4;

      const rawOpts = [optA, optB, optC, optD, optE].filter(o => o !== '');
      if (rawOpts.length < 2) {
        throw new Error(`Baris ${r + 1}: Soal pilihan ganda minimal harus memiliki 2 opsi jawaban.`);
      }

      const options = rawOpts.map((content, idx) => ({
        content,
        isCorrect: idx === correctIdx,
        orderNumber: idx + 1,
      }));

      if (!options.some(o => o.isCorrect)) {
        options[0].isCorrect = true;
      }

      questions.push({
        type: 'MULTIPLE_CHOICE',
        question: questionText,
        score: score,
        options: options,
      });
    }
  }

  if (questions.length === 0) {
    throw new Error('Tidak ada data soal yang valid ditemukan.');
  }

  return questions;
}

window.parsedImportQuestions = [];

function openImportQuestionsModal(examId) {
  window.parsedImportQuestions = [];

  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="alert alert-info" style="font-size: 0.85rem; padding: 12px 16px; margin: 0; display: flex; align-items: flex-start; gap: 10px;">
        <i class="fa-solid fa-circle-info" style="font-size: 1.1rem; margin-top: 2px;"></i>
        <div>
          <strong>Panduan Import Soal CSV:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
            <li>Gunakan format file <strong>CSV (Comma Separated Values)</strong> dengan encoding UTF-8.</li>
            <li>Kolom yang dibutuhkan: <code>type, question, score, option_a, option_b, option_c, option_d, option_e, correct_key</code>.</li>
            <li>Nilai kolom <code>type</code>: <code>MULTIPLE_CHOICE</code> untuk pilihan ganda, atau <code>ESSAY</code> untuk soal esai.</li>
            <li>Untuk soal esai, biarkan kolom opsi dan kunci jawaban kosong.</li>
          </ul>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="downloadQuestionTemplate()" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-download"></i> Download Template CSV
        </button>
      </div>

      <div class="form-group" style="margin: 0;">
        <label class="form-label" style="font-weight: 700; font-size: 0.875rem; margin-bottom: 6px; display: block;">
          Pilih File CSV
        </label>
        <input type="file" id="import-csv-file" accept=".csv,text/csv" class="form-control" onchange="handleCsvFileSelected(event)" style="padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); width: 100%;">
      </div>

      <div id="import-preview-container" style="display: none;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-heading); margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-list-check" style="color: var(--primary-600);"></i> Preview Soal yang Akan Diimpor (<span id="import-preview-count">0</span> Soal)
        </h4>
        <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-body); padding: 8px;">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; color: var(--text-heading);">
                <th style="padding: 6px 8px; width: 8%;">No</th>
                <th style="padding: 6px 8px; width: 16%;">Jenis</th>
                <th style="padding: 6px 8px; width: 56%;">Pertanyaan</th>
                <th style="padding: 6px 8px; width: 10%; text-align: center;">Nilai</th>
                <th style="padding: 6px 8px; width: 10%; text-align: center;">Kunci</th>
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

  openModal('Import Soal Ujian (CSV)', bodyHtml, 'modal-lg');
}

function handleCsvFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      const questions = parseCsvToQuestions(csvText);
      window.parsedImportQuestions = questions;

      const previewContainer = document.getElementById('import-preview-container');
      const previewCount = document.getElementById('import-preview-count');
      const previewTbody = document.getElementById('import-preview-tbody');
      const btnSubmit = document.getElementById('btn-submit-import');

      if (previewCount) previewCount.innerText = String(questions.length);

      if (previewTbody) {
        previewTbody.innerHTML = questions.map((q, idx) => {
          let correctKeyStr = '-';
          if (q.type === 'MULTIPLE_CHOICE') {
            const correctIdx = (q.options || []).findIndex(o => o.isCorrect);
            if (correctIdx >= 0) correctKeyStr = String.fromCharCode(65 + correctIdx);
          }
          return `
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 6px 8px; font-weight: 700;">${idx + 1}</td>
              <td style="padding: 6px 8px;">
                <span class="badge ${q.type === 'MULTIPLE_CHOICE' ? 'badge-primary' : 'badge-info'}" style="font-size: 0.7rem;">
                  ${q.type === 'MULTIPLE_CHOICE' ? 'PG' : 'ESSAY'}
                </span>
              </td>
              <td style="padding: 6px 8px; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(q.question)}
              </td>
              <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #16a34a;">${q.score}</td>
              <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: var(--primary-600);">${correctKeyStr}</td>
            </tr>
          `;
        }).join('');
      }

      if (previewContainer) previewContainer.style.display = 'block';
      if (btnSubmit) btnSubmit.disabled = false;

      showToast(`Berhasil membaca ${questions.length} butir soal dari file CSV.`, 'success');
    } catch (err) {
      showToast(err.message || 'Gagal memproses file CSV.', 'danger');
      window.parsedImportQuestions = [];
      const btnSubmit = document.getElementById('btn-submit-import');
      if (btnSubmit) btnSubmit.disabled = true;
      const previewContainer = document.getElementById('import-preview-container');
      if (previewContainer) previewContainer.style.display = 'none';
    }
  };
  reader.readAsText(file, 'UTF-8');
}

async function handleProcessImportQuestions(examId) {
  const questions = window.parsedImportQuestions;
  if (!questions || questions.length === 0) {
    showToast('Tidak ada data soal yang siap diimpor.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-submit-import');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor Soal...';
  }

  try {
    const res = await apiRequest(`/api/cbt/admin/exams/${examId}/questions/import`, {
      method: 'POST',
      body: { questions },
    });

    if (res.success) {
      showToast(`Berhasil mengimpor ${questions.length} butir soal!`, 'success');
      closeModal();
      // Reload exam questions using current active classProgramId
      if (window.cbtAdminState && window.cbtAdminState.selectedProgramId) {
        loadCbtProgramExamDetails(window.cbtAdminState.selectedProgramId);
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
          <div style="display: flex; gap: 10px;">
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
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="openResetCbtModal('${row.attemptId}', '${escapeHtml(row.candidateName)}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Reset Ujian Peserta">
                              <i class="fa-solid fa-rotate-left"></i> Reset
                            </button>
                          </div>
                          
                          <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-sm btn-success" onclick="openVerifyCbtModal('${row.attemptId}', '${escapeHtml(row.candidateName)}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Luluskan Verifikasi CBT">
                              <i class="fa-solid fa-check"></i> Verifikasi
                            </button>
                            <button type="button" class="btn btn-sm btn-danger" onclick="openRejectCbtModal('${row.attemptId}', '${escapeHtml(row.candidateName)}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Tolak / Tidak Lulus CBT">
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

function openVerifyCbtModal(attemptId, candidateName) {
  const bodyHtml = `
    <form onsubmit="handleConfirmVerifyCbt(event, '${attemptId}')">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
          Apakah Anda yakin ingin <strong>Memverifikasi & Meluluskan</strong> ujian CBT untuk calon santri:
        </p>
        <div style="margin: 10px 0; padding: 12px 14px; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: var(--radius-md); font-weight: 700; color: #15803d; font-size: 1rem;">
          ${candidateName}
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

function openRejectCbtModal(attemptId, candidateName) {
  const bodyHtml = `
    <form onsubmit="handleConfirmRejectCbt(event, '${attemptId}')">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-main);">
          Apakah Anda yakin ingin menandai <strong>Ditolak / Tidak Lulus</strong> CBT untuk calon santri:
        </p>
        <div style="margin: 10px 0; padding: 12px 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--radius-md); font-weight: 700; color: #b91c1c; font-size: 1rem;">
          ${candidateName}
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
// 6. RESET UJIAN PESERTA CBT
// ============================================================================

function openResetCbtModal(attemptId, candidateName) {
  const bodyHtml = `
    <form onsubmit="handleConfirmResetCbt(event, '${attemptId}')">
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
          ${candidateName}
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
                          <button type="button" class="btn btn-sm btn-outline-danger" onclick="openResetCbtModal('${att.id}', '${escapeHtml(row.candidateName)}')" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
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
window.openCbtManageDirectly = openCbtManageDirectly;
window.onCbtSchoolFilterChange = onCbtSchoolFilterChange;
window.onCbtMajorFilterChange = onCbtMajorFilterChange;
window.onCbtProgramFilterChange = onCbtProgramFilterChange;
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
window.openImportQuestionsModal = openImportQuestionsModal;
window.handleCsvFileSelected = handleCsvFileSelected;
window.handleProcessImportQuestions = handleProcessImportQuestions;


