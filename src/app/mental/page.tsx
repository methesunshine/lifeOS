'use client';

import { useState, useEffect } from 'react';
import styles from './mental.module.css';

export default function MentalHealthPage() {
    const [mood, setMood] = useState(5);
    const [stress, setStress] = useState(5);
    const [focus, setFocus] = useState(5);
    const [gratitude, setGratitude] = useState('');
    const [reflection, setReflection] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [insights, setInsights] = useState<{
        moodTrend: string,
        sleepFocusAlert: boolean,
        moodStatus?: 'optimal' | 'stable' | 'warning' | 'neutral',
        moodRecommendation?: string,
        systemStatusLabel?: string,
        systemStatusMessage?: string
    }>({ moodTrend: '0.0', sleepFocusAlert: false });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchHistory();
        fetchInsights();
    }, []);

    async function fetchHistory() {
        const res = await fetch('/api/mental');
        if (res.ok) {
            const data = await res.json();
            setHistory(data);

            // Initialize sliders with latest entry if not already touched
            if (data.length > 0) {
                setMood(data[0].mood);
                setStress(data[0].stress_level);
                setFocus(data[0].focus_level);
            }
        }
    }

    async function fetchInsights() {
        const res = await fetch('/api/mental/insights');
        if (res.ok) {
            const data = await res.json();
            setInsights(data);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const res = await fetch('/api/mental', {
            method: 'POST',
            body: JSON.stringify({ mood, stress, focus, gratitude, reflection }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'Daily reflection saved successfully!' });
            // Do NOT reset levels - keep them "as is"
            setGratitude('');
            setReflection('');
            fetchHistory();
            fetchInsights();
        } else {
            setMessage({ type: 'error', text: 'Failed to save reflection.' });
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this log?')) return;

        const res = await fetch(`/api/mental?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            fetchInsights();
        } else {
            alert('Failed to delete log.');
        }
    }

    async function handleClearAll() {
        if (!confirm('Are you SURE you want to clear your entire history? This cannot be undone.')) return;

        const res = await fetch(`/api/mental?id=all`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            fetchInsights();
        } else {
            alert('Failed to clear history.');
        }
    }

    const [showFullHistory, setShowFullHistory] = useState(false);
    const [viewMode, setViewMode] = useState<'entry' | 'history'>('entry');

    // Calculate averages for dashboard
    const averages = {
        mood: history.length > 0 ? (history.reduce((acc, curr) => acc + curr.mood, 0) / history.length).toFixed(1) : '0',
        stress: history.length > 0 ? (history.reduce((acc, curr) => acc + curr.stress_level, 0) / history.length).toFixed(1) : '0',
        focus: history.length > 0 ? (history.reduce((acc, curr) => acc + curr.focus_level, 0) / history.length).toFixed(1) : '0',
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / MENTAL</div>
                <h1>Mental & Emotional Health</h1>
                <p>Track your inner state and identify burnout risks before they happen.</p>

                <div className={styles.viewSwitcher}>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'entry' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('entry')}
                    >
                        Daily Reflection
                    </button>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'history' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('history')}
                    >
                        Tracking Dashboard
                    </button>
                </div>
            </header>

            {message && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            {viewMode === 'entry' ? (
                <div className={styles.grid}>
                    <section className={styles.mainCol}>
                        <form onSubmit={handleSubmit} className={styles.formCard}>
                            <div className="card">
                                <h2 className={styles.sectionTitle}>Daily Core Metrics</h2>
                                <div className={styles.sliderGroup}>
                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader}>
                                            <label>Mood State</label>
                                            <span className={styles.valueDisplay}>{mood}/10</span>
                                        </div>
                                        <input type="range" min="1" max="10" value={mood} onChange={(e) => setMood(parseInt(e.target.value))} className={styles.range} />
                                        <div className={styles.rangeLabels}><span>Low</span><span>Optimal</span></div>
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader}>
                                            <label>Stress Level</label>
                                            <span className={styles.valueDisplay}>{stress}/10</span>
                                        </div>
                                        <input type="range" min="1" max="10" value={stress} onChange={(e) => setStress(parseInt(e.target.value))} className={styles.range} />
                                        <div className={styles.rangeLabels}><span>Calm</span><span>High</span></div>
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader}>
                                            <label>Focus / Flow</label>
                                            <span className={styles.valueDisplay}>{focus}/10</span>
                                        </div>
                                        <input type="range" min="1" max="10" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} className={styles.range} />
                                        <div className={styles.rangeLabels}><span>Distracted</span><span>Deep Work</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ marginTop: '2rem' }}>
                                <h2 className={styles.sectionTitle}>Gratitude & Reflection</h2>
                                <div className={styles.field}>
                                    <label className={styles.label}>One thing I am grateful for today:</label>
                                    <textarea
                                        value={gratitude}
                                        onChange={(e) => setGratitude(e.target.value)}
                                        placeholder="Today I am grateful for..."
                                        className={styles.textarea}
                                    />
                                </div>
                                <div className={styles.field} style={{ marginTop: '1.5rem' }}>
                                    <label className={styles.label}>Detailed Daily Reflection:</label>
                                    <textarea
                                        value={reflection}
                                        onChange={(e) => setReflection(e.target.value)}
                                        placeholder="What happened today? How did I handle challenges?"
                                        className={styles.textarea}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="primary-btn" style={{ marginTop: '2.5rem', width: '100%' }} disabled={loading}>
                                {loading ? 'Saving to Systems...' : 'Commit Daily Entry'}
                            </button>
                        </form>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className="card glass">
                            <h3 className={styles.sideTitle}>Recent Insights</h3>
                            <div className={styles.insightItem}>
                                <span className={styles.dot} style={{
                                    background: insights.moodStatus === 'optimal' ? 'var(--primary)' :
                                        insights.moodStatus === 'warning' ? '#ef4444' :
                                            insights.moodStatus === 'stable' ? 'var(--accent)' : 'var(--text-muted)'
                                }}></span>
                                <p>{insights.moodRecommendation || `Your mood is ${Number(insights.moodTrend) >= 0 ? 'up' : 'down'} ${Math.abs(Number(insights.moodTrend))}% compared to last week.`}</p>
                            </div>
                            <div className={styles.insightItem}>
                                <span className={styles.dot} style={{
                                    background: insights.moodStatus === 'warning' || insights.sleepFocusAlert ? '#f59e0b' :
                                        insights.moodStatus === 'optimal' ? 'var(--primary)' : 'var(--accent)'
                                }}></span>
                                <p><strong>{insights.systemStatusLabel || 'System Stable'}:</strong> {insights.systemStatusMessage || 'No critical sleep-focus correlations detected.'}</p>
                            </div>
                        </div>

                        <div className="card" style={{ marginTop: '2rem' }}>
                            <h3 className={styles.sideTitle}>History Overview</h3>
                            <div className={styles.historyList}>
                                {history.length > 0 ? (
                                    <>
                                        {history.slice(0, 5).map((entry) => (
                                            <div key={entry.id} className={styles.historyItem}>
                                                <div className={styles.historyHeader}>
                                                    <div className={styles.historyDate}>
                                                        <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                                                        <div style={{ opacity: 0.6 }}>{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                        <span className={styles.historyMood}>🧠 {entry.mood}/10</span>
                                                        <button onClick={() => handleDelete(entry.id)} className={styles.deleteBtn}>🗑️</button>
                                                    </div>
                                                </div>
                                                <p className={styles.historyNote}>{entry.gratitude_note?.substring(0, 60)}...</p>
                                            </div>
                                        ))}
                                        <button
                                            className={styles.historyViewBtn}
                                            onClick={() => setViewMode('history')}
                                        >
                                            Enter Full Tracking Dashboard
                                        </button>
                                    </>
                                ) : (
                                    <p className={styles.hint}>No history yet. Start tracking today!</p>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className={styles.historyTrackingContainer}>
                    <div className={styles.dashboardGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.mood}</div>
                            <div className={styles.statLabel}>Avg Mood</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.stress}</div>
                            <div className={styles.statLabel}>Avg Stress</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.focus}</div>
                            <div className={styles.statLabel}>Avg Focus</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{history.length}</div>
                            <div className={styles.statLabel}>Total Logs</div>
                        </div>
                    </div>

                    <div className={styles.trackingList}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Full Reflection Timeline</h2>
                            <button onClick={handleClearAll} className={styles.clearAllBtn}>Clear Entire History 🗑️</button>
                        </div>
                        {history.map((entry) => (
                            <div key={entry.id} className={styles.expandedHistoryItem}>
                                <div className={styles.expandedHeader}>
                                    <div className={styles.expandedDate}>
                                        <h3>
                                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </h3>
                                        <p>{new Date(entry.created_at).getFullYear()} • {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                    </div>
                                    <div className={styles.expandedScores}>
                                        <span className={styles.scoreBadge}>🧠 {entry.mood}</span>
                                        <span className={styles.scoreBadge}>⚡ {entry.stress_level}</span>
                                        <span className={styles.scoreBadge}>🎯 {entry.focus_level}</span>
                                    </div>
                                </div>

                                {entry.gratitude_note && (
                                    <div className={styles.expandedSection}>
                                        <h4>Grateful For</h4>
                                        <p>{entry.gratitude_note}</p>
                                    </div>
                                )}

                                {entry.daily_reflection && (
                                    <div className={styles.expandedSection}>
                                        <h4>Reflection & Insights</h4>
                                        <p>{entry.daily_reflection}</p>
                                    </div>
                                )}

                                <div className={styles.deleteActionArea}>
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        className={styles.discardBtn}
                                    >
                                        Discard Entry 🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
