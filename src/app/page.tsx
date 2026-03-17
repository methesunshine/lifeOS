import { createClient } from '@/lib/supabase-server';
import styles from './page.module.css';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardReminders from '@/components/DashboardReminders';
import Link from 'next/link';
import RecentActivity from '@/components/RecentActivity';
import JourneyNoteCard from '@/components/JourneyNoteCard';
import SystemsPerformanceChart from '@/components/SystemsPerformanceChart';

function getLifeScoreStatus(score: number) {
  if (score >= 90) return { label: 'Elite', color: 'var(--indigo)' };
  if (score >= 75) return { label: 'Optimal', color: 'var(--green)' };
  if (score >= 60) return { label: 'Good', color: 'var(--primary)' };
  if (score >= 40) return { label: 'Fair', color: 'var(--orange)' };
  return { label: 'Critical', color: 'var(--red)' };
}

function getMentalStatus(mood: number, stress: number) {
  if (mood >= 8 && stress <= 3) return { label: 'Optimal', color: 'var(--green)' };
  if (mood >= 5 && stress <= 5) return { label: 'Stable', color: 'var(--primary)' };
  if (mood < 4 || stress > 7) return { label: 'Critical', color: 'var(--red)' };
  return { label: 'Neutral', color: 'var(--orange)' };
}

function getJourneyStatus(progress: number, overdue: number, totalTasks: number, hasLog: boolean, totalNotes: number, totalStickies: number) {
  // If literally nothing exists in the journey, don't show any status
  if (totalTasks === 0 && !hasLog && totalNotes === 0 && totalStickies === 0 && overdue === 0) {
    return null;
  }

  if (overdue > 0) return { label: 'Attention Required', color: 'var(--red)' };
  if (progress >= 100) return { label: 'Objectives Synchronized', color: 'var(--indigo)' };
  if (progress >= 75) return { label: 'High Momentum', color: 'var(--green)' };
  if (progress >= 40) return { label: 'Active Progress', color: 'var(--primary)' };

  // Specific Low Progress states
  if (progress > 0) {
    if (totalTasks > 0 && !hasLog && totalNotes === 0) return { label: 'Objectives Pending', color: 'var(--orange)' };
    if (totalTasks === 0 && hasLog) return { label: 'Static Baseline', color: 'var(--orange)' };
    if (totalTasks === 0 && totalNotes > 0) return { label: 'Fragmented Focus', color: 'var(--orange)' };
    return { label: 'System Initialized', color: 'var(--orange)' };
  }

  return { label: 'System Idle', color: 'var(--text-muted)' };
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should be handled by middleware, but safety check
    return <div>Redirecting...</div>;
  }

  const today = new Date().toLocaleDateString('en-CA');

  // Default score variables for all areas to prevent RefereneErrors
  let journeyProgress = 0;
  let mentalScore = 0;
  let physicalScore = 0;
  let financeScore = 0;
  let skillsScore = 0;
  let goalsScore = 0;
  let completedGoalsList = 0;
  let totalGoalsList = 0;

  let dashboardData: any = {
    scores: {} as any,
    areaScores: [] as any[],
    recentLogs: [] as any[],
    vitals: {
      overallLifeScore: 0,
      lifeScoreTrend: 'neutral',
      trendValue: 0,
      totalFocusHours: 0,
      tasksToday: 0,
      pendingTasks: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      journeyProgress: 0,
      totalNotes: 0,
      totalStickies: 0,
      overdueTasksCount: 0,
      hasLogToday: false,
      latestMood: '-',
      latestGratitude: '',
      latestStress: 0,
      latestFocus: 0,
      latestNote: 'No recent notes',
      recentNotes: [] as any[],
      recentTasks: [] as any[],
      recentDailyLogs: [] as any[],
      latestJourneyActivity: null as any,
    }
  };

  try {
    // Replicating API logic directly in Server Component for robustness
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [scores, pastScoresData, mental, physical, finance, skills, goals, notes, tasks, dailyLogs, productivity, stickies] = await Promise.all([
      supabase.from('life_scores').select('area, score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }),
      supabase.from('life_scores').select('area, score, calculated_at').eq('user_id', user.id).lte('calculated_at', sevenDaysAgo).order('calculated_at', { ascending: false }),
      supabase.from('mental_health').select('mood, stress_level, focus_level, gratitude_note, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('physical_health').select('workout_completed, sleep_hours, water_intake_ml, steps, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('finance').select('amount, category, transaction_type, transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(3),
      supabase.from('skill_logs').select('skill_id, hours_invested, created_at, skills(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('goals').select('title, status, created_at, updated_at, note').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
      supabase.from('notes').select('note_id, title, category, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('title, status, due_date, priority, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('daily_logs').select('mood, date, summary, created_at').eq('user_id', user.id).order('date', { ascending: false }).limit(3),
      supabase.from('productivity').select('tasks_completed, focus_hours, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('sticky_notes').select('sticky_id, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const recentScores: Record<string, number> = {};
    scores.data?.forEach(s => {
      if (!(s.area in recentScores)) recentScores[s.area] = s.score;
    });

    const combinedActivity: any[] = [];
    mental.data?.forEach(d => combinedActivity.push({ area: 'Mental', action: 'Mood Synced', detail: `State: ${d.mood}/10`, time: d.created_at, icon: '🧠' }));
    physical.data?.forEach(d => combinedActivity.push({ area: 'Physical', action: d.workout_completed ? 'Protocol Done' : 'Stats Logged', detail: d.workout_completed ? 'Workout complete' : `${d.sleep_hours}h sleep`, time: d.created_at, icon: '💪' }));
    finance.data?.forEach(d => combinedActivity.push({ area: 'Finance', action: d.transaction_type === 'expense' ? 'Debit' : 'Credit', detail: `${d.transaction_type === 'expense' ? '-' : '+'}₹${d.amount}`, time: d.transaction_date, icon: '💰' }));
    skills.data?.forEach((d: any) => combinedActivity.push({ area: 'Skills', action: 'Practice Done', detail: `${d.skills?.name || 'Skill'} • ${d.hours_invested}h`, time: d.created_at, icon: '📚' }));
    goals.data?.forEach(d => {
      combinedActivity.push({ area: 'Goals', action: d.status === 'completed' ? 'Mission Success' : 'Objective Logged', detail: d.title, time: d.created_at, icon: '🎯' });
      if (d.note) {
        combinedActivity.push({ area: 'Goals', action: 'Mission Note', detail: 'Takeaway logged', time: d.updated_at || d.created_at, icon: '📝' });
      }
    });
    notes.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: 'Note Written', detail: d.title, time: d.updated_at, icon: '📓', id: d.note_id }));
    tasks.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: d.status === 'Completed' ? 'Task Done' : 'Task Added', detail: d.title, time: d.created_at || new Date().toISOString(), icon: d.status === 'Completed' ? '✅' : '⏳' }));
    stickies.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: 'Sticky Note', detail: d.content?.substring(0, 60) || 'Sticky note added', time: d.created_at, icon: '📌' }));
    dailyLogs.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: 'Daily Reflection', detail: d.summary ? d.summary.substring(0, 60) : `Mood logged: ${d.mood}/10`, time: d.created_at || (d.date + 'T23:59:59'), icon: '📅' }));
    productivity.data?.forEach(d => combinedActivity.push({ area: 'Productivity', action: 'System Active', detail: `${d.focus_hours}h focus • ${d.tasks_completed} tasks`, time: d.created_at, icon: '⚡' }));

    combinedActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const overallLifeScore = Object.values(recentScores).length > 0
      ? Math.round(Object.values(recentScores).reduce((a: number, b: number) => a + b, 0) / Object.values(recentScores).length)
      : 0;

    const pastScores: Record<string, number> = {};
    pastScoresData.data?.forEach((s: any) => {
      if (!(s.area in pastScores)) pastScores[s.area] = s.score;
    });

    const pastLifeScore = Object.values(pastScores).length > 0
      ? Math.round(Object.values(pastScores).reduce((a: number, b: number) => a + b, 0) / Object.values(pastScores).length)
      : 0;

    let trendValue = overallLifeScore - pastLifeScore;
    let lifeScoreTrend = trendValue > 0 ? 'positive' : trendValue < 0 ? 'negative' : 'neutral';

    if (Object.values(pastScores).length === 0) {
      trendValue = 0;
      lifeScoreTrend = 'neutral';
    }

    const totalFocusHours = productivity.data?.reduce((acc, curr) => acc + Number(curr.focus_hours), 0) || 0;
    const { count: totalTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { count: completedTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Completed');
    const { count: overdueTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'Completed').lt('due_date', today);
    const { count: overdueRemindersCount } = await supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending').lt('remind_at', new Date().toISOString());

    const { count: totalNotes } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { count: totalStickies } = await supabase.from('sticky_notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { data: todayLog } = await supabase.from('daily_logs').select('log_id').eq('user_id', user.id).eq('date', today).single();

    const pendingTasks = (totalTasksCount || 0) - (completedTasksCount || 0);
    const hasLogToday = !!todayLog;
    const totalOverdue = (overdueTasksCount || 0) + (overdueRemindersCount || 0);

    // Consolidated Journey Activity Score (0-100)
    // Adjusted: If there are tasks, progress is heavily weighted on completion.
    // If no tasks exist, it's based on log/notes.
    const taskProgress = totalTasksCount && totalTasksCount > 0 ? (completedTasksCount || 0) / totalTasksCount : (totalTasksCount === 0 ? 1 : 0);
    const logFactor = hasLogToday ? 1 : 0;
    const creationFactor = (totalNotes || 0) > 0 || (totalStickies || 0) > 0 ? 1 : 0;

    journeyProgress = Math.round((taskProgress * 0.5 + logFactor * 0.25 + creationFactor * 0.25) * 100);

    // ── 7-Area performance scores (today's snapshot) ──
    const latestMental = mental.data?.[0];
    mentalScore = latestMental
      ? Math.min(100, Math.max(0, Math.round((Number(latestMental.mood) / 10) * 60 + (Number(latestMental.focus_level) / 10) * 25 - (Number(latestMental.stress_level) / 10) * 15 + 15)))
      : 0;

    const latestPhysical = physical.data?.[0];
    physicalScore = latestPhysical
      ? Math.min(100, Math.max(0, Math.round(Math.min(10, Number(latestPhysical.sleep_hours) || 0) * 5 + (latestPhysical.workout_completed ? 30 : 0) + Math.min(20, Math.round((Number(latestPhysical.water_intake_ml) || 0) / 100)))))
      : 0;

    financeScore = Math.min(100, (finance.data?.length || 0) * 25);

    const skillsHours = skills.data?.reduce((a: number, d: any) => a + (Number(d.hours_invested) || 0), 0) || 0;
    skillsScore = Math.min(100, Math.round(skillsHours * 12));

    totalGoalsList = goals.data?.length || 0;
    completedGoalsList = goals.data?.filter((g: any) => g.status === 'completed').length || 0;
    goalsScore = totalGoalsList > 0 ? Math.round((completedGoalsList / totalGoalsList) * 100) : 0;

    const areaScores = [
      { area: 'Mental', icon: '🧠', score: mentalScore, color: '#8b5cf6' },
      { area: 'Physical', icon: '💪', score: physicalScore, color: '#10b981' },
      { area: 'Finance', icon: '💰', score: financeScore, color: '#f59e0b' },
      { area: 'Skills', icon: '📚', score: skillsScore, color: '#3b82f6' },
      { area: 'Goals', icon: '🎯', score: goalsScore, color: '#ef4444' },
      { area: 'Journey', icon: '📓', score: journeyProgress, color: '#ec4899' },
    ];

    // Helper to calculate trend string
    const getTrend = (current: number, areaName: string) => {
      const past = pastScores[areaName] || 0;
      const diff = current - past;
      if (diff === 0) return '+0%';
      return `${diff > 0 ? '+' : ''}${diff}%`;
    };

    dashboardData = {
      scores: recentScores,
      areaScores,
      recentLogs: combinedActivity.slice(0, 8),
      vitals: {
        overallLifeScore,
        lifeScoreTrend,
        trendValue,
        totalFocusHours,
        tasksToday: tasks.data?.filter(t => t.due_date === today).length || 0,
        pendingTasks,
        completedTasksCount: completedTasksCount || 0,
        totalTasksCount: totalTasksCount || 0,
        journeyProgress: journeyProgress || 0,
        totalNotes: totalNotes || 0,
        totalStickies: totalStickies || 0,
        overdueTasksCount: totalOverdue,
        hasLogToday: !!hasLogToday,
        latestMood: mental.data?.[0]?.mood ?? '-',
        latestGratitude: mental.data?.[0]?.gratitude_note || '',
        latestStress: mental.data?.[0]?.stress_level || 0,
        latestFocus: mental.data?.[0]?.focus_level || 0,
        latestNote: notes.data?.[0]?.title || 'No recent notes',
        recentNotes: notes.data?.slice(0, 5) || [],
        recentTasks: tasks.data?.slice(0, 5) || [],
        recentDailyLogs: dailyLogs.data?.slice(0, 3) || [],
        latestJourneyActivity: combinedActivity.find(a => a.area === 'Journey') || null,
      },
      areas: [
        { id: 'journey', name: 'Life Journey', score: journeyProgress, trend: getTrend(journeyProgress, 'Journey'), color: '#6366f1', icon: '📓', status: `${tasks.data?.filter(t => t.due_date === today).length || 0} Tasks Today` },
        { id: 'mental', name: 'Mental Health', score: mentalScore, trend: getTrend(mentalScore, 'Mental'), color: '#a855f7', icon: '🧠', status: mentalScore > 80 ? 'Optimal' : 'Active' },
        { id: 'physical', name: 'Physical Health', score: physicalScore, trend: getTrend(physicalScore, 'Physical'), color: '#ef4444', icon: '💪', status: physicalScore > 70 ? 'Optimal' : 'Improving' },
        { id: 'finance', name: 'Finance', score: financeScore, trend: getTrend(financeScore, 'Finance'), color: '#10b981', icon: '💰', status: 'Stable' },
        { id: 'skills', name: 'Skills & Study', score: skillsScore, trend: getTrend(skillsScore, 'Skills'), color: '#3b82f6', icon: '📚', status: 'In Progress' },
        { id: 'goals', name: 'Goals', score: goalsScore, trend: getTrend(goalsScore, 'Goals'), color: '#f59e0b', icon: '🎯', status: `${completedGoalsList}/${totalGoalsList} Done` },
      ]
    };
  } catch (e) {
    console.error('Direct dashboard data load failed:', e);
  }

  const areas = dashboardData.areas || [
    { id: 'journey', name: 'Life Journey', score: 0, trend: '+0%', color: '#6366f1', icon: '📓', status: '0 Tasks Today' },
    { id: 'mental', name: 'Mental Health', score: 0, trend: '+0%', color: '#a855f7', icon: '🧠', status: 'Active' },
    { id: 'physical', name: 'Physical Health', score: 0, trend: '+0%', color: '#ef4444', icon: '💪', status: 'Improving' },
    { id: 'finance', name: 'Finance', score: 0, trend: '+0%', color: '#10b981', icon: '💰', status: 'Stable' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.welcome}>
          <h1>Logic Center</h1>
          <p>Welcome back, {user?.email?.split('@')[0]}. All systems are currently active.</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.dateRange}>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <Link href="/mental">
            <button className="primary-btn">Initialize Log</button>
          </Link>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <section className={styles.widgetsRow}>
          <div className="card glass">
            <p className={styles.label}>Overall Life Score</p>
            <div className={styles.bigScore}>
              <span className={styles.scoreNum}>{dashboardData.vitals.overallLifeScore}</span>
              <span className={styles.scoreTrend} style={{ color: dashboardData.vitals.lifeScoreTrend === 'positive' ? 'var(--green)' : dashboardData.vitals.lifeScoreTrend === 'negative' ? 'var(--red)' : 'var(--text-muted)' }}>
                {dashboardData.vitals.lifeScoreTrend === 'positive' ? `↑ ${dashboardData.vitals.trendValue}` : dashboardData.vitals.lifeScoreTrend === 'negative' ? `↓ ${Math.abs(dashboardData.vitals.trendValue)}` : '− No Change'}
              </span>
            </div>
            <div className={styles.progressLabel}>
              Status: <span style={{ color: getLifeScoreStatus(dashboardData.vitals.overallLifeScore).color, fontWeight: '800' }}>{getLifeScoreStatus(dashboardData.vitals.overallLifeScore).label}</span> <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>|</span> Aggregated from 7 Core Areas
            </div>
            <div className={styles.miniBar}>
              <div style={{ width: `${dashboardData.vitals.overallLifeScore}%`, background: getLifeScoreStatus(dashboardData.vitals.overallLifeScore).color }}></div>
            </div>
          </div>

          <div className="card glass">
            <p className={styles.label}>Journey Tracker</p>
            <div className={styles.bigScore} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div>
                <span className={styles.scoreNum}>{dashboardData.vitals.totalTasksCount}</span>
                <span className={styles.scoreDenom}> Tasks</span>
              </div>
              <div style={{ width: '1px', height: '2rem', background: 'var(--border)' }}></div>
              <div>
                <span className={styles.scoreNum}>{dashboardData.vitals.totalNotes}</span>
                <span className={styles.scoreDenom}> Notes</span>
              </div>
            </div>
            <div className={styles.progressLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Active Objectives & Logs</span>
              {(() => {
                const status = getJourneyStatus(
                  dashboardData.vitals.journeyProgress,
                  dashboardData.vitals.overdueTasksCount,
                  dashboardData.vitals.totalTasksCount,
                  dashboardData.vitals.hasLogToday,
                  dashboardData.vitals.totalNotes,
                  dashboardData.vitals.totalStickies
                );
                return status ? (
                  <span style={{ fontSize: '0.85rem', color: status.color, fontWeight: '600' }}>
                    {status.label}
                  </span>
                ) : null;
              })()}
            </div>
            <div className={styles.miniBar}>
              <div style={{ width: `${dashboardData.vitals.journeyProgress}%`, background: '#6366f1' }}></div>
            </div>
          </div>

          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p className={styles.label} style={{ margin: 0 }}>Daily Reflection</p>
              {dashboardData.vitals.latestMood !== '-' && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: getMentalStatus(Number(dashboardData.vitals.latestMood), dashboardData.vitals.latestStress).color
                }}>
                  {getMentalStatus(Number(dashboardData.vitals.latestMood), dashboardData.vitals.latestStress).label}
                </span>
              )}
            </div>
            <div className={styles.bigScore}>
              <span className={styles.scoreNum}>{dashboardData.vitals.latestMood}<span className={styles.scoreDenom}>/10</span></span>
            </div>

            {dashboardData.vitals.latestGratitude && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem', fontStyle: 'italic', opacity: 0.9 }}>
                " {dashboardData.vitals.latestGratitude.length > 60 ? dashboardData.vitals.latestGratitude.substring(0, 60) + '...' : dashboardData.vitals.latestGratitude} "
              </div>
            )}

            <div className={styles.progressLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Latest Mood Score</span>
              <span style={{ opacity: 0.7 }}>⚡ {dashboardData.vitals.latestStress} stress | 🎯 {dashboardData.vitals.latestFocus} focus</span>
            </div>
            <div className={styles.miniBar}>
              <div style={{
                width: `${Number(dashboardData.vitals.latestMood) * 10}%`,
                background: getMentalStatus(Number(dashboardData.vitals.latestMood), dashboardData.vitals.latestStress).color
              }}></div>
            </div>
          </div>

          <div className="card glass">
            <p className={styles.label}>Latest Journey Activity</p>
            {dashboardData.vitals.latestJourneyActivity ? (
              <div className={styles.milestone}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{dashboardData.vitals.latestJourneyActivity.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {dashboardData.vitals.latestJourneyActivity.action}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.15rem' }}>
                      {dashboardData.vitals.latestJourneyActivity.detail}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(dashboardData.vitals.latestJourneyActivity.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            ) : (
              <div className={styles.milestone}>
                <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>No recent activity</h3>
                <p>Start writing notes or adding tasks in Journey</p>
              </div>
            )}
          </div>
        </section>

        <section className={styles.draftRow}>
          <JourneyNoteCard />
          <DashboardAlerts userId={user?.id} areaScores={dashboardData.areaScores} />
          <section className={`${styles.areaDeck} card glass`}>
            <div className={styles.cardHeader}>
              <h2>Integrity Snapshot</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Area Optimization Metrics</p>
            </div>
            <div className={styles.areaScroll}>
              {areas.map((area: any) => (
                <Link href={`/${area.id}`} key={area.id} className={styles.areaListItem}>
                  <div className={styles.areaListItemHead}>
                    <div className={styles.areaListItemIcon} style={{ background: `${area.color}20`, color: area.color }}>
                      {area.icon}
                    </div>
                    <div className={styles.areaListItemInfo}>
                      <h3>{area.name}</h3>
                      <span className={styles.statusBadge}>{area.status}</span>
                    </div>
                  </div>
                  <div className={styles.areaStats}>
                    <div className={styles.scoreLarge} style={{ fontSize: '1.25rem' }}>{area.score}</div>
                    <div className={styles.trendSmall} style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>
                      {area.trend}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section className={`${styles.logsCard} card glass`}>
            <RecentActivity initialLogs={dashboardData.recentLogs} />
          </section>
        </section>

        <div className={styles.contentLayout}>
          <div className={styles.mainColumn}>
            <section className={`${styles.statsCard} card`}>
              <div className={styles.cardHeader}>
                <h2>Systems Performance</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Area Performance Snapshot</p>
              </div>
              <SystemsPerformanceChart areaScores={dashboardData.areaScores} />
            </section>

          </div>

          <aside className={styles.sideColumn}>
            <DashboardReminders />
          </aside>
        </div>
      </div>
    </div>
  );
}
