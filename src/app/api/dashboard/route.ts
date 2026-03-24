import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import {
    buildSystemActivityFeed,
    calculateFinanceModuleScore,
    calculateGoalsModuleScore,
    calculateJourneyModuleScore,
    calculateMentalModuleScore,
    calculateOverallLifeScore,
    calculatePhysicalModuleScore,
    calculateReminderModuleScore,
    calculateSettingsModuleScore,
    calculateSkillsModuleScore,
    getDashboardAreaScores
} from '@/lib/dashboardMetrics';

type ActivityItem = {
    area: string;
    action: string;
    detail: string;
    time: string;
    icon: string;
    id?: string;
};

type SkillActivityRow = {
    skills?: Array<{ name?: string }> | null;
    hours_invested?: number | string | null;
    created_at: string;
};

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date().toLocaleDateString('en-CA');
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [mental, physical, finance, skills, goals, notes, tasks, dailyLogs, reminders, profile, stickies] = await Promise.all([
            supabase.from('mental_health').select('mood, stress_level, focus_level, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
            supabase.from('physical_health').select('workout_completed, sleep_hours, water_intake_ml, steps, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
            supabase.from('finance').select('amount, category, transaction_type, transaction_date, created_at').eq('user_id', user.id).gte('transaction_date', startOfMonth.toISOString().split('T')[0]).order('transaction_date', { ascending: false }),
            supabase.from('skill_logs').select('skill_id, hours_invested, created_at, skills(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('goals').select('title, status, created_at, updated_at, note').eq('user_id', user.id).order('updated_at', { ascending: false }),
            supabase.from('notes').select('note_id, title, category, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12),
            supabase.from('tasks').select('task_id, title, status, due_date, priority, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(16),
            supabase.from('daily_logs').select('log_id, mood, date, summary, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
            supabase.from('reminders').select('reminder_id, title, status, remind_at, created_at, category, priority').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('profiles').select('telegram_bot_token, notifications_enabled, updated_at').eq('user_id', user.id).single(),
            supabase.from('sticky_notes').select('sticky_id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        ]);

        const { count: totalTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { count: completedTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Completed');
        const { count: overdueTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'Completed').lt('due_date', today);
        const { count: overdueRemindersCount } = await supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'snoozed']).lt('remind_at', new Date().toISOString());
        const { count: totalNotes } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { count: totalStickies } = await supabase.from('sticky_notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { data: todayLog } = await supabase.from('daily_logs').select('log_id').eq('user_id', user.id).eq('date', today).single();

        const hasLogToday = !!todayLog;
        const journeyProgress = calculateJourneyModuleScore({
            totalTasksCount: totalTasksCount || 0,
            completedTasksCount: completedTasksCount || 0,
            hasLogToday,
            totalNotes: totalNotes || 0,
            totalStickies: totalStickies || 0,
        });

        const moduleScores = {
            mental: calculateMentalModuleScore(mental.data || []),
            physical: calculatePhysicalModuleScore(physical.data || []),
            finance: calculateFinanceModuleScore(finance.data || []),
            skills: calculateSkillsModuleScore(skills.data || []),
            goals: calculateGoalsModuleScore(goals.data || []),
            reminders: calculateReminderModuleScore(reminders.data || []),
            journey: journeyProgress,
            settings: calculateSettingsModuleScore(profile.data || null),
        };

        const areaScores = getDashboardAreaScores(moduleScores);
        const overallLifeScore = calculateOverallLifeScore(moduleScores);
        const pendingRemindersCount = reminders.data?.filter((item) => item.status === 'pending' || item.status === 'snoozed').length || 0;
        const completedRemindersCount = reminders.data?.filter((item) => item.status === 'completed').length || 0;

        // 1. Fetch persistent activity logs
        const { data: persistentLogs } = await supabase
            .from('system_activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        const combinedActivity: ActivityItem[] = (persistentLogs || []).map(log => ({
            area: log.area,
            action: log.action,
            detail: log.detail || '',
            time: log.created_at,
            icon: log.icon || '📌',
            id: log.reference_id || log.id.toString()
        }));

        // 2. Add dynamic "Logic Center" snapshot if empty
        if (combinedActivity.length === 0) {
            combinedActivity.push({
                area: 'Dashboard',
                action: 'Logic Center Synced',
                detail: `Overall score ${overallLifeScore} across 8 core systems`,
                time: new Date().toISOString(),
                icon: '🧭',
                id: 'dashboard-snapshot'
            });
        }

        // --- TIMELINE EVENT ALERTS (Priority) ---
        if ((overdueTasksCount || 0) > 0) {
            combinedActivity.push({
                area: 'Journey',
                action: '🚨 Action Required: Overdue Tasks',
                detail: `You have ${overdueTasksCount} tasks past their due date. Click to resolve.`,
                time: new Date().toISOString(),
                icon: '🚨',
                id: 'alert-overdue-tasks'
            });
        }

        if (!hasLogToday) {
            combinedActivity.push({
                area: 'Journey',
                action: '⚠️ Action Required: Missing Daily Reflection',
                detail: "You haven't logged your daily reflection yet. Click to record your state.",
                time: new Date().toISOString(),
                icon: '⚠️',
                id: 'alert-missing-log'
            });
        }

        Object.entries(moduleScores).forEach(([key, score]) => {
            if (score < 60 && key !== 'settings' && key !== 'journey') {
                const areaName = key === 'mental' ? 'Mental Health' : 
                                 key === 'physical' ? 'Physical Health' : 
                                 key.charAt(0).toUpperCase() + key.slice(1);
                combinedActivity.push({
                    area: areaName,
                    action: '⚠️ Review Needed: Low Area Integrity',
                    detail: `Your ${areaName} score is currently ${score}. Click to investigate.`,
                    time: new Date().toISOString(),
                    icon: '⚠️',
                    id: `alert-low-score-${key}`
                });
            }
        });
        // ----------------------------------------

        combinedActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        const { cookies } = await import('next/headers');
        const cookieJar = await cookies();
        const clearPoint = cookieJar.get('activity_cleared_at')?.value;
        const hiddenItems = cookieJar.get('hidden_activities')?.value?.split(',') || [];

        const filteredLogs = combinedActivity.filter((log) => {
            const logTime = new Date(log.time).getTime();
            const clearTime = clearPoint ? new Date(clearPoint).getTime() : 0;
            const logId = log.id || `${log.area}-${log.action}-${log.time}`;
            return logTime > clearTime && !hiddenItems.includes(logId);
        });
        const recentLogs = buildSystemActivityFeed(filteredLogs, 24);

        return NextResponse.json({
            scores: moduleScores,
            areaScores,
            recentLogs,
            vitals: {
                overallLifeScore,
                lifeScoreTrend: 'neutral',
                trendValue: 0,
                totalFocusHours: 0,
                tasksToday: tasks.data?.filter((task) => task.due_date === today).length || 0,
                pendingTasks: (totalTasksCount || 0) - (completedTasksCount || 0),
                completedTasksCount: completedTasksCount || 0,
                totalTasksCount: totalTasksCount || 0,
                journeyProgress,
                totalNotes: totalNotes || 0,
                totalStickies: totalStickies || 0,
                overdueTasksCount: (overdueTasksCount || 0) + (overdueRemindersCount || 0),
                hasLogToday: !!todayLog,
                latestMood: dailyLogs.data?.[0]?.mood ?? '-',
                latestReflection: dailyLogs.data?.[0]?.summary || 'No reflection logged yet.',
                latestReflectionTime: dailyLogs.data?.[0]?.created_at || '',
                latestNote: notes.data?.[0]?.title || 'No recent notes',
                latestJourneyActivity: filteredLogs.find((item) => item.area === 'Journey') || null,
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
