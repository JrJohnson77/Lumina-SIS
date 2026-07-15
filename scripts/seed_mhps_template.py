#!/usr/bin/env python3
"""
Seed the tenant-locked MHPS Upper School Report Card template.

- Renames the MHPS school to 'Mona Heights Primary School' + branding.
- Installs the design_mode='mhps_upper' report template (mhps_settings).
- Seeds the 13 stock comment_bank entries.
- Populates report_cards for all Upper-School (Grades 4-6) MHPS students for
  one term so the printed layout has real data to render.

Idempotent: safe to re-run.
"""
import asyncio
import os
import sys
import random
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env"))

from mhps_report import (  # noqa: E402
    MHPS_SCHOOL_CODE, build_mhps_template, build_mhps_settings, seed_comment_docs,
    MHPS_SUBJECTS, MHPS_CORE_SUBJECTS, MHPS_HOUSES, MHPS_WORK_ETHICS_CRITERIA,
    MHPS_SOCIAL_SKILLS_CRITERIA, MHPS_COMPONENTS, compute_report_card,
)

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ.get("DB_NAME", "school_management")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

TERM = "Term 1"
ACADEMIC_YEAR = "2024-2025"
TERM_LABEL = "Easter and Summer Term, 2025"
PERIOD_LABEL = "January \u2013 June 2025"
RATINGS = ["EX", "VG", "G", "NI"]
UPPER_GRADES = {"Grade 4", "Grade 5", "Grade 6"}


async def rename_school():
    now = datetime.now(timezone.utc).isoformat()
    res = await db.schools.update_one(
        {"school_code": MHPS_SCHOOL_CODE},
        {"$set": {
            "name": "Mona Heights Primary School",
            "tagline": "Excellence Through Discipline & Diligence",
            "motto": "Virtute et Labore",
            "address": "6 Buttercup Drive, Mona Heights, Kingston 6",
            "phone": "(876) 672-0633",
            "email": "monaheights.primary.saw@moey.gov.jm",
            "principal_name": "A. Hepburn (Mr.) M.Ed., B.A.(Hon)., Dip Edu",
            "logo_url": "/assets/mhps_header.png",
            "primary_color": "#1F5C3F",
            "accent_color": "#C9A227",
            "updated_at": now,
        }},
    )
    print(f"\u2705 School renamed/branded (matched={res.matched_count})")


async def seed_template():
    school = await db.schools.find_one({"school_code": MHPS_SCHOOL_CODE}, {"_id": 0}) or {}
    existing = await db.report_templates.find_one(
        {"school_code": MHPS_SCHOOL_CODE, "design_mode": "mhps_upper"}, {"_id": 0}
    )
    if existing:
        # keep any admin customizations; just make sure settings key exists
        if not existing.get("mhps_settings"):
            await db.report_templates.update_one(
                {"school_code": MHPS_SCHOOL_CODE},
                {"$set": {"mhps_settings": build_mhps_settings()}},
            )
        print("\u2139\ufe0f  MHPS template already exists \u2014 left intact")
        return
    tpl = build_mhps_template(MHPS_SCHOOL_CODE, school.get("name", "Mona Heights Primary School"))
    await db.report_templates.update_one(
        {"school_code": MHPS_SCHOOL_CODE}, {"$set": tpl}, upsert=True
    )
    print("\u2705 MHPS Upper School template installed (design_mode=mhps_upper, scope=tenant)")


async def seed_comments():
    count = await db.comment_bank.count_documents({"school_code": MHPS_SCHOOL_CODE})
    if count:
        print(f"\u2139\ufe0f  comment_bank already has {count} entries \u2014 skipping")
        return
    docs = seed_comment_docs(MHPS_SCHOOL_CODE)
    await db.comment_bank.insert_many([dict(d) for d in docs])
    print(f"\u2705 Seeded {len(docs)} stock comments")


def _rand_score(base):
    return max(35, min(100, base + random.randint(-8, 8)))


async def seed_report_cards():
    settings = build_mhps_settings()
    comment_ids = [c["id"] for c in await db.comment_bank.find(
        {"school_code": MHPS_SCHOOL_CODE}, {"_id": 0, "id": 1}).to_list(100)]

    classes = await db.classes.find(
        {"school_code": MHPS_SCHOOL_CODE}, {"_id": 0}).to_list(100)
    upper_classes = [c for c in classes if c.get("grade_level") in UPPER_GRADES]
    comp_keys = [c["key"] for c in MHPS_COMPONENTS]
    created = 0

    for cls in upper_classes:
        students = await db.students.find(
            {"class_id": cls["id"], "school_code": MHPS_SCHOOL_CODE}, {"_id": 0}).to_list(200)
        n = len(students)
        for idx, st in enumerate(students):
            # profile fields
            await db.students.update_one(
                {"id": st["id"], "school_code": MHPS_SCHOOL_CODE},
                {"$set": {
                    "house": random.choice(MHPS_HOUSES),
                    "reading_level": random.choice(
                        ["Grade 5 Equivalent", "Grade 6 Equivalent", "Grade 7 Equivalent"]),
                    "post_of_special_responsibility": random.choice(
                        ["", "", "Class Monitor", "Prefect", "Head Girl", "Head Boy"]),
                    "extra_curricular_activities": random.sample(
                        ["Debate Club", "Netball", "Football", "Choir", "Scouts", "Art Club"],
                        k=random.randint(1, 2)),
                }},
            )

            ability = random.randint(60, 95)
            subjects = []
            for subj in MHPS_SUBJECTS:
                row = {"name": subj["name"], "is_core": subj["is_core"]}
                if subj["is_core"]:
                    for k in comp_keys:
                        row[k] = _rand_score(ability)
                else:
                    # single-score subjects
                    row["class_tests_quizzes"] = _rand_score(ability)
                subjects.append(row)

            achievement = [
                {"subject": s, "percentage": _rand_score(ability)}
                for s in MHPS_CORE_SUBJECTS
            ]
            performance = [
                {"subject": s, "descriptor": random.choice(
                    ["Excellent", "Very Good", "Good", "Satisfactory"])}
                for s in MHPS_CORE_SUBJECTS
            ]
            behavior = (
                [{"category": "work_ethics", "criterion": c, "rating": random.choice(RATINGS)}
                 for c in MHPS_WORK_ETHICS_CRITERIA]
                + [{"category": "social_skills", "criterion": c, "rating": random.choice(RATINGS)}
                   for c in MHPS_SOCIAL_SKILLS_CRITERIA]
            )

            record = {
                "id": str(uuid.uuid4()),
                "school_code": MHPS_SCHOOL_CODE,
                "student_id": st["id"],
                "class_id": cls["id"],
                "term": TERM,
                "academic_year": ACADEMIC_YEAR,
                "term_label": TERM_LABEL,
                "report_period_label": PERIOD_LABEL,
                "number_of_students_in_class": n,
                "position_in_class": f"{idx + 1}",
                "days_in_term": 85,
                "days_absent": random.randint(0, 6),
                "subjects": subjects,
                "achievement_standards": achievement,
                "performance_task": performance,
                "behavior_ratings": behavior,
                "selected_comments": random.sample(comment_ids, k=min(4, len(comment_ids))),
                "additional_comments": "Continues to make steady progress this term. Encouraged to keep reading widely.",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.report_cards.update_one(
                {"student_id": st["id"], "term": TERM, "academic_year": ACADEMIC_YEAR,
                 "school_code": MHPS_SCHOOL_CODE},
                {"$set": record}, upsert=True,
            )
            created += 1

    print(f"\u2705 Seeded/updated {created} report_cards for Grades 4-6 ({TERM}, {ACADEMIC_YEAR})")


async def main():
    print(f"\u2192 Seeding MHPS template in `{db_name}`\n")
    await rename_school()
    await seed_template()
    await seed_comments()
    await seed_report_cards()
    print("\n\u2705 MHPS report template seeding complete")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
