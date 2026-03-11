'use client';

import { useState, useEffect } from 'react';
import styles from './skills.module.css';

export default function SkillsPage() {
    const [viewMode, setViewMode] = useState<'entry' | 'history'>('entry');
    const [skills, setSkills] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [hours, setHours] = useState('');
    const [level, setLevel] = useState(1);
    const [projects, setProjects] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isTimeEdited, setIsTimeEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Inline Confirmation States
    const [isDeletingSkillLogId, setIsDeletingSkillLogId] = useState<string | null>(null);
    const [isDeletingSkillId, setIsDeletingSkillId] = useState<string | null>(null);
    const [isClearingAllSkills, setIsClearingAllSkills] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            if (!isTimeEdited) {
                const now = new Date();
                const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                setDate(localDate);
                setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
            }
        };

        // Update time immediately on mount
        updateTime();

        // Keep updating time every second so it perfectly synchronizes minute rollovers
        const intervalId = setInterval(updateTime, 1000);

        fetchSkills();

        return () => clearInterval(intervalId);
    }, [isTimeEdited]);

    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    async function fetchSkills() {
        const res = await fetch('/api/skills');
        if (res.ok) {
            const data = await res.json();
            setSkills(data);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);
        if (!name) {
            setMessage({ type: 'error', text: 'Skill name is required.' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setLoading(true);

        const parseTime = (t: string) => {
            const match = t.match(/(\d+)[:;.](\d+)\s*(AM|PM|am|pm)?/i);
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
            const res = await fetch('/api/skills', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    category,
                    hours_invested: parseFloat(hours) || 0,
                    skill_level: level,
                    projects_completed: parseInt(projects) || 0,
                    note,
                    created_at: timestamp
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Skill progress logged!' });
                setName('');
                setHours('');
                setProjects('');
                setNote('');
                fetchSkills();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Failed to log progress.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Server connection error.' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    }

    async function handleDeleteLog(logId: string) {
        setLoading(true);
        setMessage(null);
        const res = await fetch(`/api/skills?log_id=${logId}`, { method: 'DELETE' });
        if (res.ok) {
            await fetchSkills();
            setIsDeletingSkillLogId(null);
            setMessage({ type: 'success', text: 'Entry discarded.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to delete log.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    async function handleDeleteSkill(skillId: string) {
        setLoading(true);
        setMessage(null);
        const res = await fetch(`/api/skills?skill_id=${skillId}`, { method: 'DELETE' });
        if (res.ok) {
            await fetchSkills();
            setIsDeletingSkillId(null);
            setMessage({ type: 'success', text: 'Skill and history removed.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to delete skill.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    async function handleClearAll() {
        setLoading(true);
        setMessage(null);
        const res = await fetch('/api/skills?id=all', { method: 'DELETE' });
        if (res.ok) {
            await fetchSkills();
            setIsClearingAllSkills(false);
            setMessage({ type: 'success', text: 'Mastery history wiped clean.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to clear history.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / SKILLS Master</div>
                <h1>Skill Mastery & Growth</h1>
                <p>Track your learning journey, visualize growth, and reach expert level.</p>

                <div className={styles.viewSwitcher}>
                    <button
                        className={viewMode === 'entry' ? styles.activeView : ''}
                        onClick={() => setViewMode('entry')}
                    >
                        New Practice Entry
                    </button>
                    <button
                        className={viewMode === 'history' ? styles.activeView : ''}
                        onClick={() => setViewMode('history')}
                    >
                        History Dashboard
                    </button>
                </div>
            </header>

            {message && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.grid}>
                {viewMode === 'entry' ? (
                    <section className={styles.mainCol}>
                        <form onSubmit={handleSubmit} className={styles.formCard}>
                            <div className="card">
                                <h2 className={styles.sectionTitle}>Log Practice Session</h2>
                                <div className={styles.fieldGroup}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Skill Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. TypeScript, Piano, Chess"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={styles.input}
                                            list="skill-suggestions"
                                        />
                                        <datalist id="skill-suggestions">
                                            {skills.map(s => <option key={s.id} value={s.name} />)}
                                        </datalist>
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Hours Invested</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={hours}
                                                onChange={(e) => setHours(e.target.value)}
                                                className={styles.input}
                                                placeholder="2.5"
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Current Level (1-10)</label>
                                            <select
                                                value={level}
                                                onChange={(e) => setLevel(parseInt(e.target.value))}
                                                className={styles.select}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => <option key={l} value={l}>Level {l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Projects Completed (Milestones)</label>
                                        <input
                                            type="number"
                                            value={projects}
                                            onChange={(e) => setProjects(e.target.value)}
                                            className={styles.input}
                                            placeholder="1"
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Date & Time</label>
                                        <div className={styles.dateTimeRow}>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className={styles.input}
                                                style={{ flex: 2 }}
                                            />
                                            <input
                                                type="text"
                                                value={time}
                                                onChange={(e) => {
                                                    setTime(e.target.value);
                                                    setIsTimeEdited(true);
                                                }}
                                                className={styles.input}
                                                style={{ flex: 1 }}
                                                placeholder="e.g. 5:14 PM"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Note / Takeaway</label>
                                        <textarea
                                            placeholder="What did you learn today?"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            className={styles.textarea}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="primary-btn" style={{ marginTop: '2.5rem', width: '100%' }} disabled={loading}>
                                {loading ? 'Processing Growth...' : 'Commit Practice Session'}
                            </button>
                        </form>
                    </section>
                ) : (
                    <section className={styles.mainCol}>
                        <div className={styles.historyTrackingContainer}>
                            <div className={styles.dashboardGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>
                                        {skills.reduce((acc, s) => acc + (s.skill_logs?.reduce((lAcc: number, l: any) => lAcc + (l.hours_invested || 0), 0) || 0), 0).toFixed(1)}
                                    </div>
                                    <div className={styles.statLabel}>Total Hours</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>
                                        {skills.reduce((acc, s) => acc + (s.skill_logs?.reduce((lAcc: number, l: any) => lAcc + (l.projects_completed || 0), 0) || 0), 0)}
                                    </div>
                                    <div className={styles.statLabel}>Total Projects</div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statValue}>{skills.length}</div>
                                    <div className={styles.statLabel}>Skills Active</div>
                                </div>
                            </div>

                            <div className={styles.trackingList}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Practice History Timeline</h2>
                                    {skills.flatMap(s => s.skill_logs || []).length > 0 && (
                                        isClearingAllSkills ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                                <button className={styles.clearAllBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={handleClearAll}>Yes, Clear All</button>
                                                <button className={styles.clearAllBtn} onClick={() => setIsClearingAllSkills(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setIsClearingAllSkills(true)} className={styles.clearAllBtn}>Clear Entire History 🗑️</button>
                                        )
                                    )}
                                </div>
                                {skills.flatMap(s => (s.skill_logs || []).map((l: any) => ({ ...l, skillName: s.name }))).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log) => (
                                    <div key={log.id} className={styles.expandedHistoryItem}>
                                        <div className={styles.expandedHeader}>
                                            <div className={styles.expandedHistoryDate}>
                                                <h3>
                                                    {new Date(log.created_at).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </h3>
                                                <p>{new Date(log.created_at).getFullYear()} • {formatDateTime(log.created_at).time}</p>
                                            </div>
                                            <div className={styles.expandedScores}>
                                                <div className={styles.scoreBadge} style={{ color: 'var(--accent)' }}>
                                                    {log.hours_invested}h Practice
                                                </div>
                                                <div className={styles.scoreBadge}>{log.skillName}</div>
                                                <div className={styles.scoreBadge}>Level {log.skill_level}</div>
                                            </div>
                                        </div>
                                        {log.note && <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{log.note}</p>}
                                        <div className={styles.deleteActionArea} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                            {isDeletingSkillLogId === log.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 'bold' }}>Are you sure?</span>
                                                    <button
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className={styles.discardBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }}
                                                    >
                                                        Yes, Discard
                                                    </button>
                                                    <button
                                                        onClick={() => setIsDeletingSkillLogId(null)}
                                                        className={styles.discardBtn}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setIsDeletingSkillLogId(log.id)} className={styles.discardBtn}>
                                                    Discard Entry 🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {skills.length === 0 && <p className={styles.hint}>No practice logs found. Start your mastery today!</p>}
                            </div>
                        </div>
                    </section>
                )}

                <aside className={styles.sideCol}>
                    <div className="card glass">
                        <h3 className={styles.sideTitle}>Mastery Overview</h3>
                        <div className={styles.skillList}>
                            {skills.length > 0 ? (
                                skills.map(skill => {
                                    const totalHours = skill.skill_logs?.reduce((acc: number, log: any) => acc + (log.hours_invested || 0), 0) || 0;
                                    const currentLevel = skill.skill_logs?.[0]?.skill_level || 1;
                                    return (
                                        <div key={skill.id} className={styles.skillItem}>
                                            <div className={styles.skillHeader}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className={styles.skillName}>{skill.name}</span>
                                                    <span className={styles.skillMeta}>{totalHours} Hours Invested</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span className={styles.skillLevel}>Lvl {currentLevel}</span>
                                                    {isDeletingSkillId === skill.id ? (
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleDeleteSkill(skill.id)} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }}>Yes</button>
                                                            <button onClick={() => setIsDeletingSkillId(null)} className={styles.deleteBtn} style={{ fontSize: '0.8rem', paddingRight: '0' }}>No</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setIsDeletingSkillId(skill.id)} className={styles.deleteBtn} title="Delete Skill">🗑️</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.masteryBar}>
                                                <div style={{ width: `${(currentLevel / 10) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className={styles.hint}>No skills tracked yet. Time to start building!</p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                        <h3 className={styles.sideTitle}>Recent Wins</h3>
                        {skills.flatMap(s => (s.skill_logs || []).map((l: any) => ({ ...l, skillName: s.name }))).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((log, i) => (
                            <div key={i} className={styles.recentWin}>
                                <div className={styles.winDot}></div>
                                <div>
                                    <p className={styles.winText}><strong>{log.skillName}</strong>: Logged {log.hours_invested}h session</p>
                                    <span className={styles.winDate}>
                                        {new Date(log.created_at).toLocaleDateString()} • {formatDateTime(log.created_at).time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </main>
    );
}
