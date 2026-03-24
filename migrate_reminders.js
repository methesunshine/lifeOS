import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

async function migrateReminders() {
    console.log('Starting Reminder System Database Migration...');

    // Connect directly to the Postgres database to run DDL commands
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        // Add new columns to the reminders table
        console.log('Adding new columns (status, completed_at, category, priority, recurrence)...');
        await client.query(`
            ALTER TABLE public.reminders 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal',
            ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
            ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';
        `);

        // Check if `is_completed` exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='reminders' and column_name='is_completed';
        `);

        if (res.rows.length > 0) {
            console.log('Migrating existing boolean completion data to new text status...');
            await client.query(`
                UPDATE public.reminders 
                SET status = 'completed', completed_at = now() 
                WHERE is_completed = true;
            `);

            console.log('Dropping legacy is_completed column...');
            await client.query(`
                ALTER TABLE public.reminders 
                DROP COLUMN IF EXISTS is_completed;
            `);
        } else {
            console.log('Legacy is_completed column not found. Skipping data migration for it.');
        }

        // Rebuild constraints so the snoozed flow is supported and the script stays idempotent.
        await client.query(`
            ALTER TABLE public.reminders 
            DROP CONSTRAINT IF EXISTS check_reminder_status,
            DROP CONSTRAINT IF EXISTS check_reminder_priority,
            DROP CONSTRAINT IF EXISTS check_reminder_recurrence;
        `);

        await client.query(`
            ALTER TABLE public.reminders 
            ADD CONSTRAINT check_reminder_status CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled')),
            ADD CONSTRAINT check_reminder_priority CHECK (priority IN ('low', 'medium', 'high')),
            ADD CONSTRAINT check_reminder_recurrence CHECK (recurrence IN ('none', 'daily', 'weekly'));
        `);

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.end();
        console.log('Disconnected from database.');
    }
}

migrateReminders();
