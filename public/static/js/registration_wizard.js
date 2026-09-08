// Dynamic Registration Wizard Engine & Comprehensive Validation

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration_form');
  const categorySelect = document.getElementById('category_select');
  const levelSelect = document.getElementById('level_select');
  const branchSelect = document.getElementById('branch_select');
  
  const branchInfoCard = document.getElementById('branch_info_card');
  const branchFeeDisplay = document.getElementById('branch_fee_display');
  const branchTypeDisplay = document.getElementById('branch_type_display');
  const branchQuotasDisplay = document.getElementById('branch_quotas_display');

  const individualFormSection = document.getElementById('individual_form_section');
  const teamFormSection = document.getElementById('team_form_section');
  const teamMembersContainer = document.getElementById('team_members_container');
  const addMemberBtn = document.getElementById('add_member_btn');
  const memberCountBadge = document.getElementById('member_count_badge');
  const teamQuotaWarning = document.getElementById('team_quota_warning');
  const teamLeaderInput = document.getElementById('team_leader_name');
  const leaderNameDisplay = document.getElementById('leader_name_display');

  let currentBranchData = null;

  // Initialize: Disable all inputs in both sections until a branch is selected
  disableAllInputs(individualFormSection);
  disableAllInputs(teamFormSection);

  // Sync Ketua input with Ketua indicator row
  if (teamLeaderInput && leaderNameDisplay) {
    teamLeaderInput.addEventListener('input', () => {
      const val = teamLeaderInput.value.trim();
      leaderNameDisplay.textContent = val ? `Nama: ${val}` : '(Diisi pada kolom Nama Ketua di atas)';
    });
  }

  // 1. Category Change -> Populate Levels
  if (categorySelect) {
    categorySelect.addEventListener('change', async () => {
      const catId = categorySelect.value;
      levelSelect.innerHTML = '<option value="">-- Pilih Jenjang --</option>';
      branchSelect.innerHTML = '<option value="">-- Pilih Cabang Lomba --</option>';
      levelSelect.disabled = true;
      branchSelect.disabled = true;
      resetFormSections();

      if (!catId) return;

      try {
        const res = await fetch(`/api/categories/${catId}/levels`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          json.data.forEach(lvl => {
            const opt = document.createElement('option');
            opt.value = lvl.id;
            opt.textContent = lvl.name;
            levelSelect.appendChild(opt);
          });
          levelSelect.disabled = false;
        }
      } catch (err) {
        console.error("Gagal mengambil data jenjang:", err);
      }
    });
  }

  // 2. Level Change -> Populate Branches
  if (levelSelect) {
    levelSelect.addEventListener('change', async () => {
      const lvlId = levelSelect.value;
      branchSelect.innerHTML = '<option value="">-- Pilih Cabang Lomba --</option>';
      branchSelect.disabled = true;
      resetFormSections();

      if (!lvlId) return;

      try {
        const res = await fetch(`/api/levels/${lvlId}/branches`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          json.data.forEach(br => {
            const opt = document.createElement('option');
            opt.value = br.id;
            const typeLabel = br.participant_type === 'INDIVIDUAL' ? 'Perorangan' : 'Tim';
            opt.textContent = `${br.name} (${typeLabel}) - Rp ${Number(br.registration_fee).toLocaleString('id-ID')}`;
            branchSelect.appendChild(opt);
          });
          branchSelect.disabled = false;
        }
      } catch (err) {
        console.error("Gagal mengambil data cabang:", err);
      }
    });
  }

  // 3. Branch Change -> Configure Form Type (INDIVIDUAL vs TEAM)
  if (branchSelect) {
    branchSelect.addEventListener('change', async () => {
      const branchId = branchSelect.value;
      resetFormSections();

      if (!branchId) return;

      try {
        const res = await fetch(`/api/branches/${branchId}`);
        const json = await res.json();
        if (json.success && json.data) {
          currentBranchData = json.data;
          renderBranchDetails(json.data);
        }
      } catch (err) {
        console.error("Gagal mengambil detail cabang:", err);
      }
    });
  }

  function renderBranchDetails(branch) {
    if (branchInfoCard) branchInfoCard.style.display = 'block';
    if (branchFeeDisplay) branchFeeDisplay.textContent = 'Rp ' + Number(branch.registration_fee).toLocaleString('id-ID');
    
    if (branch.participant_type === 'INDIVIDUAL') {
      if (branchTypeDisplay) {
        branchTypeDisplay.textContent = 'PERORANGAN / INDIVIDU';
        branchTypeDisplay.className = 'badge badge-info';
      }
      if (branchQuotasDisplay) branchQuotasDisplay.style.display = 'none';

      individualFormSection.style.display = 'block';
      teamFormSection.style.display = 'none';
      
      enableAllInputs(individualFormSection);
      disableAllInputs(teamFormSection);

    } else {
      if (branchTypeDisplay) {
        branchTypeDisplay.textContent = 'TIM / BEREGU';
        branchTypeDisplay.className = 'badge badge-success';
      }
      const minM = branch.min_team_members || 2;
      const maxM = branch.max_team_members || 10;
      if (branchQuotasDisplay) {
        branchQuotasDisplay.style.display = 'block';
        branchQuotasDisplay.textContent = `Ketentuan Anggota Tim: Min ${minM} s/d Max ${maxM} orang (termasuk Ketua).`;
      }

      individualFormSection.style.display = 'none';
      teamFormSection.style.display = 'block';

      disableAllInputs(individualFormSection);
      enableAllInputs(teamFormSection);

      // Prepopulate member rows up to min_team_members
      teamMembersContainer.innerHTML = '';
      const initialExtraMembers = Math.max(1, minM - 1);
      for (let i = 0; i < initialExtraMembers; i++) {
        addTeamMemberRow();
      }
      updateTeamMembersCount();
    }
  }

  function resetFormSections() {
    currentBranchData = null;
    if (branchInfoCard) branchInfoCard.style.display = 'none';
    if (individualFormSection) {
      individualFormSection.style.display = 'none';
      disableAllInputs(individualFormSection);
    }
    if (teamFormSection) {
      teamFormSection.style.display = 'none';
      disableAllInputs(teamFormSection);
    }
  }

  function disableAllInputs(container) {
    if (!container) return;
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      el.disabled = true;
      el.removeAttribute('required');
    });
  }

  function enableAllInputs(container) {
    if (!container) return;
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      el.disabled = false;
      if (el.dataset.optional !== 'true' && !el.name.startsWith('member_grade') && !el.name.startsWith('member_role')) {
        el.setAttribute('required', 'required');
      }
    });
  }

  // 4. Dynamic Team Member Rows
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentBranchData) return;
      const extraMembers = teamMembersContainer.children.length;
      const totalTeamSize = extraMembers + 1; // Ketua + anggota
      const maxM = currentBranchData.max_team_members || 12;

      if (totalTeamSize >= maxM) {
        alert(`Jumlah anggota sudah mencapai batas maksimum (${maxM} orang termasuk ketua).`);
        return;
      }

      addTeamMemberRow();
      updateTeamMembersCount();
    });
  }

  function addTeamMemberRow() {
    const memberIndex = teamMembersContainer.children.length + 1;
    const actualMemberNumber = memberIndex + 1; // #1 is Leader
    const memberCard = document.createElement('div');
    memberCard.className = 'member-card-item';
    memberCard.innerHTML = `
      <div class="member-card-header">
        <span>Anggota #${memberIndex} (Peserta ${actualMemberNumber})</span>
        <button type="button" class="btn btn-sm btn-danger remove-member-btn" title="Hapus Anggota">
          &times; Hapus
        </button>
      </div>
      <div class="grid-2">
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label" style="font-size: 0.8rem;">Nama Lengkap Anggota *</label>
          <input type="text" name="member_name[]" class="form-control" placeholder="Nama anggota tim" required>
        </div>
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label class="form-label" style="font-size: 0.8rem;">Jenis Kelamin</label>
          <select name="member_gender[]" class="form-select">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.8rem;">Kelas / Tingkat</label>
          <input type="text" name="member_grade[]" class="form-control" placeholder="Contoh: 5 SD / 8 SMP / 11 SMA">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.8rem;">Posisi / Peran dalam Tim</label>
          <input type="text" name="member_role[]" class="form-control" placeholder="Contoh: Kiper, Programmer, Runner" value="Anggota">
        </div>
      </div>
    `;

    // Remove listener
    memberCard.querySelector('.remove-member-btn').addEventListener('click', () => {
      memberCard.remove();
      renumberMembers();
      updateTeamMembersCount();
    });

    teamMembersContainer.appendChild(memberCard);
  }

  function renumberMembers() {
    const cards = teamMembersContainer.querySelectorAll('.member-card-item');
    cards.forEach((c, idx) => {
      const actualNumber = idx + 2;
      c.querySelector('.member-card-header span').textContent = `Anggota #${idx + 1} (Peserta ${actualNumber})`;
    });
  }

  function updateTeamMembersCount() {
    if (!currentBranchData || currentBranchData.participant_type !== 'TEAM') return;

    const extraMembers = teamMembersContainer.children.length;
    const totalTeamSize = extraMembers + 1; // Ketua + anggota
    const minM = currentBranchData.min_team_members || 2;
    const maxM = currentBranchData.max_team_members || 12;

    if (memberCountBadge) {
      memberCountBadge.textContent = `Jumlah Anggota: ${totalTeamSize} / ${maxM}`;
      
      if (totalTeamSize < minM) {
        memberCountBadge.className = 'badge badge-warning';
        if (teamQuotaWarning) {
          teamQuotaWarning.textContent = `Minimal anggota: ${minM} orang (termasuk Ketua).`;
          teamQuotaWarning.style.color = 'var(--warning-700)';
        }
      } else if (totalTeamSize >= maxM) {
        memberCountBadge.className = 'badge badge-info';
        if (teamQuotaWarning) {
          teamQuotaWarning.textContent = `Jumlah anggota sudah mencapai batas maksimum.`;
          teamQuotaWarning.style.color = 'var(--primary-700)';
        }
      } else {
        memberCountBadge.className = 'badge badge-success';
        if (teamQuotaWarning) {
          teamQuotaWarning.textContent = '✓ Jumlah anggota tim telah memenuhi syarat.';
          teamQuotaWarning.style.color = 'var(--success-700)';
        }
      }
    }

    if (addMemberBtn) {
      if (totalTeamSize >= maxM) {
        addMemberBtn.disabled = true;
        addMemberBtn.textContent = 'Maksimal Anggota Tercapai';
      } else {
        addMemberBtn.disabled = false;
        addMemberBtn.textContent = '+ Tambah Anggota';
      }
    }
  }

  // 5. Client-Side Form Submit Validation
  if (form) {
    form.addEventListener('submit', (e) => {
      if (!currentBranchData) {
        e.preventDefault();
        alert('Harap pilih kategori, jenjang, dan cabang lomba terlebih dahulu.');
        return;
      }

      if (currentBranchData.participant_type === 'TEAM') {
        const extraMembers = teamMembersContainer.children.length;
        const totalTeamSize = extraMembers + 1;
        const minM = currentBranchData.min_team_members || 2;
        const maxM = currentBranchData.max_team_members || 12;

        if (totalTeamSize < minM) {
          e.preventDefault();
          alert(`Jumlah anggota tim kurang! Minimal ${minM} orang (termasuk Ketua) untuk cabang ${currentBranchData.name}.`);
          teamFormSection.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        if (totalTeamSize > maxM) {
          e.preventDefault();
          alert(`Jumlah anggota tim melebihi batas maksimum (${maxM} orang termasuk Ketua).`);
          teamFormSection.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        // Validate that each added member has a name
        const memberNameInputs = teamMembersContainer.querySelectorAll('input[name="member_name[]"]');
        for (let input of memberNameInputs) {
          if (!input.value.trim()) {
            e.preventDefault();
            alert('Harap lengkapi semua nama anggota tim yang ditambahkan.');
            input.focus();
            return;
          }
        }
      }
    });
  }
});

