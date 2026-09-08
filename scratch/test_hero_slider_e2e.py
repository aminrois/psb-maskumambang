import requests
import json
import io

BASE_URL = "http://localhost:3005"

def test_hero_slider_full_suite():
    print("=== Testing Hero Slider Endpoints ===")
    
    # 1. Public Endpoint
    res = requests.get(f"{BASE_URL}/api/hero-sliders/active")
    assert res.status_code == 200, f"Public active sliders failed: {res.text}"
    active_data = res.json()
    assert active_data["success"] is True
    print(f"✅ Public /api/hero-sliders/active returned {len(active_data['data'])} active slides")

    # 2. Login Super Admin
    login_payload = {
        "email": "admin@admin.com",
        "password": "lomba_dev_password_2026"
    }
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    if login_res.status_code != 200:
        login_payload["email"] = "admin@lomba.id"
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Super admin login failed: {login_res.text}"
    
    token = login_res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Super Admin Login OK")

    # 3. Get All Sliders (Admin)
    admin_list_res = requests.get(f"{BASE_URL}/api/hero-sliders", headers=headers)
    assert admin_list_res.status_code == 200, f"Admin list failed: {admin_list_res.text}"
    admin_list = admin_list_res.json()["data"]
    initial_count = len(admin_list)
    print(f"✅ Super Admin /api/hero-sliders returned {initial_count} slides")

    # 4. Create New Hero Slider with Multipart Upload
    dummy_desktop = io.BytesIO(b"<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><rect width='1920' height='1080' fill='#0284c7'/></svg>")
    dummy_mobile = io.BytesIO(b"<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#06b6d4'/></svg>")
    
    files = {
        "desktop_image": ("test-desktop.svg", dummy_desktop, "image/svg+xml"),
        "mobile_image": ("test-mobile.svg", dummy_mobile, "image/svg+xml")
    }
    form_data = {
        "badge": "Testing E2E",
        "title": "Slide Uji Coba Otomatis",
        "description": "Deskripsi pengujian sistem hero slider otomatis PSB Maskumambang.",
        "primaryButtonText": "Daftar Sekarang",
        "primaryButtonUrl": "/register.html",
        "secondaryButtonText": "Lihat Juknis",
        "secondaryButtonUrl": "/guide.html",
        "isActive": "true",
        "sortOrder": str(initial_count + 1)
    }

    create_res = requests.post(f"{BASE_URL}/api/hero-sliders", headers=headers, data=form_data, files=files)
    assert create_res.status_code == 201 or create_res.status_code == 200, f"Create slider failed: {create_res.text}"
    created_slide = create_res.json()["data"]
    created_id = created_slide["id"]
    print(f"✅ Create Hero Slider OK -> ID: {created_id}, Desktop: {created_slide['desktopImage']}, Mobile: {created_slide['mobileImage']}")

    # 5. Toggle Status
    status_res = requests.patch(f"{BASE_URL}/api/hero-sliders/{created_id}/status", headers=headers, json={"isActive": False})
    assert status_res.status_code == 200, f"Toggle status failed: {status_res.text}"
    assert status_res.json()["data"]["isActive"] is False
    print("✅ Toggle Status to False OK")

    # 6. Reorder Sliders
    all_current = requests.get(f"{BASE_URL}/api/hero-sliders", headers=headers).json()["data"]
    reordered_ids = [s["id"] for s in all_current]
    reordered_ids.reverse() # reverse order
    reorder_res = requests.patch(f"{BASE_URL}/api/hero-sliders/reorder", headers=headers, json={"sliderIds": reordered_ids})
    assert reorder_res.status_code == 200, f"Reorder failed: {reorder_res.text}"
    print("✅ Reorder Sliders OK")

    # 7. Update Slider Data
    update_data = {
        "title": "Slide Uji Coba Diperbarui",
        "description": "Deskripsi yang sudah diperbarui.",
        "isActive": "true"
    }
    update_res = requests.patch(f"{BASE_URL}/api/hero-sliders/{created_id}", headers=headers, data=update_data)
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    assert update_res.json()["data"]["title"] == "Slide Uji Coba Diperbarui"
    print("✅ Update Slider Data OK")

    # 8. Delete Created Slider
    del_res = requests.delete(f"{BASE_URL}/api/hero-sliders/{created_id}", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    print("✅ Delete Slider OK")

    # 9. Verify Homepage HTML
    home_res = requests.get(f"{BASE_URL}/")
    assert home_res.status_code == 200
    assert "hero-slider-section" in home_res.text
    print("✅ Homepage / returned 200 OK with hero-slider-section")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_hero_slider_full_suite()
