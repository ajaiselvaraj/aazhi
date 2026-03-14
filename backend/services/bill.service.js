// ═══════════════════════════════════════════════════════════════
// Bill Service — Business Logic Layer
// Bill creation, status management, overdue detection
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { generateBillNumber } from "../utils/helpers.js";

export const createBill = async (billData) => {
    const {
        account_id, citizen_id, service_type, amount,
        tax_amount = 0, units_consumed, reading_current,
        reading_previous, billing_month, billing_year,
        billing_cycle, due_date,
    } = billData;

    const billNumber = generateBillNumber(service_type);
    const totalAmount = parseFloat(amount) + parseFloat(tax_amount);

    const result = await pool.query(
        `INSERT INTO bills 
         (account_id, citizen_id, service_type, bill_number, amount, tax_amount, total_amount,
          units_consumed, reading_current, reading_previous, billing_month, billing_year, billing_cycle, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [account_id, citizen_id, service_type, billNumber, amount, tax_amount, totalAmount,
         units_consumed || null, reading_current || null, reading_previous || null,
         billing_month || null, billing_year || null, billing_cycle || null, due_date]
    );

    return result.rows[0];
};

export const markOverdueBills = async () => {
    const result = await pool.query(
        `UPDATE bills SET status = 'overdue', updated_at = NOW()
         WHERE status = 'pending' AND due_date < NOW()
         RETURNING id`
    );
    return result.rows.length;
};

export const getBillSummary = async (citizenId) => {
    const result = await pool.query(
        `SELECT 
            service_type,
            COUNT(*) as total_bills,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'paid') as paid,
            COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
            COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'overdue')), 0) as outstanding
         FROM bills WHERE citizen_id = $1
         GROUP BY service_type`,
        [citizenId]
    );
    return result.rows;
};
