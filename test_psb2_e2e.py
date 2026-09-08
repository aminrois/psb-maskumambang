import urllib.request
import json
import urllib.parse
import time
import os
import sys

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

print("=" * 60)
print("  E2E TEST SUITE - SISTEM PSB2 (PENERIMAAN SISWA BARU)")
print("=" * 60)

# 1. Login Super Admin, Bendahara, Peserta Baru
print("\n[TEST 1] Autentikasi Multi-Role (Admin, Bendahara, Calon Siswa)")
s, admin_login = req('/api/auth/login', method='POST', data={'email': 'admin@lomba.id', 'password': 'admin123'})
assert s == 200 and admin_login['success'] is True, f"Admin login failed: {admin_login}"
admin_token = admin_login['data']['accessToken']
admin_headers = {'Authorization': f'Bearer {admin_token}'}
print("  ✓ Super Admin login sukses")

s, bend_login = req('/api/auth/login', method='POST', data={'email': 'bendahara@lomba.id', 'password': 'bendahara123'})
assert s == 200 and bend_login['success'] is True, f"Bendahara login failed: {bend_login}"
bend_token = bend_login['data']['accessToken']
bend_headers = {'Authorization': f'Bearer {bend_token}'}
print("  ✓ Bendahara login sukses")

email_a = f'calonsiswa.a.{int(time.time())}@gmail.com'
s, reg_a = req('/api/auth/register', method='POST', data={
    'name': 'Muhammad Fatih',
    'email': email_a,
    'password': 'password123',
    'phoneNumber': '081299990001'
})
assert s == 201 and reg_a['success'] is True, f"Register A failed: {reg_a}"

s, login_a = req('/api/auth/login', method='POST', data={'email': email_a, 'password': 'password123'})
assert s == 200 and login_a['success'] is True
token_a = login_a['data']['accessToken']
headers_a = {'Authorization': f'Bearer {token_a}'}
print(f"  ✓ Calon Siswa A ({email_a}) registrasi & login sukses")

email_b = f'calonsiswa.b.{int(time.time())}@gmail.com'
s, reg_b = req('/api/auth/register', method='POST', data={
    'name': 'Aisyah Putri',
    'email': email_b,
    'password': 'password123',
    'phoneNumber': '081299990002'
})
assert s == 201 and reg_b['success'] is True
s, login_b = req('/api/auth/login', method='POST', data={'email': email_b, 'password': 'password123'})
assert s == 200 and login_b['success'] is True
token_b = login_b['data']['accessToken']
headers_b = {'Authorization': f'Bearer {token_b}'}
print(f"  ✓ Calon Siswa B ({email_b}) registrasi & login sukses")

# 2. Master Data PSB: Sekolah, Jurusan, Program Kelas
print("\n[TEST 2] Master Data PSB (Sekolah, Jurusan, Program Kelas)")
s, schools = req('/api/competitions/categories', headers=admin_headers)
assert s == 200 and len(schools['data']) >= 3, f"Schools list failed: {schools}"
print(f"  ✓ Ditemukan {len(schools['data'])} Sekolah (MA, SMA, MTs)")

s, majors = req('/api/competitions/levels', headers=admin_headers)
assert s == 200 and len(majors['data']) >= 6, f"Majors list failed: {majors}"
print(f"  ✓ Ditemukan {len(majors['data'])} Jurusan")

s, programs = req('/api/competitions/branches/all', headers=admin_headers)
assert s == 200 and len(programs['data']) >= 14, f"ClassPrograms list failed: {programs}"
print(f"  ✓ Ditemukan {len(programs['data'])} Program Kelas & Biaya Pendaftaran")

# 3. Cascading Tree Validation
print("\n[TEST 3] Validasi Hierarki Cascading Tree PSB (Sekolah -> Jurusan -> Program Kelas)")
s, tree = req('/api/competitions/tree')
assert s == 200 and len(tree['data']) >= 3, f"Tree failed: {tree}"
for sch in tree['data']:
    print(f"  - Sekolah: {sch['name']} ({len(sch.get('levels', []))} Jurusan)")
    for jur in sch.get('levels', []):
        prog_count = len(jur.get('branches', []))
        print(f"      * Jurusan: {jur['name']} -> {prog_count} Program Kelas")
print("  ✓ Cascading tree konsisten dan valid")

# Ambil satu Program Kelas untuk pendaftaran
selected_school = tree['data'][0]
selected_major = selected_school['levels'][0]
selected_program = selected_major['branches'][0]
program_id = selected_program['id']
program_name = selected_program['name']
print(f"\n  Memilih Program: [{selected_school['name']}] -> [{selected_major['name']}] -> [{program_name}] (ID: {program_id})")

# 4. Pendaftaran Calon Siswa (Awal)
print("\n[TEST 4] Pendaftaran Calon Siswa Awal")
s, reg_submit = req('/api/registrations/individual', method='POST', headers=headers_a, data={
    'classProgramId': program_id,
    'fullName': 'Muhammad Fatih',
    'gender': 'L',
    'gradeClass': 'Kelas 9 SMP',
    'schoolName': 'SMP Maskumambang 1',
    'schoolAddress': 'Dukun, Gresik',
    'mentorName': 'H. Abdullah',
    'whatsappNumber': '081299990001'
})
assert s == 201 and reg_submit['success'] is True, f"Registration submit failed: {reg_submit}"
reg_data_a = reg_submit['data']
reg_id_a = reg_data_a['id']
reg_num_a = reg_data_a['registrationNumber']
print(f"  ✓ Pendaftaran berhasil dibuat! ID: {reg_id_a}, No: {reg_num_a}")

# 5. Verifikasi Format Nomor Registrasi PSB-SEKOLAH-PERIODETAHUN-NOMORPENDAFTARAN
print("\n[TEST 5] Verifikasi Format Nomor Pendaftaran PSB")
import re
assert re.match(r'^PSB-[A-Z0-9]+-\d{2}-[A-Z0-9]{6}$', reg_num_a), f"Format nomor pendaftaran tidak sesuai PSB-SEKOLAH-PERIODETAHUN-NOMORPENDAFTARAN: {reg_num_a}"
print(f"  ✓ Format nomor pendaftaran valid: {reg_num_a}")

# 6. Upload Bukti Pembayaran
print("\n[TEST 6] Upload Bukti Pembayaran Pendaftaran")
s, accounts = req('/api/payments/accounts')
assert s == 200 and len(accounts['data']) >= 1
acc_id = accounts['data'][0]['id']

png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
boundary = '----WebKitFormBoundaryPSB2TestUpload'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="registrationId"\r\n\r\n{reg_id_a}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentAccountId"\r\n\r\n{acc_id}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderBank"\r\n\r\nBSI\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderAccountName"\r\n\r\nAbdullah\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentDate"\r\n\r\n2026-09-04\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="payment_proof"; filename="bukti_transfer_psb.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + png_header + f'\r\n--{boundary}--\r\n'.encode('utf-8')

s, upload = req('/api/payments/upload', method='POST', data=body, headers={
    'Authorization': f'Bearer {token_a}',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
assert s == 201 and upload['success'] is True, f"Upload failed: {upload}"
payment_id_a = upload['data']['id']
print(f"  ✓ Bukti transfer berhasil diupload (Payment ID: {payment_id_a})")

# 7. Form Gate Check saat WAITING_VERIFICATION (Harus Terkunci)
print("\n[TEST 7] Form Gate Protection (Saat Status WAITING_VERIFICATION)")
s, gate_status = req(f'/api/registrations/{reg_id_a}/form-gate', headers=headers_a)
assert s == 403 or (s == 200 and gate_status.get('data', {}).get('isUnlocked') is False), f"Form gate should be locked: status={s}, body={gate_status}"
print(f"  ✓ Form Gate terkunci (HTTP {s}): Formulir pendaftaran lengkap belum dapat diakses sebelum pembayaran disetujui")

# 8. Bendahara Approve Pembayaran
print("\n[TEST 8] Bendahara Memverifikasi & Menyetujui Pembayaran")
s, approve = req(f'/api/payments/{payment_id_a}/approve', method='POST', headers=bend_headers)
assert s == 201 and approve['success'] is True, f"Approve failed: {approve}"
print("  ✓ Pembayaran disetujui oleh Bendahara")

# 9. Status Pendaftaran Menjadi APPROVED dan isFormUnlocked = true
print("\n[TEST 9] Verifikasi Perubahan Status Menjadi APPROVED & isFormUnlocked = True")
s, detail_after_app = req(f'/api/registrations/{reg_id_a}', headers=headers_a)
assert s == 200 and detail_after_app['success'] is True
assert detail_after_app['data']['status'] == 'APPROVED', f"Status is not APPROVED: {detail_after_app['data']['status']}"
assert detail_after_app['data']['isFormUnlocked'] is True, f"isFormUnlocked is not true: {detail_after_app['data']['isFormUnlocked']}"
print(f"  ✓ Status: {detail_after_app['data']['status']}, isFormUnlocked: {detail_after_app['data']['isFormUnlocked']}")

# 10. Form Gate Check Setelah Approve (Harus Terbuka)
print("\n[TEST 10] Form Gate Protection (Setelah Status APPROVED)")
s, gate_status_open = req(f'/api/registrations/{reg_id_a}/form-gate', headers=headers_a)
assert s == 200 and gate_status_open.get('success') is True, f"Form gate should be open: status={s}, body={gate_status_open}"
assert gate_status_open.get('unlocked') is True or gate_status_open.get('data', {}).get('unlocked') is True or gate_status_open.get('data', {}).get('isFormUnlocked') is True, f"Gate unlocked mismatch: {gate_status_open}"
print(f"  ✓ Form Gate TERBUKA (HTTP 200): Akses formulir pendaftaran lengkap diizinkan")

# 11. Skenario Penolakan (Reject) + Re-upload Bukti Bayar
print("\n[TEST 11] Skenario Reject Pembayaran & Re-upload Bukti")
# Calon Siswa B daftar
s, reg_submit_b = req('/api/registrations/individual', method='POST', headers=headers_b, data={
    'classProgramId': program_id,
    'fullName': 'Aisyah Putri',
    'gender': 'P',
    'gradeClass': 'Kelas 9 MTs',
    'schoolName': 'MTs Maskumambang 2',
    'schoolAddress': 'Dukun, Gresik',
    'mentorName': 'Hj. Aminah',
    'whatsappNumber': '081299990002'
})
assert s == 201
reg_id_b = reg_submit_b['data']['id']

# Siswa B upload
body_b = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="registrationId"\r\n\r\n{reg_id_b}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentAccountId"\r\n\r\n{acc_id}\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderBank"\r\n\r\nMandiri\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="senderAccountName"\r\n\r\nSuryanto\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="paymentDate"\r\n\r\n2026-09-04\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="payment_proof"; filename="bukti_salah.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + png_header + f'\r\n--{boundary}--\r\n'.encode('utf-8')
s, up_b = req('/api/payments/upload', method='POST', data=body_b, headers={
    'Authorization': f'Bearer {token_b}',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
assert s == 201
payment_id_b = up_b['data']['id']

# Bendahara Reject
s, rej = req(f'/api/payments/{payment_id_b}/reject', method='POST', headers=bend_headers, data={'rejectionReason': 'Nominal tidak sesuai'})
assert s == 201 and rej['success'] is True
print("  ✓ Bukti pembayaran Calon Siswa B ditolak oleh Bendahara")

# Calon Siswa B cek status
s, detail_b = req(f'/api/registrations/{reg_id_b}', headers=headers_b)
assert detail_b['data']['status'] == 'PAYMENT_REJECTED'
print(f"  ✓ Calon Siswa B melihat status: {detail_b['data']['status']}")

# Reupload bukti benar
s, reup_b = req('/api/payments/reupload', method='POST', data=body_b, headers={
    'Authorization': f'Bearer {token_b}',
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
assert s == 201 and reup_b['success'] is True
new_pay_b = reup_b['data']['id']
print(f"  ✓ Calon Siswa B sukses melakukan reupload bukti bayar (ID: {new_pay_b})")

# 12. IDOR Protection (Calon Siswa B tidak boleh akses pendaftaran Calon Siswa A)
print("\n[TEST 12] Pengujian IDOR Protection")
s, idor_attempt = req(f'/api/registrations/{reg_id_a}', headers=headers_b)
assert s in [403, 404], f"IDOR Vulnerability detected! Status: {s}, response: {idor_attempt}"
print(f"  ✓ IDOR Protection berhasil: Calon Siswa B ditolak saat mencoba akses pendaftaran Siswa A (HTTP {s})")

# 13. Pencarian Data Calon Siswa di Dashboard Admin & Bendahara
print("\n[TEST 13] Pencarian Data Calon Siswa")
s, admin_search = req('/api/registrations?search=Fatih', headers=admin_headers)
assert s == 200 and len(admin_search.get('registrations', admin_search.get('data', []))) >= 1
print("  ✓ Admin dapat mencari pendaftaran calon siswa berdasarkan nama")

s, bend_search = req('/api/payments/list?search=Fatih', headers=bend_headers)
assert s == 200 and bend_search.get('pagination', {}).get('total', len(bend_search.get('data', []))) >= 1
print("  ✓ Bendahara dapat mencari riwayat pembayaran calon siswa")

# 14. Bukti Pendaftaran & Cetak Kartu Calon Siswa
print("\n[TEST 14] Cetak Bukti Pendaftaran / Kartu Calon Siswa")
s, card = req(f'/api/cards/{reg_id_a}', headers=headers_a)
assert s == 200 and card['success'] is True, f"Card generation failed: {card}"
assert 'data:image/png;base64,' in card['data']['qr_data_uri']
print(f"  ✓ Kartu / Bukti Pendaftaran Calon Siswa berhasil digenerate dengan QR Code Token: {card['data']['qr_code_token'][:15]}...")

print("\n" + "=" * 60)
print("  SEMUA 14 TEST CASE PSB2 BERHASIL 100% TANPA KESALAHAN!")
print("=" * 60)
