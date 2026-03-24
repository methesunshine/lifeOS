import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-logger';

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

        const {
            telegram_bot_token,
            telegram_chat_id,
            notifications_enabled
        } = await request.json();

        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                telegram_bot_token,
                telegram_chat_id,
                notifications_enabled,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Activity Log
        await logActivity({
            userId: user.id,
            area: 'Settings',
            action: 'System Settings Updated',
            detail: 'You updated your Telegram notification bot credentials.',
            icon: '⚙️',
            reference_id: user.id
        });

        return NextResponse.json({ profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

