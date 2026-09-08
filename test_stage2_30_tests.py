#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import ssl
import sys
import os

BASE_URL = "http://localhost:3005"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def http_req(method, endpoint, body=None, token=None, headers_extra=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if headers_extra:
        headers.update(headers_extra)
    data = json.dumps(body).encode("utf-8") if body is not None and not isinstance(body, (bytes, bytearray)) else body
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(resp_body)
        except Exception:
            return e.code, {"error": resp_body}
    except Exception as e:
        return 500, {"error": str(e)}

def http_upload(endpoint, field_name, filename, file_bytes, mime_type, fields=None, token=None):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    if fields:
        for k, v in fields.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{v}\r\n".encode("utf-8"))
    
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
    body.extend(file_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return http_req("POST", endpoint, body=body, token=token, headers_extra=headers)

# Sample valid files
# PDF Magic bytes: %PDF-1.4
VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
# PNG Magic bytes: 89 50 4E 47 0D 0A 1A 0A
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
# JPG Magic bytes: FF D8 FF
VALID_JPG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"

test_results = []
def record_test(test_num, test_title, passed, details=""):
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] TEST {test_num}: {test_title}")
    if details:
        print(f"       -> {details}")
    test_results.append({
        "num": test_num,
        "title": test_title,
        "passed": passed,
        "details": details
    })

def run_all_tests():
    print("==================================================================")
    print("STARTING 30 END-TO-END VERIFICATION TESTS FOR PSB2 TAHAP 2")
    print("==================================================================")

    # Login Super Admin
    code, res = http_req("POST", "/api/auth/login", {"email": "admin@lomba.id", "password": "admin123"})
    if code != 200 or not res.get("success"):
        print(f"CRITICAL: Failed to login as Super Admin! {res}")
        sys.exit(1)
    admin_token = res["data"]["accessToken"]

    # Login Bendahara
    code, res = http_req("POST", "/api/auth/login", {"email": "bendahara@lomba.id", "password": "bendahara123"})
    bendahara_token = res["data"]["accessToken"]

    # Register & Login Candidate A
    cand_email = f"santri_{os.getpid()}_{os.urandom(2).hex()}@test.com"
    code, res = http_req("POST", "/api/auth/register", {
        "name": "Muhammad Farhan Al-Fatih",
        "email": cand_email,
        "password": "password123",
        "phoneNumber": "081234567890"
    })
    if code not in (200, 201) or not res.get("success"):
        print(f"CRITICAL: Failed to register Candidate A: {code} {res}")
        sys.exit(1)
    cand_id = res["data"]["id"]
    code, res = http_req("POST", "/api/auth/login", {"email": cand_email, "password": "password123"})
    cand_token = res["data"]["accessToken"]

    # Register & Login Candidate B (for IDOR testing)
    cand_b_email = f"santri_b_{os.getpid()}_{os.urandom(2).hex()}@test.com"
    code, res = http_req("POST", "/api/auth/register", {
        "name": "Ahmad Fauzi",
        "email": cand_b_email,
        "password": "password123",
        "phoneNumber": "081299999999"
    })
    if code not in (200, 201) or not res.get("success"):
        print(f"CRITICAL: Failed to register Candidate B: {code} {res}")
        sys.exit(1)
    cand_b_id = res["data"]["id"]
    code, res = http_req("POST", "/api/auth/login", {"email": cand_b_email, "password": "password123"})
    cand_b_token = res["data"]["accessToken"]

    # ---------------------------------------------------------
    # TEST 1: Super Admin membuat Periode Tahun Pelajaran
    # ---------------------------------------------------------
    p1_name = f"2030/{os.urandom(2).hex()}"
    code, res = http_req("POST", "/api/competitions/periods", {
        "name": p1_name,
        "isActive": False
    }, token=admin_token)
    p_2027_id = res.get("data", {}).get("id")
    passed = code == 201 and res.get("success") and p_2027_id is not None
    record_test(1, "Super Admin membuat Periode Tahun Pelajaran", passed, f"Created period {p1_name} (ID: {p_2027_id})")

    # ---------------------------------------------------------
    # TEST 2: Aktifkan Periode
    # ---------------------------------------------------------
    code, res = http_req("PATCH", f"/api/competitions/periods/{p_2027_id}/toggle", {}, token=admin_token)
    passed = code == 200 and res.get("data", {}).get("isActive") == True
    record_test(2, "Aktifkan Periode", passed, f"Period {p_2027_id} isActive = True")

    # ---------------------------------------------------------
    # TEST 3: Aktifkan Periode baru dan pastikan Periode lama otomatis nonaktif
    # ---------------------------------------------------------
    # Create another period and activate it
    p2_name = f"2031/{os.urandom(2).hex()}"
    code, res = http_req("POST", "/api/competitions/periods", {"name": p2_name, "isActive": True}, token=admin_token)
    p_2028_id = res.get("data", {}).get("id")
    # Verify p1 is now inactive and p2 is active
    code, p27_res = http_req("GET", f"/api/competitions/periods", token=admin_token)
    all_periods = p27_res.get("data", [])
    p27_obj = next((p for p in all_periods if p["id"] == p_2027_id), None)
    p28_obj = next((p for p in all_periods if p["id"] == p_2028_id), None)
    active_count = sum(1 for p in all_periods if p["isActive"])
    passed = (p27_obj and not p27_obj["isActive"]) and (p28_obj and p28_obj["isActive"]) and (active_count == 1)
    record_test(3, "Aktifkan Periode baru dan pastikan Periode lama otomatis nonaktif (1 Active Period Rule)", passed, f"Active count: {active_count}, {p2_name} active: {p28_obj.get('isActive') if p28_obj else False}, {p1_name} active: {p27_obj.get('isActive') if p27_obj else False}")

    # Re-activate 2026/2027 for the rest of the tests
    code, p_list = http_req("GET", "/api/competitions/periods", token=admin_token)
    p26 = next((p for p in p_list.get("data", []) if p["name"] == "2026/2027"), None)
    if p26:
        http_req("PATCH", f"/api/competitions/periods/{p26['id']}", {"isActive": True}, token=admin_token)
        active_period_id = p26["id"]
    else:
        code, res = http_req("POST", "/api/competitions/periods", {"name": "2026/2027", "isActive": True}, token=admin_token)
        active_period_id = res.get("data", {}).get("id")

    # ---------------------------------------------------------
    # TEST 4: Super Admin membuat Gelombang
    # ---------------------------------------------------------
    wave_name = f"Gelombang 1 Reguler {os.urandom(2).hex()}"
    code, res = http_req("POST", "/api/competitions/waves", {
        "academicPeriodId": active_period_id,
        "name": wave_name,
        "waveNumber": 1,
        "startDate": "2026-01-01T00:00:00.000Z",
        "endDate": "2026-12-31T23:59:59.000Z",
        "registrationFee": 500000,
        "isActive": True
    }, token=admin_token)
    wave_1_id = res.get("data", {}).get("id")
    passed = code == 201 and res.get("success") and wave_1_id is not None
    record_test(4, "Super Admin membuat Gelombang", passed, f"Created wave ID: {wave_1_id}, Fee: 500000")

    # ---------------------------------------------------------
    # TEST 5: Validasi tanggal Gelombang
    # ---------------------------------------------------------
    code, res = http_req("POST", "/api/competitions/waves", {
        "academicPeriodId": active_period_id,
        "name": "Gelombang Error Date",
        "startDate": "2026-12-31T00:00:00.000Z",
        "endDate": "2026-01-01T00:00:00.000Z", # End before start!
        "registrationFee": 500000,
        "isActive": True
    }, token=admin_token)
    passed = code == 400 and ("tanggal mulai" in str(res).lower() and "sebelum" in str(res).lower())
    record_test(5, "Validasi tanggal Gelombang (Start date > End date rejected)", passed, f"Backend error: {res.get('message')}")

    # ---------------------------------------------------------
    # TEST 6: Pastikan hanya Gelombang aktif dalam rentang tanggal dapat digunakan
    # ---------------------------------------------------------
    code, res = http_req("GET", "/api/competitions/waves/active", token=cand_token)
    active_waves = res.get("data", [])
    has_valid_waves = len(active_waves) > 0 and all(w["isActive"] for w in active_waves)
    passed = code == 200 and has_valid_waves
    record_test(6, "Hanya Gelombang aktif dalam rentang tanggal dikembalikan untuk pendaftaran", passed, f"Active waves found: {len(active_waves)}")

    # ---------------------------------------------------------
    # TEST 7: Pastikan biaya pendaftaran berasal dari Gelombang
    # ---------------------------------------------------------
    target_wave = next((w for w in active_waves if w["id"] == wave_1_id), active_waves[0])
    fee_val = int(target_wave["registrationFee"])
    passed = fee_val == 500000
    record_test(7, "Biaya pendaftaran valid & berasal dari Gelombang database", passed, f"Fee: Rp {fee_val:,}")

    # Get class program (SMA / IPA / Reguler)
    code, tree_res = http_req("GET", "/api/competitions/tree", token=cand_token)
    sample_school = tree_res["data"][0]
    sample_major = sample_school["levels"][0]
    sample_program = sample_major["branches"][0]
    class_program_id = sample_program["id"]

    # ---------------------------------------------------------
    # TEST 8: Calon santri memilih Mukim / Non-Mukim saat pendaftaran
    # ---------------------------------------------------------
    code, reg_res = http_req("POST", "/api/registrations/individual", {
        "classProgramId": class_program_id,
        "academicPeriodId": active_period_id,
        "admissionWaveId": target_wave["id"],
        "boardingStatus": "MUKIM",
        "fullName": "Muhammad Farhan Al-Fatih",
        "schoolName": "SMP Islam Terpadu Al-Hikmah",
        "gender": "L",
        "whatsappNumber": "081234567890"
    }, token=cand_token)
    cand_reg_id = reg_res.get("data", {}).get("id")
    reg_data = reg_res.get("data", {})
    passed = code == 201 and reg_data.get("boardingStatus") == "MUKIM" and reg_data.get("formStatus") == "LOCKED"
    record_test(8, "Calon santri memilih Mukim / Non-Mukim (tersimpan di Registration)", passed, f"Reg ID: {cand_reg_id}, Boarding: {reg_data.get('boardingStatus')}, Initial FormStatus: {reg_data.get('formStatus')}")

    # ---------------------------------------------------------
    # TEST 9: Payment approved membuka formulir
    # ---------------------------------------------------------
    # First submit payment
    code, acc_res = http_req("GET", "/api/payments/accounts", token=cand_token)
    payment_acc_id = acc_res["data"][0]["id"]
    code, pay_res = http_upload("/api/payments/upload", "payment_proof", "transfer.png", VALID_PNG_BYTES, "image/png", {
        "registrationId": cand_reg_id,
        "paymentAccountId": payment_acc_id,
        "senderBank": "BSI",
        "senderAccountName": "Hamba Allah",
        "paymentDate": "2026-09-04T00:00:00.000Z"
    }, token=cand_token)
    payment_id = pay_res.get("data", {}).get("id")

    # Bendahara approves payment
    code_app, app_res = http_req("POST", f"/api/payments/{payment_id}/approve", {}, token=bendahara_token)
    
    # Check registration form gate
    code_gate, gate_res = http_req("GET", f"/api/registrations/{cand_reg_id}/form-gate", token=cand_token)
    gate_data = gate_res.get("data") if gate_res.get("data") else gate_res
    is_unlocked = gate_data.get("unlocked") is True or gate_data.get("isFormUnlocked") is True
    form_st = gate_data.get("formStatus")
    passed = code_gate == 200 and is_unlocked and form_st == "DRAFT"
    record_test(9, "Payment Approved membuka formulir (isFormUnlocked = true, status = DRAFT)", passed, f"Unlocked: {is_unlocked}, FormStatus: {form_st}")

    # ---------------------------------------------------------
    # TEST 10: Payment belum approved tidak dapat bypass Form Gate
    # ---------------------------------------------------------
    # Candidate B registers but does NOT pay
    code, reg_b_res = http_req("POST", "/api/registrations/individual", {
        "classProgramId": class_program_id,
        "academicPeriodId": active_period_id,
        "admissionWaveId": target_wave["id"],
        "boardingStatus": "NON_MUKIM",
        "fullName": "Ahmad Fauzi",
        "schoolName": "SMPN 1 Jakarta",
        "gender": "L",
        "whatsappNumber": "08129999999"
    }, token=cand_b_token)
    cand_b_reg_id = reg_b_res["data"]["id"]
    code_b_gate, gate_b_res = http_req("GET", f"/api/registrations/{cand_b_reg_id}/form-gate", token=cand_b_token)
    # Attempt to save draft or access form without approval
    code_b_form, form_b_res = http_req("GET", f"/api/registrations/{cand_b_reg_id}/form", token=cand_b_token)
    passed = code_b_form == 403 and code_b_gate == 403
    record_test(10, "Payment belum approved diblokir Form Gate (HTTP 403 Forbidden)", passed, f"Gate HTTP: {code_b_gate}, Form API HTTP: {code_b_form}")

    # ---------------------------------------------------------
    # TEST 11: Simpan Draft
    # ---------------------------------------------------------
    draft_payload = {
        "fullName": "Muhammad Farhan Al-Fatih",
        "nik": "3201012345670001",
        "familyCardNumber": "3201012345670002",
        "nisn": "0081234567",
        "birthCertificateNumber": "12345/DIS/2010",
        "gender": "L",
        "birthPlace": "Jakarta",
        "birthDate": "2010-05-15",
        "religion": "ISLAM",
        "bloodType": "O",
        "childOrder": 1,
        "siblingsCount": 2,
        "childStatus": "KANDUNG",
        "country": "Indonesia",
        "province": "Jawa Barat",
        "cityDistrict": "Kabupaten Bogor",
        "subDistrict": "Ciawi",
        "village": "Bendungan",
        "rt": "02",
        "rw": "05",
        "fullAddress": "Jl. Pesantren No. 10",
        "postalCode": "16720",
        "previousSchoolName": "SMP Islam Terpadu Al-Hikmah",
        "previousSchoolNpsn": "20210001",
        "previousSchoolLevel": "SMP_MTS",
        "previousSchoolAddress": "Jl. Pendidikan No. 5",
        "graduationYear": "2026",
        "diplomaNumber": "DN-01/M-2026/001",
        "fatherName": "Drs. H. Abdullah",
        "fatherNik": "3201010101700001",
        "fatherBirthPlace": "Bogor",
        "fatherBirthDate": "1970-01-01",
        "fatherStatus": "MASIH_HIDUP",
        "fatherEducation": "S1",
        "fatherOccupation": "PNS",
        "fatherMonthlyIncome": "LIMA_SAMPAI_10JT",
        "fatherWhatsapp": "08111111111",
        "motherName": "Hj. Siti Aminah",
        "motherNik": "3201010101750002",
        "motherBirthPlace": "Bandung",
        "motherBirthDate": "1975-02-02",
        "motherStatus": "MASIH_HIDUP",
        "motherEducation": "S1",
        "motherOccupation": "Guru",
        "motherMonthlyIncome": "TIGA_SAMPAI_5JT",
        "motherWhatsapp": "08222222222",
        "hasGuardian": False,
        "primaryContactName": "Drs. H. Abdullah",
        "primaryContactRelation": "Ayah Kandung",
        "primaryContactWhatsapp": "08111111111",
        "primaryContactEmail": "abdullah@test.com",
        "heightCm": 168,
        "weightKg": 55,
        "hasSpecialNeeds": False,
        "hasAchievements": True,
        "achievements": [
            {
                "name": "Juara 1 MTQ Tingkat Provinsi",
                "type": "Tahfidz / Keagamaan",
                "level": "Provinsi",
                "year": "2025",
                "rank": "Juara 1"
            }
        ]
    }
    code, draft_res = http_req("PUT", f"/api/registrations/{cand_reg_id}/form/draft", draft_payload, token=cand_token)
    draft_data = draft_res.get("data") if draft_res.get("data") else draft_res
    passed = code == 200 and draft_res.get("success") == True and draft_data.get("formStatus") == "DRAFT"
    record_test(11, "Simpan Sementara / Draft data formulir", passed, f"Draft saved successfully, formStatus: {draft_data.get('formStatus')}")

    # ---------------------------------------------------------
    # TEST 12: Keluar/login kembali dan Draft tetap tersedia
    # ---------------------------------------------------------
    # Login again
    code, relogin_res = http_req("POST", "/api/auth/login", {"email": cand_email, "password": "password123"})
    new_token = relogin_res["data"]["accessToken"]
    code, fetch_form_res = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=new_token)
    form_data = fetch_form_res.get("data", {})
    st_detail = form_data.get("studentDetail") or form_data
    passed = code == 200 and st_detail.get("nik") == "3201012345670001" and st_detail.get("fatherName") == "Drs. H. Abdullah" and len(form_data.get("achievements", [])) == 1
    record_test(12, "Keluar/login kembali dan data Draft tetap tersimpan persisten", passed, f"Retrieved NIK: {st_detail.get('nik')}, Achievements count: {len(form_data.get('achievements', []))}")

    # ---------------------------------------------------------
    # TEST 13: Validasi seluruh field wajib saat Final Submit (Submit without docs or with missing fields)
    # ---------------------------------------------------------
    incomplete_submit = dict(draft_payload)
    del incomplete_submit["nik"] # Remove mandatory NIK
    code, err_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", incomplete_submit, token=cand_token)
    passed = code == 400
    record_test(13, "Validasi seluruh field wajib saat Final Submit (Missing NIK rejected)", passed, f"HTTP {code}: {err_res.get('message')}")

    # ---------------------------------------------------------
    # TEST 14: Validasi conditional Wali
    # ---------------------------------------------------------
    guardian_invalid_payload = dict(draft_payload)
    guardian_invalid_payload["hasGuardian"] = True
    guardian_invalid_payload["guardianName"] = "" # Missing required guardian name
    code, err_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", guardian_invalid_payload, token=cand_token)
    passed = code == 400 and ("wali" in str(err_res).lower() or "guardian" in str(err_res).lower())
    record_test(14, "Validasi conditional Wali (hasGuardian=true tanpa data wali ditolak)", passed, f"Backend validation message: {err_res.get('message')}")

    # ---------------------------------------------------------
    # TEST 15: Validasi conditional Kebutuhan Khusus
    # ---------------------------------------------------------
    special_invalid_payload = dict(draft_payload)
    special_invalid_payload["hasSpecialNeeds"] = True
    special_invalid_payload["specialNeedsDescription"] = "" # Missing explanation
    code, err_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", special_invalid_payload, token=cand_token)
    passed = code == 400 and ("kebutuhan khusus" in str(err_res).lower() or "special" in str(err_res).lower())
    record_test(15, "Validasi conditional Kebutuhan Khusus (hasSpecialNeeds=true tanpa keterangan ditolak)", passed, f"Backend validation message: {err_res.get('message')}")

    # ---------------------------------------------------------
    # TEST 16: Tambah lebih dari satu Prestasi secara dinamis
    # ---------------------------------------------------------
    multi_achieve_payload = dict(draft_payload)
    multi_achieve_payload["achievements"] = [
        {
            "name": "Juara 1 MTQ Tingkat Provinsi",
            "type": "Keagamaan",
            "level": "Provinsi",
            "year": "2025",
            "rank": "Juara 1"
        },
        {
            "name": "Medali Perak Olimpiade Matematika",
            "type": "Akademik",
            "level": "Nasional",
            "year": "2024",
            "rank": "Juara 2"
        },
        {
            "name": "Juara 1 Pidato Bahasa Arab",
            "type": "Bahasa",
            "level": "Kabupaten",
            "year": "2025",
            "rank": "Juara 1"
        }
    ]
    code, draft_res = http_req("PUT", f"/api/registrations/{cand_reg_id}/form/draft", multi_achieve_payload, token=cand_token)
    code, fetch_res = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=cand_token)
    saved_achievements = fetch_res.get("data", {}).get("achievements", [])
    passed = code == 200 and len(saved_achievements) == 3
    record_test(16, "Tambah lebih dari satu Prestasi (relasi One-to-Many StudentAchievement)", passed, f"Saved {len(saved_achievements)} achievements successfully")

    # ---------------------------------------------------------
    # TEST 17: Upload seluruh dokumen wajib (KK, Akta, KTP Ayah, KTP Ibu, Ijazah, Foto) dengan Magic Bytes
    # ---------------------------------------------------------
    docs_to_upload = [
        ("FAMILY_CARD", "kartu_keluarga.pdf", VALID_PDF_BYTES, "application/pdf"),
        ("BIRTH_CERTIFICATE", "akta_kelahiran.pdf", VALID_PDF_BYTES, "application/pdf"),
        ("FATHER_ID_CARD", "ktp_ayah.jpg", VALID_JPG_BYTES, "image/jpeg"),
        ("MOTHER_ID_CARD", "ktp_ibu.jpg", VALID_JPG_BYTES, "image/jpeg"),
        ("DIPLOMA_OR_SKL", "ijazah_skl.pdf", VALID_PDF_BYTES, "application/pdf"),
        ("PHOTO", "pas_foto.jpg", VALID_JPG_BYTES, "image/jpeg"),
        ("ACHIEVEMENT_CERTIFICATE", "sertifikat_mtq.pdf", VALID_PDF_BYTES, "application/pdf")
    ]
    upload_success_count = 0
    for doc_type, fname, fbytes, mtype in docs_to_upload:
        code, up_res = http_upload(f"/api/registrations/{cand_reg_id}/documents", "file", fname, fbytes, mtype, {
            "documentType": doc_type
        }, token=cand_token)
        if code == 201 and up_res.get("success"):
            upload_success_count += 1

    code, form_check = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=cand_token)
    attached_docs = form_check.get("data", {}).get("documents", [])
    passed = upload_success_count == len(docs_to_upload) and len(attached_docs) == len(docs_to_upload)
    record_test(17, "Upload seluruh dokumen persyaratan dengan Magic Bytes validation (PDF/JPG/PNG)", passed, f"Uploaded {upload_success_count}/{len(docs_to_upload)} documents")

    # ---------------------------------------------------------
    # TEST 18: Validasi dokumen conditional (KTP Wali wajib jika hasGuardian = true)
    # ---------------------------------------------------------
    with_guardian_submit = dict(multi_achieve_payload)
    with_guardian_submit["hasGuardian"] = True
    with_guardian_submit["guardianRelation"] = "Paman"
    with_guardian_submit["guardianName"] = "H. Ahmad Dahlan"
    with_guardian_submit["guardianNik"] = "3201010101800003"
    with_guardian_submit["guardianBirthPlace"] = "Surabaya"
    with_guardian_submit["guardianBirthDate"] = "1980-03-03"
    with_guardian_submit["guardianEducation"] = "S1"
    with_guardian_submit["guardianOccupation"] = "Wiraswasta"
    with_guardian_submit["guardianMonthlyIncome"] = "LIMA_SAMPAI_10JT"
    with_guardian_submit["guardianWhatsapp"] = "08333333333"
    with_guardian_submit["guardianAddress"] = "Jl. Sudirman No. 1"
    # Try submit without GUARDIAN_ID_CARD
    code, err_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", with_guardian_submit, token=cand_token)
    passed = code == 400 and ("ktp wali" in str(err_res).lower() or "guardian_id_card" in str(err_res).lower() or "dokumen" in str(err_res).lower())
    record_test(18, "Validasi dokumen conditional (KTP Wali wajib jika hasGuardian = true)", passed, f"Backend error: {err_res.get('message')}")

    # ---------------------------------------------------------
    # TEST 19: Submit Final (KIRIM DATA FINAL -> SUBMITTED)
    # ---------------------------------------------------------
    # Restore hasGuardian = false for clean submit
    final_payload = dict(multi_achieve_payload)
    final_payload["hasGuardian"] = False
    code, submit_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", final_payload, token=cand_token)
    sub_data = submit_res.get("data") if submit_res.get("data") else submit_res
    final_status = sub_data.get("formStatus")
    passed = code in (200, 201) and submit_res.get("success") == True and final_status == "SUBMITTED"
    record_test(19, "Kirim Data Final berhasil (Status berubah menjadi SUBMITTED)", passed, f"Final FormStatus: {final_status}, submittedAt: {sub_data.get('submittedAt')}")

    # ---------------------------------------------------------
    # TEST 20: Pastikan setelah SUBMITTED calon santri tidak dapat edit
    # ---------------------------------------------------------
    code, edit_attempt = http_req("PUT", f"/api/registrations/{cand_reg_id}/form/draft", {"nik": "9999999999999999"}, token=cand_token)
    passed = code == 400 and ("tidak dapat diubah" in str(edit_attempt).lower() or "submitted" in str(edit_attempt).lower())
    record_test(20, "Setelah SUBMITTED, calon santri dilarang mengubah data formulir (Immutable)", passed, f"Edit blocked HTTP {code}: {edit_attempt.get('message')}")

    # ---------------------------------------------------------
    # TEST 21: Super Admin melihat daftar verifikasi
    # ---------------------------------------------------------
    code, list_res = http_req("GET", "/api/registrations/admin/verification-list?formStatus=SUBMITTED", token=admin_token)
    verif_list = list_res.get("data", [])
    found_cand = next((item for item in verif_list if item["id"] == cand_reg_id), None)
    passed = code == 200 and found_cand is not None
    record_test(21, "Super Admin melihat daftar calon santri yang perlu diverifikasi", passed, f"Found candidate {found_cand['registrationNumber'] if found_cand else 'None'} in SUBMITTED queue")

    # ---------------------------------------------------------
    # TEST 22: Super Admin membuka detail calon santri
    # ---------------------------------------------------------
    code, detail_res = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=admin_token)
    det = detail_res.get("data", {})
    st_detail = det.get("studentDetail") or det
    passed = code == 200 and st_detail.get("nik") == "3201012345670001" and len(det.get("documents", [])) >= 6 and len(det.get("achievements", [])) == 3
    record_test(22, "Super Admin membuka detail lengkap data, prestasi, dan berkas calon santri", passed, f"Full details loaded: NIK={st_detail.get('nik')}, Docs={len(det.get('documents', []))}, Achievements={len(det.get('achievements', []))}")

    # ---------------------------------------------------------
    # TEST 23: Super Admin VERIFIED
    # ---------------------------------------------------------
    code, verif_res = http_req("POST", f"/api/registrations/{cand_reg_id}/verify", {}, token=admin_token)
    v_data = verif_res.get("data") if verif_res.get("data") else verif_res
    passed = code in (200, 201) and v_data.get("formStatus") == "VERIFIED"
    record_test(23, "Super Admin Verifikasi / Terima Data (Status -> VERIFIED)", passed, f"FormStatus: {v_data.get('formStatus')}, verifiedAt: {v_data.get('verifiedAt')}")

    # ---------------------------------------------------------
    # TEST 24: Super Admin meminta revisi dengan catatan (REVISION_REQUIRED)
    # ---------------------------------------------------------
    # We test revision flow on candidate A
    code, rev_res = http_req("POST", f"/api/registrations/{cand_reg_id}/request-revision", {
        "revisionNotes": "Mohon perbaiki foto Kartu Keluarga karena buram dan tidak terbaca."
    }, token=admin_token)
    r_data = rev_res.get("data") if rev_res.get("data") else rev_res
    passed = code in (200, 201) and r_data.get("formStatus") == "REVISION_REQUIRED" and "buram" in r_data.get("revisionNotes", "")
    record_test(24, "Super Admin meminta revisi dengan catatan wajib (Status -> REVISION_REQUIRED)", passed, f"FormStatus: {r_data.get('formStatus')}, Notes: {r_data.get('revisionNotes')}")

    # ---------------------------------------------------------
    # TEST 25: Calon santri melihat catatan revisi
    # ---------------------------------------------------------
    code, cand_view = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=cand_token)
    view_data = cand_view.get("data", {})
    passed = code == 200 and view_data.get("formStatus") == "REVISION_REQUIRED" and "buram" in (view_data.get("revisionNotes") or "")
    record_test(25, "Calon santri dapat melihat catatan revisi Super Admin di dashboard", passed, f"Notes visible to candidate: {view_data.get('revisionNotes')}")

    # ---------------------------------------------------------
    # TEST 26: Calon santri melakukan revisi data/dokumen saat status REVISION_REQUIRED
    # ---------------------------------------------------------
    # Re-upload clear KK document
    code, kk_reup = http_upload(f"/api/registrations/{cand_reg_id}/documents", "file", "kk_revisi_jelas.pdf", VALID_PDF_BYTES, "application/pdf", {
        "documentType": "FAMILY_CARD"
    }, token=cand_token)
    # Also update draft
    revised_draft = dict(final_payload)
    revised_draft["fullAddress"] = "Jl. Pesantren No. 10 (Revisi RT 02 RW 05)"
    code_draft, draft_up = http_req("PUT", f"/api/registrations/{cand_reg_id}/form/draft", revised_draft, token=cand_token)
    passed = kk_reup.get("success") == True and code_draft in (200, 201)
    record_test(26, "Calon santri melakukan perbaikan formulir dan berkas", passed, f"Re-upload KK: {kk_reup.get('success')}, Draft updated: {code_draft in (200, 201)}")

    # ---------------------------------------------------------
    # TEST 27: Calon santri kirim ulang formulir (SUBMITTED)
    # ---------------------------------------------------------
    code, resubmit_res = http_req("POST", f"/api/registrations/{cand_reg_id}/form/submit", revised_draft, token=cand_token)
    sub_data = resubmit_res.get("data") if resubmit_res.get("data") else resubmit_res
    passed = code in (200, 201) and sub_data.get("formStatus") == "SUBMITTED"
    record_test(27, "Calon santri Kirim Ulang Final Formulir (Status kembali SUBMITTED)", passed, f"Resubmitted status: {sub_data.get('formStatus')}")

    # ---------------------------------------------------------
    # TEST 28: IDOR protection untuk formulir
    # ---------------------------------------------------------
    # Candidate B tries to access or edit Candidate A's form
    code_b_read, res_b_read = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=cand_b_token)
    code_b_edit, res_b_edit = http_req("PUT", f"/api/registrations/{cand_reg_id}/form/draft", {"nik": "0000000000000000"}, token=cand_b_token)
    passed = code_b_read == 403 and code_b_edit == 403
    record_test(28, "IDOR Protection untuk formulir pendaftaran (Calon B tidak bisa akses/edit formulir Calon A)", passed, f"Read response HTTP {code_b_read}, Edit response HTTP {code_b_edit}")

    # ---------------------------------------------------------
    # TEST 29: IDOR protection untuk dokumen pendaftaran
    # ---------------------------------------------------------
    # Candidate B tries to download Candidate A's document or upload document to candidate A
    code_cand_form, cand_form_info = http_req("GET", f"/api/registrations/{cand_reg_id}/form", token=cand_token)
    cand_docs = cand_form_info.get("data", {}).get("documents", [])
    doc_id = cand_docs[0]["id"] if len(cand_docs) > 0 else "dummy-doc-id"
    code_b_doc, res_b_doc = http_req("GET", f"/api/registrations/{cand_reg_id}/documents/{doc_id}/file", token=cand_b_token)
    code_b_doc_up, res_b_doc_up = http_upload(f"/api/registrations/{cand_reg_id}/documents", "file", "hacked.png", VALID_PNG_BYTES, "image/png", {
        "documentType": "PHOTO"
    }, token=cand_b_token)
    passed = code_b_doc == 403 and code_b_doc_up == 403
    record_test(29, "IDOR Protection untuk dokumen persyaratan (Calon B tidak bisa unduh/unggah ke pendaftaran Calon A)", passed, f"Download document HTTP {code_b_doc}, Upload document HTTP {code_b_doc_up}")

    # ---------------------------------------------------------
    # TEST 30: Build project berhasil
    # ---------------------------------------------------------
    passed = os.system("npm run build > /dev/null 2>&1") == 0
    record_test(30, "Build Project Berhasil (NestJS build exit code 0)", passed, "TypeScript compilation & bundle clean")

    print("\n==================================================================")
    print("SUMMARY RESULTS:")
    print("==================================================================")
    total = len(test_results)
    passed_count = sum(1 for t in test_results if t["passed"])
    failed_count = total - passed_count
    print(f"TOTAL TESTS : {total}")
    print(f"PASSED      : {passed_count}")
    print(f"FAILED      : {failed_count}")
    print("==================================================================")
    return failed_count == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
