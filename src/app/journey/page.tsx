'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './journey.module.css';

const CATEGORIES = ['General', 'Goals', 'Learning', 'Personal', 'Finance'];

export default function JourneyPage() {
    const [viewMode, setViewMode] = useState<'notes' | 'daily' | 'tasks'>('notes');
    const [notes, setNotes] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [stickies, setStickies] = useState<any[]>([]);
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Modal state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [activeNote, setActiveNote] = useState<any>(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState('General');

    // Daily Log state
    const [todayLog, setTodayLog] = useState<any>(null);
    const [logMood, setLogMood] = useState(5);
    const [logSummary, setLogSummary] = useState('');
    const [logWins, setLogWins] = useState('');
    const [logLessons, setLogLessons] = useState('');

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        let url = '/api/notes';
        const params = new URLSearchParams();
        if (selectedCategory !== 'All') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);

        const res = await fetch(`${url}?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            const sortedNotes = data.sort((a: any, b: any) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
            setNotes(sortedNotes);
        }
        setLoading(false);
    }, [selectedCategory, searchQuery]);

    const fetchTasks = useCallback(async () => {
        const res = await fetch('/api/tasks');
        if (res.ok) {
            const data = await res.json();
            setTasks(data);
        }
    }, []);

    const fetchDailyLogs = useCallback(async () => {
        const res = await fetch('/api/daily-logs');
        if (res.ok) {
            const data = await res.json();
            setDailyLogs(data);
            const todayStr = new Date().toLocaleDateString('en-CA');
            const found = data.find((l: any) => l.date === todayStr);
            if (found) {
                setTodayLog(found);
                setLogMood(found.mood);
                setLogSummary(found.summary);
                setLogWins(found.wins);
                setLogLessons(found.lessons);
            }
        }
    }, []);

    const fetchStickies = useCallback(async () => {
        const res = await fetch('/api/sticky-notes');
        if (res.ok) {
            const data = await res.json();
            setStickies(data);
        }
    }, []);

    const fetchReminders = useCallback(async () => {
        const res = await fetch('/api/reminders');
        if (res.ok) {
            const data = await res.json();
            setReminders(data);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
        fetchTasks();
        fetchDailyLogs();
        fetchStickies();
        fetchReminders();
    }, [fetchNotes, fetchTasks, fetchDailyLogs, fetchStickies, fetchReminders]);

    const handleSaveSticky = async (content: string, color: string = 'yellow') => {
        await fetch('/api/sticky-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, color })
        });
        fetchStickies();
    };

    const updateStickyPosition = async (id: string, x: number, y: number) => {
        await fetch('/api/sticky-notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sticky_id: id, position_x: x, position_y: y })
        });
    };

    const deleteSticky = async (id: string) => {
        await fetch(`/api/sticky-notes?id=${id}`, { method: 'DELETE' });
        fetchStickies();
    };

    const handleSaveDailyLog = async () => {
        const res = await fetch('/api/daily-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: new Date().toLocaleDateString('en-CA'),
                mood: logMood,
                summary: logSummary,
                wins: logWins,
                lessons: logLessons
            })
        });
        if (res.ok) {
            alert('Reflection saved for today!');
            fetchDailyLogs();
        }
    };

    const handleSaveNote = async () => {
        const method = activeNote ? 'PATCH' : 'POST';
        const body = activeNote
            ? { note_id: activeNote.note_id, title: noteTitle, content: noteContent, category: noteCategory }
            : { title: noteTitle, content: noteContent, category: noteCategory };

        const res = await fetch('/api/notes', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setIsEditorOpen(false);
            fetchNotes();
        }
    };

    const deleteNote = async (id: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        fetchNotes();
        setIsEditorOpen(false);
    };

    const handleAddTask = async (title: string) => {
        if (!title) return;
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status: 'Pending', priority: 'Medium' })
        });
        fetchTasks();
    };

    const deleteTask = async (id: string) => {
        await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
        fetchTasks();
    };

    const toggleTask = async (task: any) => {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: task.task_id, status: newStatus })
        });
        fetchTasks();
    };

    const handleAddReminder = async (title: string, remindAt: string) => {
        if (!title || !remindAt) return;
        await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, remind_at: remindAt, is_active: true })
        });
        fetchReminders();
    };

    const deleteReminder = async (id: string) => {
        await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
        fetchReminders();
    };

    const openEditor = (note: any = null) => {
        setActiveNote(note);
        setNoteTitle(note?.title || '');
        setNoteContent(note?.content || '');
        setNoteCategory(note?.category || 'General');
        setIsEditorOpen(true);
    };

    const togglePin = async (note: any) => {
        await fetch('/api/notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note_id: note.note_id, is_pinned: !note.is_pinned })
        });
        fetchNotes();
    };

    const handleStickyMouseDown = (e: React.MouseEvent, sticky: any) => {
        setDraggingId(sticky.sticky_id);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId) return;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        setStickies(prev => prev.map(s => s.sticky_id === draggingId ? { ...s, position_x: x, position_y: y } : s));
    };

    const handleMouseUp = () => {
        if (!draggingId) return;
        const s = stickies.find(item => item.sticky_id === draggingId);
        if (s) updateStickyPosition(s.sticky_id, s.position_x, s.position_y);
        setDraggingId(null);
    };

    return (
        <main className={styles.container} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>Life Journey</h1>
                    <p>Document your evolution, one step at a time.</p>
                </div>

                <div className={styles.viewSwitcher}>
                    <button
                        className={`${styles.viewBtn} ${viewMode === 'notes' ? styles.activeView : ''}`}
                        onClick={() => setViewMode('notes')}
                    >
                        Notes
                    </button>
                    <button
                        className={`${styles.viewBtn} ${viewMode === 'daily' ? styles.activeView : ''}`}
                        onClick={() => setViewMode('daily')}
                    >
                        Daily Log
                    </button>
                    <button
                        className={`${styles.viewBtn} ${viewMode === 'tasks' ? styles.activeView : ''}`}
                        onClick={() => setViewMode('tasks')}
                    >
                        Tasks
                    </button>
                </div>

                <button className={styles.btnPrimary} onClick={() => openEditor()}>+ New Note</button>
            </header>

            <div className={styles.layout}>
                <aside className={styles.sideColumn}>
                    <div className={styles.sideCard}>
                        <h2>📁 Categories</h2>
                        <ul className={styles.categoryList}>
                            <li
                                className={selectedCategory === 'All' ? styles.activeCategory : ''}
                                onClick={() => setSelectedCategory('All')}
                            >
                                All Notes
                            </li>
                            {CATEGORIES.map(cat => (
                                <li
                                    key={cat}
                                    className={selectedCategory === cat ? styles.activeCategory : ''}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.sideCard}>
                        <h2>📌 Sticky Notes</h2>
                        <div className={styles.stickyPanel}>
                            {stickies.map(s => (
                                <div
                                    key={s.sticky_id}
                                    className={`${styles.sticky} ${styles[s.color]}`}
                                    style={{
                                        position: draggingId === s.sticky_id ? 'fixed' : 'relative',
                                        left: draggingId === s.sticky_id ? s.position_x : 'auto',
                                        top: draggingId === s.sticky_id ? s.position_y : 'auto',
                                        zIndex: draggingId === s.sticky_id ? 1000 : 1,
                                        cursor: 'grab'
                                    }}
                                    onMouseDown={(e) => handleStickyMouseDown(e, s)}
                                >
                                    <p>{s.content}</p>
                                    <button className={styles.stickyDelete} onClick={(e) => { e.stopPropagation(); deleteSticky(s.sticky_id); }}>×</button>
                                </div>
                            ))}
                            <button className={styles.addStickyBtn} onClick={() => {
                                const t = prompt('Sticky content:');
                                const c = prompt('Color (yellow, blue, green, pink):', 'yellow');
                                if (t) handleSaveSticky(t, c || 'yellow');
                            }}>+ Add Sticky</button>
                        </div>
                    </div>
                </aside>

                <section className={styles.mainColumn}>
                    <div className={styles.searchBar}>
                        <input
                            type="text"
                            placeholder="Search your journey..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {viewMode === 'notes' && (
                        <div className={styles.notesGrid}>
                            {notes.map(note => (
                                <div key={note.note_id} className={styles.noteCard} onClick={() => openEditor(note)}>
                                    <div className={styles.noteHeader}>
                                        <h3>{note.title}</h3>
                                        <button
                                            className={styles.pinBtn}
                                            onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                                        >
                                            {note.is_pinned ? '📌' : '📍'}
                                        </button>
                                    </div>
                                    <p className={styles.noteContent}>{note.content}</p>
                                    <div className={styles.noteFooter}>
                                        <span className={styles.categoryTag}>{note.category}</span>
                                        <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                            {!loading && notes.length === 0 && <p className={styles.emptyText}>No notes found. Start writing!</p>}
                            {loading && <p className={styles.emptyText}>Loading notes...</p>}
                        </div>
                    )}

                    {viewMode === 'daily' && (
                        <div className={styles.dailyLogPanel}>
                            <div className={styles.logHeader}>
                                <h2>Daily Reflection • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                                <button className={styles.btnPrimary} onClick={handleSaveDailyLog}>Save Reflection</button>
                            </div>
                            <div className={styles.logForm}>
                                <div className={styles.moodSelector}>
                                    <label>Current Mood: {logMood}/10</label>
                                    <input type="range" min="1" max="10" value={logMood} onChange={(e) => setLogMood(Number(e.target.value))} />
                                </div>
                                <div className={styles.logSection}>
                                    <label>What happened today?</label>
                                    <textarea placeholder="Summary of the day..." value={logSummary} onChange={(e) => setLogSummary(e.target.value)} />
                                </div>
                                <div className={styles.logGrid}>
                                    <div className={styles.logSection}>
                                        <label>Major Wins 🏆</label>
                                        <textarea placeholder="What went well?" value={logWins} onChange={(e) => setLogWins(e.target.value)} />
                                    </div>
                                    <div className={styles.logSection}>
                                        <label>Lessons Learned 💡</label>
                                        <textarea placeholder="Insights for tomorrow..." value={logLessons} onChange={(e) => setLogLessons(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.logHistory}>
                                <h3>Past Journal Entries</h3>
                                {dailyLogs.map(log => (
                                    <div key={log.log_id} className={styles.logHistoryItem}>
                                        <strong>{new Date(log.date).toLocaleDateString()}</strong>
                                        <span>Mood: {log.mood}/10</span>
                                        <p>{log.summary}</p>
                                    </div>
                                ))}
                                {dailyLogs.length === 0 && <p className={styles.emptyText}>No past entries found.</p>}
                            </div>
                        </div>
                    )}

                    {viewMode === 'tasks' && (
                        <div className={styles.tasksPanel}>
                            <div className={styles.panelHeader}>
                                <h2>Global Tasks</h2>
                                <button className={styles.btnSecondary} onClick={() => {
                                    const t = prompt('Task title:');
                                    if (t) handleAddTask(t);
                                }}>+ New Task</button>
                            </div>
                            <div className={styles.taskList}>
                                {tasks.map(task => (
                                    <div key={task.task_id} className={`${styles.taskItem} ${task.status === 'Completed' ? styles.taskDone : ''}`}>
                                        <div className={styles.taskCheckbox} onClick={() => toggleTask(task)}>
                                            {task.status === 'Completed' ? '✓' : ''}
                                        </div>
                                        <span className={styles.taskText}>{task.title}</span>
                                        <button className={styles.miniDelete} onClick={() => deleteTask(task.task_id)}>×</button>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p className={styles.emptyText}>No tasks yet. Plan your day!</p>}
                            </div>
                        </div>
                    )}
                </section>

                <aside className={styles.sideColumn}>
                    <div className={styles.sideCard}>
                        <h2>⚡ Quick Tasks</h2>
                        <div className={styles.taskList}>
                            {tasks.filter(t => t.status === 'Pending').slice(0, 5).map(task => (
                                <div key={task.task_id} className={styles.taskItem}>
                                    <div className={styles.taskCheckbox} onClick={() => toggleTask(task)}></div>
                                    <span className={styles.taskText}>{task.title}</span>
                                </div>
                            ))}
                            {tasks.filter(t => t.status === 'Pending').length === 0 && <p className={styles.emptyText}>No pending tasks.</p>}
                        </div>
                    </div>

                    <div className={styles.sideCard}>
                        <div className={styles.panelHeader}>
                            <h2>📅 Reminders</h2>
                            <button className={styles.miniBtn} onClick={() => {
                                const t = prompt('Reminder:');
                                const time = prompt('Time (HH:MM):', '12:00');
                                if (t && time) {
                                    const date = new Date();
                                    const [h, m] = time.split(':');
                                    date.setHours(parseInt(h), parseInt(m), 0);
                                    handleAddReminder(t, date.toISOString());
                                }
                            }}>+</button>
                        </div>
                        <div className={styles.reminderList}>
                            {reminders.map(r => (
                                <div key={r.reminder_id} className={styles.reminderItem}>
                                    <div className={styles.reminderTime}>
                                        {new Date(r.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className={styles.reminderInfo}>
                                        <strong>{r.title}</strong>
                                        <button className={styles.miniDelete} onClick={() => deleteReminder(r.reminder_id)}>×</button>
                                    </div>
                                </div>
                            ))}
                            {reminders.length === 0 && <p className={styles.emptyText}>No upcoming reminders.</p>}
                        </div>
                    </div>
                </aside>
            </div>

            {isEditorOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsEditorOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <header className={styles.modalHeader}>
                            <input
                                type="text"
                                placeholder="Note Title"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                            />
                            <select
                                value={noteCategory}
                                onChange={(e) => setNoteCategory(e.target.value)}
                                className={styles.categorySelect}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </header>
                        <div className={styles.editorScroll}>
                            <textarea
                                className={styles.editorContent}
                                placeholder="Write your journey..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                            />
                        </div>
                        <footer className={styles.modalFooter}>
                            {activeNote && <button className={styles.btnDanger} onClick={() => deleteNote(activeNote.note_id)}>Delete</button>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnSecondary} onClick={() => setIsEditorOpen(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={handleSaveNote}>Save Note</button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    );
}
