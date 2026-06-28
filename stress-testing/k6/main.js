import login from './scenarios/01-login.js';
import complaintSubmission from './scenarios/02-complaint-submission.js';
import complaintTracking from './scenarios/03-complaint-tracking.js';
import dashboard from './scenarios/04-dashboard.js';
import aiChat from './scenarios/05-ai-chat.js';
import imageUpload from './scenarios/06-image-upload.js';
import adminOps from './scenarios/07-admin-operations.js';
import notifications from './scenarios/08-notifications.js';
import databaseHeavy from './scenarios/09-database-heavy.js';

// Define overall options that combine load
export const options = {
    scenarios: {
        login: { executor: 'constant-vus', vus: 20, duration: '1m', exec: 'loginTest' },
        submission: { executor: 'constant-vus', vus: 30, duration: '1m', exec: 'submissionTest' },
        tracking: { executor: 'constant-vus', vus: 50, duration: '1m', exec: 'trackingTest' },
        ai: { executor: 'constant-vus', vus: 10, duration: '1m', exec: 'aiTest' },
        db_heavy: { executor: 'constant-vus', vus: 40, duration: '1m', exec: 'dbTest' },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.05'],
    }
};

export function loginTest() { login(); }
export function submissionTest() { complaintSubmission(); }
export function trackingTest() { 
    // Need dummy data since setup() doesn't pass across imports gracefully without extra plumbing
    complaintTracking({ ticketNumber: 'TKT-000000000' }); 
}
export function aiTest() { aiChat(); }
export function dbTest() { databaseHeavy(); }
