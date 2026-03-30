# Report Card & School Management Updates

## ✅ Implemented Features

### 1. Fixed Report Card Generation
- **Student Sorting**: Students now listed alphabetically by **LastName, FirstName MiddleName**
- **Signature Source**: Signatures now retrieved from school document (not separate collection)
- **Error Handling**: Improved error handling for report card generation

### 2. Signature Management (In School Setup)
- **New Location**: Signatures are now managed within each school's configuration
- **Two Types**: Principal signature and Teacher signature
- **Upload Interface**: Simple upload interface in Schools page → Signatures tab
- **Storage**: Signatures stored directly in school document
- **Legacy Support**: Old signature API endpoints still work but deprecated

### 3. Academic Year Management
- **Multiple Years**: Schools can have multiple academic years (e.g., 2024-2025, 2025-2026)
- **Current Year Selection**: Set which year is currently active
- **Enable/Disable**: Lock past academic years to prevent unauthorized changes
- **Terms Per Year**: Each year has configurable terms (default: Term 1, 2, 3)
- **Protection**: Disabled years prevent modifications to grades, attendance, and student records

### 4. Updated School Model
```javascript
School {
    school_code: string
    name: string
    address, phone, email: string
    current_academic_year: string  // e.g., "2025-2026"
    principal_signature: string    // URL to signature image
    teacher_signature: string      // URL to signature image
    academic_years: [
        {
            year: "2025-2026",
            terms: ["Term 1", "Term 2", "Term 3"],
            is_enabled: true,
            is_current: true
        },
        ...
    ]
}
```

---

## 🎯 How to Use

### Managing Signatures

1. **Navigate to Schools Page** (superuser/admin only)
2. **Edit a School**
3. Click **"Signatures" tab**
4. Upload Principal Signature
5. Upload Teacher Signature
6. Signatures automatically appear on report cards

### Managing Academic Years

1. **Navigate to Schools Page**
2. **Edit a School**
3. Click **"Academic Years" tab**
4. **View Current Year** (displayed at top)
5. **Add New Year**: Enter format like "2026-2027" and click Add
6. **Enable/Disable Years**: Toggle switch to lock/unlock a year
7. **Set Current Year**: Click "Set as Current" button

### Locking Past Years

When you **disable an academic year**:
- ✅ Data remains visible (read-only)
- ❌ Cannot modify grades
- ❌ Cannot modify attendance
- ❌ Cannot edit student records
- ❌ Cannot delete records

This prevents accidental changes to historical data.

---

## 🔧 API Endpoints

### Signature Management
```
POST   /api/schools/{school_id}/signatures/upload?signature_type=principal
POST   /api/schools/{school_id}/signatures/upload?signature_type=teacher
GET    /api/schools/{school_id}/signatures
```

### Academic Year Management
```
POST   /api/schools/{school_id}/academic-years?year=2026-2027
PUT    /api/schools/{school_id}/academic-years/{year}/toggle?is_enabled=false
PUT    /api/schools/{school_id}/academic-years/{year}/set-current
```

### Report Cards (Updated)
```
GET    /api/report-cards/class/{class_id}?term=Term 1&academic_year=2025-2026
```
- Students now sorted alphabetically by last name
- Signatures retrieved from school document

---

## 📋 Migration

All existing schools have been automatically migrated with:
- ✅ Default academic years (2025-2026 enabled, 2024-2025 disabled)
- ✅ Current year set to 2025-2026
- ✅ Empty signature fields (ready to upload)
- ✅ Legacy signatures migrated if they existed

---

## 🧪 Testing

### Test Report Card Generation
1. Login to SUNF or RVSD (admin/Admin@123)
2. Navigate to Reports
3. Select a class
4. Choose Term 1, Academic Year 2025-2026
5. Generate report cards
6. **Verify**: Students listed alphabetically by last name

### Test Signature Management
1. Login as admin to SUNF
2. Go to Schools page → Edit SUNF
3. Click Signatures tab
4. Upload principal signature (any image file)
5. Upload teacher signature
6. Navigate to Reports → Generate report card
7. **Verify**: Signatures appear on report cards

### Test Academic Year Management
1. Login as admin to SUNF
2. Go to Schools page → Edit SUNF
3. Click Academic Years tab
4. Current year should show: 2025-2026
5. Add new year: "2026-2027"
6. Toggle 2024-2025 to enabled
7. Try to set 2024-2025 as current
8. **Verify**: Current year updates, all years show correct status

### Test Year Locking
1. Ensure 2024-2025 is disabled
2. Try to modify grades for a student in that year
3. **Expected**: Should fail or be prevented
4. Enable the year
5. Try again
6. **Expected**: Should work

---

## 📝 Notes

- **Backward Compatibility**: Old signature endpoints (`/api/signatures/upload`) still work but are deprecated
- **Default Configuration**: New schools get 2025-2026 enabled by default
- **Signature Storage**: Signatures stored in `/app/backend/uploads/` directory
- **File Types**: Supports PNG, JPG, GIF, WebP (max 5MB)
- **Academic Year Format**: Use "YYYY-YYYY" format (e.g., "2025-2026")

---

## 🚀 Next Steps

**Optional Enhancements** (not implemented yet):
- [ ] Batch signature upload
- [ ] Signature preview before upload
- [ ] Academic year cloning (copy settings from previous year)
- [ ] Archive old years to separate storage
- [ ] Academic year calendar (start/end dates)
- [ ] Permission-based year access control

---

**Updated**: March 30, 2025
**Version**: 2.0
**Status**: ✅ Production Ready
