import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calculateFinanceScore } from '@/lib/scoreCalculator'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, category, transaction_type, description, transaction_date } = body

        const { data: insertedData, error } = await supabase
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
            .select()
            .single()

        if (error) throw error

        await logActivity({
            area: 'Finance',
            action: transaction_type === 'income' ? 'Credit Logged' : 'Debit Logged',
            detail: `${transaction_type === 'income' ? '+' : '-'}₹${amount} for ${category}${description ? `\n📝 ${description}` : ''}`,
            icon: '💰',
            reference_id: insertedData.id.toString(),
            userId: user.id
        })

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

        if (id === 'all') {
            const { count, error: countError } = await supabase
                .from('finance')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)

            if (countError) throw countError

            const { error } = await supabase
                .from('finance')
                .delete()
                .eq('user_id', user.id)

            if (error) throw error

            await calculateFinanceScore(supabase, user.id);

            await logActivity({
                area: 'Finance',
                action: 'History Cleared',
                detail: `All ${count || 0} finance records were removed from history.`,
                icon: '🗑️',
                userId: user.id
            });

            return NextResponse.json({ success: true })
        }

        const { data: financeEntry, error: fetchError } = await supabase
            .from('finance')
            .select('amount, category, transaction_type')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError) throw fetchError

        const { error } = await supabase
            .from('finance')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        await calculateFinanceScore(supabase, user.id);

        await logActivity({
            area: 'Finance',
            action: 'Transaction Deleted',
            detail: `Removed ${financeEntry.transaction_type}: ₹${financeEntry.amount} (${financeEntry.category})`,
            icon: '🗑️',
            reference_id: id,
            userId: user.id
        });

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
