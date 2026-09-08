/**
 * ============================================================================
 * CBT MODULE — PESERTA (CANDIDATE) INTERFACE & FULLSCREEN EXAM RUNNER
 * ============================================================================
 * Features:
 * 1. Eligibility status check & dynamic views (Locked, Not Available, Ready, In Progress, Completed)
 * 2. Pre-exam confirmation modal (1 attempt, server timer, autosave warnings)
 * 3. Launches exam in new tab with automatic Fullscreen focus mode
 * 4. Responsive Fullscreen Exam Runner (Desktop & Mobile, sidebar/topbar hidden in exam mode)
 * 5. Live Server-synced countdown timer + auto-submit on expiry
 * 6. Instant / Debounced autosave with visual status indicator
 * 7. Interactive Question Palette (Answered, Unanswered, Flagged, Current)
 * 8. Finish confirmation modal & secure completion screen (no answer leaks)
 */

window.cbtPesertaState = {
  statusData: null,
  sessionData: null,
  currentQuestionIndex: 0,
  timerInterval: null,
  answersMap: {}, // questionId -> { selectedOptionId, essayAnswer, isFlagged }
  autosaveTimeout: null,
  isSubmitting: false,
};

// Fullscreen Utility Helpers
function requestAppFullscreen() {
  try {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) {
      const promise = rfs.call(el);
      if (promise && promise.catch) {
        promise.catch(() => { });
      }
    }
  } catch (e) { }
}

function exitAppFullscreen() {
  try {
    const efs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (efs && (document.fullscreenElement || document.webkitFullscreenElement)) {
      const promise = efs.call(document);
      if (promise && promise.catch) {
        promise.catch(() => { });
      }
    }
  } catch (e) { }
}

function toggleAppFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    exitAppFullscreen();
  } else {
    requestAppFullscreen();
  }
}

// ============================================================================
// 1. PESERTA STATUS VIEW
// ============================================================================

async function renderCbtPesertaView() {
  // Ensure we remove exam mode if on status view
  document.body.classList.remove('cbt-exam-mode');

  // Clear any running timer
  if (window.cbtPesertaState.timerInterval) {
    clearInterval(window.cbtPesertaState.timerInterval);
    window.cbtPesertaState.timerInterval = null;
  }

  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; font-weight: 600;">Memeriksa status ujian online...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/cbt/peserta/status');
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat status ujian.');

    const d = res.data;
    window.cbtPesertaState.statusData = d;

    // ------------------------------------------------------------------------
    // STATE 1: Ineligible / Data Registration Not Verified
    // ------------------------------------------------------------------------
    if (!d.isEligible && !d.eligible) {
      container.innerHTML = `
        <div style="max-width: 680px; margin: 30px auto;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px 28px; text-align: center; box-shadow: var(--shadow-md);">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-lock"></i>
            </div>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">Ujian Online Belum Dapat Diakses</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
              Data pendaftaran Anda belum memenuhi syarat untuk mengikuti Ujian Online CBT.<br>
              <span style="font-size: 0.85rem; color: #ef4444; font-weight: 600;">(Pastikan Formulir Pendaftaran Lengkap sudah Terverifikasi & Disetujui oleh Panitia PSB)</span>
            </p>

            <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 24px; text-align: left; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Status Pendaftaran:</span>
                <strong style="color: var(--text-heading);">${d.registrationStatus || 'PENDING'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Status Formulir:</span>
                <strong style="color: var(--text-heading);">${d.formStatus || 'DRAFT'}</strong>
              </div>
            </div>

            <a href="#formulir" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-file-signature"></i> Periksa Formulir Pendaftaran
            </a>
          </div>
        </div>
      `;
      return;
    }

    // ------------------------------------------------------------------------
    // STATE 2: Exam Not Available Yet
    // ------------------------------------------------------------------------
    if (!d.examAvailable) {
      container.innerHTML = `
        <div style="max-width: 680px; margin: 30px auto;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px 28px; text-align: center; box-shadow: var(--shadow-md);">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-clock"></i>
            </div>
            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">Ujian Belum Tersedia</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px;">
              Ujian CBT untuk Program Kelas <strong>${d.classProgramName || ''}</strong> belum dibuka atau sedang dipersiapkan oleh panitia.
            </p>
            <div style="padding: 12px 18px; border-radius: var(--radius-md); background: var(--bg-body); border: 1px solid var(--border-subtle); display: inline-block; font-size: 0.85rem; color: var(--text-dim);">
              Silakan periksa kembali halaman ini secara berkala atau hubungi panitia PSB.
            </div>
          </div>
        </div>
      `;
      return;
    }

    // ------------------------------------------------------------------------
    // STATE 3: Ready to Start (Belum Ujian)
    // ------------------------------------------------------------------------
    if (d.attemptState === 'READY') {
      const exam = d.exam || {};
      container.innerHTML = `
        <div style="max-width: 760px; margin: 20px auto;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 32px 28px; box-shadow: var(--shadow-md);">
            
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid var(--border-subtle); padding-bottom: 18px;">
              <div style="width: 58px; height: 58px; border-radius: 16px; background: rgba(14, 165, 233, 0.12); color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0;">
                <i class="fa-solid fa-laptop-code"></i>
              </div>
              <div>
                <span class="badge badge-success" style="font-size: 0.75rem; margin-bottom: 4px;"><i class="fa-solid fa-check"></i> Siap Mengikuti Ujian</span>
                <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin: 0;">${exam.title || `Ujian CBT — ${d.classProgramName || ''}`}</h2>
                <div style="font-size: 0.85rem; color: var(--text-muted);">${d.schoolName || ''} &bull; ${d.majorName || ''}</div>
              </div>
            </div>

            <!-- Exam Details Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px;">
              
              <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px; text-align: center;">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Jumlah Soal</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading);">${exam.totalQuestions || 0} Soal</div>
              </div>

              <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px; text-align: center;">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Durasi Ujian</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7;">${exam.durationMinutes || 60} Menit</div>
              </div>

              <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px; text-align: center;">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Kesempatan</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #16a34a;">1 Kali</div>
              </div>

            </div>

            <!-- Important Instructions -->
            <div style="background: rgba(14, 165, 233, 0.06); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 28px;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: #0284c7; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-info"></i> Petunjuk Penting Pengerjaan:
              </h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-main); line-height: 1.6;">
                <li><strong>Jangan memulai ujian jika Anda belum benar-benar siap.</strong> Pastikan koneksi internet dan perangkat dalam kondisi baik sebelum memulai.</li>
                <li>Ujian hanya dapat dikerjakan <strong>1 (satu) kali</strong> dan tidak dapat diulang.</li>
                <li>Waktu ujian akan <strong>otomatis berjalan mundur</strong> begitu Anda memulai ujian.</li>
                <li>Halaman ujian akan otomatis terbuka di <strong>tab baru dengan mode layar penuh (fullscreen)</strong>.</li>
                <li>Jawaban Anda akan tersimpan secara <strong>otomatis (autosave)</strong> ke dalam sistem.</li>
                <li>Jika waktu habis, sistem akan secara otomatis <strong>mengumpulkan jawaban yang telah Anda isi</strong>.</li>
                <li><strong>Kerjakan ujian dengan jujur dan mandiri.</strong> Segala bentuk kecurangan dapat memengaruhi hasil seleksi.</li>
                <li>Jika mengalami kendala teknis sebelum atau selama ujian, segera hubungi <strong>WhatsApp Panitia PSB: <a href="wa.me/62817881859">+62 817-8818-59</a></strong>.</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <button type="button" class="btn btn-primary" onclick="openStartExamConfirmationModal()" style="font-size: 1.05rem; padding: 14px 36px; border-radius: var(--radius-lg); display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
                <i class="fa-solid fa-play"></i> MULAI UJIAN SEKARANG
              </button>
            </div>

          </div>
        </div>
      `;
      return;
    }

    // ------------------------------------------------------------------------
    // STATE 4: In Progress (Sedang Ujian)
    // ------------------------------------------------------------------------
    if (d.attemptState === 'IN_PROGRESS') {
      const exam = d.exam || {};
      container.innerHTML = `
        <div style="max-width: 680px; margin: 30px auto;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px 28px; text-align: center; box-shadow: var(--shadow-md);">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(14, 165, 233, 0.12); color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            
            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-heading); margin-bottom: 6px;">Ujian Sedang Berlangsung</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
              Sesi ujian Anda sedang aktif dan waktu terus berjalan.<br>
              Klik tombol di bawah untuk melanjutkan pengerjaan soal di mode layar penuh.
            </p>

            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <button type="button" class="btn btn-primary" onclick="launchExamRunnerInNewTab()" style="font-size: 1rem; padding: 12px 28px; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-up-right-from-square"></i> Buka Ujian di Tab Baru
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.location.hash='#cbt-exam'" style="font-size: 1rem; padding: 12px 24px; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-expand"></i> Lanjutkan di Tab Ini
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // ------------------------------------------------------------------------
    // STATE 5: Completed (Ujian Selesai)
    // ------------------------------------------------------------------------
    if (d.attemptState === 'COMPLETED') {
      const att = d.attempt;
      container.innerHTML = `
        <div style="max-width: 680px; margin: 30px auto;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 36px 28px; text-align: center; box-shadow: var(--shadow-md);">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(34, 197, 94, 0.12); color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            
            <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin-bottom: 6px;">Ujian CBT Telah Selesai</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
              Terima kasih, Anda telah berhasil menyelesaikan dan mengumpulkan lembar jawaban ujian online.
            </p>

            <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; text-align: left; font-size: 0.875rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Program Kelas:</span>
                <strong style="color: var(--text-heading);">${d.classProgramName || ''}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Waktu Mulai:</span>
                <strong style="color: var(--text-heading);">${att?.startedAt ? new Date(att.startedAt).toLocaleString('id-ID') : '-'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Waktu Selesai:</span>
                <strong style="color: var(--text-heading);">${att?.completedAt ? new Date(att.completedAt).toLocaleString('id-ID') : '-'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Status Pengerjaan:</span>
                <span class="badge badge-success" style="font-size: 0.75rem;"><i class="fa-solid fa-check-double"></i> SUDAH DIKUMPULKAN</span>
              </div>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 24px;">
              Selanjutnya, proses seleksi akan dilanjutkan ke tahap Wawancara. Jadwal dan informasi terkait pelaksanaan wawancara akan diumumkan melalui sistem ini.
            </div>

            <a href="#overview" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-house"></i> Kembali ke Dashboard Utama
            </a>
          </div>
        </div>
      `;
      return;
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="max-width: 700px; margin: 20px auto;">${err.message}</div>`;
  }
}

// ----------------------------------------------------------------------------
// PRE-EXAM CONFIRMATION MODAL & LAUNCH
// ----------------------------------------------------------------------------

function openStartExamConfirmationModal() {
  const d = window.cbtPesertaState.statusData;

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(245, 158, 11, 0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 12px;">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <p style="font-size: 0.95rem; color: var(--text-heading); font-weight: 700; margin: 0;">Apakah Anda yakin siap memulai ujian online sekarang?</p>
    </div>

    <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 24px; font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">
      <strong>Peringatan Penting:</strong>
      <ul style="margin: 6px 0 0 0; padding-left: 18px;">
        <li>Ujian berdurasi <strong>${d?.exam?.durationMinutes || 60} Menit</strong>.</li>
        <li>Timer akan langsung berjalan dan tidak dapat dihentikan sementara (pause).</li>
        <li>Halaman pengerjaan soal akan <strong>otomatis terbuka di tab baru dan masuk ke mode layar penuh (fullscreen)</strong>.</li>
        <li>Pastikan Anda berada di tempat yang tenang dengan koneksi internet yang stabil.</li>
      </ul>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 10px;">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="button" id="btn-confirm-start" class="btn btn-primary" onclick="handleStartPesertaAttempt()" style="display: inline-flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-play"></i> Ya, Mulai Ujian Sekarang
      </button>
    </div>
  `;

  openModal('Konfirmasi Memulai Ujian', bodyHtml);
}

async function handleStartPesertaAttempt() {
  const btn = document.getElementById('btn-confirm-start');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Soal...';
  }

  try {
    const res = await apiRequest('/api/cbt/peserta/start', { method: 'POST' });
    if (!res.success) throw new Error(res.message || 'Gagal memulai sesi ujian.');

    closeModal();

    // Open Exam Runner in new tab and auto fullscreen
    launchExamRunnerInNewTab();

    // Refresh current view to show in-progress state
    renderCbtPesertaView();
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Ya, Mulai Ujian Sekarang';
    }
  }
}

function launchExamRunnerInNewTab() {
  const url = `${window.location.origin}/dashboard.html#cbt-exam`;
  const win = window.open(url, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // If pop-up blocker prevents new tab, fallback to current window navigation
    window.location.hash = '#cbt-exam';
  }
}

// ============================================================================
// 2. FULLSCREEN EXAM RUNNER ENGINE
// ============================================================================

async function renderCbtPesertaExamRunner() {
  // Activate focus/fullscreen mode for exam
  document.body.classList.add('cbt-exam-mode');

  // Trigger auto fullscreen
  requestAppFullscreen();

  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 60px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary-600);"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.1rem; color: var(--text-heading);">Menyiapkan Ruang Ujian CBT...</p>
      <p style="font-size: 0.85rem; color: var(--text-dim);">Mengunduh daftar soal dan mengaktifkan timer...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/api/cbt/peserta/session');
    if (!res.success || !res.data) {
      // If cannot get session, attempt may be completed or not started yet
      document.body.classList.remove('cbt-exam-mode');
      exitAppFullscreen();
      window.location.hash = '#cbt-peserta';
      return;
    }

    const data = res.data;
    window.cbtPesertaState.sessionData = data;
    window.cbtPesertaState.currentQuestionIndex = 0;
    window.cbtPesertaState.isSubmitting = false;

    // Populate answersMap
    const answersMap = {};
    for (const q of (data.questions || [])) {
      const saved = q.currentAnswer || q.savedAnswer;
      if (saved) {
        answersMap[q.questionId] = {
          selectedOptionId: saved.selectedOptionId || null,
          essayAnswer: saved.essayAnswer || '',
          isFlagged: q.isFlagged || saved.isFlagged || false,
        };
      } else {
        answersMap[q.questionId] = {
          selectedOptionId: null,
          essayAnswer: '',
          isFlagged: q.isFlagged || false,
        };
      }
    }
    window.cbtPesertaState.answersMap = answersMap;

    renderExamRunnerShell();

    const expiresAt = data.exam?.expiresAt || data.attempt?.expiresAt || new Date(Date.now() + 3600000);
    startCountdownTimer(new Date(expiresAt).getTime());

  } catch (err) {
    document.body.classList.remove('cbt-exam-mode');
    exitAppFullscreen();
    container.innerHTML = `
      <div class="alert alert-danger" style="max-width: 700px; margin: 40px auto;">
        <h4>Gagal Memuat Lembar Ujian</h4>
        <p>${err.message}</p>
        <button type="button" class="btn btn-secondary" onclick="window.location.hash='#cbt-peserta'" style="margin-top: 10px;">
          Kembali ke Dashboard CBT
        </button>
      </div>
    `;
  }
}

function renderExamRunnerShell() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  const data = window.cbtPesertaState.sessionData;
  const questions = data.questions || [];
  const candidateInfo = data.candidate || {};
  const programName = candidateInfo.classProgramName || data.classProgram?.name || '';
  const candidateName = candidateInfo.name || '';
  const examTitle = data.exam?.title || 'Ujian CBT';

  container.innerHTML = `
    <div class="cbt-runner-wrapper" style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Top Bar: Info, Autosave Indicator, Fullscreen Toggle & Timer -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: var(--shadow-sm);">
        
        <div>
          <div style="font-weight: 800; color: var(--text-heading); font-size: 1.05rem;">${escapeHtml(examTitle)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(programName)} &bull; <strong>${escapeHtml(candidateName)}</strong></div>
        </div>

        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          
          <!-- Autosave Indicator -->
          <div id="cbt-autosave-indicator" style="font-size: 0.8rem; font-weight: 700; color: #16a34a; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Tersimpan</span>
          </div>

          <!-- Fullscreen Toggle Button -->
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="toggleAppFullscreen()" title="Toggle Layar Penuh" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600;">
            <i class="fa-solid fa-expand"></i> Fullscreen
          </button>

          <!-- Timer Pill -->
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 9999px; padding: 6px 16px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-clock fa-spin" style="color: #ef4444; font-size: 0.95rem;"></i>
            <span id="cbt-countdown-timer" style="font-family: monospace; font-size: 1.15rem; font-weight: 800; color: #ef4444;">--:--:--</span>
          </div>

        </div>

      </div>

      <!-- Main Layout: Question Area + Palette Sidebar -->
      <div style="display: grid; grid-template-columns: 1fr 300px; gap: 16px;" class="cbt-exam-grid">
        
        <!-- Left: Question & Navigation Box -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 500px; box-shadow: var(--shadow-sm);">
          
          <div id="cbt-question-content-slot">
            <!-- Injected by renderCurrentQuestion() -->
          </div>

          <!-- Bottom Action Controls -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 18px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            
            <button type="button" class="btn btn-secondary" id="btn-prev-q" onclick="navigateQuestion(-1)" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;">
              <i class="fa-solid fa-arrow-left"></i> Sebelumnya
            </button>

            <!-- Flag/Ragu-ragu checkbox -->
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #d97706; cursor: pointer; padding: 8px 14px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
              <input type="checkbox" id="chk-ragu" onchange="toggleFlagCurrentQuestion(this.checked)" style="cursor: pointer; width: 18px; height: 18px; accent-color: #d97706;">
              <span>Ragu-ragu</span>
            </label>

            <button type="button" class="btn btn-primary" id="btn-next-q" onclick="navigateQuestion(1)" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;">
              Selanjutnya <i class="fa-solid fa-arrow-right"></i>
            </button>

          </div>

        </div>

        <!-- Right: Palette Grid & Finish Button -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
          
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-heading); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span>Navigasi Soal</span>
              <span id="cbt-answered-summary" style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600);">0 / ${questions.length}</span>
            </div>

            <!-- Legend -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 14px;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: #0284c7;"></span> Dijawab</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: #d97706;"></span> Ragu</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: var(--bg-body); border: 1px solid var(--border-subtle);"></span> Belum</span>
            </div>

            <!-- Grid Numbers -->
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;" id="cbt-palette-grid">
              <!-- Injected by renderPaletteGrid() -->
            </div>
          </div>

          <div style="margin-top: 24px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <button type="button" class="btn btn-danger" onclick="openFinishExamConfirmationModal()" style="width: 100%; padding: 12px; font-weight: 800; border-radius: var(--radius-lg); display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-flag-checkered"></i> Selesaikan Ujian
            </button>
          </div>

        </div>

      </div>

    </div>
  `;

  renderCurrentQuestion();
  renderPaletteGrid();
}

function renderCurrentQuestion() {
  const slot = document.getElementById('cbt-question-content-slot');
  if (!slot) return;

  const data = window.cbtPesertaState.sessionData;
  const questions = data.questions || [];
  const idx = window.cbtPesertaState.currentQuestionIndex;
  const q = questions[idx];
  if (!q) return;

  const currentAnswer = window.cbtPesertaState.answersMap[q.questionId] || {};

  // Update Ragu-ragu checkbox
  const chkRagu = document.getElementById('chk-ragu');
  if (chkRagu) chkRagu.checked = !!currentAnswer.isFlagged;

  // Update Prev / Next Buttons
  const btnPrev = document.getElementById('btn-prev-q');
  const btnNext = document.getElementById('btn-next-q');
  if (btnPrev) btnPrev.disabled = (idx === 0);
  if (btnNext) {
    if (idx === questions.length - 1) {
      btnNext.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> Selesai';
      btnNext.onclick = openFinishExamConfirmationModal;
    } else {
      btnNext.innerHTML = 'Selanjutnya <i class="fa-solid fa-arrow-right"></i>';
      btnNext.onclick = () => navigateQuestion(1);
    }
  }

  const isMC = q.type === 'MULTIPLE_CHOICE';

  slot.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-heading);">
        Soal Nomor ${idx + 1}
        <span class="badge ${isMC ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.75rem; margin-left: 8px;">
          ${isMC ? 'Pilihan Ganda' : 'Essay'}
        </span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
        ${idx + 1} dari ${questions.length} Soal
      </div>
    </div>

    <!-- Question Text -->
    <div class="cbt-question-body" style="font-size: 1.05rem; line-height: 1.6; color: var(--text-heading); margin-bottom: 24px;">
      ${q.question}
    </div>

    <!-- Answer Options Area -->
    ${isMC ? `
      <div style="display: flex; flex-direction: column; gap: 10px;" id="cbt-options-list">
        ${(q.options || []).map((opt, oIdx) => {
    const letter = String.fromCharCode(65 + oIdx);
    const isSelected = currentAnswer.selectedOptionId === opt.id;

    return `
            <div 
              class="cbt-option-item ${isSelected ? 'selected' : ''}" 
              onclick="selectMultipleChoiceOption('${q.questionId}', '${opt.id}')"
              style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-lg); border: 2px solid ${isSelected ? 'var(--primary-600)' : 'var(--border-subtle)'}; background: ${isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-body)'}; cursor: pointer; transition: all 0.15s;"
            >
              <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; flex-shrink: 0; background: ${isSelected ? 'var(--primary-600)' : 'var(--bg-card)'}; color: ${isSelected ? '#ffffff' : 'var(--text-heading)'}; border: 1px solid ${isSelected ? 'var(--primary-600)' : 'var(--border-subtle)'};">
                ${letter}
              </div>
              <div style="font-size: 0.95rem; color: var(--text-main); line-height: 1.4; flex: 1;">
                ${escapeHtml(opt.content)}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    ` : `
      <div>
        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; display: block;">Tuliskan jawaban essay Anda di bawah ini:</label>
        <textarea 
          id="cbt-essay-input" 
          rows="6" 
          placeholder="Ketik jawaban lengkap di sini..." 
          oninput="handleEssayInput('${q.questionId}', this.value)"
          style="width: 100%; padding: 12px; font-size: 0.95rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-lg); line-height: 1.5;"
        >${escapeHtml(currentAnswer.essayAnswer || '')}</textarea>
      </div>
    `}
  `;
}

function renderPaletteGrid() {
  const grid = document.getElementById('cbt-palette-grid');
  const summary = document.getElementById('cbt-answered-summary');
  if (!grid) return;

  const data = window.cbtPesertaState.sessionData;
  const questions = data.questions || [];
  const currIdx = window.cbtPesertaState.currentQuestionIndex;

  let answeredCount = 0;

  grid.innerHTML = questions.map((q, idx) => {
    const ans = window.cbtPesertaState.answersMap[q.questionId];
    const isAnswered = ans && (ans.selectedOptionId || (ans.essayAnswer && ans.essayAnswer.trim().length > 0));
    const isFlagged = ans && ans.isFlagged;
    const isCurrent = idx === currIdx;

    if (isAnswered) answeredCount++;

    let bg = 'var(--bg-body)';
    let color = 'var(--text-heading)';
    let border = '1px solid var(--border-subtle)';

    if (isFlagged) {
      bg = '#d97706';
      color = '#ffffff';
      border = '1px solid #d97706';
    } else if (isAnswered) {
      bg = '#0284c7';
      color = '#ffffff';
      border = '1px solid #0284c7';
    }

    if (isCurrent) {
      border = '2px solid #ef4444';
      if (!isAnswered && !isFlagged) {
        bg = 'rgba(14, 165, 233, 0.15)';
      }
    }

    return `
      <button 
        type="button" 
        onclick="jumpToQuestion(${idx})" 
        style="height: 40px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.85rem; background: ${bg}; color: ${color}; border: ${border}; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;"
        title="Soal ${idx + 1}"
      >
        ${idx + 1}
      </button>
    `;
  }).join('');

  if (summary) {
    summary.innerText = `${answeredCount} / ${questions.length} Terjawab`;
  }
}

function jumpToQuestion(idx) {
  window.cbtPesertaState.currentQuestionIndex = idx;
  renderCurrentQuestion();
  renderPaletteGrid();
}

function navigateQuestion(direction) {
  const data = window.cbtPesertaState.sessionData;
  const newIdx = window.cbtPesertaState.currentQuestionIndex + direction;
  if (newIdx >= 0 && newIdx < data.questions.length) {
    window.cbtPesertaState.currentQuestionIndex = newIdx;
    renderCurrentQuestion();
    renderPaletteGrid();
  }
}

// ----------------------------------------------------------------------------
// INTERACTION & AUTOSAVE
// ----------------------------------------------------------------------------

function selectMultipleChoiceOption(questionId, optionId) {
  const current = window.cbtPesertaState.answersMap[questionId] || {};
  current.selectedOptionId = optionId;
  window.cbtPesertaState.answersMap[questionId] = current;

  renderCurrentQuestion();
  renderPaletteGrid();

  // Instant autosave for multiple choice
  triggerAutosave(questionId, {
    selectedOptionId: optionId,
    isFlagged: current.isFlagged,
  });
}

function handleEssayInput(questionId, text) {
  const current = window.cbtPesertaState.answersMap[questionId] || {};
  current.essayAnswer = text;
  window.cbtPesertaState.answersMap[questionId] = current;

  renderPaletteGrid();

  // Debounced autosave (600ms) for essay
  if (window.cbtPesertaState.autosaveTimeout) {
    clearTimeout(window.cbtPesertaState.autosaveTimeout);
  }

  showAutosavingIndicator();
  window.cbtPesertaState.autosaveTimeout = setTimeout(() => {
    triggerAutosave(questionId, {
      essayAnswer: text,
      isFlagged: current.isFlagged,
    });
  }, 600);
}

function toggleFlagCurrentQuestion(isFlagged) {
  const data = window.cbtPesertaState.sessionData;
  const q = data.questions[window.cbtPesertaState.currentQuestionIndex];
  if (!q) return;

  const current = window.cbtPesertaState.answersMap[q.questionId] || {};
  current.isFlagged = isFlagged;
  window.cbtPesertaState.answersMap[q.questionId] = current;

  renderPaletteGrid();

  triggerAutosave(q.questionId, {
    selectedOptionId: current.selectedOptionId,
    essayAnswer: current.essayAnswer,
    isFlagged,
  });
}

async function triggerAutosave(questionId, data) {
  showAutosavingIndicator();
  try {
    const res = await apiRequest('/api/cbt/peserta/answer', {
      method: 'POST',
      body: {
        questionId,
        selectedOptionId: data.selectedOptionId || undefined,
        essayAnswer: data.essayAnswer || undefined,
        isFlagged: data.isFlagged,
      },
    });

    if (res.success) {
      showAutosavedSuccess();
    } else {
      showAutosavedError();
    }
  } catch (err) {
    showAutosavedError();
  }
}

function showAutosavingIndicator() {
  const ind = document.getElementById('cbt-autosave-indicator');
  if (ind) {
    ind.style.color = '#d97706';
    ind.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Menyimpan...</span>';
  }
}

function showAutosavedSuccess() {
  const ind = document.getElementById('cbt-autosave-indicator');
  if (ind) {
    ind.style.color = '#16a34a';
    ind.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Tersimpan</span>';
  }
}

function showAutosavedError() {
  const ind = document.getElementById('cbt-autosave-indicator');
  if (ind) {
    ind.style.color = '#ef4444';
    ind.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Gagal simpan</span>';
  }
}

// ----------------------------------------------------------------------------
// COUNTDOWN TIMER
// ----------------------------------------------------------------------------

function startCountdownTimer(expiresAtTimestamp) {
  if (window.cbtPesertaState.timerInterval) {
    clearInterval(window.cbtPesertaState.timerInterval);
  }

  function updateTimer() {
    const now = Date.now();
    const remainingMs = expiresAtTimestamp - now;

    const timerEl = document.getElementById('cbt-countdown-timer');
    if (!timerEl) {
      clearInterval(window.cbtPesertaState.timerInterval);
      return;
    }

    if (remainingMs <= 0) {
      clearInterval(window.cbtPesertaState.timerInterval);
      timerEl.innerText = '00:00:00';
      handleAutoSubmitOnExpiry();
      return;
    }

    const totalSecs = Math.floor(remainingMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    timerEl.innerText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  updateTimer();
  window.cbtPesertaState.timerInterval = setInterval(updateTimer, 1000);
}

async function handleAutoSubmitOnExpiry() {
  if (window.cbtPesertaState.isSubmitting) return;
  window.cbtPesertaState.isSubmitting = true;

  alert('Waktu ujian telah habis! Sistem akan mengumpulkan lembar jawaban Anda.');

  try {
    await apiRequest('/api/cbt/peserta/finish', { method: 'POST' });
  } catch (e) {
    // Ignore error if expired
  }

  exitAppFullscreen();
  document.body.classList.remove('cbt-exam-mode');
  renderCbtPesertaView();
}

// ----------------------------------------------------------------------------
// FINISH EXAM CONFIRMATION MODAL
// ----------------------------------------------------------------------------

function openFinishExamConfirmationModal() {
  const data = window.cbtPesertaState.sessionData;
  const questions = data.questions || [];

  let answeredCount = 0;
  let flaggedCount = 0;

  for (const q of questions) {
    const ans = window.cbtPesertaState.answersMap[q.questionId];
    if (ans && (ans.selectedOptionId || (ans.essayAnswer && ans.essayAnswer.trim().length > 0))) {
      answeredCount++;
    }
    if (ans && ans.isFlagged) {
      flaggedCount++;
    }
  }

  const unansweredCount = questions.length - answeredCount;

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(14, 165, 233, 0.12); color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 12px;">
        <i class="fa-solid fa-flag-checkered"></i>
      </div>
      <p style="font-size: 0.95rem; color: var(--text-heading); font-weight: 700; margin: 0;">Apakah Anda yakin ingin mengumpulkan lembar jawaban sekarang?</p>
    </div>

    <!-- Summary Box -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
      <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: var(--radius-md); padding: 10px; text-align: center;">
        <div style="font-size: 0.75rem; color: #16a34a; font-weight: 700;">Terjawab</div>
        <div style="font-size: 1.3rem; font-weight: 800; color: #16a34a;">${answeredCount}</div>
      </div>
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 10px; text-align: center;">
        <div style="font-size: 0.75rem; color: #d97706; font-weight: 700;">Ragu-ragu</div>
        <div style="font-size: 1.3rem; font-weight: 800; color: #d97706;">${flaggedCount}</div>
      </div>
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 10px; text-align: center;">
        <div style="font-size: 0.75rem; color: #ef4444; font-weight: 700;">Belum Dijawab</div>
        <div style="font-size: 1.3rem; font-weight: 800; color: #ef4444;">${unansweredCount}</div>
      </div>
    </div>

    ${unansweredCount > 0 ? `
      <div class="alert alert-warning" style="font-size: 0.825rem; margin-bottom: 20px; padding: 10px 14px;">
        <i class="fa-solid fa-triangle-exclamation"></i> Masih terdapat <strong>${unansweredCount} soal</strong> yang belum Anda jawab!
      </div>
    ` : ''}

    <div style="display: flex; justify-content: flex-end; gap: 10px;">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Lanjutkan Mengerjakan</button>
      <button type="button" id="btn-confirm-finish" class="btn btn-danger" onclick="handleFinishPesertaAttempt()" style="display: inline-flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-check-double"></i> Ya, Selesaikan Ujian
      </button>
    </div>
  `;

  openModal('Konfirmasi Selesaikan Ujian', bodyHtml);
}

async function handleFinishPesertaAttempt() {
  const btn = document.getElementById('btn-confirm-finish');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengumpulkan Jawaban...';
  }

  if (window.cbtPesertaState.timerInterval) {
    clearInterval(window.cbtPesertaState.timerInterval);
    window.cbtPesertaState.timerInterval = null;
  }

  try {
    const res = await apiRequest('/api/cbt/peserta/finish', { method: 'POST' });
    if (!res.success) throw new Error(res.message || 'Gagal mengumpulkan ujian.');

    closeModal();
    exitAppFullscreen();
    document.body.classList.remove('cbt-exam-mode');

    showToast('Ujian Anda berhasil dikumpulkan!', 'success');
    window.location.hash = '#cbt-peserta';
    renderCbtPesertaView();
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Ya, Selesaikan Ujian';
    }
  }
}

// Export to window
window.renderCbtPesertaView = renderCbtPesertaView;
window.renderCbtPesertaExamRunner = renderCbtPesertaExamRunner;
window.openStartExamConfirmationModal = openStartExamConfirmationModal;
window.handleStartPesertaAttempt = handleStartPesertaAttempt;
window.launchExamRunnerInNewTab = launchExamRunnerInNewTab;
window.navigateQuestion = navigateQuestion;
window.jumpToQuestion = jumpToQuestion;
window.selectMultipleChoiceOption = selectMultipleChoiceOption;
window.handleEssayInput = handleEssayInput;
window.toggleFlagCurrentQuestion = toggleFlagCurrentQuestion;
window.openFinishExamConfirmationModal = openFinishExamConfirmationModal;
window.handleFinishPesertaAttempt = handleFinishPesertaAttempt;
window.requestAppFullscreen = requestAppFullscreen;
window.exitAppFullscreen = exitAppFullscreen;
window.toggleAppFullscreen = toggleAppFullscreen;
