const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function setup() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const createTableSql = `
            CREATE TABLE IF NOT EXISTS public.system_activity_logs (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
                area TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT,
                icon TEXT,
                reference_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            ALTER TABLE public.system_activity_logs ENABLE ROW LEVEL SECURITY;

            -- Check if policy exists before creating
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'system_activity_logs' 
                    AND policyname = 'Users can only access their own activity logs'
                ) THEN
                    CREATE POLICY "Users can only access their own activity logs" 
                    ON public.system_activity_logs FOR ALL USING (auth.uid() = user_id);
                END IF;
            END
            $$;
        `;

        await client.query(createTableSql);
        console.log('system_activity_logs table created or already exists.');

    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        await client.end();
    }
}

setup();
