/**
 * ============================================================================
 * PSB Maskumambang - UNIFIED FRONTEND ENGINE & UI/UX PARITY SUITE
 * ============================================================================
 */

/**
 * Safe localStorage wrapper - handles Safari Private Mode SecurityError
 */
const safeStorage = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) { }
  },
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
window.escapeHtml = escapeHtml;

// Global Application State
const state = {
  token: null, // Token dikelola via HttpOnly Cookie oleh server, tidak disimpan di JS
  user: (() => { try { return JSON.parse(safeStorage.getItem('lomba_user_data') || 'null'); } catch (e) { return null; } })(),
  settings: {},
  competitionTree: [],
  paymentAccounts: [],
  theme: safeStorage.getItem('lomba_theme') || 'light',
  scanner: null,
  activeRoute: 'overview',
  routeParams: null,
};


// ============================================================================
// THEME MANAGER (LIGHT MODE DEFAULT + DARK MODE SWITCHER)
// ============================================================================
function initTheme() {
  const savedTheme = safeStorage.getItem('lomba_theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  safeStorage.setItem('lomba_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    if (theme === 'dark') {
      themeBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i> <span>Light</span>';
    } else {
      themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Dark</span>';
    }
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// ============================================================================
// AUTH & API UTILITIES
// ============================================================================
function setSession(token, user) {
  state.token = token;
  state.user = user;
  if (user) {
    safeStorage.setItem('lomba_user_data', JSON.stringify(user));
  }
  if (token) {
    safeStorage.setItem('lomba_jwt_token', token);
  }
}

function saveSession(user, token) {
  setSession(token, user);
}

function clearSession() {
  state.token = null;
  state.user = null;
  safeStorage.removeItem('lomba_jwt_token');
  safeStorage.removeItem('lomba_user_data');
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e) { }
  clearSession();
  window.location.href = '/login.html';
}

async function apiRequest(endpoint, options = {}) {
  // Support overload: apiRequest(endpoint, method, body, customHeaders)
  if (typeof options === 'string') {
    const method = options;
    const body = arguments[2];
    const customHeaders = arguments[3] || {};
    options = {
      method,
      body,
      headers: customHeaders,
    };
  }

  const headers = options.headers || {};

  // Kirim Authorization header jika token tersedia di memory atau storage
  const token = state.token || safeStorage.getItem('lomba_jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  options.headers = headers;
  // Penting: kirim cookie sesi HttpOnly secara otomatis di setiap request
  options.credentials = 'include';

  try {
    const response = await fetch(endpoint, options);
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      if (window.location.pathname.includes('dashboard')) {
        clearSession();
        window.location.href = '/login.html';
      }
    }

    if (!response.ok) {
      const errorMsg = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || `Error ${response.status}: Permintaan gagal.`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Disetujui</span>';
    case 'PAYMENT_REJECTED':
      return '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Pembayaran Ditolak</span>';
    case 'WAITING_VERIFICATION':
    default:
      return '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Menunggu Verifikasi</span>';
  }
}

function getCheckInBadge(checkInRecord) {
  if (checkInRecord) {
    return `<span class="badge badge-success"><i class="fa-solid fa-user-check"></i> SUDAH CHECK-IN (${formatDate(checkInRecord.checkInTime)})</span>`;
  }
  return '<span class="badge badge-secondary" style="background: rgba(100, 116, 139, 0.2); color: var(--text-muted);"><i class="fa-solid fa-hourglass-start"></i> BELUM CHECK-IN</span>';
}

function showBannerAlert(elementId, message, type = 'success') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = 'block';
  el.className = type === 'success' ? 'alert alert-success' : 'alert alert-danger';
  el.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div><i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${message}</div>
      <button type="button" onclick="this.closest('.alert').style.display='none'" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit;">&times;</button>
    </div>
  `;
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
window.showGlobalAlert = showToast;

// Global Modal Helpers
function openModal(title = '', bodyHtml = '', sizeClass = '') {
  let modal = document.getElementById('app-modal');
  let body = document.getElementById('app-modal-body');

  // If passed an element id directly and no bodyHtml
  if (typeof title === 'string' && title && !bodyHtml && document.getElementById(title)) {
    const el = document.getElementById(title);
    if (el !== body) {
      modal = el;
      modal.classList.add('active', 'open', 'show');
      modal.style.display = 'flex';
      return;
    }
  }

  if (!modal || !body) return;

  if (sizeClass === 'modal-xl') {
    body.style.maxWidth = '960px';
  } else if (sizeClass === 'modal-lg') {
    body.style.maxWidth = '750px';
  } else if (sizeClass) {
    body.style.maxWidth = sizeClass;
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

function closeModal(modalId = 'app-modal') {
  const modal = (modalId && typeof modalId === 'string' && document.getElementById(modalId)) || document.getElementById('app-modal');
  if (modal) {
    modal.classList.remove('active', 'open', 'show');
    modal.style.display = 'none';
  }
}
window.closeModal = closeModal;

function openAppModal(contentHtml) {
  const modal = document.getElementById('app-modal');
  const body = document.getElementById('app-modal-body');
  if (modal && body) {
    body.style.maxWidth = '550px';
    body.innerHTML = contentHtml;
    modal.classList.add('active', 'open', 'show');
    modal.style.display = 'flex';
  }
}
window.openAppModal = openAppModal;

function closeAppModal() {
  closeModal();
}
window.closeAppModal = closeAppModal;

document.addEventListener('click', (e) => {
  const modal = document.getElementById('app-modal');
  if (modal && e.target === modal) {
    closeAppModal();
  }
});

// Load App Branding onto Header, Sidebar, Footer & Favicon
async function loadBrandingInfo() {
  try {
    const res = await apiRequest('/api/settings');
    if (res.success && res.data) {
      state.settings = res.data;
      window.appSettings = res.data;
      const appName = res.data.application_name || 'PSB Maskumambang';
      const shortName = res.data.application_short_name || appName;

      // Update element teks judul aplikasi di seluruh halaman
      document.querySelectorAll('#nav-title, #footer-title, #auth-app-title, #sidebar-title, #topbar-event-name, .brand-title, .system-title, .app-brand-title').forEach(el => {
        el.innerText = shortName;
      });
      document.querySelectorAll('#hero-title').forEach(el => el.innerText = appName);

      // Update subtitle & deskripsi
      if (res.data.application_description) {
        document.querySelectorAll('#hero-desc, #footer-desc, .app-description').forEach(el => el.innerText = res.data.application_description);
      }
      document.querySelectorAll('.brand-subtitle').forEach(el => {
        el.innerText = 'Portal Resmi PSB';
      });

      // Update document.title dinamis di semua halaman
      if (document.title) {
        if (document.title.includes(' - ')) {
          const pageName = document.title.split(' - ')[0].trim();
          document.title = `${pageName} - ${shortName}`;
        } else {
          document.title = shortName;
        }
      }

      // Update logo
      if (res.data.application_logo) {
        const rawLogo = res.data.application_logo;
        const logoUrl = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/'))
          ? rawLogo
          : `/static/img/${rawLogo}`;
        document.querySelectorAll('#nav-logo, #sidebar-logo, #auth-logo, .brand-logo-img, .brand-img').forEach(el => {
          el.src = logoUrl;
        });
      }

      // Update favicon
      if (res.data.application_favicon) {
        let favEl = document.querySelector("link[rel*='icon']");
        if (!favEl) {
          favEl = document.createElement('link');
          favEl.rel = 'shortcut icon';
          document.head.appendChild(favEl);
        }
        favEl.href = `/static/img/${res.data.application_favicon}`;
      }
    }
  } catch (e) {
    console.error('Branding load error:', e);
  }
}

// ============================================================================
// ============================================================================
// UNIVERSAL TABLE ENGINE & EXCEL/CSV EXPORT UTILITY
// ============================================================================
function exportTableDataToExcel(filename, columns, data) {
  if (!data || !data.length) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  // Filter out action columns
  const exportCols = columns.filter(c => !c.sticky && c.header !== 'Aksi');

  // Header row
  const headers = exportCols.map(c => `"${(c.header || '').replace(/"/g, '""')}"`);

  // Data rows
  const rows = data.map((item, idx) => {
    return exportCols.map(col => {
      let val = '';
      if (typeof col.exportValue === 'function') {
        val = col.exportValue(item, idx);
      } else if (col.key && item[col.key] !== undefined) {
        val = item[col.key];
      } else if (typeof col.render === 'function') {
        const rendered = col.render(item);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rendered;
        val = tempDiv.textContent || tempDiv.innerText || '';
      }
      val = (val === null || val === undefined) ? '' : String(val).trim();
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

window.tableColFilters = window.tableColFilters || {};

function onUniversalTableColFilterChange(tableId, colIdentifier, value) {
  window.tableColFilters[tableId] = window.tableColFilters[tableId] || {};
  window.tableColFilters[tableId][colIdentifier] = value;

  const tableRenderMap = {
    'peserta-regs-table': { state: typeof tableState !== 'undefined' ? tableState?.pesertaRegs : null, fn: typeof renderPesertaRegistrationsTable === 'function' ? renderPesertaRegistrationsTable : null },
    'bendahara-payments-table': { state: typeof tableState !== 'undefined' ? tableState?.bendaharaPayments : null, fn: typeof renderBendaharaPaymentsTable === 'function' ? renderBendaharaPaymentsTable : null },
    'admin-registrations-table': { state: typeof tableState !== 'undefined' ? tableState?.adminRegistrations : null, fn: typeof renderAdminRegistrationsTable === 'function' ? renderAdminRegistrationsTable : null },
    'admin-users-table': { state: typeof tableState !== 'undefined' ? tableState?.adminUsers : null, fn: typeof renderAdminUsersTable === 'function' ? renderAdminUsersTable : null },
    'admin-audit-table': { state: typeof tableState !== 'undefined' ? tableState?.adminAudit : null, fn: typeof renderAdminAuditTable === 'function' ? renderAdminAuditTable : null },
  };

  const target = tableRenderMap[tableId];
  if (target) {
    if (target.state) target.state.page = 1;
    if (typeof target.fn === 'function') target.fn();
  }
}
window.onUniversalTableColFilterChange = onUniversalTableColFilterChange;

function renderUniversalTable({
  tableId,
  columns,
  data,
  searchQuery = '',
  searchFields = [],
  sortKey = '',
  sortDir = 'asc',
  filterKey = '',
  filterValue = '',
  filterOptions = [],
  currentPage = 1,
  pageSize = 10,
  onPageChangeName = 'onTablePageChange',
  onSearchChangeName = 'onTableSearchChange',
  onPageSizeChangeName = 'onTablePageSizeChange',
  onSortChangeName = '',
  onFilterChangeName = '',
  exportFilename = '',
  onExportName = '',
  emptyMessage = 'Belum ada data.',
}) {
  // 1. Filter data by global dropdown filter if provided
  let filtered = data;
  if (filterKey && filterValue) {
    filtered = filtered.filter(item => {
      const val = typeof filterKey === 'function' ? filterKey(item) : item[filterKey];
      return String(val) === String(filterValue);
    });
  }

  // 1.5 Filter data by per-column header filters
  const currentColFilters = (window.tableColFilters && window.tableColFilters[tableId]) ? window.tableColFilters[tableId] : {};
  const activeColKeys = Object.keys(currentColFilters).filter(k => currentColFilters[k] && currentColFilters[k].trim() !== '');
  if (activeColKeys.length > 0) {
    filtered = filtered.filter(item => {
      return activeColKeys.every(k => {
        const query = currentColFilters[k].toLowerCase().trim();
        const colDef = columns.find((c, idx) => (c.key || c.sortKey || c.header || String(idx)) === k);
        if (!colDef) return true;

        let cellVal = '';
        if (colDef.sortValue) {
          cellVal = String(colDef.sortValue(item) || '');
        } else if (colDef.key && item[colDef.key] !== undefined && item[colDef.key] !== null) {
          cellVal = String(item[colDef.key]);
        } else if (typeof colDef.render === 'function') {
          const rendered = colDef.render(item);
          const temp = document.createElement('div');
          temp.innerHTML = rendered;
          cellVal = temp.textContent || temp.innerText || '';
        }
        return cellVal.toLowerCase().includes(query);
      });
    });
  }

  // 2. Filter data by search query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => {
      return searchFields.some(field => {
        const val = typeof field === 'function' ? field(item) : item[field];
        return val && String(val).toLowerCase().includes(q);
      });
    });
  }

  // 3. Sort data if sortKey is provided
  if (sortKey) {
    const colDef = columns.find(c => (c.sortKey || c.key || c.header) === sortKey);
    filtered = [...filtered].sort((a, b) => {
      let valA = colDef && colDef.sortValue ? colDef.sortValue(a) : (colDef?.key ? a[colDef.key] : a[sortKey]);
      let valB = colDef && colDef.sortValue ? colDef.sortValue(b) : (colDef?.key ? b[colDef.key] : b[sortKey]);
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // 4. Pagination calculation
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const startDisplay = total === 0 ? 0 : startIdx + 1;
  const endDisplay = Math.min(startIdx + pageSize, total);

  // If container already in DOM, perform live in-place update of tbody and pagination
  const tbodyEl = document.getElementById(`${tableId}-tbody`);
  const pagEl = document.getElementById(`${tableId}-pagination`);

  const tbodyHtml = pageItems.length === 0 ? `
    <tr>
      <td colspan="${columns.length}" style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-folder-open" style="font-size: 1.8rem; margin-bottom: 8px; display: block; color: var(--text-dim);"></i>
        ${emptyMessage}
      </td>
    </tr>
  ` : pageItems.map(item => `
    <tr style="border-bottom: 1px solid var(--border-subtle); transition: var(--transition-fast);">
      ${columns.map(col => `
        <td class="${col.sticky ? 'sticky-action' : ''}" style="padding: 12px 14px; vertical-align: middle;${col.sticky ? ' border-left: 1px solid var(--border-subtle);' : ''}">
          ${col.render ? col.render(item) : (item[col.key] || '-')}
        </td>
      `).join('')}
    </tr>
  `).join('');

  const pagHtml = `
    <div style="font-size: 0.85rem; color: var(--text-muted);">
      Menampilkan <strong>${startDisplay}</strong> - <strong>${endDisplay}</strong> dari <strong>${total}</strong> data
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 10px;" ${safePage <= 1 ? 'disabled' : ''} onclick="${onPageChangeName}(${safePage - 1})">
        <i class="fa-solid fa-chevron-left"></i> Prev
      </button>
      <span style="font-size: 0.85rem; font-weight: 700; padding: 0 8px; color: var(--text-heading);">
        Halaman ${safePage} dari ${totalPages}
      </span>
      <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 10px;" ${safePage >= totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${safePage + 1})">
        Next <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;

  if (tbodyEl && pagEl) {
    tbodyEl.innerHTML = tbodyHtml;
    pagEl.innerHTML = pagHtml;
    return '';
  }

  // Full initial HTML markup
  return `
    <div id="${tableId}-container" class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
      <div class="table-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;">Tampilkan</span>
            <select style="width: auto !important; min-width: 75px; display: inline-block; padding: 7px 10px; font-size: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); cursor: pointer;" onchange="${onPageSizeChangeName}(parseInt(this.value, 10))">
              <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
            </select>
            <span style="font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;">baris</span>
          </div>

          ${filterOptions && filterOptions.length > 0 && onFilterChangeName ? `
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;"><i class="fa-solid fa-filter"></i> Filter:</span>
              <select style="width: auto !important; min-width: 170px; max-width: 250px; display: inline-block; padding: 7px 12px; font-size: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); cursor: pointer;" onchange="${onFilterChangeName}(this.value)">
                ${filterOptions.map(opt => `<option value="${opt.value}" ${filterValue === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${(exportFilename || onExportName) ? `
            <button type="button" onclick="${onExportName ? `${onExportName}()` : `exportTableDataToExcel('${exportFilename || tableId}', [], [])`}" style="padding: 7px 10px; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--success-500); color: var(--success-600); background: transparent; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s;" title="Ekspor ke Excel / CSV" onmouseover="this.style.background='var(--success-50)'" onmouseout="this.style.background='transparent'">
              <i class="fa-solid fa-file-excel"></i>
            </button>
          ` : ''}

          <div style="position: relative; width: 100%; min-width: 240px; max-width: 280px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 0.85rem;"></i>
            <input type="text" id="${tableId}-search-input" placeholder="Cari data di tabel..." value="${searchQuery}" oninput="${onSearchChangeName}(this.value)" style="width: 100%; padding: 8px 12px 8px 34px; font-size: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);">
          </div>
        </div>
      </div>

      <div class="table-responsive" style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow-x: auto; background: var(--bg-card); position: relative;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; min-width: 600px;">
          <thead>
            <tr style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-subtle);">
              ${columns.map(col => {
    const targetKey = col.sortKey || col.key || col.header;
    const isSortable = col.sortable !== false && onSortChangeName;
    const isCurrentSort = sortKey === targetKey;
    return `
                  <th class="${col.sticky ? 'sticky-action' : ''}" style="padding: 12px 14px; font-weight: 700; color: var(--text-muted); white-space: nowrap; ${col.width ? `width:${col.width};` : ''} ${col.sticky ? 'border-left: 1px solid var(--border-subtle);' : ''} ${isSortable ? 'cursor: pointer; user-select: none;' : ''}" ${isSortable ? `onclick="${onSortChangeName}('${targetKey}')" title="Klik untuk mengurutkan kolom"` : ''}>
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                      <span>${col.header}</span>
                      ${isSortable ? `
                        <span style="font-size: 0.75rem; color: ${isCurrentSort ? 'var(--primary-600)' : 'var(--text-dim)'}; font-weight: 800;">
                          ${isCurrentSort ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      ` : ''}
                    </div>
                  </th>
                `;
  }).join('')}
            </tr>
            <tr style="background: var(--bg-body); border-bottom: 2px solid var(--border-subtle);">
              ${columns.map((col, idx) => {
    const colIdentifier = col.key || col.sortKey || col.header || String(idx);
    const isFilterable = col.filterable !== false && !col.sticky && col.header !== 'Aksi' && col.header !== '#' && col.header !== 'No' && !String(col.header).includes('checkbox');
    const currentVal = (currentColFilters[colIdentifier] || '').replace(/"/g, '&quot;');

    if (!isFilterable) {
      return `<th class="${col.sticky ? 'sticky-action' : ''}" style="padding: 4px 6px; ${col.sticky ? 'border-left: 1px solid var(--border-subtle);' : ''}"></th>`;
    }

    const cleanHeaderTitle = String(col.header).replace(/<[^>]*>?/gm, '').trim() || 'kolom';
    return `
                  <th style="padding: 4px 6px; vertical-align: middle;">
                    <div style="position: relative; display: flex; align-items: center;">
                      <input 
                        type="text" 
                        placeholder="Filter..." 
                        value="${currentVal}"
                        oninput="onUniversalTableColFilterChange('${tableId}', '${colIdentifier}', this.value)"
                        style="width: 100%; min-width: 60px; padding: 4px 6px; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main);"
                        title="Filter ${cleanHeaderTitle}"
                      >
                    </div>
                  </th>
                `;
  }).join('')}
            </tr>
          </thead>
          <tbody id="${tableId}-tbody">
            ${tbodyHtml}
          </tbody>
        </table>
      </div>

      <div id="${tableId}-pagination" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 12px;">
        ${pagHtml}
      </div>
    </div>
  `;
}

// ============================================================================
// DASHBOARD INITIALIZATION & HASH ROUTING
// ============================================================================
async function initDashboardApp() {
  const savedToken = safeStorage.getItem('lomba_jwt_token');
  if (savedToken) {
    state.token = savedToken;
  }
  const savedUser = safeStorage.getItem('lomba_user_data');
  if (savedUser) {
    try { state.user = JSON.parse(savedUser); } catch (e) { }
  }

  // Coba verifikasi profil sesi
  try {
    const profile = await apiRequest('/api/users/profile');
    if (!profile || !profile.id) {
      clearSession();
      window.location.href = '/login.html';
      return;
    }
    state.user = profile;
    safeStorage.setItem('lomba_user_data', JSON.stringify(profile));
  } catch (e) {
    clearSession();
    window.location.href = '/login.html';
    return;
  }

  // 2. Load Master Tree, Settings, and Payment Accounts
  try {
    const [settingsRes, accountsRes, treeRes] = await Promise.all([
      apiRequest('/api/settings'),
      apiRequest('/api/payments/accounts'),
      apiRequest('/api/competitions/tree'),
    ]);
    if (settingsRes.success) state.settings = settingsRes.data;
    if (accountsRes.success) state.paymentAccounts = accountsRes.data;
    if (treeRes.success) state.competitionTree = treeRes.data;
    await loadBrandingInfo();
  } catch (e) {
    console.error('Initial data load error:', e);
  }

  // 3. Update User Header & Sidebar Labels
  const user = state.user;
  document.querySelectorAll('#sidebar-username, #topbar-username').forEach(el => el.innerText = user.name);
  document.querySelectorAll('#sidebar-avatar').forEach(el => el.innerText = user.name.charAt(0).toUpperCase());
  document.querySelectorAll('#sidebar-role-badge, #topbar-role-badge').forEach(el => {
    el.innerText = user.role;
    el.className = `role-badge-pill role-${user.role}`;
  });

  // 4. Build Sidebar Menu
  buildRoleSidebar(user.role);

  // 5. Setup CTA button on Topbar
  const topbarCta = document.getElementById('topbar-cta-container');
  if (topbarCta) {
    if (user.role === 'PESERTA') {
      topbarCta.innerHTML = '<a href="#formulir" class="btn btn-sm btn-primary"><i class="fa-solid fa-file-signature"></i> Formulir Pendaftaran</a>';
    } else if (user.role === 'BENDAHARA' || user.role === 'SUPER_ADMIN') {
      topbarCta.innerHTML = '<a href="#checkin-scanner" class="btn btn-sm btn-secondary"><i class="fa-solid fa-qrcode"></i> Scanner QR</a>';
    } else if (user.role === 'ADMIN_BARCODE') {
      topbarCta.innerHTML = '<a href="#checkin-scanner" class="btn btn-sm btn-primary"><i class="fa-solid fa-qrcode"></i> Scanner QR</a>';
    }
  }

  // 6. Setup Router Listener
  window.addEventListener('hashchange', handleDashboardRoute);
  handleDashboardRoute();
}

function toggleNavGroup(groupId) {
  const header = document.getElementById(`nav-group-header-${groupId}`);
  const content = document.getElementById(`nav-group-content-${groupId}`);
  if (!header || !content) return;

  const isOpen = header.classList.toggle('open');
  content.classList.toggle('open', isOpen);

  try {
    const saved = JSON.parse(localStorage.getItem('psb_nav_groups') || '{}');
    saved[groupId] = isOpen;
    localStorage.setItem('psb_nav_groups', JSON.stringify(saved));
  } catch (e) { }
}
window.toggleNavGroup = toggleNavGroup;

function buildRoleSidebar(role) {
  const menu = document.getElementById('sidebar-nav-menu');
  if (!menu) return;

  // Retrieve saved group states from localStorage
  let savedGroups = { 'homepage': true, 'master-psb': true, 'cbt': true, 'interview': true, 'system': false };
  try {
    const raw = localStorage.getItem('psb_nav_groups');
    if (raw) savedGroups = { ...savedGroups, ...JSON.parse(raw) };
  } catch (e) { }

  if (role === 'PESERTA') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU CALON SISWA</div>
      <a href="#overview" id="nav-overview" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-house"></i></span><span class="nav-label">Dashboard Saya</span></a>
      <a href="#formulir" id="nav-formulir" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-file-signature"></i></span><span class="nav-label">Formulir Pendaftaran</span></a>
      <a href="#cbt-peserta" id="nav-cbt-peserta" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-laptop-code"></i></span><span class="nav-label">Ujian Online CBT</span></a>
      <a href="#panduan" id="nav-panduan" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-book-open"></i></span><span class="nav-label">Panduan</span></a>
      <div class="nav-section-title">AKUN SAYA</div>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>
      <a href="javascript:void(0)" onclick="handleLogout()" class="sidebar-nav-item logout-item"><span class="nav-icon"><i class="fa-solid fa-door-open"></i></span><span class="nav-label">Keluar</span></a>
    `;
  } else if (role === 'BENDAHARA') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU BENDAHARA</div>
      <a href="#overview" id="nav-overview" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="nav-label">Dashboard</span></a>
      <a href="#verifikasi-pembayaran" id="nav-verifikasi-pembayaran" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-credit-card"></i></span><span class="nav-label">Verifikasi Pembayaran</span></a>
      <a href="#checkin-scanner" id="nav-checkin-scanner" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-qrcode"></i></span><span class="nav-label">Check-In Scanner</span></a>
      <div class="nav-section-title">AKUN SAYA</div>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>
      <a href="javascript:void(0)" onclick="handleLogout()" class="sidebar-nav-item logout-item"><span class="nav-icon"><i class="fa-solid fa-door-open"></i></span><span class="nav-label">Keluar</span></a>
    `;
  } else if (role === 'SUPER_ADMIN') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU UTAMA</div>
      <a href="#overview" id="nav-overview" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="nav-label">Dashboard</span></a>
      <a href="#verifikasi-data" id="nav-verifikasi-data" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-user-check"></i></span><span class="nav-label">Verifikasi Berkas Santri</span></a>
      <a href="#cbt-verification" id="nav-cbt-verification" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-clipboard-check"></i></span><span class="nav-label">Verifikasi CBT</span></a>
      <a href="#verifikasi-final" id="nav-verifikasi-final" class="sidebar-nav-item" style="border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.08);"><span class="nav-icon" style="color: #10b981;"><i class="fa-solid fa-award"></i></span><span class="nav-label" style="color: #ffffff; font-weight: 700;">Verifikasi Final</span><span class="badge" style="background: #10b981; color:#ffffff; font-size:0.62rem; font-weight: 800; padding:2px 6px; border-radius:4px; margin-left:auto;">FINAL</span></a>
      <a href="#daftar-peserta" id="nav-daftar-peserta" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-clipboard-list"></i></span><span class="nav-label">Daftar Calon Siswa</span></a>
      <a href="#verifikasi-pembayaran" id="nav-verifikasi-pembayaran" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-credit-card"></i></span><span class="nav-label">Pembayaran</span></a>
      <a href="#checkin-scanner" id="nav-checkin-scanner" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-qrcode"></i></span><span class="nav-label">Check-In QR</span></a>
      <a href="#cetak-kartu" id="nav-cetak-kartu" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-print"></i></span><span class="nav-label">Cetak Bukti Pendaftaran</span></a>

      <!-- COLLAPSIBLE GROUP: HOMEPAGE / PENGATURAN WEBSITE -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['homepage'] ? 'open' : ''}" id="nav-group-header-homepage" onclick="toggleNavGroup('homepage')">
          <span class="nav-group-title"><i class="fa-solid fa-globe" style="color: #38bdf8;"></i> HOMEPAGE</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['homepage'] ? 'open' : ''}" id="nav-group-content-homepage">
          <a href="#homepage-hero-slider" id="nav-homepage-hero-slider" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-images"></i></span><span class="nav-label">Hero Slider</span></a>
          <a href="#homepage-info" id="nav-homepage-info" class="sidebar-nav-item" onclick="alert('Fitur Informasi Singkat akan segera hadir.'); return false;"><span class="nav-icon"><i class="fa-solid fa-circle-info"></i></span><span class="nav-label">Informasi Singkat</span></a>
          <a href="#countdown-settings" id="nav-countdown-settings" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-stopwatch"></i></span><span class="nav-label">Countdown Pendaftaran</span></a>
          <a href="#homepage-announcements" id="nav-homepage-announcements" class="sidebar-nav-item" onclick="alert('Fitur Pengumuman Homepage akan segera hadir.'); return false;"><span class="nav-icon"><i class="fa-solid fa-bullhorn"></i></span><span class="nav-label">Pengumuman Homepage</span></a>
          <a href="#homepage-flow" id="nav-homepage-flow" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-route"></i></span><span class="nav-label">Alur Pendaftaran</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: MASTER DATA PSB -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['master-psb'] ? 'open' : ''}" id="nav-group-header-master-psb" onclick="toggleNavGroup('master-psb')">
          <span class="nav-group-title"><i class="fa-solid fa-database" style="color: #60a5fa;"></i> MASTER DATA PSB</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['master-psb'] ? 'open' : ''}" id="nav-group-content-master-psb">
          <a href="#master-periode" id="nav-master-periode" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-calendar-days"></i></span><span class="nav-label">Periode TP</span></a>
          <a href="#master-gelombang" id="nav-master-gelombang" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-water"></i></span><span class="nav-label">Gelombang</span></a>
          <a href="#master-kategori" id="nav-master-kategori" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-sitemap"></i></span><span class="nav-label">Struktur Pendidikan</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: CBT / UJIAN ONLINE -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['cbt'] ? 'open' : ''}" id="nav-group-header-cbt" onclick="toggleNavGroup('cbt')">
          <span class="nav-group-title"><i class="fa-solid fa-laptop-code" style="color: #38bdf8;"></i> CBT / UJIAN ONLINE</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['cbt'] ? 'open' : ''}" id="nav-group-content-cbt">
          <a href="#cbt-dashboard" id="nav-cbt-dashboard" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-gauge-high"></i></span><span class="nav-label">Dashboard CBT</span></a>
          <a href="#cbt-manage" id="nav-cbt-manage" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-list-check"></i></span><span class="nav-label">Kelola Ujian & Soal</span></a>
          <a href="#cbt-results" id="nav-cbt-results" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-square-poll-vertical"></i></span><span class="nav-label">Hasil Ujian</span></a>
          <a href="#cbt-reset" id="nav-cbt-reset" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-rotate-left"></i></span><span class="nav-label">Reset Ujian Peserta</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: WAWANCARA -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['interview'] ? 'open' : ''}" id="nav-group-header-interview" onclick="toggleNavGroup('interview')">
          <span class="nav-group-title"><i class="fa-solid fa-comments" style="color: #a78bfa;"></i> WAWANCARA</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['interview'] ? 'open' : ''}" id="nav-group-content-interview">
          <a href="#interview-dashboard" id="nav-interview-dashboard" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-comments"></i></span><span class="nav-label">Dashboard Wawancara</span></a>
          <a href="#interview-schedules" id="nav-interview-schedules" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-calendar-week"></i></span><span class="nav-label">Jadwal Wawancara</span></a>
          <a href="#interview-interviewers" id="nav-interview-interviewers" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-user-tie"></i></span><span class="nav-label">Data Pewawancara</span></a>
          <a href="#interview-results" id="nav-interview-results" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-bar"></i></span><span class="nav-label">Hasil Wawancara</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: MASTER SISTEM -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['system'] ? 'open' : ''}" id="nav-group-header-system" onclick="toggleNavGroup('system')">
          <span class="nav-group-title"><i class="fa-solid fa-gears" style="color: #94a3b8;"></i> MASTER SISTEM</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['system'] ? 'open' : ''}" id="nav-group-content-system">
          <a href="#users" id="nav-users" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-users-gear"></i></span><span class="nav-label">Pengguna</span></a>
          <a href="#payment-accounts" id="nav-payment-accounts" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-building-columns"></i></span><span class="nav-label">Rekening Pembayaran</span></a>
          <a href="#branding-settings" id="nav-branding-settings" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-sliders"></i></span><span class="nav-label">Pengaturan Aplikasi</span></a>
          <a href="#countdown-settings" id="nav-countdown-settings" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-stopwatch"></i></span><span class="nav-label">Pengaturan Countdown</span></a>
        </div>
      </div>

      <div class="nav-section-title">LOG & AKUN</div>
      <a href="#audit-logs" id="nav-audit-logs" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-scroll"></i></span><span class="nav-label">Audit Log</span></a>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>

      <div class="nav-section-title">PEMELIHARAAN SISTEM</div>
      <a href="#reset-operasional" id="nav-reset-operasional" class="sidebar-nav-item danger-item" style="color: var(--danger-500);"><span class="nav-icon"><i class="fa-solid fa-triangle-exclamation"></i></span><span class="nav-label">Reset Data</span></a>
    `;
  } else if (role === 'ADMIN') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU OPERASIONAL ADMIN</div>
      <a href="#overview" id="nav-overview" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="nav-label">Dashboard Monitoring</span></a>
      <a href="#verifikasi-data" id="nav-verifikasi-data" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-user-check"></i></span><span class="nav-label">Verifikasi Berkas Santri</span></a>
      <a href="#cbt-verification" id="nav-cbt-verification" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-clipboard-check"></i></span><span class="nav-label">Verifikasi CBT</span></a>
      <a href="#verifikasi-final" id="nav-verifikasi-final" class="sidebar-nav-item" style="border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.08);"><span class="nav-icon" style="color: #10b981;"><i class="fa-solid fa-award"></i></span><span class="nav-label" style="color: #ffffff; font-weight: 700;">Verifikasi Final</span><span class="badge" style="background: #10b981; color:#ffffff; font-size:0.62rem; font-weight: 800; padding:2px 6px; border-radius:4px; margin-left:auto;">FINAL</span></a>
      <a href="#daftar-peserta" id="nav-daftar-peserta" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-clipboard-list"></i></span><span class="nav-label">Daftar Calon Siswa</span></a>
      <a href="#checkin-scanner" id="nav-checkin-scanner" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-qrcode"></i></span><span class="nav-label">Check-In QR</span></a>
      <a href="#cetak-kartu" id="nav-cetak-kartu" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-print"></i></span><span class="nav-label">Cetak Bukti Pendaftaran</span></a>

      <!-- COLLAPSIBLE GROUP: MASTER DATA PSB -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['master-psb'] ? 'open' : ''}" id="nav-group-header-master-psb" onclick="toggleNavGroup('master-psb')">
          <span class="nav-group-title"><i class="fa-solid fa-database" style="color: #60a5fa;"></i> MASTER DATA PSB</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['master-psb'] ? 'open' : ''}" id="nav-group-content-master-psb">
          <a href="#master-periode" id="nav-master-periode" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-calendar-days"></i></span><span class="nav-label">Periode TP</span></a>
          <a href="#master-gelombang" id="nav-master-gelombang" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-water"></i></span><span class="nav-label">Gelombang</span></a>
          <a href="#master-kategori" id="nav-master-kategori" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-sitemap"></i></span><span class="nav-label">Struktur Pendidikan</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: CBT / UJIAN ONLINE -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['cbt'] ? 'open' : ''}" id="nav-group-header-cbt" onclick="toggleNavGroup('cbt')">
          <span class="nav-group-title"><i class="fa-solid fa-laptop-code" style="color: #38bdf8;"></i> CBT / UJIAN ONLINE</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['cbt'] ? 'open' : ''}" id="nav-group-content-cbt">
          <a href="#cbt-dashboard" id="nav-cbt-dashboard" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-gauge-high"></i></span><span class="nav-label">Dashboard CBT</span></a>
          <a href="#cbt-manage" id="nav-cbt-manage" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-list-check"></i></span><span class="nav-label">Kelola Ujian & Soal</span></a>
          <a href="#cbt-results" id="nav-cbt-results" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-square-poll-vertical"></i></span><span class="nav-label">Hasil Ujian</span></a>
          <a href="#cbt-reset" id="nav-cbt-reset" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-rotate-left"></i></span><span class="nav-label">Reset Ujian Peserta</span></a>
        </div>
      </div>

      <!-- COLLAPSIBLE GROUP: WAWANCARA -->
      <div class="sidebar-nav-group">
        <button type="button" class="sidebar-nav-group-header ${savedGroups['interview'] ? 'open' : ''}" id="nav-group-header-interview" onclick="toggleNavGroup('interview')">
          <span class="nav-group-title"><i class="fa-solid fa-comments" style="color: #a78bfa;"></i> WAWANCARA</span>
          <i class="fa-solid fa-chevron-down nav-group-arrow"></i>
        </button>
        <div class="sidebar-nav-group-content ${savedGroups['interview'] ? 'open' : ''}" id="nav-group-content-interview">
          <a href="#interview-dashboard" id="nav-interview-dashboard" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-comments"></i></span><span class="nav-label">Dashboard Wawancara</span></a>
          <a href="#interview-schedules" id="nav-interview-schedules" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-calendar-week"></i></span><span class="nav-label">Jadwal Wawancara</span></a>
          <a href="#interview-interviewers" id="nav-interview-interviewers" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-user-tie"></i></span><span class="nav-label">Data Pewawancara</span></a>
          <a href="#interview-results" id="nav-interview-results" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-bar"></i></span><span class="nav-label">Hasil Wawancara</span></a>
        </div>
      </div>

      <div class="nav-section-title">AKUN SAYA</div>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>
      <a href="javascript:void(0)" onclick="handleLogout()" class="sidebar-nav-item logout-item"><span class="nav-icon"><i class="fa-solid fa-door-open"></i></span><span class="nav-label">Keluar</span></a>
    `;
  } else if (role === 'ADMIN_BARCODE') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU SCANNER</div>
      <a href="#checkin-scanner" id="nav-checkin-scanner" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-qrcode"></i></span><span class="nav-label">Check-In Scanner</span></a>
      <div class="nav-section-title">AKUN SAYA</div>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>
      <a href="javascript:void(0)" onclick="handleLogout()" class="sidebar-nav-item logout-item"><span class="nav-icon"><i class="fa-solid fa-door-open"></i></span><span class="nav-label">Keluar</span></a>
    `;
  } else if (role === 'PEWAWANCARA') {
    menu.innerHTML = `
      <div class="nav-section-title">MENU PEWAWANCARA</div>
      <a href="#overview" id="nav-overview" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-chart-pie"></i></span><span class="nav-label">Dashboard</span></a>
      <a href="#iw-my-schedules" id="nav-iw-my-schedules" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-calendar-week"></i></span><span class="nav-label">Jadwal Saya</span></a>
      <a href="#iw-my-participants" id="nav-iw-my-participants" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-users"></i></span><span class="nav-label">Daftar Peserta</span></a>
      <a href="#iw-history" id="nav-iw-history" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-clock-rotate-left"></i></span><span class="nav-label">Riwayat Wawancara</span></a>
      <div class="nav-section-title">AKUN SAYA</div>
      <a href="#change-password" id="nav-change-password" class="sidebar-nav-item"><span class="nav-icon"><i class="fa-solid fa-key"></i></span><span class="nav-label">Ubah Password</span></a>
      <a href="javascript:void(0)" onclick="handleLogout()" class="sidebar-nav-item logout-item"><span class="nav-icon"><i class="fa-solid fa-door-open"></i></span><span class="nav-label">Keluar</span></a>
    `;
  }
}

function toggleSidebarDrawer(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const sidebar = document.getElementById('app_sidebar') || document.querySelector('.app-sidebar');
  const backdrop = document.getElementById('sidebar_backdrop') || document.querySelector('.sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.toggle('drawer-open');
    sidebar.classList.toggle('show');
  }
  if (backdrop) {
    backdrop.classList.toggle('active');
    backdrop.classList.toggle('show');
  }
}

function closeSidebarDrawer() {
  const sidebar = document.getElementById('app_sidebar') || document.querySelector('.app-sidebar');
  const backdrop = document.getElementById('sidebar_backdrop') || document.querySelector('.sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.remove('drawer-open', 'show');
  }
  if (backdrop) {
    backdrop.classList.remove('active', 'show');
  }
}

function togglePublicMenu(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('public-nav-menu') || document.querySelector('.public-navbar .nav-menu');
  if (menu) {
    menu.classList.toggle('open');
    menu.classList.toggle('show');
  }
}

function closePublicMenu() {
  const menu = document.getElementById('public-nav-menu') || document.querySelector('.public-navbar .nav-menu');
  if (menu) {
    menu.classList.remove('open', 'show');
  }
}

function handleDashboardRoute() {
  closeSidebarDrawer();
  const hash = window.location.hash.replace('#', '') || 'overview';
  const parts = hash.split('/');
  const mainRoute = parts[0];
  const param = parts[1] || null;

  state.activeRoute = mainRoute;
  state.routeParams = param;

  // Highlight active sidebar item & auto-expand parent group
  document.querySelectorAll('.sidebar-nav-item').forEach(a => a.classList.remove('active'));
  const activeLink = document.getElementById(`nav-${mainRoute}`);
  if (activeLink) {
    activeLink.classList.add('active');
    const parentGroup = activeLink.closest('.sidebar-nav-group-content');
    if (parentGroup) {
      parentGroup.classList.add('open');
      const header = parentGroup.previousElementSibling;
      if (header && header.classList.contains('sidebar-nav-group-header')) {
        header.classList.add('open');
      }
    }
  }

  const role = state.user.role;

  if (role === 'PESERTA') {
    if (mainRoute === 'daftar') {
      renderPesertaRegistrationWizard();
    }
    else if (mainRoute === 'detail') renderPesertaRegistrationDetail(param);
    else if (mainRoute === 'formulir') {
      if (typeof renderPesertaFullFormMenu === 'function') {
        renderPesertaFullFormMenu(param);
      } else if (typeof renderPesertaFullFormView === 'function') {
        renderPesertaFullFormView(param);
      }
    }
    else if (mainRoute === 'cbt-exam') {
      if (typeof renderCbtPesertaExamRunner === 'function') {
        renderCbtPesertaExamRunner();
      } else if (typeof renderCbtPesertaView === 'function') {
        renderCbtPesertaView();
      }
    }
    else if (mainRoute === 'cbt-peserta' || mainRoute === 'cbt') {
      if (typeof renderCbtPesertaView === 'function') renderCbtPesertaView();
    }
    else if (mainRoute === 'panduan') renderPanduanView();
    else if (mainRoute === 'card') renderParticipantCardView(param);
    else if (mainRoute === 'change-password') renderChangePasswordView();
    else renderPesertaDashboard();
  } else if (role === 'BENDAHARA') {
    if (mainRoute === 'verifikasi-pembayaran') renderBendaharaPaymentsView();
    else if (mainRoute === 'checkin-scanner') renderCheckInScannerView();
    else if (mainRoute === 'detail') renderPesertaRegistrationDetail(param);
    else if (mainRoute === 'card') renderParticipantCardView(param);
    else if (mainRoute === 'change-password') renderChangePasswordView();
    else renderBendaharaDashboard();
  } else if (role === 'SUPER_ADMIN') {
    if (mainRoute === 'verifikasi-data') renderAdminVerificationView();
    else if (mainRoute === 'verifikasi-final') {
      if (typeof renderAdminFinalVerificationView === 'function') renderAdminFinalVerificationView();
    }
    else if (mainRoute === 'master-periode') renderAdminPeriodsView();
    else if (mainRoute === 'master-gelombang') renderAdminWavesView();
    else if (mainRoute === 'daftar-peserta') renderAdminRegistrationsView();
    else if (mainRoute === 'verifikasi-pembayaran') renderBendaharaPaymentsView();
    else if (mainRoute === 'checkin-scanner') renderCheckInScannerView();
    else if (mainRoute === 'cetak-kartu') renderCetakKartuView();
    else if (mainRoute === 'cbt-dashboard') {
      if (typeof renderCbtAdminDashboard === 'function') renderCbtAdminDashboard();
    }
    else if (mainRoute === 'cbt-manage') {
      if (typeof renderCbtManageView === 'function') renderCbtManageView(param);
    }
    else if (mainRoute === 'cbt-results') {
      if (typeof renderCbtResultsView === 'function') renderCbtResultsView();
    }
    else if (mainRoute === 'cbt-verification') {
      if (typeof renderCbtVerificationView === 'function') renderCbtVerificationView();
    }
    else if (mainRoute === 'cbt-reset') {
      if (typeof renderCbtResetView === 'function') renderCbtResetView();
    }
    // ---- WAWANCARA ROUTES ----
    else if (mainRoute === 'interview-dashboard') {
      if (typeof renderInterviewAdminDashboard === 'function') renderInterviewAdminDashboard();
    }
    else if (mainRoute === 'interview-schedules') {
      if (typeof renderInterviewSchedulesView === 'function') renderInterviewSchedulesView(param);
    }
    else if (mainRoute === 'interview-schedule-participants') {
      if (typeof renderInterviewScheduleParticipants === 'function') renderInterviewScheduleParticipants(param);
    }
    else if (mainRoute === 'interview-interviewers') {
      if (typeof renderInterviewInterviewersView === 'function') renderInterviewInterviewersView();
    }
    else if (mainRoute === 'interview-participants') {
      if (typeof renderInterviewParticipantsView === 'function') renderInterviewParticipantsView();
    }
    else if (mainRoute === 'interview-results') {
      if (typeof renderInterviewResultsView === 'function') renderInterviewResultsView();
    }
    else if (mainRoute === 'interview-result-detail') {
      if (typeof renderInterviewResultDetail === 'function') renderInterviewResultDetail(param);
    }
    else if (mainRoute === 'interview-process' || mainRoute === 'iw-process') {
      if (typeof renderInterviewerProcess === 'function') renderInterviewerProcess(param);
    }
    // ---- END WAWANCARA ROUTES ----
    else if (mainRoute === 'homepage-hero-slider' || mainRoute === 'hero-slider') {
      if (typeof renderHeroSliderAdminView === 'function') renderHeroSliderAdminView(param);
    }
    else if (mainRoute === 'homepage-flow') {
      if (typeof renderRegistrationFlowAdminView === 'function') renderRegistrationFlowAdminView();
    }
    else if (mainRoute === 'master-kategori') renderAdminCategoriesView();
    else if (mainRoute === 'master-cabang') renderAdminBranchesView();
    else if (mainRoute === 'users') renderAdminUsersView();
    else if (mainRoute === 'payment-accounts') renderAdminPaymentAccountsView();
    else if (mainRoute === 'branding-settings') renderAdminBrandingView();
    else if (mainRoute === 'countdown-settings') renderAdminCountdownView();
    else if (mainRoute === 'audit-logs') renderAdminAuditLogsView();
    else if (mainRoute === 'reset-operasional') renderAdminResetOperasionalView();
    else if (mainRoute === 'detail') renderPesertaRegistrationDetail(param);
    else if (mainRoute === 'card') renderParticipantCardView(param);
    else if (mainRoute === 'change-password') renderChangePasswordView();
    else renderAdminDashboard();
  } else if (role === 'ADMIN') {
    // Operational admin - all routes except system-only ones
    if (mainRoute === 'verifikasi-data') renderAdminVerificationView();
    else if (mainRoute === 'verifikasi-final') {
      if (typeof renderAdminFinalVerificationView === 'function') renderAdminFinalVerificationView();
    }
    else if (mainRoute === 'daftar-peserta') renderAdminRegistrationsView();
    else if (mainRoute === 'cbt-dashboard') {
      if (typeof renderCbtAdminDashboard === 'function') renderCbtAdminDashboard();
    }
    else if (mainRoute === 'cbt-manage') {
      if (typeof renderCbtManageView === 'function') renderCbtManageView(param);
    }
    else if (mainRoute === 'cbt-results') {
      if (typeof renderCbtResultsView === 'function') renderCbtResultsView();
    }
    else if (mainRoute === 'cbt-verification') {
      if (typeof renderCbtVerificationView === 'function') renderCbtVerificationView();
    }
    else if (mainRoute === 'cbt-reset') {
      if (typeof renderCbtResetView === 'function') renderCbtResetView();
    }
    // ---- WAWANCARA ROUTES ----
    else if (mainRoute === 'interview-dashboard') {
      if (typeof renderInterviewAdminDashboard === 'function') renderInterviewAdminDashboard();
    }
    else if (mainRoute === 'interview-schedules') {
      if (typeof renderInterviewSchedulesView === 'function') renderInterviewSchedulesView(param);
    }
    else if (mainRoute === 'interview-schedule-participants') {
      if (typeof renderInterviewScheduleParticipants === 'function') renderInterviewScheduleParticipants(param);
    }
    else if (mainRoute === 'interview-interviewers') {
      if (typeof renderInterviewInterviewersView === 'function') renderInterviewInterviewersView();
    }
    else if (mainRoute === 'interview-participants') {
      if (typeof renderInterviewParticipantsView === 'function') renderInterviewParticipantsView();
    }
    else if (mainRoute === 'interview-results') {
      if (typeof renderInterviewResultsView === 'function') renderInterviewResultsView();
    }
    else if (mainRoute === 'interview-result-detail') {
      if (typeof renderInterviewResultDetail === 'function') renderInterviewResultDetail(param);
    }
    else if (mainRoute === 'interview-process' || mainRoute === 'iw-process') {
      if (typeof renderInterviewerProcess === 'function') renderInterviewerProcess(param);
    }
    // ---- END WAWANCARA ROUTES ----
    else if (mainRoute === 'master-periode') renderAdminPeriodsView();
    else if (mainRoute === 'master-gelombang') renderAdminWavesView();
    else if (mainRoute === 'master-kategori') renderAdminCategoriesView();
    else if (mainRoute === 'checkin-scanner') renderCheckInScannerView();
    else if (mainRoute === 'cetak-kartu') renderCetakKartuView();
    else if (mainRoute === 'verifikasi-pembayaran') renderBendaharaPaymentsView();
    else if (mainRoute === 'detail') renderPesertaRegistrationDetail(param);
    else if (mainRoute === 'card') renderParticipantCardView(param);
    else if (mainRoute === 'change-password') renderChangePasswordView();
    else renderAdminDashboard();
  } else if (role === 'ADMIN_BARCODE') {
    if (mainRoute === 'change-password') renderChangePasswordView();
    else renderCheckInScannerView();
  } else if (role === 'PEWAWANCARA') {
    if (mainRoute === 'iw-my-schedules' || mainRoute === 'interview-schedules') {
      if (typeof renderInterviewerMySchedules === 'function') renderInterviewerMySchedules();
    } else if (mainRoute === 'iw-my-participants' || mainRoute === 'interview-participants') {
      if (typeof renderInterviewerMyParticipants === 'function') renderInterviewerMyParticipants();
    } else if (mainRoute === 'iw-process' || mainRoute === 'interview-process') {
      if (typeof renderInterviewerProcess === 'function') renderInterviewerProcess(param);
    } else if (mainRoute === 'iw-history' || mainRoute === 'interview-results') {
      if (typeof renderInterviewerHistory === 'function') renderInterviewerHistory();
    } else if (mainRoute === 'change-password') {
      renderChangePasswordView();
    } else {
      if (typeof renderInterviewerDashboard === 'function') renderInterviewerDashboard();
    }
  }
}

// ============================================================================
// PESERTA MODULE (DASHBOARD + FULL-PAGE WIZARD + DETAIL + CARD PRINT FIX)
// ============================================================================

// Component Local State for Universal Tables
const tableState = {
  pesertaRegs: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  bendaharaPayments: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  adminRegistrations: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  adminUsers: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  adminAudit: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  adminCategories: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
  adminBranches: { page: 1, pageSize: 10, search: '', sortKey: '', sortDir: 'asc', filterKey: '', filterVal: '', data: [] },
};

async function renderPesertaDashboard() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat dashboard calon santri...</div>';

  try {
    const res = await apiRequest('/api/registrations/my');
    tableState.pesertaRegs.data = res.success ? (res.data || []) : [];

    const myRegs = tableState.pesertaRegs.data;

    if (myRegs.length === 0) {
      container.innerHTML = `
        <div style="max-width: 800px; margin: 30px auto; text-align: center;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 40px 30px; box-shadow: var(--shadow-sm);">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(2, 132, 199, 0.12); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <h2 style="font-size: 1.5rem; color: var(--text-heading); margin-bottom: 8px;">Selamat Datang di Portal PSB</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 550px; margin: 0 auto 24px auto; line-height: 1.6;">
              Akun Anda belum memiliki data pendaftaran aktif. Silakan mulai pendaftaran awal calon santri baru untuk memilih unit pendidikan, jurusan, dan program kelas.
            </p>
            <a href="#daftar" class="btn btn-primary btn-lg" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
              <i class="fa-solid fa-file-pen"></i> Mulai Pendaftaran Calon Santri
            </a>
          </div>
        </div>
      `;
      return;
    }

    const reg = myRegs[0];
    const studentName = reg.studentDetail?.fullName || reg.individualParticipant?.fullName || state.user.name;
    const schoolName = reg.schoolName || reg.branch?.level?.category?.name || '-';
    const majorName = reg.majorName || reg.branch?.level?.name || '-';
    const className = reg.classProgramName || reg.branch?.name || '-';
    const waveName = reg.admissionWave?.name || 'Gelombang Aktif';
    const isMukim = reg.boardingStatus !== 'NON_MUKIM';
    const boardingLabel = isMukim ? 'Mukim / Mondok di Pesantren' : 'Non-Mukim (Pulang-Pergi)';

    // State Tahapan
    const isPayApproved = reg.status === 'APPROVED';
    const isPayWaiting = reg.status === 'WAITING_VERIFICATION';
    const isPayRejected = reg.status === 'PAYMENT_REJECTED';

    const formStatus = reg.formStatus || (reg.isFormUnlocked ? 'DRAFT' : 'LOCKED');
    const isFormVerified = formStatus === 'VERIFIED';
    const isFormSubmitted = formStatus === 'SUBMITTED' || formStatus === 'UNDER_REVIEW';
    const isFormRevision = formStatus === 'REVISION_REQUIRED';
    const isFormDraft = formStatus === 'DRAFT' || (reg.isFormUnlocked && !isFormSubmitted && !isFormVerified);

    // State CBT & Verifikasi Ujian
    const cbt = reg.cbtAttempt;
    const isCbtStarted = cbt && (cbt.status === 'IN_PROGRESS' || cbt.status === 'COMPLETED' || cbt.status === 'EXPIRED');
    const isCbtCompleted = cbt && (cbt.status === 'COMPLETED' || cbt.status === 'EXPIRED');
    const isCbtVerified = cbt && cbt.verificationStatus === 'VERIFIED';
    const isCbtPending = isCbtCompleted && cbt.verificationStatus === 'PENDING';
    const isCbtRejected = cbt && cbt.verificationStatus === 'REJECTED';

    // State Interview / Wawancara
    const iw = reg.interview;
    const iwSchedule = iw?.schedule;
    const iwInterviewerName = iw?.interviewer?.name || (iwSchedule?.interviewers?.[0]?.user?.name) || 'Panitia Pewawancara';
    const isInterviewScheduled = Boolean(iwSchedule);
    const isInterviewInProgress = iw?.status === 'IN_PROGRESS';
    const isInterviewCompleted = iw?.status === 'COMPLETED';

    // State Keputusan Final Kelulusan
    const finalStatus = reg.finalStatus || 'UNDECIDED';
    const isAccepted = finalStatus === 'ACCEPTED';
    const isRejected = finalStatus === 'REJECTED';
    const isWaitlisted = finalStatus === 'WAITLISTED';
    const isDecided = isAccepted || isRejected || isWaitlisted;

    // Hitung persentase progres (7 tahap)
    let progressPercent = 14; // Step 1: Akun & Pilihan selesai
    if (isPayApproved) progressPercent = 28; // Step 2: Pembayaran
    if (isFormDraft) progressPercent = Math.max(progressPercent, 42); // Step 3: Mengisi formulir
    if (isFormSubmitted) progressPercent = 42; // Step 3: Formulir terkirim
    if (isFormVerified) progressPercent = 57; // Step 4: Formulir terverifikasi / Akses CBT
    if (isCbtPending) progressPercent = 65; // Step 4: CBT selesai dikerjakan, menunggu verifikasi
    if (isCbtVerified) progressPercent = 75; // Step 4: CBT Lulus Diverifikasi -> Lanjut Wawancara (Step 5 aktif)
    if (isInterviewScheduled) progressPercent = 80;
    if (isInterviewCompleted) progressPercent = 88;
    if (isWaitlisted) progressPercent = 92;
    if (isAccepted || isRejected) progressPercent = 100;

    container.innerHTML = `
      <!-- HEADER SAMBUTAN & IDENTITAS PENDAFTARAN -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">
              Hai, ${studentName} 👋
            </h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0;">
              Selamat datang di Dashboard Calon Siswa Baru. Pantau progres pendaftaran dan status berkas Anda di sini.
            </p>
          </div>
          <div style="background: var(--bg-card); border: 1.5px dashed var(--primary-400); border-radius: var(--radius-md); padding: 8px 16px; text-align: right;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">No. Registrasi Resmi:</div>
            <code style="font-size: 1.2rem; font-weight: 800; color: var(--primary-600);">${reg.registrationNumber}</code>
          </div>
        </div>
      </div>

      <!-- BANNER PENGUMUMAN FINAL: DITERIMA -->
      ${isAccepted ? `
        <div class="card" style="background: linear-gradient(135deg, #065f46, #059669); color: #ffffff; border-radius: var(--radius-xl); padding: 26px 30px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(5, 150, 105, 0.25);">
          <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0;">
              🎉
            </div>
            <div style="flex: 1; min-width: 280px;">
              <span class="badge" style="background: rgba(255, 255, 255, 0.25); color: #ffffff; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 6px; display: inline-block;">
                <i class="fa-solid fa-circle-check"></i> HASIL SELEKSI FINAL
              </span>
              <h2 style="margin: 4px 0 6px 0; font-size: 1.45rem; font-weight: 800; color: #ffffff;">
                ALHAMDULILLAH, ANDA DINYATAKAN DITERIMA!
              </h2>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 0.92rem; line-height: 1.5;">
                Selamat! Berdasarkan hasil evaluasi seluruh tahapan seleksi (Berkas, CBT Online, dan Wawancara), Anda resmi diterima sebagai Santri Baru pada <strong>${escapeHtml(schoolName)}</strong>.
                ${reg.finalNotes ? `<br><span style="display:inline-block; margin-top:6px; background:rgba(0,0,0,0.15); padding:4px 10px; border-radius:6px;"><strong>Catatan Panitia:</strong> "${escapeHtml(reg.finalNotes)}"</span>` : ''}
              </p>
            </div>
          </div>
        </div>
      ` : isWaitlisted ? `
        <div class="card" style="background: linear-gradient(135deg, #b45309, #d97706); color: #ffffff; border-radius: var(--radius-xl); padding: 24px 28px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(217, 119, 6, 0.25);">
          <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0;">
              ⏳
            </div>
            <div style="flex: 1; min-width: 280px;">
              <span class="badge" style="background: rgba(255, 255, 255, 0.25); color: #ffffff; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 6px; display: inline-block;">
                <i class="fa-solid fa-clock"></i> HASIL SELEKSI FINAL: CADANGAN
              </span>
              <h3 style="margin: 4px 0 6px 0; font-size: 1.35rem; font-weight: 800; color: #ffffff;">
                Status Anda Masuk Daftar Cadangan / Pending
              </h3>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 0.9rem; line-height: 1.5;">
                Anda masuk dalam antrean cadangan seleksi santri baru. Panitia akan menghubungi Anda secara berkala jika terdapat kuota tambahan atau pembukaan gelombang berikutnya.
                ${reg.finalNotes ? `<br><span style="display:inline-block; margin-top:6px; background:rgba(0,0,0,0.15); padding:4px 10px; border-radius:6px;"><strong>Keterangan:</strong> "${escapeHtml(reg.finalNotes)}"</span>` : ''}
              </p>
            </div>
          </div>
        </div>
      ` : isRejected ? `
        <div class="card" style="background: linear-gradient(135deg, #991b1b, #dc2626); color: #ffffff; border-radius: var(--radius-xl); padding: 24px 28px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.25);">
          <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0;">
              ℹ️
            </div>
            <div style="flex: 1; min-width: 280px;">
              <span class="badge" style="background: rgba(255, 255, 255, 0.25); color: #ffffff; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 6px; display: inline-block;">
                HASIL SELEKSI FINAL
              </span>
              <h3 style="margin: 4px 0 6px 0; font-size: 1.35rem; font-weight: 800; color: #ffffff;">
                Mohon Maaf, Belum Memenuhi Kriteria Kelulusan
              </h3>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 0.9rem; line-height: 1.5;">
                Terima kasih telah mengikuti seluruh rangkaian seleksi PSB Maskumambang. Berdasarkan kuota dan hasil penilaian akhir, Anda belum dapat diterima pada periode ini. Tetap semangat dalam menuntut ilmu!
                ${reg.finalNotes ? `<br><span style="display:inline-block; margin-top:6px; background:rgba(0,0,0,0.15); padding:4px 10px; border-radius:6px;"><strong>Catatan Panitia:</strong> "${escapeHtml(reg.finalNotes)}"</span>` : ''}
              </p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- BANNER NOTIFIKASI JADWAL WAWANCARA TERSEDIA (JIKA SUDAH ADA JADWAL & BELUM KEPUTUSAN FINAL) -->
      ${!isDecided && isInterviewScheduled && !isInterviewCompleted ? `
        <div class="alert" style="background: #eff6ff; border: 1.5px solid #3b82f6; border-left: 6px solid #2563eb; padding: 20px 24px; border-radius: var(--radius-lg); margin-bottom: 24px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);">
          <div style="display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap;">
            <div style="display: flex; gap: 14px; align-items: flex-start; flex: 1; min-width: 280px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);">
                <i class="fa-solid fa-calendar-check"></i>
              </div>
              <div style="flex: 1;">
                <span class="badge" style="background: #2563eb; color: #ffffff; font-weight: 800; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; margin-bottom: 6px; display: inline-block;">
                  <i class="fa-solid fa-bullhorn"></i> PEMBERITAHUAN JADWAL RESMI
                </span>
                <strong style="color: #1e3a8a; font-size: 1.1rem; display: block; margin-bottom: 6px;">
                  🗓️ Jadwal Tes Wawancara Anda Telah Ditetapkan!
                </strong>
                <p style="color: #1e40af; font-size: 0.9rem; margin: 0 0 12px 0; line-height: 1.5;">
                  Panitia PSB telah menetapkan jadwal sesi dan pewawancara untuk Anda. Mohon catat jadwal berikut dan hadir tepat waktu:
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; background: #ffffff; padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid #bfdbfe; font-size: 0.85rem; color: #1e293b;">
                  <div>
                    <span style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Tanggal:</span>
                    <strong style="color: #0f172a; font-size: 0.95rem;">
                      <i class="fa-solid fa-calendar-day" style="color: #2563eb; margin-right: 4px;"></i>
                      ${new Date(iwSchedule.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </div>
                  <div>
                    <span style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Waktu / Sesi:</span>
                    <strong style="color: #0f172a; font-size: 0.95rem;">
                      <i class="fa-regular fa-clock" style="color: #2563eb; margin-right: 4px;"></i>
                      ${iwSchedule.startTime || '08:00'} - ${iwSchedule.endTime || 'Selesai'} WIB
                    </strong>
                  </div>
                  <div>
                    <span style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Ruang / Lokasi:</span>
                    <strong style="color: #0f172a; font-size: 0.95rem;">
                      <i class="fa-solid fa-location-dot" style="color: #2563eb; margin-right: 4px;"></i>
                      ${escapeHtml(iwSchedule.roomLocation || 'Ruang Wawancara PSB')}
                    </strong>
                  </div>
                  <div>
                    <span style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Pewawancara:</span>
                    <strong style="color: #0f172a; font-size: 0.95rem;">
                      <i class="fa-solid fa-user-tie" style="color: #2563eb; margin-right: 4px;"></i>
                      ${escapeHtml(iwInterviewerName)}
                    </strong>
                  </div>
                </div>

                <div style="margin-top: 10px; font-size: 0.8rem; color: #1e40af; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-circle-info"></i> Harap hadir 15 menit sebelum jadwal dimulai dan membawa <strong>Kartu Peserta Seleksi</strong>.
                </div>
              </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center;">
              <button type="button" class="btn btn-primary" style="font-weight: 700; display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;" onclick="openParticipantCardModal('${reg.id}')">
                <i class="fa-solid fa-id-card"></i> Cetak Kartu Peserta
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- BANNER NOTIFIKASI CBT TERVERIFIKASI / LULUS (JIKA BELUM ADA KEPUTUSAN FINAL & BELUM ADA JADWAL WAWANCARA) -->
      ${!isDecided && isCbtVerified && !isInterviewScheduled ? `
        <div class="alert alert-success" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-left: 5px solid #10b981; padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.4rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
              <strong style="color: #065f46; font-size: 1rem;">🎉 Selamat! Anda Dinyatakan LULUS Ujian CBT</strong>
              <p style="color: #047857; font-size: 0.88rem; margin: 4px 0 8px 0; line-height: 1.5;">
                Hasil ujian Anda telah diverifikasi oleh Panitia PSB. Anda berhak melanjutkan ke tahapan <strong>Tes Wawancara</strong>. Pantau jadwalnya disini secara berkala!
              </p>
            </div>
          </div>
        </div>
      ` : !isDecided && isCbtPending ? `
        <div class="alert alert-info" style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 5px solid #3b82f6; padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <i class="fa-solid fa-hourglass-half" style="color: #3b82f6; font-size: 1.3rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
              <strong style="color: #1e40af; font-size: 0.95rem;">Ujian CBT Telah Selesai (Menunggu Verifikasi Admin)</strong>
              <p style="color: #1d4ed8; font-size: 0.88rem; margin: 4px 0 0 0; line-height: 1.5;">
                Jawaban ujian Anda telah berhasil disimpan. Panitia sedang melakukan verifikasi dan penilaian. Selanjutnya, proses seleksi akan dilanjutkan ke tahap Wawancara. Jadwal dan informasi terkait pelaksanaan wawancara akan diumumkan.
              </p>
            </div>
          </div>
        </div>
      ` : !isDecided && isFormVerified && !isCbtStarted ? `
        <div class="alert alert-success" style="background: #ecfdf5; border: 1.5px solid #10b981; border-left: 6px solid #10b981; padding: 18px 22px; border-radius: var(--radius-lg); margin-bottom: 24px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);">
          <div style="display: flex; gap: 14px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div style="display: flex; gap: 14px; align-items: center;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <strong style="color: #065f46; font-size: 1.05rem; display: block; margin-bottom: 3px;">
                  🎉 Berkas & Formulir Anda Telah RESMI DIVERIFIKASI (VERIFIED)!
                </strong>
                <p style="color: #047857; font-size: 0.88rem; margin: 0; line-height: 1.5;">
                  Selamat! Seluruh dokumen persyaratan telah disetujui panitia. Anda dapat melanjutkan ke tahapan <strong>Ujian Online (CBT)</strong> sesuai dengan jadwal yang telah ditentukan.
                </p>
              </div>
            </div>
            <a href="#cbt-peserta" class="btn btn-success" style="font-weight: 700; display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 0.9rem;">
              <i class="fa-solid fa-laptop-code"></i> Menuju Ujian Online CBT
            </a>
          </div>
        </div>
      ` : ''}

      <!-- ALERT REVISI (JIKA ADMIN MEMINTA REVISI) -->
      ${isFormRevision ? `
        <div class="alert alert-warning" style="background: #fffbeb; border: 1px solid #fde68a; border-left: 5px solid #d97706; padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <i class="fa-solid fa-triangle-exclamation" style="color: #d97706; font-size: 1.3rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
              <strong style="color: #92400e; font-size: 0.95rem;">Perhatian: Ada Catatan Perbaikan Berkas dari Panitia PSB</strong>
              <p style="color: #78350f; font-size: 0.88rem; margin: 6px 0 10px 0; line-height: 1.5;">${reg.revisionNotes || 'Mohon lengkapi atau perbaiki dokumen pendaftaran Anda sesuai ketentuan.'}</p>
              <a href="#formulir/${reg.id}" class="btn btn-sm btn-warning" style="font-weight: 700;"><i class="fa-solid fa-pen-to-square"></i> Perbaiki Formulir Sekarang</a>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- KARTU PROGRES PENDAFTARAN (TIMELINE / STEPPER) -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.1rem; color: var(--text-heading); margin: 0;">Progres Pendaftaran Calon Santri Baru</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${waveName} &bull; ${schoolName}</span>
          </div>
          <span class="badge ${isAccepted ? 'badge-success' : isRejected ? 'badge-danger' : isWaitlisted ? 'badge-warning' : isInterviewCompleted ? 'badge-success' : isInterviewScheduled ? 'badge-primary' : isCbtVerified ? 'badge-success' : isFormVerified ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.8rem; padding: 6px 12px;">
            ${progressPercent}% Selesai
          </span>
        </div>

        <!-- Progress Bar Visual -->
        <div style="width: 100%; height: 8px; background: var(--border-subtle); border-radius: 9999px; overflow: hidden; margin-bottom: 20px;">
          <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--primary-500), #10b981); border-radius: 9999px; transition: width 0.4s ease;"></div>
        </div>

        <!-- 7 Step Items Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
          
          <!-- Step 1: Akun & Pilihan -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid #10b981;">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">✓</span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">1. Akun & Pilihan</strong>
            </div>
            <div style="font-size: 0.72rem; color: #059669; font-weight: 600;">Terdaftar</div>
          </div>

          <!-- Step 2: Pembayaran -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isPayApproved ? '#10b981' : isPayWaiting ? '#f59e0b' : '#ef4444'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isPayApproved ? '#10b981' : isPayWaiting ? '#f59e0b' : '#ef4444'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isPayApproved ? '✓' : isPayWaiting ? '2' : '!'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">2. Pembayaran</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isPayApproved ? '#059669' : isPayWaiting ? '#d97706' : '#dc2626'};">
              ${isPayApproved ? 'Lunas ✓' : isPayWaiting ? 'Menunggu' : 'Perlu Diulang'}
            </div>
          </div>

          <!-- Step 3: Formulir & Berkas -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isFormVerified ? '#10b981' : isFormSubmitted ? '#0284c7' : isFormRevision ? '#f59e0b' : '#94a3b8'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isFormVerified ? '#10b981' : isFormSubmitted ? '#0284c7' : isFormRevision ? '#f59e0b' : '#94a3b8'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isFormVerified ? '✓' : '3'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">3. Formulir</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isFormVerified ? '#059669' : isFormSubmitted ? '#0284c7' : isFormRevision ? '#d97706' : '#64748b'};">
              ${isFormVerified ? 'Terverifikasi ✓' : isFormSubmitted ? 'Sedang Review' : isFormRevision ? 'Perlu Revisi' : isFormDraft ? 'Sedang Diisi' : 'Belum Terbuka'}
            </div>
          </div>

          <!-- Step 4: Ujian CBT -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isCbtVerified ? '#10b981' : isCbtPending ? '#f59e0b' : isCbtRejected ? '#ef4444' : isFormVerified ? '#0284c7' : '#94a3b8'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isCbtVerified ? '#10b981' : isCbtPending ? '#f59e0b' : isCbtRejected ? '#ef4444' : isFormVerified ? '#0284c7' : '#94a3b8'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isCbtVerified ? '✓' : isCbtRejected ? '!' : '4'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">4. Ujian CBT</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isCbtVerified ? '#059669' : isCbtPending ? '#d97706' : isCbtRejected ? '#dc2626' : isFormVerified ? '#0284c7' : '#64748b'};">
              ${isCbtVerified ? 'Lulus CBT ✓' : isCbtPending ? 'Menunggu Verifikasi' : isCbtRejected ? 'Tidak Lulus' : isCbtStarted ? 'Sedang Ujian' : isFormVerified ? 'Siap Dikerjakan' : 'Menunggu Berkas'}
            </div>
          </div>

          <!-- Step 5: Tes Wawancara -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isInterviewCompleted ? '#10b981' : isInterviewInProgress ? '#0284c7' : isInterviewScheduled ? '#3b82f6' : isCbtVerified ? '#f59e0b' : '#94a3b8'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isInterviewCompleted ? '#10b981' : isInterviewInProgress ? '#0284c7' : isInterviewScheduled ? '#3b82f6' : isCbtVerified ? '#f59e0b' : '#94a3b8'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isInterviewCompleted ? '✓' : '5'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">5. Wawancara</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isInterviewCompleted ? '#059669' : isInterviewInProgress ? '#0284c7' : isInterviewScheduled ? '#2563eb' : isCbtVerified ? '#d97706' : '#64748b'};">
              ${isInterviewCompleted ? 'Selesai Wawancara ✓' : isInterviewInProgress ? 'Sedang Wawancara' : isInterviewScheduled ? `Terjadwal (${iwSchedule.startTime || '08:00'})` : isCbtVerified ? 'Menunggu Jadwal' : 'Menunggu CBT'}
            </div>
          </div>

          <!-- Step 6: Pengumuman -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isAccepted ? '#10b981' : isRejected ? '#ef4444' : isWaitlisted ? '#f59e0b' : isInterviewCompleted ? '#0284c7' : '#94a3b8'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isAccepted ? '#10b981' : isRejected ? '#ef4444' : isWaitlisted ? '#f59e0b' : isInterviewCompleted ? '#0284c7' : '#94a3b8'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isAccepted ? '✓' : isRejected ? '✗' : isWaitlisted ? '!' : '6'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">6. Pengumuman</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isAccepted ? '#059669' : isRejected ? '#dc2626' : isWaitlisted ? '#d97706' : isInterviewCompleted ? '#0284c7' : '#64748b'};">
              ${isAccepted ? 'DITERIMA ✓' : isRejected ? 'TIDAK LOLOS' : isWaitlisted ? 'CADANGAN' : isInterviewCompleted ? 'Menunggu Keputusan' : 'Belum Diumumkan'}
            </div>
          </div>

          <!-- Step 7: Santri Aktif -->
          <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 12px; border: 1px solid ${isAccepted ? '#10b981' : isRejected ? '#64748b' : isWaitlisted ? '#f59e0b' : '#94a3b8'};">
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${isAccepted ? '#10b981' : isRejected ? '#64748b' : isWaitlisted ? '#f59e0b' : '#94a3b8'}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">
                ${isAccepted ? '✓' : '7'}
              </span>
              <strong style="font-size: 0.78rem; color: var(--text-heading);">7. Santri Aktif</strong>
            </div>
            <div style="font-size: 0.72rem; font-weight: 600; color: ${isAccepted ? '#059669' : isRejected ? '#64748b' : isWaitlisted ? '#d97706' : '#64748b'};">
              ${isAccepted ? 'Siap Masuk ✓' : isRejected ? 'Selesai' : isWaitlisted ? 'Menunggu Kuota' : 'Menunggu Proses'}
            </div>
          </div>

        </div>
      </div>

      <!-- GRID AKSI & INFORMASI UTAMA (DIURUTKAN BERDASARKAN INFORMASI TERBARU) -->
      ${(() => {
        // Build individual cards with priority scores based on candidate's current latest stage
        const cards = [];

        // 1. CARD TES WAWANCARA
        let interviewPriority = 30;
        if (isInterviewCompleted) interviewPriority = 100;
        else if (isInterviewScheduled) interviewPriority = 95;
        else if (isCbtVerified) interviewPriority = 85;

        const interviewCardHtml = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: ${isInterviewCompleted ? 'rgba(16, 185, 129, 0.12)' : isInterviewScheduled ? 'rgba(59, 130, 246, 0.12)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isInterviewCompleted ? '#059669' : isInterviewScheduled ? '#2563eb' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-comments"></i>
                </div>
                <span class="badge ${isInterviewCompleted ? 'badge-success' : isInterviewScheduled ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.75rem;">
                  ${isInterviewCompleted ? '<i class="fa-solid fa-check-double"></i> SELESAI' : isInterviewScheduled ? '<i class="fa-solid fa-calendar-check"></i> TERJADWAL' : '<i class="fa-solid fa-lock"></i> MENUNGGU'}
                </span>
              </div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 10px;">Tes Wawancara</h3>
              
              ${isInterviewScheduled ? `
                <div style="font-size: 0.85rem; color: var(--text-main); display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; background: var(--bg-body); padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
                  <div><i class="fa-solid fa-calendar-day" style="color:var(--primary-600); width: 18px;"></i> Tanggal: <strong>${new Date(iwSchedule.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                  <div><i class="fa-regular fa-clock" style="color:var(--primary-600); width: 18px;"></i> Jam: <strong>${iwSchedule.startTime} - ${iwSchedule.endTime} WIB</strong></div>
                  <div><i class="fa-solid fa-location-dot" style="color:var(--primary-600); width: 18px;"></i> Ruang: <strong>${escapeHtml(iwSchedule.roomLocation || '-')}</strong></div>
                  <div><i class="fa-solid fa-user-tie" style="color:var(--primary-600); width: 18px;"></i> Pewawancara: <strong>${escapeHtml(iwInterviewerName)}</strong></div>
                </div>
              ` : isCbtVerified ? `
                <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                  Selamat! Anda berhak mengikuti tahapan tes wawancara. Panitia sedang mengalokasikan sesi dan pewawancara untuk Anda.
                </p>
              ` : `
                <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                  Tahapan wawancara akan dibuka dan dijadwalkan secara otomatis setelah Anda dinyatakan Lulus Ujian CBT.
                </p>
              `}
            </div>
            <div>
              ${isInterviewCompleted ? `
                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid #86efac; border-radius: 8px; padding: 10px; font-size: 0.825rem; color: #15803d; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-circle-check"></i> Sesi wawancara telah selesai dinilai.
                </div>
              ` : isInterviewScheduled ? `
                <div style="font-size: 0.775rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-circle-info" style="color: var(--primary-600);"></i> Harap hadir tepat waktu dengan membawa kartu ujian.
                </div>
              ` : `
                <button type="button" class="btn btn-secondary" style="width: 100%; opacity: 0.75; cursor: not-allowed;" disabled>
                  <i class="fa-solid fa-lock"></i> Belum Tersedia
                </button>
              `}
            </div>
          </div>
        `;
        cards.push({ id: 'interview', priority: interviewPriority, html: interviewCardHtml });

        // 2. CARD KARTU PESERTA SELEKSI
        let cardPriority = isFormVerified ? 90 : 40;
        const cardCardHtml = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: ${isFormVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isFormVerified ? '#059669' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-id-card"></i>
                </div>
                <span class="badge ${isFormVerified ? 'badge-success' : 'badge-secondary'}" style="font-size: 0.75rem;">
                  <i class="${isFormVerified ? 'fa-solid fa-circle-check' : 'fa-solid fa-lock'}"></i> ${isFormVerified ? 'KARTU AKTIF' : 'BELUM AKTIF'}
                </span>
              </div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 6px;">Kartu Peserta Seleksi</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                ${isFormVerified
            ? 'Kartu peserta seleksi resmi Anda sudah aktif dan siap dicetak atau diunduh untuk keperluan tes seleksi.'
            : 'Kartu peserta akan aktif secara otomatis setelah data dan berkas formulir Anda diverifikasi oleh Panitia PSB.'}
              </p>
            </div>
            <div>
              ${isFormVerified ? `
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-success" style="flex: 1; font-weight: 700;" onclick="openParticipantCardModal('${reg.id}')">
                    <i class="fa-solid fa-id-card"></i> Lihat Kartu Peserta
                  </button>
                  <a href="#card/${reg.id}" class="btn btn-outline-primary" title="Halaman Cetak Kartu">
                    <i class="fa-solid fa-print"></i>
                  </a>
                </div>
              ` : `
                <button type="button" class="btn btn-secondary" style="width: 100%; opacity: 0.75; cursor: not-allowed;" disabled>
                  <i class="fa-solid fa-lock"></i> Menunggu Verifikasi Panitia
                </button>
              `}
            </div>
          </div>
        `;
        cards.push({ id: 'card', priority: cardPriority, html: cardCardHtml });

        // 3. CARD FORMULIR PENDAFTARAN LENGKAP
        let formPriority = 50;
        if (isFormRevision) formPriority = 98;
        else if (isFormDraft) formPriority = 95;
        else if (isFormSubmitted) formPriority = 88;
        else if (isFormVerified) formPriority = 80;

        const formCardHtml = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(2, 132, 199, 0.1); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-file-signature"></i>
                </div>
                <div>${getFormStatusBadge(formStatus)}</div>
              </div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 6px;">Formulir Pendaftaran Lengkap</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                ${isFormVerified ? 'Data biodata, orang tua, dan dokumen Anda telah diverifikasi oleh panitia.' : isFormSubmitted ? 'Formulir telah dikirim dan saat ini sedang diperiksa oleh panitia verifikasi.' : 'Lengkapi data identitas calon santri, data orang tua/wali, serta unggah dokumen persyaratan.'}
              </p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="#formulir/${reg.id}" class="btn btn-primary" style="flex: 1; text-align: center; font-weight: 700;">
                <i class="fa-solid fa-pen-to-square"></i> ${isFormVerified ? 'Lihat Formulir Lengkap' : 'Buka Formulir Pendaftaran'}
              </a>
            </div>
          </div>
        `;
        cards.push({ id: 'form', priority: formPriority, html: formCardHtml });

        // 4. CARD UJIAN CBT ONLINE
        let cbtPriority = 35;
        if (isFormVerified && !isCbtCompleted) cbtPriority = 92;
        else if (isCbtPending) cbtPriority = 82;
        else if (isCbtVerified) cbtPriority = 78;

        const cbtCardHtml = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: ${isCbtVerified ? 'rgba(16, 185, 129, 0.12)' : isFormVerified ? 'rgba(2, 132, 199, 0.12)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isCbtVerified ? '#059669' : isFormVerified ? 'var(--primary-600)' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-laptop-code"></i>
                </div>
                <span class="badge ${isCbtVerified ? 'badge-success' : isCbtPending ? 'badge-warning' : isCbtRejected ? 'badge-danger' : isFormVerified ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.75rem;">
                  ${isCbtVerified ? '<i class="fa-solid fa-check-double"></i> LULUS CBT' : isCbtPending ? '<i class="fa-solid fa-hourglass-half"></i> REVIEW HASIL' : isCbtRejected ? '<i class="fa-solid fa-xmark"></i> TIDAK LULUS' : isFormVerified ? '<i class="fa-solid fa-unlock"></i> SIAP UJIAN' : '<i class="fa-solid fa-lock"></i> MENUNGGU VERIFIKASI'}
                </span>
              </div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 6px;">Ujian CBT Online</h3>
              <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                ${isCbtVerified
            ? 'Hasil ujian CBT Anda telah diverifikasi dan dinyatakan Lulus oleh panitia.'
            : isCbtPending
              ? 'Jawaban ujian Anda telah tersimpan dan sedang dalam proses review/penilaian oleh panitia.'
              : isCbtRejected
                ? 'Ujian CBT telah selesai dikerjakan.'
                : isFormVerified
                  ? 'Berkas Anda telah diverifikasi! Anda dapat mengikuti Ujian CBT Online sesuai dengan jadwal yang telah ditentukan.'
                  : 'Tahapan Ujian Online akan aktif setelah seluruh berkas formulir Anda diverifikasi (VERIFIED) oleh panitia.'}
              </p>
            </div>
            <div>
              ${isFormVerified ? `
                <a href="#cbt-peserta" class="btn btn-primary" style="width: 100%; text-align: center; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                  <i class="fa-solid fa-laptop-code"></i> ${isCbtCompleted ? 'Lihat Status Ujian CBT' : 'Buka Halaman Ujian Online'}
                </a>
              ` : `
                <button type="button" class="btn btn-secondary" style="width: 100%; opacity: 0.75; cursor: not-allowed;" disabled>
                  <i class="fa-solid fa-lock"></i> Menunggu Verifikasi Berkas
                </button>
              `}
            </div>
          </div>
        `;
        cards.push({ id: 'cbt', priority: cbtPriority, html: cbtCardHtml });

        // 5. CARD PILIHAN PENDIDIKAN & PEMBAYARAN
        let eduPriority = 70;
        if (isPayWaiting || isPayRejected) eduPriority = 99;

        const eduCardHtml = `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(99, 102, 241, 0.1); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-school"></i>
                </div>
                <span class="badge ${isMukim ? 'badge-primary' : 'badge-secondary'}" style="font-size: 0.75rem;">
                  ${isMukim ? 'MUKIM' : 'NON-MUKIM'}
                </span>
              </div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 10px;">Pilihan Pendidikan</h3>
              <div style="font-size: 0.875rem; color: var(--text-main); display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
                <div>Unit Sekolah: <strong>${schoolName}</strong></div>
                <div>Jurusan: <strong>${majorName}</strong></div>
                <div>Program Kelas: <strong>${className}</strong></div>
                <div>Status: <strong>${boardingLabel}</strong></div>
              </div>
            </div>
            <a href="#detail/${reg.id}" class="btn btn-secondary" style="text-align: center; font-weight: 600;">
              <i class="fa-solid fa-receipt"></i> Status & Bukti Pembayaran
            </a>
          </div>
        `;
        cards.push({ id: 'edu', priority: eduPriority, html: eduCardHtml });

        // Sort descending by priority so latest/most active info comes first
        cards.sort((a, b) => b.priority - a.priority);

        return `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 24px;">
            ${cards.map(c => c.html).join('')}
          </div>
        `;
      })()}

      <!-- INFORMASI PENTING / BANTUAN -->
      <div class="card" style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i class="fa-solid fa-circle-question" style="color: var(--primary-500); font-size: 1.5rem;"></i>
          <div>
            <div style="font-weight: 700; color: var(--text-heading); font-size: 0.95rem;">Butuh Panduan & Bantuan Pendaftaran?</div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">Pelajari tata cara pengisian formulir, persyaratan berkas, alur seleksi, serta info nomor rekening panitia.</div>
          </div>
        </div>
        <a href="#panduan" class="btn btn-sm btn-secondary" style="font-weight: 600;">
          <i class="fa-solid fa-book-open"></i> Panduan
        </a>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function renderPanduanView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; color: var(--text-muted); font-weight: 500;">Memuat panduan pendaftaran...</p>
    </div>
  `;

  let accountsHtml = '<div style="text-align: center; padding: 24px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">Belum ada data rekening bank resmi yang ditambahkan panitia.</div>';
  try {
    const res = await apiRequest('/api/payments/accounts');
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      accountsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          ${res.data.map(acc => `
            <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
              ${acc.qrisImagePath ? `
                <div style="background: #ffffff; padding: 16px; text-align: center; border-bottom: 1px solid var(--border-subtle);">
                  <img src="/api/payments/accounts/qris/${acc.qrisImagePath}" alt="QRIS ${escapeHtml(acc.bankName)}" style="max-height: 180px; max-width: 100%; object-fit: contain;" onerror="this.parentElement.style.display='none'">
                  <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px; font-weight: 600;">Scan QRIS untuk Pembayaran Cepat</div>
                </div>
              ` : ''}
              <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <span class="badge badge-primary" style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px;">${escapeHtml(acc.bankName)}</span>
                    <i class="fa-solid fa-building-columns" style="color: var(--primary-600); font-size: 1.25rem;"></i>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Nomor Rekening:</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0 12px; background: var(--bg-body); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <span style="font-size: 1.2rem; font-weight: 800; color: var(--primary-600); font-family: monospace; letter-spacing: 0.05em;" id="acc-num-${acc.id}">${escapeHtml(acc.accountNumber)}</span>
                    <button type="button" class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText('${acc.accountNumber}'); showToast('Nomor rekening disalin!', 'success');" title="Salin Nomor Rekening" style="padding: 4px 8px; font-size: 0.8rem;">
                      <i class="fa-regular fa-copy"></i>
                    </button>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Atas Nama:</div>
                  <div style="font-size: 1rem; font-weight: 700; color: var(--text-heading); margin-top: 2px;">${escapeHtml(acc.accountHolder)}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (e) {
    console.error('Failed to load accounts for panduan', e);
  }

  container.innerHTML = `
    <div style="max-width: 1100px; margin: 0 auto; animation: fadeIn 0.2s ease;">
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <a href="#overview" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: 600;">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
          </a>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0 0 4px; font-weight: 800;">
            <i class="fa-solid fa-book-open" style="color: var(--primary-600); margin-right: 8px;"></i> Panduan Pendaftaran Santri Baru
          </h2>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.95rem;">
            Pelajari alur pendaftaran, persyaratan berkas, tahapan ujian seleksi, dan nomor rekening pembayaran resmi panitia.
          </p>
        </div>
        <a href="#overview" class="btn btn-secondary btn-sm" style="font-weight: 600;">
          <i class="fa-solid fa-gauge-high"></i> Dashboard Utama
        </a>
      </div>

      <!-- Alur Pendaftaran Cards -->
      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 16px; font-weight: 700;">
          <i class="fa-solid fa-diagram-project" style="color: var(--primary-600); margin-right: 6px;"></i> 5 Tahapan Alur Pendaftaran
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-600); margin-bottom: 8px;">01</div>
            <h4 style="font-size: 0.95rem; color: var(--text-heading); margin-bottom: 6px; font-weight: 700;">Daftar Akun & Program</h4>
            <p style="color: var(--text-muted); font-size: 0.825rem; line-height: 1.5; margin: 0;">Buat akun pendaftar dan tentukan jenjang sekolah serta program kelas yang diinginkan.</p>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-600); margin-bottom: 8px;">02</div>
            <h4 style="font-size: 0.95rem; color: var(--text-heading); margin-bottom: 6px; font-weight: 700;">Bayar Biaya Pendaftaran</h4>
            <p style="color: var(--text-muted); font-size: 0.825rem; line-height: 1.5; margin: 0;">Transfer biaya pendaftaran ke salah satu rekening panitia resmi dan unggah bukti transfer.</p>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--warning-600); margin-bottom: 8px;">03</div>
            <h4 style="font-size: 0.95rem; color: var(--text-heading); margin-bottom: 6px; font-weight: 700;">Lengkapi Biodata & Berkas</h4>
            <p style="color: var(--text-muted); font-size: 0.825rem; line-height: 1.5; margin: 0;">Setelah pembayaran disetujui, isi formulir biodata lengkap dan unggah dokumen persyaratan.</p>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--success-600); margin-bottom: 8px;">04</div>
            <h4 style="font-size: 0.95rem; color: var(--text-heading); margin-bottom: 6px; font-weight: 700;">Ujian CBT & Wawancara</h4>
            <p style="color: var(--text-muted); font-size: 0.825rem; line-height: 1.5; margin: 0;">Ikuti ujian seleksi CBT online dan tes wawancara santri & wali sesuai jadwal yang tertera.</p>
          </div>

          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7; margin-bottom: 8px;">05</div>
            <h4 style="font-size: 0.95rem; color: var(--text-heading); margin-bottom: 6px; font-weight: 700;">Pengumuman Kelulusan</h4>
            <p style="color: var(--text-muted); font-size: 0.825rem; line-height: 1.5; margin: 0;">Lihat hasil pengumuman kelulusan di dashboard akun dan lakukan proses daftar ulang.</p>
          </div>
        </div>
      </div>

      <!-- Persyaratan Dokumen -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 32px; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 14px; font-weight: 700;">
          <i class="fa-solid fa-file-circle-check" style="color: var(--primary-600); margin-right: 6px;"></i> Persyaratan Berkas yang Perlu Disiapkan
        </h3>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">
          Pastikan Anda telah menyiapkan pindaian/scan dokumen format JPG/PNG/PDF yang jelas dan terbaca:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-id-card" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">Kartu Keluarga (KK)</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Memuat data calon santri dan NIK keluarga.</div></div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-certificate" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">Akta Kelahiran</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Bukti sah kelahiran calon santri.</div></div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-address-card" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">KTP Orang Tua / Wali</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Scan KTP Ayah dan Ibu/Wali aktif.</div></div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-graduation-cap" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">Ijazah / SKL / Rapor</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Surat keterangan dari sekolah asal.</div></div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-image" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">Pas Foto Formal</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Berpakaian rapi (putra berpeci, putri berbusana muslimah).</div></div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-trophy" style="color: var(--primary-600); margin-top: 3px;"></i>
            <div><strong style="font-size: 0.875rem;">Sertifikat Prestasi (Opsional)</strong><div style="font-size: 0.775rem; color: var(--text-muted);">Sertifikat tahfidz / piagam kejuaraan.</div></div>
          </div>
        </div>
      </div>

      <!-- Rekening Resmi -->
      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 1.15rem; color: var(--text-heading); margin-bottom: 8px; font-weight: 700;">
          <i class="fa-solid fa-credit-card" style="color: var(--primary-600); margin-right: 6px;"></i> Rekening Pembayaran Resmi Panitia
        </h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">
          Harap hanya mentransfer biaya pendaftaran ke salah satu rekening atau scan QRIS berikut:
        </p>
        ${accountsHtml}
      </div>

      <!-- Informasi Kontak & Bantuan -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(15, 118, 110, 0.1); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            <i class="fa-solid fa-headset"></i>
          </div>
          <div style="flex: 1; min-width: 240px;">
            <h4 style="margin: 0 0 4px; font-size: 1rem; color: var(--text-heading); font-weight: 700;">Butuh Bantuan Selama Pendaftaran?</h4>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.875rem;">Tim sekretariat PSB siap membantu Anda jika terdapat kendala verifikasi, konfirmasi transfer, atau kendala teknis ujian CBT.</p>
          </div>
          <a href="/kontak.html" target="_blank" class="btn btn-primary" style="font-weight: 600;">
            <i class="fa-brands fa-whatsapp"></i> Hubungi Panitia
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderPesertaRegistrationsTable() {
  const ts = tableState.pesertaRegs;
  return renderUniversalTable({
    tableId: 'peserta-regs-table',
    columns: [
      {
        header: 'No. Registrasi',
        key: 'registrationNumber',
        render: r => `<code style="font-weight: 800; color: var(--primary-600);">${r.registrationNumber}</code>`,
      },
      {
        header: 'Pilihan Sekolah & Program',
        sortValue: r => r.classProgramName || r.branch?.name || '',
        render: r => `<strong>${r.classProgramName || r.branch?.name || '-'}</strong><br><small style="color: var(--text-muted);">${r.schoolName || r.branch?.level?.category?.name || '-'} &bull; ${r.majorName || r.branch?.level?.name || '-'}</small>`,
      },
      {
        header: 'Tipe',
        sortValue: r => r.branch?.participantType,
        render: r => `<span class="badge ${r.branch.participantType === 'INDIVIDUAL' ? 'badge-info' : 'badge-primary'}">${r.branch.participantType === 'INDIVIDUAL' ? 'INDIVIDU' : 'TIM'}</span>`,
      },
      {
        header: 'Peserta / Tim',
        sortValue: r => (r.branch.participantType === 'INDIVIDUAL' ? r.individualParticipant?.fullName : r.team?.teamName) || '',
        render: r => `<strong>${r.branch.participantType === 'INDIVIDUAL' ? (r.individualParticipant?.fullName || '-') : (r.team?.teamName || '-')}</strong><br><small style="color:var(--text-muted);">${(r.branch.participantType === 'INDIVIDUAL' ? r.individualParticipant?.schoolName : r.team?.schoolName) || '-'}</small>`,
      },
      {
        header: 'Status Pembayaran',
        key: 'status',
        render: r => getStatusBadge(r.status),
      },
      {
        header: 'Status Formulir',
        sortValue: r => r.formStatus || (r.isFormUnlocked ? 'DRAFT' : 'LOCKED'),
        render: r => {
          const fs = r.formStatus || (r.isFormUnlocked ? 'DRAFT' : 'LOCKED');
          if (fs === 'VERIFIED') return `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> TERVERIFIKASI</span>`;
          if (fs === 'REVISION_REQUIRED') return `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> PERLU REVISI</span>`;
          if (fs === 'SUBMITTED') return `<span class="badge badge-info"><i class="fa-solid fa-paper-plane"></i> TERKIRIM</span>`;
          if (fs === 'UNDER_REVIEW') return `<span class="badge badge-warning"><i class="fa-solid fa-magnifying-glass"></i> DIPERIKSA</span>`;
          if (fs === 'DRAFT' || r.isFormUnlocked) return `<span class="badge badge-warning"><i class="fa-solid fa-pen"></i> DRAFT (DIISI)</span>`;
          return `<span class="badge badge-secondary" style="background:#475569;"><i class="fa-solid fa-lock"></i> TERKUNCI</span>`;
        },
      },
      {
        header: 'Aksi',
        sticky: true,
        sortable: false,
        render: r => {
          let buttons = `<a href="#detail/${r.id}" class="btn btn-sm btn-secondary" style="padding: 4px 10px;"><i class="fa-solid fa-circle-info"></i> Detail</a> `;
          if (r.isFormUnlocked || r.status === 'APPROVED') {
            buttons += `<a href="#formulir/${r.id}" class="btn btn-sm btn-primary" style="padding: 4px 10px;"><i class="fa-solid fa-file-signature"></i> Formulir</a> `;
            buttons += `<button type="button" class="btn btn-sm btn-success" style="padding: 4px 10px;" onclick="openParticipantCardModal('${r.id}')"><i class="fa-solid fa-id-card"></i> Bukti/Kartu</button>`;
          }
          return `<div style="display: flex; flex-direction: column; gap: 4px;">${buttons}</div>`;
        },
      },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: [
      'registrationNumber',
      r => r.branch?.name,
      r => r.individualParticipant?.fullName,
      r => r.team?.teamName,
      r => r.individualParticipant?.schoolName,
      r => r.team?.schoolName,
    ],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    filterKey: 'status',
    filterValue: ts.filterVal,
    filterOptions: [
      { label: 'Semua Status', value: '' },
      { label: 'Disetujui (Approved)', value: 'APPROVED' },
      { label: 'Menunggu Verifikasi', value: 'WAITING_VERIFICATION' },
      { label: 'Perlu Perbaikan (Ditolak)', value: 'PAYMENT_REJECTED' },
    ],
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onPesertaPageChange',
    onSearchChangeName: 'onPesertaSearchChange',
    onPageSizeChangeName: 'onPesertaPageSizeChange',
    onSortChangeName: 'onPesertaSortChange',
    onFilterChangeName: 'onPesertaFilterChange',
    emptyMessage: 'Belum ada data pendaftaran calon santri.',
  });
}

function updateUniversalTable(slotId, renderFn) {
  const result = renderFn();
  if (result) {
    const slot = document.getElementById(slotId);
    if (slot) slot.innerHTML = result;
  }
}

function onPesertaPageChange(page) {
  tableState.pesertaRegs.page = page;
  updateUniversalTable('peserta-regs-table-slot', renderPesertaRegistrationsTable);
}
function onPesertaSearchChange(val) {
  tableState.pesertaRegs.search = val;
  tableState.pesertaRegs.page = 1;
  updateUniversalTable('peserta-regs-table-slot', renderPesertaRegistrationsTable);
}
function onPesertaPageSizeChange(size) {
  tableState.pesertaRegs.pageSize = size;
  tableState.pesertaRegs.page = 1;
  updateUniversalTable('peserta-regs-table-slot', renderPesertaRegistrationsTable);
}
function onPesertaSortChange(k) {
  if (tableState.pesertaRegs.sortKey === k) {
    tableState.pesertaRegs.sortDir = tableState.pesertaRegs.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.pesertaRegs.sortKey = k;
    tableState.pesertaRegs.sortDir = 'asc';
  }
  updateUniversalTable('peserta-regs-table-slot', renderPesertaRegistrationsTable);
}
function onPesertaFilterChange(v) {
  tableState.pesertaRegs.filterVal = v;
  tableState.pesertaRegs.page = 1;
  updateUniversalTable('peserta-regs-table-slot', renderPesertaRegistrationsTable);
}

// --- FULL-PAGE REGISTRATION WIZARD (NOT POPUP) ---
async function renderPesertaRegistrationWizard() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat formulir pendaftaran...</div>';

  try {
    const myRegsRes = await apiRequest('/api/registrations/my');
    const myRegs = myRegsRes.success ? (myRegsRes.data || []) : [];
    if (myRegs.length > 0) {
      const activeReg = myRegs[0];
      container.innerHTML = `
        <div style="max-width: 650px; margin: 40px auto; text-align: center;">
          <div class="card" style="background: var(--bg-card); border: 2px solid var(--primary-500); border-radius: var(--radius-xl); padding: 36px; box-shadow: var(--shadow-md);">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(14, 165, 233, 0.1); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
              <i class="fa-solid fa-user-check"></i>
            </div>
            <h2 style="font-size: 1.4rem; color: var(--text-heading); margin-bottom: 8px;">Pendaftaran Sudah Terdaftar</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
              Akun Anda telah memiliki pendaftaran calon santri aktif dengan nomor <strong>${activeReg.registrationNumber}</strong>. Setiap akun hanya dapat digunakan untuk mendaftarkan 1 calon siswa.
            </p>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <a href="#formulir/${activeReg.id}" class="btn btn-primary"><i class="fa-solid fa-file-signature"></i> Buka Formulir Pendaftaran</a>
              <a href="#overview" class="btn btn-secondary"><i class="fa-solid fa-house"></i> Kembali ke Dashboard</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const [accRes, periodRes] = await Promise.all([
      apiRequest('/api/payments/accounts'),
      apiRequest('/api/competitions/periods/active'),
    ]);
    if (accRes.success && accRes.data) state.paymentAccounts = accRes.data;
    state.activePeriod = periodRes.success ? periodRes.data : null;
  } catch (e) { }

  const activePeriod = state.activePeriod;
  const availableWaves = activePeriod?.availableWaves || [];

  if (!activePeriod || availableWaves.length === 0) {
    container.innerHTML = `
      <div style="max-width: 750px; margin: 40px auto; text-align: center;">
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 40px;">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: var(--warning-500); margin-bottom: 16px;"></i>
          <h2 style="font-size: 1.5rem; color: var(--text-heading); margin-bottom: 8px;">Pendaftaran Belum Dibuka</h2>
          <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 24px;">
            Pendaftaran santri baru saat ini belum dibuka atau sudah ditutup. Silakan cek kembali jadwal pembukaan gelombang berikutnya.
          </p>
          <a href="#overview" class="btn btn-primary"><i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="max-width: 850px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <a href="#overview" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
        </a>
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Pendaftaran Awal Calon Santri Baru (PSB)</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Tahun Pelajaran <strong>${activePeriod.name}</strong>. Pilih gelombang, sekolah, program kelas, dan status mukim/mondok.</p>
      </div>

      <div id="wizard-alert" style="display: none; padding: 14px; border-radius: 8px; margin-bottom: 20px;"></div>

      <form id="full-registration-form" onsubmit="handleFullRegistrationSubmit(event)">
        
        <!-- SECTION 1: PERIODE, GELOMBANG, SEKOLAH & PROGRAM KELAS -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">1</span>
            Periode, Gelombang & Pilihan Pendidikan
          </h3>

          <input type="hidden" id="wiz-period-id" value="${activePeriod.id}">

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Gelombang Pendaftaran Aktif</label>
            <select id="wiz-wave-id" class="form-select" onchange="onWizardWaveChange()" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              ${availableWaves.map(w => `<option value="${w.id}" data-fee="${w.registrationFee}">${w.name} (${formatDate(w.startDate)} - ${formatDate(w.endDate)}) &bull; Biaya: ${formatCurrency(w.registrationFee)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Pilihan Sekolah</label>
            <select id="wiz-cat" class="form-select" onchange="onWizardCatSelect()" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="">-- Pilih Sekolah Tujuan --</option>
              ${state.competitionTree.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Pilihan Jurusan / Peminatan</label>
            <select id="wiz-lvl" class="form-select" onchange="onWizardLvlSelect()" disabled required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="">-- Pilih Sekolah Terlebih Dahulu --</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Pilihan Program Kelas</label>
            <select id="wiz-branch" class="form-select" onchange="onWizardBranchSelect()" disabled required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="">-- Pilih Program Kelas --</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Apakah Calon Santri Akan Mukim / Mondok?</label>
            <select id="wiz-boarding" class="form-select" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              <option value="MUKIM">Ya, Mukim / Mondok di Pesantren</option>
              <option value="NON_MUKIM">Tidak, Non-Mukim (Pulang-Pergi)</option>
            </select>
          </div>

          <!-- Program Details Banner -->
          <div id="wiz-branch-info" style="display: none; padding: 16px; background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-md); margin-top: 14px;"></div>
        </div>

        <!-- SECTION 2: DATA AWAL CALON SISWA -->
        <div id="wiz-participant-section" class="card" style="display: none; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">2</span>
            Data Awal Calon Santri
          </h3>
          <div id="wiz-participant-fields"></div>
        </div>

        <!-- SECTION 3: PEMBAYARAN BIAYA FORMULIR & BUKTI TRANSFER -->
        <div id="wiz-payment-section" class="card" style="display: none; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-600); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">3</span>
            Pembayaran Biaya Formulir & Bukti Transfer
          </h3>

          <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Biaya Formulir / Pendaftaran: <strong id="wiz-pay-fee-label" style="color: var(--primary-600); font-size: 1.2rem; margin-left: 6px;">${formatCurrency(availableWaves[0]?.registrationFee ? Number(availableWaves[0].registrationFee) : 500000)}</strong></div>
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">Silakan transfer ke salah satu rekening resmi panitia PSB di bawah ini:</div>
          </div>

          <!-- REKENING BANK TRANSFER -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-building-columns" style="color: var(--primary-500);"></i> Rekening Resmi Panitia
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${state.paymentAccounts.map((acc, idx) => `
                <label for="wiz-pay-radio-${idx}" style="cursor: pointer;">
                  <div class="wiz-pay-card" id="wiz-pay-card-${idx}" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 2px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-subtle); transition: border-color 0.15s, background 0.15s;">
                    <input type="radio" name="wiz-pay-method" id="wiz-pay-radio-${idx}" value="${acc.id}" data-qris="${acc.qrisImagePath || ''}" onchange="onWizPayMethodChange(this, ${idx}, '${acc.qrisImagePath || ''}')" style="accent-color: var(--primary-500); width: 16px; height: 16px; flex-shrink: 0;" ${idx === 0 ? 'checked' : ''}>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 700; color: var(--text-heading); font-size: 0.9rem;">${acc.bankName}</div>
                      <div style="font-family: monospace; font-size: 1rem; font-weight: 800; color: var(--primary-600); letter-spacing: 0.04em;">${acc.accountNumber}</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">a.n. ${acc.accountHolder}</div>
                    </div>
                    <i class="fa-solid fa-copy" title="Salin nomor rekening" onclick="event.preventDefault(); navigator.clipboard.writeText('${acc.accountNumber}'); this.style.color='var(--success-500)'; setTimeout(()=>this.style.color='',1200);" style="color: var(--text-dim); cursor: pointer; font-size: 0.9rem; flex-shrink: 0;"></i>
                  </div>
                </label>
              `).join('')}
            </div>
            <!-- hidden select untuk kompatibilitas submit lama -->
            <input type="hidden" id="wiz-pay-account" value="${state.paymentAccounts[0]?.id || ''}">
          </div>

          <!-- QRIS SECTION -->
          ${state.paymentAccounts.some(a => a.qrisImagePath) ? `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-qrcode" style="color: #22c55e;"></i> Bayar via QRIS
              <span style="font-size: 0.7rem; font-weight: 400; color: var(--text-dim); text-transform: none;">(scan langsung dari HP)</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
              ${state.paymentAccounts.filter(a => a.qrisImagePath).map((acc, qi) => `
                <div class="wiz-qris-card" id="wiz-qris-card-${qi}" onclick="selectQrisAccount('${acc.id}', ${qi})" style="cursor: pointer; border: 2px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-card); transition: border-color 0.15s, box-shadow 0.15s;">
                  <div style="background: #fff; padding: 12px; text-align: center;">
                    <img src="/api/payments/accounts/qris/${acc.qrisImagePath}" alt="QRIS ${acc.bankName}" style="max-height: 160px; max-width: 100%; object-fit: contain;" onerror="this.closest('.wiz-qris-card').style.display='none'">
                  </div>
                  <div style="padding: 8px 10px; border-top: 1px solid var(--border-subtle);">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-heading);">${acc.bankName}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">a.n. ${acc.accountHolder}</div>
                    <div id="wiz-qris-check-${qi}" style="display:none; margin-top: 4px; color: #22c55e; font-size: 0.75rem; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Dipilih</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: 4px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-receipt" style="color: var(--primary-500);"></i> Detail Pengirim & Upload Bukti
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Bank Pengirim <span id="wiz-bank-optional" style="color:var(--text-dim); font-weight:400;">(opsional jika QRIS)</span></label>
                <input type="text" id="wiz-pay-bank" class="form-control" placeholder="Contoh: BCA / Mandiri / BSI / QRIS" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
              <div class="form-group">
                <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Nama Pemilik Rekening Pengirim</label>
                <input type="text" id="wiz-pay-sender" class="form-control" placeholder="Nama pengirim / orang tua" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Tanggal Transfer / Pembayaran</label>
              <input type="date" id="wiz-pay-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">File Bukti Transfer / Screenshot QRIS (PNG, JPG, WEBP - Max 5MB)</label>
              <input type="file" id="wiz-pay-file" class="form-control" accept="image/png, image/jpeg, image/webp" onchange="previewProofImage(this)" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            </div>
          </div>

          <!-- Image Preview Slot -->
          <div id="wiz-img-preview-slot" style="display: none; margin-bottom: 16px; text-align: center; background: #000; border-radius: 8px; padding: 10px;">
            <img id="wiz-preview-img" src="" alt="Preview Bukti" style="max-height: 200px; max-width: 100%; object-fit: contain;">
          </div>
        </div>


        <button type="submit" id="wiz-submit-btn" class="btn btn-primary" style="width: 100%; padding: 14px; font-weight: 700; font-size: 1rem;" disabled>
          <i class="fa-solid fa-check"></i> Simpan Pendaftaran Awal & Kirim Bukti Pembayaran
        </button>
      </form>
    </div>
  `;
}

function onWizardWaveChange() {
  const waveSelect = document.getElementById('wiz-wave-id');
  const selectedOpt = waveSelect?.options[waveSelect.selectedIndex];
  const fee = selectedOpt ? Number(selectedOpt.getAttribute('data-fee') || 0) : 0;
  const payFeeLabel = document.getElementById('wiz-pay-fee-label');
  if (payFeeLabel) {
    payFeeLabel.textContent = formatCurrency(fee);
  }
}

function onWizardCatSelect() {
  const catId = document.getElementById('wiz-cat').value;
  const lvlSelect = document.getElementById('wiz-lvl');
  const branchSelect = document.getElementById('wiz-branch');
  const partSec = document.getElementById('wiz-participant-section');
  const paySec = document.getElementById('wiz-payment-section');
  const infoBanner = document.getElementById('wiz-branch-info');
  const submitBtn = document.getElementById('wiz-submit-btn');

  lvlSelect.innerHTML = '<option value="">-- Pilih Jurusan --</option>';
  branchSelect.innerHTML = '<option value="">-- Pilih Program Kelas --</option>';
  branchSelect.disabled = true;
  partSec.style.display = 'none';
  paySec.style.display = 'none';
  infoBanner.style.display = 'none';
  submitBtn.disabled = true;

  if (!catId) {
    lvlSelect.disabled = true;
    return;
  }

  const category = state.competitionTree.find(c => c.id === catId);
  if (category) {
    const levels = category.majors || category.levels || [];
    levels.forEach(lvl => {
      lvlSelect.innerHTML += `<option value="${lvl.id}">${lvl.name}</option>`;
    });
    lvlSelect.disabled = false;
  }
}

function onWizardLvlSelect() {
  const catId = document.getElementById('wiz-cat').value;
  const lvlId = document.getElementById('wiz-lvl').value;
  const branchSelect = document.getElementById('wiz-branch');
  const partSec = document.getElementById('wiz-participant-section');
  const paySec = document.getElementById('wiz-payment-section');
  const infoBanner = document.getElementById('wiz-branch-info');
  const submitBtn = document.getElementById('wiz-submit-btn');

  branchSelect.innerHTML = '<option value="">-- Pilih Program Kelas --</option>';
  partSec.style.display = 'none';
  paySec.style.display = 'none';
  infoBanner.style.display = 'none';
  submitBtn.disabled = true;

  if (!lvlId) {
    branchSelect.disabled = true;
    return;
  }

  const category = state.competitionTree.find(c => c.id === catId);
  const levels = category?.majors || category?.levels || [];
  const level = levels.find(l => l.id === lvlId);

  if (level) {
    const branches = level.classPrograms || level.branches || [];
    branches.forEach(br => {
      branchSelect.innerHTML += `<option value="${br.id}">${br.name}</option>`;
    });
    branchSelect.disabled = false;
  }
}

function onWizardBranchSelect() {
  const catId = document.getElementById('wiz-cat').value;
  const lvlId = document.getElementById('wiz-lvl').value;
  const branchId = document.getElementById('wiz-branch').value;
  const partSec = document.getElementById('wiz-participant-section');
  const partFields = document.getElementById('wiz-participant-fields');
  const paySec = document.getElementById('wiz-payment-section');
  const infoBanner = document.getElementById('wiz-branch-info');
  const submitBtn = document.getElementById('wiz-submit-btn');

  if (!branchId) {
    partSec.style.display = 'none';
    paySec.style.display = 'none';
    infoBanner.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  const category = state.competitionTree.find(c => c.id === catId);
  const levels = category?.majors || category?.levels || [];
  const level = levels.find(l => l.id === lvlId);
  const branches = level?.classPrograms || level?.branches || [];
  const branch = branches.find(b => b.id === branchId);

  if (!branch) return;

  const waveSelect = document.getElementById('wiz-wave-id');
  const selectedOpt = waveSelect?.options[waveSelect.selectedIndex];
  const waveFee = selectedOpt ? Number(selectedOpt.getAttribute('data-fee') || 500000) : 500000;
  const waveFeeFormatted = formatCurrency(waveFee);

  partSec.style.display = 'block';
  paySec.style.display = 'block';
  submitBtn.disabled = false;

  infoBanner.style.display = 'block';
  infoBanner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <span class="badge badge-primary"><i class="fa-solid fa-graduation-cap"></i> Pilihan Pendidikan</span>
        <strong style="margin-left: 8px; font-size: 1rem; color: var(--text-heading);">${category.name} &bull; ${level.name} &bull; ${branch.name}</strong>
      </div>
      <div>
        <span style="font-size: 0.8rem; color: var(--text-dim);">Biaya Formulir (Gelombang):</span>
        <strong style="color: var(--primary-600); font-size: 1.15rem; margin-left: 4px;">${waveFeeFormatted}</strong>
      </div>
    </div>
  `;

  const payFeeLabel = document.getElementById('wiz-pay-fee-label');
  if (payFeeLabel) {
    payFeeLabel.textContent = waveFeeFormatted;
  }

  // CALON SISWA INDIVIDUAL INITIAL REGISTRATION FORM
  partFields.innerHTML = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Nama Lengkap Calon Siswa</label>
      <input type="text" id="wiz-indiv-name" class="form-control" placeholder="Nama Lengkap Siswa/i" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Jenis Kelamin</label>
        <select id="wiz-indiv-gender" class="form-select" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="L">Laki-laki (L)</option>
          <option value="P">Perempuan (P)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">No WhatsApp / HP Aktif</label>
        <input type="text" id="wiz-indiv-wa" class="form-control" placeholder="08123456789" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Asal Sekolah</label>
      <input type="text" id="wiz-indiv-school" class="form-control" placeholder="Contoh: MTs Maskumambang" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
    </div>
  `;
}

function onWizPayMethodChange(radio, idx, qrisPath) {
  const hidden = document.getElementById('wiz-pay-account');
  if (hidden) hidden.value = radio.value;

  document.querySelectorAll('.wiz-pay-card').forEach((c, i) => {
    c.style.borderColor = i === idx ? 'var(--primary-500)' : 'var(--border-subtle)';
    c.style.background = i === idx ? 'var(--bg-highlight, rgba(99,102,241,0.06))' : 'var(--bg-subtle)';
  });

  document.querySelectorAll('[id^="wiz-qris-check-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.wiz-qris-card').forEach(el => {
    el.style.borderColor = 'var(--border-subtle)';
    el.style.boxShadow = 'none';
  });

  if (qrisPath) {
    const bankInput = document.getElementById('wiz-pay-bank');
    if (bankInput && !bankInput.value) bankInput.placeholder = 'QRIS (opsional)';
  }
}

function selectQrisAccount(accountId, qrisIdx) {
  const hidden = document.getElementById('wiz-pay-account');
  if (hidden) hidden.value = accountId;

  const radios = document.querySelectorAll('input[name="wiz-pay-method"]');
  let radioIdx = -1;
  radios.forEach((r, i) => {
    if (r.value === accountId) {
      r.checked = true;
      radioIdx = i;
    }
  });

  document.querySelectorAll('.wiz-pay-card').forEach((c, i) => {
    c.style.borderColor = i === radioIdx ? 'var(--primary-500)' : 'var(--border-subtle)';
    c.style.background = i === radioIdx ? 'var(--bg-highlight, rgba(99,102,241,0.06))' : 'var(--bg-subtle)';
  });

  document.querySelectorAll('.wiz-qris-card').forEach((el, i) => {
    el.style.borderColor = i === qrisIdx ? '#22c55e' : 'var(--border-subtle)';
    el.style.boxShadow = i === qrisIdx ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none';
  });
  document.querySelectorAll('[id^="wiz-qris-check-"]').forEach((el, i) => {
    el.style.display = i === qrisIdx ? 'block' : 'none';
  });

  const bankInput = document.getElementById('wiz-pay-bank');
  if (bankInput && !bankInput.value) {
    bankInput.value = 'QRIS';
    bankInput.placeholder = 'QRIS';
  }
}

function previewProofImage(input) {
  const slot = document.getElementById('wiz-img-preview-slot');
  const img = document.getElementById('wiz-preview-img');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      img.src = e.target.result;
      slot.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    slot.style.display = 'none';
  }
}

async function handleFullRegistrationSubmit(e) {
  e.preventDefault();
  const periodId = document.getElementById('wiz-period-id')?.value;
  const waveId = document.getElementById('wiz-wave-id')?.value;
  const branchId = document.getElementById('wiz-branch')?.value;
  const boardingStatus = document.getElementById('wiz-boarding')?.value || 'MUKIM';
  const fileInput = document.getElementById('wiz-pay-file');
  const btn = document.getElementById('wiz-submit-btn');

  if (!branchId) return;

  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Wajib mengunggah file bukti transfer pembayaran.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan pendaftaran & bukti pembayaran...';

  try {
    // 1. Submit Initial PSB Registration
    const regPayload = {
      academicPeriodId: periodId,
      admissionWaveId: waveId,
      boardingStatus,
      classProgramId: branchId,
      fullName: document.getElementById('wiz-indiv-name').value,
      gender: document.getElementById('wiz-indiv-gender').value,
      schoolName: document.getElementById('wiz-indiv-school') ? document.getElementById('wiz-indiv-school').value : '',
      whatsappNumber: document.getElementById('wiz-indiv-wa').value,
    };

    const regRes = await apiRequest('/api/registrations/individual', {
      method: 'POST',
      body: regPayload,
    });

    if (!regRes.success || !regRes.data) {
      throw new Error(regRes.message || 'Gagal menyimpan pendaftaran.');
    }

    const regId = regRes.data.id;

    // 2. Upload Payment Proof immediately
    const formData = new FormData();
    formData.append('registrationId', regId);
    formData.append('paymentAccountId', document.getElementById('wiz-pay-account').value);
    formData.append('senderBank', document.getElementById('wiz-pay-bank').value);
    formData.append('senderAccountName', document.getElementById('wiz-pay-sender').value);
    formData.append('paymentDate', document.getElementById('wiz-pay-date').value);
    formData.append('payment_proof', fileInput.files[0]);

    await apiRequest('/api/payments/upload', {
      method: 'POST',
      body: formData,
    });

    // 3. Success Redirect
    window.location.hash = `#detail/${regId}`;
    showToast('Pendaftaran awal dan bukti transfer berhasil dikirim!', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Simpan Pendaftaran Awal & Kirim Bukti Pembayaran';
    alert(err.message || 'Terjadi kesalahan saat memproses pendaftaran.');
  }
}

// --- RINGKASAN & DETAIL PENDAFTARAN PSB (FULL PAGE) ---
async function renderPesertaRegistrationDetail(regId) {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat ringkasan pendaftaran...</div>';

  try {
    const res = await apiRequest(`/api/registrations/${regId}`);
    if (!res.success || !res.data) throw new Error('Data pendaftaran tidak ditemukan.');

    const reg = res.data;
    const participantName = reg.individualParticipant?.fullName || reg.team?.teamName || 'Calon Siswa';
    const schoolOrigin = reg.individualParticipant?.schoolName || reg.team?.schoolName || '-';
    const targetSchool = reg.schoolName || reg.branch?.level?.category?.name || '-';
    const targetMajor = reg.majorName || reg.branch?.level?.name || '-';
    const targetProgram = reg.classProgramName || reg.branch?.name || '-';
    const latestPayment = reg.payments && reg.payments[0] ? reg.payments[0] : null;
    const rejectionLog = latestPayment?.verificationLogs?.find(l => l.action === 'REJECTED');
    const isFormUnlocked = reg.isFormUnlocked || reg.status === 'APPROVED';

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <a href="#overview" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
            </a>
            <h2 style="font-size: 1.6rem; color: var(--text-heading); margin: 0;">Ringkasan Pendaftaran Calon Siswa</h2>
          </div>
          <div>
            ${reg.status === 'APPROVED' ? `
              <button type="button" class="btn btn-success" onclick="openParticipantCardModal('${reg.id}')"><i class="fa-solid fa-id-card"></i> Cetak Bukti Pendaftaran</button>
            ` : ''}
          </div>
        </div>

        <div id="detail-alert" style="display: none; padding: 14px; border-radius: 8px; margin-bottom: 20px;"></div>

        <!-- FORMULIR PENDAFTARAN LENGKAP (FORM GATE CARD) -->
        ${isFormUnlocked ? `
          <div class="card" style="background: rgba(34, 197, 94, 0.08); border: 2px solid #22c55e; border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div style="max-width: 600px;">
                <span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-lock-open"></i> FORMULIR LENGKAP TERBUKA</span>
                <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 10px 0 6px 0;">Tahap 1 Sukses &mdash; Akses Formulir Lengkap Aktif</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  Pembayaran biaya pendaftaran/formulir telah <strong>disetujui (APPROVED)</strong>. Silahkan melengkapi data pada formulir lengkap yang telah terbuka. 
                </p>
              </div>
              <div>
                <button type="button" class="btn btn-success" style="padding: 12px 20px; font-weight: 700;" onclick="window.location.hash = '#formulir/${reg.id}'">
                  <i class="fa-solid fa-file-signature"></i> Buka Formulir Lengkap & Unggah Berkas
                </button>
              </div>
            </div>
          </div>
        ` : `
          <div class="card" style="background: rgba(234, 179, 8, 0.08); border: 2px solid #eab308; border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
              <div>
                <span class="badge badge-warning" style="font-size: 0.85rem; padding: 6px 12px;"><i class="fa-solid fa-lock"></i> FORMULIR LENGKAP TERKUNCI</span>
                <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 10px 0 6px 0;">Menunggu Verifikasi & Persetujuan Pembayaran</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  Formulir pendaftaran lengkap (biodata keluarga, riwayat nilai rapor, dan unggah berkas persyaratan) terkunci. Akses akan terbuka otomatis segera setelah bukti transfer diverifikasi dan disetujui (<strong>APPROVED</strong>). Mohon menunggu.
                </p>
              </div>
            </div>
          </div>
        `}

        <!-- Registration Main Overview Card -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
            <div>
              <span class="badge badge-primary" style="margin-bottom: 6px;"><i class="fa-solid fa-graduation-cap"></i> CALON SISWA BARU</span>
              <h3 style="font-size: 1.35rem; color: var(--text-heading); margin: 4px 0;">${participantName}</h3>
              <div style="color: var(--text-muted); font-size: 0.9rem;">Asal Sekolah: <strong>${schoolOrigin}</strong></div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Nomor Pendaftaran PSB</div>
              <code style="font-size: 1.25rem; font-weight: 800; color: var(--primary-600);">${reg.registrationNumber}</code>
              <div style="margin-top: 4px;">${getStatusBadge(reg.status)}</div>
            </div>
          </div>

          <!-- 2 Columns Details Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <div>
              <h4 style="font-size: 0.95rem; color: var(--primary-600); margin-bottom: 12px; text-transform: uppercase; font-weight: 800;"><i class="fa-solid fa-school"></i> Pilihan Pendidikan</h4>
              <table style="width: 100%; font-size: 0.875rem;">
                <tr><td style="color: var(--text-muted); padding: 4px 0; width: 120px;">Sekolah Tujuan:</td><td style="font-weight: 700; color: var(--text-heading);">${targetSchool}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">Jurusan:</td><td style="font-weight: 700; color: var(--text-heading);">${targetMajor}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">Program Kelas:</td><td style="font-weight: 700; color: var(--primary-600);">${targetProgram}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">Gelombang:</td><td style="font-weight: 700; color: var(--text-heading);">${reg.admissionWave?.name || 'Gelombang Aktif'}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">Biaya Formulir:</td><td style="font-weight: 800; color: var(--primary-600);">${formatCurrency(reg.admissionWave?.registrationFee || latestPayment?.amount || reg.classProgram?.registrationFee || 500000)}</td></tr>
              </table>
            </div>

            <div>
              <h4 style="font-size: 0.95rem; color: var(--primary-600); margin-bottom: 12px; text-transform: uppercase; font-weight: 800;"><i class="fa-solid fa-user"></i> Kontak Calon Siswa</h4>
              <table style="width: 100%; font-size: 0.875rem;">
                <tr><td style="color: var(--text-muted); padding: 4px 0; width: 120px;">Jenis Kelamin:</td><td style="font-weight: 700; color: var(--text-heading);">${reg.individualParticipant?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">No. WhatsApp:</td><td style="font-weight: 700; color: var(--text-heading);">${reg.individualParticipant?.whatsappNumber || '-'}</td></tr>
                <tr><td style="color: var(--text-muted); padding: 4px 0;">Waktu Mendaftar:</td><td style="color: var(--text-muted);">${formatDate(reg.createdAt)}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <!-- Payment Status & Proof Section -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 16px;"><i class="fa-solid fa-credit-card"></i> Status Pembayaran Formulir</h3>

          ${reg.status === 'PAYMENT_REJECTED' ? `
            <div class="alert alert-danger" style="margin-bottom: 20px;">
              <h4 style="margin-bottom: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> Pembayaran Ditolak oleh Bendahara</h4>
              <div>Alasan Penolakan: <strong>${rejectionLog?.rejectionReason || latestPayment?.notes || 'Bukti pembayaran tidak sesuai/tidak terbaca.'}</strong></div>
            </div>

            <!-- Inline Re-upload Form -->
            <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px;">
              <h4 style="font-size: 1rem; color: var(--text-heading); margin-bottom: 12px;">Unggah Ulang Bukti Pembayaran</h4>
              <form onsubmit="handleReuploadSubmit(event, '${reg.id}')">
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih File Bukti Transfer Baru</label>
                  <input type="file" id="reupload-file" class="form-control" accept="image/png, image/jpeg, image/webp" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
                </div>
                <button type="submit" id="reupload-btn" class="btn btn-primary"><i class="fa-solid fa-cloud-arrow-up"></i> Kirim Bukti Baru</button>
              </form>
            </div>
          ` : latestPayment ? `
            <div style="display: grid; grid-template-columns: 1fr 200px; gap: 20px; align-items: start;">
              <div>
                <table style="width: 100%; font-size: 0.875rem;">
                  <tr><td style="color: var(--text-muted); padding: 4px 0; width: 140px;">Status:</td><td>${getStatusBadge(reg.status)}</td></tr>
                  <tr><td style="color: var(--text-muted); padding: 4px 0;">Nominal:</td><td style="font-weight: 700; color: var(--primary-600);">${formatCurrency(latestPayment.amount)}</td></tr>
                  <tr><td style="color: var(--text-muted); padding: 4px 0;">Rekening Tujuan:</td><td>${latestPayment.paymentAccount?.bankName || 'Bank Panitia'} (${latestPayment.paymentAccount?.accountNumber || '-'})</td></tr>
                  <tr><td style="color: var(--text-muted); padding: 4px 0;">Pengirim:</td><td>${latestPayment.senderBank || '-'} a.n. ${latestPayment.senderAccountName || '-'}</td></tr>
                  <tr><td style="color: var(--text-muted); padding: 4px 0;">Tanggal Transfer:</td><td>${formatDate(latestPayment.paymentDate)}</td></tr>
                </table>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 6px; font-weight: 700;">Bukti Transfer:</div>
                <div style="background: #0f172a; border-radius: 8px; overflow: hidden; text-align: center; border: 1px solid var(--border-subtle); padding: 4px; max-height: 140px; display: flex; align-items: center; justify-content: center;">
                  <img src="/api/payments/file/${encodeURIComponent(latestPayment.proofImagePath)}?token=${encodeURIComponent(state.token || safeStorage.getItem('lomba_jwt_token') || '')}" alt="Bukti Transfer" style="max-width: 100%; max-height: 130px; border-radius: 4px; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('det-proof-fb').style.display='block';">
                  <div id="det-proof-fb" style="display: none; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">
                    <i class="fa-solid fa-file-image" style="font-size: 1.5rem; color: var(--primary-500); margin-bottom: 4px;"></i><br>Bukti terunggah
                  </div>
                </div>
                <a href="/api/payments/file/${encodeURIComponent(latestPayment.proofImagePath)}?token=${encodeURIComponent(state.token || safeStorage.getItem('lomba_jwt_token') || '')}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--primary-600); margin-top: 6px; font-weight: 600; text-decoration: none;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Lihat Bukti Penuh
                </a>
              </div>
            </div>
          ` : `
            <p style="color: var(--text-muted);">Belum ada riwayat pembayaran.</p>
          `}
        </div>

        <!-- Full Form Navigation & Print Card -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
          <div>
            <h4 style="font-size: 1.05rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-file-lines" style="color: var(--primary-600);"></i> Formulir Pendaftaran Lengkap
            </h4>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Lengkapi biodata santri, data orang tua/wali, data asal sekolah, dan upload berkas.</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${(reg.isFormUnlocked || reg.status === 'APPROVED') ? `
              <button type="button" class="btn btn-secondary" onclick="printFullStudentForm('${reg.id}')">
                <i class="fa-solid fa-print"></i> Print
              </button>
              <button type="button" class="btn btn-outline-primary" onclick="printFullStudentForm('${reg.id}')">
                <i class="fa-solid fa-file-pdf"></i> Download PDF
              </button>
              <a href="#formulir/${reg.id}" class="btn btn-primary">
                <i class="fa-solid fa-pen-to-square"></i> Buka Formulir
              </a>
            ` : `
              <a href="#formulir/${reg.id}" class="btn btn-secondary">
                <i class="fa-solid fa-lock"></i> Cek Status Formulir
              </a>
            `}
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function handleReuploadSubmit(e, regId) {
  e.preventDefault();
  const fileInput = document.getElementById('reupload-file');
  const btn = document.getElementById('reupload-btn');

  if (!fileInput.files || !fileInput.files[0]) {
    alert('Pilih file bukti transfer.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';

  try {
    const formData = new FormData();
    formData.append('registrationId', regId);
    formData.append('payment_proof', fileInput.files[0]);

    const res = await apiRequest('/api/payments/reupload', {
      method: 'POST',
      body: formData,
    });

    if (res.success) {
      alert('Bukti transfer baru berhasil dikirim dan sedang menunggu verifikasi panitia.');
      renderPesertaRegistrationDetail(regId);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Kirim Bukti Baru';
  }
}

// Global holder for currently opened modal card
let currentActiveCardData = null;

// --- SHARED CARD HTML BUILDER (PSB2 KARTU PESERTA SELEKSI) ---
function buildSingleCardHTML(card) {
  const isMukim = card.boarding_status !== 'NON_MUKIM';
  const boardingLabel = card.boarding_status_label || (isMukim ? 'Mukim / Mondok' : 'Non-Mukim');

  // Resolve auth token for photo URL to prevent 401 Unauthorized in <img>
  let photoSrc = card.photo_url || null;
  if (photoSrc && !photoSrc.startsWith('data:') && !photoSrc.includes('token=')) {
    const token = (typeof state !== 'undefined' && state?.token)
      || (typeof safeStorage !== 'undefined' && safeStorage?.getItem('lomba_jwt_token'))
      || (typeof localStorage !== 'undefined' && localStorage?.getItem('lomba_jwt_token'))
      || '';
    if (token) {
      photoSrc += (photoSrc.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
  }

  return `
    <div class="id-card-official official-card-print" id="official-card-print" style="
      width:380px;
      height:540px;
      max-width:380px;
      max-height:540px;
      background:#ffffff;
      border-radius:12px;
      border:2px solid #0f172a;
      box-shadow:0 14px 30px -10px rgba(15,23,42,0.18);
      overflow:hidden;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      box-sizing:border-box;
      font-family:'Segoe UI',Arial,sans-serif;
      color:#0f172a;
      margin:0 auto;
      text-align:left;
    ">
      <!-- BAGIAN ATAS: LOGO, NAMA SISTEM, TAHUN PELAJARAN -->
      <div style="flex-shrink:0;">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0369a1 100%);color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #0284c7;">
          <img src="${card.logo_url || '/static/img/logo_e7a8b6a95d.webp'}" alt="Logo"
            style="height:40px;width:40px;object-fit:contain;background:#fff;padding:2px;border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.2);"
            onerror="this.style.display='none'">
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.95rem;font-weight:800;letter-spacing:0.02em;line-height:1.2;text-transform:uppercase;color:#ffffff;">
              ${card.app_name || card.app_title || card.app_short_name || 'PENERIMAAN SANTRI BARU'}
            </div>
            <div style="font-size:0.75rem;color:#7dd3fc;margin-top:2px;font-weight:700;text-transform:uppercase;">
              TAHUN PELAJARAN ${card.academic_period_name || '2026/2027'}
            </div>
          </div>
        </div>

        <!-- JUDUL : KARTU PESERTA SELEKSI -->
        <div style="background:#e0f2fe;border-bottom:1.5px solid #bae6fd;text-align:center;padding:5px 10px;">
          <span style="font-size:0.8rem;font-weight:800;color:#0369a1;letter-spacing:0.08em;text-transform:uppercase;">
            ✦ KARTU PESERTA SELEKSI ✦
          </span>
        </div>
      </div>

      <!-- IDENTITAS PESERTA & STATUS MUKIM -->
      <div style="padding:10px 14px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <!-- PAS FOTO -->
          <div style="width:85px;height:110px;flex-shrink:0;background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.08);">
            ${photoSrc ? `
              <img src="${photoSrc}" alt="Pas Foto" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'text-align:center;color:#94a3b8;font-size:0.65rem;font-weight:700;padding:4px;\\'><i class=\\'fa-solid fa-user\\' style=\\'font-size:2.2rem;margin-bottom:4px;color:#cbd5e1;display:block;\\'></i>PAS FOTO<br>3x4</div>';">
            ` : `
              <div style="text-align:center;color:#94a3b8;font-size:0.65rem;font-weight:700;padding:4px;">
                <i class="fa-solid fa-user" style="font-size:2.2rem;margin-bottom:4px;color:#cbd5e1;display:block;"></i>
                PAS FOTO<br>3x4
              </div>
            `}
          </div>

          <!-- DETAIL IDENTITAS -->
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;">
            <div>
              <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Nama Lengkap:</div>
              <div style="font-size:0.92rem;font-weight:800;color:#0f172a;line-height:1.2;word-break:break-word;">
                ${card.full_name || card.participant_name}
              </div>
            </div>

            <div>
              <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Nomor Pendaftaran:</div>
              <div style="font-size:0.92rem;font-weight:800;color:#0284c7;font-family:monospace;letter-spacing:0.04em;">
                ${card.registration_number}
              </div>
            </div>

            <div>
              <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Sekolah Tujuan:</div>
              <div style="font-size:0.8rem;font-weight:700;color:#1e293b;">
                ${card.target_school_name || card.school_name || '-'}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
              <div>
                <div style="font-size:0.62rem;font-weight:700;color:#64748b;text-transform:uppercase;">Jurusan:</div>
                <div style="font-size:0.75rem;font-weight:700;color:#334155;">
                  ${card.target_major_name || card.major_name || '-'}
                </div>
              </div>
              <div>
                <div style="font-size:0.62rem;font-weight:700;color:#64748b;text-transform:uppercase;">Program Kelas:</div>
                <div style="font-size:0.75rem;font-weight:700;color:#334155;">
                  ${card.target_class_program_name || card.class_program_name || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STATUS MUKIM -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;">STATUS MUKIM:</span>
          <span style="font-size:0.75rem;font-weight:800;padding:3px 10px;border-radius:9999px;${!isMukim ? 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;' : 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;'}">
            <i class="${!isMukim ? 'fa-solid fa-house' : 'fa-solid fa-mosque'}"></i> ${boardingLabel}
          </span>
        </div>
      </div>

      <!-- BAGIAN BAWAH: QR CODE & KETERANGAN SINGKAT -->
      <div style="flex-shrink:0;background:linear-gradient(to bottom,#f8fafc,#f1f5f9);border-top:1.5px solid #e2e8f0;padding:8px 12px;text-align:center;">
        <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:8px;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,0.06);display:inline-block;">
          ${card.qr_data_uri
      ? `<img src="${card.qr_data_uri}" alt="QR Code" style="width:105px;height:105px;display:block;border-radius:4px;object-fit:contain;">`
      : `<div style="width:105px;height:105px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;border-radius:4px;">
                <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="3" fill="none"/>
                  <rect x="9" y="9" width="14" height="14" rx="1" fill="#0f172a"/>
                  <rect x="40" y="2" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="3" fill="none"/>
                  <rect x="47" y="9" width="14" height="14" rx="1" fill="#0f172a"/>
                  <rect x="2" y="40" width="28" height="28" rx="3" stroke="#0f172a" stroke-width="3" fill="none"/>
                  <rect x="9" y="47" width="14" height="14" rx="1" fill="#0f172a"/>
                  <rect x="40" y="40" width="6" height="6" fill="#0f172a"/>
                  <rect x="50" y="40" width="6" height="6" fill="#0f172a"/>
                  <rect x="60" y="40" width="8" height="6" fill="#0f172a"/>
                  <rect x="40" y="50" width="6" height="6" fill="#0f172a"/>
                  <rect x="50" y="50" width="18" height="6" fill="#0f172a"/>
                  <rect x="40" y="60" width="28" height="8" fill="#0f172a"/>
                </svg>
                <div style="font-size:0.5rem;color:#94a3b8;margin-top:2px;font-weight:700;">QR CODE</div>
              </div>`
    }
        </div>
        <div style="margin-top:4px;font-size:0.72rem;font-weight:700;color:#334155;">
          Scan QR Code untuk verifikasi data peserta
        </div>
        <div style="margin-top:2px;font-size:0.62rem;font-weight:800;color:#0284c7;letter-spacing:0.04em;text-transform:uppercase;">
          TERVERIFIKASI RESMI
        </div>
      </div>
    </div>
  `;
}

// --- DEDICATED POPUP PRINT FOR SINGLE CARD (100% RELIABLE, NEVER BLANK, UPPERCASE, PERFECT FIT) ---
function ensureHtml2CanvasLoaded() {
  if (typeof html2canvas !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Gagal memuat pustaka html2canvas untuk mengunduh gambar JPG.'));
    document.head.appendChild(script);
  });
}

/**
 * Converts an image URL to a base64 data URI using fetch + auth token.
 * Falls back silently to null if the image fails to load.
 */
async function fetchImageAsDataUri(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url; // already base64
  try {
    const token = (typeof state !== 'undefined' && state?.token)
      || (typeof safeStorage !== 'undefined' && safeStorage?.getItem('lomba_jwt_token'))
      || (typeof localStorage !== 'undefined' && localStorage?.getItem('lomba_jwt_token'))
      || '';
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadParticipantCardJPG(card) {
  const targetCard = card || currentActiveCardData;
  const btn = document.getElementById('btn-download-card') || document.getElementById('btn-download-card-view');
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  let tempWrapper = null;
  try {
    await ensureHtml2CanvasLoaded();

    // Pre-fetch foto & logo sebagai base64 data URI agar html2canvas tidak terkena CORS/auth block
    const cardForRender = Object.assign({}, targetCard);
    if (cardForRender.photo_url && !cardForRender.photo_url.startsWith('data:')) {
      const photoDataUri = await fetchImageAsDataUri(cardForRender.photo_url);
      if (photoDataUri) cardForRender.photo_url = photoDataUri;
    }
    if (cardForRender.logo_url && !cardForRender.logo_url.startsWith('data:')) {
      const logoDataUri = await fetchImageAsDataUri(cardForRender.logo_url);
      if (logoDataUri) cardForRender.logo_url = logoDataUri;
    }

    let elementToCapture = document.getElementById('official-card-print');

    // Jika elemen kartu tidak ada di layar aktif, buat container sementara
    if (!elementToCapture) {
      tempWrapper = document.createElement('div');
      tempWrapper.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-999;';
      tempWrapper.innerHTML = buildSingleCardHTML(cardForRender);
      document.body.appendChild(tempWrapper);
      elementToCapture = tempWrapper.querySelector('#official-card-print') || tempWrapper.firstElementChild;
    } else {
      // Elemen sudah di DOM — ganti src gambar dengan data URI agar tidak taint canvas
      const logoImg = elementToCapture.querySelector('img[alt="Logo"]');
      if (logoImg && cardForRender.logo_url) logoImg.src = cardForRender.logo_url;
      const photoImg = elementToCapture.querySelector('img[alt="Pas Foto"]');
      if (photoImg && cardForRender.photo_url) photoImg.src = cardForRender.photo_url;
    }

    if (!elementToCapture) {
      throw new Error('Elemen kartu peserta tidak ditemukan.');
    }

    // Tunggu semua gambar (termasuk yang baru di-inject) ter-decode
    const imgs = Array.from(elementToCapture.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode ? img.decode().catch(() => { }) : Promise.resolve();
      }
      return new Promise(resolve => {
        img.onload = () => img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
        img.onerror = resolve;
        setTimeout(resolve, 800);
      });
    }));

    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(elementToCapture, {
      scale: 3, // High DPI (300 DPI) agar tajam dan jernih untuk cetak/simpan
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 10000,
    });

    const regNum = targetCard?.registration_number || 'kartu';
    const cleanRegNum = regNum.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanName = (targetCard?.participant_name || 'peserta').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `kartu_peserta_${cleanRegNum}_${cleanName}.jpg`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (tempWrapper) {
      document.body.removeChild(tempWrapper);
    }
  } catch (err) {
    alert('Gagal mengunduh kartu peserta: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }
}

async function printSingleCardPopup(card) {
  if (!card) {
    if (currentActiveCardData) card = currentActiveCardData;
    else { window.print(); return; }
  }

  const printWin = window.open('', '_blank', 'width=850,height=950');
  if (!printWin) {
    window.print();
    return;
  }

  // Pre-fetch foto & logo sebagai base64 data URI agar popup window tidak terkena CORS saat download JPG
  const cardForPopup = Object.assign({}, card);
  try {
    if (cardForPopup.photo_url && !cardForPopup.photo_url.startsWith('data:')) {
      const d = await fetchImageAsDataUri(cardForPopup.photo_url);
      if (d) cardForPopup.photo_url = d;
    }
    if (cardForPopup.logo_url && !cardForPopup.logo_url.startsWith('data:')) {
      const d = await fetchImageAsDataUri(cardForPopup.logo_url);
      if (d) cardForPopup.logo_url = d;
    }
  } catch (_) { /* Lanjutkan meskipun gagal fetch */ }

  printWin.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cetak Kartu Peserta - ${card.participant_name} (${card.registration_number})</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
<style>
  @page {
    size: 10cm 14cm portrait;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 20px 0;
    margin: 0;
    text-transform: uppercase !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-action-bar {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 9999;
    display: flex;
    gap: 8px;
    background: rgba(15, 23, 42, 0.85);
    padding: 8px 12px;
    border-radius: 10px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }
  .print-action-bar button {
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-do-download {
    background: #16a34a;
    color: #ffffff;
  }
  .btn-do-download:hover {
    background: #15803d;
  }
  .btn-do-print {
    background: #4f46e5;
    color: #ffffff;
  }
  .btn-do-print:hover {
    background: #4338ca;
  }
  .btn-do-close {
    background: #334155;
    color: #ffffff;
  }
  .btn-do-close:hover {
    background: #475569;
  }
  .card-outer-wrap {
    width: 10cm;
    height: 14cm;
    max-width: 10cm;
    max-height: 14cm;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  @media print {
    body { padding: 0; margin: 0; background: #ffffff !important; }
    .no-print { display: none !important; }
    .card-outer-wrap {
      box-shadow: none !important;
      border-radius: 0 !important;
      width: 10cm !important;
      height: 14cm !important;
      max-height: 14cm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .id-card-official {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
  }
</style>
</head>
<body>
  <div class="no-print print-action-bar">
    <button type="button" class="btn-do-download" onclick="downloadPopupCardJPG()"><i class="fa-solid fa-download"></i> DOWNLOAD (JPG)</button>
    <button type="button" class="btn-do-print" onclick="window.print()"><i class="fa-solid fa-print"></i> CETAK / PRINT</button>
    <button type="button" class="btn-do-close" onclick="window.close()">TUTUP</button>
  </div>
  <div class="card-outer-wrap" id="popup-card-wrap">
    ${buildSingleCardHTML(cardForPopup)}
  </div>
  <script>
    async function downloadPopupCardJPG() {
      const el = document.getElementById('popup-card-wrap') || document.getElementById('official-card-print');
      if (!el) return;
      const btn = document.querySelector('.btn-do-download');
      if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
      try {
        // Tunggu semua gambar selesai di-load dan di-decode sebelum html2canvas
        const imgs = Array.from(el.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = () => img.decode ? img.decode().then(resolve).catch(resolve) : resolve();
            img.onerror = resolve;
            // Timeout fallback agar tidak stuck selamanya
            setTimeout(resolve, 3000);
          });
        }));
        await new Promise(r => setTimeout(r, 150));
        const canvas = await html2canvas(el, {
          scale: 3,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 8000,
        });
        const link = document.createElement('a');
        link.download = 'kartu_peserta_${(card.registration_number || 'card').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        alert('Gagal mendownload JPG: ' + e.message);
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-download"></i> DOWNLOAD (JPG)'; }
      }
    }
    window.onload = function() {
      setTimeout(() => window.print(), 600);
    };
  <\/script>
</body>
</html>`);
  printWin.document.close();
}

// --- OFFICIAL PARTICIPANT CARD VIEW (Full Page — for direct URL / print) ---
async function renderParticipantCardView(regId) {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat Kartu Peserta...</div>';

  try {
    const res = await apiRequest(`/api/cards/${regId}`);
    if (!res.success || !res.data) throw new Error('Kartu peserta tidak tersedia atau pendaftaran belum disetujui.');

    const card = res.data;
    currentActiveCardData = card;

    container.innerHTML = `
      <div style="max-width: 480px; margin: 0 auto;">
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <a href="#overview" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
          </a>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-success" id="btn-download-card-view" onclick="downloadParticipantCardJPG()"><i class="fa-solid fa-download"></i> Download</button>
            <button type="button" class="btn btn-primary" onclick="printParticipantCard()"><i class="fa-solid fa-print"></i> Cetak Kartu</button>
          </div>
        </div>
        <div class="card-preview-container">
          ${buildSingleCardHTML(card)}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger" style="max-width: 600px; margin: 40px auto; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
        <h4 style="margin-bottom: 6px;">Kartu Peserta Belum Dapat Diakses</h4>
        <p>${err.message}</p>
        <a href="#overview" class="btn btn-sm btn-secondary" style="margin-top: 10px;">Kembali ke Dashboard</a>
      </div>
    `;
  }
}

// --- PARTICIPANT CARD MODAL (popup dari tabel) ---
async function openParticipantCardModal(regId) {
  openAppModal(`
    <div style="text-align: center; padding: 40px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600);"></i>
      <p style="margin-top: 12px; color: var(--text-muted); font-size: 0.95rem;">Memuat data kartu peserta...</p>
    </div>
  `);

  try {
    const res = await apiRequest(`/api/cards/${regId}`);
    if (!res.success || !res.data) throw new Error('Kartu peserta tidak tersedia atau pendaftaran belum disetujui.');

    const card = res.data;
    currentActiveCardData = card;

    openAppModal(`
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; flex-wrap: wrap; gap: 10px;">
        <h3 style="font-size: 1.1rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-id-card"></i> Kartu Peserta Resmi</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-sm btn-success" id="btn-download-card" onclick="downloadParticipantCardJPG()"><i class="fa-solid fa-download"></i> Download</button>
          <button type="button" class="btn btn-sm btn-primary" onclick="printParticipantCard()"><i class="fa-solid fa-print"></i> Cetak Kartu</button>
          <button type="button" onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; padding-left: 6px;">&times;</button>
        </div>
      </div>
      <div style="display:flex;justify-content:center;overflow:auto;padding-bottom:8px;">
        ${buildSingleCardHTML(card)}
      </div>
    `);
  } catch (err) {
    openAppModal(`
      <div style="text-align: center; padding: 24px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; color: var(--warning-600); margin-bottom: 12px; display: block;"></i>
        <h4 style="margin-bottom: 8px;">Kartu Belum Tersedia</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${err.message}</p>
        <button class="btn btn-secondary" onclick="closeAppModal()" style="margin-top: 12px;">Tutup</button>
      </div>
    `);
  }
}

function printParticipantCard(card) {
  printSingleCardPopup(card || currentActiveCardData);
}


// ============================================================================
// BENDAHARA MODULE (VERIFIKASI + SCANNER CHECK-IN MOBILE VERTICAL LAYOUT)
// ============================================================================
async function renderBendaharaDashboard() {
  renderBendaharaPaymentsView();
}

async function renderBendaharaPaymentsView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar pembayaran...</div>';

  try {
    const res = await apiRequest('/api/payments/list');
    tableState.bendaharaPayments.data = res.success ? res.payments : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Verifikasi Pembayaran Calon Santri</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Periksa bukti transfer dan tentukan persetujuan atau penolakan dengan alasan wajib.</p>
      </div>

      <div id="bendahara-payments-table-slot">
        ${renderBendaharaPaymentsTable()}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderBendaharaPaymentsTable() {
  const ts = tableState.bendaharaPayments;
  return renderUniversalTable({
    tableId: 'bendahara-payments-table',
    columns: [
      {
        header: 'Tgl Bayar',
        key: 'createdAt',
        render: p => formatDate(p.createdAt),
      },
      {
        header: 'No. Registrasi',
        sortValue: p => p.registration?.registrationNumber || '',
        render: p => `<code style="font-weight: 800; color: var(--primary-600);">${p.registration?.registrationNumber || '-'}</code>`,
      },
      {
        header: 'Nama Calon Santri',
        sortValue: p => (p.registration?.individualParticipant?.fullName || p.registration?.team?.teamName || ''),
        render: p => `<strong>${p.registration?.individualParticipant?.fullName || p.registration?.team?.teamName || '-'}</strong><br><small style="color:var(--text-muted);">${p.registration?.user?.email || '-'}</small>`,
      },
      {
        header: 'Program Kelas',
        sortValue: p => p.registration?.classProgram?.name || p.registration?.branch?.name || '',
        render: p => p.registration?.classProgram?.name || p.registration?.branch?.name || '-',
      },
      {
        header: 'Nominal & Rekening',
        sortValue: p => Number(p.amount) || 0,
        render: p => `<strong>${formatCurrency(p.amount)}</strong><br><small style="color:var(--text-muted);">${p.paymentAccount?.bankName || 'Bank'}</small>`,
      },
      {
        header: 'Pengirim',
        sortValue: p => p.senderAccountName || '',
        render: p => `${p.senderBank || '-'} a.n. ${p.senderAccountName || '-'}`,
      },
      {
        header: 'Status',
        key: 'status',
        render: p => getStatusBadge(p.status),
      },
      {
        header: 'Aksi',
        sticky: true,
        sortable: false,
        render: p => `
          <button class="btn btn-sm btn-primary" style="padding: 4px 10px;" onclick="openPaymentVerifyModal('${p.id}', '${p.proofImagePath}', '${p.registration?.registrationNumber}', '${p.registration?.individualParticipant?.fullName || p.registration?.team?.teamName}', ${p.amount}, '${p.status}')">
            <i class="fa-solid fa-eye"></i> Periksa Bukti
          </button>
        `,
      },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: [
      p => p.registration?.registrationNumber,
      p => p.registration?.individualParticipant?.fullName,
      p => p.registration?.team?.teamName,
      p => p.registration?.branch?.name,
      'senderAccountName',
    ],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    filterKey: 'status',
    filterValue: ts.filterVal,
    filterOptions: [
      { label: 'Semua Status Pembayaran', value: '' },
      { label: 'Menunggu Verifikasi', value: 'WAITING_VERIFICATION' },
      { label: 'Disetujui (Approved)', value: 'APPROVED' },
      { label: 'Ditolak (Rejected)', value: 'PAYMENT_REJECTED' },
    ],
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onBendaharaPageChange',
    onSearchChangeName: 'onBendaharaSearchChange',
    onPageSizeChangeName: 'onBendaharaPageSizeChange',
    onSortChangeName: 'onBendaharaSortChange',
    onFilterChangeName: 'onBendaharaFilterChange',
    exportFilename: 'data_verifikasi_pembayaran',
    onExportName: 'exportBendaharaPaymentsExcel',
    emptyMessage: 'Belum ada data pembayaran masuk.',
  });
}

function exportBendaharaPaymentsExcel() {
  const data = tableState.bendaharaPayments.data || [];
  const cols = [
    { header: 'Tanggal Bayar', exportValue: p => formatDate(p.createdAt) },
    { header: 'Nomor Registrasi', exportValue: p => p.registration?.registrationNumber || '-' },
    { header: 'Nama Calon Santri', exportValue: p => p.registration?.individualParticipant?.fullName || p.registration?.team?.teamName || '-' },
    { header: 'Email Akun', exportValue: p => p.registration?.user?.email || '-' },
    { header: 'Program Kelas', exportValue: p => p.registration?.classProgram?.name || p.registration?.branch?.name || '-' },
    { header: 'Nominal Transfer', exportValue: p => formatCurrency(p.amount) },
    { header: 'Rekening Tujuan', exportValue: p => p.paymentAccount?.bankName || '-' },
    { header: 'Bank Pengirim', exportValue: p => p.senderBank || '-' },
    { header: 'Nama Pengirim', exportValue: p => p.senderAccountName || '-' },
    { header: 'Status Verifikasi', key: 'status' },
  ];
  exportTableDataToExcel('data_verifikasi_pembayaran_peserta', cols, data);
}

function onBendaharaPageChange(p) { tableState.bendaharaPayments.page = p; updateUniversalTable('bendahara-payments-table-slot', renderBendaharaPaymentsTable); }
function onBendaharaSearchChange(s) { tableState.bendaharaPayments.search = s; tableState.bendaharaPayments.page = 1; updateUniversalTable('bendahara-payments-table-slot', renderBendaharaPaymentsTable); }
function onBendaharaPageSizeChange(z) { tableState.bendaharaPayments.pageSize = z; tableState.bendaharaPayments.page = 1; updateUniversalTable('bendahara-payments-table-slot', renderBendaharaPaymentsTable); }
function onBendaharaSortChange(k) {
  if (tableState.bendaharaPayments.sortKey === k) {
    tableState.bendaharaPayments.sortDir = tableState.bendaharaPayments.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.bendaharaPayments.sortKey = k;
    tableState.bendaharaPayments.sortDir = 'asc';
  }
  updateUniversalTable('bendahara-payments-table-slot', renderBendaharaPaymentsTable);
}
function onBendaharaFilterChange(v) {
  tableState.bendaharaPayments.filterVal = v;
  tableState.bendaharaPayments.page = 1;
  updateUniversalTable('bendahara-payments-table-slot', renderBendaharaPaymentsTable);
}

function openPaymentVerifyModal(paymentId, filename, regNum, participantName, amount, status) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-file-invoice-dollar"></i> Verifikasi Pembayaran</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div>
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Nomor Registrasi:</div>
        <code style="font-size: 1.1rem; font-weight: 800; color: var(--primary-600);">${regNum}</code>
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-top: 10px;">Nama Peserta:</div>
        <div style="font-weight: 700; font-size: 1rem;">${participantName}</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-top: 10px;">Nominal:</div>
        <div style="font-weight: 800; color: var(--accent-600); font-size: 1.15rem;">${formatCurrency(amount)}</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-top: 10px;">Status:</div>
        <div>${getStatusBadge(status)}</div>
      </div>

      <div>
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Bukti Transfer:</div>
        <div style="background: #0f172a; border-radius: 8px; overflow: hidden; text-align: center; border: 1px solid var(--border-subtle); min-height: 160px; max-height: 220px; display: flex; align-items: center; justify-content: center; padding: 6px;">
          <img src="/api/payments/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(state.token || safeStorage.getItem('lomba_jwt_token') || '')}" alt="Bukti Transfer" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'; document.getElementById('proof-fallback-link').style.display='block';">
          <div id="proof-fallback-link" style="display: none; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">
            <i class="fa-solid fa-file-image" style="font-size: 2rem; color: var(--primary-500); margin-bottom: 8px;"></i><br>
            File bukti transfer terunggah
          </div>
        </div>
        <a href="/api/payments/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(state.token || safeStorage.getItem('lomba_jwt_token') || '')}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--primary-600); margin-top: 8px; font-weight: 600; text-decoration: none;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Gambar di Tab Baru
        </a>
      </div>
    </div>

    <div id="verify-modal-alert" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 16px;"></div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
      <button class="btn btn-outline-danger" onclick="promptRejectPayment('${paymentId}')"><i class="fa-solid fa-circle-xmark"></i> Tolak Pembayaran</button>
      <button class="btn btn-success" onclick="executeApprovePayment('${paymentId}')"><i class="fa-solid fa-circle-check"></i> Setujui Pembayaran</button>
    </div>
  `);
}

async function executeApprovePayment(paymentId) {
  try {
    const res = await apiRequest(`/api/payments/${paymentId}/approve`, { method: 'POST' });
    if (res.success) {
      alert('Pembayaran berhasil disetujui!');
      closeAppModal();
      renderBendaharaPaymentsView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function promptRejectPayment(paymentId) {
  const reason = prompt('Masukkan alasan penolakan pembayaran (WAJIB diisi):');
  if (reason === null) return;
  if (!reason.trim()) {
    alert('Alasan penolakan WAJIB diisi.');
    return;
  }
  executeRejectPayment(paymentId, reason.trim());
}

async function executeRejectPayment(paymentId, rejectionReason) {
  try {
    const res = await apiRequest(`/api/payments/${paymentId}/reject`, {
      method: 'POST',
      body: { rejectionReason },
    });
    if (res.success) {
      alert('Pembayaran telah ditolak.');
      closeAppModal();
      renderBendaharaPaymentsView();
    }
  } catch (err) {
    alert(err.message);
  }
}

// --- CHECK-IN SCANNER (DESKTOP SIDE-BY-SIDE / MOBILE TOP-DOWN) ---
let currentCameraFacingMode = 'environment'; // Default: Kamera Belakang (Utama)

async function renderCheckInScannerView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Check-In Scanner Seleksi Masuk PSB</h2>
      <p style="color: var(--text-muted); font-size: 0.95rem;">Pindai QR Code atau masukkan nomor registrasi. Tersedia 2 tahap check-in.</p>
    </div>

    <!-- Stage Selector Tabs -->
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <button id="tab-stage1" onclick="switchCheckInStage(1)" class="btn btn-primary" style="flex:1; padding: 12px; font-weight: 700; border-radius: 10px;">
        <i class="fa-solid fa-door-open"></i> Tahap 1 &mdash; Kedatangan
      </button>
      <button id="tab-stage2" onclick="switchCheckInStage(2)" class="btn btn-secondary" style="flex:1; padding: 12px; font-weight: 700; border-radius: 10px;">
        <i class="fa-solid fa-person-walking-arrow-right"></i> Tahap 2 &mdash; Masuk Arena
      </button>
    </div>
    <div id="checkin-stage-label" style="text-align:center; margin-bottom:14px; font-size:0.85rem; color:var(--text-muted);">
      Mode aktif: <strong style="color:var(--primary-600);">Tahap 1 &ndash; Kedatangan</strong>
    </div>

    <div id="checkin-feed-alert" style="display: none; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 1rem;"></div>

    <!-- Scanner & Live Log Layout -->
    <div class="checkin-layout-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      
      <!-- SCANNER BOX -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-camera"></i> Kamera Scanner QR</h3>
          
          <!-- Camera Switcher for Mobile / Desktop -->
          <div style="display: inline-flex; background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 2px;">
            <button type="button" id="btn-cam-env" onclick="switchCameraMode('environment')" class="btn btn-sm ${currentCameraFacingMode === 'environment' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 6px;" title="Gunakan Kamera Belakang HP">
              <i class="fa-solid fa-camera"></i> Belakang
            </button>
            <button type="button" id="btn-cam-usr" onclick="switchCameraMode('user')" class="btn btn-sm ${currentCameraFacingMode === 'user' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 6px;" title="Gunakan Kamera Depan HP / Webcam">
              <i class="fa-solid fa-user"></i> Depan
            </button>
          </div>
        </div>

        <div id="html5-qr-reader" style="width: 100%; border-radius: 12px; overflow: hidden; border: 2px solid var(--primary-500); margin-bottom: 16px;"></div>
        
        <form onsubmit="handleManualCheckInSubmit(event)" style="display: flex; gap: 8px;">
          <input type="text" id="manual-reg-input" class="form-control" placeholder="Nomor Registrasi (REG-IND-...)" required style="flex: 1; padding: 10px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Submit</button>
        </form>
      </div>

      <!-- LIVE LOG FEED -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-satellite-dish"></i> Live Check-In Feed</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button style="padding: 6px 10px; font-size: 0.95rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--success-500); color: var(--success-600); background: transparent; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s;" onclick="exportCheckInLogsExcel()" title="Ekspor Log Check-In ke Excel / CSV" onmouseover="this.style.background='var(--success-50)'" onmouseout="this.style.background='transparent'">
              <i class="fa-solid fa-file-excel"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="loadLiveCheckInLogs()"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
          </div>
        </div>
        <div id="live-checkin-table-slot">
          <div style="text-align: center; padding: 30px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat live log...</div>
        </div>
      </div>

    </div>
  `;

  // Store current stage
  state.checkInStage = 1;
  startCameraScanner();
  loadLiveCheckInLogs();
}

function switchCameraMode(mode) {
  currentCameraFacingMode = mode;
  const btnEnv = document.getElementById('btn-cam-env');
  const btnUsr = document.getElementById('btn-cam-usr');
  if (btnEnv && btnUsr) {
    if (mode === 'environment') {
      btnEnv.className = 'btn btn-sm btn-primary';
      btnUsr.className = 'btn btn-sm btn-secondary';
    } else {
      btnEnv.className = 'btn btn-sm btn-secondary';
      btnUsr.className = 'btn btn-sm btn-primary';
    }
  }
  startCameraScanner();
}

function switchCheckInStage(stage) {
  state.checkInStage = stage;
  const btn1 = document.getElementById('tab-stage1');
  const btn2 = document.getElementById('tab-stage2');
  const label = document.getElementById('checkin-stage-label');
  if (!btn1 || !btn2) return;

  if (stage === 1) {
    btn1.className = 'btn btn-primary'; btn1.style.cssText = 'flex:1;padding:12px;font-weight:700;border-radius:10px;';
    btn2.className = 'btn btn-secondary'; btn2.style.cssText = 'flex:1;padding:12px;font-weight:700;border-radius:10px;';
    if (label) label.innerHTML = 'Mode aktif: <strong style="color:var(--primary-600);">Tahap 1 &ndash; Kedatangan</strong>';
  } else {
    btn2.className = 'btn btn-primary'; btn2.style.cssText = 'flex:1;padding:12px;font-weight:700;border-radius:10px;';
    btn1.className = 'btn btn-secondary'; btn1.style.cssText = 'flex:1;padding:12px;font-weight:700;border-radius:10px;';
    if (label) label.innerHTML = 'Mode aktif: <strong style="color:var(--primary-600);">Tahap 2 &ndash; Masuk Lokasi Tes / Seleksi</strong>';
  }

  // Restart scanner for current stage
  startCameraScanner();
}

function startCameraScanner() {
  if (state.scanner) {
    try { state.scanner.clear(); } catch (e) { }
  }

  const stage = state.checkInStage || 1;
  try {
    state.scanner = new Html5QrcodeScanner('html5-qr-reader', {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      rememberLastUsedCamera: true,
      videoConstraints: {
        facingMode: { ideal: currentCameraFacingMode }
      },
    });

    state.scanner.render((decodedText) => {
      executeCheckIn(decodedText, 'QR_SCAN', stage);
    }, () => { });
  } catch (e) {
    console.error('Scanner init error:', e);
  }
}

async function handleManualCheckInSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('manual-reg-input').value.trim();
  if (!code) return;
  const stage = state.checkInStage || 1;
  await executeCheckIn(code, 'MANUAL_CODE', stage);
  document.getElementById('manual-reg-input').value = '';
}


async function executeCheckIn(token, method, stage = 1) {
  const alertEl = document.getElementById('checkin-feed-alert');
  if (!alertEl) return;

  const endpoint = stage === 2 ? '/api/checkin/scan2' : '/api/checkin/scan';
  const stageLabel = stage === 2 ? 'MASUK ARENA' : 'KEDATANGAN';

  try {
    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: { token, method },
    });

    if (res.success && res.data) {
      const timeKey = stage === 2 ? res.data.check_in_2_time : res.data.check_in_time;

      // Update alert bar (ringkas)
      alertEl.style.display = 'block';
      alertEl.className = 'alert alert-success';
      alertEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
          <strong>CHECK-IN ${stageLabel} BERHASIL</strong> — ${res.data.participant_name}
        </div>
      `;

      // Tampilkan popup kartu peserta
      openCheckInSuccessPopup(res.data, stage, stageLabel, timeKey);
      loadLiveCheckInLogs();

    } else if (res.already_checked_in) {
      alertEl.style.display = 'block';
      alertEl.className = 'alert alert-danger';
      alertEl.innerHTML = `
        <h4 style="margin-bottom: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> DUPLIKAT — SUDAH CHECK-IN ${stageLabel}!</h4>
        <div>${res.message}</div>
      `;
    } else {
      alertEl.style.display = 'block';
      alertEl.className = 'alert alert-danger';
      alertEl.innerHTML = `<div><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
    }
  } catch (err) {
    alertEl.style.display = 'block';
    alertEl.className = 'alert alert-danger';
    alertEl.innerHTML = `<div><i class="fa-solid fa-circle-xmark"></i> ${err.message}</div>`;
  }
}

function openCheckInSuccessPopup(data, stage, stageLabel, checkInTime) {
  const isStage2 = stage === 2;
  const stageColor = isStage2 ? '#7c3aed' : '#059669';
  const stageBg = isStage2 ? 'rgba(124,58,237,0.08)' : 'rgba(5,150,105,0.08)';
  const stageBorder = isStage2 ? 'rgba(124,58,237,0.3)' : 'rgba(5,150,105,0.3)';
  const stageIcon = isStage2 ? 'fa-person-walking-arrow-right' : 'fa-door-open';

  // Buat modal khusus check-in (tidak pakai openAppModal supaya tidak bentrok)
  const existing = document.getElementById('checkin-success-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'checkin-success-popup';
  popup.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    padding: 20px; animation: fadeInPopup 0.2s ease;
  `;

  // Tambahkan animasi via style tag jika belum ada
  if (!document.getElementById('checkin-popup-anim')) {
    const style = document.createElement('style');
    style.id = 'checkin-popup-anim';
    style.textContent = `
      @keyframes fadeInPopup { from { opacity: 0; transform: scale(0.93); } to { opacity: 1; transform: scale(1); } }
      @keyframes bounceCheck { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      #checkin-success-popup .popup-inner { animation: fadeInPopup 0.25s cubic-bezier(.34,1.56,.64,1); }
    `;
    document.head.appendChild(style);
  }

  const timeStr = checkInTime ? new Date(checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
  const dateStr = checkInTime ? new Date(checkInTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  popup.innerHTML = `
    <div class="popup-inner" style="
      background: var(--bg-card);
      border: 1px solid ${stageBorder};
      border-radius: 20px;
      padding: 32px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 4px ${stageBg};
      text-align: center;
      position: relative;
    ">
      <!-- Ikon berhasil -->
      <div style="
        width: 72px; height: 72px; border-radius: 50%;
        background: ${stageBg}; border: 3px solid ${stageColor};
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px; font-size: 2rem; color: ${stageColor};
        animation: bounceCheck 0.5s ease 0.1s;
      ">
        <i class="fa-solid fa-circle-check"></i>
      </div>

      <!-- Status badge -->
      <div style="
        display: inline-flex; align-items: center; gap: 6px;
        background: ${stageBg}; border: 1px solid ${stageBorder};
        color: ${stageColor}; font-size: 0.72rem; font-weight: 800;
        padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.07em;
        text-transform: uppercase; margin-bottom: 14px;
      ">
        <i class="fa-solid ${stageIcon}"></i> CHECK-IN ${stageLabel} BERHASIL
      </div>

      <!-- Nama peserta -->
      <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-heading); line-height: 1.2; margin-bottom: 6px;">
        ${data.participant_name || '-'}
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">
        ${data.school_name || '-'}
      </div>

      <!-- Info grid -->
      <div style="
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 10px; margin-bottom: 22px;
        text-align: left;
      ">
        <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 3px;">Program Kelas</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-heading); line-height: 1.25;">${data.branch_name || '-'}</div>
        </div>
        <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 3px;">No. Registrasi</div>
          <div style="font-size: 0.82rem; font-weight: 800; color: var(--primary-600); font-family: monospace; letter-spacing: 0.04em;">${data.registration_number || '-'}</div>
        </div>
        <div style="grid-column: 1 / -1; background: ${stageBg}; border: 1px solid ${stageBorder}; border-radius: 10px; padding: 10px 12px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: ${stageColor}; text-transform: uppercase; margin-bottom: 3px;"><i class="fa-solid fa-clock"></i> Waktu Check-In</div>
          <div style="font-size: 0.9rem; font-weight: 800; color: ${stageColor};">${timeStr} <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">· ${dateStr}</span></div>
        </div>
      </div>

      <!-- Tombol OK -->
      <button
        type="button"
        onclick="document.getElementById('checkin-success-popup').remove()"
        style="
          width: 100%; padding: 14px;
          background: ${stageColor}; color: #fff;
          border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 800;
          cursor: pointer; letter-spacing: 0.03em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s;
        "
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
        onmousedown="this.style.transform='scale(0.97)'"
        onmouseup="this.style.transform='scale(1)'"
      >
        <i class="fa-solid fa-check"></i> OK, Lanjutkan Scan
      </button>
    </div>
  `;

  document.body.appendChild(popup);

  // Auto close setelah 12 detik jika tidak diklik
  setTimeout(() => {
    const el = document.getElementById('checkin-success-popup');
    if (el) el.remove();
  }, 12000);

  // Klik luar popup untuk tutup
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}

async function loadLiveCheckInLogs() {
  const container = document.getElementById('live-checkin-table-slot');
  if (!container) return;

  try {
    const res = await apiRequest('/api/checkin/live-log?limit=100');
    if (res.success && res.data) {
      state.checkInLogs = res.data;

      if (res.data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada riwayat check-in hari ini.</p>';
        return;
      }

      const checkBadge = (val) => val
        ? `<span style="color:var(--success-600);font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${formatDate(val)}</span>`
        : `<span style="color:var(--text-dim);font-size:0.8em;"><i class="fa-solid fa-circle-minus"></i> Belum</span>`;

      container.innerHTML = `
        <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
          <table class="table" style="width: 100%; font-size: 0.82rem;">
            <thead>
              <tr style="background: var(--table-header-bg);">
                <th style="padding: 8px;">No. Reg</th>
                <th style="padding: 8px;">Peserta / Tim</th>
                <th style="padding: 8px;">Cabang</th>
                <th style="padding: 8px;"><i class="fa-solid fa-door-open"></i> Tiba</th>
                <th style="padding: 8px;"><i class="fa-solid fa-person-walking-arrow-right"></i> Masuk Arena</th>
              </tr>
            </thead>
            <tbody>
              ${res.data.map(log => `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 8px;"><code style="font-weight: 800; color: var(--primary-600); font-size:0.8rem;">${log.registration_number}</code></td>
                  <td style="padding: 8px; font-weight: 700;">${log.participant_name}</td>
                  <td style="padding: 8px; color:var(--text-muted);">${log.branch_name}</td>
                  <td style="padding: 8px;">${checkBadge(log.check_in_time)}</td>
                  <td style="padding: 8px;">${checkBadge(log.check_in_2_time)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function exportCheckInLogsExcel() {
  const data = state.checkInLogs || [];
  if (!data.length) {
    alert('Belum ada data check-in untuk diekspor.');
    return;
  }
  const cols = [
    { header: 'No. Registrasi', exportValue: l => l.registration_number || '-' },
    { header: 'Nama Peserta / Tim', exportValue: l => l.participant_name || '-' },
    { header: 'Program Kelas', exportValue: l => l.branch_name || '-' },
    { header: 'Tiba (Tahap 1)', exportValue: l => l.check_in_time ? formatDate(l.check_in_time) : '-' },
    { header: 'Petugas Tahap 1', exportValue: l => l.checked_in_by_name || '-' },
    { header: 'Masuk Arena (Tahap 2)', exportValue: l => l.check_in_2_time ? formatDate(l.check_in_2_time) : 'Belum' },
    { header: 'Petugas Tahap 2', exportValue: l => l.checked_in_2_by_name || '-' },
  ];
  exportTableDataToExcel(`log_checkin_${new Date().toISOString().slice(0, 10)}`, cols, data);
}


// ============================================================================
// SUPER ADMIN MODULES (DAFTAR PESERTA + USERS + KATEGORI + CABANG + RESET)
// ============================================================================
async function renderAdminDashboard() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat dashboard analitik admin...</div>';

  try {
    const [usersRes, regRes, categoriesRes, wavesRes, periodsRes] = await Promise.all([
      apiRequest('/api/users?perPage=1').catch(() => ({ pagination: { total: 0 } })),
      apiRequest('/api/registrations?perPage=1000').catch(() => ({ success: true, registrations: [] })),
      apiRequest('/api/competitions/categories').catch(() => []),
      apiRequest('/api/competitions/waves').catch(() => ({ success: true, data: [] })),
      apiRequest('/api/competitions/periods').catch(() => ({ success: true, data: [] })),
    ]);

    const totalUsers = usersRes.pagination?.total || 0;
    const allRegs = (regRes.success && Array.isArray(regRes.registrations)) ? regRes.registrations : [];
    const allSchools = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || []);
    const allWaves = (wavesRes.success && Array.isArray(wavesRes.data)) ? wavesRes.data : (Array.isArray(wavesRes) ? wavesRes : []);
    const allPeriods = (periodsRes.success && Array.isArray(periodsRes.data)) ? periodsRes.data : (Array.isArray(periodsRes) ? periodsRes : []);

    const activePeriod = allPeriods.find(p => p.isActive) || allPeriods[0] || null;
    const activeWave = allWaves.find(w => w.isActive) || allWaves[0] || null;

    const totalRegs = allRegs.length;

    // Status Pembayaran Breakdown
    const approvedPay = allRegs.filter(r => r.status === 'APPROVED');
    const pendingPay = allRegs.filter(r => r.status === 'WAITING_VERIFICATION');
    const rejectedPay = allRegs.filter(r => r.status === 'PAYMENT_REJECTED');

    // Status Verifikasi Data & Berkas Siswa
    const submittedData = allRegs.filter(r => r.formStatus === 'SUBMITTED');
    const verifiedData = allRegs.filter(r => r.formStatus === 'VERIFIED');
    const revisionData = allRegs.filter(r => r.formStatus === 'REVISION_REQUIRED');
    const draftData = allRegs.filter(r => r.formStatus === 'DRAFT' || r.formStatus === 'LOCKED' || !r.formStatus);

    // Total Uang Pendaftaran Terkonfirmasi
    const totalConfirmedFunds = approvedPay.reduce((sum, r) => {
      const fee = Number(r.admissionWave?.registrationFee || r.payments?.[0]?.amount || r.classProgram?.registrationFee || 0);
      return sum + fee;
    }, 0);

    // ==========================================
    // REKAPITULASI PENDAFTAR SISWA BARU PER SEKOLAH
    // ==========================================
    const schoolMap = new Map();

    // Inisialisasi sekolah yang terdaftar di master
    allSchools.forEach(sch => {
      schoolMap.set(sch.id, {
        id: sch.id,
        name: sch.name,
        level: sch.level || sch.code || '-',
        maleCount: 0,
        femaleCount: 0,
        totalCount: 0,
        paidCount: 0,
        pendingPayCount: 0,
        verifiedDocCount: 0,
        submittedDocCount: 0,
        confirmedFunds: 0,
      });
    });

    // Hitung pendaftar per sekolah & gender
    allRegs.forEach(reg => {
      const schoolId = reg.classProgram?.major?.schoolId || reg.classProgram?.major?.school?.id;
      const schoolName = reg.schoolName || reg.classProgram?.major?.school?.name || 'Sekolah Lainnya / Belum Memilih';

      let entry = schoolId ? schoolMap.get(schoolId) : null;
      if (!entry) {
        const found = Array.from(schoolMap.values()).find(s => s.name.toLowerCase() === schoolName.toLowerCase());
        if (found) {
          entry = found;
        } else {
          entry = {
            id: schoolId || `custom-${schoolName}`,
            name: schoolName,
            level: reg.classProgram?.major?.school?.level || '-',
            maleCount: 0,
            femaleCount: 0,
            totalCount: 0,
            paidCount: 0,
            pendingPayCount: 0,
            verifiedDocCount: 0,
            submittedDocCount: 0,
            confirmedFunds: 0,
          };
          schoolMap.set(entry.id, entry);
        }
      }

      entry.totalCount += 1;

      // Gender check (L / P)
      const gender = (reg.studentDetail?.gender || reg.individualParticipant?.gender || '').toUpperCase();
      if (gender === 'P' || gender === 'PEREMPUAN' || gender === 'F') {
        entry.femaleCount += 1;
      } else {
        // Default / L
        entry.maleCount += 1;
      }

      // Pembayaran
      if (reg.status === 'APPROVED') {
        entry.paidCount += 1;
        const fee = Number(reg.admissionWave?.registrationFee || reg.payments?.[0]?.amount || reg.classProgram?.registrationFee || 0);
        entry.confirmedFunds += fee;
      } else if (reg.status === 'WAITING_VERIFICATION') {
        entry.pendingPayCount += 1;
      }

      // Verifikasi Dokumen
      if (reg.formStatus === 'VERIFIED') {
        entry.verifiedDocCount += 1;
      } else if (reg.formStatus === 'SUBMITTED') {
        entry.submittedDocCount += 1;
      }
    });

    const schoolStats = Array.from(schoolMap.values());
    schoolStats.sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));
    window.latestSchoolStats = schoolStats;

    // Totals for table summary footer
    const totalMale = schoolStats.reduce((sum, s) => sum + s.maleCount, 0);
    const totalFemale = schoolStats.reduce((sum, s) => sum + s.femaleCount, 0);
    const totalPaid = schoolStats.reduce((sum, s) => sum + s.paidCount, 0);
    const totalPendingPay = schoolStats.reduce((sum, s) => sum + s.pendingPayCount, 0);
    const totalVerifiedDoc = schoolStats.reduce((sum, s) => sum + s.verifiedDocCount, 0);
    const totalSubmittedDoc = schoolStats.reduce((sum, s) => sum + s.submittedDocCount, 0);

    // Antrean Tindakan Cepat (Pending Action Queue)
    const pendingActions = allRegs
      .filter(r => r.status === 'WAITING_VERIFICATION' || r.formStatus === 'SUBMITTED')
      .slice(0, 6);

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-chart-line" style="color: var(--primary-600);"></i> Dashboard Super Administrator
          </h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0;">
            Monitoring pendaftaran santri baru, validasi keuangan, dan verifikasi berkas per unit pendidikan.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${activePeriod ? `
            <span class="badge badge-info" style="font-size: 0.8rem; padding: 6px 12px;">
              <i class="fa-solid fa-calendar-check"></i> TA: <strong>${activePeriod.name}</strong>
            </span>
          ` : ''}
          ${activeWave ? `
            <span class="badge badge-success" style="font-size: 0.8rem; padding: 6px 12px;">
              <i class="fa-solid fa-bullhorn"></i> Gelombang: <strong>${activeWave.name}</strong>
            </span>
          ` : ''}
        </div>
      </div>

      <!-- 4 CARD ATAS (SESUAI PERMINTAAN) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; margin-bottom: 28px;">
        
        <!-- CARD 1: Total Pendaftaran -->
        <a href="#daftar-peserta" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-decoration: none; color: inherit; display: block; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Total Pendaftaran
            </span>
            <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
          </div>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary-600); line-height: 1.1;">
            ${totalRegs}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-users"></i> Akumulasi seluruh calon santri baru
          </div>
        </a>

        <!-- CARD 2: Verifikasi Pembayaran -->
        <a href="#verifikasi-pembayaran" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-decoration: none; color: inherit; display: block; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Verifikasi Pembayaran
            </span>
            <div style="width: 38px; height: 38px; border-radius: 50%; background: ${pendingPay.length > 0 ? '#fef3c7' : 'var(--success-50)'}; color: ${pendingPay.length > 0 ? '#b45309' : 'var(--success-600)'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-receipt"></i>
            </div>
          </div>
          <div style="font-size: 2.2rem; font-weight: 800; color: ${pendingPay.length > 0 ? '#d97706' : 'var(--success-600)'}; line-height: 1.1;">
            ${pendingPay.length} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">Menunggu</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <strong style="color: var(--success-600);">${approvedPay.length} Disetujui</strong> &bull; ${rejectedPay.length} Ditolak
          </div>
        </a>

        <!-- CARD 3: Verifikasi Data -->
        <a href="#verifikasi-data" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-decoration: none; color: inherit; display: block; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Verifikasi Data
            </span>
            <div style="width: 38px; height: 38px; border-radius: 50%; background: ${submittedData.length > 0 ? '#fef3c7' : 'var(--accent-50)'}; color: ${submittedData.length > 0 ? '#b45309' : 'var(--accent-600)'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
          </div>
          <div style="font-size: 2.2rem; font-weight: 800; color: ${submittedData.length > 0 ? '#d97706' : 'var(--accent-600)'}; line-height: 1.1;">
            ${submittedData.length} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-muted);">Menunggu</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <strong style="color: var(--success-600);">${verifiedData.length} Terverifikasi</strong> &bull; ${revisionData.length} Revisi
          </div>
        </a>

        <!-- CARD 4: Uang Pendaftaran Terkonfirmasi -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              Uang Pendaftaran Terkonfirmasi
            </span>
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-money-bill-trend-up"></i>
            </div>
          </div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--success-600); line-height: 1.1;">
            ${formatCurrency(totalConfirmedFunds)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px;">
            Dari <strong>${approvedPay.length}</strong> calon siswa berstatus lunas
          </div>
        </div>
      </div>

      <!-- LAPORAN JUMLAH PENDAFTAR SISWA BARU PER SEKOLAH (SESUAI PERMINTAAN) -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); margin-bottom: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
          <div>
            <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-school" style="color: var(--primary-600);"></i> Laporan Jumlah Pendaftar Siswa Baru per Sekolah
            </h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px; margin-bottom: 0;">
              Rincian pendaftar berdasarkan jenis kelamin (Laki-laki & Perempuan), verifikasi berkas, dan dana masuk per unit pendidikan.
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-outline-success" onclick="exportAdminSchoolStatsExcel()" style="border: 1px solid var(--success-500); color: var(--success-600); background: transparent; padding: 6px 14px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-file-excel"></i> Export Rekap Sekolah Excel
            </button>
            <a href="#master-kategori" class="btn btn-sm btn-secondary" style="display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-sitemap"></i> Kelola Struktur Sekolah
            </a>
          </div>
        </div>

        ${schoolStats.length === 0 ? `
          <div style="text-align: center; padding: 36px; background: var(--bg-body); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
            <i class="fa-solid fa-school" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 10px;"></i>
            <h4 style="color: var(--text-heading); margin-bottom: 6px;">Belum Ada Unit Sekolah Dibuat</h4>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 14px;">Mulai buat struktur sekolah, jurusan, dan program kelas untuk mulai menerima pendaftaran.</p>
            <a href="#master-kategori" class="btn btn-sm btn-primary"><i class="fa-solid fa-plus"></i> Buat Sekolah Baru</a>
          </div>
        ` : `
          <div class="table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left; background: var(--bg-body);">
                  <th style="padding: 12px 10px; color: var(--text-dim); font-weight: 700; width: 40px;">No</th>
                  <th style="padding: 12px 10px; color: var(--text-dim); font-weight: 700;">Nama Sekolah / Unit</th>
                  <th style="padding: 12px 10px; color: #0284c7; font-weight: 700; text-align: center; width: 130px;">
                    <i class="fa-solid fa-mars"></i> Laki-laki (L)
                  </th>
                  <th style="padding: 12px 10px; color: #ec4899; font-weight: 700; text-align: center; width: 140px;">
                    <i class="fa-solid fa-venus"></i> Perempuan (P)
                  </th>
                  <th style="padding: 12px 10px; color: var(--text-dim); font-weight: 700; text-align: center; width: 150px;">
                    Total Calon Siswa
                  </th>
                  <th style="padding: 12px 10px; color: var(--text-dim); font-weight: 700; text-align: center; width: 160px;">
                    Status Pembayaran
                  </th>
                  <th style="padding: 12px 10px; color: var(--text-dim); font-weight: 700; text-align: center; width: 160px;">
                    Verifikasi Berkas
                  </th>
                </tr>
              </thead>
              <tbody>
                ${schoolStats.map((s, idx) => {
      const pct = totalRegs > 0 ? Math.round((s.totalCount / totalRegs) * 100) : 0;
      return `
                    <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;">
                      <td style="padding: 12px 10px; color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
                      <td style="padding: 12px 10px;">
                        <strong style="color: var(--text-heading); font-size: 0.95rem;">${s.name}</strong>
                      </td>
                      <td style="padding: 12px 10px; text-align: center;">
                        <span style="display: inline-block; padding: 3px 12px; background: #e0f2fe; color: #0369a1; border-radius: 12px; font-weight: 700; font-size: 0.85rem;">
                          ${s.maleCount}
                        </span>
                      </td>
                      <td style="padding: 12px 10px; text-align: center;">
                        <span style="display: inline-block; padding: 3px 12px; background: #fce7f3; color: #be185d; border-radius: 12px; font-weight: 700; font-size: 0.85rem;">
                          ${s.femaleCount}
                        </span>
                      </td>
                      <td style="padding: 12px 10px; text-align: center;">
                        <strong style="font-size: 1.05rem; color: var(--primary-600);">${s.totalCount}</strong>
                        <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${pct}% dari total</div>
                      </td>
                      <td style="padding: 12px 10px; text-align: center;">
                        <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                          <span class="badge badge-success" style="font-size: 0.7rem;">${s.paidCount} Lunas</span>
                          ${s.pendingPayCount > 0 ? `<span class="badge badge-warning" style="font-size: 0.7rem;">${s.pendingPayCount} Menunggu</span>` : ''}
                        </div>
                      </td>
                      <td style="padding: 12px 10px; text-align: center;">
                        <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                          <span class="badge badge-primary" style="font-size: 0.7rem;">${s.verifiedDocCount} Terverifikasi</span>
                          ${s.submittedDocCount > 0 ? `<span class="badge badge-warning" style="font-size: 0.7rem;">${s.submittedDocCount} Menunggu</span>` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid var(--border-subtle); background: var(--bg-body); font-weight: 800;">
                  <td colspan="2" style="padding: 14px 10px; text-align: right; text-transform: uppercase; color: var(--text-heading);">
                    Total Seluruh Unit Sekolah:
                  </td>
                  <td style="padding: 14px 10px; text-align: center; color: #0284c7; font-size: 1.05rem;">
                    ${totalMale}
                  </td>
                  <td style="padding: 14px 10px; text-align: center; color: #ec4899; font-size: 1.05rem;">
                    ${totalFemale}
                  </td>
                  <td style="padding: 14px 10px; text-align: center; color: var(--primary-600); font-size: 1.15rem;">
                    ${totalRegs}
                  </td>
                  <td style="padding: 14px 10px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                    <span style="color: var(--success-600); font-weight: 700;">${totalPaid} Lunas</span> &bull; ${totalPendingPay} Menunggu
                  </td>
                  <td style="padding: 14px 10px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                    <span style="color: var(--primary-600); font-weight: 700;">${totalVerifiedDoc} Valid</span> &bull; ${totalSubmittedDoc} Menunggu
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>

      <!-- SECTION MASUKAN / REKOMENDASI FITUR OPERASIONAL PSB -->
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; margin-bottom: 28px;">
        
        <!-- CARD A: FUNNEL / PIPELINE TAHAPAN PENDAFTARAN -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-filter" style="color: var(--primary-600);"></i> Pipeline Tahapan Calon Siswa
            </h3>
            <span class="badge badge-info" style="font-size: 0.75rem;">Konversi Alur PSB</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- Tahap 1 -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span style="color: var(--text-main); font-weight: 600;"><i class="fa-solid fa-user-plus" style="width: 18px; color: var(--primary-500);"></i> 1. Pembuatan Akun & Formulir Awal</span>
                <strong style="color: var(--text-heading);">${totalRegs} Siswa (100%)</strong>
              </div>
              <div style="height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: var(--primary-500); border-radius: 4px;"></div>
              </div>
            </div>

            <!-- Tahap 2 -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span style="color: var(--text-main); font-weight: 600;"><i class="fa-solid fa-money-check-dollar" style="width: 18px; color: var(--success-500);"></i> 2. Pembayaran Lunas & Terverifikasi</span>
                <strong style="color: var(--success-600);">${approvedPay.length} Siswa (${totalRegs > 0 ? Math.round((approvedPay.length / totalRegs) * 100) : 0}%)</strong>
              </div>
              <div style="height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                <div style="width: ${totalRegs > 0 ? (approvedPay.length / totalRegs) * 100 : 0}%; height: 100%; background: var(--success-500); border-radius: 4px;"></div>
              </div>
            </div>

            <!-- Tahap 3 -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span style="color: var(--text-main); font-weight: 600;"><i class="fa-solid fa-file-arrow-up" style="width: 18px; color: var(--accent-500);"></i> 3. Pengisian Berkas Lengkap Disubmit</span>
                <strong style="color: var(--accent-600);">${submittedData.length + verifiedData.length} Siswa (${totalRegs > 0 ? Math.round(((submittedData.length + verifiedData.length) / totalRegs) * 100) : 0}%)</strong>
              </div>
              <div style="height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                <div style="width: ${totalRegs > 0 ? ((submittedData.length + verifiedData.length) / totalRegs) * 100 : 0}%; height: 100%; background: var(--accent-500); border-radius: 4px;"></div>
              </div>
            </div>

            <!-- Tahap 4 -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span style="color: var(--text-main); font-weight: 600;"><i class="fa-solid fa-id-card-clip" style="width: 18px; color: var(--primary-600);"></i> 4. Berkas Terverifikasi & Siap Ujian/Cetak Kartu</span>
                <strong style="color: var(--primary-600);">${verifiedData.length} Siswa (${totalRegs > 0 ? Math.round((verifiedData.length / totalRegs) * 100) : 0}%)</strong>
              </div>
              <div style="height: 8px; background: var(--border-subtle); border-radius: 4px; overflow: hidden;">
                <div style="width: ${totalRegs > 0 ? (verifiedData.length / totalRegs) * 100 : 0}%; height: 100%; background: var(--primary-600); border-radius: 4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD B: GELOMBANG PENDAFTARAN & TAHUN AJARAN AKTIF -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-bullhorn" style="color: var(--primary-600);"></i> Gelombang Aktif
              </h3>
              <a href="#master-gelombang" class="btn btn-xs btn-outline-primary" style="text-decoration: none;">Atur Gelombang</a>
            </div>

            ${activeWave ? `
              <div style="background: var(--bg-body); border-radius: var(--radius-md); padding: 14px; border: 1px solid var(--border-subtle); margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <strong style="font-size: 1rem; color: var(--text-heading);">${activeWave.name}</strong>
                  <span class="badge ${activeWave.isActive ? 'badge-success' : 'badge-secondary'}">${activeWave.isActive ? 'Sedang Dibuka' : 'Nonaktif'}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                  <i class="fa-solid fa-calendar-days"></i> ${formatDate(activeWave.startDate)} s/d ${formatDate(activeWave.endDate)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-dim);">Biaya Formulir:</span>
                  <strong style="font-size: 1.05rem; color: var(--primary-600);">${formatCurrency(activeWave.registrationFee || 500000)}</strong>
                </div>
              </div>
            ` : `
              <div class="alert alert-warning" style="font-size: 0.85rem; padding: 10px;">
                <i class="fa-solid fa-triangle-exclamation"></i> Belum ada gelombang pendaftaran aktif.
              </div>
            `}

            <div style="font-size: 0.825rem; color: var(--text-muted); line-height: 1.4;">
              <i class="fa-solid fa-circle-info" style="color: var(--primary-600);"></i> Pendaftar baru secara otomatis akan dikenakan biaya formulir dan dicatat ke dalam gelombang yang sedang aktif saat ini.
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 14px; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
            <a href="#master-periode" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;"><i class="fa-solid fa-calendar"></i> Master Periode</a>
            <a href="#master-gelombang" class="btn btn-sm btn-primary" style="flex: 1; text-align: center;"><i class="fa-solid fa-wave-square"></i> Gelombang PSB</a>
          </div>
        </div>
      </div>

      <!-- CARD C: ANTREAN TINDAKAN CEPAT (PENDING ACTIONS QUEUE) -->
      ${pendingActions.length > 0 ? `
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 22px; box-shadow: var(--shadow-sm); margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 1.15rem; color: var(--text-heading); margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-bell" style="color: #d97706;"></i> Antrean Tindakan Verifikasi Terbaru
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin: 2px 0 0 0;">Pendaftar yang baru menyelesaikan pembayaran atau submit berkas dan memerlukan validasi admin.</p>
            </div>
            <span class="badge badge-warning">${pendingActions.length} Memerlukan Aksi</span>
          </div>

          <div class="table-responsive" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left;">
                  <th style="padding: 10px 8px;">No. Registrasi</th>
                  <th style="padding: 10px 8px;">Nama Calon Siswa</th>
                  <th style="padding: 10px 8px;">Pilihan Sekolah & Jurusan</th>
                  <th style="padding: 10px 8px; text-align: center;">Kebutuhan Verifikasi</th>
                  <th style="padding: 10px 8px; text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pendingActions.map(reg => {
      const studentName = reg.studentDetail?.fullName || reg.individualParticipant?.fullName || reg.fullName || 'Calon Siswa';
      const isPayPending = reg.status === 'WAITING_VERIFICATION';
      return `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 10px 8px; font-family: monospace; font-weight: 700; color: var(--primary-600);">
                        ${reg.registrationNumber}
                      </td>
                      <td style="padding: 10px 8px;">
                        <strong style="color: var(--text-heading);">${studentName}</strong>
                      </td>
                      <td style="padding: 10px 8px; color: var(--text-muted);">
                        ${reg.schoolName || reg.classProgram?.major?.school?.name || '-'} &bull; ${reg.classProgramName || reg.classProgram?.name || '-'}
                      </td>
                      <td style="padding: 10px 8px; text-align: center;">
                        ${isPayPending ? `
                          <span class="badge badge-warning"><i class="fa-solid fa-receipt"></i> Verifikasi Pembayaran</span>
                        ` : `
                          <span class="badge badge-info"><i class="fa-solid fa-file-signature"></i> Verifikasi Berkas</span>
                        `}
                      </td>
                      <td style="padding: 10px 8px; text-align: right;">
                        ${isPayPending ? `
                          <a href="#verifikasi-pembayaran" class="btn btn-xs btn-warning" style="text-decoration: none;">
                            <i class="fa-solid fa-check"></i> Cek Pembayaran
                          </a>
                        ` : `
                          <a href="#verifikasi-data" class="btn btn-xs btn-primary" style="text-decoration: none;">
                            <i class="fa-solid fa-clipboard-check"></i> Verifikasi Data
                          </a>
                        `}
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- PINTASAN MANAJEMEN MASTER & KONFIGURASI (QUICK ACTIONS) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        <a href="#master-kategori" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; text-decoration: none; color: inherit; display: block;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-sitemap"></i>
            </div>
            <div>
              <h4 style="font-size: 0.95rem; color: var(--text-heading); margin: 0;">Struktur Pendidikan</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Sekolah, Jurusan & Program</span>
            </div>
          </div>
        </a>

        <a href="#master-gelombang" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; text-decoration: none; color: inherit; display: block;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-wave-square"></i>
            </div>
            <div>
              <h4 style="font-size: 0.95rem; color: var(--text-heading); margin: 0;">Gelombang Pendaftaran</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Jadwal & Biaya Gelombang</span>
            </div>
          </div>
        </a>

        <a href="#payment-accounts" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; text-decoration: none; color: inherit; display: block;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-credit-card"></i>
            </div>
            <div>
              <h4 style="font-size: 0.95rem; color: var(--text-heading); margin: 0;">Rekening Pembayaran</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Bank Transfer & QRIS</span>
            </div>
          </div>
        </a>

        <a href="#users" class="card card-hover" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; text-decoration: none; color: inherit; display: block;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-users-gear"></i>
            </div>
            <div>
              <h4 style="font-size: 0.95rem; color: var(--text-heading); margin: 0;">Manajemen Pengguna</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Admin, Bendahara & Peserta</span>
            </div>
          </div>
        </a>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat dashboard: ${err.message}</div>`;
  }
}

// --- ADMIN DAFTAR PESERTA (ALL REGISTRATIONS) ---
async function renderAdminRegistrationsView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar seluruh peserta...</div>';

  try {
    const res = await apiRequest('/api/registrations?perPage=500');
    tableState.adminRegistrations.data = res.success ? res.registrations : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Daftar Seluruh Calon Santri</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Data pendaftar resmi calon santri baru Pondok Pesantren Maskumambang.</p>
      </div>

      <div id="admin-registrations-table-slot">
        ${renderAdminRegistrationsTable()}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderAdminRegistrationsTable() {
  const ts = tableState.adminRegistrations;
  return renderUniversalTable({
    tableId: 'admin-registrations-table',
    columns: [
      {
        header: 'No. Registrasi',
        key: 'registrationNumber',
        render: r => `<code style="font-weight: 800; color: var(--primary-600);">${r.registrationNumber}</code>`,
      },
      {
        header: 'Nama Calon Santri',
        sortValue: r => (r.individualParticipant?.fullName || r.team?.teamName) || '',
        render: r => `<strong>${r.individualParticipant?.fullName || r.team?.teamName || '-'}</strong>`,
      },
      {
        header: 'Asal Sekolah',
        sortValue: r => (r.individualParticipant?.schoolName || r.team?.schoolName) || '',
        render: r => (r.individualParticipant?.schoolName || r.team?.schoolName) || '-',
      },
      {
        header: 'Sekolah Tujuan & Jurusan',
        sortValue: r => `${r.branch?.level?.category?.name || r.classProgram?.major?.school?.name || ''} ${r.branch?.level?.name || r.classProgram?.major?.name || ''}`,
        render: r => `<span class="member-chip">${r.classProgram?.major?.school?.name || r.branch?.level?.category?.name || '-'} &mdash; ${r.classProgram?.major?.name || r.branch?.level?.name || '-'}</span>`,
      },
      {
        header: 'Program Kelas',
        sortValue: r => r.classProgram?.name || r.branch?.name || '',
        render: r => `<strong>${r.classProgram?.name || r.branch?.name || '-'}</strong>`,
      },
      {
        header: 'Status Pembayaran',
        key: 'status',
        render: r => getStatusBadge(r.status),
      },
      {
        header: 'Aksi',
        sticky: true,
        sortable: false,
        render: r => {
          let btns = `<button type="button" class="btn btn-sm btn-primary" style="padding: 4px 10px;" onclick="openAdminVerificationDetailModal('${r.id}')"><i class="fa-solid fa-eye"></i> Detail</button> `;
          if (r.status === 'APPROVED') {
            btns += `<button type="button" class="btn btn-sm btn-success" style="padding: 4px 10px;" onclick="openParticipantCardModal('${r.id}')" title="Lihat & Cetak Kartu"><i class="fa-solid fa-id-card"></i> Kartu</button>`;
          }
          return `<div style="display: flex; flex-direction: column; gap: 4px;">${btns}</div>`;
        },
      },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: [
      'registrationNumber',
      r => r.branch?.name,
      r => r.individualParticipant?.fullName,
      r => r.team?.teamName,
      r => r.individualParticipant?.schoolName,
      r => r.team?.schoolName,
    ],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    filterKey: 'status',
    filterValue: ts.filterVal,
    filterOptions: [
      { label: 'Semua Status', value: '' },
      { label: 'Disetujui (Approved)', value: 'APPROVED' },
      { label: 'Menunggu Verifikasi', value: 'WAITING_VERIFICATION' },
      { label: 'Ditolak (Rejected)', value: 'PAYMENT_REJECTED' },
    ],
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onAdminRegPageChange',
    onSearchChangeName: 'onAdminRegSearchChange',
    onPageSizeChangeName: 'onAdminRegPageSizeChange',
    onSortChangeName: 'onAdminRegSortChange',
    onFilterChangeName: 'onAdminRegFilterChange',
    exportFilename: 'data_seluruh_calon_santri',
    onExportName: 'exportAdminRegistrationsExcel',
    emptyMessage: 'Belum ada pendaftaran masuk.',
  });
}

function exportAdminRegistrationsExcel() {
  const data = tableState.adminRegistrations.data || [];
  if (!data || !data.length) {
    alert('Tidak ada data peserta untuk diekspor.');
    return;
  }

  const cols = [
    { header: 'No.', exportValue: (r, idx) => idx + 1 },
    { header: 'No. Pendaftaran', key: 'registrationNumber' },
    { header: 'Tanggal Daftar', exportValue: r => formatDate(r.createdAt) },
    { header: 'Status Pembayaran', key: 'status' },
    { header: 'Sekolah Tujuan', exportValue: r => r.classProgram?.major?.school?.name || r.branch?.level?.category?.name || '-' },
    { header: 'Jurusan', exportValue: r => r.classProgram?.major?.name || r.branch?.level?.name || '-' },
    { header: 'Program Kelas', exportValue: r => r.classProgram?.name || r.branch?.name || '-' },
    { header: 'Nama Calon Santri', exportValue: r => r.individualParticipant?.fullName || r.team?.teamName || '-' },
    { header: 'Jenis Kelamin', exportValue: r => r.individualParticipant?.gender === 'L' ? 'Laki-laki' : (r.individualParticipant?.gender === 'P' ? 'Perempuan' : '-') },
    { header: 'No. WhatsApp', exportValue: r => r.individualParticipant?.whatsappNumber || '-' },
    { header: 'Asal Sekolah', exportValue: r => (r.individualParticipant?.schoolName || r.team?.schoolName) || '-' },
    { header: 'Nama Akun Pendaftar', exportValue: r => r.user?.name || '-' },
    { header: 'Email Akun Pendaftar', exportValue: r => r.user?.email || '-' },
    { header: 'No. HP Akun Pendaftar', exportValue: r => r.user?.phoneNumber || '-' },
  ];
  exportTableDataToExcel('data_lengkap_seluruh_calon_santri', cols, data);
}

function onAdminRegPageChange(p) { tableState.adminRegistrations.page = p; updateUniversalTable('admin-registrations-table-slot', renderAdminRegistrationsTable); }
function onAdminRegSearchChange(s) { tableState.adminRegistrations.search = s; tableState.adminRegistrations.page = 1; updateUniversalTable('admin-registrations-table-slot', renderAdminRegistrationsTable); }
function onAdminRegPageSizeChange(z) { tableState.adminRegistrations.pageSize = z; tableState.adminRegistrations.page = 1; updateUniversalTable('admin-registrations-table-slot', renderAdminRegistrationsTable); }
function onAdminRegSortChange(k) {
  if (tableState.adminRegistrations.sortKey === k) {
    tableState.adminRegistrations.sortDir = tableState.adminRegistrations.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.adminRegistrations.sortKey = k;
    tableState.adminRegistrations.sortDir = 'asc';
  }
  updateUniversalTable('admin-registrations-table-slot', renderAdminRegistrationsTable);
}
function onAdminRegFilterChange(v) {
  tableState.adminRegistrations.filterVal = v;
  tableState.adminRegistrations.page = 1;
  updateUniversalTable('admin-registrations-table-slot', renderAdminRegistrationsTable);
}

// --- ADMIN USER MANAGEMENT (UNIVERSAL TABLE + DROPDOWN ACTIONS + BULK DELETE) ---
const selectedAdminUserIds = new Set();

function escapeQuotes(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function toggleUserDropdown(e, userId) {
  if (e) e.stopPropagation();
  const menu = document.getElementById(`user-dd-${userId}`);
  const isShown = menu && menu.style.display === 'block';
  closeAllUserDropdowns();
  if (menu && !isShown) {
    menu.style.display = 'block';
  }
}

function closeAllUserDropdowns() {
  document.querySelectorAll('.user-dropdown-menu').forEach(el => {
    el.style.display = 'none';
  });
}

document.addEventListener('click', () => {
  closeAllUserDropdowns();
});

async function renderAdminUsersView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data user...</div>';

  try {
    const res = await apiRequest('/api/users?perPage=500');
    tableState.adminUsers.data = res.success ? res.users : [];
    selectedAdminUserIds.clear();

    container.innerHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Manajemen Pengguna</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Kelola akun pendaftar & staf, hak akses, reset password, dan hapus pengguna.</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateUserModal()"><i class="fa-solid fa-user-plus"></i> Tambah Pengguna</button>
      </div>

      <!-- Bulk Action Bar -->
      <div id="admin-user-bulk-actions" style="margin-bottom: 14px; display: none; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); padding: 10px 16px; border-radius: var(--radius-md);">
        <div style="font-size: 0.875rem; font-weight: 700; color: var(--danger-600); display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-check-double"></i> <span id="user-selected-count">0</span> Pengguna Terpilih
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-sm btn-danger" onclick="executeBulkDeleteUsers()" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
            <i class="fa-solid fa-trash"></i> Hapus Terpilih
          </button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="clearSelectedUsers()">
            <i class="fa-solid fa-xmark"></i> Batal
          </button>
        </div>
      </div>

      <div id="admin-users-table-slot">
        ${renderAdminUsersTable()}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderAdminUsersTable() {
  const ts = tableState.adminUsers;
  const currentAdmin = state.user;

  return renderUniversalTable({
    tableId: 'admin-users-table',
    columns: [
      {
        header: `<input type="checkbox" id="user-check-all" onchange="toggleSelectAllUsers(this.checked)" style="-webkit-appearance:checkbox !important; appearance:checkbox !important; width:18px; height:18px; cursor:pointer; accent-color:var(--primary-600); margin:0;" title="Pilih Semua">`,
        sortable: false,
        render: u => {
          const isSelf = currentAdmin && currentAdmin.id === u.id;
          if (isSelf) return `<span title="Akun Anda Sendiri" style="font-size:0.75rem; color:var(--text-dim); display:inline-block; width:18px; text-align:center;"><i class="fa-solid fa-lock"></i></span>`;
          const checked = selectedAdminUserIds.has(u.id) ? 'checked' : '';
          return `<input type="checkbox" class="user-row-check" value="${u.id}" ${checked} onchange="toggleUserSelect('${u.id}', this.checked)" style="-webkit-appearance:checkbox !important; appearance:checkbox !important; width:18px; height:18px; cursor:pointer; accent-color:var(--primary-600); margin:0;">`;
        },
      },
      { header: 'Nama Lengkap', key: 'name', render: u => `<strong>${u.name}</strong>` },
      { header: 'Email', key: 'email' },
      { header: 'No. WhatsApp', sortValue: u => u.phoneNumber || '', render: u => u.phoneNumber || '-' },
      { header: 'Role', key: 'role', render: u => `<span class="role-badge-pill role-${u.role}">${u.role}</span>` },
      { header: 'Status', sortValue: u => u.isActive ? 1 : 0, render: u => `<span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">${u.isActive ? 'AKTIF' : 'NONAKTIF'}</span>` },
      { header: 'Tgl Daftar', key: 'createdAt', render: u => formatDate(u.createdAt) },
      {
        header: 'Aksi',
        sticky: true,
        sortable: false,
        render: u => {
          const isSelf = currentAdmin && currentAdmin.id === u.id;
          return `
            <div class="dropdown" style="position: relative; display: inline-block;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="toggleUserDropdown(event, '${u.id}')" style="padding: 5px 12px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;">
                Aksi <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem;"></i>
              </button>
              <div id="user-dd-${u.id}" class="user-dropdown-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 4px); min-width: 175px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: 0 10px 25px rgba(0,0,0,0.18); z-index: 1050; padding: 5px 0; text-align: left;">
                <a href="javascript:void(0)" onclick="executeToggleUserStatus('${u.id}'); closeAllUserDropdowns();" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid ${u.isActive ? 'fa-user-slash' : 'fa-user-check'}" style="width: 16px; color: ${u.isActive ? 'var(--warning-600)' : 'var(--success-600)'};"></i> ${u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </a>
                <a href="javascript:void(0)" onclick="openChangeRoleModal('${u.id}', '${escapeQuotes(u.name)}', '${u.role}'); closeAllUserDropdowns();" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-user-tag" style="width: 16px; color: var(--primary-600);"></i> Ubah Role
                </a>
                <a href="javascript:void(0)" onclick="openResetPasswordModal('${u.id}', '${escapeQuotes(u.name)}', '${u.email}'); closeAllUserDropdowns();" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.82rem; color: var(--text-main); text-decoration: none;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-key" style="width: 16px; color: var(--warning-600);"></i> Reset Password
                </a>
                ${!isSelf ? `
                <div style="border-top: 1px solid var(--border-subtle); margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="confirmDeleteUser('${u.id}', '${escapeQuotes(u.name)}', '${u.email}'); closeAllUserDropdowns();" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.82rem; color: var(--danger-600); text-decoration: none; font-weight: 600;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='transparent'">
                  <i class="fa-solid fa-trash" style="width: 16px; color: var(--danger-600);"></i> Hapus Pengguna
                </a>
                ` : ''}
              </div>
            </div>
          `;
        },
      },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: ['name', 'email', 'phoneNumber', 'role'],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    filterKey: 'role',
    filterValue: ts.filterVal,
    filterOptions: [
      { label: 'Semua Role Pengguna', value: '' },
      { label: 'Super Admin', value: 'SUPER_ADMIN' },
      { label: 'Admin Operasional', value: 'ADMIN' },
      { label: 'Bendahara', value: 'BENDAHARA' },
      { label: 'Admin Scanner', value: 'ADMIN_BARCODE' },
      { label: 'Pewawancara', value: 'PEWAWANCARA' },
      { label: 'Peserta', value: 'PESERTA' },
    ],
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onAdminUserPageChange',
    onSearchChangeName: 'onAdminUserSearchChange',
    onPageSizeChangeName: 'onAdminUserPageSizeChange',
    onSortChangeName: 'onAdminUserSortChange',
    onFilterChangeName: 'onAdminUserFilterChange',
    exportFilename: 'data_pengguna_sistem',
    onExportName: 'exportAdminUsersExcel',
    emptyMessage: 'Pengguna tidak ditemukan.',
  });
}

function toggleUserSelect(userId, checked) {
  if (checked) {
    selectedAdminUserIds.add(userId);
  } else {
    selectedAdminUserIds.delete(userId);
  }
  updateUserBulkActionBar();
}

function toggleSelectAllUsers(checked) {
  const ts = tableState.adminUsers;
  const currentAdmin = state.user;
  const filtered = (ts.data || []).filter(u => !currentAdmin || u.id !== currentAdmin.id);

  if (checked) {
    filtered.forEach(u => selectedAdminUserIds.add(u.id));
  } else {
    selectedAdminUserIds.clear();
  }
  updateUniversalTable('admin-users-table-slot', renderAdminUsersTable);
  updateUserBulkActionBar();
}

function clearSelectedUsers() {
  selectedAdminUserIds.clear();
  updateUniversalTable('admin-users-table-slot', renderAdminUsersTable);
  updateUserBulkActionBar();
}

function updateUserBulkActionBar() {
  const bar = document.getElementById('admin-user-bulk-actions');
  const countEl = document.getElementById('user-selected-count');
  if (bar) {
    bar.style.display = selectedAdminUserIds.size > 0 ? 'flex' : 'none';
  }
  if (countEl) {
    countEl.innerText = selectedAdminUserIds.size;
  }
}

function confirmDeleteUser(userId, name, email) {
  openAppModal(`
    <div style="text-align: center; padding: 10px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 16px;">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">Konfirmasi Hapus Pengguna</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px; line-height: 1.5;">
        Apakah Anda yakin ingin menghapus pengguna <strong>${name}</strong> (<code>${email}</code>)?<br>
        <span style="color: #dc2626; font-size: 0.8rem; font-weight: 600;">Peringatan: Seluruh data pendaftaran dan riwayat terkait pengguna ini juga akan dihapus permanen.</span>
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="closeAppModal()" style="padding: 9px 20px;">Batal</button>
        <button type="button" class="btn btn-danger" onclick="executeDeleteUser('${userId}')" style="padding: 9px 20px; font-weight: 700;">
          <i class="fa-solid fa-trash"></i> Ya, Hapus Sekarang
        </button>
      </div>
    </div>
  `);
}

async function executeDeleteUser(userId) {
  try {
    closeAppModal();
    const res = await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.success) {
      alert(res.message);
      selectedAdminUserIds.delete(userId);
      renderAdminUsersView();
    }
  } catch (err) {
    alert('Gagal menghapus pengguna: ' + err.message);
  }
}

function executeBulkDeleteUsers() {
  const count = selectedAdminUserIds.size;
  if (count === 0) return;

  openAppModal(`
    <div style="text-align: center; padding: 10px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 16px;">
        <i class="fa-solid fa-trash-can"></i>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-heading); margin-bottom: 8px;">Hapus Massal Pengguna</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px; line-height: 1.5;">
        Anda akan menghapus <strong>${count} pengguna terpilih</strong> sekaligus secara permanen.<br>
        <span style="color: #dc2626; font-size: 0.8rem; font-weight: 600;">Tindakan ini tidak dapat dibatalkan!</span>
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="closeAppModal()" style="padding: 9px 20px;">Batal</button>
        <button type="button" class="btn btn-danger" onclick="submitBulkDeleteUsers()" style="padding: 9px 20px; font-weight: 700;">
          <i class="fa-solid fa-trash"></i> Hapus ${count} Pengguna
        </button>
      </div>
    </div>
  `);
}

async function submitBulkDeleteUsers() {
  try {
    closeAppModal();
    const userIds = Array.from(selectedAdminUserIds);
    const res = await apiRequest('/api/users/bulk-delete', {
      method: 'POST',
      body: { userIds },
    });
    if (res.success) {
      alert(res.message);
      selectedAdminUserIds.clear();
      renderAdminUsersView();
    }
  } catch (err) {
    alert('Gagal menghapus massal: ' + err.message);
  }
}

function exportAdminUsersExcel() {
  const data = tableState.adminUsers.data || [];
  const cols = [
    { header: 'Nama Lengkap', key: 'name' },
    { header: 'Email Akun', key: 'email' },
    { header: 'No. WhatsApp', exportValue: u => u.phoneNumber || '-' },
    { header: 'Role Pengguna', key: 'role' },
    { header: 'Status Akun', exportValue: u => u.isActive ? 'AKTIF' : 'NONAKTIF' },
    { header: 'Tanggal Dibuat', exportValue: u => formatDate(u.createdAt) },
  ];
  exportTableDataToExcel('data_pengguna_sistem', cols, data);
}

function onAdminUserPageChange(p) { tableState.adminUsers.page = p; updateUniversalTable('admin-users-table-slot', renderAdminUsersTable); }
function onAdminUserSearchChange(s) { tableState.adminUsers.search = s; tableState.adminUsers.page = 1; updateUniversalTable('admin-users-table-slot', renderAdminUsersTable); }
function onAdminUserPageSizeChange(z) { tableState.adminUsers.pageSize = z; tableState.adminUsers.page = 1; updateUniversalTable('admin-users-table-slot', renderAdminUsersTable); }
function onAdminUserSortChange(k) {
  if (tableState.adminUsers.sortKey === k) {
    tableState.adminUsers.sortDir = tableState.adminUsers.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.adminUsers.sortKey = k;
    tableState.adminUsers.sortDir = 'asc';
  }
  updateUniversalTable('admin-users-table-slot', renderAdminUsersTable);
}
function onAdminUserFilterChange(v) {
  tableState.adminUsers.filterVal = v;
  tableState.adminUsers.page = 1;
  updateUniversalTable('admin-users-table-slot', renderAdminUsersTable);
}

function openCreateUserModal() {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-user-plus"></i> Tambah Pengguna Baru</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitCreateUser(event)">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Lengkap</label>
        <input type="text" id="usr-name-input" class="form-control" placeholder="Nama Lengkap" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Email</label>
        <input type="email" id="usr-email-input" class="form-control" placeholder="nama@email.com" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nomor WhatsApp</label>
        <input type="text" id="usr-phone-input" class="form-control" placeholder="08123456789" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Password Awal (Min. 6 Karakter)</label>
        <input type="password" id="usr-pass-input" class="form-control" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Role Akses</label>
        <select id="usr-role-input" class="form-select" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          <option value="PESERTA">PESERTA (Pendaftar)</option>
          <option value="ADMIN">ADMIN (Operasional)</option>
          <option value="BENDAHARA">BENDAHARA</option>
          <option value="ADMIN_BARCODE">ADMIN SCANNER (BARCODE)</option>
          <option value="PEWAWANCARA">PEWAWANCARA</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">Simpan Pengguna Baru</button>
    </form>
  `);
}

async function submitCreateUser(e) {
  e.preventDefault();
  try {
    const res = await apiRequest('/api/users', {
      method: 'POST',
      body: {
        name: document.getElementById('usr-name-input').value,
        email: document.getElementById('usr-email-input').value,
        phoneNumber: document.getElementById('usr-phone-input').value,
        password: document.getElementById('usr-pass-input').value,
        role: document.getElementById('usr-role-input').value,
      },
    });
    if (res.success) {
      alert(res.message);
      closeAppModal();
      renderAdminUsersView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function executeToggleUserStatus(userId) {
  try {
    const res = await apiRequest(`/api/users/${userId}/toggle-status`, { method: 'PATCH' });
    if (res.success) {
      alert(res.message);
      renderAdminUsersView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function openChangeRoleModal(userId, name, currentRole) {
  openAppModal(`
    <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 12px;"><i class="fa-solid fa-user-tag"></i> Ubah Role Pengguna</h3>
    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">Pengguna: <strong>${name}</strong></p>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Pilih Role Baru</label>
      <select id="modal-new-role" class="form-select" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
        <option value="PESERTA" ${currentRole === 'PESERTA' ? 'selected' : ''}>PESERTA</option>
        <option value="ADMIN" ${currentRole === 'ADMIN' ? 'selected' : ''}>ADMIN (Operasional)</option>
        <option value="BENDAHARA" ${currentRole === 'BENDAHARA' ? 'selected' : ''}>BENDAHARA</option>
        <option value="ADMIN_BARCODE" ${currentRole === 'ADMIN_BARCODE' ? 'selected' : ''}>ADMIN SCANNER (BARCODE)</option>
        <option value="PEWAWANCARA" ${currentRole === 'PEWAWANCARA' ? 'selected' : ''}>PEWAWANCARA</option>
        <option value="SUPER_ADMIN" ${currentRole === 'SUPER_ADMIN' ? 'selected' : ''}>SUPER_ADMIN</option>
      </select>
    </div>
    <button class="btn btn-primary" style="width: 100%;" onclick="submitChangeRole('${userId}')">Simpan Perubahan Role</button>
  `);
}

async function submitChangeRole(userId) {
  const role = document.getElementById('modal-new-role').value;
  try {
    const res = await apiRequest(`/api/users/${userId}/role`, { method: 'PATCH', body: { role } });
    if (res.success) {
      alert(res.message);
      closeAppModal();
      renderAdminUsersView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function openResetPasswordModal(userId, name, email) {
  openAppModal(`
    <h3 style="font-size: 1.2rem; color: var(--text-heading); margin-bottom: 12px;"><i class="fa-solid fa-key"></i> Reset Password Pengguna</h3>
    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">Akun: <strong>${name} (${email})</strong></p>
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Password Baru (Min. 6 Karakter)</label>
      <input type="password" id="modal-reset-pass" class="form-control" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
    </div>
    <button class="btn btn-warning" style="width: 100%;" onclick="submitAdminResetPass('${userId}')">Tetapkan Password Baru</button>
  `);
}

async function submitAdminResetPass(userId) {
  const newPassword = document.getElementById('modal-reset-pass').value;
  if (!newPassword || newPassword.length < 6) {
    alert('Password minimal 6 karakter.');
    return;
  }
  try {
    const res = await apiRequest(`/api/users/${userId}/reset-password`, { method: 'POST', body: { newPassword } });
    if (res.success) {
      alert(res.message);
      closeAppModal();
    }
  } catch (err) {
    alert(err.message);
  }
}

// --- MASTER PROGRAM KELAS TERINTEGRASI (STRUKTUR PENDIDIKAN: SEKOLAH → JURUSAN → PROGRAM KELAS) ---
window.treeCollapsedState = window.treeCollapsedState || {};
state.treeSearch = state.treeSearch || '';

function toggleTreeCollapse(nodeKey) {
  window.treeCollapsedState[nodeKey] = !window.treeCollapsedState[nodeKey];
  renderAdminBranchesView();
}

function onTreeSearchInput(val) {
  state.treeSearch = (val || '').toLowerCase().trim();
  renderAdminBranchesView();
}

async function renderAdminCategoriesView() {
  return renderAdminBranchesView();
}

async function renderAdminBranchesView() {
  const container = document.getElementById('main-view-slot');
  if (!container) return;

  try {
    const [catRes, branchRes] = await Promise.all([
      apiRequest('/api/competitions/categories'),
      apiRequest('/api/competitions/branches/all'),
    ]);

    const categories = (catRes.success && Array.isArray(catRes.data)) ? catRes.data : [];
    const allBranches = (branchRes.success && Array.isArray(branchRes.data)) ? branchRes.data : [];

    // Map branches per major
    const branchesByMajor = {};
    allBranches.forEach(b => {
      const majorId = b.level?.id || b.majorId || '';
      if (!branchesByMajor[majorId]) branchesByMajor[majorId] = [];
      branchesByMajor[majorId].push(b);
    });

    // Hitung total untuk Summary Cards
    let totalSchools = categories.length;
    let activeSchools = categories.filter(c => c.isActive !== false).length;

    let totalMajors = 0;
    let activeMajors = 0;

    let totalClassPrograms = allBranches.length;
    let activeClassPrograms = allBranches.filter(b => b.isActive !== false).length;

    categories.forEach(cat => {
      const majors = cat.majors || cat.levels || [];
      totalMajors += majors.length;
      activeMajors += majors.length;
    });

    // Simpan ke tableState untuk export excel
    tableState.adminBranches.data = allBranches.map(b => ({
      ...b,
      categoryName: b.level?.category?.name || b.major?.school?.name || '-',
      levelName: b.level?.name || b.major?.name || '-',
    }));

    const search = (state.treeSearch || '').toLowerCase();

    // Render tree list
    let treeHTML = '';

    if (categories.length === 0) {
      treeHTML = `
        <div style="text-align: center; padding: 48px 20px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
          <i class="fa-solid fa-school" style="font-size: 2.6rem; opacity: 0.4; margin-bottom: 12px; display: block;"></i>
          <h4 style="font-size: 1.1rem; color: #334155; margin-bottom: 4px;">Belum Ada Struktur Pendidikan</h4>
          <p style="font-size: 0.85rem; margin-bottom: 16px;">Mulai dengan menambahkan unit sekolah utama (seperti SMK, MA, MTs).</p>
          <button class="btn btn-primary" onclick="openCreateCategoryModal()" style="background: #2563eb; color: #fff; border-radius: 8px; font-weight: 600; padding: 8px 16px;">
            <i class="fa-solid fa-plus"></i> Tambah Sekolah Pertama
          </button>
        </div>
      `;
    } else {
      treeHTML = categories.map(cat => {
        const catKey = 'cat_' + cat.id;
        const majors = cat.majors || cat.levels || [];

        // Filter majors & programs
        let filteredMajors = majors.map(maj => {
          const programs = branchesByMajor[maj.id] || maj.classPrograms || [];
          let filteredPrograms = programs;
          if (search) {
            filteredPrograms = programs.filter(p => (p.name || '').toLowerCase().includes(search));
          }
          return {
            ...maj,
            programs,
            filteredPrograms,
            matches: (maj.name || '').toLowerCase().includes(search) || filteredPrograms.length > 0
          };
        });

        const catMatches = (cat.name || '').toLowerCase().includes(search);
        if (search && !catMatches && !filteredMajors.some(m => m.matches)) {
          return '';
        }

        const isCatCollapsed = search ? false : !!window.treeCollapsedState[catKey];

        const majorRowsHTML = filteredMajors.map(major => {
          if (search && !catMatches && !major.matches) return '';

          const majorKey = 'maj_' + major.id;
          const isMajorCollapsed = search ? false : !!window.treeCollapsedState[majorKey];
          const programs = major.programs || [];
          const displayPrograms = search ? major.filteredPrograms : programs;

          const programRowsHTML = displayPrograms.map(prog => {
            const isProgActive = prog.isActive !== false;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-left: 56px; position: relative; border-bottom: 1px solid #f8fafc;">
                <!-- Dotted connector -->
                <div style="position: absolute; left: -26px; top: 50%; width: 20px; height: 1px; border-top: 1.5px dotted #cbd5e1;"></div>
                
                <!-- Info Program -->
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 26px; height: 26px; border-radius: 50%; background: #8b5cf6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; flex-shrink: 0;">
                    <i class="fa-solid fa-graduation-cap"></i>
                  </div>
                  <span style="font-size: 0.88rem; font-weight: 600; color: #334155;">${prog.name}</span>
                  <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${isProgActive ? 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;' : 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'}">
                    ${isProgActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 6px;">
                  <button type="button" onclick="openEditBranchModal('${prog.id}', '${prog.name.replace(/'/g, "\\'")}', '', 1, 1, '${(prog.description || '').replace(/'/g, "\\'")}', '', 0)" style="border: 1px solid #fed7aa; color: #d97706; background: transparent; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-pen" style="font-size: 0.7rem;"></i> Edit
                  </button>
                  <button type="button" onclick="executeDeleteBranch('${prog.id}', '${prog.name.replace(/'/g, "\\'")}')" style="border: 1px solid #fecaca; color: #dc2626; background: transparent; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.7rem;"></i> Hapus
                  </button>
                </div>
              </div>
            `;
          }).join('');

          return `
            <div style="position: relative; margin-top: 4px; margin-bottom: 6px;">
              <!-- Vertical tree connector line -->
              <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 1px; border-left: 1.5px dotted #cbd5e1;"></div>

              <!-- Major Row -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin-left: 28px; position: relative;">
                <!-- Dotted branch line -->
                <div style="position: absolute; left: -10px; top: 50%; width: 10px; height: 1px; border-top: 1.5px dotted #cbd5e1;"></div>

                <!-- Major title & toggle -->
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button type="button" onclick="toggleTreeCollapse('${majorKey}')" style="background: none; border: none; padding: 2px; color: #64748b; cursor: pointer; font-size: 0.75rem;">
                    <i class="fa-solid ${isMajorCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'}"></i>
                  </button>
                  <div style="width: 30px; height: 30px; border-radius: 50%; background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;">
                    <i class="fa-solid fa-book-open"></i>
                  </div>
                  <span style="font-size: 0.92rem; font-weight: 700; color: #1e293b;">${major.name}</span>
                  <span style="font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">
                    Aktif
                  </span>
                </div>

                <!-- Major Action Buttons -->
                <div style="display: flex; gap: 6px;">
                  <button type="button" onclick="openCreateBranchModalForMajor('${major.id}', '${major.name.replace(/'/g, "\\'")}')" style="border: 1px solid #bfdbfe; color: #2563eb; background: transparent; padding: 4px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-plus" style="font-size: 0.7rem;"></i> Tambah Program Kelas
                  </button>
                  <button type="button" onclick="openEditLevelModal('${major.id}', '${major.name.replace(/'/g, "\\'")}', '${major.slug || ''}')" style="border: 1px solid #fed7aa; color: #d97706; background: transparent; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-pen" style="font-size: 0.7rem;"></i> Edit
                  </button>
                  <button type="button" onclick="executeDeleteLevel('${major.id}', '${major.name.replace(/'/g, "\\'")}')" style="border: 1px solid #fecaca; color: #dc2626; background: transparent; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.7rem;"></i> Hapus
                  </button>
                </div>
              </div>

              <!-- Nested Program Classes -->
              ${!isMajorCollapsed ? `
                <div style="position: relative;">
                  ${programRowsHTML || `
                    <div style="padding: 6px 14px 6px 68px; font-size: 0.8rem; color: #94a3b8;">
                      <i class="fa-solid fa-circle-info" style="margin-right: 4px; font-size: 0.75rem;"></i> Belum ada program kelas. Klik <strong>+ Tambah Program Kelas</strong> di atas.
                    </div>
                  `}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        const isCatActive = cat.isActive !== false;

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <!-- School Row Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #ffffff;">
              <!-- School Title & Toggle -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" onclick="toggleTreeCollapse('${catKey}')" style="background: none; border: none; padding: 4px; color: #475569; cursor: pointer; font-size: 0.85rem;">
                  <i class="fa-solid ${isCatCollapsed ? 'fa-chevron-right' : 'fa-chevron-up'}"></i>
                </button>
                <div style="width: 34px; height: 34px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                  <i class="fa-solid fa-school"></i>
                </div>
                <span style="font-size: 1rem; font-weight: 800; color: #0f172a;">${cat.name}</span>
                ${cat.initial ? `<span style="font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;" title="Inisial untuk Nomor Pendaftaran">${cat.initial}</span>` : ''}
                <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${isCatActive ? 'background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;' : 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'}">
                  ${isCatActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <!-- School Action Buttons -->
              <div style="display: flex; gap: 8px;">
                <button type="button" onclick="openCreateLevelModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" style="border: 1px solid #bfdbfe; color: #2563eb; background: transparent; padding: 5px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-plus" style="font-size: 0.75rem;"></i> Tambah Jurusan
                </button>
                <button type="button" onclick="openEditCategoryModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', '${cat.slug || ''}', '${(cat.description || '').replace(/'/g, "\\'")}', '${(cat.initial || '').replace(/'/g, "\\'")}')" style="border: 1px solid #fed7aa; color: #d97706; background: transparent; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-pen" style="font-size: 0.75rem;"></i> Edit
                </button>
                <button type="button" onclick="executeDeleteCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" style="border: 1px solid #fecaca; color: #dc2626; background: transparent; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-trash-can" style="font-size: 0.75rem;"></i> Hapus
                </button>
              </div>
            </div>

            <!-- Nested Majors -->
            ${!isCatCollapsed ? `
              <div style="padding: 4px 12px 12px 12px; background: #ffffff;">
                ${majorRowsHTML || `
                  <div style="padding: 10px 16px 10px 48px; font-size: 0.85rem; color: #94a3b8;">
                    Belum ada jurusan pada sekolah ini. Klik <strong>+ Tambah Jurusan</strong> di atas.
                  </div>
                `}
              </div>
            ` : ''}
          </div>
        `;
      }).filter(Boolean).join('');

      if (!treeHTML && search) {
        treeHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #64748b;">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; opacity: 0.4; margin-bottom: 8px; display: block;"></i>
            Tidak ada sekolah, jurusan, atau program kelas yang cocok dengan kata kunci "<strong>${search}</strong>".
          </div>
        `;
      }
    }

    container.innerHTML = `
      <!-- TOP SUMMARY STAT CARDS (PERSIS MOCKUP) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 24px;">
        <!-- Card 1: Total Sekolah -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
            <i class="fa-solid fa-school"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">TOTAL SEKOLAH</div>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-heading); line-height: 1.1;">${totalSchools}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${activeSchools} Sekolah aktif</div>
          </div>
        </div>

        <!-- Card 2: Total Jurusan -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #16a34a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
            <i class="fa-solid fa-book-open"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">TOTAL JURUSAN</div>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-heading); line-height: 1.1;">${totalMajors}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${activeMajors} Jurusan aktif</div>
          </div>
        </div>

        <!-- Card 3: Total Program Kelas -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #7c3aed; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">TOTAL PROGRAM KELAS</div>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-heading); line-height: 1.1;">${totalClassPrograms}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${activeClassPrograms} Program kelas aktif</div>
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER (2 COLUMNS: TREE LIST + RIGHT PANEL) -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
        <!-- Card Header with Title, Search & Add School Button -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 22px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-heading); margin: 0;">Daftar Struktur Pendidikan</h3>
          
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
            <!-- Search Bar -->
            <div style="position: relative; width: 100%; max-width: 320px;">
              <input type="text" id="tree-search-input" value="${state.treeSearch || ''}" placeholder="Cari sekolah, jurusan, program kelas..." class="form-control" oninput="onTreeSearchInput(this.value)" style="width: 100%; padding: 8px 36px 8px 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: 8px; font-size: 0.85rem;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 0.85rem;"></i>
            </div>

            <!-- Add School Button -->
            <button class="btn btn-primary" onclick="openCreateCategoryModal()" style="background: #2563eb; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;">
              <i class="fa-solid fa-plus"></i> Tambah Sekolah
            </button>
          </div>
        </div>

        <!-- 2 Column Body -->
        <div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">
          <!-- Left Column: Hierarchical Tree -->
          <div style="flex: 1; min-width: 320px;">
            ${treeHTML}
          </div>

          <!-- Right Column: Petunjuk & Catatan Panels -->
          <div style="width: 290px; flex-shrink: 0;">
            <!-- Panel Petunjuk -->
            <div style="background: #f0f7ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 700; color: #1e40af; margin-bottom: 12px;">
                <i class="fa-solid fa-circle-info" style="color: #2563eb; font-size: 1.05rem;"></i> Petunjuk
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e293b; font-size: 0.85rem; display: block; margin-bottom: 2px;">1. Sekolah</strong>
                <p style="color: #64748b; font-size: 0.8rem; line-height: 1.45; margin: 0;">Merupakan unit pendidikan utama seperti SMK, MA, MTss dan lainnya.</p>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e293b; font-size: 0.85rem; display: block; margin-bottom: 2px;">2. Jurusan</strong>
                <p style="color: #64748b; font-size: 0.8rem; line-height: 1.45; margin: 0;">Program keahlian atau bidang studi yang ada di dalam sekolah.</p>
              </div>
              <div>
                <strong style="color: #1e293b; font-size: 0.85rem; display: block; margin-bottom: 2px;">3. Program Kelas</strong>
                <p style="color: #64748b; font-size: 0.8rem; line-height: 1.45; margin: 0;">Jenis program kelas dalam jurusan seperti Reguler, Progresif, Tahfidz, dan lainnya.</p>
              </div>
            </div>

            <!-- Panel Catatan -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 700; color: #166534; margin-bottom: 12px;">
                <i class="fa-regular fa-circle-check" style="color: #16a34a; font-size: 1.05rem;"></i> Catatan
              </div>
              <p style="color: #374151; font-size: 0.8rem; line-height: 1.5; margin: 0 0 10px 0;">Nonaktifkan data jika tidak ingin ditampilkan saat pendaftaran.</p>
              <p style="color: #374151; font-size: 0.8rem; line-height: 1.5; margin: 0;">Data yang digunakan pendaftar tidak boleh dihapus.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Maintain focus on search bar if active
    if (search) {
      const inp = document.getElementById('tree-search-input');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

// Buka modal tambah program kelas untuk jurusan tertentu
async function openCreateBranchModalForMajor(majorId, majorName) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-plus"></i> Tambah Program Kelas</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <div style="background: #f0f7ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.875rem; color: #1e40af;">
      <i class="fa-solid fa-book-open" style="margin-right: 6px;"></i>
      Jurusan: <strong>${majorName}</strong>
    </div>
    <form onsubmit="submitCreateBranchForMajor(event, '${majorId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Program Kelas</label>
        <input type="text" id="br-name-input" class="form-control" placeholder="Contoh: Reguler / Progresif / Tahfidz / Unggulan" required
          style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Deskripsi / Keterangan Program</label>
        <textarea id="br-desc-input" class="form-control" rows="2" placeholder="Keterangan singkat mengenai program kelas ini"
          style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">
        <i class="fa-solid fa-check"></i> Simpan Program Kelas
      </button>
    </form>
  `);
}

async function submitCreateBranchForMajor(e, majorId) {
  e.preventDefault();
  try {
    const res = await apiRequest('/api/competitions/branches', {
      method: 'POST',
      body: {
        majorId,
        levelId: majorId,
        name: document.getElementById('br-name-input').value,
        participantType: 'INDIVIDUAL',
        registrationFee: 0,
        description: document.getElementById('br-desc-input').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Program kelas berhasil dibuat.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function openEditBranchModal(branchId, name, type, minM, maxM, desc, juknisUrl, maxRegistrants) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-pen-to-square"></i> Edit Program Kelas</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitEditBranch(event, '${branchId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Program Kelas</label>
        <input type="text" id="edit-br-name" class="form-control" value="${name}" required
          style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 18px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Deskripsi / Keterangan</label>
        <textarea id="edit-br-desc" class="form-control" rows="2"
          style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${desc || ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">Simpan Perubahan Program Kelas</button>
    </form>
  `);
}

async function submitEditBranch(e, branchId) {
  e.preventDefault();
  try {
    const res = await apiRequest(`/api/competitions/branches/${branchId}`, {
      method: 'PATCH',
      body: {
        name: document.getElementById('edit-br-name').value,
        description: document.getElementById('edit-br-desc').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Program kelas berhasil diperbarui.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function executeDeleteBranch(branchId, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus program kelas "${name}"?`)) return;
  try {
    const res = await apiRequest(`/api/competitions/branches/${branchId}`, { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Program kelas berhasil dihapus.', 'success');
      state.competitionTree = [];
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function toggleBranchStatus(branchId) {
  try {
    const res = await apiRequest(`/api/competitions/branches/${branchId}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message || 'Status program kelas diperbarui.', 'success');
      state.competitionTree = [];
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function renderAdminBranchesTable() {
  const ts = tableState.adminBranches;
  return renderUniversalTable({
    tableId: 'admin-branches-table',
    columns: [
      { header: 'Sekolah', key: 'categoryName' },
      { header: 'Jurusan', key: 'levelName' },
      { header: 'Program Kelas', key: 'name', render: b => `<strong>${b.name}</strong>` },
      { header: 'Status', sortValue: b => b.isActive ? 1 : 0, render: b => `<span class="badge ${b.isActive ? 'badge-success' : 'badge-danger'}">${b.isActive ? 'AKTIF' : 'NONAKTIF'}</span>` },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: ['name', 'categoryName', 'levelName'],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onAdminBranchPageChange',
    onSearchChangeName: 'onAdminBranchSearchChange',
    onPageSizeChangeName: 'onAdminBranchPageSizeChange',
    onSortChangeName: 'onAdminBranchSortChange',
    onFilterChangeName: 'onAdminBranchFilterChange',
    exportFilename: 'master_program_kelas_psb',
    onExportName: 'exportAdminBranchesExcel',
    emptyMessage: 'Program kelas tidak ditemukan.',
  });
}

function exportAdminBranchesExcel() {
  const data = tableState.adminBranches.data || [];
  const cols = [
    { header: 'Sekolah', key: 'categoryName' },
    { header: 'Jurusan', key: 'levelName' },
    { header: 'Nama Program Kelas', key: 'name' },
    { header: 'Status Program', exportValue: b => b.isActive ? 'AKTIF' : 'NONAKTIF' },
  ];
  exportTableDataToExcel('master_program_kelas_psb', cols, data);
}

function onAdminBranchPageChange(p) { tableState.adminBranches.page = p; }
function onAdminBranchSearchChange(s) { tableState.adminBranches.search = s; tableState.adminBranches.page = 1; }
function onAdminBranchPageSizeChange(z) { tableState.adminBranches.pageSize = z; tableState.adminBranches.page = 1; }
function onAdminBranchSortChange(k) {
  if (tableState.adminBranches.sortKey === k) {
    tableState.adminBranches.sortDir = tableState.adminBranches.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.adminBranches.sortKey = k;
    tableState.adminBranches.sortDir = 'asc';
  }
}
function onAdminBranchFilterChange(v) {
  tableState.adminBranches.filterVal = v;
  tableState.adminBranches.page = 1;
}

// Toggle status sekolah
async function toggleCatStatus(catId) {
  try {
    const res = await apiRequest(`/api/competitions/categories/${catId}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message || 'Status sekolah diperbarui.', 'success');
      state.competitionTree = [];
      renderAdminBranchesView();
    }
  } catch (err) {
    showToast('Gagal toggle status sekolah.', 'danger');
  }
}

function openCreateCategoryModal() {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-plus"></i> Tambah Sekolah</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitCreateCategory(event)">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Sekolah</label>
        <input type="text" id="cat-name-input" class="form-control" placeholder="Contoh: SMK Maskumambang" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);" oninput="document.getElementById('cat-slug-input').value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Inisial / Singkatan <span style="color: #6b7280; font-weight: 400; font-size: 0.8rem;">(dipakai di Nomor Pendaftaran: PSB-<strong>INISIAL</strong>-TAHUN-ID)</span></label>
        <input type="text" id="cat-initial-input" class="form-control" placeholder="Contoh: SMK / MA / MTs" maxlength="20" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); text-transform: uppercase;" oninput="this.value = this.value.toUpperCase();">
        <div style="font-size: 0.78rem; color: #6b7280; margin-top: 4px;">Opsional. Jika dikosongkan, kata pertama nama sekolah akan dipakai.</div>
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Slug (URL Friendly)</label>
        <input type="text" id="cat-slug-input" class="form-control" placeholder="Contoh: smk-maskumambang" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Deskripsi / Keterangan</label>
        <textarea id="cat-desc-input" class="form-control" rows="2" placeholder="Keterangan mengenai unit sekolah" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">Simpan Sekolah</button>
    </form>
  `);
}

async function submitCreateCategory(e) {
  e.preventDefault();
  try {
    const res = await apiRequest('/api/competitions/categories', {
      method: 'POST',
      body: {
        name: document.getElementById('cat-name-input').value,
        slug: document.getElementById('cat-slug-input').value,
        initial: document.getElementById('cat-initial-input').value || undefined,
        description: document.getElementById('cat-desc-input').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Sekolah berhasil dibuat.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function openEditCategoryModal(catId, name, slug, description, initial) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-pen-to-square"></i> Edit Sekolah</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitEditCategory(event, '${catId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Sekolah</label>
        <input type="text" id="edit-cat-name-input" class="form-control" value="${name}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Inisial / Singkatan <span style="color: #6b7280; font-weight: 400; font-size: 0.8rem;">(dipakai di Nomor Pendaftaran: PSB-<strong>INISIAL</strong>-TAHUN-ID)</span></label>
        <input type="text" id="edit-cat-initial-input" class="form-control" value="${initial || ''}" maxlength="20" placeholder="Contoh: SMK / MA / MTs" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md); text-transform: uppercase;" oninput="this.value = this.value.toUpperCase();">
        <div style="font-size: 0.78rem; color: #6b7280; margin-top: 4px;">Opsional. Jika dikosongkan, kata pertama nama sekolah akan dipakai.</div>
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Slug</label>
        <input type="text" id="edit-cat-slug-input" class="form-control" value="${slug}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Deskripsi</label>
        <textarea id="edit-cat-desc-input" class="form-control" rows="2" style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${description || ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">Simpan Perubahan Sekolah</button>
    </form>
  `);
}

async function submitEditCategory(e, catId) {
  e.preventDefault();
  try {
    const res = await apiRequest(`/api/competitions/categories/${catId}`, {
      method: 'PATCH',
      body: {
        name: document.getElementById('edit-cat-name-input').value,
        slug: document.getElementById('edit-cat-slug-input').value,
        initial: document.getElementById('edit-cat-initial-input').value || undefined,
        description: document.getElementById('edit-cat-desc-input').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Sekolah berhasil diperbarui.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function executeDeleteCategory(catId, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus sekolah "${name}"? Seluruh jurusan dan program kelas di dalamnya akan ikut terhapus.`)) return;
  try {
    const res = await apiRequest(`/api/competitions/categories/${catId}`, { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Sekolah berhasil dihapus.', 'success');
      state.competitionTree = [];
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function openCreateLevelModal(categoryId, categoryName) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-plus"></i> Tambah Jurusan (${categoryName})</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitCreateLevel(event, '${categoryId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Jurusan / Peminatan</label>
        <input type="text" id="lvl-name-input" class="form-control" placeholder="Contoh: Teknik Komputer dan Jaringan" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);" oninput="document.getElementById('lvl-slug-input').value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');">
      </div>
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Slug (URL Friendly)</label>
        <input type="text" id="lvl-slug-input" class="form-control" placeholder="Contoh: teknik-komputer-dan-jaringan" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">Simpan Jurusan</button>
    </form>
  `);
}

async function submitCreateLevel(e, categoryId) {
  e.preventDefault();
  try {
    const res = await apiRequest('/api/competitions/levels', {
      method: 'POST',
      body: {
        categoryId,
        name: document.getElementById('lvl-name-input').value,
        slug: document.getElementById('lvl-slug-input').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Jurusan berhasil dibuat.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function openEditLevelModal(lvlId, name, slug) {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-pen-to-square"></i> Edit Jurusan</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitEditLevel(event, '${lvlId}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Jurusan</label>
        <input type="text" id="edit-lvl-name-input" class="form-control" value="${name}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Slug</label>
        <input type="text" id="edit-lvl-slug-input" class="form-control" value="${slug}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #2563eb; color: #fff;">Simpan Perubahan Jurusan</button>
    </form>
  `);
}

async function submitEditLevel(e, lvlId) {
  e.preventDefault();
  try {
    const res = await apiRequest(`/api/competitions/levels/${lvlId}`, {
      method: 'PATCH',
      body: {
        name: document.getElementById('edit-lvl-name-input').value,
        slug: document.getElementById('edit-lvl-slug-input').value,
      },
    });
    if (res.success) {
      showToast(res.message || 'Jurusan berhasil diperbarui.', 'success');
      state.competitionTree = [];
      closeAppModal();
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function executeDeleteLevel(lvlId, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus jurusan "${name}"?`)) return;
  try {
    const res = await apiRequest(`/api/competitions/levels/${lvlId}`, { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Jurusan berhasil dihapus.', 'success');
      state.competitionTree = [];
      renderAdminBranchesView();
    }
  } catch (err) {
    alert(err.message);
  }
}

// --- MASTER REKENING PEMBAYARAN ---
async function renderAdminPaymentAccountsView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat rekening bank...</div>';

  try {
    const res = await apiRequest('/api/payments/accounts/all');
    const accounts = res.success ? res.data : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Rekening Pembayaran Resmi</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Kelola daftar rekening bank panitia. Rekening QRIS dapat dilengkapi gambar barcode untuk kemudahan peserta.</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-outline-success" onclick="exportAdminPaymentAccountsExcel()" style="border: 1px solid var(--success-500); color: var(--success-600); background: transparent; padding: 8px 14px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <button class="btn btn-primary" onclick="openCreateAccountModal()"><i class="fa-solid fa-plus"></i> Tambah Rekening</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        ${accounts.map(acc => `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 0; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; overflow: hidden;">
            ${acc.qrisImagePath ? `
              <div style="position: relative; background: #fff; padding: 16px; text-align: center; border-bottom: 1px solid var(--border-subtle);">
                <img src="/api/payments/accounts/qris/${acc.qrisImagePath}" alt="QRIS ${acc.bankName}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 8px;" onerror="this.parentElement.style.display='none'">
                <span style="position: absolute; top: 8px; right: 8px; background: #4CAF50; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.05em;">QRIS</span>
              </div>
            ` : ''}
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span class="badge badge-primary" style="font-weight: 700;">${acc.bankName}</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    ${!acc.qrisImagePath ? '<span style="background: var(--bg-subtle); color: var(--text-dim); font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;">NO QRIS</span>' : ''}
                    <span class="badge ${acc.isActive ? 'badge-success' : 'badge-danger'}">${acc.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Nomor Rekening:</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary-600); font-family: monospace; letter-spacing: 0.05em; margin: 4px 0 8px;">
                  ${acc.accountNumber}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Atas Nama:</div>
                <div style="font-weight: 700; color: var(--text-heading); margin-bottom: 16px;">${acc.accountHolder}</div>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                <button class="btn btn-sm btn-secondary" style="flex: 1;" onclick="openEditAccountModal('${acc.id}', '${acc.bankName.replace(/'/g, "\\'")}', '${acc.accountNumber.replace(/'/g, "\\'")}', '${acc.accountHolder.replace(/'/g, "\\'")}', ${acc.qrisImagePath ? `'${acc.qrisImagePath}'` : 'null'})">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button class="btn btn-sm ${acc.isActive ? 'btn-outline-danger' : 'btn-outline-success'}" style="flex: 1;" onclick="toggleAccountStatus('${acc.id}')">
                  ${acc.isActive ? '<i class="fa-solid fa-ban"></i> Nonaktif' : '<i class="fa-solid fa-check"></i> Aktifkan'}
                </button>
                <button class="btn btn-sm btn-danger" style="padding: 4px 10px;" title="Hapus Rekening" onclick="executeDeleteAccount('${acc.id}', '${acc.bankName.replace(/'/g, "\\'")}')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function exportAdminPaymentAccountsExcel() {
  try {
    const res = await apiRequest('/api/payments/accounts/all');
    const data = (res.success && res.data) ? res.data : [];
    const cols = [
      { header: 'Nama Bank / Metode Pembayaran', key: 'bankName' },
      { header: 'Nomor Rekening', key: 'accountNumber' },
      { header: 'Atas Nama (Pemilik)', key: 'accountHolder' },
      { header: 'Status Rekening', exportValue: a => a.isActive ? 'AKTIF' : 'NONAKTIF' },
    ];
    exportTableDataToExcel('data_rekening_pembayaran_resmi', cols, data);
  } catch (err) {
    alert(err.message);
  }
}

function exportAdminSchoolStatsExcel() {
  const data = window.latestSchoolStats || [];
  const cols = [
    { header: 'No', exportValue: (s, idx) => idx + 1 },
    { header: 'Nama Sekolah / Unit', key: 'name' },
    { header: 'Laki-laki (L)', key: 'maleCount' },
    { header: 'Perempuan (P)', key: 'femaleCount' },
    { header: 'Total Siswa Baru', key: 'totalCount' },
    { header: 'Pembayaran Lunas', key: 'paidCount' },
    { header: 'Pembayaran Menunggu', key: 'pendingPayCount' },
    { header: 'Berkas Terverifikasi', key: 'verifiedDocCount' },
    { header: 'Berkas Menunggu', key: 'submittedDocCount' },
  ];
  exportTableDataToExcel('rekapitulasi_pendaftar_per_sekolah_psb', cols, data);
}

function exportAdminBranchStatsExcel() {
  const data = window.latestBranchStats || [];
  const cols = [
    { header: 'No', exportValue: (b, idx) => idx + 1 },
    { header: 'Program Kelas', key: 'name' },
    { header: 'Kategori', key: 'categoryName' },
    { header: 'Jenjang', key: 'levelName' },
    { header: 'Tipe', key: 'participantType' },
    { header: 'Biaya Pendaftaran', exportValue: b => formatCurrency(b.fee) },
    { header: 'Total Pendaftar', key: 'totalCount' },
    { header: 'Disetujui', key: 'approvedCount' },
    { header: 'Menunggu Verifikasi', key: 'pendingCount' },
    { header: 'Total Dana Terkonfirmasi', exportValue: b => formatCurrency(b.confirmedFunds) },
  ];
  exportTableDataToExcel('rekapitulasi_pendaftar_program_kelas', cols, data);
}

function openCreateAccountModal() {
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-plus"></i> Tambah Rekening Bank</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitCreateAccount(event)" id="form-create-account">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Bank / Metode Pembayaran</label>
        <input type="text" id="acc-bank-input" class="form-control" placeholder="Contoh: Bank Central Asia (BCA) atau QRIS Panitia" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nomor Rekening / ID QRIS</label>
        <input type="text" id="acc-num-input" class="form-control" placeholder="Nomor rekening atau nomor QRIS" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Pemilik Rekening / Merchant</label>
        <input type="text" id="acc-holder-input" class="form-control" placeholder="Contoh: Panitia PSB Maskumambang" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">
          <i class="fa-solid fa-qrcode" style="color: var(--primary-500);"></i> Gambar Barcode QRIS <span style="color: var(--text-dim); font-weight: 400;">(opsional)</span>
        </label>
        <div id="qris-upload-area-create" style="border: 2px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: border-color 0.2s; background: var(--bg-subtle);" onclick="document.getElementById('acc-qris-input').click()" ondragover="event.preventDefault(); this.style.borderColor='var(--primary-500)'" ondragleave="this.style.borderColor='var(--border-subtle)'" ondrop="handleQrisFileDrop(event, 'create')">
          <div id="qris-preview-create" style="display:none; margin-bottom: 10px;">
            <img id="qris-preview-img-create" src="" alt="Preview QRIS" style="max-height: 150px; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          </div>
          <div id="qris-placeholder-create">
            <i class="fa-solid fa-qrcode" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 8px;"></i>
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 4px;">Klik atau drag & drop gambar QRIS</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">Format: JPG, PNG, WEBP (maks. 5MB)</div>
          </div>
          <input type="file" id="acc-qris-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="previewQrisImage(this, 'create')">
        </div>
        <button type="button" id="btn-clear-qris-create" onclick="clearQrisPreview('create')" style="display:none; margin-top: 8px; background: none; border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 0.8rem; padding: 4px 12px; border-radius: var(--radius-sm); cursor: pointer;">
          <i class="fa-solid fa-xmark"></i> Hapus gambar
        </button>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">Simpan Rekening</button>
    </form>
  `);
}

async function submitCreateAccount(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  try {
    const res = await apiRequest('/api/payments/accounts', {
      method: 'POST',
      body: {
        bankName: document.getElementById('acc-bank-input').value,
        accountNumber: document.getElementById('acc-num-input').value,
        accountHolder: document.getElementById('acc-holder-input').value,
      },
    });
    if (res.success) {
      const newAccountId = res.data.id;
      // Upload QRIS image jika ada
      const qrisFile = document.getElementById('acc-qris-input')?.files?.[0];
      if (qrisFile) {
        const fd = new FormData();
        fd.append('qris_image', qrisFile);
        await apiRequest(`/api/payments/accounts/${newAccountId}/qris`, {
          method: 'POST',
          body: fd,
        });
      }
      alert(res.message);
      closeAppModal();
      renderAdminPaymentAccountsView();
    }
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = 'Simpan Rekening';
  }
}

function openEditAccountModal(id, bankName, accountNumber, accountHolder, qrisImagePath) {
  const qrisFilename = (qrisImagePath && qrisImagePath !== 'null') ? qrisImagePath : null;
  openAppModal(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-size: 1.25rem; color: var(--text-heading); margin: 0;"><i class="fa-solid fa-pen-to-square"></i> Edit Rekening Bank</h3>
      <button onclick="closeAppModal()" style="background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer;">&times;</button>
    </div>
    <form onsubmit="submitEditAccount(event, '${id}')">
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Bank / Metode Pembayaran</label>
        <input type="text" id="edit-acc-bank" class="form-control" value="${bankName}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nomor Rekening / ID QRIS</label>
        <input type="text" id="edit-acc-num" class="form-control" value="${accountNumber}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>
      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nama Pemilik Rekening / Merchant</label>
        <input type="text" id="edit-acc-holder" class="form-control" value="${accountHolder}" required style="width: 100%; padding: 10px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">
          <i class="fa-solid fa-qrcode" style="color: var(--primary-500);"></i> Gambar Barcode QRIS
        </label>
        ${qrisFilename ? `
          <div id="qris-current-edit" style="background: #fff; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 10px; border: 1px solid var(--border-subtle);">
            <img src="/api/payments/accounts/qris/${qrisFilename}" alt="QRIS saat ini" style="max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 6px;" onerror="this.parentElement.innerHTML='<span style=color:var(--text-dim)>Gambar tidak ditemukan</span>'">
            <div style="margin-top: 8px;">
              <button type="button" onclick="executeDeleteAccountQris('${id}')" style="background: none; border: 1px solid #ef4444; color: #ef4444; font-size: 0.8rem; padding: 4px 12px; border-radius: var(--radius-sm); cursor: pointer;">
                <i class="fa-solid fa-trash-can"></i> Hapus QRIS
              </button>
            </div>
          </div>
        ` : ''}
        <div id="qris-upload-area-edit" style="border: 2px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: border-color 0.2s; background: var(--bg-subtle);" onclick="document.getElementById('edit-qris-input').click()" ondragover="event.preventDefault(); this.style.borderColor='var(--primary-500)'" ondragleave="this.style.borderColor='var(--border-subtle)'" ondrop="handleQrisFileDrop(event, 'edit')">
          <div id="qris-preview-edit" style="display:none; margin-bottom: 10px;">
            <img id="qris-preview-img-edit" src="" alt="Preview QRIS" style="max-height: 140px; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          </div>
          <div id="qris-placeholder-edit">
            <i class="fa-solid fa-arrow-up-from-bracket" style="font-size: 1.5rem; color: var(--text-dim); margin-bottom: 6px;"></i>
            <div style="font-size: 0.875rem; color: var(--text-muted);">${qrisFilename ? 'Ganti' : 'Upload'} gambar QRIS</div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">JPG, PNG, WEBP (maks. 5MB)</div>
          </div>
          <input type="file" id="edit-qris-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="previewQrisImage(this, 'edit')">
        </div>
        <button type="button" id="btn-clear-qris-edit" onclick="clearQrisPreview('edit')" style="display:none; margin-top: 8px; background: none; border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 0.8rem; padding: 4px 12px; border-radius: var(--radius-sm); cursor: pointer;">
          <i class="fa-solid fa-xmark"></i> Batal ganti
        </button>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">Simpan Perubahan</button>
    </form>
  `);
}

async function submitEditAccount(e, id) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  try {
    const res = await apiRequest(`/api/payments/accounts/${id}`, {
      method: 'PATCH',
      body: {
        bankName: document.getElementById('edit-acc-bank').value,
        accountNumber: document.getElementById('edit-acc-num').value,
        accountHolder: document.getElementById('edit-acc-holder').value,
      },
    });
    if (res.success) {
      // Upload QRIS baru jika ada file dipilih
      const qrisFile = document.getElementById('edit-qris-input')?.files?.[0];
      if (qrisFile) {
        const fd = new FormData();
        fd.append('qris_image', qrisFile);
        await apiRequest(`/api/payments/accounts/${id}/qris`, {
          method: 'POST',
          body: fd,
        });
      }
      alert(res.message);
      closeAppModal();
      renderAdminPaymentAccountsView();
    }
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = 'Simpan Perubahan';
  }
}

async function executeDeleteAccountQris(accountId) {
  if (!confirm('Hapus gambar QRIS dari rekening ini?')) return;
  try {
    const res = await apiRequest(`/api/payments/accounts/${accountId}/qris`, { method: 'DELETE' });
    if (res.success) {
      alert(res.message);
      closeAppModal();
      renderAdminPaymentAccountsView();
    }
  } catch (err) {
    alert(err.message);
  }
}

function previewQrisImage(input, mode) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5MB.');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById(`qris-preview-img-${mode}`);
    const preview = document.getElementById(`qris-preview-${mode}`);
    const placeholder = document.getElementById(`qris-placeholder-${mode}`);
    const clearBtn = document.getElementById(`btn-clear-qris-${mode}`);
    if (img) img.src = e.target.result;
    if (preview) preview.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

function clearQrisPreview(mode) {
  const input = document.getElementById(mode === 'create' ? 'acc-qris-input' : 'edit-qris-input');
  const preview = document.getElementById(`qris-preview-${mode}`);
  const placeholder = document.getElementById(`qris-placeholder-${mode}`);
  const clearBtn = document.getElementById(`btn-clear-qris-${mode}`);
  if (input) input.value = '';
  if (preview) preview.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'none';
}

function handleQrisFileDrop(event, mode) {
  event.preventDefault();
  const area = event.currentTarget;
  area.style.borderColor = 'var(--border-subtle)';
  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    alert('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
    return;
  }
  const inputId = mode === 'create' ? 'acc-qris-input' : 'edit-qris-input';
  const input = document.getElementById(inputId);
  if (input) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    previewQrisImage(input, mode);
  }
}

async function executeDeleteAccount(id, bankName) {
  if (!confirm(`Apakah Anda yakin ingin menghapus rekening ${bankName}?`)) return;
  try {
    const res = await apiRequest(`/api/payments/accounts/${id}`, { method: 'DELETE' });
    if (res.success) {
      alert(res.message);
      renderAdminPaymentAccountsView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function toggleAccountStatus(accId) {
  try {
    const res = await apiRequest(`/api/payments/accounts/${accId}/toggle`, { method: 'PATCH' });
    if (res.success) {
      alert(res.message);
      renderAdminPaymentAccountsView();
    }
  } catch (err) {
    alert(err.message);
  }
}

// --- PENGATURAN BRANDING & IDENTITAS APLIKASI ---
async function renderAdminBrandingView() {
  const container = document.getElementById('main-view-slot');
  const s = state.settings || {};

  const logoUrl = s.application_logo ? `/static/img/${s.application_logo}` : '/static/img/logo_e7a8b6a95d.webp';
  const faviconUrl = s.application_favicon ? `/static/img/${s.application_favicon}` : '/static/img/favicon_87007b6344.webp';

  container.innerHTML = `
    <div style="max-width: 760px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Identitas Aplikasi & Branding</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Perubahan ini diterapkan secara otomatis ke landing page, kartu peserta, dan dashboard.</p>
      </div>

      <div id="branding-save-alert" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 20px;"></div>

      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 26px; box-shadow: var(--shadow-sm);">
        <form onsubmit="handleBrandingSave(event)">
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Nama Aplikasi Lengkap</label>
            <input type="text" id="brand-app-name" class="form-control" value="${s.application_name || 'PSB Maskumambang'}" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Nama Singkat / Brand Tag</label>
            <input type="text" id="brand-short-name" class="form-control" value="${s.application_short_name || 'PSB Maskumambang'}" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Deskripsi Aplikasi / Lembaga</label>
            <textarea id="brand-desc" class="form-control" rows="3" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">${s.application_description || 'Penerimaan Santri Baru (PSB) Pondok Pesantren Maskumambang'}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div>
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);"><i class="fa-solid fa-image"></i> Logo Aplikasi</label>
              <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 10px;">
                <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--bg-body); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <img id="logo-preview-img" src="${logoUrl}" alt="Logo Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <input type="file" id="brand-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="font-size: 0.8rem;" onchange="previewBrandingFile(this, 'logo-preview-img')">
              </div>
              <small style="color: var(--text-muted); font-size: 0.75rem;">PNG, JPG, WEBP, atau SVG (Maks. 2MB)</small>
            </div>

            <div>
              <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main);"><i class="fa-solid fa-icons"></i> Favicon</label>
              <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 10px;">
                <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--bg-body); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <img id="favicon-preview-img" src="${faviconUrl}" alt="Favicon Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <input type="file" id="brand-favicon-file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/svg+xml" style="font-size: 0.8rem;" onchange="previewBrandingFile(this, 'favicon-preview-img')">
              </div>
              <small style="color: var(--text-muted); font-size: 0.75rem;">ICO, PNG, atau WEBP</small>
            </div>
          </div>

          <button type="submit" id="brand-save-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">
            <i class="fa-solid fa-check"></i> Simpan Pengaturan Branding
          </button>
        </form>
      </div>
    </div>
  `;
}

function previewBrandingFile(input, previewImgId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.getElementById(previewImgId);
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function handleBrandingSave(e) {
  e.preventDefault();
  const btn = document.getElementById('brand-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    // 1. Upload Logo if selected
    const logoInput = document.getElementById('brand-logo-file');
    if (logoInput && logoInput.files && logoInput.files[0]) {
      const logoData = new FormData();
      logoData.append('logo', logoInput.files[0]);
      await apiRequest('/api/settings/logo', { method: 'POST', body: logoData });
    }

    // 2. Upload Favicon if selected
    const favInput = document.getElementById('brand-favicon-file');
    if (favInput && favInput.files && favInput.files[0]) {
      const favData = new FormData();
      favData.append('favicon', favInput.files[0]);
      await apiRequest('/api/settings/favicon', { method: 'POST', body: favData });
    }

    // 3. Save text settings
    const res = await apiRequest('/api/settings', {
      method: 'POST',
      body: {
        application_name: document.getElementById('brand-app-name').value,
        application_short_name: document.getElementById('brand-short-name').value,
        application_description: document.getElementById('brand-desc').value,
      },
    });

    if (res.success) {
      state.settings = res.data;
      showBannerAlert('branding-save-alert', 'Pengaturan branding & logo berhasil diperbarui.', 'success');
      await loadBrandingInfo();
    }
  } catch (err) {
    showBannerAlert('branding-save-alert', err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Simpan Pengaturan Branding';
  }
}

// --- PENGATURAN COUNTDOWN HOMEPAGE ---
async function renderAdminCountdownView() {
  const container = document.getElementById('main-view-slot');
  const s = state.settings || {};

  const isEnabled = s.countdown_enabled !== 'false';
  const targetDate = s.countdown_target_date || '2026-10-15T23:59';
  const dtVal = targetDate.slice(0, 16);

  container.innerHTML = `
    <div style="max-width: 760px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Pengaturan Countdown Homepage</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Atur judul, tanggal dan jam target hitung mundur yang tampil di banner utama homepage.</p>
      </div>

      <div id="countdown-save-alert" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 20px;"></div>

      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 26px; box-shadow: var(--shadow-sm);">
        <form onsubmit="handleCountdownSave(event)">
          
          <div class="form-group" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div>
              <label for="cd-enabled-switch" style="font-weight: 700; font-size: 0.95rem; color: var(--text-heading); cursor: pointer; display: block;">Status Countdown</label>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Aktifkan untuk menampilkan widget hitung mundur di homepage</div>
            </div>
            <input type="checkbox" id="cd-enabled-switch" ${isEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer; accent-color: var(--primary-600);">
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Judul / Label Countdown</label>
            <input type="text" id="cd-title-input" class="form-control" value="${s.countdown_title || 'HITUNG MUNDUR PENUTUPAN PENDAFTARAN'}" required placeholder="Contoh: HITUNG MUNDUR PENUTUPAN PENDAFTARAN" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Tanggal &amp; Waktu Target</label>
            <input type="datetime-local" id="cd-target-date-input" class="form-control" value="${dtVal}" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 5px;">Pilih batas waktu penutupan atau waktu pelaksanaan acara.</div>
          </div>

          <div class="form-group" style="margin-bottom: 24px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Pesan Saat Waktu Berakhir</label>
            <input type="text" id="cd-ended-text-input" class="form-control" value="${s.countdown_ended_text || 'Pendaftaran Resmi Ditutup'}" required placeholder="Contoh: Pendaftaran Resmi Ditutup" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>

          <!-- Preview Info Box -->
          <div style="margin-bottom: 24px; padding: 16px; background: rgba(99, 102, 241, 0.06); border: 1px dashed var(--border-subtle); border-radius: 12px;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600); text-transform: uppercase; margin-bottom: 6px;"><i class="fa-solid fa-arrows-rotate"></i> Sinkronisasi Otomatis</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Perubahan tanggal dan jam akan langsung aktif di widget hitung mundur halaman depan (homepage).
            </div>
          </div>

          <button type="submit" id="cd-save-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">
            <i class="fa-solid fa-check"></i> Simpan Pengaturan Countdown
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handleCountdownSave(e) {
  e.preventDefault();
  const btn = document.getElementById('cd-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const isEnabled = document.getElementById('cd-enabled-switch').checked;
    const titleVal = document.getElementById('cd-title-input').value.trim();
    const targetDateVal = document.getElementById('cd-target-date-input').value;
    const endedTextVal = document.getElementById('cd-ended-text-input').value.trim();

    const res = await apiRequest('/api/settings', {
      method: 'POST',
      body: {
        countdown_enabled: isEnabled ? 'true' : 'false',
        countdown_title: titleVal,
        countdown_target_date: targetDateVal,
        countdown_ended_text: endedTextVal,
      },
    });

    if (res.success) {
      state.settings = res.data;
      showBannerAlert('countdown-save-alert', 'Pengaturan countdown berhasil disimpan dan diperbarui.', 'success');
    }
  } catch (err) {
    showBannerAlert('countdown-save-alert', err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Simpan Pengaturan Countdown';
  }
}

// --- HOMEPAGE LIVE COUNTDOWN TIMER ENGINE ---
let countdownTimerInterval = null;

async function initHomepageCountdown() {
  const box = document.getElementById('hero-countdown-box');
  if (!box) return;

  try {
    let settings = state.settings;
    if (!settings || !settings.countdown_target_date) {
      const res = await apiRequest('/api/settings');
      if (res.success && res.data) {
        state.settings = res.data;
        settings = res.data;
      }
    }

    if (settings && settings.countdown_enabled === 'false') {
      box.style.display = 'none';
      return;
    }

    const titleTextEl = document.getElementById('countdown-title-text');
    if (titleTextEl && settings && settings.countdown_title) {
      titleTextEl.textContent = settings.countdown_title;
    }

    const targetDateStr = (settings && settings.countdown_target_date) ? settings.countdown_target_date : '2026-10-15T23:59:00';
    const targetTime = new Date(targetDateStr).getTime();

    if (isNaN(targetTime)) {
      console.warn('Invalid countdown target date:', targetDateStr);
      return;
    }

    const gridEl = document.getElementById('countdown-timer-grid');
    const expiredEl = document.getElementById('countdown-expired-msg');
    const dEl = document.getElementById('cd-days');
    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-minutes');
    const sEl = document.getElementById('cd-seconds');

    function updateCountdown() {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        if (gridEl) gridEl.style.display = 'none';
        if (expiredEl) {
          expiredEl.style.display = 'block';
          expiredEl.textContent = (settings && settings.countdown_ended_text) ? settings.countdown_ended_text : 'Pendaftaran Resmi Ditutup';
        }
        if (countdownTimerInterval) clearInterval(countdownTimerInterval);
        return;
      }

      if (gridEl) gridEl.style.display = 'grid';
      if (expiredEl) expiredEl.style.display = 'none';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
      if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);
    countdownTimerInterval = setInterval(updateCountdown, 1000);

  } catch (err) {
    console.error('Countdown init error:', err);
  }
}

// --- AUDIT LOGS (UNIVERSAL TABLE) ---
async function renderAdminAuditLogsView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat log audit...</div>';

  try {
    const res = await apiRequest('/api/audit/logs?perPage=500');
    tableState.adminAudit.data = res.success ? res.logs : [];

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Log Audit Keamanan Sistem</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Pencatatan riwayat aktivitas penting dan administratif sistem.</p>
      </div>

      <div id="admin-audit-table-slot">
        ${renderAdminAuditTable()}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderAdminAuditTable() {
  const ts = tableState.adminAudit;
  return renderUniversalTable({
    tableId: 'admin-audit-table',
    columns: [
      { header: 'Waktu', key: 'createdAt', render: l => formatDate(l.createdAt) },
      { header: 'Aksi', key: 'action', render: l => `<span class="badge badge-primary">${l.action}</span>` },
      { header: 'Pelaksana', sortValue: l => l.user?.name || 'Sistem', render: l => l.user ? `<strong>${l.user.name}</strong> (${l.user.role})` : 'Sistem' },
      { header: 'Tabel Target', key: 'targetTable', render: l => `<code>${l.targetTable}</code>` },
      { header: 'Rincian', key: 'details', render: l => l.details || '-' },
    ],
    data: ts.data,
    searchQuery: ts.search,
    searchFields: ['action', 'targetTable', 'details', l => l.user?.name, l => l.user?.email],
    sortKey: ts.sortKey,
    sortDir: ts.sortDir,
    currentPage: ts.page,
    pageSize: ts.pageSize,
    onPageChangeName: 'onAdminAuditPageChange',
    onSearchChangeName: 'onAdminAuditSearchChange',
    onPageSizeChangeName: 'onAdminAuditPageSizeChange',
    onSortChangeName: 'onAdminAuditSortChange',
    exportFilename: 'log_audit_keamanan_sistem',
    onExportName: 'exportAdminAuditExcel',
    emptyMessage: 'Belum ada log audit.',
  });
}

function exportAdminAuditExcel() {
  const data = tableState.adminAudit.data || [];
  const cols = [
    { header: 'Waktu Aktivitas', exportValue: l => formatDate(l.createdAt) },
    { header: 'Aksi Keamanan', key: 'action' },
    { header: 'Nama Pelaksana', exportValue: l => l.user?.name || 'Sistem' },
    { header: 'Email Pelaksana', exportValue: l => l.user?.email || '-' },
    { header: 'Role Pelaksana', exportValue: l => l.user?.role || '-' },
    { header: 'Tabel Target', key: 'targetTable' },
    { header: 'Rincian Aktivitas', key: 'details' },
  ];
  exportTableDataToExcel('log_audit_keamanan_sistem', cols, data);
}

function onAdminAuditPageChange(p) { tableState.adminAudit.page = p; updateUniversalTable('admin-audit-table-slot', renderAdminAuditTable); }
function onAdminAuditSearchChange(s) { tableState.adminAudit.search = s; tableState.adminAudit.page = 1; updateUniversalTable('admin-audit-table-slot', renderAdminAuditTable); }
function onAdminAuditPageSizeChange(z) { tableState.adminAudit.pageSize = z; tableState.adminAudit.page = 1; updateUniversalTable('admin-audit-table-slot', renderAdminAuditTable); }
function onAdminAuditSortChange(k) {
  if (tableState.adminAudit.sortKey === k) {
    tableState.adminAudit.sortDir = tableState.adminAudit.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.adminAudit.sortKey = k;
    tableState.adminAudit.sortDir = 'asc';
  }
  updateUniversalTable('admin-audit-table-slot', renderAdminAuditTable);
}

// --- RESET DATA OPERASIONAL (DANGER ZONE WITH RESET124) ---
function renderAdminResetOperasionalView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = `
    <div style="max-width: 650px; margin: 0 auto;">
      <div class="card" style="background: var(--bg-card); border: 2px solid var(--danger-500); border-radius: var(--radius-xl); padding: 30px; box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 20px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 3.5rem; color: var(--danger-500); margin-bottom: 12px;"></i>
          <h2 style="font-size: 1.5rem; color: var(--danger-600); margin-bottom: 8px;">Danger Zone: Reset Data Operasional</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
            Fitur ini digunakan untuk <strong>membersihkan data transaksi testing</strong> (Pendaftaran Calon Santri, Formulir, Pembayaran, dan Riwayat Check-in) sebelum periode pendaftaran resmi dimulai.
          </p>
        </div>

        <div class="alert alert-warning" style="margin-bottom: 24px; font-size: 0.875rem; line-height: 1.6;">
          <strong>Garansi Keamanan Master Data:</strong>
          <ul style="margin-left: 20px; margin-top: 6px;">
            <li>Data Master PSB (Periode, Gelombang, Sekolah, Jurusan, Program Kelas) <strong>100% AMAN</strong>.</li>
            <li>Rekening Bank Panitia & Pengaturan Branding <strong>100% AMAN</strong>.</li>
            <li>Akun Super Admin & Bendahara <strong>TETAP AMAN</strong>.</li>
          </ul>
        </div>

        <div id="reset-page-alert" style="display: none; padding: 14px; border-radius: 8px; margin-bottom: 18px;"></div>

        <form onsubmit="handleOperationalResetSubmit(event)">
          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 700; margin-bottom: 6px; color: var(--danger-600);">
              Ketik Kode Konfirmasi Rahasia Super Admin:
            </label>
            <input type="password" id="reset-code-field" class="form-control" placeholder="••••••••" required style="width: 100%; padding: 12px 14px; border: 2px solid var(--danger-500); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>

          <button type="submit" id="reset-exec-btn" class="btn btn-danger" style="width: 100%; padding: 14px; font-weight: 800; font-size: 1rem;">
            <i class="fa-solid fa-trash-can"></i> Eksekusi Pembersihan Data Operasional
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handleOperationalResetSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('reset-code-field').value.trim();
  const btn = document.getElementById('reset-exec-btn');

  if (!confirm('PERINGATAN TERAKHIR: Apakah Anda yakin ingin membersihkan seluruh data registrasi & pembayaran transaksi?')) {
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengeksekusi pembersihan...';

  try {
    const res = await apiRequest('/api/settings/reset-operational-data', {
      method: 'POST',
      body: { confirmationCode: code },
    });

    if (res.success) {
      showBannerAlert('reset-page-alert', res.message, 'success');
      document.getElementById('reset-code-field').value = '';
    }
  } catch (err) {
    showBannerAlert('reset-page-alert', err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Eksekusi Pembersihan Data Operasional';
  }
}

// --- COMMON CHANGE PASSWORD VIEW ---
function renderChangePasswordView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = `
    <div style="max-width: 480px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; color: var(--text-heading); margin-bottom: 4px;">Ubah Kata Sandi Akun</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Perbarui kata sandi untuk mengamankan akses akun Anda.</p>
      </div>

      <div id="change-pass-alert" style="display: none; padding: 14px; border-radius: 8px; margin-bottom: 20px;"></div>

      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm);">
        <form onsubmit="handlePasswordChangeSubmit(event)">
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Kata Sandi Saat Ini</label>
            <input type="password" id="cp-current" class="form-control" placeholder="••••••••" required style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Kata Sandi Baru (Min. 6 Karakter)</label>
            <input type="password" id="cp-new" class="form-control" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>
          <div class="form-group" style="margin-bottom: 22px;">
            <label class="form-label" style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--text-main);">Konfirmasi Kata Sandi Baru</label>
            <input type="password" id="cp-confirm" class="form-control" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 11px 14px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-main); border-radius: var(--radius-md);">
          </div>

          <button type="submit" id="cp-submit-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">
            <i class="fa-solid fa-check"></i> Simpan Kata Sandi Baru
          </button>
        </form>
      </div>
    </div>
  `;
}

async function handlePasswordChangeSubmit(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('cp-current').value;
  const newPassword = document.getElementById('cp-new').value;
  const confirmPassword = document.getElementById('cp-confirm').value;
  const btn = document.getElementById('cp-submit-btn');

  if (newPassword !== confirmPassword) {
    showBannerAlert('change-pass-alert', 'Konfirmasi kata sandi baru tidak cocok.', 'danger');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await apiRequest('/api/users/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });

    if (res.success) {
      showBannerAlert('change-pass-alert', res.message, 'success');
      document.getElementById('cp-current').value = '';
      document.getElementById('cp-new').value = '';
      document.getElementById('cp-confirm').value = '';
    }
  } catch (err) {
    showBannerAlert('change-pass-alert', err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Simpan Kata Sandi Baru';
  }
}

// ============================================================================
// GLOBAL EXPORTS & WINDOW ATTACHMENTS
// ============================================================================
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.initDashboardApp = initDashboardApp;
window.setSession = setSession;
window.saveSession = saveSession;
window.clearSession = clearSession;
window.handleLogout = handleLogout;
window.loadBrandingInfo = loadBrandingInfo;
window.openAppModal = openAppModal;
window.closeAppModal = closeAppModal;

// Table pagination, search, sorting & filter handlers
window.onPesertaPageChange = onPesertaPageChange;
window.onPesertaSearchChange = onPesertaSearchChange;
window.onPesertaPageSizeChange = onPesertaPageSizeChange;
window.onPesertaSortChange = onPesertaSortChange;
window.onPesertaFilterChange = onPesertaFilterChange;

window.onBendaharaPageChange = onBendaharaPageChange;
window.onBendaharaSearchChange = onBendaharaSearchChange;
window.onBendaharaPageSizeChange = onBendaharaPageSizeChange;
window.onBendaharaSortChange = onBendaharaSortChange;
window.onBendaharaFilterChange = onBendaharaFilterChange;

window.onAdminRegPageChange = onAdminRegPageChange;
window.onAdminRegSearchChange = onAdminRegSearchChange;
window.onAdminRegPageSizeChange = onAdminRegPageSizeChange;
window.onAdminRegSortChange = onAdminRegSortChange;
window.onAdminRegFilterChange = onAdminRegFilterChange;

window.onAdminUserPageChange = onAdminUserPageChange;
window.onAdminUserSearchChange = onAdminUserSearchChange;
window.onAdminUserPageSizeChange = onAdminUserPageSizeChange;
window.onAdminUserSortChange = onAdminUserSortChange;
window.onAdminUserFilterChange = onAdminUserFilterChange;

window.onAdminAuditPageChange = onAdminAuditPageChange;
window.onAdminAuditSearchChange = onAdminAuditSearchChange;
window.onAdminAuditPageSizeChange = onAdminAuditPageSizeChange;
window.onAdminAuditSortChange = onAdminAuditSortChange;

window.onAdminBranchPageChange = onAdminBranchPageChange;
window.onAdminBranchSearchChange = onAdminBranchSearchChange;
window.onAdminBranchPageSizeChange = onAdminBranchPageSizeChange;
window.onAdminBranchSortChange = onAdminBranchSortChange;
window.onAdminBranchFilterChange = onAdminBranchFilterChange;

// Participant Card & Modal Handlers
window.openParticipantCardModal = openParticipantCardModal;
window.printParticipantCard = printParticipantCard;
window.downloadParticipantCardJPG = downloadParticipantCardJPG;

// ============================================================================
// CETAK KARTU PESERTA MASSAL (SUPERADMIN)
// ============================================================================

const cetakKartuState = {
  data: [],
  selected: new Set(),
  filterBranch: '',
  search: '',
};

function getCetakFilteredData() {
  const allData = cetakKartuState.data;
  let filtered = allData;
  if (cetakKartuState.filterBranch) {
    filtered = filtered.filter(r => (r.branch?.name || r.branchName || '') === cetakKartuState.filterBranch);
  }
  if (cetakKartuState.search.trim()) {
    const q = cetakKartuState.search.toLowerCase();
    filtered = filtered.filter(r => {
      const name = r.individualParticipant?.fullName || r.team?.teamName || '';
      const school = r.individualParticipant?.schoolName || r.team?.schoolName || '';
      const reg = r.registrationNumber || '';
      return name.toLowerCase().includes(q) || school.toLowerCase().includes(q) || reg.toLowerCase().includes(q);
    });
  }
  return filtered;
}

async function renderCetakKartuView() {
  const container = document.getElementById('main-view-slot');
  container.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar peserta terverifikasi...</div>';

  try {
    const res = await apiRequest('/api/registrations?perPage=999&status=APPROVED');
    cetakKartuState.data = res.success ? (res.data || res.registrations || []) : [];
    cetakKartuState.selected = new Set();
    renderCetakKartuPage();
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function renderCetakKartuPage() {
  const container = document.getElementById('main-view-slot');
  const allData = cetakKartuState.data;

  // Get unique branches for filter
  const branches = [...new Set(allData.map(r => r.branch?.name || r.branchName || '').filter(Boolean))].sort();

  const filtered = getCetakFilteredData();
  const selectedCount = cetakKartuState.selected.size;
  const isAllSelected = filtered.length > 0 && filtered.every(r => cetakKartuState.selected.has(r.id));

  container.innerHTML = `
    <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
      <div>
        <h2 style="font-size:1.6rem; color:var(--text-heading); margin-bottom:4px;"><i class="fa-solid fa-print"></i> Cetak Kartu Peserta Massal</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">Pilih peserta yang ingin dicetak kartunya secara massal (Ukuran Standar: <strong>10cm × 14cm</strong>).</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary" onclick="cetakSelectAll()" title="Pilih semua yang terfilter">
          <i class="fa-solid fa-check-double"></i> Pilih Semua (${filtered.length})
        </button>
        <button type="button" class="btn btn-secondary" onclick="cetakClearAll()" title="Kosongkan pilihan">
          <i class="fa-solid fa-xmark"></i> Batal Pilih
        </button>
        <button type="button" class="btn btn-primary" onclick="cetakKartuPDF()" ${selectedCount === 0 ? 'disabled' : ''} style="min-width:170px;">
          <i class="fa-solid fa-print"></i> Cetak PDF (<span id="cetak-count">${selectedCount}</span>)
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:16px 20px; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
      <div style="flex:1; min-width:220px; position:relative;">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-dim); font-size:0.85rem;"></i>
        <input type="text" placeholder="Cari nama / sekolah / nomor reg..." value="${cetakKartuState.search}" oninput="cetakOnSearch(this.value)" style="width:100%; padding:8px 12px 8px 34px; font-size:0.875rem; border-radius:var(--radius-md); border:1px solid var(--input-border); background:var(--input-bg); color:var(--text-main);">
      </div>
      <div style="min-width:220px;">
        <select onchange="cetakOnFilterBranch(this.value)" style="width:100%; padding:8px 12px; font-size:0.875rem; border-radius:var(--radius-md); border:1px solid var(--input-border); background:var(--input-bg); color:var(--text-main);">
          <option value="">— Semua Program Kelas —</option>
          ${branches.map(b => `<option value="${b}" ${cetakKartuState.filterBranch === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:0.85rem; color:var(--text-muted); white-space:nowrap;">
        Menampilkan <strong>${filtered.length}</strong> peserta (${selectedCount} dipilih)
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); overflow:hidden;">
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
          <thead>
            <tr style="background:var(--table-header-bg); border-bottom:1px solid var(--border-subtle);">
              <th style="padding:12px 14px; width:50px; text-align:center;">
                <input type="checkbox" id="cetak-check-all" onchange="cetakToggleAll(this.checked)" ${isAllSelected ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary-600);" title="Pilih Semua yang Tampil">
              </th>
              <th style="padding:12px 14px; font-weight:700; color:var(--text-muted);">No. Reg</th>
              <th style="padding:12px 14px; font-weight:700; color:var(--text-muted);">Nama Peserta / Tim</th>
              <th style="padding:12px 14px; font-weight:700; color:var(--text-muted);">Asal Sekolah</th>
              <th style="padding:12px 14px; font-weight:700; color:var(--text-muted);">Program Kelas</th>
              <th style="padding:12px 14px; font-weight:700; color:var(--text-muted);">Jenis</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);">
                <i class="fa-solid fa-folder-open" style="font-size:2rem; display:block; margin-bottom:8px; color:var(--text-dim);"></i>
                Tidak ada peserta yang sudah disetujui / terverifikasi.
              </td></tr>
            ` : filtered.map(r => {
    const name = r.individualParticipant?.fullName || r.team?.teamName || '-';
    const school = r.individualParticipant?.schoolName || r.team?.schoolName || '-';
    const branch = r.branch?.name || r.branchName || '-';
    const type = r.branch?.participantType === 'TEAM' ? 'Beregu' : 'Perorangan';
    const checked = cetakKartuState.selected.has(r.id) ? 'checked' : '';
    return `
                <tr style="border-bottom:1px solid var(--border-subtle); ${checked ? 'background: rgba(99,102,241,0.08);' : ''}; cursor:pointer;" onclick="cetakRowClick(event, '${r.id}')">
                  <td style="padding:12px 14px; text-align:center;" onclick="event.stopPropagation();">
                    <input type="checkbox" class="cetak-row-check" value="${r.id}" ${checked} onchange="cetakToggleOne('${r.id}', this.checked)" style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary-600);">
                  </td>
                  <td style="padding:12px 14px;"><code style="font-weight:800; color:var(--primary-600); font-size:0.82rem;">${r.registrationNumber || '-'}</code></td>
                  <td style="padding:12px 14px; font-weight:700; color:var(--text-heading);">${name}</td>
                  <td style="padding:12px 14px; color:var(--text-muted);">${school}</td>
                  <td style="padding:12px 14px; font-weight:600;">${branch}</td>
                  <td style="padding:12px 14px;"><span style="font-size:0.75rem; padding:3px 10px; border-radius:9999px; background:${type === 'Beregu' ? '#dbeafe' : '#dcfce7'}; color:${type === 'Beregu' ? '#1d4ed8' : '#15803d'}; font-weight:700;">${type}</span></td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function cetakRowClick(e, id) {
  if (e.target.tagName === 'INPUT') return;
  const isSelected = cetakKartuState.selected.has(id);
  cetakToggleOne(id, !isSelected);
}

function cetakToggleOne(id, checked) {
  if (checked) cetakKartuState.selected.add(id);
  else cetakKartuState.selected.delete(id);

  // Update check-all state
  const filtered = getCetakFilteredData();
  const allEl = document.getElementById('cetak-check-all');
  if (allEl) allEl.checked = filtered.length > 0 && filtered.every(r => cetakKartuState.selected.has(r.id));

  // Update count & button
  const el = document.getElementById('cetak-count');
  if (el) el.textContent = cetakKartuState.selected.size;
  const btn = document.querySelector('[onclick="cetakKartuPDF()"]');
  if (btn) btn.disabled = cetakKartuState.selected.size === 0;

  // Re-render row highlight if needed
  renderCetakKartuPage();
}

function cetakToggleAll(checked) {
  const filtered = getCetakFilteredData();
  filtered.forEach(r => {
    if (checked) cetakKartuState.selected.add(r.id);
    else cetakKartuState.selected.delete(r.id);
  });
  renderCetakKartuPage();
}

function cetakSelectAll() {
  const filtered = getCetakFilteredData();
  filtered.forEach(r => cetakKartuState.selected.add(r.id));
  renderCetakKartuPage();
}

function cetakClearAll() {
  cetakKartuState.selected.clear();
  renderCetakKartuPage();
}

function cetakOnSearch(val) {
  cetakKartuState.search = val;
  renderCetakKartuPage();
}

function cetakOnFilterBranch(val) {
  cetakKartuState.filterBranch = val;
  renderCetakKartuPage();
}

async function cetakKartuPDF() {
  const ids = [...cetakKartuState.selected];
  if (ids.length === 0) { alert('Pilih minimal 1 peserta.'); return; }

  const loadingModal = document.createElement('div');
  loadingModal.id = 'cetak-loading-overlay';
  loadingModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
  loadingModal.innerHTML = `<div style="background:var(--bg-card);padding:32px 40px;border-radius:16px;text-align:center;min-width:280px;">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--primary-600);margin-bottom:16px;display:block;"></i>
    <div style="font-weight:700;font-size:1.1rem;margin-bottom:6px;">Memuat kartu peserta...</div>
    <div id="cetak-progress" style="color:var(--text-muted);font-size:0.85rem;">0 / ${ids.length}</div>
  </div>`;
  document.body.appendChild(loadingModal);

  try {
    const cards = [];
    for (let i = 0; i < ids.length; i++) {
      const progressEl = document.getElementById('cetak-progress');
      if (progressEl) progressEl.textContent = `${i + 1} / ${ids.length}`;
      const res = await apiRequest(`/api/cards/${ids[i]}`);
      if (res.success && res.data) cards.push(res.data);
    }

    document.body.removeChild(loadingModal);
    openBulkPrintWindow(cards);
  } catch (e) {
    document.body.removeChild(loadingModal);
    alert('Gagal memuat kartu: ' + e.message);
  }
}

function buildCardHTML(card) {
  const isMukim = card.boarding_status !== 'NON_MUKIM';
  const boardingLabel = card.boarding_status_label || (isMukim ? 'Mukim / Mondok' : 'Non-Mukim');

  return `
    <div class="print-card" style="width:10cm;height:14cm;max-width:10cm;max-height:14cm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;background:#fff;border:1.5px solid #0f172a;border-radius:10px;text-align:left;">

      <!-- BAGIAN ATAS: LOGO, NAMA SISTEM, TAHUN PELAJARAN -->
      <div style="flex-shrink:0;">
        <div class="card-banner" style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0369a1 100%);color:#fff;padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:2px solid #0284c7;flex-shrink:0;">
          <img src="${card.logo_url || '/static/img/logo_e7a8b6a95d.webp'}" alt="Logo"
            style="height:34px;width:34px;object-fit:contain;background:#fff;padding:2px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.25);"
            onerror="this.style.display='none'">
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:800;color:#fff;line-height:1.2;text-transform:uppercase;">
              ${card.app_name || card.app_title || card.app_short_name || 'PENERIMAAN SANTRI BARU'}
            </div>
            <div style="font-size:7.5px;color:#7dd3fc;margin-top:1px;font-weight:700;text-transform:uppercase;">
              TAHUN PELAJARAN ${card.academic_period_name || '2026/2027'}
            </div>
          </div>
        </div>

        <!-- JUDUL : KARTU PESERTA SELEKSI -->
        <div style="background:#e0f2fe;text-align:center;padding:4px;border-bottom:1px solid #bae6fd;flex-shrink:0;">
          <span style="font-size:8px;font-weight:800;color:#0369a1;letter-spacing:0.08em;text-transform:uppercase;">✦ KARTU PESERTA SELEKSI ✦</span>
        </div>
      </div>

      <!-- IDENTITAS PESERTA & STATUS MUKIM -->
      <div style="padding:6px 10px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <!-- PAS FOTO -->
          <div style="width:2.4cm;height:3.2cm;flex-shrink:0;background:#f1f5f9;border:1.2px solid #cbd5e1;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
            ${card.photo_url ? `
              <img src="${card.photo_url}" alt="Pas Foto" style="width:100%;height:100%;object-fit:cover;">
            ` : `
              <div style="text-align:center;color:#94a3b8;font-size:7px;font-weight:700;">
                PAS FOTO<br>3x4
              </div>
            `}
          </div>

          <!-- DETAIL IDENTITAS -->
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;">
            <div>
              <div style="font-size:6.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Nama Lengkap:</div>
              <div style="font-size:9.5px;font-weight:800;color:#0f172a;line-height:1.2;word-break:break-word;">
                ${card.full_name || card.participant_name}
              </div>
            </div>

            <div>
              <div style="font-size:6.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Nomor Pendaftaran:</div>
              <div style="font-size:9.5px;font-weight:800;color:#0284c7;font-family:monospace;letter-spacing:0.04em;">
                ${card.registration_number}
              </div>
            </div>

            <div>
              <div style="font-size:6.5px;font-weight:700;color:#64748b;text-transform:uppercase;">Sekolah Tujuan:</div>
              <div style="font-size:8px;font-weight:700;color:#1e293b;">
                ${card.target_school_name || card.school_name || '-'}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
              <div>
                <div style="font-size:6px;font-weight:700;color:#64748b;text-transform:uppercase;">Jurusan:</div>
                <div style="font-size:7.5px;font-weight:700;color:#334155;">
                  ${card.target_major_name || card.major_name || '-'}
                </div>
              </div>
              <div>
                <div style="font-size:6px;font-weight:700;color:#64748b;text-transform:uppercase;">Program Kelas:</div>
                <div style="font-size:7.5px;font-weight:700;color:#334155;">
                  ${card.target_class_program_name || card.class_program_name || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STATUS MUKIM -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 8px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:6.8px;font-weight:700;color:#64748b;text-transform:uppercase;">STATUS MUKIM:</span>
          <span style="font-size:7.5px;font-weight:800;padding:2px 8px;border-radius:9999px;${!isMukim ? 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;' : 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;'}">
            ${boardingLabel}
          </span>
        </div>
      </div>

      <!-- BAGIAN BAWAH: QR CODE & KETERANGAN SINGKAT -->
      <div style="flex-shrink:0;background:linear-gradient(to bottom,#f8fafc,#f1f5f9);border-top:1.2px solid #e2e8f0;padding:6px 8px;text-align:center;">
        <div style="background:#fff;border:1.5px solid #cbd5e1;border-radius:6px;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,0.06);display:inline-block;">
          <img src="${card.qr_data_uri}" alt="QR Code" style="width:2.2cm;height:2.2cm;display:block;border-radius:3px;">
        </div>
        <div style="margin-top:3px;font-size:7px;font-weight:700;color:#334155;">
          Scan QR Code untuk verifikasi data peserta
        </div>
        <div style="margin-top:1px;font-size:6px;font-weight:800;color:#0284c7;letter-spacing:0.04em;text-transform:uppercase;">
          TERVERIFIKASI RESMI
        </div>
      </div>

    </div>
  `;
}

function openBulkPrintWindow(cards) {
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) { alert('Popup diblokir browser. Izinkan popup dan coba lagi.'); return; }

  const cardsHTML = cards.map(buildCardHTML).join('');

  printWin.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Cetak Kartu Peserta — ${cards.length} Kartu</title>
<style>
  @page {
    size: 10cm 14cm portrait;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #fff;
    font-family: 'Segoe UI', Arial, sans-serif;
    text-transform: uppercase !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cards-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
  }
  .print-card {
    width: 10cm;
    height: 14cm;
    max-width: 10cm;
    max-height: 14cm;
    background: #ffffff;
    border: 1.5px solid #0f172a;
    border-radius: 10px;
    overflow: hidden;
    page-break-after: always;
    page-break-inside: avoid;
    break-after: page;
    display: flex;
    flex-direction: column;
    position: relative;
    box-sizing: border-box;
    text-transform: uppercase !important;
  }
  .card-banner {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
    color: #fff;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #f59e0b;
    flex-shrink: 0;
  }
  @media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
    .print-card {
      page-break-after: always;
      break-after: page;
      border: none !important;
      border-radius: 0 !important;
      width: 10cm !important;
      height: 14cm !important;
      max-height: 14cm !important;
    }
  }
</style>
</head>
<body>
  <div class="no-print" style="background:#1e1b4b;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;text-transform:none;">
    <div>
      <strong style="font-size:1rem;">🖨️ Cetak Kartu Peserta Massal</strong>
      <span style="margin-left:12px;font-size:0.85rem;opacity:0.8;">${cards.length} KARTU SIAP DICETAK · UKURAN: 10CM × 14CM</span>
    </div>
    <button onclick="window.print()" style="background:#f59e0b;color:#1e1b4b;border:none;padding:10px 24px;border-radius:8px;font-size:0.95rem;font-weight:800;cursor:pointer;">
      🖨️ PRINT / SIMPAN PDF
    </button>
  </div>
  <div class="cards-wrapper">
    ${cardsHTML}
  </div>
  <script>
    window.onload = function() {
      setTimeout(() => window.print(), 800);
    };
  <\/script>
</body>
</html>`);
  printWin.document.close();
}

window.renderCetakKartuView = renderCetakKartuView;
window.cetakToggleOne = cetakToggleOne;
window.cetakToggleAll = cetakToggleAll;
window.cetakSelectAll = cetakSelectAll;
window.cetakClearAll = cetakClearAll;
window.cetakOnSearch = cetakOnSearch;
window.cetakOnFilterBranch = cetakOnFilterBranch;
window.cetakKartuPDF = cetakKartuPDF;
window.cetakRowClick = cetakRowClick;
window.printSingleCardPopup = printSingleCardPopup;
window.switchCameraMode = switchCameraMode;
window.switchCheckInStage = switchCheckInStage;


// ============================================================================
// MISSING FUNCTION IMPLEMENTATIONS (required for window assignments)
// ============================================================================

// Toggle status aktif/nonaktif kategori (Sekolah)
async function toggleCatStatus(catId) {
  try {
    const res = await apiRequest(`/api/competitions/categories/${catId}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message || 'Status sekolah berhasil diperbarui.', 'success');
      state.competitionTree = [];
      renderAdminCategoriesView();
    }
  } catch (err) {
    showToast(err.message || 'Gagal mengubah status sekolah.', 'danger');
  }
}

// Toggle field tim di form cabang (tidak digunakan di PSB2, stub aman)
function toggleBranchTeamFields() {
  // No-op: field tim tidak digunakan di PSB2
}

// Handler preset jenjang di modal (tidak digunakan di PSB2, stub aman)
function onJenjangPresetChange() {
  // No-op: preset jenjang tidak digunakan di PSB2
}

// Tambah baris anggota tim di wizard pendaftaran (tidak digunakan di PSB2, stub aman)
function addWizTeamMemberRow() {
  // No-op: wizard anggota tim tidak digunakan di PSB2
}

// Peserta wizard handlers
window.onWizardCatSelect = onWizardCatSelect;
window.onWizardLvlSelect = onWizardLvlSelect;
window.onWizardBranchSelect = onWizardBranchSelect;
window.addWizTeamMemberRow = addWizTeamMemberRow;
window.previewProofImage = previewProofImage;
window.handleFullRegistrationSubmit = handleFullRegistrationSubmit;
window.handleReuploadSubmit = handleReuploadSubmit;

// Bendahara payment verification & check-in handlers
window.openPaymentVerifyModal = openPaymentVerifyModal;
window.executeApprovePayment = executeApprovePayment;
window.promptRejectPayment = promptRejectPayment;
window.executeRejectPayment = executeRejectPayment;
window.executeCheckIn = executeCheckIn;
window.handleManualCheckInSubmit = handleManualCheckInSubmit;
window.loadLiveCheckInLogs = loadLiveCheckInLogs;

// Super Admin user management handlers
window.openCreateUserModal = openCreateUserModal;
window.submitCreateUser = submitCreateUser;
window.executeToggleUserStatus = executeToggleUserStatus;
window.openChangeRoleModal = openChangeRoleModal;
window.submitChangeRole = submitChangeRole;
window.openResetPasswordModal = openResetPasswordModal;
window.submitAdminResetPass = submitAdminResetPass;
window.toggleUserDropdown = toggleUserDropdown;
window.closeAllUserDropdowns = closeAllUserDropdowns;
window.toggleUserSelect = toggleUserSelect;
window.toggleSelectAllUsers = toggleSelectAllUsers;
window.clearSelectedUsers = clearSelectedUsers;
window.confirmDeleteUser = confirmDeleteUser;
window.executeDeleteUser = executeDeleteUser;
window.executeBulkDeleteUsers = executeBulkDeleteUsers;
window.submitBulkDeleteUsers = submitBulkDeleteUsers;

// Super Admin master kategori & jenjang handlers
window.openCreateCategoryModal = openCreateCategoryModal;
window.submitCreateCategory = submitCreateCategory;
window.openEditCategoryModal = openEditCategoryModal;
window.submitEditCategory = submitEditCategory;
window.executeDeleteCategory = executeDeleteCategory;
window.openCreateLevelModal = openCreateLevelModal;
window.onJenjangPresetChange = onJenjangPresetChange;
window.submitCreateLevel = submitCreateLevel;
window.openEditLevelModal = openEditLevelModal;
window.submitEditLevel = submitEditLevel;
window.executeDeleteLevel = executeDeleteLevel;
window.toggleCatStatus = toggleCatStatus;

// Super Admin master cabang lomba handlers
window.openCreateBranchModal = openCreateBranchModal;
window.submitCreateBranch = submitCreateBranch;
window.openEditBranchModal = openEditBranchModal;
window.submitEditBranch = submitEditBranch;
window.executeDeleteBranch = executeDeleteBranch;
window.toggleBranchStatus = toggleBranchStatus;
window.toggleBranchTeamFields = toggleBranchTeamFields;

// Super Admin payment account handlers
window.openCreateAccountModal = openCreateAccountModal;
window.openCreatePaymentModal = openCreateAccountModal; // Alias for compatibility
window.submitCreateAccount = submitCreateAccount;
window.openEditAccountModal = openEditAccountModal;
window.submitEditAccount = submitEditAccount;
window.executeDeleteAccount = executeDeleteAccount;
window.toggleAccountStatus = toggleAccountStatus;

// Super Admin settings & security handlers
window.handleBrandingSave = handleBrandingSave;
window.previewBrandingFile = previewBrandingFile;
window.renderAdminCountdownView = renderAdminCountdownView;
window.handleCountdownSave = handleCountdownSave;
window.initHomepageCountdown = initHomepageCountdown;
window.handleOperationalResetSubmit = handleOperationalResetSubmit;
window.handlePasswordChangeSubmit = handlePasswordChangeSubmit;

// Super Admin Excel / CSV Export Handlers
window.exportTableDataToExcel = exportTableDataToExcel;
window.exportAdminRegistrationsExcel = exportAdminRegistrationsExcel;
window.exportAdminUsersExcel = exportAdminUsersExcel;
window.exportAdminBranchesExcel = exportAdminBranchesExcel;
window.exportAdminAuditExcel = exportAdminAuditExcel;
window.exportAdminBranchStatsExcel = exportAdminBranchStatsExcel;
window.exportAdminSchoolStatsExcel = exportAdminSchoolStatsExcel;
window.exportAdminPaymentAccountsExcel = exportAdminPaymentAccountsExcel;
window.exportBendaharaPaymentsExcel = exportBendaharaPaymentsExcel;
window.exportCheckInLogsExcel = exportCheckInLogsExcel;
window.loadLiveCheckInLogs = loadLiveCheckInLogs;

// UI & Responsive Drawer Navigation Handlers
window.togglePublicMenu = togglePublicMenu;
window.closePublicMenu = closePublicMenu;
window.toggleSidebarDrawer = toggleSidebarDrawer;
window.closeSidebarDrawer = closeSidebarDrawer;

// Global Delegated Click Handlers (Auto-close on backdrop / nav click)
document.addEventListener('click', function (e) {
  if (e.target.closest('.sidebar-backdrop') || e.target.closest('.sidebar-close-btn')) {
    closeSidebarDrawer();
  } else if (e.target.closest('.sidebar-nav-item')) {
    closeSidebarDrawer();
  } else if (e.target.closest('.public-navbar .nav-link') || e.target.closest('.public-navbar #auth-buttons-nav .btn')) {
    closePublicMenu();
  }
});

