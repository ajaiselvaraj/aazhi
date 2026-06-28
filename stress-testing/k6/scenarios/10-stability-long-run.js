import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE } from '../config.js';

export const options = {
    stages: [
        { duration: '5m', target: 50 }, // Ramp up
        { duration: '30m', target: 50 }, // Sustained load for 30 minutes
        { duration: '5m', target: 0 },  // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    // Basic ping to ensure system is alive and no memory leaks are degrading performance
    const res = http.get(`${API_BASE}/admin/dashboard`, {
        headers: { 'User-Agent': 'K6-Stability-Test' }
    });

    // In a real scenario, this would loop through multiple endpoints
    // to simulate standard varied user behavior over 30-60 minutes.
    check(res, {
        'status is ok or unauthorized': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    });

    sleep(3);
}
