import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateMentalScore } from '@/lib/scoreCalculator'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { mood, stress, focus, gratitude, reflection } = body

        const { error } = await supabase
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

        if (error) throw error

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

        let query = supabase.from('mental_health').delete().eq('user_id', user.id)

        if (id !== 'all') {
            query = query.eq('id', id)
        }

        const { error } = await query

        if (error) throw error

        await calculateMentalScore(supabase, user.id);

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

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
