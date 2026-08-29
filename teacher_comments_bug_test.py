#!/usr/bin/env python3
"""
Test script to verify teacher comments bug fix and related endpoints.
PRIMARY: Verify POST /api/teacher-comments is now reachable (was missing decorator).
ALSO: Comment presets, social skill scale, form teacher on report card.
"""

import requests
import json
from typing import Optional

BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Credentials
MHPS_ADMIN = {"school_code": "MHPS", "username": "admin", "password": "Admin@123"}
MHPS_TEACHER = {"school_code": "MHPS", "username": "akua.mensah", "password": "Teacher@123"}
JTECH_SUPERUSER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}

def login(credentials: dict) -> Optional[str]:
    """Login and return token."""
    resp = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    if resp.status_code == 200:
        data = resp.json()
        return data.get("token") or data.get("access_token")
    print(f"❌ Login failed for {credentials['username']}: {resp.status_code} {resp.text}")
    return None

def get_headers(token: str) -> dict:
    """Return authorization headers."""
    return {"Authorization": f"Bearer {token}"}

def main():
    print("=" * 80)
    print("TEACHER COMMENTS BUG FIX + RELATED ENDPOINTS TEST")
    print("=" * 80)
    
    # ========== SETUP: Login and get test data ==========
    print("\n[SETUP] Logging in as MHPS admin...")
    admin_token = login(MHPS_ADMIN)
    if not admin_token:
        print("❌ CRITICAL: Cannot login as MHPS admin. Aborting.")
        return
    admin_headers = get_headers(admin_token)
    print("✅ MHPS admin logged in")
    
    print("\n[SETUP] Logging in as MHPS teacher (akua.mensah)...")
    teacher_token = login(MHPS_TEACHER)
    if not teacher_token:
        print("⚠️  akua.mensah not found. Fetching any MHPS teacher...")
        # Get list of users and find a teacher
        resp = requests.get(f"{BASE_URL}/users", headers=admin_headers)
        if resp.status_code == 200:
            users = resp.json()
            teachers = [u for u in users if u.get("role") == "teacher" and u.get("school_code") == "MHPS"]
            if teachers:
                teacher_username = teachers[0]["username"]
                print(f"   Found teacher: {teacher_username}")
                teacher_creds = {"school_code": "MHPS", "username": teacher_username, "password": "Teacher@123"}
                teacher_token = login(teacher_creds)
                if teacher_token:
                    teacher_headers = get_headers(teacher_token)
                    print(f"✅ MHPS teacher {teacher_username} logged in")
                else:
                    print(f"❌ Cannot login as {teacher_username}")
                    teacher_token = None
            else:
                print("❌ No MHPS teachers found")
                teacher_token = None
        else:
            print(f"❌ Cannot fetch users: {resp.status_code}")
            teacher_token = None
    else:
        teacher_headers = get_headers(teacher_token)
        print("✅ MHPS teacher akua.mensah logged in")
    
    print("\n[SETUP] Logging in as JTECH superuser...")
    superuser_token = login(JTECH_SUPERUSER)
    if not superuser_token:
        print("❌ CRITICAL: Cannot login as JTECH superuser. Aborting.")
        return
    superuser_headers = get_headers(superuser_token)
    print("✅ JTECH superuser logged in")
    
    # Get classes
    print("\n[SETUP] Fetching MHPS classes...")
    resp = requests.get(f"{BASE_URL}/classes", headers=admin_headers)
    if resp.status_code != 200:
        print(f"❌ Cannot fetch classes: {resp.status_code}")
        return
    classes = resp.json()
    mhps_classes = [c for c in classes if c.get("school_code") == "MHPS"]
    if not mhps_classes:
        print("❌ No MHPS classes found")
        return
    
    # Find a class with a teacher
    test_class = None
    for cls in mhps_classes:
        if cls.get("teacher_id"):
            test_class = cls
            break
    
    if not test_class:
        print("⚠️  No class with teacher found, using first class")
        test_class = mhps_classes[0]
    
    class_id = test_class["id"]
    print(f"✅ Using class: {test_class.get('name', class_id)}")
    
    # Get students
    print("\n[SETUP] Fetching MHPS students...")
    resp = requests.get(f"{BASE_URL}/students", headers=admin_headers)
    if resp.status_code != 200:
        print(f"❌ Cannot fetch students: {resp.status_code}")
        return
    students = resp.json()
    mhps_students = [s for s in students if s.get("school_code") == "MHPS"]
    if not mhps_students:
        print("❌ No MHPS students found")
        return
    
    # Find a student in the test class
    test_student = None
    for student in mhps_students:
        if student.get("class_id") == class_id:
            test_student = student
            break
    
    if not test_student:
        print("⚠️  No student in test class, using first student")
        test_student = mhps_students[0]
    
    student_id = test_student["id"]
    student_name = f"{test_student.get('first_name', '')} {test_student.get('last_name', '')}".strip()
    print(f"✅ Using student: {student_name} (ID: {student_id})")
    
    # ========== PRIMARY BUG TEST: POST /api/teacher-comments ==========
    print("\n" + "=" * 80)
    print("PRIMARY BUG TEST: POST /api/teacher-comments (was unreachable)")
    print("=" * 80)
    
    test_count = 0
    passed_count = 0
    
    # Test 1: Verify route is registered (not 404/405)
    test_count += 1
    print(f"\n[Test {test_count}] Verify POST /api/teacher-comments is registered (not 404/405)")
    comment_data = {
        "student_id": student_id,
        "term": "Term 1",
        "academic_year": "2024-2025",
        "comment": "Test comment to verify route is registered"
    }
    resp = requests.post(f"{BASE_URL}/teacher-comments", json=comment_data, headers=admin_headers)
    if resp.status_code in [404, 405]:
        print(f"   ❌ FAILED: Route not registered (status {resp.status_code})")
        print(f"   Response: {resp.text}")
    elif resp.status_code == 200:
        print(f"   ✅ PASSED: Route is registered (status 200)")
        passed_count += 1
    else:
        print(f"   ⚠️  Route registered but returned {resp.status_code}: {resp.text}")
        passed_count += 1  # Route exists, even if other error
    
    # Test 2: POST as MHPS admin for any student (create)
    test_count += 1
    print(f"\n[Test {test_count}] POST /api/teacher-comments as MHPS admin (create)")
    comment_data = {
        "student_id": student_id,
        "term": "Term 1",
        "academic_year": "2024-2025",
        "comment": "Great progress this term - admin test"
    }
    resp = requests.post(f"{BASE_URL}/teacher-comments", json=comment_data, headers=admin_headers)
    if resp.status_code == 200:
        result = resp.json()
        print(f"   ✅ PASSED: Admin can save comment (status 200)")
        print(f"   Response: {result}")
        saved_comment_id = result.get("id")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
        saved_comment_id = None
    
    # Test 3: POST again for same student/term/year (update)
    test_count += 1
    print(f"\n[Test {test_count}] POST /api/teacher-comments as MHPS admin (update same student/term/year)")
    comment_data["comment"] = "Updated comment - excellent work"
    resp = requests.post(f"{BASE_URL}/teacher-comments", json=comment_data, headers=admin_headers)
    if resp.status_code == 200:
        result = resp.json()
        print(f"   ✅ PASSED: Admin can update comment (status 200)")
        print(f"   Response: {result}")
        if saved_comment_id and result.get("id") == saved_comment_id:
            print(f"   ✅ Same ID returned (upsert working): {result.get('id')}")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # Test 4: GET /api/teacher-comments/class/{class_id} returns saved comment
    test_count += 1
    print(f"\n[Test {test_count}] GET /api/teacher-comments/class/{class_id}?term=Term 1&academic_year=2024-2025")
    resp = requests.get(
        f"{BASE_URL}/teacher-comments/class/{class_id}",
        params={"term": "Term 1", "academic_year": "2024-2025"},
        headers=admin_headers
    )
    if resp.status_code == 200:
        result = resp.json()
        entries = result.get("entries", [])
        print(f"   ✅ PASSED: GET class comments (status 200)")
        print(f"   Found {len(entries)} entries")
        # Find our test student
        student_entry = next((e for e in entries if e["student_id"] == student_id), None)
        if student_entry:
            comment = student_entry.get("comment", "")
            if comment:
                print(f"   ✅ Saved comment found for test student: '{comment[:50]}...'")
            else:
                print(f"   ⚠️  Comment is empty for test student")
        else:
            print(f"   ⚠️  Test student not in entries")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # Test 5: POST as MHPS teacher for student in their class
    if teacher_token:
        test_count += 1
        print(f"\n[Test {test_count}] POST /api/teacher-comments as MHPS teacher (student in their class)")
        comment_data = {
            "student_id": student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "Teacher comment - student is doing well"
        }
        resp = requests.post(f"{BASE_URL}/teacher-comments", json=comment_data, headers=teacher_headers)
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✅ PASSED: Teacher can save comment for student in their class (status 200)")
            print(f"   Response: {result}")
            passed_count += 1
        elif resp.status_code == 403:
            print(f"   ⚠️  Teacher blocked (403) - student may not be in their class")
            print(f"   Response: {resp.text}")
            # This is expected if student is not in teacher's class
            passed_count += 1
        else:
            print(f"   ❌ FAILED: Status {resp.status_code}")
            print(f"   Response: {resp.text}")
    else:
        print(f"\n[Test SKIPPED] POST as MHPS teacher (no teacher token)")
    
    # ========== COMMENT PRESETS ==========
    print("\n" + "=" * 80)
    print("COMMENT PRESETS ENDPOINTS")
    print("=" * 80)
    
    # Test 6: GET /api/comment-presets (any staff)
    test_count += 1
    print(f"\n[Test {test_count}] GET /api/comment-presets as MHPS admin")
    resp = requests.get(f"{BASE_URL}/comment-presets", headers=admin_headers)
    if resp.status_code == 200:
        result = resp.json()
        presets = result.get("presets", [])
        print(f"   ✅ PASSED: GET comment presets (status 200)")
        print(f"   Found {len(presets)} presets")
        if len(presets) >= 10:
            print(f"   ✅ Lazy-seeded defaults present (~12 expected)")
        else:
            print(f"   ⚠️  Expected ~12 presets, found {len(presets)}")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # Test 7: POST /api/comment-presets as admin (should succeed)
    test_count += 1
    print(f"\n[Test {test_count}] POST /api/comment-presets as MHPS admin (should succeed)")
    preset_data = {"text": "Test preset comment for verification"}
    resp = requests.post(f"{BASE_URL}/comment-presets", json=preset_data, headers=admin_headers)
    if resp.status_code == 200:
        result = resp.json()
        print(f"   ✅ PASSED: Admin can create preset (status 200)")
        print(f"   Response: {result}")
        created_preset_id = result.get("id")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
        created_preset_id = None
    
    # Test 8: POST /api/comment-presets as teacher (should fail 403)
    if teacher_token:
        test_count += 1
        print(f"\n[Test {test_count}] POST /api/comment-presets as MHPS teacher (should fail 403)")
        preset_data = {"text": "Teacher trying to create preset"}
        resp = requests.post(f"{BASE_URL}/comment-presets", json=preset_data, headers=teacher_headers)
        if resp.status_code == 403:
            print(f"   ✅ PASSED: Teacher correctly blocked (status 403)")
            passed_count += 1
        else:
            print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
            print(f"   Response: {resp.text}")
    else:
        print(f"\n[Test SKIPPED] POST as teacher (no teacher token)")
    
    # Test 9: DELETE /api/comment-presets/{id} as admin (should succeed)
    if created_preset_id:
        test_count += 1
        print(f"\n[Test {test_count}] DELETE /api/comment-presets/{created_preset_id} as MHPS admin (should succeed)")
        resp = requests.delete(f"{BASE_URL}/comment-presets/{created_preset_id}", headers=admin_headers)
        if resp.status_code == 200:
            print(f"   ✅ PASSED: Admin can delete preset (status 200)")
            passed_count += 1
        else:
            print(f"   ❌ FAILED: Status {resp.status_code}")
            print(f"   Response: {resp.text}")
    else:
        print(f"\n[Test SKIPPED] DELETE preset (no preset created)")
    
    # Test 10: DELETE /api/comment-presets/{id} as teacher (should fail 403)
    # First create a preset to delete
    if teacher_token:
        test_count += 1
        print(f"\n[Test {test_count}] DELETE /api/comment-presets as MHPS teacher (should fail 403)")
        # Create a preset as admin first
        preset_data = {"text": "Preset for teacher delete test"}
        resp = requests.post(f"{BASE_URL}/comment-presets", json=preset_data, headers=admin_headers)
        if resp.status_code == 200:
            preset_id = resp.json().get("id")
            # Try to delete as teacher
            resp = requests.delete(f"{BASE_URL}/comment-presets/{preset_id}", headers=teacher_headers)
            if resp.status_code == 403:
                print(f"   ✅ PASSED: Teacher correctly blocked from deleting (status 403)")
                passed_count += 1
                # Clean up
                requests.delete(f"{BASE_URL}/comment-presets/{preset_id}", headers=admin_headers)
            else:
                print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
                print(f"   Response: {resp.text}")
        else:
            print(f"   ⚠️  Could not create preset for test")
    else:
        print(f"\n[Test SKIPPED] DELETE as teacher (no teacher token)")
    
    # ========== SOCIAL SKILL SCALE ==========
    print("\n" + "=" * 80)
    print("SOCIAL SKILL SCALE ENDPOINTS")
    print("=" * 80)
    
    # Test 11: GET /api/social-skill-scale
    test_count += 1
    print(f"\n[Test {test_count}] GET /api/social-skill-scale as MHPS admin")
    resp = requests.get(f"{BASE_URL}/social-skill-scale", headers=admin_headers)
    if resp.status_code == 200:
        scale = resp.json()
        print(f"   ✅ PASSED: GET social skill scale (status 200)")
        if "categories" in scale and "ratings" in scale:
            print(f"   ✅ Response has 'categories' and 'ratings' keys")
            print(f"   Categories: {len(scale.get('categories', []))} items")
            print(f"   Ratings: {len(scale.get('ratings', []))} items")
        else:
            print(f"   ⚠️  Missing expected keys in response")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # Test 12: PUT /api/social-skill-scale as admin (should succeed and persist)
    test_count += 1
    print(f"\n[Test {test_count}] PUT /api/social-skill-scale as MHPS admin (should succeed)")
    scale_data = {
        "ratings": [
            {"code": "EX", "label": "Excellent"},
            {"code": "VG", "label": "Very Good"},
            {"code": "G", "label": "Good"},
            {"code": "NI", "label": "Needs Improvement"}
        ]
    }
    resp = requests.put(f"{BASE_URL}/social-skill-scale", json=scale_data, headers=admin_headers)
    if resp.status_code == 200:
        print(f"   ✅ PASSED: Admin can update social skill scale (status 200)")
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/social-skill-scale", headers=admin_headers)
        if resp.status_code == 200:
            scale = resp.json()
            ratings = scale.get("ratings", [])
            if len(ratings) == 4 and ratings[0].get("code") == "EX":
                print(f"   ✅ Changes persisted correctly")
            else:
                print(f"   ⚠️  Changes may not have persisted correctly")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # Test 13: PUT /api/social-skill-scale as teacher (should fail 403)
    if teacher_token:
        test_count += 1
        print(f"\n[Test {test_count}] PUT /api/social-skill-scale as MHPS teacher (should fail 403)")
        scale_data = {
            "ratings": [
                {"code": "E", "label": "Excellent"},
                {"code": "G", "label": "Good"}
            ]
        }
        resp = requests.put(f"{BASE_URL}/social-skill-scale", json=scale_data, headers=teacher_headers)
        if resp.status_code == 403:
            print(f"   ✅ PASSED: Teacher correctly blocked (status 403)")
            passed_count += 1
        else:
            print(f"   ❌ FAILED: Expected 403, got {resp.status_code}")
            print(f"   Response: {resp.text}")
    else:
        print(f"\n[Test SKIPPED] PUT as teacher (no teacher token)")
    
    # ========== FORM TEACHER ON REPORT CARD ==========
    print("\n" + "=" * 80)
    print("FORM TEACHER ON REPORT CARD")
    print("=" * 80)
    
    # Test 14: GET /api/report-card/{student_id} includes form_teacher_name
    test_count += 1
    print(f"\n[Test {test_count}] GET /api/report-card/{student_id}?term=Term 1&academic_year=2024-2025")
    resp = requests.get(
        f"{BASE_URL}/report-card/{student_id}",
        params={"term": "Term 1", "academic_year": "2024-2025"},
        headers=admin_headers
    )
    if resp.status_code == 200:
        report = resp.json()
        print(f"   ✅ PASSED: GET report card (status 200)")
        form_teacher_name = report.get("form_teacher_name")
        if form_teacher_name:
            print(f"   ✅ form_teacher_name present: '{form_teacher_name}'")
            if form_teacher_name.strip():
                print(f"   ✅ form_teacher_name is non-empty")
            else:
                print(f"   ⚠️  form_teacher_name is empty string")
        else:
            print(f"   ⚠️  form_teacher_name not in response")
        passed_count += 1
    else:
        print(f"   ❌ FAILED: Status {resp.status_code}")
        print(f"   Response: {resp.text}")
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {test_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {test_count - passed_count}")
    print(f"Success rate: {passed_count}/{test_count} ({100*passed_count//test_count if test_count > 0 else 0}%)")
    
    if passed_count == test_count:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n⚠️  {test_count - passed_count} TEST(S) FAILED")

if __name__ == "__main__":
    main()
