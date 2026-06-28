import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

export function setup() {
    // Create a complaint to track
    const payload = JSON.stringify({
        department: "Electricity",
        category: "Test Issue",
        description: "Test description for tracking",
        location: "K6 Area"
    });

    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${API_BASE}/complaints/debug`, payload, params);
    
    let ticketNumber = "TKT-UNKNOWN";
    if (res.status === 201) {
        ticketNumber = res.json('data.ticket_number');
    }
    return { ticketNumber };
}

export default function (data) {
    const res = http.get(`${API_BASE}/complaints/track/${data.ticketNumber}`);

    check(res, {
        'tracking successful': (r) => r.status === 200,
        'has correct ticket': (r) => r.json('data.ticket_number') === data.ticketNumber,
    });

    sleep(1);
}
