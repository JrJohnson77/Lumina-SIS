#!/usr/bin/env python3
"""
Migration script to update existing schools with new fields:
- academic_years array
- current_academic_year
- principal_signature
- teacher_signature
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'school_management')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def migrate_schools():
    print("\n" + "="*60)
    print("🔄 Migrating Schools to New Schema")
    print("="*60 + "\n")
    
    schools = await db.schools.find({}).to_list(100)
    
    for school in schools:
        school_code = school['school_code']
        print(f"Processing {school['name']} ({school_code})...")
        
        updates = {}
        
        # Add academic_years if missing
        if "academic_years" not in school:
            updates["academic_years"] = [
                {
                    "year": "2025-2026",
                    "terms": ["Term 1", "Term 2", "Term 3"],
                    "is_enabled": True,
                    "is_current": True
                },
                {
                    "year": "2024-2025",
                    "terms": ["Term 1", "Term 2", "Term 3"],
                    "is_enabled": False,
                    "is_current": False
                }
            ]
            print(f"  ✅ Added default academic years")
        
        # Add current_academic_year if missing
        if "current_academic_year" not in school:
            updates["current_academic_year"] = "2025-2026"
            print(f"  ✅ Set current academic year to 2025-2026")
        
        # Add signature fields if missing
        if "principal_signature" not in school:
            # Try to migrate from old signatures collection
            old_sig = await db.signatures.find_one({"school_code": school_code})
            if old_sig:
                updates["principal_signature"] = old_sig.get("principal_signature", "")
                updates["teacher_signature"] = old_sig.get("teacher_signature", "")
                print(f"  ✅ Migrated signatures from old collection")
            else:
                updates["principal_signature"] = ""
                updates["teacher_signature"] = ""
                print(f"  ✅ Added empty signature fields")
        
        # Apply updates
        if updates:
            await db.schools.update_one(
                {"_id": school["_id"]},
                {"$set": updates}
            )
            print(f"  ✅ Updated {school_code}")
        else:
            print(f"  ℹ️  {school_code} already up to date")
        print()
    
    print("="*60)
    print("✅ Migration Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(migrate_schools())
