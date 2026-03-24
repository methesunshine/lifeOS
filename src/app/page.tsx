import { createClient } from '@/lib/supabase-server';
import styles from './page.module.css';
import DashboardAlerts from '@/components/DashboardAlerts';

import Link from 'next/link';
import RecentActivity from '@/components/RecentActivity';
import JourneyNoteCard from '@/components/JourneyNoteCard';
import SystemsPerformanceChart from '@/components/SystemsPerformanceChart';
import DashboardTelegramSync from '@/components/DashboardTelegramSync';
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

// ... (skipping types for brevity, will apply carefully to lines 9-22 range)

type ActivityItem = {
  area: string;
  action: string;
  detail: string;
  time: string;
  icon: string;
  id?: string;
};

type AreaCard = {
  id: string;
  name: string;
  score: number;
  trend: string;
  color: string;
  icon: string;
  status: string;
};

type DashboardData = {
  scores: Record<string, number>;
  areaScores: ReturnType<typeof getDashboardAreaScores>;
  recentLogs: ActivityItem[];
  vitals: {
    overallLifeScore: number;
    lifeScoreTrend: string;
    trendValue: number;
    totalFocusHours: number;
    tasksToday: number;
    pendingTasks: number;
    completedTasksCount: number;
    totalTasksCount: number;
    journeyProgress: number;
    totalNotes: number;
    totalStickies: number;
    overdueTasksCount: number;
    hasLogToday: boolean;
    latestMood: number | string;
    latestReflection: string;
    latestReflectionTime: string;
    latestNote: string;
    recentNotes: unknown[];
    recentTasks: unknown[];
    recentDailyLogs: unknown[];
    latestJourneyActivity: ActivityItem | null;
  };
  areas: AreaCard[];
};

type SkillActivityRow = {
  skills?: Array<{ name?: string }> | null;
  hours_invested?: number | string | null;
  created_at: string;
};

function getLifeScoreStatus(score: number) {
  if (score >= 90) return { label: 'Elite', color: 'var(--indigo)' };
  if (score >= 75) return { label: 'Optimal', color: 'var(--green)' };
  if (score >= 60) return { label: 'Good', color: 'var(--primary)' };
  if (score >= 40) return { label: 'Fair', color: 'var(--orange)' };
  return { label: 'Critical', color: 'var(--red)' };
}

function getJourneyStatus(progress: number, overdue: number, totalTasks: number, hasLog: boolean, totalNotes: number, totalStickies: number) {
  if (totalTasks === 0 && !hasLog && totalNotes === 0 && totalStickies === 0 && overdue === 0) {
    return null;
  }

  if (overdue > 0) return { label: 'Attention Required', color: 'var(--red)' };
  if (progress >= 100) return { label: 'Objectives Synchronized', color: 'var(--indigo)' };
  if (progress >= 75) return { label: 'High Momentum', color: 'var(--green)' };
  if (progress >= 40) return { label: 'Active Progress', color: 'var(--primary)' };

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
    return <div>Redirecting...</div>;
  }

  const today = new Date().toLocaleDateString('en-CA');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let dashboardData: DashboardData = {
    scores: {},
    areaScores: [],
    recentLogs: [],
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
      latestReflection: '',
      latestReflectionTime: '',
      latestNote: 'No recent notes',
      recentNotes: [],
      recentTasks: [],
      recentDailyLogs: [],
      latestJourneyActivity: null,
    },
    areas: []
  };

  try {
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
      supabase.from('profiles').select('telegram_bot_token, telegram_chat_id, notifications_enabled, updated_at').eq('user_id', user.id).single(),
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

    const overallLifeScore = calculateOverallLifeScore(moduleScores);
    const areaScores = getDashboardAreaScores(moduleScores);
    const totalOverdue = (overdueTasksCount || 0) + (overdueRemindersCount || 0);
    const pendingTasks = (totalTasksCount || 0) - (completedTasksCount || 0);
    const pendingRemindersCount = reminders.data?.filter((item) => item.status === 'pending' || item.status === 'snoozed').length || 0;
    const completedRemindersCount = reminders.data?.filter((item) => item.status === 'completed').length || 0;

    const latestDailyLog = dailyLogs.data?.[0];
    const latestReflection = latestDailyLog?.summary || 'No reflection logged yet.';
    const latestReflectionTime = latestDailyLog?.created_at || '';

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

    // 3. Sync summary items for each area (keeping these as they are useful snapshots)
    combinedActivity.push({
      area: 'Reminders',
      action: overdueRemindersCount ? 'Reminder Attention Needed' : 'Reminder Status Synced',
      detail: `${pendingRemindersCount} active • ${completedRemindersCount} completed • ${overdueRemindersCount || 0} overdue`,
      time: reminders.data?.[0]?.created_at || new Date().toISOString(),
      icon: '📅',
      id: 'reminders-summary'
    });

    combinedActivity.push({
      area: 'Settings',
      action: profile.data?.notifications_enabled ? 'Settings Synced' : 'Settings Review Needed',
      detail: profile.data?.telegram_bot_token ? 'Telegram Bot connected' : 'Telegram Bot token missing',
      time: profile.data?.updated_at || new Date().toISOString(),
      icon: '⚙️',
      id: 'settings-summary'
    });

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

    const areas = [
      { id: 'mental', name: 'Mental Health', score: moduleScores.mental, trend: 'Live', color: '#a855f7', icon: '🧠', status: moduleScores.mental >= 75 ? 'Optimal' : 'Active' },
      { id: 'physical', name: 'Physical Health', score: moduleScores.physical, trend: 'Live', color: '#ef4444', icon: '💪', status: moduleScores.physical >= 75 ? 'Optimal' : 'Improving' },
      { id: 'finance', name: 'Finance', score: moduleScores.finance, trend: 'Live', color: '#10b981', icon: '💰', status: moduleScores.finance >= 60 ? 'Stable' : 'Needs Attention' },
      { id: 'skills', name: 'Skills', score: moduleScores.skills, trend: 'Live', color: '#3b82f6', icon: '📚', status: moduleScores.skills >= 60 ? 'On Track' : 'Practice Needed' },
      { id: 'goals', name: 'Goals', score: moduleScores.goals, trend: 'Live', color: '#f59e0b', icon: '🎯', status: `${goals.data?.filter((goal: { status?: string | null }) => goal.status === 'completed').length || 0}/${goals.data?.length || 0} Done` },
      { id: 'reminders', name: 'Reminders', score: moduleScores.reminders, trend: 'Live', color: '#f97316', icon: '📅', status: `${overdueRemindersCount || 0} Overdue` },
      { id: 'journey', name: 'Journey', score: moduleScores.journey, trend: 'Live', color: '#6366f1', icon: '📓', status: `${tasks.data?.filter((task) => task.due_date === today).length || 0} Tasks Today` },
      { id: 'settings', name: 'Settings', score: moduleScores.settings, trend: 'Live', color: '#14b8a6', icon: '⚙️', status: profile.data?.notifications_enabled ? 'Synced' : 'Review Needed' },
    ];

    dashboardData = {
      scores: moduleScores,
      areaScores,
      recentLogs,
      vitals: {
        overallLifeScore,
        lifeScoreTrend: 'neutral',
        trendValue: 0,
        totalFocusHours: 0,
        tasksToday: tasks.data?.filter((task) => task.due_date === today).length || 0,
        pendingTasks,
        completedTasksCount: completedTasksCount || 0,
        totalTasksCount: totalTasksCount || 0,
        journeyProgress,
        totalNotes: totalNotes || 0,
        totalStickies: totalStickies || 0,
        overdueTasksCount: totalOverdue,
        hasLogToday,
        latestMood: latestDailyLog?.mood ?? '-',
        latestReflection,
        latestReflectionTime,
        latestNote: notes.data?.[0]?.title || 'No recent notes',
        recentNotes: notes.data?.slice(0, 5) || [],
        recentTasks: tasks.data?.slice(0, 5) || [],
        recentDailyLogs: dailyLogs.data?.slice(0, 3) || [],
        latestJourneyActivity: filteredLogs.find((item) => item.area === 'Journey') || null,
      },
      areas,
    };
  } catch (e) {
    console.error('Direct dashboard data load failed:', e);
  }

  const areas = dashboardData.areas || [];

  return (
    <div className={styles.container}>
      <DashboardTelegramSync
        initialSnapshot={{
          overallLifeScore: dashboardData.vitals.overallLifeScore,
          latestJourneyActivity: dashboardData.vitals.latestJourneyActivity,
          latestReflection: dashboardData.vitals.latestReflection,
          topAlertTitle: '',
          topAlertMessage: ''
        }}
      />

      <header className={styles.header}>
        <div className={styles.welcome}>
          <h1>Logic Center</h1>
          <p>Welcome back, {user?.email?.split('@')[0]}. All systems are currently active.</p>
          <div className={styles.pushbulletNotice}>
            Stay synchronized with real-time Telegram alerts. Configure your Bot Token and Chat ID in <strong>Settings</strong> to receive project updates on your phone.
          </div>
        </div>
        <div className={styles.actions}>
          <div className={styles.dateRange}>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <Link href="/journey">
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
              <span className={styles.scoreTrend} style={{ color: 'var(--text-muted)' }}>
                − Live Snapshot
              </span>
            </div>
            <div className={styles.progressLabel}>
              Status: <span style={{ color: getLifeScoreStatus(dashboardData.vitals.overallLifeScore).color, fontWeight: '800' }}>{getLifeScoreStatus(dashboardData.vitals.overallLifeScore).label}</span> <span style={{ opacity: 0.5, margin: '0 0.5rem' }}>|</span> Aggregated from 8 Core Areas
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
                  color: getLifeScoreStatus(Number(dashboardData.vitals.latestMood) * 10).color
                }}>
                  {getLifeScoreStatus(Number(dashboardData.vitals.latestMood) * 10).label}
                </span>
              )}
            </div>
            <div className={styles.bigScore}>
              <span className={styles.scoreNum}>{dashboardData.vitals.latestMood}<span className={styles.scoreDenom}>/10</span></span>
            </div>

            {dashboardData.vitals.latestReflection && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem', fontStyle: 'italic', opacity: 0.9 }}>
                &quot; {dashboardData.vitals.latestReflection.length > 60 ? dashboardData.vitals.latestReflection.substring(0, 60) + '...' : dashboardData.vitals.latestReflection} &quot;
              </div>
            )}

            <div className={styles.progressLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Latest Journal Mood</span>
              <span style={{ opacity: 0.7 }}>
                {dashboardData.vitals.latestReflectionTime
                  ? new Date(dashboardData.vitals.latestReflectionTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                  : 'No reflection yet'}
              </span>
            </div>
            <div className={styles.miniBar}>
              <div style={{
                width: `${Number(dashboardData.vitals.latestMood) * 10}%`,
                background: getLifeScoreStatus(Number(dashboardData.vitals.latestMood) * 10).color
              }}></div>
            </div>
          </div>

          <Link href="/journey" className="card glass" style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
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
          </Link>
        </section>

        <section className={styles.draftRow}>
          <JourneyNoteCard />
          <DashboardAlerts areaScores={dashboardData.areaScores} />
          <section className={`${styles.areaDeck} card glass`}>
            <div className={styles.cardHeader}>
              <h2>Integrity Snapshot</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Area Optimization Metrics</p>
            </div>
            <div className={styles.areaScroll}>
              {areas.map((area: AreaCard) => (
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
            {/* Action Required section removed as per user request to avoid redundancy with System Activity */}
          </aside>
        </div>
      </div>
    </div>
  );
}
