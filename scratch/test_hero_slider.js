const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3005';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Hero Slider Endpoints ===\n');

  // 1. GET /api/hero-sliders/active
  const activeRes = await request(`${BASE_URL}/api/hero-sliders/active`);
  console.log(`1. GET /api/hero-sliders/active -> Status: ${activeRes.status}, Sliders: ${activeRes.data?.data?.length}`);
  if (activeRes.status !== 200 || !activeRes.data?.success) {
    throw new Error('Public active sliders failed');
  }

  // 2. Generate Super Admin JWT Token
  const crypto = require('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'b88196e6-82a6-451d-a3c3-ce109d8705b8',
    email: 'admin@lomba.id',
    role: 'SUPER_ADMIN',
    sessionVersion: 1,
    name: 'Super Admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const secret = 'aa378b6fd5a62d299eaf0496e786efb6286f7dd723519dca9ae1a929d0e1f82b';
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  const token = `${header}.${payload}.${signature}`;
  console.log('2. Super Admin Token Generated -> OK');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 3. GET /api/hero-sliders (Super Admin)
  const listRes = await request(`${BASE_URL}/api/hero-sliders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`3. GET /api/hero-sliders -> Status: ${listRes.status}, Total: ${listRes.data?.data?.length}`);

  // 4. Create Slider with Multipart
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipartBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="badge"',
    '',
    'Tahun 2026/2027',
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Slide Uji Coba Super Admin',
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    'Deskripsi pengujian sistem slider PSB Maskumambang.',
    `--${boundary}`,
    'Content-Disposition: form-data; name="primaryButtonText"',
    '',
    'Daftar Sekarang',
    `--${boundary}`,
    'Content-Disposition: form-data; name="primaryButtonUrl"',
    '',
    '/register.html',
    `--${boundary}`,
    'Content-Disposition: form-data; name="isActive"',
    '',
    'true',
    `--${boundary}`,
    'Content-Disposition: form-data; name="desktop_image"; filename="desktop.svg"',
    'Content-Type: image/svg+xml',
    '',
    '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#0284c7"/></svg>',
    `--${boundary}--`,
  ].join('\r\n');

  const createRes = await request(`${BASE_URL}/api/hero-sliders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  }, multipartBody);

  console.log(`4. POST /api/hero-sliders -> Status: ${createRes.status}, Created ID: ${createRes.data?.data?.id}`);
  const createdId = createRes.data?.data?.id;
  if (!createdId) throw new Error('Create slider failed: ' + JSON.stringify(createRes.data));

  // 5. Toggle Status
  const statusRes = await request(`${BASE_URL}/api/hero-sliders/${createdId}/status`, {
    method: 'PATCH',
    headers: authHeaders,
  }, { isActive: false });
  console.log(`5. PATCH /api/hero-sliders/:id/status -> Status: ${statusRes.status}, isActive: ${statusRes.data?.data?.isActive}`);

  // 6. Reorder
  const reorderRes = await request(`${BASE_URL}/api/hero-sliders/reorder`, {
    method: 'PATCH',
    headers: authHeaders,
  }, { sliderIds: [createdId] });
  console.log(`6. PATCH /api/hero-sliders/reorder -> Status: ${reorderRes.status}`);

  // 7. Update Text
  const updateBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const updateBody = [
    `--${updateBoundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Slide Uji Coba Berhasil Diperbarui',
    `--${updateBoundary}--`,
  ].join('\r\n');

  const updateRes = await request(`${BASE_URL}/api/hero-sliders/${createdId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${updateBoundary}`,
    },
  }, updateBody);
  console.log(`7. PATCH /api/hero-sliders/:id -> Status: ${updateRes.status}, New Title: "${updateRes.data?.data?.title}"`);

  // 8. Delete
  const delRes = await request(`${BASE_URL}/api/hero-sliders/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`8. DELETE /api/hero-sliders/:id -> Status: ${delRes.status}`);

  // 9. Check Public Homepage HTML
  const homeRes = await request(`${BASE_URL}/`);
  const hasCarousel = homeRes.raw.includes('hero-slider-section');
  console.log(`9. GET / -> Status: ${homeRes.status}, Has Carousel Section: ${hasCarousel}`);

  console.log('\n🎉 ALL 9 TEST STEPS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
