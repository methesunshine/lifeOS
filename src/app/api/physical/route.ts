import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculatePhysicalScore } from '@/lib/scoreCalculator'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sleep_hours, workout_completed, water_intake_ml, steps, weight_kg, created_at } = body

        const { data: logData, error } = await supabase
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
            .select()
            .single()

        if (error) throw error

        // Persistent Activity Log
        await logActivity({
            area: 'Physical Health',
            action: 'Health metrics logged',
            detail: `🚶 ${steps} steps, 😴 ${sleep_hours}h sleep, 💧 ${water_intake_ml}ml water, ⚖️ ${weight_kg}kg${workout_completed ? '\n🔥 Workout Completed' : ''}`,
            icon: '💪',
            reference_id: logData.id.toString(),
            userId: user.id
        });

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

        if (id === 'all') {
            const { count, error: countError } = await supabase
                .from('physical_health')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('physical_health')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await calculatePhysicalScore(supabase, user.id);

            await logActivity({
                area: 'Physical Health',
                action: 'History Cleared',
                detail: `All ${count || 0} physical health logs were removed from history.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        const { data: physicalEntry, error: fetchError } = await supabase
            .from('physical_health')
            .select('created_at')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('physical_health')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculatePhysicalScore(supabase, user.id);

        await logActivity({
            area: 'Physical Health',
            action: 'Log Entry Deleted',
            detail: `Removed physical entry from ${new Date(physicalEntry.created_at || '').toLocaleDateString()}`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
