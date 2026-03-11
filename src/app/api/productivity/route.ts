import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateProductivityScore } from '@/lib/scoreCalculator'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('productivity')
            .select('*')
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
        const { top_priority, tasks_completed, focus_hours, distraction_level } = body

        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('productivity')
            .upsert({
                user_id: user.id,
                top_priority,
                tasks_completed: parseInt(tasks_completed),
                focus_hours: parseFloat(focus_hours),
                distraction_level: parseInt(distraction_level),
                created_at: today
            }, { onConflict: 'user_id,created_at' })
            .select()
            .single()

        if (error) throw error

        await calculateProductivityScore(supabase, user.id);

        return NextResponse.json({ success: true, entry: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
