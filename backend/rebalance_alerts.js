import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'suvidha',
  password: 'password',
  port: 5432,
});

async function run() {
  try {
    await pool.query('DELETE FROM alerts;');
    
    // 5 Local Alerts
    const alerts = [
      { title: 'Monsoon Health & Sanitation Camp', message: 'Free health checkups and sanitation kits will be provided in Ward 4. Ensure you participate to stay safe during the monsoon.', type: 'Health', is_notice: false, severity: 'Info', priority: 2 },
      { title: 'Transformer Blowout', message: 'Power outage expected in East Sector due to transformer blowout. Maintenance team is on site.', type: 'Power', is_notice: false, severity: 'Critical', priority: 1 },
      { title: 'Water Pipe Burst', message: 'Main supply pipe burst at MG Road. Water supply will be disrupted for the next 6 hours.', type: 'Water', is_notice: false, severity: 'High', priority: 1 },
      { title: 'Road Blocked', message: 'Main arterial road blocked due to fallen tree. Please use alternative routes.', type: 'Road', is_notice: false, severity: 'High', priority: 1 },
      { title: 'Sanitation Delay', message: 'Garbage collection delayed by 2 hours in North Ward due to vehicle breakdown.', type: 'Civic', is_notice: false, severity: 'Medium', priority: 3 }
    ];

    // 7 Public Notices
    const notices = [
      { title: 'Water Connection Amnesty Scheme', message: 'Regularize your illegal water connections without penalties before the end of the month. Visit the municipal office for details.', type: 'Tax', is_notice: true, severity: 'Info', priority: 2 },
      { title: 'Smart Electricity Meter Installation', message: 'Mandatory smart meter installation will commence next week. Authorized personnel will visit your homes.', type: 'Event', is_notice: true, severity: 'Info', priority: 2 },
      { title: 'Waste Segregation Awareness Drive', message: 'Join us at the Central Park for a workshop on effective waste segregation at the source.', type: 'Health', is_notice: true, severity: 'Info', priority: 3 },
      { title: 'Property Tax Final Due Date', message: 'Last date to pay property tax for the current financial year without late fee is October 15, 2026.', type: 'Tax', is_notice: true, severity: 'High', priority: 1 },
      { title: 'Municipal Recruitment Drive', message: 'Applications open for various technical and administrative posts in the Municipal Corporation.', type: 'Jobs', is_notice: true, severity: 'Info', priority: 3 },
      { title: 'Townhall Meeting - Ward 4', message: 'Monthly townhall meeting to discuss civic issues with the local councilor. All residents are invited.', type: 'Event', is_notice: true, severity: 'Info', priority: 2 },
      { title: 'Dengue Awareness Campaign', message: 'Special fogging and dengue prevention campaign to be held this weekend. Prevent water stagnation.', type: 'Health', is_notice: true, severity: 'High', priority: 1 }
    ];

    const allData = [...alerts, ...notices];

    let inserted = 0;
    for (const item of allData) {
      await pool.query(
        `INSERT INTO alerts (title, message, type, severity, priority, is_active, ward, is_notice, start_date, expires_at)
         VALUES ($1, $2, $3, $4, $5, true, 'Global', $6, NOW(), NOW() + INTERVAL '30 days')`,
        [item.title, item.message, item.type, item.severity, item.priority, item.is_notice]
      );
      inserted++;
    }

    console.log(`✅ Seeded ${inserted} records (${alerts.length} alerts, ${notices.length} notices) into the 'alerts' table.`);
  } catch (e) {
    console.error('Error seeding DB:', e);
  } finally {
    pool.end();
  }
}

run();
