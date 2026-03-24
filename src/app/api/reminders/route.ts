import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logActivity, ActivityArea } from '@/lib/activity-logger'

type ReminderRecord = {
    reminder_id?: string
    remind_at: string
    title: string
    description?: string
    category?: string
    priority?: string
    recurrence?: string
}

async function notifyReminderAction(
    userId: string,
    reminder: any,
    action: 'created' | 'updated' | 'completed' | 'snoozed' | 'cancelled' | 'reopened' | 'deleted' | 'bulk_deleted'
) {
    const title = reminder?.title || 'Reminder'
    const reminderId = reminder?.reminder_id

    // Persistent Activity Logging
    const area: ActivityArea = 'Reminders'
    let logAction = ''
    let logDetail = ''
    let logIcon = ''

    switch (action) {
        case 'created':
            logAction = 'Reminder Created'
            logDetail = `📅 ${title}\n🏷️ Category: ${reminder.category || 'personal'}\n❗ Priority: ${reminder.priority || 'medium'}`
            logIcon = '📅'
            break
        case 'completed':
            logAction = 'Reminder Completed'
            logDetail = `✅ Finished: ${title}\n🏷️ Category: ${reminder.category || 'personal'}`
            logIcon = '✅'
            break
        case 'snoozed':
            logAction = 'Reminder Snoozed'
            logDetail = `⏳ ${title}\n⏰ Snoozed until ${new Date(reminder.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            logIcon = '⏳'
            break
        case 'cancelled':
            logAction = 'Reminder Cancelled'
            logDetail = `❌ Dismissed: ${title}`
            logIcon = '❌'
            break
        case 'reopened':
            logAction = 'Reminder Reopened'
            logDetail = `🔄 Active: ${title}`
            logIcon = '🔄'
            break
        case 'updated':
            logAction = 'Reminder Updated'
            logDetail = `📝 Changes saved for ${title}\n🏷️ Category: ${reminder.category || 'personal'}`
            logIcon = '📝'
            break
        case 'deleted':
            logAction = 'Reminder Deleted'
            logDetail = `🗑️ Removed: ${title}`
            logIcon = '🗑️'
            break
        case 'bulk_deleted':
            logAction = 'Reminders Reset'
            logDetail = `🗑️ ${reminder?.body || 'Multiple reminders were removed.'}`
            logIcon = '🗑️'
            break
    }

    if (logAction) {
        await logActivity({
            area,
            action: logAction,
            detail: logDetail,
            icon: logIcon,
            reference_id: reminderId,
            userId: userId
        })
    }
}

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
            query = query.in('status', ['pending', 'snoozed'])
        }

        if (!filter) {
            query = query.eq('status', 'pending')
        }

        const { data: reminders, error } = await query

        if (error) throw error
        return NextResponse.json(reminders)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json() as ReminderRecord
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
            .select()
            .single()

        if (error) throw error

        await notifyReminderAction(user.id, data, 'created')

        return NextResponse.json({ success: true, reminder: data })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json() as ({ reminder_id?: string; status?: string } & Partial<ReminderRecord>)
        const { reminder_id, ...updates } = body

        if (!reminder_id) {
            return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })
        }

        const updatePayload: ({ completed_at?: string | null } & Partial<ReminderRecord> & { status?: string }) = { ...updates }
        if (updates.status) {
            if (updates.status === 'completed') {
                updatePayload.completed_at = new Date().toISOString()
            } else if (updates.status === 'pending' || updates.status === 'snoozed' || updates.status === 'cancelled') {
                updatePayload.completed_at = null
            }
        }

        const { data, error } = await supabase
            .from('reminders')
            .update(updatePayload)
            .eq('reminder_id', reminder_id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        if (data) {
            if (updates.status === 'completed') {
                await notifyReminderAction(user.id, data, 'completed')
            } else if (updates.status === 'snoozed') {
                await notifyReminderAction(user.id, data, 'snoozed')
            } else if (updates.status === 'cancelled') {
                await notifyReminderAction(user.id, data, 'cancelled')
            } else if (updates.status === 'pending') {
                await notifyReminderAction(user.id, data, 'reopened')
            } else if (updates.remind_at || updates.title || updates.description || updates.category || updates.priority || updates.recurrence) {
                await notifyReminderAction(user.id, data, 'updated')
            }
        }

        return NextResponse.json({ success: true, reminder: data })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
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
        const filter = searchParams.get('filter')

        if (deleteAll) {
            let countQuery = supabase
                .from('reminders')
                .select('reminder_id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            let query = supabase
                .from('reminders')
                .delete()
                .eq('user_id', user.id)

            if (filter === 'pending') {
                countQuery = countQuery.in('status', ['pending', 'snoozed'])
                query = query.in('status', ['pending', 'snoozed'])
            } else if (filter === 'completed') {
                countQuery = countQuery.eq('status', 'completed')
                query = query.eq('status', 'completed')
            }

            const { count, error: countError } = await countQuery
            if (countError) throw countError

            const { error } = await query
            if (error) throw error

            const message =
                filter === 'pending'
                    ? 'Pending reminders deleted'
                    : filter === 'completed'
                        ? 'Completed reminders deleted'
                        : 'All reminders deleted'

            await notifyReminderAction(user.id, {
                body: `${count || 0} reminders were removed from ${filter || 'all'} reminders.`
            }, 'bulk_deleted')

            return NextResponse.json({ success: true, message })
        }

        if (!id) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })

        const { data: reminderToDelete, error: fetchError } = await supabase
            .from('reminders')
            .select('title')
            .eq('reminder_id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('reminder_id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await notifyReminderAction(user.id, reminderToDelete, 'deleted')

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
