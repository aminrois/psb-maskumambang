/**
 * ============================================================================
 * HERO SLIDER ADMIN MANAGEMENT MODULE (SUPER ADMIN)
 * PSB MASKUMAMBANG
 * ============================================================================
 */

(function () {
  'use strict';

  // State lokal untuk modul Hero Slider
  const sliderState = {
    sliders: [],
    loading: false,
    currentPreviewMode: 'desktop', // 'desktop' | 'mobile'
    activePreviewData: null,
    dragSrcEl: null,
  };

  /**
   * Helper format URL gambar
   */
  function getImageUrl(filename) {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    if (filename.startsWith('/')) return filename;
    return `/uploads/hero-slider/${filename}`;
  }

  /**
   * Helper Toast / Alert notifikasi
   */
  function showSliderToast(message, type = 'success') {
    const alertEl = document.getElementById('app-alert');
    if (!alertEl) return;

    alertEl.style.display = 'block';
    alertEl.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
    alertEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.1rem;">&times;</button>
      </div>
    `;

    setTimeout(() => {
      if (alertEl) alertEl.style.display = 'none';
    }, 4000);
  }

  // ==========================================================================
  // 1. DAFTAR HERO SLIDER (LIST VIEW)
  // ==========================================================================
  async function renderHeroSliderListView() {
    const slot = document.getElementById('main-view-slot');
    if (!slot) return;

    slot.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin: 0 0 4px 0;">Hero Slider</h1>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">Kelola konten slider yang ditampilkan pada halaman utama website.</p>
        </div>
        <div>
          <a href="#homepage-hero-slider/add" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; border-radius: 10px;">
            <i class="fa-solid fa-plus"></i> Tambah Slider
          </a>
        </div>
      </div>

      <div class="hero-slider-grid-layout" style="display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start;">
        <!-- Left Table Container -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-images" style="color: var(--primary-500);"></i> Daftar Hero Slider
            </h3>
            <span id="slider-count-badge" class="badge" style="background: var(--primary-50); color: var(--primary-700); font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem;">
              Memuat...
            </span>
          </div>

          <div class="table-responsive" style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.875rem;">
              <thead>
                <tr style="background: var(--bg-body); color: var(--text-muted); text-align: left;">
                  <th style="padding: 12px 14px; border-top-left-radius: 8px; border-bottom-left-radius: 8px; width: 40px;">No</th>
                  <th style="padding: 12px 14px; width: 110px;">Thumbnail</th>
                  <th style="padding: 12px 14px;">Judul</th>
                  <th style="padding: 12px 14px; width: 140px;">Badge</th>
                  <th style="padding: 12px 14px; width: 100px; text-align: center;">Status</th>
                  <th style="padding: 12px 14px; width: 80px; text-align: center;">Urutan</th>
                  <th style="padding: 12px 14px; width: 150px; text-align: center;">Aksi</th>
                  <th style="padding: 12px 14px; border-top-right-radius: 8px; border-bottom-right-radius: 8px; width: 40px; text-align: center;"></th>
                </tr>
              </thead>
              <tbody id="hero-slider-table-body">
                <tr>
                  <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary-500);"></i>
                    <p style="margin-top: 8px;">Memuat data slider...</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--border-subtle); color: var(--text-muted); font-size: 0.8rem;">
            <i class="fa-solid fa-arrows-up-down" style="color: var(--primary-500);"></i>
            <span>Geser dan lepas (drag & drop) untuk mengubah urutan tampilan slider pada homepage.</span>
          </div>
        </div>

        <!-- Right Side Info Cards -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Format Gambar Card -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="font-size: 1rem; font-weight: 700; margin: 0 0 16px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
              <i class="fa-regular fa-image" style="color: var(--primary-500);"></i> Format Gambar
            </h4>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Desktop Info -->
              <div style="padding: 12px; background: var(--bg-body); border-radius: 10px; border-left: 3px solid var(--primary-500);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <i class="fa-solid fa-desktop" style="color: var(--primary-600); font-size: 0.9rem;"></i>
                  <strong style="font-size: 0.85rem; color: var(--text-heading);">Gambar Desktop</strong>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                  Ukuran rekomendasi: <strong>1920 × 1080 px</strong> (16:9)<br>
                  Format: <strong>JPG, PNG, WebP</strong><br>
                  Maks. ukuran: <strong>2 MB</strong>
                </div>
              </div>

              <!-- Mobile Info -->
              <div style="padding: 12px; background: var(--bg-body); border-radius: 10px; border-left: 3px solid #06b6d4;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <i class="fa-solid fa-mobile-screen-button" style="color: #06b6d4; font-size: 0.9rem;"></i>
                  <strong style="font-size: 0.85rem; color: var(--text-heading);">Gambar Mobile</strong>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                  Ukuran rekomendasi: <strong>1080 × 1920 px</strong> (9:16)<br>
                  Format: <strong>JPG, PNG, WebP</strong><br>
                  Maks. ukuran: <strong>2 MB</strong> (Opsional)
                </div>
              </div>
            </div>
          </div>

          <!-- Tips Card -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
            <h4 style="font-size: 1rem; font-weight: 700; margin: 0 0 14px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i> Tips
            </h4>
            <ul style="margin: 0; padding-left: 18px; font-size: 0.825rem; color: var(--text-muted); line-height: 1.6; display: flex; flex-direction: column; gap: 8px;">
              <li>Gunakan gambar yang relevan dan berkualitas tinggi agar website tampak profesional.</li>
              <li>Pastikan teks dan kontras gambar tetap terbaca dengan jelas di semua jenis perangkat.</li>
              <li>Disarankan menggunakan <strong>maksimal 3 - 5 slider</strong> agar waktu muat halaman tetap cepat dan pengunjung tidak bingung.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    await loadHeroSlidersTableData();
  }

  /**
   * Fetch data dari API dan render tabel
   */
  async function loadHeroSlidersTableData() {
    const tbody = document.getElementById('hero-slider-table-body');
    const badgeCount = document.getElementById('slider-count-badge');
    if (!tbody) return;

    try {
      const res = await apiRequest('/api/hero-sliders');
      if (res && res.success && Array.isArray(res.data)) {
        sliderState.sliders = res.data;
        if (badgeCount) badgeCount.innerText = `${res.data.length} Slider`;

        if (res.data.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-regular fa-image" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 10px; display: block;"></i>
                <p style="margin: 0; font-weight: 600;">Belum ada Hero Slider yang ditambahkan.</p>
                <a href="#homepage-hero-slider/add" class="btn btn-sm btn-primary" style="margin-top: 12px; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-plus"></i> Tambah Slider Pertama
                </a>
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = res.data.map((item, idx) => {
          const thumbUrl = getImageUrl(item.desktopImage);
          const statusBadge = item.isActive
            ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-check"></i> Aktif</span>`
            : `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem;">Nonaktif</span>`;

          const badgePill = item.badge
            ? `<span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; white-space: nowrap;">${escapeHtml(item.badge)}</span>`
            : `<span style="color: var(--text-dim); font-size: 0.75rem;">-</span>`;

          return `
            <tr class="slider-row-item" draggable="true" data-id="${item.id}" data-index="${idx}" style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s; cursor: grab;">
              <td style="padding: 12px 14px; font-weight: 600; color: var(--text-muted);">${idx + 1}</td>
              <td style="padding: 12px 14px;">
                <div style="width: 84px; height: 48px; border-radius: 8px; overflow: hidden; background: var(--bg-body); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
                  <img src="${thumbUrl}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/static/img/favicon_87007b6344.webp'">
                </div>
              </td>
              <td style="padding: 12px 14px;">
                <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 2px;">${escapeHtml(item.title)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(item.description)}
                </div>
              </td>
              <td style="padding: 12px 14px;">${badgePill}</td>
              <td style="padding: 12px 14px; text-align: center;">${statusBadge}</td>
              <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--primary-600);">${item.sortOrder}</td>
              <td style="padding: 12px 14px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <!-- Preview Button -->
                  <button type="button" class="btn-action-icon" title="Preview Slider" onclick="window.previewHeroSlider('${item.id}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <i class="fa-regular fa-eye"></i>
                  </button>
                  <!-- Edit Button -->
                  <a href="#homepage-hero-slider/edit/${item.id}" class="btn-action-icon" title="Edit Slider" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s;">
                    <i class="fa-regular fa-pen-to-square"></i>
                  </a>
                  <!-- Toggle Status Button -->
                  <button type="button" class="btn-action-icon" title="${item.isActive ? 'Nonaktifkan Slider' : 'Aktifkan Slider'}" onclick="window.toggleHeroSliderStatus('${item.id}', ${!item.isActive})" style="background: ${item.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)'}; color: ${item.isActive ? '#10b981' : '#94a3b8'}; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <i class="fa-solid ${item.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                  </button>
                  <!-- Delete Button -->
                  <button type="button" class="btn-action-icon" title="Hapus Slider" onclick="window.deleteHeroSlider('${item.id}', '${escapeHtml(item.title.replace(/'/g, ''))}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </td>
              <td style="padding: 12px 14px; text-align: center; color: var(--text-dim); cursor: grab;">
                <i class="fa-solid fa-grip-vertical"></i>
              </td>
            </tr>
          `;
        }).join('');

        setupDragAndDropTable();
      }
    } catch (e) {
      console.error('Failed to load hero sliders:', e);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: var(--danger-500);">
            <i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat data: ${e.message || 'Terjadi kesalahan sistem'}
          </td>
        </tr>
      `;
    }
  }

  /**
   * Setup HTML5 Drag & Drop untuk baris tabel
   */
  function setupDragAndDropTable() {
    const rows = document.querySelectorAll('.slider-row-item');
    const tbody = document.getElementById('hero-slider-table-body');
    if (!rows.length || !tbody) return;

    rows.forEach(row => {
      row.addEventListener('dragstart', function (e) {
        sliderState.dragSrcEl = this;
        this.style.opacity = '0.4';
        this.style.background = 'var(--primary-50)';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
      });

      row.addEventListener('dragover', function (e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
      });

      row.addEventListener('dragenter', function () {
        this.classList.add('drag-over-active');
        this.style.borderTop = '2px solid var(--primary-500)';
      });

      row.addEventListener('dragleave', function () {
        this.classList.remove('drag-over-active');
        this.style.borderTop = '';
      });

      row.addEventListener('drop', async function (e) {
        if (e.stopPropagation) e.stopPropagation();
        this.style.borderTop = '';

        if (sliderState.dragSrcEl !== this) {
          const allRows = Array.from(tbody.querySelectorAll('.slider-row-item'));
          const srcIndex = allRows.indexOf(sliderState.dragSrcEl);
          const targetIndex = allRows.indexOf(this);

          if (srcIndex < targetIndex) {
            this.after(sliderState.dragSrcEl);
          } else {
            this.before(sliderState.dragSrcEl);
          }

          // Kumpulkan urutan sliderIds baru
          const updatedRows = Array.from(tbody.querySelectorAll('.slider-row-item'));
          const sliderIds = updatedRows.map(r => r.getAttribute('data-id'));

          try {
            const res = await apiRequest('/api/hero-sliders/reorder', 'PATCH', { sliderIds });
            if (res && res.success) {
              showSliderToast('Urutan slider berhasil diperbarui.', 'success');
              // Update state
              sliderState.sliders = res.data;
              // Refresh table data
              loadHeroSlidersTableData();
            }
          } catch (err) {
            console.error('Reorder error:', err);
            showSliderToast(err.message || 'Gagal mengubah urutan slider.', 'error');
            loadHeroSlidersTableData();
          }
        }
        return false;
      });

      row.addEventListener('dragend', function () {
        this.style.opacity = '1';
        this.style.background = '';
        rows.forEach(r => {
          r.style.borderTop = '';
          r.classList.remove('drag-over-active');
        });
      });
    });
  }

  // ==========================================================================
  // 2. FORM TAMBAH & EDIT HERO SLIDER
  // ==========================================================================
  async function renderHeroSliderFormView(id = null) {
    const slot = document.getElementById('main-view-slot');
    if (!slot) return;

    const isEdit = Boolean(id);
    let sliderData = null;

    if (isEdit) {
      slot.innerHTML = `
        <div style="text-align: center; padding: 50px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-500);"></i>
          <p style="margin-top: 12px;">Memuat data slider...</p>
        </div>
      `;

      try {
        const res = await apiRequest(`/api/hero-sliders/${id}`);
        if (res && res.success) {
          sliderData = res.data;
        } else {
          throw new Error('Data slider tidak ditemukan.');
        }
      } catch (err) {
        slot.innerHTML = `
          <div class="card" style="padding: 30px; text-align: center;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: var(--danger-500); margin-bottom: 12px;"></i>
            <h3>Gagal Memuat Slider</h3>
            <p style="color: var(--text-muted);">${err.message}</p>
            <a href="#homepage-hero-slider" class="btn btn-secondary" style="margin-top: 14px;">Kembali ke Daftar Slider</a>
          </div>
        `;
        return;
      }
    }

    const defaultBadge = sliderData?.badge || 'Tahun Pelajaran 2026/2027';
    const defaultTitle = sliderData?.title || '';
    const defaultDesc = sliderData?.description || '';
    const defaultPrimaryText = sliderData?.primaryButtonText || 'Daftar Sekarang';
    const defaultPrimaryUrl = sliderData?.primaryButtonUrl || '/register.html';
    const defaultSecText = sliderData?.secondaryButtonText || '';
    const defaultSecUrl = sliderData?.secondaryButtonUrl || '';
    const defaultActive = sliderData ? sliderData.isActive : true;
    const defaultSortOrder = sliderData ? sliderData.sortOrder : (sliderState.sliders.length + 1);

    const desktopImageUrl = sliderData?.desktopImage ? getImageUrl(sliderData.desktopImage) : '';
    const mobileImageUrl = sliderData?.mobileImage ? getImageUrl(sliderData.mobileImage) : '';

    slot.innerHTML = `
      <!-- Top Navigation Breadcrumb / Back -->
      <div style="margin-bottom: 20px;">
        <a href="#homepage-hero-slider" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; color: var(--primary-600); text-decoration: none; margin-bottom: 8px;">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Daftar Slider
        </a>
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin: 0 0 4px 0;">
          ${isEdit ? 'Edit Hero Slider' : 'Tambah Hero Slider'}
        </h1>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">
          ${isEdit ? 'Perbarui informasi konten dan media slider.' : 'Kelola konten slider yang akan ditampilkan di halaman utama.'}
        </p>
      </div>

      <form id="hero-slider-form" onsubmit="window.handleSaveHeroSlider(event, '${id || ''}')" style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- SECTION 1: INFORMASI KONTEN -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 18px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">1</span>
            Informasi Konten
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px;" class="grid-2-col-responsive">
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 6px; display: block;">
                Badge / Label <span style="font-weight: 400; color: var(--text-muted); font-size: 0.75rem;">(Opsional)</span>
              </label>
              <input type="text" id="slider-badge" class="form-control" placeholder="Contoh: Tahun Pelajaran 2026/2027" value="${escapeHtml(defaultBadge)}" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.9rem;">
            </div>

            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 6px; display: block;">
                Judul Utama <span style="color: var(--danger-500);">*</span>
              </label>
              <input type="text" id="slider-title" class="form-control" required placeholder="Masukkan judul utama slider" value="${escapeHtml(defaultTitle)}" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.9rem;">
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="font-weight: 600; font-size: 0.875rem; color: var(--text-heading); margin: 0;">
                Deskripsi <span style="color: var(--danger-500);">*</span>
              </label>
              <span id="slider-desc-counter" style="font-size: 0.75rem; color: var(--text-muted);">
                ${defaultDesc.length}/300
              </span>
            </div>
            <textarea id="slider-desc" class="form-control" required rows="3" maxlength="300" placeholder="Masukkan deskripsi singkat slider" oninput="document.getElementById('slider-desc-counter').innerText = this.value.length + '/300'" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.9rem; resize: vertical;">${escapeHtml(defaultDesc)}</textarea>
          </div>
        </div>

        <!-- SECTION 2: TOMBOL AKSI -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 18px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">2</span>
            Tombol Aksi
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;" class="grid-2-col-responsive">
            <!-- Tombol Utama -->
            <div style="padding: 16px; background: var(--bg-body); border-radius: 12px; border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--primary-600); margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-location-arrow"></i> Tombol Utama
              </h4>
              <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-heading); margin-bottom: 4px; display: block;">
                  Teks Tombol <span style="color: var(--danger-500);">*</span>
                </label>
                <input type="text" id="slider-primary-btn-text" class="form-control" required placeholder="Contoh: Daftar Sekarang" value="${escapeHtml(defaultPrimaryText)}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 0.85rem;">
              </div>
              <div>
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-heading); margin-bottom: 4px; display: block;">
                  Link Tombol <span style="color: var(--danger-500);">*</span>
                </label>
                <div style="position: relative;">
                  <i class="fa-solid fa-link" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--text-muted);"></i>
                  <input type="text" id="slider-primary-btn-url" class="form-control" required placeholder="Contoh: /register.html" value="${escapeHtml(defaultPrimaryUrl)}" style="width: 100%; padding: 8px 12px 8px 30px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 0.85rem;">
                </div>
              </div>
            </div>

            <!-- Tombol Kedua (Opsional) -->
            <div style="padding: 16px; background: var(--bg-body); border-radius: 12px; border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;">
                <i class="fa-regular fa-compass"></i> Tombol Kedua <span style="font-size: 0.75rem; font-weight: 400;">(Opsional)</span>
              </h4>
              <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-heading); margin-bottom: 4px; display: block;">
                  Teks Tombol
                </label>
                <input type="text" id="slider-secondary-btn-text" class="form-control" placeholder="Contoh: Lihat Panduan" value="${escapeHtml(defaultSecText)}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 0.85rem;">
              </div>
              <div>
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-heading); margin-bottom: 4px; display: block;">
                  Link Tombol
                </label>
                <div style="position: relative;">
                  <i class="fa-solid fa-link" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--text-muted);"></i>
                  <input type="text" id="slider-secondary-btn-url" class="form-control" placeholder="Contoh: /guide.html" value="${escapeHtml(defaultSecUrl)}" style="width: 100%; padding: 8px 12px 8px 30px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--text-main); font-size: 0.85rem;">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: MEDIA SLIDER (DESKTOP & MOBILE) -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 18px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">3</span>
            Media Slider
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;" class="grid-2-col-responsive">
            
            <!-- GAMBAR DESKTOP -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label" style="font-weight: 700; font-size: 0.875rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-desktop" style="color: var(--primary-500);"></i> Gambar Desktop <span style="color: var(--danger-500);">*</span>
                </label>
                <span style="font-size: 0.72rem; color: var(--text-muted);">1920 × 1080 px</span>
              </div>

              <!-- Upload Zone Desktop -->
              <div id="desktop-upload-dropzone" class="upload-dropzone-box" onclick="document.getElementById('slider-desktop-file').click()" ondragover="event.preventDefault(); this.classList.add('drop-hover')" ondragleave="this.classList.remove('drop-hover')" ondrop="window.handleDropImage(event, 'desktop')" style="border: 2px dashed var(--border-subtle); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg-body); position: relative;">
                <input type="file" id="slider-desktop-file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style="display: none;" onchange="window.handleImageSelect(this, 'desktop')">
                
                <div id="desktop-empty-placeholder" style="${desktopImageUrl ? 'display: none;' : ''}">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 4px;">
                    Upload Gambar Desktop
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                    Format: JPG, PNG, WebP | Maks. 2MB<br>
                    Ukuran rekomendasi: 1920 × 1080 px
                  </div>
                  <button type="button" class="btn btn-sm btn-secondary" style="margin-top: 10px; pointer-events: none;">
                    Pilih Gambar
                  </button>
                </div>

                <!-- Preview Area Desktop -->
                <div id="desktop-preview-container" style="${desktopImageUrl ? '' : 'display: none;'}">
                  <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; background: #000; margin-bottom: 10px;">
                    <img id="desktop-preview-img" src="${desktopImageUrl}" alt="Preview Desktop" style="width: 100%; height: 100%; object-fit: contain;">
                  </div>
                  <div style="display: flex; gap: 8px; justify-content: center;" onclick="event.stopPropagation()">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('slider-desktop-file').click()" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem;">
                      <i class="fa-solid fa-arrows-rotate"></i> Ganti Gambar
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.clearImagePreview('desktop')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem;">
                      <i class="fa-regular fa-trash-can"></i> Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- GAMBAR MOBILE -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label" style="font-weight: 700; font-size: 0.875rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-mobile-screen-button" style="color: #06b6d4;"></i> Gambar Mobile <span style="font-weight: 400; color: var(--text-muted); font-size: 0.75rem;">(Opsional)</span>
                </label>
                <span style="font-size: 0.72rem; color: var(--text-muted);">1080 × 1920 px</span>
              </div>

              <!-- Upload Zone Mobile -->
              <div id="mobile-upload-dropzone" class="upload-dropzone-box" onclick="document.getElementById('slider-mobile-file').click()" ondragover="event.preventDefault(); this.classList.add('drop-hover')" ondragleave="this.classList.remove('drop-hover')" ondrop="window.handleDropImage(event, 'mobile')" style="border: 2px dashed var(--border-subtle); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg-body); position: relative;">
                <input type="file" id="slider-mobile-file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style="display: none;" onchange="window.handleImageSelect(this, 'mobile')">
                
                <div id="mobile-empty-placeholder" style="${mobileImageUrl ? 'display: none;' : ''}">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(6, 182, 212, 0.1); color: #06b6d4; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 4px;">
                    Upload Gambar Mobile
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                    Format: JPG, PNG, WebP | Maks. 2MB<br>
                    Ukuran rekomendasi: 1080 × 1920 px
                  </div>
                  <button type="button" class="btn btn-sm btn-secondary" style="margin-top: 10px; pointer-events: none;">
                    Pilih Gambar
                  </button>
                </div>

                <!-- Preview Area Mobile -->
                <div id="mobile-preview-container" style="${mobileImageUrl ? '' : 'display: none;'}">
                  <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; background: #000; margin-bottom: 10px;">
                    <img id="mobile-preview-img" src="${mobileImageUrl}" alt="Preview Mobile" style="width: 100%; height: 100%; object-fit: contain;">
                  </div>
                  <div style="display: flex; gap: 8px; justify-content: center;" onclick="event.stopPropagation()">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('slider-mobile-file').click()" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem;">
                      <i class="fa-solid fa-arrows-rotate"></i> Ganti Gambar
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.clearImagePreview('mobile')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem;">
                      <i class="fa-regular fa-trash-can"></i> Hapus
                    </button>
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.75rem; color: var(--text-muted);">
                <i class="fa-solid fa-circle-info" style="color: #06b6d4;"></i>
                <span>Jika gambar mobile tidak diupload, sistem otomatis menggunakan gambar desktop sebagai fallback.</span>
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 4: PENGATURAN SLIDER -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 18px 0; color: var(--text-heading); display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 800;">4</span>
            Pengaturan Slider
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;" class="grid-2-col-responsive">
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 8px; display: block;">
                Status
              </label>
              <div style="display: flex; gap: 20px; align-items: center; padding-top: 4px;">
                <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                  <input type="radio" name="slider_status" value="true" ${defaultActive ? 'checked' : ''} style="accent-color: var(--primary-600); width: 18px; height: 18px;">
                  <span>Aktif</span>
                </label>
                <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">
                  <input type="radio" name="slider_status" value="false" ${!defaultActive ? 'checked' : ''} style="accent-color: var(--primary-600); width: 18px; height: 18px;">
                  <span>Nonaktif</span>
                </label>
              </div>
            </div>

            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.875rem; color: var(--text-heading); margin-bottom: 6px; display: block;">
                Urutan Tampil
              </label>
              <input type="number" id="slider-sort-order" class="form-control" min="1" value="${defaultSortOrder}" style="width: 120px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-body); color: var(--text-main); font-size: 0.9rem;">
              <span style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                Urutan slider dapat diatur kembali secara mudah menggunakan drag & drop di daftar slider.
              </span>
            </div>
          </div>
        </div>

        <!-- FORM ACTION BUTTONS -->
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding: 10px 0 30px;">
          <a href="#homepage-hero-slider" class="btn btn-secondary" style="padding: 10px 24px; font-weight: 700; border-radius: 10px; text-decoration: none;">
            Batal
          </a>
          <button type="submit" id="btn-submit-hero-slider" class="btn btn-primary" style="padding: 10px 28px; font-weight: 700; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Slider
          </button>
        </div>

      </form>
    `;
  }

  // ==========================================================================
  // 3. IMAGE PREVIEW & UPLOAD EVENT HANDLERS
  // ==========================================================================
  window.handleImageSelect = function (input, type) {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file terlalu besar. Maksimal 2MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const placeholder = document.getElementById(`${type}-empty-placeholder`);
      const container = document.getElementById(`${type}-preview-container`);
      const img = document.getElementById(`${type}-preview-img`);

      if (img) img.src = e.target.result;
      if (placeholder) placeholder.style.display = 'none';
      if (container) container.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  window.handleDropImage = function (e, type) {
    e.preventDefault();
    const dropzone = document.getElementById(`${type}-upload-dropzone`);
    if (dropzone) dropzone.classList.remove('drop-hover');

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const input = document.getElementById(`slider-${type}-file`);
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      window.handleImageSelect(input, type);
    }
  };

  window.clearImagePreview = function (type) {
    const input = document.getElementById(`slider-${type}-file`);
    const placeholder = document.getElementById(`${type}-empty-placeholder`);
    const container = document.getElementById(`${type}-preview-container`);
    const img = document.getElementById(`${type}-preview-img`);

    if (input) input.value = '';
    if (img) img.src = '';
    if (container) container.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';

    if (type === 'mobile') {
      window._removeMobileImageFlag = true;
    }
  };

  // ==========================================================================
  // 4. SUBMIT FORM HANDLER
  // ==========================================================================
  window.handleSaveHeroSlider = async function (e, id) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-hero-slider');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    }

    try {
      const isEdit = Boolean(id);
      const formData = new FormData();

      formData.append('badge', document.getElementById('slider-badge').value.trim());
      formData.append('title', document.getElementById('slider-title').value.trim());
      formData.append('description', document.getElementById('slider-desc').value.trim());
      formData.append('primaryButtonText', document.getElementById('slider-primary-btn-text').value.trim());
      formData.append('primaryButtonUrl', document.getElementById('slider-primary-btn-url').value.trim());
      
      const secText = document.getElementById('slider-secondary-btn-text').value.trim();
      const secUrl = document.getElementById('slider-secondary-btn-url').value.trim();
      if (secText) formData.append('secondaryButtonText', secText);
      if (secUrl) formData.append('secondaryButtonUrl', secUrl);

      const statusRadio = document.querySelector('input[name="slider_status"]:checked');
      formData.append('isActive', statusRadio ? statusRadio.value : 'true');

      const sortOrder = document.getElementById('slider-sort-order').value;
      if (sortOrder) formData.append('sortOrder', sortOrder);

      const desktopFileInput = document.getElementById('slider-desktop-file');
      const mobileFileInput = document.getElementById('slider-mobile-file');

      if (!isEdit && (!desktopFileInput.files || !desktopFileInput.files[0])) {
        throw new Error('Gambar Desktop wajib diupload.');
      }

      if (desktopFileInput.files && desktopFileInput.files[0]) {
        formData.append('desktop_image', desktopFileInput.files[0]);
      }

      if (mobileFileInput.files && mobileFileInput.files[0]) {
        formData.append('mobile_image', mobileFileInput.files[0]);
      } else if (window._removeMobileImageFlag) {
        formData.append('removeMobileImage', 'true');
      }

      const token = safeStorage.getItem('lomba_jwt_token');
      const url = isEdit ? `/api/hero-sliders/${id}` : '/api/hero-sliders';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal menyimpan data slider.');
      }

      window._removeMobileImageFlag = false;
      showSliderToast(isEdit ? 'Hero Slider berhasil diperbarui.' : 'Hero Slider baru berhasil ditambahkan.', 'success');
      window.location.hash = '#homepage-hero-slider';
    } catch (err) {
      console.error('Save error:', err);
      alert(err.message || 'Terjadi kesalahan saat menyimpan slider.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Slider';
      }
    }
  };

  // ==========================================================================
  // 5. STATUS TOGGLE & DELETE ACTIONS
  // ==========================================================================
  window.toggleHeroSliderStatus = async function (id, newStatus) {
    try {
      const res = await apiRequest(`/api/hero-sliders/${id}/status`, 'PATCH', { isActive: newStatus });
      if (res && res.success) {
        showSliderToast(`Status slider berhasil diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}.`, 'success');
        loadHeroSlidersTableData();
      }
    } catch (e) {
      alert(e.message || 'Gagal mengubah status slider.');
    }
  };

  window.deleteHeroSlider = async function (id, title) {
    if (!confirm(`Apakah Anda yakin ingin menghapus slider "${title}"?`)) {
      return;
    }

    try {
      const res = await apiRequest(`/api/hero-sliders/${id}`, 'DELETE');
      if (res && res.success) {
        showSliderToast('Slider berhasil dihapus.', 'success');
        loadHeroSlidersTableData();
      }
    } catch (e) {
      alert(e.message || 'Gagal menghapus slider.');
    }
  };

  // ==========================================================================
  // 6. LIVE PREVIEW MODAL (DESKTOP & MOBILE SIMULATION)
  // ==========================================================================
  window.previewHeroSlider = async function (id) {
    try {
      const res = await apiRequest(`/api/hero-sliders/${id}`);
      if (!res || !res.success) throw new Error('Data tidak ditemukan');

      sliderState.activePreviewData = res.data;
      sliderState.currentPreviewMode = 'desktop';

      renderPreviewModalContent();

      const modal = document.getElementById('app-modal');
      if (modal) modal.classList.add('active');
    } catch (e) {
      alert('Gagal memuat preview: ' + e.message);
    }
  };

  function renderPreviewModalContent() {
    const modalBody = document.getElementById('app-modal-body');
    if (!modalBody || !sliderState.activePreviewData) return;

    const data = sliderState.activePreviewData;
    const mode = sliderState.currentPreviewMode;

    const desktopImgUrl = getImageUrl(data.desktopImage);
    const mobileImgUrl = data.mobileImage ? getImageUrl(data.mobileImage) : desktopImgUrl;

    modalBody.style.maxWidth = mode === 'desktop' ? '900px' : '480px';
    modalBody.style.padding = '24px';
    modalBody.style.transition = 'max-width 0.3s ease';

    modalBody.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: var(--text-heading);">
            Preview Hero Slider
          </h3>
          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 9999px; padding: 3px; display: flex; gap: 4px;">
            <button type="button" onclick="window.switchPreviewMode('desktop')" style="background: ${mode === 'desktop' ? 'var(--primary-600)' : 'transparent'}; color: ${mode === 'desktop' ? '#ffffff' : 'var(--text-muted)'}; border: none; border-radius: 9999px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s;">
              <i class="fa-solid fa-desktop"></i> Desktop
            </button>
            <button type="button" onclick="window.switchPreviewMode('mobile')" style="background: ${mode === 'mobile' ? 'var(--primary-600)' : 'transparent'}; color: ${mode === 'mobile' ? '#ffffff' : 'var(--text-muted)'}; border: none; border-radius: 9999px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s;">
              <i class="fa-solid fa-mobile-screen-button"></i> Mobile
            </button>
          </div>
        </div>
        <button type="button" onclick="document.getElementById('app-modal').classList.remove('active')" style="background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer;">&times;</button>
      </div>

      ${mode === 'desktop' ? renderDesktopSimulation(data, desktopImgUrl) : renderMobileSimulation(data, mobileImgUrl)}

      <div style="margin-top: 18px; text-align: right;">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').classList.remove('active')" style="padding: 8px 18px; border-radius: 8px; font-weight: 700;">
          Tutup Preview
        </button>
      </div>
    `;
  }

  function renderDesktopSimulation(data, imgUrl) {
    return `
      <div style="border-radius: 16px; overflow: hidden; border: 1px solid var(--border-subtle); box-shadow: 0 10px 25px rgba(0,0,0,0.15); background: #ffffff;">
        <!-- Browser Chrome Bar -->
        <div style="background: #f1f5f9; padding: 8px 14px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
          </div>
          <div style="flex: 1; background: #ffffff; border-radius: 6px; padding: 3px 10px; font-size: 0.72rem; color: #64748b; text-align: center; border: 1px solid #e2e8f0;">
            https://psb.maskumambang.ac.id
          </div>
        </div>

        <!-- Desktop Hero Banner View -->
        <div style="position: relative; min-height: 380px; display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%); overflow: hidden; padding: 36px 30px;">
          <!-- Left Text Content -->
          <div style="z-index: 2; padding-right: 20px;">
            ${data.badge ? `
              <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(2, 132, 199, 0.12); color: #0284c7; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem; margin-bottom: 14px; border: 1px solid rgba(2, 132, 199, 0.2);">
                <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(data.badge)}
              </div>
            ` : ''}
            
            <h1 style="font-size: 1.85rem; font-weight: 900; color: #0f172a; line-height: 1.25; margin: 0 0 12px 0;">
              ${escapeHtml(data.title)}
            </h1>

            <p style="font-size: 0.92rem; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
              ${escapeHtml(data.description)}
            </p>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              ${data.primaryButtonText ? `
                <span style="display: inline-flex; align-items: center; gap: 8px; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 0.85rem; padding: 10px 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                  ${escapeHtml(data.primaryButtonText)} <i class="fa-solid fa-arrow-right"></i>
                </span>
              ` : ''}

              ${data.secondaryButtonText ? `
                <span style="display: inline-flex; align-items: center; gap: 8px; background: #ffffff; color: #0f172a; font-weight: 700; font-size: 0.85rem; padding: 10px 18px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <i class="fa-solid fa-book-open" style="color: #0284c7;"></i> ${escapeHtml(data.secondaryButtonText)}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Right Image Artwork -->
          <div style="position: relative; height: 320px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <img src="${imgUrl}" alt="Desktop Hero" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        </div>
      </div>
    `;
  }

  function renderMobileSimulation(data, imgUrl) {
    return `
      <div style="display: flex; justify-content: center;">
        <!-- Smartphone Frame -->
        <div style="width: 320px; height: 600px; background: #0f172a; border-radius: 40px; padding: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 4px solid #334155; position: relative;">
          <!-- Speaker Notch / Island -->
          <div style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); width: 90px; height: 16px; background: #000000; border-radius: 9999px; z-index: 10;"></div>
          
          <!-- Screen Content -->
          <div style="width: 100%; height: 100%; background: #ffffff; border-radius: 30px; overflow-y: auto; overflow-x: hidden; position: relative; display: flex; flex-direction: column;">
            <!-- Mobile Header Bar -->
            <div style="padding: 24px 16px 8px; background: #ffffff; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 800; font-size: 0.8rem; color: #0284c7;">PSB MASKUMAMBANG</div>
              <i class="fa-solid fa-bars" style="color: #64748b; font-size: 0.9rem;"></i>
            </div>

            <!-- Mobile Hero Slide -->
            <div style="padding: 16px; background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%); flex: 1; display: flex; flex-direction: column;">
              ${data.badge ? `
                <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(2, 132, 199, 0.1); color: #0284c7; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.65rem; margin-bottom: 10px; align-self: flex-start;">
                  <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(data.badge)}
                </div>
              ` : ''}

              <h2 style="font-size: 1.15rem; font-weight: 900; color: #0f172a; line-height: 1.25; margin: 0 0 8px 0;">
                ${escapeHtml(data.title)}
              </h2>

              <p style="font-size: 0.75rem; color: #475569; line-height: 1.5; margin: 0 0 14px 0;">
                ${escapeHtml(data.description)}
              </p>

              <!-- Mobile Stacked CTA Buttons -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                ${data.primaryButtonText ? `
                  <span style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 0.78rem; padding: 8px 14px; border-radius: 8px;">
                    ${escapeHtml(data.primaryButtonText)} <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem;"></i>
                  </span>
                ` : ''}

                ${data.secondaryButtonText ? `
                  <span style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #ffffff; color: #0f172a; font-weight: 700; font-size: 0.78rem; padding: 7px 14px; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <i class="fa-solid fa-book-open" style="color: #0284c7; font-size: 0.7rem;"></i> ${escapeHtml(data.secondaryButtonText)}
                  </span>
                ` : ''}
              </div>

              <!-- Mobile Image Artwork -->
              <div style="flex: 1; min-height: 180px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-top: auto;">
                <img src="${imgUrl}" alt="Mobile Hero" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.switchPreviewMode = function (mode) {
    sliderState.currentPreviewMode = mode;
    renderPreviewModalContent();
  };

  // ==========================================================================
  // 7. PUBLIC EXPORT UNTUK ROUTING DASHBOARD
  // ==========================================================================
  window.renderHeroSliderAdminView = function (param) {
    if (!param) {
      renderHeroSliderListView();
    } else if (param === 'add') {
      renderHeroSliderFormView(null);
    } else if (param.startsWith('edit')) {
      const parts = param.split('/');
      const id = parts[1] || null;
      renderHeroSliderFormView(id);
    } else {
      renderHeroSliderListView();
    }
  };

  // Helper escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
