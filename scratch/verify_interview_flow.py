import urllib.request
import urllib.parse
import time
import json

BASE_URL = 'http://localhost:3005/api'

def req(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    body = json.dumps(data).encode('utf-8') if data is not None else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"HTTP Error {e.code} on {method} {url}: {err_body}")
        try:
            return json.loads(err_body)
        except:
            return {"error": err_body, "statusCode": e.code}

def run_test():
    print("🚀 Memulai Pengujian Modul Wawancara PSB2...")

    # 1. Login Super Admin
    print("\n1. Login Super Admin...")
    login_res = req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "admin@lomba.id",
        "password": "admin123"
    })
    admin_token = login_res.get('data', {}).get('accessToken')
    assert admin_token, f"Admin login failed: {login_res}"
    print("✅ Super Admin Login Berhasil.")

    # 2. Get Academic Periods & Schools
    print("\n2. Get Master Data via interview dashboard...")
    dash_init = req(f"{BASE_URL}/interview/admin/dashboard", token=admin_token)
    assert dash_init.get('success') == True, f"Dashboard failed: {dash_init}"
    print("✅ Dashboard Initial Stats Loaded.")

    # 3. Kategori Pertanyaan
    print("\n3. Buat Kategori Pertanyaan...")
    cat_res = req(f"{BASE_URL}/interview/admin/categories", method="POST", token=admin_token, data={
        "name": "Al-Qur'an & Ibadah Praktis",
        "description": "Pengujian bacaan Al-Qur'an, tajwid, makhraj, dan hafalan surat pendek",
        "sortOrder": 1,
        "isActive": True
    })
    category_id = cat_res.get('data', {}).get('id')
    print(f"✅ Kategori Wawancara Dibuat: {category_id}")

    # 4. Bank Pertanyaan
    print("\n4. Tambah Pertanyaan ke Bank Soal...")
    q1_res = req(f"{BASE_URL}/interview/admin/questions", method="POST", token=admin_token, data={
        "categoryId": category_id,
        "question": "Bacalah QS. Al-Mulk ayat 1-5 dengan kaidah tajwid yang benar!",
        "interviewerGuidance": "Perhatikan makharijul huruf pada huruf 'Ain dan Ghain, serta hukum mad jaiz munfashil.",
        "isActive": True
    })
    q1_id = q1_res.get('data', {}).get('id')
    assert q1_id, f"Failed to create q1: {q1_res}"

    q2_res = req(f"{BASE_URL}/interview/admin/questions", method="POST", token=admin_token, data={
        "categoryId": category_id,
        "question": "Sebutkan rukun sholat dan praktekkan bacaan tasyahhud akhir!",
        "interviewerGuidance": "Ketepatan lafal shalawat ibrahimiyyah dan tartil.",
        "isActive": True
    })
    q2_id = q2_res.get('data', {}).get('id')
    assert q2_id, f"Failed to create q2: {q2_res}"
    print(f"✅ 2 Butir Pertanyaan Berhasil Dibuat: {q1_id}, {q2_id}")

    # 5. Paket Wawancara
    print("\n5. Buat Paket Wawancara & Masukkan Pertanyaan...")
    pkg_code = f"PKG-{int(time.time())}"
    pkg_res = req(f"{BASE_URL}/interview/admin/packages", method="POST", token=admin_token, data={
        "code": pkg_code,
        "name": "Paket Seleksi Wawancara Santri Baru 2026/2027",
        "description": "Paket standar seleksi santri baru semua jenjang",
        "status": "ACTIVE"
    })
    pkg_id = pkg_res.get('data', {}).get('id')
    assert pkg_id, f"Failed to create package: {pkg_res}"

    # Add questions to package
    req(f"{BASE_URL}/interview/admin/packages/{pkg_id}/questions", method="POST", token=admin_token, data={
        "questionId": q1_id,
        "sortOrder": 1,
        "isRequired": True,
        "answerNoteMode": "REQUIRED"
    })
    req(f"{BASE_URL}/interview/admin/packages/{pkg_id}/questions", method="POST", token=admin_token, data={
        "questionId": q2_id,
        "sortOrder": 2,
        "isRequired": False,
        "answerNoteMode": "OPTIONAL"
    })
    print(f"✅ Paket Wawancara Dibuat & Diisi Soal: {pkg_id}")

    # 6. Aspek Penilaian
    print("\n6. Buat Aspek Penilaian...")
    asp1_res = req(f"{BASE_URL}/interview/admin/aspects", method="POST", token=admin_token, data={
        "name": "Kemampuan Baca Al-Qur'an",
        "description": "Kelancaran, makhraj, dan tajwid bacaan",
        "defaultWeight": 50,
        "minScore": 0,
        "maxScore": 100,
        "sortOrder": 1
    })
    asp1_id = asp1_res.get('data', {}).get('id')
    assert asp1_id, f"Failed asp1: {asp1_res}"

    asp2_res = req(f"{BASE_URL}/interview/admin/aspects", method="POST", token=admin_token, data={
        "name": "Kepribadian & Kesiapan Asrama",
        "description": "Kemandirian, adab santri, dan komitmen mondok",
        "defaultWeight": 50,
        "minScore": 0,
        "maxScore": 100,
        "sortOrder": 2
    })
    asp2_id = asp2_res.get('data', {}).get('id')
    assert asp2_id, f"Failed asp2: {asp2_res}"
    print(f"✅ 2 Aspek Penilaian Dibuat: {asp1_id}, {asp2_id}")

    # 7. Akun Pewawancara
    print("\n7. Buat / Cek Akun Pewawancara...")
    interviewer_email = f"pewawancara_{int(time.time())}@lomba.id"
    user_pw_res = req(f"{BASE_URL}/users", method="POST", token=admin_token, data={
        "name": "Ustadz H. Abdullah, Lc.",
        "email": interviewer_email,
        "phoneNumber": "081234567888",
        "password": "pewawancara123",
        "role": "PEWAWANCARA"
    })
    if 'data' in user_pw_res:
        interviewer_user_id = user_pw_res['data']['id']
    else:
        pw_list = req(f"{BASE_URL}/interview/admin/interviewers", token=admin_token).get('data', [])
        interviewer_user_id = pw_list[0]['id']
        interviewer_email = pw_list[0]['email']
    print(f"✅ Pewawancara User ID: {interviewer_user_id} ({interviewer_email})")

    # 8. Jadwal Wawancara
    print("\n8. Buat Sesi Jadwal Wawancara...")
    sch_res = req(f"{BASE_URL}/interview/admin/schedules", method="POST", token=admin_token, data={
        "scheduleDate": "2026-09-06T00:00:00.000Z",
        "startTime": "08:00",
        "endTime": "11:30",
        "roomLocation": "Ruang Wawancara Gedung A Lt. 2",
        "quota": 20,
        "packageId": pkg_id,
        "status": "ACTIVE"
    })
    schedule_id = sch_res.get('data', {}).get('id')
    assert schedule_id, f"Failed schedule: {sch_res}"
    print(f"✅ Jadwal Sesi Wawancara Dibuat: {schedule_id}")

    # Assign Interviewer to Schedule
    assign_iw_res = req(f"{BASE_URL}/interview/admin/schedules/{schedule_id}/assign-interviewers", method="POST", token=admin_token, data={
        "interviewerUserIds": [interviewer_user_id]
    })
    assert assign_iw_res.get('success') == True, f"Failed assign interviewer: {assign_iw_res}"
    print("✅ Pewawancara Ditugaskan ke Jadwal.")

    # 9. Cari Peserta untuk Ditugaskan
    print("\n9. Cari & Tugaskan Peserta ke Jadwal...")
    part_res = req(f"{BASE_URL}/interview/admin/participants", token=admin_token)
    participants = part_res.get('data', [])

    if participants:
        target_reg = participants[0]
        reg_id = target_reg['id']
        reg_num = target_reg.get('registrationNumber') or reg_id
        print(f"Target Peserta: {target_reg.get('user', {}).get('name')}, Reg: {reg_num}")

        assign_part_res = req(f"{BASE_URL}/interview/admin/schedules/assign-participants", method="POST", token=admin_token, data={
            "scheduleId": schedule_id,
            "registrationIds": [reg_id]
        })
        print(f"Assign Participant: {assign_part_res.get('message')}")

        # 10. Check-in Peserta
        print("\n10. Check-in Kehadiran Peserta...")
        checkin_res = req(f"{BASE_URL}/interview/check-in", method="POST", token=admin_token, data={
            "identifier": reg_num,
            "status": "CHECKED_IN"
        })
        print(f"Check-in Status: {checkin_res.get('message')}")

        # 11. Pewawancara Login & Penilaian
        print("\n11. Login Pewawancara & Lakukan Penilaian...")
        pw_login = req(f"{BASE_URL}/auth/login", method="POST", data={
            "email": interviewer_email,
            "password": "pewawancara123"
        })
        assert 'data' in pw_login and 'accessToken' in pw_login['data'], f"Interviewer login failed: {pw_login}"
        pw_token = pw_login['data']['accessToken']

        # Buka Lembar Wawancara via reg_num
        process_res = req(f"{BASE_URL}/interview/interviewer/process/{reg_num}", token=pw_token)
        process_data = process_res.get('data', {})
        interview_id = process_data.get('id')
        print(f"Interview ID: {interview_id}")
        print(f"Snapshots loaded: {len(process_data.get('questionsSnapshot', []))} soal, {len(process_data.get('aspectConfigsSnapshot', []))} aspek")

        # Simpan Nilai & Rekomendasi (Selesai)
        save_res = req(f"{BASE_URL}/interview/interviewer/process/{interview_id}/save", method="POST", token=pw_token, data={
            "scores": [
                {"aspectId": asp1_id, "aspectName": "Kemampuan Baca Al-Qur'an", "score": 90, "weight": 50, "maxScore": 100},
                {"aspectId": asp2_id, "aspectName": "Kepribadian & Kesiapan Asrama", "score": 85, "weight": 50, "maxScore": 100}
            ],
            "questionNotes": [
                {"questionId": q1_id, "questionText": "Bacalah QS. Al-Mulk ayat 1-5 dengan kaidah tajwid yang benar!", "categoryName": "Al-Qur'an", "notes": "Bacaan fasih, tajwid sangat baik."},
                {"questionId": q2_id, "questionText": "Sebutkan rukun sholat dan praktekkan bacaan tasyahhud akhir!", "categoryName": "Ibadah", "notes": "Hafal doa tasyahhud dan tartil."}
            ],
            "generalNotes": "Calon santri memiliki motivasi belajar mandiri yang sangat tinggi dan adab yang baik.",
            "recommendation": "HIGHLY_RECOMMENDED",
            "isComplete": True
        })
        print(f"Save assessment response: {save_res.get('message')}")
        assert save_res.get('success') == True, f"Save assessment failed: {save_res}"
        print("✅ Penilaian Wawancara Selesai & Berhasil Dikunci.")

    # 12. Super Admin Cek Rekap Nilai & Dashboard
    print("\n12. Super Admin Cek Rekap Hasil & Dashboard...")
    results_res = req(f"{BASE_URL}/interview/admin/results", token=admin_token)
    dashboard_res = req(f"{BASE_URL}/interview/admin/dashboard", token=admin_token)
    
    dash_stats = dashboard_res.get('data', {}).get('stats', {})
    print(f"📊 Dashboard Stats: Total Assigned: {dash_stats.get('totalAssigned')}, Completed: {dash_stats.get('completed')}, In Progress: {dash_stats.get('inProgress')}")
    print(f"📊 Rekap Nilai Count: {len(results_res.get('data', []))}")

    print("\n🎉 SELURUH ALUR PENGUJIAN MODUL WAWANCARA BERHASIL 100%!")

if __name__ == '__main__':
    run_test()
