import { createClient } from '@/lib/supabase-server';
import styles from './page.module.css';
import QuickLog from '@/components/QuickLog';
import DashboardAlerts from '@/components/DashboardAlerts';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
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
    const res = await fetch(`${baseUrl}/api/dashboard`, { cache: 'no-store' });
    if (res.ok) dashboardData = await res.json();
  } catch (e) {
    console.error('Dashboard fetch failed:', e);
  }

  const areas = [
    { id: 'journey', name: 'Life Journey', score: dashboardData.scores.journey || 0, trend: '+0%', color: '#6366f1', icon: '📓', status: `${dashboardData.vitals.tasksToday} Tasks Today` },
    { id: 'mental', name: 'Mental Health', score: dashboardData.scores.mental || 0, trend: '+0%', color: '#a855f7', icon: '🧠', status: dashboardData.scores.mental > 80 ? 'Optimal' : 'Active' },
    { id: 'physical', name: 'Physical Health', score: dashboardData.scores.physical || 0, trend: '+0%', color: '#ef4444', icon: '💪', status: dashboardData.scores.physical > 70 ? 'Optimal' : 'Improving' },
    { id: 'finance', name: 'Finance', score: dashboardData.scores.finance || 0, trend: '+0%', color: '#10b981', icon: '💰', status: 'Stable' },
  ];

  const recentLogs = dashboardData.recentLogs.length > 0 ? dashboardData.recentLogs : [
    { area: 'System', action: 'Welcome', detail: 'Start logging to see activity', time: 'Just now', icon: '✨' }
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
        {/* Vital Metrics Row */}
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

        <div className={styles.contentLayout}>
          <div className={styles.mainColumn}>
            {/* Systems Radar (Placeholder logic for visually similar bars) */}
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
              <div className={styles.logList}>
                {recentLogs.map((log, i) => (
                  <div key={i} className={styles.logItem}>
                    <div className={styles.logIcon}>{log.icon}</div>
                    <div className={styles.logInfo}>
                      <p className={styles.logAction}>{log.action}</p>
                      <p className={styles.logDetail}>{log.detail}</p>
                    </div>
                    <div className={styles.logTime}>
                      {log.time.includes('T') ? (log.area === 'Habits' ? new Date(log.time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : new Date(log.time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })) : log.time}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/reflection">
                <button className={styles.viewMore}>System Diagnostics →</button>
              </Link>
            </section>

            <DashboardAlerts userId={user?.id} />
          </aside>
        </div>
      </div>

      <QuickLog />
    </div>
  );
}
