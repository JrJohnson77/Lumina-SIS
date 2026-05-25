"""
Backend tests for the Lumina Default Report Card template + reset-default endpoint.
Covers:
  - build_default_template returns design_mode='lumina_default' + is_locked_default=True
  - POST /api/report-templates/{school}/reset-default for SUNF admin -> 200 with cleared canvas
  - Cross-tenant admin (RVSD admin -> SUNF) -> 403
  - Teacher -> 403
  - Audit log entry written (action=reset, entity_type=report_template, entity_id=SUNF)
  - PUT custom canvas template then GET returns design_mode='canvas'
"""
import os
import pytest
import requests

def _load_backend_url():
    url = os.environ.get('REACT_APP_BACKEND_URL', '').strip()
    if not url:
        try:
            with open('/app/frontend/.env') as fh:
                for line in fh:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip().strip('"')
                        break
        except FileNotFoundError:
            pass
    return url.rstrip('/')

BASE_URL = _load_backend_url()
assert BASE_URL, "REACT_APP_BACKEND_URL is required"

SUNF_ADMIN = {"school_code": "SUNF", "username": "admin", "password": "Admin@123"}
SUNF_TEACHER = {"school_code": "SUNF", "username": "sarah.thompson.sunf", "password": "Teacher@123"}
RVSD_ADMIN = {"school_code": "RVSD", "username": "admin", "password": "Admin@123"}
JTECH_SUPER = {"school_code": "JTECH", "username": "jtech.innovations@outlook.com", "password": "Xekleidoma@1"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['username']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sunf_admin_headers():
    return {"Authorization": f"Bearer {_login(SUNF_ADMIN)}"}


@pytest.fixture(scope="module")
def sunf_teacher_headers():
    return {"Authorization": f"Bearer {_login(SUNF_TEACHER)}"}


@pytest.fixture(scope="module")
def rvsd_admin_headers():
    return {"Authorization": f"Bearer {_login(RVSD_ADMIN)}"}


@pytest.fixture(scope="module")
def super_headers():
    return {"Authorization": f"Bearer {_login(JTECH_SUPER)}"}


# ---------- default template structure ----------
class TestDefaultTemplate:
    def test_get_template_returns_lumina_default_keys(self, sunf_admin_headers):
        r = requests.get(f"{BASE_URL}/api/report-templates/SUNF", headers=sunf_admin_headers)
        assert r.status_code == 200, r.text
        t = r.json()
        # The agent-to-agent note says SUNF already reset to default
        assert t.get("design_mode") == "lumina_default", f"design_mode={t.get('design_mode')}"
        assert t.get("is_locked_default") is True, f"is_locked_default={t.get('is_locked_default')}"


# ---------- reset-default endpoint ----------
class TestResetDefaultEndpoint:
    def test_admin_can_reset_default(self, sunf_admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/report-templates/SUNF/reset-default",
            headers=sunf_admin_headers,
        )
        assert r.status_code == 200, r.text
        t = r.json()
        assert t.get("design_mode") == "lumina_default"
        assert t.get("canvas_elements") == []
        assert t.get("is_locked_default") is True

    def test_teacher_cannot_reset_default(self, sunf_teacher_headers):
        r = requests.post(
            f"{BASE_URL}/api/report-templates/SUNF/reset-default",
            headers=sunf_teacher_headers,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"

    def test_cross_tenant_admin_forbidden(self, rvsd_admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/report-templates/SUNF/reset-default",
            headers=rvsd_admin_headers,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"

    def test_superuser_can_reset_any(self, super_headers):
        r = requests.post(
            f"{BASE_URL}/api/report-templates/SUNF/reset-default",
            headers=super_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("design_mode") == "lumina_default"


# ---------- audit log ----------
class TestAuditLog:
    def test_reset_writes_audit_log(self, sunf_admin_headers):
        # Trigger reset
        r = requests.post(
            f"{BASE_URL}/api/report-templates/SUNF/reset-default",
            headers=sunf_admin_headers,
        )
        assert r.status_code == 200, r.text
        # Fetch audit logs filtered by entity_type
        r2 = requests.get(
            f"{BASE_URL}/api/audit-logs",
            params={"entity_type": "report_template"},
            headers=sunf_admin_headers,
        )
        assert r2.status_code == 200, r2.text
        logs = r2.json()
        # Expect at least one reset row for SUNF
        matching = [
            l for l in logs
            if l.get("action") == "reset" and l.get("entity_type") == "report_template"
            and (l.get("entity_id") or "").upper() == "SUNF"
        ]
        assert len(matching) >= 1, f"no audit log row found; sample: {logs[:3]}"


# ---------- custom canvas -> design_mode='canvas' ----------
class TestCanvasOverride:
    def test_put_canvas_then_get_returns_canvas_mode(self, super_headers, sunf_admin_headers):
        # First reset so we have a clean baseline
        requests.post(f"{BASE_URL}/api/report-templates/SUNF/reset-default", headers=sunf_admin_headers)

        # Now PUT a custom canvas template (PUT requires superuser per current contract)
        get_r = requests.get(f"{BASE_URL}/api/report-templates/SUNF", headers=super_headers)
        assert get_r.status_code == 200
        base = get_r.json()

        # Build a minimal canvas update preserving required keys
        payload = {
            "school_code": "SUNF",
            "school_name": base.get("school_name", "Sunflower Academy"),
            "school_motto": base.get("school_motto", ""),
            "logo_url": base.get("logo_url", ""),
            "header_text": "TEST_CANVAS_HEADER",
            "sub_header_text": base.get("sub_header_text", ""),
            "subjects": base.get("subjects", []),
            "grade_scale": base.get("grade_scale", []),
            "use_weighted_grading": base.get("use_weighted_grading", False),
            "assessment_weights": base.get("assessment_weights", {}),
            "sections": base.get("sections", {}),
            "social_skills_categories": base.get("social_skills_categories", []),
            "skill_ratings": base.get("skill_ratings", []),
            "achievement_standards": base.get("achievement_standards", []),
            "paper_size": base.get("paper_size", "legal"),
            "design_mode": "canvas",
            "canvas_elements": [{"type": "text", "x": 10, "y": 10, "text": "TEST"}],
            "blocks": [],
        }
        put_r = requests.put(
            f"{BASE_URL}/api/report-templates/SUNF",
            json=payload,
            headers=super_headers,
        )
        assert put_r.status_code == 200, put_r.text
        # GET should now report canvas mode with the elements
        verify = requests.get(f"{BASE_URL}/api/report-templates/SUNF", headers=sunf_admin_headers)
        assert verify.status_code == 200
        body = verify.json()
        assert body.get("design_mode") == "canvas", f"design_mode={body.get('design_mode')}"
        assert len(body.get("canvas_elements") or []) >= 1

        # Cleanup: reset back to default
        requests.post(f"{BASE_URL}/api/report-templates/SUNF/reset-default", headers=sunf_admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
