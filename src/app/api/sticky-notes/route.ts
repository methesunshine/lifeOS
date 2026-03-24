import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

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

        await logActivity({
            area: 'Journey',
            action: 'Sticky Note Created',
            detail: `📌 ${content || 'Empty Note'}${color ? ` (Color: ${color})` : ''}`,
            icon: '📌',
            reference_id: data.sticky_id.toString(),
            userId: user.id
        });

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
        const deleteAll = searchParams.get('all') === 'true'
        const id = searchParams.get('id')

        if (deleteAll) {
            const { count, error: countError } = await supabase
                .from('sticky_notes')
                .select('sticky_id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('sticky_notes')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error
 
            await logActivity({
                area: 'Journey',
                action: 'Sticky Notes Reset',
                detail: `All ${count || 0} sticky notes were cleared from the sidebar.`,
                icon: '🗑️',
                userId: user.id
            });
 
            return NextResponse.json({ success: true, message: 'All sticky notes deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Sticky ID required' }, { status: 400 })

        const { data: stickyToDelete, error: fetchError } = await supabase
            .from('sticky_notes')
            .select('content')
            .eq('sticky_id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('sticky_notes')
            .delete()
            .eq('sticky_id', id)
            .eq('user_id', user.id)

        if (error) throw error
 
        await logActivity({
            area: 'Journey',
            action: 'Sticky Note Deleted',
            detail: `Removed: "${stickyToDelete.content || 'Untitled'}"`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });
 
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
