import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculatePhysicalScore } from '@/lib/scoreCalculator'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sleep_hours, workout_completed, water_intake_ml, steps, weight_kg, created_at } = body

        const { error } = await supabase
            .from('physical_health')
            .insert([
                {
                    user_id: user.id,
                    sleep_hours,
                    workout_completed,
                    water_intake_ml,
                    steps,
                    weight: weight_kg,
                    created_at: created_at || new Date().toISOString()
                }
            ])

        if (error) throw error

        await calculatePhysicalScore(supabase, user.id);

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
            .from('physical_health')
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

        let query = supabase.from('physical_health').delete().eq('user_id', user.id)

        if (id !== 'all') {
            query = query.eq('id', id)
        }

        const { error } = await query

        if (error) throw error

        await calculatePhysicalScore(supabase, user.id);

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

