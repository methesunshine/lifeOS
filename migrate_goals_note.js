const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    try {
        // Add note column to goals
        await client.query(`ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';`);
        // Add note column to subtasks? No, user just said "in goal after established goal we forget to add something import to learn so make it so we can add any how"
        console.log('Migration complete: added note to goals table');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
