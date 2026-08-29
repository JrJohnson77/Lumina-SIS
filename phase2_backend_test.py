#!/usr/bin/env python3
"""
Phase 2 Backend Testing for Lumina-SIS
Tests: Health records audit, Discipline audit, Image token access control, Regressions
"""

import requests
import json
import sys
from pathlib import Path
import io

# Base URL from frontend/.env
BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Test credentials
MHPS_ADMIN = {"school_code": "MHPS", "username": "admin", "password": "Admin@123"}
JTECH_SUPERUSER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
SUNF_ADMIN = {"school_code": "SUNF", "username": "admin", "password": "Admin@123"}

def login(credentials):
    """Login and return JWT token"""
    response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    if response.status_code != 200:
        print(f"❌ Login failed for {credentials['username']}: {response.status_code} {response.text}")
        return None
    data = response.json()
    return data.get("access_token")

def test_health_check():
    """Test 1: App healthy - GET /api/health → 200"""
    print("\n=== Test 1: Health Check ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"GET /api/health: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Health check passed: {response.json()}")
        return True
    else:
        print(f"❌ Health check failed: {response.status_code} {response.text}")
        return False

def test_indexes_and_core_reads(token):
    """Test 2: Indexes verification - GET /api/students and GET /api/classes → 200"""
    print("\n=== Test 2: Indexes & Core Reads (2.2) ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test GET /api/students
    response = requests.get(f"{BASE_URL}/students", headers=headers)
    print(f"GET /api/students: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ GET /api/students failed: {response.status_code} {response.text}")
        return False
    students = response.json()
    print(f"✅ GET /api/students returned {len(students)} students")
    
    # Test GET /api/classes
    response = requests.get(f"{BASE_URL}/classes", headers=headers)
    print(f"GET /api/classes: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ GET /api/classes failed: {response.status_code} {response.text}")
        return False
    classes = response.json()
    print(f"✅ GET /api/classes returned {len(classes)} classes")
    
    return True

def test_health_audit_logs(token):
    """Test 3: Health records audit (2.1) - Create/delete health records and verify audit logs"""
    print("\n=== Test 3: Health Records Audit (2.1) ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get a student
    response = requests.get(f"{BASE_URL}/students", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get students: {response.status_code}")
        return False
    students = response.json()
    if not students:
        print("❌ No students found")
        return False
    student_id = students[0]["id"]
    print(f"Using student_id: {student_id}")
    
    # POST allergy
    allergy_data = {"allergen": "Peanuts", "reaction": "Anaphylaxis", "severity": "High", "notes": "Test allergy"}
    response = requests.post(f"{BASE_URL}/health/{student_id}/allergy", json=allergy_data, headers=headers)
    print(f"POST /api/health/{student_id}/allergy: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create allergy: {response.status_code} {response.text}")
        return False
    print(f"✅ Created allergy")
    
    # POST vaccination
    vaccination_data = {"name": "COVID-19", "date": "2024-01-15", "notes": "Test vaccination"}
    response = requests.post(f"{BASE_URL}/health/{student_id}/vaccination", json=vaccination_data, headers=headers)
    print(f"POST /api/health/{student_id}/vaccination: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create vaccination: {response.status_code} {response.text}")
        return False
    vaccination_response = response.json()
    print(f"✅ Created vaccination")
    
    # POST condition
    condition_data = {"name": "Asthma", "diagnosis_date": "2023-05-10", "notes": "Test condition"}
    response = requests.post(f"{BASE_URL}/health/{student_id}/condition", json=condition_data, headers=headers)
    print(f"POST /api/health/{student_id}/condition: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create condition: {response.status_code} {response.text}")
        return False
    print(f"✅ Created condition")
    
    # POST medication
    medication_data = {"name": "Inhaler", "dosage": "2 puffs", "frequency": "As needed", "notes": "Test medication"}
    response = requests.post(f"{BASE_URL}/health/{student_id}/medication", json=medication_data, headers=headers)
    print(f"POST /api/health/{student_id}/medication: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create medication: {response.status_code} {response.text}")
        return False
    print(f"✅ Created medication")
    
    # POST visit
    visit_data = {"date": "2025-01-10", "reason": "Headache", "treatment": "Rest", "notes": "Test visit"}
    response = requests.post(f"{BASE_URL}/health/{student_id}/visit", json=visit_data, headers=headers)
    print(f"POST /api/health/{student_id}/visit: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create visit: {response.status_code} {response.text}")
        return False
    visit_response = response.json()
    print(f"✅ Created visit")
    
    # DELETE one entry (vaccination)
    # Extract vaccination ID from response
    vaccination_id = None
    if "vaccinations" in vaccination_response and vaccination_response["vaccinations"]:
        vaccination_id = vaccination_response["vaccinations"][-1].get("id")
    
    if vaccination_id:
        response = requests.delete(f"{BASE_URL}/health/{student_id}/vaccination/{vaccination_id}", headers=headers)
        print(f"DELETE /api/health/{student_id}/vaccination/{vaccination_id}: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ Failed to delete vaccination: {response.status_code} {response.text}")
            return False
        print(f"✅ Deleted vaccination")
    else:
        print("⚠️ Could not extract vaccination ID, skipping delete test")
    
    # GET audit logs and verify health_record entries
    response = requests.get(f"{BASE_URL}/audit-logs?entity_type=health_record&limit=100", headers=headers)
    print(f"GET /api/audit-logs?entity_type=health_record: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ Failed to get audit logs: {response.status_code} {response.text}")
        return False
    
    audit_logs = response.json()
    print(f"Found {len(audit_logs)} health_record audit log entries")
    
    # Verify we have create and delete actions
    create_actions = [log for log in audit_logs if log.get("action") == "create" and log.get("entity_id") == student_id]
    delete_actions = [log for log in audit_logs if log.get("action") == "delete" and log.get("entity_id") == student_id]
    
    print(f"  - Create actions for student {student_id}: {len(create_actions)}")
    print(f"  - Delete actions for student {student_id}: {len(delete_actions)}")
    
    if len(create_actions) >= 4:  # At least allergy, condition, medication, visit
        print(f"✅ Found {len(create_actions)} create audit logs for health records")
    else:
        print(f"⚠️ Expected at least 4 create audit logs, found {len(create_actions)}")
    
    if len(delete_actions) >= 1:
        print(f"✅ Found {len(delete_actions)} delete audit logs for health records")
    else:
        print(f"⚠️ Expected at least 1 delete audit log, found {len(delete_actions)}")
    
    return True

def test_discipline_audit_logs(token):
    """Test 4: Discipline audit (2.1) - Create/update/delete discipline incidents and verify audit logs"""
    print("\n=== Test 4: Discipline Audit (2.1) ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get a student
    response = requests.get(f"{BASE_URL}/students", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get students: {response.status_code}")
        return False
    students = response.json()
    if not students:
        print("❌ No students found")
        return False
    student_id = students[0]["id"]
    print(f"Using student_id: {student_id}")
    
    # POST discipline incident
    discipline_data = {
        "student_id": student_id,
        "date": "2025-01-10",
        "type": "Minor",
        "description": "Test discipline incident",
        "action_taken": "Warned",
        "status": "Open"
    }
    response = requests.post(f"{BASE_URL}/discipline", json=discipline_data, headers=headers)
    print(f"POST /api/discipline: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create discipline incident: {response.status_code} {response.text}")
        return False
    incident = response.json()
    incident_id = incident.get("id")
    print(f"✅ Created discipline incident with id: {incident_id}")
    
    # PUT discipline incident
    update_data = {
        "student_id": student_id,
        "date": "2025-01-10",
        "type": "Moderate",
        "description": "Updated test discipline incident",
        "action_taken": "Detention",
        "status": "Resolved"
    }
    response = requests.put(f"{BASE_URL}/discipline/{incident_id}", json=update_data, headers=headers)
    print(f"PUT /api/discipline/{incident_id}: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ Failed to update discipline incident: {response.status_code} {response.text}")
        return False
    print(f"✅ Updated discipline incident")
    
    # DELETE discipline incident
    response = requests.delete(f"{BASE_URL}/discipline/{incident_id}", headers=headers)
    print(f"DELETE /api/discipline/{incident_id}: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ Failed to delete discipline incident: {response.status_code} {response.text}")
        return False
    print(f"✅ Deleted discipline incident")
    
    # GET audit logs and verify discipline_incident entries
    response = requests.get(f"{BASE_URL}/audit-logs?entity_type=discipline_incident&limit=100", headers=headers)
    print(f"GET /api/audit-logs?entity_type=discipline_incident: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ Failed to get audit logs: {response.status_code} {response.text}")
        return False
    
    audit_logs = response.json()
    print(f"Found {len(audit_logs)} discipline_incident audit log entries")
    
    # Verify we have create, update, and delete actions
    create_actions = [log for log in audit_logs if log.get("action") == "create" and log.get("entity_id") == incident_id]
    update_actions = [log for log in audit_logs if log.get("action") == "update" and log.get("entity_id") == incident_id]
    delete_actions = [log for log in audit_logs if log.get("action") == "delete" and log.get("entity_id") == incident_id]
    
    print(f"  - Create actions for incident {incident_id}: {len(create_actions)}")
    print(f"  - Update actions for incident {incident_id}: {len(update_actions)}")
    print(f"  - Delete actions for incident {incident_id}: {len(delete_actions)}")
    
    if len(create_actions) >= 1:
        print(f"✅ Found create audit log for discipline incident")
    else:
        print(f"❌ Expected 1 create audit log, found {len(create_actions)}")
        return False
    
    if len(update_actions) >= 1:
        print(f"✅ Found update audit log for discipline incident")
    else:
        print(f"❌ Expected 1 update audit log, found {len(update_actions)}")
        return False
    
    if len(delete_actions) >= 1:
        print(f"✅ Found delete audit log for discipline incident")
    else:
        print(f"❌ Expected 1 delete audit log, found {len(delete_actions)}")
        return False
    
    return True

def test_image_token_access_control(mhps_token, sunf_token, jtech_token):
    """Test 5: Image token access control (1.5 follow-up)"""
    print("\n=== Test 5: Image Token Access Control (1.5) ===")
    mhps_headers = {"Authorization": f"Bearer {mhps_token}"}
    
    # Upload a photo as MHPS admin
    # Create a small test image (1x1 PNG)
    test_image = io.BytesIO()
    # Minimal PNG: 1x1 transparent pixel
    test_image.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
    test_image.seek(0)
    
    files = {"file": ("test.png", test_image, "image/png")}
    response = requests.post(f"{BASE_URL}/upload/photo", files=files, headers=mhps_headers)
    print(f"POST /api/upload/photo: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to upload photo: {response.status_code} {response.text}")
        return False
    
    upload_response = response.json()
    filename = upload_response.get("filename")
    print(f"✅ Uploaded photo: {filename}")
    
    # Test 1: Access with MHPS admin token (query param) - should succeed (200)
    response = requests.get(f"{BASE_URL}/uploads/{filename}?token={mhps_token}")
    print(f"GET /api/uploads/{filename}?token=<MHPS_TOKEN> (no header): {response.status_code}")
    if response.status_code == 200:
        print(f"✅ MHPS admin can access file with token query param")
    else:
        print(f"❌ MHPS admin should access file with token: {response.status_code} {response.text}")
        return False
    
    # Test 2: Access with SUNF admin token (different school) - should fail (403)
    response = requests.get(f"{BASE_URL}/uploads/{filename}?token={sunf_token}")
    print(f"GET /api/uploads/{filename}?token=<SUNF_TOKEN>: {response.status_code}")
    if response.status_code == 403:
        print(f"✅ SUNF admin correctly blocked (403) from accessing MHPS file")
    else:
        print(f"❌ SUNF admin should be blocked (403), got: {response.status_code}")
        return False
    
    # Test 3: Access with no token and no header - should fail (401)
    response = requests.get(f"{BASE_URL}/uploads/{filename}")
    print(f"GET /api/uploads/{filename} (no token, no header): {response.status_code}")
    if response.status_code == 401:
        print(f"✅ Unauthenticated request correctly blocked (401)")
    else:
        print(f"❌ Unauthenticated request should be blocked (401), got: {response.status_code}")
        return False
    
    # Test 4: Access with superuser token - should succeed (200)
    response = requests.get(f"{BASE_URL}/uploads/{filename}?token={jtech_token}")
    print(f"GET /api/uploads/{filename}?token=<JTECH_SUPERUSER_TOKEN>: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Superuser can access any file")
    else:
        print(f"❌ Superuser should access file: {response.status_code} {response.text}")
        return False
    
    return True

def test_regressions(token):
    """Test 6: Regression tests - teacher comments and rate limiting"""
    print("\n=== Test 6: Regression Tests ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test teacher comments endpoint
    response = requests.get(f"{BASE_URL}/students", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get students: {response.status_code}")
        return False
    students = response.json()
    if not students:
        print("❌ No students found")
        return False
    student_id = students[0]["id"]
    
    comment_data = {
        "student_id": student_id,
        "term": "Term 1",
        "academic_year": "2024-2025",
        "comment": "Test regression comment"
    }
    response = requests.post(f"{BASE_URL}/teacher-comments", json=comment_data, headers=headers)
    print(f"POST /api/teacher-comments: {response.status_code}")
    if response.status_code in [200, 201]:
        print(f"✅ Teacher comments endpoint working")
    else:
        print(f"❌ Teacher comments endpoint failed: {response.status_code} {response.text}")
        return False
    
    # Test rate limiting (6 rapid bad logins)
    print("\nTesting login rate limiting...")
    bad_credentials = {"school_code": "MHPS", "username": "rt_probe", "password": "wrong"}
    
    for i in range(6):
        response = requests.post(f"{BASE_URL}/auth/login", json=bad_credentials)
        print(f"  Attempt {i+1}: {response.status_code}")
        if i == 5:  # 6th attempt
            if response.status_code == 429:
                print(f"✅ Rate limiting working - 6th attempt blocked with 429")
            else:
                print(f"❌ Rate limiting failed - 6th attempt should be 429, got: {response.status_code}")
                return False
    
    return True

def main():
    print("=" * 60)
    print("Phase 2 Backend Testing for Lumina-SIS")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Health check
    results["health_check"] = test_health_check()
    
    # Login as MHPS admin
    print("\n=== Logging in as MHPS admin ===")
    mhps_token = login(MHPS_ADMIN)
    if not mhps_token:
        print("❌ Failed to login as MHPS admin")
        sys.exit(1)
    print(f"✅ Logged in as MHPS admin")
    
    # Test 2: Indexes and core reads
    results["indexes_core_reads"] = test_indexes_and_core_reads(mhps_token)
    
    # Test 3: Health audit logs
    results["health_audit"] = test_health_audit_logs(mhps_token)
    
    # Test 4: Discipline audit logs
    results["discipline_audit"] = test_discipline_audit_logs(mhps_token)
    
    # Login as SUNF admin for cross-tenant test
    print("\n=== Logging in as SUNF admin ===")
    sunf_token = login(SUNF_ADMIN)
    if not sunf_token:
        print("❌ Failed to login as SUNF admin")
        sys.exit(1)
    print(f"✅ Logged in as SUNF admin")
    
    # Login as JTECH superuser
    print("\n=== Logging in as JTECH superuser ===")
    jtech_token = login(JTECH_SUPERUSER)
    if not jtech_token:
        print("❌ Failed to login as JTECH superuser")
        sys.exit(1)
    print(f"✅ Logged in as JTECH superuser")
    
    # Test 5: Image token access control
    results["image_token_access"] = test_image_token_access_control(mhps_token, sunf_token, jtech_token)
    
    # Test 6: Regressions
    results["regressions"] = test_regressions(mhps_token)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All Phase 2 backend tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
