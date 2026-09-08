import requests
import sys

BASE_URL = 'http://localhost:3005/api'

def test_cbt_flow():
    session = requests.Session()

    # 1. Login as Super Admin
    print("\n--- 1. Login Super Admin ---")
    res = session.post(f"{BASE_URL}/auth/login", json={
        "emailOrPhone": "admin@psb.com",
        "password": "Password123!"
    })
    print(f"Status: {res.status_code}")
    if res.status_code != 200 and res.status_code != 201:
        print(f"Login failed: {res.text}")
        return False
    
    admin_token = res.json().get('data', {}).get('accessToken')
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    # 2. Get CBT Admin Dashboard
    print("\n--- 2. Get CBT Admin Dashboard ---")
    res = session.get(f"{BASE_URL}/cbt/admin/dashboard", headers=admin_headers)
    print(f"Status: {res.status_code}")
    dash_data = res.json().get('data', {})
    print(f"Stats: {dash_data.get('stats')}")
    structure = dash_data.get('structure', [])
    print(f"Found {len(structure)} schools in structure.")

    if not structure or not structure[0].get('majors') or not structure[0]['majors'][0].get('classPrograms'):
        print("Master structure is empty, cannot proceed with program test.")
        return False

    first_school = structure[0]
    first_major = first_school['majors'][0]
    first_program = first_major['classPrograms'][0]
    program_id = first_program['id']
    print(f"Testing with ClassProgram: {first_program['name']} (ID: {program_id})")

    # 3. Get or Create Exam for Program
    print("\n--- 3. Get or Create CBT Exam ---")
    res = session.get(f"{BASE_URL}/cbt/admin/exams/by-program/{program_id}", headers=admin_headers)
    exam_data = res.json().get('data', {}).get('exam')
    
    if not exam_data:
        print("Creating exam...")
        create_res = session.post(f"{BASE_URL}/cbt/admin/exams", headers=admin_headers, json={
            "classProgramId": program_id,
            "title": f"Ujian CBT Seleksi - {first_program['name']}",
            "durationMinutes": 60,
            "isActive": True
        })
        print(f"Create Exam Status: {create_res.status_code}")
        exam_data = create_res.json().get('data')

    exam_id = exam_data['id']
    print(f"Exam ID: {exam_id}, Total Questions: {len(exam_data.get('questions', []))}")

    # 4. Ensure at least 1 MC and 1 Essay question exist
    if len(exam_data.get('questions', [])) < 2:
        print("Adding sample Multiple Choice question...")
        res_mc = session.post(f"{BASE_URL}/cbt/admin/exams/{exam_id}/questions", headers=admin_headers, json={
            "type": "MULTIPLE_CHOICE",
            "question": "Berapakah hasil dari 25 x 4?",
            "score": 10,
            "options": [
                {"content": "80", "isCorrect": False},
                {"content": "90", "isCorrect": False},
                {"content": "100", "isCorrect": True},
                {"content": "110", "isCorrect": False}
            ]
        })
        print(f"Add MC Status: {res_mc.status_code}")

        print("Adding sample Essay question...")
        res_essay = session.post(f"{BASE_URL}/cbt/admin/exams/{exam_id}/questions", headers=admin_headers, json={
            "type": "ESSAY",
            "question": "Jelaskan motivasi Anda mendaftar di pondok pesantren ini!",
            "score": 20
        })
        print(f"Add Essay Status: {res_essay.status_code}")

    # 5. Fetch updated exam
    res = session.get(f"{BASE_URL}/cbt/admin/exams/by-program/{program_id}", headers=admin_headers)
    exam_data = res.json().get('data', {}).get('exam')
    print(f"Updated Exam has {len(exam_data.get('questions', []))} questions.")

    # 6. Check Results Endpoint as Admin
    print("\n--- 6. Get Admin CBT Results ---")
    res = session.get(f"{BASE_URL}/cbt/admin/results", headers=admin_headers)
    print(f"Admin Results Status: {res.status_code}")
    results = res.json().get('data', [])
    print(f"Total Eligible Candidates in Results: {len(results)}")

    print("\n>>> CBT Module Verification Succeeded! <<<")
    return True

if __name__ == '__main__':
    success = test_cbt_flow()
    sys.exit(0 if success else 1)
