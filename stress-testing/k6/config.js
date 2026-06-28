export const API_BASE = __ENV.API_BASE_URL || 'http://localhost:5000/api';

export const thresholds = {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],                 // less than 1% of requests can fail
};

export const standardOptions = {
    stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
    ],
    thresholds: thresholds,
};

export const highLoadOptions = {
    stages: [
        { duration: '1m', target: 250 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 0 },
    ],
    thresholds: thresholds,
};

export const spikeOptions = {
    stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
    ],
    thresholds: thresholds,
};

export function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
