import requests
import json

BASE_URL = 'http://localhost:3005'

def run_tests():
    session = requests.Session()
    
    # 1. Login as Super Admin
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "password123"
    })
    print(f"1. Super Admin Login Status: {login_res.status_code}")
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Get Participants with Gender filter
    res_all = session.get(f"{BASE_URL}/api/interview/admin/participants", headers=headers)
    print(f"2a. Get All Participants: {res_all.status_code}, Count: {len(res_all.json().get('data', []))}")
    assert res_all.status_code == 200

    res_l = session.get(f"{BASE_URL}/api/interview/admin/participants?gender=L", headers=headers)
    print(f"2b. Get Laki-laki (L) Participants: {res_l.status_code}, Count: {len(res_l.json().get('data', []))}")
    assert res_l.status_code == 200

    res_p = session.get(f"{BASE_URL}/api/interview/admin/participants?gender=P", headers=headers)
    print(f"2c. Get Perempuan (P) Participants: {res_p.status_code}, Count: {len(res_p.json().get('data', []))}")
    assert res_p.status_code == 200

    # 3. Get master data (periods, interviewers)
    periods_res = session.get(f"{BASE_URL}/api/competitions/periods", headers=headers)
    period_id = periods_res.json()['data'][0]['id'] if periods_res.json().get('data') else None

    interviewers_res = session.get(f"{BASE_URL}/api/interview/admin/interviewers", headers=headers)
    interviewer_id = interviewers_res.json()['data'][0]['id'] if interviewers_res.json().get('data') else None

    print(f"3. Master data: period_id={period_id}, interviewer_id={interviewer_id}")

    # 4. Create a test schedule
    all_parts = res_all.json().get('data', [])
    selected_reg_ids = [p['id'] for p in all_parts[:2]] if all_parts else []

    create_payload = {
        "name": "Jadwal Uji Coba Fixes",
        "academicPeriodId": period_id,
        "scheduleDate": "2026-09-10",
        "startTime": "08:30",
        "endTime": "11:30",
        "roomLocation": "Ruang Uji Coba",
        "quota": 30,
        "interviewerUserId": interviewer_id,
        "interviewerUserIds": [interviewer_id] if interviewer_id else [],
        "registrationIds": selected_reg_ids,
        "questions": ["Pertanyaan 1: Motivasi belajar?", "Pertanyaan 2: Kemampuan membaca Al-Qur'an?"]
    }
    create_res = session.post(f"{BASE_URL}/api/interview/admin/schedules", json=create_payload, headers=headers)
    print(f"4. Create Schedule Status: {create_res.status_code}, Response: {create_res.json().get('success')}")
    assert create_res.status_code in [200, 201], f"Create schedule failed: {create_res.text}"
    created_schedule = create_res.json().get('data')
    schedule_id = created_schedule.get('id')
    print(f"   Created schedule ID: {schedule_id}")

    # 5. Delete the test schedule
    del_res = session.delete(f"{BASE_URL}/api/interview/admin/schedules/{schedule_id}", headers=headers)
    print(f"5. Delete Schedule Status: {del_res.status_code}, Response: {del_res.json().get('success')}")
    assert del_res.status_code == 200, f"Delete schedule failed: {del_res.text}"

    # 6. Test Calon Siswa (Peserta) Dashboard API
    # Login as student
    student_login = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "user@example.com",
        "password": "password123"
    })
    if student_login.status_code == 200:
        student_token = student_login.json().get('token')
        my_reg_res = session.get(f"{BASE_URL}/api/registrations/my", headers={"Authorization": f"Bearer {student_token}"})
        print(f"6. Student My Registrations Status: {my_reg_res.status_code}")
        if my_reg_res.status_code == 200 and my_reg_res.json().get('data'):
            first_reg = my_reg_res.json()['data'][0]
            print(f"   Student interview field present: {'interview' in first_reg}")

    print("\n--- ALL BACKEND & WORKFLOW TESTS PASSED SUCCESSFULLY! ---")

if __name__ == '__main__':
    run_tests()
