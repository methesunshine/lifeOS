import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'daily'

        const { data, error } = await supabase
            .from('reflections')
            .select('*')
            .eq('entry_type', type)
            .order('created_at', { ascending: false })
            .limit(30)

        if (error) throw error

        return NextResponse.json(data)
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
        const { daily_win, daily_lesson, monthly_self_rating, reflection_note, entry_type, created_at } = body

        const date = created_at || new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('reflections')
            .upsert({
                user_id: user.id,
                daily_win,
                daily_lesson,
                monthly_self_rating: monthly_self_rating ? parseInt(monthly_self_rating) : null,
                reflection_note,
                entry_type: entry_type || 'daily',
                created_at: date
            }, { onConflict: 'user_id,created_at,entry_type' })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, entry: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
