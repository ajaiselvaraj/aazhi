import { Queue, Worker } from 'bullmq';
import { getBullRedisClient, isRedisEnabled } from '../config/redisClient.js';
import logger from '../utils/logger.js';

let complaintQueue = null;
let complaintWorker = null;

if (isRedisEnabled()) {
    const connection = getBullRedisClient('client');
    // Initialize the Complaint Queue
    complaintQueue = new Queue('complaint-queue', { connection });

    // Initialize the Worker to process complaints asynchronously
    complaintWorker = new Worker('complaint-queue', async (job) => {
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
        logger.info(`[Queue] Complaint job ${job.id} completed successfully.`);
    });

    complaintWorker.on('failed', (job, err) => {
        logger.error(`[Queue] Complaint job ${job.id} failed: ${err.message}`);
    });
} else {
    logger.info("[Queue] Redis disabled, BullMQ workers not started.");
}

export { complaintQueue, complaintWorker };
