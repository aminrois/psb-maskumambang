import urllib.request
import json

BASE_URL = "http://localhost:3005/api"

def request_json(url, method="GET", payload=None, token=None):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} on {method} {url}: {body}")
        try:
            return json.loads(body)
        except:
            return {"success": False, "status": e.code, "error": body}

def main():
    print("=== 1. Login Super Admin ===")
    admin_login = request_json(f"{BASE_URL}/auth/login", "POST", {
        "email": "admin@lomba.id",
        "password": "admin123"
    })
    assert admin_login.get("success"), f"Admin login failed: {admin_login}"
    admin_token = admin_login["data"]["accessToken"]
    print("Admin logged in successfully.")

    print("\n=== 2. Get Academic Periods & Waves & Interviewers ===")
    periods = request_json(f"{BASE_URL}/competitions/periods", "GET", token=admin_token)
    active_period_id = periods["data"][0]["id"] if isinstance(periods["data"], list) else periods["data"]["periods"][0]["id"]
    
    interviewers = request_json(f"{BASE_URL}/interview/admin/interviewers", "GET", token=admin_token)
    assert len(interviewers["data"]) > 0, "No interviewers found!"
    interviewer_user_id = interviewers["data"][0]["id"]
    interviewer_email = interviewers["data"][0]["email"]
    print(f"Interviewer assigned: {interviewers['data'][0]['name']} ({interviewer_email})")

    print("\n=== 3. Get Eligible Participants ===")
    participants_res = request_json(f"{BASE_URL}/interview/admin/participants?perPage=5", "GET", token=admin_token)
    participants = participants_res["data"]["data"] if "data" in participants_res["data"] else participants_res["data"]
    selected_reg_ids = [p["registrationId"] if "registrationId" in p else p["id"] for p in participants[:3]]
    print(f"Selected {len(selected_reg_ids)} participants for new schedule: {selected_reg_ids}")

    print("\n=== 4. Super Admin Create Schedule ===")
    create_sch_payload = {
        "name": "Wawancara Gelombang 1 - Sesi Pagi",
        "academicPeriodId": active_period_id,
        "scheduleDate": "2026-09-10",
        "startTime": "08:00",
        "endTime": "11:30",
        "roomLocation": "Gedung Utama Lt. 2 Ruang 201",
        "quota": 30,
        "interviewerUserId": interviewer_user_id,
        "interviewerUserIds": [interviewer_user_id],
        "registrationIds": selected_reg_ids,
        "questions": [
            "Ceritakan motivasi ananda mendaftar di pesantren ini?",
            "Bagaimana kebiasaan shalat 5 waktu dan membaca Al-Qur'an di rumah?",
            "Bagaimana kesiapan ananda tinggal di asrama dan hidup mandiri bersama teman-teman?"
        ]
    }
    create_res = request_json(f"{BASE_URL}/interview/admin/schedules", "POST", create_sch_payload, token=admin_token)
    assert create_res.get("success"), f"Failed to create schedule: {create_res}"
    schedule_id = create_res["data"]["id"]
    print(f"Schedule created with ID: {schedule_id}")

    print("\n=== 5. Login Interviewer ===")
    interviewer_login = request_json(f"{BASE_URL}/auth/login", "POST", {
        "email": interviewer_email,
        "password": "pewawancara123"
    })
    if not interviewer_login.get("success"):
        interviewer_login = request_json(f"{BASE_URL}/auth/login", "POST", {
            "email": "pewawancara@lomba.id",
            "password": "pewawancara123"
        })
    assert interviewer_login.get("success"), f"Interviewer login failed: {interviewer_login}"
    interviewer_token = interviewer_login["data"]["accessToken"]
    print("Interviewer logged in successfully.")

    print("\n=== 6. Interviewer Dashboard & Participant List ===")
    dash_res = request_json(f"{BASE_URL}/interview/interviewer/dashboard", "GET", token=interviewer_token)
    assert dash_res.get("success"), f"Interviewer dashboard failed: {dash_res}"
    
    my_parts = request_json(f"{BASE_URL}/interview/interviewer/participants", "GET", token=interviewer_token)
    assert my_parts.get("success"), f"Interviewer participants failed: {my_parts}"
    assigned_list = my_parts["data"]["data"] if "data" in my_parts["data"] else my_parts["data"]
    assert len(assigned_list) > 0, "No participants in interviewer queue!"
    target_part = assigned_list[0]
    interview_id = target_part["interview"]["id"] if "interview" in target_part and target_part["interview"] else target_part["id"]
    print(f"Target participant to interview: {target_part.get('user', {}).get('name', 'Santri')} (Interview ID: {interview_id})")

    print("\n=== 7. Interviewer Open Process Sheet ===")
    proc_res = request_json(f"{BASE_URL}/interview/interviewer/process/{interview_id}", "GET", token=interviewer_token)
    assert proc_res.get("success"), f"Process fetch failed: {proc_res}"
    proc_data = proc_res["data"]
    interview_id = proc_data.get("interviewId") or proc_data.get("id") or interview_id
    print(f"Resolved Interview ID: {interview_id}, Initial questions loaded: {len(proc_data.get('questionsSnapshot', []))} questions.")

    print("\n=== 8. Interviewer Fill Notes, Spontaneous Question & Recommendation ===")
    save_payload = {
        "isComplete": True,
        "generalNotes": "<p>Calon santri memiliki <strong>kepribadian yang sangat santun</strong>, adab yang baik, dan semangat belajar tinggi.</p>",
        "recommendation": "HIGHLY_RECOMMENDED",
        "questionNotes": [
            {
                "questionId": "q-1",
                "questionText": "Ceritakan motivasi ananda mendaftar di pesantren ini?",
                "notes": "<p>Ingin mendalami <b>ilmu agama</b> dan menghafal Al-Qur'an atas keinginan sendiri.</p>",
                "isCustomQuestion": False,
                "sortOrder": 1
            },
            {
                "questionId": "q-2",
                "questionText": "Bagaimana kebiasaan shalat 5 waktu dan membaca Al-Qur'an di rumah?",
                "notes": "<p>Sudah terbiasa berjamaah di masjid dan mengaji setelah maghrib.</p>",
                "isCustomQuestion": False,
                "sortOrder": 2
            },
            {
                "questionId": "q-3",
                "questionText": "Bagaimana kesiapan ananda tinggal di asrama dan hidup mandiri bersama teman-teman?",
                "notes": "<p>Sangat siap dan sudah terbiasa merapikan kamar serta mencuci pakaian sendiri.</p>",
                "isCustomQuestion": False,
                "sortOrder": 3
            },
            {
                "questionId": "spontaneous-1",
                "questionText": "Apakah pernah mengikuti kegiatan pramuka atau organisasi sekolah?",
                "notes": "<p>Pernah menjadi <u>ketua regu pramuka</u> di tingkat SD/MI.</p>",
                "isCustomQuestion": True,
                "sortOrder": 4
            }
        ]
    }
    save_res = request_json(f"{BASE_URL}/interview/interviewer/process/{interview_id}/save", "POST", save_payload, token=interviewer_token)
    assert save_res.get("success"), f"Save assessment failed: {save_res}"
    print("Interview assessment saved & completed successfully.")

    print("\n=== 9. Super Admin Verification of Results ===")
    results_res = request_json(f"{BASE_URL}/interview/admin/results?search={target_part.get('registrationNumber', '')}", "GET", token=admin_token)
    assert results_res.get("success"), f"Admin results failed: {results_res}"
    result_list = results_res["data"]["data"] if "data" in results_res["data"] else results_res["data"]
    assert len(result_list) > 0, "Saved result not found in admin results!"
    saved_item = result_list[0]
    assert saved_item["status"] == "COMPLETED", f"Expected status COMPLETED, got {saved_item['status']}"
    assert saved_item["recommendation"] == "HIGHLY_RECOMMENDED", f"Expected HIGHLY_RECOMMENDED, got {saved_item['recommendation']}"
    print("Super Admin verified completed interview and recommendation!")

    print("\n=== 10. Super Admin View Result Detail ===")
    detail_res = request_json(f"{BASE_URL}/interview/interviewer/process/{interview_id}", "GET", token=admin_token)
    assert detail_res.get("success"), f"Result detail fetch failed: {detail_res}"
    notes = detail_res["data"]["questionNotes"]
    custom_notes = [n for n in notes if n.get("isCustomQuestion")]
    assert len(custom_notes) == 1, f"Expected 1 custom question, got {len(custom_notes)}"
    print(f"Verified {len(notes)} question notes total including 1 spontaneous question: '{custom_notes[0]['questionText']}'")

    print("\n ALL TESTS PASSED SUCCESSFULLY! Sistem Wawancara Sederhana & Efisien Berfungsi Penuh.")

if __name__ == "__main__":
    main()
