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

      <div class="hero-slider-grid-layout" style="display: block;">
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
                  <th style="padding: 12px 14px; width: 100px; text-align: center; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">Aksi</th>
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
              <td style="padding: 10px 14px; text-align: center;">
                <div class="slider-action-dropdown" style="position: relative; display: inline-block;">
                  <button type="button" class="btn-aksi-toggle" onclick="window.toggleSliderDropdown(this)" style="background: var(--bg-body); color: var(--text-heading); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    Aksi <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem;"></i>
                  </button>
                  <div class="slider-action-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 4px); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; min-width: 175px; overflow: hidden;">
                    <button type="button" onclick="window.previewHeroSlider('${item.id}'); window.closeAllSliderDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='none'">
                      <i class="fa-regular fa-eye" style="color: #3b82f6; width: 16px;"></i> Preview
                    </button>
                    <a href="#homepage-hero-slider/edit/${item.id}" onclick="window.closeAllSliderDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-decoration: none;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='none'">
                      <i class="fa-regular fa-pen-to-square" style="color: #f59e0b; width: 16px;"></i> Edit
                    </a>
                    <button type="button" onclick="window.toggleHeroSliderStatus('${item.id}', ${!item.isActive}); window.closeAllSliderDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='none'">
                      <i class="fa-solid ${item.isActive ? 'fa-toggle-off' : 'fa-toggle-on'}" style="color: ${item.isActive ? '#94a3b8' : '#10b981'}; width: 16px;"></i> ${item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <div style="margin: 4px 10px; border-top: 1px solid var(--border-subtle);"></div>
                    <button type="button" onclick="window.deleteHeroSlider('${item.id}', '${escapeHtml(item.title.replace(/'/g, ''))}'); window.closeAllSliderDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: #ef4444; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='rgba(239,68,68,0.06)'" onmouseout="this.style.background='none'">
                      <i class="fa-regular fa-trash-can" style="width: 16px;"></i> Hapus
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        setupDragAndDropTable();
        setupSliderDropdownGlobalClose();

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

  // Dropdown toggle helper
  window.toggleSliderDropdown = function (btn) {
    const menu = btn.nextElementSibling;
    const allMenus = document.querySelectorAll('.slider-action-menu');
    allMenus.forEach(m => {
      if (m !== menu) m.style.display = 'none';
    });
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  };

  window.closeAllSliderDropdowns = function () {
    document.querySelectorAll('.slider-action-menu').forEach(m => m.style.display = 'none');
  };

  function setupSliderDropdownGlobalClose() {
    document.removeEventListener('click', _sliderDropdownCloseHandler);
    document.addEventListener('click', _sliderDropdownCloseHandler);
  }

  function _sliderDropdownCloseHandler(e) {
    if (!e.target.closest('.slider-action-dropdown')) {
      window.closeAllSliderDropdowns();
    }
  }

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
      <div style="border-radius: 16px; overflow: hidden; border: 1px solid var(--border-subtle); box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
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

        <!-- Desktop Hero - Full Background Image -->
        <div style="position: relative; min-height: 380px; display: flex; align-items: center; background-image: linear-gradient(90deg, rgba(15,23,42,0.90) 0%, rgba(15,23,42,0.65) 55%, rgba(15,23,42,0.20) 100%), url('${imgUrl}'); background-size: cover; background-position: center; overflow: hidden; padding: 36px 40px;">
          <!-- Text Content (Left) -->
          <div style="z-index: 2; max-width: 55%;">
            ${data.badge ? `
              <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); color: #e0f2fe; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 0.78rem; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.25);">
                <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(data.badge)}
              </div>
            ` : ''}
            
            <h1 style="font-size: 1.85rem; font-weight: 900; color: #ffffff; line-height: 1.25; margin: 0 0 12px 0; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
              ${escapeHtml(data.title)}
            </h1>

            <p style="font-size: 0.92rem; color: rgba(241,245,249,0.88); line-height: 1.6; margin: 0 0 24px 0;">
              ${escapeHtml(data.description)}
            </p>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              ${data.primaryButtonText ? `
                <span style="display: inline-flex; align-items: center; gap: 8px; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 0.85rem; padding: 10px 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);">
                  ${escapeHtml(data.primaryButtonText)} <i class="fa-solid fa-arrow-right"></i>
                </span>
              ` : ''}

              ${data.secondaryButtonText ? `
                <span style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); color: #f1f5f9; font-weight: 700; font-size: 0.85rem; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3);">
                  <i class="fa-solid fa-book-open"></i> ${escapeHtml(data.secondaryButtonText)}
                </span>
              ` : ''}
            </div>
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
          <!-- Speaker Notch -->
          <div style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); width: 90px; height: 16px; background: #000000; border-radius: 9999px; z-index: 10;"></div>
          
          <!-- Screen Content -->
          <div style="width: 100%; height: 100%; border-radius: 30px; overflow: hidden; position: relative;">
            <!-- Mobile Hero - Full Background Image -->
            <div style="position: relative; height: 100%; background-image: linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.50) 50%, rgba(15,23,42,0.85) 100%), url('${imgUrl}'); background-size: cover; background-position: center; display: flex; flex-direction: column; padding: 36px 16px 20px;">
              <!-- Mobile Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div style="font-weight: 800; font-size: 0.72rem; color: #7dd3fc; letter-spacing: 0.5px;">PSB MASKUMAMBANG</div>
                <i class="fa-solid fa-bars" style="color: #94a3b8; font-size: 0.85rem;"></i>
              </div>

              ${data.badge ? `
                <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.12); backdrop-filter: blur(6px); color: #bae6fd; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 0.62rem; margin-bottom: 10px; align-self: flex-start; border: 1px solid rgba(255,255,255,0.2);">
                  <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(data.badge)}
                </div>
              ` : ''}

              <h2 style="font-size: 1.15rem; font-weight: 900; color: #ffffff; line-height: 1.25; margin: 0 0 8px 0; text-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                ${escapeHtml(data.title)}
              </h2>

              <p style="font-size: 0.72rem; color: rgba(226,232,240,0.85); line-height: 1.5; margin: 0 0 16px 0;">
                ${escapeHtml(data.description)}
              </p>

              <!-- Mobile Buttons -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto;">
                ${data.primaryButtonText ? `
                  <span style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 0.75rem; padding: 9px 14px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2,132,199,0.4);">
                    ${escapeHtml(data.primaryButtonText)} <i class="fa-solid fa-arrow-right" style="font-size: 0.65rem;"></i>
                  </span>
                ` : ''}

                ${data.secondaryButtonText ? `
                  <span style="display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(255,255,255,0.12); backdrop-filter: blur(6px); color: #f1f5f9; font-weight: 700; font-size: 0.75rem; padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25);">
                    <i class="fa-solid fa-book-open" style="font-size: 0.65rem;"></i> ${escapeHtml(data.secondaryButtonText)}
                  </span>
                ` : ''}
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


  // ==========================================================================
  // 8. ALUR PENDAFTARAN ADMIN MODULE
  // ==========================================================================

  const flowState = {
    steps: [],
    dragSrcEl: null,
  };

  async function renderRegistrationFlowListView() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; padding: 32px 20px;">
        <!-- Page Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h1 style="font-size: 1.45rem; font-weight: 800; color: var(--text-heading); margin: 0 0 4px 0; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-route" style="color: #0284c7;"></i> Alur Pendaftaran
            </h1>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">
              Kelola langkah-langkah alur pendaftaran yang ditampilkan pada homepage PSB.
            </p>
          </div>
          <button type="button" onclick="window.renderFlowStepFormView(null)"
            style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(2,132,199,0.3); transition: all 0.2s;">
            <i class="fa-solid fa-plus"></i> Tambah Langkah
          </button>
        </div>

        <!-- Info Card -->
        <div style="background: linear-gradient(135deg, rgba(2,132,199,0.06), rgba(3,105,161,0.03)); border: 1px solid rgba(2,132,199,0.2); border-radius: 14px; padding: 14px 18px; margin-bottom: 22px; display: flex; align-items: center; gap: 12px;">
          <i class="fa-solid fa-circle-info" style="color: #0284c7; font-size: 1.1rem;"></i>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            <strong style="color: var(--text-heading);">Tips:</strong> Seret dan lepas baris untuk mengubah urutan tampilan. Urutan otomatis tersimpan ke database.
          </div>
        </div>

        <!-- Table Card -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div id="flow-steps-table-wrapper">
            <div style="text-align: center; padding: 50px; color: var(--text-muted);">
              <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: #0284c7;"></i>
              <p style="margin-top: 10px;">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await loadFlowStepsTable();
  }

  async function loadFlowStepsTable() {
    const wrapper = document.getElementById('flow-steps-table-wrapper');
    if (!wrapper) return;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/registration-flow', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success || !data.data.length) {
        wrapper.innerHTML = `
          <div style="text-align: center; padding: 60px; color: var(--text-muted);">
            <i class="fa-solid fa-route" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 14px; display: block;"></i>
            <p style="font-weight: 600; margin-bottom: 8px;">Belum ada langkah alur pendaftaran.</p>
            <button type="button" onclick="window.renderFlowStepFormView(null)" style="margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
              <i class="fa-solid fa-plus"></i> Tambah Langkah Pertama
            </button>
          </div>`;
        return;
      }
      flowState.steps = data.data;

      wrapper.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--bg-body); border-bottom: 2px solid var(--border-subtle);">
              <th style="padding: 12px 14px; text-align: left; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; width: 42px;">#</th>
              <th style="padding: 12px 14px; text-align: left; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Langkah / Judul</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Urutan</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Aksi</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; width: 40px;">⠿</th>
            </tr>
          </thead>
          <tbody id="flow-steps-tbody">
            ${flowState.steps.map((step, idx) => {
              const color = step.badgeColor || '#0284c7';
              const icon = step.icon || 'fa-diagram-project';
              const statusBadge = step.isActive
                ? `<span style="background: rgba(16,185,129,0.12); color: #10b981; font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-check"></i> Aktif</span>`
                : `<span style="background: rgba(148,163,184,0.12); color: #94a3b8; font-weight: 700; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem;">Nonaktif</span>`;
              return `
                <tr class="flow-step-row" draggable="true" data-id="${step.id}" data-index="${idx}"
                  style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s; cursor: grab;">
                  <td style="padding: 12px 14px; font-weight: 600; color: var(--text-muted);">${idx + 1}</td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 40px; height: 40px; border-radius: 10px; background: ${color}18; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fa-solid ${escapeHtml(icon)}" style="color: ${color};"></i>
                      </div>
                      <div>
                        <div style="font-weight: 700; color: var(--text-heading);">${escapeHtml(step.title)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(step.description)}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 14px; text-align: center;">${statusBadge}</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--primary-600);">${step.sortOrder}</td>
                  <td style="padding: 10px 14px; text-align: center;">
                    <div class="flow-action-dropdown" style="position: relative; display: inline-block;">
                      <button type="button" onclick="window.toggleFlowDropdown(this)"
                        style="background: var(--bg-body); color: var(--text-heading); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        Aksi <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem;"></i>
                      </button>
                      <div class="flow-action-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 4px); background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; min-width: 170px; overflow: hidden;">
                        <button type="button" onclick="window.renderFlowStepFormView('${step.id}'); window.closeAllFlowDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='none'">
                          <i class="fa-regular fa-pen-to-square" style="color: #f59e0b; width: 16px;"></i> Edit
                        </button>
                        <button type="button" onclick="window.toggleFlowStepStatus('${step.id}', ${!step.isActive}); window.closeAllFlowDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: var(--text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background='none'">
                          <i class="fa-solid ${step.isActive ? 'fa-toggle-off' : 'fa-toggle-on'}" style="color: ${step.isActive ? '#94a3b8' : '#10b981'}; width: 16px;"></i> ${step.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <div style="margin: 4px 10px; border-top: 1px solid var(--border-subtle);"></div>
                        <button type="button" onclick="window.deleteFlowStep('${step.id}', '${escapeHtml(step.title.replace(/'/g, ''))}'); window.closeAllFlowDropdowns()" style="width: 100%; padding: 10px 14px; background: none; border: none; color: #ef4444; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.15s; text-align: left;" onmouseover="this.style.background='rgba(239,68,68,0.06)'" onmouseout="this.style.background='none'">
                          <i class="fa-regular fa-trash-can" style="width: 16px;"></i> Hapus
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 14px; text-align: center; color: var(--text-dim); cursor: grab; font-size: 1.1rem; letter-spacing: 1px;">⠿</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      setupFlowDragDrop();
      setupFlowDropdownClose();
    } catch (e) {
      wrapper.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat: ${e.message}</div>`;
    }
  }

  function setupFlowDragDrop() {
    const rows = document.querySelectorAll('.flow-step-row');
    const tbody = document.getElementById('flow-steps-tbody');
    if (!rows.length || !tbody) return;

    rows.forEach(row => {
      row.addEventListener('dragstart', function (e) {
        flowState.dragSrcEl = this;
        this.style.opacity = '0.4';
        this.style.background = 'var(--primary-50)';
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function () {
        this.style.opacity = '1';
        this.style.background = '';
        document.querySelectorAll('.flow-step-row').forEach(r => r.classList.remove('drag-over'));
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this !== flowState.dragSrcEl) {
          document.querySelectorAll('.flow-step-row').forEach(r => r.classList.remove('drag-over'));
          this.style.background = 'rgba(2,132,199,0.06)';
        }
      });
      row.addEventListener('dragleave', function () {
        this.style.background = '';
      });
      row.addEventListener('drop', async function (e) {
        e.preventDefault();
        if (this === flowState.dragSrcEl) return;
        this.style.background = '';
        const rows = [...document.querySelectorAll('.flow-step-row')];
        const srcIdx = rows.indexOf(flowState.dragSrcEl);
        const tgtIdx = rows.indexOf(this);
        if (srcIdx < tgtIdx) {
          this.after(flowState.dragSrcEl);
        } else {
          this.before(flowState.dragSrcEl);
        }
        // Kirim urutan baru ke API
        const newOrder = [...document.querySelectorAll('.flow-step-row')].map(r => r.dataset.id);
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const res = await fetch('/api/registration-flow/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ stepIds: newOrder }),
          });
          const data = await res.json();
          if (data.success) {
            showFlowToast('Urutan berhasil diperbarui.', 'success');
          } else {
            showFlowToast('Gagal memperbarui urutan.', 'error');
          }
        } catch (err) {
          showFlowToast('Gagal memperbarui urutan: ' + err.message, 'error');
        }
      });
    });
  }

  function setupFlowDropdownClose() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.flow-action-dropdown')) {
        window.closeAllFlowDropdowns();
      }
    });
  }

  window.toggleFlowDropdown = function (btn) {
    const allMenus = document.querySelectorAll('.flow-action-menu');
    const thisMenu = btn.nextElementSibling;
    allMenus.forEach(m => { if (m !== thisMenu) m.style.display = 'none'; });
    thisMenu.style.display = thisMenu.style.display === 'block' ? 'none' : 'block';
  };

  window.closeAllFlowDropdowns = function () {
    document.querySelectorAll('.flow-action-menu').forEach(m => m.style.display = 'none');
  };

  window.toggleFlowStepStatus = async function (id, newStatus) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`/api/registration-flow/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showFlowToast(data.message || 'Status berhasil diperbarui.', 'success');
        await loadFlowStepsTable();
      } else {
        showFlowToast(data.message || 'Gagal mengubah status.', 'error');
      }
    } catch (e) {
      showFlowToast('Gagal: ' + e.message, 'error');
    }
  };

  window.deleteFlowStep = async function (id, title) {
    if (!confirm(`Hapus langkah "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`/api/registration-flow/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showFlowToast('Langkah berhasil dihapus.', 'success');
        await loadFlowStepsTable();
      } else {
        showFlowToast(data.message || 'Gagal menghapus.', 'error');
      }
    } catch (e) {
      showFlowToast('Gagal: ' + e.message, 'error');
    }
  };

  // ICON options for dropdown
  const FLOW_ICON_OPTIONS = [
    { value: 'fa-user-plus', label: 'Buat Akun' },
    { value: 'fa-school', label: 'Pilih Jenjang' },
    { value: 'fa-money-bill-wave', label: 'Pembayaran' },
    { value: 'fa-folder-open', label: 'Upload Berkas' },
    { value: 'fa-graduation-cap', label: 'Ujian/Wisuda' },
    { value: 'fa-diagram-project', label: 'Alur' },
    { value: 'fa-check-circle', label: 'Selesai' },
    { value: 'fa-clock', label: 'Waktu' },
    { value: 'fa-file-signature', label: 'Tanda Tangan' },
    { value: 'fa-id-card', label: 'Identitas' },
    { value: 'fa-envelope', label: 'Email' },
    { value: 'fa-phone', label: 'Telepon' },
    { value: 'fa-building', label: 'Gedung' },
    { value: 'fa-calendar-check', label: 'Jadwal' },
    { value: 'fa-award', label: 'Penghargaan' },
  ];

  async function renderFlowStepFormView(stepId) {
    const main = document.getElementById('main-content');
    if (!main) return;
    const isEdit = !!stepId;
    let stepData = null;

    if (isEdit) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`/api/registration-flow/${stepId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success) stepData = d.data;
      } catch (e) {
        console.error('Error loading step:', e);
      }
    }

    const iconOptions = FLOW_ICON_OPTIONS.map(opt =>
      `<option value="${opt.value}" ${stepData?.icon === opt.value ? 'selected' : ''}>${opt.label} (${opt.value})</option>`
    ).join('');

    main.innerHTML = `
      <div style="max-width: 680px; margin: 0 auto; padding: 32px 20px;">
        <!-- Breadcrumb -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 22px; font-size: 0.85rem; color: var(--text-muted);">
          <a href="#homepage-flow" style="color: var(--primary-600); text-decoration: none; font-weight: 600;">Alur Pendaftaran</a>
          <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem;"></i>
          <span style="color: var(--text-heading); font-weight: 700;">${isEdit ? 'Edit Langkah' : 'Tambah Langkah Baru'}</span>
        </div>

        <h1 style="font-size: 1.45rem; font-weight: 800; color: var(--text-heading); margin: 0 0 24px 0; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-${isEdit ? 'pen-to-square' : 'plus'}" style="color: #0284c7;"></i>
          ${isEdit ? 'Edit Langkah Alur' : 'Tambah Langkah Alur'}
        </h1>

        <form id="flow-step-form" onsubmit="window.submitFlowStepForm(event, '${stepId || ''}')">
          <!-- Card: Info Langkah -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-heading); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
              <i class="fa-solid fa-circle-1" style="color: #0284c7;"></i> Informasi Langkah
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Nomor Langkah <span style="color:#ef4444;">*</span></label>
                <input type="text" name="stepNumber" placeholder="01" maxlength="10" required
                  value="${escapeHtml(stepData?.stepNumber || '')}"
                  style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-body); color: var(--text-main); font-size: 0.9rem; font-weight: 700; box-sizing: border-box; outline: none; transition: border 0.2s;"
                  onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='var(--border-subtle)'">
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Warna Badge</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="color" name="badgeColor" value="${stepData?.badgeColor || '#0284c7'}"
                    style="width: 44px; height: 44px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; padding: 2px; background: var(--bg-body);">
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Warna ikon & badge</span>
                </div>
              </div>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Judul Langkah <span style="color:#ef4444;">*</span></label>
              <input type="text" name="title" placeholder="Contoh: Buat Akun PSB" maxlength="255" required
                value="${escapeHtml(stepData?.title || '')}"
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-body); color: var(--text-main); font-size: 0.9rem; box-sizing: border-box; outline: none; transition: border 0.2s;"
                onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='var(--border-subtle)'">
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Deskripsi <span style="color:#ef4444;">*</span></label>
              <textarea name="description" rows="3" placeholder="Jelaskan langkah ini secara singkat..." required
                style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-body); color: var(--text-main); font-size: 0.9rem; box-sizing: border-box; outline: none; resize: vertical; transition: border 0.2s;"
                onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='var(--border-subtle)'">${escapeHtml(stepData?.description || '')}</textarea>
            </div>
          </div>

          <!-- Card: Tampilan & Pengaturan -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-heading); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
              <i class="fa-solid fa-circle-2" style="color: #0284c7;"></i> Tampilan & Pengaturan
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Icon</label>
                <select name="icon"
                  style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-body); color: var(--text-main); font-size: 0.88rem; box-sizing: border-box; outline: none; cursor: pointer; transition: border 0.2s;"
                  onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='var(--border-subtle)'">
                  ${iconOptions}
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Urutan Tampil</label>
                <input type="number" name="sortOrder" min="1" max="100" placeholder="Auto"
                  value="${stepData?.sortOrder || ''}"
                  style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-body); color: var(--text-main); font-size: 0.9rem; box-sizing: border-box; outline: none; transition: border 0.2s;"
                  onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='var(--border-subtle)'">
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Status</label>
              <div style="display: flex; gap: 12px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px 18px; border: 2px solid ${(!stepData || stepData.isActive) ? '#0284c7' : 'var(--border-subtle)'}; border-radius: 10px; background: ${(!stepData || stepData.isActive) ? 'rgba(2,132,199,0.06)' : 'var(--bg-body)'}; transition: all 0.2s;">
                  <input type="radio" name="isActive" value="true" ${(!stepData || stepData.isActive) ? 'checked' : ''} style="accent-color: #0284c7;"> 
                  <span style="font-weight: 700; color: var(--text-heading); font-size: 0.9rem;">Aktif</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px 18px; border: 2px solid ${(stepData && !stepData.isActive) ? '#94a3b8' : 'var(--border-subtle)'}; border-radius: 10px; background: ${(stepData && !stepData.isActive) ? 'rgba(148,163,184,0.06)' : 'var(--bg-body)'}; transition: all 0.2s;">
                  <input type="radio" name="isActive" value="false" ${(stepData && !stepData.isActive) ? 'checked' : ''} style="accent-color: #94a3b8;">
                  <span style="font-weight: 700; color: var(--text-muted); font-size: 0.9rem;">Nonaktif</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end; margin-top: 8px;">
            <a href="#homepage-flow" style="padding: 10px 20px; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-main); font-weight: 700; font-size: 0.88rem; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-body)'" onmouseout="this.style.background=''">
              Batal
            </a>
            <button type="submit" id="flow-form-submit-btn"
              style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 26px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(2,132,199,0.3); transition: all 0.2s;">
              <i class="fa-solid fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Simpan Perubahan' : 'Tambah Langkah'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  window.renderFlowStepFormView = renderFlowStepFormView;

  window.submitFlowStepForm = async function (event, stepId) {
    event.preventDefault();
    const form = document.getElementById('flow-step-form');
    const btn = document.getElementById('flow-form-submit-btn');
    if (!form || !btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    const fd = new FormData(form);
    const payload = {
      stepNumber: fd.get('stepNumber'),
      title: fd.get('title'),
      description: fd.get('description'),
      icon: fd.get('icon'),
      badgeColor: fd.get('badgeColor'),
      isActive: fd.get('isActive') === 'true',
      sortOrder: fd.get('sortOrder') ? parseInt(fd.get('sortOrder')) : undefined,
    };

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const isEdit = !!stepId;
      const url = isEdit ? `/api/registration-flow/${stepId}` : '/api/registration-flow';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showFlowToast(data.message || (isEdit ? 'Langkah berhasil diperbarui.' : 'Langkah berhasil ditambahkan.'), 'success');
        window.location.hash = '#homepage-flow';
      } else {
        showFlowToast(data.message || 'Terjadi kesalahan.', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-${isEdit ? 'save' : 'plus'}"></i> ${isEdit ? 'Simpan Perubahan' : 'Tambah Langkah'}`;
      }
    } catch (e) {
      showFlowToast('Gagal: ' + e.message, 'error');
      btn.disabled = false;
    }
  };

  function showFlowToast(message, type = 'success') {
    const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0284c7';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation';
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: var(--bg-card); border: 1px solid ${color}44; border-left: 4px solid ${color};
      border-radius: 12px; padding: 14px 20px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      display: flex; align-items: center; gap: 10px;
      font-size: 0.88rem; font-weight: 600; color: var(--text-heading);
      animation: slideInRight 0.3s ease; max-width: 340px;
    `;
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
  }

  // ==========================================================================
  // PUBLIC EXPORT UNTUK ROUTING #homepage-flow
  // ==========================================================================
  window.renderRegistrationFlowAdminView = function () {
    renderRegistrationFlowListView();
  };

})();
