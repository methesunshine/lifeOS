import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, body } = await request.json();

        if (!title || !body) {
            return NextResponse.json({ error: 'Title and body are required.' }, { status: 400 });
        }

        const result = await sendTelegramNotification(user.id, title, body);
        return NextResponse.json({ sent: result.success });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
