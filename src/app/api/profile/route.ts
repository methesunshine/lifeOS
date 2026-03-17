import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/pushbullet';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is code for no rows found
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profile: profile || null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pushbullet_token, notifications_enabled } = await request.json();

        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                pushbullet_token,
                notifications_enabled,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Pushbullet Notification
        await sendPushNotification(user.id, '⚙️ Profile Updated', 'Your notification and profile settings have been updated.');

        return NextResponse.json({ profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

