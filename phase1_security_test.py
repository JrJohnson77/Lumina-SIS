#!/usr/bin/env python3
"""
Phase 1 Security Testing for Lumina-SIS
Tests items 1.1, 1.4, 1.6 and regression checks
"""

import requests
import json
import sys

# Base URL from frontend/.env
BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Test credentials
MHPS_ADMIN = {"school_code": "MHPS", "username": "admin", "password": "Admin@123"}
JTECH_SUPERUSER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(test_name, passed, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} - {test_name}")
    if details:
        print(f"  {details}")

def test_health_check():
    """Test 1.1: GET /api/health returns 200 (app started with JWT_SECRET)"""
    print(f"\n{YELLOW}=== Test 1.1: Health Check (JWT_SECRET set) ==={RESET}")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        passed = response.status_code == 200
        print_test("Health endpoint returns 200", passed, f"Status: {response.status_code}, Body: {response.text}")
        return passed
    except Exception as e:
        print_test("Health endpoint returns 200", False, f"Error: {str(e)}")
        return False

def test_login_enumeration_fix():
    """Test 1.4: Login enumeration fix - all invalid credentials return 'Invalid credentials'"""
    print(f"\n{YELLOW}=== Test 1.4: Login Enumeration Fix ==={RESET}")
    
    all_passed = True
    
    # Test 1: Unknown school code
    print("\n--- Test 1.4.1: Unknown school code ---")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"school_code": "NOPE", "username": "x", "password": "y"},
            timeout=10
        )
        passed = (response.status_code == 401 and 
                 response.json().get("detail") == "Invalid credentials")
        print_test(
            "Unknown school code returns 401 'Invalid credentials'",
            passed,
            f"Status: {response.status_code}, Detail: '{response.json().get('detail')}'"
        )
        all_passed = all_passed and passed
        
        # Verify it does NOT return "Invalid school code"
        if "Invalid school code" in response.json().get("detail", ""):
            print_test(
                "Does NOT return 'Invalid school code'",
                False,
                f"ERROR: Still returning 'Invalid school code'"
            )
            all_passed = False
        else:
            print_test("Does NOT return 'Invalid school code'", True)
            
    except Exception as e:
        print_test("Unknown school code test", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 2: Valid school, valid username, wrong password
    print("\n--- Test 1.4.2: Valid school, wrong password ---")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"school_code": "MHPS", "username": "admin", "password": "WRONGPASS"},
            timeout=10
        )
        passed = (response.status_code == 401 and 
                 response.json().get("detail") == "Invalid credentials")
        print_test(
            "Wrong password returns 401 'Invalid credentials'",
            passed,
            f"Status: {response.status_code}, Detail: '{response.json().get('detail')}'"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("Wrong password test", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 3: Valid MHPS admin login
    print("\n--- Test 1.4.3: Valid MHPS admin login ---")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=MHPS_ADMIN,
            timeout=10
        )
        passed = (response.status_code == 200 and 
                 "access_token" in response.json())
        print_test(
            "Valid MHPS admin login returns 200 with token",
            passed,
            f"Status: {response.status_code}, Has token: {'access_token' in response.json()}"
        )
        all_passed = all_passed and passed
        
        if passed:
            return all_passed, response.json()["access_token"]
    except Exception as e:
        print_test("Valid MHPS admin login", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 4: Valid JTECH superuser login
    print("\n--- Test 1.4.4: Valid JTECH superuser login ---")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=JTECH_SUPERUSER,
            timeout=10
        )
        passed = (response.status_code == 200 and 
                 "access_token" in response.json())
        print_test(
            "Valid JTECH superuser login returns 200 with token",
            passed,
            f"Status: {response.status_code}, Has token: {'access_token' in response.json()}"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("Valid JTECH superuser login", False, f"Error: {str(e)}")
        all_passed = False
    
    return all_passed, None

def get_auth_token(credentials):
    """Helper to get auth token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=credentials,
            timeout=10
        )
        if response.status_code == 200:
            return response.json()["access_token"]
    except:
        pass
    return None

def test_photo_upload_role_restriction():
    """Test 1.6: POST /api/upload/photo role restriction"""
    print(f"\n{YELLOW}=== Test 1.6: Photo Upload Role Restriction ==={RESET}")
    
    all_passed = True
    
    # First, get MHPS admin token
    admin_token = get_auth_token(MHPS_ADMIN)
    if not admin_token:
        print_test("Get MHPS admin token", False, "Failed to authenticate")
        return False
    
    # Test 1: Check if parent user exists, create if needed
    print("\n--- Test 1.6.1: Ensure parent user exists ---")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # Get all users
        response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        users = response.json() if response.status_code == 200 else []
        
        # Find a parent user
        parent_user = None
        for user in users:
            if user.get("role") == "parent":
                parent_user = user
                break
        
        # Create parent if doesn't exist
        if not parent_user:
            print("  Creating parent user...")
            parent_data = {
                "username": "test.parent.mhps",
                "password": "Parent@123",
                "role": "parent",
                "name": "Test Parent",
                "email": "test.parent@mhps.edu",
                "school_code": "MHPS"
            }
            response = requests.post(
                f"{BASE_URL}/users",
                headers=headers,
                json=parent_data,
                timeout=10
            )
            if response.status_code == 200:
                parent_user = response.json()
                print_test("Created parent user", True, f"Username: test.parent.mhps")
            else:
                print_test("Create parent user", False, f"Status: {response.status_code}, Detail: {response.json()}")
                all_passed = False
        else:
            print_test("Parent user exists", True, f"Username: {parent_user.get('username')}")
        
        # Test 2: Login as parent
        if parent_user:
            print("\n--- Test 1.6.2: Parent role blocked from photo upload ---")
            parent_credentials = {
                "school_code": "MHPS",
                "username": parent_user.get("username"),
                "password": "Parent@123"
            }
            parent_token = get_auth_token(parent_credentials)
            
            if parent_token:
                # Try to upload photo as parent (without file, should get 403 not 422)
                parent_headers = {"Authorization": f"Bearer {parent_token}"}
                response = requests.post(
                    f"{BASE_URL}/upload/photo",
                    headers=parent_headers,
                    timeout=10
                )
                passed = response.status_code == 403
                print_test(
                    "Parent user gets 403 on photo upload",
                    passed,
                    f"Status: {response.status_code}, Detail: {response.json().get('detail', 'N/A')}"
                )
                all_passed = all_passed and passed
            else:
                print_test("Login as parent", False, "Failed to get parent token")
                all_passed = False
        
        # Test 3: Admin/teacher/superuser should NOT get 403
        print("\n--- Test 1.6.3: Admin/teacher/superuser allowed (not 403) ---")
        
        # Test admin (missing file may return 422, but NOT 403)
        response = requests.post(
            f"{BASE_URL}/upload/photo",
            headers=headers,
            timeout=10
        )
        passed = response.status_code != 403
        print_test(
            "Admin does NOT get 403 on photo upload",
            passed,
            f"Status: {response.status_code} (422 for missing file is acceptable)"
        )
        all_passed = all_passed and passed
        
    except Exception as e:
        print_test("Photo upload role restriction test", False, f"Error: {str(e)}")
        all_passed = False
    
    return all_passed

def test_regression_checks(admin_token):
    """Regression: Verify core endpoints still work for MHPS admin"""
    print(f"\n{YELLOW}=== Regression Tests: Core Endpoints ==={RESET}")
    
    all_passed = True
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test 1: GET /api/students
    print("\n--- Regression 1: GET /api/students ---")
    try:
        response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
        passed = response.status_code == 200
        print_test(
            "GET /api/students returns 200",
            passed,
            f"Status: {response.status_code}, Count: {len(response.json()) if passed else 'N/A'}"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("GET /api/students", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 2: GET /api/classes
    print("\n--- Regression 2: GET /api/classes ---")
    try:
        response = requests.get(f"{BASE_URL}/classes", headers=headers, timeout=10)
        passed = response.status_code == 200
        print_test(
            "GET /api/classes returns 200",
            passed,
            f"Status: {response.status_code}, Count: {len(response.json()) if passed else 'N/A'}"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("GET /api/classes", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 3: GET /api/gradebook (or list form)
    print("\n--- Regression 3: GET /api/gradebook ---")
    try:
        # Try to get a student first
        students_response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
        if students_response.status_code == 200 and len(students_response.json()) > 0:
            student_id = students_response.json()[0]["id"]
            response = requests.get(
                f"{BASE_URL}/gradebook?student_id={student_id}&term=Term 1&academic_year=2024-2025",
                headers=headers,
                timeout=10
            )
            passed = response.status_code == 200
            print_test(
                "GET /api/gradebook?student_id=... returns 200",
                passed,
                f"Status: {response.status_code}, Count: {len(response.json()) if passed else 'N/A'}"
            )
            all_passed = all_passed and passed
        else:
            print_test("GET /api/gradebook", False, "No students found to test")
            all_passed = False
    except Exception as e:
        print_test("GET /api/gradebook", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 4: GET /api/mhps/report-template
    print("\n--- Regression 4: GET /api/mhps/report-template ---")
    try:
        response = requests.get(f"{BASE_URL}/mhps/report-template", headers=headers, timeout=10)
        passed = response.status_code == 200
        print_test(
            "GET /api/mhps/report-template returns 200",
            passed,
            f"Status: {response.status_code}"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("GET /api/mhps/report-template", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 5: GET /api/comment-presets
    print("\n--- Regression 5: GET /api/comment-presets ---")
    try:
        response = requests.get(f"{BASE_URL}/comment-presets", headers=headers, timeout=10)
        passed = response.status_code == 200
        print_test(
            "GET /api/comment-presets returns 200",
            passed,
            f"Status: {response.status_code}, Count: {len(response.json()) if passed else 'N/A'}"
        )
        all_passed = all_passed and passed
    except Exception as e:
        print_test("GET /api/comment-presets", False, f"Error: {str(e)}")
        all_passed = False
    
    # Test 6: POST /api/teacher-comments
    print("\n--- Regression 6: POST /api/teacher-comments ---")
    try:
        # Get a student first
        students_response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
        if students_response.status_code == 200 and len(students_response.json()) > 0:
            student_id = students_response.json()[0]["id"]
            comment_data = {
                "student_id": student_id,
                "term": "Term 1",
                "academic_year": "2024-2025",
                "comment": "Regression test comment"
            }
            response = requests.post(
                f"{BASE_URL}/teacher-comments",
                headers=headers,
                json=comment_data,
                timeout=10
            )
            passed = response.status_code == 200
            print_test(
                "POST /api/teacher-comments returns 200",
                passed,
                f"Status: {response.status_code}"
            )
            all_passed = all_passed and passed
        else:
            print_test("POST /api/teacher-comments", False, "No students found to test")
            all_passed = False
    except Exception as e:
        print_test("POST /api/teacher-comments", False, f"Error: {str(e)}")
        all_passed = False
    
    return all_passed

def main():
    print(f"\n{YELLOW}{'='*70}{RESET}")
    print(f"{YELLOW}Phase 1 Security Testing - Lumina-SIS Backend{RESET}")
    print(f"{YELLOW}{'='*70}{RESET}")
    
    results = {}
    
    # Test 1.1: Health check
    results["health_check"] = test_health_check()
    
    # Test 1.4: Login enumeration fix
    login_result, admin_token = test_login_enumeration_fix()
    results["login_enumeration"] = login_result
    
    # Get admin token if not already obtained
    if not admin_token:
        admin_token = get_auth_token(MHPS_ADMIN)
    
    if admin_token:
        # Test 1.6: Photo upload role restriction
        results["photo_upload_restriction"] = test_photo_upload_role_restriction()
        
        # Regression tests
        results["regression_checks"] = test_regression_checks(admin_token)
    else:
        print(f"\n{RED}ERROR: Could not obtain admin token for remaining tests{RESET}")
        results["photo_upload_restriction"] = False
        results["regression_checks"] = False
    
    # Summary
    print(f"\n{YELLOW}{'='*70}{RESET}")
    print(f"{YELLOW}SUMMARY{RESET}")
    print(f"{YELLOW}{'='*70}{RESET}")
    
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    
    for test_name, passed in results.items():
        status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{YELLOW}Total: {passed_tests}/{total_tests} test groups passed{RESET}")
    
    if passed_tests == total_tests:
        print(f"\n{GREEN}✓ ALL PHASE 1 SECURITY TESTS PASSED{RESET}")
        return 0
    else:
        print(f"\n{RED}✗ SOME TESTS FAILED{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
