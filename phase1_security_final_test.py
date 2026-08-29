#!/usr/bin/env python3
"""
Phase 1 Security Testing - Items 1.3, 1.5, 1.7 + Regression
Tests login rate limiting, upload auth + tenant scoping, centralized tenant checks
"""

import requests
import time
import io
from PIL import Image

# Base URL from frontend/.env
BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Test credentials
MHPS_ADMIN = {"school_code": "MHPS", "username": "admin", "password": "Admin@123"}
SUNF_ADMIN = {"school_code": "SUNF", "username": "admin", "password": "Admin@123"}
JTECH_SUPERUSER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}

def login(credentials):
    """Helper to login and return token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def create_test_image():
    """Create a small test image in memory"""
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

print("=" * 80)
print("PHASE 1 SECURITY TESTING - Items 1.3, 1.5, 1.7 + Regression")
print("=" * 80)

# Get auth tokens
print("\n🔐 Authenticating test users...")
mhps_token = login(MHPS_ADMIN)
sunf_token = login(SUNF_ADMIN)
jtech_token = login(JTECH_SUPERUSER)

if not mhps_token:
    print("❌ CRITICAL: Failed to authenticate MHPS admin")
    exit(1)
if not sunf_token:
    print("❌ CRITICAL: Failed to authenticate SUNF admin")
    exit(1)
if not jtech_token:
    print("❌ CRITICAL: Failed to authenticate JTECH superuser")
    exit(1)

print("✅ All test users authenticated successfully")

# Get school IDs for tenant check tests
print("\n📋 Fetching school IDs...")
mhps_headers = {"Authorization": f"Bearer {mhps_token}"}
sunf_headers = {"Authorization": f"Bearer {sunf_token}"}
jtech_headers = {"Authorization": f"Bearer {jtech_token}"}

schools_response = requests.get(f"{BASE_URL}/schools", headers=jtech_headers)
schools = schools_response.json()
mhps_school_id = next((s["id"] for s in schools if s["school_code"] == "MHPS"), None)
sunf_school_id = next((s["id"] for s in schools if s["school_code"] == "SUNF"), None)

print(f"   MHPS school ID: {mhps_school_id}")
print(f"   SUNF school ID: {sunf_school_id}")

# ============================================================================
# TEST 1.3: LOGIN RATE LIMIT + AUDIT
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1.3: LOGIN RATE LIMIT + AUDIT")
print("=" * 80)

test_count = 0
passed_count = 0

# Test 1.3.1: Send 6 rapid login attempts with bad password for username "ratetest"
print("\n📝 Test 1.3.1: 6 rapid login attempts with bad password for 'ratetest'")
rate_limit_results = []
for i in range(6):
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "school_code": "MHPS",
        "username": "ratetest",
        "password": "badpassword"
    })
    rate_limit_results.append({
        "attempt": i + 1,
        "status": response.status_code,
        "detail": response.json().get("detail", "") if response.status_code != 200 else ""
    })
    time.sleep(0.1)  # Small delay to ensure sequential processing

test_count += 1
first_5_correct = all(r["status"] == 401 and r["detail"] == "Invalid credentials" for r in rate_limit_results[:5])
sixth_is_429 = rate_limit_results[5]["status"] == 429

if first_5_correct and sixth_is_429:
    print(f"   ✅ PASS: First 5 attempts returned 401 'Invalid credentials', 6th returned 429")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Rate limit not working correctly")
    for r in rate_limit_results:
        print(f"      Attempt {r['attempt']}: {r['status']} - {r['detail']}")

# Test 1.3.2: Verify different username has its own counter
print("\n📝 Test 1.3.2: Different username 'ratetest2' has its own counter")
test_count += 1
response = requests.post(f"{BASE_URL}/auth/login", json={
    "school_code": "MHPS",
    "username": "ratetest2",
    "password": "badpassword"
})

if response.status_code == 401 and response.json().get("detail") == "Invalid credentials":
    print(f"   ✅ PASS: Different username not blocked (has own counter)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Different username blocked or wrong response: {response.status_code} - {response.json()}")

# Test 1.3.3: Verify audit log entry exists
print("\n📝 Test 1.3.3: Audit log entry with action='login_fail' exists")
test_count += 1
audit_response = requests.get(f"{BASE_URL}/audit-logs", headers=mhps_headers)

if audit_response.status_code == 200:
    audit_logs = audit_response.json()
    login_fail_entries = [log for log in audit_logs if log.get("action") == "login_fail"]
    
    if login_fail_entries:
        print(f"   ✅ PASS: Found {len(login_fail_entries)} audit entries with action='login_fail'")
        # Show a sample
        sample = login_fail_entries[0]
        print(f"      Sample: action={sample.get('action')}, entity_type={sample.get('entity_type')}, user={sample.get('user')}")
        passed_count += 1
    else:
        print(f"   ❌ FAIL: No audit entries with action='login_fail' found")
else:
    print(f"   ❌ FAIL: Failed to fetch audit logs: {audit_response.status_code}")

print(f"\n📊 Test 1.3 Summary: {passed_count}/{test_count} tests passed")

# ============================================================================
# TEST 1.5: UPLOAD AUTH + TENANT SCOPING
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1.5: UPLOAD AUTH + TENANT SCOPING")
print("=" * 80)

test_count = 0
passed_count = 0

# Test 1.5.1: GET /api/uploads/somefile.png without auth → 401/403
print("\n📝 Test 1.5.1: GET /api/uploads/somefile.png without Authorization header")
test_count += 1
response = requests.get(f"{BASE_URL}/uploads/somefile.png")

if response.status_code in [401, 403]:
    print(f"   ✅ PASS: Unauthenticated request blocked ({response.status_code})")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 401/403, got {response.status_code}")

# Test 1.5.2: As MHPS admin, POST /api/upload/photo with image → returns filename
print("\n📝 Test 1.5.2: MHPS admin uploads photo via POST /api/upload/photo")
test_count += 1
test_image = create_test_image()
files = {"file": ("test_image.png", test_image, "image/png")}
upload_response = requests.post(f"{BASE_URL}/upload/photo", headers=mhps_headers, files=files)

uploaded_filename = None
if upload_response.status_code == 200:
    uploaded_filename = upload_response.json().get("filename")
    print(f"   ✅ PASS: Photo uploaded successfully, filename: {uploaded_filename}")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Upload failed: {upload_response.status_code} - {upload_response.text}")

# Test 1.5.3: GET that file as MHPS admin → 200
if uploaded_filename:
    print("\n📝 Test 1.5.3: GET uploaded file as MHPS admin (same tenant)")
    test_count += 1
    response = requests.get(f"{BASE_URL}/uploads/{uploaded_filename}", headers=mhps_headers)
    
    if response.status_code == 200:
        print(f"   ✅ PASS: MHPS admin can access their own uploaded file (200)")
        passed_count += 1
    else:
        print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

    # Test 1.5.4: GET that file as SUNF admin (different tenant) → 403
    print("\n📝 Test 1.5.4: GET MHPS file as SUNF admin (different tenant)")
    test_count += 1
    response = requests.get(f"{BASE_URL}/uploads/{uploaded_filename}", headers=sunf_headers)
    
    if response.status_code == 403:
        print(f"   ✅ PASS: SUNF admin blocked from accessing MHPS file (403)")
        passed_count += 1
    else:
        print(f"   ❌ FAIL: Expected 403, got {response.status_code}")

    # Test 1.5.5: GET that file as JTECH superuser → 200
    print("\n📝 Test 1.5.5: GET MHPS file as JTECH superuser")
    test_count += 1
    response = requests.get(f"{BASE_URL}/uploads/{uploaded_filename}", headers=jtech_headers)
    
    if response.status_code == 200:
        print(f"   ✅ PASS: Superuser can access any tenant's file (200)")
        passed_count += 1
    else:
        print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test 1.5.6: GET legacy UNASSIGNED_LEGACY file (skip if can't find one)
print("\n📝 Test 1.5.6: GET legacy UNASSIGNED_LEGACY file (if exists)")
print("   ℹ️  SKIPPED: Cannot discover legacy files via API (as expected)")

# Test 1.5.7: GET non-existent file → 404
print("\n📝 Test 1.5.7: GET non-existent file")
test_count += 1
response = requests.get(f"{BASE_URL}/uploads/does-not-exist.png", headers=mhps_headers)

if response.status_code == 404:
    print(f"   ✅ PASS: Non-existent file returns 404")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 404, got {response.status_code}")

print(f"\n📊 Test 1.5 Summary: {passed_count}/{test_count} tests passed")

# ============================================================================
# TEST 1.7: CENTRALIZED TENANT CHECK
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1.7: CENTRALIZED TENANT CHECK (UNCHANGED)")
print("=" * 80)

test_count = 0
passed_count = 0

# Test 1.7.1: MHPS admin GET /api/report-templates/SUNF → 403
print("\n📝 Test 1.7.1: MHPS admin GET /api/report-templates/SUNF (cross-tenant)")
test_count += 1
response = requests.get(f"{BASE_URL}/report-templates/SUNF", headers=mhps_headers)

if response.status_code == 403:
    print(f"   ✅ PASS: MHPS admin blocked from SUNF report template (403)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 403, got {response.status_code}")

# Test 1.7.2: MHPS admin GET /api/report-templates/MHPS → 200
print("\n📝 Test 1.7.2: MHPS admin GET /api/report-templates/MHPS (same tenant)")
test_count += 1
response = requests.get(f"{BASE_URL}/report-templates/MHPS", headers=mhps_headers)

if response.status_code == 200:
    print(f"   ✅ PASS: MHPS admin can access own report template (200)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test 1.7.3: MHPS admin GET /api/schools/{SUNF id} → 403
print("\n📝 Test 1.7.3: MHPS admin GET /api/schools/{SUNF id} (cross-tenant)")
test_count += 1
response = requests.get(f"{BASE_URL}/schools/{sunf_school_id}", headers=mhps_headers)

if response.status_code == 403:
    print(f"   ✅ PASS: MHPS admin blocked from SUNF school details (403)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 403, got {response.status_code}")

# Test 1.7.4: MHPS admin GET /api/schools/{MHPS id} → 200
print("\n📝 Test 1.7.4: MHPS admin GET /api/schools/{MHPS id} (same tenant)")
test_count += 1
response = requests.get(f"{BASE_URL}/schools/{mhps_school_id}", headers=mhps_headers)

if response.status_code == 200:
    print(f"   ✅ PASS: MHPS admin can access own school details (200)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test 1.7.5: Superuser can access both
print("\n📝 Test 1.7.5: JTECH superuser can access both MHPS and SUNF resources")
test_count += 1
mhps_response = requests.get(f"{BASE_URL}/report-templates/MHPS", headers=jtech_headers)
sunf_response = requests.get(f"{BASE_URL}/report-templates/SUNF", headers=jtech_headers)

if mhps_response.status_code == 200 and sunf_response.status_code == 200:
    print(f"   ✅ PASS: Superuser can access both MHPS and SUNF report templates (200)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Superuser access failed - MHPS: {mhps_response.status_code}, SUNF: {sunf_response.status_code}")

print(f"\n📊 Test 1.7 Summary: {passed_count}/{test_count} tests passed")

# ============================================================================
# REGRESSION TESTS
# ============================================================================
print("\n" + "=" * 80)
print("REGRESSION TESTS")
print("=" * 80)

test_count = 0
passed_count = 0

# Test R1: GET /api/health → 200
print("\n📝 Test R1: GET /api/health")
test_count += 1
response = requests.get(f"{BASE_URL}/health")

if response.status_code == 200:
    print(f"   ✅ PASS: Health check returns 200")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test R2: MHPS admin GET /api/students → 200
print("\n📝 Test R2: MHPS admin GET /api/students")
test_count += 1
response = requests.get(f"{BASE_URL}/students", headers=mhps_headers)

if response.status_code == 200:
    students = response.json()
    print(f"   ✅ PASS: Students endpoint returns 200 ({len(students)} students)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test R3: MHPS admin GET /api/classes → 200
print("\n📝 Test R3: MHPS admin GET /api/classes")
test_count += 1
response = requests.get(f"{BASE_URL}/classes", headers=mhps_headers)

if response.status_code == 200:
    classes = response.json()
    print(f"   ✅ PASS: Classes endpoint returns 200 ({len(classes)} classes)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test R4: MHPS admin GET /api/schools → 200
print("\n📝 Test R4: MHPS admin GET /api/schools")
test_count += 1
response = requests.get(f"{BASE_URL}/schools", headers=mhps_headers)

if response.status_code == 200:
    schools = response.json()
    print(f"   ✅ PASS: Schools endpoint returns 200 ({len(schools)} schools)")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test R5: MHPS admin GET /api/mhps/report-template → 200
print("\n📝 Test R5: MHPS admin GET /api/mhps/report-template")
test_count += 1
response = requests.get(f"{BASE_URL}/mhps/report-template", headers=mhps_headers)

if response.status_code == 200:
    print(f"   ✅ PASS: MHPS report template endpoint returns 200")
    passed_count += 1
else:
    print(f"   ❌ FAIL: Expected 200, got {response.status_code}")

# Test R6: MHPS admin POST /api/teacher-comments → 200
print("\n📝 Test R6: MHPS admin POST /api/teacher-comments")
test_count += 1

# Get a student ID first
students_response = requests.get(f"{BASE_URL}/students", headers=mhps_headers)
if students_response.status_code == 200:
    students = students_response.json()
    if students:
        student_id = students[0]["id"]
        
        comment_data = {
            "student_id": student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "Regression test comment"
        }
        
        response = requests.post(f"{BASE_URL}/teacher-comments", headers=mhps_headers, json=comment_data)
        
        if response.status_code == 200:
            print(f"   ✅ PASS: Teacher comments endpoint returns 200")
            passed_count += 1
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}")
    else:
        print(f"   ⚠️  SKIP: No students found for testing")
else:
    print(f"   ⚠️  SKIP: Could not fetch students for testing")

print(f"\n📊 Regression Summary: {passed_count}/{test_count} tests passed")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("FINAL SUMMARY")
print("=" * 80)
print(f"✅ All Phase 1 security items (1.3, 1.5, 1.7) and regression tests completed")
print(f"📝 Test results saved to this output")
print("=" * 80)
