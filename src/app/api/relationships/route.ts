import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('relationships')
            .select('*')
            .order('occurred_at', { ascending: false })

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
        const { interaction_type, time_spent_mins, satisfaction_rating, description, occurred_at } = body

        const { data, error } = await supabase
            .from('relationships')
            .insert([{
                user_id: user.id,
                interaction_type,
                time_spent_mins: parseInt(time_spent_mins),
                satisfaction_rating: parseInt(satisfaction_rating),
                description,
                occurred_at: occurred_at || new Date().toISOString()
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, entry: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
