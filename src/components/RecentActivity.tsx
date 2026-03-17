'use client';

import { useState, useEffect } from 'react';
import styles from '../app/page.module.css';

interface ActivityItem {
    area: string;
    action: string;
    detail: string;
    time: string;
    icon: string;
    id?: string;
}

export default function RecentActivity({ initialLogs }: { initialLogs: ActivityItem[] }) {
    const [logs, setLogs] = useState(initialLogs);
    const [showConfirmAll, setShowConfirmAll] = useState(false);

    const refreshLogs = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                const data = await res.json();
                setLogs(data.recentLogs || []);
            }
        } catch (error) {
            console.error('Failed to refresh activity logs:', error);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            window.addEventListener('activity-update', refreshLogs);
            return () => window.removeEventListener('activity-update', refreshLogs);
        }
    }, []);

    const handleDelete = (id: string | undefined, area: string, action: string, time: string) => {
        const logId = id || `${area}-${action}-${time}`;
        
        // Add to persistent hidden activities
        const hiddenItems = document.cookie.split('; ').find(row => row.startsWith('hidden_activities='))?.split('=')[1] || '';
        const updatedHidden = hiddenItems ? `${hiddenItems},${logId}` : logId;
        
        document.cookie = `hidden_activities=${updatedHidden}; path=/; max-age=31536000`; // 1 year
        
        // Immediate UI update
        setLogs(logs.filter(log => {
            const currentId = log.id || `${log.area}-${log.action}-${log.time}`;
            return currentId !== logId;
        }));
    };

    const handleDeleteAll = () => {
        const now = new Date().toISOString();
        document.cookie = `activity_cleared_at=${now}; path=/; max-age=31536000`; // 1 year
        
        // Clear UI
        setLogs([]);
        setShowConfirmAll(false);
    };

    return (
        <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>System Activity</h2>
                {logs.length > 0 && (
                    showConfirmAll ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delete all?</span>
                            <button
                                onClick={handleDeleteAll}
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >Yes</button>
                            <button
                                onClick={() => setShowConfirmAll(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >No</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowConfirmAll(true)}
                            className={styles.deleteBtn}
                            style={{ opacity: 1 }}
                        >
                            Delete All 🗑️
                        </button>
                    )
                )}
            </div>

            {/* Activity list */}
            <div className={styles.logList}>
                {logs.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                        No recent activity yet.
                    </p>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={styles.logItem}>
                        <div className={styles.logIcon}>{log.icon}</div>
                        <div className={styles.logInfo}>
                            <p className={styles.logAction}>{log.action}</p>
                            <p className={styles.logDetail}>{log.detail}</p>
                        </div>
                        <div className={styles.logTime}>
                            {mounted && new Date(log.time).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            })}
                        </div>
                        <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(log.id, log.area, log.action, log.time)}
                            style={{ opacity: 1 }}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
