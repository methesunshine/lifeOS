const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Add weekly_target column if it doesn't exist
        await client.query(`
            ALTER TABLE public.habits 
            ADD COLUMN IF NOT EXISTS weekly_target INTEGER DEFAULT 7;
        `);

        console.log('Migration successful: weekly_target column added.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
