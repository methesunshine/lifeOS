import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/pushbullet'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter')

        let query = supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('remind_at', { ascending: true })

        if (filter === 'completed') {
            query = query.eq('status', 'completed')
        } else if (filter === 'pending') {
            query = query.eq('status', 'pending')
        }
        // If filter === 'all', we don't apply any status constraint, returning both.

        // Handling dynamic date filters requires filtering on the client for exact "overdue" vs "upcoming" 
        // OR executing complex postgrest operations. For now, we will fetch 'pending' and let the client explicitly filter
        // overdue/upcoming based on exact local time comparisons since timezone matters.
        // We will just return pending by default if no filter is provided, or completed if requested.

        if (!filter) {
            query = query.eq('status', 'pending')
        }

        const { data: reminders, error } = await query

        if (error) throw error
        return NextResponse.json(reminders)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { title, description, remind_at, category, priority, recurrence } = body

        const { data, error } = await supabase
            .from('reminders')
            .insert([{
                user_id: user.id,
                title,
                description: description || '',
                remind_at,
                category: category || 'personal',
                priority: priority || 'medium',
                recurrence: recurrence || 'none',
                status: 'pending'
            }])
            .select().single()

        if (error) throw error

        // Pushbullet Integration
        await sendPushNotification(
            user.id,
            `📅 New Reminder: ${title}`,
            `Set for ${new Date(remind_at).toLocaleString()}`
        );

        return NextResponse.json({ success: true, reminder: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { reminder_id, ...updates } = body

        if (!reminder_id) {
            return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })
        }

        const updatePayload: any = { ...updates }
        if (updates.status) {
            if (updates.status === 'completed') {
                updatePayload.completed_at = new Date().toISOString()
            } else if (updates.status === 'pending') {
                updatePayload.completed_at = null
            }
        }

        const { data, error } = await supabase
            .from('reminders')
            .update(updatePayload)
            .eq('reminder_id', reminder_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error

        // Pushbullet Integration for completed reminders
        if (updates.status === 'completed' && data) {
            await sendPushNotification(
                user.id,
                `✅ Reminder Completed: ${data.title}`,
                `Finished at ${new Date().toLocaleString()}`
            );
        }

        return NextResponse.json({ success: true, reminder: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const deleteAll = searchParams.get('all') === 'true'

        if (deleteAll) {
            const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error
            return NextResponse.json({ success: true, message: 'All reminders deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('reminder_id', id)
            .eq('user_id', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
