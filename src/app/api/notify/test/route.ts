import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/pushbullet';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const success = await sendPushNotification(
            user.id,
            '🛡️ LifeOS Connection Test',
            'All systems operational. Your Pushbullet integration is successfully linked to your LifeOS profile.'
        );

        if (success) {
            return NextResponse.json({ success: true, message: 'Test notification sent!' });
        } else {
            return NextResponse.json({ error: 'Failed to send notification. Please check your token and preferences.' }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
