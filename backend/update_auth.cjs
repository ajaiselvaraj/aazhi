const fs = require('fs');
let content = fs.readFileSync('c:/project/AAZHI/aazhi/backend/controllers/auth.controller.js', 'utf8');

content = content.replace(
/if \(accountResult\.rows\.length === 0\) \{[\s\S]*?const citizen = accountResult\.rows\[0\];/m,
`if (accountResult.rows.length === 0) {
            logger.info("[Auth Controller] Using mock demo user for " + consumerId);
            const demoCitizenId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
            accountResult = await pool.query("SELECT * FROM citizens WHERE id = $1", [demoCitizenId]);
            
            if (accountResult.rows.length === 0) {
                accountResult = await pool.query("SELECT * FROM citizens LIMIT 1");
            }
            if (accountResult.rows.length === 0) {
                return fail(res, "Invalid Consumer ID. No citizen linked.", 404);
            }
        }

        const citizen = accountResult.rows[0];`
);

fs.writeFileSync('c:/project/AAZHI/aazhi/backend/controllers/auth.controller.js', content, 'utf8');
console.log('Modified auth.controller.js');
