import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateGoalsScore } from '@/lib/scoreCalculator'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch goals with their subtasks
        const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select(`
                *,
                subtasks (*)
            `)
            .order('created_at', { ascending: false })

        if (goalsError) throw goalsError

        return NextResponse.json(goals)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { title, deadline, priority, subtasks, created_at, goal_id, subtask_title } = body

        // Handle adding a single subtask to an existing goal
        if (goal_id && subtask_title) {
            const { data: newSubtask, error } = await supabase
                .from('subtasks')
                .insert([{
                    goal_id,
                    user_id: user.id,
                    title: subtask_title,
                    is_completed: false
                }])
                .select()
                .single()

            if (error) throw error

            // Re-calculate goal progress
            const { data: allSubtasks } = await supabase
                .from('subtasks')
                .select('is_completed')
                .eq('goal_id', goal_id)
                .eq('user_id', user.id)

            if (allSubtasks && allSubtasks.length > 0) {
                const completedCount = allSubtasks.filter(st => st.is_completed).length
                const newProgress = Math.round((completedCount / allSubtasks.length) * 100)
                const newStatus = newProgress === 100 ? 'completed' : 'in-progress'

                await supabase
                    .from('goals')
                    .update({ progress_percent: newProgress, status: newStatus })
                    .eq('id', goal_id)
                    .eq('user_id', user.id)
            }

            await calculateGoalsScore(supabase, user.id);
            return NextResponse.json({ success: true, subtask: newSubtask })
        }

        // 1. Insert New Goal
        const insertData: any = {
            user_id: user.id,
            title,
            deadline: deadline || null,
            priority,
            status: 'in-progress'
        }

        if (created_at) {
            insertData.created_at = created_at
        }

        const { data: goal, error: goalError } = await supabase
            .from('goals')
            .insert([insertData])
            .select()
            .single()

        if (goalError) throw goalError

        // 2. Insert Subtasks if any
        if (subtasks && subtasks.length > 0) {
            const subtasksToInsert = subtasks.map((st: string) => ({
                goal_id: goal.id,
                user_id: user.id,
                title: st,
                is_completed: false
            }))
            const { error: subtasksError } = await supabase
                .from('subtasks')
                .insert(subtasksToInsert)

            if (subtasksError) throw subtasksError
        }

        await calculateGoalsScore(supabase, user.id);
        return NextResponse.json({ success: true, goal })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { goal_id, subtask_id, is_completed, status, progress_percent, note } = body

        if (subtask_id !== undefined) {
            // Update subtask
            const { error } = await supabase
                .from('subtasks')
                .update({ is_completed })
                .eq('id', subtask_id)
                .eq('user_id', user.id)

            if (error) throw error

            // Re-calculate progress percent for the goal
            const { data: subtasks } = await supabase
                .from('subtasks')
                .select('is_completed')
                .eq('goal_id', goal_id)

            if (subtasks && subtasks.length > 0) {
                const completedCount = subtasks.filter(st => st.is_completed).length
                const newProgress = Math.round((completedCount / subtasks.length) * 100)
                const newStatus = newProgress === 100 ? 'completed' : 'in-progress'

                await supabase
                    .from('goals')
                    .update({ progress_percent: newProgress, status: newStatus })
                    .eq('id', goal_id)
                    .eq('user_id', user.id)
            }
        } else if (goal_id) {
            // Update goal directly
            const updates: any = { updated_at: new Date().toISOString() }
            if (status !== undefined) updates.status = status
            if (progress_percent !== undefined) updates.progress_percent = progress_percent
            if (note !== undefined) updates.note = note

            const { error } = await supabase
                .from('goals')
                .update(updates)
                .eq('id', goal_id)
                .eq('user_id', user.id)

            if (error) throw error
        }

        await calculateGoalsScore(supabase, user.id);
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const deleteAll = searchParams.get('deleteAll') === 'true'

        if (deleteAll) {
            const { error } = await supabase
                .from('goals')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await calculateGoalsScore(supabase, user.id);
            return NextResponse.json({ success: true })
        }

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculateGoalsScore(supabase, user.id);
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
