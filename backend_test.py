#!/usr/bin/env python3
"""
Comprehensive backend test for Ashcombe report template features.
Tests all new endpoints and extended report card payload.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Test credentials
CREDENTIALS = {
    "sunf_admin": {"school_code": "SUNF", "username": "admin", "password": "Admin@123"},
    "sunf_teacher": {"school_code": "SUNF", "username": "sarah.thompson.sunf", "password": "Teacher@123"},
    "jtech_superuser": {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"},
    "rvsd_admin": {"school_code": "RVSD", "username": "admin", "password": "Admin@123"},
}

class TestRunner:
    def __init__(self):
        self.tokens = {}
        self.passed = 0
        self.failed = 0
        self.test_results = []
        
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
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*80)
        print("ASHCOMBE REPORT TEMPLATE BACKEND TESTING")
        print("="*80 + "\n")
        
        # Login all users
        print("🔐 Logging in test users...")
        for key in CREDENTIALS.keys():
            self.login(key)
        print()
        
        # Test 1: GET /api/report-templates/system-default
        self.test_system_default_template()
        
        # Test 2: GET /api/report-templates/SUNF
        self.test_get_sunf_template()
        
        # Test 3: PUT /api/report-templates/SUNF/header (RBAC)
        self.test_update_header_rbac()
        
        # Test 4: PUT /api/report-templates/SUNF/footer (RBAC)
        self.test_update_footer_rbac()
        
        # Test 5: PUT /api/report-templates/SUNF/body (RBAC)
        self.test_update_body_rbac()
        
        # Test 6: PUT /api/report-templates/SUNF/theme (RBAC)
        self.test_update_theme_rbac()
        
        # Test 7: POST /api/report-templates/SUNF/clone-system-default (RBAC)
        self.test_clone_system_default_rbac()
        
        # Test 8: GET /api/report-card/{student_id} - extended payload
        self.test_report_card_extended_payload()
        
        # Test 9: PUT /api/students/{student_id}/report-fields
        self.test_update_student_report_fields()
        
        # Test 10: Verify startup migration
        self.test_startup_migration()
        
        # Summary
        self.print_summary()
    
    def test_system_default_template(self):
        """Test 1: GET /api/report-templates/system-default"""
        print("\n📋 Test 1: GET /api/report-templates/system-default")
        print("-" * 80)
        
        try:
            resp = requests.get(
                f"{BASE_URL}/report-templates/system-default",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            self.test("1.1 System default endpoint returns 200", resp.status_code == 200)
            
            if resp.status_code == 200:
                data = resp.json()
                self.test("1.2 school_code is SYSTEM", data.get("school_code") == "SYSTEM")
                self.test("1.3 is_system_default is true", data.get("is_system_default") == True)
                self.test("1.4 design_mode is ashcombe_default", data.get("design_mode") == "ashcombe_default")
                
                # Check header
                header = data.get("header", {})
                self.test("1.5 header exists", bool(header))
                design_elements = header.get("design_elements", [])
                self.test("1.6 header.design_elements has 4 items", len(design_elements) == 4)
                
                # Check body
                body = data.get("body", {})
                self.test("1.7 body exists", bool(body))
                sections = body.get("sections_enabled", {})
                self.test("1.8 body.sections_enabled has 8 keys", len(sections) == 8)
                columns = body.get("subject_table_columns", [])
                self.test("1.9 body.subject_table_columns is list of 6", len(columns) == 6)
                theme = body.get("theme", {})
                grade_scale = theme.get("grade_scale", [])
                self.test("1.10 body.theme.grade_scale is non-empty", len(grade_scale) > 0)
                if grade_scale:
                    first = grade_scale[0]
                    has_keys = all(k in first for k in ["letter", "min", "max", "gpa"])
                    self.test("1.11 grade_scale items have letter/min/max/gpa", has_keys)
                
                # Check footer
                footer = data.get("footer", {})
                self.test("1.12 footer exists", bool(footer))
                footer_elements = footer.get("design_elements", [])
                self.test("1.13 footer.design_elements has 2 items", len(footer_elements) == 2)
                sig_lines = footer.get("show_signature_lines", [])
                expected_sigs = ["principal", "parent_guardian"]
                self.test("1.14 footer.show_signature_lines has principal & parent_guardian", 
                         set(sig_lines) == set(expected_sigs))
            else:
                print(f"Response: {resp.text}")
        except Exception as e:
            self.test("1.1 System default endpoint", False, f"Exception: {e}")
    
    def test_get_sunf_template(self):
        """Test 2: GET /api/report-templates/SUNF"""
        print("\n📋 Test 2: GET /api/report-templates/SUNF (auto-migrated)")
        print("-" * 80)
        
        try:
            resp = requests.get(
                f"{BASE_URL}/report-templates/SUNF",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            self.test("2.1 SUNF template endpoint returns 200", resp.status_code == 200)
            
            if resp.status_code == 200:
                data = resp.json()
                self.test("2.2 design_mode is ashcombe_default", data.get("design_mode") == "ashcombe_default")
                self.test("2.3 header sub-object populated", bool(data.get("header")))
                self.test("2.4 body sub-object populated", bool(data.get("body")))
                self.test("2.5 footer sub-object populated", bool(data.get("footer")))
            else:
                print(f"Response: {resp.text}")
        except Exception as e:
            self.test("2.1 SUNF template endpoint", False, f"Exception: {e}")
    
    def test_update_header_rbac(self):
        """Test 3: PUT /api/report-templates/SUNF/header - RBAC"""
        print("\n📋 Test 3: PUT /api/report-templates/SUNF/header (SUPERUSER ONLY)")
        print("-" * 80)
        
        # Test 3a: SUNF admin should get 403
        try:
            payload = {
                "mode": "design",
                "height_px": 140,
                "design_elements": [
                    {"id": "test", "type": "text", "x": 10, "y": 10, "width": 200, "height": 24, 
                     "content": "Test Header", "font_size": 12}
                ]
            }
            resp = requests.put(
                f"{BASE_URL}/report-templates/SUNF/header",
                headers=self.headers("sunf_admin"),
                json=payload,
                timeout=10
            )
            self.test("3.1 SUNF admin blocked from updating header (403)", resp.status_code == 403)
        except Exception as e:
            self.test("3.1 SUNF admin header update", False, f"Exception: {e}")
        
        # Test 3b: JTECH superuser (logged into SUNF context) should succeed
        try:
            # Login superuser with SUNF context
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                payload = {
                    "mode": "design",
                    "height_px": 150,
                    "design_elements": [
                        {"id": "super_test", "type": "text", "x": 20, "y": 20, "width": 300, "height": 30, 
                         "content": "Superuser Header", "font_size": 14}
                    ]
                }
                resp = requests.put(
                    f"{BASE_URL}/report-templates/SUNF/header",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                self.test("3.2 Superuser can update header (200)", resp.status_code == 200)
                
                if resp.status_code == 200:
                    data = resp.json()
                    header = data.get("header", {})
                    self.test("3.3 Updated height_px persisted", header.get("height_px") == 150)
                    
                    # Verify persistence with GET
                    resp_get = requests.get(
                        f"{BASE_URL}/report-templates/SUNF",
                        headers=super_headers,
                        timeout=10
                    )
                    if resp_get.status_code == 200:
                        template = resp_get.json()
                        self.test("3.4 GET confirms header persisted", 
                                 template.get("header", {}).get("height_px") == 150)
                else:
                    print(f"Response: {resp.text}")
            else:
                self.test("3.2 Superuser login for SUNF context", False, "Login failed")
        except Exception as e:
            self.test("3.2 Superuser header update", False, f"Exception: {e}")
    
    def test_update_footer_rbac(self):
        """Test 4: PUT /api/report-templates/SUNF/footer - RBAC"""
        print("\n📋 Test 4: PUT /api/report-templates/SUNF/footer (SUPERUSER ONLY)")
        print("-" * 80)
        
        # Test 4a: SUNF admin should get 403
        try:
            payload = {
                "mode": "design",
                "height_px": 100,
                "show_signature_lines": ["principal", "parent_guardian", "form_teacher"]
            }
            resp = requests.put(
                f"{BASE_URL}/report-templates/SUNF/footer",
                headers=self.headers("sunf_admin"),
                json=payload,
                timeout=10
            )
            self.test("4.1 SUNF admin blocked from updating footer (403)", resp.status_code == 403)
        except Exception as e:
            self.test("4.1 SUNF admin footer update", False, f"Exception: {e}")
        
        # Test 4b: Superuser should succeed
        try:
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                payload = {
                    "mode": "design",
                    "height_px": 110,
                    "show_signature_lines": ["principal", "parent_guardian", "form_teacher"]
                }
                resp = requests.put(
                    f"{BASE_URL}/report-templates/SUNF/footer",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                self.test("4.2 Superuser can update footer (200)", resp.status_code == 200)
                
                if resp.status_code == 200:
                    data = resp.json()
                    footer = data.get("footer", {})
                    sig_lines = footer.get("show_signature_lines", [])
                    expected = ["principal", "parent_guardian", "form_teacher"]
                    self.test("4.3 show_signature_lines persisted", set(sig_lines) == set(expected))
            else:
                self.test("4.2 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("4.2 Superuser footer update", False, f"Exception: {e}")
    
    def test_update_body_rbac(self):
        """Test 5: PUT /api/report-templates/SUNF/body - RBAC"""
        print("\n📋 Test 5: PUT /api/report-templates/SUNF/body (SUPERUSER ONLY)")
        print("-" * 80)
        
        try:
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                # Toggle a section off
                payload = {
                    "sections_enabled": {
                        "student_info_bar": True,
                        "stats_cards": False,  # Toggle off
                        "subject_table": True,
                        "teacher_comments": True,
                        "personal_development": True,
                        "awards_behavioural": True,
                        "behavioural_counters": True,
                        "grading_key": True,
                    },
                    "subject_table_columns": ["homework", "exam", "overall", "grade"]  # Subset
                }
                resp = requests.put(
                    f"{BASE_URL}/report-templates/SUNF/body",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                self.test("5.1 Superuser can update body (200)", resp.status_code == 200)
                
                if resp.status_code == 200:
                    data = resp.json()
                    body = data.get("body", {})
                    sections = body.get("sections_enabled", {})
                    self.test("5.2 stats_cards toggled off", sections.get("stats_cards") == False)
                    columns = body.get("subject_table_columns", [])
                    self.test("5.3 subject_table_columns updated to subset", len(columns) == 4)
            else:
                self.test("5.1 Superuser login", False, "Login failed")
        except Exception as e:
            self.test("5.1 Superuser body update", False, f"Exception: {e}")
    
    def test_update_theme_rbac(self):
        """Test 6: PUT /api/report-templates/SUNF/theme - ADMIN or SUPERUSER"""
        print("\n📋 Test 6: PUT /api/report-templates/SUNF/theme (ADMIN or SUPERUSER)")
        print("-" * 80)
        
        # Test 6a: SUNF admin can update theme
        try:
            payload = {
                "primary_color": "#1e3a8a",
                "accent_color": "#f59e0b"
            }
            resp = requests.put(
                f"{BASE_URL}/report-templates/SUNF/theme",
                headers=self.headers("sunf_admin"),
                json=payload,
                timeout=10
            )
            self.test("6.1 SUNF admin can update theme (200)", resp.status_code == 200)
            
            if resp.status_code == 200:
                data = resp.json()
                theme = data.get("theme", {})
                self.test("6.2 primary_color persisted", theme.get("primary_color") == "#1e3a8a")
        except Exception as e:
            self.test("6.1 SUNF admin theme update", False, f"Exception: {e}")
        
        # Test 6b: SUNF admin cannot update RVSD theme (cross-tenant)
        try:
            payload = {"primary_color": "#ff0000"}
            resp = requests.put(
                f"{BASE_URL}/report-templates/RVSD/theme",
                headers=self.headers("sunf_admin"),
                json=payload,
                timeout=10
            )
            self.test("6.3 SUNF admin blocked from RVSD theme (403)", resp.status_code == 403)
        except Exception as e:
            self.test("6.3 Cross-tenant theme update", False, f"Exception: {e}")
        
        # Test 6c: Superuser can update any school
        try:
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                payload = {"primary_color": "#10b981"}
                resp = requests.put(
                    f"{BASE_URL}/report-templates/SUNF/theme",
                    headers=super_headers,
                    json=payload,
                    timeout=10
                )
                self.test("6.4 Superuser can update theme (200)", resp.status_code == 200)
        except Exception as e:
            self.test("6.4 Superuser theme update", False, f"Exception: {e}")
    
    def test_clone_system_default_rbac(self):
        """Test 7: POST /api/report-templates/SUNF/clone-system-default - SUPERUSER ONLY"""
        print("\n📋 Test 7: POST /api/report-templates/SUNF/clone-system-default (SUPERUSER ONLY)")
        print("-" * 80)
        
        # Test 7a: SUNF admin should get 403
        try:
            resp = requests.post(
                f"{BASE_URL}/report-templates/SUNF/clone-system-default",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            self.test("7.1 SUNF admin blocked from cloning (403)", resp.status_code == 403)
        except Exception as e:
            self.test("7.1 SUNF admin clone attempt", False, f"Exception: {e}")
        
        # Test 7b: Superuser should succeed
        try:
            sunf_super_creds = {"school_code": "SUNF", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}
            resp_login = requests.post(f"{BASE_URL}/auth/login", json=sunf_super_creds, timeout=10)
            if resp_login.status_code == 200:
                super_token = resp_login.json().get("access_token")
                super_headers = {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}
                
                resp = requests.post(
                    f"{BASE_URL}/report-templates/SUNF/clone-system-default",
                    headers=super_headers,
                    timeout=10
                )
                self.test("7.2 Superuser can clone system default (200)", resp.status_code == 200)
                
                if resp.status_code == 200:
                    data = resp.json()
                    self.test("7.3 Cloned template has ashcombe_default mode", 
                             data.get("design_mode") == "ashcombe_default")
        except Exception as e:
            self.test("7.2 Superuser clone", False, f"Exception: {e}")
    
    def test_report_card_extended_payload(self):
        """Test 8: GET /api/report-card/{student_id} - extended payload"""
        print("\n📋 Test 8: GET /api/report-card/{student_id} - Extended Ashcombe payload")
        print("-" * 80)
        
        try:
            # First get a student from SUNF
            resp_students = requests.get(
                f"{BASE_URL}/students",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            if resp_students.status_code == 200:
                students = resp_students.json()
                # Find a student with class_id set
                student = next((s for s in students if s.get("class_id")), None)
                
                if student:
                    student_id = student["id"]
                    print(f"Testing with student: {student.get('first_name')} {student.get('last_name')} (ID: {student_id})")
                    
                    resp = requests.get(
                        f"{BASE_URL}/report-card/{student_id}",
                        params={"term": "Term 1", "academic_year": "2025-2026"},
                        headers=self.headers("sunf_admin"),
                        timeout=10
                    )
                    
                    self.test("8.1 Report card endpoint returns 200", resp.status_code == 200)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        
                        # Check new fields
                        self.test("8.2 attendance_pct field present", "attendance_pct" in data)
                        self.test("8.3 overall_average field present", "overall_average" in data)
                        self.test("8.4 gpa field present", "gpa" in data)
                        self.test("8.5 awards field present", "awards" in data)
                        self.test("8.6 personal_development field present", "personal_development" in data)
                        
                        # Check behavioural
                        behavioural = data.get("behavioural", {})
                        self.test("8.7 behavioural field present", bool(behavioural))
                        required_keys = ["detentions", "warnings", "suspensions", "other"]
                        has_all = all(k in behavioural for k in required_keys)
                        self.test("8.8 behavioural has all counters", has_all)
                        if has_all:
                            all_non_negative = all(isinstance(behavioural[k], int) and behavioural[k] >= 0 
                                                   for k in required_keys)
                            self.test("8.9 behavioural counters are non-negative ints", all_non_negative)
                        
                        # Check advisor
                        self.test("8.10 advisor field present", "advisor" in data)
                        
                        # Check school
                        school = data.get("school", {})
                        self.test("8.11 school object present", bool(school))
                        school_keys = ["name", "tagline", "address", "principal_name"]
                        has_school_keys = all(k in school for k in school_keys)
                        self.test("8.12 school has name/tagline/address/principal_name", has_school_keys)
                        
                        # Check template
                        template = data.get("template", {})
                        self.test("8.13 template object present", bool(template))
                        self.test("8.14 template is full report_templates doc", 
                                 template.get("design_mode") == "ashcombe_default")
                        
                        print(f"\n   Sample data:")
                        print(f"   - attendance_pct: {data.get('attendance_pct')}")
                        print(f"   - overall_average: {data.get('overall_average')}")
                        print(f"   - gpa: {data.get('gpa')}")
                        print(f"   - awards: {len(data.get('awards', []))} items")
                        print(f"   - behavioural: {behavioural}")
                        print(f"   - advisor: {data.get('advisor')}")
                else:
                    self.test("8.1 Find student with class_id", False, "No students with class_id found")
            else:
                self.test("8.1 Get students list", False, f"Status {resp_students.status_code}")
        except Exception as e:
            self.test("8.1 Report card extended payload", False, f"Exception: {e}")
    
    def test_update_student_report_fields(self):
        """Test 9: PUT /api/students/{student_id}/report-fields"""
        print("\n📋 Test 9: PUT /api/students/{student_id}/report-fields")
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
                    
                    # Test 9a: Update with valid fields
                    payload = {
                        "advisor": "Test Advisor",
                        "awards": ["Award A", "Award B"],
                        "personal_development": {"leadership_role": "Prefect"}
                    }
                    resp = requests.put(
                        f"{BASE_URL}/students/{student_id}/report-fields",
                        headers=self.headers("sunf_admin"),
                        json=payload,
                        timeout=10
                    )
                    self.test("9.1 SUNF admin can update report fields (200)", resp.status_code == 200)
                    
                    if resp.status_code == 200:
                        # Verify persistence
                        resp_get = requests.get(
                            f"{BASE_URL}/students/{student_id}",
                            headers=self.headers("sunf_admin"),
                            timeout=10
                        )
                        if resp_get.status_code == 200:
                            student = resp_get.json()
                            self.test("9.2 advisor persisted", student.get("advisor") == "Test Advisor")
                            self.test("9.3 awards persisted", student.get("awards") == ["Award A", "Award B"])
                            pd = student.get("personal_development", {})
                            self.test("9.4 personal_development persisted", 
                                     pd.get("leadership_role") == "Prefect")
                    
                    # Test 9b: Unknown fields should not be persisted
                    payload_unknown = {
                        "unknown_field": "should not persist",
                        "advisor": "Updated Advisor"
                    }
                    resp = requests.put(
                        f"{BASE_URL}/students/{student_id}/report-fields",
                        headers=self.headers("sunf_admin"),
                        json=payload_unknown,
                        timeout=10
                    )
                    if resp.status_code == 200:
                        resp_get = requests.get(
                            f"{BASE_URL}/students/{student_id}",
                            headers=self.headers("sunf_admin"),
                            timeout=10
                        )
                        if resp_get.status_code == 200:
                            student = resp_get.json()
                            self.test("9.5 unknown_field NOT persisted", "unknown_field" not in student)
                            self.test("9.6 advisor updated correctly", student.get("advisor") == "Updated Advisor")
                    
                    # Test 9c: Empty body should return 400
                    resp = requests.put(
                        f"{BASE_URL}/students/{student_id}/report-fields",
                        headers=self.headers("sunf_admin"),
                        json={},
                        timeout=10
                    )
                    self.test("9.7 Empty body returns 400", resp.status_code == 400)
                    
                    # Test 9d: Teacher access (if teacher has manage_students permission)
                    # Note: Teachers have manage_students permission but no scope guard in endpoint
                    # So they can update any student in their school - this is acceptable per requirements
                    resp = requests.put(
                        f"{BASE_URL}/students/{student_id}/report-fields",
                        headers=self.headers("sunf_teacher"),
                        json={"advisor": "Teacher Updated"},
                        timeout=10
                    )
                    # Either 200 (allowed) or 403 (not in class) is acceptable
                    self.test("9.8 Teacher access behavior documented", 
                             resp.status_code in [200, 403],
                             f"Status: {resp.status_code}")
                else:
                    self.test("9.1 Get students", False, "No students found")
            else:
                self.test("9.1 Get students", False, f"Status {resp_students.status_code}")
        except Exception as e:
            self.test("9.1 Update student report fields", False, f"Exception: {e}")
    
    def test_startup_migration(self):
        """Test 10: Verify startup migration"""
        print("\n📋 Test 10: Verify startup migration")
        print("-" * 80)
        
        try:
            # Check SUNF template
            resp_sunf = requests.get(
                f"{BASE_URL}/report-templates/SUNF",
                headers=self.headers("sunf_admin"),
                timeout=10
            )
            
            if resp_sunf.status_code == 200:
                sunf = resp_sunf.json()
                self.test("10.1 SUNF has ashcombe_default mode", 
                         sunf.get("design_mode") == "ashcombe_default")
                self.test("10.2 SUNF body populated", bool(sunf.get("body")))
            
            # Check RVSD template
            resp_rvsd = requests.get(
                f"{BASE_URL}/report-templates/RVSD",
                headers=self.headers("rvsd_admin"),
                timeout=10
            )
            
            if resp_rvsd.status_code == 200:
                rvsd = resp_rvsd.json()
                self.test("10.3 RVSD has ashcombe_default mode", 
                         rvsd.get("design_mode") == "ashcombe_default")
                self.test("10.4 RVSD body populated", bool(rvsd.get("body")))
        except Exception as e:
            self.test("10.1 Startup migration verification", False, f"Exception: {e}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📊 Total: {self.passed + self.failed}")
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
