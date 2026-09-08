// Check-In QR Scanner & Manual Validation Script

document.addEventListener('DOMContentLoaded', () => {
  const startCameraBtn = document.getElementById('start_camera_btn');
  const stopCameraBtn = document.getElementById('stop_camera_btn');
  const qrReaderDiv = document.getElementById('reader');
  const manualForm = document.getElementById('manual_checkin_form');
  const manualInput = document.getElementById('manual_input');
  
  const resultModal = document.getElementById('checkin_result_modal');
  const resultTitle = document.getElementById('result_modal_title');
  const resultBadge = document.getElementById('result_modal_badge');
  const resultMessage = document.getElementById('result_modal_message');
  const resultDetails = document.getElementById('result_modal_details');

  let html5QrCode = null;
  let isScanning = false;

  // Audio effects using Web Audio API
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'duplicate') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  // Submit check-in to server API
  async function submitCheckin(tokenOrNumber, method) {
    try {
      const csrfToken = window.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/checkin/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          token: tokenOrNumber,
          method: method
        })
      });

      const data = await res.json();
      showResultModal(data);
    } catch (err) {
      showResultModal({
        success: false,
        message: 'Gagal terhubung ke server. Periksa koneksi Anda: ' + err.message
      });
    }
  }

  function showResultModal(response) {
    if (response.success) {
      playSound('success');
      resultTitle.textContent = 'CHECK-IN BERHASIL!';
      resultBadge.className = 'badge badge-success';
      resultBadge.textContent = 'STATUS: HADIR';
      resultMessage.textContent = response.message;
    } else if (response.already_checked_in) {
      playSound('duplicate');
      resultTitle.textContent = 'PERINGATAN: SUDAH CHECK-IN';
      resultBadge.className = 'badge badge-danger';
      resultBadge.textContent = 'DUPLIKAT CHECK-IN';
      resultMessage.textContent = response.message;
    } else {
      playSound('error');
      resultTitle.textContent = 'CHECK-IN GAGAL';
      resultBadge.className = 'badge badge-danger';
      resultBadge.textContent = 'TIDAK VALID';
      resultMessage.textContent = response.message;
    }

    if (response.data) {
      const reg = response.data;
      const isTeam = reg.participant_type === 'TEAM';
      const name = isTeam ? `${reg.team_name} (Ketua: ${reg.leader_name})` : reg.individual_name;
      const school = isTeam ? reg.team_school : reg.individual_school;

      resultDetails.innerHTML = `
        <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-lg); padding: 1rem; margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong style="color: var(--primary-700); font-family: monospace; font-size: 1.1rem;">${reg.registration_number}</strong>
            <span class="badge badge-info">${reg.category_name} - ${reg.level_name}</span>
          </div>
          <div style="margin-bottom: 0.25rem;"><strong>Cabang:</strong> ${reg.branch_name} (${isTeam ? 'Tim' : 'Perorangan'})</div>
          <div style="margin-bottom: 0.25rem;"><strong>Nama Peserta:</strong> ${name}</div>
          <div style="margin-bottom: 0.25rem;"><strong>Asal Sekolah:</strong> ${school}</div>
          ${reg.check_in_time ? `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--slate-300); font-size: 0.85rem; color: var(--slate-600);"><strong>Waktu Check-In:</strong> ${reg.check_in_time}</div>` : ''}
        </div>
      `;
    } else {
      resultDetails.innerHTML = '';
    }

    window.openModal('checkin_result_modal');
  }

  // Camera Scanner Handlers
  if (startCameraBtn && qrReaderDiv) {
    startCameraBtn.addEventListener('click', () => {
      if (typeof Html5Qrcode === 'undefined') {
        alert("Library scanner kamera belum termuat. Silakan periksa koneksi internet atau gunakan input manual nomor registrasi.");
        return;
      }

      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
      }

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        // Stop scanning briefly
        html5QrCode.stop().then(() => {
          isScanning = false;
          startCameraBtn.style.display = 'inline-flex';
          stopCameraBtn.style.display = 'none';
        }).catch(err => console.error(err));

        submitCheckin(decodedText, 'QR_SCAN');
      }).then(() => {
        isScanning = true;
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-flex';
      }).catch((err) => {
        alert("Tidak dapat mengakses kamera: " + err);
      });
    });

    if (stopCameraBtn) {
      stopCameraBtn.addEventListener('click', () => {
        if (html5QrCode && isScanning) {
          html5QrCode.stop().then(() => {
            isScanning = false;
            startCameraBtn.style.display = 'inline-flex';
            stopCameraBtn.style.display = 'none';
          }).catch(err => console.error(err));
        }
      });
    }
  }

  // Manual Check-In Form
  if (manualForm && manualInput) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = manualInput.value.trim();
      if (!code) return;
      submitCheckin(code, 'MANUAL_CODE');
      manualInput.value = '';
    });
  }
});
