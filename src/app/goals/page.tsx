'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './goals.module.css';

function GoalsContent() {
    const searchParams = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
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
    const [isTimeEdited, setIsTimeEdited] = useState(false);

    // Inline Confirmation States
    const [isDeletingGoalId, setIsDeletingGoalId] = useState<number | null>(null);
    const [isClearingAll, setIsClearingAll] = useState(false);

    // Note Updating State
    const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
    const [editingNotes, setEditingNotes] = useState<{ [key: number]: string }>({});
    const [confirmingDeleteNoteId, setConfirmingDeleteNoteId] = useState<number | null>(null);

    // New Subtask Appending State
    const [newSubtaskTitle, setNewSubtaskTitle] = useState<{ [key: number]: string }>({});
    const [savingSubtaskId, setSavingSubtaskId] = useState<number | null>(null);


    useEffect(() => {
        const updateTime = () => {
            if (!isTimeEdited) {
                const now = new Date();
                const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                setCustomDate(localDate);
                setCustomTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
            }
        };

        updateTime();
        const intervalId = setInterval(updateTime, 1000);
        fetchGoals();
        return () => clearInterval(intervalId);
    }, [isTimeEdited]);

    useEffect(() => {
        const id = searchParams.get('id');
        const view = searchParams.get('view');
        if (id) {
            setHighlightedId(id);
            if (view === 'dashboard' || !viewMode) {
                setViewMode('dashboard');
            }
            
            setTimeout(() => {
                const element = document.getElementById(`goal-${id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Keep highlight for focus
                    setTimeout(() => setHighlightedId(null), 5000);
                }
            }, 600);
        }
    }, [searchParams]);

    const handleGoalClick = (id: string) => {
        setViewMode('dashboard');
        setHighlightedId(id);
        const element = document.getElementById(`goal-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const url = new URL(window.location.href);
        url.searchParams.set('id', id);
        url.searchParams.set('view', 'dashboard');
        window.history.pushState({}, '', url.toString());
    };

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
            const match = t.match(/(\d+)[:;.](\d+)\s*(AM|PM|am|pm)?/i);
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
        setMessage(null);

        const res = await fetch(`/api/goals?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'Objective discarded.' });
            setIsDeletingGoalId(null);
            fetchGoals();
        } else {
            setMessage({ type: 'error', text: 'Failed to delete goal.' });
        }
        setTimeout(() => setMessage(null), 6000);
    }

    async function handleClearAll() {
        setMessage(null);

        const res = await fetch('/api/goals?deleteAll=true', {
            method: 'DELETE',
        });

        if (res.ok) {
            setMessage({ type: 'success', text: 'All missions cleared.' });
            setIsClearingAll(false);
            fetchGoals();
        } else {
            setMessage({ type: 'error', text: 'Failed to clear missions.' });
        }
        setTimeout(() => setMessage(null), 6000);
    }

    async function handleSaveNote(goalId: number, currentNote: string, newNote: string) {
        if (currentNote === newNote) {
            return;
        }
        setSavingNoteId(goalId);

        try {
            const res = await fetch('/api/goals', {
                method: 'PATCH',
                body: JSON.stringify({ goal_id: goalId, note: newNote }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                setGoals(prev => prev.map(g => g.id === goalId ? { ...g, note: newNote } : g));
                setEditingNotes(prev => {
                    const next = { ...prev };
                    delete next[goalId];
                    return next;
                });
            }
        } catch (error) {
            console.error('Failed to save note', error);
        } finally {
            setSavingNoteId(null);
        }
    }

    const handleFocusNote = (goalId: number) => {
        const textarea = document.getElementById(`note-textarea-${goalId}`) as HTMLTextAreaElement;
        if (textarea) {
            textarea.focus();
            // Scroll into view if needed
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    async function handleDeleteNote(goalId: number) {
        setSavingNoteId(goalId);
        try {
            const res = await fetch('/api/goals', {
                method: 'PATCH',
                body: JSON.stringify({ goal_id: goalId, note: '' }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                setGoals(prev => prev.map(g => g.id === goalId ? { ...g, note: '' } : g));
                setEditingNotes(prev => {
                    const next = { ...prev };
                    delete next[goalId];
                    return next;
                });
                setConfirmingDeleteNoteId(null);
                setMessage({ type: 'success', text: 'Note cleared.' });
            } else {
                const errData = await res.json();
                setMessage({ type: 'error', text: `Failed to clear note: ${errData.error || 'Server error'}` });
                setConfirmingDeleteNoteId(null);
            }
        } catch (error: any) {
            console.error('Failed to delete note', error);
            setMessage({ type: 'error', text: 'Critical error: Failed to clear note.' });
            setConfirmingDeleteNoteId(null);
        } finally {
            setSavingNoteId(null);
            setTimeout(() => setMessage(null), 4000);
        }
    }

    async function handleAddSubtask(goalId: number) {
        const title = newSubtaskTitle[goalId]?.trim();
        if (!title) return;

        setSavingSubtaskId(goalId);
        try {
            const res = await fetch('/api/goals', {
                method: 'POST',
                body: JSON.stringify({
                    goal_id: goalId,
                    subtask_title: title
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.ok) {
                setNewSubtaskTitle(prev => ({ ...prev, [goalId]: '' }));
                fetchGoals(); // Refresh to get updated subtasks and new progress %
            }
        } catch (error) {
            console.error('Failed to add subtask', error);
        } finally {
            setSavingSubtaskId(null);
        }
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
                        onClick={() => {
                            setViewMode('entry');
                            // Clear URL parameters when returning to entry view
                            const url = new URL(window.location.href);
                            url.searchParams.delete('id');
                            url.searchParams.delete('view');
                            window.history.pushState({}, '', url.pathname);
                        }}
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



            {viewMode === 'entry' ? (
                <div className={styles.grid}>
                    <section className={styles.mainCol}>
                        <form onSubmit={handleSubmit} className={styles.formCard}>
                            <div className="card" style={{ height: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                <h2 className={styles.sectionTitle} style={{ borderBottomColor: 'var(--accent)' }}>Set New Objective</h2>
                                {message && (
                                    <div 
                                        className={`${styles.alert} ${styles[message.type]}`}
                                        style={{ 
                                            position: 'relative', 
                                            top: 'auto', 
                                            left: 'auto', 
                                            transform: 'none', 
                                            width: '100%', 
                                            marginBottom: '1rem',
                                            padding: '1rem 1.5rem',
                                            borderRadius: '8px',
                                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: message.type === 'success' ? 'var(--accent)' : 'var(--red)',
                                            border: `1px solid ${message.type === 'success' ? 'var(--accent)' : 'var(--red)'}`
                                        }}
                                    >
                                        {message.text}
                                    </div>
                                )}
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
                                                onChange={(e) => {
                                                    setCustomTime(e.target.value);
                                                    if (!isTimeEdited) setIsTimeEdited(true);
                                                }}
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
                                            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    placeholder={`Step ${index + 1}`}
                                                    value={st}
                                                    onChange={(e) => updateSubtaskField(index, e.target.value)}
                                                    className={styles.input}
                                                    style={{ marginBottom: 0, flex: 1 }}
                                                />
                                                {subtasks.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newSubtasks = [...subtasks];
                                                            newSubtasks.splice(index, 1);
                                                            setSubtasks(newSubtasks);
                                                        }}
                                                        style={{ 
                                                            background: 'none', border: 'none', color: 'var(--text-muted)', 
                                                            cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem',
                                                        }}
                                                        title="Remove Step"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addSubtaskField} className={styles.addBtn} style={{ marginBottom: '1rem' }}>+ Add Step</button>
                                    </div>
                                </div>
                                <button type="submit" className="primary-btn" style={{ marginTop: '1.5rem', width: '100%', flexShrink: 0 }} disabled={loading}>
                                    {loading ? 'Initializing Mission...' : 'Establish Goal'}
                                </button>
                            </div>
                        </form>

                        <div className={styles.activeGoals} style={{ marginTop: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Latest Missions</h2>
                                {isClearingAll ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                        <button onClick={handleClearAll} className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--red)', borderColor: 'var(--red)' }}>Yes, Delete All</button>
                                        <button onClick={() => setIsClearingAll(false)} className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsClearingAll(true)} className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                        🗑️ Clear All
                                    </button>
                                )}
                            </div>
                            <div className="card" style={{ height: '260px', overflowY: 'auto', padding: '1rem', background: 'var(--bg-app)' }}>
                                <div className={styles.goalsGrid}>
                                    {goals.filter(g => g.status === 'in-progress').map(goal => (
                                        <div 
                                            key={goal.id} 
                                            id={`goal-${goal.id}`}
                                            className={`${styles.goalCard} ${styles.clickableCard} card`} 
                                            style={{ padding: '1.5rem !important' }}
                                            onClick={() => handleGoalClick(goal.id.toString())}
                                        >
                                        <div className={styles.goalHeader} style={{ marginBottom: '1rem' }}>
                                            <div className={styles.goalInfo}>
                                                <span className={`${styles.priorityBadge} ${styles[goal.priority]}`}>{goal.priority}</span>
                                                <h3 style={{ fontSize: '1.1rem' }}>{goal.title}</h3>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 600 }}>
                                                    Logged {new Date(goal.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(goal.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </div>
                                            </div>
                                            {isDeletingGoalId === goal.id ? (
                                                <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }}>Yes</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setIsDeletingGoalId(null); }} className={styles.deleteBtn} style={{ fontSize: '0.8rem', paddingRight: '0' }}>No</button>
                                                </div>
                                            ) : (
                                                <button onClick={(e) => { e.stopPropagation(); setIsDeletingGoalId(goal.id); }} className={styles.deleteBtn} title="Delete Mission">🗑️</button>
                                            )}
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
                                                    <label key={st.id} className={styles.subtaskItem} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={st.is_completed}
                                                            onChange={() => toggleSubtask(goal.id, st.id, st.is_completed)}
                                                        />
                                                        <span className={st.is_completed ? styles.completed : ''} style={{ fontSize: '0.85rem' }}>{st.title}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <label className={styles.subtaskItem} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={goal.progress_percent === 100}
                                                        onChange={() => toggleSubtask(goal.id, -1, goal.progress_percent === 100)}
                                                    />
                                                    <span className={goal.progress_percent === 100 ? styles.completed : ''} style={{ fontSize: '0.85rem' }}>Complete Mission</span>
                                                </label>
                                            )}

                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    className={styles.input}
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flex: 1, marginBottom: 0 }}
                                                    placeholder="Add a new step..."
                                                    value={newSubtaskTitle[goal.id] || ''}
                                                    onChange={(e) => setNewSubtaskTitle(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddSubtask(goal.id);
                                                    }}
                                                />
                                                <button
                                                    className="secondary-btn"
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)' }}
                                                    onClick={() => handleAddSubtask(goal.id)}
                                                    disabled={savingSubtaskId === goal.id || !newSubtaskTitle[goal.id]?.trim()}
                                                >
                                                    {savingSubtaskId === goal.id ? '...' : '+ Add'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.noteArea} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <label className={styles.label} style={{ fontSize: '0.75rem', marginBottom: 0, color: 'var(--primary)' }}>💡 Mission Notes / Takeaways</label>
                                                {savingNoteId === goal.id && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>Saving...</span>}
                                            </div>

                                            <textarea
                                                id={`note-textarea-${goal.id}`}
                                                className={styles.textarea}
                                                placeholder="Add important learnings, insights, or thoughts..."
                                                value={editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || '')}
                                                onChange={(e) => setEditingNotes(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                            />

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                                                {confirmingDeleteNoteId === goal.id ? (
                                                    <>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold' }}>Confirm clear?</span>
                                                        <button 
                                                            className={styles.dangerBtn} 
                                                            onClick={() => handleDeleteNote(goal.id)}
                                                        >YES, CLEAR</button>
                                                        <button 
                                                            className={styles.switchBtn} 
                                                            onClick={() => setConfirmingDeleteNoteId(null)}
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                                                        >CANCEL</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {goal.note && goal.note.trim() !== '' && (
                                                            <button 
                                                                className={styles.deleteBtn} 
                                                                onClick={() => setConfirmingDeleteNoteId(goal.id)}
                                                                style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    opacity: 1, 
                                                                    color: 'var(--red)', 
                                                                    fontWeight: 'bold',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    padding: '0.4rem 0.75rem',
                                                                    borderRadius: '0.5rem'
                                                                }}
                                                            >🗑️ Clear Note</button>
                                                        )}
                                                        <button 
                                                            className={styles.switchBtn} 
                                                            onClick={() => handleFocusNote(goal.id)}
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                                                        >📝 Edit</button>
                                                        <button
                                                            className="primary-btn"
                                                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                                                            onClick={() => handleSaveNote(goal.id, goal.note || '', editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || ''))}
                                                            disabled={savingNoteId === goal.id || (editingNotes[goal.id] !== undefined && editingNotes[goal.id] === (goal.note || ''))}
                                                        >
                                                            {savingNoteId === goal.id ? '💾 Saving...' : '💾 Save Note'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.goalFooter}>
                                            <span className={styles.deadline} style={{ fontSize: '0.75rem' }}>📅 {goal.deadline || 'No deadline'}</span>
                                        </div>
                                    </div>
                                ))}
                                {goals.filter(g => g.status === 'in-progress').length === 0 && (
                                    <p className={styles.hint} style={{ padding: '2rem', textAlign: 'center' }}>No active missions. Set a goal to begin.</p>
                                )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className="card glass" style={{ height: '320px', overflowY: 'auto' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Active Missions Control</h2>
                            {isClearingAll ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                    <button onClick={handleClearAll} className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--red)', borderColor: 'var(--red)' }}>Yes, Delete All</button>
                                    <button onClick={() => setIsClearingAll(false)} className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsClearingAll(true)} className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                    🗑️ Clear All Missions
                                </button>
                            )}
                        </div>
                        <div className="card" style={{ height: '300px', overflowY: 'auto', padding: '1rem', background: 'var(--bg-app)' }}>
                        <div className={styles.goalsGrid}>
                            {goals.filter(g => g.status === 'in-progress').length > 0 ? (
                                goals.filter(g => g.status === 'in-progress').map(goal => {
                                    const isOverdue = goal.deadline && new Date(goal.deadline) < new Date();
                                    return (
                                        <div 
                                            key={goal.id} 
                                            id={`goal-${goal.id}`}
                                            className={`${styles.goalCard} card ${highlightedId === goal.id.toString() ? styles.highlightedItem : ''}`}
                                        >
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
                                                    {isDeletingGoalId === goal.id ? (
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }}>Yes</button>
                                                            <button onClick={() => setIsDeletingGoalId(null)} className={styles.deleteBtn} style={{ fontSize: '0.8rem', paddingRight: '0' }}>No</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); setIsDeletingGoalId(goal.id); }} className={styles.deleteBtn} title="Delete Mission">🗑️</button>
                                                    )}
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
                                                        <label key={st.id} className={styles.subtaskItem} onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={st.is_completed}
                                                                onChange={() => toggleSubtask(goal.id, st.id, st.is_completed)}
                                                            />
                                                            <span className={st.is_completed ? styles.completed : ''}>{st.title}</span>
                                                        </label>
                                                    ))
                                                ) : (
                                                    <label className={styles.subtaskItem} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            onChange={() => toggleSubtask(goal.id, -1, false)}
                                                        />
                                                        <span>Mark Mission as Accomplished</span>
                                                    </label>
                                                )}

                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flex: 1, marginBottom: 0 }}
                                                        placeholder="Add a new step..."
                                                        value={newSubtaskTitle[goal.id] || ''}
                                                        onChange={(e) => setNewSubtaskTitle(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddSubtask(goal.id);
                                                        }}
                                                    />
                                                    <button
                                                        className="secondary-btn"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)' }}
                                                        onClick={() => handleAddSubtask(goal.id)}
                                                        disabled={savingSubtaskId === goal.id || !newSubtaskTitle[goal.id]?.trim()}
                                                    >
                                                        {savingSubtaskId === goal.id ? '...' : '+ Add'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1.5rem' }}>


                                            <div className={styles.noteArea} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <label className={styles.label} style={{ fontSize: '0.75rem', marginBottom: 0, color: 'var(--primary)' }}>💡 Mission Notes / Takeaways</label>
                                                    {savingNoteId === goal.id && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>Saving...</span>}
                                                </div>

                                                <textarea
                                                    id={`note-textarea-${goal.id}`}
                                                    className={styles.textarea}
                                                    placeholder="Add important learnings, insights, or thoughts..."
                                                    value={editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || '')}
                                                    onChange={(e) => setEditingNotes(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                                />

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                                                    {confirmingDeleteNoteId === goal.id ? (
                                                        <>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold' }}>Confirm clear?</span>
                                                            <button 
                                                                className={styles.dangerBtn} 
                                                                onClick={() => handleDeleteNote(goal.id)}
                                                            >YES, CLEAR</button>
                                                            <button 
                                                                className={styles.switchBtn} 
                                                                onClick={() => setConfirmingDeleteNoteId(null)}
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                                                            >CANCEL</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {goal.note && goal.note.trim() !== '' && (
                                                                <button 
                                                                    className={styles.deleteBtn} 
                                                                    onClick={() => setConfirmingDeleteNoteId(goal.id)}
                                                                    style={{ 
                                                                        fontSize: '0.75rem', 
                                                                        opacity: 1, 
                                                                        color: 'var(--red)', 
                                                                        fontWeight: 'bold',
                                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                        padding: '0.4rem 0.75rem',
                                                                        borderRadius: '0.5rem'
                                                                    }}
                                                                >🗑️ Clear Note</button>
                                                            )}
                                                            <button 
                                                                className={styles.switchBtn} 
                                                                onClick={() => handleFocusNote(goal.id)}
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                                                            >📝 Edit</button>
                                                            <button
                                                                className="primary-btn"
                                                                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                                                                onClick={() => handleSaveNote(goal.id, goal.note || '', editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || ''))}
                                                                disabled={savingNoteId === goal.id || (editingNotes[goal.id] !== undefined && editingNotes[goal.id] === (goal.note || ''))}
                                                            >
                                                                {savingNoteId === goal.id ? '💾 Saving...' : '💾 Save Note'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={styles.goalFooter}>
                                                <span className={styles.deadline}>📅 {goal.deadline || 'No deadline'}</span>
                                            </div>
                                        </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className={styles.hint}>No active missions. Start a new mission to track progress.</p>
                            )}
                        </div>
                        </div>

                        {goals.filter(g => g.status === 'completed').length > 0 && (
                            <>
                                <h2 className={styles.sectionTitle} style={{ marginTop: '4rem' }}>Mission History</h2>
                                <div className={styles.goalsGrid}>
                                    {goals.filter(g => g.status === 'completed').map(goal => (
                                        <div 
                                            key={goal.id} 
                                            id={`goal-${goal.id}`}
                                            className={`${styles.goalCard} card ${highlightedId === goal.id.toString() ? styles.highlightedItem : ''}`} 
                                            style={{ opacity: 0.7, border: '1px solid var(--accent)' }}
                                        >
                                            <div className={styles.goalHeader}>
                                                <div className={styles.goalInfo}>
                                                    <span className={styles.priorityBadge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>COMPLETED</span>
                                                    <h3 style={{ textDecoration: 'line-through' }}>{goal.title}</h3>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>
                                                        Mission started {new Date(goal.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                {isDeletingGoalId === goal.id ? (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button onClick={() => handleDelete(goal.id)} className={styles.deleteBtn} style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }}>Yes</button>
                                                        <button onClick={() => setIsDeletingGoalId(null)} className={styles.deleteBtn} style={{ fontSize: '0.8rem', paddingRight: '0' }}>No</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); setIsDeletingGoalId(goal.id); }} className={styles.deleteBtn} title="Delete Mission">🗑️</button>
                                                )}
                                            </div>
                                            <div className={styles.progressSection}>
                                                <div className={styles.progressLabel} style={{ color: 'var(--accent)' }}>
                                                    <span>Mission Complete</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className={styles.progressBar}><div style={{ width: '100%', background: 'var(--accent)' }}></div></div>
                                            </div>

                                            <div className={styles.noteArea} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <label className={styles.label} style={{ fontSize: '0.75rem', marginBottom: 0, color: 'var(--primary)' }}>💡 Mission Notes / Takeaways</label>
                                                    {savingNoteId === goal.id && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>Saving...</span>}
                                                </div>

                                                <textarea
                                                    id={`note-textarea-${goal.id}`}
                                                    className={styles.textarea}
                                                    placeholder="Add important learnings, insights, or thoughts..."
                                                    value={editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || '')}
                                                    onChange={(e) => setEditingNotes(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                                />

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                                                    {confirmingDeleteNoteId === goal.id ? (
                                                        <>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold' }}>Confirm clear?</span>
                                                            <button 
                                                                className={styles.dangerBtn} 
                                                                onClick={() => handleDeleteNote(goal.id)}
                                                            >YES, CLEAR</button>
                                                            <button 
                                                                className={styles.switchBtn} 
                                                                onClick={() => setConfirmingDeleteNoteId(null)}
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                                                            >CANCEL</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {goal.note && goal.note.trim() !== '' && (
                                                                <button 
                                                                    className={styles.deleteBtn} 
                                                                    onClick={() => setConfirmingDeleteNoteId(goal.id)}
                                                                    style={{ 
                                                                        fontSize: '0.75rem', 
                                                                        opacity: 1, 
                                                                        color: 'var(--red)', 
                                                                        fontWeight: 'bold',
                                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                        padding: '0.4rem 0.75rem',
                                                                        borderRadius: '0.5rem'
                                                                    }}
                                                                >🗑️ Clear Note</button>
                                                            )}
                                                            <button 
                                                                className={styles.switchBtn} 
                                                                onClick={() => handleFocusNote(goal.id)}
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                                                            >📝 Edit</button>
                                                            <button
                                                                className="primary-btn"
                                                                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                                                                onClick={() => handleSaveNote(goal.id, goal.note || '', editingNotes[goal.id] !== undefined ? editingNotes[goal.id] : (goal.note || ''))}
                                                                disabled={savingNoteId === goal.id || (editingNotes[goal.id] !== undefined && editingNotes[goal.id] === (goal.note || ''))}
                                                            >
                                                                {savingNoteId === goal.id ? '💾 Saving...' : '💾 Save Note'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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

export default function GoalsPage() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading Mission Control...</div>}>
            <GoalsContent />
        </Suspense>
    );
}
