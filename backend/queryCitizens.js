import { pool } from "./config/db.js";
import jwt from "jsonwebtoken";

async function run() {
    try {
        const res = await pool.query("SELECT id, name, mobile, role FROM citizens WHERE role = 'admin' OR role = 'staff' LIMIT 5");
        console.log("Admins/Staff in Database:");
        console.log(res.rows);

        if (res.rows.length > 0) {
            const admin = res.rows[0];
            const token = jwt.sign(
                {
                    id: admin.id,
                    role: admin.role,
                    name: admin.name,
                    mobile: admin.mobile,
                    department: "Electricity" // let's hardcode one for testing
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            console.log("\nGenerated JWT Token for Admin:", token);
        } else {
            console.log("No admins found!");
        }
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

run();
