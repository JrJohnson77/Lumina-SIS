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
