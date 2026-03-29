import { SupabaseClient } from '@supabase/supabase-js';

// Centralised internal utility called by API routes to calculate and persist dynamic Life Scores
// Based on real-time data logged across all feature modules.

/**
 * Persists the computed score into the life_scores table.
 */
async function saveScore(supabase: SupabaseClient, userId: string, area: string, score: number) {
    // Math.max/min to ensure score is strictly within 0 - 100 bounds as per schema
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    // UPSERT behavior: if a score for today already exists, update it. If not, insert it.
    const today = new Date().toLocaleDateString('en-CA');

    // We try to update first
    const { data: existing } = await supabase
        .from('life_scores')
        .select('id')
        .eq('user_id', userId)
        .eq('area', area)
        .eq('calculated_at', today)
        .single();

    if (existing) {
        await supabase
            .from('life_scores')
            .update({ score: finalScore })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('life_scores')
            .insert([{
                user_id: userId,
                area: area,
                score: finalScore,
                calculated_at: today
            }]);
    }
}

/**
 * Calculates score based on mood, stress (inverted), and focus.
 * All are out of 10. Max theoretical score: (10 + (11 - 1) + 10) / 3 * 10 = 100.
 */
export async function calculateMentalScore(supabase: SupabaseClient, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
        .from('mental_health')
        .select('mood, stress_level, focus_level')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

    if (!data || data.length === 0) return;

    // Average all entries for the day
    let totalMood = 0, totalStress = 0, totalFocus = 0;
    data.forEach(log => {
        totalMood += log.mood ?? 5;
        totalStress += log.stress_level ?? 5;
        totalFocus += log.focus_level ?? 5;
    });

    const avgMood = totalMood / data.length;
    const avgStress = totalStress / data.length;
    const avgFocus = totalFocus / data.length;

    // Invert stress (10 stress = 0 points, 0 stress = 10 points)
    const invertedStress = 10 - avgStress;

    const dailyScore = ((avgMood + invertedStress + avgFocus) / 3) * 10;
    await saveScore(supabase, userId, 'mental', dailyScore);
}

/**
 * Calculates score based on sleep (8h target), water (2L target), steps, and workout execution.
 */
export async function calculatePhysicalScore(supabase: SupabaseClient, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
        .from('physical_health')
        .select('sleep_hours, workout_completed, water_intake_ml, steps')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

    if (!data || data.length === 0) return;

    // Aggregate for the day
    let totalSleep = 0, totalWater = 0, totalSteps = 0, hasWorkout = false;
    data.forEach(log => {
        totalSleep += Number(log.sleep_hours) || 0;
        totalWater += log.water_intake_ml || 0;
        totalSteps += log.steps || 0;
        if (log.workout_completed) hasWorkout = true;
    });

    // Calculate component scores (each out of 25)
    const sleepScore = Math.min(25, (totalSleep / 8) * 25);
    const waterScore = Math.min(25, (totalWater / 2000) * 25);
    const stepsScore = Math.min(25, (totalSteps / 10000) * 25);
    const workoutScore = hasWorkout ? 25 : 0;

    const dailyScore = sleepScore + waterScore + stepsScore + workoutScore;
    await saveScore(supabase, userId, 'physical', dailyScore);
}

/**
 * Calculates financial health for the current month based on Income vs Expense ratio.
 */
export async function calculateFinanceScore(supabase: SupabaseClient, userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startStr = startOfMonth.toISOString().split('T')[0];

    const { data } = await supabase
        .from('finance')
        .select('amount, transaction_type')
        .eq('user_id', userId)
        .gte('transaction_date', startStr);

    if (!data) return;

    let income = 0;
    let expense = 0;

    data.forEach(txn => {
        if (txn.transaction_type === 'income') income += Number(txn.amount);
        else if (txn.transaction_type === 'expense') expense += Number(txn.amount);
    });

    let score = 50; // Base score

    if (income > 0) {
        // If expenses are 0, score is 100. If expenses = income, score is 50. If expenses > income, score drops.
        const ratio = expense / income;
        if (ratio === 0) score = 100;
        else if (ratio <= 0.5) score = 90;
        else if (ratio <= 0.8) score = 75;
        else if (ratio <= 1.0) score = 50;
        else score = Math.max(0, 50 - ((ratio - 1) * 50));
    } else if (expense > 0) {
        // Only expenses, no income = 0 score
        score = 0;
    }

    await saveScore(supabase, userId, 'finance', score);
}

/**
 * Calculates score based on hours invested in skills over the last 7 days. Target: 10 hours/week.
 */
export async function calculateSkillsScore(supabase: SupabaseClient, userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
        .from('skill_logs')
        .select('hours_invested')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo);

    let totalHours = 0;
    data?.forEach(log => {
        totalHours += Number(log.hours_invested) || 0;
    });

    // 10 hours a week = 100 score
    const score = Math.min(100, (totalHours / 10) * 100);
    await saveScore(supabase, userId, 'skills', score);
}

/**
 * Calculates score based on the percentage of active vs completed goals.
 */
export async function calculateGoalsScore(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
        .from('goals')
        .select('status')
        .eq('user_id', userId);

    if (!data || data.length === 0) {
        await saveScore(supabase, userId, 'goals', 0);
        return;
    }

    const total = data.length;
    const completed = data.filter(g => g.status === 'completed').length;

    // Score is simply the percentage of completed goals.
    const score = (completed / total) * 100;
    await saveScore(supabase, userId, 'goals', score);
}

/**
 * Calculates score based on today's completed tasks and focus sessions.
 */
export async function calculateProductivityScore(supabase: SupabaseClient, userId: string) {
    const today = new Date().toLocaleDateString('en-CA');
    const startOfDay = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

    // We want to combine data from the tasks table (Task Done count) and productivity table (Focus Session length)

    const { count: tasksDone } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Completed')
        .gte('updated_at', startOfDay);

    const { data: focusSessions } = await supabase
        .from('productivity')
        .select('focus_hours')
        .eq('user_id', userId)
        .gte('created_at', startOfDay);

    let totalFocusHours = 0;
    focusSessions?.forEach(f => {
        totalFocusHours += Number(f.focus_hours) || 0;
    });

    // Calculate component scores
    // Target: 5 tasks a day = 50 points
    const taskScore = Math.min(50, ((tasksDone || 0) / 5) * 50);

    // Target: 4 focus hours a day = 50 points
    const focusScore = Math.min(50, (totalFocusHours / 4) * 50);

    const score = taskScore + focusScore;
    await saveScore(supabase, userId, 'productivity', score);
}
