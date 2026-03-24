import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find pending reminders that are overdue
        const now = new Date().toISOString();
        const { data: overdueReminders, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .lt('remind_at', now);

        if (error) throw error;

        if (!overdueReminders || overdueReminders.length === 0) {
            return NextResponse.json({ success: true, message: 'No overdue reminders found.' });
        }

        // Send notifications for overdue items (limit to 3 to avoid spamming for now)
        let sentCount = 0;
        for (const rem of overdueReminders.slice(0, 3)) {
            const result = await sendTelegramNotification(
                user.id,
                `⚠️ Overdue: ${rem.title}`,
                `This reminder was set for ${new Date(rem.remind_at).toLocaleString()}. Check your dashboard for details.`
            );
            if (result.success) sentCount++;
        }

        return NextResponse.json({ 
            success: true, 
            message: `System check complete. Sent ${sentCount} notifications for overdue reminders.` 
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
