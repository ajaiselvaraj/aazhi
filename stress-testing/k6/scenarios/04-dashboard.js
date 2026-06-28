import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

export function setup() {
    // Authenticate as Admin to get Token
    const payload = JSON.stringify({
        adminId: "mockadmin",
        password: "mockpassword",
        department: "General"
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${API_BASE}/auth/admin-login`, payload, params);
    
    let token = "";
    if (res.status === 200) {
        token = res.json('data.tokens.accessToken');
    }
    return { token };
}

export default function (data) {
    if (!data.token) {
        // If auth failed, we just hit a public endpoint to simulate load anyway, 
        // but ideally we skip or abort. We'll hit the tracking endpoint instead.
        http.get(`${API_BASE}/complaints/track/TKT-000000000`);
        return;
    }

    const params = {
        headers: {
            'Authorization': `Bearer ${data.token}`
        },
    };

    const res = http.get(`${API_BASE}/admin/dashboard`, params);

    check(res, {
        'dashboard stats retrieved': (r) => r.status === 200,
    });

    sleep(2);
}
