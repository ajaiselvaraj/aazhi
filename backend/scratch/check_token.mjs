import fetch from 'node-fetch';

const res = await fetch('http://localhost:5000/api/auth/admin-login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({adminId: 'integrity_admin', password: 'integrity_pass', department: 'Integrity Office'})
});

const data = await res.json();
console.log('Full login response:', JSON.stringify(data, null, 2));

const token = data.data?.tokens?.accessToken;
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log('\nTOKEN PAYLOAD:', JSON.stringify(payload, null, 2));
}
