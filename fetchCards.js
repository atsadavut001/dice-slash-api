const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.hgwdzzwddbpcthojvsxm',
  password: '*Qx276p8d&qhMvH',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function fetchCards() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, name, "abilitiesText", "abilitiesJson" FROM cards');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error fetching cards:', err);
  } finally {
    await client.end();
  }
}

fetchCards();
