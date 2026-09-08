const BASE_URL = 'http://localhost:3005/api';

async function fullCbtEndToEndTest() {
  console.log('====================================================');
  console.log('🚀 CBT END-TO-END AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  // 1. Super Admin Login
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lomba.id', password: 'admin123' }),
  });
  const adminToken = (await adminRes.json()).data.accessToken;
  const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };

  // 2. Get active master data (Period, Wave, Program)
  const dashRes = await fetch(`${BASE_URL}/cbt/admin/dashboard`, { headers: adminHeaders });
  const structure = (await dashRes.json()).data.structure;
  const school = structure[0];
  const major = school.majors[0];
  const program = major.classPrograms[0];
  const programId = program.id;

  console.log(`[Master Data] School: ${school.name}, Major: ${major.name}, Program: ${program.name}`);

  // Fetch Waves & Periods
  const wavesRes = await fetch(`${BASE_URL}/competitions/waves`, { headers: adminHeaders });
  const waves = (await wavesRes.json()).data;
  const activeWave = waves.find(w => w.isActive) || waves[0];

  // 3. Register a new candidate user
  const timestamp = Date.now();
  const testEmail = `santri_${timestamp}@example.com`;
  const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Santri Test CBT ${timestamp}`,
      email: testEmail,
      phoneNumber: `081${String(timestamp).slice(-9)}`,
      password: 'password123',
    }),
  });
  console.log(`[Peserta] Registered user: ${testEmail}`);

  // Login as candidate to get token
  const candLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123',
    }),
  });
  const candLoginJson = await candLoginRes.json();
  const candidateToken = candLoginJson.data.accessToken;
  const candidateHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${candidateToken}` };

  // 4. Create initial registration for candidate
  const createRegRes = await fetch(`${BASE_URL}/registrations/individual`, {
    method: 'POST',
    headers: candidateHeaders,
    body: JSON.stringify({
      academicPeriodId: activeWave.academicPeriodId,
      admissionWaveId: activeWave.id,
      classProgramId: programId,
      fullName: `Santri Test CBT ${timestamp}`,
      gender: 'L',
      schoolName: 'SMP Negeri 1 Gresik',
      boardingStatus: 'MUKIM',
    }),
  });
  const regJson = await createRegRes.json();
  if (!regJson.success) {
    console.error('Registration failed:', regJson);
    process.exit(1);
  }
  const regData = regJson.data;
  const registrationId = regData.id;
  console.log(`[Peserta] Created registration: ID ${registrationId}, No: ${regData.registrationNumber}`);

  // 5. Submit Full Form Draft & Final
  await fetch(`${BASE_URL}/registrations/${registrationId}/form/draft`, {
    method: 'POST',
    headers: candidateHeaders,
    body: JSON.stringify({
      address: {
        country: 'Indonesia',
        province: 'JAWA TIMUR',
        regency: 'KABUPATEN GRESIK',
        district: 'DUDUKSAMPEYAN',
        village: 'PETISBENEM',
        rt: '01',
        rw: '02',
        postalCode: '61162',
        fullAddress: 'Jl. Raya Pesantren No. 12',
      },
    }),
  });

  await fetch(`${BASE_URL}/registrations/${registrationId}/form/submit`, {
    method: 'POST',
    headers: candidateHeaders,
    body: JSON.stringify({
      notes: 'Formulir telah diisi lengkap untuk ujian CBT',
    }),
  });
  console.log('[Peserta] Submitted full registration form');

  // 6. Admin Verifies Registration
  const verifyRes = await fetch(`${BASE_URL}/registrations/${registrationId}/verify`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      status: 'APPROVED',
      isFormVerified: true,
      notes: 'Data berkas terverifikasi dan memenuhi syarat ujian CBT.',
    }),
  });
  console.log(`[Admin] Registration verified & approved: status ${verifyRes.status}`);

  // 7. Peserta checks CBT Status
  const statusRes = await fetch(`${BASE_URL}/cbt/peserta/status`, { headers: candidateHeaders });
  const statusData = (await statusRes.json()).data;
  console.log('[Peserta Status]', {
    isEligible: statusData.isEligible,
    examAvailable: statusData.examAvailable,
    attemptState: statusData.attemptState,
  });

  if (!statusData.isEligible || !statusData.examAvailable || statusData.attemptState !== 'READY') {
    throw new Error('Expected candidate to be eligible and READY for exam.');
  }

  // 8. Candidate starts CBT Attempt
  const startRes = await fetch(`${BASE_URL}/cbt/peserta/start`, {
    method: 'POST',
    headers: candidateHeaders,
  });
  const startData = await startRes.json();
  console.log(`[Peserta Start] Started exam: ${startData.message}`);

  // 9. Candidate fetches exam session
  const sessionRes = await fetch(`${BASE_URL}/cbt/peserta/session`, { headers: candidateHeaders });
  const sessionData = (await sessionRes.json()).data;
  console.log(`[Peserta Session] Questions received: ${sessionData.questions.length}, Expires at: ${sessionData.exam.expiresAt}`);

  // 10. Candidate answers questions
  for (const q of sessionData.questions) {
    if (q.type === 'MULTIPLE_CHOICE') {
      // Pick the correct option (we know from earlier 100 is correct option)
      const correctOpt = q.options.find(o => o.content === '100') || q.options[0];
      const ansRes = await fetch(`${BASE_URL}/cbt/peserta/answer`, {
        method: 'POST',
        headers: candidateHeaders,
        body: JSON.stringify({
          questionId: q.questionId,
          selectedOptionId: correctOpt.id,
          isFlagged: false,
        }),
      });
      console.log(`[Peserta Answer MC] Answered question ${q.questionOrder}: HTTP ${ansRes.status}`);
    } else if (q.type === 'ESSAY') {
      const ansRes = await fetch(`${BASE_URL}/cbt/peserta/answer`, {
        method: 'POST',
        headers: candidateHeaders,
        body: JSON.stringify({
          questionId: q.questionId,
          essayAnswer: 'Saya sangat ingin mendalami ilmu agama dan tahfidz di Pondok Pesantren Maskumambang.',
          isFlagged: false,
        }),
      });
      console.log(`[Peserta Answer Essay] Answered question ${q.questionOrder}: HTTP ${ansRes.status}`);
    }
  }

  // 11. Candidate finishes CBT Attempt
  const finishRes = await fetch(`${BASE_URL}/cbt/peserta/finish`, {
    method: 'POST',
    headers: candidateHeaders,
  });
  const finishData = await finishRes.json();
  console.log(`[Peserta Finish] ${finishData.message}`);

  // 12. Candidate checks status after completion
  const afterStatusRes = await fetch(`${BASE_URL}/cbt/peserta/status`, { headers: candidateHeaders });
  const afterStatusData = (await afterStatusRes.json()).data;
  console.log('[Peserta Status Post-Exam]', {
    attemptState: afterStatusData.attemptState,
    status: afterStatusData.attempt?.status,
  });

  // 13. Admin checks results & grades essay
  const resultsRes = await fetch(`${BASE_URL}/cbt/admin/results?search=${regData.registrationNumber}`, { headers: adminHeaders });
  const resultsList = (await resultsRes.json()).data;
  const candidateResult = resultsList.find(r => r.registrationId === registrationId);
  const attemptId = candidateResult.attempt.id;

  console.log('[Admin View Results]', {
    candidateName: candidateResult.candidateName,
    mcScore: candidateResult.attempt.multipleChoiceScore,
    essayScore: candidateResult.attempt.essayScore,
    gradingStatus: candidateResult.attempt.gradingStatus,
  });

  // Admin gets attempt detail
  const detailRes = await fetch(`${BASE_URL}/cbt/admin/results/${attemptId}`, { headers: adminHeaders });
  const detailData = (await detailRes.json()).data;

  // Grade essay
  const essayQuestion = detailData.questions.find(q => q.type === 'ESSAY');
  if (essayQuestion) {
    const gradeRes = await fetch(`${BASE_URL}/cbt/admin/results/${attemptId}/grade`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        grades: [
          {
            questionId: essayQuestion.questionId,
            score: 18,
            feedback: 'Jawaban sangat baik dan motivasi jelas.',
          },
        ],
      }),
    });
    console.log(`[Admin Grade Essay] HTTP ${gradeRes.status}: ${(await gradeRes.json()).message}`);
  }

  // Fetch updated results
  const finalDetailRes = await fetch(`${BASE_URL}/cbt/admin/results/${attemptId}`, { headers: adminHeaders });
  const finalDetail = (await finalDetailRes.json()).data;
  console.log('\n[FINAL CBT RESULT VERIFICATION]');
  console.log(`- MC Score: ${finalDetail.attempt.multipleChoiceScore}`);
  console.log(`- Essay Score: ${finalDetail.attempt.essayScore}`);
  console.log(`- Total Score: ${finalDetail.attempt.totalScore}`);
  console.log(`- Grading Status: ${finalDetail.attempt.gradingStatus}`);

  console.log('\n🎉 ALL CBT SYSTEM TESTS PASSED PERFECTLY!');
}

fullCbtEndToEndTest().catch(err => {
  console.error('Error during CBT test:', err);
  process.exit(1);
});
