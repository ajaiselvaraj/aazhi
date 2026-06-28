import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, highLoadOptions, generateRandomString, getRandomElement } from '../config.js';

export const options = highLoadOptions;

export default function () {
    // 1. Write - Create Complaint
    const payload = JSON.stringify({
        department: getRandomElement(["Electricity", "Water", "Gas", "Municipal"]),
        category: "DB Stress Test",
        description: `High load database stress test string: ${generateRandomString(50)}`,
        location: "K6 Area",
        citizen_id: "9eb3f201-174d-48e9-a061-b88093fe58dc"
    });

    const postParams = { headers: { 'Content-Type': 'application/json' } };
    const createRes = http.post(`${API_BASE}/complaints/debug`, payload, postParams);

    let ticket = null;
    if (createRes.status === 201) {
        ticket = createRes.json('data.ticket_number');
    }

    // 2. Read - Fetch just created complaint
    if (ticket) {
        const trackRes = http.get(`${API_BASE}/complaints/track/${ticket}`);
        check(trackRes, {
            'DB Write-Read consistent': (r) => r.status === 200,
        });
    }

    sleep(0.5);
}
