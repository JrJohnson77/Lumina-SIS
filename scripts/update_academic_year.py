#!/usr/bin/env python3
"""
Script to update all grades from academic year 2024-2025 to 2025-2026
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'school_management')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def update_academic_year():
    """Update all gradebook and social skills records to 2025-2026"""
    print("\n" + "="*60)
    print("📅 Updating Academic Year: 2024-2025 → 2025-2026")
    print("="*60 + "\n")
    
    try:
        # Update gradebook entries
        print("📊 Updating Gradebook Entries...")
        gradebook_result = await db.gradebook.update_many(
            {"academic_year": "2024-2025"},
            {
                "$set": {
                    "academic_year": "2025-2026",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        print(f"   ✅ Updated {gradebook_result.modified_count} gradebook entries")
        
        # Update social skills entries
        print("\n🌟 Updating Social Skills Records...")
        social_result = await db.social_skills.update_many(
            {"academic_year": "2024-2025"},
            {
                "$set": {
                    "academic_year": "2025-2026",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        print(f"   ✅ Updated {social_result.modified_count} social skills records")
        
        # Update classes academic year
        print("\n🏫 Updating Classes...")
        classes_result = await db.classes.update_many(
            {"academic_year": "2024-2025"},
            {"$set": {"academic_year": "2025-2026"}}
        )
        print(f"   ✅ Updated {classes_result.modified_count} classes")
        
        # Verify the updates
        print("\n" + "="*60)
        print("🔍 Verification:")
        print("="*60)
        
        for school_code in ["SUNF", "RVSD"]:
            print(f"\n🏫 {school_code} School:")
            
            # Count gradebook in new year
            gradebook_count = await db.gradebook.count_documents({
                "school_code": school_code,
                "academic_year": "2025-2026",
                "term": "Term 1"
            })
            print(f"   📊 Gradebook (2025-2026): {gradebook_count} entries")
            
            # Count social skills in new year
            social_count = await db.social_skills.count_documents({
                "school_code": school_code,
                "academic_year": "2025-2026",
                "term": "Term 1"
            })
            print(f"   🌟 Social Skills (2025-2026): {social_count} entries")
            
            # Count classes in new year
            classes_count = await db.classes.count_documents({
                "school_code": school_code,
                "academic_year": "2025-2026"
            })
            print(f"   🏫 Classes (2025-2026): {classes_count}")
            
            # Check if any old year entries remain
            old_gradebook = await db.gradebook.count_documents({
                "school_code": school_code,
                "academic_year": "2024-2025"
            })
            old_social = await db.social_skills.count_documents({
                "school_code": school_code,
                "academic_year": "2024-2025"
            })
            
            if old_gradebook > 0 or old_social > 0:
                print(f"   ⚠️  Old entries remaining: Gradebook={old_gradebook}, Social={old_social}")
            else:
                print(f"   ✅ No old entries remaining - all updated!")
        
        print("\n" + "="*60)
        print("✅ Academic Year Update Complete!")
        print("="*60)
        print("\n📝 All grades are now for Academic Year: 2025-2026, Term 1")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(update_academic_year())
