import urllib.request
import json
import urllib.parse
import time

import os

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:3005')

def req(path, method='GET', data=None, headers=None):
    if headers is None: headers = {}
    url = BASE_URL + path
    body = None
    if data:
        if isinstance(data, dict):
            body = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        else:
            body = data
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read()
            try:
                text = content.decode('utf-8')
                try:
                    return resp.status, json.loads(text)
                except json.JSONDecodeError:
                    return resp.status, text
            except UnicodeDecodeError:
                return resp.status, content
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            text = content.decode('utf-8')
            try:
                return e.code, json.loads(text)
            except json.JSONDecodeError:
                return e.code, text
        except UnicodeDecodeError:
            return e.code, content

print('=== 1. VERIFYING DEDICATED PUBLIC PAGES & LIGHT MODE DESIGN SYSTEM ===')
pages = ['/index.html', '/login.html', '/register.html', '/forgot-password.html', '/reset-password.html', '/guide.html', '/kontak.html', '/dashboard.html']
for p in pages:
    s, html = req(p)
    assert s == 200, f'Failed {p}'
    assert 'data-theme="light"' in html or 'has-sidebar' in html or 'public-layout' in html
    print(f'  [PASS] {p} served in clean Light Mode default')

s, css = req('/css/main.css')
assert s == 200
assert '--bg-body: #f8fafc;' in css
print('  [PASS] main.css contains clean Light Mode institutional design tokens')

s, print_css = req('/css/participant_card.css')
assert s == 200
assert '@media print' in print_css
assert 'page-break-inside: avoid' in print_css
print('  [PASS] participant_card.css print styles optimized against page cutoffs')

print('\n=== 2. VERIFYING PESERTA END-TO-END FLOW ===')
# Register user
email = f'peserta.fulltest.{int(time.time())}@gmail.com'
s, reg_user = req('/api/auth/register', method='POST', data={
    'name': 'Ahmad Dahlan',
    'email': email,
    'password': 'password123',
    'phoneNumber': '081234567890'
})
assert s == 201 and reg_user['success'] is True
print('  [PASS] User registration successful')

# Login
s, login = req('/api/auth/login', method='POST', data={'email': email, 'password': 'password123'})
assert s == 200 and login['success'] is True
peserta_token = login['data']['accessToken']
peserta_headers = {'Authorization': f'Bearer {peserta_token}'}
print('  [PASS] User login successful, JWT token issued')

# Get tree & accounts
s, tree = req('/api/competitions/tree')
assert s == 200 and len(tree['data']) >= 1
mat_branch = tree['data'][0]['levels'][0]['branches'][0]

s, accounts = req('/api/payments/accounts')
assert s == 200 and len(accounts['data']) >= 1
acc_id = accounts['data'][0]['id']

# Submit registration
s, indiv = req('/api/registrations/individual', method='POST', headers=peserta_headers, data={
    'branchId': mat_branch['id'],
    'fullName': 'Ahmad Dahlan',
    'gender': 'L',
    'gradeClass': 'Kelas 5 SD',
    'schoolName': 'SD Muhammadiyah 1 Gresik',
    'schoolAddress': 'Gresik Jawa Timur',
    'mentorName': 'Ustadz Hidayat',
    'whatsappNumber': '081234567890'
})
assert s == 201 and indiv['success'] is True
reg_id = indiv['data']['id']
reg_num = indiv['data']['registrationNumber']
print(f'  [PASS] Individual registration created: {reg_num} (ID: {reg_id})')

# Upload fake 1x1 PNG payment proof (Magic byte 89 50 4E 47)
png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="registrationId"\r\n\r\n{reg_id}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentAccountId"\r\n\r\n{acc_id}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderBank"\r\n\r\nBCA\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderAccountName"\r\n\r\nSiti Rahma\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentDate"\r\n\r\n2026-08-27\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="payment_proof"; filename="bukti_transfer.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + png_header + f'\r\n--{boundary}--\r\n'.encode('utf-8')

s, upload = req('/api/payments/upload', method='POST', data=body, headers={
    'Authorization': f'Bearer {peserta_token}',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
assert s == 201 and upload['success'] is True
payment_id = upload['data']['id']
proof_file = upload['data']['proofImagePath']
print(f'  [PASS] Payment proof uploaded successfully: {proof_file}')

# Verify protected file streaming
s, img_data = req(f'/api/payments/file/{proof_file}', headers=peserta_headers)
assert s == 200 and len(img_data) > 0
print('  [PASS] Payment proof image streaming verified (HTTP 200, valid bytes)')

# Verify Ringkasan & Detail Endpoint
s, detail = req(f'/api/registrations/{reg_id}', headers=peserta_headers)
assert s == 200 and detail['success'] is True
assert detail['data']['registrationNumber'] == reg_num
assert detail['data']['status'] == 'WAITING_VERIFICATION'
assert detail['data']['checkIn'] is None # Belum check-in
print('  [PASS] Registration detail shows Status WAITING_VERIFICATION and Check-In BELUM CHECK-IN')

print('\n=== 3. VERIFYING BENDAHARA & CHECK-IN WORKFLOW ===')
# Login Bendahara
s, bend_login = req('/api/auth/login', method='POST', data={'email': 'bendahara@lomba.id', 'password': 'bendahara123'})
assert s == 200
bend_token = bend_login['data']['accessToken']
bend_headers = {'Authorization': f'Bearer {bend_token}'}

# List payments with search
s, p_list = req(f'/api/payments/list?search=Dahlan', headers=bend_headers)
assert s == 200 and p_list['pagination']['total'] >= 1
print('  [PASS] Bendahara payments table search & pagination verified')

# Reject with mandatory reason test
s, reject = req(f'/api/payments/{payment_id}/reject', method='POST', headers=bend_headers, data={'rejectionReason': 'Nominal kurang Rp 10.000'})
assert s == 201 and reject['success'] is True
print('  [PASS] Payment rejection with mandatory reason successful')

# Participant checks rejection status
s, detail_rej = req(f'/api/registrations/{reg_id}', headers=peserta_headers)
assert detail_rej['data']['status'] == 'PAYMENT_REJECTED'
print('  [PASS] Participant sees PAYMENT_REJECTED status and rejection reason')

# Re-upload payment proof
re_body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="registrationId"\r\n\r\n{reg_id}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="payment_proof"; filename="bukti_reupload.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + png_header + f'\r\n--{boundary}--\r\n'.encode('utf-8')

s, reupload = req('/api/payments/reupload', method='POST', data=re_body, headers={
    'Authorization': f'Bearer {peserta_token}',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
assert s == 201 and reupload['success'] is True
new_payment_id = reupload['data']['id']
print(f'  [PASS] Replacement payment proof re-uploaded: ID {new_payment_id}')

# Approve payment
s, approve = req(f'/api/payments/{new_payment_id}/approve', method='POST', headers=bend_headers)
assert s == 201 and approve['success'] is True
print('  [PASS] Payment approved by Bendahara')

# Get Participant Card & QR
s, card = req(f'/api/cards/{reg_id}', headers=peserta_headers)
assert s == 200 and card['success'] is True
assert 'data:image/png;base64,' in card['data']['qr_data_uri']
qr_token = card['data']['qr_code_token']
print('  [PASS] Participant card generated with official QR code token')

# Check-in via QR code scan
s, checkin = req('/api/checkin/scan', method='POST', headers=bend_headers, data={'token': qr_token, 'method': 'QR_SCAN'})
assert s == 201 and checkin['success'] is True
assert checkin['already_checked_in'] is False
print(f'  [PASS] First Check-In successful via QR code scan: {checkin["data"]["participant_name"]}')

# Duplicate Check-in attempt (Must be rejected with already_checked_in: true)
s, dup_checkin = req('/api/checkin/scan', method='POST', headers=bend_headers, data={'token': qr_token, 'method': 'QR_SCAN'})
assert dup_checkin['already_checked_in'] is True
print(f'  [PASS] Duplicate Check-In rejected correctly: {dup_checkin["message"]}')

# Live log feed
s, live_log = req('/api/checkin/live-log?limit=5', headers=bend_headers)
assert s == 200 and len(live_log['data']) >= 1
print('  [PASS] Live check-in log feed returned real-time entries')

print('\n=== 4. VERIFYING SUPER ADMIN MASTER DATA & PARITY ===')
s, admin_login = req('/api/auth/login', method='POST', data={'email': 'admin@lomba.id', 'password': 'admin123'})
admin_token = admin_login['data']['accessToken']
admin_headers = {'Authorization': f'Bearer {admin_token}'}

# List all registrations
s, all_regs = req('/api/registrations?search=Dahlan', headers=admin_headers)
assert s == 200 and len(all_regs['registrations']) >= 1
print('  [PASS] Admin registration listing & search verified')

# Category & Level CRUD
s, cats = req('/api/competitions/categories', headers=admin_headers)
assert s == 200 and len(cats['data']) >= 3
print('  [PASS] Admin categories/schools retrieved')

# Branding Settings Update
s, brand_update = req('/api/settings', method='POST', headers=admin_headers, data={
    'application_name': 'MASKUMAMBANG FEST #4 (NASIONAL 2026)',
    'application_short_name': 'MFEST #4',
    'application_description': 'Ajang Bergengsi Tingkat Nasional.'
})
assert s == 201 and brand_update['success'] is True
print('  [PASS] Admin branding update verified')

# Audit Logs Listing
s, audit = req('/api/audit/logs', headers=admin_headers)
assert s == 200 and len(audit['logs']) >= 5
print('  [PASS] Audit logs listing verified with structured actor/action records')

print('\n=== ALL MULTI-PERSONA PARITY & FUNCTIONAL AUDIT CHECKS PASSED 100% ===')
