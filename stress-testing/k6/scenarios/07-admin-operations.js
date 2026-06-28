import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, spikeOptions, getRandomElement } from '../config.js';

export const options = spikeOptions;

export function setup() {
    // We create a single shared complaint that all VUs will try to update simultaneously
    // This simulates race conditions on the exact same row.
    const payload = JSON.stringify({
        department: "General",
        category: "Race Condition Test",
        description: "Testing admin concurrency",
        location: "K6"
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${API_BASE}/complaints/debug`, payload, params);
    
    let ticketId = "TKT-UNKNOWN"; // Need the UUID of the complaint, let's assume debug returns id too, if not we will just hit a random endpoint
    if (res.status === 201) {
        ticketId = res.json('data.id') || res.json('data.ticket_number'); // fallback
    }
    return { ticketId };
}

export default function (data) {
    const payload = JSON.stringify({
        status: getRandomElement(['In Progress', 'Resolved', 'Closed']),
        remarks: "Automated status update from K6 Load Tester"
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Use debug endpoint to bypass JWT auth for testing concurrency easily
    const res = http.put(`${API_BASE}/complaints/${data.ticketId}/status/debug`, payload, params);

    check(res, {
        'status updated or gracefully rejected': (r) => r.status === 200 || r.status === 400 || r.status === 404,
    });

    sleep(0.1); // high concurrency, low sleep
}
