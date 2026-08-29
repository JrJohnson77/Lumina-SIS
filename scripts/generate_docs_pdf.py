#!/usr/bin/env python3
"""Generate a complete Lumina-SIS documentation PDF."""
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, HRFlowable, KeepTogether,
)

OUT = "/app/Lumina-SIS_Documentation.pdf"

BLUE = colors.HexColor("#1D4ED8")
NAVY = colors.HexColor("#1E3A5F")
SLATE = colors.HexColor("#1E293B")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#E2E8F0")
GREEN = colors.HexColor("#10B981")

styles = getSampleStyleSheet()


def S(name, **kw):
    styles.add(ParagraphStyle(name, **kw))


S("Cover", fontName="Helvetica-Bold", fontSize=34, textColor=NAVY, leading=40, alignment=TA_CENTER)
S("CoverSub", fontName="Helvetica", fontSize=14, textColor=MUTED, leading=20, alignment=TA_CENTER)
S("H1", fontName="Helvetica-Bold", fontSize=19, textColor=NAVY, spaceBefore=8, spaceAfter=10, leading=23)
S("H2", fontName="Helvetica-Bold", fontSize=14, textColor=BLUE, spaceBefore=14, spaceAfter=6, leading=18)
S("H3", fontName="Helvetica-Bold", fontSize=11.5, textColor=SLATE, spaceBefore=9, spaceAfter=3, leading=15)
S("Body", fontName="Helvetica", fontSize=10, textColor=SLATE, leading=15, spaceAfter=6, alignment=TA_LEFT)
S("Small", fontName="Helvetica", fontSize=8.5, textColor=MUTED, leading=12)
S("LBullet", fontName="Helvetica", fontSize=10, textColor=SLATE, leading=14, spaceAfter=2)
S("Cell", fontName="Helvetica", fontSize=8.5, textColor=SLATE, leading=11)
S("CellB", fontName="Helvetica-Bold", fontSize=8.5, textColor=NAVY, leading=11)
S("LCode", fontName="Courier", fontSize=8.5, textColor=NAVY, leading=12)
S("TOC", fontName="Helvetica", fontSize=11, textColor=SLATE, leading=20)

story = []


def h1(t):
    story.append(PageBreak())
    story.append(Paragraph(t, styles["H1"]))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=10))


def h2(t):
    story.append(Paragraph(t, styles["H2"]))


def h3(t):
    story.append(Paragraph(t, styles["H3"]))


def p(t):
    story.append(Paragraph(t, styles["Body"]))


def bullets(items):
    flow = [ListItem(Paragraph(i, styles["LBullet"]), leftIndent=6, value="•") for i in items]
    story.append(ListFlowable(flow, bulletType="bullet", start="•", leftIndent=14, bulletColor=BLUE))
    story.append(Spacer(1, 4))


def spacer(h=6):
    story.append(Spacer(1, h))


def table(data, col_widths, header=True, font="Cell"):
    rows = []
    for r_i, row in enumerate(data):
        cells = []
        for c in row:
            st = "CellB" if (header and r_i == 0) else font
            cells.append(Paragraph(str(c), styles[st]))
        rows.append(cells)
    t = Table(rows, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, BORDER),
        ("LINEBEFORE", (0, 0), (0, -1), 2, BLUE),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("LINEBELOW", (0, 0), (-1, 0), 0, NAVY),
        ]
        for c in range(len(data[0])):
            rows[0][c] = Paragraph(f'<font color="white">{data[0][c]}</font>', styles["CellB"])
    for r_i in range(1, len(data)):
        if r_i % 2 == 0:
            style.append(("BACKGROUND", (0, r_i), (-1, r_i), LIGHT))
    t.setStyle(TableStyle(style))
    story.append(t)
    story.append(Spacer(1, 8))


# ============================================================ COVER
story.append(Spacer(1, 70 * mm))
story.append(Paragraph("Lumina-SIS", styles["Cover"]))
story.append(Spacer(1, 6))
story.append(Paragraph("Multi-Tenant School Information System", styles["CoverSub"]))
story.append(Spacer(1, 4))
story.append(Paragraph("Complete Technical &amp; Functional Documentation", styles["CoverSub"]))
story.append(Spacer(1, 30))
story.append(HRFlowable(width="55%", thickness=1.5, color=BORDER))
story.append(Spacer(1, 14))
story.append(Paragraph(f"Version 1.0 &nbsp;·&nbsp; Generated {datetime.now().strftime('%d %B %Y')}", styles["CoverSub"]))

# ============================================================ TOC
story.append(PageBreak())
story.append(Paragraph("Table of Contents", styles["H1"]))
story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=12))
toc = [
    "1.  Introduction &amp; Overview",
    "2.  System Architecture",
    "3.  Technology Stack",
    "4.  Multi-Tenancy &amp; Data Isolation",
    "5.  Roles, Permissions &amp; Security",
    "6.  Core Modules &amp; Features",
    "7.  Academics: Grading, Gradebook &amp; Attendance",
    "8.  Report Card System &amp; Template Designer",
    "9.  MHPS Upper School Report Card (Tenant Add-on)",
    "10. Student &amp; Staff Profiles",
    "11. Data Model (Collections)",
    "12. API Reference",
    "13. Integrations",
    "14. Deployment &amp; Environment",
    "15. Glossary",
]
for item in toc:
    story.append(Paragraph(item, styles["TOC"]))

# ============================================================ 1. INTRO
h1("1. Introduction &amp; Overview")
p("<b>Lumina-SIS</b> is a modern, multi-tenant School Information System that lets one deployment serve many independent schools ('tenants') from a single application and database, with strict data isolation between them. It centralises the day-to-day administration of a school: admissions, student and staff records, class organisation, attendance, gradebook and grading, discipline and health records, and the generation of professional term report cards.")
h2("What problem it solves")
bullets([
    "Replaces paper registers, spreadsheets and disconnected tools with one source of truth.",
    "Gives each school its own branded environment (logo, colours, subjects, grading) while sharing one platform.",
    "Automates report card production — from teacher score entry to a print-ready, tenant-branded PDF.",
    "Enforces who can see and do what, through role-based access control (RBAC).",
])
h2("Who uses it")
table([
    ["Role", "Typical user", "Primary activities"],
    ["Superuser", "Platform operator", "Creates schools, manages all tenants, designs report templates, full override access."],
    ["Admin", "School administrator", "Manages the school's students, staff, classes, admissions, settings and report configuration."],
    ["Teacher", "Class / form teacher", "Enters attendance, gradebook scores, comments, behaviour, generates reports for their classes."],
    ["Parent", "Guardian", "Views their child's finalised report cards and information (read-only)."],
], [30 * mm, 40 * mm, 100 * mm])

# ============================================================ 2. ARCHITECTURE
h1("2. System Architecture")
p("Lumina-SIS follows a classic three-tier architecture with a clear separation between the presentation layer (React SPA), the application layer (FastAPI REST API) and the data layer (MongoDB).")
h2("High-level flow")
table([
    ["Layer", "Technology", "Responsibility"],
    ["Frontend (SPA)", "React 19 + Tailwind CSS", "UI, routing, forms, charts, client-side PDF generation."],
    ["API Gateway", "Kubernetes Ingress", "Routes '/api/*' to the backend (port 8001) and all other paths to the frontend (port 3000)."],
    ["Backend (API)", "FastAPI (Python)", "Business logic, authentication, RBAC, validation, persistence."],
    ["Database", "MongoDB (Motor async driver)", "Document storage; all records keyed by UUID and scoped by school_code."],
    ["Process manager", "Supervisor", "Runs & restarts the frontend and backend services."],
], [32 * mm, 45 * mm, 93 * mm])
h2("Key design principles")
bullets([
    "<b>API prefix:</b> every backend route is served under <font face='Courier'>/api</font> to satisfy the ingress routing rules.",
    "<b>UUID identifiers:</b> all documents use string UUIDs (never Mongo ObjectIDs) so payloads are JSON-serialisable and portable.",
    "<b>Environment-driven config:</b> the frontend calls the backend via <font face='Courier'>REACT_APP_BACKEND_URL</font>; the backend reads <font face='Courier'>MONGO_URL</font> / <font face='Courier'>DB_NAME</font> — no hardcoded URLs.",
    "<b>Stateless auth:</b> JWT bearer tokens; no server-side session store.",
])

# ============================================================ 3. TECH STACK
h1("3. Technology Stack")
h2("Backend")
table([
    ["Package", "Version", "Purpose"],
    ["FastAPI", "0.110.1", "Web framework / REST API"],
    ["Uvicorn", "0.25.0", "ASGI server"],
    ["Motor / PyMongo", "3.3.1 / 4.5.0", "Async MongoDB driver"],
    ["Pydantic", "2.12.5", "Request/response validation &amp; models"],
    ["PyJWT", "2.10.1", "JWT access-token signing/verification"],
    ["bcrypt / passlib", "4.0.1 / 1.7.4", "Password hashing"],
    ["pandas / openpyxl", "2.3.3", "CSV/Excel import &amp; export"],
    ["resend", ">=2.0.0", "Transactional email (report card delivery, password reset)"],
], [42 * mm, 33 * mm, 95 * mm])
h2("Frontend")
table([
    ["Package", "Version", "Purpose"],
    ["React", "19.0", "UI library"],
    ["react-router-dom", "7.5", "Client-side routing"],
    ["Tailwind CSS", "3.x", "Utility-first styling + design tokens"],
    ["axios", "1.8", "HTTP client"],
    ["recharts", "3.6", "Dashboard &amp; attendance charts"],
    ["html2canvas + jsPDF", "1.4 / 4.2", "Client-side report card PDF export"],
    ["lucide-react", "0.507", "Icon set"],
    ["sonner", "2.0", "Toast notifications"],
    ["Radix UI", "1.x", "Accessible primitives (dialog, select, tabs, etc.)"],
], [42 * mm, 33 * mm, 95 * mm])

# ============================================================ 4. MULTI-TENANCY
h1("4. Multi-Tenancy &amp; Data Isolation")
p("A single Lumina-SIS deployment hosts many schools. Every school is identified by a unique, uppercase <b>school_code</b> (e.g. <font face='Courier'>MHPS</font>, <font face='Courier'>JTECH</font>). Virtually every document — students, users, classes, attendance, gradebook, report templates, comment banks — carries a <font face='Courier'>school_code</font> field.")
h2("How isolation is enforced")
bullets([
    "Every authenticated request carries the user's <font face='Courier'>school_code</font> inside the JWT.",
    "Queries are automatically filtered by that <font face='Courier'>school_code</font>, so a user of one school can never read or write another school's data.",
    "<b>Superuser bypass:</b> superusers are platform-level and can view/act across all tenants (used for support, template design and impersonation).",
    "Tenant-locked features (e.g. the MHPS report card) additionally assert the caller's <font face='Courier'>school_code</font> matches the owning tenant.",
])
h2("Per-tenant configuration")
bullets([
    "Branding: logo/crest, primary &amp; accent colours, motto/tagline, address, principal signature.",
    "Academics: custom subject list, houses, academic years (with a 'current' year and enable/disable toggles).",
    "Reporting: its own report template, grade scale labels and, where applicable, a school-specific comment bank.",
])

# ============================================================ 5. RBAC
h1("5. Roles, Permissions &amp; Security")
h2("Authentication")
bullets([
    "Login requires <b>school_code + username + password</b> (a superuser logs in against their platform school).",
    "Passwords are hashed with <b>bcrypt</b>; plaintext is never stored.",
    "On success the API returns a signed <b>JWT access token</b>; the frontend attaches it as a Bearer token on every request.",
    "Password recovery is available via <font face='Courier'>/api/auth/forgot-password</font> and <font face='Courier'>/api/auth/reset-password</font> (email-based).",
])
h2("The four roles")
p("Access is governed by role plus a set of granular permissions. The eight permission flags are:")
table([
    ["Permission", "Grants ability to…"],
    ["manage_schools", "Create/edit schools, academic years, subjects, branding."],
    ["manage_users", "Create/edit staff &amp; parent accounts, assign roles."],
    ["manage_students", "Create/edit student records, profiles, enrolment."],
    ["manage_classes", "Create/edit classes and class assignments."],
    ["manage_attendance", "Record and edit attendance."],
    ["manage_grades", "Enter and edit gradebook scores &amp; comments."],
    ["view_reports", "View report cards and analytics."],
    ["generate_reports", "Produce &amp; send finalised report cards."],
], [50 * mm, 120 * mm])
h2("Role capability matrix")
table([
    ["Capability", "Super", "Admin", "Teacher", "Parent"],
    ["Manage schools / tenants", "Yes", "Own school", "No", "No"],
    ["Manage users &amp; roles", "Yes", "Yes", "No", "No"],
    ["Manage students &amp; classes", "Yes", "Yes", "Assigned", "No"],
    ["Enter attendance / grades", "Yes", "Yes", "Assigned classes", "No"],
    ["Design report templates", "Yes", "No", "No", "No"],
    ["Configure report content*", "Yes", "Yes", "No", "No"],
    ["Generate / send reports", "Yes", "Yes", "Own classes", "No"],
    ["View finalised report cards", "Yes", "Yes", "Yes", "Own child"],
    ["Audit log access", "Yes", "Yes", "No", "No"],
], [58 * mm, 22 * mm, 28 * mm, 34 * mm, 28 * mm])
p("<font size=8 color='#64748B'>*e.g. grade-scale labels, comment bank wording, signature blocks. Layout/structure remains Superuser-only.</font>")
h2("Auditability")
p("Sensitive actions (create, update, delete, clone, lock/unlock, sending reports) are written to an <b>audit log</b> capturing the actor, action, entity and timestamp, viewable by admins and superusers.")

# ============================================================ 6. MODULES
h1("6. Core Modules &amp; Features")
p("The application is organised into functional areas surfaced through the left navigation. Each maps to one or more pages and API groups.")
mods = [
    ("Overview / Dashboard", "At-a-glance KPIs — student &amp; staff counts, attendance summaries, and quick links tailored to the user's role."),
    ("Admissions", "Capture inquiries and applications, track their stage, and convert accepted applicants into enrolled students in one click."),
    ("Re-Enrollment", "Bulk promote/roll students into the next academic year with a preview-then-execute workflow (enrolment runs)."),
    ("People — Students", "Continuous student profile: identity, contact, academics, attendance, behaviour, family, medical, report fields and school info."),
    ("People — Staff", "Staff profile: identity, contact, role &amp; access, and login-management (credential/role changes)."),
    ("People — Users &amp; Roles", "Create staff/parent accounts, set roles and per-user permissions, reset credentials."),
    ("Academics — Classes", "Define classes/forms, grade levels, assign a form teacher and subjects."),
    ("Academics — Attendance", "Daily attendance capture (single &amp; bulk) with present/absent/tardy/excused states and per-student summaries."),
    ("Academics — Gradebook", "Per-class, per-subject score entry with grade distribution analytics and record locking."),
    ("Report Manager", "Class lists, gradebook access, social-skills entry, form-teacher comments and term report generation."),
    ("Student Services — Health", "Allergies, chronic conditions, medications, vaccinations and clinic visit logs per student."),
    ("Student Services — Discipline", "Log discipline incidents with categories/severity and view discipline statistics."),
    ("Administration — Schools", "Create/edit schools, branding, academic years, subjects and signatures."),
    ("Administration — Import / Export", "Bulk import students &amp; teachers from CSV templates; export data templates."),
    ("Administration — Report Designer", "Three-zone (header/body/footer) template designer with a system-wide default and per-school overrides."),
    ("Administration — Audit Log", "Immutable trail of key actions across the tenant."),
]
for name, desc in mods:
    h3(name)
    p(desc)

# ============================================================ 7. ACADEMICS
h1("7. Academics: Grading, Gradebook &amp; Attendance")
h2("Default grading scheme")
p("Numeric scores map to letter grades and performance domains. Each school can further customise its own scale where a template supports it.")
table([
    ["Range", "Grade", "Domain", "Points"],
    ["90–100", "A+", "Expert performance", "4.0"],
    ["85–89", "A", "Highly Proficient", "3.8"],
    ["80–84", "A-", "Proficient", "3.7"],
    ["75–79", "B", "Satisfactory", "3.5"],
    ["70–74", "B-", "Developing", "3.3"],
    ["65–69", "C", "Passing", "3.2"],
    ["60–64", "C-", "Passing", "2.8"],
    ["55–59", "D", "Marginal", "2.6"],
    ["50–54", "D-", "Below Average", "2.4"],
    ["40–49", "E", "Frustration", "1.0"],
    ["0–39", "U", "No participation", "0"],
], [30 * mm, 22 * mm, 88 * mm, 30 * mm])
h2("Gradebook")
bullets([
    "Scores are entered per class → subject → student → term.",
    "A <b>grade distribution</b> endpoint powers histogram analytics for a class.",
    "Records can be <b>locked/unlocked</b> to freeze grades once finalised.",
])
h2("Attendance")
bullets([
    "States: <b>Present, Absent, Tardy, Excused</b>.",
    "Single-entry and <b>bulk</b> capture for a whole class/day.",
    "Per-student attendance <b>summaries</b> feed the profile donut chart and report cards (days in term / days absent).",
])

# ============================================================ 8. REPORT SYSTEM
h1("8. Report Card System &amp; Template Designer")
p("Report cards are produced from a <b>template</b> plus each student's term data. Lumina-SIS ships a system-wide default template (the 'Ashcombe Academy' design) and lets schools override it.")
h2("Template architecture")
bullets([
    "<b>System default:</b> a global template (scope = 'global') used by every school that hasn't customised its own.",
    "<b>Per-school templates:</b> stored keyed by <font face='Courier'>school_code</font>; a school can clone the system default and adjust header, body and footer zones, theme colours and signatures.",
    "<b>Three zones:</b> Header, Body and Footer are configured independently (endpoints exist for each zone plus theme).",
    "Superusers design structure/layout; schools configure content and branding.",
])
h2("Generation &amp; delivery")
bullets([
    "Teachers enter scores, comments, social skills and behaviour; the term report is assembled per student.",
    "Report cards can be <b>locked</b> (per student or per class) to prevent further edits once issued.",
    "Finalised cards are rendered to PDF client-side (html2canvas + jsPDF) and can be <b>emailed</b> to guardians via Resend.",
    "Parents access finalised PDFs read-only through their portal.",
])

# ============================================================ 9. MHPS
h1("9. MHPS Upper School Report Card (Tenant Add-on)")
p("A second, <b>tenant-locked</b> template built specifically for <b>Mona Heights Primary School</b> (school_code <font face='Courier'>MHPS</font>), Grades 4–6. It is only selectable, editable and renderable for MHPS (superusers bypass), and it never becomes the platform default — every other school keeps the Ashcombe default untouched.")
h2("What it adds")
bullets([
    "<b>Extended profile fields:</b> house, reading level, post of special responsibility, extra-curricular activities.",
    "<b>Report record</b> per student/term: position in class, number in class, days in term/absent, term &amp; period labels, and an auto-calculated overall average (with manual override).",
    "<b>Six assessment components</b> per subject (class tests/quizzes, collaborative task, homework, projects, mid-term, end-of-year) with an auto-computed, weight-based <b>Weighted Term Grade</b> and derived letter.",
    "<b>Achievement Standards</b> module: core-subject percentages auto-mapped to 4 proficiency bands (Highly Proficient / Proficient / Developing / Beginning) with editable descriptions.",
    "<b>Performance Task</b> and <b>Behaviour/Conduct ratings</b> (Work &amp; Personal Ethics + Social Skills, EX/VG/G/NI scale).",
    "<b>Comment bank:</b> 13 seeded stock comments, school-Admin editable; teachers multi-select + free-text additional comments.",
    "<b>Configurable settings:</b> academic grade scale, achievement bands, behaviour criteria, houses and principal signature block.",
])
h2("Output")
p("Rendered to <b>US Legal (8.5in × 14in)</b> PDF, matching the school's paper form, with the green/gold MHPS branding pulled from tenant settings. RBAC: Superuser = structure, Admin = configurable content, Teacher = data entry, Parent = view PDF.")

# ============================================================ 10. PROFILES
h1("10. Student &amp; Staff Profiles")
p("Both profiles use a single continuous, scrollable layout with a shared visual language.")
bullets([
    "<b>Status ribbon</b> header: name left, status pill right, and key facts (grade, ID, class, year / username, email, phone) inline underneath.",
    "<b>Sticky pill anchor chips</b> below the header jump to each section and highlight as you scroll.",
    "<b>Sectioned content:</b> Students — Dashboard, Student Info, Contact, Academics, Attendance, Behavior, Family, Medical, Report Fields, School. Staff — Dashboard, Profile, Contact, Login Management.",
    "<b>Accent cards:</b> white surface with a 3px left accent border — blue for identity/contact/school data, navy for academic/attendance/security data.",
    "<b>Collapsible roster rail</b> with a toggle; the active row is marked by a left-edge blue indicator bar.",
    "Attendance donut and charts retain their green/amber/red status colours.",
])

# ============================================================ 11. DATA MODEL
h1("11. Data Model (Collections)")
p("All collections use string UUID ids and (where tenant-owned) a <font face='Courier'>school_code</font> field.")
table([
    ["Collection", "Stores"],
    ["schools", "Tenant records: code, name, branding, academic years, subjects, principal."],
    ["users", "Staff &amp; parent accounts: role, permissions, hashed password, profile."],
    ["students", "Student master records &amp; profile (incl. MHPS extended fields)."],
    ["classes", "Classes/forms: grade level, form teacher, subjects."],
    ["attendance", "Daily attendance entries per student."],
    ["gradebook", "Per class/subject/student/term scores &amp; lock state."],
    ["report_templates", "System default + per-school templates (header/body/footer, theme, MHPS settings)."],
    ["report_cards", "MHPS per-student/term report records (components, achievement, behaviour, comments)."],
    ["report_card_locks", "Lock state for finalised report cards."],
    ["comment_bank", "Tenant-scoped pre-written teacher comments."],
    ["teacher_comments", "Per-student form-teacher comments."],
    ["social_skills", "Social-skills/attitude ratings per student."],
    ["discipline_incidents", "Behaviour/discipline log."],
    ["health_records", "Allergies, conditions, medications, vaccinations, visits."],
    ["admissions", "Inquiries &amp; applications and their stage."],
    ["enrollment_runs", "Re-enrolment / promotion batches."],
    ["signatures", "Uploaded signature images for reports."],
    ["audit_logs", "Immutable action trail."],
    ["password_resets", "Password reset tokens."],
], [42 * mm, 128 * mm])

# ============================================================ 12. API
h1("12. API Reference")
p("The REST API exposes ~123 endpoints, all under the <font face='Courier'>/api</font> prefix and (except auth) requiring a Bearer token. Grouped by area:")

api_groups = {
    "Authentication": [
        ("POST", "/auth/login", "Log in (school_code + username + password) → JWT"),
        ("GET", "/auth/me", "Current authenticated user"),
        ("POST", "/auth/forgot-password", "Request a password-reset email"),
        ("POST", "/auth/reset-password", "Complete a password reset"),
    ],
    "Schools & Config": [
        ("GET/POST", "/schools", "List / create schools"),
        ("GET/PUT/DELETE", "/schools/{id}", "Read / update / delete a school"),
        ("POST/PUT/DELETE", "/schools/{id}/academic-years[...]", "Add, rename, toggle, set-current, delete a year"),
        ("GET/POST/PUT/DELETE", "/schools/{id}/subjects[...]", "Manage a school's subject list"),
        ("POST", "/schools/{id}/signatures/upload", "Upload a signature image"),
        ("GET", "/system/context", "Current academic year &amp; enabled list"),
        ("GET", "/grading-scheme, /subjects, /houses, /permissions", "Reference lookups"),
    ],
    "Users & Roles": [
        ("GET/POST", "/users", "List / create staff &amp; parent accounts"),
        ("GET/PUT/DELETE", "/users/{id}", "Read / update / delete a user"),
        ("PUT", "/users/{id}/role", "Change a user's role"),
        ("PUT", "/users/{id}/credentials", "Reset username/password"),
        ("GET", "/teachers, /parents", "Role-filtered user lists"),
    ],
    "Students": [
        ("GET/POST", "/students", "List / create students"),
        ("GET/PUT/DELETE", "/students/{id}", "Read / update / delete a student"),
        ("PUT", "/students/{id}/report-fields", "Update report-specific fields"),
        ("GET", "/students/{id}/attendance/summary", "Attendance summary"),
    ],
    "Classes & Attendance": [
        ("GET/POST", "/classes", "List / create classes"),
        ("GET/PUT/DELETE", "/classes/{id}", "Read / update / delete a class"),
        ("GET/POST", "/attendance", "Query / record attendance"),
        ("POST", "/attendance/bulk", "Bulk attendance capture"),
    ],
    "Gradebook": [
        ("GET/POST", "/gradebook", "Query / enter scores"),
        ("DELETE", "/gradebook/{id}", "Remove a gradebook entry"),
        ("POST", "/gradebook/{id}/lock|unlock", "Lock / unlock a record"),
        ("GET", "/gradebook/{class_id}/distribution", "Grade distribution analytics"),
    ],
    "Report Templates": [
        ("GET", "/report-templates/system-default", "Fetch the global default"),
        ("GET/PUT", "/report-templates/{code}", "Read / update a school's template"),
        ("PUT", "/report-templates/{code}/header|body|footer|theme", "Update a zone / theme"),
        ("POST", "/report-templates/{code}/clone-system-default", "Clone the default for a school"),
        ("POST", "/report-templates/{code}/reset-default", "Reset a school to the default"),
    ],
    "Report Cards": [
        ("GET", "/report-card/{student_id}", "Assembled report payload"),
        ("GET", "/report-cards/class/{class_id}", "Class batch"),
        ("POST/DELETE", "/report-cards/{student_id}/lock", "Lock / unlock a student's card"),
        ("GET", "/report-cards/locks", "Lock states"),
        ("POST", "/report-cards/send", "Email finalised cards"),
    ],
    "MHPS (tenant-locked)": [
        ("GET", "/mhps/report-template", "MHPS template + settings + comment bank"),
        ("PUT", "/mhps/report-template/settings", "Admin: edit configurable content"),
        ("PUT", "/mhps/report-template/structure", "Superuser: edit structure"),
        ("GET/POST/PUT/DELETE", "/mhps/comment-bank[...]", "Comment bank CRUD"),
        ("GET/PUT", "/mhps/report-card/{student_id}", "Read / upsert (auto-calc) a report record"),
    ],
    "Student Services": [
        ("GET/POST", "/health/{student_id}[...]", "Allergies, conditions, medications, vaccinations, visits"),
        ("GET", "/health/stats", "Health statistics"),
        ("GET/POST/PUT/DELETE", "/discipline[...]", "Discipline incidents CRUD"),
        ("GET", "/discipline/stats", "Discipline statistics"),
        ("GET/POST", "/social-skills[...]", "Social-skills ratings"),
        ("GET/POST", "/teacher-comments[...]", "Form-teacher comments"),
    ],
    "Admissions & Enrolment": [
        ("GET/POST", "/admissions", "List / create admissions"),
        ("GET", "/admissions/inquiries|applications|stats", "Filtered views &amp; stats"),
        ("POST", "/admissions/{id}/convert", "Convert applicant → student"),
        ("GET", "/enrollment/preview", "Preview a re-enrolment run"),
        ("POST", "/enrollment/execute", "Execute a re-enrolment run"),
    ],
    "Import / Export & Media": [
        ("POST", "/import/students|teachers", "Bulk CSV import"),
        ("GET", "/export/students-template|teachers-template", "Download CSV templates"),
        ("POST", "/upload/photo|template-background", "Upload media"),
        ("GET", "/uploads/{filename}", "Serve an uploaded file"),
    ],
    "Analytics & Audit": [
        ("GET", "/stats/dashboard", "Dashboard KPIs"),
        ("GET", "/audit-logs", "Audit trail"),
    ],
}
for group, rows in api_groups.items():
    h3(group)
    data = [["Method", "Path", "Description"]] + rows
    table(data, [26 * mm, 66 * mm, 78 * mm])

# ============================================================ 13. INTEGRATIONS
h1("13. Integrations")
h2("Resend (transactional email)")
bullets([
    "Used to email finalised report cards to guardians and to send password-reset messages.",
    "Configured via <font face='Courier'>RESEND_API_KEY</font> and <font face='Courier'>SENDER_EMAIL</font> environment variables.",
    "If no key is present, email features are simply inactive — the rest of the system is unaffected.",
])
h2("Client-side PDF")
p("Report cards are captured from the rendered DOM with <b>html2canvas</b> and packaged with <b>jsPDF</b> — the standard Ashcombe cards on Letter size, the MHPS card on US Legal (8.5in × 14in). The renderers deliberately avoid CSS gradients, box-shadows and backdrop-blur, which do not rasterise reliably in html2canvas.")

# ============================================================ 14. DEPLOYMENT
h1("14. Deployment &amp; Environment")
h2("Services")
table([
    ["Service", "Port", "Notes"],
    ["Frontend (React)", "3000", "Served for all non-/api paths."],
    ["Backend (FastAPI)", "8001", "Bound to 0.0.0.0; all routes under /api."],
    ["MongoDB", "27017", "Local instance via MONGO_URL."],
], [55 * mm, 25 * mm, 90 * mm])
h2("Environment variables")
table([
    ["Variable", "Where", "Purpose"],
    ["REACT_APP_BACKEND_URL", "frontend/.env", "Base URL the SPA uses to reach the API."],
    ["MONGO_URL", "backend/.env", "MongoDB connection string."],
    ["DB_NAME", "backend/.env", "Database name."],
    ["JWT_SECRET", "backend/.env", "Secret used to sign access tokens."],
    ["CORS_ORIGINS", "backend/.env", "Allowed CORS origins."],
    ["RESEND_API_KEY / SENDER_EMAIL", "backend/.env", "Email delivery (optional)."],
], [58 * mm, 32 * mm, 80 * mm])
h2("Operations")
bullets([
    "Both services run under <b>Supervisor</b> (<font face='Courier'>supervisorctl restart backend|frontend|all</font>) with hot-reload in development.",
    "Seed scripts under <font face='Courier'>/app/scripts</font> provision demo tenants, students, gradebook and the MHPS template.",
    "A superuser account is auto-created on backend startup if none exists.",
])

# ============================================================ 15. GLOSSARY
h1("15. Glossary")
gl = [
    ("Tenant / School", "An independent school served by the shared platform, identified by school_code."),
    ("Superuser", "Platform-level operator with cross-tenant access."),
    ("RBAC", "Role-Based Access Control — permissions derived from a user's role."),
    ("JWT", "JSON Web Token — the signed bearer token used for authentication."),
    ("Report template", "The reusable design (header/body/footer + theme) a report card is built from."),
    ("Weighted Term Grade", "MHPS: a subject grade computed from six weighted assessment components."),
    ("Achievement Standards", "MHPS: proficiency bands (Highly Proficient → Beginning) for the four core subjects."),
    ("Comment bank", "A tenant-scoped library of pre-written teacher comments."),
    ("Enrolment run", "A batch operation that promotes/rolls students into a new academic year."),
    ("Lock", "Freezing a gradebook entry or report card to prevent further edits."),
]
for term, desc in gl:
    story.append(Paragraph(f"<b>{term}.</b> {desc}", styles["Body"]))

story.append(Spacer(1, 20))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
story.append(Spacer(1, 6))
story.append(Paragraph("End of document · Lumina-SIS Documentation", styles["Small"]))


# ============================================================ PAGE FRAME / HEADER-FOOTER
def decorate(canvas, doc):
    canvas.saveState()
    w, h = A4
    # header band (skip on cover, page 1)
    if doc.page > 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(18 * mm, h - 8 * mm, "Lumina-SIS")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(w - 18 * mm, h - 8 * mm, "Complete Documentation")
    # footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, w - 18 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 9 * mm, f"© {datetime.now().year} Lumina-SIS")
    canvas.drawRightString(w - 18 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
    title="Lumina-SIS Documentation", author="Lumina-SIS",
)
frame = Frame(doc.leftMargin, doc.bottomMargin,
              doc.width, doc.height - 6 * mm, id="main")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=decorate)])
doc.build(story)
print("PDF written to", OUT, "size", round(os.path.getsize(OUT) / 1024, 1), "KB")
