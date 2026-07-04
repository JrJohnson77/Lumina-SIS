"""Ashcombe-style default report template shipped with Lumina-SIS.

This is the SYSTEM default: every new school tenant is provisioned with
a clone of this template so their report cards look identical to the
Ashcombe reference on day one. All strings are dynamic field tokens
(rendered by the frontend against real data) so no school-specific
values are hardcoded.
"""

from datetime import datetime, timezone
import uuid

# ---- Header (design mode) ----
# Layout: school name (large, bold), tagline below it, term label right-aligned,
# document title centered below.
ASHCOMBE_HEADER_ELEMENTS = [
    {
        "id": "hdr_school_name",
        "type": "field_token",
        "x": 40, "y": 14, "width": 500, "height": 32,
        "content": "{{school_name}}",
        "font_size": 24, "font_weight": "700",
        "color": "var(--report-primary)",
        "align": "left",
    },
    {
        "id": "hdr_tagline",
        "type": "field_token",
        "x": 40, "y": 48, "width": 500, "height": 18,
        "content": "{{school_tagline}}",
        "font_size": 11, "font_weight": "400",
        "color": "#64748b",
        "align": "left",
    },
    {
        "id": "hdr_term_label",
        "type": "field_token",
        "x": 560, "y": 20, "width": 220, "height": 20,
        "content": "{{term_label}}",
        "font_size": 12, "font_weight": "600",
        "color": "var(--report-primary)",
        "align": "right",
    },
    {
        "id": "hdr_doc_title",
        "type": "text",
        "x": 40, "y": 80, "width": 740, "height": 26,
        "content": "SECONDARY SCHOOL REPORT",
        "font_size": 16, "font_weight": "700",
        "color": "var(--report-accent)",
        "align": "center",
    },
]

# ---- Footer (design mode) ----
ASHCOMBE_FOOTER_ELEMENTS = [
    {
        "id": "ftr_address",
        "type": "field_token",
        "x": 40, "y": 12, "width": 400, "height": 16,
        "content": "{{school_address}}",
        "font_size": 10, "font_weight": "400",
        "color": "#475569",
        "align": "left",
    },
    {
        "id": "ftr_issue_date",
        "type": "field_token",
        "x": 440, "y": 12, "width": 340, "height": 16,
        "content": "Issued {{issue_date}}",
        "font_size": 10, "font_weight": "400",
        "color": "#475569",
        "align": "right",
    },
]

# ---- Body (Ashcombe layout, theme-driven) ----
ASHCOMBE_BODY_DEFAULT = {
    "layout": "ashcombe_default",
    "sections_enabled": {
        "student_info_bar": True,
        "stats_cards": True,
        "subject_table": True,
        "teacher_comments": True,
        "personal_development": True,
        "awards_behavioural": True,
        "behavioural_counters": True,
        "grading_key": True,
    },
    # Column keys map to fields on gradebook.subjects[] entries and are
    # rendered by the AshcombeReportCard React component.
    "subject_table_columns": [
        "class_work", "homework", "exam", "project", "overall", "grade",
    ],
    "theme": {
        "primary_color": "#0f172a",
        "accent_color": "#4f46e5",
        "font_heading": "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        "font_body": "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        "grade_scale": [
            {"letter": "A",  "min": 90, "max": 100, "gpa": 4.0},
            {"letter": "A-", "min": 85, "max": 89,  "gpa": 3.7},
            {"letter": "B",  "min": 80, "max": 84,  "gpa": 3.0},
            {"letter": "B-", "min": 75, "max": 79,  "gpa": 2.7},
            {"letter": "C+", "min": 70, "max": 74,  "gpa": 2.3},
            {"letter": "C",  "min": 65, "max": 69,  "gpa": 2.0},
            {"letter": "D",  "min": 50, "max": 64,  "gpa": 1.0},
            {"letter": "F",  "min": 0,  "max": 49,  "gpa": 0.0},
        ],
    },
}


def build_ashcombe_template(school_code: str, template_name: str, is_system_default: bool = False) -> dict:
    """Build a new Ashcombe-style report_templates document.

    - `school_code`: 'SYSTEM' for the shared default, or a tenant code for a
      cloned per-school copy.
    - `template_name`: human-facing name.
    - `is_system_default`: only True for the single SYSTEM doc.
    """
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "school_code": school_code,
        "template_name": template_name,
        "is_system_default": is_system_default,
        "version": 1,
        # design_mode is what the frontend renderer dispatches on
        "design_mode": "ashcombe_default",
        "is_locked_default": is_system_default,
        # legacy fields kept for backwards compatibility with the old
        # canvas/blocks renderer path
        "canvas_elements": [],
        "blocks": [],
        "header": {
            "mode": "design",
            "upload_image_url": None,
            "design_elements": [dict(e) for e in ASHCOMBE_HEADER_ELEMENTS],
            "height_px": 120,
        },
        "body": {**ASHCOMBE_BODY_DEFAULT},
        "footer": {
            "mode": "design",
            "upload_image_url": None,
            "design_elements": [dict(e) for e in ASHCOMBE_FOOTER_ELEMENTS],
            "height_px": 90,
            "show_signature_lines": ["principal", "parent_guardian"],
        },
        "created_at": now,
        "updated_at": now,
    }
