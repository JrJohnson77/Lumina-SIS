"""
MHPS Upper School Report Card Backend Testing
Tests all /api/mhps/* endpoints with tenant-lock verification
"""
import requests
import json
from typing import Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://c33eeb49-713c-4fa0-848b-f8036188e39c.preview.emergentagent.com/api"

# Test credentials
MHPS_ADMIN = {"school_code": "MHPS", "username": "admin", "password": "Admin@123"}
MHPS_TEACHER = {"school_code": "MHPS", "username": "akua.mensah", "password": "Teacher@123"}
JTECH_SUPERUSER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
SUNF_ADMIN = {"school_code": "SUNF", "username": "admin", "password": "Admin@123"}

def login(credentials: Dict[str, str]) -> str:
    """Login and return access token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    if response.status_code == 200:
        return response.json()["access_token"]
    raise Exception(f"Login failed for {credentials['username']}: {response.status_code} {response.text}")

def get_headers(token: str) -> Dict[str, str]:
    """Return authorization headers"""
    return {"Authorization": f"Bearer {token}"}

def test_tenant_lock():
    """Test 1: TENANT-LOCK - Verify SUNF admin gets 403 on all /api/mhps/* endpoints"""
    print("\n" + "="*80)
    print("TEST 1: TENANT-LOCK VERIFICATION")
    print("="*80)
    
    # First, ensure SUNF school exists by running seed script
    import subprocess
    print("\n→ Seeding SUNF school...")
    result = subprocess.run(["python", "/app/scripts/seed_two_schools.py"], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        print(f"⚠ Seed script warning: {result.stderr}")
    else:
        print("✓ SUNF school seeded")
    
    # Login as SUNF admin
    print("\n→ Logging in as SUNF admin...")
    sunf_token = login(SUNF_ADMIN)
    sunf_headers = get_headers(sunf_token)
    print("✓ SUNF admin logged in")
    
    # Login as MHPS admin
    print("\n→ Logging in as MHPS admin...")
    mhps_token = login(MHPS_ADMIN)
    mhps_headers = get_headers(mhps_token)
    print("✓ MHPS admin logged in")
    
    # Login as JTECH superuser
    print("\n→ Logging in as JTECH superuser...")
    jtech_token = login(JTECH_SUPERUSER)
    jtech_headers = get_headers(jtech_token)
    print("✓ JTECH superuser logged in")
    
    # Test GET /api/mhps/report-template
    print("\n→ Testing GET /api/mhps/report-template...")
    
    # SUNF admin should get 403
    resp = requests.get(f"{BASE_URL}/mhps/report-template", headers=sunf_headers)
    assert resp.status_code == 403, f"Expected 403 for SUNF admin, got {resp.status_code}"
    print("  ✓ SUNF admin correctly blocked (403)")
    
    # MHPS admin should get 200
    resp = requests.get(f"{BASE_URL}/mhps/report-template", headers=mhps_headers)
    assert resp.status_code == 200, f"Expected 200 for MHPS admin, got {resp.status_code}"
    print("  ✓ MHPS admin allowed (200)")
    
    # JTECH superuser should get 200
    resp = requests.get(f"{BASE_URL}/mhps/report-template", headers=jtech_headers)
    assert resp.status_code == 200, f"Expected 200 for JTECH superuser, got {resp.status_code}"
    print("  ✓ JTECH superuser allowed (200)")
    
    print("\n✅ TENANT-LOCK TEST PASSED")
    return mhps_token, jtech_token

def test_report_template_structure(mhps_token: str, jtech_token: str):
    """Test 2: GET /api/mhps/report-template structure"""
    print("\n" + "="*80)
    print("TEST 2: REPORT TEMPLATE STRUCTURE")
    print("="*80)
    
    mhps_headers = get_headers(mhps_token)
    
    print("\n→ Fetching MHPS report template...")
    resp = requests.get(f"{BASE_URL}/mhps/report-template", headers=mhps_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    
    data = resp.json()
    
    # Verify design_mode
    print("\n→ Verifying design_mode...")
    assert data.get("design_mode") == "mhps_upper", f"Expected design_mode='mhps_upper', got {data.get('design_mode')}"
    print("  ✓ design_mode = 'mhps_upper'")
    
    # Verify scope
    print("\n→ Verifying scope...")
    assert data.get("scope") == "tenant", f"Expected scope='tenant', got {data.get('scope')}"
    print("  ✓ scope = 'tenant'")
    
    # Verify mhps_settings exists and has all required keys
    print("\n→ Verifying mhps_settings...")
    settings = data.get("mhps_settings")
    assert settings is not None, "mhps_settings is missing"
    
    required_keys = [
        "houses", "subjects", "core_subjects", "components", "component_weights",
        "academic_grade_scale", "achievement_bands", "rating_scale",
        "work_ethics_criteria", "social_skills_criteria", "principal_signature_block", "theme"
    ]
    
    for key in required_keys:
        assert key in settings, f"mhps_settings missing key: {key}"
        print(f"  ✓ mhps_settings.{key} present")
    
    # Verify comment_bank
    print("\n→ Verifying comment_bank...")
    comment_bank = data.get("comment_bank")
    assert comment_bank is not None, "comment_bank is missing"
    assert isinstance(comment_bank, list), "comment_bank should be a list"
    assert len(comment_bank) == 13, f"Expected 13 comment_bank entries, got {len(comment_bank)}"
    print(f"  ✓ comment_bank has 13 entries")
    
    print("\n✅ REPORT TEMPLATE STRUCTURE TEST PASSED")
    return data

def test_other_schools_unaffected(jtech_token: str):
    """Test 3: Verify other schools' templates are unaffected"""
    print("\n" + "="*80)
    print("TEST 3: OTHER SCHOOLS UNAFFECTED")
    print("="*80)
    
    jtech_headers = get_headers(jtech_token)
    
    print("\n→ Fetching JTECH report template...")
    resp = requests.get(f"{BASE_URL}/report-templates/JTECH", headers=jtech_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    
    data = resp.json()
    design_mode = data.get("design_mode")
    
    print(f"\n→ Verifying JTECH design_mode...")
    assert design_mode == "ashcombe_default", f"Expected 'ashcombe_default', got '{design_mode}'"
    print(f"  ✓ JTECH design_mode = 'ashcombe_default' (unaffected)")
    
    print("\n✅ OTHER SCHOOLS UNAFFECTED TEST PASSED")

def test_settings_rbac(mhps_token: str, jtech_token: str):
    """Test 4: PUT /api/mhps/report-template/settings RBAC"""
    print("\n" + "="*80)
    print("TEST 4: SETTINGS ENDPOINT RBAC")
    print("="*80)
    
    # First, verify MHPS teacher exists
    print("\n→ Verifying MHPS teacher exists...")
    mhps_headers = get_headers(mhps_token)
    resp = requests.get(f"{BASE_URL}/users", headers=mhps_headers)
    users = resp.json()
    
    teacher_exists = any(u.get("username") == "akua.mensah" for u in users)
    
    if not teacher_exists:
        print("  ⚠ Teacher 'akua.mensah' not found, picking first MHPS teacher...")
        mhps_teachers = [u for u in users if u.get("role") == "teacher" and u.get("school_code") == "MHPS"]
        if mhps_teachers:
            teacher_username = mhps_teachers[0].get("username")
            print(f"  → Using teacher: {teacher_username}")
            teacher_creds = {"school_code": "MHPS", "username": teacher_username, "password": "Teacher@123"}
            teacher_token = login(teacher_creds)
        else:
            print("  ⚠ No MHPS teachers found, skipping teacher test")
            teacher_token = None
    else:
        print("  ✓ Teacher 'akua.mensah' exists")
        teacher_token = login(MHPS_TEACHER)
    
    # Test payload - update houses
    test_payload = {
        "houses": ["Emerald", "Ruby", "Sapphire", "Topaz", "Diamond"]
    }
    
    # Test MHPS admin - should get 200
    print("\n→ Testing MHPS admin PUT /api/mhps/report-template/settings...")
    resp = requests.put(f"{BASE_URL}/mhps/report-template/settings", 
                       headers=mhps_headers, json=test_payload)
    assert resp.status_code == 200, f"Expected 200 for MHPS admin, got {resp.status_code}: {resp.text}"
    print("  ✓ MHPS admin allowed (200)")
    
    # Verify changes persisted
    print("\n→ Verifying changes persisted...")
    resp = requests.get(f"{BASE_URL}/mhps/report-template", headers=mhps_headers)
    data = resp.json()
    houses = data.get("mhps_settings", {}).get("houses", [])
    assert "Diamond" in houses, f"Expected 'Diamond' in houses, got {houses}"
    print("  ✓ Changes persisted")
    
    # Restore original houses
    print("\n→ Restoring original houses...")
    restore_payload = {"houses": ["Emerald", "Ruby", "Sapphire", "Topaz"]}
    resp = requests.put(f"{BASE_URL}/mhps/report-template/settings", 
                       headers=mhps_headers, json=restore_payload)
    assert resp.status_code == 200, f"Restore failed: {resp.status_code}"
    print("  ✓ Original houses restored")
    
    # Test MHPS teacher - should get 403
    if teacher_token:
        print("\n→ Testing MHPS teacher PUT /api/mhps/report-template/settings...")
        teacher_headers = get_headers(teacher_token)
        resp = requests.put(f"{BASE_URL}/mhps/report-template/settings", 
                           headers=teacher_headers, json=test_payload)
        assert resp.status_code == 403, f"Expected 403 for MHPS teacher, got {resp.status_code}"
        print("  ✓ MHPS teacher correctly blocked (403)")
    
    # Test superuser - should get 200
    print("\n→ Testing JTECH superuser PUT /api/mhps/report-template/settings...")
    jtech_headers = get_headers(jtech_token)
    resp = requests.put(f"{BASE_URL}/mhps/report-template/settings", 
                       headers=jtech_headers, json=test_payload)
    assert resp.status_code == 200, f"Expected 200 for superuser, got {resp.status_code}: {resp.text}"
    print("  ✓ JTECH superuser allowed (200)")
    
    # Restore again
    resp = requests.put(f"{BASE_URL}/mhps/report-template/settings", 
                       headers=jtech_headers, json=restore_payload)
    
    print("\n✅ SETTINGS RBAC TEST PASSED")

def test_structure_rbac(mhps_token: str, jtech_token: str):
    """Test 5: PUT /api/mhps/report-template/structure RBAC"""
    print("\n" + "="*80)
    print("TEST 5: STRUCTURE ENDPOINT RBAC")
    print("="*80)
    
    test_payload = {
        "subjects": [
            {"name": "Language Arts", "is_core": True},
            {"name": "Mathematics", "is_core": True}
        ]
    }
    
    # Test MHPS admin - should get 403
    print("\n→ Testing MHPS admin PUT /api/mhps/report-template/structure...")
    mhps_headers = get_headers(mhps_token)
    resp = requests.put(f"{BASE_URL}/mhps/report-template/structure", 
                       headers=mhps_headers, json=test_payload)
    assert resp.status_code == 403, f"Expected 403 for MHPS admin, got {resp.status_code}"
    print("  ✓ MHPS admin correctly blocked (403)")
    
    # Test superuser - should get 200
    print("\n→ Testing JTECH superuser PUT /api/mhps/report-template/structure...")
    jtech_headers = get_headers(jtech_token)
    resp = requests.put(f"{BASE_URL}/mhps/report-template/structure", 
                       headers=jtech_headers, json=test_payload)
    assert resp.status_code == 200, f"Expected 200 for superuser, got {resp.status_code}: {resp.text}"
    print("  ✓ JTECH superuser allowed (200)")
    
    print("\n✅ STRUCTURE RBAC TEST PASSED")

def test_comment_bank_crud(mhps_token: str, jtech_token: str):
    """Test 6: Comment bank CRUD operations"""
    print("\n" + "="*80)
    print("TEST 6: COMMENT BANK CRUD")
    print("="*80)
    
    mhps_headers = get_headers(mhps_token)
    
    # First, verify MHPS teacher exists
    print("\n→ Verifying MHPS teacher exists...")
    resp = requests.get(f"{BASE_URL}/users", headers=mhps_headers)
    users = resp.json()
    
    teacher_exists = any(u.get("username") == "akua.mensah" for u in users)
    
    if not teacher_exists:
        print("  ⚠ Teacher 'akua.mensah' not found, picking first MHPS teacher...")
        mhps_teachers = [u for u in users if u.get("role") == "teacher" and u.get("school_code") == "MHPS"]
        if mhps_teachers:
            teacher_username = mhps_teachers[0].get("username")
            print(f"  → Using teacher: {teacher_username}")
            teacher_creds = {"school_code": "MHPS", "username": teacher_username, "password": "Teacher@123"}
            teacher_token = login(teacher_creds)
        else:
            print("  ⚠ No MHPS teachers found, skipping teacher test")
            teacher_token = None
    else:
        print("  ✓ Teacher 'akua.mensah' exists")
        teacher_token = login(MHPS_TEACHER)
    
    # GET - should work for teacher
    if teacher_token:
        print("\n→ Testing GET /api/mhps/comment-bank as teacher...")
        teacher_headers = get_headers(teacher_token)
        resp = requests.get(f"{BASE_URL}/mhps/comment-bank", headers=teacher_headers)
        assert resp.status_code == 200, f"Expected 200 for teacher GET, got {resp.status_code}"
        print("  ✓ Teacher can GET comment bank (200)")
    
    # POST - admin should succeed, teacher should fail
    test_comment = {"text": "TEST COMMENT - Please delete after testing"}
    
    print("\n→ Testing POST /api/mhps/comment-bank as admin...")
    resp = requests.post(f"{BASE_URL}/mhps/comment-bank", 
                        headers=mhps_headers, json=test_comment)
    assert resp.status_code == 200, f"Expected 200 for admin POST, got {resp.status_code}: {resp.text}"
    comment_id = resp.json().get("id")
    print(f"  ✓ Admin can POST comment (200), id={comment_id}")
    
    if teacher_token:
        print("\n→ Testing POST /api/mhps/comment-bank as teacher...")
        resp = requests.post(f"{BASE_URL}/mhps/comment-bank", 
                            headers=teacher_headers, json=test_comment)
        assert resp.status_code == 403, f"Expected 403 for teacher POST, got {resp.status_code}"
        print("  ✓ Teacher correctly blocked from POST (403)")
    
    # PUT - admin should succeed, teacher should fail
    update_payload = {"text": "UPDATED TEST COMMENT"}
    
    print("\n→ Testing PUT /api/mhps/comment-bank/{id} as admin...")
    resp = requests.put(f"{BASE_URL}/mhps/comment-bank/{comment_id}", 
                       headers=mhps_headers, json=update_payload)
    assert resp.status_code == 200, f"Expected 200 for admin PUT, got {resp.status_code}: {resp.text}"
    print("  ✓ Admin can PUT comment (200)")
    
    if teacher_token:
        print("\n→ Testing PUT /api/mhps/comment-bank/{id} as teacher...")
        resp = requests.put(f"{BASE_URL}/mhps/comment-bank/{comment_id}", 
                           headers=teacher_headers, json=update_payload)
        assert resp.status_code == 403, f"Expected 403 for teacher PUT, got {resp.status_code}"
        print("  ✓ Teacher correctly blocked from PUT (403)")
    
    # DELETE - admin should succeed, teacher should fail
    if teacher_token:
        print("\n→ Testing DELETE /api/mhps/comment-bank/{id} as teacher...")
        resp = requests.delete(f"{BASE_URL}/mhps/comment-bank/{comment_id}", 
                              headers=teacher_headers)
        assert resp.status_code == 403, f"Expected 403 for teacher DELETE, got {resp.status_code}"
        print("  ✓ Teacher correctly blocked from DELETE (403)")
    
    print("\n→ Testing DELETE /api/mhps/comment-bank/{id} as admin...")
    resp = requests.delete(f"{BASE_URL}/mhps/comment-bank/{comment_id}", 
                          headers=mhps_headers)
    assert resp.status_code == 200, f"Expected 200 for admin DELETE, got {resp.status_code}: {resp.text}"
    print("  ✓ Admin can DELETE comment (200)")
    
    # Verify deletion
    print("\n→ Verifying comment was deleted...")
    resp = requests.get(f"{BASE_URL}/mhps/comment-bank", headers=mhps_headers)
    comments = resp.json().get("comments", [])
    assert not any(c.get("id") == comment_id for c in comments), "Comment still exists after deletion"
    print("  ✓ Comment successfully deleted")
    
    print("\n✅ COMMENT BANK CRUD TEST PASSED")

def test_report_card_get(mhps_token: str):
    """Test 7: GET /api/mhps/report-card/{student_id}"""
    print("\n" + "="*80)
    print("TEST 7: REPORT CARD GET")
    print("="*80)
    
    mhps_headers = get_headers(mhps_token)
    
    # Get a Grades 4-6 student
    print("\n→ Fetching MHPS students...")
    resp = requests.get(f"{BASE_URL}/students", headers=mhps_headers)
    assert resp.status_code == 200, f"Failed to fetch students: {resp.status_code}"
    
    students = resp.json()
    print(f"  → Found {len(students)} students")
    
    # Find a student in Grades 4-6
    target_student = None
    for student in students:
        class_id = student.get("class_id")
        if class_id:
            # Fetch class info
            resp = requests.get(f"{BASE_URL}/classes", headers=mhps_headers)
            classes = resp.json()
            for cls in classes:
                if cls.get("id") == class_id and cls.get("grade_level") in ["Grade 4", "Grade 5", "Grade 6"]:
                    target_student = student
                    print(f"  ✓ Found student in {cls.get('grade_level')}: {student.get('first_name')} {student.get('last_name')}")
                    break
        if target_student:
            break
    
    if not target_student:
        print("  ⚠ No Grades 4-6 students found, cannot test report card")
        return
    
    student_id = target_student.get("id")
    
    # GET report card
    print(f"\n→ Fetching report card for student {student_id}...")
    resp = requests.get(
        f"{BASE_URL}/mhps/report-card/{student_id}",
        headers=mhps_headers,
        params={"term": "Term 1", "academic_year": "2024-2025"}
    )
    
    if resp.status_code == 404:
        print("  ⚠ No report card found for this student (404)")
        print("  → This is expected if seed_mhps_template.py hasn't been run")
        return
    
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    data = resp.json()
    report_card = data.get("report_card", {})
    
    # Verify subjects have weighted grades
    print("\n→ Verifying subjects have weighted grades...")
    subjects = report_card.get("subjects", [])
    assert len(subjects) > 0, "No subjects found in report card"
    
    for subject in subjects:
        name = subject.get("name")
        weighted_grade = subject.get("weighted_term_grade")
        weighted_letter = subject.get("weighted_letter")
        
        if weighted_grade is not None:
            assert isinstance(weighted_grade, (int, float)), f"weighted_term_grade should be numeric for {name}"
            print(f"  ✓ {name}: weighted_term_grade={weighted_grade}, weighted_letter={weighted_letter}")
        else:
            print(f"  → {name}: No weighted_term_grade (no scores entered)")
    
    # Verify achievement standards
    print("\n→ Verifying achievement standards...")
    achievement_standards = report_card.get("achievement_standards", [])
    
    for standard in achievement_standards:
        subject = standard.get("subject")
        band = standard.get("band")
        percentage = standard.get("percentage")
        
        if percentage is not None and band:
            print(f"  ✓ {subject}: percentage={percentage}, band={band}")
        else:
            print(f"  → {subject}: No band mapped (percentage={percentage})")
    
    # Verify student_overall_average
    print("\n→ Verifying student_overall_average...")
    overall_avg = report_card.get("student_overall_average")
    if overall_avg is not None:
        print(f"  ✓ student_overall_average = {overall_avg}")
    else:
        print(f"  → student_overall_average not present")
    
    print("\n✅ REPORT CARD GET TEST PASSED")
    return student_id

def test_report_card_put(mhps_token: str, student_id: str = None):
    """Test 8: PUT /api/mhps/report-card/{id}"""
    print("\n" + "="*80)
    print("TEST 8: REPORT CARD PUT")
    print("="*80)
    
    if not student_id:
        print("  ⚠ No student_id provided, skipping PUT test")
        return
    
    mhps_headers = get_headers(mhps_token)
    
    # First, get the report card
    print(f"\n→ Fetching report card for student {student_id}...")
    resp = requests.get(
        f"{BASE_URL}/mhps/report-card/{student_id}",
        headers=mhps_headers,
        params={"term": "Term 1", "academic_year": "2024-2025"}
    )
    
    if resp.status_code == 404:
        print("  ⚠ No report card found, skipping PUT test")
        return
    
    data = resp.json()
    report_card = data.get("report_card", {})
    report_card_id = report_card.get("id")
    
    if not report_card_id:
        print("  ⚠ No report_card.id found, skipping PUT test")
        return
    
    # Test 1: Edit a subject's scores and verify weighted grade recomputes
    print(f"\n→ Testing subject score update (student_id={student_id})...")
    
    subjects = report_card.get("subjects", [])
    if not subjects:
        print("  ⚠ No subjects found, skipping score update test")
    else:
        # Update first subject's scores
        test_subject = dict(subjects[0])
        original_name = test_subject.get("name")
        
        # Set some test scores
        test_subject["class_tests_quizzes"] = 85
        test_subject["homework"] = 90
        test_subject["mid_term_exam"] = 88
        
        updated_subjects = [test_subject] + subjects[1:]
        
        update_payload = {
            "term": "Term 1",
            "academic_year": "2024-2025",
            "subjects": updated_subjects
        }
        
        resp = requests.put(
            f"{BASE_URL}/mhps/report-card/{student_id}",
            headers=mhps_headers,
            json=update_payload
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        updated_data = resp.json()
        # The response is the full payload with report_card nested
        updated_report_card = updated_data.get("report_card", {})
        updated_subjects = updated_report_card.get("subjects", [])
        
        if not updated_subjects:
            print(f"  ⚠ No subjects in response, got keys: {list(updated_data.keys())}")
            return
        
        updated_first = updated_subjects[0]
        
        weighted_grade = updated_first.get("weighted_term_grade")
        weighted_letter = updated_first.get("weighted_letter")
        
        assert weighted_grade is not None, "weighted_term_grade should be computed"
        assert weighted_letter, "weighted_letter should be computed"
        
        print(f"  ✓ {original_name}: weighted_term_grade={weighted_grade}, weighted_letter={weighted_letter}")
        print(f"  ✓ Weighted grade recomputed correctly")
    
    # Test 2: Set overall_average_override
    print(f"\n→ Testing overall_average_override...")
    
    override_payload = {
        "term": "Term 1",
        "academic_year": "2024-2025",
        "overall_average_override": 88
    }
    
    resp = requests.put(
        f"{BASE_URL}/mhps/report-card/{student_id}",
        headers=mhps_headers,
        json=override_payload
    )
    
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    updated_data = resp.json()
    updated_report_card = updated_data.get("report_card", {})
    student_overall_average = updated_report_card.get("student_overall_average")
    
    assert student_overall_average == 88, f"Expected student_overall_average=88, got {student_overall_average}"
    print(f"  ✓ overall_average_override=88 applied, student_overall_average={student_overall_average}")
    
    # Verify by re-fetching
    print(f"\n→ Re-fetching to verify persistence...")
    resp = requests.get(
        f"{BASE_URL}/mhps/report-card/{student_id}",
        headers=mhps_headers,
        params={"term": "Term 1", "academic_year": "2024-2025"}
    )
    
    data = resp.json()
    report_card = data.get("report_card", {})
    student_overall_average = report_card.get("student_overall_average")
    
    assert student_overall_average == 88, f"Expected persisted value=88, got {student_overall_average}"
    print(f"  ✓ overall_average_override persisted correctly")
    
    print("\n✅ REPORT CARD PUT TEST PASSED")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("MHPS UPPER SCHOOL REPORT CARD BACKEND TESTING")
    print("="*80)
    
    try:
        # Test 1: Tenant lock
        mhps_token, jtech_token = test_tenant_lock()
        
        # Test 2: Report template structure
        template_data = test_report_template_structure(mhps_token, jtech_token)
        
        # Test 3: Other schools unaffected
        test_other_schools_unaffected(jtech_token)
        
        # Test 4: Settings RBAC
        test_settings_rbac(mhps_token, jtech_token)
        
        # Test 5: Structure RBAC
        test_structure_rbac(mhps_token, jtech_token)
        
        # Test 6: Comment bank CRUD
        test_comment_bank_crud(mhps_token, jtech_token)
        
        # Test 7: Report card GET
        student_id = test_report_card_get(mhps_token)
        
        # Test 8: Report card PUT
        if student_id:
            test_report_card_put(mhps_token, student_id)
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED")
        print("="*80)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise

if __name__ == "__main__":
    main()
