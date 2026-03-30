#!/usr/bin/env python3
"""
Seed script to create TWO schools with comprehensive dummy data for testing.
This script creates data for:
1. Sunflower Academy (SUNF)
2. Riverside International School (RVSD)

Each school includes:
- School record
- Admin and teachers
- Multiple classes
- Students with family members
- Attendance records
- Gradebook entries with complete assessments
- Social skills records
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta, date
import random
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt

# Load environment
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'school_management')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def random_date(start_year=2010, end_year=2018):
    """Generate a random date for student DOB"""
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year}-{month:02d}-{day:02d}"

# Sample data
FIRST_NAMES_MALE = ["Oliver", "Lucas", "Ethan", "Mason", "Logan", "Noah", "Liam", "Jacob", "Alexander", "Henry", "Sebastian", "Jack", "Owen", "Leo", "Theodore"]
FIRST_NAMES_FEMALE = ["Charlotte", "Amelia", "Harper", "Evelyn", "Emily", "Luna", "Mia", "Aria", "Scarlett", "Chloe", "Sofia", "Lily", "Zoe", "Bella", "Hannah"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"]
MIDDLE_NAMES = ["", "Grace", "Rose", "Mae", "James", "Alexander", "Elizabeth", "Marie", "Ann", "Lee", "Michael", "Joseph"]

HOUSES = ["Red House", "Blue House", "Green House", "Yellow House"]
GENDERS = ["Male", "Female"]
RELATIONSHIPS = ["Mother", "Father", "Guardian", "Aunt", "Uncle", "Grandparent", "Stepmother", "Stepfather"]
SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr."]

SUBJECTS = [
    "English Language", "Mathematics", "Science", "Social Studies",
    "Religious Education", "Physical Education", "Creative Arts",
    "Music", "ICT", "French"
]

GRADE_LEVELS = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"]

# School configurations
SCHOOLS = {
    "SUNF": {
        "school_code": "SUNF",
        "name": "Sunflower Academy",
        "address": "456 Sunshine Boulevard, Tema, Ghana",
        "phone": "+233 30 234 5678",
        "email": "info@sunfloweracademy.edu.gh",
        "principal": "Dr. Patricia Agyeman",
        "motto": "Growing Minds, Building Futures"
    },
    "RVSD": {
        "school_code": "RVSD", 
        "name": "Riverside International School",
        "address": "789 River Road, Kumasi, Ghana",
        "phone": "+233 32 345 6789",
        "email": "contact@riverside.edu.gh",
        "principal": "Mr. Stephen Osei",
        "motto": "Excellence in Education, Leadership in Life"
    }
}

TEACHERS_DATA = {
    "SUNF": [
        ("Mrs.", "Sarah", "Jane", "Thompson", "Female", "English Language"),
        ("Mr.", "David", "Michael", "Chen", "Male", "Mathematics"),
        ("Ms.", "Jennifer", "Lynn", "Martinez", "Female", "Science"),
        ("Mr.", "Robert", "James", "Wilson", "Male", "Social Studies"),
        ("Mrs.", "Linda", "Rose", "Davis", "Female", "Creative Arts"),
        ("Dr.", "Michael", "Paul", "Brown", "Male", "Physical Education"),
    ],
    "RVSD": [
        ("Dr.", "Elizabeth", "Grace", "Anderson", "Female", "Mathematics"),
        ("Mr.", "Christopher", "Lee", "Taylor", "Male", "English Language"),
        ("Ms.", "Amanda", "Marie", "Garcia", "Female", "Science"),
        ("Mrs.", "Jessica", "Ann", "Moore", "Female", "Social Studies"),
        ("Mr.", "Daniel", "Joseph", "White", "Male", "ICT"),
        ("Mrs.", "Michelle", "Hope", "Harris", "Female", "Music"),
    ]
}

CLASSES_DATA = [
    ("Grade 1A", "Grade 1", "Room 101"),
    ("Grade 1B", "Grade 1", "Room 102"),
    ("Grade 2A", "Grade 2", "Room 201"),
    ("Grade 2B", "Grade 2", "Room 202"),
    ("Grade 3A", "Grade 3", "Room 301"),
    ("Grade 3B", "Grade 3", "Room 302"),
    ("Grade 4A", "Grade 4", "Room 401"),
    ("Grade 4B", "Grade 4", "Room 402"),
    ("Grade 5A", "Grade 5", "Room 501"),
    ("Grade 5B", "Grade 5", "Room 502"),
    ("Grade 6A", "Grade 6", "Room 601"),
    ("Grade 6B", "Grade 6", "Room 602"),
]

async def create_school(school_code):
    """Create a school"""
    school_info = SCHOOLS[school_code]
    existing = await db.schools.find_one({"school_code": school_code})
    if existing:
        print(f"   {school_info['name']} already exists, skipping...")
        return existing["id"]
    
    school_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    school_doc = {
        "id": school_id,
        "school_code": school_code,
        "name": school_info["name"],
        "address": school_info["address"],
        "phone": school_info["phone"],
        "email": school_info["email"],
        "logo_url": "",
        "is_active": True,
        "created_at": now
    }
    await db.schools.insert_one(school_doc)
    print(f"   ✅ Created {school_info['name']}")
    return school_id

async def create_report_template(school_code):
    """Create default report template for school"""
    school_info = SCHOOLS[school_code]
    existing = await db.report_templates.find_one({"school_code": school_code})
    if existing:
        print(f"   Report template for {school_code} already exists, skipping...")
        return
    
    template = {
        "id": str(uuid.uuid4()),
        "school_code": school_code,
        "school_name": school_info["name"],
        "school_motto": school_info["motto"],
        "logo_url": "",
        "header_text": "REPORT CARD",
        "sub_header_text": "Academic Progress Report",
        "subjects": [
            {"name": "English Language", "is_core": True},
            {"name": "Mathematics", "is_core": True},
            {"name": "Science", "is_core": True},
            {"name": "Social Studies", "is_core": True},
            {"name": "Religious Education", "is_core": False},
            {"name": "Physical Education", "is_core": False},
            {"name": "Creative Arts", "is_core": False},
            {"name": "Music", "is_core": False},
            {"name": "ICT", "is_core": False},
            {"name": "French", "is_core": False}
        ],
        "grade_scale": [
            {"min": 90, "max": 100, "grade": "A+", "description": "Expert performance"},
            {"min": 85, "max": 89, "grade": "A", "description": "Highly Proficient"},
            {"min": 80, "max": 84, "grade": "A-", "description": "Proficient"},
            {"min": 75, "max": 79, "grade": "B", "description": "Satisfactory"},
            {"min": 70, "max": 74, "grade": "B-", "description": "Developing"},
            {"min": 65, "max": 69, "grade": "C", "description": "Passing"},
            {"min": 60, "max": 64, "grade": "C-", "description": "Passing"},
            {"min": 55, "max": 59, "grade": "D", "description": "Marginal"},
            {"min": 50, "max": 54, "grade": "D-", "description": "Below Average"},
            {"min": 40, "max": 49, "grade": "E", "description": "Frustration"},
            {"min": 0, "max": 39, "grade": "U", "description": "No participation"}
        ],
        "use_weighted_grading": True,
        "assessment_weights": {
            "homework": 5,
            "groupWork": 5,
            "project": 10,
            "quiz": 10,
            "midTerm": 30,
            "endOfTerm": 40
        },
        "sections": {
            "attendance": True,
            "teacher_remarks": True,
            "principal_remarks": True,
            "social_skills": True
        },
        "social_skills_categories": [
            {"category_name": "Work Habits", "skills": ["Completes Assignments", "Follows Instructions", "Punctuality", "Neatness"]},
            {"category_name": "Social Behavior", "skills": ["Deportment", "Courteous in Speech and Action", "Respect for Teacher", "Respect for Peers"]},
            {"category_name": "Personal Growth", "skills": ["Initiative", "Cooperation", "Leadership", "Self-Control"]}
        ],
        "skill_ratings": [
            {"code": "EX", "label": "Excellent"},
            {"code": "VG", "label": "Very Good"},
            {"code": "G", "label": "Good"},
            {"code": "NI", "label": "Needs Improvement"}
        ],
        "achievement_standards": [
            {"min": 86, "max": 100, "band": "HP", "grade": "Highly Proficient", "description": "Exceeds expectations"},
            {"min": 75, "max": 85, "band": "P", "grade": "Proficient", "description": "Meets expectations"},
            {"min": 60, "max": 74, "band": "AP", "grade": "Approaching Proficiency", "description": "Approaching expectations"},
            {"min": 50, "max": 59, "band": "D", "grade": "Developing", "description": "Below expectations"},
            {"min": 0, "max": 49, "band": "B", "grade": "Beginning", "description": "Needs significant support"}
        ],
        "paper_size": "legal",
        "design_mode": "canvas",
        "blocks": [],
        "canvas_elements": [],
        "theme": {"primaryColor": "#1e40af", "secondaryColor": "#3b82f6"},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.report_templates.insert_one(template)
    print(f"   ✅ Created report template for {school_code}")

async def create_admin(school_code):
    """Create admin user for school"""
    school_info = SCHOOLS[school_code]
    existing = await db.users.find_one({"username": "admin", "school_code": school_code})
    if existing:
        print(f"   Admin for {school_code} already exists, skipping...")
        return existing["id"]
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "username": "admin",
        "name": f"{school_info['name']} Administrator",
        "role": "admin",
        "school_code": school_code,
        "permissions": [
            "manage_schools", "manage_users", "manage_students", "manage_classes",
            "manage_attendance", "manage_grades", "view_reports", "generate_reports"
        ],
        "password_hash": hash_password("Admin@123"),
        "photo_url": "",
        "salutation": "Mr." if school_code == "RVSD" else "Mrs.",
        "first_name": "Administrator",
        "middle_name": "",
        "last_name": school_code,
        "gender": "Male" if school_code == "RVSD" else "Female",
        "address_line1": school_info["address"].split(",")[0],
        "address_line2": "",
        "city_state": ", ".join(school_info["address"].split(",")[1:]),
        "country": "Ghana",
        "phone": school_info["phone"],
        "email": school_info["email"],
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    print(f"   ✅ Created admin for {school_code}")
    return user_id

async def create_teachers(school_code):
    """Create teachers for school"""
    teachers = []
    teacher_data = TEACHERS_DATA[school_code]
    school_info = SCHOOLS[school_code]
    
    for i, (salutation, first, middle, last, gender, subjects) in enumerate(teacher_data):
        username = f"{first.lower()}.{last.lower()}.{school_code.lower()}"
        existing = await db.users.find_one({"username": username, "school_code": school_code})
        if existing:
            teachers.append(existing["id"])
            continue
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user_doc = {
            "id": user_id,
            "username": username,
            "name": f"{first} {last}",
            "role": "teacher",
            "school_code": school_code,
            "permissions": ["manage_students", "manage_attendance", "manage_grades", "view_reports"],
            "password_hash": hash_password("Teacher@123"),
            "photo_url": "",
            "salutation": salutation,
            "first_name": first,
            "middle_name": middle,
            "last_name": last,
            "gender": gender,
            "address_line1": f"{i+10} Teacher's Lane",
            "address_line2": school_info["address"].split(",")[0],
            "city_state": ", ".join(school_info["address"].split(",")[1:]),
            "country": "Ghana",
            "phone": f"+233 {random.choice(['20', '24', '27', '54'])} {random.randint(100,999)} {random.randint(1000,9999)}",
            "email": f"{username.replace('.', '_')}@{school_info['email'].split('@')[1]}",
            "created_at": now
        }
        await db.users.insert_one(user_doc)
        teachers.append(user_id)
        print(f"   ✅ Created teacher: {first} {last}")
    
    return teachers

async def create_classes(school_code, teacher_ids):
    """Create classes for school"""
    classes = []
    
    for idx, (name, grade_level, room) in enumerate(CLASSES_DATA):
        class_name = f"{school_code}-{name}"
        existing = await db.classes.find_one({"name": class_name, "school_code": school_code})
        if existing:
            classes.append(existing["id"])
            continue
        
        class_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        class_doc = {
            "id": class_id,
            "name": class_name,
            "grade_level": grade_level,
            "teacher_id": teacher_ids[idx % len(teacher_ids)] if teacher_ids else None,
            "room_number": room,
            "academic_year": "2024-2025",
            "school_code": school_code,
            "created_by": teacher_ids[idx % len(teacher_ids)] if teacher_ids else None,
            "created_at": now
        }
        await db.classes.insert_one(class_doc)
        classes.append(class_id)
        print(f"   ✅ Created class: {class_name}")
    
    return classes

def generate_family_member(relationship, last_name):
    """Generate a family member with full details"""
    is_male = relationship in ["Father", "Uncle", "Stepfather"] or (relationship in ["Guardian", "Grandparent"] and random.random() > 0.5)
    
    first_name = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
    
    return {
        "id": str(uuid.uuid4()),
        "salutation": random.choice(["Mr.", "Dr."] if is_male else ["Mrs.", "Ms.", "Dr."]),
        "first_name": first_name,
        "middle_name": random.choice(MIDDLE_NAMES),
        "last_name": last_name if relationship in ["Mother", "Father"] else random.choice(LAST_NAMES),
        "gender": "Male" if is_male else "Female",
        "relationship": relationship,
        "address_line1": f"{random.randint(1, 999)} {random.choice(['Oak Street', 'Maple Avenue', 'Pine Road', 'Cedar Lane', 'Elm Drive', 'Birch Court'])}",
        "address_line2": random.choice(["", "Apt 2B", "Unit 5", "Suite 201", "Block C"]),
        "city_state": random.choice(["Accra, Greater Accra", "Kumasi, Ashanti", "Tema, Greater Accra", "Cape Coast, Central", "Takoradi, Western"]),
        "country": "Ghana",
        "home_phone": f"+233 30 {random.randint(200,999)} {random.randint(1000,9999)}",
        "cell_phone": f"+233 {random.choice(['20', '24', '27', '54', '55', '59'])} {random.randint(100,999)} {random.randint(1000,9999)}",
        "work_phone": f"+233 30 {random.randint(200,999)} {random.randint(1000,9999)}" if random.random() > 0.4 else "",
        "email": f"{first_name.lower()}.{last_name.lower()}@{random.choice(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'])}"
    }

async def create_students(school_code, class_ids):
    """Create students for school"""
    students = []
    student_count = 0
    school_prefix = school_code
    
    for class_id in class_ids:
        # Get class info
        class_info = await db.classes.find_one({"id": class_id})
        if not class_info:
            continue
        
        grade_level = class_info["grade_level"]
        grade_num = int(grade_level.replace("Grade ", ""))
        
        # Calculate birth year range (Grade 1 = ~6 years old)
        current_year = 2025
        birth_year = current_year - (grade_num + 5)
        start_year = birth_year - 1
        end_year = birth_year + 1
        
        # Create 10-15 students per class
        num_students = random.randint(10, 15)
        
        for i in range(num_students):
            is_male = random.random() > 0.5
            first_name = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
            last_name = random.choice(LAST_NAMES)
            
            # Check if student already exists
            student_id_str = f"{school_prefix}-{str(student_count + 1001).zfill(4)}"
            existing = await db.students.find_one({"student_id": student_id_str, "school_code": school_code})
            if existing:
                students.append(existing["id"])
                student_count += 1
                continue
            
            student_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            # Generate 2-3 family members
            family_members = []
            num_family = random.randint(2, 3)
            relationships_pool = ["Mother", "Father", "Guardian", "Aunt", "Uncle", "Grandparent"]
            selected_rels = random.sample(relationships_pool, min(num_family, len(relationships_pool)))
            
            for rel in selected_rels:
                family_members.append(generate_family_member(rel, last_name))
            
            student_doc = {
                "id": student_id,
                "student_id": student_id_str,
                "first_name": first_name,
                "middle_name": random.choice(MIDDLE_NAMES),
                "last_name": last_name,
                "date_of_birth": random_date(start_year, end_year),
                "gender": "Male" if is_male else "Female",
                "student_phone": f"+233 {random.choice(['55', '59'])} {random.randint(100,999)} {random.randint(1000,9999)}" if random.random() > 0.7 else "",
                "student_email": f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@student.edu.gh" if random.random() > 0.6 else "",
                "address_line1": f"{random.randint(1, 999)} {random.choice(['Main Street', 'High Street', 'Market Road', 'School Lane', 'Church Avenue'])}",
                "address_line2": random.choice(["", "Apt 3", "Block A", "Unit 7"]),
                "city_state": random.choice(["Accra, Greater Accra", "Kumasi, Ashanti", "Tema, Greater Accra", "Cape Coast, Central"]),
                "country": "Ghana",
                "house": random.choice(HOUSES),
                "class_id": class_id,
                "emergency_contact": family_members[0]["cell_phone"] if family_members else "",
                "teacher_comment": "",
                "photo_url": "",
                "family_members": family_members,
                "address": "",
                "parent_id": None,
                "school_code": school_code,
                "created_at": now,
                "updated_at": now
            }
            await db.students.insert_one(student_doc)
            students.append(student_id)
            student_count += 1
        
        print(f"   ✅ Created {num_students} students for {class_info['name']}")
    
    print(f"   📊 Total students for {school_code}: {student_count}")
    return students

async def create_attendance(school_code):
    """Create attendance records for the past 2 weeks"""
    attendance_count = 0
    
    # Get students for this school
    students = await db.students.find({"school_code": school_code}, {"id": 1, "class_id": 1}).to_list(2000)
    
    # Create attendance for past 10 school days
    today = date.today()
    school_days = []
    d = today
    while len(school_days) < 10:
        d = d - timedelta(days=1)
        if d.weekday() < 5:  # Monday to Friday
            school_days.append(d)
    
    for school_date in school_days:
        date_str = school_date.strftime("%Y-%m-%d")
        
        for student in students:
            # Check if attendance already exists
            existing = await db.attendance.find_one({
                "student_id": student["id"],
                "date": date_str,
                "school_code": school_code
            })
            if existing:
                continue
            
            # Random attendance status (93% present, 5% absent, 2% late)
            rand = random.random()
            if rand < 0.93:
                status = "present"
            elif rand < 0.98:
                status = "absent"
            else:
                status = "late"
            
            attendance_doc = {
                "id": str(uuid.uuid4()),
                "student_id": student["id"],
                "class_id": student.get("class_id", ""),
                "date": date_str,
                "status": status,
                "school_code": school_code,
                "marked_by": "system",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.attendance.insert_one(attendance_doc)
            attendance_count += 1
    
    print(f"   ✅ Created {attendance_count} attendance records for {school_code}")

def get_grade_info(score):
    """Get grade info from score"""
    GRADING_SCHEME = [
        {"min": 90, "max": 100, "grade": "A+", "domain": "Expert performance", "points": 4.0},
        {"min": 85, "max": 89, "grade": "A", "domain": "Highly Proficient", "points": 3.8},
        {"min": 80, "max": 84, "grade": "A-", "domain": "Proficient", "points": 3.7},
        {"min": 75, "max": 79, "grade": "B", "domain": "Satisfactory", "points": 3.5},
        {"min": 70, "max": 74, "grade": "B-", "domain": "Developing", "points": 3.3},
        {"min": 65, "max": 69, "grade": "C", "domain": "Passing", "points": 3.2},
        {"min": 60, "max": 64, "grade": "C-", "domain": "Passing", "points": 2.8},
        {"min": 55, "max": 59, "grade": "D", "domain": "Marginal", "points": 2.6},
        {"min": 50, "max": 54, "grade": "D-", "domain": "Below Average", "points": 2.4},
        {"min": 40, "max": 49, "grade": "E", "domain": "Frustration", "points": 1.0},
        {"min": 0, "max": 39, "grade": "U", "domain": "No participation", "points": 0},
    ]
    rounded = round(score)
    for scheme in GRADING_SCHEME:
        if scheme["min"] <= rounded <= scheme["max"]:
            return {"grade": scheme["grade"], "domain": scheme["domain"], "points": scheme["points"]}
    return {"grade": "U", "domain": "No participation", "points": 0}

async def create_gradebook_entries(school_code):
    """Create gradebook entries with assessment components"""
    gradebook_count = 0
    
    # Get students for this school
    students = await db.students.find({"school_code": school_code}, {"id": 1, "class_id": 1}).to_list(2000)
    
    # Assessment weights
    WEIGHTS = {
        "homework": 0.05,
        "groupWork": 0.05,
        "project": 0.10,
        "quiz": 0.10,
        "midTerm": 0.30,
        "endOfTerm": 0.40
    }
    
    for student in students:
        # Check if gradebook already exists
        existing = await db.gradebook.find_one({
            "student_id": student["id"],
            "term": "Term 1",
            "academic_year": "2024-2025",
            "school_code": school_code
        })
        if existing:
            gradebook_count += 1
            continue
        
        subjects_data = []
        total_score = 0
        
        for subject in SUBJECTS:
            # Generate realistic component scores
            base = random.randint(60, 90)
            
            homework = max(0, min(100, base + random.randint(-15, 20)))
            group_work = max(0, min(100, base + random.randint(-10, 15)))
            project = max(0, min(100, base + random.randint(-12, 18)))
            quiz = max(0, min(100, base + random.randint(-10, 15)))
            mid_term = max(0, min(100, base + random.randint(-8, 12)))
            end_of_term = max(0, min(100, base + random.randint(-10, 15)))
            
            # Calculate weighted score
            weighted_score = (
                homework * WEIGHTS["homework"] +
                group_work * WEIGHTS["groupWork"] +
                project * WEIGHTS["project"] +
                quiz * WEIGHTS["quiz"] +
                mid_term * WEIGHTS["midTerm"] +
                end_of_term * WEIGHTS["endOfTerm"]
            )
            
            grade_info = get_grade_info(weighted_score)
            
            subjects_data.append({
                "subject": subject,
                "homework": homework,
                "groupWork": group_work,
                "project": project,
                "quiz": quiz,
                "midTerm": mid_term,
                "endOfTerm": end_of_term,
                "score": round(weighted_score, 2),
                "grade": grade_info["grade"],
                "comment": ""
            })
            total_score += weighted_score
        
        overall_score = total_score / len(SUBJECTS)
        overall_info = get_grade_info(overall_score)
        
        gradebook_doc = {
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "class_id": student.get("class_id", ""),
            "school_code": school_code,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "subjects": subjects_data,
            "overall_score": round(overall_score, 2),
            "overall_grade": overall_info["grade"],
            "overall_points": overall_info["points"],
            "overall_domain": overall_info["domain"],
            "graded_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gradebook.insert_one(gradebook_doc)
        gradebook_count += 1
    
    print(f"   ✅ Created {gradebook_count} gradebook entries for {school_code}")

async def create_social_skills(school_code):
    """Create social skills entries for students"""
    skills_count = 0
    
    students = await db.students.find({"school_code": school_code}, {"id": 1}).to_list(2000)
    
    SKILLS_LIST = [
        "Completes Assignments", "Follows Instructions", "Punctuality", "Neatness",
        "Deportment", "Courteous in Speech and Action", "Respect for Teacher", "Respect for Peers",
        "Initiative", "Cooperation", "Leadership", "Self-Control"
    ]
    
    RATINGS = ["Excellent", "Very Good", "Good", "Needs Improvement"]
    
    for student in students:
        existing = await db.social_skills.find_one({
            "student_id": student["id"],
            "term": "Term 1",
            "academic_year": "2024-2025",
            "school_code": school_code
        })
        if existing:
            skills_count += 1
            continue
        
        # Generate random skill ratings (weighted towards positive)
        skills = {}
        for skill in SKILLS_LIST:
            weights = [0.30, 0.35, 0.25, 0.10]  # Favor Excellent and Very Good
            skills[skill] = random.choices(RATINGS, weights=weights)[0]
        
        skills_doc = {
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "school_code": school_code,
            "term": "Term 1",
            "academic_year": "2024-2025",
            "skills": skills,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.social_skills.insert_one(skills_doc)
        skills_count += 1
    
    print(f"   ✅ Created {skills_count} social skills records for {school_code}")

async def seed_school(school_code):
    """Seed complete data for one school"""
    school_info = SCHOOLS[school_code]
    print(f"\n{'='*60}")
    print(f"🏫 Seeding {school_info['name']} ({school_code})")
    print(f"{'='*60}")
    
    # 1. Create school
    print("\n📚 Creating School...")
    await create_school(school_code)
    
    # 2. Create report template
    print("\n📋 Creating Report Template...")
    await create_report_template(school_code)
    
    # 3. Create admin
    print("\n👤 Creating Admin User...")
    await create_admin(school_code)
    
    # 4. Create teachers
    print("\n👨‍🏫 Creating Teachers...")
    teacher_ids = await create_teachers(school_code)
    
    # 5. Create classes
    print("\n🏫 Creating Classes...")
    class_ids = await create_classes(school_code, teacher_ids)
    
    # 6. Create students
    print("\n👨‍🎓 Creating Students...")
    await create_students(school_code, class_ids)
    
    # 7. Create attendance
    print("\n📅 Creating Attendance Records...")
    await create_attendance(school_code)
    
    # 8. Create gradebook
    print("\n📊 Creating Gradebook Entries...")
    await create_gradebook_entries(school_code)
    
    # 9. Create social skills
    print("\n🌟 Creating Social Skills Records...")
    await create_social_skills(school_code)

async def main():
    """Main function to seed all schools"""
    print("\n" + "="*60)
    print("🎓 TWO SCHOOLS DATA SEEDING SCRIPT")
    print("="*60)
    
    try:
        # Seed both schools
        for school_code in ["SUNF", "RVSD"]:
            await seed_school(school_code)
        
        print("\n" + "="*60)
        print("✅ ALL SCHOOLS DATA SEEDING COMPLETE!")
        print("="*60)
        print("\n📝 Login Credentials:")
        print("\n🏫 SUNFLOWER ACADEMY (SUNF):")
        print("   School Code: SUNF")
        print("   Admin Username: admin")
        print("   Admin Password: Admin@123")
        print("   Teacher Example: sarah.thompson.sunf / Teacher@123")
        print("\n🏫 RIVERSIDE INTERNATIONAL SCHOOL (RVSD):")
        print("   School Code: RVSD")
        print("   Admin Username: admin")
        print("   Admin Password: Admin@123")
        print("   Teacher Example: elizabeth.anderson.rvsd / Teacher@123")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(main())
