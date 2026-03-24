import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/telegram'

type DueReminderRequest = {
    reminder_id?: string
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json() as DueReminderRequest
        const { reminder_id } = body

        if (!reminder_id) {
            return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })
        }

        const { data: reminder, error } = await supabase
            .from('reminders')
            .select('reminder_id, title, description, remind_at, status')
            .eq('reminder_id', reminder_id)
            .eq('user_id', user.id)
            .single()

        if (error) throw error

        if (!reminder || (reminder.status !== 'pending' && reminder.status !== 'snoozed')) {
            return NextResponse.json({ success: true, skipped: true })
        }

        const result = await sendTelegramNotification(
            user.id,
            `🔔 Reminder due: ${reminder.title}`,
            `Scheduled for ${new Date(reminder.remind_at).toLocaleString()}${reminder.description ? ` - ${reminder.description}` : ''}`
        )

        return NextResponse.json({ success: true, sent: result.success })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
