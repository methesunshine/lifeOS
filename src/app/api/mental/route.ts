import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateMentalScore } from '@/lib/scoreCalculator'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { mood, stress, focus, gratitude, reflection } = body

        const { data: insertedData, error } = await supabase
            .from('mental_health')
            .insert([
                {
                    user_id: user.id,
                    mood,
                    stress_level: stress,
                    focus_level: focus,
                    gratitude_note: gratitude,
                    daily_reflection: reflection
                }
            ])
            .select()
            .single()

        if (error) throw error

        await logActivity({
            area: 'Mental Health',
            action: 'Mood recorded',
            detail: `Mood: ${mood}/10, Stress: ${stress}/10, Focus: ${focus}/10${gratitude ? `\n🙏 Gratitude: ${gratitude}` : ''}${reflection ? `\n💭 Reflection: ${reflection}` : ''}`,
            icon: '🧠',
            reference_id: insertedData.id.toString(),
            userId: user.id
        })

        await calculateMentalScore(supabase, user.id);

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('mental_health')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
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

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        if (id === 'all') {
            const { count, error: countError } = await supabase
                .from('mental_health')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('mental_health')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await calculateMentalScore(supabase, user.id);

            await logActivity({
                area: 'Mental Health',
                action: 'History Cleared',
                detail: `All ${count || 0} mental health logs were removed from history.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        const { data: mentalEntry, error: fetchError } = await supabase
            .from('mental_health')
            .select('mood')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('mental_health')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculateMentalScore(supabase, user.id);

        await logActivity({
            area: 'Mental Health',
            action: 'Mood Log Deleted',
            detail: `Removed entry with Mood: ${mentalEntry.mood}/10`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
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
        const { id, mood, stress, focus, gratitude, reflection } = body

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('mental_health')
            .update({
                mood,
                stress_level: stress,
                focus_level: focus,
                gratitude_note: gratitude,
                daily_reflection: reflection
            })
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculateMentalScore(supabase, user.id);

        await logActivity({
            area: 'Mental Health',
            action: 'Mood Log Updated',
            detail: `Mood: ${mood}/10, Stress: ${stress}/10, Focus: ${focus}/10`,
            icon: '🧠',
            reference_id: id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
