#!/usr/bin/env python3
"""
Backend API Testing for Lumina-SIS
Tests PUT /api/users/{user_id} endpoint and regression tests for PUT /api/students/{student_id}
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# API base URL from frontend configuration
BASE_URL = "https://github-refresh-4.preview.emergentagent.com/api"

# Test credentials
SUNF_ADMIN = {
    "school_code": "SUNF",
    "username": "admin",
    "password": "Admin@123"
}

JTECH_SUPERUSER = {
    "school_code": "JTECH",
    "username": "jtech.innovations@outlook.com",
    "password": "Xekleidoma@1"
}

class APITester:
    def __init__(self):
        self.sunf_token = None
        self.jtech_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        if not success:
            print(f"   Details: {response_data}")
    
    def login(self, credentials: Dict[str, str]) -> Optional[str]:
        """Login and get access token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=credentials, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    return data["access_token"]
                else:
                    print(f"❌ No access token in response for {credentials['username']}")
                    return None
            else:
                print(f"❌ Login failed for {credentials['username']}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Login exception for {credentials['username']}: {str(e)}")
            return None

    def test_setup_authentication(self):
        """Setup: Authenticate both SUNF admin and JTECH superuser"""
        print("=== SETUP: Authentication ===")
        
        print("1. Authenticating SUNF admin...")
        self.sunf_token = self.login(SUNF_ADMIN)
        if self.sunf_token:
            self.log_test("SUNF Admin Login", True, "Successfully authenticated")
        else:
            self.log_test("SUNF Admin Login", False, "Failed to authenticate")
            return False
        
        print("\n2. Authenticating JTECH superuser...")
        self.jtech_token = self.login(JTECH_SUPERUSER)
        if self.jtech_token:
            self.log_test("JTECH Superuser Login", True, "Successfully authenticated")
        else:
            self.log_test("JTECH Superuser Login", False, "Failed to authenticate")
            return False
        
        return True

    def get_users(self, token: str, school_code: str) -> list:
        """Get list of users for a school"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
            
            if response.status_code == 200:
                users = response.json()
                return [u for u in users if u.get("school_code") == school_code]
            else:
                print(f"❌ Failed to get users: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Exception getting users: {str(e)}")
            return []

    def get_user_by_id(self, token: str, user_id: str) -> Optional[Dict]:
        """Get a specific user by ID"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/users/{user_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
        except Exception as e:
            print(f"❌ Exception getting user: {str(e)}")
            return None

    def test_scenario_1_sunf_admin_updates_teacher(self):
        """Scenario 1: SUNF admin updates a SUNF teacher's profile"""
        print("\n=== SCENARIO 1: SUNF Admin Updates SUNF Teacher ===")
        
        # Get SUNF teachers
        print("Finding a SUNF teacher...")
        sunf_users = self.get_users(self.sunf_token, "SUNF")
        sunf_teachers = [u for u in sunf_users if u.get("role") == "teacher"]
        
        if not sunf_teachers:
            self.log_test("Scenario 1 - Find Teacher", False, "No SUNF teachers found")
            return
        
        teacher = sunf_teachers[0]
        teacher_id = teacher["id"]
        original_name = teacher.get("name", "")
        print(f"   Selected teacher: {original_name} (ID: {teacher_id})")
        
        # Update teacher profile
        update_data = {
            "first_name": "UpdatedFirstName",
            "phone": "+233-555-1234",
            "city_state": "Accra, Greater Accra"
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_token}"}
            response = requests.put(
                f"{BASE_URL}/users/{teacher_id}",
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                
                # Verify fields were updated
                checks = []
                if updated_user.get("first_name") == "UpdatedFirstName":
                    checks.append("first_name updated ✓")
                else:
                    checks.append(f"first_name NOT updated (got: {updated_user.get('first_name')})")
                
                if updated_user.get("phone") == "+233-555-1234":
                    checks.append("phone updated ✓")
                else:
                    checks.append(f"phone NOT updated (got: {updated_user.get('phone')})")
                
                if updated_user.get("city_state") == "Accra, Greater Accra":
                    checks.append("city_state updated ✓")
                else:
                    checks.append(f"city_state NOT updated (got: {updated_user.get('city_state')})")
                
                # Verify name recomposition
                if "UpdatedFirstName" in updated_user.get("name", ""):
                    checks.append("name recomposed ✓")
                else:
                    checks.append(f"name NOT recomposed (got: {updated_user.get('name')})")
                
                # Verify persistence by fetching again
                persisted_user = self.get_user_by_id(self.sunf_token, teacher_id)
                if persisted_user:
                    if (persisted_user.get("first_name") == "UpdatedFirstName" and
                        persisted_user.get("phone") == "+233-555-1234" and
                        persisted_user.get("city_state") == "Accra, Greater Accra"):
                        checks.append("persistence verified ✓")
                    else:
                        checks.append("persistence FAILED")
                
                all_passed = all("✓" in check for check in checks)
                self.log_test(
                    "Scenario 1 - SUNF Admin Updates Teacher",
                    all_passed,
                    f"Update response 200. Checks: {', '.join(checks)}",
                    updated_user
                )
            else:
                self.log_test(
                    "Scenario 1 - SUNF Admin Updates Teacher",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Scenario 1 - SUNF Admin Updates Teacher", False, f"Exception: {str(e)}")

    def test_scenario_2_sunf_admin_updates_rvsd_user(self):
        """Scenario 2: SUNF admin attempts to update RVSD user - expect 403"""
        print("\n=== SCENARIO 2: SUNF Admin Attempts to Update RVSD User ===")
        
        # Get RVSD users using JTECH superuser token
        print("Finding an RVSD user...")
        headers = {"Authorization": f"Bearer {self.jtech_token}"}
        try:
            response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
            if response.status_code == 200:
                all_users = response.json()
                rvsd_users = [u for u in all_users if u.get("school_code") == "RVSD"]
                
                if not rvsd_users:
                    self.log_test("Scenario 2 - Find RVSD User", False, "No RVSD users found")
                    return
                
                rvsd_user = rvsd_users[0]
                rvsd_user_id = rvsd_user["id"]
                print(f"   Selected RVSD user: {rvsd_user.get('name', '')} (ID: {rvsd_user_id})")
                
                # Try to update with SUNF admin token
                update_data = {"first_name": "ShouldFail"}
                headers = {"Authorization": f"Bearer {self.sunf_token}"}
                response = requests.put(
                    f"{BASE_URL}/users/{rvsd_user_id}",
                    headers=headers,
                    json=update_data,
                    timeout=10
                )
                
                if response.status_code == 403:
                    self.log_test(
                        "Scenario 2 - SUNF Admin Cannot Update RVSD User",
                        True,
                        "Correctly returned 403 Forbidden"
                    )
                else:
                    self.log_test(
                        "Scenario 2 - SUNF Admin Cannot Update RVSD User",
                        False,
                        f"Expected 403, got {response.status_code}",
                        response.text
                    )
            else:
                self.log_test("Scenario 2 - Find RVSD User", False, f"Failed to get users: {response.status_code}")
        except Exception as e:
            self.log_test("Scenario 2 - SUNF Admin Cannot Update RVSD User", False, f"Exception: {str(e)}")

    def test_scenario_3_sunf_admin_updates_superuser(self):
        """Scenario 3: SUNF admin attempts to update JTECH superuser - expect 403"""
        print("\n=== SCENARIO 3: SUNF Admin Attempts to Update Superuser ===")
        
        # Get JTECH superuser ID
        print("Finding JTECH superuser...")
        headers = {"Authorization": f"Bearer {self.jtech_token}"}
        try:
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                superuser = response.json()
                superuser_id = superuser["id"]
                print(f"   JTECH superuser ID: {superuser_id}")
                
                # Try to update with SUNF admin token
                update_data = {"first_name": "ShouldFail"}
                headers = {"Authorization": f"Bearer {self.sunf_token}"}
                response = requests.put(
                    f"{BASE_URL}/users/{superuser_id}",
                    headers=headers,
                    json=update_data,
                    timeout=10
                )
                
                if response.status_code == 403:
                    self.log_test(
                        "Scenario 3 - SUNF Admin Cannot Update Superuser",
                        True,
                        "Correctly returned 403 Forbidden"
                    )
                else:
                    self.log_test(
                        "Scenario 3 - SUNF Admin Cannot Update Superuser",
                        False,
                        f"Expected 403, got {response.status_code}",
                        response.text
                    )
            else:
                self.log_test("Scenario 3 - Get Superuser", False, f"Failed to get superuser: {response.status_code}")
        except Exception as e:
            self.log_test("Scenario 3 - SUNF Admin Cannot Update Superuser", False, f"Exception: {str(e)}")

    def test_scenario_4_jtech_superuser_updates_sunf_teacher(self):
        """Scenario 4: JTECH superuser updates a SUNF teacher - expect 200"""
        print("\n=== SCENARIO 4: JTECH Superuser Updates SUNF Teacher ===")
        
        # Get SUNF teachers
        print("Finding a SUNF teacher...")
        headers = {"Authorization": f"Bearer {self.jtech_token}"}
        try:
            response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
            if response.status_code == 200:
                all_users = response.json()
                sunf_teachers = [u for u in all_users if u.get("school_code") == "SUNF" and u.get("role") == "teacher"]
                
                if not sunf_teachers:
                    self.log_test("Scenario 4 - Find SUNF Teacher", False, "No SUNF teachers found")
                    return
                
                teacher = sunf_teachers[0]
                teacher_id = teacher["id"]
                print(f"   Selected teacher: {teacher.get('name', '')} (ID: {teacher_id})")
                
                # Update with superuser token
                update_data = {
                    "first_name": "SuperuserUpdated",
                    "email": "superuser.updated@example.com"
                }
                headers = {"Authorization": f"Bearer {self.jtech_token}"}
                response = requests.put(
                    f"{BASE_URL}/users/{teacher_id}",
                    headers=headers,
                    json=update_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    updated_user = response.json()
                    
                    # Verify updates
                    checks = []
                    if updated_user.get("first_name") == "SuperuserUpdated":
                        checks.append("first_name updated ✓")
                    else:
                        checks.append(f"first_name NOT updated (got: {updated_user.get('first_name')})")
                    
                    if updated_user.get("email") == "superuser.updated@example.com":
                        checks.append("email updated ✓")
                    else:
                        checks.append(f"email NOT updated (got: {updated_user.get('email')})")
                    
                    all_passed = all("✓" in check for check in checks)
                    self.log_test(
                        "Scenario 4 - Superuser Updates SUNF Teacher",
                        all_passed,
                        f"Update response 200. Checks: {', '.join(checks)}",
                        updated_user
                    )
                else:
                    self.log_test(
                        "Scenario 4 - Superuser Updates SUNF Teacher",
                        False,
                        f"Expected 200, got {response.status_code}",
                        response.text
                    )
            else:
                self.log_test("Scenario 4 - Find SUNF Teacher", False, f"Failed to get users: {response.status_code}")
        except Exception as e:
            self.log_test("Scenario 4 - Superuser Updates SUNF Teacher", False, f"Exception: {str(e)}")

    def test_scenario_5_empty_body(self):
        """Scenario 5: PUT with empty body - expect 400"""
        print("\n=== SCENARIO 5: PUT with Empty Body ===")
        
        # Get any SUNF teacher
        sunf_users = self.get_users(self.sunf_token, "SUNF")
        sunf_teachers = [u for u in sunf_users if u.get("role") == "teacher"]
        
        if not sunf_teachers:
            self.log_test("Scenario 5 - Empty Body", False, "No SUNF teachers found for test")
            return
        
        teacher_id = sunf_teachers[0]["id"]
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_token}"}
            response = requests.put(
                f"{BASE_URL}/users/{teacher_id}",
                headers=headers,
                json={},
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_test(
                    "Scenario 5 - Empty Body Returns 400",
                    True,
                    "Correctly returned 400 Bad Request for empty body"
                )
            else:
                self.log_test(
                    "Scenario 5 - Empty Body Returns 400",
                    False,
                    f"Expected 400, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Scenario 5 - Empty Body Returns 400", False, f"Exception: {str(e)}")

    def test_scenario_6_nonexistent_user(self):
        """Scenario 6: PUT to non-existent user_id - expect 404"""
        print("\n=== SCENARIO 6: PUT to Non-existent User ===")
        
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        update_data = {"first_name": "ShouldFail"}
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_token}"}
            response = requests.put(
                f"{BASE_URL}/users/{fake_user_id}",
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_test(
                    "Scenario 6 - Non-existent User Returns 404",
                    True,
                    "Correctly returned 404 Not Found"
                )
            else:
                self.log_test(
                    "Scenario 6 - Non-existent User Returns 404",
                    False,
                    f"Expected 404, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Scenario 6 - Non-existent User Returns 404", False, f"Exception: {str(e)}")

    def test_regression_student_update(self):
        """Regression: PUT /api/students/{student_id} still works"""
        print("\n=== REGRESSION TEST: PUT /api/students/{student_id} ===")
        
        # Get SUNF students
        print("Finding a SUNF student...")
        try:
            headers = {"Authorization": f"Bearer {self.sunf_token}"}
            response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Regression - Get Students", False, f"Failed to get students: {response.status_code}")
                return
            
            students = response.json()
            if not students:
                self.log_test("Regression - Get Students", False, "No SUNF students found")
                return
            
            student = students[0]
            student_id = student["id"]
            print(f"   Selected student: {student.get('first_name', '')} {student.get('last_name', '')} (ID: {student_id})")
            
            # Get full student object
            response = requests.get(f"{BASE_URL}/students/{student_id}", headers=headers, timeout=10)
            if response.status_code != 200:
                self.log_test("Regression - Get Student Details", False, f"Failed to get student: {response.status_code}")
                return
            
            full_student = response.json()
            
            # Modify a few fields
            full_student["student_phone"] = "+233-999-8888"
            full_student["city_state"] = "Kumasi, Ashanti"
            full_student["enrollment_status"] = "active"
            
            # PUT the whole object back
            response = requests.put(
                f"{BASE_URL}/students/{student_id}",
                headers=headers,
                json=full_student,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_student = response.json()
                
                # Verify updates
                checks = []
                if updated_student.get("student_phone") == "+233-999-8888":
                    checks.append("student_phone updated ✓")
                else:
                    checks.append(f"student_phone NOT updated (got: {updated_student.get('student_phone')})")
                
                if updated_student.get("city_state") == "Kumasi, Ashanti":
                    checks.append("city_state updated ✓")
                else:
                    checks.append(f"city_state NOT updated (got: {updated_student.get('city_state')})")
                
                if updated_student.get("enrollment_status") == "active":
                    checks.append("enrollment_status updated ✓")
                else:
                    checks.append(f"enrollment_status NOT updated (got: {updated_student.get('enrollment_status')})")
                
                # Verify persistence
                response = requests.get(f"{BASE_URL}/students/{student_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    persisted = response.json()
                    if (persisted.get("student_phone") == "+233-999-8888" and
                        persisted.get("city_state") == "Kumasi, Ashanti" and
                        persisted.get("enrollment_status") == "active"):
                        checks.append("persistence verified ✓")
                    else:
                        checks.append("persistence FAILED")
                
                all_passed = all("✓" in check for check in checks)
                self.log_test(
                    "Regression - PUT /api/students/{id}",
                    all_passed,
                    f"Student update working. Checks: {', '.join(checks)}",
                    updated_student
                )
            else:
                self.log_test(
                    "Regression - PUT /api/students/{id}",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Regression - PUT /api/students/{id}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test scenarios"""
        print("=" * 70)
        print("🧪 Lumina-SIS Backend API Test Suite")
        print("Testing PUT /api/users/{user_id} endpoint")
        print("=" * 70)
        print()
        
        # Setup authentication
        if not self.test_setup_authentication():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return self.print_summary()
        
        # Run all test scenarios
        self.test_scenario_1_sunf_admin_updates_teacher()
        self.test_scenario_2_sunf_admin_updates_rvsd_user()
        self.test_scenario_3_sunf_admin_updates_superuser()
        self.test_scenario_4_jtech_superuser_updates_sunf_teacher()
        self.test_scenario_5_empty_body()
        self.test_scenario_6_nonexistent_user()
        self.test_regression_student_update()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        # Group results by category
        auth_tests = [r for r in self.test_results if "Login" in r["test"]]
        user_update_tests = [r for r in self.test_results if "Scenario" in r["test"]]
        regression_tests = [r for r in self.test_results if "Regression" in r["test"]]
        
        # Show authentication results
        if auth_tests:
            print("\n🔐 Authentication:")
            for result in auth_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
        
        # Show user update test results
        if user_update_tests:
            print("\n👤 PUT /api/users/{user_id} Tests:")
            for result in user_update_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
                if not result["success"]:
                    print(f"      └─ {result['message']}")
        
        # Show regression test results
        if regression_tests:
            print("\n🔄 Regression Tests:")
            for result in regression_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
                if not result["success"]:
                    print(f"      └─ {result['message']}")
        
        print(f"\n{'=' * 70}")
        print(f"Results: {passed}/{total} tests passed")
        print(f"{'=' * 70}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print("⚠️  Some tests failed. See details above.")
            return False

def main():
    """Main test runner"""
    tester = APITester()
    success = tester.run_all_tests()
    
    # Exit with error code if tests failed  
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
