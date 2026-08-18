const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.hgwdzzwddbpcthojvsxm',
  password: '*Qx276p8d&qhMvH',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function updateCards() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, name, "abilitiesText" FROM cards');
    
    for (const card of res.rows) {
      const text = card.abilitiesText ? card.abilitiesText.toLowerCase() : '';
      let abilitiesJson = [];
      
      if (text.includes('deal 2 damage')) {
        abilitiesJson = [{ type: 'DAMAGE', target: 'OPPONENT', amount: 2 }];
      } else if (text.includes('deal 3 damage')) {
        abilitiesJson = [{ type: 'DAMAGE', target: 'OPPONENT', amount: 3 }];
      } else if (text.includes('deal 4 damage')) {
        abilitiesJson = [{ type: 'DAMAGE', target: 'OPPONENT', amount: 4 }];
      } else if (text.includes('deal 1 damage, gain 2 shields')) {
        abilitiesJson = [
          { type: 'DAMAGE', target: 'OPPONENT', amount: 1 },
          { type: 'SHIELD', target: 'SELF', amount: 2 }
        ];
      }
      
      if (abilitiesJson.length > 0) {
        await client.query('UPDATE cards SET "abilitiesJson" = $1 WHERE id = $2', [JSON.stringify(abilitiesJson), card.id]);
        console.log(`Updated card ${card.name} (${card.id})`);
      }
    }
    console.log('Update complete.');
  } catch (err) {
    console.error('Error updating cards:', err);
  } finally {
    await client.end();
  }
}

updateCards();
