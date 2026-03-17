import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateSkillsScore } from '@/lib/scoreCalculator'
import { sendPushNotification } from '@/lib/pushbullet'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch skills and their latest logs
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

        // 1. Get or create the skill
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

        // 2. Insert the log
        const { error: logError } = await supabase
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

        if (logError) throw logError

        // Pushbullet Notification
        await sendPushNotification(
            user.id, 
            '🚀 Skill Progress', 
            `${name}: ${hours_invested}h invested (Level ${skill_level})`
        );

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

            return NextResponse.json({ success: true })
        }

        if (skillId) {
            const { error } = await supabase
                .from('skills')
                .delete()
                .eq('id', skillId)
                .eq('user_id', user.id)
            if (error) throw error

            await calculateSkillsScore(supabase, user.id);
            return NextResponse.json({ success: true })
        }

        if (logId) {
            const { error } = await supabase
                .from('skill_logs')
                .delete()
                .eq('id', logId)
                .eq('user_id', user.id)
            if (error) throw error

            await calculateSkillsScore(supabase, user.id);
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
