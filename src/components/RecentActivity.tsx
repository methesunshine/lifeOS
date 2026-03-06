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

    // Refresh logs when triggered by other components
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('activity-update', refreshLogs);
            return () => window.removeEventListener('activity-update', refreshLogs);
        }
    }, []);

    const handleDelete = async (id: string, area: string) => {
        if (area !== 'Journey') return;
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setLogs(logs.filter(log => log.id !== id));
            } else {
                const err = await res.json();
                alert(`Failed to delete note: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    return (
        <div className={styles.logList}>
            {logs.map((log, i) => (
                <div key={i} className={styles.logItem}>
                    <div className={styles.logIcon}>{log.icon}</div>
                    <div className={styles.logInfo}>
                        <p className={styles.logAction}>{log.action}</p>
                        <p className={styles.logDetail}>{log.detail}</p>
                    </div>
                    <div className={styles.logTime}>
                        {new Date(log.time).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </div>
                    {log.area === 'Journey' && log.id && (
                        <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(log.id!, log.area)}
                            title="Delete this note"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
