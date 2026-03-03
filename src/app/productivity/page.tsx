'use client';

import { useState, useEffect } from 'react';
import styles from './productivity.module.css';

export default function ProductivityPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [priority, setPriority] = useState('');
    const [tasks, setTasks] = useState('0');
    const [hours, setHours] = useState('0');
    const [distraction, setDistraction] = useState('5');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        const res = await fetch('/api/productivity');
        if (res.ok) {
            const data = await res.json();
            setHistory(data);

            // Populate today's data if it exists
            const today = new Date().toISOString().split('T')[0];
            const todayEntry = data.find((e: any) => e.created_at === today);
            if (todayEntry) {
                setPriority(todayEntry.top_priority || '');
                setTasks(todayEntry.tasks_completed.toString());
                setHours(todayEntry.focus_hours.toString());
                setDistraction(todayEntry.distraction_level.toString());
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/productivity', {
            method: 'POST',
            body: JSON.stringify({
                top_priority: priority,
                tasks_completed: tasks,
                focus_hours: hours,
                distraction_level: distraction
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'Daily performance synchronized.' });
            fetchHistory();
        } else {
            setMessage({ type: 'error', text: 'Failed to sync productivity data.' });
        }
        setLoading(false);
    }

    const avgFocus = history.length > 0
        ? (history.reduce((acc, curr) => acc + parseFloat(curr.focus_hours), 0) / history.length).toFixed(1)
        : '0';

    const totalTasks = history.reduce((acc, curr) => acc + curr.tasks_completed, 0);

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / PRODUCTIVITY</div>
                <h1>Deep Work Engine</h1>
                <p>Monitor your focus depth, manage daily priorities, and analyze your output efficiency.</p>
            </header>

            {message && <div className={`${styles.alert} ${styles[message.type]}`}>{message.text}</div>}

            <div className={styles.grid}>
                <section className={styles.mainCol}>
                    <form onSubmit={handleSubmit} className="card">
                        <h2 className={styles.sectionTitle}>Today's Execution</h2>
                        <div className={styles.fieldFull}>
                            <label className={styles.label}>Main Objective (Top Priority)</label>
                            <input
                                type="text"
                                placeholder="What is the ONE thing that must be done today?"
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className={styles.largeInput}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.field}>
                                <label className={styles.label}>Tasks Completed</label>
                                <div className={styles.stepper}>
                                    <button type="button" onClick={() => setTasks(Math.max(0, parseInt(tasks) - 1).toString())}>-</button>
                                    <input type="number" value={tasks} onChange={e => setTasks(e.target.value)} />
                                    <button type="button" onClick={() => setTasks((parseInt(tasks) + 1).toString())}>+</button>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Focus Hours</label>
                                <input
                                    type="range"
                                    min="0" max="16" step="0.5"
                                    value={hours}
                                    onChange={e => setHours(e.target.value)}
                                    className={styles.range}
                                />
                                <div className={styles.rangeLabels}>
                                    <span>0h</span>
                                    <span className={styles.rangeVal}>{hours}h Deep Work</span>
                                    <span>16h</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.fieldFull}>
                            <label className={styles.label}>Distraction Level (1 = Zen, 10 = Storm)</label>
                            <input
                                type="range"
                                min="1" max="10"
                                value={distraction}
                                onChange={e => setDistraction(e.target.value)}
                                className={styles.range}
                                style={{ accentColor: 'var(--secondary)' }}
                            />
                            <div className={styles.rangeLabels}>
                                <span>Low</span>
                                <span className={styles.rangeVal} style={{ color: 'var(--secondary)' }}>Level {distraction}</span>
                                <span>High</span>
                            </div>
                        </div>

                        <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', marginTop: '2rem' }}>
                            {loading ? 'Optimizing...' : 'Log Daily Output'}
                        </button>
                    </form>

                    <div className={styles.trends}>
                        <h2 className={styles.sectionTitle}>Recent Performance</h2>
                        <div className={styles.historyList}>
                            {history.map(entry => (
                                <div key={entry.id} className={`${styles.historyCard} card`}>
                                    <div className={styles.historyHeader}>
                                        <span className={styles.historyDate}>{new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                        <span className={styles.historyPriority}>{entry.top_priority || 'No Objective Set'}</span>
                                    </div>
                                    <div className={styles.historyStats}>
                                        <div className={styles.miniStat}>
                                            <label>FOCUS</label>
                                            <span>{entry.focus_hours}h</span>
                                        </div>
                                        <div className={styles.miniStat}>
                                            <label>TASKS</label>
                                            <span>{entry.tasks_completed}</span>
                                        </div>
                                        <div className={styles.miniStat}>
                                            <label>NOISE</label>
                                            <span style={{ color: entry.distraction_level > 7 ? 'var(--secondary)' : 'inherit' }}>{entry.distraction_level}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className={styles.sideCol}>
                    <div className="card glass">
                        <h3 className={styles.sideTitle}>Productivity Vitals</h3>
                        <div className={styles.statBox}>
                            <p className={styles.statLabel}>Average Focus</p>
                            <p className={styles.statValue}>{avgFocus}h <span className={styles.unit}>/ day</span></p>
                        </div>
                        <div className={styles.statBox}>
                            <p className={styles.statLabel}>Total Tasks</p>
                            <p className={styles.statValue}>{totalTasks}</p>
                        </div>
                    </div>

                    <div className="card glass" style={{ marginTop: '2rem' }}>
                        <h3 className={styles.sideTitle}>Peak Performance</h3>
                        <p className={styles.tipText}>
                            {parseFloat(avgFocus) > 4 ?
                                "Elite focus levels detected. You are in the top 5% of deep workers." :
                                "Focus block suggested: Try a 90-minute distraction-free session tomorrow."
                            }
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
