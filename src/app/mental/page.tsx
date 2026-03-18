'use client';

import { useState, useEffect } from 'react';
import styles from './mental.module.css';

export default function MentalHealthPage() {
    const [mood, setMood] = useState(0);
    const [stress, setStress] = useState(0);
    const [focus, setFocus] = useState(0);
    const [gratitude, setGratitude] = useState('');
    const [reflection, setReflection] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [mentalClearPoint, setMentalClearPoint] = useState<string | null>(null); // State to store the clear point

    useEffect(() => {
        fetchHistory();
        fetchInsights();
        const cp = document.cookie.split('; ').find(row => row.startsWith('mental_history_cleared_at='))?.split('=')[1];
        if (cp) setMentalClearPoint(cp);
    }, []);

    // Filter history based on mentalClearPoint
    const filteredHistory = history.filter(entry => {
        const entryTime = new Date(entry.created_at).getTime();
        const clearTime = mentalClearPoint ? new Date(mentalClearPoint).getTime() : 0;
        return entryTime > clearTime;
    });

    const [insights, setInsights] = useState<{
        moodTrend: string,
        sleepFocusAlert: boolean,
        moodStatus?: 'optimal' | 'stable' | 'warning' | 'neutral',
        moodRecommendation?: string,
        systemStatusLabel?: string,
        systemStatusMessage?: string
    }>({ moodTrend: '0.0', sleepFocusAlert: false });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Inline Confirmation States
    const [isDeletingMentalId, setIsDeletingMentalId] = useState<string | null>(null);
    const [isDeletingAllMentals, setIsDeletingAllMentals] = useState(false);


    async function fetchHistory() {
        const res = await fetch('/api/mental');
        if (res.ok) {
            const data = await res.json();
            setHistory(data);
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

    function handleReset() {
        setMood(0);
        setStress(0);
        setFocus(0);
        setGratitude('');
        setReflection('');
        setMessage(null);
    }

    async function handleDelete(id: string) {
        setLoading(true);
        const res = await fetch(`/api/mental?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            fetchInsights();
            setIsDeletingMentalId(null);
            setMessage({ type: 'success', text: 'Daily reflection deleted.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to delete log.' });
        }
        setLoading(false);
    }

    async function handleClearAll() {
        const now = new Date().toISOString();
        document.cookie = `mental_history_cleared_at=${now}; path=/; max-age=31536000`; // 1 year
        setMentalClearPoint(now);
        setIsDeletingAllMentals(false);
        setMessage({ type: 'success', text: 'Tracking view cleared.' });
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
                            <div className={`card ${styles.matchInsightsHeight}`}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: '1rem', fontSize: '1rem' }}>Daily Core Metrics</h2>
                                <div className={styles.compactSliderGroup}>
                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.25rem' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Mood State</label>
                                            <span className={styles.valueDisplay} style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>{mood}/10</span>
                                        </div>
                                        <input type="range" min="0" max="10" value={mood} onChange={(e) => setMood(parseInt(e.target.value))} className={styles.range} style={{ height: '4px' }} />
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.25rem' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Stress Level</label>
                                            <span className={styles.valueDisplay} style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>{stress}/10</span>
                                        </div>
                                        <input type="range" min="0" max="10" value={stress} onChange={(e) => setStress(parseInt(e.target.value))} className={styles.range} style={{ height: '4px' }} />
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.25rem' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Focus / Flow</label>
                                            <span className={styles.valueDisplay} style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>{focus}/10</span>
                                        </div>
                                        <input type="range" min="0" max="10" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} className={styles.range} style={{ height: '4px' }} />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.gratitudeSectionWrapper}>
                                <div className={`card ${styles.gratitudeCardFlex}`}>
                                    <h2 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gratitude & Reflection</h2>
                                    <div className={styles.formContentScroll}>
                                        <div className={styles.field}>
                                            <label className={styles.label} style={{ fontSize: '0.85rem' }}>One thing I am grateful for today:</label>
                                            <textarea
                                                value={gratitude}
                                                onChange={(e) => setGratitude(e.target.value)}
                                                placeholder="Today I am grateful for..."
                                                className={styles.textarea}
                                                style={{ minHeight: '80px', padding: '0.75rem' }}
                                            />
                                        </div>
                                        <div className={styles.field} style={{ marginTop: '1.25rem' }}>
                                            <label className={styles.label} style={{ fontSize: '0.85rem' }}>Detailed Daily Reflection:</label>
                                            <textarea
                                                value={reflection}
                                                onChange={(e) => setReflection(e.target.value)}
                                                placeholder="What happened today? How did I handle challenges?"
                                                className={styles.textarea}
                                                style={{ minHeight: '80px', padding: '0.75rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" onClick={handleReset} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }} disabled={loading} onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                                        Reset Form
                                    </button>
                                    <button type="submit" className="primary-btn" style={{ flex: 2, padding: '0.75rem', fontSize: '0.85rem' }} disabled={loading}>
                                        {loading ? 'Saving...' : 'Commit Daily Entry'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className={`card glass ${styles.matchInsightsHeight}`}>
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

                        <div className={styles.historyCardStandard} style={{ width: '100%' }}>
                            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 className={styles.sideTitle} style={{ margin: 0 }}>History Overview</h3>
                                    {filteredHistory.length > 0 && (
                                        isDeletingAllMentals ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clear all?</span>
                                                <button 
                                                    onClick={() => {
                                                        const now = new Date().toISOString();
                                                        document.cookie = `mental_history_cleared_at=${now}; path=/; max-age=31536000`;
                                                        window.location.reload();
                                                    }}
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                >Yes</button>
                                                <button onClick={() => setIsDeletingAllMentals(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>No</button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setIsDeletingAllMentals(true)} 
                                                className={styles.deleteBtn}
                                                style={{ opacity: 1, fontSize: '0.85rem' }}
                                            >
                                                Delete All 🗑️
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className={styles.historyList}>
                                    {filteredHistory.length > 0 ? (
                                        <>
                                            {filteredHistory.map((entry) => (
                                                <div key={entry.id} className={styles.historyItem}>
                                                    <div className={styles.historyHeader}>
                                                        <div className={styles.historyDate}>
                                                            <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                                                            <div style={{ opacity: 0.6 }}>{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <span className={styles.historyMood}>🧠 {entry.mood}/10</span>
                                                            {isDeletingMentalId === entry.id ? (
                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                    <button onClick={() => handleDelete(entry.id)} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.7rem', fontWeight: 'bold' }}>Ok</button>
                                                                    <button onClick={() => setIsDeletingMentalId(null)} className={styles.deleteBtn} style={{ fontSize: '0.7rem' }}>X</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setIsDeletingMentalId(entry.id)} className={styles.deleteBtn} style={{ fontSize: '0.8rem' }}>🗑️</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={styles.historyNote}>{entry.gratitude_note?.substring(0, 60)}...</p>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <p className={styles.hint}>No history yet. Start tracking today!</p>
                                    )}
                                </div>
                                <button
                                    className={styles.historyViewBtn}
                                    onClick={() => setViewMode('history')}
                                    style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '0.8rem' }}
                                >
                                    Enter Full Tracking Dashboard
                                </button>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Full Reflection Timeline</h2>
                            {history.length > 0 && (
                                isDeletingAllMentals ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                        <button className={styles.clearAllBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={handleClearAll}>Yes, Clear All</button>
                                        <button className={styles.clearAllBtn} onClick={() => setIsDeletingAllMentals(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsDeletingAllMentals(true)} className={styles.clearAllBtn}>Clear Entire History 🗑️</button>
                                )
                            )}
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
                                        <span className={styles.scoreBadge}>🧠 Mood: {entry.mood}</span>
                                        <span className={styles.scoreBadge}>⚡ Stress: {entry.stress_level}</span>
                                        <span className={styles.scoreBadge}>🎯 Focus: {entry.focus_level}</span>
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

                                <div className={styles.deleteActionArea} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    {isDeletingMentalId === entry.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 'bold' }}>Are you sure?</span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className={styles.discardBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }}
                                            >
                                                Yes, Discard
                                            </button>
                                            <button
                                                onClick={() => setIsDeletingMentalId(null)}
                                                className={styles.discardBtn}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsDeletingMentalId(entry.id)}
                                            className={styles.discardBtn}
                                        >
                                            Discard Entry 🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
