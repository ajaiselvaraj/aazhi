const ServiceRequest = require('../models/serviceRequest.model');
const stringSimilarity = require('string-similarity');

// The similarity score required to consider two items a duplicate.
const DUPLICATE_THRESHOLD = 0.70;

/**
 * Normalizes text for comparison by lowercasing, removing punctuation,
 * and collapsing extra whitespace.
 */
const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
};

/**
 * Scans recent service requests to find and cluster duplicates.
 * NOTE: This performs a N^2 comparison and can be slow on large datasets.
 * For a production environment, this logic should be moved to a scheduled background job.
 */
exports.getDuplicateClusters = async (req, res) => {
    try {
        // Fetch recent, unresolved complaints to scan for duplicates.
        const recentRequests = await ServiceRequest.find({
            status: { $in: ['submitted', 'pending', 'acknowledged', 'in_progress'] }
        }).sort({ createdAt: -1 }).limit(200); // Limit to 200 to prevent performance issues.

        const clusters = [];
        const clusteredIds = new Set();

        for (let i = 0; i < recentRequests.length; i++) {
            if (clusteredIds.has(recentRequests[i].id)) {
                continue;
            }

            const masterRequest = recentRequests[i];
            const currentCluster = {
                master: masterRequest,
                duplicates: []
            };

            const normalizedTextA = normalizeText(masterRequest.description);

            for (let j = i + 1; j < recentRequests.length; j++) {
                const potentialDuplicate = recentRequests[j];
                if (clusteredIds.has(potentialDuplicate.id)) {
                    continue;
                }

                // Optional: Don't compare across different departments if they are already classified.
                if (masterRequest.department && potentialDuplicate.department && masterRequest.department !== potentialDuplicate.department) {
                    continue;
                }

                const normalizedTextB = normalizeText(potentialDuplicate.description);
                const similarity = stringSimilarity.compareTwoStrings(normalizedTextA, normalizedTextB);

                if (similarity >= DUPLICATE_THRESHOLD) {
                    currentCluster.duplicates.push(potentialDuplicate);
                    clusteredIds.add(potentialDuplicate.id);
                }
            }

            // Only create a cluster if duplicates were found.
            if (currentCluster.duplicates.length > 0) {
                clusteredIds.add(masterRequest.id);
                clusters.push(currentCluster);
            }
        }

        // Format the clusters into the structure the frontend expects.
        const formattedClusters = clusters.map((cluster, index) => ({
            id: `C-${100 + index}`,
            title: cluster.master.category || 'Similar Issue Cluster',
            ward: cluster.master.ward || 'Multiple Wards',
            status: 'Under Review', // In a real app, this status would be managed in the DB.
            reportCount: cluster.duplicates.length + 1,
            masterTicket: cluster.master.ticket_number,
            dept: cluster.master.department || 'Unassigned',
            timeAgo: 'Recently' // A library like date-fns could make this dynamic.
        }));

        res.status(200).json({
            success: true,
            data: formattedClusters
        });

    } catch (error) {
        console.error("Error finding duplicate clusters:", error);
        res.status(500).json({ success: false, message: "Server error while processing duplicates." });
    }
};