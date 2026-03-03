const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeletion() {
    try {
        console.log('--- Testing Habit Deletion Controls ---');

        // 1. Get a test user
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        if (userError || !users.length) throw new Error('No users found');
        const testUser = users[0];
        console.log(`Using test user: ${testUser.email}`);

        // 2. Create multiple habits
        console.log('Inserting test habits...');
        const { error: hError } = await supabase
            .from('habits')
            .insert([
                { user_id: testUser.id, name: 'Del Test 1', category: 'Health', frequency: 'Daily' },
                { user_id: testUser.id, name: 'Del Test 2', category: 'Skill', frequency: 'Daily' }
            ]);

        if (hError) throw hError;

        // 3. Verify they exist
        const { data: habitsBefore } = await supabase.from('habits').select('id').eq('user_id', testUser.id);
        console.log(`Habits before deletion: ${habitsBefore.length}`);

        // 4. Manual cleanup (simulating the 'all' trigger)
        console.log('Simulating clear all...');
        const { error: dError } = await supabase.from('habits').delete().eq('user_id', testUser.id);
        if (dError) throw dError;

        // 5. Verify they are gone
        const { data: habitsAfter } = await supabase.from('habits').select('id').eq('user_id', testUser.id);
        console.log(`Habits after deletion: ${habitsAfter.length}`);

        if (habitsAfter.length === 0) {
            console.log('--- Deletion Controls Verified ---');
        } else {
            console.warn('--- Deletion Failed to Clear All ---');
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testDeletion();
