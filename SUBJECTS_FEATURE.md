# School-Specific Subjects Feature Documentation

## ✅ Feature Overview

Each school can now define their own unique subjects for grading and report cards. This allows schools to customize their curriculum and assessment structure independently.

---

## 🎯 Key Features

### 1. **Unique Subjects Per School**
- Each school maintains its own list of subjects
- No longer limited to a predefined set
- Complete control over curriculum structure

### 2. **Core vs Elective Subjects**
- Mark subjects as "Core" for ranking calculations
- Core subjects determine class ranking and overall performance
- Elective subjects included in reports but not in ranking

### 3. **Subject Ordering**
- Reorder subjects with up/down buttons
- Custom order reflected in gradebook and report cards
- Visual organization of curriculum

### 4. **Default Subjects**
- New schools start with 10 standard subjects
- Includes: English, Math, Science, Social Studies, etc.
- Fully customizable after creation

---

## 📋 Subject Management

### Accessing Subject Management:
1. Navigate to **Schools** page (superuser/admin)
2. Edit a school
3. Click **"Subjects"** tab

### Adding New Subjects:
1. Enter subject name (e.g., "Computer Science")
2. Toggle "Core Subject" if applicable
3. Click **"Add"**
4. Subject added to the bottom of the list

### Editing Subjects:
- **Toggle Core Status**: Click "Mark as Core" or "Mark as Elective"
- **Reorder**: Use ↑ ↓ buttons to change position
- **Delete**: Click trash icon to remove

### Saving Changes:
- Click **"Save Changes"** button at top
- Updates school configuration
- Automatically updates report template

---

## 🔧 Technical Implementation

### Backend Schema:

```python
class SchoolSubject(BaseModel):
    name: str
    is_core: bool = False
    order: int = 0

class SchoolBase(BaseModel):
    # ... other fields
    subjects: List[SchoolSubject] = []
```

### Database Structure:

```javascript
school: {
    school_code: "SUNF",
    name: "Sunflower Academy",
    subjects: [
        { name: "English Language", is_core: true, order: 1 },
        { name: "Mathematics", is_core: true, order: 2 },
        { name: "Science", is_core: true, order: 3 },
        { name: "Art", is_core: false, order: 4 },
        // ... more subjects
    ]
}
```

### API Endpoints:

```
GET    /api/schools/{school_id}/subjects
PUT    /api/schools/{school_id}/subjects
POST   /api/schools/{school_id}/subjects
DELETE /api/schools/{school_id}/subjects/{subject_name}
```

---

## 🎓 Use Cases

### Example 1: Traditional School
```
Core Subjects:
- English Language
- Mathematics  
- Science
- Social Studies

Elective Subjects:
- Art
- Music
- Physical Education
```

### Example 2: STEM-Focused School
```
Core Subjects:
- Advanced Mathematics
- Physics
- Chemistry
- Computer Science
- Engineering

Elective Subjects:
- Robotics
- Data Science
- Environmental Science
```

### Example 3: International School
```
Core Subjects:
- English Language
- French Language
- Mathematics
- Global Studies

Elective Subjects:
- Spanish
- Mandarin
- Economics
- Philosophy
```

---

## 📊 Impact on Other Features

### Gradebook:
- Only school-configured subjects appear in gradebook
- Teachers can only grade configured subjects
- Subject order matches school configuration

### Report Cards:
- Report cards display only school subjects
- Core subjects highlighted with asterisk (*)
- Subject order matches configuration

### Ranking:
- Class ranking based on core subjects only
- Non-core subjects don't affect position
- Flexible ranking criteria per school

### Report Templates:
- Template subjects auto-sync with school subjects
- Changes to school subjects update templates
- Maintains backward compatibility

---

## 🔍 Examples

### Adding a Subject:
1. **Before**: School has 10 standard subjects
2. **Action**: Add "Computer Programming" as core subject
3. **Result**: 
   - 11 subjects now available
   - Appears in gradebook dropdown
   - Shows in report cards
   - Included in core subject ranking

### Reordering Subjects:
1. **Before**: Math is at position 5
2. **Action**: Move Math to position 2 (after English)
3. **Result**:
   - Report cards show Math in 2nd position
   - Gradebook lists Math as 2nd subject
   - All records maintain consistency

### Marking as Core:
1. **Before**: "Art" is an elective subject
2. **Action**: Mark "Art" as core subject
3. **Result**:
   - Art now affects class ranking
   - Shows with asterisk in reports
   - Included in core average calculation

---

## ✅ Migration Status

All existing schools have been migrated with default subjects:

**JTECH Innovations:**
- ✅ 10 default subjects added
- ✅ 4 core subjects (English, Math, Science, Social Studies)
- ✅ 6 elective subjects

**Sunflower Academy (SUNF):**
- ✅ 10 default subjects added
- ✅ Report template synced
- ✅ Gradebook compatible

**Riverside International (RVSD):**
- ✅ 10 default subjects added
- ✅ Report template synced
- ✅ Gradebook compatible

---

## 🧪 Testing Guide

### Test Subject Management:
1. Login as admin (SUNF / admin / Admin@123)
2. Navigate to Schools → Edit SUNF → Subjects tab
3. Add new subject: "Drama" (elective)
4. Mark "Drama" as core subject
5. Reorder subjects (move Drama up)
6. Click "Save Changes"
7. Verify success message

### Test Gradebook Integration:
1. Go to Gradebook page
2. Select a class
3. Select a student
4. Verify: Only school-configured subjects appear
5. Try to add grade for new subject
6. Verify: New subject is available

### Test Report Cards:
1. Navigate to Reports page
2. Generate report cards for a class
3. Verify: 
   - All configured subjects appear
   - Core subjects marked with *
   - Subject order matches configuration
   - New subjects included

---

## 💡 Best Practices

### When Adding Subjects:
- Use clear, descriptive names
- Mark core subjects appropriately
- Maintain logical ordering (core first, then electives)
- Save changes after modifications

### Subject Naming:
- ✅ Good: "Computer Science", "Physical Education"
- ❌ Bad: "CS", "PE" (too abbreviated)
- ✅ Good: "Advanced Mathematics"
- ❌ Bad: "Math 2" (use descriptive names)

### Core Subject Selection:
- Core = affects ranking and overall performance
- Typically 4-6 core subjects
- Usually: English, Math, Science, Language, Social Studies
- Don't mark all subjects as core (dilutes importance)

---

## 🚀 Future Enhancements (Not Implemented)

- [ ] Subject categories/departments
- [ ] Credit hours per subject
- [ ] Teacher assignment per subject
- [ ] Subject prerequisites
- [ ] Grade level specific subjects
- [ ] Import/Export subject configurations
- [ ] Clone subjects from another school

---

## 📝 Notes

- **Deleting a subject**: Does not delete existing grades, but hides subject from new entries
- **Backward compatibility**: Existing grades for old subjects remain intact
- **Subject limits**: No hard limit, but recommend 8-15 subjects for optimal UX
- **Sync behavior**: Changes to school subjects automatically update report templates

---

**Created**: March 30, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready  
**Migration**: Complete for all 3 schools
