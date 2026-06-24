import urllib.request
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Step 1: Login
login_data = json.dumps({
    'adminId': 'ADM-2024-001',
    'password': 'admin',
    'department': 'Electricity Department'
}).encode()

req = urllib.request.Request(
    'http://localhost:5000/api/auth/admin-login',
    data=login_data,
    headers={'Content-Type': 'application/json'}
)
resp = json.loads(urllib.request.urlopen(req).read())
token = resp['data']['tokens']['accessToken']
print(f"OK Login successful. Token: {token[:30]}...")

# Step 2: Test each endpoint
endpoints = [
    '/admin/dashboard',
    '/admin/complaints',
    '/admin/analytics/complaints',
    '/admin/duplicate-clusters',
    '/admin/fraud-signals',
]

for ep in endpoints:
    url = f'http://localhost:5000/api{ep}'
    try:
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        resp = urllib.request.urlopen(req)
        data = resp.read().decode()[:200]
        print(f"OK {ep} -> {resp.status}: {data}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"FAIL {ep} -> {e.code}: {body}")
