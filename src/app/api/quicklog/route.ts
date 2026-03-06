import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { mood, sleep_hours, water_intake_ml, expense_amount, expense_category, note } = body;
        const results = [];

        // 1. Log Mood (Mental Health)
        if (mood) {
            const { data: mental } = await supabase.from('mental_health').insert({
                user_id: user.id,
                mood: parseInt(mood),
                stress_level: 5, // Default for quick log
                focus_level: 5 // Default for quick log
            }).select();
            results.push({ type: 'mood', success: !!mental });
        }

        // 2. Log Sleep/Water (Physical Health)
        if (sleep_hours || water_intake_ml) {
            // Check if entry for today exists to update or insert
            const today = new Date().toISOString().split('T')[0];
            const updates: any = { user_id: user.id };
            if (sleep_hours) updates.sleep_hours = parseFloat(sleep_hours);
            if (water_intake_ml) updates.water_intake_ml = parseInt(water_intake_ml);

            const { data: phys } = await supabase.from('physical_health').insert(updates).select();
            results.push({ type: 'physical', success: !!phys });
        }

        // 3. Log Expense (Finance)
        if (expense_amount && expense_category) {
            const { data: fin } = await supabase.from('finance').insert({
                user_id: user.id,
                amount: parseFloat(expense_amount),
                category: expense_category,
                transaction_type: 'expense'
            }).select();
            results.push({ type: 'finance', success: !!fin });
        }

        // 4. Log Quick Note (Journey)
        if (note) {
            const { data: noteRes } = await supabase.from('notes').insert({
                user_id: user.id,
                title: note.slice(0, 50) + (note.length > 50 ? '...' : ''),
                content: note,
                category: 'General'
            }).select();
            results.push({ type: 'note', success: !!noteRes });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
