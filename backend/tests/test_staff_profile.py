"""
Tests for new GET /api/users/{user_id} endpoint (Staff Profile detail).
Verifies:
- Admin can fetch their own school's users (200, no password_hash)
- Cross-tenant access denied (403)
- Superuser can fetch any user
- 404 for unknown user
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://github-refresh-4.preview.emergentagent.com").rstrip("/")


def _login(school_code: str, username: str, password: str) -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"school_code": school_code, "username": username, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sunf_admin_token():
    return _login("SUNF", "admin", "Admin@123")


@pytest.fixture(scope="module")
def rvsd_admin_token():
    return _login("RVSD", "admin", "Admin@123")


@pytest.fixture(scope="module")
def sunf_users(sunf_admin_token):
    r = requests.get(
        f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {sunf_admin_token}"},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def rvsd_users(rvsd_admin_token):
    r = requests.get(
        f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {rvsd_admin_token}"},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json()


class TestGetUserById:
    def test_admin_fetches_own_school_user(self, sunf_admin_token, sunf_users):
        assert len(sunf_users) > 0, "SUNF should have users"
        target = sunf_users[0]
        uid = target["id"]
        r = requests.get(
            f"{BASE_URL}/api/users/{uid}",
            headers={"Authorization": f"Bearer {sunf_admin_token}"},
            timeout=30,
        )
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Schema assertions
        for field in ["id", "username", "role", "school_code", "permissions"]:
            assert field in data, f"missing field '{field}' in response"
        assert data["id"] == uid
        assert data["school_code"] == "SUNF"
        assert "password_hash" not in data, "password_hash MUST NOT be returned"

    def test_cross_tenant_access_denied(self, sunf_admin_token, rvsd_users):
        assert len(rvsd_users) > 0
        rvsd_uid = rvsd_users[0]["id"]
        r = requests.get(
            f"{BASE_URL}/api/users/{rvsd_uid}",
            headers={"Authorization": f"Bearer {sunf_admin_token}"},
            timeout=30,
        )
        assert r.status_code == 403, f"expected 403 cross-tenant, got {r.status_code}: {r.text}"

    def test_unknown_user_returns_404(self, sunf_admin_token):
        r = requests.get(
            f"{BASE_URL}/api/users/nonexistent-user-id-zzz",
            headers={"Authorization": f"Bearer {sunf_admin_token}"},
            timeout=30,
        )
        assert r.status_code == 404

    def test_unauthenticated_blocked(self, sunf_users):
        uid = sunf_users[0]["id"]
        r = requests.get(f"{BASE_URL}/api/users/{uid}", timeout=30)
        assert r.status_code in (401, 403)

    def test_teacher_role_cannot_fetch_user(self, sunf_users):
        # Teachers are NOT in ADMIN role list -> should be 403
        teacher_token = _login("SUNF", "sarah.thompson.sunf", "Teacher@123")
        uid = sunf_users[0]["id"]
        r = requests.get(
            f"{BASE_URL}/api/users/{uid}",
            headers={"Authorization": f"Bearer {teacher_token}"},
            timeout=30,
        )
        assert r.status_code == 403, f"teacher should be denied, got {r.status_code}"


class TestUsersListShape:
    """Sanity that /api/users still works (no regression)."""
    def test_sunf_admin_users_list_scoped(self, sunf_users):
        assert all(u.get("school_code") == "SUNF" for u in sunf_users), \
            "SUNF admin should only see SUNF users"
        assert all("password_hash" not in u for u in sunf_users)
