'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import Link from 'next/link';

export default function DashboardReminders() {
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReminders() {
            try {
                // Fetch only pending reminders for the dashboard
                const res = await fetch('/api/reminders?filter=pending');
                if (res.ok) {
                    setReminders(await res.json());
                }
            } catch (err) {
                console.error('Failed to fetch reminders:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchReminders();
    }, []);

    if (loading) return (
        <section className={`${styles.alertCard} card glass`} style={{ marginTop: '1rem' }}>
            <p>Loading reminders...</p>
        </section>
    );

    if (reminders.length === 0) return null; // Only show if there's something to do

    const now = new Date();
    const todayStr = now.toLocaleDateString();

    const overdue = reminders.filter(r => new Date(r.remind_at) < now);
    const today = reminders.filter(r => new Date(r.remind_at) >= now && new Date(r.remind_at).toLocaleDateString() === todayStr);
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = reminders.filter(r => new Date(r.remind_at) > now && new Date(r.remind_at) <= next24h && new Date(r.remind_at).toLocaleDateString() !== todayStr);

    if (overdue.length === 0 && today.length === 0 && upcoming.length === 0) return null;

    return (
        <section className={`${styles.successCard} card glass`} style={{ marginTop: '1rem', padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
            <div className={styles.heartbeat}>
                <div className={styles.pulse}></div>
                Action Heartbeat: Active
            </div>
            
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--green)' }}>⏰ Action Required</h2>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.4rem', marginTop: '0.5rem' }}>
                {overdue.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.8rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>LATE ({overdue.length})</h3>
                        {overdue.map(r => (
                            <div key={r.reminder_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,0,0,0.05)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', borderLeft: '3px solid var(--red)' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{r.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue</span>
                            </div>
                        ))}
                    </div>
                )}

                {today.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>TODAY ({today.length})</h3>
                        {today.map(r => (
                            <div key={r.reminder_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', borderLeft: `3px solid ${r.priority === 'high' ? 'var(--red)' : 'var(--primary)'}` }}>
                                <span style={{ fontSize: '0.9rem' }}>{r.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.remind_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            </div>
                        ))}
                    </div>
                )}

                {upcoming.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>TOMORROW ({upcoming.length})</h3>
                        {upcoming.map(r => (
                            <div key={r.reminder_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{r.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.remind_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Link href="/reminders" style={{ display: 'block', marginTop: 'auto', textAlign: 'center', paddingTop: '1rem' }}>
                <button className={styles.actionBtn} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '100%' }}>Manage Reminders →</button>
            </Link>
        </section>
    );
}
