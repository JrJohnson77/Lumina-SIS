# Lumina-SIS — Comprehensive System Documentation

**Version:** 1.0 (July 2025 rebuild)
**Project:** Lumina-SIS (Student Information System) — Multi-tenant School Management Platform
**Repository:** `github.com/JrJohnson77/Lumina-SIS`
**Prepared:** Auto-generated from source code and PRD

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Feature Catalog](#4-feature-catalog)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Data Model (MongoDB Collections)](#6-data-model-mongodb-collections)
7. [API Reference (104 endpoints)](#7-api-reference)
8. [Frontend Pages & Routes](#8-frontend-pages--routes)
9. [Authentication & Session Management](#9-authentication--session-management)
10. [Multi-tenancy Design](#10-multi-tenancy-design)
11. [Report Card System (Canvas Designer + Renderer)](#11-report-card-system)
12. [Grading & Assessment](#12-grading--assessment)
13. [Password Reset & Email](#13-password-reset--email)
14. [Audit Log](#14-audit-log)
15. [File Uploads & Storage](#15-file-uploads--storage)
16. [Security Policies (What Is Implemented)](#16-security-policies-implemented)
17. [Security Risks & Known Vulnerabilities](#17-security-risks--known-vulnerabilities)
18. [Recommendations for Improvements](#18-recommendations-for-improvements)
19. [Deployment & Operations](#19-deployment--operations)
20. [Test Credentials](#20-test-credentials)
21. [Appendix: Environment Variables](#21-appendix-environment-variables)
22. [Appendix: Ground-truth Metrics](#22-appendix-ground-truth-metrics)

---

## 1. Executive Summary

**Lumina-SIS** is a multi-tenant Student Information System designed for primary/secondary schools. It provides a single web platform that combines student records, class rostering, attendance, gradebook, report-card generation (with a canvas-based WYSIWYG designer), admissions, health records, discipline tracking, re-enrollment/promotion, staff/user management, CSV import-export, audit logging, and password reset via email.

**Design pillars**

- **Multi-tenant by school_code** — every tenant is isolated by an uppercase `school_code`; a "Superuser" account (`JTECH`) can hop between schools.
- **JWT-based auth** with role-based (RBAC) and permission-based (per-user) authorization.
- **Report cards are first-class**: schools get a polished default template (`lumina_default`) and can optionally build fully custom canvas layouts with pixel-precise WYSIWYG positioning.
- **Auditable**: privileged mutations (locks, unlocks, deletes, promotions, report-card sends) write to an `audit_logs` collection.
- **Zero-friction defaults**: a startup task creates the `JTECH` superuser + school and migrates any legacy templates to the new default.

**Scale of the current codebase**

| Metric | Count |
|---|---:|
| Backend endpoints (`/api/*`) | **104** |
| Backend LoC (`server.py`) | **4,015** |
| Frontend LoC (`src/pages` + `components`) | **~13,700** |
| Frontend pages | **25** |
| React protected routes | **24** |
| MongoDB collections | **14+** |
| Report-card design modes | 2 (`lumina_default`, `canvas`) |

---

## 2. System Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐         ┌──────────────┐
│   Browser (React)   │◀──HTTPS─▶  Kubernetes Ingress      │──/api──▶│  FastAPI 8001│
│  CRA / craco + TW3  │         │  (path routing /api → 8001,        │  (uvicorn)   │
│  react-router v7    │         │   everything else → 3000)          └──────┬───────┘
└─────────────────────┘         └──────────────────────────┘                │
                                                                             ▼
                                                                    ┌───────────────┐
                                                                    │ MongoDB 4.x   │
                                                                    │ (motor async) │
                                                                    └───────────────┘
                                                                             ▲
                                                                             │
                                                     ┌──────────────────┐    │
                                                     │  Resend (email)  │    │
                                                     │  Optional        │    │
                                                     └──────────────────┘    │
                                                                             │
                                                     ┌──────────────────┐    │
                                                     │  Uploads folder  │◀───┘
                                                     │  /backend/uploads│  photos/backgrounds
                                                     └──────────────────┘
```

**Request flow**

1. React client stores JWT in `localStorage.token` and attaches it as `Authorization: Bearer …` on every axios call.
2. FastAPI reads the JWT via `HTTPBearer`, decodes with `JWT_SECRET`, and loads the user from `db.users`.
3. Every endpoint hides behind either `require_roles([...])`, `require_permission(...)`, or `require_superuser()`. Superuser bypasses every role check.
4. Almost every query is scoped by `school_code` (multi-tenant isolation).
5. Ingress guarantees `/api/*` → backend, everything else → CRA dev server. Frontend uses `REACT_APP_BACKEND_URL` — never hard-coded.

---

## 3. Technology Stack

### Backend

| Layer | Choice | Version (pinned in `requirements.txt`) |
|---|---|---|
| Framework | **FastAPI** | 0.110.1 |
| ASGI Server | **uvicorn** | 0.25.0 |
| Auth | **PyJWT** + **bcrypt** | 2.10.1 / 4.0.1 |
| DB Driver | **motor** (async pymongo) | 3.3.1 |
| DB | **MongoDB** | local (via `MONGO_URL`) |
| Email | **resend** | ≥2.0.0 |
| Validation | **pydantic** | 2.12.5 |
| PDF / Fonts | **fpdf2**, **fonttools** | 2.8.6 / 4.61.1 |
| CSV | stdlib `csv` | — |

### Frontend

| Layer | Choice | Version |
|---|---|---|
| Framework | **React** | 19.0 |
| Build | **CRA + craco** | react-scripts 5.0.1 |
| Router | **react-router-dom** | 7.5.1 |
| HTTP | **axios** | 1.8.4 |
| UI Kit | **shadcn/ui** on top of Radix UI + Tailwind 3.4 | — |
| Icons | **lucide-react** | 0.507 |
| Forms | **react-hook-form** + **zod** | 7.56 / 3.24 |
| DnD | **@dnd-kit** (canvas designer) | 6.3 |
| PDF export | **jspdf** + **html2canvas** | 4.2 / 1.4 |
| Charts | **recharts** | 3.6 |
| Toasts | **sonner** | 2.0 |

### Infra

- **Supervisord** — process manager for `backend`, `frontend`, `mongodb`, `code-server`, `nginx-code-proxy`.
- **Kubernetes ingress** — routes `/api/*` to the backend on port 8001, everything else to the frontend on port 3000.

---

## 4. Feature Catalog

### 4.1 Authentication & Session
- School-code + username + password login (`POST /api/auth/login`).
- JWT (`HS256`, 24-hour TTL) with `sub` (user id), `role`, and `school_code` claims.
- Superuser can log into any school by supplying that school's `school_code` at login.
- **Forgot-password** flow (`POST /api/auth/forgot-password` + `POST /api/auth/reset-password`) with one-hour token TTL, Resend email delivery, log-fallback, and account-enumeration-safe responses.
- Frontend axios interceptor detects any 401 (except during login) and pops a **session-expired modal** rather than silently signing users out.
- `SessionExpiredModal` + `RouteWatcher` restore the last-visited page on next login.

### 4.2 School Management (superuser)
- Create/read/update/delete schools (`/api/schools`).
- Per-school `school_code` (uppercase), name, address, email, logo, principal/teacher signatures, `attendance_threshold` (default 85%), academic years list, per-school subjects list.
- Toggle & set-current academic year (`/api/schools/{id}/academic-years/*`).
- Upload signature images (`/api/schools/{id}/signatures/upload`).
- Auto-seeds default subjects, default academic years, and a default `lumina_default` report template on school creation.

### 4.3 Users, Staff & RBAC
- Roles: `superuser`, `admin`, `teacher`, `parent`.
- Permission strings: `manage_schools`, `manage_users`, `manage_students`, `manage_classes`, `manage_attendance`, `manage_grades`, `view_reports`, `generate_reports`.
- Admins inherit "all permissions minus `manage_schools`".
- Teachers get: `manage_students`, `manage_classes`, `manage_attendance`, `manage_grades`, `view_reports`, `generate_reports`.
- Parents get: `view_reports`.
- Extended profile: salutation, first/middle/last, gender, address, phones, email, photo.
- Admin can reset a user's username/password (`PUT /api/users/{id}/credentials`).

### 4.4 Students
- Full demographic + house + emergency contact + family members (parents, guardians, siblings) with per-member phones/emails.
- `enrollment_status`: `enrolled`, `retained`, `graduated`, `withdrawn`.
- Auto age from `date_of_birth`.
- Photo upload (`/api/upload/photo`).
- Attendance summary per month (`/api/students/{id}/attendance/summary`).
- School-scoped for admins; teachers see only students in their classes.

### 4.5 Classes
- Grade level, room, teacher assignment, academic year, `created_by`.
- Teachers see classes they teach or created.

### 4.6 Attendance
- Statuses: Present / Absent / Late / Excused.
- Single-record `POST /attendance` and bulk `POST /attendance/bulk`.
- Filters by student, class, date-range on `GET /attendance`.
- Per-student summary + presence % for a month.

### 4.7 Gradebook & MHPS Assessment
- **10 default subjects** (English, Math, Science, Social Studies, Religious Ed, PE, Creative Arts, Music, ICT, French) — 4 marked as `is_core` for average/ranking.
- **Weighted assessment**: HW 5% / GW 5% / Project 10% / Quiz 10% / Mid-Term 30% / End-of-Term 40%.
- **11-band grade scale** (A+, A, A-, B, B-, C, C-, D, D-, E, U) with a per-band **domain** description and GPA points.
- Auto-calculates weighted score, letter grade, GPA points, domain.
- **Lock/Unlock** gradebook entries (`POST /gradebook/{id}/lock` etc.) with audit trail.
- **Grade distribution** endpoint (`GET /gradebook/{class}/distribution`) — buckets A/B/C/D/E/U for charts.

### 4.8 Social Skills
- 4-band rating scale: Excellent / Good / Satisfactory / Needs Improvement (labels + short codes).
- Default categories:
  - **Work & Personal Ethics**: Completes Assignments, Follows Instructions, Punctuality, Deportment, Courteous, Class Participation.
  - **Respect**: Respect for Teacher, Respect for Peers.
- Per-student, per-term entries. Class-wide fetch endpoint for bulk entry pages.

### 4.9 Form Teacher's Comment
- One comment per student per term/year (`POST /teacher-comments`).
- Class-wide fetch for the Report Manager UI.

### 4.10 Report Cards & Designer
See §11 for the full designer specification. Highlights:

- Two design modes:
  - `lumina_default` — polished pre-built React template (`LuminaDefaultReportCard.jsx`) auto-assigned to every school.
  - `canvas` — full pixel-precise WYSIWYG editor (drag, resize, snap-to-grid, alignment guides, undo, copy/paste, zoom/pan, background image upload).
- **PDF filename**: single-student → `[LastName]_[FirstName]_ReportCard_[Term]_[AcademicYear].pdf`; class batch → `[ClassName]_[Term]_[Year].pdf`.
- **Report Card Locks** (`POST/DELETE /report-cards/{student_id}/lock`) — protect finalized reports from re-generation, audited.
- **Report Card Send** (`POST /report-cards/send`) — bulk email guardians via Resend.

### 4.11 Admissions
- Status lifecycle: `inquiry` → `application` → `pending` → `accepted` / `rejected`.
- Convert an accepted admission into a full student record (`POST /admissions/{id}/convert`).
- Stats endpoint aggregates totals per bucket.

### 4.12 Health Records
- Sub-collections per student: vaccinations, allergies, conditions, medications, visits.
- Per-entry CRUD (`POST /health/{sid}/vaccination`, `.../allergy`, `.../condition`, `.../medication`, `.../visit`) and `DELETE /health/{sid}/{entry_type}/{entry_id}`.
- Aggregated `/health/stats` for the dashboard.

### 4.13 Discipline
- Incident lifecycle: Open → In Progress → Resolved.
- Types: Minor / Moderate / Major.
- Teachers can only file incidents for students in their classes.
- Delete is admin-only; audit-logged.

### 4.14 Re-Enrollment / Promotion
- Preview endpoint suggests promotion targets based on numeric grade extraction (`Grade 3 → Grade 4`).
- Bulk-execute (promote / retain / graduate / withdraw / no-change), updating `class_id` and `enrollment_status` and logging an `enrollment_runs` row.

### 4.15 Import / Export
- CSV import for students (`/api/import/students`) and teachers (`/api/import/teachers`).
- CSV templates: `/api/export/students-template` and `/api/export/teachers-template`.

### 4.16 Audit Log
- Every privileged mutation calls `write_audit(...)`; the module is best-effort and never crashes the parent op.
- `GET /api/audit-logs` supports filters `entity_type`, `entity_id`, `actor_id`, `limit ≤ 1000`. Superuser/Admin only.
- Sorted by `created_at desc`.

### 4.17 File Uploads
- Photos and template backgrounds: `POST /api/upload/photo`, `POST /api/upload/template-background`.
- Served back via `GET /api/uploads/{filename}`.
- Files stored on disk under `/app/backend/uploads/` — **not** in cloud storage.

### 4.18 Dashboard Stats
- `GET /api/stats/dashboard` returns tenant-scoped counters (students, classes, users, teachers, attendance today, admissions, health, discipline).

---

## 5. User Roles & Permissions

### 5.1 Role Matrix

| Capability | Superuser | Admin | Teacher | Parent |
|---|:-:|:-:|:-:|:-:|
| Cross-school access | ✅ | ❌ | ❌ | ❌ |
| Manage schools | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ (own school) | ❌ | ❌ |
| Reset user credentials | ✅ | ✅ (own school) | ❌ | ❌ |
| Manage students | ✅ | ✅ | ✅ (own classes) | ❌ |
| Manage classes | ✅ | ✅ | ✅ (own classes) | ❌ |
| Take attendance | ✅ | ✅ | ✅ (own classes) | ❌ |
| Manage grades | ✅ | ✅ | ✅ (own classes) | ❌ |
| Lock gradebook | ✅ | ✅ | ✅ (own classes) | ❌ |
| Unlock gradebook | ✅ | ✅ | ❌ | ❌ |
| Report-card lock | ✅ | ✅ | ❌ | ❌ |
| Report-card send | ✅ | ✅ | ✅ (own class) | ❌ |
| Report designer | ✅ | ✅ | ❌ | ❌ |
| Admissions | ✅ | ✅ | ❌ | ❌ |
| Health records | ✅ | ✅ | ✅ (own classes) | ❌ |
| Discipline | ✅ | ✅ | ✅ (own classes) | ❌ |
| Re-enrollment | ✅ | ✅ | ❌ | ❌ |
| Audit log | ✅ | ✅ | ❌ | ❌ |
| Import/export CSV | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ✅ |

### 5.2 Enforcement Points

Three dependency helpers in `server.py`:

- `require_roles([...])` — superuser bypasses, else the role must be in the list.
- `require_permission(perm)` — superuser bypasses, else `perm` must be in the user's `permissions[]`.
- `require_superuser()` — hard-lock to `superuser`.

Plus contextual class-scoping helpers:

- `get_teacher_class_ids(user)` and `get_teacher_student_ids(user)` restrict list/get endpoints for teachers.
- `_ensure_student_in_school`, `_ensure_teacher_can_access_student` guard nested student endpoints.
- `assert_school_tenant(id, user)` for cross-tenant checks on school-scoped resources.

---

## 6. Data Model (MongoDB Collections)

All documents use **string UUIDs** (via `uuid.uuid4()`) — the MongoDB `_id` is projected out of every read (`{"_id": 0}`) to keep responses JSON-friendly.

| Collection | Purpose | Key fields |
|---|---|---|
| `schools` | Tenants | `id`, `school_code` (UPPER), `name`, `academic_years`, `subjects`, `principal_signature`, `teacher_signature`, `attendance_threshold`, `is_active` |
| `users` | All accounts | `id`, `username`, `school_code`, `role`, `permissions`, `password_hash` (bcrypt), `photo_url`, extended profile |
| `students` | Enrolled learners | `id`, `school_code`, `class_id`, `student_id`, `first/middle/last_name`, `date_of_birth`, `gender`, `house`, `family_members[]`, `enrollment_status`, `age`, `photo_url` |
| `classes` | Rosters | `id`, `school_code`, `name`, `grade_level`, `teacher_id`, `academic_year`, `created_by` |
| `attendance` | Daily marks | `id`, `school_code`, `student_id`, `class_id`, `date`, `status`, `marked_by` |
| `gradebook` | Per-term entries | `id`, `school_code`, `student_id`, `class_id`, `term`, `academic_year`, `subjects[]` (weighted components), `overall_score`, `overall_grade`, `is_locked` |
| `social_skills` | Per-term ratings | `student_id`, `school_code`, `term`, `academic_year`, `skills{}` |
| `teacher_comments` | Form-teacher comments | `student_id`, `school_code`, `term`, `academic_year`, `comment` |
| `report_templates` | Per-school template | `school_code`, `design_mode`, `canvas_elements[]`, `background_url`, `subjects[]`, `grade_scale[]`, `achievement_standards[]`, `sections{}`, `is_locked_default` |
| `report_card_locks` | Finalized-report locks | `student_id`, `school_code`, `term`, `academic_year`, `locked_at`, `locked_by` |
| `admissions` | Inquiry/applications | `id`, `school_code`, `status`, guardians, contact info |
| `health_records` | Per-student wellness | `student_id`, `school_code`, `vaccinations[]`, `allergies[]`, `conditions[]`, `medications[]`, `visits[]` |
| `discipline_incidents` | Behavior log | `id`, `school_code`, `student_id`, `type`, `status`, `date`, `reported_by`, `reported_by_name` |
| `enrollment_runs` | Promotion history | `id`, `school_code`, `from_year`, `to_year`, `counts{}`, `executed_by` |
| `audit_logs` | Immutable trail | `id`, `school_code`, `actor_id/name/role`, `action`, `entity_type`, `entity_id`, `entity_label`, `details{}`, `created_at` |
| `password_resets` | Token store | `token`, `user_id`, `school_code`, `expires_at`, `used` |

Startup migrations idempotently flip legacy templates to `design_mode='lumina_default'` and pre-create the `JTECH` school + superuser.

---

## 7. API Reference

**Total endpoints: 104.** All are prefixed with `/api`. Below is the complete inventory grouped by module. Every mutation requires JWT; role/permission gates are noted per group.

### 7.1 Auth (`/api/auth`) — Public + JWT
- `POST /auth/login` — school-code login, returns JWT + user.
- `GET  /auth/me` — return current user (JWT required).
- `POST /auth/forgot-password` — issue reset token (always 200; log-only if no email).
- `POST /auth/reset-password` — exchange token for new password (≥8 chars).

### 7.2 Schools (`/api/schools`) — Superuser (list/CRUD) + tenant guard
- `POST /schools`
- `GET  /schools`
- `GET  /schools/{id}`
- `PUT  /schools/{id}`
- `DELETE /schools/{id}`
- `POST /schools/{id}/academic-years`
- `PUT  /schools/{id}/academic-years/{year}/toggle`
- `PUT  /schools/{id}/academic-years/{year}/set-current`
- `POST /schools/{id}/signatures/upload`
- `GET  /schools/{id}/signatures`
- `GET  /schools/{id}/subjects`
- `PUT  /schools/{id}/subjects`
- `POST /schools/{id}/subjects`
- `DELETE /schools/{id}/subjects/{subject_name}`

### 7.3 Report Templates (`/api/report-templates`) — Admin
- `GET /report-templates/{school_code}`
- `PUT /report-templates/{school_code}`
- `POST /report-templates/{school_code}/reset-default`

### 7.4 Users (`/api/users`) — Admin
- `GET  /users`
- `GET  /users/{id}`
- `POST /users`
- `PUT  /users/{id}`
- `PUT  /users/{id}/role`
- `PUT  /users/{id}/credentials`
- `DELETE /users/{id}`

### 7.5 Students (`/api/students`) — Auth
- `GET  /students`
- `GET  /students/{id}`
- `POST /students`
- `PUT  /students/{id}`
- `DELETE /students/{id}`
- `GET  /students/{id}/attendance/summary?month=YYYY-MM`

### 7.6 Classes (`/api/classes`) — Admin/Teacher
- `GET  /classes`
- `GET  /classes/{id}`
- `POST /classes`
- `PUT  /classes/{id}`
- `DELETE /classes/{id}`

### 7.7 Attendance (`/api/attendance`) — permission `manage_attendance`
- `GET  /attendance` (filters: `student_id`, `class_id`, `date_from`, `date_to`)
- `POST /attendance`
- `POST /attendance/bulk`

### 7.8 Gradebook (`/api/gradebook`) — permission `manage_grades`
- `GET  /gradebook`
- `POST /gradebook`
- `DELETE /gradebook/{id}`
- `POST /gradebook/{id}/lock` (admin/teacher)
- `POST /gradebook/{id}/unlock` (admin only)
- `GET  /gradebook/{class_id}/distribution?term=&academic_year=`

### 7.9 Report Cards (`/api/report-card` and `/api/report-cards`)
- `GET  /report-card/{student_id}?term=&academic_year=` — build data payload for a student.
- `GET  /report-cards/class/{class_id}?term=&academic_year=` — batch data.
- `POST /report-cards/{student_id}/lock` (admin) — lock report card.
- `DELETE /report-cards/{student_id}/lock` (admin) — unlock.
- `GET  /report-cards/locks?term=&academic_year=` — list locks.
- `POST /report-cards/send` — bulk email guardians via Resend.

### 7.10 Reference data
- `GET /subjects`
- `GET /houses`
- `GET /grading-scheme`
- `GET /permissions`

### 7.11 Uploads (`/api/upload`)
- `POST /upload/photo`
- `POST /upload/template-background`
- `GET  /uploads/{filename}`

### 7.12 Social Skills & Teacher Comments
- `POST /social-skills`, `GET /social-skills/{student_id}`, `GET /social-skills/class/{class_id}`
- `POST /teacher-comments`, `GET /teacher-comments/{student_id}`, `GET /teacher-comments/class/{class_id}`

### 7.13 Signatures
- `POST /signatures/upload`, `GET /signatures`

### 7.14 Import / Export
- `POST /import/students`, `POST /import/teachers`
- `GET /export/students-template`, `GET /export/teachers-template`

### 7.15 Dashboard
- `GET /stats/dashboard`

### 7.16 Admissions (`/api/admissions`) — Admin
- `GET /admissions/stats`
- `GET /admissions/inquiries`
- `GET /admissions/applications`
- `GET /admissions`
- `GET /admissions/{id}`
- `POST /admissions`
- `PUT /admissions/{id}`
- `DELETE /admissions/{id}`
- `POST /admissions/{id}/convert` — turn accepted application into a Student.

### 7.17 Health (`/api/health`) — Admin/Teacher
- `GET /health/stats`
- `GET /health/{student_id}`
- `POST /health/{student_id}/vaccination`
- `POST /health/{student_id}/allergy`
- `POST /health/{student_id}/condition`
- `POST /health/{student_id}/medication`
- `POST /health/{student_id}/visit`
- `DELETE /health/{student_id}/{entry_type}/{entry_id}`

### 7.18 Discipline (`/api/discipline`) — Admin/Teacher
- `GET /discipline/stats`
- `GET /discipline`
- `GET /discipline/{id}`
- `POST /discipline`
- `PUT /discipline/{id}`
- `DELETE /discipline/{id}` (admin only)

### 7.19 Re-Enrollment (`/api/enrollment`) — Admin
- `GET /enrollment/preview?from_year=&to_year=`
- `POST /enrollment/execute`

### 7.20 Audit
- `GET /audit-logs?entity_type=&entity_id=&actor_id=&limit=`

### 7.21 System
- `GET /` — API health banner
- `GET /health` (root, no `/api` prefix) — for k8s liveness probe

---

## 8. Frontend Pages & Routes

| Route | Page component | Roles |
|---|---|---|
| `/login` | `LoginPage` | public |
| `/forgot-password` | `ForgotPasswordPage` | public |
| `/dashboard` | `DashboardPage` | all authenticated |
| `/schools` | `SchoolsPage` | superuser |
| `/students` | `StudentProfilePage` (listing view) | all |
| `/students/manage` | `StudentsPage` | all |
| `/students/:studentId` | `StudentProfilePage` | all |
| `/classes` | `ClassesPage` | superuser/admin/teacher |
| `/attendance` | `AttendancePage` | all |
| `/gradebook` | `GradebookPage` | all |
| `/grades` | `GradesPage` | superuser/admin/teacher |
| `/report-cards` | `ReportsPage` | superuser/admin/teacher |
| `/report-manager/comments` | `FormTeacherCommentsPage` | superuser/admin/teacher |
| `/report-manager/social-skills` | `SocialSkillsManagerPage` | superuser/admin/teacher |
| `/report-template` | `ReportTemplateDesigner` (canvas WYSIWYG) | superuser/admin |
| `/import-export` | `ImportExportPage` | superuser/admin |
| `/users` | `UsersPage` | superuser/admin |
| `/staff`, `/staff/:userId` | `StaffProfilePage` | superuser/admin |
| `/admissions` | `AdmissionsPage` | superuser/admin |
| `/health` | `HealthPage` | superuser/admin/teacher |
| `/discipline` | `DisciplinePage` | superuser/admin/teacher |
| `/re-enrollment` | `ReEnrollmentPage` | superuser/admin |
| `/audit-logs` | `AuditLogPage` | superuser/admin |
| `/privacy` | `PrivacyPolicyPage` | public |
| `/terms` | `TermsOfUsePage` | public |
| `/reports` | redirect → `/report-cards` | — |

**Sidebar** (`Layout.js`) organizes these into 7 collapsible groups: Overview, Admissions, People, Academics, Report Manager, Student Services, Administration.

---

## 9. Authentication & Session Management

### 9.1 Login
```json
POST /api/auth/login
{
  "school_code": "SUNF",
  "username": "admin",
  "password": "…"
}
→ 200
{
  "access_token": "eyJhbGciOi…",
  "token_type": "bearer",
  "user": { "id":"…", "role":"admin", "school_code":"SUNF", "permissions":[…] }
}
```

- `school_code` is uppercased server-side.
- If the username isn't found in that school, the login attempts a **superuser fallback** — if a superuser with that username exists, the token is issued but scoped to the *requested* school (context-switching).
- Wrong school code returns `401 "Invalid school code"`; wrong credentials return `401 "Invalid credentials"`.

### 9.2 Token
- **Algorithm:** HS256 with `JWT_SECRET` from env (falls back to a compiled-in placeholder if missing — see §17).
- **Payload:** `{ sub: user_id, role, school_code, exp }`
- **TTL:** 24 hours (`JWT_EXPIRATION_HOURS = 24`).
- Delivered via `Authorization: Bearer …` header — never as a cookie.

### 9.3 Frontend session
- Stored in `localStorage.token` (see §17 for XSS implications).
- Global axios interceptor watches for `401` responses on non-login requests and pops the `SessionExpiredModal`, which offers a "sign in again" action that hard-logs-out and redirects.
- `RouteWatcher` persists `LAST_PAGE_KEY = 'lumina_last_page'` so the user is returned to their previous page after a fresh login.

---

## 10. Multi-tenancy Design

- Every school is keyed by `school_code` (uppercase, 3-5 letters). Examples: `JTECH`, `SUNF`, `RVSD`.
- Every domain document carries `school_code` and *every* query filters by it.
- Superuser bypass is explicit — the token carries the *requested* `school_code`, so even the superuser can only see one tenant at a time.
- Teacher scope is a second layer inside a tenant: `get_teacher_class_ids` restricts them to classes they own or were assigned.
- Startup task auto-creates `JTECH` school + superuser if absent; seed scripts (`/app/scripts/seed_two_schools.py`) add `SUNF` and `RVSD` sample tenants.

---

## 11. Report Card System

### 11.1 Default template (`design_mode = 'lumina_default'`)
Rendered by `LuminaDefaultReportCard.jsx`. Highlights:

- Legal (8.5×14) single-page layout, indigo accent (uses `school.primary_color` if present).
- Letter-grade colored badges — A=emerald, B=blue, C=amber, D=orange, F/E=red.
- Horizontal attendance tile strip.
- Five-dot conduct scale for Punctuality, Participation, Behaviour, Effort.
- Promotion pill: Promoted / On Probation / Retained (overall-score driven).
- Homeroom-teacher + Principal comment boxes.
- Stamp/seal area + parent signature line + "Generated by Lumina-SIS" footer watermark.
- Cannot be deleted — only duplicated or replaced (`is_locked_default: true`).

### 11.2 Canvas WYSIWYG designer (`design_mode = 'canvas'`)
Route: `/report-template` (superuser/admin).

**Element types:** Text, Data Field (placeholder replaced with real student data), Image (fit-mode, opacity, rotation), Horizontal Line, Vertical Line, Rectangle, Signature slot, Grades Table, Social Skills table.

**Editor features (see PRD):**
- Background image upload — paste any legacy report design.
- Free positioning + drag + corner-handle resize.
- Grid (10 px), snap-to-grid, alignment guides (5 px threshold, red).
- Pan (Alt+drag), Zoom (Ctrl+scroll, presets 50/100/200/400%, slider 25%-400%, double-click to reset).
- Undo (Ctrl+Z, 50 steps), Copy/Paste (Ctrl+C/V, 30 px offset).
- Properties panel per element: Position/Size, Content, Typography (incl. line-height), Colors, Border, Padding.
- Sparkles "Lumina default" button in the toolbar to reset back to the default layout (audit-logged).

### 11.3 Report generation & download
- `GET /api/report-card/{student_id}` returns the assembled JSON payload (student, class, gradebook, social skills, comments, attendance %, template).
- Client-side rendering happens in `ReportCardRenderer` (in `ReportsPage.js`), then export via `html2canvas → jspdf`.
- PDF file naming spec:
  - Single: `[LastName]_[FirstName]_ReportCard_[Term]_[AcademicYear].pdf`
  - Class batch: `[ClassName]_[Term]_[Year].pdf`

### 11.4 Locking & Sending
- Admins can `POST /report-cards/{student_id}/lock?term=&academic_year=` to freeze a term.
- `POST /report-cards/send` sends parent-facing "your child's report card is ready" notifications through Resend (never sends the raw PDF — parents are asked to log in).

---

## 12. Grading & Assessment

### 12.1 Weighted assessment
Each subject entry captures six components with fixed weights:

| Component | Weight | Field name |
|---|--:|---|
| Homework | 5 % | `homework` |
| Group work | 5 % | `groupWork` |
| Project | 10 % | `project` |
| Quiz | 10 % | `quiz` |
| Mid-term | 30 % | `midTerm` |
| End of term | 40 % | `endOfTerm` |

Weighted score = Σ(component × weight/100). Weighted score maps into the 11-band letter scale below.

### 12.2 Grade scale (`GRADING_SCHEME`)

| Range | Letter | Domain description | GPA |
|---|:-:|---|--:|
| 90-100 | A+ | Expert performance | 4.0 |
| 85-89 | A | Highly Proficient | 3.8 |
| 80-84 | A- | Proficient | 3.7 |
| 75-79 | B | Satisfactory | 3.5 |
| 70-74 | B- | Developing | 3.3 |
| 65-69 | C | Passing | 3.2 |
| 60-64 | C- | Passing | 2.8 |
| 55-59 | D | Marginal | 2.6 |
| 50-54 | D- | Below Average | 2.4 |
| 40-49 | E | Frustration | 1.0 |
| 0-39 | U | No participation | 0.0 |

### 12.3 Achievement standards (final-exam band)

| Range | Band |
|---|---|
| 85-100 | Highly Proficient |
| 70-84 | Proficient |
| 50-69 | Developing |
| 0-49 | Beginning |

### 12.4 Core subjects
`English Language, Mathematics, Science, Social Studies` are marked `is_core=true`; only these count toward the class average / ranking calculations in the default report card.

---

## 13. Password Reset & Email

- `POST /api/auth/forgot-password` — always returns 200 to avoid account enumeration; the response includes a `delivery` string (`email` / `log` / `none`) that is only useful in dev.
- Token is a 32-char hex, TTL **1 hour**, stored in `password_resets` with `used=false`.
- If `RESEND_API_KEY` is configured and the user has an email on file, the token is sent through Resend (HTML template branded "Lumina-SIS"). Otherwise the token is logged to the backend stdout with `[FORGOT PASSWORD]` prefix.
- `POST /api/auth/reset-password` — enforces new password ≥8 chars, marks the token `used=true`.
- Report-card ready email uses the same Resend integration (`_send_report_card_email`).

---

## 14. Audit Log

- Every privileged mutation calls `write_audit(actor, action, entity_type, entity_id, entity_label, details)` — best-effort, never crashes the caller.
- Actions currently logged: `create`, `update`, `delete`, `lock`, `unlock`, `convert`, `promote/retain/graduate/withdraw`, `reset` (template), `send` (report cards).
- Entities: `student`, `gradebook`, `enrollment`, `admission`, `discipline`, `health`, `user`, `school`, `report_card`, `report_template`.
- Retrieval: `GET /api/audit-logs` — filters `entity_type`, `entity_id`, `actor_id`, `limit≤1000`; sorted `created_at DESC`; **school-scoped**; admin/superuser only.
- The frontend `AuditLogPage` provides UI to filter and inspect the trail.

---

## 15. File Uploads & Storage

- Storage root: `/app/backend/uploads/`.
- Upload endpoints:
  - `POST /api/upload/photo` — student/staff photo (JPEG/PNG/GIF/WEBP).
  - `POST /api/upload/template-background` — WYSIWYG designer background.
  - `POST /api/schools/{id}/signatures/upload` — principal/teacher signature PNG.
- Retrieval: `GET /api/uploads/{filename}` (no auth, no signing).
- Files are keyed by a **UUID + original extension**, so filename guessing is hard, but there is **no auth on retrieval** — see §17.

---

## 16. Security Policies (Implemented)

### 16.1 Passwords
- **bcrypt** with generated salt (`bcrypt.gensalt()` — default cost = 12).
- Minimum length **8** enforced only on the reset endpoint.

### 16.2 Tokens
- JWT HS256, 24-hour TTL.
- Server-side revocation not implemented (no denylist); short TTL is the mitigation.

### 16.3 Authorization
- Three-tier gate: superuser bypass, role check, permission check.
- **Tenant isolation:** every query and mutation filters by `school_code`; helpers explicitly return 403 on cross-tenant attempts.
- Teacher scope narrows further to `their classes`.
- Same-user protections: cannot delete yourself, cannot delete superuser, cannot modify or demote a superuser unless you *are* a superuser.

### 16.4 Account enumeration
- `POST /auth/forgot-password` returns 200 regardless of user existence.
- Login errors say "Invalid credentials" vs. "Invalid school code" — see §17 for the trade-off.

### 16.5 CORS
- `CORS_ORIGINS` env var, defaults to `*`, split on `,`.
- `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.

### 16.6 Audit trail
- Immutable append-only `audit_logs`; every lock, unlock, promotion, delete, and email-send writes a row.

### 16.7 Multi-tenant safety
- Startup migration flips old templates without leaking tenant data.
- Superuser fallback in login is explicit and audited by role field.

---

## 17. Security Risks & Known Vulnerabilities

> The findings below are ordered by severity. Each links to the file/line where the mitigation should land.

### 17.1 HIGH — Default JWT secret when env is missing
`backend/server.py:36` uses `os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')`. If the `.env` file (or the container secret) is missing at boot, the backend still starts with an infamous placeholder that anyone with the source code can forge tokens against.

- **Impact:** Any attacker can mint valid tokens and impersonate any user, including superuser.
- **Fix:** Fail fast at startup if `JWT_SECRET` is unset OR equals the placeholder. Rotate the current secret and invalidate all issued tokens.

### 17.2 HIGH — JWT stored in `localStorage`
`frontend/src/context/AuthContext.js:11` reads/writes the token to `localStorage`. Any XSS in the app (dependency compromise, unsanitized rich-text, canvas designer field, etc.) can exfiltrate the token.

- **Impact:** Full account takeover via XSS.
- **Fix:** Move JWTs to an **HttpOnly, Secure, SameSite=Strict** cookie. Use CSRF token for state-changing calls. If that is too invasive, at minimum add a strict Content-Security-Policy.

### 17.3 HIGH — Uploads served without authentication
`GET /api/uploads/{filename}` is public. Student photos, signatures, and template backgrounds are all reachable by anyone who knows (or guesses) the UUID filename.

- **Impact:** Sensitive PII (minor students' photos, principal signatures) can leak.
- **Fix:** Require JWT + verify tenant on `/api/uploads/*` (either look up who owns the file, or use time-limited signed URLs). Move to S3 with signed URLs long-term.

### 17.4 HIGH — CORS wide-open by default
`allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')` + `allow_credentials=True`. The `*` origin with credentials is normally rejected by browsers, but any misconfiguration that lists a wildcard subdomain is a risk.

- **Impact:** Cross-site request forgery / token theft via rogue origins in cases where credentials mode is confused.
- **Fix:** Pin `CORS_ORIGINS` to the exact deployment domain(s) in production and refuse to boot with `*` in prod mode.

### 17.5 HIGH — No rate limiting / brute-force protection
Login and forgot-password endpoints accept unlimited requests. Combined with the deterministic error strings, an attacker can enumerate school codes and brute-force weak passwords.

- **Fix:** Add `slowapi`/`limits` throttling (e.g. 5 attempts per IP per minute per school), plus an exponentially backed off per-account lockout on repeated failures. Log lockouts to `audit_logs`.

### 17.6 MEDIUM — Distinguishable login errors
`POST /auth/login` returns `"Invalid school code"` vs. `"Invalid credentials"`. This lets an attacker enumerate live tenants.

- **Fix:** Return a single generic 401 message (e.g. "Invalid school, username, or password").

### 17.7 MEDIUM — Password policy is weak
- No max-length, no complexity, no history — only a `≥8` characters check on reset.
- `/api/users` creation endpoint sets the password without any strength enforcement.
- **Fix:** Enforce complexity (mixed case, digit, symbol), zxcvbn score check, and rotate default seed passwords (`Admin@123`, `Teacher@123`) as soon as tenants are onboarded.

### 17.8 MEDIUM — `Admin@123` & `Teacher@123` default credentials
Both `seed_two_schools.py` and TEST_CREDENTIALS.md ship weak default passwords. If the seed script is accidentally run in production, admins/teachers are trivial to compromise.

- **Fix:** Gate the seed scripts behind an env flag (`SEED_DEMO=1`), force password change on first login, generate random per-user initial passwords.

### 17.9 MEDIUM — No input sanitization / rich-text XSS surface
The report card canvas designer stores raw HTML in text elements, teacher comments can be arbitrary text, and both are rendered directly in the React tree via HTML strings. React escapes by default, but any `dangerouslySetInnerHTML` (used for canvas background rendering) can be abused.

- **Fix:** Sanitize any HTML written to the DOM with `DOMPurify`. Restrict the canvas text editor to a controlled subset (no `<script>`, no `on*` handlers). Audit every `dangerouslySetInnerHTML` call in the frontend.

### 17.10 MEDIUM — MongoDB has no indexes defined
`server.py` never calls `db.<collection>.create_index(...)`. Queries filter by `school_code`, `class_id`, `student_id`, `date`, and `academic_year` on collections that will grow into millions of rows.

- **Impact:** Performance falls off a cliff at scale; a heavy report-card export can DoS the DB.
- **Fix:** Add compound indexes: `{school_code:1, student_id:1}`, `{school_code:1, class_id:1}`, `{school_code:1, date:-1}`, `{school_code:1, term:1, academic_year:1}`, plus `{token:1, used:1}` on `password_resets`.

### 17.11 MEDIUM — No server-side pagination on list endpoints
`GET /students`, `/attendance`, `/gradebook`, `/discipline`, `/admissions`, and `/audit-logs` cap at 1000-5000 with `to_list(N)`, no `skip/limit` / cursor / `nextPageToken` in the response.

- **Fix:** Add `page`, `page_size` (or cursor) parameters and return `{items, total, next}`. Update the frontend to consume it.

### 17.12 MEDIUM — File-upload validation is minimal
Uploads accept any content, only trusting the extension. There is no magic-byte check, no size cap, no virus scan.

- **Fix:** Validate the actual MIME (`python-magic`), cap size at ~5 MB, reject SVG (XSS vector), strip EXIF, virus-scan via ClamAV if hosted.

### 17.13 LOW — Long-lived JWTs (24 h)
Once issued, a token is valid for 24 hours regardless of password change or account deletion.

- **Fix:** Short-lived access tokens (15 min) + refresh tokens (rotating, revocable via DB), or a `token_version` field on users incremented on password change.

### 17.14 LOW — No HTTPS enforcement in the app
The backend does not set `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or CSP headers. It relies entirely on the ingress.

- **Fix:** Add a small `SecurityHeadersMiddleware` and set the standard hardening headers.

### 17.15 LOW — No account-lockout after N failed logins
There is no counter on failed logins, so weak passwords stay vulnerable even with rate limiting.

- **Fix:** Track `failed_attempts` on the user document; lock for 15 min after 10 failed attempts; audit-log the lockout.

### 17.16 LOW — `.env` files not tracked
Backend refuses to boot without `MONGO_URL` (correct), but `.env` was missing after the GitHub rebuild — recreated during this documentation task. Anyone re-cloning the repo will have the same downtime.

- **Fix:** Ship a `.env.example` in the repo and add a `deploy.sh` that creates a valid `.env` from environment secrets.

### 17.17 LOW — No CSRF protection for cookie flows
Not currently exploitable (JWT is in `localStorage`, not a cookie), but if #17.2 is fixed by moving to cookies, CSRF becomes required.

- **Fix:** Include `SameSite=Strict` and per-request CSRF tokens when moving to cookies.

### 17.18 LOW — No PII redaction / GDPR-style controls
Health records, discipline incidents, and family-member emails/phones are stored indefinitely in plain text.

- **Fix:** Add a per-tenant retention policy; support "right to erasure" endpoints; document PII fields; encrypt sensitive fields at rest with a KMS key.

### 17.19 LOW — Password reset token has no per-user limit
A user can request unlimited reset tokens, each creating a new row.

- **Fix:** Rate-limit `POST /auth/forgot-password` to 3 per hour per (school_code, username) and expire prior tokens on new issuance.

---

## 18. Recommendations for Improvements

### 18.1 Security (highest priority)
1. Fail-fast on missing/placeholder `JWT_SECRET` (§17.1).
2. Move JWT to HttpOnly cookies + CSRF (§17.2, §17.17).
3. Gate `GET /api/uploads/*` behind auth + tenancy (§17.3).
4. Pin CORS origins per environment (§17.4).
5. Add `slowapi` rate limiting + per-account lockout (§17.5, §17.15).
6. Homogenize login errors (§17.6).
7. Enforce password complexity + rotate demo seeds (§17.7, §17.8).
8. Sanitize any user-controlled HTML (`DOMPurify`) (§17.9).
9. Add security headers middleware and CSP (§17.14).
10. Add magic-byte validation and size caps on uploads (§17.12).

### 18.2 Performance & Scale
1. **Create MongoDB indexes** (§17.10). Immediate 10–100× read speed-up on multi-tenant queries.
2. **Server-side pagination** for `/students`, `/attendance`, `/audit-logs`, `/gradebook` (§17.11).
3. Split `server.py` (4 015 LoC) into module routers — see PRD tech-debt item.
4. Cache `/subjects`, `/houses`, `/grading-scheme`, `/permissions` with `Cache-Control: max-age=3600, immutable`.
5. Batch load report-card data in `GET /report-cards/class/{class_id}` with `$lookup` aggregation to avoid N+1.
6. Streaming CSV export instead of buffering.

### 18.3 UX / Product
1. Dark mode (PRD backlog).
2. Parent portal with per-student PDF download inline.
3. Class timetable / academic calendar module.
4. Communication module (announcements, homework, messaging).
5. Report-card locking UI badges in `ReportsPage`.
6. Reveal `delivery=log` in the forgot-password toast only for dev builds.
7. Wire the `SessionExpiredModal` to also cover 403 → forbidden route redirect.
8. Add "impersonate school" chip in the header for superusers (currently they must log out and back in).

### 18.4 Data
1. Add validation on `date_of_birth` (`YYYY-MM-DD`, not in the future) at the model level.
2. Enforce `school_code` regex at model level (`^[A-Z]{3,5}$`).
3. Standardize on ISO-8601 UTC everywhere (`datetime.now(timezone.utc).isoformat()`) — already done in most places, sweep the rest.
4. Add optimistic-concurrency (`updated_at` compare-and-swap) on gradebook and report-card locks.

### 18.5 DevOps / Reliability
1. Ship `.env.example` (§17.16).
2. Add unit tests to CI — the repo already has 9 test files in `backend/tests/` but no CI runner.
3. Structured logging (JSON) with correlation IDs — swap the current basicConfig for `structlog`.
4. Health probes: extend `GET /health` to also ping Mongo and Resend.
5. Move `/backend/uploads/` to S3 or a persistent volume with pre-signed URLs.
6. Backups: nightly `mongodump` per tenant into an encrypted bucket.

### 18.6 Testing / Quality
1. Add pytest fixtures for JWT + tenant scoping so RBAC regressions are caught.
2. Add Playwright end-to-end for at least the login-take-attendance-generate-report happy path.
3. Add explicit RBAC test that a teacher **cannot** view another teacher's gradebook.

---

## 19. Deployment & Operations

### 19.1 Local / Container
- All services live under `supervisord`:
  - `backend` (uvicorn on `0.0.0.0:8001`).
  - `frontend` (`craco start`, port 3000).
  - `mongodb` (local, port 27017).
  - `nginx-code-proxy` + `code-server` (dev IDE, unrelated to product).
- Standard commands:
  ```bash
  sudo supervisorctl restart backend
  sudo supervisorctl restart frontend
  sudo supervisorctl status
  ```

### 19.2 Environment variables

**backend/.env**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=lumina_sis
JWT_SECRET=…rotate-me…
CORS_ORIGINS=https://your-domain.example
RESEND_API_KEY=re_xxx_optional
SENDER_EMAIL=onboarding@resend.dev
```

**frontend/.env**
```
REACT_APP_BACKEND_URL=https://your-preview-or-prod-hostname
WDS_SOCKET_PORT=443
```

### 19.3 Kubernetes ingress rules
- `/api/*` → backend (port 8001).
- Everything else → frontend (port 3000).
- Never modify these in code; use the ingress config.

### 19.4 Seed scripts
- `scripts/seed_two_schools.py` — creates `SUNF` and `RVSD` sample tenants with admins, teachers, students, and classes.
- `scripts/migrate_schools.py`, `migrate_school_subjects.py`, `update_academic_year.py` — one-off data migrations.

### 19.5 Migrations
- `@app.on_event("startup")` in `server.py`:
  - `create_superuser` — idempotently creates `JTECH` school + superuser account.
  - `startup_migrations` — flips legacy or empty templates to `design_mode='lumina_default'`, sets `is_locked_default=True`.

---

## 20. Test Credentials

| Tenant | School code | Username | Password | Role |
|---|---|---|---|---|
| JTECH Innovations | `JTECH` | `jtech.innovations@outlook.com` | `Xekleidoma@1` | superuser (system) |
| Sunflower Academy | `SUNF` | `admin` | `Admin@123` | admin |
| Sunflower Academy | `SUNF` | `sarah.thompson.sunf` | `Teacher@123` | teacher |
| Riverside International | `RVSD` | `admin` | `Admin@123` | admin |
| Riverside International | `RVSD` | `elizabeth.anderson.rvsd` | `Teacher@123` | teacher |

`SUNF` and `RVSD` need to be seeded (`python /app/scripts/seed_two_schools.py`). The `JTECH` superuser is auto-created at every startup.

**Rotate all default passwords in production.** See §17.8.

---

## 21. Appendix: Environment Variables

| Variable | Location | Default | Required | Notes |
|---|---|---|:-:|---|
| `MONGO_URL` | backend/.env | — | ✅ | Server refuses to boot without this. |
| `DB_NAME` | backend/.env | — | ✅ | e.g. `lumina_sis`. |
| `JWT_SECRET` | backend/.env | placeholder | ⚠️ should be | See §17.1. |
| `CORS_ORIGINS` | backend/.env | `*` | recommended | Comma-separated exact origins in prod. |
| `RESEND_API_KEY` | backend/.env | empty | optional | Enables password-reset + report-card emails. |
| `SENDER_EMAIL` | backend/.env | `onboarding@resend.dev` | optional | Verified sender in Resend. |
| `REACT_APP_BACKEND_URL` | frontend/.env | — | ✅ | Public backend URL (`https://…`). |
| `WDS_SOCKET_PORT` | frontend/.env | 443 | dev only | CRA websocket port. |

---

## 22. Appendix: Ground-truth Metrics

Auto-collected from the current source tree:

| Metric | Value |
|---|--:|
| Backend `/api/*` endpoints | 104 |
| Backend Python functions | 139 |
| Backend LoC (`server.py`) | 4 015 |
| Frontend LoC (pages + components) | 13 672 |
| Frontend pages | 25 |
| React Router routes | 27 (24 protected + 3 public/redirects) |
| MongoDB collections referenced | 16 |
| Auth roles | 4 (superuser, admin, teacher, parent) |
| Named permissions | 8 |
| Default subjects | 10 (4 core) |
| Grade bands | 11 |
| Achievement bands | 4 |

---

### Document Info

- **Generated:** July 2025
- **Source:** live scan of `/app` after GitHub rebuild.
- **Owner:** Lumina-SIS project maintainers.
- **License:** internal — refer to repo `LICENSE` if/when added.

---

_End of documentation._
