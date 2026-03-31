# Grade Data Fields for Custom Report Design

## ✅ Feature Overview

You can now add individual grade data fields to custom-designed reports in the canvas designer. Display specific subject grades, overall performance, and assessment components anywhere on your report card template.

---

## 🎯 Available Grade Fields

### Overall Performance Fields:
- `grades.overall_score` - Overall average score (e.g., "85.3")
- `grades.overall_grade` - Overall letter grade (e.g., "A-")
- `grades.overall_points` - GPA points (e.g., "3.70")

### Subject-Specific Fields:
- `grades.subject.{SubjectName}.score` - Subject weighted score
- `grades.subject.{SubjectName}.grade` - Subject letter grade
- `grades.subject.{SubjectName}.homework` - Homework score
- `grades.subject.{SubjectName}.groupWork` - Group work score
- `grades.subject.{SubjectName}.project` - Project score
- `grades.subject.{SubjectName}.quiz` - Quiz score
- `grades.subject.{SubjectName}.midTerm` - Mid-term exam score
- `grades.subject.{SubjectName}.endOfTerm` - End of term exam score

---

## 📋 How to Use

### Adding Grade Fields to Canvas Report:

1. **Open Report Template Designer**
   - Navigate to Schools page
   - Edit a school
   - Click "Report Template" tab
   - Ensure "Design Mode" is set to "Canvas"

2. **Add a Data Field**
   - Click "Field" button in toolbar
   - A new data field element appears on canvas

3. **Select Grade Field**
   - Click the new field element
   - In properties panel, open "Data Field" dropdown
   - Navigate to "Grades" category
   - Select desired field (e.g., "Overall Score" or "Subject Score")

4. **For Subject-Specific Fields:**
   - After selecting a subject field (e.g., "Subject Score")
   - A "Subject Name" dropdown appears
   - Choose the specific subject (e.g., "Mathematics")
   - Field automatically updates to: `grades.subject.Mathematics.score`

5. **Position and Style**
   - Drag to desired position
   - Resize as needed
   - Adjust font, color, alignment in properties panel

---

## 🎨 Example Use Cases

### Example 1: Display Overall Performance
```
Field: grades.overall_score
Result on report: "85.3"

Field: grades.overall_grade  
Result on report: "A-"
```

### Example 2: Show Mathematics Score and Grade
```
Field: grades.subject.Mathematics.score
Result: "88.5"

Field: grades.subject.Mathematics.grade
Result: "A"
```

### Example 3: Display Assessment Breakdown
```
Field: grades.subject.Science.midTerm
Result: "85"

Field: grades.subject.Science.endOfTerm
Result: "90"
```

### Example 4: Custom Layout
```
Position (100, 200): "Mathematics: " (text element)
Position (200, 200): grades.subject.Mathematics.grade (data field)
Position (250, 200): " (" (text element)
Position (270, 200): grades.subject.Mathematics.score (data field)
Position (330, 200): "%)" (text element)

Result: "Mathematics: A (88.5%)"
```

---

## 🔧 Technical Implementation

### Backend (ReportsPage.js - resolveField function):

```javascript
// Handles dynamic subject fields
if (field.startsWith('grades.subject.')) {
    const parts = field.split('.');
    const subjectName = parts[2];  // e.g., "Mathematics"
    const property = parts[3];     // e.g., "score"
    
    const subjectGrade = grades?.subjects?.find(s => s.subject === subjectName);
    return subjectGrade[property] || '-';
}

// Handles overall fields
'grades.overall_score': grades?.overall_score?.toFixed(1) || '-'
'grades.overall_grade': grades?.overall_grade || '-'
```

### Frontend (ReportTemplateDesigner.js):

```javascript
// Enhanced DataFieldPicker with subject selector
<DataFieldPicker 
    field={selected.config?.field} 
    onChange={updateField}
    template={template}  // Provides available subjects
/>

// Subject dropdown appears when grade field selected
{isGradeField && (
    <Select value={subjectName} onValueChange={handleSubjectChange}>
        {schoolSubjects.map(subj => (
            <SelectItem value={subj}>{subj}</SelectItem>
        ))}
    </Select>
)}
```

---

## 📊 Field Format Examples

### Overall Fields:
| Field | Example Output | Description |
|-------|---------------|-------------|
| `grades.overall_score` | "85.3" | Average of all subjects |
| `grades.overall_grade` | "A-" | Letter grade based on scale |
| `grades.overall_points` | "3.70" | GPA on 4.0 scale |

### Subject Fields (for Mathematics):
| Field | Example Output | Description |
|-------|---------------|-------------|
| `grades.subject.Mathematics.score` | "88.5" | Weighted total |
| `grades.subject.Mathematics.grade` | "A" | Letter grade |
| `grades.subject.Mathematics.homework` | "85" | Homework score |
| `grades.subject.Mathematics.groupWork` | "90" | Group work score |
| `grades.subject.Mathematics.project` | "88" | Project score |
| `grades.subject.Mathematics.quiz` | "87" | Quiz score |
| `grades.subject.Mathematics.midTerm` | "85" | Mid-term exam |
| `grades.subject.Mathematics.endOfTerm` | "90" | Final exam |

---

## 🎓 Design Tips

### Best Practices:

1. **Label Your Fields**
   - Add text elements near data fields for context
   - Example: "Overall Grade: [data field]"

2. **Consistent Positioning**
   - Use snap-to-grid for aligned fields
   - Group related fields together

3. **Font Sizing**
   - Use larger fonts (14-16pt) for overall performance
   - Use standard (10-12pt) for subject grades
   - Use smaller (8-10pt) for assessment components

4. **Color Coding**
   - Use school colors for headers
   - Consider color for A/B/C grades (optional)
   - Keep most text black for printing

5. **Test with Real Data**
   - Generate report with actual student
   - Verify all fields display correctly
   - Adjust sizing as needed

---

## 🧪 Testing Guide

### Test Overall Fields:
1. Open report designer
2. Add data field with `grades.overall_score`
3. Save template
4. Generate report for a student
5. Verify score displays (e.g., "85.3")

### Test Subject Fields:
1. Add data field
2. Select "Subject Score" from Grades category
3. Choose "Mathematics" from Subject dropdown
4. Verify field shows: `grades.subject.Mathematics.score`
5. Save and generate report
6. Verify Mathematics score displays

### Test Assessment Components:
1. Add multiple fields for one subject:
   - Subject name (text)
   - Homework score
   - Quiz score
   - Mid-term score
   - Final score
2. Arrange horizontally
3. Generate report
4. Verify all components display

---

## 💡 Common Use Cases

### Minimal Report:
```
Header: Student name, class, term
Overall Score: grades.overall_score
Overall Grade: grades.overall_grade
Core Subjects: Show only Math, English, Science
Footer: Signatures
```

### Detailed Report:
```
Student Info: All basic fields
Subjects Table: Use grades-table element
Individual Subject Highlights:
  - Mathematics: score, grade, components
  - Science: score, grade, components
Overall Performance: all three fields
Attendance: Present/Absent days
```

### Progress Report:
```
Focus on improvement:
  - Subject scores with term comparison
  - Assessment component breakdown
  - Teacher comments
  - Next steps
```

---

## 🚀 Advanced Features

### Dynamic Subject Lists:
- Subject dropdown populated from school subjects
- Only shows configured subjects for that school
- Automatically syncs with school subject changes

### Null Safety:
- Missing grades show as "-"
- Handles incomplete assessment data
- No errors for students without grades

### Flexible Positioning:
- Place fields anywhere on canvas
- Combine with text, images, lines
- Build completely custom layouts

---

## 📝 Notes

- **Subject Names Must Match**: Use exact subject names from school configuration
- **Case Sensitive**: "Mathematics" ≠ "mathematics"
- **Decimal Places**: Scores show 1 decimal (e.g., "85.3")
- **Grade Scale**: Letter grades based on school's grade scale
- **Default Value**: Missing data shows "-" not errors

---

## 🔍 Troubleshooting

**Issue**: Field shows "{{grades.subject.Math.score}}"
- **Cause**: Subject name doesn't match school subjects
- **Fix**: Check exact subject name in school configuration

**Issue**: Field shows "-" for all students
- **Cause**: No grades entered for that subject/term
- **Fix**: Add grades in gradebook first

**Issue**: Can't find Grades category
- **Cause**: Old cache
- **Fix**: Refresh page, clear browser cache

**Issue**: Subject dropdown empty
- **Cause**: School has no subjects configured
- **Fix**: Configure subjects in School → Subjects tab first

---

**Created**: March 30, 2025
**Version**: 1.0
**Status**: ✅ Production Ready
**Integration**: Report Template Designer + Canvas Renderer
