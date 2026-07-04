#!/usr/bin/env python3
"""
Seed 2025-2026 academic year and dummy data (gradebook, social skills, attendance)
for existing SUNF & RVSD schools.

Also ensures schools' academic_years list is populated and 2025-2026 is set as
current, so the "current academic year" system default is meaningful.

Idempotent — safe to re-run.

Usage:
    python /app/scripts/seed_2025_2026.py
"""
import asyncio
import os
import random
import sys
import uuid
from datetime import datetime, timezone, date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'lumina_sis')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

random.seed(2025)

YEAR = "2025-2026"
TERMS = ["Term 1", "Term 2", "Term 3"]

DEFAULT_SUBJECTS = [
    "English Language", "Mathematics", "Science", "Social Studies",
    "Religious Education", "Physical Education", "Creative Arts",
    "Music", "Information Technology", "French",
]

GRADE_BANDS = [
    (90, 100, "A+", 4.0, "Expert performance"),
    (85, 89, "A", 3.8, "Highly Proficient"),
    (80, 84, "A-", 3.7, "Proficient"),
    (75, 79, "B", 3.5, "Satisfactory"),
    (70, 74, "B-", 3.3, "Developing"),
    (65, 69, "C", 3.2, "Passing"),
    (60, 64, "C-", 2.8, "Passing"),
    (55, 59, "D", 2.6, "Marginal"),
    (50, 54, "D-", 2.4, "Below Average"),
    (40, 49, "E", 1.0, "Frustration"),
    (0, 39, "U", 0.0, "No participation"),
]

WEIGHTS = {
    "homework": 5, "groupWork": 5, "project": 10,
    "quiz": 10, "midTerm": 30, "endOfTerm": 40,
}


def score_to_grade(score):
    for lo, hi, letter, gpa, domain in GRADE_BANDS:
        if lo <= score <= hi:
            return letter, gpa, domain
    return "U", 0.0, "No participation"


async def ensure_school_academic_years():
    """Populate schools' academic_years list with 2024-2025 & 2025-2026, and
    set 2025-2026 as the CURRENT one (default for the whole system)."""
    updated = 0
    for code in ["JTECH", "SUNF", "RVSD"]:
        school = await db.schools.find_one({"school_code": code})
        if not school:
            continue
        academic_years = school.get("academic_years") or []
        by_year = {ay.get("year"): ay for ay in academic_years}
        # Add missing years
        for y in ["2024-2025", "2025-2026"]:
            if y not in by_year:
                by_year[y] = {
                    "year": y,
                    "terms": ["Term 1", "Term 2", "Term 3"],
                    "is_enabled": True,
                    "is_current": (y == YEAR),
                }
        # Ensure only 2025-2026 is current
        for y, ay in by_year.items():
            ay["is_current"] = (y == YEAR)
        rebuilt = sorted(by_year.values(), key=lambda a: a["year"])
        await db.schools.update_one(
            {"id": school["id"]},
            {"$set": {
                "academic_years": rebuilt,
                "current_academic_year": YEAR,
            }},
        )
        updated += 1
    return updated


async def seed_gradebook_for_school(school_code: str):
    """One gradebook document per (student, class, term, academic_year=2025-2026).
    Skips docs that already exist."""
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1, "class_id": 1, "first_name": 1, "last_name": 1}
    ).to_list(2000)
    classes = await db.classes.find(
        {"school_code": school_code}, {"_id": 0, "id": 1, "grade_level": 1, "name": 1, "teacher_id": 1, "teacher_name": 1}
    ).to_list(200)
    class_by_id = {c["id"]: c for c in classes}
    teachers = await db.users.find(
        {"school_code": school_code, "role": "teacher"}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(200)
    teacher_names = [t.get("name", "") for t in teachers] or ["Homeroom Teacher"]

    n_new = 0
    for s in students:
        cls = class_by_id.get(s.get("class_id"))
        if not cls:
            continue
        # Give each student a personal ability curve to make scores realistic
        base_ability = random.uniform(50, 92)
        for term in TERMS:
            existing = await db.gradebook.find_one({
                "school_code": school_code, "student_id": s["id"],
                "class_id": s["class_id"], "term": term, "academic_year": YEAR,
            })
            if existing:
                continue
            # Build per-subject scores with a normal wobble around the ability
            subjects = []
            for subj in DEFAULT_SUBJECTS:
                # Some subjects the student is stronger or weaker at
                subj_bias = random.uniform(-8, 8)
                comp = {}
                for c, _w in WEIGHTS.items():
                    mean = max(30, min(99, base_ability + subj_bias + random.uniform(-6, 6)))
                    comp[c] = int(max(0, min(100, mean)))
                # Sometimes project is missing (mimics real report cards)
                if random.random() < 0.35:
                    comp["project"] = None
                # Weighted score
                weighted_sum = 0.0
                weight_used = 0.0
                for c, w in WEIGHTS.items():
                    v = comp.get(c)
                    if v is None:
                        continue
                    weighted_sum += v * (w / 100.0)
                    weight_used += w / 100.0
                score = round(weighted_sum / weight_used) if weight_used else 0
                letter, gpa, domain = score_to_grade(score)
                subjects.append({
                    "subject": subj,
                    "teacher": random.choice(teacher_names),
                    "homework": comp["homework"],
                    "groupWork": comp["groupWork"],
                    "project": comp["project"],
                    "quiz": comp["quiz"],
                    "midTerm": comp["midTerm"],
                    "endOfTerm": comp["endOfTerm"],
                    "score": score,
                    "grade": letter,
                    "gpa": gpa,
                    "domain": domain,
                })
            # Overall
            all_scores = [x["score"] for x in subjects if x.get("score") is not None]
            overall = round(sum(all_scores) / len(all_scores)) if all_scores else 0
            overall_letter, overall_gpa, _ = score_to_grade(overall)

            await db.gradebook.insert_one({
                "id": str(uuid.uuid4()),
                "school_code": school_code,
                "student_id": s["id"],
                "class_id": s["class_id"],
                "term": term,
                "academic_year": YEAR,
                "subjects": subjects,
                "overall_score": overall,
                "overall_grade": overall_letter,
                "overall_gpa": overall_gpa,
                "is_locked": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            n_new += 1
    return n_new


async def seed_social_skills_for_school(school_code: str):
    """Seed a social_skills doc per student per term for 2025-2026."""
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1}
    ).to_list(2000)
    categories = {
        "Completes Assignments": ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Follows Instructions":  ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Punctuality":           ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Deportment":            ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Courteous":             ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Class Participation":   ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Respect for Teacher":   ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
        "Respect for Peers":     ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
    }
    n = 0
    for s in students:
        for term in TERMS:
            existing = await db.social_skills.find_one({
                "school_code": school_code, "student_id": s["id"],
                "term": term, "academic_year": YEAR,
            })
            if existing:
                continue
            skills = {k: random.choice(v) for k, v in categories.items()}
            await db.social_skills.insert_one({
                "id": str(uuid.uuid4()),
                "school_code": school_code,
                "student_id": s["id"],
                "term": term,
                "academic_year": YEAR,
                "skills": skills,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            n += 1
    return n


async def seed_attendance_2025_2026(school_code: str):
    """Add ~30 days of attendance in Sept-Nov 2025 for the 2025-2026 year."""
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1, "class_id": 1}
    ).to_list(2000)
    # Only seed if no attendance for 2025-2026 exists
    existing = await db.attendance.count_documents({
        "school_code": school_code,
        "date": {"$gte": "2025-09-01", "$lte": "2025-11-30"},
    })
    if existing:
        return 0

    days = []
    d = date(2025, 9, 1)
    end = date(2025, 11, 30)
    while d <= end:
        if d.weekday() < 5:  # Mon-Fri only
            days.append(d.isoformat())
        d += timedelta(days=1)
    # Take a random sample of ~30 days
    days = random.sample(days, k=min(30, len(days)))

    n = 0
    for day in days:
        docs = []
        for s in students:
            if not s.get("class_id"):
                continue
            r = random.random()
            if r < 0.90:   status = "Present"
            elif r < 0.95: status = "Late"
            elif r < 0.98: status = "Excused"
            else:          status = "Absent"
            docs.append({
                "id": str(uuid.uuid4()),
                "school_code": school_code,
                "student_id": s["id"],
                "class_id": s["class_id"],
                "date": day,
                "status": status,
                "marked_by": "system-seed",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        if docs:
            await db.attendance.insert_many(docs)
            n += len(docs)
    return n


async def main():
    print(f"→ Seeding 2025-2026 dummy data in database `{db_name}`\n")

    updated_schools = await ensure_school_academic_years()
    print(f"  Schools with academic_years populated: {updated_schools}")

    totals = {"gradebook": 0, "social": 0, "attendance": 0}
    for code in ["SUNF", "RVSD"]:
        school = await db.schools.find_one({"school_code": code})
        if not school:
            print(f"  [{code}] school not found — skipping")
            continue
        g = await seed_gradebook_for_school(code)
        s = await seed_social_skills_for_school(code)
        a = await seed_attendance_2025_2026(code)
        totals["gradebook"] += g
        totals["social"] += s
        totals["attendance"] += a
        print(f"  [{code}]  gradebook: {g}   social_skills: {s}   attendance: {a}")

    print(f"\n✔  Totals — gradebook: {totals['gradebook']}, social_skills: {totals['social']}, attendance rows: {totals['attendance']}\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
