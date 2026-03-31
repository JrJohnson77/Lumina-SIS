#!/usr/bin/env python3
"""
Migration script to add default subjects to existing schools
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'school_management')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

DEFAULT_SUBJECTS = [
    {"name": "English Language", "is_core": True, "order": 1},
    {"name": "Mathematics", "is_core": True, "order": 2},
    {"name": "Science", "is_core": True, "order": 3},
    {"name": "Social Studies", "is_core": True, "order": 4},
    {"name": "Religious Education", "is_core": False, "order": 5},
    {"name": "Physical Education", "is_core": False, "order": 6},
    {"name": "Creative Arts", "is_core": False, "order": 7},
    {"name": "Music", "is_core": False, "order": 8},
    {"name": "ICT", "is_core": False, "order": 9},
    {"name": "French", "is_core": False, "order": 10}
]

async def migrate_schools():
    print("\n" + "="*60)
    print("🔄 Adding Subjects to Schools")
    print("="*60 + "\n")
    
    schools = await db.schools.find({}).to_list(100)
    
    for school in schools:
        school_code = school['school_code']
        print(f"Processing {school['name']} ({school_code})...")
        
        if "subjects" not in school or not school.get("subjects"):
            # Add default subjects
            await db.schools.update_one(
                {"_id": school["_id"]},
                {"$set": {"subjects": DEFAULT_SUBJECTS}}
            )
            print(f"  ✅ Added {len(DEFAULT_SUBJECTS)} default subjects")
            
            # Also update report template
            await db.report_templates.update_one(
                {"school_code": school_code},
                {"$set": {"subjects": [{"name": s["name"], "is_core": s["is_core"]} for s in DEFAULT_SUBJECTS]}}
            )
            print(f"  ✅ Updated report template subjects")
        else:
            print(f"  ℹ️  School already has subjects configured")
        print()
    
    print("="*60)
    print("✅ Migration Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(migrate_schools())
