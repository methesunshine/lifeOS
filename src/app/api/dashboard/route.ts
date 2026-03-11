import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date().toLocaleDateString('en-CA');

        // 1. Fetch Latest Life Scores for all areas
        const { data: scores } = await supabase
            .from('life_scores')
            .select('area, score')
            .eq('user_id', user.id)
            .order('calculated_at', { ascending: false });

        const recentScores: Record<string, number> = {};
        scores?.forEach(s => {
            if (!(s.area in recentScores)) {
                recentScores[s.area] = s.score;
            }
        });

        // 2. Fetch Detailed Activity and Metrics
        // 2. Fetch Detailed Activity and Metrics
        const [mental, physical, finance, skills, goals, notes, tasks, dailyLogs, productivity] = await Promise.all([
            // Mental
            supabase.from('mental_health').select('mood, stress_level, focus_level, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
            // Physical
            supabase.from('physical_health').select('workout_completed, sleep_hours, water_intake_ml, steps, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
            // Finance
            supabase.from('finance').select('amount, category, transaction_type, transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(3),
            // Skills
            supabase.from('skill_logs').select('skill_id, hours_invested, created_at, skills(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
            // Goals
            supabase.from('goals').select('title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
            // Notes
            supabase.from('notes').select('note_id, title, category, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
            // Tasks
            supabase.from('tasks').select('title, status, due_date, priority').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            // Daily Logs
            supabase.from('daily_logs').select('mood, date').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
            // Productivity
            supabase.from('productivity').select('tasks_completed, focus_hours, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ]);

        const combinedActivity: any[] = [];

        mental.data?.forEach(d => combinedActivity.push({ area: 'Mental', action: 'Mood Synced', detail: `State: ${d.mood}/10`, time: d.created_at, icon: '🧠' }));
        physical.data?.forEach(d => combinedActivity.push({ area: 'Physical', action: d.workout_completed ? 'Protocol Done' : 'Stats Logged', detail: d.workout_completed ? 'Workout complete' : `${d.sleep_hours}h sleep`, time: d.created_at, icon: '💪' }));
        finance.data?.forEach(d => combinedActivity.push({ area: 'Finance', action: d.transaction_type === 'expense' ? 'Debit' : 'Credit', detail: `${d.transaction_type === 'expense' ? '-' : '+'}₹${d.amount}`, time: d.transaction_date, icon: '💰' }));
        skills.data?.forEach((d: any) => combinedActivity.push({ area: 'Skills', action: 'Practice Done', detail: `${d.skills?.name || 'Skill'} • ${d.hours_invested}h`, time: d.created_at, icon: '📚' }));
        goals.data?.forEach(d => combinedActivity.push({ area: 'Goals', action: d.status === 'completed' ? 'Mission Success' : 'Objective Logged', detail: d.title, time: d.created_at, icon: '🎯' }));
        notes.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: 'Note Written', detail: d.title, time: d.updated_at, icon: '📓', id: d.note_id }));
        tasks.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: d.status === 'Completed' ? 'Task Done' : 'Task Added', detail: d.title, time: new Date().toISOString(), icon: '✅' }));
        productivity.data?.forEach(d => combinedActivity.push({ area: 'Productivity', action: 'System Active', detail: `${d.focus_hours}h focus • ${d.tasks_completed} tasks`, time: d.created_at, icon: '⚡' }));

        combinedActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // 3. Vital Statistics Synthesis
        const overallLifeScore = Object.values(recentScores).length > 0
            ? Math.round(Object.values(recentScores).reduce((a, b) => a + b, 0) / Object.values(recentScores).length)
            : 0;

        // Fetch past scores from 7 days ago to compute the trend
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: pastScoresData } = await supabase
            .from('life_scores')
            .select('area, score')
            .eq('user_id', user.id)
            .lte('calculated_at', sevenDaysAgo)
            .order('calculated_at', { ascending: false });

        const pastScores: Record<string, number> = {};
        pastScoresData?.forEach(s => {
            if (!(s.area in pastScores)) pastScores[s.area] = s.score;
        });

        const pastLifeScore = Object.values(pastScores).length > 0
            ? Math.round(Object.values(pastScores).reduce((a, b) => a + b, 0) / Object.values(pastScores).length)
            : 0;

        let trendValue = overallLifeScore - pastLifeScore;
        let lifeScoreTrend = trendValue > 0 ? 'positive' : trendValue < 0 ? 'negative' : 'neutral';

        // If there is literally no past history, don't show an artificial giant spike, just say neutral
        if (Object.values(pastScores).length === 0) {
            trendValue = 0;
            lifeScoreTrend = 'neutral';
        }

        const totalFocusHours = productivity.data?.reduce((acc, curr) => acc + Number(curr.focus_hours), 0) || 0;

        // 4. Life Journey Metrics
        const { count: totalTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { count: completedTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Completed');
        const { count: totalNotes } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { count: totalStickies } = await supabase.from('sticky_notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { data: todayLog } = await supabase.from('daily_logs').select('log_id').eq('user_id', user.id).eq('date', today).single();

        const pendingTasks = (totalTasksCount || 0) - (completedTasksCount || 0);
        const hasLogToday = !!todayLog;

        // Calculate a consolidated Journey Progress (0-100)
        // Logic: 50% task completion, 25% daily log presence, 25% having at least 1 note/sticky
        const taskProgress = totalTasksCount && totalTasksCount > 0 ? (completedTasksCount || 0) / totalTasksCount : (totalTasksCount === 0 ? 1 : 0);
        const logFactor = hasLogToday ? 1 : 0;
        const creationFactor = (totalNotes || 0) > 0 || (totalStickies || 0) > 0 ? 1 : 0;

        const journeyProgress = Math.round((taskProgress * 0.5 + logFactor * 0.25 + creationFactor * 0.25) * 100);

        const tasksToday = tasks.data?.filter(t => t.due_date === today).length || 0;
        const latestMood = dailyLogs.data?.[0]?.mood || '-';
        const latestNote = notes.data?.[0]?.title || 'No recent notes';

        return NextResponse.json({
            scores: recentScores,
            recentLogs: combinedActivity.slice(0, 8),
            vitals: {
                overallLifeScore,
                lifeScoreTrend,
                trendValue,
                totalFocusHours,
                tasksToday,
                pendingTasks,
                completedTasksCount: completedTasksCount || 0,
                totalTasksCount: totalTasksCount || 0,
                journeyProgress,
                totalNotes: totalNotes || 0,
                totalStickies: totalStickies || 0,
                hasLogToday,
                latestMood,
                latestNote
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
