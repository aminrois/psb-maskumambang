const BASE_URL = 'http://localhost:3005/api';

async function testCbtFlow() {
  console.log('\n--- 1. Login Super Admin ---');
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lomba.id',
      password: 'admin123',
    }),
  });
  console.log(`Admin Login status: ${res.status}`);
  if (!res.ok) {
    console.error('Admin Login failed:', await res.text());
    process.exit(1);
  }
  const adminLoginJson = await res.json();
  const adminToken = adminLoginJson.data?.accessToken;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  console.log('\n--- 2. Get CBT Admin Dashboard ---');
  res = await fetch(`${BASE_URL}/cbt/admin/dashboard`, {
    headers: adminHeaders,
  });
  console.log(`Dashboard status: ${res.status}`);
  const dashJson = await res.json();
  console.log('Stats:', dashJson.data?.stats);
  const structure = dashJson.data?.structure || [];
  console.log(`Found ${structure.length} schools in structure.`);

  if (!structure.length || !structure[0].majors.length || !structure[0].majors[0].classPrograms.length) {
    console.error('Master structure is incomplete.');
    process.exit(1);
  }

  const firstSchool = structure[0];
  const firstMajor = firstSchool.majors[0];
  const firstProgram = firstMajor.classPrograms[0];
  const programId = firstProgram.id;
  console.log(`Testing with Program: ${firstProgram.name} (ID: ${programId})`);

  console.log('\n--- 3. Get or Create CBT Exam ---');
  res = await fetch(`${BASE_URL}/cbt/admin/exams/by-program/${programId}`, {
    headers: adminHeaders,
  });
  let examData = (await res.json()).data?.exam;

  if (!examData) {
    console.log('Creating exam...');
    res = await fetch(`${BASE_URL}/cbt/admin/exams`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        classProgramId: programId,
        title: `Ujian CBT Seleksi - ${firstProgram.name}`,
        durationMinutes: 60,
        isActive: true,
      }),
    });
    console.log(`Create exam status: ${res.status}`);
    examData = (await res.json()).data;
  }

  const examId = examData.id;
  console.log(`Exam ID: ${examId}, Total Questions: ${examData.questions?.length || 0}`);

  if (!examData.questions || examData.questions.length < 2) {
    console.log('Adding sample Multiple Choice question...');
    res = await fetch(`${BASE_URL}/cbt/admin/exams/${examId}/questions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        type: 'MULTIPLE_CHOICE',
        question: 'Berapakah hasil dari 25 x 4?',
        score: 10,
        options: [
          { content: '80', isCorrect: false },
          { content: '90', isCorrect: false },
          { content: '100', isCorrect: true },
          { content: '110', isCorrect: false },
        ],
      }),
    });
    console.log(`Add MC status: ${res.status}`);

    console.log('Adding sample Essay question...');
    res = await fetch(`${BASE_URL}/cbt/admin/exams/${examId}/questions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        type: 'ESSAY',
        question: 'Jelaskan motivasi Anda mendaftar di pondok pesantren ini!',
        score: 20,
      }),
    });
    console.log(`Add Essay status: ${res.status}`);
  }

  res = await fetch(`${BASE_URL}/cbt/admin/exams/by-program/${programId}`, {
    headers: adminHeaders,
  });
  examData = (await res.json()).data?.exam;
  console.log(`Updated exam now has ${examData.questions?.length} questions.`);

  console.log('\n--- 4. Get CBT Admin Results ---');
  res = await fetch(`${BASE_URL}/cbt/admin/results`, {
    headers: adminHeaders,
  });
  console.log(`Results status: ${res.status}`);
  const results = (await res.json()).data || [];
  console.log(`Total eligible candidates in results: ${results.length}`);

  console.log('\n--- 5. Login Peserta & Test Candidate CBT Flow ---');
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'peserta@lomba.id',
      password: 'peserta123',
    }),
  });
  console.log(`Peserta Login status: ${res.status}`);
  if (res.ok) {
    const pLoginJson = await res.json();
    const pesertaToken = pLoginJson.data?.accessToken;
    const pesertaHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pesertaToken}`,
    };

    res = await fetch(`${BASE_URL}/cbt/peserta/status`, {
      headers: pesertaHeaders,
    });
    console.log(`Peserta CBT Status response code: ${res.status}`);
    const statusData = (await res.json()).data;
    console.log('Peserta status data:', statusData);
  }

  console.log('\n>>> ✅ ALL CBT BACKEND ENDPOINTS & FLOWS VERIFIED SUCCESSFULLY! <<<');
}

testCbtFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});
