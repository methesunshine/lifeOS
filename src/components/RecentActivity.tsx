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
    const [clickedId, setClickedId] = useState<string | null>(null);

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
        
        // eslint-disable-next-line react-hooks/immutability
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

    const handleAreaClick = (area: string, id?: string, logKey?: string) => {
        if (logKey) setClickedId(logKey);

        const routes: Record<string, string> = {
            'Dashboard': '/',
            'Mental Health': '/mental',
            'Physical Health': '/physical',
            'Finance': '/finance',
            'Skills': '/skills',
            'Goals': '/goals',
            'Reminders': '/reminders',
            'Journey': '/journey',
            'Settings': '/settings'
        };
        let target = routes[area] || '/';
        
        // Deep linking logic
        if (id) {
            if (area === 'Reminders' && id.includes('-')) { // UUID for reminders
                target = `/reminders?id=${id}`;
            } else if (area === 'Finance') {
                target = `/finance?id=${id}`;
            } else if (area === 'Mental Health') {
                target = `/mental?id=${id}`;
            } else if (area === 'Goals') {
                target = `/goals?id=${id}`;
            } else if (area === 'Physical Health') {
                target = `/physical?view=history&id=${id}`;
            } else if (area === 'Skills') {
                target = `/skills?view=history&id=${id}`;
            } else if (area === 'Journey') {
                const log = logs.find(l => l.id === id);
                let type = 'notes';
                if (log) {
                    if (log.action.includes('Reflection')) type = 'daily';
                    if (log.action.includes('Task')) type = 'tasks';
                }
                target = `/journey?id=${id}&type=${type}`;
            } else if (area === 'Settings') {
                target = `/settings?id=${id}`;
            }
        }
        
        setTimeout(() => {
            window.location.href = target;
        }, 150);
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
                {logs.map((log, i) => {
                    const logKey = log.id || `${log.area}-${log.action}-${log.time}`;
                    const isClicked = clickedId === logKey;
                    const isAlert = log.icon === '🚨' || log.icon === '⚠️';
                    
                    return (
                        <div 
                            key={i} 
                            className={`${styles.logItem} ${isAlert ? styles.alertItem : ''} ${isClicked ? styles.activeFocusPulse : ''}`}
                            onClick={() => handleAreaClick(log.area, log.id, logKey)}
                            style={{ 
                                cursor: 'pointer',
                                borderLeft: isAlert ? '3px solid #ef4444' : 'none',
                                background: isAlert ? 'rgba(239, 68, 68, 0.05)' : (isClicked ? 'rgba(99, 102, 241, 0.1)' : 'inherit'),
                                paddingLeft: isAlert ? '0.75rem' : '1rem',
                                transition: 'all 0.2s ease',
                                transform: isClicked ? 'scale(0.98)' : 'scale(1)'
                            }}
                            title={`Go to ${log.area}`}
                        >
                            <div className={styles.logIcon} style={{ background: isAlert ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-app)' }}>{log.icon}</div>
                            <div className={styles.logInfo}>
                                <p className={styles.logArea} style={{ color: isAlert ? '#ef4444' : 'var(--primary)' }}>{log.area}</p>
                                <p className={styles.logAction} style={{ color: isAlert ? '#ef4444' : 'inherit', fontWeight: isAlert ? 800 : 700 }}>{log.action}</p>
                                <p className={styles.logDetail}>{log.detail}</p>
                                <div className={styles.logFooter}>
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(log.id, log.area, log.action, log.time);
                                        }}
                                        style={{ opacity: 1 }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
