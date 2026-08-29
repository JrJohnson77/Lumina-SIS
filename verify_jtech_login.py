#!/usr/bin/env python3
"""Verify JTECH superuser login works"""

import requests

BASE_URL = "https://mhps-report-build.preview.emergentagent.com/api"

# Test JTECH superuser login
print("Testing JTECH superuser login...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "school_code": "JTECH",
        "username": "jtech.innovations@outlook.com",
        "password": "Xekleidoma@1"
    },
    timeout=10
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"✓ Login successful")
    print(f"  Token: {data['access_token'][:50]}...")
    print(f"  User: {data['user']['name']}")
    print(f"  Role: {data['user']['role']}")
else:
    print(f"✗ Login failed: {response.json()}")
