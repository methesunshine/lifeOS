import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const alerts = [];

        // 1. Check Sleep Patterns (Burnout Risk)
        const { data: sleepData } = await supabase
            .from('physical_health')
            .select('sleep_hours, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        if (sleepData && sleepData.length >= 3) {
            const lowSleep = sleepData.every(d => Number(d.sleep_hours) < 6);
            if (lowSleep) {
                alerts.push({
                    id: 'burnout-risk',
                    type: 'warning',
                    title: 'System Alert',
                    message: 'Sleep below 6h for 3 days. Burnout risk detected.',
                    actionLabel: 'Adjust Schedule'
                });
            }
        }

        // 2. Check Overspending
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: financeData } = await supabase
            .from('finance')
            .select('amount')
            .eq('transaction_type', 'expense')
            .gte('transaction_date', startOfMonth.toISOString().split('T')[0]);

        const totalSpent = financeData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        if (totalSpent > 2000) { // Example threshold
            alerts.push({
                id: 'overspending',
                type: 'caution',
                title: 'Finance Alert',
                message: `Spent $${totalSpent.toFixed(2)} this month. Nearing budget limit.`,
                actionLabel: 'Review Expenses'
            });
        }

        // 3. Journey Alerts (Tasks & Logs)
        const today = new Date().toLocaleDateString('en-CA');
        const { count: overdueTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'Pending')
            .lt('due_date', today);

        if (overdueTasks && overdueTasks > 0) {
            alerts.push({
                id: 'overdue-tasks',
                type: 'warning',
                title: 'Objective Delay',
                message: `${overdueTasks} tasks are overdue. Immediate prioritization recommended.`,
                actionLabel: 'Manage Tasks'
            });
        }

        const { data: todayJournal } = await supabase
            .from('daily_logs')
            .select('log_id')
            .eq('user_id', user.id)
            .eq('date', today);

        if (!todayJournal || todayJournal.length === 0) {
            alerts.push({
                id: 'missing-journal',
                type: 'info',
                title: 'System Gap',
                message: 'No reflection logged for today. Synaptic sync recommended.',
                actionLabel: 'Log Journey'
            });
        }

        return NextResponse.json({ alerts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
