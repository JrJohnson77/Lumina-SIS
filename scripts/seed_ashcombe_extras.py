#!/usr/bin/env python3
"""
Seed extension: adds Ashcombe-style report-card fields to SUNF & RVSD students
and creates teacher_comments + discipline_incidents for realistic report cards.

Idempotent: safe to run multiple times.

Run:
    python /app/scripts/seed_ashcombe_extras.py
"""
import asyncio
import os
import random
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'lumina_sis')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

random.seed(2026)

TERMS = ["Term 1", "Term 2", "Term 3"]
YEAR = "2025-2026"

AWARDS_POOL = [
    "Principal's honour roll",
    "Information technology excellence award",
    "Debate club MVP",
    "Perfect attendance",
    "Sportsmanship award",
    "Science fair winner",
    "Community service award",
    "Reading challenge champion",
    "Mathematics olympiad qualifier",
    "Choir soloist",
]

LEADERSHIP_POOL = [
    "Form prefect", "House captain", "Sports captain",
    "Library monitor", "Class president", "Peer mentor", ""
]

CO_INTRA_POOL = ["Chess club", "Robotics club", "Choir", "Art club", "Drama club", "Coding club"]
CO_INTER_POOL = ["Debate team", "Football team", "Netball team", "Track & field", "Quiz bowl", ""]

TEACHER_COMMENTS = [
    "A conscientious learner who consistently produces high-quality work. Continued focus on presentation would refine an already strong performance.",
    "Has shown noticeable growth this term, particularly in written expression. Encouraging deeper engagement in group tasks will boost confidence.",
    "Bright and inquisitive; contributes thoughtfully during discussions. Should aim for more balanced effort across all subjects.",
    "A cheerful, cooperative student. Independent reading habit is paying off in comprehension scores. Keep it up.",
    "Steady, dependable work throughout the term. Would benefit from taking on more challenging problems in mathematics.",
    "Creative thinker with a strong artistic flair. A little more attention to structured writing tasks will elevate overall results.",
    "Displays real curiosity in science lessons. Time management during exams will be a focus for next term.",
    "Warm, respectful, and always willing to help peers. Effort in homework is steadily improving.",
]

DISCIPLINE_ACTIONS = ["Verbal Warning", "Written Warning", "Detention", "Parental Meeting", ""]
DISCIPLINE_TYPES = ["Minor", "Moderate", "Major"]
DISCIPLINE_DESCRIPTIONS = [
    "Late to homeroom without a note.",
    "Talking during class transitions.",
    "Uniform violation (untucked shirt).",
    "Chewing gum in class.",
    "Failure to submit homework.",
]


async def ensure_student_report_fields(school_code: str):
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1, "last_name": 1, "advisor": 1, "awards": 1, "personal_development": 1, "class_id": 1}
    ).to_list(2000)
    if not students:
        print(f"  [{school_code}] no students yet — run seed_two_schools.py first")
        return 0

    # Pick advisor names from teachers in this school
    teachers = await db.users.find(
        {"school_code": school_code, "role": "teacher"}, {"_id": 0, "name": 1}
    ).to_list(200)
    teacher_names = [t.get("name", "") for t in teachers] or ["Homeroom Teacher"]

    n_updated = 0
    for s in students:
        # Skip students already tagged with awards/personal_development
        if s.get("advisor") and s.get("awards") and s.get("personal_development"):
            continue
        update = {
            "advisor": random.choice(teacher_names),
            "awards": random.sample(AWARDS_POOL, k=random.randint(0, 3)),
            "personal_development": {
                "leadership_role": random.choice(LEADERSHIP_POOL),
                "community_service_hours": round(random.uniform(0, 20), 1),
                "cocurricular_intra": random.choice(CO_INTRA_POOL),
                "cocurricular_inter": random.choice(CO_INTER_POOL),
                "conformity": random.randint(3, 6),
                "grooming": random.randint(3, 6),
                "courtesy": random.randint(3, 6),
                "focus": random.randint(2, 6),
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.students.update_one({"id": s["id"], "school_code": school_code}, {"$set": update})
        n_updated += 1
    return n_updated


async def ensure_teacher_comments(school_code: str):
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1}
    ).to_list(2000)
    n = 0
    for s in students:
        for term in TERMS:
            existing = await db.teacher_comments.find_one({
                "school_code": school_code, "student_id": s["id"],
                "term": term, "academic_year": YEAR,
            })
            if existing:
                continue
            await db.teacher_comments.insert_one({
                "id": str(uuid.uuid4()),
                "school_code": school_code,
                "student_id": s["id"],
                "term": term,
                "academic_year": YEAR,
                "comment": random.choice(TEACHER_COMMENTS),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            n += 1
    return n


async def ensure_discipline_incidents(school_code: str):
    students = await db.students.find(
        {"school_code": school_code}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1}
    ).to_list(2000)
    existing_count = await db.discipline_incidents.count_documents({"school_code": school_code})
    if existing_count >= max(6, len(students) // 3):
        return 0
    # Pick a few teachers to attribute incidents to
    teachers = await db.users.find(
        {"school_code": school_code, "role": "teacher"}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(50)
    teachers = teachers or [{"id": "system", "name": "System"}]

    n = 0
    # Give roughly every 4th student one incident
    for s in random.sample(students, k=min(len(students), max(3, len(students) // 4))):
        teacher = random.choice(teachers)
        d = datetime.now(timezone.utc).date().isoformat()
        await db.discipline_incidents.insert_one({
            "id": str(uuid.uuid4()),
            "school_code": school_code,
            "student_id": s["id"],
            "type": random.choice(DISCIPLINE_TYPES),
            "date": d,
            "description": random.choice(DISCIPLINE_DESCRIPTIONS),
            "action_taken": random.choice(DISCIPLINE_ACTIONS),
            "status": random.choice(["Open", "In Progress", "Resolved"]),
            "reported_by": teacher.get("id"),
            "reported_by_name": teacher.get("name"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        n += 1
    return n


async def main():
    print(f"→ Extending dummy data in database `{db_name}`\n")
    total_report_fields = 0
    total_comments = 0
    total_incidents = 0
    for code in ["SUNF", "RVSD"]:
        school = await db.schools.find_one({"school_code": code})
        if not school:
            print(f"  [{code}] school not found — skipping")
            continue
        r = await ensure_student_report_fields(code)
        c = await ensure_teacher_comments(code)
        i = await ensure_discipline_incidents(code)
        total_report_fields += r
        total_comments += c
        total_incidents += i
        print(f"  [{code}]  advisor/awards/PD: {r}   teacher_comments: {c}   discipline: {i}")

    print(f"\n✔  Done. Report-field updates: {total_report_fields}, comments added: {total_comments}, incidents added: {total_incidents}\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
