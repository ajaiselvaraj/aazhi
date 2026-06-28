import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

// Standard connection config for BullMQ
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

// Initialize the Complaint Queue
export const complaintQueue = new Queue('complaint-queue', { connection });

// Initialize the Worker to process complaints asynchronously
export const complaintWorker = new Worker('complaint-queue', async (job) => {
    const { data } = job;
    console.log(`[Queue] Processing complaint creation for user ${data.userId}`);
    
    try {
        // Here we would insert the complaint into PostgreSQL.
        // For demonstration of Phase 1 architecture, this simulates the async save operation.
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, trackingId: job.id };
    } catch (err) {
        console.error(`[Queue] DB Error processing job ${job.id}:`, err);
        throw err;
    }
}, { connection });

complaintWorker.on('completed', (job, returnvalue) => {
    console.log(`[Queue] Complaint job ${job.id} completed successfully.`);
});

complaintWorker.on('failed', (job, err) => {
    console.error(`[Queue] Complaint job ${job.id} failed: ${err.message}`);
});
