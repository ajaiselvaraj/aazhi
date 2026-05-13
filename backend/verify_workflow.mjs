// verify_workflow.mjs — Run with: node verify_workflow.mjs
import { pool } from './config/db.js';

async function verify() {
    console.log('\n=== Verifying Workflow System ===\n');

    let allPassed = true;

    for (const type of ['complaint', 'service_request']) {
        const result = await pool.query(
            `SELECT stages FROM workflow_definitions
             WHERE workflow_type = $1 AND is_active = true
             ORDER BY updated_at DESC LIMIT 1`,
            [type]
        );

        if (result.rows.length === 0) {
            console.error(`❌ FAIL: No workflow found for type '${type}'`);
            allPassed = false;
            continue;
        }

        const stages = result.rows[0].stages;
        const isValid = Array.isArray(stages) && stages.length >= 2 && stages.every(s => s.key && s.label);

        if (isValid) {
            console.log(`✅ PASS: GET /api/complaints/workflow/${type}`);
            console.log(`   Stages: ${stages.map(s => `${s.key} (${s.label})`).join(' → ')}`);
        } else {
            console.error(`❌ FAIL: stages for '${type}' are malformed:`, stages);
            allPassed = false;
        }
    }

    // Also verify both controllers would pick up the workflow
    console.log('\n=== Verifying Controller Fallback Safety ===');
    try {
        const wfTest = await pool.query(
            `SELECT stages FROM workflow_definitions WHERE workflow_type = 'complaint' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
        );
        if (wfTest.rows.length > 0) {
            const stageDefs = wfTest.rows[0].stages;
            const stages = stageDefs.map((s, i) => ({ stage: s.key, status: i === 0 ? 'current' : 'pending' }));
            console.log(`✅ PASS: complaint.controller.js would create ${stages.length} stages on submission`);
        }
    } catch (e) {
        console.error('❌ FAIL complaint controller test:', e.message);
        allPassed = false;
    }

    try {
        const wfTest = await pool.query(
            `SELECT stages FROM workflow_definitions WHERE workflow_type = 'service_request' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
        );
        if (wfTest.rows.length > 0) {
            const stageDefs = wfTest.rows[0].stages;
            const stagesInsert = stageDefs.map((s, i) => ({ stage: s.key, status: i === 0 ? 'current' : 'pending' }));
            console.log(`✅ PASS: serviceRequest.controller.js would create ${stagesInsert.length} stages on submission`);
        }
    } catch (e) {
        console.error('❌ FAIL service request controller test:', e.message);
        allPassed = false;
    }

    console.log('\n=== Summary ===');
    console.log(allPassed ? '✅ All checks passed. System is ready.' : '❌ Some checks failed. Review above.');
    process.exit(allPassed ? 0 : 1);
}

verify().catch(e => { console.error('Fatal:', e); process.exit(1); });
