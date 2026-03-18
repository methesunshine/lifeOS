import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/pushbullet'

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

        // Pushbullet Notification
        await sendPushNotification(user.id, '📓 Note Created', `Title: ${title}\nCategory: ${category || 'General'}`);

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

        // Pushbullet Notification
        await sendPushNotification(user.id, '📓 Note Updated', `Title: ${data.title}`);

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
            let query = supabase.from('notes').delete().eq('user_id', user.id)
            if (category && category !== 'All') {
                query = query.eq('category', category)
            }
            const { error } = await query

            if (error) throw error
            return NextResponse.json({ success: true, message: 'Notes deleted' })
        }

        if (!id) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('note_id', id)
            .eq('user_id', user.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
