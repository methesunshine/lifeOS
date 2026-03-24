import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const date = searchParams.get('date')
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        let query = supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (date) {
            query = query.eq('date', date)
        } else if (start && end) {
            query = query.gte('date', start).lte('date', end)
        }

        const { data: logs, error } = await query

        if (error) throw error
        return NextResponse.json(logs)
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
        const { date, mood, summary, wins, lessons } = body

        const { data, error } = await supabase
            .from('daily_logs')
            .insert([{
                user_id: user.id,
                date: date || new Date().toLocaleDateString('en-CA'),
                mood: mood || null,
                summary: summary || '',
                wins: wins || '',
                lessons: lessons || '',
                created_at: new Date().toISOString()
            }])
            .select().single()

        if (error) throw error

        // Persistent Activity Log
        await logActivity({
            area: 'Journey',
            action: 'Daily Reflection Saved',
            detail: `Mood: ${mood || 'N/A'}${summary ? `\n📝 ${summary}` : ''}${wins ? `\n🏆 Wins: ${wins}` : ''}${lessons ? `\n💡 Lessons: ${lessons}` : ''}`,
            icon: '📔',
            reference_id: data.log_id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true, log: data })
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
        const { log_id, ...updates } = body

        if (!log_id) {
            return NextResponse.json({ error: 'Log ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('daily_logs')
            .update(updates)
            .eq('log_id', log_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error

        // Persistent Activity Log
        await logActivity({
            area: 'Journey',
            action: 'Daily Reflection Updated',
            detail: `Refined entry for ${data.date}`,
            icon: '📔',
            reference_id: data.log_id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true, log: data })
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
            const { count, error: countError } = await supabase
                .from('daily_logs')
                .select('log_id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('daily_logs')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await logActivity({
                area: 'Journey',
                action: 'Daily Logs Cleared',
                detail: `All ${count || 0} reflections were removed from history.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true, message: 'All logs deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Log ID required' }, { status: 400 })

        const { data: logToDelete, error: fetchError } = await supabase
            .from('daily_logs')
            .select('date')
            .eq('log_id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('daily_logs')
            .delete()
            .eq('log_id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await logActivity({
            area: 'Journey',
            action: 'Daily Reflection Deleted',
            detail: `Removed entry from ${new Date(logToDelete.date).toLocaleDateString()}`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
