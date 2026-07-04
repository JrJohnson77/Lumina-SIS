#!/usr/bin/env python3
"""
Comprehensive backend test for academic year management + system context endpoints.
Tests GET /api/system/context, PUT rename, and DELETE with cascade.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://full-audit-guide.preview.emergentagent.com/api"

# Test credentials
CREDENTIALS = {
    "sunf_admin": {"school_code": "SUNF", "username": "admin", "password": "Admin@123"},
    "jtech_superuser": {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"},
}

class TestRunner:
    def __init__(self):
        self.tokens = {}
        self.passed = 0
        self.failed = 0
        self.test_results = []
        self.sunf_school_id = None
        
    def login(self, cred_key: str) -> Optional[str]:
        """Login and return access token"""
        creds = CREDENTIALS[cred_key]
        try:
            resp = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("access_token")
                self.tokens[cred_key] = token
                return token
            else:
                print(f"❌ Login failed for {cred_key}: {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            print(f"❌ Login exception for {cred_key}: {e}")
            return None
    
    def headers(self, cred_key: str) -> Dict[str, str]:
        """Get auth headers for a credential"""
        token = self.tokens.get(cred_key)
        if not token:
            token = self.login(cred_key)
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test(self, name: str, condition: bool, details: str = ""):
        """Record test result"""
        if condition:
            self.passed += 1
            status = "✅"
        else:
            self.failed += 1
            status = "❌"
        result = f"{status} {name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({"name": name, "passed": condition, "details": details})
    
    def get_sunf_school_id(self):
        """Get SUNF school ID"""
        if self.sunf_school_id:
            return self.sunf_school_id
        
        try:
            resp = requests.get(
                f"{BASE_URL}/schools",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            if resp.status_code == 200:
                schools = resp.json()
                for school in schools:
                    if school.get("school_code") == "SUNF":
                        self.sunf_school_id = school["id"]
                        return self.sunf_school_id
        except Exception as e:
            print(f"❌ Failed to get SUNF school ID: {e}")
        return None
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*80)
        print("ACADEMIC YEAR MANAGEMENT + SYSTEM CONTEXT BACKEND TESTING")
        print("="*80 + "\n")
        
        # Login all users
        print("🔐 Logging in test users...")
        for key in CREDENTIALS.keys():
            self.login(key)
        print()
        
        # Get SUNF school ID
        print("🏫 Getting SUNF school ID...")
        sunf_id = self.get_sunf_school_id()
        if not sunf_id:
            print("❌ Failed to get SUNF school ID. Aborting tests.")
            return False
        print(f"   SUNF school ID: {sunf_id}\n")
        
        # Test 1: GET /api/system/context (SUNF admin)
        self.test_system_context_sunf()
        
        # Test 2: GET /api/system/context (JTECH superuser)
        self.test_system_context_jtech()
        
        # Test 3: PUT rename as SUNF admin (should fail with 403)
        self.test_rename_as_admin_403()
        
        # Test 4: PUT rename as JTECH superuser (should succeed)
        self.test_rename_as_superuser()
        
        # Test 5: PUT rename to existing year (should fail with 400)
        self.test_rename_to_existing_year()
        
        # Test 6: PUT rename with empty new_year (should fail with 400)
        self.test_rename_empty_new_year()
        
        # Test 7: DELETE current AY (should fail with 400)
        self.test_delete_current_ay()
        
        # Test 8: DELETE as SUNF admin (should fail with 403)
        self.test_delete_as_admin_403()
        
        # Test 9: DELETE without force (should return 400 with counts)
        self.test_delete_without_force()
        
        # Test 10: DELETE nonexistent year (should fail with 404)
        self.test_delete_nonexistent_year()
        
        # Test 11: Sanity check - GET report card
        self.test_report_card_sanity()
        
        # Test 12: Regression - PUT report-fields
        self.test_report_fields_regression()
        
        # Summary
        self.print_summary()
    
    def test_system_context_sunf(self):
        """Test 1: GET /api/system/context (SUNF admin)"""
        print("\n📋 Test 1: GET /api/system/context (SUNF admin)")
        print("-" * 80)
        
        try:
            resp = requests.get(
                f"{BASE_URL}/system/context",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            self.test("1.1 System context endpoint returns 200", resp.status_code == 200)
            
            if resp.status_code == 200:
                data = resp.json()
                
                # Check required keys
                required_keys = ["school_code", "school_id", "school_name", "current_academic_year", 
                                "academic_years", "all_academic_years"]
                has_all_keys = all(k in data for k in required_keys)
                self.test("1.2 Response has all required keys", has_all_keys)
                
                # Check school_code
                self.test("1.3 school_code is SUNF", data.get("school_code") == "SUNF")
                
                # Check current_academic_year
                current_ay = data.get("current_academic_year")
                self.test("1.4 current_academic_year is 2025-2026", current_ay == "2025-2026",
                         f"Got: {current_ay}")
                
                # Check academic_years (enabled only)
                academic_years = data.get("academic_years", [])
                self.test("1.5 academic_years is a list", isinstance(academic_years, list))
                has_2024 = "2024-2025" in academic_years
                has_2025 = "2025-2026" in academic_years
                self.test("1.6 academic_years includes 2024-2025", has_2024)
                self.test("1.7 academic_years includes 2025-2026", has_2025)
                
                # Check all_academic_years
                all_academic_years = data.get("all_academic_years", [])
                self.test("1.8 all_academic_years is a list", isinstance(all_academic_years, list))
                self.test("1.9 all_academic_years length >= 2", len(all_academic_years) >= 2,
                         f"Got length: {len(all_academic_years)}")
                
                if all_academic_years:
                    first_ay = all_academic_years[0]
                    has_structure = all(k in first_ay for k in ["year", "terms", "is_enabled", "is_current"])
                    self.test("1.10 all_academic_years items have correct structure", has_structure)
                
                print(f"\n   Sample data:")
                print(f"   - school_code: {data.get('school_code')}")
                print(f"   - current_academic_year: {current_ay}")
                print(f"   - academic_years: {academic_years}")
                print(f"   - all_academic_years count: {len(all_academic_years)}")
            else:
                print(f"Response: {resp.text}")
        except Exception as e:
            self.test("1.1 System context SUNF", False, f"Exception: {e}")
    
    def test_system_context_jtech(self):
        """Test 2: GET /api/system/context (JTECH superuser)"""
        print("\n📋 Test 2: GET /api/system/context (JTECH superuser)")
        print("-" * 80)
        
        try:
            resp = requests.get(
                f"{BASE_URL}/system/context",
                headers=self.headers("jtech_superuser"),
                timeout=10
            )
            
            self.test("2.1 System context endpoint returns 200", resp.status_code == 200)
            
            if resp.status_code == 200:
                data = resp.json()
                self.test("2.2 school_code is JTECH", data.get("school_code") == "JTECH")
                current_ay = data.get("current_academic_year")
                self.test("2.3 current_academic_year is 2025-2026", current_ay == "2025-2026",
                         f"Got: {current_ay}")
                
                print(f"\n   Sample data:")
                print(f"   - school_code: {data.get('school_code')}")
                print(f"   - current_academic_year: {current_ay}")
            else:
                print(f"Response: {resp.text}")
        except Exception as e:
            self.test("2.1 System context JTECH", False, f"Exception: {e}")
    
    def test_rename_as_admin_403(self):
        """Test 3: PUT rename as SUNF admin (should fail with 403)"""
        print("\n📋 Test 3: PUT /api/schools/{id}/academic-years/2024-2025 as SUNF admin")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            payload = {"new_year": "2024-2025-old"}
            
            resp = requests.put(
                f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                headers=self.headers("sunf_admin"),
                json=payload,
                timeout=10
            )
            
            self.test("3.1 SUNF admin blocked from renaming (403)", resp.status_code == 403,
                     f"Got status: {resp.status_code}")
        except Exception as e:
            self.test("3.1 Rename as admin", False, f"Exception: {e}")
    
    def test_rename_as_superuser(self):
        """Test 4: PUT rename as JTECH superuser (should succeed)"""
        print("\n📋 Test 4: PUT /api/schools/{id}/academic-years/2024-2025 as JTECH superuser")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser with SUNF context
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Rename 2024-2025 to 2024-2025-old
                payload = {"new_year": "2024-2025-old"}
                resp = requests.put(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                
                self.test("4.1 Superuser can rename (200)", resp.status_code == 200,
                         f"Got status: {resp.status_code}")
                
                if resp.status_code == 200:
                    data = resp.json()
                    
                    # Check response structure
                    self.test("4.2 Response contains 'cascaded' key", "cascaded" in data)
                    
                    if "cascaded" in data:
                        cascaded = data["cascaded"]
                        required_keys = ["gradebook", "social_skills", "teacher_comments", "classes"]
                        has_all = all(k in cascaded for k in required_keys)
                        self.test("4.3 cascaded has all required keys", has_all)
                        
                        print(f"\n   Cascaded counts:")
                        for key in required_keys:
                            print(f"   - {key}: {cascaded.get(key, 0)}")
                    
                    # Verify via GET /schools/{id}
                    resp_get = requests.get(
                        f"{BASE_URL}/schools/{sunf_id}",
                        headers=super_headers,
                        timeout=10
                    )
                    
                    if resp_get.status_code == 200:
                        school = resp_get.json()
                        academic_years = school.get("academic_years", [])
                        years_list = [ay.get("year") for ay in academic_years]
                        has_old = "2024-2025-old" in years_list
                        has_original = "2024-2025" in years_list
                        
                        self.test("4.4 GET /schools/{id} shows 2024-2025-old", has_old)
                        self.test("4.5 GET /schools/{id} does not show 2024-2025", not has_original)
                    
                    # Verify via GET /system/context
                    resp_context = requests.get(
                        f"{BASE_URL}/system/context",
                        headers=super_headers,
                        timeout=10
                    )
                    
                    if resp_context.status_code == 200:
                        context = resp_context.json()
                        all_ay = context.get("all_academic_years", [])
                        years_list = [ay.get("year") for ay in all_ay]
                        has_old = "2024-2025-old" in years_list
                        
                        self.test("4.6 GET /system/context reflects rename", has_old)
                    
                    # RENAME BACK to preserve seed data
                    print("\n   🔄 Renaming back to 2024-2025 to preserve seed data...")
                    payload_back = {"new_year": "2024-2025"}
                    resp_back = requests.put(
                        f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025-old",
                        headers=super_headers,
                        json=payload_back,
                        timeout=10
                    )
                    
                    self.test("4.7 Rename back to 2024-2025 successful", resp_back.status_code == 200)
                else:
                    print(f"Response: {resp.text}")
            else:
                self.test("4.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("4.1 Rename as superuser", False, f"Exception: {e}")
    
    def test_rename_to_existing_year(self):
        """Test 5: PUT rename to existing year (should fail with 400)"""
        print("\n📋 Test 5: PUT rename to existing year name")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Try to rename 2024-2025 to 2025-2026 (which already exists)
                payload = {"new_year": "2025-2026"}
                resp = requests.put(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                
                self.test("5.1 Rename to existing year returns 400", resp.status_code == 400,
                         f"Got status: {resp.status_code}")
                
                if resp.status_code == 400:
                    detail = resp.json().get("detail", "")
                    self.test("5.2 Error message mentions 'already exists'", "already exists" in detail.lower(),
                             f"Got: {detail}")
            else:
                self.test("5.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("5.1 Rename to existing year", False, f"Exception: {e}")
    
    def test_rename_empty_new_year(self):
        """Test 6: PUT rename with empty new_year (should fail with 400)"""
        print("\n📋 Test 6: PUT rename with empty new_year")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Try to rename with empty new_year
                payload = {"new_year": ""}
                resp = requests.put(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                
                self.test("6.1 Empty new_year returns 400", resp.status_code == 400,
                         f"Got status: {resp.status_code}")
            else:
                self.test("6.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("6.1 Rename with empty new_year", False, f"Exception: {e}")
    
    def test_delete_current_ay(self):
        """Test 7: DELETE current AY (should fail with 400)"""
        print("\n📋 Test 7: DELETE /api/schools/{id}/academic-years/2025-2026 (current AY)")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Try to delete current AY
                resp = requests.delete(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/2025-2026",
                    headers=super_headers,
                    timeout=10
                )
                
                self.test("7.1 Delete current AY returns 400", resp.status_code == 400,
                         f"Got status: {resp.status_code}")
                
                if resp.status_code == 400:
                    detail = resp.json().get("detail", "")
                    self.test("7.2 Error message mentions cannot delete current", 
                             "cannot delete" in detail.lower() and "current" in detail.lower(),
                             f"Got: {detail}")
            else:
                self.test("7.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("7.1 Delete current AY", False, f"Exception: {e}")
    
    def test_delete_as_admin_403(self):
        """Test 8: DELETE as SUNF admin (should fail with 403)"""
        print("\n📋 Test 8: DELETE /api/schools/{id}/academic-years/2024-2025 as SUNF admin")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            resp = requests.delete(
                f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            self.test("8.1 SUNF admin blocked from deleting (403)", resp.status_code == 403,
                     f"Got status: {resp.status_code}")
        except Exception as e:
            self.test("8.1 Delete as admin", False, f"Exception: {e}")
    
    def test_delete_without_force(self):
        """Test 9: DELETE without force (should return 400 with counts)"""
        print("\n📋 Test 9: DELETE /api/schools/{id}/academic-years/2024-2025 without force")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Try to delete without force
                resp = requests.delete(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/2024-2025",
                    headers=super_headers,
                    timeout=10
                )
                
                self.test("9.1 Delete without force returns 400", resp.status_code == 400,
                         f"Got status: {resp.status_code}")
                
                if resp.status_code == 400:
                    detail = resp.json().get("detail", "")
                    self.test("9.2 Error message mentions dependent records", 
                             "dependent records" in detail.lower(),
                             f"Got: {detail}")
                    
                    # Check if counts are in the detail
                    has_counts = any(word in detail for word in ["gradebook", "social_skills", 
                                                                  "teacher_comments", "classes"])
                    self.test("9.3 Error message includes counts dict", has_counts,
                             f"Got: {detail}")
                    
                    print(f"\n   Dependency info: {detail}")
            else:
                self.test("9.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("9.1 Delete without force", False, f"Exception: {e}")
    
    def test_delete_nonexistent_year(self):
        """Test 10: DELETE nonexistent year (should fail with 404)"""
        print("\n📋 Test 10: DELETE /api/schools/{id}/academic-years/nonexistent-year")
        print("-" * 80)
        
        try:
            sunf_id = self.get_sunf_school_id()
            
            # Login superuser
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", 
                               "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Try to delete nonexistent year
                resp = requests.delete(
                    f"{BASE_URL}/schools/{sunf_id}/academic-years/nonexistent-year",
                    headers=super_headers,
                    timeout=10
                )
                
                self.test("10.1 Delete nonexistent year returns 404", resp.status_code == 404,
                         f"Got status: {resp.status_code}")
            else:
                self.test("10.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("10.1 Delete nonexistent year", False, f"Exception: {e}")
    
    def test_report_card_sanity(self):
        """Test 11: Sanity check - GET report card"""
        print("\n📋 Test 11: Sanity check - GET /api/report-card/{student_id}")
        print("-" * 80)
        
        try:
            # Get a SUNF student with class_id
            resp_students = requests.get(
                f"{BASE_URL}/students",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            if resp_students.status_code == 200:
                students = resp_students.json()
                student = next((s for s in students if s.get("class_id")), None)
                
                if student:
                    student_id = student["id"]
                    print(f"   Testing with student: {student.get('first_name')} {student.get('last_name')}")
                    
                    resp = requests.get(
                        f"{BASE_URL}/report-card/{student_id}",
                        params={"term": "Term 1", "academic_year": "2025-2026"},
                        headers=self.headers("sunf_admin"),
                        timeout=10
                    )
                    
                    self.test("11.1 Report card endpoint returns 200", resp.status_code == 200)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        
                        # Check grades.subjects has actual scores
                        grades = data.get("grades", {})
                        subjects = grades.get("subjects", [])
                        self.test("11.2 grades.subjects is not empty", len(subjects) > 0,
                                 f"Got {len(subjects)} subjects")
                        
                        if subjects:
                            # Check if at least one subject has scores (field is "score" not "overall_score")
                            has_scores = any(s.get("score") is not None for s in subjects)
                            self.test("11.3 At least one subject has scores", has_scores)
                        
                        # Check attendance_pct
                        attendance_pct = data.get("attendance_pct")
                        self.test("11.4 attendance_pct is non-null int", 
                                 isinstance(attendance_pct, int),
                                 f"Got: {attendance_pct} (type: {type(attendance_pct).__name__})")
                        
                        print(f"\n   Sample data:")
                        print(f"   - subjects count: {len(subjects)}")
                        print(f"   - attendance_pct: {attendance_pct}")
                else:
                    self.test("11.1 Find student with class_id", False, "No students with class_id found")
            else:
                self.test("11.1 Get students list", False, f"Status {resp_students.status_code}")
        except Exception as e:
            self.test("11.1 Report card sanity check", False, f"Exception: {e}")
    
    def test_report_fields_regression(self):
        """Test 12: Regression - PUT report-fields"""
        print("\n📋 Test 12: Regression - PUT /api/students/{id}/report-fields")
        print("-" * 80)
        
        try:
            # Get a student
            resp_students = requests.get(
                f"{BASE_URL}/students",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            if resp_students.status_code == 200:
                students = resp_students.json()
                if students:
                    student_id = students[0]["id"]
                    
                    payload = {
                        "advisor": "Regression Test",
                        "awards": ["Rgn"],
                        "personal_development": {"leadership_role": "Head"}
                    }
                    
                    resp = requests.put(
                        f"{BASE_URL}/students/{student_id}/report-fields",
                        headers=self.headers("sunf_admin"),
                        json=payload,
                        timeout=10
                    )
                    
                    self.test("12.1 PUT report-fields returns 200", resp.status_code == 200,
                             f"Got status: {resp.status_code}")
                    
                    if resp.status_code == 200:
                        # Verify persistence
                        resp_get = requests.get(
                            f"{BASE_URL}/students/{student_id}",
                            headers=self.headers("sunf_admin"),
                            timeout=10
                        )
                        
                        if resp_get.status_code == 200:
                            student = resp_get.json()
                            self.test("12.2 advisor persisted", student.get("advisor") == "Regression Test")
                            self.test("12.3 awards persisted", student.get("awards") == ["Rgn"])
                            pd = student.get("personal_development", {})
                            self.test("12.4 personal_development persisted", 
                                     pd.get("leadership_role") == "Head")
                else:
                    self.test("12.1 Get students", False, "No students found")
            else:
                self.test("12.1 Get students", False, f"Status {resp_students.status_code}")
        except Exception as e:
            self.test("12.1 Report fields regression", False, f"Exception: {e}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📊 Total: {self.passed + self.failed}")
        if self.passed + self.failed > 0:
            print(f"📈 Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        print("="*80)
        
        if self.failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['name']}")
                    if result["details"]:
                        print(f"    {result['details']}")
        
        return self.failed == 0

if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all_tests()
    sys.exit(0 if success else 1)
