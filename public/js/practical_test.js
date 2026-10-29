/**
 * ============================================================================
 * PSB2 - MODUL TES PRAKTIK (BACA TULIS AL-QUR'AN / BTQ, WUDHU & SALAT)
 * ============================================================================
 * Fitur:
 * 1. Dashboard Statistik & Monitoring Tes Praktik
 * 2. Kelola Sesi Jadwal Praktik & Penugasan Petugas Penguji
 * 3. Plotting / Alokasi Calon Santri (Lulus CBT) ke Jadwal Praktik
 * 4. Lembar Penilaian Interaktif Penguji (BTQ, Wudhu, Salat) Skala 1 - 4
 * 5. Rekapitulasi Nilai & Rekomendasi Pembinaan Santri
 */

const BTQ_SCORE_OPTIONS = [
  {
    value: 1,
    label: 'Level 1 (Iqro\' 1)',
    badge: '#ef4444',
    items: [
      'Mengenal dan membaca huruf hijaiyah berharakat',
      'Membedakan harakat fathah, kasrah, dhammah',
      'Membaca suku kata/kata sederhana',
      'Kelancaran membaca sesuai materi Iqro\' 1',
      'Ketepatan makhraj dasar'
    ]
  },
  {
    value: 2,
    label: 'Level 2 (Iqro\' 2 - 3)',
    badge: '#f97316',
    items: [
      'Membaca huruf bersambung dengan benar',
      'Membaca panjang-pendek dasar',
      'Membaca Tasydid dan sukun dengan benar',
      'Membaca kata/kalimat sederhana dengan lancar',
      'Ketepatan makhraj dan harakat'
    ]
  },
  {
    value: 3,
    label: 'Level 3 (Iqro\' 3 - 4)',
    badge: '#eab308',
    items: [
      'Membaca mad thabi\'i dengan tepat',
      'Membaca tasydid dan sukun dengan benar',
      'Membaca huruf bersambung dengan benar',
      'Kelancaran pada rangkaian kata/ayat',
      'Fashohah dan ketepatan makhraj'
    ]
  },
  {
    value: 4,
    label: 'Level 4 (Iqro\' 5 - Tajwid Dasar)',
    badge: '#3b82f6',
    items: [
      'Membaca mad thabi\'i dengan tepat',
      'Membaca nun sukun/tanwin sesuai materi',
      'Membaca mim sukun sesuai materi',
      'Membaca qalqalah dasar sesuai materi',
      'Tartil dan kelancaran dan ketepatan Makhroj'
    ]
  },
  {
    value: 5,
    label: 'Level 5 (Iqro\' 6 - Tajwid Lanjutan)',
    badge: '#6366f1',
    items: [
      'Menerapkan hukum bacaan Alif atau Alif Lam dianggap tidak ada',
      'Membaca mad dan waqaf dengan tepat',
      'Membaca Mad Wajib, Mad Jaiz dan Mad Lazim',
      'Ketepatan Makhroj dan sifatnya',
      'Menerapkan bacaan Lafdzul Jalalah "Allah"',
      'Menerapkan tajwid pada bacaan Al-Qur\'an Nun Sukun/Tanwin, Mim Sukun'
    ]
  },
  {
    value: 6,
    label: 'Level 6 (Mahir Al-Qur\'an / Mushaf)',
    badge: '#10b981',
    items: [
      'Menerapkan tajwid pada bacaan Al-Qur\'an Nun Sukun/Tanwin, Mim Sukun',
      'Membaca Mad Wajib, Mad Jaiz dan Mad Lazim',
      'Ketepatan mad, waqaf, dan ibtida\' dasar',
      'Ketepatan Makhroj dan sifatnya',
      'Kelancaran baca dan tartil bil Naghom',
      'Kesiapan menuju bacaan Al-Qur\'an/mushaf'
    ]
  }
];

const WUDHU_SALAT_SCORE_OPTIONS = [
  {
    value: 1,
    label: '1 - Belum bisa / belum tertib',
    badge: '#ef4444',
    desc: 'Belum menguasai tata cara, rukun, gerakan, atau bacaan secara tertib',
  },
  {
    value: 2,
    label: '2 - Bisa melakukan, butuh bimbingan/kontrol',
    badge: '#f59e0b',
    desc: 'Bisa melakukan tata cara ibadah, namun masih perlu sedikit arahan atau perbaikan',
  },
  {
    value: 3,
    label: '3 - Mampu mandiri, tertib, dan benar',
    badge: '#10b981',
    desc: 'Menguasai rukun, tertib thuma\'ninah, gerakan sempurna, dan bacaan benar secara mandiri',
  },
];

const PRACTICAL_SCORE_OPTIONS = WUDHU_SALAT_SCORE_OPTIONS;

window.practicalAdminState = {
  periods: [],
  waves: [],
  schools: [],
  examiners: [],
  schedules: [],
  activePeriodId: '',
};

let practicalFilterState = {
  search: '',
  status: 'ALL',
  periodId: '',
  waveId: '',
  schoolId: '',
  page: 1,
  limit: 15,
};

let currentExaminerScheduleId = null;

// ============================================================================
// HELPER & MASTER DATA
// ============================================================================
async function fetchPracticalMasterData() {
  try {
    const [periodsRes, wavesRes, schoolsRes, examinersRes] = await Promise.all([
      apiRequest('/api/competitions/periods').catch(() => ({ success: false, data: [] })),
      apiRequest('/api/competitions/waves').catch(() => ({ success: false, data: [] })),
      apiRequest('/api/public/schools').catch(() => ({ success: false, data: [] })),
      apiRequest('/api/practical-test/admin/examiners').catch(() => ({ success: false, data: [] })),
    ]);

    if (periodsRes && periodsRes.data) {
      const periods = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data.periods || []);
      window.practicalAdminState.periods = periods;
      const active = periods.find(p => p.isActive) || periods[0];
      if (active && !window.practicalAdminState.activePeriodId) {
        window.practicalAdminState.activePeriodId = active.id;
      }
    }
    if (wavesRes && wavesRes.data) {
      window.practicalAdminState.waves = Array.isArray(wavesRes.data) ? wavesRes.data : (wavesRes.data.waves || []);
    }
    if (schoolsRes && schoolsRes.data) {
      window.practicalAdminState.schools = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
    }
    if (examinersRes && examinersRes.data) {
      window.practicalAdminState.examiners = Array.isArray(examinersRes.data) ? examinersRes.data : [];
    }
  } catch (err) {
    console.error('Error loading practical master data:', err);
  }
}

function getPracticalPredicateBadge(avgScore) {
  if (!avgScore || isNaN(avgScore)) {
    return '<span class="badge" style="background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:12px; font-weight:700;">Belum Dinilai</span>';
  }
  const num = Number(avgScore);
  if (num >= 3.5) {
    return '<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:4px 10px; border-radius:12px; font-weight:700;">Mandiri & Istiqomah</span>';
  } else if (num >= 2.5) {
    return '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:4px 10px; border-radius:12px; font-weight:700;">Baik (Butuh Kontrol)</span>';
  } else if (num >= 1.75) {
    return '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:4px 10px; border-radius:12px; font-weight:700;">Cukup (Bimbingan)</span>';
  } else {
    return '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:4px 10px; border-radius:12px; font-weight:700;">Perlu Pembinaan</span>';
  }
}

function switchPracticalRubricTab(tabName) {
  const btqBtn = document.getElementById('btn-rubric-tab-btq');
  const wudhuBtn = document.getElementById('btn-rubric-tab-wudhu');
  const btqContent = document.getElementById('rubric-content-btq');
  const wudhuContent = document.getElementById('rubric-content-wudhu-salat');

  if (tabName === 'btq') {
    if (btqBtn) {
      btqBtn.style.background = '#0284c7';
      btqBtn.style.color = '#ffffff';
      btqBtn.style.border = 'none';
    }
    if (wudhuBtn) {
      wudhuBtn.style.background = 'var(--bg-body)';
      wudhuBtn.style.color = 'var(--text-muted)';
      wudhuBtn.style.border = '1px solid var(--border-subtle)';
    }
    if (btqContent) btqContent.style.display = 'flex';
    if (wudhuContent) wudhuContent.style.display = 'none';
  } else {
    if (wudhuBtn) {
      wudhuBtn.style.background = '#059669';
      wudhuBtn.style.color = '#ffffff';
      wudhuBtn.style.border = 'none';
    }
    if (btqBtn) {
      btqBtn.style.background = 'var(--bg-body)';
      btqBtn.style.color = 'var(--text-muted)';
      btqBtn.style.border = '1px solid var(--border-subtle)';
    }
    if (wudhuContent) wudhuContent.style.display = 'flex';
    if (btqContent) btqContent.style.display = 'none';
  }
}
window.switchPracticalRubricTab = switchPracticalRubricTab;

// ============================================================================
// 1. DASHBOARD TES PRAKTIK
// ============================================================================
async function renderPracticalDashboardView() {
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  const user = window.currentUser || window.state?.user || {};
  const isExaminer = (user.role === 'PETUGAS_TES_PRAKTIK' || window.currentUserRole === 'PETUGAS_TES_PRAKTIK');

  container.innerHTML = `
    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 10px;">
          <span style="width: 36px; height: 36px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); color: #0284c7; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            <i class="fa-solid fa-book-quran"></i>
          </span>
          ${isExaminer ? 'Dashboard Petugas Tes Praktik' : 'Dashboard & Kelola Tes Praktik'}
        </h2>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.95rem;">
          Pengujian & Penilaian Praktik Ibadah Calon Santri: <strong>Baca Tulis Al-Qur'an (BTQ)</strong>, <strong>Wudhu</strong>, dan <strong>Salat</strong>.
        </p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        ${!isExaminer ? `
          <button class="btn btn-secondary" onclick="window.location.hash = '#practical-schedules'" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-week"></i> Kelola Jadwal Praktik
          </button>
          <button class="btn btn-primary" onclick="openAdminPracticalScheduleModal()" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-plus"></i> Buat Jadwal Baru
          </button>
        ` : `
          <button class="btn btn-secondary" onclick="window.location.hash = '#practical-my-schedules'" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-check"></i> Jadwal Saya
          </button>
          <button class="btn btn-primary" onclick="window.location.hash = '#practical-candidates'" style="display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-clipboard-check"></i> Mulai Penilaian
          </button>
        `}
      </div>
    </div>

    <!-- STATS CARDS -->
    <div id="practical-stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="card" style="padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); text-align: center;">
        <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat Statistik...</div>
      </div>
    </div>

    <!-- PANDUAN & JADWAL TERDEKAT -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
      <!-- CARD JADWAL TERDEKAT -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 1.1rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-day" style="color: var(--primary-600);"></i>
            Sesi Jadwal Tes Praktik
          </h3>
          <button class="btn btn-sm btn-secondary" onclick="window.location.hash = '${isExaminer ? '#practical-my-schedules' : '#practical-schedules'}'">
            Lihat Semua <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
        <div id="practical-dash-schedules-list">
          <div style="text-align: center; padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat jadwal...</div>
        </div>
      </div>

      <!-- CARD 3 ASPEK UTAMA & PARAMETER PENILAIAN -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <h3 style="font-size: 1.1rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-scale-balanced" style="color: #0284c7;"></i>
            3 Aspek & Parameter Nilai
          </h3>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm" id="btn-rubric-tab-btq" onclick="switchPracticalRubricTab('btq')" style="background: #0284c7; color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: none; cursor: pointer;">
              BTQ (1-6)
            </button>
            <button type="button" class="btn btn-sm" id="btn-rubric-tab-wudhu" onclick="switchPracticalRubricTab('wudhu_salat')" style="background: var(--bg-body); color: var(--text-muted); border-radius: 6px; padding: 4px 10px; font-size: 0.76rem; font-weight: 700; border: 1px solid var(--border-subtle); cursor: pointer;">
              Wudhu & Salat (1-3)
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; text-align: center;">
          <div onclick="switchPracticalRubricTab('btq')" style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.2); padding: 8px; border-radius: 6px; cursor: pointer;">
            <div style="font-weight: 800; font-size: 0.85rem; color: #0284c7;">1. BTQ</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Skala Parameter 1 - 6</div>
          </div>
          <div onclick="switchPracticalRubricTab('wudhu_salat')" style="background: rgba(5, 150, 105, 0.08); border: 1px solid rgba(5, 150, 105, 0.2); padding: 8px; border-radius: 6px; cursor: pointer;">
            <div style="font-weight: 800; font-size: 0.85rem; color: #059669;">2. WUDHU</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Skala Parameter 1 - 3</div>
          </div>
          <div onclick="switchPracticalRubricTab('wudhu_salat')" style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.2); padding: 8px; border-radius: 6px; cursor: pointer;">
            <div style="font-weight: 800; font-size: 0.85rem; color: #7c3aed;">3. SALAT</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Skala Parameter 1 - 3</div>
          </div>
        </div>

        <!-- TAB CONTENT: BTQ (1-6) -->
        <div id="rubric-content-btq" style="display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; max-height: 250px; overflow-y: auto; padding-right: 4px;">
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; color: #dc2626;">
            <strong>Level 1 (Iqro' 1):</strong> Mengenal huruf hijaiyah berharakat fathah/kasrah/dhammah, suku kata sederhana & makhraj dasar.
          </div>
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(249, 115, 22, 0.08); border-left: 3px solid #f97316; color: #ea580c;">
            <strong>Level 2 (Iqro' 2):</strong> Membaca huruf bersambung, panjang-pendek dasar, tasydid, sukun, makhraj & harakat tepat.
          </div>
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(234, 179, 8, 0.08); border-left: 3px solid #eab308; color: #ca8a04;">
            <strong>Level 3 (Iqro' 3):</strong> Mad thabi'i, tasydid & sukun benar, kelancaran rangkaian kata/ayat & fashohah.
          </div>
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; color: #2563eb;">
            <strong>Level 4 (Iqro' 4):</strong> Mad thabi'i, hukum nun sukun/tanwin, mim sukun, qalqalah dasar & tartil.
          </div>
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; color: #4f46e5;">
            <strong>Level 5 (Iqro' 5):</strong> Alif/Alif Lam syamsiyah-qamariyah, mad wajib/jaiz/lazim, waqaf & lafdzul Jalalah "Allah".
          </div>
          <div style="padding: 7px 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; color: #059669;">
            <strong>Level 6 (Iqro' 6):</strong> Tajwid lengkap (Nun/Mim Sukun, Mad, Waqaf/Ibtida'), makhraj & sifat sempurna, tartil bil Naghom.
          </div>
        </div>

        <!-- TAB CONTENT: WUDHU & SALAT (1-3) -->
        <div id="rubric-content-wudhu-salat" style="display: none; flex-direction: column; gap: 8px; font-size: 0.8rem;">
          <div style="padding: 8px 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; color: #dc2626;">
            <strong>1 : Belum bisa / belum tertib</strong>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">Belum menguasai tata cara, rukun, gerakan, atau bacaan ibadah secara tertib.</div>
          </div>
          <div style="padding: 8px 12px; border-radius: 6px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; color: #d97706;">
            <strong>2 : Bisa melakukan, namun butuh bimbingan/kontrol</strong>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">Bisa melakukan tata cara ibadah, namun masih perlu sedikit arahan atau perbaikan gerakan/bacaan.</div>
          </div>
          <div style="padding: 8px 12px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; color: #059669;">
            <strong>3 : Mampu mandiri, tertib, dan benar</strong>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">Menguasai rukun, tertib thuma'ninah, gerakan sempurna, dan bacaan benar secara mandiri.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- RECENT GRADED CANDIDATES -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-clock-rotate-left" style="color: var(--primary-600);"></i>
          Daftar Calon Santri & Status Uji Praktik
        </h3>
        <button class="btn btn-secondary btn-sm" onclick="window.location.hash = '#practical-candidates'">
          Lihat Semua Santri <i class="fa-solid fa-arrow-right" style="margin-left: 4px;"></i>
        </button>
      </div>
      <div id="practical-recent-table-container">
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">Memuat data santri...</div>
      </div>
    </div>
  `;

  // Load stats & recent
  try {
    const isEx = user.role === 'PETUGAS_TES_PRAKTIK';
    const endpointStats = isEx ? '/api/practical-test/examiner/dashboard' : '/api/practical-test/admin/dashboard';
    const [statsRes, candidatesRes, schedulesRes] = await Promise.all([
      apiRequest(endpointStats).catch(() => ({ success: false, data: {} })),
      apiRequest('/api/practical-test/admin/candidates/ready?limit=6').catch(() => ({ success: false, data: [] })),
      apiRequest(isEx ? '/api/practical-test/examiner/my-schedules' : '/api/practical-test/admin/schedules').catch(() => ({ success: false, data: [] })),
    ]);

    if (statsRes && statsRes.data) {
      const s = statsRes.data;
      const statsContainer = document.getElementById('practical-stats-cards');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="card" style="padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); border-left: 4px solid #0284c7;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Siap Tes Praktik</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-heading); margin: 6px 0;">${s.totalEligible || 0}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Santri lulus verifikasi CBT</div>
          </div>

          <div class="card" style="padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); border-left: 4px solid #3b82f6;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Sudah Terjadwal</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #2563eb; margin: 6px 0;">${s.totalScheduled ?? s.scheduledTests ?? 0}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${s.totalSchedules || 0} sesi jadwal dibuat</div>
          </div>

          <div class="card" style="padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); border-left: 4px solid #10b981;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Selesai Diuji</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #059669; margin: 6px 0;">${s.totalCompleted ?? s.completedTests ?? 0}</div>
            <div style="font-size: 0.78rem; color: #059669; font-weight: 600;">Selesai diuji</div>
          </div>

          <div class="card" style="padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); border-left: 4px solid #8b5cf6;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Rerata Nilai Praktik</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #7c3aed; margin: 6px 0;">${s.averages?.total ? Number(s.averages.total).toFixed(2) : '0.00'} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted);">/ 4.00</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">BTQ (1-6): <strong>${s.averages?.btq || 0}</strong> | Wudhu (1-3): <strong>${s.averages?.wudhu || 0}</strong> | Salat (1-3): <strong>${s.averages?.salat || 0}</strong></div>
          </div>
        `;
      }
    }

    // Schedules mini list
    const schContainer = document.getElementById('practical-dash-schedules-list');
    if (schContainer) {
      const schedules = Array.isArray(schedulesRes.data) ? schedulesRes.data.slice(0, 3) : [];
      if (schedules.length === 0) {
        schContainer.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.9rem;">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 1.8rem; color: var(--text-dim); margin-bottom: 8px; display: block;"></i>
            Belum ada jadwal tes praktik aktif.
          </div>
        `;
      } else {
        schContainer.innerHTML = schedules.map(sch => {
          const count = sch.assignedCount ?? sch.participantsCount ?? (sch.participants ? sch.participants.length : (sch.tests ? sch.tests.length : 0));
          const formattedDate = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-';
          return `
            <div style="padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 10px; background: var(--bg-body); display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; gap: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-heading);">${escapeHtml(sch.name)}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: wrap; margin-top: 2px;">
                  <span><i class="fa-solid fa-calendar"></i> ${formattedDate}</span>
                  <span><i class="fa-solid fa-clock"></i> ${escapeHtml(sch.startTime || '08:00')} - ${escapeHtml(sch.endTime || '12:00')}</span>
                  <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || sch.room || '-')}</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; font-weight: 700; font-size: 0.78rem; padding: 4px 8px; border-radius: 6px;">
                  ${count} / ${sch.quota} Santri
                </span>
                ${!isExaminer ? `
                  <button class="btn btn-sm btn-secondary" onclick="openAdminPracticalParticipantsModal('${sch.id}')" title="Plot Santri">
                    <i class="fa-solid fa-users-gear"></i>
                  </button>
                ` : `
                  <button class="btn btn-sm btn-primary" onclick="renderExaminerScheduleQueue('${sch.id}')" title="Buka Antrean">
                    <i class="fa-solid fa-clipboard-list"></i>
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (candidatesRes && candidatesRes.data) {
      renderRecentTable(candidatesRes.data);
    }
  } catch (err) {
    console.error('Error loading practical dashboard:', err);
  }
}

function renderRecentTable(candidates) {
  const tableContainer = document.getElementById('practical-recent-table-container');
  if (!tableContainer) return;

  if (!candidates || candidates.length === 0) {
    tableContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Belum ada calon santri yang masuk tahap tes praktik.</div>`;
    return;
  }

  tableContainer.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.8rem;">
            <th style="padding: 10px 12px;">NO. REGISTRASI</th>
            <th style="padding: 10px 12px;">NAMA SANTRI</th>
            <th style="padding: 10px 12px;">SEKOLAH & JURUSAN</th>
            <th style="padding: 10px 12px; text-align: center;">JADWAL SESI</th>
            <th style="padding: 10px 12px; text-align: center;">BTQ</th>
            <th style="padding: 10px 12px; text-align: center;">WUDHU</th>
            <th style="padding: 10px 12px; text-align: center;">SALAT</th>
            <th style="padding: 10px 12px; text-align: center;">RERATA</th>
            <th style="padding: 10px 12px; text-align: center;">PREDIKAT</th>
            <th style="padding: 10px 12px; text-align: right;">AKSI</th>
          </tr>
        </thead>
        <tbody>
          ${candidates.map(c => {
    const isCompleted = c.practicalStatus === 'COMPLETED' || c.practicalTest?.status === 'COMPLETED';
    const sch = c.schedule || c.practicalTest?.schedule;
    const btq = c.btqScore ?? c.practicalTest?.btqScore;
    const wudhu = c.wudhuScore ?? c.practicalTest?.wudhuScore;
    const salat = c.salatScore ?? c.practicalTest?.salatScore;
    const total = c.totalScore ?? c.practicalTest?.totalScore;
    const studentName = c.studentName || c.name || '-';
    const regNum = c.registrationNumber || '-';
    const schName = c.schoolName || '-';
    const clsName = c.className || '-';

    return `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 12px;">
                  <code style="font-weight: 700; color: var(--primary-600);">${escapeHtml(regNum)}</code>
                </td>
                <td style="padding: 12px;">
                  <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(studentName)}</div>
                  <div style="font-size: 0.76rem; color: var(--text-dim);">${c.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'} | NISN: ${escapeHtml(c.nisn || '-')}</div>
                </td>
                <td style="padding: 12px;">
                  <div style="font-weight: 500;">${escapeHtml(schName)}</div>
                  <div style="font-size: 0.76rem; color: var(--text-dim);">${escapeHtml(clsName)}</div>
                </td>
                <td style="padding: 12px; text-align: center; font-size: 0.8rem;">
                  ${sch ? `
                    <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563eb; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                      <i class="fa-solid fa-calendar-check"></i> ${escapeHtml(sch.name)}
                    </span>
                  ` : `
                    <span style="color: var(--text-muted); font-size: 0.78rem;">Belum Diplot</span>
                  `}
                </td>
                <td style="padding: 12px; text-align: center; font-weight: 700;">${btq || '-'}</td>
                <td style="padding: 12px; text-align: center; font-weight: 700;">${wudhu || '-'}</td>
                <td style="padding: 12px; text-align: center; font-weight: 700;">${salat || '-'}</td>
                <td style="padding: 12px; text-align: center; font-weight: 800; color: ${isCompleted ? '#059669' : 'var(--text-muted)'}; font-size: 0.95rem;">
                  ${total ? Number(total).toFixed(2) : '-'}
                </td>
                <td style="padding: 12px; text-align: center;">
                  ${isCompleted ? getPracticalPredicateBadge(total) : '<span class="badge" style="background:#fef3c7; color:#d97706; padding:3px 8px; border-radius:12px; font-size:0.75rem;">Belum Diuji</span>'}
                </td>
                <td style="padding: 12px; text-align: right;">
                  <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}" onclick="openPracticalEvaluationModal('${c.id}')" style="display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fa-solid ${isCompleted ? 'fa-pen-to-square' : 'fa-clipboard-check'}"></i>
                    ${isCompleted ? 'Edit Nilai' : 'Nilai Sekarang'}
                  </button>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// 2. ADMIN: KELOLA JADWAL TES PRAKTIK
// ============================================================================
async function renderAdminPracticalSchedulesView() {
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  await fetchPracticalMasterData();

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-calendar-week" style="color: var(--primary-600);"></i>
          Kelola Sesi Jadwal Tes Praktik
        </h2>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
          Atur sesi jadwal pengujian praktik ibadah (BTQ, Wudhu, Salat), ruangan/masjid, penugasan penguji, dan alokasi calon santri.
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="renderAdminPracticalSchedulesView()">
          <i class="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
        <button class="btn btn-primary btn-sm" onclick="openAdminPracticalScheduleModal()" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-calendar-plus"></i> Buat Jadwal Baru
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">PENCARIAN</label>
          <input type="text" id="sch-search-input" class="form-control" placeholder="Cari nama sesi / ruangan..." onkeyup="handleScheduleSearch(event)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">STATUS JADWAL</label>
          <select id="sch-status-filter" class="form-select" onchange="handleScheduleStatusFilter(this.value)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif (Terjadwal)</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">GELOMBANG</label>
          <select id="sch-wave-filter" class="form-select" onchange="handleScheduleWaveFilter(this.value)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <option value="">Semua Gelombang</option>
            ${(window.practicalAdminState.waves || []).map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- SCHEDULE LIST CONTAINER -->
    <div id="practical-schedules-list-container">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
        Memuat daftar jadwal tes praktik...
      </div>
    </div>
  `;

  loadPracticalSchedulesData();
}

let scheduleFilterParams = { search: '', status: '', waveId: '' };

async function loadPracticalSchedulesData() {
  const container = document.getElementById('practical-schedules-list-container');
  if (!container) return;

  const query = new URLSearchParams();
  if (scheduleFilterParams.search) query.append('search', scheduleFilterParams.search);
  if (scheduleFilterParams.status) query.append('status', scheduleFilterParams.status);
  if (scheduleFilterParams.waveId) query.append('admissionWaveId', scheduleFilterParams.waveId);

  try {
    const res = await apiRequest(`/api/practical-test/admin/schedules?${query.toString()}`);
    if (!res || !res.data) {
      container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Gagal memuat jadwal.</div>`;
      return;
    }

    const schedules = res.data;
    if (schedules.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
          <h4 style="font-size: 1.1rem; color: var(--text-heading); margin-bottom: 6px;">Belum Ada Jadwal Tes Praktik</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Silakan buat jadwal baru untuk mulai memplot santri dan menugaskan penguji.</p>
          <button class="btn btn-primary" onclick="openAdminPracticalScheduleModal()">
            <i class="fa-solid fa-calendar-plus" style="margin-right: 6px;"></i> Buat Jadwal Baru
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 18px;">
        ${schedules.map(sch => {
      const count = sch.assignedCount ?? sch.participantsCount ?? (sch.participants ? sch.participants.length : (sch.tests ? sch.tests.length : 0));
      const completedCount = sch.completedCount ?? 0;
      const quota = sch.quota || 20;
      const percent = Math.min(100, Math.round((count / quota) * 100));
      const formattedDate = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
      const examinersList = (sch.examiners || []).map(e => e?.name || e?.user?.name || e?.examiner?.name || 'Penguji').join(', ') || 'Belum ditugaskan';

      const isCancelled = sch.status === 'CANCELLED';
      const isCompleted = sch.status === 'COMPLETED';

      return `
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm); transition: transform 0.15s ease, box-shadow 0.15s ease;">
              <div>
                <!-- HEADER & STATUS -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <span class="badge" style="background: ${isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : '#e0f2fe'}; color: ${isCancelled ? '#dc2626' : isCompleted ? '#16a34a' : '#0284c7'}; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">
                    ${isCancelled ? '✕ Dibatalkan' : isCompleted ? '✓ Selesai' : '● Aktif / Terjadwal'}
                  </span>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn btn-sm btn-secondary" onclick="openAdminPracticalScheduleModal('${sch.id}')" title="Edit Jadwal" style="padding: 4px 8px;">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="confirmDeletePracticalSchedule('${sch.id}')" title="Hapus Jadwal" style="padding: 4px 8px; color: #dc2626;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0 0 6px 0; font-weight: 700;">
                  ${escapeHtml(sch.name)}
                </h3>
                
                <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
                  <div><i class="fa-solid fa-calendar-day" style="color: var(--primary-600); width: 16px;"></i> <strong>${formattedDate}</strong></div>
                  <div><i class="fa-solid fa-clock" style="color: var(--primary-600); width: 16px;"></i> ${escapeHtml(sch.startTime || '08:00')} - ${escapeHtml(sch.endTime || '12:00')} WIB</div>
                  <div><i class="fa-solid fa-location-dot" style="color: var(--primary-600); width: 16px;"></i> ${escapeHtml(sch.roomLocation || sch.room || 'Ruang Penguji')}</div>
                  <div><i class="fa-solid fa-user-tie" style="color: #7c3aed; width: 16px;"></i> Penguji: <strong>${escapeHtml(examinersList)}</strong></div>
                </div>

                <!-- PROGRESS KUOTA -->
                <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 16px; border: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px;">
                    <span style="color: var(--text-heading);">Santri Terplot:</span>
                    <span style="color: #0284c7;">${count} / ${quota} Santri (${percent}%)</span>
                  </div>
                  <div style="width: 100%; height: 6px; background: rgba(148, 163, 184, 0.2); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: ${percent >= 100 ? '#ef4444' : '#0284c7'};"></div>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                    <span>Selesai diuji: <strong>${completedCount}</strong> santri</span>
                    <span>Sisa kuota: <strong>${Math.max(0, quota - count)}</strong></span>
                  </div>
                </div>
              </div>

              <!-- ACTION BUTTONS -->
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="openAdminPracticalParticipantsModal('${sch.id}')" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.85rem; padding: 8px 12px;">
                  <i class="fa-solid fa-users-gear"></i> Plot & Kelola Santri (${count})
                </button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="text-align: center; padding: 30px; color: red;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

let scheduleSearchTimeout = null;
function handleScheduleSearch(e) {
  clearTimeout(scheduleSearchTimeout);
  scheduleSearchTimeout = setTimeout(() => {
    scheduleFilterParams.search = e.target.value;
    loadPracticalSchedulesData();
  }, 400);
}

function handleScheduleStatusFilter(val) {
  scheduleFilterParams.status = val;
  loadPracticalSchedulesData();
}

function handleScheduleWaveFilter(val) {
  scheduleFilterParams.waveId = val;
  loadPracticalSchedulesData();
}

// ============================================================================
// 3. CREATE / EDIT PRACTICAL SCHEDULE MODAL
// ============================================================================
async function openAdminPracticalScheduleModal(scheduleId = null) {
  await fetchPracticalMasterData();

  let modal = document.getElementById('practical-schedule-form-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'practical-schedule-form-modal';
    modal.className = 'modal-backdrop';
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); width: 100%; max-width: 650px; max-height: 92vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 20px 40px rgba(0,0,0,0.25); padding: 24px;">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 8px; display: block; color: var(--primary-600);"></i>
        Memuat formulir jadwal...
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  let schData = {
    name: '',
    room: '',
    scheduleDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '12:00',
    quota: 20,
    academicPeriodId: window.practicalAdminState.activePeriodId || '',
    admissionWaveId: '',
    schoolId: '',
    status: 'ACTIVE',
    examinerIds: [],
  };

  if (scheduleId) {
    try {
      const res = await apiRequest(`/api/practical-test/admin/schedules/${scheduleId}`);
      if (res && res.data) {
        const s = res.data;
        schData = {
          name: s.name || '',
          room: s.roomLocation || s.room || '',
          scheduleDate: s.scheduleDate ? new Date(s.scheduleDate).toISOString().split('T')[0] : '',
          startTime: s.startTime || '08:00',
          endTime: s.endTime || '12:00',
          quota: s.quota || 20,
          academicPeriodId: s.academicPeriodId || '',
          admissionWaveId: s.admissionWaveId || '',
          schoolId: s.schoolId || '',
          status: s.status || 'ACTIVE',
          examinerIds: (s.examiners || []).map(e => e.id || e.userId),
        };
      }
    } catch (err) {
      console.error('Error loading schedule detail:', err);
    }
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); width: 100%; max-width: 650px; max-height: 92vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
        <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-calendar-plus" style="color: var(--primary-600);"></i>
          ${scheduleId ? 'Edit Jadwal Tes Praktik' : 'Buat Sesi Jadwal Tes Praktik'}
        </h3>
        <button onclick="closeAdminPracticalScheduleModal()" style="background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form id="practical-schedule-form" onsubmit="handleSavePracticalSchedule(event, '${scheduleId || ''}')">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">NAMA SESI JADWAL *</label>
            <input type="text" id="sch-name" class="form-control" required placeholder="Contoh: Sesi 1 - Tes Praktik Ibadah & BTQ" value="${escapeHtml(schData.name)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">LOKASI / RUANGAN / TEMPAT *</label>
            <input type="text" id="sch-room" class="form-control" required placeholder="Contoh: Masjid Lt. 1 & Lab Keagamaan" value="${escapeHtml(schData.room)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">TANGGAL PELAKSANAAN *</label>
            <input type="date" id="sch-date" class="form-control" required value="${escapeHtml(schData.scheduleDate)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">JAM MULAI *</label>
            <input type="time" id="sch-startTime" class="form-control" required value="${escapeHtml(schData.startTime)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">JAM SELESAI *</label>
            <input type="time" id="sch-endTime" class="form-control" required value="${escapeHtml(schData.endTime)}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">KUOTA SANTRI *</label>
            <input type="number" id="sch-quota" class="form-control" min="1" max="500" required value="${schData.quota}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">GELOMBANG</label>
            <select id="sch-waveId" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="">Semua Gelombang</option>
              ${(window.practicalAdminState.waves || []).map(w => `<option value="${w.id}" ${schData.admissionWaveId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">STATUS</label>
            <select id="sch-status" class="form-select" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="ACTIVE" ${schData.status === 'ACTIVE' ? 'selected' : ''}>Aktif (Terjadwal)</option>
              <option value="COMPLETED" ${schData.status === 'COMPLETED' ? 'selected' : ''}>Selesai</option>
              <option value="CANCELLED" ${schData.status === 'CANCELLED' ? 'selected' : ''}>Dibatalkan</option>
            </select>
          </div>
        </div>

        <!-- ASSIGN EXAMINERS (PETUGAS TES PRAKTIK) -->
        <div style="margin-bottom: 20px; background: var(--bg-body); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-heading); display: block; margin-bottom: 8px;">
            <i class="fa-solid fa-user-tie" style="color: var(--primary-600);"></i> Tugaskan Petugas Penguji Praktik:
          </label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; max-height: 180px; overflow-y: auto;">
            ${(window.practicalAdminState.examiners || []).length > 0 ? (window.practicalAdminState.examiners || []).map(ex => `
              <label style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: var(--bg-card); border: 1px solid var(--border-subtle); cursor: pointer;">
                <input type="checkbox" name="examinerIds" value="${ex.id}" ${schData.examinerIds.includes(ex.id) ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-heading);">${escapeHtml(ex.name)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">${escapeHtml(ex.email)}</div>
                </div>
              </label>
            `).join('') : '<div style="color: var(--text-muted); font-size: 0.85rem;">Belum ada user dengan role PETUGAS_TES_PRAKTIK.</div>'}
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
          <button type="button" class="btn btn-secondary" onclick="closeAdminPracticalScheduleModal()">Batal</button>
          <button type="submit" id="btn-submit-sch-form" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Sesi Jadwal
          </button>
        </div>
      </form>
    </div>
  `;
}

function closeAdminPracticalScheduleModal() {
  const modal = document.getElementById('practical-schedule-form-modal');
  if (modal) modal.style.display = 'none';
}

async function handleSavePracticalSchedule(e, scheduleId) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-sch-form');
  if (btn) btn.disabled = true;

  const checkedExaminers = Array.from(document.querySelectorAll('input[name="examinerIds"]:checked')).map(cb => cb.value);

  const payload = {
    name: document.getElementById('sch-name').value.trim(),
    room: document.getElementById('sch-room').value.trim(),
    scheduleDate: document.getElementById('sch-date').value,
    startTime: document.getElementById('sch-startTime').value,
    endTime: document.getElementById('sch-endTime').value,
    quota: parseInt(document.getElementById('sch-quota').value, 10) || 20,
    academicPeriodId: window.practicalAdminState.activePeriodId || undefined,
    admissionWaveId: document.getElementById('sch-waveId').value || undefined,
    status: document.getElementById('sch-status').value,
    examinerIds: checkedExaminers,
  };

  try {
    const url = scheduleId ? `/api/practical-test/admin/schedules/${scheduleId}` : '/api/practical-test/admin/schedules';
    const method = scheduleId ? 'PATCH' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: payload,
    });

    if (res && res.success) {
      showToast(scheduleId ? 'Jadwal berhasil diperbarui!' : 'Jadwal baru berhasil dibuat!', 'success');
      closeAdminPracticalScheduleModal();
      loadPracticalSchedulesData();
    } else {
      showToast(res.message || 'Gagal menyimpan jadwal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan sistem.', 'danger');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function confirmDeletePracticalSchedule(scheduleId) {
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
      title: 'Hapus Jadwal Tes Praktik',
      message: 'Apakah Anda yakin ingin menghapus jadwal tes praktik ini? Calon santri yang diplot akan kembali ke status belum terjadwal.',
      confirmText: 'Ya, Hapus Jadwal',
      cancelText: 'Batal',
      type: 'danger'
    })
    : confirm('Apakah Anda yakin ingin menghapus jadwal tes praktik ini? Calon santri yang diplot akan kembali ke status belum terjadwal.');
  if (!ok) return;

  try {
    const res = await apiRequest(`/api/practical-test/admin/schedules/${scheduleId}`, { method: 'DELETE' });
    if (res && res.success) {
      showToast('Jadwal tes praktik berhasil dihapus.', 'success');
      loadPracticalSchedulesData();
    } else {
      showToast(res.message || 'Gagal menghapus jadwal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  }
}

// ============================================================================
// 4. ADMIN: MODAL ATUR & PLOTTING PESERTA JADWAL PRAKTIK
// ============================================================================
let activeManageScheduleId = null;
let activeScheduleTab = 'assigned'; // 'assigned' | 'available'

async function openAdminPracticalParticipantsModal(scheduleId) {
  activeManageScheduleId = scheduleId;
  activeScheduleTab = 'assigned';

  let modal = document.getElementById('practical-participants-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'practical-participants-modal';
    modal.className = 'modal-backdrop';
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); width: 100%; max-width: 900px; max-height: 92vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 24px;">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600); margin-bottom: 12px; display: block;"></i>
        Memuat data peserta jadwal...
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  await renderScheduleParticipantsModalContent();
}

async function renderScheduleParticipantsModalContent() {
  const modal = document.getElementById('practical-participants-modal');
  if (!modal || !activeManageScheduleId) return;

  try {
    const res = await apiRequest(`/api/practical-test/admin/schedules/${activeManageScheduleId}`);
    if (!res || !res.data) {
      modal.innerHTML = `
        <div style="background: var(--bg-card); padding: 24px; text-align: center; border-radius: var(--radius-lg);">
          <div style="color: red; margin-bottom: 12px;">Gagal mengambil data jadwal.</div>
          <button class="btn btn-secondary" onclick="closeAdminPracticalParticipantsModal()">Tutup</button>
        </div>
      `;
      return;
    }

    const sch = res.data;
    const participants = sch.participants || [];
    const formattedDate = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    modal.innerHTML = `
      <div style="background: var(--bg-card); width: 100%; max-width: 950px; max-height: 92vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 24px;">
        
        <!-- MODAL HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600); text-transform: uppercase;">PLOT PESERTA TES PRAKTIK</div>
            <h3 style="font-size: 1.3rem; color: var(--text-heading); margin: 4px 0;">${escapeHtml(sch.name)}</h3>
            <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap;">
              <span><i class="fa-solid fa-calendar"></i> ${formattedDate}</span>
              <span><i class="fa-solid fa-clock"></i> ${escapeHtml(sch.startTime)} - ${escapeHtml(sch.endTime)} WIB</span>
              <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || sch.room || '-')}</span>
              <span><i class="fa-solid fa-users"></i> Kuota: <strong>${participants.length} / ${sch.quota}</strong></span>
            </div>
          </div>
          <button onclick="closeAdminPracticalParticipantsModal()" style="background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- TABS -->
        <div style="display: flex; gap: 10px; border-bottom: 2px solid var(--border-subtle); margin-bottom: 16px;">
          <button class="btn btn-sm ${activeScheduleTab === 'assigned' ? 'btn-primary' : 'btn-secondary'}" onclick="switchScheduleModalTab('assigned')" style="border-radius: 6px 6px 0 0; padding: 8px 16px;">
            <i class="fa-solid fa-users-viewfinder"></i> Peserta Terjadwal (${participants.length})
          </button>
          <button class="btn btn-sm ${activeScheduleTab === 'available' ? 'btn-primary' : 'btn-secondary'}" onclick="switchScheduleModalTab('available')" style="border-radius: 6px 6px 0 0; padding: 8px 16px;">
            <i class="fa-solid fa-user-plus"></i> + Plotting Calon Santri Baru
          </button>
        </div>

        <!-- TAB BODY -->
        <div id="sch-tab-content-container">
          ${activeScheduleTab === 'assigned' ? renderAssignedParticipantsTab(participants, sch) : ''}
        </div>

      </div>
    `;

    if (activeScheduleTab === 'available') {
      loadAvailableCandidatesForSchedule();
    }
  } catch (err) {
    console.error('Error rendering schedule participants modal:', err);
  }
}

function switchScheduleModalTab(tab) {
  activeScheduleTab = tab;
  renderScheduleParticipantsModalContent();
}

function closeAdminPracticalParticipantsModal() {
  const modal = document.getElementById('practical-participants-modal');
  if (modal) modal.style.display = 'none';
  if (typeof loadPracticalSchedulesData === 'function' && document.getElementById('practical-schedules-list-container')) {
    loadPracticalSchedulesData();
  }
}

function renderAssignedParticipantsTab(participants, schedule) {
  if (!participants || participants.length === 0) {
    return `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-users-slash" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 10px; display: block;"></i>
        <div style="font-size: 1rem; font-weight: 600; color: var(--text-heading); margin-bottom: 4px;">Belum Ada Peserta dalam Jadwal Ini</div>
        <p style="font-size: 0.85rem; margin-bottom: 16px;">Silakan klik tab <strong>"+ Plotting Calon Santri Baru"</strong> di atas untuk menambahkan calon santri.</p>
        <button class="btn btn-primary btn-sm" onclick="switchScheduleModalTab('available')">
          <i class="fa-solid fa-user-plus"></i> Tambah Peserta Sekarang
        </button>
      </div>
    `;
  }

  return `
    <div style="overflow-x: auto;">
      <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.78rem;">
            <th style="padding: 8px 10px;">NO. REG</th>
            <th style="padding: 8px 10px;">NAMA CALON SANTRI</th>
            <th style="padding: 8px 10px;">SEKOLAH & PROGRAM</th>
            <th style="padding: 8px 10px; text-align: center;">BTQ</th>
            <th style="padding: 8px 10px; text-align: center;">WUDHU</th>
            <th style="padding: 8px 10px; text-align: center;">SALAT</th>
            <th style="padding: 8px 10px; text-align: center;">RERATA</th>
            <th style="padding: 8px 10px; text-align: center;">STATUS</th>
            <th style="padding: 8px 10px; text-align: right;">AKSI</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map(pt => {
    const isDone = pt.practicalStatus === 'COMPLETED';
    const studentName = pt.studentName || '-';
    const schoolName = pt.schoolName || '-';
    const className = pt.className || '-';
    const genderLabel = pt.gender === 'L' ? 'Laki-laki' : 'Perempuan';

    return `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 10px;"><code>${escapeHtml(pt.registrationNumber || '-')}</code></td>
                <td style="padding: 10px;">
                  <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(studentName)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${genderLabel}</div>
                </td>
                <td style="padding: 10px;">
                  <div>${escapeHtml(schoolName)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(className)}</div>
                </td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">${pt.btqScore || '-'}</td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">${pt.wudhuScore || '-'}</td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">${pt.salatScore || '-'}</td>
                <td style="padding: 10px; text-align: center; font-weight: 800; color: #059669;">
                  ${pt.totalScore ? Number(pt.totalScore).toFixed(2) : '-'}
                </td>
                <td style="padding: 10px; text-align: center;">
                  <span class="badge" style="background: ${isDone ? '#dcfce7' : '#e0f2fe'}; color: ${isDone ? '#16a34a' : '#0284c7'}; font-size: 0.72rem; padding: 3px 8px; border-radius: 12px; font-weight: 700;">
                    ${isDone ? '✓ Selesai' : 'Terjadwal'}
                  </span>
                </td>
                <td style="padding: 10px; text-align: right;">
                  <div style="display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}" onclick="openPracticalEvaluationModal('${pt.registrationId}')" title="${isDone ? 'Ubah Nilai' : 'Nilai Sekarang'}" style="padding: 4px 8px; font-size: 0.78rem;">
                      <i class="fa-solid ${isDone ? 'fa-pen-to-square' : 'fa-clipboard-check'}"></i> ${isDone ? 'Ubah' : 'Nilai'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="confirmRemoveParticipantFromSchedule('${activeManageScheduleId}', '${pt.registrationId}')" title="Keluarkan dari jadwal" style="padding: 4px 8px; font-size: 0.78rem; color: #dc2626;">
                      <i class="fa-solid fa-user-xmark"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function loadAvailableCandidatesForSchedule() {
  const container = document.getElementById('sch-tab-content-container');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 14px; display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap;">
      <input type="text" id="sch-plot-search" class="form-control" placeholder="Cari nama / no. registrasi santri..." onkeyup="filterAvailablePlotTable()" style="max-width: 320px; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="toggleSelectAllPlotCandidates(true)">Pilih Semua</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="toggleSelectAllPlotCandidates(false)">Batal Pilih</button>
        <button type="button" id="btn-submit-bulk-plot" class="btn btn-primary btn-sm" onclick="submitBulkPlotParticipants()" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-user-plus"></i> Tambahkan Terpilih (<span id="selected-plot-count">0</span>)
        </button>
      </div>
    </div>
    <div id="sch-available-table-wrap">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat calon santri yang siap diplot...</div>
    </div>
  `;

  try {
    const res = await apiRequest('/api/practical-test/admin/candidates/ready?status=NOT_SCHEDULED&limit=100');
    const tableWrap = document.getElementById('sch-available-table-wrap');
    if (!tableWrap) return;

    if (!res || !res.data || res.data.length === 0) {
      tableWrap.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <i class="fa-solid fa-check-circle" style="font-size: 2rem; color: #10b981; margin-bottom: 8px; display: block;"></i>
          Semua calon santri yang lulus CBT sudah memiliki jadwal tes praktik!
        </div>
      `;
      return;
    }

    const list = res.data;
    tableWrap.innerHTML = `
      <div style="max-height: 380px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;" id="plot-candidates-table">
          <thead style="position: sticky; top: 0; background: var(--bg-body); z-index: 2;">
            <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.78rem;">
              <th style="padding: 8px 10px; width: 40px; text-align: center;"><i class="fa-solid fa-check-double"></i></th>
              <th style="padding: 8px 10px;">NO. REGISTRASI</th>
              <th style="padding: 8px 10px;">NAMA CALON SANTRI</th>
              <th style="padding: 8px 10px;">SEKOLAH & JURUSAN</th>
              <th style="padding: 8px 10px; text-align: center;">CBT</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr class="plot-candidate-row" style="border-bottom: 1px solid var(--border-subtle); cursor: pointer;" onclick="toggleCandidateCheckbox(event, '${c.id}')">
                <td style="padding: 8px 10px; text-align: center;" onclick="event.stopPropagation();">
                  <input type="checkbox" name="plotRegistrationIds" value="${c.id}" onchange="updateSelectedPlotCount()">
                </td>
                <td style="padding: 8px 10px;"><code>${escapeHtml(c.registrationNumber)}</code></td>
                <td style="padding: 8px 10px;">
                  <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(c.studentName)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">${c.gender === 'L' ? 'L' : 'P'} | NISN: ${escapeHtml(c.nisn || '-')}</div>
                </td>
                <td style="padding: 8px 10px;">
                  <div>${escapeHtml(c.schoolName)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">${escapeHtml(c.className)}</div>
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                  <span class="badge" style="background: #dcfce7; color: #16a34a; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">✓ Lulus</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error loading ready candidates:', err);
  }
}

function toggleCandidateCheckbox(event, regId) {
  const row = event.currentTarget;
  const cb = row.querySelector('input[type="checkbox"]');
  if (cb) {
    cb.checked = !cb.checked;
    updateSelectedPlotCount();
  }
}

function updateSelectedPlotCount() {
  const count = document.querySelectorAll('input[name="plotRegistrationIds"]:checked').length;
  const badge = document.getElementById('selected-plot-count');
  if (badge) badge.textContent = count;
}

function toggleSelectAllPlotCandidates(checked) {
  const checkboxes = document.querySelectorAll('input[name="plotRegistrationIds"]');
  checkboxes.forEach(cb => {
    const row = cb.closest('tr');
    if (!row || row.style.display !== 'none') {
      cb.checked = checked;
    }
  });
  updateSelectedPlotCount();
}

function filterAvailablePlotTable() {
  const q = (document.getElementById('sch-plot-search')?.value || '').toLowerCase();
  const rows = document.querySelectorAll('#plot-candidates-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
}

async function submitBulkPlotParticipants() {
  const selectedCbs = Array.from(document.querySelectorAll('input[name="plotRegistrationIds"]:checked'));
  if (selectedCbs.length === 0) {
    showToast('Pilih setidaknya 1 calon santri untuk diplot.', 'warning');
    return;
  }

  const registrationIds = selectedCbs.map(cb => cb.value);
  const btn = document.getElementById('btn-submit-bulk-plot');
  if (btn) btn.disabled = true;

  try {
    const res = await apiRequest(`/api/practical-test/admin/schedules/${activeManageScheduleId}/assign-participants`, {
      method: 'POST',
      body: { registrationIds },
    });

    if (res && res.success) {
      showToast(`Berhasil menambahkan ${registrationIds.length} santri ke dalam jadwal!`, 'success');
      switchScheduleModalTab('assigned');
      if (typeof loadPracticalSchedulesData === 'function' && document.getElementById('practical-schedules-list-container')) {
        loadPracticalSchedulesData();
      }
    } else {
      showToast(res.message || 'Gagal menambahkan peserta.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan sistem.', 'danger');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function confirmRemoveParticipantFromSchedule(scheduleId, registrationId) {
  const ok = typeof window.showAppConfirm === 'function'
    ? await window.showAppConfirm({
      title: 'Keluarkan Santri dari Jadwal',
      message: 'Hapus santri ini dari jadwal? Status santri akan kembali menjadi Belum Terjadwal.',
      confirmText: 'Ya, Keluarkan',
      cancelText: 'Batal',
      type: 'danger'
    })
    : confirm('Hapus santri ini dari jadwal? Status santri akan kembali menjadi Belum Terjadwal.');
  if (!ok) return;

  try {
    const res = await apiRequest(`/api/practical-test/admin/schedules/${scheduleId}/participants/${registrationId}`, {
      method: 'DELETE',
    });

    if (res && res.success) {
      showToast('Santri berhasil dikeluarkan dari jadwal.', 'success');
      renderScheduleParticipantsModalContent();
      if (typeof loadPracticalSchedulesData === 'function' && document.getElementById('practical-schedules-list-container')) {
        loadPracticalSchedulesData();
      }
    } else {
      showToast(res.message || 'Gagal menghapus santri dari jadwal.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan.', 'danger');
  }
}

// ============================================================================
// 5. EXAMINER (PETUGAS TES PRAKTIK): JADWAL SAYA & ANTREAN
// ============================================================================
async function renderExaminerMySchedules() {
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-calendar-check" style="color: var(--primary-600);"></i>
          Jadwal Pengujian Praktik Saya
        </h2>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
          Daftar sesi tes praktik di mana Anda ditugaskan sebagai penguji ibadah santri.
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="renderExaminerMySchedules()">
          <i class="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </div>
    </div>

    <div id="examiner-my-schedules-container">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; margin-bottom: 8px; display: block; color: var(--primary-600);"></i>
        Memuat jadwal Anda...
      </div>
    </div>
  `;

  try {
    const res = await apiRequest('/api/practical-test/examiner/my-schedules');
    const wrap = document.getElementById('examiner-my-schedules-container');
    if (!wrap) return;

    if (!res || !res.data || res.data.length === 0) {
      wrap.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
          <h4 style="font-size: 1.1rem; color: var(--text-heading); margin-bottom: 6px;">Belum Ada Jadwal Pengujian</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Anda belum ditugaskan pada sesi jadwal tes praktik manapun oleh Administrator.</p>
        </div>
      `;
      return;
    }

    const schedules = res.data;
    wrap.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 18px;">
        ${schedules.map(sch => {
      const count = sch.assignedCount ?? sch.participantsCount ?? (sch.participants ? sch.participants.length : (sch.tests ? sch.tests.length : 0));
      const completedCount = sch.completedCount ?? 0;
      const formattedDate = sch.scheduleDate ? new Date(sch.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';

      return `
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span class="badge" style="background: rgba(2, 132, 199, 0.1); color: #0284c7; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(sch.roomLocation || sch.room || 'Ruangan')}
                  </span>
                  <span style="font-size: 0.8rem; font-weight: 700; color: #059669;">
                    ${completedCount} / ${count} Selesai Dinilai
                  </span>
                </div>

                <h3 style="font-size: 1.2rem; color: var(--text-heading); margin: 0 0 8px 0; font-weight: 700;">
                  ${escapeHtml(sch.name)}
                </h3>

                <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
                  <div><i class="fa-solid fa-calendar-day" style="color: var(--primary-600); width: 18px;"></i> <strong>${formattedDate}</strong></div>
                  <div><i class="fa-solid fa-clock" style="color: var(--primary-600); width: 18px;"></i> ${escapeHtml(sch.startTime || '08:00')} - ${escapeHtml(sch.endTime || '12:00')} WIB</div>
                  <div><i class="fa-solid fa-users" style="color: var(--primary-600); width: 18px;"></i> Total Santri: <strong>${count} Orang</strong></div>
                </div>
              </div>

              <div>
                <button class="btn btn-primary" onclick="renderExaminerScheduleQueue('${sch.id}')" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px;">
                  <i class="fa-solid fa-clipboard-list"></i> Buka Antrean Santri (${count})
                </button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error loading examiner schedules:', err);
  }
}

async function renderExaminerScheduleQueue(scheduleId) {
  currentExaminerScheduleId = scheduleId;
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <button class="btn btn-secondary btn-sm" onclick="renderExaminerMySchedules()" style="margin-bottom: 8px;">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Jadwal Saya
        </button>
        <h2 style="font-size: 1.4rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-users-line" style="color: var(--primary-600);"></i>
          Antrean Penilaian Santri
        </h2>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="renderExaminerScheduleQueue('${scheduleId}')">
          <i class="fa-solid fa-arrows-rotate"></i> Refresh Antrean
        </button>
      </div>
    </div>

    <div id="examiner-queue-table-container">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat antrean peserta...</div>
    </div>
  `;

  try {
    const res = await apiRequest(`/api/practical-test/examiner/schedules/${scheduleId}/participants`);
    const wrap = document.getElementById('examiner-queue-table-container');
    if (!wrap) return;

    const queueData = res?.data || {};
    const schedule = queueData.schedule || {};
    const participants = queueData.participants || (Array.isArray(queueData) ? queueData : []);

    if (participants.length === 0) {
      wrap.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
          <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
          <h4 style="font-size: 1.1rem; color: var(--text-heading); margin-bottom: 6px;">Belum Ada Calon Santri dalam Antrean</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Administrator belum memplot calon santri ke dalam sesi jadwal ini.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 8px;">
          <div style="font-weight: 700; color: var(--text-heading); font-size: 1rem;">
            ${escapeHtml(schedule.name || 'Jadwal Praktik')} - <span style="color: var(--primary-600);">${escapeHtml(schedule.roomLocation || '-')}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Total Peserta: <strong>${participants.length} Santri</strong>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.8rem;">
                <th style="padding: 10px 12px;">NO. REG</th>
                <th style="padding: 10px 12px;">NAMA SANTRI</th>
                <th style="padding: 10px 12px;">SEKOLAH & JURUSAN</th>
                <th style="padding: 10px 12px; text-align: center;">BTQ</th>
                <th style="padding: 10px 12px; text-align: center;">WUDHU</th>
                <th style="padding: 10px 12px; text-align: center;">SALAT</th>
                <th style="padding: 10px 12px; text-align: center;">RERATA</th>
                <th style="padding: 10px 12px; text-align: center;">STATUS</th>
                <th style="padding: 10px 12px; text-align: right;">AKSI</th>
              </tr>
            </thead>
            <tbody>
              ${participants.map(pt => {
      const studentName = pt.studentName || pt.name || '-';
      const regNumber = pt.registrationNumber || '-';
      const schoolName = pt.schoolName || '-';
      const className = pt.className || '-';
      const regId = pt.registrationId || pt.id;
      const isDone = pt.practicalStatus === 'COMPLETED' || pt.status === 'COMPLETED';

      return `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 12px;"><code style="font-weight: 700; color: var(--primary-600);">${escapeHtml(regNumber)}</code></td>
                    <td style="padding: 12px;">
                      <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(studentName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${pt.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'} | NISN: ${escapeHtml(pt.nisn || '-')}</div>
                    </td>
                    <td style="padding: 12px;">
                      <div>${escapeHtml(schoolName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(className)}</div>
                    </td>
                    <td style="padding: 12px; text-align: center; font-weight: 700;">${pt.btqScore || '-'}</td>
                    <td style="padding: 12px; text-align: center; font-weight: 700;">${pt.wudhuScore || '-'}</td>
                    <td style="padding: 12px; text-align: center; font-weight: 700;">${pt.salatScore || '-'}</td>
                    <td style="padding: 12px; text-align: center; font-weight: 800; color: ${isDone ? '#059669' : 'var(--text-muted)'}; font-size: 0.95rem;">
                      ${pt.totalScore ? Number(pt.totalScore).toFixed(2) : '-'}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                      <span class="badge" style="background: ${isDone ? '#dcfce7' : '#fef3c7'}; color: ${isDone ? '#16a34a' : '#d97706'}; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; font-weight: 700;">
                        ${isDone ? '✓ Selesai' : 'Belum Diuji'}
                      </span>
                    </td>
                    <td style="padding: 12px; text-align: right;">
                      <button class="btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}" onclick="openPracticalEvaluationModal('${regId}')" style="display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid ${isDone ? 'fa-pen-to-square' : 'fa-clipboard-check'}"></i>
                        ${isDone ? 'Edit Nilai' : 'Nilai Sekarang'}
                      </button>
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
    console.error('Error loading schedule queue:', err);
  }
}

// ============================================================================
// 6. CANDIDATES LIST & EVALUATION TABLE
// ============================================================================
async function renderPracticalCandidatesView() {
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-user-check" style="color: var(--primary-600);"></i>
          Penilaian Calon Santri - Tes Praktik
        </h2>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
          Pilih calon santri untuk memasukkan lembar penilaian Baca Tulis Al-Qur'an (BTQ), Wudhu, dan Salat.
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="renderPracticalCandidatesView()">
          <i class="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">PENCARIAN</label>
          <input type="text" id="practical-search-input" class="form-control" placeholder="Cari Nama / No. Reg / NISN..." value="${escapeHtml(practicalFilterState.search)}" onkeyup="handlePracticalSearch(event)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); display: block; margin-bottom: 4px;">STATUS PENILAIAN</label>
          <select id="practical-status-filter" class="form-select" onchange="handlePracticalStatusChange(this.value)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <option value="ALL" ${practicalFilterState.status === 'ALL' ? 'selected' : ''}>Semua Santri</option>
            <option value="NOT_SCHEDULED" ${practicalFilterState.status === 'NOT_SCHEDULED' ? 'selected' : ''}>Belum Dijadwal</option>
            <option value="SCHEDULED" ${practicalFilterState.status === 'SCHEDULED' ? 'selected' : ''}>Sudah Dijadwal (Belum Dinilai)</option>
            <option value="COMPLETED" ${practicalFilterState.status === 'COMPLETED' ? 'selected' : ''}>Sudah Selesai Dinilai</option>
          </select>
        </div>
      </div>
    </div>

    <!-- CANDIDATES TABLE CONTAINER -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px;">
      <div id="practical-candidates-table-wrap">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
          Memuat daftar calon santri...
        </div>
      </div>
      <div id="practical-pagination-wrap" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;"></div>
    </div>
  `;

  loadPracticalCandidatesData();
}

async function loadPracticalCandidatesData() {
  const tableWrap = document.getElementById('practical-candidates-table-wrap');
  if (!tableWrap) return;

  const queryParams = new URLSearchParams({
    page: practicalFilterState.page,
    limit: practicalFilterState.limit,
    search: practicalFilterState.search,
    status: practicalFilterState.status,
  });

  try {
    const res = await apiRequest(`/api/practical-test/admin/candidates/ready?${queryParams.toString()}`);
    if (!res || !res.data) {
      tableWrap.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Gagal memuat data.</div>`;
      return;
    }

    const candidates = res.data;
    const pagination = res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };

    if (candidates.length === 0) {
      tableWrap.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-dim); display: block;"></i>
          Tidak ada calon santri yang sesuai dengan filter pencarian.
        </div>
      `;
      document.getElementById('practical-pagination-wrap').innerHTML = '';
      return;
    }

    tableWrap.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.78rem;">
              <th style="padding: 10px 12px;">NO. REGISTRASI</th>
              <th style="padding: 10px 12px;">NAMA CALON SANTRI</th>
              <th style="padding: 10px 12px;">SEKOLAH / PROGRAM</th>
              <th style="padding: 10px 12px; text-align: center;">JADWAL</th>
              <th style="padding: 10px 12px; text-align: center;">BTQ</th>
              <th style="padding: 10px 12px; text-align: center;">WUDHU</th>
              <th style="padding: 10px 12px; text-align: center;">SALAT</th>
              <th style="padding: 10px 12px; text-align: center;">RERATA</th>
              <th style="padding: 10px 12px; text-align: center;">STATUS</th>
              <th style="padding: 10px 12px; text-align: right;">AKSI</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map(c => {
      const isDone = c.practicalStatus === 'COMPLETED';
      const sch = c.schedule;
      return `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 12px;">
                    <code style="font-weight: 700; color: var(--primary-600);">${escapeHtml(c.registrationNumber)}</code>
                  </td>
                  <td style="padding: 12px;">
                    <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(c.studentName)}</div>
                    <div style="font-size: 0.76rem; color: var(--text-dim);">${c.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'} | NISN: ${escapeHtml(c.nisn || '-')}</div>
                  </td>
                  <td style="padding: 12px;">
                    <div style="font-weight: 500;">${escapeHtml(c.schoolName)}</div>
                    <div style="font-size: 0.76rem; color: var(--text-dim);">${escapeHtml(c.className)}</div>
                  </td>
                  <td style="padding: 12px; text-align: center; font-size: 0.8rem;">
                    ${sch ? `
                      <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #2563eb; padding: 3px 6px; border-radius: 4px; font-weight: 600;">
                        ${escapeHtml(sch.name)}
                      </span>
                    ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>'}
                  </td>
                  <td style="padding: 12px; text-align: center; font-weight: 700;">
                    ${c.btqScore ? `<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; padding: 3px 8px; border-radius: 4px;">${c.btqScore}</span>` : '-'}
                  </td>
                  <td style="padding: 12px; text-align: center; font-weight: 700;">
                    ${c.wudhuScore ? `<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; padding: 3px 8px; border-radius: 4px;">${c.wudhuScore}</span>` : '-'}
                  </td>
                  <td style="padding: 12px; text-align: center; font-weight: 700;">
                    ${c.salatScore ? `<span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #059669; padding: 3px 8px; border-radius: 4px;">${c.salatScore}</span>` : '-'}
                  </td>
                  <td style="padding: 12px; text-align: center; font-weight: 800; color: ${isDone ? '#059669' : 'var(--text-muted)'}; font-size: 0.95rem;">
                    ${c.totalScore ? `${Number(c.totalScore).toFixed(2)}` : '-'}
                  </td>
                  <td style="padding: 12px; text-align: center;">
                    <span class="badge" style="background: ${isDone ? '#dcfce7' : c.practicalStatus === 'SCHEDULED' ? '#e0f2fe' : '#fef3c7'}; color: ${isDone ? '#15803d' : c.practicalStatus === 'SCHEDULED' ? '#0284c7' : '#d97706'}; border: 1px solid ${isDone ? '#86efac' : c.practicalStatus === 'SCHEDULED' ? '#bae6fd' : '#fde68a'}; padding: 3px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700;">
                      ${isDone ? '✓ Selesai' : c.practicalStatus === 'SCHEDULED' ? 'Terjadwal' : 'Belum Dijadwal'}
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: right;">
                    <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                      <button class="btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}" onclick="openPracticalEvaluationModal('${c.id}')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px;" title="Input / Ubah Nilai Praktik">
                        <i class="fa-solid ${isDone ? 'fa-pen-to-square' : 'fa-clipboard-check'}"></i>
                        ${isDone ? 'Ubah' : 'Nilai'}
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printPracticalCandidateSheet('${c.id}')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px;" title="Cetak Lembar Uji Santri (Kertas Penguji)">
                        <i class="fa-solid fa-print"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-primary" onclick="printPracticalCandidateSheet('${c.id}', true)" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px;" title="Download PDF Lembar Uji Santri">
                        <i class="fa-solid fa-file-pdf"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-success" onclick="openExemptPracticalModal('${c.id}', '${escapeHtml(c.registrationNumber)}', '${escapeHtml(c.studentName)}', '${escapeHtml(c.schoolName || '')}')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px; background: #16a34a; border-color: #16a34a; color: #fff;" title="Tandai Santri Bebas Tes Praktik">
                        <i class="fa-solid fa-user-check"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Pagination
    const pagWrap = document.getElementById('practical-pagination-wrap');
    if (pagWrap) {
      pagWrap.innerHTML = `
        <div style="font-size: 0.82rem; color: var(--text-muted);">
          Menampilkan <strong>${candidates.length}</strong> dari <strong>${pagination.total}</strong> calon santri
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" ${pagination.page <= 1 ? 'disabled' : ''} onclick="changePracticalPage(${pagination.page - 1})">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span style="display: inline-flex; align-items: center; padding: 0 10px; font-size: 0.85rem; font-weight: 600; color: var(--text-main);">
            Hal ${pagination.page} / ${pagination.totalPages}
          </span>
          <button class="btn btn-secondary btn-sm" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="changePracticalPage(${pagination.page + 1})">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      `;
    }
  } catch (err) {
    tableWrap.innerHTML = `<div style="text-align: center; padding: 30px; color: red;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

let practicalCandidateSearchTimeout = null;
function handlePracticalSearch(e) {
  clearTimeout(practicalCandidateSearchTimeout);
  practicalCandidateSearchTimeout = setTimeout(() => {
    practicalFilterState.search = e.target.value;
    practicalFilterState.page = 1;
    loadPracticalCandidatesData();
  }, 400);
}

function handlePracticalStatusChange(val) {
  practicalFilterState.status = val;
  practicalFilterState.page = 1;
  loadPracticalCandidatesData();
}

function changePracticalPage(page) {
  practicalFilterState.page = page;
  loadPracticalCandidatesData();
}

// ============================================================================
// 7. LEMBAR PENILAIAN INTERAKTIF TES PRAKTIK (BTQ, WUDHU & SALAT)
// ============================================================================
async function openPracticalEvaluationModal(registrationId) {
  let modal = document.getElementById('practical-eval-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'practical-eval-modal';
    modal.className = 'modal-backdrop';
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 20px 40px rgba(0,0,0,0.25); padding: 24px;">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px; color: var(--primary-600); display: block;"></i>
        Memuat lembar penilaian tes praktik calon santri...
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  try {
    const res = await apiRequest(`/api/practical-test/examiner/process/${registrationId}`);
    if (!res || !res.data) {
      modal.innerHTML = `
        <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); text-align: center;">
          <div style="color: red; margin-bottom: 12px;">Gagal mengambil data calon santri.</div>
          <button class="btn btn-secondary" onclick="closePracticalEvaluationModal()">Tutup</button>
        </div>
      `;
      return;
    }

    const c = res.data;
    const p = c.practicalTest || {};

    const btqVal = p.btqScore || 0;
    const wudhuVal = p.wudhuScore || 0;
    const salatVal = p.salatScore || 0;

    modal.innerHTML = `
      <div style="background: var(--bg-card); width: 100%; max-width: 860px; max-height: 94vh; overflow-y: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 26px;">
        
        <!-- HEADER IDENTITAS SANTRI -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; gap: 14px; align-items: center;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 800;">
              <i class="fa-solid fa-book-quran"></i>
            </div>
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--primary-600); text-transform: uppercase; letter-spacing: 0.5px;">
                LEMBAR EVALUASI & PENILAIAN TES PRAKTIK
              </div>
              <h3 style="font-size: 1.35rem; color: var(--text-heading); margin: 2px 0 4px 0;">
                ${escapeHtml(c.studentName)}
              </h3>
              <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
                <span><i class="fa-solid fa-id-card"></i> Reg: <strong>${escapeHtml(c.registrationNumber)}</strong></span>
                <span><i class="fa-solid fa-school"></i> ${escapeHtml(c.schoolName)} (${escapeHtml(c.className)})</span>
                <span><i class="fa-solid fa-venus-mars"></i> ${c.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline-primary btn-sm" onclick="printPracticalCandidateSheet('${c.id}')" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 6px 12px; font-size: 0.8rem;" title="Cetak Lembar Penilaian Santri untuk Penguji">
              <i class="fa-solid fa-print"></i> Cetak
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="printPracticalCandidateSheet('${c.id}', true)" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 6px 12px; font-size: 0.8rem;" title="Download Lembar Penilaian Santri sebagai PDF">
              <i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i> Download PDF
            </button>
            <button type="button" class="btn btn-success btn-sm" onclick="openExemptPracticalModal('${c.id}', '${escapeHtml(c.registrationNumber)}', '${escapeHtml(c.studentName)}', '${escapeHtml(c.schoolName || '')}')" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 6px 12px; font-size: 0.8rem; background: #16a34a; border-color: #16a34a; color: #fff;" title="Tandai Santri Bebas Tes Praktik (Lulus Otomatis)">
              <i class="fa-solid fa-user-check"></i> Bebas Praktik
            </button>
            <button onclick="closePracticalEvaluationModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; padding: 4px 8px;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <form id="practical-evaluation-form" onsubmit="handlePracticalScoreSubmit(event, '${c.id}')">

          <!-- ASPEK 1: BACA TULIS AL-QUR'AN (BTQ) -->
          <div style="background: var(--bg-body); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h4 style="font-size: 1.05rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                  <span style="width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">1</span>
                  Baca Tulis Al-Qur'an (BTQ)
                </h4>
                <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px; margin-left: 34px;">
                  Indikator: <em>Makharijul Huruf, Kelancaran/Tartil, Kaidah Tajwid, Mad, Waqaf & Penulisan.</em>
                </div>
              </div>
              <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">Skala Parameter 1 - 6</span>
            </div>

            <!-- 6 RADIO CARDS (BTQ) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; margin-bottom: 12px;">
              ${BTQ_SCORE_OPTIONS.map(opt => `
                <label class="practical-radio-card" style="display: block; cursor: pointer; border: 2px solid ${btqVal === opt.value ? '#0284c7' : 'var(--border-subtle)'}; background: ${btqVal === opt.value ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-card)'}; border-radius: var(--radius-md); padding: 10px; transition: all 0.2s ease;">
                  <input type="radio" name="btqScore" value="${opt.value}" ${btqVal === opt.value ? 'checked' : ''} onchange="updatePracticalCardStyle(this); calculateLiveAverage();" style="display: none;" required>
                  <div class="card-title" style="font-weight: 800; font-size: 0.84rem; color: ${btqVal === opt.value ? '#0284c7' : 'var(--text-heading)'}; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: ${opt.badge}; color: #fff; font-size: 0.7rem; text-align: center; line-height: 18px;">${opt.value}</span>
                    ${opt.label}
                  </div>
                  <ul style="margin: 4px 0 0 0; padding-left: 16px; font-size: 0.71rem; color: var(--text-muted); line-height: 1.35;">
                    ${opt.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}
                  </ul>
                </label>
              `).join('')}
            </div>

            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-dim); display: block; margin-bottom: 4px;">Catatan Khusus BTQ (Ayat yang diuji / Catatan Makhraj & Tajwid):</label>
              <input type="text" id="eval-btqNotes" class="form-control" placeholder="Contoh: Bacaan QS. Al-Baqarah 1-5 lancar, tartil, makhraj 'ain dan ha' tepat..." value="${escapeHtml(p.btqNotes || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            </div>
          </div>

          <!-- ASPEK 2: PRAKTIK WUDHU -->
          <div style="background: var(--bg-body); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h4 style="font-size: 1.05rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                  <span style="width: 26px; height: 26px; border-radius: 50%; background: #059669; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">2</span>
                  Praktik Wudhu
                </h4>
                <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px; margin-left: 34px;">
                  Indikator: <em>Niat, Urutan Rukun Wudhu (Tertib), Kesempurnaan Basuhan Anggota Wudhu, & Doa Setelah Wudhu.</em>
                </div>
              </div>
              <span class="badge" style="background: rgba(5, 150, 105, 0.12); color: #059669; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">Skala Parameter 1 - 3</span>
            </div>

            <!-- 3 RADIO CARDS (WUDHU) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;">
              ${WUDHU_SALAT_SCORE_OPTIONS.map(opt => `
                <label class="practical-radio-card" style="display: block; cursor: pointer; border: 2px solid ${wudhuVal === opt.value ? '#059669' : 'var(--border-subtle)'}; background: ${wudhuVal === opt.value ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-card)'}; border-radius: var(--radius-md); padding: 10px; transition: all 0.2s ease;">
                  <input type="radio" name="wudhuScore" value="${opt.value}" ${wudhuVal === opt.value ? 'checked' : ''} onchange="updatePracticalCardStyle(this); calculateLiveAverage();" style="display: none;" required>
                  <div class="card-title" style="font-weight: 800; font-size: 0.85rem; color: ${wudhuVal === opt.value ? '#059669' : 'var(--text-heading)'}; margin-bottom: 3px;">
                    ${opt.label}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.25;">
                    ${opt.desc}
                  </div>
                </label>
              `).join('')}
            </div>

            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-dim); display: block; margin-bottom: 4px;">Catatan Khusus Wudhu (Rukun, Tertib, & Basuhan):</label>
              <input type="text" id="eval-wudhuNotes" class="form-control" placeholder="Contoh: Rukun wudhu tertib, basuhan muka dan sela-sela jari sempurna, hafal doa setelah wudhu..." value="${escapeHtml(p.wudhuNotes || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            </div>
          </div>

          <!-- ASPEK 3: PRAKTIK SALAT -->
          <div style="background: var(--bg-body); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h4 style="font-size: 1.05rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                  <span style="width: 26px; height: 26px; border-radius: 50%; background: #7c3aed; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">3</span>
                  Praktik Salat (Gerakan & Bacaan)
                </h4>
                <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px; margin-left: 34px;">
                  Indikator: <em>Rukun Gerakan & Thuma'ninah, Bacaan Iftitah, Al-Fatihah, Doa Ruku'/Sujud, & Tasyahhud Akhir.</em>
                </div>
              </div>
              <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;">Skala Parameter 1 - 3</span>
            </div>

            <!-- 3 RADIO CARDS (SALAT) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;">
              ${WUDHU_SALAT_SCORE_OPTIONS.map(opt => `
                <label class="practical-radio-card" style="display: block; cursor: pointer; border: 2px solid ${salatVal === opt.value ? '#7c3aed' : 'var(--border-subtle)'}; background: ${salatVal === opt.value ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-card)'}; border-radius: var(--radius-md); padding: 10px; transition: all 0.2s ease;">
                  <input type="radio" name="salatScore" value="${opt.value}" ${salatVal === opt.value ? 'checked' : ''} onchange="updatePracticalCardStyle(this); calculateLiveAverage();" style="display: none;" required>
                  <div class="card-title" style="font-weight: 800; font-size: 0.85rem; color: ${salatVal === opt.value ? '#7c3aed' : 'var(--text-heading)'}; margin-bottom: 3px;">
                    ${opt.label}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.25;">
                    ${opt.desc}
                  </div>
                </label>
              `).join('')}
            </div>

            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-dim); display: block; margin-bottom: 4px;">Catatan Khusus Salat (Thuma'ninah, Gerakan, & Kelancaran Bacaan):</label>
              <input type="text" id="eval-salatNotes" class="form-control" placeholder="Contoh: Gerakan tertib thuma'ninah, bacaan tasyahhud lancar, ruku' dan sujud sempurna..." value="${escapeHtml(p.salatNotes || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.85rem;">
            </div>
          </div>

          <!-- EVALUASI UMUM & LIVE RERATA SKOR -->
          <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 24px; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-heading); display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-comment-dots" style="color: var(--primary-600);"></i> Evaluasi Keseluruhan & Rekomendasi Penguji:
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div id="live-avg-score-badge" style="font-size: 0.85rem; font-weight: 800; color: #059669; background: #dcfce7; padding: 4px 12px; border-radius: 20px; border: 1px solid #86efac;">
                  Rata-rata: <span id="live-avg-val">${p.totalScore ? Number(p.totalScore).toFixed(2) : '0.00'}</span> / 4.00
                </div>
                <div id="live-predicate-badge">
                  ${getPracticalPredicateBadge(p.totalScore)}
                </div>
              </div>
            </div>
            <textarea id="eval-generalNotes" rows="3" class="form-control" placeholder="Tuliskan catatan umum dan rekomendasi pembinaan santri (contoh: Santri memiliki dasar ibadah yang sangat baik dan siap mandiri di asrama)..." style="width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); font-size: 0.88rem;">${escapeHtml(p.generalNotes || '')}</textarea>
          </div>

          <!-- ACTIONS -->
          <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <button type="button" class="btn btn-secondary" onclick="closePracticalEvaluationModal()">Batal</button>
            <button type="submit" id="btn-save-practical-eval" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px;">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Nilai Tes Praktik
            </button>
          </div>
        </form>

      </div>
    `;

    calculateLiveAverage();
  } catch (err) {
    modal.innerHTML = `
      <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); text-align: center;">
        <div style="color: red; margin-bottom: 12px;">Error: ${escapeHtml(err.message)}</div>
        <button class="btn btn-secondary" onclick="closePracticalEvaluationModal()">Tutup</button>
      </div>
    `;
  }
}

function updatePracticalCardStyle(radioInput) {
  const groupName = radioInput.name;
  const cards = document.querySelectorAll(`input[name="${groupName}"]`);
  cards.forEach(input => {
    const parentLabel = input.closest('.practical-radio-card');
    if (!parentLabel) return;
    const titleEl = parentLabel.querySelector('.card-title') || parentLabel.querySelector('div');
    if (input.checked) {
      let themeColor = groupName === 'btqScore' ? '#0284c7' : groupName === 'wudhuScore' ? '#059669' : '#7c3aed';
      parentLabel.style.borderColor = themeColor;
      parentLabel.style.background = groupName === 'btqScore' ? 'rgba(2, 132, 199, 0.08)' : groupName === 'wudhuScore' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(124, 58, 237, 0.08)';
      if (titleEl) titleEl.style.color = themeColor;
    } else {
      parentLabel.style.borderColor = 'var(--border-subtle)';
      parentLabel.style.background = 'var(--bg-card)';
      if (titleEl) titleEl.style.color = 'var(--text-heading)';
    }
  });
}

function calculateLiveAverage() {
  const btq = document.querySelector('input[name="btqScore"]:checked')?.value;
  const wudhu = document.querySelector('input[name="wudhuScore"]:checked')?.value;
  const salat = document.querySelector('input[name="salatScore"]:checked')?.value;

  const badgeVal = document.getElementById('live-avg-val');
  const predBadge = document.getElementById('live-predicate-badge');
  if (!badgeVal) return;

  if (btq && wudhu && salat) {
    const avg = ((Number(btq) + Number(wudhu) + Number(salat)) / 3).toFixed(2);
    badgeVal.textContent = avg;
    if (predBadge) {
      predBadge.innerHTML = getPracticalPredicateBadge(avg);
    }
  } else {
    badgeVal.textContent = '0.00';
    if (predBadge) {
      predBadge.innerHTML = getPracticalPredicateBadge(null);
    }
  }
}

function closePracticalEvaluationModal() {
  const modal = document.getElementById('practical-eval-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function handlePracticalScoreSubmit(e, registrationId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-practical-eval');
  if (btn) btn.disabled = true;

  const btqScore = parseInt(document.querySelector('input[name="btqScore"]:checked')?.value || '0', 10);
  const wudhuScore = parseInt(document.querySelector('input[name="wudhuScore"]:checked')?.value || '0', 10);
  const salatScore = parseInt(document.querySelector('input[name="salatScore"]:checked')?.value || '0', 10);

  if (!btqScore || !wudhuScore || !salatScore) {
    showToast('Mohon pilih nilai untuk BTQ (skala 1-6), Wudhu (skala 1-3), dan Salat (skala 1-3).', 'warning');
    if (btn) btn.disabled = false;
    return;
  }

  const payload = {
    btqScore,
    btqNotes: document.getElementById('eval-btqNotes')?.value || '',
    wudhuScore,
    wudhuNotes: document.getElementById('eval-wudhuNotes')?.value || '',
    salatScore,
    salatNotes: document.getElementById('eval-salatNotes')?.value || '',
    generalNotes: document.getElementById('eval-generalNotes')?.value || '',
    status: 'COMPLETED',
  };

  try {
    const res = await apiRequest(`/api/practical-test/examiner/process/${registrationId}/assessment`, {
      method: 'POST',
      body: payload,
    });

    if (res && res.success) {
      showToast('Nilai tes praktik berhasil disimpan!', 'success');
      closePracticalEvaluationModal();
      if (currentExaminerScheduleId && document.getElementById('examiner-queue-table-container')) {
        renderExaminerScheduleQueue(currentExaminerScheduleId);
      } else if (window.location.hash.includes('practical-candidates') || window.location.hash.includes('penilaian-praktik')) {
        loadPracticalCandidatesData();
      } else if (activeManageScheduleId && document.getElementById('practical-participants-modal')?.style.display === 'flex') {
        renderScheduleParticipantsModalContent();
      } else if (window.location.hash.includes('practical-recap') || window.location.hash.includes('rekap-praktik')) {
        renderPracticalRecapView();
      } else if (window.location.hash.includes('practical-schedules') || window.location.hash.includes('practical-my-schedules')) {
        if (typeof renderExaminerMySchedules === 'function' && window.currentUserRole === 'PETUGAS_TES_PRAKTIK') {
          renderExaminerMySchedules();
        } else if (typeof loadPracticalSchedulesData === 'function') {
          loadPracticalSchedulesData();
        }
      } else {
        renderPracticalDashboardView();
      }
    } else {
      showToast(res.message || 'Gagal menyimpan nilai.', 'danger');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat menyimpan nilai.', 'danger');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================================
// 8. REKAPITULASI NILAI TES PRAKTIK
// ============================================================================
async function renderPracticalRecapView() {
  const container = document.getElementById('main-view-slot') || document.getElementById('app-main-content') || document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-file-lines" style="color: var(--primary-600);"></i>
          Rekapitulasi Nilai Tes Praktik Ibadah & Al-Qur'an
        </h2>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">
          Laporan rekapitulasi lengkap hasil uji Baca Tulis Al-Qur'an (BTQ), Wudhu, dan Salat.
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          <i class="fa-solid fa-print"></i> Cetak Rekap
        </button>
        <button class="btn btn-primary btn-sm" onclick="renderPracticalRecapView()">
          <i class="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </div>
    </div>

    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px;">
      <div id="practical-recap-table-wrap">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
          Memuat rekapitulasi data...
        </div>
      </div>
    </div>
  `;

  try {
    const res = await apiRequest('/api/practical-test/recap');
    const tableWrap = document.getElementById('practical-recap-table-wrap');
    if (!tableWrap) return;

    if (!res || !res.data || res.data.length === 0) {
      tableWrap.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Belum ada data nilai tes praktik yang terekam.</div>`;
      return;
    }

    tableWrap.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.78rem;">
              <th style="padding: 10px 8px;">NO</th>
              <th style="padding: 10px 8px;">NO. REG</th>
              <th style="padding: 10px 8px;">NAMA SANTRI</th>
              <th style="padding: 10px 8px;">SEKOLAH & JURUSAN</th>
              <th style="padding: 10px 8px; text-align: center;">BTQ</th>
              <th style="padding: 10px 8px; text-align: center;">WUDHU</th>
              <th style="padding: 10px 8px; text-align: center;">SALAT</th>
              <th style="padding: 10px 8px; text-align: center;">TOTAL RERATA</th>
              <th style="padding: 10px 8px; text-align: center;">PREDIKAT</th>
              <th style="padding: 10px 8px;">CATATAN EVALUASI</th>
              <th style="padding: 10px 8px;">PENGUJI</th>
              <th style="padding: 10px 8px;">TANGGAL UJI</th>
            </tr>
          </thead>
          <tbody>
            ${res.data.map((item, idx) => `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 10px 8px; color: var(--text-muted);">${idx + 1}</td>
                <td style="padding: 10px 8px;"><code>${escapeHtml(item.registrationNumber)}</code></td>
                <td style="padding: 10px 8px; font-weight: 600; color: var(--text-heading);">${escapeHtml(item.studentName)}</td>
                <td style="padding: 10px 8px;">${escapeHtml(item.schoolName)} - ${escapeHtml(item.className)}</td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 700;">${item.btqScore || '-'}</td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 700;">${item.wudhuScore || '-'}</td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 700;">${item.salatScore || '-'}</td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 800; color: #059669; font-size: 0.95rem;">
                  ${item.totalScore ? Number(item.totalScore).toFixed(2) : '-'}
                </td>
                <td style="padding: 10px 8px; text-align: center;">
                  ${getPracticalPredicateBadge(item.totalScore)}
                </td>
                <td style="padding: 10px 8px; max-width: 250px; font-size: 0.8rem; color: var(--text-dim);">${escapeHtml(item.generalNotes || item.btqNotes || item.wudhuNotes || item.salatNotes || '-')}</td>
                <td style="padding: 10px 8px; font-size: 0.8rem;">${escapeHtml(item.examinerName || '-')}</td>
                <td style="padding: 10px 8px; font-size: 0.78rem; color: var(--text-muted);">
                  ${item.testedAt ? new Date(item.testedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error loading practical recap:', err);
  }
}

// ============================================================================
// VERIFIKASI TES PRAKTIK (ADMIN VIEW & ACTIONS)
// ============================================================================

window.practicalVerificationState = {
  candidates: [],
  filtered: [],
  selectedCandidate: null,
};

async function renderPracticalVerificationView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: #0284c7;"></i>
      <p style="margin-top: 14px; font-weight: 700; font-size: 1.05rem;">Memuat Verifikasi Tes Praktik...</p>
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
              <i class="fa-solid fa-book-quran" style="color: #0284c7;"></i>
              Verifikasi Tes Praktik Calon Santri
            </h2>
            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
              Verifikasi kelulusan Baca Tulis Al-Qur'an (BTQ), Wudhu, dan Salat santri sebelum verifikasi final.
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="btn btn-success" onclick="openExemptPracticalModal()" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; background: #16a34a; border-color: #16a34a; color: #fff; padding: 8px 16px; border-radius: var(--radius-md, 8px);" title="Tandai Santri Bebas Tes Praktik (Dispensasi / Lulus Otomatis)">
              <i class="fa-solid fa-user-check"></i> + Bebas Tes Praktik
            </button>
            <button type="button" class="btn btn-outline-primary" onclick="printBlankPracticalForm()" style="border: 1px solid #0284c7; color: #0284c7; background: transparent; padding: 8px 16px; border-radius: var(--radius-md, 8px); font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;" title="Cetak Blangko Penilaian Praktik Kosong untuk Penguji">
              <i class="fa-solid fa-print"></i> Cetak Form Kosong
            </button>
            <a href="#practical-schedules" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 600;">
              <i class="fa-solid fa-calendar-week"></i> Jadwal Praktik
            </a>
            <button type="button" class="btn btn-secondary" onclick="renderPracticalVerificationView()" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
              <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Filter Card -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl, 14px); padding: 18px 22px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) 1.5fr; gap: 14px; align-items: flex-end;">
            
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Unit Sekolah</label>
              <select id="pv-filter-school" class="form-select" onchange="loadPracticalVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="">Semua Sekolah</option>
                ${structure.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Status Praktik</label>
              <select id="pv-filter-status" class="form-select" onchange="loadPracticalVerificationTable()" style="width: 100%; padding: 8px 10px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <option value="ALL">Semua Status</option>
                <option value="COMPLETED" selected>Selesai Dinilai</option>
                <option value="SCHEDULED">Terjadwal (Menunggu Ujian)</option>
                <option value="NOT_SCHEDULED">Belum Dijadwalkan</option>
              </select>
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; display: block;">Cari Peserta / No. Reg</label>
              <div style="position: relative;">
                <input type="text" id="pv-filter-search" class="form-control" placeholder="Ketik nama, no. registrasi, NISN..." onkeyup="if(event.key==='Enter') loadPracticalVerificationTable()" style="width: 100%; padding: 8px 34px 8px 12px; font-size: 0.85rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); cursor: pointer;" onclick="loadPracticalVerificationTable()"></i>
              </div>
            </div>

          </div>
        </div>

        <!-- Metric Stat Cards Slot -->
        <div id="pv-stats-slot" style="margin-bottom: 24px;"></div>

        <!-- Table Slot -->
        <div id="pv-table-slot">
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #0284c7;"></i>
            <p style="margin-top: 10px;">Mengambil antrean verifikasi...</p>
          </div>
        </div>

      </div>
    `;

    loadPracticalVerificationTable();
  } catch (err) {
    console.error('Error rendering practical verification view:', err);
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">Gagal memuat antrean verifikasi tes praktik: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadPracticalVerificationTable() {
  const slot = document.getElementById('pv-table-slot');
  const statsSlot = document.getElementById('pv-stats-slot');
  if (!slot) return;

  const schoolId = document.getElementById('pv-filter-school')?.value || '';
  const status = document.getElementById('pv-filter-status')?.value || 'ALL';
  const search = document.getElementById('pv-filter-search')?.value || '';

  slot.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #0284c7;"></i>
      <p style="margin-top: 10px;">Memuat data peserta...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams({ limit: '1000' });
    if (schoolId) params.append('schoolId', schoolId);
    if (status && status !== 'ALL') params.append('status', status);
    if (search.trim()) params.append('search', search.trim());

    const res = await apiRequest(`/api/practical-test/admin/candidates/ready?${params.toString()}`);
    const items = res.success ? (res.data || []) : [];
    window.practicalVerificationState.candidates = items;

    // Calculate metrics
    const totalCount = items.length;
    const completedCount = items.filter(i => i.practicalStatus === 'COMPLETED').length;
    const scheduledCount = items.filter(i => i.practicalStatus === 'SCHEDULED').length;
    const unscheduledCount = items.filter(i => !i.practicalStatus || i.practicalStatus === 'NOT_SCHEDULED').length;
    
    const validScores = items.filter(i => i.totalScore != null && !isNaN(i.totalScore)).map(i => Number(i.totalScore));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : '-';

    if (statsSlot) {
      statsSlot.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Calon Santri</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-heading); margin-top: 4px;">${totalCount}</div>
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">Terdaftar di sistem</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #86efac; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(34,197,94,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #15803d; text-transform: uppercase;">Selesai Dinilai</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #16a34a; margin-top: 4px;">${completedCount}</div>
            <div style="font-size: 0.72rem; color: #15803d; margin-top: 2px;">Nilai Praktik Lengkap</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #93c5fd; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(59,130,246,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Terjadwal (Menunggu)</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #2563eb; margin-top: 4px;">${scheduledCount}</div>
            <div style="font-size: 0.72rem; color: #1d4ed8; margin-top: 2px;">Masuk Sesi Pengujian</div>
          </div>
          <div class="card" style="background: var(--bg-card); border: 1px solid #fde68a; border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-sm); background: rgba(245,158,11,0.04);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Rata-rata Skor</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #d97706; margin-top: 4px;">${avgScore} <span style="font-size: 0.85rem; font-weight: 600;">/ 4.00</span></div>
            <div style="font-size: 0.72rem; color: #b45309; margin-top: 2px;">Skala BTQ, Wudhu, Salat</div>
          </div>
        </div>
      `;
    }

    if (items.length === 0) {
      slot.innerHTML = `
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 50px 20px; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-clipboard-check" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 12px;"></i>
          <h4 style="font-size: 1.1rem; color: var(--text-heading); margin-bottom: 6px;">Tidak ada data calon santri</h4>
          <p style="font-size: 0.85rem; margin: 0;">Silakan ubah filter pencarian atau pastikan peserta telah diverifikasi berkas.</p>
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
                <th style="padding: 12px 14px; text-align: center; width: 85px;">BTQ</th>
                <th style="padding: 12px 14px; text-align: center; width: 85px;">Wudhu</th>
                <th style="padding: 12px 14px; text-align: center; width: 85px;">Salat</th>
                <th style="padding: 12px 14px; text-align: center; width: 100px;">Nilai Akhir</th>
                <th style="padding: 12px 14px; min-width: 130px;">Penguji</th>
                <th style="padding: 12px 14px; text-align: center; width: 120px;">Status Praktik</th>
                <th style="padding: 12px 14px; text-align: center; min-width: 150px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => {
                const isCompleted = item.practicalStatus === 'COMPLETED';
                const scoreAvg = item.totalScore ? Number(item.totalScore).toFixed(2) : '-';
                
                return `
                  <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 14px; text-align: center; color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 700; color: var(--text-heading); font-size: 0.9rem;">${escapeHtml(item.studentName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                        <code>${escapeHtml(item.registrationNumber)}</code>
                        <span>•</span>
                        <span>${item.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</span>
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(item.schoolName)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(item.className || item.waveName || '-')}</div>
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${item.cbtScore != null 
                        ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:3px 8px; border-radius:6px;">${item.cbtScore}</span>`
                        : `<span style="color:var(--text-dim);">-</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${item.btqScore != null 
                        ? `<span class="badge" style="background:#0284c7; color:#fff; font-weight:800; padding:3px 8px; border-radius:6px;" title="Skala 1 - 4">${item.btqScore}</span>`
                        : `<span style="color:var(--text-dim);">-</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${item.wudhuScore != null 
                        ? `<span class="badge" style="background:#059669; color:#fff; font-weight:800; padding:3px 8px; border-radius:6px;" title="Skala 1 - 4">${item.wudhuScore}</span>`
                        : `<span style="color:var(--text-dim);">-</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${item.salatScore != null 
                        ? `<span class="badge" style="background:#10b981; color:#fff; font-weight:800; padding:3px 8px; border-radius:6px;" title="Skala 1 - 4">${item.salatScore}</span>`
                        : `<span style="color:var(--text-dim);">-</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <div style="font-weight: 800; font-size: 0.95rem; color: ${isCompleted ? '#059669' : 'var(--text-muted)'};">${scoreAvg}</div>
                      ${isCompleted ? `<div style="margin-top: 2px;">${getPracticalPredicateBadge(item.totalScore)}</div>` : ''}
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-heading);">${escapeHtml(item.examinerName || '-')}</div>
                      ${item.schedule ? `<div style="font-size: 0.72rem; color: var(--text-dim);">${escapeHtml(item.schedule.roomLocation || item.schedule.name || '')}</div>` : ''}
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      ${isCompleted
                        ? `<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-circle-check"></i> Selesai</span>`
                        : item.practicalStatus === 'SCHEDULED'
                        ? `<span class="badge" style="background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; font-weight:700; padding:4px 8px; border-radius:8px;"><i class="fa-solid fa-clock"></i> Terjadwal</span>`
                        : `<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:600; padding:4px 8px; border-radius:8px;">Belum Ujian</span>`
                      }
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="openPracticalVerifyModal('${item.id}')" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Verifikasi atau Koreksi Nilai">
                          <i class="fa-solid fa-pen-to-square"></i> Verifikasi
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printPracticalCandidateSheet('${item.id}')" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Cetak Lembar Uji / Nilai Santri">
                          <i class="fa-solid fa-print"></i> Cetak
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="openExemptPracticalModal('${item.id}', '${escapeHtml(item.registrationNumber)}', '${escapeHtml(item.studentName)}', '${escapeHtml(item.schoolName || '')}')" style="padding: 5px 10px; font-size: 0.78rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: #16a34a; border-color: #16a34a; color: #fff;" title="Tandai Santri Bebas Tes Praktik">
                          <i class="fa-solid fa-user-check"></i> Bebas Praktik
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
    console.error('Error loading practical verification table:', err);
    slot.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">Gagal memuat tabel: ${escapeHtml(err.message)}</div>`;
  }
}

async function openPracticalVerifyModal(registrationId) {
  try {
    const res = await apiRequest(`/api/practical-test/examiner/process/${registrationId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat rincian calon santri.');
    
    const d = res.data;
    const test = d.practicalTest || {};
    
    const existingBtq = test.btqScore || 3;
    const existingWudhu = test.wudhuScore || 3;
    const existingSalat = test.salatScore || 3;
    const existingNotes = test.generalNotes || '';

    const modalId = 'modal-practical-verify';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 650px; background: var(--bg-card); border-radius: var(--radius-xl, 14px); padding: 24px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-subtle);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-book-quran" style="color: #0284c7;"></i>
              Verifikasi Nilai Tes Praktik
            </h3>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">
              ${escapeHtml(d.studentName)} (${escapeHtml(d.registrationNumber)}) — ${escapeHtml(d.schoolName)}
            </p>
          </div>
          <button type="button" class="btn-close" onclick="closePracticalVerifyModal()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);">&times;</button>
        </div>

        <form id="form-practical-verify" onsubmit="submitPracticalVerify(event, '${registrationId}')">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 18px;">
            
            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
                1. BTQ (Skala 1 - 4)
              </label>
              <select id="pvm-btq" class="form-select" style="width: 100%; padding: 8px 10px; font-weight: 600; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
                <option value="1" ${existingBtq === 1 ? 'selected' : ''}>1: Level 1 (Iqro' 1)</option>
                <option value="2" ${existingBtq === 2 ? 'selected' : ''}>2: Level 2 (Iqro' 2-3)</option>
                <option value="3" ${existingBtq === 3 ? 'selected' : ''}>3: Level 3 (Iqro' 3-4)</option>
                <option value="4" ${existingBtq === 4 ? 'selected' : ''}>4: Level 4 (Tajwid Dasar)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
                2. Wudhu (Skala 1 - 4)
              </label>
              <select id="pvm-wudhu" class="form-select" style="width: 100%; padding: 8px 10px; font-weight: 600; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
                <option value="1" ${existingWudhu === 1 ? 'selected' : ''}>1: Belum Bisa</option>
                <option value="2" ${existingWudhu === 2 ? 'selected' : ''}>2: Bisa Dasar</option>
                <option value="3" ${existingWudhu === 3 ? 'selected' : ''}>3: Butuh Kontrol</option>
                <option value="4" ${existingWudhu === 4 ? 'selected' : ''}>4: Mandiri & Tertib</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
                3. Salat (Skala 1 - 4)
              </label>
              <select id="pvm-salat" class="form-select" style="width: 100%; padding: 8px 10px; font-weight: 600; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
                <option value="1" ${existingSalat === 1 ? 'selected' : ''}>1: Belum Bisa</option>
                <option value="2" ${existingSalat === 2 ? 'selected' : ''}>2: Bisa Dasar</option>
                <option value="3" ${existingSalat === 3 ? 'selected' : ''}>3: Butuh Kontrol</option>
                <option value="4" ${existingSalat === 4 ? 'selected' : ''}>4: Mandiri & Tertib</option>
              </select>
            </div>

          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
              Status Verifikasi Tes Praktik
            </label>
            <select id="pvm-status" class="form-select" style="width: 100%; padding: 8px 10px; font-weight: 600; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
              <option value="COMPLETED" selected>✔ Lulus / Selesai Dinilai</option>
              <option value="CANCELLED">✖ Perlu Ujian Ulang / Dibatalkan</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 22px;">
            <label class="form-label" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 6px;">
              Catatan Penguji / Verifikasi Admin
            </label>
            <textarea id="pvm-notes" class="form-control" rows="3" placeholder="Tuliskan catatan khusus terkait bacaan Al-Qur'an, wudhu, atau gerakan salat santri..." style="width: 100%; padding: 10px; font-size: 0.85rem; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">${escapeHtml(existingNotes)}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closePracticalVerifyModal()" style="font-weight: 600;">Batal</button>
            <button type="submit" id="btn-save-practical-verify" class="btn btn-primary" style="font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Verifikasi
            </button>
          </div>

        </form>

      </div>
    `;

    modal.style.display = 'flex';
  } catch (err) {
    alert(err.message || 'Gagal membuka form verifikasi tes praktik.');
  }
}

function closePracticalVerifyModal() {
  const modal = document.getElementById('modal-practical-verify');
  if (modal) modal.style.display = 'none';
}

async function submitPracticalVerify(e, registrationId) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-practical-verify');
  if (btn) btn.disabled = true;

  const btqScore = parseInt(document.getElementById('pvm-btq')?.value || '3', 10);
  const wudhuScore = parseInt(document.getElementById('pvm-wudhu')?.value || '3', 10);
  const salatScore = parseInt(document.getElementById('pvm-salat')?.value || '3', 10);
  const status = document.getElementById('pvm-status')?.value || 'COMPLETED';
  const generalNotes = document.getElementById('pvm-notes')?.value || '';

  try {
    const res = await apiRequest(`/api/practical-test/admin/verify/${registrationId}`, 'POST', {
      btqScore,
      wudhuScore,
      salatScore,
      status,
      generalNotes,
    });

    if (!res.success) throw new Error(res.message || 'Gagal menyimpan status verifikasi.');
    
    if (typeof showToast === 'function') showToast('Verifikasi tes praktik berhasil disimpan.', 'success');
    closePracticalVerifyModal();
    loadPracticalVerificationTable();
  } catch (err) {
    alert(err.message || 'Gagal menyimpan verifikasi tes praktik.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================================
// FITUR CETAK LEMBAR PENILAIAN TES PRAKTIK
// ============================================================================

async function printBlankPracticalForm() {
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

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Lembar Penilaian Tes Praktik Santri Baru (Blangko)</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 20px;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header-kop {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px double #1f2937;
          padding-bottom: 12px;
          margin-bottom: 16px;
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
          letter-spacing: 0.5px;
        }
        .kop-text h2 {
          font-size: 12pt;
          margin: 2px 0;
          color: #1e3a8a;
          font-weight: 700;
        }
        .kop-text p {
          font-size: 9pt;
          color: #4b5563;
          margin: 2px 0 0 0;
        }
        .doc-title {
          text-align: center;
          margin: 16px 0;
        }
        .doc-title h3 {
          font-size: 13pt;
          font-weight: 800;
          text-decoration: underline;
          margin: 0;
          text-transform: uppercase;
        }
        .doc-title p {
          font-size: 9.5pt;
          color: #4b5563;
          margin: 4px 0 0 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .meta-table td {
          padding: 4px 6px;
          font-size: 10pt;
        }
        .table-rubrik {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .table-rubrik th, .table-rubrik td {
          border: 1px solid #1f2937;
          padding: 6px 8px;
          font-size: 9.5pt;
        }
        .table-rubrik th {
          background: #f3f4f6;
          text-align: center;
          font-weight: 700;
        }
        .signature-box {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-col {
          text-align: center;
          width: 220px;
        }
        .sign-line {
          margin-top: 60px;
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
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background:#0284c7; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">
          🖨 Cetak Sekarang / Simpan PDF
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
        <h3>LEMBAR PENILAIAN TES PRAKTIK SANTRI BARU</h3>
        <p>Bidang Uji: Baca Tulis Al-Qur'an (BTQ), Gerakan & Bacaan Wudhu, Gerakan & Bacaan Salat</p>
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
          <td style="font-weight: 700;">Ruang / Lokasi</td>
          <td>: .....................................................</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Pilihan Jenjang/Sekolah</td>
          <td>: .....................................................</td>
          <td style="font-weight: 700;">Nama Penguji</td>
          <td>: .....................................................</td>
        </tr>
      </table>

      <table class="table-rubrik">
        <thead>
          <tr>
            <th style="width: 30px;">NO</th>
            <th style="width: 220px;">MATERI UJI PRAKTIK</th>
            <th>INDIKATOR & RUBRIK PENILAIAN</th>
            <th style="width: 90px;">SKOR (1 - 4)</th>
            <th style="width: 140px;">CATATAN PENGUJI</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: 700;">1</td>
            <td>
              <strong>Baca Tulis Al-Qur'an (BTQ)</strong><br>
              <small style="color: #4b5563;">Makharijul huruf, tajwid dasar, kelancaran membaca ayat.</small>
            </td>
            <td>
              • <strong>Level 1</strong>: Mengenal huruf hijaiyah berharakat (Iqro' 1)<br>
              • <strong>Level 2</strong>: Membaca huruf bersambung & panjang-pendek (Iqro' 2-3)<br>
              • <strong>Level 3</strong>: Mad thabi'i, sukun, tasydid, rangkaian ayat (Iqro' 3-4)<br>
              • <strong>Level 4</strong>: Tartil, fashahah, hukum nun/mim sukun (Iqro' 5 - Al-Qur'an)
            </td>
            <td style="text-align: center; vertical-align: middle; font-size: 13pt; font-weight: 800;">
              [ &nbsp; &nbsp; ]
            </td>
            <td></td>
          </tr>

          <tr>
            <td style="text-align: center; font-weight: 700;">2</td>
            <td>
              <strong>Praktik & Doa Wudhu</strong><br>
              <small style="color: #4b5563;">Rukun wudhu, urutan tertib, doa sesudah wudhu.</small>
            </td>
            <td>
              • <strong>Level 1</strong>: Belum bisa urutan wudhu secara benar.<br>
              • <strong>Level 2</strong>: Bisa wudhu dasar namun masih sering terlewat / tidak tertib.<br>
              • <strong>Level 3</strong>: Bisa wudhu dengan tertib, butuh sedikit pengawasan/koreksi doa.<br>
              • <strong>Level 4</strong>: Mampu wudhu sempurna, tertib, dan hafal doa sesudah wudhu.
            </td>
            <td style="text-align: center; vertical-align: middle; font-size: 13pt; font-weight: 800;">
              [ &nbsp; &nbsp; ]
            </td>
            <td></td>
          </tr>

          <tr>
            <td style="text-align: center; font-weight: 700;">3</td>
            <td>
              <strong>Praktik & Bacaan Salat</strong><br>
              <small style="color: #4b5563;">Gerakan salat, bacaan fatihah & rukun fi'li/qauli.</small>
            </td>
            <td>
              • <strong>Level 1</strong>: Belum hafal bacaan salat dan gerakan belum tepat.<br>
              • <strong>Level 2</strong>: Bisa gerakan dasar namun bacaan rukun belum lancar.<br>
              • <strong>Level 3</strong>: Gerakan dan bacaan cukup baik, butuh kontrol tuma'ninah.<br>
              • <strong>Level 4</strong>: Mampu secara mandiri, tuma'ninah, bacaan fashih dan istiqomah.
            </td>
            <td style="text-align: center; vertical-align: middle; font-size: 13pt; font-weight: 800;">
              [ &nbsp; &nbsp; ]
            </td>
            <td></td>
          </tr>

          <tr style="background: #f9fafb; font-weight: 700;">
            <td colspan="3" style="text-align: right; padding: 8px;">RATA-RATA SKOR AKHIR PRAKTIK :</td>
            <td style="text-align: center; font-size: 12pt;">[ &nbsp; &nbsp; ]</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div style="border: 1px solid #1f2937; padding: 10px; margin-bottom: 16px; border-radius: 4px;">
        <strong style="font-size: 9.5pt;">CATATAN UMUM & REKOMENDASI PEMBINAAN PENGUJI:</strong>
        <div style="height: 50px;"></div>
      </div>

      <div class="signature-box">
        <div class="sign-col">
          <div>Mengetahui,</div>
          <div style="font-weight: 700;">Koordinator Penguji Praktik</div>
          <div class="sign-line">( .................................................... )</div>
        </div>
        <div class="sign-col">
          <div>Dukun Gresik, ......................... 2026</div>
          <div style="font-weight: 700;">Ustadz Penguji,</div>
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
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak blangko tes praktik.');
  }
}

async function printPracticalResult(registrationId) {
  let appSettings = window.appSettings || {};
  let candidateData = null;

  try {
    const [res, sRes] = await Promise.all([
      apiRequest(`/api/practical-test/examiner/process/${registrationId}`),
      apiRequest('/api/settings').catch(() => ({ success: false })),
    ]);

    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat rincian santri.');
    candidateData = res.data;
    if (sRes && sRes.success && sRes.data) appSettings = sRes.data;
  } catch (err) {
    alert(err.message || 'Gagal memuat data lembar hasil tes praktik.');
    return;
  }

  const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
  const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
    ? rawLogo
    : `/static/img/${rawLogo}`;
  const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

  const test = candidateData.practicalTest || {};
  const btq = test.btqScore || '-';
  const wudhu = test.wudhuScore || '-';
  const salat = test.salatScore || '-';
  const avg = test.totalScore ? Number(test.totalScore).toFixed(2) : '-';
  const examiner = test.examinerName || candidateData.scheduleInfo?.examinerName || 'Ustadz Penguji';
  const notes = test.generalNotes || test.btqNotes || 'Telah menyelesaikan pengujian praktik dengan baik.';
  const testDate = test.testedAt 
    ? new Date(test.testedAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let predicateText = 'Belum Dinilai';
  if (test.totalScore) {
    const s = Number(test.totalScore);
    if (s >= 3.5) predicateText = 'MAMPU SECARA MANDIRI & ISTIQOMAH';
    else if (s >= 2.5) predicateText = 'BAIK (BUTUH KONTROL & BIMBINGAN)';
    else if (s >= 1.75) predicateText = 'CUKUP (PERLU PEMBINAAN INTENSIF)';
    else predicateText = 'PERLU PEMBINAAN KHUSUS / MATRIKULASI';
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Hasil Penilaian Tes Praktik - ${escapeHtml(candidateData.studentName)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 20px;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header-kop {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px double #1f2937;
          padding-bottom: 12px;
          margin-bottom: 16px;
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
          font-size: 9pt;
          color: #4b5563;
          margin: 2px 0 0 0;
        }
        .doc-title {
          text-align: center;
          margin: 16px 0;
        }
        .doc-title h3 {
          font-size: 13pt;
          font-weight: 800;
          text-decoration: underline;
          margin: 0;
          text-transform: uppercase;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .meta-table td {
          padding: 4px 6px;
          font-size: 10pt;
        }
        .table-rubrik {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .table-rubrik th, .table-rubrik td {
          border: 1px solid #1f2937;
          padding: 8px 10px;
          font-size: 10pt;
        }
        .table-rubrik th {
          background: #f3f4f6;
          text-align: center;
          font-weight: 700;
        }
        .signature-box {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-col {
          text-align: center;
          width: 220px;
        }
        .sign-line {
          margin-top: 60px;
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
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background:#0284c7; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">
          🖨 Cetak / Simpan PDF
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
        <h3>LEMBAR HASIL PENILAIAN TES PRAKTIK SANTRI</h3>
        <p>No. Registrasi: <strong>${escapeHtml(candidateData.registrationNumber)}</strong></p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 20%; font-weight: 700;">Nama Lengkap</td>
          <td style="width: 35%;">: <strong>${escapeHtml(candidateData.studentName)}</strong></td>
          <td style="width: 20%; font-weight: 700;">Hari / Tanggal Uji</td>
          <td style="width: 25%;">: ${testDate}</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Pilihan Jenjang</td>
          <td>: ${escapeHtml(candidateData.schoolName)}</td>
          <td style="font-weight: 700;">Asal Sekolah</td>
          <td>: ${escapeHtml(candidateData.participant?.originSchool || candidateData.studentDetail?.previousSchoolName || '-')}</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Jenis Kelamin</td>
          <td>: ${candidateData.gender === 'P' ? 'Perempuan (Akhwat)' : 'Laki-laki (Ikhwan)'}</td>
          <td style="font-weight: 700;">Penguji Praktik</td>
          <td>: ${escapeHtml(examiner)}</td>
        </tr>
      </table>

      <table class="table-rubrik">
        <thead>
          <tr>
            <th style="width: 40px;">NO</th>
            <th>ASPEK PENILAIAN PRAKTIK</th>
            <th style="width: 120px;">SKOR (1 - 4)</th>
            <th>KETERANGAN / INDIKATOR CAPAIAN</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: 700;">1</td>
            <td><strong>Baca Tulis Al-Qur'an (BTQ)</strong></td>
            <td style="text-align: center; font-size: 12pt; font-weight: 800; color: #0284c7;">${btq}</td>
            <td>${escapeHtml(test.btqNotes || (btq >= 4 ? 'Level 4 (Tajwid & Makhraj Baik)' : btq >= 3 ? 'Level 3 (Iqro 3-4)' : btq >= 2 ? 'Level 2 (Iqro 2)' : 'Level 1 (Iqro 1)'))}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: 700;">2</td>
            <td><strong>Gerakan & Doa Wudhu</strong></td>
            <td style="text-align: center; font-size: 12pt; font-weight: 800; color: #059669;">${wudhu}</td>
            <td>${escapeHtml(test.wudhuNotes || (wudhu >= 4 ? 'Mandiri, tertib & hafal doa' : wudhu >= 3 ? 'Bisa tertib, butuh kontrol' : 'Perlu bimbingan rukun wudhu'))}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: 700;">3</td>
            <td><strong>Gerakan & Bacaan Salat</strong></td>
            <td style="text-align: center; font-size: 12pt; font-weight: 800; color: #10b981;">${salat}</td>
            <td>${escapeHtml(test.salatNotes || (salat >= 4 ? 'Mandiri, tuma\'ninah & fashih' : salat >= 3 ? 'Baik, butuh kontrol istiqomah' : 'Perlu pembinaan gerakan & bacaan'))}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: 800;">
            <td colspan="2" style="text-align: right; padding: 10px;">RATA-RATA NILAI PRAKTIK :</td>
            <td style="text-align: center; font-size: 14pt; color: #059669;">${avg}</td>
            <td style="color: #0369a1;">${predicateText}</td>
          </tr>
        </tbody>
      </table>

      <div style="border: 1px solid #1f2937; padding: 12px; margin-bottom: 20px; border-radius: 4px; background: #fafafa;">
        <strong style="font-size: 10pt; display: block; margin-bottom: 4px;">CATATAN & REKOMENDASI PENGUJI:</strong>
        <p style="margin: 0; font-size: 9.5pt; color: #374151;">${escapeHtml(notes)}</p>
      </div>

      <div class="signature-box">
        <div class="sign-col">
          <div>Mengetahui,</div>
          <div style="font-weight: 700;">Ketua Panitia PSB</div>
          <div class="sign-line">( .................................................... )</div>
        </div>
        <div class="sign-col">
          <div>Dukun Gresik, ${testDate}</div>
          <div style="font-weight: 700;">Ustadz Penguji Praktik,</div>
          <div class="sign-line">${escapeHtml(examiner)}</div>
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
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak lembar hasil tes praktik.');
  }
}

window.renderPracticalVerificationView = renderPracticalVerificationView;
window.loadPracticalVerificationTable = loadPracticalVerificationTable;
window.openPracticalVerifyModal = openPracticalVerifyModal;
window.closePracticalVerifyModal = closePracticalVerifyModal;
window.submitPracticalVerify = submitPracticalVerify;
window.printBlankPracticalForm = printBlankPracticalForm;
window.printPracticalResult = printPracticalResult;

// ============================================================================
// LEMBAR EVALUASI & PENILAIAN TES PRAKTIK (PRINT & DOWNLOAD PDF UNTUK PENGUJI)
// ============================================================================
async function printPracticalCandidateSheet(candidateId, downloadPdf = false) {
  let appSettings = window.appSettings || {};
  let c = null;

  try {
    const [res, sRes] = await Promise.all([
      apiRequest(`/api/practical-test/candidates/${candidateId}`),
      apiRequest('/api/settings').catch(() => ({ success: false })),
    ]);

    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat rincian santri.');
    c = res.data;
    if (sRes && sRes.success && sRes.data) appSettings = sRes.data;
  } catch (err) {
    if (typeof showToast === 'function') showToast(err.message || 'Gagal memuat data lembar penilaian.', 'danger');
    else alert(err.message || 'Gagal memuat data lembar penilaian.');
    return;
  }

  const rawLogo = appSettings.application_logo || 'logo_e7a8b6a95d.webp';
  const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
    ? rawLogo
    : `/static/img/${rawLogo}`;
  const appName = appSettings.application_name || 'Pondok Pesantren Maskumambang';

  const p = c.practicalTest || {};
  const btqVal = p.btqScore || null;
  const wudhuVal = p.wudhuScore || null;
  const salatVal = p.salatScore || null;
  const avg = p.totalScore ? Number(p.totalScore).toFixed(2) : (btqVal && wudhuVal && salatVal ? ((btqVal + wudhuVal + salatVal) / 3).toFixed(2) : '-');
  const examinerName = p.examinerName || (p.examiner?.name) || '...........................................';
  const testDate = p.testedAt 
    ? new Date(p.testedAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '...........................................';

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Lembar Penilaian Tes Praktik - ${escapeHtml(c.studentName)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          margin: 0;
          padding: 18px 24px;
          font-size: 10pt;
          line-height: 1.35;
        }
        .no-print {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-print {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .header-kop {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px double #1f2937;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .header-kop img {
          width: 65px;
          height: 65px;
          object-fit: contain;
        }
        .kop-text h1 {
          font-size: 14pt;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .kop-text h2 {
          font-size: 11.5pt;
          margin: 2px 0;
          color: #1e3a8a;
          font-weight: 700;
        }
        .kop-text p {
          font-size: 8.5pt;
          color: #4b5563;
          margin: 1px 0 0 0;
        }
        .doc-title {
          text-align: center;
          margin: 8px 0 12px 0;
        }
        .doc-title h3 {
          font-size: 12pt;
          font-weight: 800;
          text-decoration: underline;
          margin: 0;
          text-transform: uppercase;
        }
        .doc-title p {
          font-size: 8.5pt;
          color: #4b5563;
          margin: 2px 0 0 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .meta-table td {
          padding: 5px 8px;
          font-size: 9pt;
        }
        .section-header {
          background: #1e3a8a;
          color: #ffffff;
          padding: 4px 10px;
          font-weight: 700;
          font-size: 9.5pt;
          margin: 10px 0 6px 0;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }
        .card-opt {
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 8.5pt;
          background: #ffffff;
        }
        .card-opt.selected {
          border-color: #0284c7;
          background: #f0f9ff;
          font-weight: bold;
        }
        .card-opt-title {
          font-weight: 800;
          font-size: 8.5pt;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .circle-check {
          display: inline-block;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 1.5px solid #1e293b;
          text-align: center;
          line-height: 14px;
          font-size: 8pt;
          font-weight: bold;
        }
        .circle-check.checked {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
        }
        .notes-area {
          border: 1px dashed #9ca3af;
          border-radius: 4px;
          padding: 6px 8px;
          min-height: 38px;
          font-size: 8.5pt;
          margin-top: 4px;
          background-image: repeating-linear-gradient(transparent, transparent 18px, #e5e7eb 19px);
          line-height: 19px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .summary-table th, .summary-table td {
          border: 1px solid #1f2937;
          padding: 5px 8px;
          text-align: center;
          font-size: 9pt;
        }
        .summary-table th {
          background: #f3f4f6;
          font-weight: 700;
        }
        .signature-box {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-col {
          text-align: center;
          width: 210px;
          font-size: 9pt;
        }
        .sign-line {
          margin-top: 45px;
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

      <div class="no-print">
        <div style="font-size: 0.85rem; color: #475569;">
          <strong>Mode Lembar Evaluasi Santri:</strong> Dibawa penguji ke ruang tes atau diarsipkan setelah penilaian.
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-print" onclick="window.print()" style="background:#0284c7; color:#fff;">
            🖨 Cetak Sekarang
          </button>
          <button class="btn-print" onclick="window.print()" style="background:#16a34a; color:#fff;">
            📥 Simpan / Download PDF
          </button>
        </div>
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
        <h3>LEMBAR EVALUASI & PENILAIAN TES PRAKTIK</h3>
        <p>Instrumen Pengujian: Baca Tulis Al-Qur'an (BTQ), Praktik Wudhu & Salat Calon Santri</p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 18%; font-weight: 700;">No. Registrasi</td>
          <td style="width: 32%;">: <strong>${escapeHtml(c.registrationNumber)}</strong></td>
          <td style="width: 18%; font-weight: 700;">Hari / Tanggal</td>
          <td style="width: 32%;">: ${testDate}</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Nama Calon Santri</td>
          <td>: <strong>${escapeHtml(c.studentName)}</strong></td>
          <td style="font-weight: 700;">Pilihan Sekolah</td>
          <td>: ${escapeHtml(c.schoolName)} (${escapeHtml(c.className || '-')})</td>
        </tr>
        <tr>
          <td style="font-weight: 700;">Jenis Kelamin</td>
          <td>: ${c.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</td>
          <td style="font-weight: 700;">Penguji Praktik</td>
          <td>: ${escapeHtml(examinerName)}</td>
        </tr>
      </table>

      <!-- 1. BTQ -->
      <div class="section-header">
        <span>1. BACA TULIS AL-QUR'AN (BTQ)</span>
        <span style="font-size: 8pt; font-weight: normal; opacity: 0.9;">Skala Parameter Level 1 - 6</span>
      </div>
      <div class="grid-cards">
        ${BTQ_SCORE_OPTIONS.map(opt => `
          <div class="card-opt ${btqVal === opt.value ? 'selected' : ''}">
            <div class="card-opt-title">
              <span class="circle-check ${btqVal === opt.value ? 'checked' : ''}">${btqVal === opt.value ? '✓' : opt.value}</span>
              ${escapeHtml(opt.label)}
            </div>
            <div style="font-size: 7.5pt; color: #4b5563; line-height: 1.25;">
              ${opt.items.slice(0, 2).map(it => `• ${escapeHtml(it)}`).join('<br>')}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="font-size: 8pt; font-weight: 700; color: #1e293b; margin-top: 4px;">Catatan Khusus BTQ (Ayat / Makhraj / Tajwid):</div>
      <div class="notes-area">${escapeHtml(p.btqNotes || '')}</div>

      <!-- 2. WUDHU -->
      <div class="section-header" style="background: #047857;">
        <span>2. PRAKTIK GERAKAN & BACAAN WUDHU</span>
        <span style="font-size: 8pt; font-weight: normal; opacity: 0.9;">Skala Parameter Level 1 - 3</span>
      </div>
      <div class="grid-cards" style="grid-template-columns: repeat(3, 1fr);">
        <div class="card-opt ${wudhuVal === 1 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${wudhuVal === 1 ? 'checked' : ''}">${wudhuVal === 1 ? '✓' : '1'}</span> Level 1: Belum Bisa</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Belum menguasai tata cara, rukun, gerakan, atau bacaan wudhu.</div>
        </div>
        <div class="card-opt ${wudhuVal === 2 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${wudhuVal === 2 ? 'checked' : ''}">${wudhuVal === 2 ? '✓' : '2'}</span> Level 2: Bisa, Perlu Bimbingan</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Bisa berwudhu namun ada gerakan atau doa yang terlewat/perlu kontrol.</div>
        </div>
        <div class="card-opt ${wudhuVal === 3 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${wudhuVal === 3 ? 'checked' : ''}">${wudhuVal === 3 ? '✓' : '3'}</span> Level 3: Mandiri & Tertib</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Menguasai rukun, tertib, membasuh sempurna dan hafal doa setelah wudhu.</div>
        </div>
      </div>
      <div style="font-size: 8pt; font-weight: 700; color: #1e293b; margin-top: 4px;">Catatan Khusus Wudhu:</div>
      <div class="notes-area">${escapeHtml(p.wudhuNotes || '')}</div>

      <!-- 3. SALAT -->
      <div class="section-header" style="background: #059669;">
        <span>3. PRAKTIK GERAKAN & BACAAN SALAT</span>
        <span style="font-size: 8pt; font-weight: normal; opacity: 0.9;">Skala Parameter Level 1 - 3</span>
      </div>
      <div class="grid-cards" style="grid-template-columns: repeat(3, 1fr);">
        <div class="card-opt ${salatVal === 1 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${salatVal === 1 ? 'checked' : ''}">${salatVal === 1 ? '✓' : '1'}</span> Level 1: Belum Bisa</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Belum hafal bacaan rukun salat atau gerakan belum teratur.</div>
        </div>
        <div class="card-opt ${salatVal === 2 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${salatVal === 2 ? 'checked' : ''}">${salatVal === 2 ? '✓' : '2'}</span> Level 2: Bisa, Perlu Kontrol</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Bisa melakukan salat, tasyahud/iftitah masih perlu perbaikan.</div>
        </div>
        <div class="card-opt ${salatVal === 3 ? 'selected' : ''}">
          <div class="card-opt-title"><span class="circle-check ${salatVal === 3 ? 'checked' : ''}">${salatVal === 3 ? '✓' : '3'}</span> Level 3: Tertib, Khusyuk & Mandiri</div>
          <div style="font-size: 7.5pt; color: #4b5563;">Gerakan tuma'ninah, bacaan fasih, tertib, dan menguasai rukun salat.</div>
        </div>
      </div>
      <div style="font-size: 8pt; font-weight: 700; color: #1e293b; margin-top: 4px;">Catatan Khusus Salat:</div>
      <div class="notes-area">${escapeHtml(p.salatNotes || '')}</div>

      <!-- REKAPITULASI NILAI -->
      <table class="summary-table">
        <thead>
          <tr>
            <th>SKOR BTQ (1-6)</th>
            <th>SKOR WUDHU (1-3)</th>
            <th>SKOR SALAT (1-3)</th>
            <th>RERATA NILAI AKHIR</th>
            <th>STATUS KELULUSAN</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 800; font-size: 11pt; color: #0284c7;">${btqVal || '-'}</td>
            <td style="font-weight: 800; font-size: 11pt; color: #047857;">${wudhuVal || '-'}</td>
            <td style="font-weight: 800; font-size: 11pt; color: #059669;">${salatVal || '-'}</td>
            <td style="font-weight: 800; font-size: 11pt; color: #1e3a8a;">${avg}</td>
            <td style="font-weight: 700;">${p.status === 'COMPLETED' ? 'LULUS / SELESAI' : 'MENUNGGU PENGUJIAN'}</td>
          </tr>
        </tbody>
      </table>

      ${p.generalNotes ? `
        <div style="margin-top: 6px; font-size: 8.5pt; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px; background: #f8fafc;">
          <strong>Catatan Umum Penguji:</strong> ${escapeHtml(p.generalNotes)}
        </div>
      ` : ''}

      <div class="signature-box">
        <div class="sign-col">
          <div>Mengetahui,</div>
          <div style="font-weight: 700;">Ketua Panitia PSB</div>
          <div class="sign-line">( .................................................... )</div>
        </div>
        <div class="sign-col">
          <div>Dukun Gresik, ${testDate}</div>
          <div style="font-weight: 700;">Ustadz Penguji Praktik,</div>
          <div class="sign-line">( ${escapeHtml(examinerName)} )</div>
        </div>
      </div>

      ${downloadPdf ? `
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      ` : ''}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=920,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    alert('Pop-up browser diblokir. Harap izinkan pop-up untuk mencetak lembar penilaian.');
  }
}

// ============================================================================
// BEBAS TES PRAKTIK (EXEMPTION & DIRECT APPROVAL)
// ============================================================================
let exemptPracticalSearchTimer = null;

function openExemptPracticalModal(prefillRegId = '', prefillRegNum = '', prefillName = '', prefillSchool = '') {
  const isPrefilled = !!prefillRegId;
  const safeName = escapeHtml(prefillName || '');
  const safeRegNum = escapeHtml(prefillRegNum || '');
  const safeSchool = escapeHtml(prefillSchool || '');

  const bodyHtml = `
    <form onsubmit="handleConfirmExemptPractical(event)">
      <div style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-main); line-height: 1.5;">
          Fitur ini digunakan jika calon santri dibebaskan dari <strong>Tes Praktik (BTQ, Wudhu, Salat)</strong>, misalnya santri berprestasi tahfidz, jalur mandiri, atau telah lulus tes offline tersendiri.
        </p>
      </div>

      <!-- Candidate Selection -->
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 6px; display: block;">
          Calon Santri:
        </label>
        
        ${isPrefilled ? `
          <input type="hidden" id="exempt-practical-reg-id" value="${escapeHtml(prefillRegId)}">
          <div style="padding: 12px 14px; background: rgba(2, 132, 199, 0.08); border: 1.5px solid #0284c7; border-radius: var(--radius-md, 8px); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">${safeName}</div>
              <div style="font-size: 0.8rem; color: #0284c7; font-weight: 600; margin-top: 2px;">
                No. Registrasi: <code>${safeRegNum}</code> ${safeSchool ? `&bull; ${safeSchool}` : ''}
              </div>
            </div>
            <span class="badge" style="background: #0284c7; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">Terpilih</span>
          </div>
        ` : `
          <div style="position: relative;">
            <input type="hidden" id="exempt-practical-reg-id" value="">
            <input type="text" id="exempt-practical-search-input" class="form-control" placeholder="Cari nama santri atau no. registrasi..." oninput="handleExemptPracticalCandidateSearch(this.value)" autocomplete="off" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md, 8px); font-size: 0.85rem;">
            <div id="exempt-practical-candidate-results" style="display: none; position: absolute; left: 0; right: 0; top: 100%; z-index: 1050; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); max-height: 220px; overflow-y: auto; box-shadow: var(--shadow-lg); margin-top: 4px;"></div>
          </div>
          <div id="exempt-practical-selected-box" style="display: none; margin-top: 10px; padding: 12px 14px; background: rgba(2, 132, 199, 0.08); border: 1.5px solid #0284c7; border-radius: var(--radius-md, 8px);">
          </div>
        `}
      </div>

      <!-- Nilai Praktik Default / Pilihan -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; display: block;">Nilai BTQ:</label>
          <select id="exempt-practical-btq" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md, 8px);">
            <option value="6" selected>Level 6 (Mahir Al-Qur'an)</option>
            <option value="5">Level 5 (Tajwid Lanjutan)</option>
            <option value="4">Level 4 (Tajwid Dasar)</option>
            <option value="3">Level 3 (Iqro' 3-4)</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; display: block;">Nilai Wudhu:</label>
          <select id="exempt-practical-wudhu" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md, 8px);">
            <option value="3" selected>Level 3 (Tertib & Rukun)</option>
            <option value="2">Level 2 (Bisa)</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; display: block;">Nilai Salat:</label>
          <select id="exempt-practical-salat" class="form-select" style="width: 100%; padding: 7px 10px; font-size: 0.82rem; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md, 8px);">
            <option value="3" selected>Level 3 (Khusyuk & Tertib)</option>
            <option value="2">Level 2 (Bisa)</option>
          </select>
        </div>
      </div>

      <!-- Keterangan / Alasan Bebas Praktik -->
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Keterangan / Alasan Dispensasi:</span>
          <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">(Disimpan di riwayat)</span>
        </label>
        <textarea id="exempt-practical-notes" class="form-control" rows="2" placeholder="Contoh: Bebas Tes Praktik / Santri Prestasi Tahfidz Al-Qur'an / Ujian Mandiri" style="width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md, 8px); font-size: 0.85rem;">Bebas Tes Praktik (Jalur Mandiri / Prestasi)</textarea>
      </div>

      <div style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; font-size: 0.8rem; color: #15803d;">
        <i class="fa-solid fa-circle-check"></i> Status Tes Praktik santri akan langsung <strong>LULUS (COMPLETED)</strong> dan tercatat telah selesai dinilai.
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" id="btn-confirm-exempt-practical" class="btn btn-success" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; background: #16a34a; border-color: #16a34a; color: #fff;">
          <i class="fa-solid fa-check-double"></i> Simpan & Luluskan Praktik
        </button>
      </div>
    </form>
  `;

  if (typeof openModal === 'function') {
    openModal('Tandai Bebas Tes Praktik', bodyHtml);
  }
}

function handleExemptPracticalCandidateSearch(searchTerm) {
  clearTimeout(exemptPracticalSearchTimer);
  const resultsDiv = document.getElementById('exempt-practical-candidate-results');
  if (!resultsDiv) return;

  const term = searchTerm?.trim();
  if (!term || term.length < 2) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
    return;
  }

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari santri...</div>';

  exemptPracticalSearchTimer = setTimeout(async () => {
    try {
      let res;
      try {
        res = await apiRequest(`/api/practical-test/admin/candidates/ready?search=${encodeURIComponent(term)}&limit=15`);
      } catch (e1) {
        res = await apiRequest(`/api/practical-test/ready-candidates?search=${encodeURIComponent(term)}&limit=15`);
      }
      const candidates = (res && res.success) ? (Array.isArray(res.data) ? res.data : (res.data?.items || res.items || [])) : [];
      if (!Array.isArray(candidates) || candidates.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Tidak ditemukan calon santri dengan kata kunci tersebut.</div>';
        return;
      }

      resultsDiv.innerHTML = candidates.map(c => {
        const regId = c.id || c.registrationId;
        const regNum = c.registrationNumber || '';
        const name = c.studentName || c.participantName || c.candidateName || c.name || c.fullName || (c.studentDetail?.fullName) || (c.individualParticipant?.fullName) || (c.user?.name) || 'Calon Santri';
        const schoolProg = `${c.schoolName || ''} ${(c.className || c.programName) ? '• ' + (c.className || c.programName) : ''}`;
        const isDone = c.practicalStatus === 'COMPLETED';

        return `
          <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.2s;" 
               onmouseover="this.style.background='var(--bg-body)'" 
               onmouseout="this.style.background='transparent'" 
               onclick="selectExemptPracticalCandidate('${regId}', '${escapeHtml(regNum)}', '${escapeHtml(name)}', '${escapeHtml(schoolProg)}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 700; color: var(--text-heading); font-size: 0.875rem;">${escapeHtml(name)}</div>
              ${isDone ? '<span class="badge" style="background:#dcfce7; color:#15803d; font-size: 0.68rem; font-weight:700;">Lulus Praktik</span>' : '<span class="badge" style="background:#f1f5f9; color:#64748b; font-size: 0.68rem;">Belum Ujian</span>'}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              <code>${escapeHtml(regNum)}</code> &bull; ${escapeHtml(schoolProg)}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      resultsDiv.innerHTML = `<div style="padding: 12px; color: #dc2626; font-size: 0.8rem;">${escapeHtml(err.message)}</div>`;
    }
  }, 300);
}

function selectExemptPracticalCandidate(regId, regNum, name, schoolProgram) {
  const hiddenInput = document.getElementById('exempt-practical-reg-id');
  const resultsDiv = document.getElementById('exempt-practical-candidate-results');
  const searchInput = document.getElementById('exempt-practical-search-input');
  const selectedBox = document.getElementById('exempt-practical-selected-box');

  if (hiddenInput) hiddenInput.value = regId;
  if (resultsDiv) resultsDiv.style.display = 'none';
  if (searchInput) searchInput.style.display = 'none';

  if (selectedBox) {
    selectedBox.style.display = 'flex';
    selectedBox.style.justifyContent = 'space-between';
    selectedBox.style.alignItems = 'center';
    selectedBox.innerHTML = `
      <div>
        <div style="font-weight: 800; color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(name)}</div>
        <div style="font-size: 0.8rem; color: #0284c7; font-weight: 600; margin-top: 2px;">
          No. Registrasi: <code>${escapeHtml(regNum)}</code> ${schoolProgram ? `&bull; ${escapeHtml(schoolProgram)}` : ''}
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="resetExemptPracticalCandidateSelection()" style="padding: 4px 8px; font-size: 0.75rem;">
        Ganti
      </button>
    `;
  }
}

function resetExemptPracticalCandidateSelection() {
  const hiddenInput = document.getElementById('exempt-practical-reg-id');
  const searchInput = document.getElementById('exempt-practical-search-input');
  const selectedBox = document.getElementById('exempt-practical-selected-box');

  if (hiddenInput) hiddenInput.value = '';
  if (selectedBox) selectedBox.style.display = 'none';
  if (searchInput) {
    searchInput.style.display = 'block';
    searchInput.value = '';
    searchInput.focus();
  }
}

async function handleConfirmExemptPractical(e) {
  e.preventDefault();
  const regId = document.getElementById('exempt-practical-reg-id')?.value;
  if (!regId) {
    if (typeof showToast === 'function') showToast('Pilih calon santri terlebih dahulu.', 'warning');
    else alert('Pilih calon santri terlebih dahulu.');
    return;
  }
  const btq = parseInt(document.getElementById('exempt-practical-btq')?.value || '6', 10);
  const wudhu = parseInt(document.getElementById('exempt-practical-wudhu')?.value || '3', 10);
  const salat = parseInt(document.getElementById('exempt-practical-salat')?.value || '3', 10);
  const notes = document.getElementById('exempt-practical-notes')?.value?.trim() || 'Bebas Tes Praktik (Jalur Mandiri / Prestasi)';

  const btn = document.getElementById('btn-confirm-exempt-practical');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  try {
    const res = await apiRequest(`/api/practical-test/admin/verify/${regId}`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'COMPLETED',
        generalNotes: notes,
        btqScore: btq,
        btqNotes: notes,
        wudhuScore: wudhu,
        wudhuNotes: notes,
        salatScore: salat,
        salatNotes: notes
      })
    });

    if (!res.success) throw new Error(res.message || 'Gagal menyimpan status bebas tes praktik.');

    if (typeof showToast === 'function') {
      showToast(res.message || 'Santri berhasil diverifikasi sebagai Bebas Tes Praktik!', 'success');
    }
    if (typeof closeModal === 'function') closeModal();
    if (typeof closePracticalEvaluationModal === 'function') closePracticalEvaluationModal();
    if (typeof loadPracticalVerificationTable === 'function') loadPracticalVerificationTable();
    if (typeof loadPracticalCandidates === 'function') loadPracticalCandidates();
  } catch (err) {
    console.error('Error exempting practical test:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Gagal menyimpan status bebas praktik.', 'danger');
    } else {
      alert(err.message || 'Gagal menyimpan status bebas praktik.');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Simpan & Luluskan Praktik';
    }
  }
}

window.printPracticalCandidateSheet = printPracticalCandidateSheet;
window.openExemptPracticalModal = openExemptPracticalModal;
window.handleExemptPracticalCandidateSearch = handleExemptPracticalCandidateSearch;
window.selectExemptPracticalCandidate = selectExemptPracticalCandidate;
window.resetExemptPracticalCandidateSelection = resetExemptPracticalCandidateSelection;
window.handleConfirmExemptPractical = handleConfirmExemptPractical;


