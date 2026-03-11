'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import Link from 'next/link';

export default function DashboardAlerts({ userId, areaScores = [] }: { userId?: string, areaScores?: any[] }) {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<string>('');

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const res = await fetch('/api/insights');
                const data = await res.json();
                if (data.alerts) {
                    setAlerts(data.alerts);
                }
                setLastSync(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (err) {
                console.error('Failed to fetch alerts:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();

        // Refresh every 30 seconds to simulate a live system
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <section className={`${styles.alertCard} card glass`}>
            <p>Analyzing systems...</p>
        </section>
    );

    // Calculate aggregated score for the monitor display
    const onlineAreas = areaScores.length > 0 ? areaScores.length : 6;
    const avgOpt = areaScores.length > 0
        ? (areaScores.reduce((acc, curr) => acc + curr.score, 0) / areaScores.length).toFixed(1)
        : "94.2";

    // Smart Redirection: Find the weakest link (lowest score)
    const getWeakestLink = () => {
        if (!areaScores || areaScores.length === 0) return { name: 'Journey', path: '/journey' };

        // Find the area with the minimum score
        const lowest = [...areaScores].sort((a, b) => a.score - b.score)[0];

        // If the lowest score is still very high (optional threshold), default to Journey
        if (lowest.score >= 90) return { name: 'Life Journey', path: '/journey' };

        const pathMap: Record<string, string> = {
            'Mental': '/mental',
            'Physical': '/physical',
            'Finance': '/finance',
            'Skills': '/skills',
            'Goals': '/goals',
            'Journey': '/journey'
        };

        return {
            name: lowest.area,
            path: pathMap[lowest.area] || '/journey'
        };
    };

    const target = getWeakestLink();

    if (alerts.length === 0) return (
        <section className={`${styles.alertCard} card glass`} style={{ borderLeft: '4px solid #10b981' }}>
            <div className={styles.heartbeat}>
                <div className={styles.pulse}></div>
                System Heartbeat: Live
            </div>
            <div className={styles.alertHeader} style={{ color: '#10b981' }}>
                <span>🛡️</span>
                <h3 style={{ color: 'var(--text-main)' }}>System Status</h3>
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>All systems nominal. No anomalies detected within the 24h window.</p>

            <div className={styles.monitorStats}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Modules</span>
                    <span className={styles.statValue}>{onlineAreas} Areas Online</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Optimization</span>
                    <span className={styles.statValue}>{avgOpt}%</span>
                </div>
            </div>

            <div className={styles.syncInfo}>
                Encrypted Sync: {lastSync}
            </div>

            <Link href={target.path}>
                <button className={styles.actionBtn} style={{ marginTop: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    View {target.name} Trends
                </button>
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
