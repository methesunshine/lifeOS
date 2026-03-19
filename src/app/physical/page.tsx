'use client';

import { useState, useEffect } from 'react';
import styles from './physical.module.css';

export default function PhysicalHealthPage() {
    const [sleep, setSleep] = useState(0);
    const [workout, setWorkout] = useState(false);
    const [water, setWater] = useState(0);
    const [steps, setSteps] = useState(0);
    const [weight, setWeight] = useState(0);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'entry' | 'history'>('entry');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'motivator', text: string } | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));

    // Inline Confirmation States
    const [isDeletingPhysicalId, setIsDeletingPhysicalId] = useState<string | null>(null);
    const [isDeletingAllPhysical, setIsDeletingAllPhysical] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        const res = await fetch('/api/physical');
        if (res.ok) {
            const data = await res.json();
            setHistory(data);
        }
    }

    function handleReset() {
        setSleep(0);
        setWorkout(false);
        setWater(0);
        setSteps(0);
        setWeight(0);
        setMessage({ type: 'success', text: 'Form reset to zero.' });
        setTimeout(() => setMessage(null), 3000);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        // Validation: Make Core Entries Compulsory
        if (sleep === 0 || water === 0 || steps === 0) {
            setMessage({ type: 'error', text: 'All core vitals (Sleep, Water, Steps) must be entered.' });
            setTimeout(() => setMessage(null), 6000);
            return;
        }


        setLoading(true);

        const parseTime = (t: string) => {
            const match = t.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
            if (!match) return { h: 0, m: 0 };
            let [, h, m, ampm] = match;
            let hrs = parseInt(h);
            const mins = parseInt(m);
            if (ampm?.toLowerCase() === 'pm' && hrs < 12) hrs += 12;
            if (ampm?.toLowerCase() === 'am' && hrs === 12) hrs = 0;
            return { h: hrs, m: mins };
        };

        const timeParts = parseTime(time);
        const [y, mon, d] = date.split('-').map(Number);
        const timestamp = new Date(y, mon - 1, d, timeParts.h, timeParts.m).toISOString();

        try {
            const res = await fetch('/api/physical', {
                method: 'POST',
                body: JSON.stringify({
                    sleep_hours: sleep,
                    workout_completed: workout,
                    water_intake_ml: water,
                    steps,
                    weight_kg: weight,
                    created_at: timestamp
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.ok) {
                if (workout) {
                    setMessage({ type: 'success', text: '✅ Great job! Workout recorded & vitals committed. Peak performance achieved!' });
                } else {
                    setMessage({ type: 'motivator', text: '💪 Vitals committed! Take some time for your daily workout to reach full potential.' });
                }
                setSleep(0);
                setWorkout(false);
                setWater(0);
                setSteps(0);
                setWeight(0);
                fetchHistory();
            } else {
                setMessage({ type: 'error', text: 'Failed to save health logs.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Server connection error.' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 6000);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        setMessage(null);

        const res = await fetch(`/api/physical?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            setIsDeletingPhysicalId(null);
            setMessage({ type: 'success', text: 'Entry discarded.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to delete log.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    async function handleClearAll() {
        setLoading(true);
        setMessage(null);

        const res = await fetch(`/api/physical?id=all`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            setIsDeletingAllPhysical(false);
            setMessage({ type: 'success', text: 'Health history wiped clean.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to clear history.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    // Calculate Consistency Score (Mock logic for now)
    // Calculate Consecutive Workout Streak (Daily)
    const dailyWorkouts = history.reduce((acc: { [key: string]: boolean }, entry) => {
        const date = new Date(entry.created_at).toLocaleDateString();
        acc[date] = acc[date] || entry.workout_completed;
        return acc;
    }, {});

    // Get sorted dates (descending)
    const sortedDates = Object.keys(dailyWorkouts).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
    );

    let streakCount = 0;
    for (const date of sortedDates) {
        if (dailyWorkouts[date]) {
            streakCount++;
        } else {
            // Only break if it's not today (allowing the user to still complete today's workout)
            const isToday = date === new Date().toLocaleDateString();
            if (!isToday) break;
        }
    }

    const lastEntry = history[0];
    const isLastEntryToday = lastEntry && new Date(lastEntry.created_at).toLocaleDateString() === new Date().toLocaleDateString();
    const missedLastWorkout = history.length > 0 && !lastEntry.workout_completed && !isLastEntryToday;

    const consistencyScore = history.length > 0
        ? Math.round((history.filter(h => h.workout_completed).length / history.length) * 100)
        : 0;

    const averages = {
        sleep: history.length > 0 ? (history.reduce((acc, curr) => acc + curr.sleep_hours, 0) / history.length).toFixed(1) : '0',
        water: history.length > 0 ? (history.reduce((acc, curr) => acc + (curr.water_intake_ml || 0), 0) / history.length).toFixed(0) : '0',
        steps: history.length > 0 ? (history.reduce((acc, curr) => acc + (curr.steps || 0), 0) / history.length).toFixed(0) : '0',
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / PHYSICAL</div>
                <h1>Physical Health & Vitality</h1>
                <p>Track your movement, recovery, and hydration for peak performance.</p>

                <div className={styles.viewSwitcher}>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'entry' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('entry')}
                    >
                        Daily Vitals
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

            {missedLastWorkout && !workout && (
                <div className={`${styles.alert} ${styles.motivator}`} style={{ marginBottom: '1.5rem' }}>
                    ⚠️ Your last entry was missing a workout! Let's get that streak started again today.
                </div>
            )}




            {viewMode === 'entry' ? (
                <div className={styles.grid}>
                    <section className={styles.mainCol}>
                        <form onSubmit={handleSubmit} className={styles.formCard}>
                            <div className="card">
                                <h2 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Daily Vital Metrics</h2>
                                <div className={styles.compactMetricsGroup}>
                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.1rem' }}>
                                            <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>Sleep</label>
                                            <div className={styles.metricInputContainer}>
                                                <div className={styles.metricInputGroup}>
                                                    <input
                                                        type="number"
                                                        value={sleep}
                                                        onChange={(e) => setSleep(parseFloat(e.target.value) || 0)}
                                                        className={styles.metricInput}
                                                        style={{ fontSize: '0.9rem', width: '2.5rem' }}
                                                        step="0.5"
                                                        min="0"
                                                        max="15"
                                                    />
                                                    <span className={styles.unitLabel} style={{ fontSize: '0.65rem' }}>h</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="range" min="0" max="15" step="0.5" value={sleep} onChange={(e) => setSleep(parseFloat(e.target.value))} className={styles.range} />
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.1rem' }}>
                                            <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>Water</label>
                                            <div className={styles.metricInputContainer}>
                                                <div className={styles.metricInputGroup}>
                                                    <input
                                                        type="number"
                                                        value={water}
                                                        onChange={(e) => setWater(parseInt(e.target.value) || 0)}
                                                        className={styles.metricInput}
                                                        style={{ fontSize: '0.9rem', width: '3rem' }}
                                                        step="100"
                                                        min="0"
                                                        max="5000"
                                                    />
                                                    <span className={styles.unitLabel} style={{ fontSize: '0.65rem' }}>ml</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="range" min="0" max="5000" step="100" value={water} onChange={(e) => setWater(parseInt(e.target.value))} className={styles.range} />
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.1rem' }}>
                                            <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>Steps</label>
                                            <div className={styles.metricInputContainer}>
                                                <div className={styles.metricInputGroup}>
                                                    <input
                                                        type="number"
                                                        value={steps}
                                                        onChange={(e) => setSteps(parseInt(e.target.value) || 0)}
                                                        className={styles.metricInput}
                                                        style={{ fontSize: '0.9rem', width: '3rem' }}
                                                        step="500"
                                                        min="0"
                                                        max="20000"
                                                    />
                                                    <span className={styles.unitLabel} style={{ fontSize: '0.65rem' }}>steps</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="range" min="0" max="20000" step="500" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className={styles.range} />
                                    </div>

                                    <div className={`${styles.field} ${styles.checkboxField}`} style={{ padding: '0.75rem', marginTop: '0.25rem' }}>
                                        <label className={styles.checkboxLabel} style={{ fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={workout} onChange={(e) => setWorkout(e.target.checked)} />
                                            <span>Workout Completed Today</span>
                                        </label>
                                    </div>

                                    <div className={styles.field}>
                                        <div className={styles.fieldHeader} style={{ marginBottom: '0.1rem' }}>
                                            <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>Weight</label>
                                            <div className={styles.metricInputContainer}>
                                                <div className={styles.metricInputGroup}>
                                                    <input
                                                        type="number"
                                                        value={weight}
                                                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                                                        className={styles.metricInput}
                                                        style={{ fontSize: '0.9rem', width: '2.5rem' }}
                                                        step="0.1"
                                                        min="0"
                                                        max="150"
                                                    />
                                                    <span className={styles.unitLabel} style={{ fontSize: '0.65rem' }}>kg</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="range" min="0" max="150" step="0.1" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} className={styles.range} />
                                    </div>

                                    <div className={styles.field} style={{ marginTop: '1.5rem' }}>
                                        <label className={styles.label} style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date & Time</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                style={{ flex: 1.5, background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                                            />
                                            <input
                                                type="text"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                style={{ flex: 1, background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', textAlign: 'left' }}
                                                placeholder="e.g. 5:14 PM"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                <button type="submit" className="primary-btn" style={{ flex: 2 }} disabled={loading}>
                                    {loading ? 'Syncing...' : 'Commit Health Entry'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className={styles.historyViewBtn}
                                    style={{ flex: 1, margin: 0, padding: '0 1rem', fontSize: '0.75rem' }}
                                >
                                    Reset Form
                                </button>
                            </div>
                        </form>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className="card glass">
                            <h3 className={styles.sideTitle}>Vital Stats</h3>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>Consistency</p>
                                <p className={styles.statValue} style={{ color: 'var(--accent)' }}>{consistencyScore}%</p>
                            </div>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>Workout Streak</p>
                                <p className={styles.statValue} style={{ color: '#ff9f43' }}>{streakCount} Days</p>
                            </div>

                            {isLastEntryToday && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                    <p className={styles.statLabel}>Today's Record</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.50rem', marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>💤 Sleep: {lastEntry.sleep_hours}h</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>💧 Water: {lastEntry.water_intake_ml}ml</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>👣 Steps: {lastEntry.steps}</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>⚖️ Weight: {lastEntry.weight_kg || lastEntry.weight}kg</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, gridColumn: 'span 2', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', background: lastEntry.workout_completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 159, 67, 0.1)', color: lastEntry.workout_completed ? '#10b981' : '#ff9f43', textAlign: 'center' }}>
                                            {lastEntry.workout_completed ? '🏋️ WORKOUT COMPLETED' : '🕒 WORKOUT PENDING'}
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--accent)', marginTop: '0.75rem', fontWeight: 700 }}>✅ LOGGED FOR TODAY</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.historyCardStandard}>
                            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 className={styles.sideTitle} style={{ margin: 0 }}>Recent Logs</h3>
                                    {history.length > 0 && (
                                        isDeletingAllPhysical ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clear all?</span>
                                                <button 
                                                    onClick={handleClearAll}
                                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                >Yes</button>
                                                <button onClick={() => setIsDeletingAllPhysical(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>No</button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setIsDeletingAllPhysical(true)} 
                                                className={styles.deleteBtn}
                                                style={{ opacity: 1, fontSize: '0.85rem' }}
                                            >
                                                Delete All 🗑️
                                            </button>
                                        )
                                    )}
                                </div>
                                <div className={styles.historyList}>
                                    {history.length > 0 ? (
                                        <>
                                            {history.map((entry) => (
                                                <div key={entry.id} className={styles.historyItem}>
                                                    <div className={styles.historyHeader}>
                                                        <div className={styles.historyDate}>
                                                            <div>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                                            <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <span className={styles.historyMood}>
                                                                {entry.workout_completed ? '🏃' : '🧘'} • {entry.steps}
                                                            </span>
                                                            {isDeletingPhysicalId === entry.id ? (
                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                    <button onClick={() => handleDelete(entry.id)} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }}>Yes</button>
                                                                    <button onClick={() => setIsDeletingPhysicalId(null)} className={styles.deleteBtn} style={{ fontSize: '0.8rem', paddingRight: '0' }}>X</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setIsDeletingPhysicalId(entry.id)} className={styles.deleteBtn}>🗑️</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={styles.historyNote}>💤 {entry.sleep_hours}h • 💧 {entry.water_intake_ml}ml</p>
                                                </div>
                                            ))}
                                            <button
                                                className={styles.historyViewBtn}
                                                onClick={() => setViewMode('history')}
                                                style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '0.8rem' }}
                                            >
                                                Enter Full Tracking Dashboard
                                            </button>
                                        </>
                                    ) : (
                                        <p className={styles.hint}>No logs recorded yet. Push your limits!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className={styles.historyTrackingContainer}>
                    <div className={styles.dashboardGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.sleep}h</div>
                            <div className={styles.statLabel}>Avg Sleep</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.water}ml</div>
                            <div className={styles.statLabel}>Avg Water</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{averages.steps}</div>
                            <div className={styles.statLabel}>Avg Steps</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{history.length}</div>
                            <div className={styles.statLabel}>Total Logs</div>
                        </div>
                    </div>

                    <div className={styles.trackingList}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Physical Performance Timeline</h2>
                            {history.length > 0 && (
                                isDeletingAllPhysical ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                        <button className={styles.clearAllBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={handleClearAll}>Yes, Clear All</button>
                                        <button className={styles.clearAllBtn} onClick={() => setIsDeletingAllPhysical(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsDeletingAllPhysical(true)} className={styles.clearAllBtn}>Clear Entire History 🗑️</button>
                                )
                            )}
                        </div>
                        {history.map((entry) => (
                            <div key={entry.id} className={styles.expandedHistoryItem}>
                                <div className={styles.expandedHeader}>
                                    <div className={styles.expandedHistoryDate}>
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
                                        <span className={styles.scoreBadge}>{entry.workout_completed ? '🏃 Workout' : '🧘 Rest'}</span>
                                        <span className={styles.scoreBadge}>👣 Steps: {entry.steps}</span>
                                        <span className={styles.scoreBadge}>💤 Sleep: {entry.sleep_hours}h</span>
                                        <span className={styles.scoreBadge}>💧 Water: {entry.water_intake_ml}ml</span>
                                        <span className={styles.scoreBadge}>⚖️ Weight: {entry.weight}kg</span>
                                    </div>
                                </div>

                                <div className={styles.deleteActionArea} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    {isDeletingPhysicalId === entry.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 'bold' }}>Are you sure?</span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className={styles.discardBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }}
                                            >
                                                Yes, Discard
                                            </button>
                                            <button
                                                onClick={() => setIsDeletingPhysicalId(null)}
                                                className={styles.discardBtn}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsDeletingPhysicalId(entry.id)}
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

