import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

async function runMigration() {
    console.log('Starting migration to drop daily_logs unique constraint...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL not found.');
        process.exit(1);
    }

    const client = new pg.Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Drop the unique constraint user_id, date.
        await client.query(`
      ALTER TABLE public.daily_logs
      DROP CONSTRAINT IF EXISTS daily_logs_user_id_date_key;
    `);

        console.log('Successfully dropped unique constraint daily_logs_user_id_date_key from daily_logs.');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
