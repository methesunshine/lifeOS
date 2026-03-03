'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import Link from 'next/link';

export default function DashboardAlerts({ userId }: { userId?: string }) {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const res = await fetch('/api/insights');
                const data = await res.json();
                if (data.alerts) {
                    setAlerts(data.alerts);
                }
            } catch (err) {
                console.error('Failed to fetch alerts:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();
    }, []);

    if (loading) return (
        <section className={`${styles.alertCard} card glass`}>
            <p>Analyzing systems...</p>
        </section>
    );

    if (alerts.length === 0) return (
        <section className={`${styles.alertCard} card glass`} style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className={styles.alertHeader}>
                <span>✅</span>
                <h3>System Status</h3>
            </div>
            <p>All systems optimal. No alerts detected today.</p>
            <Link href="/physical">
                <button className={styles.actionBtn} style={{ background: 'var(--accent)' }}>View Trends</button>
            </Link>
        </section>
    );

    const mainAlert = alerts[0];

    return (
        <section className={`${styles.alertCard} card glass`} style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className={styles.alertHeader}>
                <span>⚠️</span>
                <h3>{mainAlert.title}</h3>
            </div>
            <p>{mainAlert.message}</p>
            <Link href="/physical">
                <button className={styles.actionBtn}>{mainAlert.actionLabel}</button>
            </Link>
            {alerts.length > 1 && (
                <p className={styles.moreAlerts}>+{alerts.length - 1} more insights</p>
            )}
        </section>
    );
}
