"""
MHPS (Mona Heights Primary School) Upper School Report Card — data & helpers.

This module is TENANT-LOCKED to school_code == "MHPS".  Nothing here touches or
overrides the Ashcombe / SYSTEM default template that every other school uses.

The MHPS template is stored as a normal `report_templates` document with:
    design_mode = "mhps_upper"
    scope       = "tenant"
    school_code = "MHPS"

...plus an `mhps_settings` sub-document holding all the school-configurable
content (grade scale, achievement bands, behaviour criteria, principal
signature, subjects, component weights, houses).

Per-student per-term data lives in a dedicated `report_cards` collection.
The teacher-editable comment bank lives in a dedicated `comment_bank` collection.
"""

from datetime import datetime, timezone
import uuid

MHPS_SCHOOL_CODE = "MHPS"
MHPS_TEMPLATE_NAME = "MHPS Upper School Report Card (Grades 4\u20136)"

# ---------------------------------------------------------------------------
# Configurable defaults (school Admin can edit these via the settings endpoint)
# ---------------------------------------------------------------------------

MHPS_HOUSES = ["Emerald", "Ruby", "Sapphire", "Topaz"]

# Full subject list for the Upper School template. is_core drives the
# Achievement-Standards / Performance-Task modules & the overall average.
MHPS_SUBJECTS = [
    {"name": "Language Arts", "is_core": True},
    {"name": "Mathematics", "is_core": True},
    {"name": "Social Studies", "is_core": True},
    {"name": "Science", "is_core": True},
    {"name": "Ability", "is_core": False},
    {"name": "Reading", "is_core": False},
    {"name": "Spelling", "is_core": False},
    {"name": "Music", "is_core": False},
    {"name": "Physical Education", "is_core": False},
]

MHPS_CORE_SUBJECTS = ["Mathematics", "Language Arts", "Social Studies", "Science"]

# Assessment components (fixed category set) + default per-component weights.
# Weights are renormalised over whichever components actually have a score, so
# single-score subjects (Ability, Reading ...) still compute correctly.
MHPS_COMPONENTS = [
    {"key": "class_tests_quizzes", "label": "Class Tests/Quizzes"},
    {"key": "assigned_collaborative_task", "label": "Assigned Collaborative Task"},
    {"key": "homework", "label": "Homework"},
    {"key": "projects", "label": "Projects"},
    {"key": "mid_term_exam", "label": "Mid-Term Exam"},
    {"key": "end_of_year_exam", "label": "End of Year Exam"},
]

MHPS_COMPONENT_WEIGHTS = {
    "class_tests_quizzes": 10,
    "assigned_collaborative_task": 10,
    "homework": 10,
    "projects": 10,
    "mid_term_exam": 25,
    "end_of_year_exam": 35,
}

# Key to Academic Grades (letter scale) — editable per school.
MHPS_GRADE_SCALE = [
    {"min": 95, "max": 100, "letter": "A+", "descriptor": "Excellent"},
    {"min": 90, "max": 94, "letter": "A", "descriptor": "Very Good"},
    {"min": 80, "max": 89, "letter": "B+", "descriptor": "Good"},
    {"min": 70, "max": 79, "letter": "B", "descriptor": "Satisfactory"},
    {"min": 60, "max": 69, "letter": "C+", "descriptor": "Satisfactory"},
    {"min": 50, "max": 59, "letter": "C", "descriptor": "Needs Improvement"},
    {"min": 40, "max": 49, "letter": "D", "descriptor": "Unsatisfactory"},
    {"min": 0, "max": 39, "letter": "E", "descriptor": "Poor"},
]

# Achievement Standards — proficiency banding (4 core subjects only).
# Descriptive text is editable per school (NOT hardcoded in the component).
MHPS_ACHIEVEMENT_BANDS = [
    {"band": "Highly Proficient", "min": 85, "max": 100,
     "description": "Advanced competence; may need extended learning at next grade level."},
    {"band": "Proficient", "min": 70, "max": 84,
     "description": "Sufficient evidence of required competence."},
    {"band": "Developing", "min": 50, "max": 69,
     "description": "Partial evidence; will need targeted support."},
    {"band": "Beginning", "min": 0, "max": 49,
     "description": "Limited evidence; needs intensive ongoing support."},
]

# Behaviour / Conduct rating scale (enum) — configurable per school.
MHPS_RATING_SCALE = [
    {"code": "EX", "label": "Excellent"},
    {"code": "VG", "label": "Very Good"},
    {"code": "G", "label": "Good"},
    {"code": "NI", "label": "Needs Improvement"},
]

# Two independently-configurable criteria sets.
MHPS_WORK_ETHICS_CRITERIA = [
    "Completes Assignments",
    "Follows Instructions",
    "Punctuality",
    "Deportment",
    "Courteous in Speech and Action",
    "Class Participation",
    "Respect for Teacher",
    "Respect for Peers",
]

MHPS_SOCIAL_SKILLS_CRITERIA = [
    "Works Well in Groups",
    "Shows Initiative",
    "Handles Conflict Appropriately",
    "Adapts to New Situations",
    "Demonstrates Empathy",
    "Self-Control",
    "Accepts Responsibility",
    "Shows Leadership",
]

# Principal signature block (name + credentials) — editable by school Admin.
MHPS_PRINCIPAL_SIGNATURE = "A. Hepburn (Mr.) M.Ed., B.A.(Hon)., Dip Edu"

# Theme colours (green / gold) — pulled into the rendered header via CSS vars.
MHPS_THEME = {
    "primary_color": "#1F5C3F",
    "primary_dark": "#123D29",
    "accent_color": "#C9A227",
    "accent_light": "#F3ECD2",
    "font_heading": "'Times New Roman', Georgia, serif",
    "font_body": "'Times New Roman', Georgia, serif",
}

# MHPS's 13 stock teacher comments (from their paper form).
MHPS_STOCK_COMMENTS = [
    "A student who consistently produces excellent work.",
    "Student has the ability but does not show much interest in academia.",
    "Student does an excellent job of following through on completion of assignments, research and other independent activities.",
    "Student displays unacceptable behaviour.",
    "Student engages effectively with classmates and teacher during learning sessions.",
    "Student is polite and observes the rules of the school.",
    "Student does well but needs to be less talkative and more settled.",
    "Grades can improve by paying more attention in class.",
    "Student is showing improvement.",
    "A dependable and eager student who takes pride in his/her work.",
    "Student needs to complete and submit assignments on time.",
    "A pleasant student who works well independently and in groups.",
    "Student is encouraged to read more widely to build vocabulary.",
]


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------

def build_mhps_settings() -> dict:
    """The school-configurable content block stored on the MHPS template."""
    return {
        "houses": list(MHPS_HOUSES),
        "subjects": [dict(s) for s in MHPS_SUBJECTS],
        "core_subjects": list(MHPS_CORE_SUBJECTS),
        "components": [dict(c) for c in MHPS_COMPONENTS],
        "component_weights": dict(MHPS_COMPONENT_WEIGHTS),
        "academic_grade_scale": [dict(g) for g in MHPS_GRADE_SCALE],
        "achievement_bands": [dict(b) for b in MHPS_ACHIEVEMENT_BANDS],
        "rating_scale": [dict(r) for r in MHPS_RATING_SCALE],
        "work_ethics_criteria": list(MHPS_WORK_ETHICS_CRITERIA),
        "social_skills_criteria": list(MHPS_SOCIAL_SKILLS_CRITERIA),
        "principal_signature_block": MHPS_PRINCIPAL_SIGNATURE,
        "theme": dict(MHPS_THEME),
    }


def build_mhps_template(school_code: str = MHPS_SCHOOL_CODE,
                        school_name: str = "Mona Heights Primary School") -> dict:
    """Build the tenant-locked MHPS Upper School report template document."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "school_code": school_code,
        "school_name": school_name,
        "template_name": MHPS_TEMPLATE_NAME,
        "design_mode": "mhps_upper",
        "scope": "tenant",              # vs "global" for Ashcombe
        "is_system_default": False,
        "is_locked_default": False,
        "grade_scope": ["Grade 4", "Grade 5", "Grade 6"],
        "paper_size": "legal",          # US Legal 8.5in x 14in
        "header_text": "UPPER SCHOOL REPORT CARD",
        "sub_header_text": "GRADES 4\u20136",
        "canvas_elements": [],
        "blocks": [],
        # keep a body block present so the Ashcombe startup migration skips us
        "body": {"layout": "mhps_upper", "sections_enabled": {}},
        "mhps_settings": build_mhps_settings(),
        "created_at": now,
        "updated_at": now,
    }


# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------

def _num(v):
    try:
        if v is None or v == "" or v == "\u2014":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def compute_weighted_grade(subject_row: dict, weights: dict) -> float | None:
    """Weighted term grade for one subject.

    Weights are renormalised over whichever components have a numeric score,
    so a subject with only one component (e.g. Ability) still computes to that
    score. Returns a rounded int-ish float, or None when nothing is entered.
    """
    total_w = 0.0
    total_ws = 0.0
    for key, w in weights.items():
        score = _num(subject_row.get(key))
        if score is not None:
            total_w += float(w)
            total_ws += score * float(w)
    if total_w == 0:
        return None
    return round(total_ws / total_w, 1)


def letter_for_score(scale: list, score) -> dict:
    """Map a numeric score to {letter, descriptor} using the grade scale."""
    s = _num(score)
    if s is None:
        return {"letter": "", "descriptor": ""}
    for band in scale:
        if band.get("min", 0) <= s <= band.get("max", 100):
            return {"letter": band.get("letter", ""), "descriptor": band.get("descriptor", "")}
    return {"letter": "", "descriptor": ""}


def band_for_percentage(bands: list, pct) -> dict:
    """Map a percentage to an achievement band {band, description}."""
    p = _num(pct)
    if p is None:
        return {"band": "", "description": ""}
    for b in bands:
        if b.get("min", 0) <= p <= b.get("max", 100):
            return {"band": b.get("band", ""), "description": b.get("description", "")}
    return {"band": "", "description": ""}


def compute_report_card(record: dict, settings: dict) -> dict:
    """Enrich a raw report_cards document with all auto-calculated fields.

    - Per subject: weighted_term_grade (numeric) + weighted_letter (unless the
      row carries an explicit override).
    - Achievement standards: auto-map each core-subject percentage to a band
      (unless overridden).
    - Overall average: weighted mean of core-subject weighted grades, unless a
      manual overall_average_override is supplied.
    Never mutates the input; returns a new dict.
    """
    weights = settings.get("component_weights") or MHPS_COMPONENT_WEIGHTS
    scale = settings.get("academic_grade_scale") or MHPS_GRADE_SCALE
    bands = settings.get("achievement_bands") or MHPS_ACHIEVEMENT_BANDS
    core = set(settings.get("core_subjects") or MHPS_CORE_SUBJECTS)

    out = dict(record)

    # --- subjects / weighted term grade ---
    computed_subjects = []
    core_grades = []
    for row in (record.get("subjects") or []):
        row = dict(row)
        if row.get("weighted_override") is not None and row.get("weighted_override") != "":
            wg = _num(row.get("weighted_override"))
        else:
            wg = compute_weighted_grade(row, weights)
        row["weighted_term_grade"] = wg
        lg = letter_for_score(scale, wg)
        row["weighted_letter"] = lg["letter"]
        row["weighted_descriptor"] = lg["descriptor"]
        computed_subjects.append(row)
        if wg is not None and row.get("name") in core:
            core_grades.append(wg)
    out["subjects"] = computed_subjects

    # --- achievement standards (core subjects) ---
    computed_ach = []
    for a in (record.get("achievement_standards") or []):
        a = dict(a)
        if not a.get("band"):
            mapped = band_for_percentage(bands, a.get("percentage"))
            a["band"] = mapped["band"]
            a["description"] = mapped["description"]
        else:
            # keep band, fill description if missing
            if not a.get("description"):
                for b in bands:
                    if b.get("band") == a.get("band"):
                        a["description"] = b.get("description", "")
        computed_ach.append(a)
    out["achievement_standards"] = computed_ach

    # --- overall average ---
    override = record.get("overall_average_override")
    if override is not None and override != "":
        out["student_overall_average"] = _num(override)
    elif core_grades:
        out["student_overall_average"] = round(sum(core_grades) / len(core_grades), 1)
    else:
        out["student_overall_average"] = record.get("student_overall_average")

    return out


def seed_comment_docs(school_code: str = MHPS_SCHOOL_CODE) -> list:
    """Build the 13 stock comment_bank documents for a fresh seed."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, text in enumerate(MHPS_STOCK_COMMENTS):
        docs.append({
            "id": str(uuid.uuid4()),
            "school_code": school_code,
            "text": text,
            "order": i,
            "active": True,
            "created_at": now,
            "updated_at": now,
        })
    return docs
