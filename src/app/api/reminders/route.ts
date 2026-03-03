import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: reminders, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('remind_at', { ascending: true })

        if (error) throw error
        return NextResponse.json(reminders)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { title, description, remind_at } = body

        const { data, error } = await supabase
            .from('reminders')
            .insert([{
                user_id: user.id,
                title,
                description: description || '',
                remind_at,
                is_completed: false
            }])
            .select().single()

        if (error) throw error
        return NextResponse.json({ success: true, reminder: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { reminder_id, ...updates } = body

        if (!reminder_id) {
            return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('reminders')
            .update(updates)
            .eq('reminder_id', reminder_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error
        return NextResponse.json({ success: true, reminder: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 })

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('reminder_id', id)
            .eq('user_id', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
