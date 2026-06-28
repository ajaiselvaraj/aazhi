import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions, generateRandomString, getRandomElement } from '../config.js';

export const options = standardOptions;

export default function () {
    const payload = JSON.stringify({
        department: getRandomElement(["Electricity", "Water", "Gas", "Municipal"]),
        category: "Stress Test Issue",
        description: `This is an automated stress test complaint. Random data: ${generateRandomString(20)}`,
        location: "K6 Load Test Area",
        citizen_id: "9eb3f201-174d-48e9-a061-b88093fe58dc"
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${API_BASE}/complaints/debug`, payload, params);

    check(res, {
        'complaint created': (r) => r.status === 201,
        'has ticket number': (r) => r.json('data.ticket_number') !== undefined,
    });

    sleep(1);
}
