/**
 * ============================================================================
 * INTERVIEW MODULE — PEWAWANCARA (INTERVIEWER) INTERFACE (SIMPLIFIED & STREAMLINED)
 * ============================================================================
 * Screens Implemented:
 * - Screen 4: Dashboard Pewawancara (Card Jadwal Hari Ini + Progress Bar + CTA [MULAI WAWANCARA] + 4 Stat Metrics + Antrean Peserta)
 * - Screen 5: Halaman Proses Wawancara (Dual Column Layout: Data Peserta di kiri, Lembar Pertanyaan + Rich Text Editor di kanan)
 * - Screen 6: Modal Tambah Pertanyaan Spontan (Tambah pertanyaan khusus peserta tertentu)
 * - Jadwal Saya, Antrean Peserta, dan Riwayat Wawancara
 */

window.interviewerProcessState = {
  currentInterview: null,
  questions: [], // list of initial + custom questions
  customQuestionsCount: 0,
};

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

// ============================================================================
// SCREEN 4: DASHBOARD PEWAWANCARA
// ============================================================================

async function renderInterviewerDashboard() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Memuat Dashboard Pewawancara...</p>
    </div>
  `;

  try {
    const [dashRes, partsRes] = await Promise.all([
      apiRequest('/api/interview/interviewer/dashboard'),
      apiRequest('/api/interview/interviewer/participants?perPage=50'),
    ]);

    if (!dashRes.success || !dashRes.data) throw new Error(dashRes.message || 'Gagal memuat data pewawancara.');

    const data = dashRes.data;
    const todaySchedules = data.todaySchedules || [];
    const participants = (partsRes.success && partsRes.data) ? (Array.isArray(partsRes.data.data) ? partsRes.data.data : partsRes.data) : [];

    const totalParticipants = participants.length;
    const completedCount = participants.filter(p => p.interview?.status === 'COMPLETED').length;
    const inProgressCount = participants.filter(p => p.interview?.status === 'IN_PROGRESS').length;
    const pendingCount = participants.filter(p => p.interview?.status === 'CHECKED_IN' || p.interview?.status === 'SCHEDULED').length;

    const progressPercent = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;
    const firstPendingParticipant = participants.find(p => p.interview?.status !== 'COMPLETED');

    const primarySchedule = todaySchedules[0] || null;
    const scheduleDateStr = primarySchedule?.scheduleDate 
      ? new Date(primarySchedule.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Welcome Header -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.65rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-id-badge" style="color: var(--primary-600);"></i>
            Portal Penguji Wawancara
          </h2>
          <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
            Pantau jadwal bertugas hari ini dan lakukan penilaian wawancara santri baru.
          </p>
        </div>

        <!-- CARD HIGHLIGHT: JADWAL HARI INI (Screen 4 Reference) -->
        <div class="card" style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; border-radius: var(--radius-xl, 18px); padding: 26px 30px; margin-bottom: 28px; box-shadow: var(--shadow-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
            
            <div style="flex: 1; min-width: 280px;">
              <span class="badge" style="background: rgba(255, 255, 255, 0.2); color: #ffffff; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 10px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-calendar-day"></i> JADWAL HARI INI
              </span>
              <h3 style="margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 800; color: #ffffff;">
                ${escapeHtml(primarySchedule?.name || primarySchedule?.roomLocation || 'Sesi Wawancara Hari Ini')}
              </h3>
              <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); display: flex; flex-wrap: wrap; gap: 16px;">
                <span><i class="fa-regular fa-clock"></i> ${primarySchedule ? `${primarySchedule.startTime} - ${primarySchedule.endTime} WIB` : '08:00 - 12:00 WIB'}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(primarySchedule?.roomLocation || 'Ruang Wawancara')}</span>
                <span><i class="fa-solid fa-calendar"></i> ${scheduleDateStr}</span>
              </div>

              <!-- Progress Bar -->
              <div style="margin-top: 18px; max-width: 480px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: rgba(255, 255, 255, 0.9);">
                  <span>Progres Wawancara</span>
                  <span>${completedCount} / ${totalParticipants} Selesai (${progressPercent}%)</span>
                </div>
                <div style="height: 10px; border-radius: 9999px; background: rgba(255, 255, 255, 0.25); overflow: hidden;">
                  <div style="width: ${progressPercent}%; height: 100%; background: #22c55e; border-radius: 9999px; transition: width 0.3s ease;"></div>
                </div>
              </div>
            </div>

            <div>
              ${firstPendingParticipant ? `
                <a href="#iw-process/${firstPendingParticipant.interview?.id || firstPendingParticipant.id}" class="btn" style="background: #ffffff; color: #1e3a8a; font-weight: 800; font-size: 1.05rem; padding: 14px 24px; border-radius: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2); transition: transform 0.15s;">
                  <i class="fa-solid fa-play"></i> MULAI WAWANCARA
                </a>
              ` : `
                <a href="#iw-my-participants" class="btn" style="background: #ffffff; color: #1e3a8a; font-weight: 800; font-size: 1.05rem; padding: 14px 24px; border-radius: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
                  <i class="fa-solid fa-users"></i> LIHAT SEMUA PESERTA
                </a>
              `}
            </div>

          </div>
        </div>

        <!-- 4 SUMMARY METRIC CARDS (Screen 4 Reference) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px;">
          
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(59, 130, 246, 0.12); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Peserta Hari Ini</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); line-height: 1.2;">${totalParticipants}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Calon Santri</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.12); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Selesai</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #16a34a; line-height: 1.2;">${completedCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Tersimpan</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(14, 165, 233, 0.12); color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Dalam Proses</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7; line-height: 1.2;">${inProgressCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Draft / Berjalan</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(245, 158, 11, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
              <i class="fa-solid fa-clock"></i>
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Belum Wawancara</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: #d97706; line-height: 1.2;">${pendingCount}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">Menunggu Giliran</div>
            </div>
          </div>

        </div>

        <!-- Antrean Peserta Hari Ini -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 22px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-ol" style="color: var(--primary-600);"></i> Antrean Peserta Sesi Ini
            </h3>
            <a href="#iw-my-participants" style="font-size: 0.85rem; font-weight: 700; color: var(--primary-600); text-decoration: none;">
              Lihat Seluruh Peserta &rarr;
            </a>
          </div>

          ${participants.length === 0 ? `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--bg-body); border-radius: 12px;">
              <i class="fa-solid fa-user-clock" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 10px;"></i>
              <p style="margin: 0; font-size: 0.95rem; font-weight: 600;">Belum ada peserta yang dialokasikan ke jadwal Anda.</p>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                    <th style="padding: 12px 16px; width: 60px;">No</th>
                    <th style="padding: 12px 16px;">Calon Santri</th>
                    <th style="padding: 12px 16px;">Program & Asal Sekolah</th>
                    <th style="padding: 12px 16px; text-align: center;">Status</th>
                    <th style="padding: 12px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-body); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06);">Aksi</th>
                  </tr>
                </thead>
                <tbody style="font-size: 0.875rem;">
                  ${participants.slice(0, 10).map((p, idx) => {
                    const iw = p.interview;
                    const isCompleted = (p.interviewStatus || iw?.status) === 'COMPLETED';
                    const name = p.participantName || p.user?.name || p.studentDetail?.fullName || 'Calon Santri';
                    const regNum = p.registrationNumber || p.id;
                    const schoolProgram = p.schoolName ? `${p.schoolName} (${p.programName || '-'})` : (p.programName || p.classProgram?.name || '-');
                    const originSchool = p.originSchool || p.studentDetail?.previousSchoolName || '-';
                    const g = (p.gender || p.studentDetail?.gender || 'L').toUpperCase();
                    const isMale = g === 'L';
                    const genderBadge = isMale
                      ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♂ L</span>`
                      : `<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♀ P</span>`;

                    return `
                      <tr style="border-bottom: 1px solid var(--border-subtle);">
                        <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${idx + 1}</td>
                        <td style="padding: 14px 16px;">
                          <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
                            ${escapeHtml(name)} ${genderBadge}
                          </div>
                          <div style="font-size: 0.775rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
                            No. Santri: <strong>${escapeHtml(regNum)}</strong>
                          </div>
                        </td>
                        <td style="padding: 14px 16px; font-size: 0.825rem;">
                          <strong>${escapeHtml(schoolProgram)}</strong>
                          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                            Asal: ${escapeHtml(originSchool)}
                          </div>
                        </td>
                        <td style="padding: 14px 16px; text-align: center;">
                          ${typeof getInterviewStatusBadge === 'function' ? getInterviewStatusBadge(p.interviewStatus || iw?.status || 'SCHEDULED') : (p.interviewStatus || iw?.status || 'SCHEDULED')}
                        </td>
                        <td style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-card); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06); white-space: nowrap;">
                          <a href="#iw-process/${p.interviewId || iw?.id || p.id}" class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 7px 14px; border-radius: 8px;">
                            <i class="fa-solid ${isCompleted ? 'fa-eye' : 'fa-play'}"></i> 
                            ${isCompleted ? 'Lihat Hasil' : 'Wawancarai'}
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
// SCREEN 5: HALAMAN PROSES WAWANCARA (DUAL COLUMN LAYOUT)
// ============================================================================

async function renderInterviewerProcess(identifier) {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  if (!identifier) {
    container.innerHTML = `<div class="alert alert-warning" style="margin: 20px;">ID Wawancara tidak valid.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Menyiapkan Lembar Wawancara Santri...</p>
    </div>
  `;

  try {
    const res = await apiRequest(`/api/interview/interviewer/process/${identifier}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat lembar wawancara.');

    const iw = res.data;
    window.interviewerProcessState.currentInterview = iw;

    const interviewId = iw.interviewId || iw.id;
    const participant = iw.participant || {};
    const scheduleInfo = iw.scheduleInfo || {};
    const existingNotes = iw.questionNotes || [];

    // Map existing notes
    const noteMap = {};
    existingNotes.forEach(n => {
      if (n.questionText) noteMap[n.questionText] = n.notes || '';
      if (n.questionId) noteMap[n.questionId] = n.notes || '';
    });

    // Parse questions list
    let questions = iw.questionsSnapshot || [];
    if (questions.length === 0 && iw.schedule?.questionsJson) {
      try {
        const parsed = JSON.parse(iw.schedule.questionsJson);
        if (Array.isArray(parsed)) {
          questions = parsed.map((q, idx) => ({
            questionId: `q-${idx + 1}`,
            questionText: typeof q === 'string' ? q : (q.questionText || q.question || ''),
            sortOrder: idx + 1,
            isCustomQuestion: false,
          }));
        }
      } catch (e) {}
    }

    // Append any existing custom question notes that might not be in the snapshot
    existingNotes.forEach(n => {
      if (n.isCustomQuestion && !questions.some(q => q.questionText === n.questionText)) {
        questions.push({
          questionId: n.questionId || `custom-${Date.now()}-${Math.random()}`,
          questionText: n.questionText,
          sortOrder: n.sortOrder || (questions.length + 1),
          isCustomQuestion: true,
        });
      }
    });

    window.interviewerProcessState.questions = questions;

    const isLocked = iw.status === 'COMPLETED' && window.currentUserRole !== 'SUPER_ADMIN' && window.currentUserRole !== 'ADMIN';
    const initialQuestions = questions.filter(q => !q.isCustomQuestion);
    const customQuestions = questions.filter(q => q.isCustomQuestion);

    container.innerHTML = `
      <style>
        .interview-process-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }
        .interview-process-sidebar {
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: sticky;
          top: 20px;
        }
        .interview-process-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }
        .interview-process-actions {
          position: sticky;
          bottom: 20px;
          z-index: 50;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl, 16px);
          padding: 16px 24px;
          box-shadow: var(--shadow-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .interview-process-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
          }
          .interview-process-sidebar {
            position: static !important;
            width: 100% !important;
          }
          .interview-process-main {
            width: 100% !important;
          }
          .interview-process-actions {
            position: sticky !important;
            bottom: 10px !important;
            padding: 14px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .interview-process-actions .btn-action-group {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .interview-process-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      </style>

      <div style="max-width: 1300px; margin: 0 auto; padding-bottom: 80px;">
        
        <!-- Top Navigation -->
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <a href="${(window.currentUserRole === 'SUPER_ADMIN' || window.currentUserRole === 'ADMIN') ? '#interview-results' : '#iw-my-participants'}" style="text-decoration: none; font-size: 0.85rem; font-weight: 700; color: var(--primary-600); display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Antrean
            </a>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Status:</span>
            ${typeof getInterviewStatusBadge === 'function' ? getInterviewStatusBadge(iw.status) : iw.status}
          </div>
        </div>

        <!-- DUAL COLUMN RESPONSIVE LAYOUT (Screen 5) -->
        <div class="interview-process-layout">
          
          <!-- LEFT COLUMN: DATA PESERTA & JADWAL -->
          <div class="interview-process-sidebar">
            
            <!-- Profil Card -->
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 22px; box-shadow: var(--shadow-sm); text-align: center;">
              <div style="width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-600), var(--primary-800)); color: #fff; font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; box-shadow: var(--shadow-sm);">
                ${escapeHtml((participant.fullName || 'S').charAt(0).toUpperCase())}
              </div>

              <h3 style="margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading);">
                ${escapeHtml(participant.fullName || 'Calon Santri')}
              </h3>
              <div style="font-size: 0.825rem; font-weight: 700; color: var(--primary-600); margin-bottom: 16px;">
                No. Registrasi: ${escapeHtml(participant.registrationNumber || '-')}
              </div>

              <div style="text-align: left; font-size: 0.825rem; color: var(--text-main); border-top: 1px solid var(--border-subtle); padding-top: 14px; display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.725rem; text-transform: uppercase; font-weight: 700;">Sekolah & Program</span>
                  <strong>${escapeHtml(participant.schoolName || '-')}</strong> &bull; ${escapeHtml(participant.programName || '-')}
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.725rem; text-transform: uppercase; font-weight: 700;">Asal Sekolah</span>
                  <strong>${escapeHtml(participant.originSchool || '-')}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.725rem; text-transform: uppercase; font-weight: 700;">No. WhatsApp</span>
                  <strong>${escapeHtml(participant.phoneNumber || '-')}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.725rem; text-transform: uppercase; font-weight: 700;">Nilai CBT Online</span>
                  <strong style="color: #16a34a; font-size: 1.05rem;">${participant.cbtScore !== null && participant.cbtScore !== undefined ? Number(participant.cbtScore).toFixed(1) : '-'}</strong>
                </div>
                ${scheduleInfo.roomLocation ? `
                  <div>
                    <span style="color: var(--text-muted); display: block; font-size: 0.725rem; text-transform: uppercase; font-weight: 700;">Ruang / Lokasi</span>
                    <strong>${escapeHtml(scheduleInfo.roomLocation)}</strong> (${scheduleInfo.startTime || ''} - ${scheduleInfo.endTime || ''})
                  </div>
                ` : ''}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: LEMBAR PERTANYAAN & RICH TEXT EDITOR -->
          <div class="interview-process-main">
            
            <form id="interview-process-form" onsubmit="handleProcessSubmit(event, '${interviewId}', false)">
              
              <!-- SECTION 1: PERTANYAAN AWAL DARI JADWAL -->
              <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
                      <i class="fa-solid fa-clipboard-question" style="color: var(--primary-600);"></i>
                      Pertanyaan Wawancara
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.825rem; color: var(--text-muted);">
                      Ajukan pertanyaan berikut dan catat poin jawaban penting calon santri.
                    </p>
                  </div>
                  <button type="button" onclick="openSpontaneousQuestionModal()" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem;" ${isLocked ? 'disabled' : ''}>
                    <i class="fa-solid fa-plus-circle" style="color: #f59e0b;"></i> + Tambah Pertanyaan
                  </button>
                </div>

                <!-- Initial Questions List -->
                <div id="initial-questions-container" style="display: flex; flex-direction: column; gap: 18px;">
                  ${initialQuestions.map((q, idx) => `
                    <div class="question-block" style="border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; background: var(--bg-body);">
                      <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem; margin-bottom: 10px;">
                        ${idx + 1}. ${escapeHtml(q.questionText)}
                      </div>
                      <div id="editor_wrapper_initial_${idx}"></div>
                    </div>
                  `).join('')}
                </div>

                <!-- Custom Spontaneous Questions Section -->
                <div id="spontaneous-questions-container" style="display: flex; flex-direction: column; gap: 18px; margin-top: 18px;">
                  ${customQuestions.map((cq, idx) => `
                    <div class="question-block spontaneous-block" id="custom-q-block-${idx}" style="border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px; background: rgba(254, 243, 199, 0.15);">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.725rem; padding: 3px 8px; border-radius: 4px;">
                            Spontan
                          </span>
                          <strong style="color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(cq.questionText)}</strong>
                        </div>
                        ${!isLocked ? `
                          <button type="button" onclick="handleRemoveCustomQuestion(${idx})" class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">
                            <i class="fa-solid fa-trash"></i>
                          </button>
                        ` : ''}
                      </div>
                      <div id="editor_wrapper_custom_${idx}"></div>
                    </div>
                  `).join('')}
                </div>

              </div>

              <!-- SECTION 2: CATATAN AKHIR WAWANCARA -->
              <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
                <div style="margin-bottom: 14px;">
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-comment-dots" style="color: var(--primary-600);"></i>
                    Catatan Akhir Wawancara
                  </h3>
                  <p style="margin: 4px 0 0 0; font-size: 0.825rem; color: var(--text-muted);">
                    Tuliskan kesimpulan umum mengenai kepribadian, akhlak, dan potensi calon santri.
                  </p>
                </div>

                <div id="editor_wrapper_general_notes"></div>
              </div>

              <!-- SECTION 3: REKOMENDASI HASIL WAWANCARA -->
              <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
                <div style="margin-bottom: 16px;">
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-award" style="color: #f59e0b;"></i>
                    Rekomendasi Wawancara <span style="color: #ef4444;">*</span>
                  </h3>
                  <p style="margin: 4px 0 0 0; font-size: 0.825rem; color: var(--text-muted);">
                    Pilih salah satu rekomendasi hasil seleksi wawancara untuk calon santri ini.
                  </p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                  
                  <label class="recommendation-option" style="display: flex; align-items: center; gap: 10px; border: 2px solid ${iw.recommendation === 'HIGHLY_RECOMMENDED' ? '#16a34a' : 'var(--border-subtle)'}; background: ${iw.recommendation === 'HIGHLY_RECOMMENDED' ? 'rgba(34,197,94,0.08)' : 'var(--bg-body)'}; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                    <input type="radio" name="recommendation" value="HIGHLY_RECOMMENDED" ${iw.recommendation === 'HIGHLY_RECOMMENDED' ? 'checked' : ''} ${isLocked ? 'disabled' : ''} style="width: 18px; height: 18px;">
                    <div>
                      <strong style="color: #15803d; font-size: 0.9rem; display: block;">Sangat Direkomendasikan</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Sangat layak diterima</span>
                    </div>
                  </label>

                  <label class="recommendation-option" style="display: flex; align-items: center; gap: 10px; border: 2px solid ${iw.recommendation === 'RECOMMENDED' ? '#2563eb' : 'var(--border-subtle)'}; background: ${iw.recommendation === 'RECOMMENDED' ? 'rgba(59,130,246,0.08)' : 'var(--bg-body)'}; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                    <input type="radio" name="recommendation" value="RECOMMENDED" ${iw.recommendation === 'RECOMMENDED' ? 'checked' : ''} ${isLocked ? 'disabled' : ''} style="width: 18px; height: 18px;">
                    <div>
                      <strong style="color: #1d4ed8; font-size: 0.9rem; display: block;">Direkomendasikan</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Layak diterima</span>
                    </div>
                  </label>

                  <label class="recommendation-option" style="display: flex; align-items: center; gap: 10px; border: 2px solid ${iw.recommendation === 'CONSIDERED' ? '#d97706' : 'var(--border-subtle)'}; background: ${iw.recommendation === 'CONSIDERED' ? 'rgba(245,158,11,0.08)' : 'var(--bg-body)'}; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                    <input type="radio" name="recommendation" value="CONSIDERED" ${iw.recommendation === 'CONSIDERED' ? 'checked' : ''} ${isLocked ? 'disabled' : ''} style="width: 18px; height: 18px;">
                    <div>
                      <strong style="color: #b45309; font-size: 0.9rem; display: block;">Dipertimbangkan</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Memerlukan musyawarah</span>
                    </div>
                  </label>

                  <label class="recommendation-option" style="display: flex; align-items: center; gap: 10px; border: 2px solid ${iw.recommendation === 'NOT_RECOMMENDED' ? '#dc2626' : 'var(--border-subtle)'}; background: ${iw.recommendation === 'NOT_RECOMMENDED' ? 'rgba(239,68,68,0.08)' : 'var(--bg-body)'}; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                    <input type="radio" name="recommendation" value="NOT_RECOMMENDED" ${iw.recommendation === 'NOT_RECOMMENDED' ? 'checked' : ''} ${isLocked ? 'disabled' : ''} style="width: 18px; height: 18px;">
                    <div>
                      <strong style="color: #b91c1c; font-size: 0.9rem; display: block;">Tidak Direkomendasikan</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">Tidak memenuhi kriteria</span>
                    </div>
                  </label>

                </div>
              </div>

              <!-- ACTION FOOTER BUTTONS (Screen 5 Reference) -->
              ${!isLocked ? `
                <div class="interview-process-actions">
                  <div style="font-size: 0.85rem; color: var(--text-muted);">
                    <i class="fa-solid fa-shield-halved" style="color: #16a34a;"></i> Data otomatis tersimpan saat Anda menekan tombol.
                  </div>
                  <div class="btn-action-group" style="display: flex; gap: 12px;">
                    <button type="button" onclick="handleSaveDraft('${interviewId}')" class="btn btn-secondary" style="font-weight: 700; padding: 12px 20px; border-radius: 10px;">
                      <i class="fa-regular fa-floppy-disk"></i> Simpan Draft
                    </button>
                    <button type="button" onclick="handleFinishInterview('${interviewId}')" class="btn btn-primary" style="font-weight: 800; padding: 12px 26px; border-radius: 10px; background: #16a34a; border-color: #16a34a; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
                      <i class="fa-solid fa-circle-check"></i> SELESAIKAN WAWANCARA
                    </button>
                  </div>
                </div>
              ` : `
                <div class="alert alert-info" style="border-radius: 12px; font-weight: 600;">
                  <i class="fa-solid fa-lock"></i> Wawancara untuk santri ini telah selesai dan dikunci.
                </div>
              `}

            </form>

          </div>

        </div>

      </div>
    `;

    // Initialize Rich Text Editors for initial questions
    initialQuestions.forEach((q, idx) => {
      const initialHtml = noteMap[q.questionText] || noteMap[q.questionId] || '';
      if (window.InterviewEditor) {
        window.InterviewEditor.init(`editor_wrapper_initial_${idx}`, initialHtml, 'Tulis catatan respon santri...', '90px');
      }
    });

    // Initialize Rich Text Editors for custom questions
    customQuestions.forEach((cq, idx) => {
      const customHtml = noteMap[cq.questionText] || noteMap[cq.questionId] || '';
      if (window.InterviewEditor) {
        window.InterviewEditor.init(`editor_wrapper_custom_${idx}`, customHtml, 'Tulis catatan respon santri...', '90px');
      }
    });

    // Initialize General Notes Rich Text Editor
    if (window.InterviewEditor) {
      window.InterviewEditor.init('editor_wrapper_general_notes', iw.generalNotes || '', 'Tuliskan kesimpulan umum penilaian wawancara santri...', '120px');
    }

    // Attach radio change visual styling
    const radios = document.querySelectorAll('input[name="recommendation"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        document.querySelectorAll('.recommendation-option').forEach(opt => {
          opt.style.borderColor = 'var(--border-subtle)';
          opt.style.background = 'var(--bg-body)';
        });
        const parent = r.closest('.recommendation-option');
        if (parent) {
          if (r.value === 'HIGHLY_RECOMMENDED') {
            parent.style.borderColor = '#16a34a';
            parent.style.background = 'rgba(34,197,94,0.08)';
          } else if (r.value === 'RECOMMENDED') {
            parent.style.borderColor = '#2563eb';
            parent.style.background = 'rgba(59,130,246,0.08)';
          } else if (r.value === 'CONSIDERED') {
            parent.style.borderColor = '#d97706';
            parent.style.background = 'rgba(245,158,11,0.08)';
          } else if (r.value === 'NOT_RECOMMENDED') {
            parent.style.borderColor = '#dc2626';
            parent.style.background = 'rgba(239,68,68,0.08)';
          }
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">${err.message}</div>`;
  }
}

// ============================================================================
// SCREEN 6: MODAL TAMBAH PERTANYAAN SPONTAN (INTERVIEWER)
// ============================================================================

function openSpontaneousQuestionModal() {
  const modal = document.getElementById('app-modal');
  const modalBody = document.getElementById('app-modal-body');
  if (!modal || !modalBody) return;

  modalBody.style.maxWidth = '600px';

  modalBody.innerHTML = `
    <div style="margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-plus-circle" style="color: #f59e0b;"></i>
          Tambah Pertanyaan Spontan
        </h3>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
          Pertanyaan ini hanya akan ditambahkan khusus untuk calon santri ini.
        </p>
      </div>
      <button type="button" onclick="closeAppModal()" style="background: none; border: none; font-size: 1.3rem; color: var(--text-dim); cursor: pointer;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <form onsubmit="handleSaveSpontaneousQuestion(event)">
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
          Teks Pertanyaan Spontan <span style="color: #ef4444;">*</span>
        </label>
        <textarea id="spontaneous-question-text" class="form-control" rows="3" placeholder="Tulis pertanyaan tambahan yang diajukan..." required style="font-size: 0.875rem;"></textarea>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 0.825rem; font-weight: 700; color: var(--text-heading); margin-bottom: 4px;">
          Catatan / Jawaban Awal (Opsional)
        </label>
        <div id="spontaneous-initial-note-wrapper"></div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
        <button type="button" onclick="closeAppModal()" class="btn btn-secondary" style="font-weight: 700;">
          Batal
        </button>
        <button type="submit" class="btn btn-primary" style="font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-check"></i> Simpan Pertanyaan
        </button>
      </div>
    </form>
  `;

  modal.style.display = 'flex';

  if (window.InterviewEditor) {
    window.InterviewEditor.init('spontaneous-initial-note-wrapper', '', 'Catatan respon santri...', '90px');
  }

  setTimeout(() => {
    document.getElementById('spontaneous-question-text')?.focus();
  }, 100);
}

function handleSaveSpontaneousQuestion(e) {
  e.preventDefault();
  const text = document.getElementById('spontaneous-question-text')?.value.trim();
  if (!text) return;

  let note = '';
  if (window.InterviewEditor) {
    note = window.InterviewEditor.getContent('spontaneous-initial-note-wrapper');
  }

  const customQuestion = {
    questionId: `custom-${Date.now()}`,
    questionText: text,
    isCustomQuestion: true,
    initialNote: note,
    sortOrder: (window.interviewerProcessState.questions.length || 0) + 1,
  };

  window.interviewerProcessState.questions.push(customQuestion);

  // Re-render the process page preserving current form values
  closeAppModal();
  reRenderProcessCustomQuestions();
}

function reRenderProcessCustomQuestions() {
  const container = document.getElementById('spontaneous-questions-container');
  if (!container) return;

  const customQuestions = window.interviewerProcessState.questions.filter(q => q.isCustomQuestion);

  container.innerHTML = customQuestions.map((cq, idx) => `
    <div class="question-block spontaneous-block" id="custom-q-block-${idx}" style="border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px; background: rgba(254, 243, 199, 0.15);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 0.725rem; padding: 3px 8px; border-radius: 4px;">
            Spontan
          </span>
          <strong style="color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(cq.questionText)}</strong>
        </div>
        <button type="button" onclick="handleRemoveCustomQuestion(${idx})" class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div id="editor_wrapper_custom_${idx}"></div>
    </div>
  `).join('');

  // Re-init editors for custom questions
  customQuestions.forEach((cq, idx) => {
    if (window.InterviewEditor) {
      window.InterviewEditor.init(`editor_wrapper_custom_${idx}`, cq.initialNote || '', 'Tulis catatan respon santri...', '90px');
    }
  });
}

function handleRemoveCustomQuestion(customIndex) {
  const customQuestions = window.interviewerProcessState.questions.filter(q => q.isCustomQuestion);
  const target = customQuestions[customIndex];
  if (!target) return;

  window.interviewerProcessState.questions = window.interviewerProcessState.questions.filter(q => q !== target);
  reRenderProcessCustomQuestions();
}

// ============================================================================
// ASSESSMENT SAVE & FINISH HANDLERS
// ============================================================================

function collectAssessmentData() {
  const questions = window.interviewerProcessState.questions || [];
  const initialQuestions = questions.filter(q => !q.isCustomQuestion);
  const customQuestions = questions.filter(q => q.isCustomQuestion);

  const questionNotes = [];

  // Collect notes from initial questions
  initialQuestions.forEach((q, idx) => {
    let noteText = '';
    if (window.InterviewEditor) {
      noteText = window.InterviewEditor.getContent(`editor_wrapper_initial_${idx}`);
    }
    questionNotes.push({
      questionId: q.questionId || null,
      questionText: q.questionText,
      notes: noteText,
      isCustomQuestion: false,
      sortOrder: idx + 1,
    });
  });

  // Collect notes from custom questions
  customQuestions.forEach((cq, idx) => {
    let noteText = '';
    if (window.InterviewEditor) {
      noteText = window.InterviewEditor.getContent(`editor_wrapper_custom_${idx}`);
    }
    questionNotes.push({
      questionId: cq.questionId || null,
      questionText: cq.questionText,
      notes: noteText,
      isCustomQuestion: true,
      sortOrder: initialQuestions.length + idx + 1,
    });
  });

  // Collect general notes
  let generalNotes = '';
  if (window.InterviewEditor) {
    generalNotes = window.InterviewEditor.getContent('editor_wrapper_general_notes');
  }

  // Collect recommendation
  const recRadio = document.querySelector('input[name="recommendation"]:checked');
  const recommendation = recRadio ? recRadio.value : null;

  return {
    questionNotes,
    generalNotes,
    recommendation,
  };
}

async function handleSaveDraft(interviewId) {
  try {
    const payload = collectAssessmentData();
    payload.isComplete = false;

    const res = await apiRequest(`/api/interview/interviewer/process/${interviewId}/save`, 'POST', payload);
    if (!res.success) throw new Error(res.message || 'Gagal menyimpan draft wawancara.');

    showGlobalAlert('Draft wawancara berhasil disimpan!', 'success');
  } catch (err) {
    alert(err.message);
  }
}

async function handleFinishInterview(interviewId) {
  const payload = collectAssessmentData();

  if (!payload.recommendation) {
    alert('Mohon pilih Rekomendasi Wawancara terlebih dahulu.');
    return;
  }

  if (!confirm('Apakah Anda yakin ingin menyelesaikan wawancara ini? Lembar penilaian akan dikunci dan hasil diserahkan ke Super Admin.')) {
    return;
  }

  try {
    payload.isComplete = true;
    const res = await apiRequest(`/api/interview/interviewer/process/${interviewId}/save`, 'POST', payload);
    if (!res.success) throw new Error(res.message || 'Gagal menyelesaikan wawancara.');

    showGlobalAlert('Wawancara telah selesai dan hasil berhasil diserahkan!', 'success');
    window.location.hash = '#iw-my-participants';
  } catch (err) {
    alert(err.message);
  }
}

// ============================================================================
// JADWAL SAYA, DAFTAR PESERTA & RIWAYAT (PEWAWANCARA)
// ============================================================================

let currentInterviewerScheduleTab = 'active';

async function renderInterviewerMySchedules(activeTab = null) {
  if (activeTab) currentInterviewerScheduleTab = activeTab;
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Jadwal Saya...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/interview/interviewer/schedules?perPage=100');
    let schedules = [];
    if (res.success && res.data) {
      if (Array.isArray(res.data)) {
        schedules = res.data;
      } else if (Array.isArray(res.data.data)) {
        schedules = res.data.data;
      }
    }

    // Process completion metrics for each schedule
    const processedSchedules = schedules.map(sch => {
      const totalCount = sch.interviews ? sch.interviews.length : (sch._count?.interviews || 0);
      const completedCount = sch.interviews ? sch.interviews.filter(i => i.status === 'COMPLETED').length : 0;
      const inProgressCount = sch.interviews ? sch.interviews.filter(i => i.status === 'IN_PROGRESS').length : 0;
      const pendingCount = Math.max(0, totalCount - completedCount);
      const isAllCompleted = totalCount > 0 && completedCount === totalCount;
      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return {
        ...sch,
        totalCount,
        completedCount,
        inProgressCount,
        pendingCount,
        isAllCompleted,
        percent
      };
    });

    const activeSchedules = processedSchedules.filter(s => !s.isAllCompleted);
    const completedSchedules = processedSchedules.filter(s => s.isAllCompleted);

    const isShowingActive = currentInterviewerScheduleTab === 'active';
    const displayList = isShowingActive ? activeSchedules : completedSchedules;

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-calendar-week" style="color: var(--primary-600);"></i>
              Jadwal Tugas Wawancara Saya
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
              Daftar sesi jadwal wawancara yang ditugaskan kepada Anda. Sesi yang telah 100% selesai diwawancarai diarsipkan otomatis.
            </p>
          </div>

          <div style="display: flex; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 4px; border-radius: 12px; box-shadow: var(--shadow-sm);">
            <button onclick="renderInterviewerMySchedules('active')" class="btn btn-sm ${isShowingActive ? 'btn-primary' : 'btn-outline'}" style="font-weight: 700; border-radius: 8px; display: flex; align-items: center; gap: 6px; padding: 6px 14px;">
              <i class="fa-solid fa-clock-rotate-left"></i> Siap Wawancara
              <span class="badge" style="background: ${isShowingActive ? 'rgba(255,255,255,0.25)' : 'var(--primary-600)'}; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${activeSchedules.length}</span>
            </button>
            <button onclick="renderInterviewerMySchedules('completed')" class="btn btn-sm ${!isShowingActive ? 'btn-primary' : 'btn-outline'}" style="font-weight: 700; border-radius: 8px; display: flex; align-items: center; gap: 6px; padding: 6px 14px;">
              <i class="fa-solid fa-circle-check"></i> Sesi Selesai
              <span class="badge" style="background: ${!isShowingActive ? 'rgba(255,255,255,0.25)' : 'var(--success-600, #10b981)'}; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${completedSchedules.length}</span>
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${displayList.length === 0 ? `
            <div class="card" style="padding: 50px 30px; text-align: center; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px);">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: ${isShowingActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-body)'}; color: ${isShowingActive ? 'var(--success-600, #10b981)' : 'var(--text-muted)'}; display: inline-flex; align-items: center; justify-content: center; font-size: 1.8rem; margin-bottom: 16px;">
                <i class="fa-solid ${isShowingActive ? 'fa-check-double' : 'fa-calendar-xmark'}"></i>
              </div>
              <h3 style="margin: 0 0 8px 0; font-size: 1.15rem; font-weight: 800; color: var(--text-heading);">
                ${isShowingActive ? 'Semua Wawancara Selesai!' : 'Belum Ada Sesi yang Selesai'}
              </h3>
              <p style="margin: 0 auto; max-width: 500px; font-size: 0.9rem; color: var(--text-muted);">
                ${isShowingActive 
                  ? 'Tidak ada antrean jadwal wawancara aktif. Seluruh calon santri pada sesi yang ditugaskan telah selesai diwawancarai.' 
                  : 'Sesi jadwal yang semua santrinya telah selesai diwawancara akan muncul di tab ini sebagai arsip riwayat.'}
              </p>
              ${isShowingActive && completedSchedules.length > 0 ? `
                <div style="margin-top: 20px;">
                  <button onclick="renderInterviewerMySchedules('completed')" class="btn btn-outline btn-sm" style="font-weight: 700;">
                    <i class="fa-solid fa-list-check"></i> Lihat Riwayat Sesi Selesai (${completedSchedules.length})
                  </button>
                </div>
              ` : ''}
            </div>
          ` : displayList.map(sch => {
            const dateStr = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
            
            return `
              <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); padding: 22px; box-shadow: var(--shadow-sm); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 5px solid ${sch.isAllCompleted ? 'var(--success-600, #10b981)' : 'var(--primary-600)'};">
                <div style="flex: 1; min-width: 280px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-heading);">
                      ${escapeHtml(sch.name || sch.roomLocation || 'Jadwal Sesi Wawancara')}
                    </h3>
                    ${sch.isAllCompleted ? `
                      <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success-600, #10b981); border: 1px solid rgba(16, 185, 129, 0.2); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
                        <i class="fa-solid fa-circle-check"></i> 100% Selesai
                      </span>
                    ` : (sch.inProgressCount > 0 ? `
                      <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Berlangsung
                      </span>
                    ` : `
                      <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary-600); border: 1px solid rgba(99, 102, 241, 0.2); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
                        <i class="fa-solid fa-bolt"></i> Siap Wawancara
                      </span>
                    `)}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 12px;">
                    <span><i class="fa-solid fa-calendar-day"></i> ${dateStr}</span>
                    <span><i class="fa-regular fa-clock"></i> ${sch.startTime} - ${sch.endTime} WIB</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || '-')}</span>
                  </div>

                  <!-- Progress Mini Bar -->
                  <div style="max-width: 380px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
                      <span>Progress Wawancara</span>
                      <span>${sch.completedCount} / ${sch.totalCount} Santri (${sch.percent}%)</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-body); border-radius: 3px; overflow: hidden;">
                      <div style="height: 100%; width: ${sch.percent}%; background: ${sch.isAllCompleted ? 'var(--success-600, #10b981)' : 'var(--primary-600)'}; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="text-align: right;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">SISA ANTREAN</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: ${sch.pendingCount > 0 ? 'var(--primary-600)' : 'var(--success-600, #10b981)'};">
                      ${sch.pendingCount} Santri
                    </div>
                  </div>
                  <a href="#iw-my-participants" class="btn ${sch.isAllCompleted ? 'btn-outline' : 'btn-primary'}" style="text-decoration: none; padding: 10px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid ${sch.isAllCompleted ? 'fa-eye' : 'fa-clipboard-user'}"></i> 
                    ${sch.isAllCompleted ? 'Lihat Nilai Santri' : 'Buka Antrean Santri'}
                  </a>
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

async function renderInterviewerMyParticipants() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Daftar Peserta...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/interview/interviewer/participants?perPage=100');
    const participants = (res.success && res.data) ? (Array.isArray(res.data.data) ? res.data.data : res.data) : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-users" style="color: var(--primary-600);"></i>
            Daftar Santri Wawancara
          </h2>
          <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
            Daftar calon santri yang dialokasikan ke jadwal tugas Anda
          </p>
        </div>

        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                  <th style="padding: 14px 16px; width: 60px;">No</th>
                  <th style="padding: 14px 16px;">Calon Santri</th>
                  <th style="padding: 14px 16px;">Sekolah & Program</th>
                  <th style="padding: 14px 16px; text-align: center;">Status</th>
                  <th style="padding: 14px 16px; text-align: center;">Rekomendasi</th>
                  <th style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-body); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06);">Aksi</th>
                </tr>
              </thead>
              <tbody style="font-size: 0.875rem;">
                ${participants.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                      Tidak ada peserta dalam antrean Anda saat ini.
                    </td>
                  </tr>
                ` : participants.map((p, idx) => {
                  const iw = p.interview;
                  const isCompleted = (p.interviewStatus || iw?.status) === 'COMPLETED';
                  const name = p.participantName || p.user?.name || p.studentDetail?.fullName || 'Calon Santri';
                  const regNum = p.registrationNumber || p.id;
                  const schoolProgram = p.schoolName ? `${p.schoolName} (${p.programName || '-'})` : (p.programName || p.classProgram?.name || '-');
                  const originSchool = p.originSchool || p.studentDetail?.previousSchoolName || '-';
                  const g = (p.gender || p.studentDetail?.gender || 'L').toUpperCase();
                  const isMale = g === 'L';
                  const genderBadge = isMale
                    ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♂ L</span>`
                    : `<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♀ P</span>`;

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${idx + 1}</td>
                      <td style="padding: 14px 16px;">
                        <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
                          ${escapeHtml(name)} ${genderBadge}
                        </div>
                        <div style="font-size: 0.775rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
                          No. Santri: <strong>${escapeHtml(regNum)}</strong>
                        </div>
                      </td>
                      <td style="padding: 14px 16px; font-size: 0.825rem;">
                        <strong>${escapeHtml(schoolProgram)}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                          Asal: ${escapeHtml(originSchool)}
                        </div>
                      </td>
                      <td style="padding: 14px 16px; text-align: center;">
                        ${typeof getInterviewStatusBadge === 'function' ? getInterviewStatusBadge(p.interviewStatus || iw?.status || 'SCHEDULED') : (p.interviewStatus || iw?.status || 'SCHEDULED')}
                      </td>
                      <td style="padding: 14px 16px; text-align: center;">
                        ${typeof getRecommendationBadge === 'function' ? getRecommendationBadge(iw?.recommendation) : (iw?.recommendation || '-')}
                      </td>
                      <td style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-card); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06); white-space: nowrap;">
                        <a href="#iw-process/${p.interviewId || iw?.id || p.id}" class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 7px 14px; border-radius: 8px;">
                          <i class="fa-solid ${isCompleted ? 'fa-eye' : 'fa-play'}"></i> 
                          ${isCompleted ? 'Lihat Hasil' : 'Wawancarai'}
                        </a>
                      </td>
                    </tr>
                  `;
                }).join('')}
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

async function renderInterviewerHistory() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memuat Riwayat Wawancara...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/interview/interviewer/participants?status=COMPLETED&perPage=100');
    const participants = (res.success && res.data) ? (Array.isArray(res.data.data) ? res.data.data : res.data) : [];

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-clock-rotate-left" style="color: var(--primary-600);"></i>
            Riwayat Selesai Wawancara
          </h2>
          <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
            Daftar santri yang telah selesai dinilai dan diserahkan ke Super Admin
          </p>
        </div>

        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 16px); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: var(--bg-body); border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">
                  <th style="padding: 14px 16px; width: 60px;">No</th>
                  <th style="padding: 14px 16px;">Calon Santri</th>
                  <th style="padding: 14px 16px;">Program & Asal Sekolah</th>
                  <th style="padding: 14px 16px; text-align: center;">Rekomendasi</th>
                  <th style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-body); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06);">Aksi</th>
                </tr>
              </thead>
              <tbody style="font-size: 0.875rem;">
                ${participants.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                      Belum ada riwayat santri yang selesai diwawancarai.
                    </td>
                  </tr>
                ` : participants.map((p, idx) => {
                  const iw = p.interview;
                  const name = p.participantName || p.user?.name || p.studentDetail?.fullName || 'Calon Santri';
                  const regNum = p.registrationNumber || p.id;
                  const schoolProgram = p.schoolName ? `${p.schoolName} (${p.programName || '-'})` : (p.programName || p.classProgram?.name || '-');
                  const originSchool = p.originSchool || p.studentDetail?.previousSchoolName || '-';
                  const g = (p.gender || p.studentDetail?.gender || 'L').toUpperCase();
                  const isMale = g === 'L';
                  const genderBadge = isMale
                    ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♂ L</span>`
                    : `<span class="badge" style="background:#fce7f3; color:#9d174d; border:1px solid #fbcfe8; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px;">♀ P</span>`;

                  return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 14px 16px; font-weight: 700; color: var(--text-dim);">${idx + 1}</td>
                      <td style="padding: 14px 16px;">
                        <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">
                          ${escapeHtml(name)} ${genderBadge}
                        </div>
                        <div style="font-size: 0.775rem; color: var(--primary-600); font-weight: 600; margin-top: 2px;">
                          No. Santri: <strong>${escapeHtml(regNum)}</strong>
                        </div>
                      </td>
                      <td style="padding: 14px 16px; font-size: 0.825rem;">
                        <strong>${escapeHtml(schoolProgram)}</strong>
                        <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
                          Asal: ${escapeHtml(originSchool)}
                        </div>
                      </td>
                      <td style="padding: 14px 16px; text-align: center;">
                        ${typeof getRecommendationBadge === 'function' ? getRecommendationBadge(iw?.recommendation) : (iw?.recommendation || '-')}
                      </td>
                      <td style="padding: 14px 16px; text-align: center; position: sticky; right: 0; background: var(--bg-card); z-index: 2; box-shadow: -4px 0 8px rgba(0,0,0,0.06); white-space: nowrap;">
                        <a href="#iw-process/${p.interviewId || iw?.id || p.id}" class="btn btn-sm btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 7px 14px; border-radius: 8px;">
                          <i class="fa-solid fa-eye"></i> Lihat Evaluasi
                        </a>
                      </td>
                    </tr>
                  `;
                }).join('')}
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
