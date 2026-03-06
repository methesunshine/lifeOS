import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Since we are running outside the browser, we'll bypass Next.js API auth (which expects cookies)
// and directly use the Supabase client to simulate the API actions, just to verify DB rules and logic.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// We need a user ID for testing. Let's get the first user in the system.
async function verifyApiLogic() {
    console.log('--- Verifying Daily Logs Multiple Entries & Deletion ---');

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.log('Error fetching users for test:', userError);
        return;
    }
    const testUserId = users[0].id;
    console.log(`Using test user ID: ${testUserId}`);

    const today = new Date().toLocaleDateString('en-CA');

    // 1. Create first entry
    console.log('\n[1] Creating first entry...');
    const { data: entry1, error: err1 } = await supabase
        .from('daily_logs')
        .insert([{
            user_id: testUserId,
            date: today,
            mood: 8,
            summary: 'First test entry',
            wins: 'Woke up',
            lessons: 'None'
        }]).select().single();

    if (err1) {
        console.error('Failed to create first entry:', err1);
        return;
    }
    console.log('First entry created successfully:', entry1.log_id);

    // 2. Create second entry on the same day (should succeed since we dropped UNIQUE constraint)
    console.log('\n[2] Creating second entry on the same day...');
    const { data: entry2, error: err2 } = await supabase
        .from('daily_logs')
        .insert([{
            user_id: testUserId,
            date: today,
            mood: 5,
            summary: 'Second test entry',
            wins: 'Ate lunch',
            lessons: 'Eat slower'
        }]).select().single();

    if (err2) {
        console.error('Failed to create second entry (Constraint might still be active?):', err2);
        return;
    }
    console.log('Second entry created successfully:', entry2.log_id);

    // 3. Edit (PATCH) the second entry
    console.log('\n[3] Editing second entry...');
    const { data: updatedEntry2, error: errEdit } = await supabase
        .from('daily_logs')
        .update({ mood: 9, summary: 'Edited second test entry' })
        .eq('log_id', entry2.log_id)
        .select().single();

    if (errEdit) {
        console.error('Failed to edit entry:', errEdit);
    } else {
        console.log('Successfully edited entry. New mood:', updatedEntry2.mood);
    }

    // 4. Delete the first entry
    console.log('\n[4] Deleting first entry...');
    const { error: errDel } = await supabase
        .from('daily_logs')
        .delete()
        .eq('log_id', entry1.log_id);

    if (errDel) {
        console.error('Failed to delete entry:', errDel);
    } else {
        console.log('Successfully deleted the first entry.');
    }

    // Cleanup test entries to keep DB clean
    console.log('\n[5] Cleaning up...');
    await supabase.from('daily_logs').delete().eq('summary', 'Edited second test entry');
    console.log('Verification Complete.');
}

verifyApiLogic();
