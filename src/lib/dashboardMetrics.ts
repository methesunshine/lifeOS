type MentalLog = {
    mood?: number | null;
    stress_level?: number | null;
    focus_level?: number | null;
};

type PhysicalLog = {
    sleep_hours?: number | string | null;
    workout_completed?: boolean | null;
    water_intake_ml?: number | null;
    steps?: number | null;
};

type FinanceEntry = {
    amount?: number | string | null;
    transaction_type?: string | null;
};

type SkillLog = {
    hours_invested?: number | string | null;
};

type GoalEntry = {
    status?: string | null;
};

type ReminderEntry = {
    status?: string | null;
    remind_at?: string | null;
};

type ProfileEntry = {
    telegram_bot_token?: string | null;
    notifications_enabled?: boolean | null;
};

export type DashboardAreaScore = {
    area: string;
    icon: string;
    score: number;
    color: string;
};

type ActivityItem = {
    area: string;
    action: string;
    detail: string;
    time: string;
    icon: string;
    id?: string;
};

export function roundScore(score: number) {
    return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateMentalModuleScore(logs: MentalLog[] = []) {
    const latest = logs[0];
    if (!latest) return 0;

    const mood = Number(latest.mood) || 0;
    const stress = Number(latest.stress_level) || 0;
    const focus = Number(latest.focus_level) || 0;

    return roundScore(((mood + (10 - stress) + focus) / 3) * 10);
}

export function calculatePhysicalModuleScore(logs: PhysicalLog[] = []) {
    const latest = logs[0];
    if (!latest) return 0;

    const sleepScore = Math.min(25, ((Number(latest.sleep_hours) || 0) / 8) * 25);
    const waterScore = Math.min(25, ((Number(latest.water_intake_ml) || 0) / 2000) * 25);
    const stepsScore = Math.min(25, ((Number(latest.steps) || 0) / 10000) * 25);
    const workoutScore = latest.workout_completed ? 25 : 0;

    return roundScore(sleepScore + waterScore + stepsScore + workoutScore);
}

export function calculateFinanceModuleScore(entries: FinanceEntry[] = []) {
    if (entries.length === 0) return 0;

    let income = 0;
    let expense = 0;

    entries.forEach((entry) => {
        const amount = Number(entry.amount) || 0;
        if (entry.transaction_type === 'income') income += amount;
        if (entry.transaction_type === 'expense') expense += amount;
    });

    let score = 50;
    if (income > 0) {
        const ratio = expense / income;
        if (ratio === 0) score = 100;
        else if (ratio <= 0.5) score = 90;
        else if (ratio <= 0.8) score = 75;
        else if (ratio <= 1.0) score = 50;
        else score = Math.max(0, 50 - ((ratio - 1) * 50));
    } else if (expense > 0) {
        score = 0;
    }

    return roundScore(score);
}

export function calculateSkillsModuleScore(entries: SkillLog[] = []) {
    const totalHours = entries.reduce((sum, entry) => sum + (Number(entry.hours_invested) || 0), 0);
    return roundScore(Math.min(100, (totalHours / 10) * 100));
}

export function calculateGoalsModuleScore(goals: GoalEntry[] = []) {
    if (goals.length === 0) return 0;
    const completed = goals.filter((goal) => goal.status === 'completed').length;
    return roundScore((completed / goals.length) * 100);
}

export function calculateJourneyModuleScore(input: {
    totalTasksCount: number;
    completedTasksCount: number;
    hasLogToday: boolean;
    totalNotes: number;
    totalStickies: number;
}) {
    const taskProgress = input.totalTasksCount > 0
        ? input.completedTasksCount / input.totalTasksCount
        : 1;
    const logFactor = input.hasLogToday ? 1 : 0;
    const creationFactor = input.totalNotes > 0 || input.totalStickies > 0 ? 1 : 0;

    return roundScore((taskProgress * 0.5 + logFactor * 0.25 + creationFactor * 0.25) * 100);
}

export function calculateReminderModuleScore(reminders: ReminderEntry[] = []) {
    if (reminders.length === 0) return 100;

    const now = Date.now();
    const overdue = reminders.filter((reminder) => {
        const isActive = reminder.status === 'pending' || reminder.status === 'snoozed';
        return isActive && reminder.remind_at && new Date(reminder.remind_at).getTime() < now;
    }).length;
    const resolved = reminders.filter((reminder) => reminder.status === 'completed' || reminder.status === 'cancelled').length;

    const onTrackRatio = Math.max(0, (reminders.length - overdue) / reminders.length);
    const resolvedRatio = resolved / reminders.length;

    return roundScore((onTrackRatio * 60) + (resolvedRatio * 40));
}

export function calculateSettingsModuleScore(profile: ProfileEntry | null) {
    if (!profile) return 0;
    let score = 0;
    if (profile.telegram_bot_token) score += 50;
    if (profile.notifications_enabled) score += 50;
    return roundScore(score);
}

export function calculateOverallLifeScore(moduleScores: Record<string, number>) {
    const values = Object.values(moduleScores);
    if (values.length === 0) return 0;
    return roundScore(values.reduce((sum, score) => sum + score, 0) / values.length);
}

export function getDashboardAreaScores(moduleScores: {
    mental: number;
    physical: number;
    finance: number;
    skills: number;
    goals: number;
    reminders: number;
    journey: number;
    settings: number;
}): DashboardAreaScore[] {
    return [
        { area: 'Mental', icon: '🧠', score: moduleScores.mental, color: '#8b5cf6' },
        { area: 'Physical', icon: '💪', score: moduleScores.physical, color: '#10b981' },
        { area: 'Finance', icon: '💰', score: moduleScores.finance, color: '#f59e0b' },
        { area: 'Skills', icon: '📚', score: moduleScores.skills, color: '#3b82f6' },
        { area: 'Goals', icon: '🎯', score: moduleScores.goals, color: '#ef4444' },
        { area: 'Reminders', icon: '📅', score: moduleScores.reminders, color: '#f97316' },
        { area: 'Journey', icon: '📓', score: moduleScores.journey, color: '#ec4899' },
        { area: 'Settings', icon: '⚙️', score: moduleScores.settings, color: '#14b8a6' },
    ];
}

export function buildSystemActivityFeed(logs: ActivityItem[], limit = 20) {
    // Return unique logs sorted by time (logs are already sorted DESC in API/Page)
    const uniqueLogs: ActivityItem[] = [];
    const usedKeys = new Set<string>();

    logs.forEach((log) => {
        const key = log.id || `${log.area}-${log.action}-${log.time}`;
        if (!usedKeys.has(key) && uniqueLogs.length < limit) {
            uniqueLogs.push(log);
            usedKeys.add(key);
        }
    });

    return uniqueLogs;
}
