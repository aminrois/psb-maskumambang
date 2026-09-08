// Main JS Utilities, Sidebar Drawer, Modals & Micro-interactions

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('app_sidebar');
  const appShell = document.getElementById('app_shell');
  const backdrop = document.getElementById('sidebar_backdrop');
  const publicNavMenu = document.getElementById('public_nav_menu');

  // Sidebar Toggle (Collapsible on Desktop, Off-canvas Drawer on Mobile)
  window.toggleSidebar = function() {
    if (!sidebar) return;
    const isMobile = window.innerWidth <= 992;

    if (isMobile) {
      // Toggle Mobile Drawer
      const isOpen = sidebar.classList.toggle('drawer-open');
      if (backdrop) {
        if (isOpen) {
          backdrop.classList.add('active');
          document.body.style.overflow = 'hidden';
        } else {
          backdrop.classList.remove('active');
          document.body.style.overflow = '';
        }
      }
    } else {
      // Toggle Desktop Collapsed mode
      sidebar.classList.toggle('collapsed');
      if (appShell) appShell.classList.toggle('sidebar-collapsed');
    }
  };

  // Close Mobile Drawer when link is clicked
  if (sidebar) {
    sidebar.querySelectorAll('.sidebar-nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          sidebar.classList.remove('drawer-open');
          if (backdrop) backdrop.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // Toggle Public Navbar on Mobile
  window.togglePublicMenu = function() {
    if (publicNavMenu) {
      publicNavMenu.classList.toggle('open');
    }
  };

  // Modal Helpers
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modalBackdrop => {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // ESC key closes modals or mobile drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => {
        m.classList.remove('open');
        document.body.style.overflow = '';
      });
      if (sidebar && sidebar.classList.contains('drawer-open')) {
        sidebar.classList.remove('drawer-open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });

  // Auto-dismiss alerts after 7 seconds
  setTimeout(() => {
    document.querySelectorAll('.alert').forEach(alert => {
      alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 500);
    });
  }, 7000);

  // Currency Formatter Helper
  window.formatRupiahJS = function(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };
});
