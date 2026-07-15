# Test Credentials for Lumina-SIS

## JTECH Innovations (Auto-created on startup)
- **School Code:** JTECH
- **Superuser Username:** jtech.innovations@outlook.com
- **Superuser Password:** Xekleidoma@1
- **Role:** Superuser (full access)

## Sunflower Academy (SUNF) — Requires seeding
- **School Code:** SUNF
- **Admin Username:** admin
- **Admin Password:** Admin@123
- **Teacher Username:** sarah.thompson.sunf
- **Teacher Password:** Teacher@123
- Seed via: `python /app/scripts/seed_two_schools.py`

## Riverside International School (RVSD) — Requires seeding
- **School Code:** RVSD
- **Admin Username:** admin
- **Admin Password:** Admin@123
- **Teacher Username:** elizabeth.anderson.rvsd
- **Teacher Password:** Teacher@123
- Seed via: `python /app/scripts/seed_two_schools.py`

## Email (Resend) — Test Mode
- `RESEND_API_KEY` is empty in `/app/backend/.env` after the GitHub rebuild.
  Re-add your Resend key and `SENDER_EMAIL` if email features (forgot-password)
  are needed.

## Notes
- The backend automatically creates the JTECH superuser on every startup if missing.
- Other schools (SUNF, RVSD) and their dummy data must be re-seeded if needed.

## Mona Heights Primary School (MHPS) — MHPS Upper School Report Card
- **School Code:** MHPS
- **Admin Username:** admin
- **Admin Password:** Admin@123
- **Teacher Username:** akua.mensah (or any MHPS teacher, e.g. from users list)
- **Teacher Password:** Teacher@123
- Seed base data via: `python /app/scripts/seed_mhps_data.py`
- Seed the MHPS Upper School template + comment bank + report_cards via:
  `python /app/scripts/seed_mhps_template.py`
- Seeded report_cards exist for Grades 4-6 students, term="Term 1", academic_year="2024-2025".
- MHPS endpoints are tenant-locked to school_code=MHPS (superuser bypasses).

