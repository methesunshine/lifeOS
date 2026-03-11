require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function updateConstraints() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // Note: we don't know the exact constraint names, so we can find them dynamically and drop them:
        // Or we can just drop constraints on mood, stress_level, focus_level
        const getConstraintsQuery = `
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'public.mental_health'::regclass
            AND contype = 'c';
        `;
        const res = await client.query(getConstraintsQuery);
        const constraints = res.rows.map(r => r.conname);

        console.log('Found constraints:', constraints);
        for (const c of constraints) {
            if (c.includes('mood') || c.includes('stress') || c.includes('focus')) {
                await client.query(`ALTER TABLE public.mental_health DROP CONSTRAINT "${c}";`);
                console.log(`Dropped constraint ${c}`);
            }
        }

        // Add the new constraints
        await client.query(`ALTER TABLE public.mental_health ADD CONSTRAINT mental_health_mood_check CHECK (mood >= 0 AND mood <= 10);`);
        await client.query(`ALTER TABLE public.mental_health ADD CONSTRAINT mental_health_stress_level_check CHECK (stress_level >= 0 AND stress_level <= 10);`);
        await client.query(`ALTER TABLE public.mental_health ADD CONSTRAINT mental_health_focus_level_check CHECK (focus_level >= 0 AND focus_level <= 10);`);

        console.log('Added new constraints with >= 0');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

updateConstraints();
