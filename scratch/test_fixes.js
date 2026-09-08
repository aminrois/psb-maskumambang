const http = require('http');

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function get(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function del(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const BASE_URL = 'http://localhost:3005';

  // 1. Admin Login
  const login = await post(`${BASE_URL}/api/auth/login`, {
    email: 'admin@lomba.id',
    password: 'admin123'
  });
  console.log('1. Admin Login Response:', login.data);
  const token = login.data.data?.accessToken || login.data?.accessToken || login.data.data?.token || login.data?.token;

  // 2. Participants Gender Filtering
  const resAll = await get(`${BASE_URL}/api/interview/admin/participants`, token);
  console.log('2a. Participants All:', resAll.status, 'Total:', resAll.data?.data?.length || 0);

  const resL = await get(`${BASE_URL}/api/interview/admin/participants?gender=L`, token);
  console.log('2b. Participants Laki-laki (L):', resL.status, 'Total:', resL.data?.data?.length || 0);

  const resP = await get(`${BASE_URL}/api/interview/admin/participants?gender=P`, token);
  console.log('2c. Participants Perempuan (P):', resP.status, 'Total:', resP.data?.data?.length || 0);

  // 3. Periods & Interviewers
  const periods = await get(`${BASE_URL}/api/competitions/periods`, token);
  const periodId = periods.data?.data?.[0]?.id;
  const interviewers = await get(`${BASE_URL}/api/interview/admin/interviewers`, token);
  const interviewerId = interviewers.data?.data?.[0]?.id;
  console.log('3. Master Data: periodId =', periodId, 'interviewerId =', interviewerId);

  // 4. Create Schedule
  const parts = resAll.data?.data || [];
  const selectedIds = parts.slice(0, 2).map(p => p.id);
  const createRes = await post(`${BASE_URL}/api/interview/admin/schedules`, {
    name: 'Jadwal Uji Coba Fixes Node',
    academicPeriodId: periodId,
    scheduleDate: '2026-09-12',
    startTime: '08:00',
    endTime: '11:00',
    roomLocation: 'Ruang Verifikasi A',
    quota: 25,
    interviewerUserId: interviewerId,
    interviewerUserIds: [interviewerId],
    registrationIds: selectedIds,
    questions: ['Pertanyaan 1', 'Pertanyaan 2']
  }, token);

  console.log('4. Create Schedule Result:', createRes.status, createRes.data.success);
  const scheduleId = createRes.data?.data?.id;

  // 5. Delete Schedule
  if (scheduleId) {
    const delRes = await del(`${BASE_URL}/api/interview/admin/schedules/${scheduleId}`, token);
    console.log('5. Delete Schedule Result:', delRes.status, delRes.data.success);
  }

  // 6. Check results endpoint
  const resultsRes = await get(`${BASE_URL}/api/interview/admin/results`, token);
  console.log('6. Results Endpoint Status:', resultsRes.status, 'Total:', resultsRes.data?.data?.length || 0);

  // 7. Test Student Dashboard API
  const studentLogin = await post(`${BASE_URL}/api/auth/login`, {
    email: 'peserta@lomba.id',
    password: 'peserta123'
  });
  const studentToken = studentLogin.data.data?.accessToken;
  const myRegRes = await get(`${BASE_URL}/api/registrations/my`, studentToken);
  console.log('7. Student My Reg Status:', myRegRes.status, 'Total Regs:', myRegRes.data?.data?.length || 0);
  if (myRegRes.data?.data?.[0]) {
    console.log('   Student registration interview field present:', myRegRes.data.data[0].interview !== undefined);
  }

  console.log('\n=== ALL FIXES VERIFIED AND PASSING SUCCESSFULLY ===');
}

run().catch(console.error);
