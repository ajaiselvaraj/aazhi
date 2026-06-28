import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

export default function () {
    const payload = JSON.stringify({
        query: "How do I pay my electricity bill?"
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '10s' // Enforce a strict timeout to test graceful degradation
    };

    const res = http.post(`${API_BASE}/ai/gemini`, payload, params);

    check(res, {
        'AI responded or gracefully handled': (r) => r.status === 200 || r.status === 503,
    });

    sleep(1);
}
