/**
 * ============================================================================
 * INTERVIEW MODULE — SUPER ADMIN INTERFACE (SIMPLIFIED & STREAMLINED)
 * ============================================================================
 * Screens Implemented:
 * - Screen 1: Dashboard Wawancara (3 Action Cards + 4 Stat Metrics + Jadwal Overview)
 * - Screen 2: Form Jadwal Wawancara (Nama Jadwal, Master, Pewawancara, Pilih Peserta, Tulis Pertanyaan Awal Langsung)
 * - Screen 3: Daftar Peserta dalam Jadwal (Filter Program & Status, Table Peserta)
 * - Screen 7: Hasil Wawancara (Tabel Rekap + Multi-filter)
 * - Screen 8: Detail Hasil Wawancara (Detail Lengkap Peserta, Pewawancara, Pertanyaan Awal & Spontan, Rekomendasi, Cetak)
 */

window.interviewAdminState = {
  activeAcademicPeriodId: '',
  periods: [],
  waves: [],
  interviewers: [],
  schedules: [],
  registrations: [],
  selectedRegistrationIds: [],
  questionsList: [],
  cachedDashboard: null,
};

// ============================================================================
// HELPER UTILITIES & MASTER DATA LOADER
// ============================================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showInterviewToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else if (typeof window.showGlobalAlert === 'function') {
    window.showGlobalAlert(message, type);
  } else {
    alert(message);
  }
}
if (!window.showGlobalAlert) window.showGlobalAlert = showInterviewToast;
if (!window.showToast) window.showToast = showInterviewToast;

async function fetchInterviewMasterData() {
  try {
    const [periodsRes, wavesRes, interviewersRes] = await Promise.all([
      apiRequest('/api/competitions/periods').catch(() => ({ success: false, data: [] })),
      apiRequest('/api/competitions/waves').catch(() => ({ success: false, data: [] })),
      apiRequest('/api/interview/admin/interviewers').catch(() => ({ success: false, data: [] })),
    ]);

    if (periodsRes.success && periodsRes.data) {
      const periods = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data.periods || []);
      const active = periods.find(p => p.isActive) || periods[0];
      if (active && !window.interviewAdminState.activeAcademicPeriodId) {
        window.interviewAdminState.activeAcademicPeriodId = active.id;
      }
      window.interviewAdminState.periods = periods;
    }
    if (wavesRes.success && wavesRes.data) {
      window.interviewAdminState.waves = Array.isArray(wavesRes.data) ? wavesRes.data : (wavesRes.data.waves || []);
    }
    if (interviewersRes.success && interviewersRes.data) {
      window.interviewAdminState.interviewers = Array.isArray(interviewersRes.data) ? interviewersRes.data : [];
    }
  } catch (err) {
    console.error('Error fetching master data:', err);
  }
}

function getScheduleDisplayStatus(sch) {
  if (!sch) return '<span class="badge" style="background:#f3f4f6; color:#6b7280; padding:4px 10px; border-radius:6px;">Draft</span>';

  if (sch.status === 'CANCELLED') {
    return '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-ban"></i> Dibatalkan</span>';
  }
  if (sch.status === 'COMPLETED') {
    return '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-circle-check"></i> Selesai</span>';
  }
  if (sch.status === 'DELAYED' || sch.status === 'SUSPENDED') {
    return '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-clock-rotate-left"></i> Tertunda</span>';
  }

  // Calculate dynamic status by schedule date & time
  if (sch.scheduleDate) {
    const now = new Date();
    const schDate = new Date(sch.scheduleDate);
    const isSameDay = now.toISOString().split('T')[0] === schDate.toISOString().split('T')[0];
    const isPast = schDate.toISOString().split('T')[0] < now.toISOString().split('T')[0];

    if (isSameDay) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (sch.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (sch.endTime || '17:00').split(':').map(Number);
      const startMinutes = (startH || 8) * 60 + (startM || 0);
      const endMinutes = (endH || 17) * 60 + (endM || 0);

      if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
        return '<span class="badge" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; font-weight:700; padding:4px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;"><span style="width:7px; height:7px; border-radius:50%; background:#0284c7; display:inline-block;"></span> Sedang Berlangsung</span>';
      } else if (nowMinutes > endMinutes) {
        return '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-circle-check"></i> Selesai</span>';
      }
    } else if (isPast) {
      return '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-circle-check"></i> Selesai</span>';
    }
  }

  return '<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-calendar-check"></i> Terjadwal</span>';
}
window.getScheduleDisplayStatus = getScheduleDisplayStatus;

function getInterviewerNamesDisplay(sch) {
  if (!sch || !sch.interviewers || sch.interviewers.length === 0) {
    return '<span style="color:#ef4444; font-style:italic;">Belum ditentukan</span>';
  }
  const names = sch.interviewers.map(i => {
    return escapeHtml(i.interviewer?.name || i.user?.name || i.name || '');
  }).filter(Boolean);

  return names.length > 0 ? `<strong>${names.join(', ')}</strong>` : '<span style="color:#ef4444; font-style:italic;">Belum ditentukan</span>';
}

function getRecommendationBadge(rec) {
  switch (rec) {
    case 'HIGHLY_RECOMMENDED':
      return '<span class="status-badge" style="background:#dcfce7; color:#15803d; border: 1px solid #86efac; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-star"></i> Sangat Direkomendasikan</span>';
    case 'RECOMMENDED':
      return '<span class="status-badge" style="background:#e0f2fe; color:#0369a1; border: 1px solid #7dd3fc; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-thumbs-up"></i> Direkomendasikan</span>';
    case 'CONSIDERED':
      return '<span class="status-badge" style="background:#fef3c7; color:#b45309; border: 1px solid #fde68a; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-question"></i> Dipertimbangkan</span>';
    case 'NOT_RECOMMENDED':
      return '<span class="status-badge" style="background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-xmark"></i> Tidak Direkomendasikan</span>';
    default:
      return '<span class="status-badge" style="background:#f3f4f6; color:#6b7280; padding: 4px 10px; border-radius: 9999px;">Belum Dinilai</span>';
  }
}
window.getRecommendationBadge = getRecommendationBadge;

function getInterviewStatusBadge(status) {
  switch (status) {
    case 'COMPLETED':
      return '<span class="status-badge" style="background:#dcfce7; color:#15803d; border: 1px solid #86efac; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-check-double"></i> Selesai</span>';
    case 'IN_PROGRESS':
      return '<span class="status-badge" style="background:#e0f2fe; color:#0284c7; border: 1px solid #38bdf8; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-spinner fa-spin"></i> Sedang Wawancara</span>';
    case 'CHECKED_IN':
      return '<span class="status-badge" style="background:#fef3c7; color:#d97706; border: 1px solid #fde047; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-user-check"></i> Hadir / Menunggu</span>';
    case 'SCHEDULED':
      return '<span class="status-badge" style="background:#f1f5f9; color:#475569; border: 1px solid #cbd5e1; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-calendar-check"></i> Terjadwal</span>';
    case 'ABSENT':
      return '<span class="status-badge" style="background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5; font-weight:700; padding: 4px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-user-xmark"></i> Tidak Hadir</span>';
    default:
      return `<span class="status-badge" style="background:#f3f4f6; color:#6b7280; padding: 4px 10px; border-radius: 9999px;">${escapeHtml(status || 'Belum Dijadwalkan')}</span>`;
  }
}
window.getInterviewStatusBadge = getInterviewStatusBadge;

// ============================================================================
// SCREEN 1: DASHBOARD WAWANCARA (SUPER ADMIN)
// ============================================================================

async function renderInterviewAdminDashboard() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Memuat Dashboard Wawancara...</p>
    </div>
  `;

  try {
    await fetchInterviewMasterData();
    const periodParam = window.interviewAdminState.activeAcademicPeriodId ? `?academicPeriodId=${window.interviewAdminState.activeAcademicPeriodId}` : '';
    const res = await apiRequest(`/api/interview/admin/dashboard${periodParam}`);
    const schedulesRes = await apiRequest('/api/interview/admin/schedules');

    const data = (res.success && res.data) ? res.data : {};
    const summary = data.summary || {};
    const schedules = (schedulesRes.success && Array.isArray(schedulesRes.data)) ? schedulesRes.data : [];

    const totalJadwal = schedules.length;
    const totalPeserta = summary.totalRegistrants || summary.totalParticipants || 0;
    const selesaiCount = summary.completed || 0;
    const pendingCount = (summary.scheduled || 0) + (summary.checkedIn || 0) + (summary.inProgress || 0);

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Header Banner -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.65rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-comments" style="color: var(--primary-600);"></i>
              Dashboard Wawancara
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
              Kelola jadwal wawancara, penugasan pewawancara, dan hasil seleksi santri
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="openCreateScheduleModal()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 10px 18px; border-radius: 10px;">
              <i class="fa-solid fa-plus"></i> Buat Jadwal Baru
            </button>
          </div>
        </div>

        <!-- 3 MAIN ACTION CARDS (Screen 1 Reference) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 28px;">
          
          <!-- Card 1: Jadwal Wawancara -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;">
            <div>
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(59, 130, 246, 0.12); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 16px;">
                <i class="fa-solid fa-calendar-week"></i>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">
                Jadwal Wawancara
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">
                Kelola jadwal sesi wawancara, alokasi pewawancara, peserta, dan pertanyaan awal.
              </p>
            </div>
            <a href="#interview-schedules" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 16px; border-radius: 8px; width: 100%;">
              <i class="fa-solid fa-arrow-right"></i> Lihat Jadwal Wawancara
            </a>
          </div>

          <!-- Card 2: Pewawancara -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;">
            <div>
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(16, 185, 129, 0.12); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 16px;">
                <i class="fa-solid fa-user-tie"></i>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">
                Pewawancara
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">
                Kelola akun pewawancara, beban tugas sesi, dan status keaktifan penguji.
              </p>
            </div>
            <a href="#interview-interviewers" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 16px; border-radius: 8px; width: 100%;">
              <i class="fa-solid fa-arrow-right"></i> Lihat Pewawancara
            </a>
          </div>

          <!-- Card 3: Hasil Wawancara -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;">
            <div>
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(245, 158, 11, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 16px;">
                <i class="fa-solid fa-square-poll-vertical"></i>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">
                Hasil Wawancara
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">
                Pantau catatan terperinci, rekomendasi penguji, dan status kelulusan santri.
              </p>
            </div>
            <a href="#interview-results" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 16px; border-radius: 8px; width: 100%;">
              <i class="fa-solid fa-arrow-right"></i> Lihat Hasil Wawancara
            </a>
          </div>

        </div>

        <!-- 4 STAT SUMMARY CARDS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px;">
          
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
              <i class="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Jadwal</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${totalJadwal}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Sesi Dibuat</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(99, 102, 241, 0.1); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Peserta</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${totalPeserta}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Calon Santri</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
              <i class="fa-solid fa-check-double"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Selesai Dinilai</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #16a34a; line-height: 1.2;">${selesaiCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Hasil Tersimpan</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(245, 158, 11, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0;">
              <i class="fa-solid fa-hourglass-half"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Menunggu / Proses</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #d97706; line-height: 1.2;">${pendingCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Belum Selesai</div>
            </div>
          </div>

        </div>

        <!-- Recent Schedules Table -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 22px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-check" style="color: var(--primary-600);"></i> Daftar Sesi Jadwal Wawancara
            </h3>
            <a href="#interview-schedules" style="font-size: 0.85rem; font-weight: 700; color: var(--primary-600); text-decoration: none;">
              Kelola Semua Jadwal &rarr;
            </a>
          </div>

          ${schedules.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: var(--bg-body); border-radius: 12px;">
              <i class="fa-solid fa-calendar-xmark" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 10px;"></i>
              <p style="margin: 0; font-size: 0.95rem; font-weight: 600;">Belum ada sesi jadwal wawancara yang dibuat.</p>
              <button onclick="openCreateScheduleModal()" class="btn btn-primary" style="margin-top: 14px;">
                <i class="fa-solid fa-plus"></i> Buat Jadwal Pertama
              </button>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                    <th style="padding: 12px 16px;">Nama Jadwal & Ruangan</th>
                    <th style="padding: 12px 16px;">Waktu Pelaksanaan</th>
                    <th style="padding: 12px 16px;">Pewawancara</th>
                    <th style="padding: 12px 16px; text-align: center;">Status</th>
                    <th style="padding: 12px 16px; text-align: center;">Peserta</th>
                    <th style="padding: 12px 16px; text-align: center;">Aksi</th>
                  </tr>
                </thead>
                <tbody style="font-size: 0.875rem;">
                  ${schedules.slice(0, 5).map(sch => {
      const dateStr = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      const interviewersStr = getInterviewerNamesDisplay(sch);
      const count = sch._count?.interviews || (sch.interviews ? sch.interviews.length : 0);

      return `
                      <tr style="border-bottom: 1px solid var(--border-subtle);">
                        <td style="padding: 14px 16px;">
                          <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
                            ${escapeHtml(sch.name || sch.roomLocation || 'Jadwal Wawancara')}
                          </div>
                          <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">
                            <i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || '-')}
                          </div>
                        </td>
                        <td style="padding: 14px 16px;">
                          <div style="font-weight: 600; color: var(--text-heading);">${dateStr}</div>
                          <div style="font-size: 0.775rem; color: var(--text-muted);">${sch.startTime} - ${sch.endTime} WIB</div>
                        </td>
                        <td style="padding: 14px 16px; font-size: 0.85rem;">
                          ${interviewersStr}
                        </td>
                        <td style="padding: 14px 16px; text-align: center;">
                          ${getScheduleDisplayStatus(sch)}
                        </td>
                        <td style="padding: 14px 16px; text-align: center;">
                          <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563eb; font-weight: 800; padding: 4px 10px; border-radius: 9999px;">
                            ${count} Peserta
                          </span>
                        </td>
                        <td style="padding: 14px 16px; text-align: center;">
                          <a href="#interview-schedule-participants/${sch.id}" class="btn btn-sm btn-secondary" style="text-decoration: none; padding: 6px 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-users"></i> Lihat Peserta
                          </a>
                        </td>
                      </tr>
                    `;
    }).join('')}
                </tbody>
              </table>
            </div>
          `}

        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">${err.message}</div>`;
  }
}

// ============================================================================
// SCREEN 2: FORM BUAT / EDIT JADWAL WAWANCARA (SUPER ADMIN)
// ============================================================================

window.interviewScheduleFormState = {
  scheduleId: null,
  questions: [],
  selectedRegistrationIds: [],
  allAvailableRegistrations: [],
};

async function renderInterviewSchedulesView(paramId = null) {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Jadwal Wawancara...</p>
    </div>
  `;

  try {
    await fetchInterviewMasterData();
    const res = await apiRequest('/api/interview/admin/schedules');
    const schedules = (res.success && Array.isArray(res.data)) ? res.data : [];
    window.interviewAdminState.schedules = schedules;

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-calendar-week" style="color: var(--primary-600);"></i>
              Jadwal Wawancara
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Buat jadwal, tentukan pewawancara, pilih peserta, dan tulis pertanyaan awal langsung.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="openCreateScheduleModal()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 10px 18px; border-radius: 10px;">
              <i class="fa-solid fa-plus"></i> Buat Jadwal Wawancara
            </button>
          </div>
        </div>

        <!-- Schedule Cards List -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          ${schedules.length === 0 ? `
            <div class="card" style="padding: 50px 20px; text-align: center; color: var(--text-muted); border-radius: var(--radius-xl, 16px);">
              <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px;"></i>
              <h3 style="margin: 0 0 6px 0; color: var(--text-heading); font-size: 1.2rem; font-weight: 800;">Belum Ada Jadwal Wawancara</h3>
              <p style="margin: 0 0 18px 0; font-size: 0.9rem;">Mulai dengan membuat jadwal wawancara baru dan menentukan pewawancara serta peserta.</p>
              <button onclick="openCreateScheduleModal()" class="btn btn-primary" style="padding: 10px 20px; font-weight: 700;">
                <i class="fa-solid fa-plus"></i> Buat Jadwal Baru
              </button>
            </div>
          ` : schedules.map(sch => {
      const dateStr = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
      const participantCount = sch._count?.interviews || (sch.interviews ? sch.interviews.length : 0);
      const interviewerNames = getInterviewerNamesDisplay(sch);

      let questionsCount = 0;
      if (sch.questionsJson) {
        try {
          const parsed = JSON.parse(sch.questionsJson);
          questionsCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) { }
      }

      return `
              <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 22px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                  
                  <div style="flex: 1; min-width: 300px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                      <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">
                        ${escapeHtml(sch.name || sch.roomLocation || 'Jadwal Wawancara')}
                      </h3>
                      ${getScheduleDisplayStatus(sch)}
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 18px; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 12px;">
                      <div><i class="fa-solid fa-calendar-day" style="color: var(--primary-600); width: 16px;"></i> ${dateStr}</div>
                      <div><i class="fa-regular fa-clock" style="color: var(--primary-600); width: 16px;"></i> ${sch.startTime} - ${sch.endTime} WIB</div>
                      <div><i class="fa-solid fa-location-dot" style="color: var(--primary-600); width: 16px;"></i> ${escapeHtml(sch.roomLocation || '-')}</div>
                      <div><i class="fa-solid fa-clipboard-question" style="color: var(--primary-600); width: 16px;"></i> <strong>${questionsCount}</strong> Pertanyaan Awal</div>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--text-main); background: var(--bg-body); padding: 10px 14px; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px;">
                      <strong style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Pewawancara:</strong>
                      <span>${interviewerNames}</span>
                    </div>
                  </div>

                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                    <div style="text-align: right;">
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Peserta Terdaftar</div>
                      <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary-600);">
                        ${participantCount} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">Santri</span>
                      </div>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <a href="#interview-schedule-participants/${sch.id}" class="btn btn-secondary" style="text-decoration: none; padding: 7px 14px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem;">
                        <i class="fa-solid fa-users"></i> Daftar Peserta
                      </a>
                      <button onclick="openEditScheduleModal('${sch.id}')" class="btn btn-secondary" style="padding: 7px 12px; font-weight: 700;" title="Edit Jadwal">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                      </button>
                      <button onclick="handleDeleteSchedule('${sch.id}')" class="btn btn-danger" style="padding: 7px 12px; font-weight: 700;" title="Hapus Jadwal">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            `;
    }).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">${err.message}</div>`;
  }
}

// Open Schedule Modal (Create / Edit)
async function openCreateScheduleModal() {
  openScheduleFormModal(null);
}

async function openEditScheduleModal(scheduleId) {
  openScheduleFormModal(scheduleId);
}

async function openScheduleFormModal(scheduleId = null) {
  const modal = document.getElementById('app-modal');
  const modalBody = document.getElementById('app-modal-body');
  if (!modal || !modalBody) return;

  // Enlarge modal width for full form
  modalBody.style.maxWidth = '850px';

  modalBody.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 10px; font-weight: 600;">Menyiapkan Form Jadwal Wawancara...</p>
    </div>
  `;
  modal.style.display = 'flex';

  try {
    await fetchInterviewMasterData();

    // Fetch existing schedule if edit
    let existing = null;
    if (scheduleId) {
      const schRes = await apiRequest(`/api/interview/admin/schedules/${scheduleId}`);
      if (schRes.success && schRes.data) {
        existing = schRes.data;
      }
    }

    // Fetch participants for selection
    const partsRes = await apiRequest('/api/interview/admin/participants?perPage=200');
    const allRegistrations = (partsRes.success && partsRes.data && Array.isArray(partsRes.data.data))
      ? partsRes.data.data
      : (partsRes.success && Array.isArray(partsRes.data) ? partsRes.data : []);

    window.interviewScheduleFormState.scheduleId = scheduleId;
    window.interviewScheduleFormState.allAvailableRegistrations = allRegistrations;

    // Prefill questions
    let initialQuestions = ['Motivasi masuk pesantren dan komitmen belajar', 'Kemampuan dasar membaca Al-Qur\'an', 'Kemandirian dan kesiapan tinggal di asrama'];
    if (existing?.questionsJson) {
      try {
        const parsed = JSON.parse(existing.questionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialQuestions = parsed.map(q => typeof q === 'string' ? q : (q.questionText || q.question || ''));
        }
      } catch (e) { }
    }
    window.interviewScheduleFormState.questions = initialQuestions;

    // Prefill selected registrations
    let selectedRegs = [];
    if (existing?.interviews) {
      selectedRegs = existing.interviews.map(i => i.registrationId);
    }
    window.interviewScheduleFormState.selectedRegistrationIds = selectedRegs;

    const defaultDate = existing?.scheduleDate ? new Date(existing.scheduleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const defaultStartTime = existing?.startTime || '08:00';
    const defaultEndTime = existing?.endTime || '12:00';
    const defaultLocation = existing?.roomLocation || 'Ruang Wawancara 1';
    const defaultName = existing?.name || (scheduleId ? '' : 'Wawancara Gelombang 1');
    const selectedInterviewerId = existing?.interviewers?.[0]?.interviewerUserId || '';

    const periods = window.interviewAdminState.periods || [];
    const waves = window.interviewAdminState.waves || [];
    const interviewers = window.interviewAdminState.interviewers || [];

    modalBody.innerHTML = `
      <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text-heading);">
            ${existing ? 'Edit Jadwal Wawancara' : 'Buat Jadwal Wawancara Baru'}
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 0.825rem; color: var(--text-muted);">
            Lengkapi data jadwal, tentukan pewawancara, pilih peserta, dan tulis pertanyaan awal.
          </p>
        </div>
        <button type="button" onclick="closeAppModal()" style="background: none; border: none; font-size: 1.3rem; color: var(--text-dim); cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form id="schedule-form" onsubmit="handleSaveSchedule(event)">
        
        <div style="display: flex; flex-direction: column; gap: 18px; max-height: 70vh; overflow-y: auto; padding-right: 8px;">
          
          <!-- SECTION A: INFO JADWAL -->
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-heading); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-info-circle" style="color: var(--primary-600);"></i> 1. Informasi Utama Jadwal
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div style="grid-column: span 2;">
                <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Nama Jadwal <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" id="sch-name" class="form-control" placeholder="Contoh: Wawancara Gelombang 1 - SMA Putra" value="${escapeHtml(defaultName)}" required>
              </div>

              <div>
                <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Tahun Pelajaran <span style="color: #ef4444;">*</span>
                </label>
                <select id="sch-period" class="form-control" required>
                  ${periods.map(p => `
                    <option value="${p.id}" ${p.id === (existing?.academicPeriodId || window.interviewAdminState.activeAcademicPeriodId) ? 'selected' : ''}>
                      ${escapeHtml(p.name)} ${p.isActive ? '(Aktif)' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Gelombang
                </label>
                <select id="sch-wave" class="form-control">
                  <option value="">Semua Gelombang</option>
                  ${waves.map(w => `
                    <option value="${w.id}" ${w.id === existing?.admissionWaveId ? 'selected' : ''}>
                      ${escapeHtml(w.name)}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Tanggal Pelaksanaan <span style="color: #ef4444;">*</span>
                </label>
                <input type="date" id="sch-date" class="form-control" value="${defaultDate}" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                    Jam Mulai <span style="color: #ef4444;">*</span>
                  </label>
                  <input type="time" id="sch-start-time" class="form-control" value="${defaultStartTime}" required>
                </div>
                <div>
                  <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                    Jam Selesai <span style="color: #ef4444;">*</span>
                  </label>
                  <input type="time" id="sch-end-time" class="form-control" value="${defaultEndTime}" required>
                </div>
              </div>

              <div style="grid-column: span 2;">
                <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                  Ruangan / Lokasi <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" id="sch-location" class="form-control" placeholder="Contoh: Gedung A - Ruang 101" value="${escapeHtml(defaultLocation)}" required>
              </div>
            </div>
          </div>

          <!-- SECTION B: TENTUKAN PEWAWANCARA -->
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-heading); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-user-tie" style="color: var(--primary-600);"></i> 2. Tentukan Pewawancara
            </div>

            <div>
              <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
                Pilih Pewawancara Bertugas <span style="color: #ef4444;">*</span>
              </label>
              <select id="sch-interviewer" class="form-control" required>
                <option value="">-- Pilih Akun Pewawancara --</option>
                ${interviewers.map(u => `
                  <option value="${u.id}" ${u.id === selectedInterviewerId ? 'selected' : ''}>
                    ${escapeHtml(u.name)} (${escapeHtml(u.email || u.phoneNumber || 'Penguji')})
                  </option>
                `).join('')}
              </select>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                Akun pewawancara akan mendapatkan akses untuk melihat antrean dan menilai peserta di jadwal ini.
              </div>
            </div>
          </div>

          <!-- SECTION C: PILIH PESERTA -->
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-users" style="color: var(--primary-600);"></i> 3. Pilih Peserta Wawancara
              </div>
              <span id="selected-participant-counter" class="badge" style="background: rgba(59, 130, 246, 0.12); color: #2563eb; font-weight: 800; padding: 4px 10px; border-radius: 9999px;">
                ${selectedRegs.length} Peserta Dipilih
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 10px;">
              <input type="text" id="participant-search-input" class="form-control" placeholder="Cari nama / nomor registrasi peserta..." oninput="filterScheduleParticipantsList(this.value)" style="font-size: 0.85rem;">
              
              <!-- Filter Jenis Kelamin -->
              <div class="btn-group" style="display: flex; gap: 4px; background: var(--bg-card); padding: 3px; border: 1px solid var(--border-subtle); border-radius: 8px;">
                <button type="button" id="btn-gender-all" onclick="filterScheduleParticipantsByGender('ALL')" class="btn btn-sm" style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: var(--primary-600); color: #fff; border: none;">
                  Semua
                </button>
                <button type="button" id="btn-gender-l" onclick="filterScheduleParticipantsByGender('L')" class="btn btn-sm" style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: transparent; color: var(--text-muted); border: none;">
                  ♂ Ikhwan (L)
                </button>
                <button type="button" id="btn-gender-p" onclick="filterScheduleParticipantsByGender('P')" class="btn btn-sm" style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: transparent; color: var(--text-muted); border: none;">
                  ♀ Akhwat (P)
                </button>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.775rem; color: var(--text-muted);">
              <span>Centang santri yang akan dialokasikan ke jadwal ini:</span>
              <button type="button" onclick="toggleSelectAllParticipants()" style="background: none; border: none; color: var(--primary-600); font-weight: 700; cursor: pointer; text-decoration: underline;">
                Pilih Semua yang Tampil
              </button>
            </div>

            <div id="schedule-participants-container" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-card); padding: 8px; display: flex; flex-direction: column; gap: 6px;">
              <!-- Injected dynamically -->
            </div>
          </div>

          <!-- SECTION D: TULIS PERTANYAAN AWAL LANGSUNG -->
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i> 4. Tulis Pertanyaan Awal Wawancara
                </div>
                <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">
                  Pertanyaan ini akan otomatis tampil di lembar wawancara setiap peserta pada jadwal ini.
                </div>
              </div>
              <button type="button" onclick="handleAddQuestionItem()" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                <i class="fa-solid fa-plus"></i> Tambah Pertanyaan
              </button>
            </div>

            <div id="schedule-questions-list" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Injected dynamically -->
            </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div style="margin-top: 20px; border-top: 1px solid var(--border-subtle); padding-top: 16px; display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeAppModal()" class="btn btn-secondary" style="font-weight: 700; padding: 10px 18px;">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" id="btn-save-schedule" style="font-weight: 800; padding: 10px 22px; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-check"></i> ${existing ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal Wawancara'}
          </button>
        </div>

      </form>
    `;

    window.interviewScheduleFormState.selectedGender = 'ALL';
    renderScheduleParticipantsChecklist();
    renderScheduleQuestionsList();

  } catch (err) {
    modalBody.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function filterScheduleParticipantsByGender(gender) {
  window.interviewScheduleFormState.selectedGender = gender;

  // Update button styles
  const allBtn = document.getElementById('btn-gender-all');
  const lBtn = document.getElementById('btn-gender-l');
  const pBtn = document.getElementById('btn-gender-p');

  if (allBtn) {
    allBtn.style.background = gender === 'ALL' ? 'var(--primary-600)' : 'transparent';
    allBtn.style.color = gender === 'ALL' ? '#fff' : 'var(--text-muted)';
  }
  if (lBtn) {
    lBtn.style.background = gender === 'L' ? '#0284c7' : 'transparent';
    lBtn.style.color = gender === 'L' ? '#fff' : 'var(--text-muted)';
  }
  if (pBtn) {
    pBtn.style.background = gender === 'P' ? '#db2777' : 'transparent';
    pBtn.style.color = gender === 'P' ? '#fff' : 'var(--text-muted)';
  }

  const search = document.getElementById('participant-search-input')?.value || '';
  renderScheduleParticipantsChecklist(search);
}

function renderScheduleParticipantsChecklist(filterText = '') {
  const container = document.getElementById('schedule-participants-container');
  if (!container) return;

  const currentGender = window.interviewScheduleFormState.selectedGender || 'ALL';
  const all = window.interviewScheduleFormState.allAvailableRegistrations || [];
  const selected = new Set(window.interviewScheduleFormState.selectedRegistrationIds || []);

  const search = (filterText !== undefined ? filterText : (document.getElementById('participant-search-input')?.value || '')).toLowerCase().trim();
  const filtered = all.filter(r => {
    const g = (r.gender || r.studentDetail?.gender || 'L').toUpperCase();
    if (currentGender !== 'ALL' && g !== currentGender) return false;

    if (!search) return true;
    const name = (r.participantName || r.name || r.user?.name || '').toLowerCase();
    const regNum = (r.registrationNumber || '').toLowerCase();
    const program = (r.programName || r.classProgram?.name || '').toLowerCase();
    return name.includes(search) || regNum.includes(search) || program.includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; font-size: 0.8rem; color: var(--text-muted);">
        Tidak ada peserta yang cocok dengan filter atau pencarian.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const isChecked = selected.has(r.registrationId || r.id);
    const regNum = r.registrationNumber || r.id;
    const name = r.participantName || r.name || r.user?.name || 'Calon Santri';
    const program = r.programName || r.classProgram?.name || '-';
    const cbt = r.cbtScore !== null && r.cbtScore !== undefined ? `CBT: ${r.cbtScore}` : '';
    const g = (r.gender || r.studentDetail?.gender || 'L').toUpperCase();
    const isMale = g === 'L';
    const genderBadge = isMale
      ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; margin-left: 6px;">♂ L (Ikhwan)</span>`
      : `<span class="badge" style="background: #fce7f3; color: #9d174d; border: 1px solid #fbcfe8; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; margin-left: 6px;">♀ P (Akhwat)</span>`;

    return `
      <label style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: background 0.15s; background: ${isChecked ? 'rgba(59, 130, 246, 0.06)' : 'transparent'};">
        <input type="checkbox" value="${r.registrationId || r.id}" ${isChecked ? 'checked' : ''} onchange="handleToggleParticipantSelection('${r.registrationId || r.id}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
        <div style="flex: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
          <div>
            <strong style="font-size: 0.85rem; color: var(--text-heading);">${escapeHtml(name)}</strong>
            <span style="font-size: 0.75rem; color: var(--primary-600); margin-left: 6px;">(${escapeHtml(regNum)})</span>
            ${genderBadge}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${escapeHtml(program)} ${cbt ? `&bull; <strong style="color:#16a34a;">${cbt}</strong>` : ''}
          </div>
        </div>
      </label>
    `;
  }).join('');
}

function filterScheduleParticipantsList(val) {
  renderScheduleParticipantsChecklist(val);
}

function handleToggleParticipantSelection(regId, isChecked) {
  const set = new Set(window.interviewScheduleFormState.selectedRegistrationIds || []);
  if (isChecked) {
    set.add(regId);
  } else {
    set.delete(regId);
  }
  window.interviewScheduleFormState.selectedRegistrationIds = Array.from(set);

  const counter = document.getElementById('selected-participant-counter');
  if (counter) {
    counter.textContent = `${window.interviewScheduleFormState.selectedRegistrationIds.length} Peserta Dipilih`;
  }
}

function toggleSelectAllParticipants() {
  const container = document.getElementById('schedule-participants-container');
  if (!container) return;
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  const set = new Set(window.interviewScheduleFormState.selectedRegistrationIds || []);
  checkboxes.forEach(cb => {
    cb.checked = true;
    set.add(cb.value);
  });
  window.interviewScheduleFormState.selectedRegistrationIds = Array.from(set);
  const counter = document.getElementById('selected-participant-counter');
  if (counter) {
    counter.textContent = `${window.interviewScheduleFormState.selectedRegistrationIds.length} Peserta Dipilih`;
  }
}

function renderScheduleQuestionsList() {
  const container = document.getElementById('schedule-questions-list');
  if (!container) return;

  const list = window.interviewScheduleFormState.questions || [];

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; font-size: 0.85rem; color: var(--text-muted); background: var(--bg-card); border-radius: 8px;">
        Belum ada pertanyaan. Klik <strong>[+ Tambah Pertanyaan]</strong> di atas.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map((q, idx) => `
    <div style="display: flex; gap: 10px; align-items: flex-start; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 12px;">
      <span style="font-weight: 800; color: var(--primary-600); font-size: 0.9rem; margin-top: 8px; width: 24px; text-align: center;">
        ${idx + 1}.
      </span>
      <div style="flex: 1;">
        <textarea 
          class="form-control" 
          rows="2" 
          placeholder="Tulis butir pertanyaan wawancara..." 
          oninput="handleUpdateQuestionText(${idx}, this.value)"
          style="font-size: 0.875rem;"
          required
        >${escapeHtml(q)}</textarea>
      </div>
      <button type="button" onclick="handleRemoveQuestionItem(${idx})" class="btn btn-sm btn-danger" style="margin-top: 4px; padding: 6px 10px;" title="Hapus Pertanyaan">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function handleAddQuestionItem() {
  window.interviewScheduleFormState.questions.push('');
  renderScheduleQuestionsList();
  // Focus last textarea
  setTimeout(() => {
    const list = document.querySelectorAll('#schedule-questions-list textarea');
    if (list.length > 0) list[list.length - 1].focus();
  }, 50);
}

function handleUpdateQuestionText(index, text) {
  if (window.interviewScheduleFormState.questions[index] !== undefined) {
    window.interviewScheduleFormState.questions[index] = text;
  }
}

function handleRemoveQuestionItem(index) {
  window.interviewScheduleFormState.questions.splice(index, 1);
  renderScheduleQuestionsList();
}

async function handleSaveSchedule(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-schedule');
  if (btn) btn.disabled = true;

  try {
    const name = document.getElementById('sch-name')?.value.trim();
    const academicPeriodId = document.getElementById('sch-period')?.value;
    const admissionWaveId = document.getElementById('sch-wave')?.value || null;
    const scheduleDate = document.getElementById('sch-date')?.value;
    const startTime = document.getElementById('sch-start-time')?.value;
    const endTime = document.getElementById('sch-end-time')?.value;
    const roomLocation = document.getElementById('sch-location')?.value.trim();
    const interviewerUserId = document.getElementById('sch-interviewer')?.value;

    const questions = (window.interviewScheduleFormState.questions || [])
      .map(q => q.trim())
      .filter(Boolean);

    const registrationIds = window.interviewScheduleFormState.selectedRegistrationIds || [];

    if (!name || !scheduleDate || !startTime || !endTime || !roomLocation) {
      throw new Error('Mohon lengkapi semua kolom yang bertanda bintang (*).');
    }

    if (!interviewerUserId) {
      throw new Error('Pilih salah satu pewawancara yang bertugas.');
    }

    const payload = {
      name,
      academicPeriodId,
      admissionWaveId: admissionWaveId || undefined,
      scheduleDate,
      startTime,
      endTime,
      roomLocation,
      quota: Math.max(registrationIds.length, 30),
      interviewerUserId,
      interviewerUserIds: [interviewerUserId],
      registrationIds,
      questions,
    };

    const scheduleId = window.interviewScheduleFormState.scheduleId;
    let res;
    if (scheduleId) {
      res = await apiRequest(`/api/interview/admin/schedules/${scheduleId}`, 'PATCH', payload);
    } else {
      res = await apiRequest('/api/interview/admin/schedules', 'POST', payload);
    }

    if (!res.success) throw new Error(res.message || 'Gagal menyimpan jadwal wawancara.');

    showGlobalAlert(res.message || 'Jadwal wawancara berhasil disimpan!', 'success');
    closeAppModal();
    renderInterviewSchedulesView();

  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleDeleteSchedule(scheduleId) {
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
        title: 'Hapus Jadwal Wawancara',
        message: 'Apakah Anda yakin ingin menghapus jadwal wawancara ini? Data penugasan terkait akan dibatalkan.',
        confirmText: 'Ya, Hapus Jadwal',
        cancelText: 'Batal',
        type: 'danger'
      })
    : confirm('Apakah Anda yakin ingin menghapus jadwal wawancara ini? Data penugasan terkait akan dibatalkan.');
  if (!ok) return;

  try {
    const res = await apiRequest(`/api/interview/admin/schedules/${scheduleId}`, 'DELETE');
    if (!res.success) throw new Error(res.message || 'Gagal menghapus jadwal.');
    showGlobalAlert('Jadwal wawancara berhasil dihapus.', 'success');
    renderInterviewSchedulesView();
  } catch (err) {
    alert(err.message);
  }
}

// ============================================================================
// SCREEN 3: DAFTAR PESERTA DALAM JADWAL (SUPER ADMIN)
// ============================================================================

window.scheduleParticipantsViewState = {
  scheduleId: '',
  search: '',
  status: '',
  schedule: null,
};

async function renderInterviewScheduleParticipants(scheduleId) {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  window.scheduleParticipantsViewState.scheduleId = scheduleId;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Peserta Jadwal...</p>
    </div>
  `;

  try {
    const [schRes, resultsRes] = await Promise.all([
      apiRequest(`/api/interview/admin/schedules/${scheduleId}`),
      apiRequest(`/api/interview/admin/results?scheduleId=${scheduleId}&perPage=200`),
    ]);

    if (!schRes.success || !schRes.data) throw new Error('Jadwal tidak ditemukan.');

    const sch = schRes.data;
    window.scheduleParticipantsViewState.schedule = sch;
    const participants = (resultsRes.success && resultsRes.data && Array.isArray(resultsRes.data.data))
      ? resultsRes.data.data
      : (resultsRes.success && Array.isArray(resultsRes.data) ? resultsRes.data : []);

    const scheduleTitle = sch.name || sch.roomLocation || 'Jadwal Wawancara';
    const dateStr = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    const interviewerNames = sch.interviewers?.map(i => escapeHtml(i.interviewer?.name || i.user?.name || i.name || '')).filter(Boolean).join(', ') || 'Belum ditentukan';

    const { search, status } = window.scheduleParticipantsViewState;
    const filteredParticipants = participants.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const name = (p.participantName || '').toLowerCase();
        const regNum = (p.registrationNumber || '').toLowerCase();
        if (!name.includes(q) && !regNum.includes(q)) return false;
      }
      if (status) {
        if (p.status !== status) return false;
      }
      return true;
    });

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Navigation Header -->
        <div style="margin-bottom: 20px;">
          <a href="#interview-schedules" style="text-decoration: none; font-size: 0.85rem; font-weight: 700; color: var(--primary-600); display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Daftar Jadwal
          </a>
          
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <h2 style="font-size: 1.55rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-users" style="color: var(--primary-600);"></i>
                Peserta Wawancara - ${escapeHtml(scheduleTitle)}
              </h2>
              <div style="margin: 6px 0 0 0; color: var(--text-muted); font-size: 0.875rem; display: flex; flex-wrap: wrap; gap: 14px;">
                <span><i class="fa-solid fa-calendar-day"></i> ${dateStr}</span>
                <span><i class="fa-regular fa-clock"></i> ${sch.startTime} - ${sch.endTime} WIB</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || '-')}</span>
                <span><i class="fa-solid fa-user-tie"></i> Pewawancara: <strong>${interviewerNames}</strong></span>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button onclick="openEditScheduleModal('${sch.id}')" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
                <i class="fa-solid fa-user-plus"></i> Tambah / Ubah Peserta
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 16px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 12px;">
            <div>
              <input 
                type="text" 
                id="sch-part-search" 
                class="form-control" 
                placeholder="Cari nama santri / no. pendaftaran..." 
                value="${escapeHtml(search)}"
                onkeydown="if(event.key==='Enter') applyScheduleParticipantFilter()"
              >
            </div>
            <div>
              <select id="sch-part-status" class="form-control" onchange="applyScheduleParticipantFilter()">
                <option value="">Semua Status</option>
                <option value="SCHEDULED" ${status === 'SCHEDULED' ? 'selected' : ''}>Terjadwal</option>
                <option value="CHECKED_IN" ${status === 'CHECKED_IN' ? 'selected' : ''}>Hadir / Check-in</option>
                <option value="IN_PROGRESS" ${status === 'IN_PROGRESS' ? 'selected' : ''}>Sedang Wawancara</option>
                <option value="COMPLETED" ${status === 'COMPLETED' ? 'selected' : ''}>Selesai</option>
                <option value="ABSENT" ${status === 'ABSENT' ? 'selected' : ''}>Tidak Hadir</option>
              </select>
            </div>
            <div>
              <button onclick="applyScheduleParticipantFilter()" class="btn btn-secondary" style="height: 100%; font-weight: 700;">
                <i class="fa-solid fa-filter"></i> Filter
              </button>
            </div>
          </div>
        </div>

        <!-- Table Peserta -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                  <th style="padding: 14px 16px; width: 60px;">No</th>
                  <th style="padding: 14px 16px;">No. Pendaftaran</th>
                  <th style="padding: 14px 16px;">Nama Santri</th>
                  <th style="padding: 14px 16px;">Program / Asal Sekolah</th>
                  <th style="padding: 14px 16px; text-align: center;">Nilai CBT</th>
                  <th style="padding: 14px 16px; text-align: center;">Status</th>
                  <th style="padding: 14px 16px; text-align: center;">Rekomendasi</th>
                  <th style="padding: 14px 16px; text-align: center;">Aksi</th>
                </tr>
              </thead>
              <tbody style="font-size: 0.875rem;">
                ${filteredParticipants.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                      Tidak ada peserta yang terdaftar pada jadwal ini atau sesuai filter.
                    </td>
                  </tr>
                ` : filteredParticipants.map((p, idx) => `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${idx + 1}</td>
                    <td style="padding: 14px 16px; font-weight: 800; color: var(--primary-600);">
                      ${escapeHtml(p.registrationNumber || '-')}
                    </td>
                    <td style="padding: 14px 16px;">
                      <strong style="color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(p.participantName || 'Calon Santri')}</strong>
                      ${(p.gender === 'P' || p.genderLabel?.includes('Perempuan') || p.genderLabel?.includes('Akhwat'))
        ? '<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px;">♀ P (Akhwat)</span>'
        : '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px;">♂ L (Ikhwan)</span>'
      }
                    </td>
                    <td style="padding: 14px 16px; font-size: 0.825rem;">
                      <div><strong>${escapeHtml(p.programName || '-')}</strong></div>
                      <div style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(p.originSchool || '-')}</div>
                    </td>
                    <td style="padding: 14px 16px; text-align: center; font-weight: 800; color: #16a34a;">
                      ${p.cbtScore !== null && p.cbtScore !== undefined ? Number(p.cbtScore).toFixed(1) : '-'}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                      ${getInterviewStatusBadge(p.status)}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                      ${getRecommendationBadge(p.recommendation)}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                      <a href="#interview-result-detail/${p.interviewId}" class="btn btn-sm btn-secondary" style="text-decoration: none; padding: 6px 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-file-lines"></i> Detail
                      </a>
                    </td>
                  </tr>
                `).join('')}
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

function applyScheduleParticipantFilter() {
  window.scheduleParticipantsViewState.search = document.getElementById('sch-part-search')?.value || '';
  window.scheduleParticipantsViewState.status = document.getElementById('sch-part-status')?.value || '';
  renderInterviewScheduleParticipants(window.scheduleParticipantsViewState.scheduleId);
}

// ============================================================================
// DATA PEWAWANCARA (SUPER ADMIN)
// ============================================================================

async function renderInterviewInterviewersView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Data Pewawancara...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/interview/admin/interviewers');
    const interviewers = (res.success && Array.isArray(res.data)) ? res.data : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-user-tie" style="color: var(--primary-600);"></i>
              Data Pewawancara
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Daftar penguji yang memiliki hak akses sebagai pewawancara pada sistem PSB
            </p>
          </div>
          <div>
            <a href="#users" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
              <i class="fa-solid fa-users-gear"></i> Kelola Akun Pengguna
            </a>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px;">
          ${interviewers.length === 0 ? `
            <div class="card" style="padding: 40px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
              Belum ada akun dengan role PEWAWANCARA. Buat akun di menu Pengguna.
            </div>
          ` : interviewers.map(u => `
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 20px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px;">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-600), var(--primary-800)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800;">
                  ${escapeHtml((u.name || 'P').charAt(0).toUpperCase())}
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-heading);">${escapeHtml(u.name)}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(u.email || u.phoneNumber || '-')}</div>
                </div>
              </div>

              <div style="font-size: 0.8rem; color: var(--text-main); background: var(--bg-body); padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between;">
                <div>
                  <span style="color: var(--text-muted); display: block;">Status Akun</span>
                  <strong style="color: ${u.isActive ? '#16a34a' : '#ef4444'};">${u.isActive ? 'Aktif' : 'Nonaktif'}</strong>
                </div>
                <div style="text-align: right;">
                  <span style="color: var(--text-muted); display: block;">Role Sistem</span>
                  <strong>PEWAWANCARA</strong>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// ============================================================================
// SCREEN 7: HASIL WAWANCARA (SUPER ADMIN & PEWAWANCARA VIEW REKAP)
// ============================================================================

window.interviewResultsFilterState = {
  search: '',
  scheduleId: '',
  recommendation: '',
  status: '',
  page: 1,
  perPage: 25,
};

async function renderInterviewResultsView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Hasil Wawancara...</p>
    </div>
  `;

  try {
    await fetchInterviewMasterData();
    const { search, scheduleId, recommendation, status, page, perPage } = window.interviewResultsFilterState;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
    });
    if (search) queryParams.set('search', search);
    if (scheduleId) queryParams.set('scheduleId', scheduleId);
    if (recommendation) queryParams.set('recommendation', recommendation);
    if (status) queryParams.set('status', status);

    const [res, schRes] = await Promise.all([
      apiRequest(`/api/interview/admin/results?${queryParams.toString()}`),
      apiRequest('/api/interview/admin/schedules').catch(() => ({ success: false, data: [] })),
    ]);

    const results = (res.success && res.data && Array.isArray(res.data.data))
      ? res.data.data
      : (res.success && Array.isArray(res.data) ? res.data : []);

    const meta = res.data?.meta || { total: results.length, page: 1, totalPages: 1 };
    const schedules = (schRes.success && Array.isArray(schRes.data)) ? schRes.data : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-chart-bar" style="color: var(--primary-600);"></i>
              Hasil & Rekap Wawancara
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Daftar evaluasi wawancara, catatan penguji, dan status rekomendasi calon santri
            </p>
          </div>
        </div>

        <!-- Multi-Filter Bar -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 18px; margin-bottom: 22px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: end;">
            <div>
              <label style="display: block; font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">PENCARIAN</label>
              <input 
                type="text" 
                id="results-search" 
                class="form-control" 
                placeholder="Nama santri / no. pendaftaran..." 
                value="${escapeHtml(search)}"
                onkeydown="if(event.key==='Enter') applyResultsFilters()"
              >
            </div>

            <div>
              <label style="display: block; font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">JADWAL SESI</label>
              <select id="results-filter-schedule" class="form-control" onchange="applyResultsFilters()">
                <option value="">Semua Jadwal</option>
                ${schedules.map(s => `
                  <option value="${s.id}" ${s.id === scheduleId ? 'selected' : ''}>
                    ${escapeHtml(s.name || s.roomLocation)} (${s.startTime})
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">JENIS KELAMIN</label>
              <select id="results-filter-gender" class="form-control" onchange="applyResultsFilters()">
                <option value="">Semua (L/P)</option>
                <option value="L" ${window.interviewResultsFilterState.gender === 'L' ? 'selected' : ''}>♂ Laki-laki (Ikhwan)</option>
                <option value="P" ${window.interviewResultsFilterState.gender === 'P' ? 'selected' : ''}>♀ Perempuan (Akhwat)</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">REKOMENDASI</label>
              <select id="results-filter-rec" class="form-control" onchange="applyResultsFilters()">
                <option value="">Semua Rekomendasi</option>
                <option value="HIGHLY_RECOMMENDED" ${recommendation === 'HIGHLY_RECOMMENDED' ? 'selected' : ''}>Sangat Direkomendasikan</option>
                <option value="RECOMMENDED" ${recommendation === 'RECOMMENDED' ? 'selected' : ''}>Direkomendasikan</option>
                <option value="CONSIDERED" ${recommendation === 'CONSIDERED' ? 'selected' : ''}>Dipertimbangkan</option>
                <option value="NOT_RECOMMENDED" ${recommendation === 'NOT_RECOMMENDED' ? 'selected' : ''}>Tidak Direkomendasikan</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">STATUS</label>
              <select id="results-filter-status" class="form-control" onchange="applyResultsFilters()">
                <option value="">Semua Status</option>
                <option value="COMPLETED" ${status === 'COMPLETED' ? 'selected' : ''}>Selesai</option>
                <option value="IN_PROGRESS" ${status === 'IN_PROGRESS' ? 'selected' : ''}>Sedang Wawancara</option>
                <option value="CHECKED_IN" ${status === 'CHECKED_IN' ? 'selected' : ''}>Hadir / Menunggu</option>
                <option value="SCHEDULED" ${status === 'SCHEDULED' ? 'selected' : ''}>Terjadwal</option>
                <option value="ABSENT" ${status === 'ABSENT' ? 'selected' : ''}>Tidak Hadir</option>
              </select>
            </div>

            <div>
              <button onclick="applyResultsFilters()" class="btn btn-secondary" style="width: 100%; height: 38px; font-weight: 700;">
                <i class="fa-solid fa-filter"></i> Terapkan Filter
              </button>
            </div>
          </div>
        </div>

        <!-- Results Table (Screen 7 Reference) -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                  <th style="padding: 14px 16px; width: 60px;">No</th>
                  <th style="padding: 14px 16px;">No. Pendaftaran</th>
                  <th style="padding: 14px 16px;">Nama Santri</th>
                  <th style="padding: 14px 16px;">Sekolah / Program</th>
                  <th style="padding: 14px 16px;">Pewawancara</th>
                  <th style="padding: 14px 16px; text-align: center;">Status</th>
                  <th style="padding: 14px 16px; text-align: center;">Rekomendasi</th>
                  <th style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-body); z-index: 3; box-shadow: -4px 0 8px rgba(0,0,0,0.06);">Aksi</th>
                </tr>
              </thead>
              <tbody style="font-size: 0.875rem;">
                ${results.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                      Tidak ada hasil wawancara yang sesuai dengan filter.
                    </td>
                  </tr>
                ` : results.map((r, idx) => `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${((page - 1) * perPage) + idx + 1}</td>
                    <td style="padding: 14px 16px; font-weight: 800; color: var(--primary-600);">
                      ${escapeHtml(r.registrationNumber || '-')}
                    </td>
                    <td style="padding: 14px 16px;">
                      <strong style="color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(r.participantName || 'Calon Santri')}</strong>
                      ${(r.gender === 'P' || r.genderLabel?.includes('Perempuan') || r.genderLabel?.includes('Akhwat'))
        ? '<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px;">♀ P (Akhwat)</span>'
        : '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px;">♂ L (Ikhwan)</span>'
      }
                    </td>
                    <td style="padding: 14px 16px; font-size: 0.825rem;">
                      <strong>${escapeHtml(r.schoolName || '-')}</strong>
                      <div style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(r.programName || '-')}</div>
                    </td>
                    <td style="padding: 14px 16px; font-size: 0.85rem;">
                      ${escapeHtml(r.interviewerName || '-')}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                      ${getInterviewStatusBadge(r.status)}
                    </td>
                    <td style="padding: 14px 16px; text-align: center;">
                      ${getRecommendationBadge(r.recommendation)}
                    </td>
                    <td style="padding: 14px 16px; text-align: center; white-space: nowrap; position: sticky; right: 0; background: var(--bg-card); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06);">
                      <a href="#interview-result-detail/${r.interviewId}" class="btn btn-sm btn-secondary" style="text-decoration: none; padding: 6px 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; margin-right: 4px;">
                        <i class="fa-solid fa-eye"></i> Detail
                      </a>
                      <button onclick="printInterviewResult('${r.interviewId}')" class="btn btn-sm btn-outline-primary" style="padding: 6px 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;" title="Cetak / Simpan PDF">
                        <i class="fa-solid fa-print"></i> Cetak
                      </button>
                    </td>
                  </tr>
                `).join('')}
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

function applyResultsFilters() {
  window.interviewResultsFilterState.search = document.getElementById('results-search')?.value || '';
  window.interviewResultsFilterState.scheduleId = document.getElementById('results-filter-schedule')?.value || '';
  window.interviewResultsFilterState.gender = document.getElementById('results-filter-gender')?.value || '';
  window.interviewResultsFilterState.recommendation = document.getElementById('results-filter-rec')?.value || '';
  window.interviewResultsFilterState.status = document.getElementById('results-filter-status')?.value || '';
  window.interviewResultsFilterState.page = 1;
  renderInterviewResultsView();
}

// ============================================================================
// SCREEN 8: DETAIL HASIL WAWANCARA (SUPER ADMIN & PEWAWANCARA)
// ============================================================================

async function renderInterviewResultDetail(interviewId) {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Lembar Hasil Wawancara...</p>
    </div>
  `;

  try {
    const res = await apiRequest(`/api/interview/interviewer/process/${interviewId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Data hasil wawancara tidak ditemukan.');

    const iw = res.data;
    const participant = iw.participant || {};
    const scheduleInfo = iw.scheduleInfo || {};
    const questions = iw.questionsSnapshot || [];
    const notes = iw.questionNotes || [];

    // Map notes by question text or id
    const noteMap = {};
    notes.forEach(n => {
      if (n.questionText) noteMap[n.questionText] = n.notes || '';
      if (n.questionId) noteMap[n.questionId] = n.notes || '';
    });

    // Separate initial schedule questions and custom questions
    const initialQuestions = questions.filter(q => !q.isCustomQuestion);
    const customQuestions = questions.filter(q => q.isCustomQuestion);

    // Also include any notes marked as custom not in snapshot
    notes.forEach(n => {
      if (n.isCustomQuestion && !customQuestions.some(cq => cq.questionText === n.questionText)) {
        customQuestions.push({
          questionText: n.questionText,
          isCustomQuestion: true,
        });
      }
    });

    const dateStr = scheduleInfo.scheduleDate ? new Date(scheduleInfo.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    const genderLabel = (participant.gender === 'P' || participant.genderLabel?.includes('Perempuan') || participant.genderLabel?.includes('Akhwat'))
      ? 'Perempuan (Akhwat)' : 'Laki-laki (Ikhwan)';

    container.innerHTML = `
      <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 60px;">
        
        <!-- Top Navigation -->
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <a href="javascript:history.back()" style="text-decoration: none; font-size: 0.85rem; font-weight: 700; color: var(--primary-600); display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali
            </a>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="printInterviewResult('${interviewId}')" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
              <i class="fa-solid fa-print"></i> Cetak / Simpan PDF
            </button>
          </div>
        </div>

        <!-- Printable Document Wrapper -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 32px; box-shadow: var(--shadow-sm);">
          
          <!-- Document Header -->
          <div style="border-bottom: 2px solid var(--border-subtle); padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
              <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563eb; font-weight: 800; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px; display: inline-block;">
                LEMBAR EVALUASI WAWANCARA SANTRI
              </span>
              <h2 style="margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text-heading);">
                ${escapeHtml(participant.fullName || 'Calon Santri')}
              </h2>
              <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 4px;">
                No. Registrasi: <strong style="color: var(--primary-600);">${escapeHtml(participant.registrationNumber || '-')}</strong> &bull; ${escapeHtml(participant.schoolName || '-')} (${escapeHtml(participant.programName || '-')})
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Rekomendasi Akhir</div>
              <div style="margin-top: 6px;">
                ${getRecommendationBadge(iw.recommendation)}
              </div>
            </div>
          </div>

          <!-- Info Meta Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: var(--bg-body); padding: 18px; border-radius: 12px; margin-bottom: 28px; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Jenis Kelamin</span>
              <strong>${genderLabel}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Asal Sekolah</span>
              <strong>${escapeHtml(participant.originSchool || '-')}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Nilai Ujian CBT</span>
              <strong style="color: #16a34a; font-size: 1.05rem;">${participant.cbtScore !== null && participant.cbtScore !== undefined ? Number(participant.cbtScore).toFixed(1) : '-'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Pewawancara</span>
              <strong>${escapeHtml(scheduleInfo.interviewerName || '-')}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Jadwal / Ruangan</span>
              <strong>${dateStr} (${scheduleInfo.startTime || '-'})</strong>
            </div>
          </div>

          <!-- SECTION 1: PERTANYAAN AWAL & JAWABAN -->
          <div style="margin-bottom: 28px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              <i class="fa-solid fa-clipboard-question" style="color: var(--primary-600);"></i>
              1. Pertanyaan Awal & Catatan Jawaban
            </h3>

            ${initialQuestions.length === 0 ? `
              <p style="color: var(--text-muted); font-size: 0.875rem;">Tidak ada pertanyaan awal yang dicatat.</p>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${initialQuestions.map((q, idx) => {
      const noteContent = noteMap[q.questionText] || noteMap[q.questionId] || '<em style="color:#94a3b8;">Tidak ada catatan khusus.</em>';
      return `
                    <div style="border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; background: var(--bg-card);">
                      <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem; margin-bottom: 8px;">
                        ${idx + 1}. ${escapeHtml(q.questionText || q.question || '')}
                      </div>
                      <div style="background: var(--bg-body); border-radius: 8px; padding: 12px 14px; font-size: 0.875rem; line-height: 1.6; color: var(--text-main);">
                        ${noteContent}
                      </div>
                    </div>
                  `;
    }).join('')}
              </div>
            `}
          </div>

          <!-- SECTION 2: PERTANYAAN SPONTAN / TAMBAHAN -->
          ${customQuestions.length > 0 ? `
            <div style="margin-bottom: 28px;">
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                <i class="fa-solid fa-plus-circle" style="color: #f59e0b;"></i>
                2. Pertanyaan Spontan / Tambahan
              </h3>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${customQuestions.map((cq, idx) => {
      const noteContent = noteMap[cq.questionText] || noteMap[cq.questionId] || '<em style="color:#94a3b8;">Tidak ada catatan.</em>';
      return `
                    <div style="border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px; background: rgba(254, 243, 199, 0.1);">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: var(--text-heading); font-size: 0.95rem;">
                          ${escapeHtml(cq.questionText)}
                        </strong>
                        <span class="badge" style="background: #fef3c7; color: #b45309; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                          Spontan
                        </span>
                      </div>
                      <div style="background: var(--bg-card); border-radius: 8px; padding: 12px 14px; font-size: 0.875rem; line-height: 1.6; color: var(--text-main); border: 1px solid var(--border-subtle);">
                        ${noteContent}
                      </div>
                    </div>
                  `;
    }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- SECTION 3: KESIMPULAN & CATATAN AKHIR -->
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-heading); margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              <i class="fa-solid fa-comment-dots" style="color: var(--primary-600);"></i>
              ${customQuestions.length > 0 ? '3.' : '2.'} Kesimpulan & Catatan Akhir Pewawancara
            </h3>

            <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px 18px; font-size: 0.9rem; line-height: 1.6; color: var(--text-heading);">
              ${iw.generalNotes ? iw.generalNotes : '<em style="color:#94a3b8;">Tidak ada catatan akhir khusus yang dicantumkan.</em>'}
            </div>
          </div>

        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">${err.message}</div>`;
  }
}

// ============================================================================
// STANDALONE RELIABLE PRINT HELPER (SCREEN 8 & RESULTS)
// ============================================================================

async function printInterviewResult(interviewId) {
  let iwData = null;
  let appSettings = window.appSettings || {};
  try {
    const [res, settingsRes] = await Promise.all([
      apiRequest(`/api/interview/interviewer/process/${interviewId}`),
      apiRequest('/api/settings').catch(() => ({ success: false })),
    ]);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat data hasil wawancara.');
    iwData = res.data;
    if (settingsRes && settingsRes.success && settingsRes.data) {
      appSettings = settingsRes.data;
    }
  } catch (e) {
    alert(e.message || 'Gagal memuat dokumen untuk dicetak.');
    return;
  }

  const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
  const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
    ? rawLogo
    : `/static/img/${rawLogo}`;
  const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

  const participant = iwData.participant || {};
  const scheduleInfo = iwData.scheduleInfo || {};
  const questions = iwData.questionsSnapshot || [];
  const notes = iwData.questionNotes || [];

  const noteMap = {};
  notes.forEach(n => {
    if (n.questionText) noteMap[n.questionText] = n.notes || '';
    if (n.questionId) noteMap[n.questionId] = n.notes || '';
  });

  const initialQuestions = questions.filter(q => !q.isCustomQuestion);
  const customQuestions = questions.filter(q => q.isCustomQuestion);
  notes.forEach(n => {
    if (n.isCustomQuestion && !customQuestions.some(cq => cq.questionText === n.questionText)) {
      customQuestions.push({ questionText: n.questionText, isCustomQuestion: true });
    }
  });

  const dateFormatted = scheduleInfo.scheduleDate
    ? new Date(scheduleInfo.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const genderText = (participant.gender === 'P' || participant.genderLabel?.includes('Perempuan') || participant.genderLabel?.includes('Akhwat'))
    ? 'Perempuan (Akhwat)' : 'Laki-laki (Ikhwan)';

  let recText = 'Belum Dinilai';
  let recBg = '#f3f4f6';
  let recColor = '#374151';
  let recBorder = '#d1d5db';

  switch (iwData.recommendation) {
    case 'HIGHLY_RECOMMENDED':
      recText = '★ SANGAT DIREKOMENDASIKAN';
      recBg = '#dcfce7'; recColor = '#15803d'; recBorder = '#86efac';
      break;
    case 'RECOMMENDED':
      recText = '✔ DIREKOMENDASIKAN';
      recBg = '#e0f2fe'; recColor = '#0369a1'; recBorder = '#7dd3fc';
      break;
    case 'CONSIDERED':
      recText = '❓ DIPERTIMBANGKAN';
      recBg = '#fef3c7'; recColor = '#b45309'; recBorder = '#fde68a';
      break;
    case 'NOT_RECOMMENDED':
      recText = '✖ TIDAK DIREKOMENDASIKAN';
      recBg = '#fee2e2'; recColor = '#b91c1c'; recBorder = '#fca5a5';
      break;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Hasil Wawancara - ${escapeHtml(participant.fullName || 'Santri')}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 24px;
          color: #1e293b;
          background: #f8fafc;
          font-size: 13px;
          line-height: 1.5;
        }
        .no-print {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-size: 13px;
        }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #334155; }
        .sheet {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 32px;
          max-width: 800px;
          margin: 0 auto;
          box-shadow: 0 4px 14px rgba(0,0,0,0.05);
        }
        .header-kop {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-kop-logo {
          width: 65px;
          height: 65px;
          object-fit: contain;
        }
        .header-kop-text {
          flex: 1;
          text-align: center;
        }
        .header-kop-text h1 {
          font-size: 16px;
          margin: 0 0 3px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .header-kop-text h2 {
          font-size: 15px;
          margin: 0 0 3px 0;
          color: #0f172a;
          font-weight: 800;
          text-transform: uppercase;
        }
        .header-kop-text h3 {
          font-size: 13px;
          margin: 0 0 3px 0;
          color: #2563eb;
          font-weight: 700;
        }
        .header-kop-text p {
          font-size: 11px;
          margin: 0;
          color: #64748b;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 20px;
        }
        .info-item { font-size: 12px; }
        .info-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; }
        .info-val { font-weight: 700; color: #0f172a; margin-top: 2px; }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 4px;
          margin: 18px 0 10px 0;
          text-transform: uppercase;
        }
        .question-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 10px;
          background: #fff;
        }
        .question-title { font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 6px; }
        .answer-box {
          background: #f1f5f9;
          border-radius: 4px;
          padding: 8px 10px;
          font-size: 12px;
          color: #334155;
          white-space: pre-wrap;
        }
        .rec-box {
          border: 2px solid ${recBorder};
          background: ${recBg};
          color: ${recColor};
          font-weight: 800;
          font-size: 14px;
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          margin: 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sig-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 30px;
          padding-top: 20px;
          text-align: center;
        }
        .sig-space { height: 65px; }
        @media print {
          body { background: #fff; padding: 0; }
          .no-print { display: none !important; }
          .sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <div>
          <strong>Lembar Hasil Wawancara:</strong> ${escapeHtml(participant.fullName || 'Santri')}
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="window.close()">Tutup</button>
          <button class="btn btn-primary" onclick="window.print()">🖨 Cetak / Simpan PDF</button>
        </div>
      </div>

      <div class="sheet">
        <div class="header-kop">
          <img class="header-kop-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'">
          <div class="header-kop-text">
            <h1>PANITIA PENERIMAAN SANTRI BARU (PSB)</h1>
            <h2>${escapeHtml(appName.toUpperCase())}</h2>
            <h3>LEMBAR EVALUASI &amp; HASIL TES WAWANCARA</h3>
            <p>Tahun Pelajaran ${escapeHtml(scheduleInfo.academicPeriodName || 'Aktif')} &bull; Dokumen Resmi Panitia Seleksi</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nama Calon Santri</div>
            <div class="info-val">${escapeHtml(participant.fullName || '-')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Nomor Registrasi</div>
            <div class="info-val" style="color:#2563eb;">${escapeHtml(participant.registrationNumber || '-')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Jenis Kelamin</div>
            <div class="info-val">${genderText}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Program & Asal Sekolah</div>
            <div class="info-val">${escapeHtml(participant.programName || '-')} &bull; ${escapeHtml(participant.originSchool || '-')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Pewawancara Bertugas</div>
            <div class="info-val">${escapeHtml(scheduleInfo.interviewerName || '-')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Jadwal & Lokasi Sesi</div>
            <div class="info-val">${dateFormatted} (${scheduleInfo.startTime || '-'} WIB) - ${escapeHtml(scheduleInfo.roomLocation || '-')}</div>
          </div>
        </div>

        <div class="section-title">1. Pertanyaan Awal & Catatan Evaluasi</div>
        ${initialQuestions.length === 0 ? '<p style="color:#64748b; font-style:italic;">Tidak ada pertanyaan awal.</p>' : ''}
        ${initialQuestions.map((q, idx) => {
    const note = noteMap[q.questionText] || noteMap[q.questionId] || 'Tidak ada catatan evaluasi khusus.';
    return `
            <div class="question-box">
              <div class="question-title">${idx + 1}. ${escapeHtml(q.questionText || q.question || '')}</div>
              <div class="answer-box">${escapeHtml(note)}</div>
            </div>
          `;
  }).join('')}

        ${customQuestions.length > 0 ? `
          <div class="section-title">2. Pertanyaan Spontan / Tambahan</div>
          ${customQuestions.map((cq, idx) => {
    const note = noteMap[cq.questionText] || noteMap[cq.questionId] || 'Tidak ada catatan.';
    return `
              <div class="question-box" style="border-left: 3px solid #f59e0b;">
                <div class="question-title">${idx + 1}. [Spontan] ${escapeHtml(cq.questionText)}</div>
                <div class="answer-box">${escapeHtml(note)}</div>
              </div>
            `;
  }).join('')}
        ` : ''}

        <div class="section-title">${customQuestions.length > 0 ? '3.' : '2.'} Kesimpulan & Catatan Akhir Penguji</div>
        <div class="question-box" style="margin-bottom: 16px;">
          <div class="answer-box" style="background:#fff; border: 1px solid #e2e8f0;">
            ${escapeHtml(iwData.generalNotes || 'Pewawancara tidak mencantumkan catatan umum tambahan.')}
          </div>
        </div>

        <div class="section-title">${customQuestions.length > 0 ? '4.' : '3.'} Keputusan Rekomendasi Penguji</div>
        <div class="rec-box">
          ${recText}
        </div>

        <div class="sig-grid">
          <div>
            <div style="font-size: 11px; color: #64748b;">Mengetahui,</div>
            <div style="font-weight: 700;">Panitia Seleksi PSB</div>
            <div class="sig-space"></div>
            <div style="font-weight: 700; border-top: 1px solid #94a3b8; display: inline-block; padding: 4px 20px 0;">
              ( Tim Verifikator )
            </div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b;">Penguji Wawancara,</div>
            <div style="font-weight: 700;">Pewawancara Resmi</div>
            <div class="sig-space"></div>
            <div style="font-weight: 700; border-top: 1px solid #94a3b8; display: inline-block; padding: 4px 20px 0;">
              ( ${escapeHtml(scheduleInfo.interviewerName || 'Pewawancara')} )
            </div>
          </div>
        </div>

      </div>

      <script>
        window.onload = function() {
          // Auto trigger print dialogue after small delay
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=920,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak lembar hasil wawancara.');
  }
}
window.printInterviewResult = printInterviewResult;

// ============================================================================
// VERIFIKASI WAWANCARA (ADMIN VIEW & ACTIONS)
// ============================================================================

window.interviewVerificationState = {
  participants: [],
  selectedItem: null,
};

async function renderInterviewVerificationView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: #a855f7;"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Memuat Verifikasi Wawancara...</p>
    </div>
  `;

  try {
    const structRes = await apiRequest('/api/cbt/admin/dashboard').catch(() => ({ success: false }));
    const structure = (structRes && structRes.success && structRes.data) ? (structRes.data.structure || []) : [];

    container.innerHTML = `
      <div style="max-width: 1300px; margin: 0 auto; padding-bottom: 50px;">
        
        <!-- Header -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.65rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-comments" style="color: #a855f7;"></i>
              Verifikasi Wawancara Calon Santri
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
              Verifikasi hasil wawancara 7 indikator pokok calon santri dan wali santri sebelum verifikasi final.
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="btn btn-outline-primary" onclick="printBlankInterviewForm()" style="border: 1px solid #a855f7; color: #a855f7; background: transparent; padding: 8px 16px; border-radius: var(--radius-md, 8px); font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;" title="Cetak Blangko Panduan Wawancara 7 Pertanyaan untuk Penguji">
              <i class="fa-solid fa-print"></i> Cetak Form Wawancara Kosong
            </button>
            <a href="#interview-schedules" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 600;">
              <i class="fa-solid fa-calendar-week"></i> Jadwal Wawancara
            </a>
            <button type="button" class="btn btn-secondary" onclick="renderInterviewVerificationView()" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
              <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Filter Card -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 14px); padding: 18px 22px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) 1.5fr; gap: 14px; align-items: flex-end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Unit Sekolah</label>
              <select id="iv-filter-school" class="form-select" onchange="loadInterviewVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Sekolah</option>
                ${structure.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Wawancara</label>
              <select id="iv-filter-status" class="form-select" onchange="loadInterviewVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="ALL">Semua Status</option>
                <option value="COMPLETED" selected>Selesai Wawancara</option>
                <option value="SCHEDULED">Terjadwal (Menunggu)</option>
                <option value="NOT_SCHEDULED">Belum Dijadwalkan</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Rekomendasi Pewawancara</label>
              <select id="iv-filter-recommendation" class="form-select" onchange="loadInterviewVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="ALL">Semua Rekomendasi</option>
                <option value="HIGHLY_RECOMMENDED">★ Sangat Direkomendasikan</option>
                <option value="RECOMMENDED">✔ Direkomendasikan</option>
                <option value="CONSIDERED">? Dipertimbangkan</option>
                <option value="NOT_RECOMMENDED">✖ Tidak Direkomendasikan</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Cari Peserta / No. Reg</label>
              <div style="position: relative;">
                <input type="text" id="iv-filter-search" class="form-control" placeholder="Ketik nama, no. registrasi, sekolah..." onkeyup="if(event.key==='Enter') loadInterviewVerificationTable()" style="width: 100%; padding: 8px 34px 8px 12px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer;" onclick="loadInterviewVerificationTable()"></i>
              </div>
            </div>

          </div>
        </div>

        <!-- Metric Stat Cards Slot -->
        <div id="iv-stats-slot" style="margin-bottom: 24px;"></div>

        <!-- Table Slot -->
        <div id="iv-table-slot">
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #a855f7;"></i>
            <p style="margin-top: 10px;">Mengambil data verifikasi wawancara...</p>
          </div>
        </div>

      </div>
    `;

    loadInterviewVerificationTable();
  } catch (err) {
    console.error('Error rendering interview verification view:', err);
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">Gagal memuat verifikasi wawancara: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadInterviewVerificationTable() {
  const slot = document.getElementById('iv-table-slot');
  const statsSlot = document.getElementById('iv-stats-slot');
  if (!slot) return;

  const schoolId = document.getElementById('iv-filter-school')?.value || '';
  const status = document.getElementById('iv-filter-status')?.value || 'ALL';
  const recommendation = document.getElementById('iv-filter-recommendation')?.value || 'ALL';
  const search = document.getElementById('iv-filter-search')?.value || '';

  slot.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #a855f7;"></i>
      <p style="margin-top: 10px;">Memuat data peserta wawancara...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams({ perPage: '1000' });
    if (schoolId) params.append('schoolId', schoolId);
    if (status && status !== 'ALL') params.append('status', status);
    if (search.trim()) params.append('search', search.trim());

    const res = await apiRequest(`/api/interview/admin/participants?${params.toString()}`);
    let items = res.success ? (res.data || []) : [];

    if (recommendation && recommendation !== 'ALL') {
      items = items.filter(i => i.recommendation === recommendation);
    }

    window.interviewVerificationState.participants = items;

    // Metrics
    const totalCount = items.length;
    const completedCount = items.filter(i => i.interviewStatus === 'COMPLETED').length;
    const recommendedCount = items.filter(i => i.recommendation === 'RECOMMENDED' || i.recommendation === 'HIGHLY_RECOMMENDED').length;
    const consideredCount = items.filter(i => i.recommendation === 'CONSIDERED').length;

    if (statsSlot) {
      statsSlot.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Calon Santri</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">${totalCount}</div>
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">Tahap Wawancara</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #86efac; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(34,197,94,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #15803d; text-transform: uppercase;">Selesai Wawancara</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #16a34a; margin-top: 4px;">${completedCount}</div>
            <div style="font-size: 0.72rem; color: #15803d; margin-top: 2px;">Telah Dinilai Penguji</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #93c5fd; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(59,130,246,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Direkomendasikan</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #2563eb; margin-top: 4px;">${recommendedCount}</div>
            <div style="font-size: 0.72rem; color: #1d4ed8; margin-top: 2px;">Rekomendasi Positif</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #fde68a; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(245,158,11,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Perlu Pertimbangan</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #d97706; margin-top: 4px;">${consideredCount}</div>
            <div style="font-size: 0.72rem; color: #b45309; margin-top: 2px;">Butuh Evaluasi Panitia</div>
          </div>
        </div>
      `;
    }

    if (items.length === 0) {
      slot.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 50px 20px; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-comments" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 12px;"></i>
          <h4 style="font-size: 1.1rem; color: var(--text-heading); margin-bottom: 6px;">Tidak ada data calon santri</h4>
          <p style="font-size: 0.85rem; margin: 0;">Silakan ubah filter pencarian atau pastikan peserta telah terjadwal wawancara.</p>
        </div>
      `;
      return;
    }

    slot.innerHTML = `
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 14px); overflow: hidden; box-shadow: var(--shadow-sm);">
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead>
              <tr style="background: var(--bg-body); border-bottom: 2px solid var(--border-subtle); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 12px 14px; width: 40px; text-align: center;">No</th>
                <th style="padding: 12px 14px; min-width: 220px;">Calon Santri</th>
                <th style="padding: 12px 14px; min-width: 160px;">Jenjang / Pilihan</th>
                <th style="padding: 12px 14px; text-align: center; width: 80px;">CBT</th>
                <th style="padding: 12px 14px; min-width: 140px;">Pewawancara</th>
                <th style="padding: 12px 14px; text-align: center; width: 90px;">Skor</th>
                <th style="padding: 12px 14px; text-align: center; min-width: 150px;">Rekomendasi</th>
                <th style="padding: 12px 14px; text-align: center; width: 120px;">Status</th>
                <th style="padding: 12px 14px; text-align: center; min-width: 160px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => {
                const isCompleted = item.interviewStatus === 'COMPLETED';
                const scoreDisplay = item.totalScore != null ? Number(item.totalScore).toFixed(2) : '-';

                let recBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:8px;">Belum Dinilai</span>';
                if (item.recommendation === 'HIGHLY_RECOMMENDED') {
                  recBadge = '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-star"></i> Sangat Layak</span>';
                } else if (item.recommendation === 'RECOMMENDED') {
                  recBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-check"></i> Direkomendasikan</span>';
                } else if (item.recommendation === 'CONSIDERED') {
                  recBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-question"></i> Pertimbangan</span>';
                } else if (item.recommendation === 'NOT_RECOMMENDED') {
                  recBadge = '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-xmark"></i> Tidak Disarankan</span>';
                }

                return `
                  <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 14px; text-align: center; color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 700; color: var(--text-heading); font-size: 0.9rem;">${escapeHtml(item.participantName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                        <code>${escapeHtml(item.registrationNumber)}</code>
                        <span>•</span>
                        <span>${item.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</span>
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(item.schoolName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(item.programName || '-')}</div>
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${item.cbtScore != null 
                        ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:3px 8px; border-radius:6px;">${item.cbtScore}</span>`
                        : `<span style="color:var(--text-dim);">-</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-heading);">${escapeHtml(item.interviewerName || '-')}</div>
                      ${item.scheduleDate ? `<div style="font-size: 0.72rem; color: var(--text-dim);">${new Date(item.scheduleDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>` : ''}
                    </td>
                    <td style="padding: 12px 14px; text-align: center; font-weight: 800; font-size: 0.95rem; color: ${isCompleted ? '#a855f7' : 'var(--text-muted)'};">
                      ${scoreDisplay}
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${recBadge}
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${isCompleted
                        ? `<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-circle-check"></i> Selesai</span>`
                        : item.interviewStatus === 'SCHEDULED'
                        ? `<span class="badge" style="background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-clock"></i> Terjadwal</span>`
                        : `<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:600; padding:4px 8px; border-radius:8px;">Belum Wawancara</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="openInterviewVerifyModal('${item.id}', '${item.interviewId || ''}')" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Verifikasi / Rincian Wawancara">
                          <i class="fa-solid fa-user-check"></i> Verifikasi
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printInterviewResult('${item.interviewId || item.id}')" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Cetak Hasil Wawancara Santri">
                          <i class="fa-solid fa-print"></i> Cetak
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('Error loading interview verification table:', err);
    slot.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">Gagal memuat tabel: ${escapeHtml(err.message)}</div>`;
  }
}

async function openInterviewVerifyModal(registrationId, interviewId) {
  const targetId = interviewId || registrationId;
  try {
    const res = await apiRequest(`/api/interview/interviewer/process/${targetId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat detail wawancara.');

    const iw = res.data;
    const participant = iw.participant || {};
    const existingRec = iw.recommendation || 'RECOMMENDED';
    const existingNotes = iw.generalNotes || '';
    const questions = iw.questionsSnapshot || [];
    const questionNotes = iw.questionNotes || [];

    const noteMap = {};
    questionNotes.forEach(n => {
      if (n.questionText) noteMap[n.questionText] = n.notes || '';
      if (n.questionId) noteMap[n.questionId] = n.notes || '';
    });

    const modalId = 'modal-interview-verify';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 750px; max-height: 90vh; overflow-y: auto; background: var(--bg-card); border-radius: var(--radius-xl, 14px); padding: 26px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-subtle);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px;">
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-comments" style="color: #a855f7;"></i>
              Verifikasi Hasil Wawancara Santri
            </h3>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">
              ${escapeHtml(participant.fullName || '-')} (${escapeHtml(participant.registrationNumber || '-')}) — ${escapeHtml(participant.schoolName || '-')}
            </p>
          </div>
          <button type="button" class="btn-close" onclick="closeInterviewVerifyModal()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <!-- 7 Indikator Wawancara Ringkas -->
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-heading); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-list-check" style="color: #0284c7;"></i> Jawaban 7 Indikator Pokok Wawancara
          </h4>
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); padding: 12px; font-size: 0.82rem;">
            ${questions.map((q, idx) => {
              const ans = noteMap[q.questionText] || noteMap[q.questionId] || '(Belum ada catatan jawaban)';
              return `
                <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-subtle);">
                  <div style="font-weight: 700; color: var(--text-heading);">${idx + 1}. ${escapeHtml(q.questionText)}</div>
                  <div style="color: var(--text-main); margin-top: 3px; font-style: italic;">“${escapeHtml(ans)}”</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <form id="form-interview-verify" onsubmit="submitInterviewVerify(event, '${iw.interviewId || targetId}')">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
                Rekomendasi Kelulusan Wawancara
              </label>
              <select id="ivm-recommendation" class="form-select" style="width: 100%; padding: 9px 10px; font-weight: 700; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
                <option value="HIGHLY_RECOMMENDED" ${existingRec === 'HIGHLY_RECOMMENDED' ? 'selected' : ''}>★ Sangat Direkomendasikan</option>
                <option value="RECOMMENDED" ${existingRec === 'RECOMMENDED' ? 'selected' : ''}>✔ Direkomendasikan</option>
                <option value="CONSIDERED" ${existingRec === 'CONSIDERED' ? 'selected' : ''}>? Dipertimbangkan</option>
                <option value="NOT_RECOMMENDED" ${existingRec === 'NOT_RECOMMENDED' ? 'selected' : ''}>✖ Tidak Direkomendasikan</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
                Status Wawancara
              </label>
              <select id="ivm-status" class="form-select" style="width: 100%; padding: 9px 10px; font-weight: 700; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
                <option value="COMPLETED" selected>✔ Lulus / Selesai Wawancara</option>
                <option value="CANCELLED">✖ Dibatalkan / Perlu Wawancara Ulang</option>
              </select>
            </div>

          </div>

          <div class="form-group" style="margin-bottom: 22px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
              Catatan Keseluruhan Pewawancara / Admin
            </label>
            <textarea id="ivm-notes" class="form-control" rows="3" placeholder="Tuliskan catatan umum mengenai santri dan komitmen wali santri..." style="width: 100%; padding: 10px; font-size: 0.85rem; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">${escapeHtml(existingNotes)}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeInterviewVerifyModal()" style="font-weight: 600;">Batal</button>
            <button type="submit" id="btn-save-interview-verify" class="btn btn-primary" style="font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Verifikasi
            </button>
          </div>

        </form>

      </div>
    `;

    modal.style.display = 'flex';
  } catch (err) {
    alert(err.message || 'Gagal membuka rincian wawancara.');
  }
}

function closeInterviewVerifyModal() {
  const modal = document.getElementById('modal-interview-verify');
  if (modal) modal.style.display = 'none';
}

async function submitInterviewVerify(e, targetId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-interview-verify');
  if (btn) btn.disabled = true;

  const recommendation = document.getElementById('ivm-recommendation')?.value || 'RECOMMENDED';
  const status = document.getElementById('ivm-status')?.value || 'COMPLETED';
  const generalNotes = document.getElementById('ivm-notes')?.value || '';

  try {
    const res = await apiRequest(`/api/interview/admin/verify/${targetId}`, 'POST', {
      recommendation,
      status,
      generalNotes,
    });

    if (!res.success) throw new Error(res.message || 'Gagal menyimpan status verifikasi wawancara.');

    if (typeof showToast === 'function') showToast('Verifikasi wawancara berhasil disimpan.', 'success');
    closeInterviewVerifyModal();
    loadInterviewVerificationTable();
  } catch (err) {
    alert(err.message || 'Gagal menyimpan verifikasi wawancara.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================================
// FITUR CETAK LEMBAR WAWANCARA KOSONG (BLANGKO 7 PERTANYAAN)
// ============================================================================

async function printBlankInterviewForm() {
  let appSettings = window.appSettings || {};
  try {
    const sRes = await apiRequest('/api/settings').catch(() => ({ success: false }));
    if (sRes.success && sRes.data) appSettings = sRes.data;
  } catch (e) {}

  const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
  const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
    ? rawLogo
    : `/static/img/${rawLogo}`;
  const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

  const defaultQuestions = [
    { title: "Motivasi masuk pesantren dan komitmen belajar", guidance: "Gali tujuan mendaftar (kemauan sendiri/orang tua), kesungguhan belajar, kesiapan taat aturan pesantren." },
    { title: "Ibadah keseharian santri (baca qur'an, sholat jamaah, sholat sunnah)", guidance: "Kelancaran Al-Qur'an, kedisiplinan sholat wajib 5 waktu berjamaah di masjid, pembiasaan sholat sunnah." },
    { title: "Kemandirian dan kesiapan tinggal di asrama", guidance: "Kesiapan mental jauh dari orang tua, kebiasaan mencuci/merapikan barang sendiri, riwayat penyakit/alergi." },
    { title: "Pembiasaan sehari-hari (merokok, pertemanan, hubungan lawan jenis)", guidance: "Riwayat merokok/vape, kebiasaan bermain game/gadget, lingkungan pertemanan, etika pergaulan lawan jenis." },
    { title: "Kondisi ekonomi orang tua/wali", guidance: "Pekerjaan orang tua, kesiapan pembiayaan infaq masuk, SPP bulanan, dan uang saku santri secara berkelanjutan." },
    { title: "Hubungan dalam keluarga (status anak, kedekatan anak dengan orang tua)", guidance: "Status anak kandung/yatim/piatu, urutan anak, keharmonisan komunikasi dan keterbukaan dengan orang tua." },
    { title: "Informasi Pondok Pesantren Maskumambang dari mana?", guidance: "Sumber mengetahui info pendaftaran (alumni, keluarga, media sosial, website, brosur, atau lainnya)." },
  ];

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Blangko Panduan Wawancara Santri Baru</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 20px;
          font-size: 10pt;
          line-height: 1.35;
        }
        .header-kop {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px double #1f2937;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .header-kop img {
          width: 70px;
          height: 70px;
          object-fit: contain;
        }
        .kop-text h1 {
          font-size: 15pt;
          margin: 0;
          font-weight: 800;
        }
        .kop-text h2 {
          font-size: 12pt;
          margin: 2px 0;
          color: #1e3a8a;
          font-weight: 700;
        }
        .kop-text p {
          font-size: 8.5pt;
          color: #4b5563;
          margin: 2px 0 0 0;
        }
        .doc-title {
          text-align: center;
          margin: 12px 0;
        }
        .doc-title h3 {
          font-size: 12.5pt;
          font-weight: 800;
          text-decoration: underline;
          margin: 0;
          text-transform: uppercase;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        .meta-table td {
          padding: 3px 5px;
          font-size: 9.5pt;
        }
        .q-card {
          border: 1px solid #1f2937;
          border-radius: 4px;
          padding: 8px 10px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .q-title {
          font-weight: 700;
          font-size: 10pt;
          color: #1e3a8a;
        }
        .q-guidance {
          font-size: 8.5pt;
          color: #4b5563;
          margin: 2px 0 6px 0;
        }
        .q-answer-box {
          height: 38px;
          border-bottom: 1px dashed #9ca3af;
        }
        .signature-box {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-col {
          text-align: center;
          width: 220px;
        }
        .sign-line {
          margin-top: 55px;
          border-bottom: 1px solid #111827;
          font-weight: 700;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 14px; text-align: right;">
        <button onclick="window.print()" style="background:#a855f7; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">
          🖨 Cetak Blangko / Simpan PDF
        </button>
      </div>

      <div class="header-kop">
        <img src="${logoUrl}" alt="Logo">
        <div class="kop-text">
          <h1>PANITIA PENERIMAAN SANTRI BARU (PSB)</h1>
          <h2>${escapeHtml(appName).toUpperCase()}</h2>
          <p>Jl. Raya Maskumambang Dukun Gresik Jawa Timur 61153 • Website: maskumambang.ac.id</p>
        </div>
      </div>

      <div class="doc-title">
        <h3>LEMBAR PANDUAN WAWANCARA SANTRI & WALI SANTRI</h3>
        <p>Instrumen Penggalian Data 7 Indikator Pokok Calon Santri Baru</p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 20%; font-weight: 700;">No. Registrasi</td>
          <td style="width: 30%;">: .....................................................</td>
          <td style="width: 20%; font-weight: 700;">Hari / Tanggal</td>
          <td style="width: 30%;">: .....................................................</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Nama Calon Santri</td>
          <td>: .....................................................</td>
          <td style="font-weight: 700;">Nama Pewawancara</td>
          <td>: .....................................................</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Pilihan Jenjang/Sekolah</td>
          <td>: .....................................................</td>
          <td style="font-weight: 700;">Ruang Wawancara</td>
          <td>: .....................................................</td>
        </tr>
      </table>

      ${defaultQuestions.map((q, idx) => `
        <div class="q-card">
          <div class="q-title">${idx + 1}. ${escapeHtml(q.title)}</div>
          <div class="q-guidance"><em>Panduan:</em> ${escapeHtml(q.guidance)}</div>
          <div class="q-answer-box"></div>
        </div>
      `).join('')}

      <div style="border: 1px solid #1f2937; padding: 8px 10px; margin-top: 10px; border-radius: 4px; page-break-inside: avoid;">
        <strong style="font-size: 9.5pt;">REKOMENDASI AKHIR PEWAWANCARA:</strong>
        <div style="display: flex; gap: 20px; margin-top: 6px; font-size: 9.5pt; font-weight: 700;">
          <label>[ &nbsp; ] Sangat Direkomendasikan</label>
          <label>[ &nbsp; ] Direkomendasikan</label>
          <label>[ &nbsp; ] Dipertimbangkan</label>
          <label>[ &nbsp; ] Tidak Direkomendasikan</label>
        </div>
      </div>

      <div class="signature-box">
        <div class="sign-col">
          <div>Mengetahui,</div>
          <div style="font-weight: 700;">Koordinator Wawancara</div>
          <div class="sign-line">( .................................................... )</div>
        </div>
        <div class="sign-col">
          <div>Dukun Gresik, ......................... 2026</div>
          <div style="font-weight: 700;">Ustadz Pewawancara,</div>
          <div class="sign-line">( .................................................... )</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak blangko wawancara.');
  }
}

window.renderInterviewVerificationView = renderInterviewVerificationView;
window.loadInterviewVerificationTable = loadInterviewVerificationTable;
window.openInterviewVerifyModal = openInterviewVerifyModal;
window.closeInterviewVerifyModal = closeInterviewVerifyModal;
window.submitInterviewVerify = submitInterviewVerify;
window.printBlankInterviewForm = printBlankInterviewForm;

