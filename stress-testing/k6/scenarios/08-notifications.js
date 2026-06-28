import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

export default function () {
    // Random 10-digit phone number
    const mobile = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    const payload = JSON.stringify({
        mobile: mobile
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Hitting send-otp simulates pushing to the notification queue (SMS in this case)
    const res = http.post(`${API_BASE}/auth/send-otp`, payload, params);

    check(res, {
        'otp sent or rate limited gracefully': (r) => r.status === 200 || r.status === 429,
    });

    sleep(1);
}
