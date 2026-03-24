import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateSkillsScore } from '@/lib/scoreCalculator'
import { logActivity } from '@/lib/activity-logger'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: skills, error: skillsError } = await supabase
            .from('skills')
            .select(`
                *,
                skill_logs (
                    id,
                    hours_invested,
                    skill_level,
                    projects_completed,
                    note,
                    created_at
                )
            `)
            .order('created_at', { ascending: false })

        if (skillsError) throw skillsError

        return NextResponse.json(skills)
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
        const { name, category, hours_invested, skill_level, projects_completed, note, created_at } = body

        let { data: skill, error: skillError } = await supabase
            .from('skills')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', name)
            .single()

        if (skillError && skillError.code !== 'PGRST116') throw skillError

        if (!skill) {
            const { data: newSkill, error: createError } = await supabase
                .from('skills')
                .insert([{ user_id: user.id, name, category }])
                .select()
                .single()
            if (createError) throw createError
            skill = newSkill
        }

        if (!skill) throw new Error('Failed to create or find skill');

        const { data: logData, error: logError } = await supabase
            .from('skill_logs')
            .insert([{
                user_id: user.id,
                skill_id: skill.id,
                hours_invested: hours_invested || 0,
                skill_level: skill_level || 1,
                projects_completed: projects_completed || 0,
                note,
                created_at: created_at || new Date().toISOString()
            }])
            .select()
            .single()

        if (logError) throw logError

        await logActivity({
            area: 'Skills',
            action: 'Skill Progress Logged',
            detail: `🚀 ${name}: ${hours_invested}h (Level ${skill_level})${note ? `\n📝 ${note}` : ''}`,
            icon: '🚀',
            reference_id: logData?.id.toString(),
            userId: user.id
        });

        await calculateSkillsScore(supabase, user.id);

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
        const skillId = searchParams.get('skill_id')
        const logId = searchParams.get('log_id')

        if (id === 'all') {
            const { count: logCount, error: logCountError } = await supabase
                .from('skill_logs')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
            if (logCountError) throw logCountError

            const { count: skillCount, error: skillCountError } = await supabase
                .from('skills')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
            if (skillCountError) throw skillCountError

            const { error: logError } = await supabase
                .from('skill_logs')
                .delete()
                .eq('user_id', user.id)
            if (logError) throw logError

            const { error: skillError } = await supabase
                .from('skills')
                .delete()
                .eq('user_id', user.id)
            if (skillError) throw skillError

            await calculateSkillsScore(supabase, user.id);

            await logActivity({
                area: 'Skills',
                action: 'History Reset',
                detail: `All ${skillCount || 0} skills and ${logCount || 0} logs were removed.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        if (skillId) {
            const { data: skillToDelete, error: fetchError } = await supabase
                .from('skills')
                .select('name')
                .eq('id', skillId)
                .eq('user_id', user.id)
                .single()
            if (fetchError) throw fetchError

            const { error } = await supabase
                .from('skills')
                .delete()
                .eq('id', skillId)
                .eq('user_id', user.id)
            if (error) throw error

            await calculateSkillsScore(supabase, user.id);

            await logActivity({
                area: 'Skills',
                action: 'Skill Deleted',
                detail: `Removed "${skillToDelete.name}" and all associated progress.`,
                icon: '🗑️',
                reference_id: skillId,
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        if (logId) {
            const { data: logToDelete, error: fetchError } = await supabase
                .from('skill_logs')
                .select('hours_invested, skill_id')
                .eq('id', logId)
                .eq('user_id', user.id)
                .single()
            if (fetchError) throw fetchError

            const { error } = await supabase
                .from('skill_logs')
                .delete()
                .eq('id', logId)
                .eq('user_id', user.id)
            if (error) throw error

            await calculateSkillsScore(supabase, user.id);

            await logActivity({
                area: 'Skills',
                action: 'Log Entry Deleted',
                detail: `Removed ${logToDelete.hours_invested}h entry (Skill ID: ${logToDelete.skill_id})`,
                icon: '🗑️',
                reference_id: logId,
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
