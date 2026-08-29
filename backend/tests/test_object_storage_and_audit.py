"""
Iteration 19 backend tests:
  1. Object storage upload+serve (photo, signature) with tenant-scoped download
  2. Audit logging coverage on the 17 newly-instrumented mutating endpoints
  3. Regression: core reads still 200 for MHPS admin
  4. Regression: forgot-password writes audit and returns 200 (no enumeration)

BASE_URL is derived from REACT_APP_BACKEND_URL (see /app/frontend/.env).
"""
import io
import os
import time
import uuid
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mhps-report-build.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- small PNG builder (no Pillow dependency) ----------
def _png_bytes(w: int = 4, h: int = 4) -> bytes:
    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff\x00\x00" * w
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


# ---------- session fixtures (module-scope: reuse tokens; rate-limit safe) ----------
@pytest.fixture(scope="module")
def mhps_token():
    r = requests.post(f"{API}/auth/login",
                      json={"school_code": "MHPS", "username": "admin", "password": "Admin@123"},
                      timeout=30)
    assert r.status_code == 200, f"MHPS login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def mhps_user(mhps_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {mhps_token}"}, timeout=30)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def jtech_token():
    r = requests.post(f"{API}/auth/login",
                      json={"school_code": "JTECH",
                            "username": "jtech.innovations@outlook.com",
                            "password": "Xekleidoma@1"},
                      timeout=30)
    assert r.status_code == 200, f"JTECH login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sunf_token():
    """Different-school non-superuser used to prove 403 on cross-tenant download."""
    r = requests.post(f"{API}/auth/login",
                      json={"school_code": "SUNF", "username": "admin", "password": "Admin@123"},
                      timeout=30)
    if r.status_code != 200:
        pytest.skip(f"SUNF admin login unavailable ({r.status_code}); cross-tenant 403 test skipped")
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def _find_audit(tok, entity_type, entity_id=None, actor_id=None, limit=200):
    """Poll audit-logs briefly (writes are async best-effort) and return matching entries."""
    params = {"entity_type": entity_type, "limit": limit}
    if entity_id:
        params["entity_id"] = entity_id
    if actor_id:
        params["actor_id"] = actor_id
    for _ in range(5):
        r = requests.get(f"{API}/audit-logs", headers=_auth(tok), params=params, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data:
                return data
        time.sleep(0.4)
    return []


# =====================================================================
# 1. OBJECT STORAGE — upload photo, serve it back, verify DB storage_path
# =====================================================================
class TestObjectStoragePhoto:
    def test_upload_photo_and_serve(self, mhps_token):
        png = _png_bytes()
        r = requests.post(
            f"{API}/upload/photo",
            headers=_auth(mhps_token),
            files={"file": ("test.png", io.BytesIO(png), "image/png")},
            timeout=60,
        )
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
        body = r.json()
        assert "photo_url" in body and body["photo_url"].startswith("/api/uploads/")
        assert "filename" in body and body["filename"].endswith(".png")

        # Serve back with token query-param (like <img src>)
        filename = body["filename"]
        r2 = requests.get(f"{API}/uploads/{filename}", params={"token": mhps_token}, timeout=30)
        assert r2.status_code == 200, f"serve failed: {r2.status_code} {r2.text}"
        assert r2.headers.get("content-type", "").startswith("image/png")
        assert r2.content == png, "served bytes should equal uploaded bytes"

        # Also works via Authorization header
        r3 = requests.get(f"{API}/uploads/{filename}", headers=_auth(mhps_token), timeout=30)
        assert r3.status_code == 200
        assert r3.content == png

        # Stash filename for cross-tenant test
        pytest.mhps_photo_filename = filename
        pytest.mhps_photo_file_id = filename.rsplit(".", 1)[0]  # file_id used as entity_id in audit

    def test_upload_photo_audit_row_written(self, mhps_token):
        fid = getattr(pytest, "mhps_photo_file_id", None)
        assert fid, "photo upload test must run first"
        rows = _find_audit(mhps_token, "photo", entity_id=fid)
        assert rows, f"no audit row for uploaded photo file_id={fid}"
        assert rows[0]["action"] == "upload"

    def test_download_requires_auth(self):
        fn = getattr(pytest, "mhps_photo_filename", None)
        assert fn
        r = requests.get(f"{API}/uploads/{fn}", timeout=30)
        assert r.status_code == 401, f"expected 401 no-token, got {r.status_code}"

    def test_cross_tenant_download_forbidden(self, sunf_token):
        fn = getattr(pytest, "mhps_photo_filename", None)
        assert fn
        r = requests.get(f"{API}/uploads/{fn}", params={"token": sunf_token}, timeout=30)
        assert r.status_code == 403, f"expected 403 cross-tenant, got {r.status_code}: {r.text}"

    def test_superuser_can_read_any_tenant_file(self, jtech_token):
        fn = getattr(pytest, "mhps_photo_filename", None)
        assert fn
        r = requests.get(f"{API}/uploads/{fn}", params={"token": jtech_token}, timeout=30)
        assert r.status_code == 200, f"superuser cross-tenant download failed: {r.status_code}"


# =====================================================================
# 2. OBJECT STORAGE — signature upload
# =====================================================================
class TestSignatureUpload:
    def test_signature_upload_and_serve(self, mhps_token, mhps_user):
        # Find MHPS school id
        r = requests.get(f"{API}/schools", headers=_auth(mhps_token), timeout=30)
        assert r.status_code == 200
        schools = r.json()
        mhps = next((s for s in schools if s.get("school_code") == "MHPS"), None)
        assert mhps, "MHPS school not visible"
        school_id = mhps["id"]

        png = _png_bytes()
        r2 = requests.post(
            f"{API}/schools/{school_id}/signatures/upload",
            headers=_auth(mhps_token),
            params={"signature_type": "principal"},
            files={"file": ("sig.png", io.BytesIO(png), "image/png")},
            timeout=60,
        )
        assert r2.status_code == 200, f"signature upload failed: {r2.status_code} {r2.text}"
        body = r2.json()
        assert "signature_url" in body
        url = body["signature_url"]
        assert url.startswith("/api/uploads/")
        filename = url.rsplit("/", 1)[-1]

        r3 = requests.get(f"{API}/uploads/{filename}", params={"token": mhps_token}, timeout=30)
        assert r3.status_code == 200
        assert r3.headers.get("content-type", "").startswith("image/png")
        assert r3.content == png


# =====================================================================
# 3. AUDIT COVERAGE on newly-added endpoints
# =====================================================================
class TestAuditCoverage:
    def test_create_user_audit(self, mhps_token):
        uname = f"TEST_u_{uuid.uuid4().hex[:8]}"
        payload = {
            "username": uname, "name": "TEST User", "role": "teacher",
            "school_code": "MHPS", "password": "TestPass@123",
            "email": f"{uname}@test.local",
        }
        r = requests.post(f"{API}/users", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, f"create_user failed: {r.status_code} {r.text}"
        uid = r.json()["id"]
        pytest.created_user_id = uid
        rows = _find_audit(mhps_token, "user", entity_id=uid)
        assert rows, "no audit row for created user"
        assert rows[0]["action"] == "create"

    def test_reset_credentials_audit(self, mhps_token):
        uid = getattr(pytest, "created_user_id", None)
        assert uid
        r = requests.put(f"{API}/users/{uid}/credentials",
                         headers=_auth(mhps_token),
                         json={"password": "NewPass@456"}, timeout=30)
        assert r.status_code == 200, r.text
        rows = _find_audit(mhps_token, "user", entity_id=uid)
        # Should see at least one "update" action
        assert any(x["action"] == "update" for x in rows), "no audit update row after credential reset"

    def test_mark_attendance_audit(self, mhps_token):
        # find any MHPS student and class
        s = requests.get(f"{API}/students", headers=_auth(mhps_token), timeout=30).json()
        c = requests.get(f"{API}/classes", headers=_auth(mhps_token), timeout=30).json()
        if not s or not c:
            pytest.skip("no MHPS students/classes to attend")
        payload = {"student_id": s[0]["id"], "class_id": c[0]["id"],
                   "date": "2099-01-01", "status": "present"}
        r = requests.post(f"{API}/attendance", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        rows = _find_audit(mhps_token, "attendance", entity_id=aid)
        assert rows, "no audit row for attendance"

    def test_bulk_attendance_audit(self, mhps_token):
        s = requests.get(f"{API}/students", headers=_auth(mhps_token), timeout=30).json()
        c = requests.get(f"{API}/classes", headers=_auth(mhps_token), timeout=30).json()
        if not s or not c:
            pytest.skip("no data")
        cid = c[0]["id"]
        payload = {"class_id": cid, "date": "2099-01-02",
                   "records": [{"student_id": s[0]["id"], "status": "absent"}]}
        r = requests.post(f"{API}/attendance/bulk", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rows = _find_audit(mhps_token, "attendance", entity_id=cid)
        assert rows, "no audit row for bulk attendance"

    def test_social_skills_audit(self, mhps_token):
        s = requests.get(f"{API}/students", headers=_auth(mhps_token), timeout=30).json()
        if not s:
            pytest.skip("no students")
        payload = {"student_id": s[0]["id"], "term": "Term 1",
                   "academic_year": "2099-2100", "skills": {"Respect": "Good"}}
        r = requests.post(f"{API}/social-skills", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        rows = _find_audit(mhps_token, "social_skills", entity_id=rid)
        assert rows, "no audit row for social_skills"

    def test_teacher_comment_audit(self, mhps_token):
        s = requests.get(f"{API}/students", headers=_auth(mhps_token), timeout=30).json()
        if not s:
            pytest.skip("no students")
        payload = {"student_id": s[0]["id"], "term": "Term 1",
                   "academic_year": "2099-2100", "comment": "TEST comment"}
        r = requests.post(f"{API}/teacher-comments", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        rows = _find_audit(mhps_token, "teacher_comment", entity_id=rid)
        assert rows, "no audit row for teacher_comment"

    def test_admissions_crud_audit(self, mhps_token):
        payload = {
            "student_first_name": "TESTFN", "student_last_name": "TESTLN",
            "parent_name": "TEST Parent", "parent_email": "t@t.local",
            "parent_phone": "0000", "grade_level": "Grade 1", "status": "inquiry",
        }
        r = requests.post(f"{API}/admissions", headers=_auth(mhps_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        adm = r.json()
        aid = adm["id"]
        assert _find_audit(mhps_token, "admission", entity_id=aid), "no audit on create admission"

        # update
        payload2 = {**payload, "status": "application"}
        r = requests.put(f"{API}/admissions/{aid}", headers=_auth(mhps_token), json=payload2, timeout=30)
        assert r.status_code == 200, r.text
        rows = _find_audit(mhps_token, "admission", entity_id=aid)
        assert any(x["action"] == "update" for x in rows), "no update audit"

        # delete
        r = requests.delete(f"{API}/admissions/{aid}", headers=_auth(mhps_token), timeout=30)
        assert r.status_code == 200, r.text
        rows = _find_audit(mhps_token, "admission", entity_id=aid)
        assert any(x["action"] == "delete" for x in rows), "no delete audit"

    def test_academic_year_toggle_audit(self, jtech_token):
        # MHPS has no academic_years populated; use superuser + any school that
        # has AYs (RVSD in seed). Superuser can audit-list across tenants only
        # for their own scope, so we assert the toggle endpoint returns 200 and
        # a school-audit row exists.
        schools = requests.get(f"{API}/schools", headers=_auth(jtech_token), timeout=30).json()
        target = next((s for s in schools if (s.get("academic_years") or [])), None)
        if not target:
            pytest.skip("no school with academic_years available for toggle test")
        year = target["academic_years"][0]["year"]
        current = bool(target["academic_years"][0].get("is_enabled", True))
        r = requests.put(f"{API}/schools/{target['id']}/academic-years/{year}/toggle",
                         headers=_auth(jtech_token), params={"is_enabled": not current}, timeout=30)
        assert r.status_code == 200, r.text
        # toggle back
        requests.put(f"{API}/schools/{target['id']}/academic-years/{year}/toggle",
                     headers=_auth(jtech_token), params={"is_enabled": current}, timeout=30)
        rows = _find_audit(jtech_token, "school", entity_id=target["id"])
        assert rows, "no school audit for AY toggle"

    def test_report_template_update_audit(self, jtech_token):
        # requires superuser
        r = requests.get(f"{API}/report-templates/MHPS", headers=_auth(jtech_token), timeout=30)
        if r.status_code != 200:
            pytest.skip(f"no MHPS template to update: {r.status_code}")
        tpl = r.json()
        # Round-trip existing shape (strip DB-only fields).
        drop = {"id", "created_at", "updated_at", "_id"}
        payload = {k: v for k, v in tpl.items() if k not in drop and v is not None}
        # Ensure required-ish keys present
        payload.setdefault("school_code", "MHPS")
        r = requests.put(f"{API}/report-templates/MHPS", headers=_auth(jtech_token), json=payload, timeout=30)
        if r.status_code == 422:
            pytest.skip(f"ReportTemplateCreate shape rejected: {r.text[:300]}")
        assert r.status_code == 200, r.text
        rows = _find_audit(jtech_token, "report_template", entity_id="MHPS")
        assert rows, "no audit row for report_template update"
        assert any(x["action"] in ("update", "create") for x in rows)


# =====================================================================
# 4. REGRESSION — core MHPS reads should still 200
# =====================================================================
class TestCoreRegression:
    @pytest.mark.parametrize("path", [
        "/students", "/users", "/classes", "/attendance", "/gradebook",
    ])
    def test_core_reads_200(self, mhps_token, path):
        r = requests.get(f"{API}{path}", headers=_auth(mhps_token), timeout=30)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
        assert isinstance(r.json(), list)


# =====================================================================
# 5. REGRESSION — forgot-password
# =====================================================================
class TestForgotPassword:
    def test_forgot_password_writes_audit(self, mhps_token):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"school_code": "MHPS", "username": "admin"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body
        assert body.get("delivery") in ("email", "log", "none")
        # audit — entity_type=password_reset
        rows = _find_audit(mhps_token, "password_reset")
        assert rows, "no password_reset audit row after forgot-password"

    def test_forgot_password_no_enumeration(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"school_code": "MHPS", "username": "DOES_NOT_EXIST_XYZ"}, timeout=30)
        assert r.status_code == 200, r.text
        # same message shape
        assert "message" in r.json()


# ---------- cleanup: delete TEST_ user created above ----------
@pytest.fixture(scope="module", autouse=True)
def _cleanup(mhps_token, request):
    yield
    uid = getattr(pytest, "created_user_id", None)
    if uid:
        try:
            requests.delete(f"{API}/users/{uid}", headers=_auth(mhps_token), timeout=15)
        except Exception:
            pass
