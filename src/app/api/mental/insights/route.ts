import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Mood Trend (Last 7 days vs Previous 7 days)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: recentMoods } = await supabase
            .from('mental_health')
            .select('mood')
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo.toISOString());

        const { data: previousMoods } = await supabase
            .from('mental_health')
            .select('mood')
            .eq('user_id', user.id)
            .gte('created_at', fourteenDaysAgo.toISOString())
            .lt('created_at', sevenDaysAgo.toISOString());

        const avgRecent = recentMoods?.length ? recentMoods.reduce((acc, curr) => acc + curr.mood, 0) / recentMoods.length : 0;
        const avgPrevious = previousMoods?.length ? previousMoods.reduce((acc, curr) => acc + curr.mood, 0) / previousMoods.length : 0;

        let moodTrend = 0;
        if (avgPrevious > 0) {
            moodTrend = ((avgRecent - avgPrevious) / avgPrevious) * 100;
        }

        // 2. Fetch Sleep-Focus Correlation
        const { data: mentalData } = await supabase
            .from('mental_health')
            .select('focus_level, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const { data: physicalData } = await supabase
            .from('physical_health')
            .select('sleep_hours, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        // Simple correlation check: find days where sleep < 6 and focus < 5
        let sleepFocusAlert = false;
        if (mentalData && physicalData) {
            // Check if latest entry shows the pattern
            if (Number(physicalData[0]?.sleep_hours) < 6 && Number(mentalData[0]?.focus_level) < 5) {
                sleepFocusAlert = true;
            }
        }

        // 3. Daily Assessment prioritize TODAY
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const { data: todayLogs } = await supabase
            .from('mental_health')
            .select('mood, stress_level, focus_level')
            .eq('user_id', user.id)
            .gte('created_at', startOfToday.toISOString());

        const { data: recentLogs } = await supabase
            .from('mental_health')
            .select('mood, stress_level, focus_level')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        const isTodayLogged = todayLogs && todayLogs.length > 0;
        const dataSet = isTodayLogged ? todayLogs : recentLogs;
        const avgMood = dataSet?.length ? dataSet.reduce((acc: number, curr: any) => acc + curr.mood, 0) / dataSet.length : 0;

        let moodStatus = 'neutral';
        let moodRecommendation = 'Maintain your checking-in routine to identify patterns.';
        let systemStatusLabel = 'System Stable';
        let systemStatusMessage = 'No critical sleep-focus correlations detected.';

        const timeContext = isTodayLogged ? "Today's Outlook" : "Recent Status";

        if (avgMood >= 8) {
            moodStatus = 'optimal';
            moodRecommendation = `${timeContext}: You are in a high-performance flow state. Keep it up!`;
            systemStatusLabel = 'System Optimal';
            systemStatusMessage = 'Emotional and cognitive systems are performing at peak levels.';
        } else if (avgMood <= 4 && dataSet?.length) {
            moodStatus = 'warning';
            moodRecommendation = `${timeContext}: High burnout risk detected. Recommend restorative rest.`;
            systemStatusLabel = 'Action Required';
            systemStatusMessage = 'System under heavy stress. Critical recovery protocols recommended.';
        } else if (avgMood > 4 && avgMood < 8) {
            moodStatus = 'stable';
            moodRecommendation = `${timeContext}: Emotional equilibrium is steady. Good baseline.`;
            systemStatusLabel = 'System Stable';
            systemStatusMessage = 'Core psychological systems are operating within normal parameters.';
        }

        // Override system message if sleep-focus alert is triggered
        if (sleepFocusAlert) {
            systemStatusLabel = 'System Disturbed';
            systemStatusMessage = 'Sleep deprivation is significantly impacting cognitive focus levels.';
        }

        return NextResponse.json({
            moodTrend: moodTrend.toFixed(1),
            sleepFocusAlert,
            moodStatus,
            moodRecommendation,
            systemStatusLabel,
            systemStatusMessage
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
