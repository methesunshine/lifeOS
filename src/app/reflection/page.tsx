'use client';

import { useState, useEffect } from 'react';
import styles from './reflection.module.css';

export default function ReflectionPage() {
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
    const [entryType, setEntryType] = useState<'daily' | 'monthly'>('daily');

    // Daily state
    const [win, setWin] = useState('');
    const [lesson, setLesson] = useState('');

    // Monthly state
    const [rating, setRating] = useState('5');
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchLogs('daily');
        fetchLogs('monthly');
    }, []);

    async function fetchLogs(type: string) {
        const res = await fetch(`/api/reflection?type=${type}`);
        if (res.ok) {
            const data = await res.json();
            if (type === 'daily') {
                setDailyLogs(data);
                const today = new Date().toISOString().split('T')[0];
                const todayEntry = data.find((e: any) => e.created_at === today);
                if (todayEntry) {
                    setWin(todayEntry.daily_win || '');
                    setLesson(todayEntry.daily_lesson || '');
                }
            } else {
                setMonthlyLogs(data);
                const currentMonth = new Date().toISOString().substring(0, 7);
                const monthEntry = data.find((e: any) => e.created_at.startsWith(currentMonth));
                if (monthEntry) {
                    setRating(monthEntry.monthly_self_rating?.toString() || '5');
                    setNote(monthEntry.reflection_note || '');
                }
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const body: any = { entry_type: entryType };

        if (entryType === 'daily') {
            body.daily_win = win;
            body.daily_lesson = lesson;
        } else {
            body.monthly_self_rating = rating;
            body.reflection_note = note;
        }

        const res = await fetch('/api/reflection', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            setMessage({ type: 'success', text: `${entryType === 'daily' ? 'Day' : 'Month'} reflection synchronized.` });
            fetchLogs(entryType);
        } else {
            setMessage({ type: 'error', text: 'Failed to sync reflection.' });
        }
        setLoading(false);
    }

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>MINDSET / REFLECTION</div>
                <h1>Growth Mirror</h1>
                <p>Pause, review, and extract wisdom from your daily experiences and monthly cycles.</p>
            </header>

            {message && <div className={`${styles.alert} ${styles[message.type]}`}>{message.text}</div>}

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${entryType === 'daily' ? styles.activeTab : ''}`}
                    onClick={() => setEntryType('daily')}
                >
                    Daily Wins & Lessons
                </button>
                <button
                    className={`${styles.tab} ${entryType === 'monthly' ? styles.activeTab : ''}`}
                    onClick={() => setEntryType('monthly')}
                >
                    Monthly Reviews
                </button>
            </div>

            <div className={styles.grid}>
                <section className={styles.mainCol}>
                    <form onSubmit={handleSubmit} className="card">
                        <h2 className={styles.sectionTitle}>
                            {entryType === 'daily' ? "Today's Insights" : "Monthly Evaluation"}
                        </h2>

                        {entryType === 'daily' ? (
                            <div className={styles.formGroup}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Big Win</label>
                                    <textarea
                                        placeholder="What was your greatest success today?"
                                        value={win}
                                        onChange={e => setWin(e.target.value)}
                                        className={styles.textarea}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Core Lesson</label>
                                    <textarea
                                        placeholder="What did today teach you?"
                                        value={lesson}
                                        onChange={e => setLesson(e.target.value)}
                                        className={styles.textarea}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className={styles.formGroup}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Life Satisfaction (1-10)</label>
                                    <input
                                        type="range" min="1" max="10"
                                        value={rating}
                                        onChange={e => setRating(e.target.value)}
                                        className={styles.range}
                                    />
                                    <span className={styles.rangeVal}>{rating}/10</span>
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Summary Note</label>
                                    <textarea
                                        placeholder="Summarize your growth this month..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        className={styles.textarea}
                                        style={{ minHeight: '150px' }}
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
                            {loading ? 'Reflecting...' : 'Commit Reflection'}
                        </button>
                    </form>

                    <div className={styles.history}>
                        <h2 className={styles.sectionTitle}>Reflection Archive</h2>
                        <div className={styles.archiveList}>
                            {(entryType === 'daily' ? dailyLogs : monthlyLogs).map((log: any) => (
                                <div key={log.id} className={`${styles.archiveCard} card`}>
                                    <div className={styles.archiveHeader}>
                                        <span className={styles.date}>
                                            {new Date(log.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: entryType === 'daily' ? 'short' : 'long',
                                                day: entryType === 'daily' ? 'numeric' : undefined
                                            })}
                                        </span>
                                        {log.monthly_self_rating && <span className={styles.ratingBadge}>Rating: {log.monthly_self_rating}/10</span>}
                                    </div>
                                    <div className={styles.archiveBody}>
                                        {log.daily_win && (
                                            <div className={styles.entry}>
                                                <label>🏆 Win</label>
                                                <p>{log.daily_win}</p>
                                            </div>
                                        )}
                                        {log.daily_lesson && (
                                            <div className={styles.entry}>
                                                <label>📚 Lesson</label>
                                                <p>{log.daily_lesson}</p>
                                            </div>
                                        )}
                                        {log.reflection_note && (
                                            <div className={styles.entry}>
                                                <label>📝 Note</label>
                                                <p>{log.reflection_note}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className={styles.sideCol}>
                    <div className="card glass">
                        <h3 className={styles.sideTitle}>Wisdom Tracker</h3>
                        <div className={styles.statBox}>
                            <p className={styles.statLabel}>Total Reflections</p>
                            <p className={styles.statValue}>{dailyLogs.length + monthlyLogs.length}</p>
                        </div>
                    </div>

                    <div className="card glass" style={{ marginTop: '2rem' }}>
                        <h3 className={styles.sideTitle}>Why Reflect?</h3>
                        <p className={styles.tipText}>
                            "We do not learn from experience... we learn from reflecting on experience." — John Dewey
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
