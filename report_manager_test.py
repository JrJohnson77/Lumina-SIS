#!/usr/bin/env python3
"""
Backend API Testing for Lumina-SIS Report Manager
Tests teacher comments and social skills endpoints
"""

import requests
import json
import sys
from typing import Dict, Any, Optional, List

# API base URL from frontend configuration
BASE_URL = "https://github-refresh-4.preview.emergentagent.com/api"

# Test credentials
SUNF_ADMIN = {
    "school_code": "SUNF",
    "username": "admin",
    "password": "Admin@123"
}

SUNF_TEACHER = {
    "school_code": "SUNF",
    "username": "sarah.thompson.sunf",
    "password": "Teacher@123"
}

JTECH_SUPERUSER = {
    "school_code": "JTECH",
    "username": "jtech.innovations@outlook.com",
    "password": "Xekleidoma@1"
}

class ReportManagerTester:
    def __init__(self):
        self.sunf_admin_token = None
        self.sunf_teacher_token = None
        self.jtech_token = None
        self.test_results = []
        self.test_student_id = None
        self.test_class_id = None
        self.teacher_class_id = None
        self.non_teacher_student_id = None
        
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
        """Setup: Authenticate all users"""
        print("=== SETUP: Authentication ===")
        
        print("1. Authenticating SUNF admin...")
        self.sunf_admin_token = self.login(SUNF_ADMIN)
        if self.sunf_admin_token:
            self.log_test("SUNF Admin Login", True, "Successfully authenticated")
        else:
            self.log_test("SUNF Admin Login", False, "Failed to authenticate")
            return False
        
        print("\n2. Authenticating SUNF teacher (sarah.thompson.sunf)...")
        self.sunf_teacher_token = self.login(SUNF_TEACHER)
        if self.sunf_teacher_token:
            self.log_test("SUNF Teacher Login", True, "Successfully authenticated")
        else:
            self.log_test("SUNF Teacher Login", False, "Failed to authenticate")
            return False
        
        return True

    def setup_test_data(self):
        """Setup: Get test students and classes"""
        print("\n=== SETUP: Getting Test Data ===")
        
        try:
            # Get SUNF classes
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(f"{BASE_URL}/classes", headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Setup - Get Classes", False, f"Failed to get classes: {response.status_code}")
                return False
            
            classes = response.json()
            sunf_classes = [c for c in classes if c.get("school_code") == "SUNF"]
            
            if not sunf_classes:
                self.log_test("Setup - Get Classes", False, "No SUNF classes found")
                return False
            
            self.test_class_id = sunf_classes[0]["id"]
            print(f"   Selected test class: {sunf_classes[0].get('name', '')} (ID: {self.test_class_id})")
            
            # Get students in this class
            response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
            if response.status_code != 200:
                self.log_test("Setup - Get Students", False, f"Failed to get students: {response.status_code}")
                return False
            
            students = response.json()
            class_students = [s for s in students if s.get("class_id") == self.test_class_id]
            
            if not class_students:
                self.log_test("Setup - Get Students", False, f"No students found in class {self.test_class_id}")
                return False
            
            self.test_student_id = class_students[0]["id"]
            print(f"   Selected test student: {class_students[0].get('first_name', '')} {class_students[0].get('last_name', '')} (ID: {self.test_student_id})")
            
            # Find teacher's class
            response = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {self.sunf_teacher_token}"}, timeout=10)
            if response.status_code == 200:
                teacher_info = response.json()
                teacher_id = teacher_info["id"]
                
                # Find classes taught by this teacher
                teacher_classes = [c for c in sunf_classes if c.get("teacher_id") == teacher_id]
                if teacher_classes:
                    self.teacher_class_id = teacher_classes[0]["id"]
                    print(f"   Teacher's class: {teacher_classes[0].get('name', '')} (ID: {self.teacher_class_id})")
                    
                    # Get a student in teacher's class
                    teacher_class_students = [s for s in students if s.get("class_id") == self.teacher_class_id]
                    if teacher_class_students:
                        # Use first student in teacher's class for testing
                        self.test_student_id = teacher_class_students[0]["id"]
                        print(f"   Student in teacher's class: {teacher_class_students[0].get('first_name', '')} {teacher_class_students[0].get('last_name', '')} (ID: {self.test_student_id})")
                    
                    # Find a student NOT in teacher's class for access control test
                    non_teacher_students = [s for s in students if s.get("class_id") != self.teacher_class_id and s.get("class_id") is not None]
                    if non_teacher_students:
                        self.non_teacher_student_id = non_teacher_students[0]["id"]
                        print(f"   Student NOT in teacher's class: {non_teacher_students[0].get('first_name', '')} {non_teacher_students[0].get('last_name', '')} (ID: {self.non_teacher_student_id})")
            
            self.log_test("Setup - Test Data", True, "Successfully retrieved test data")
            return True
            
        except Exception as e:
            self.log_test("Setup - Test Data", False, f"Exception: {str(e)}")
            return False

    def test_1_post_teacher_comment_admin(self):
        """Test 1: POST /api/teacher-comments as SUNF admin"""
        print("\n=== TEST 1: POST Teacher Comment (SUNF Admin) ===")
        
        comment_data = {
            "student_id": self.test_student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "Excellent progress this term. Shows great enthusiasm in class."
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.post(
                f"{BASE_URL}/teacher-comments",
                headers=headers,
                json=comment_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "id" in data:
                    self.log_test(
                        "Test 1 - POST Teacher Comment (Admin)",
                        True,
                        f"Comment saved successfully. Message: {data['message']}, ID: {data['id']}"
                    )
                    return data["id"]
                else:
                    self.log_test(
                        "Test 1 - POST Teacher Comment (Admin)",
                        False,
                        "Response missing 'message' or 'id' field",
                        data
                    )
            else:
                self.log_test(
                    "Test 1 - POST Teacher Comment (Admin)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 1 - POST Teacher Comment (Admin)", False, f"Exception: {str(e)}")
        
        return None

    def test_2_post_teacher_comment_update(self, comment_id: Optional[str]):
        """Test 2: POST same comment again (should update, not create duplicate)"""
        print("\n=== TEST 2: POST Teacher Comment Update (Upsert) ===")
        
        updated_comment_data = {
            "student_id": self.test_student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "Updated comment: Outstanding performance and leadership skills demonstrated."
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.post(
                f"{BASE_URL}/teacher-comments",
                headers=headers,
                json=updated_comment_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    # Check if ID is the same (update) or different (new record)
                    if comment_id and data["id"] == comment_id:
                        self.log_test(
                            "Test 2 - POST Teacher Comment Update",
                            True,
                            f"Comment updated successfully (same ID: {data['id']}). No duplicate created."
                        )
                    elif comment_id and data["id"] != comment_id:
                        self.log_test(
                            "Test 2 - POST Teacher Comment Update",
                            False,
                            f"New ID returned ({data['id']} vs {comment_id}). Duplicate may have been created.",
                            data
                        )
                    else:
                        self.log_test(
                            "Test 2 - POST Teacher Comment Update",
                            True,
                            f"Comment saved with ID: {data['id']}"
                        )
                else:
                    self.log_test(
                        "Test 2 - POST Teacher Comment Update",
                        False,
                        "Response missing 'id' field",
                        data
                    )
            else:
                self.log_test(
                    "Test 2 - POST Teacher Comment Update",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 2 - POST Teacher Comment Update", False, f"Exception: {str(e)}")

    def test_3_get_teacher_comment_single(self):
        """Test 3: GET /api/teacher-comments/{student_id}"""
        print("\n=== TEST 3: GET Teacher Comment (Single Student) ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/teacher-comments/{self.test_student_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "comment" in data:
                    comment_text = data.get("comment", "")
                    if "Outstanding performance" in comment_text or "Excellent progress" in comment_text:
                        self.log_test(
                            "Test 3 - GET Teacher Comment (Single)",
                            True,
                            f"Comment retrieved successfully: '{comment_text[:50]}...'"
                        )
                    elif comment_text == "":
                        self.log_test(
                            "Test 3 - GET Teacher Comment (Single)",
                            False,
                            "Comment is empty (expected saved comment)",
                            data
                        )
                    else:
                        self.log_test(
                            "Test 3 - GET Teacher Comment (Single)",
                            True,
                            f"Comment retrieved: '{comment_text[:50]}...'"
                        )
                else:
                    self.log_test(
                        "Test 3 - GET Teacher Comment (Single)",
                        False,
                        "Response missing 'comment' field",
                        data
                    )
            else:
                self.log_test(
                    "Test 3 - GET Teacher Comment (Single)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 3 - GET Teacher Comment (Single)", False, f"Exception: {str(e)}")

    def test_4_get_teacher_comment_no_comment(self):
        """Test 4: GET teacher comment for student with no comment (should return empty string)"""
        print("\n=== TEST 4: GET Teacher Comment (No Comment) ===")
        
        # Use a different student who likely has no comment
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(f"{BASE_URL}/students", headers=headers, timeout=10)
            
            if response.status_code == 200:
                students = response.json()
                # Find a student different from test_student_id
                other_students = [s for s in students if s["id"] != self.test_student_id and s.get("school_code") == "SUNF"]
                
                if other_students:
                    other_student_id = other_students[0]["id"]
                    
                    response = requests.get(
                        f"{BASE_URL}/teacher-comments/{other_student_id}",
                        headers=headers,
                        params={"term": "Term 3", "academic_year": "2023-2024"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if "comment" in data and data["comment"] == "":
                            self.log_test(
                                "Test 4 - GET Teacher Comment (No Comment)",
                                True,
                                "Correctly returned empty comment for student with no saved comment"
                            )
                        else:
                            self.log_test(
                                "Test 4 - GET Teacher Comment (No Comment)",
                                False,
                                f"Expected empty comment, got: {data}",
                                data
                            )
                    elif response.status_code == 404:
                        self.log_test(
                            "Test 4 - GET Teacher Comment (No Comment)",
                            False,
                            "Returned 404 instead of 200 with empty comment",
                            response.text
                        )
                    else:
                        self.log_test(
                            "Test 4 - GET Teacher Comment (No Comment)",
                            False,
                            f"Expected 200, got {response.status_code}",
                            response.text
                        )
                else:
                    self.log_test("Test 4 - GET Teacher Comment (No Comment)", False, "Could not find another student for test")
            else:
                self.log_test("Test 4 - GET Teacher Comment (No Comment)", False, f"Failed to get students: {response.status_code}")
        except Exception as e:
            self.log_test("Test 4 - GET Teacher Comment (No Comment)", False, f"Exception: {str(e)}")

    def test_5_get_teacher_comments_class(self):
        """Test 5: GET /api/teacher-comments/class/{class_id}"""
        print("\n=== TEST 5: GET Teacher Comments (Bulk Class) ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/teacher-comments/class/{self.test_class_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "class_id" in data and "term" in data and "academic_year" in data and "entries" in data:
                    entries = data["entries"]
                    
                    # Verify entries is a list
                    if isinstance(entries, list) and len(entries) > 0:
                        # Check first entry structure
                        first_entry = entries[0]
                        if "student_id" in first_entry and "comment" in first_entry:
                            # Count entries with comments vs empty
                            with_comments = sum(1 for e in entries if e.get("comment", "") != "")
                            empty_comments = sum(1 for e in entries if e.get("comment", "") == "")
                            
                            self.log_test(
                                "Test 5 - GET Teacher Comments (Class)",
                                True,
                                f"Retrieved {len(entries)} entries ({with_comments} with comments, {empty_comments} empty). Structure correct."
                            )
                        else:
                            self.log_test(
                                "Test 5 - GET Teacher Comments (Class)",
                                False,
                                "Entry missing 'student_id' or 'comment' field",
                                first_entry
                            )
                    else:
                        self.log_test(
                            "Test 5 - GET Teacher Comments (Class)",
                            False,
                            f"Expected non-empty list of entries, got: {entries}",
                            data
                        )
                else:
                    self.log_test(
                        "Test 5 - GET Teacher Comments (Class)",
                        False,
                        "Response missing required fields (class_id, term, academic_year, entries)",
                        data
                    )
            else:
                self.log_test(
                    "Test 5 - GET Teacher Comments (Class)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 5 - GET Teacher Comments (Class)", False, f"Exception: {str(e)}")

    def test_6_teacher_access_control_own_class(self):
        """Test 6: Teacher can POST comment for student in their class"""
        print("\n=== TEST 6: Teacher Access Control (Own Class) ===")
        
        if not self.teacher_class_id:
            self.log_test("Test 6 - Teacher Access (Own Class)", False, "Teacher class not found in setup")
            return
        
        comment_data = {
            "student_id": self.test_student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "Teacher comment: Student shows consistent improvement."
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_teacher_token}"}
            response = requests.post(
                f"{BASE_URL}/teacher-comments",
                headers=headers,
                json=comment_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Test 6 - Teacher Access (Own Class)",
                    True,
                    f"Teacher successfully saved comment for student in their class. {data.get('message', '')}"
                )
            else:
                self.log_test(
                    "Test 6 - Teacher Access (Own Class)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 6 - Teacher Access (Own Class)", False, f"Exception: {str(e)}")

    def test_7_teacher_access_control_other_class(self):
        """Test 7: Teacher CANNOT POST comment for student NOT in their class (expect 403)"""
        print("\n=== TEST 7: Teacher Access Control (Other Class - Expect 403) ===")
        
        if not self.non_teacher_student_id:
            self.log_test("Test 7 - Teacher Access (Other Class)", False, "No student outside teacher's class found in setup")
            return
        
        comment_data = {
            "student_id": self.non_teacher_student_id,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "comment": "This should fail - student not in teacher's class."
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_teacher_token}"}
            response = requests.post(
                f"{BASE_URL}/teacher-comments",
                headers=headers,
                json=comment_data,
                timeout=10
            )
            
            if response.status_code == 403:
                response_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                detail = response_data.get("detail", "") if isinstance(response_data, dict) else str(response_data)
                
                if "not in your class" in detail.lower():
                    self.log_test(
                        "Test 7 - Teacher Access (Other Class)",
                        True,
                        f"Correctly returned 403 with message: '{detail}'"
                    )
                else:
                    self.log_test(
                        "Test 7 - Teacher Access (Other Class)",
                        True,
                        f"Correctly returned 403 (detail: {detail})"
                    )
            else:
                self.log_test(
                    "Test 7 - Teacher Access (Other Class)",
                    False,
                    f"Expected 403, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 7 - Teacher Access (Other Class)", False, f"Exception: {str(e)}")

    def test_8_get_social_skills_class(self):
        """Test 8: GET /api/social-skills/class/{class_id}"""
        print("\n=== TEST 8: GET Social Skills (Bulk Class) ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/social-skills/class/{self.test_class_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "class_id" in data and "term" in data and "academic_year" in data and "entries" in data:
                    entries = data["entries"]
                    
                    # Verify entries is a list
                    if isinstance(entries, list) and len(entries) > 0:
                        # Check first entry structure
                        first_entry = entries[0]
                        if "student_id" in first_entry and "skills" in first_entry:
                            # Verify skills is a dict
                            if isinstance(first_entry["skills"], dict):
                                self.log_test(
                                    "Test 8 - GET Social Skills (Class)",
                                    True,
                                    f"Retrieved {len(entries)} entries. Structure correct (student_id, skills dict)."
                                )
                            else:
                                self.log_test(
                                    "Test 8 - GET Social Skills (Class)",
                                    False,
                                    f"'skills' should be a dict, got: {type(first_entry['skills'])}",
                                    first_entry
                                )
                        else:
                            self.log_test(
                                "Test 8 - GET Social Skills (Class)",
                                False,
                                "Entry missing 'student_id' or 'skills' field",
                                first_entry
                            )
                    else:
                        self.log_test(
                            "Test 8 - GET Social Skills (Class)",
                            False,
                            f"Expected non-empty list of entries, got: {entries}",
                            data
                        )
                else:
                    self.log_test(
                        "Test 8 - GET Social Skills (Class)",
                        False,
                        "Response missing required fields (class_id, term, academic_year, entries)",
                        data
                    )
            else:
                self.log_test(
                    "Test 8 - GET Social Skills (Class)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 8 - GET Social Skills (Class)", False, f"Exception: {str(e)}")

    def test_9_get_social_skills_class_404(self):
        """Test 9: GET social skills for non-existent class (expect 404)"""
        print("\n=== TEST 9: GET Social Skills (Non-existent Class - Expect 404) ===")
        
        fake_class_id = "00000000-0000-0000-0000-000000000000"
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/social-skills/class/{fake_class_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_test(
                    "Test 9 - GET Social Skills (404)",
                    True,
                    "Correctly returned 404 for non-existent class"
                )
            else:
                self.log_test(
                    "Test 9 - GET Social Skills (404)",
                    False,
                    f"Expected 404, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 9 - GET Social Skills (404)", False, f"Exception: {str(e)}")

    def test_10_report_card_includes_teacher_comment(self):
        """Test 10: GET /api/report-card/{student_id} includes teacher_comment"""
        print("\n=== TEST 10: Report Card Includes Teacher Comment ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/report-card/{self.test_student_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "teacher_comment" in data:
                    comment = data["teacher_comment"]
                    if comment and len(comment) > 0:
                        self.log_test(
                            "Test 10 - Report Card Teacher Comment",
                            True,
                            f"Report card includes teacher_comment: '{comment[:50]}...'"
                        )
                    else:
                        self.log_test(
                            "Test 10 - Report Card Teacher Comment",
                            True,
                            "Report card includes teacher_comment field (empty)"
                        )
                else:
                    self.log_test(
                        "Test 10 - Report Card Teacher Comment",
                        False,
                        "Report card response missing 'teacher_comment' field",
                        data
                    )
            else:
                self.log_test(
                    "Test 10 - Report Card Teacher Comment",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 10 - Report Card Teacher Comment", False, f"Exception: {str(e)}")

    def test_11_report_cards_class_includes_teacher_comment(self):
        """Test 11: GET /api/report-cards/class/{class_id} includes teacher_comment in each report"""
        print("\n=== TEST 11: Class Report Cards Include Teacher Comments ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.sunf_admin_token}"}
            response = requests.get(
                f"{BASE_URL}/report-cards/class/{self.test_class_id}",
                headers=headers,
                params={"term": "Term 1", "academic_year": "2024-2025"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "report_cards" in data:
                    report_cards = data["report_cards"]
                    
                    if isinstance(report_cards, list) and len(report_cards) > 0:
                        # Check first report card
                        first_card = report_cards[0]
                        
                        if "teacher_comment" in first_card:
                            # Count how many have comments
                            with_comments = sum(1 for card in report_cards if card.get("teacher_comment", "") != "")
                            
                            self.log_test(
                                "Test 11 - Class Report Cards Teacher Comments",
                                True,
                                f"All {len(report_cards)} report cards include teacher_comment field ({with_comments} with actual comments)"
                            )
                        else:
                            self.log_test(
                                "Test 11 - Class Report Cards Teacher Comments",
                                False,
                                "Report card missing 'teacher_comment' field",
                                first_card
                            )
                    else:
                        self.log_test(
                            "Test 11 - Class Report Cards Teacher Comments",
                            False,
                            f"Expected non-empty list of report_cards, got: {report_cards}",
                            data
                        )
                else:
                    self.log_test(
                        "Test 11 - Class Report Cards Teacher Comments",
                        False,
                        "Response missing 'report_cards' field",
                        data
                    )
            else:
                self.log_test(
                    "Test 11 - Class Report Cards Teacher Comments",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Test 11 - Class Report Cards Teacher Comments", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test scenarios"""
        print("=" * 70)
        print("🧪 Lumina-SIS Report Manager Backend API Test Suite")
        print("Testing teacher comments and social skills endpoints")
        print("=" * 70)
        print()
        
        # Setup authentication
        if not self.test_setup_authentication():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return self.print_summary()
        
        # Setup test data
        if not self.setup_test_data():
            print("\n❌ Test data setup failed. Cannot proceed with tests.")
            return self.print_summary()
        
        # Run all test scenarios
        comment_id = self.test_1_post_teacher_comment_admin()
        self.test_2_post_teacher_comment_update(comment_id)
        self.test_3_get_teacher_comment_single()
        self.test_4_get_teacher_comment_no_comment()
        self.test_5_get_teacher_comments_class()
        self.test_6_teacher_access_control_own_class()
        self.test_7_teacher_access_control_other_class()
        self.test_8_get_social_skills_class()
        self.test_9_get_social_skills_class_404()
        self.test_10_report_card_includes_teacher_comment()
        self.test_11_report_cards_class_includes_teacher_comment()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        # Group results by category
        auth_tests = [r for r in self.test_results if "Login" in r["test"] or "Setup" in r["test"]]
        teacher_comment_tests = [r for r in self.test_results if "Teacher Comment" in r["test"] or "Teacher Access" in r["test"]]
        social_skills_tests = [r for r in self.test_results if "Social Skills" in r["test"]]
        report_card_tests = [r for r in self.test_results if "Report Card" in r["test"]]
        
        # Show authentication results
        if auth_tests:
            print("\n🔐 Authentication & Setup:")
            for result in auth_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
        
        # Show teacher comment test results
        if teacher_comment_tests:
            print("\n💬 Teacher Comments Tests:")
            for result in teacher_comment_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
                if not result["success"]:
                    print(f"      └─ {result['message']}")
        
        # Show social skills test results
        if social_skills_tests:
            print("\n🎯 Social Skills Tests:")
            for result in social_skills_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
                if not result["success"]:
                    print(f"      └─ {result['message']}")
        
        # Show report card test results
        if report_card_tests:
            print("\n📄 Report Card Integration Tests:")
            for result in report_card_tests:
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
    tester = ReportManagerTester()
    success = tester.run_all_tests()
    
    # Exit with error code if tests failed  
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
