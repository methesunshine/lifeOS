
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function updateSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    console.log('Adding telegram_bot_token and telegram_chat_id to profiles...');
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
      ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
    `);

    console.log('✅ Schema updated successfully.');
  } catch (err) {
    console.error('❌ Failed to update schema:', err);
  } finally {
    await client.end();
  }
}

updateSchema();
