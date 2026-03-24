import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const search = searchParams.get('search')
        const pinned = searchParams.get('pinned')
        const archived = searchParams.get('archived') || 'false'

        let query = supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_archived', archived === 'true')
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false })

        if (category) {
            query = query.eq('category', category)
        }
        if (pinned === 'true') {
            query = query.eq('is_pinned', true)
        }
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
        }

        const { data: notes, error } = await query

        if (error) throw error
        return NextResponse.json(notes)
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
        const { title, content, category, is_pinned } = body

        const { data, error } = await supabase
            .from('notes')
            .insert([{
                user_id: user.id,
                title,
                content,
                category: category || 'General',
                is_pinned: is_pinned || false,
                is_archived: false,
                updated_at: new Date().toISOString()
            }])
            .select().single()

        if (error) throw error

        await logActivity({
            area: 'Journey',
            action: 'Note Created',
            detail: `📌 ${title} (${category || 'General'})${content ? `\n📄 ${content.length > 100 ? content.substring(0, 97) + '...' : content}` : ''}`,
            icon: '📓',
            reference_id: data.note_id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true, note: data })
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
        const { note_id, ...updates } = body

        if (!note_id) {
            return NextResponse.json({ error: 'Note ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('notes')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('note_id', note_id)
            .eq('user_id', user.id)
            .select().single()

        if (error) throw error

        await logActivity({
            area: 'Journey',
            action: 'Note Updated',
            detail: `Refined: ${data.title}`,
            icon: '📓',
            reference_id: data.note_id.toString(),
            userId: user.id
        });

        return NextResponse.json({ success: true, note: data })
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
        const deleteAll = searchParams.get('all') === 'true'
        const category = searchParams.get('category')

        if (deleteAll) {
            let countQuery = supabase.from('notes').select('note_id', { count: 'exact', head: true }).eq('user_id', user.id)
            let query = supabase.from('notes').delete().eq('user_id', user.id)
            if (category && category !== 'All') {
                countQuery = countQuery.eq('category', category)
                query = query.eq('category', category)
            }

            const { count, error: countError } = await countQuery
            if (countError) throw countError

            const { error } = await query
            if (error) throw error

            await logActivity({
                area: 'Journey',
                action: 'Notes Reset',
                detail: `All ${count || 0} notes were deleted from history.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true, message: 'Notes deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

        const { data: noteToDelete, error: fetchError } = await supabase
            .from('notes')
            .select('title')
            .eq('note_id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('note_id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await logActivity({
            area: 'Journey',
            action: 'Note Deleted',
            detail: `Removed note: "${noteToDelete.title}"`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
