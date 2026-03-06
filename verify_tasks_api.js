import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verifyTaskApiLogic() {
    console.log('--- Verifying Task List API Logic ---');

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.log('Error fetching users:', userError); return;
    }
    const testUserId = users[0].id;
    console.log(`Using user ID: ${testUserId}`);

    const todayStr = new Date().toLocaleDateString('en-CA');

    // 1. Create a task (simulating our frontend fix with due_date)
    console.log('\n[1] Creating test task...');
    const { data: task, error: errCreate } = await supabase
        .from('tasks')
        .insert([{
            user_id: testUserId,
            title: 'Test Verification Task',
            status: 'Pending',
            priority: 'Medium',
            due_date: todayStr
        }]).select().single();

    if (errCreate) {
        console.error('Failed to create task:', errCreate); return;
    }
    console.log('Task created successfully:', task.task_id);
    console.log('Task created_at timestamp check:', task.created_at);

    // 2. Fetch today's tasks to ensure it appears
    console.log('\n[2] Fetching tasks for today...');
    const { data: tasks, error: errFetch } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', testUserId)
        .eq('due_date', todayStr);

    if (errFetch) {
        console.error('Failed to fetch tasks:', errFetch); return;
    }
    const foundTask = tasks.find(t => t.task_id === task.task_id);
    if (foundTask) {
        console.log('Successfully retrieved test task from the list.');
    } else {
        console.error('Test task is missing from the retrieved list!');
    }

    // 3. Delete the task
    console.log('\n[3] Deleting test task...');
    const { error: errDel } = await supabase
        .from('tasks')
        .delete()
        .eq('task_id', task.task_id);

    if (errDel) {
        console.error('Failed to delete task:', errDel);
    } else {
        console.log('Successfully deleted the task.');
    }

    console.log('\nVerification Complete.');
}

verifyTaskApiLogic();
