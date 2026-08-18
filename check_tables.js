const { Client } = require('pg');
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.hgwdzzwddbpcthojvsxm',
  password: '*Qx276p8d&qhMvH',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    const tables = res.rows.map(r => r.table_name);
    console.log(JSON.stringify(tables));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
