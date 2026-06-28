import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

export default function () {
    const payload = JSON.stringify({
        aadhaarNumber: "123456789012"
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${API_BASE}/auth/mock-aadhaar`, payload, params);

    check(res, {
        'login successful': (r) => r.status === 200,
        'has access token': (r) => r.json('data.tokens.accessToken') !== undefined,
    });

    sleep(1);
}
