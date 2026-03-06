import { createClient } from '@/lib/supabase-server';
import styles from './page.module.css';
import QuickLog from '@/components/QuickLog';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardReminders from '@/components/DashboardReminders';
import Link from 'next/link';
import RecentActivity from '@/components/RecentActivity';
import JourneyNoteCard from '@/components/JourneyNoteCard';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should be handled by middleware, but safety check
    return <div>Redirecting...</div>;
  }

  const today = new Date().toLocaleDateString('en-CA');
  let dashboardData = {
    scores: {} as any,
    recentLogs: [] as any[],
    vitals: {
      overallLifeScore: 0,
      totalFocusHours: 0,
      tasksToday: 0,
      pendingTasks: 0,
      latestMood: '-',
      latestNote: 'No recent notes'
    }
  };

  try {
    // Replicating API logic directly in Server Component for robustness
    const [scores, mental, physical, finance, skills, goals, notes, tasks, dailyLogs, productivity] = await Promise.all([
      supabase.from('life_scores').select('area, score').eq('user_id', user.id).order('calculated_at', { ascending: false }),
      supabase.from('mental_health').select('mood, stress_level, focus_level, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('physical_health').select('workout_completed, sleep_hours, water_intake_ml, steps, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('finance').select('amount, category, transaction_type, transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(3),
      supabase.from('skill_logs').select('skill_id, hours_invested, created_at, skills(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('goals').select('title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('notes').select('note_id, title, category, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('title, status, due_date, priority').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('daily_logs').select('mood, date').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
      supabase.from('productivity').select('tasks_completed, focus_hours, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
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
    goals.data?.forEach(d => combinedActivity.push({ area: 'Goals', action: d.status === 'completed' ? 'Mission Success' : 'Objective Logged', detail: d.title, time: d.created_at, icon: '🎯' }));
    notes.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: 'Note Written', detail: d.title, time: d.updated_at, icon: '📓', id: d.note_id }));
    tasks.data?.forEach(d => combinedActivity.push({ area: 'Journey', action: d.status === 'Completed' ? 'Task Done' : 'Task Added', detail: d.title, time: new Date().toISOString(), icon: '✅' }));
    productivity.data?.forEach(d => combinedActivity.push({ area: 'Productivity', action: 'System Active', detail: `${d.focus_hours}h focus • ${d.tasks_completed} tasks`, time: d.created_at, icon: '⚡' }));

    combinedActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const overallLifeScore = Object.values(recentScores).length > 0
      ? Math.round(Object.values(recentScores).reduce((a: number, b: number) => a + b, 0) / Object.values(recentScores).length)
      : 0;

    const totalFocusHours = productivity.data?.reduce((acc, curr) => acc + Number(curr.focus_hours), 0) || 0;
    const { count: pendingTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Pending');

    dashboardData = {
      scores: recentScores,
      recentLogs: combinedActivity.slice(0, 8),
      vitals: {
        overallLifeScore,
        totalFocusHours,
        tasksToday: tasks.data?.filter(t => t.due_date === today).length || 0,
        pendingTasks: pendingTasks || 0,
        latestMood: dailyLogs.data?.[0]?.mood || '-',
        latestNote: notes.data?.[0]?.title || 'No recent notes'
      }
    };
  } catch (e) {
    console.error('Direct dashboard data load failed:', e);
  }

  const areas = [
    { id: 'journey', name: 'Life Journey', score: dashboardData.scores.journey || 0, trend: '+0%', color: '#6366f1', icon: '📓', status: `${dashboardData.vitals.tasksToday} Tasks Today` },
    { id: 'mental', name: 'Mental Health', score: dashboardData.scores.mental || 0, trend: '+0%', color: '#a855f7', icon: '🧠', status: dashboardData.scores.mental > 80 ? 'Optimal' : 'Active' },
    { id: 'physical', name: 'Physical Health', score: dashboardData.scores.physical || 0, trend: '+0%', color: '#ef4444', icon: '💪', status: dashboardData.scores.physical > 70 ? 'Optimal' : 'Improving' },
    { id: 'finance', name: 'Finance', score: dashboardData.scores.finance || 0, trend: '+0%', color: '#10b981', icon: '💰', status: 'Stable' },
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
              <span className={styles.scoreTrend}>↑ Stable</span>
            </div>
            <div className={styles.progressLabel}>Aggregated from 8 Core Areas</div>
            <div className={styles.miniBar}><div style={{ width: `${dashboardData.vitals.overallLifeScore}%` }}></div></div>
          </div>

          <div className="card glass">
            <p className={styles.label}>Journey Tasks</p>
            <div className={styles.bigScore}>
              <span className={styles.scoreNum}>{dashboardData.vitals.tasksToday}</span>
              <span className={styles.scoreDenom}>/{dashboardData.vitals.pendingTasks} Pending</span>
            </div>
            <div className={styles.progressLabel}>Active Objectives</div>
            <div className={styles.miniBar}><div style={{ width: `${dashboardData.vitals.pendingTasks > 0 ? (dashboardData.vitals.tasksToday / (dashboardData.vitals.tasksToday + dashboardData.vitals.pendingTasks)) * 100 : 0}%`, background: '#6366f1' }}></div></div>
          </div>

          <div className="card glass">
            <p className={styles.label}>Daily Reflection</p>
            <div className={styles.bigScore}>
              <span className={styles.scoreNum}>{dashboardData.vitals.latestMood}<span className={styles.scoreDenom}>/10</span></span>
            </div>
            <div className={styles.progressLabel}>Latest Mood Score</div>
            <div className={styles.miniBar}><div style={{ width: `${Number(dashboardData.vitals.latestMood) * 10}%`, background: '#a855f7' }}></div></div>
          </div>

          <div className="card glass">
            <p className={styles.label}>Latest Insight</p>
            <div className={styles.milestone}>
              <h3>{dashboardData.vitals.latestNote}</h3>
              <p>Documented recently</p>
            </div>
          </div>
        </section>

        <section className={styles.draftRow}>
          <JourneyNoteCard />
        </section>

        <div className={styles.contentLayout}>
          <div className={styles.mainColumn}>
            <section className={`${styles.statsCard} card`}>
              <div className={styles.cardHeader}>
                <h2>Systems Performance</h2>
                <div className={styles.chartLegend}>
                  <span>● Optimization</span>
                  <span>● Energy</span>
                </div>
              </div>
              <div className={styles.chartPlaceholder}>
                <div className={styles.barGroup}>
                  {[85, 92, 78, 95, 88, 76, 90].map((h, i) => (
                    <div key={i} className={styles.barSet}>
                      <div className={styles.bar1} style={{ height: `${h}%` }}></div>
                      <div className={styles.bar2} style={{ height: `${h * 0.85}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.areaGrid}>
              {areas.map(area => (
                <Link href={`/${area.id}`} key={area.id} className={styles.areaLink}>
                  <div className={`${styles.areaCard} card`}>
                    <div className={styles.areaHeader}>
                      <div className={styles.areaIcon} style={{ background: `${area.color}20`, color: area.color }}>
                        {area.icon}
                      </div>
                      <div>
                        <h3>{area.name}</h3>
                        <span className={styles.statusBadge}>{area.status}</span>
                      </div>
                    </div>
                    <div className={styles.areaStats}>
                      <div className={styles.scoreLarge}>{area.score}</div>
                      <div className={styles.trendSmall} style={{ color: 'var(--accent)' }}>
                        {area.trend}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.logsCard} card`}>
              <h2>System Activity</h2>
              <RecentActivity initialLogs={dashboardData.recentLogs} />
              <Link href="/reflection">
                <button className={styles.viewMore}>System Diagnostics →</button>
              </Link>
            </section>

            <DashboardAlerts userId={user?.id} />
            <DashboardReminders />
          </aside>
        </div>
      </div>

      <QuickLog />
    </div>
  );
}
