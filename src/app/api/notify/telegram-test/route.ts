
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

        const result = await sendTelegramNotification(
            user.id,
            '✈️ LifeOS Telegram Test',
            'All systems operational. Your Telegram Bot is successfully linked to your LifeOS profile and will now provide unlimited real-time project alerts.'
        );

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Telegram test message sent!' });
        } else {
            return NextResponse.json({ error: result.error || 'Telegram test failed. Please check your Bot Token and Chat ID.' }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
