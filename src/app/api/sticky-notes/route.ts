import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: stickies, error } = await supabase
            .from('sticky_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (error) throw error
        return NextResponse.json(stickies)
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
        const { content, color, position_x, position_y } = body

        const { data, error } = await supabase
            .from('sticky_notes')
            .insert([{
                user_id: user.id,
                content: content || '',
                color: color || 'yellow',
                position_x: position_x || 100,
                position_y: position_y || 100
            }])
            .select().single()

        if (error) throw error
        return NextResponse.json({ success: true, sticky: data })
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
        const { sticky_id, ...updates } = body

        if (!sticky_id) {
            return NextResponse.json({ error: 'Sticky ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('sticky_notes')
            .update(updates)
            .eq('sticky_id', sticky_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error
        return NextResponse.json({ success: true, sticky: data })
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
        if (!id) return NextResponse.json({ error: 'Sticky ID required' }, { status: 400 })

        const { error } = await supabase
            .from('sticky_notes')
            .delete()
            .eq('sticky_id', id)
            .eq('user_id', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
