const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Update habits table
        console.log('Updating habits table...');
        await client.query(`
            ALTER TABLE public.habits 
            ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Custom',
            ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Daily',
            ADD COLUMN IF NOT EXISTS scheduled_days TEXT[] DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS preferred_time TEXT DEFAULT 'Morning',
            ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'Medium',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

            -- Update constraints if possible
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_category_check') THEN
                    ALTER TABLE public.habits ADD CONSTRAINT habits_category_check 
                    CHECK (category IN ('Health', 'Skill', 'Mind', 'Finance', 'Social', 'Custom'));
                END IF;

                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_frequency_check') THEN
                    ALTER TABLE public.habits ADD CONSTRAINT habits_frequency_check 
                    CHECK (frequency IN ('Daily', 'Weekly', 'Custom days'));
                END IF;

                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_difficulty_level_check') THEN
                    ALTER TABLE public.habits ADD CONSTRAINT habits_difficulty_level_check 
                    CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard'));
                END IF;
            END $$;
        `);

        // 2. Update habit_logs table
        console.log('Updating habit_logs table...');
        await client.query(`
            ALTER TABLE public.habit_logs 
            ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS note TEXT,
            ADD COLUMN IF NOT EXISTS completion_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        `);

        console.log('Habit System 3.0 Migration Successful!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
