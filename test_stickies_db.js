require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStickies() {
    const { data, error } = await supabase.from('sticky_notes').select('sticky_id, content, color');
    if (error) {
        console.error('Error fetching stickies:', error);
        return;
    }
    console.log('Current Stickies:', data);
}

checkStickies();
