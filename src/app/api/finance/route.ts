import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateFinanceScore } from '@/lib/scoreCalculator'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, category, transaction_type, description, transaction_date } = body

        const { error } = await supabase
            .from('finance')
            .insert([
                {
                    user_id: user.id,
                    amount,
                    category,
                    transaction_type,
                    description,
                    transaction_date: transaction_date ? transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
                    created_at: transaction_date || new Date().toISOString()
                }
            ])

        if (error) throw error

        await calculateFinanceScore(supabase, user.id);

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
            .from('finance')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

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
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        let query = supabase.from('finance').delete().eq('user_id', user.id)

        if (id !== 'all') {
            query = query.eq('id', id)
        }

        const { error } = await query

        if (error) throw error

        await calculateFinanceScore(supabase, user.id);

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
