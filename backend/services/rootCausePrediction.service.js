import axios from "axios";
import logger from "../utils/logger.js";

// Mapping of simplified terms to standard database department values
const DEPARTMENT_MAPPING = {
    'water': 'Water',
    'water supply': 'Water',
    'water board': 'Water',
    'electricity': 'Electricity',
    'electricity board': 'Electricity',
    'power': 'Electricity',
    'gas': 'Gas',
    'gas authority': 'Gas',
    'roads': 'Roads',
    'road': 'Roads',
    'road department': 'Roads',
    'municipal': 'Municipal',
    'municipal engineering': 'Municipal',
    'waste': 'Waste Management',
    'drainage': 'Municipal'
};

/**
 * Predicts the root cause of an infrastructure cluster
 * @param {Array} complaints - Array of complaints in the cluster
 * @returns {Promise<Object>} - Predicted root cause, confidence, and affected departments
 */
export const predictRootCause = async (complaints) => {
    if (!complaints || complaints.length === 0) {
        return {
            predictedRootCause: "Unknown Incident",
            confidence: 50,
            affectedDepartments: []
        };
    }

    const uniqueComplaintDepts = [...new Set(complaints.map(c => c.department).filter(Boolean))];

    // Try to call Gemini API if key is available
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (geminiKey && !geminiKey.includes("YOUR")) {
        try {
            logger.info(`🧠 [CCI Root Cause] Triggering Gemini AI prediction for ${complaints.length} complaints...`);
            
            const complaintsTextList = complaints.map((c, i) => 
                `[Complaint ${i + 1}] Ticket: ${c.ticket_number}, Subject: ${c.subject}, Department: ${c.department}, Description: ${c.description}, Ward: ${c.ward}`
            ).join("\n\n");

            const prompt = `You are a municipal infrastructure recovery intelligence engine.
We have grouped multiple overlapping citizen complaints into a single cluster representing a shared civic root-cause event.
Please analyze the subjects, descriptions, and departments of these complaints to determine:
1. The most likely single root cause category/event (e.g. "Water Main Pipeline Burst", "Utility Excavation Cable Damage", "Road Excavation Pressure Drop", "Stormwater Drainage Blockage"). Keep it short and descriptive.
2. A confidence score between 0 and 100.
3. The departments that need coordination (e.g. "Water", "Electricity", "Roads", "Gas", "Municipal").

Complaints list:
${complaintsTextList}

Output ONLY a raw JSON object with this exact structure:
{
  "predictedRootCause": "Water Pipeline Failure",
  "confidence": 92,
  "affectedDepartments": ["Water", "Roads", "Electricity"]
}`;

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                },
                { timeout: 10000 }
            );

            const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (responseText) {
                const parsed = JSON.parse(responseText.trim());
                if (parsed.predictedRootCause && Array.isArray(parsed.affectedDepartments)) {
                    // Normalize departments to match our system
                    const normalizedDepts = parsed.affectedDepartments.map(d => {
                        const low = d.toLowerCase().trim();
                        return DEPARTMENT_MAPPING[low] || d;
                    });
                    
                    return {
                        predictedRootCause: parsed.predictedRootCause,
                        confidence: parsed.confidence || 80,
                        affectedDepartments: [...new Set([...normalizedDepts, ...uniqueComplaintDepts])]
                    };
                }
            }
        } catch (err) {
            logger.warn(`⚠️ [CCI Root Cause] Gemini AI service error, using local fallback: ${err.message}`);
        }
    }

    // Heuristic Fallback Engine
    logger.info(`⚙️ [CCI Root Cause] Running local rule-based heuristic prediction...`);
    const fullText = complaints.map(c => `${c.subject} ${c.description}`).join(" ").toLowerCase();

    let rootCause = "Coordinated Civic Recovery Event";
    let confidence = 75;
    const affected = new Set(uniqueComplaintDepts);

    // Heuristic logic based on keywords
    if (fullText.includes("water") || fullText.includes("pipe") || fullText.includes("leak") || fullText.includes("burst")) {
        if (fullText.includes("road") || fullText.includes("pothole") || fullText.includes("excavation") || fullText.includes("dig")) {
            rootCause = "Water Pipeline Burst with Road Erosion";
            confidence = 88;
            affected.add("Water");
            affected.add("Roads");
        } else {
            rootCause = "Water Supply Main Pipeline failure";
            confidence = 92;
            affected.add("Water");
        }
    } else if (fullText.includes("electricity") || fullText.includes("power") || fullText.includes("wire") || fullText.includes("cable") || fullText.includes("outage") || fullText.includes("spark")) {
        if (fullText.includes("road") || fullText.includes("excavation") || fullText.includes("dig") || fullText.includes("trench")) {
            rootCause = "Road Construction Cable Damage";
            confidence = 85;
            affected.add("Electricity");
            affected.add("Roads");
        } else {
            rootCause = "Power Distribution Grid Outage";
            confidence = 90;
            affected.add("Electricity");
        }
    } else if (fullText.includes("gas") || fullText.includes("pressure") || fullText.includes("cylinder") || fullText.includes("leak")) {
        if (fullText.includes("dig") || fullText.includes("excavation") || fullText.includes("road")) {
            rootCause = "Utility Excavation Gas Pipe Damage";
            confidence = 85;
            affected.add("Gas");
            affected.add("Roads");
        } else {
            rootCause = "Gas Pipeline Pressure Instability";
            confidence = 90;
            affected.add("Gas");
        }
    } else if (fullText.includes("road") || fullText.includes("pothole") || fullText.includes("crater") || fullText.includes("dig")) {
        rootCause = "Major Roadway Damage and Potholes";
        confidence = 80;
        affected.add("Roads");
    }

    return {
        predictedRootCause: rootCause,
        confidence: confidence,
        affectedDepartments: [...affected]
    };
};
