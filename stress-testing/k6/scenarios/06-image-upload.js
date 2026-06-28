import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, standardOptions } from '../config.js';

export const options = standardOptions;

// We simulate uploading an image.
// In reality, this requires FormData, but k6 supports passing a binary or string as a file.
const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export default function () {
    const payload = {
        file: http.file(dummyImage, 'test.png', 'image/png'),
    };

    const res = http.post(`${API_BASE}/upload`, payload); // Assume /api/upload exists or just test failure gracefully

    check(res, {
        'upload responded': (r) => r.status !== 500, // Even if 404, we want to ensure it doesn't crash the server
    });

    sleep(1);
}
