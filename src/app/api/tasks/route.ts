import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateProductivityScore } from '@/lib/scoreCalculator'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const note_id = searchParams.get('note_id')
        const status = searchParams.get('status')
        const priority = searchParams.get('priority')
        const today = searchParams.get('today')

        let query = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true })
            .order('priority', { ascending: false })

        if (note_id) {
            query = query.eq('note_id', note_id)
        }
        if (status) {
            query = query.eq('status', status)
        }
        if (priority) {
            query = query.eq('priority', priority)
        }
        if (today === 'true') {
            const todayStr = new Date().toLocaleDateString('en-CA')
            query = query.eq('due_date', todayStr)
        }

        const { data: tasks, error } = await query

        if (error) throw error
        return NextResponse.json(tasks)
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
        const { title, due_date, priority } = body

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                user_id: user.id,
                title,
                due_date,
                priority: priority || 'Medium',
                status: 'Pending'
            }])
            .select().single()

        if (error) throw error

        await calculateProductivityScore(supabase, user.id)

        // Persistent Activity Log
        await logActivity({
            area: 'Journey',
            action: 'Task Created',
            detail: `✅ ${title}\n❗ Priority: ${priority || 'Medium'}${due_date ? `\n📅 Due: ${new Date(due_date).toLocaleDateString()}` : ''}`,
            icon: '✅',
            reference_id: data.task_id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true, task: data })
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
        const { task_id, status, ...updates } = body

        if (!task_id) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
        }

        const updatePayload: any = { ...updates }
        if (status) {
            updatePayload.status = status
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(updatePayload)
            .eq('task_id', task_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error

        await calculateProductivityScore(supabase, user.id)

        // Persistent Activity Log
        if (status) {
            // Persistent Activity Log
            await logActivity({
                area: 'Journey',
                action: 'Task Updated',
                detail: `🔄 ${data.title}\n📍 Status: ${status}`,
                icon: '✅',
                reference_id: data.task_id.toString(),
                userId: user.id
            });
        }

        return NextResponse.json({ success: true, task: data })
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
                .from('tasks')
                .select('task_id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await calculateProductivityScore(supabase, user.id)
            return NextResponse.json({ success: true, message: 'All tasks deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

        const { data: taskToDelete, error: fetchError } = await supabase
            .from('tasks')
            .select('title, status')
            .eq('task_id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('task_id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculateProductivityScore(supabase, user.id)

        await logActivity({
            area: 'Journey',
            action: 'Task Deleted',
            detail: `🗑️ Removed task: "${taskToDelete.title}" (Status: ${taskToDelete.status})`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
