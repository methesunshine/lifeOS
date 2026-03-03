'use client';

import { useState, useEffect } from 'react';
import styles from './goals.module.css';

export default function GoalsPage() {
    const [viewMode, setViewMode] = useState<'entry' | 'dashboard'>('entry');
    const [goals, setGoals] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [deadline, setDeadline] = useState('');
    const [priority, setPriority] = useState('medium');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [customTime, setCustomTime] = useState(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    const [subtasks, setSubtasks] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchGoals();
    }, []);

    async function fetchGoals() {
        const res = await fetch('/api/goals');
        if (res.ok) {
            const data = await res.json();
            setGoals(data);
            return data;
        }
        return [];
    }

    const addSubtaskField = () => setSubtasks([...subtasks, '']);
    const updateSubtaskField = (index: number, value: string) => {
        const newSubtasks = [...subtasks];
        newSubtasks[index] = value;
        setSubtasks(newSubtasks);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title) {
            setMessage({ type: 'error', text: 'Goal title is required.' });
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

        const [year, month, day] = customDate.split('-').map(Number);
        const timeParts = parseTime(customTime);
        const createdAt = new Date(year, month - 1, day, timeParts.h, timeParts.m).toISOString();

        const res = await fetch('/api/goals', {
            method: 'POST',
            body: JSON.stringify({
                title,
                deadline: deadline || null,
                priority,
                subtasks: subtasks.filter(st => st.trim() !== ''),
                created_at: createdAt
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'Goal set successfully! Go crush it.' });
            setTitle('');
            setDeadline('');
            setSubtasks(['']);
            fetchGoals();
        } else {
            const err = await res.json();
            setMessage({ type: 'error', text: err.error || 'Failed to set goal.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 6000);
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this goal and all its steps?')) return;
        setMessage(null);

        const res = await fetch(`/api/goals?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'Objective discarded.' });
            fetchGoals();
        } else {
            setMessage({ type: 'error', text: 'Failed to delete goal.' });
        }
        setTimeout(() => setMessage(null), 6000);
    }

    async function toggleSubtask(goalId: number, subtaskId: number, currentStatus: boolean) {
        const res = await fetch('/api/goals', {
            method: 'PATCH',
            body: JSON.stringify({
                goal_id: goalId,
                subtask_id: subtaskId,
                is_completed: !currentStatus
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            const updatedGoals = await fetchGoals();
            // Check if this goal specifically just reached 100%
            const goal = updatedGoals.find((g: any) => g.id === goalId);
            if (goal && goal.status === 'completed' && !currentStatus) {
                const activeRemaining = updatedGoals.filter((g: any) => g.status === 'in-progress').length;
                setMessage({
                    type: 'success',
                    text: `✅ Mission Accomplished! "${goal.title}" is finished. You have ${activeRemaining} active missions left.`
                });
                setTimeout(() => setMessage(null), 6000);
            }
        }
    }

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / GOALS</div>
                <h1>Mission Control</h1>
                <p>Define your vision, break it into micro-steps, and execute with priority.</p>

                <div className={styles.viewSwitcher}>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'entry' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('entry')}
                    >
                        New Mission
                    </button>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'dashboard' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('dashboard')}
                    >
                        Mission Dashboard
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
                                <h2 className={styles.sectionTitle}>Set New Objective</h2>
                                <div className={styles.fieldGroup}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Goal Title</label>
                                        <input
                                            type="text"
                                            placeholder="What do you want to achieve?"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Log Date</label>
                                            <input
                                                type="date"
                                                value={customDate}
                                                onChange={(e) => setCustomDate(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Log Time</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 10:29 AM"
                                                value={customTime}
                                                onChange={(e) => setCustomTime(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Deadline</label>
                                            <input
                                                type="date"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Priority</label>
                                            <select
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Subtasks (Micro-steps)</label>
                                        {subtasks.map((st, index) => (
                                            <input
                                                key={index}
                                                type="text"
                                                placeholder={`Step ${index + 1}`}
                                                value={st}
                                                onChange={(e) => updateSubtaskField(index, e.target.value)}
                                                className={styles.input}
                                                style={{ marginBottom: '0.5rem' }}
                                            />
                                        ))}
                                        <button type="button" onClick={addSubtaskField} className={styles.addBtn}>+ Add Step</button>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="primary-btn" style={{ marginTop: '2.5rem', width: '100%' }} disabled={loading}>
                                {loading ? 'Initializing Mission...' : 'Establish Goal'}
                            </button>
                        </form>

                        <div className={styles.activeGoals}>
                            <h2 className={styles.sectionTitle} style={{ marginTop: '3rem' }}>Latest Missions</h2>
                            <div className={styles.goalsGrid}>
                                {goals.filter(g => g.status === 'in-progress').slice(0, 3).map(goal => (
                                    <div key={goal.id} className={`${styles.goalCard} card`} style={{ padding: '1.5rem !important' }}>
                                        <div className={styles.goalHeader} style={{ marginBottom: '1rem' }}>
                                            <div className={styles.goalInfo}>
                                                <span className={`${styles.priorityBadge} ${styles[goal.priority]}`}>{goal.priority}</span>
                                                <h3 style={{ fontSize: '1.1rem' }}>{goal.title}</h3>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 600 }}>
                                                    Logged {new Date(goal.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(goal.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn}>🗑️</button>
                                        </div>
                                        <div className={styles.progressSection} style={{ marginBottom: '1.5rem' }}>
                                            <div className={styles.progressLabel}>
                                                <span>{goal.progress_percent}% Progress</span>
                                            </div>
                                            <div className={styles.progressBar}>
                                                <div style={{ width: `${goal.progress_percent}%` }}></div>
                                            </div>
                                        </div>

                                        <div className={styles.subtaskList} style={{ marginBottom: '1.5rem' }}>
                                            {goal.subtasks && goal.subtasks.length > 0 ? (
                                                goal.subtasks.map((st: any) => (
                                                    <label key={st.id} className={styles.subtaskItem}>
                                                        <input
                                                            type="checkbox"
                                                            checked={st.is_completed}
                                                            onChange={() => toggleSubtask(goal.id, st.id, st.is_completed)}
                                                        />
                                                        <span className={st.is_completed ? styles.completed : ''} style={{ fontSize: '0.85rem' }}>{st.title}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <label className={styles.subtaskItem}>
                                                    <input
                                                        type="checkbox"
                                                        checked={goal.progress_percent === 100}
                                                        onChange={() => toggleSubtask(goal.id, -1, goal.progress_percent === 100)}
                                                    />
                                                    <span className={goal.progress_percent === 100 ? styles.completed : ''} style={{ fontSize: '0.85rem' }}>Complete Mission</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className={styles.goalFooter}>
                                            <span className={styles.deadline} style={{ fontSize: '0.75rem' }}>📅 {goal.deadline || 'No deadline'}</span>
                                        </div>
                                    </div>
                                ))}
                                {goals.filter(g => g.status === 'in-progress').length === 0 && (
                                    <p className={styles.hint}>No active missions. Set a goal to begin.</p>
                                )}
                            </div>
                            {goals.filter(g => g.status === 'in-progress').length > 3 && (
                                <button className="secondary-btn" style={{ marginTop: '1.5rem', width: '100%', fontSize: '0.75rem' }} onClick={() => setViewMode('dashboard')}>
                                    View All Active Missions in Dashboard
                                </button>
                            )}
                        </div>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className="card glass">
                            <h3 className={styles.sideTitle}>Mission Analytics</h3>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>Completion Rate</p>
                                <p className={styles.statValue} style={{ color: 'var(--accent)' }}>
                                    {goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0}%
                                </p>
                            </div>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>Active Missions</p>
                                <p className={styles.statValue}>{goals.filter(g => g.status === 'in-progress').length}</p>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className={styles.historyTrackingContainer}>
                    <div className={styles.dashboardGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{goals.length}</div>
                            <div className={styles.statLabel}>Total Goals</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                {goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0}%
                            </div>
                            <div className={styles.statLabel}>Success Rate</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                {goals.filter(g => g.status === 'in-progress').length}
                            </div>
                            <div className={styles.statLabel}>Active Missions</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                {goals.filter(g => g.status === 'completed').length}
                            </div>
                            <div className={styles.statLabel}>Missions Accomplished</div>
                        </div>
                    </div>

                    <div className={styles.trackingList}>
                        <h2 className={styles.sectionTitle}>Active Missions Control</h2>
                        <div className={styles.goalsGrid}>
                            {goals.filter(g => g.status === 'in-progress').length > 0 ? (
                                goals.filter(g => g.status === 'in-progress').map(goal => {
                                    const isOverdue = goal.deadline && new Date(goal.deadline) < new Date();
                                    return (
                                        <div key={goal.id} className={`${styles.goalCard} card`}>
                                            <div className={styles.goalHeader}>
                                                <div className={styles.goalInfo}>
                                                    <span className={`${styles.priorityBadge} ${styles[goal.priority]}`}>{goal.priority}</span>
                                                    <h3>{goal.title}</h3>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                                                        Established {new Date(goal.created_at).toLocaleDateString()} at {new Date(goal.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {isOverdue && <span className={styles.overdueBadge}>OVERDUE</span>}
                                                    <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn} title="Delete Mission">🗑️</button>
                                                </div>
                                            </div>

                                            <div className={styles.progressSection}>
                                                <div className={styles.progressLabel}>
                                                    <span>Progress</span>
                                                    <span>{goal.progress_percent}%</span>
                                                </div>
                                                <div className={styles.progressBar}>
                                                    <div style={{ width: `${goal.progress_percent}%` }}></div>
                                                </div>
                                            </div>

                                            <div className={styles.subtaskList}>
                                                {goal.subtasks && goal.subtasks.length > 0 ? (
                                                    goal.subtasks.map((st: any) => (
                                                        <label key={st.id} className={styles.subtaskItem}>
                                                            <input
                                                                type="checkbox"
                                                                checked={st.is_completed}
                                                                onChange={() => toggleSubtask(goal.id, st.id, st.is_completed)}
                                                            />
                                                            <span className={st.is_completed ? styles.completed : ''}>{st.title}</span>
                                                        </label>
                                                    ))
                                                ) : (
                                                    <label className={styles.subtaskItem}>
                                                        <input
                                                            type="checkbox"
                                                            onChange={() => toggleSubtask(goal.id, -1, false)}
                                                        />
                                                        <span>Mark Mission as Accomplished</span>
                                                    </label>
                                                )}
                                            </div>

                                            <div className={styles.goalFooter}>
                                                <span className={styles.deadline}>📅 {goal.deadline || 'No deadline'}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className={styles.hint}>No active missions. Start a new mission to track progress.</p>
                            )}
                        </div>

                        {goals.filter(g => g.status === 'completed').length > 0 && (
                            <>
                                <h2 className={styles.sectionTitle} style={{ marginTop: '4rem' }}>Mission History</h2>
                                <div className={styles.goalsGrid}>
                                    {goals.filter(g => g.status === 'completed').map(goal => (
                                        <div key={goal.id} className={`${styles.goalCard} card`} style={{ opacity: 0.7, border: '1px solid var(--accent)' }}>
                                            <div className={styles.goalHeader}>
                                                <div className={styles.goalInfo}>
                                                    <span className={styles.priorityBadge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>COMPLETED</span>
                                                    <h3 style={{ textDecoration: 'line-through' }}>{goal.title}</h3>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                                                        Mission started {new Date(goal.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn}>🗑️</button>
                                            </div>
                                            <div className={styles.progressSection}>
                                                <div className={styles.progressLabel} style={{ color: 'var(--accent)' }}>
                                                    <span>Mission Complete</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className={styles.progressBar}><div style={{ width: '100%', background: 'var(--accent)' }}></div></div>
                                            </div>
                                            <div className={styles.goalFooter}>
                                                <span>Accomplished on {new Date(goal.updated_at || goal.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
