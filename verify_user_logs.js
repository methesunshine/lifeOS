const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const { data: users, error: userError } = await supabase.from('profiles').select('user_id, email').limit(10);
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  console.log('Users:', users);

  const { data: logs, error: logsError } = await supabase.from('system_activity_logs').select('*').limit(5);
  if (logsError) {
    console.error('Error fetching logs:', logsError);
    return;
  }
  console.log('Logs:', logs);
}

checkUser();
