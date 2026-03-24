'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './journey.module.css';

const CATEGORIES = ['General', 'Learning', 'Personal', 'Finance'];

export default function JourneyPage() {
    const [viewMode, setViewMode] = useState<'notes' | 'daily' | 'tasks'>('notes');
    const [notes, setNotes] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [stickies, setStickies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Modal state (General Notes)
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [activeNote, setActiveNote] = useState<any>(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteCategory, setNoteCategory] = useState('General');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [taskToast, setTaskToast] = useState<string | null>(null);
    const [logToast, setLogToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const showTaskToast = (msg: string) => {
        setTaskToast(msg);
        setTimeout(() => setTaskToast(null), 3000);
    };

    const showLogToast = (msg: string) => {
        setLogToast(msg);
        setTimeout(() => setLogToast(null), 3000);
    };

    // Daily Log state
    const [todayLog, setTodayLog] = useState<any>(null);
    const [logMood, setLogMood] = useState(0);
    const [logSummary, setLogSummary] = useState('');
    const [logWins, setLogWins] = useState('');
    const [logLessons, setLogLessons] = useState('');
    const [activeLogId, setActiveLogId] = useState<string | null>(null);

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [isDeletingCategoryNotes, setIsDeletingCategoryNotes] = useState(false);

    // Sticky Note Add State
    const [isAddingSticky, setIsAddingSticky] = useState(false);
    const [newStickyContent, setNewStickyContent] = useState('');
    const [newStickyColor, setNewStickyColor] = useState('yellow');

    // Delete All Confirmation State
    const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false);

    // Task Add State
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isDeletingAllTasks, setIsDeletingAllTasks] = useState(false);

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
                // Do NOT auto-fill the form — user must always start fresh
                // Fields only fill when explicitly clicking Edit on a past entry
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

    useEffect(() => {
        fetchNotes();
        fetchTasks();
        fetchDailyLogs();
        fetchStickies();
    }, [fetchNotes, fetchTasks, fetchDailyLogs, fetchStickies]);

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
        try {
            const res = await fetch(`/api/sticky-notes?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setStickies(prev => prev.filter(s => s.sticky_id !== id));
            } else {
                const err = await res.json();
                alert(`Failed to delete sticky: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    const handleNewReflection = () => {
        setActiveLogId(null);
        setLogMood(0);
        setLogSummary('');
        setLogWins('');
        setLogLessons('');
    };

    const handleEditLog = (log: any) => {
        setActiveLogId(log.log_id);
        setLogMood(log.mood || 5);
        setLogSummary(log.summary || '');
        setLogWins(log.wins || '');
        setLogLessons(log.lessons || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteLog = async (id: string) => {
        try {
            const res = await fetch(`/api/daily-logs?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDailyLogs();
                if (activeLogId === id) {
                    handleNewReflection();
                }
                showLogToast('Reflection deleted.');
            } else {
                const err = await res.json();
                alert(`Failed to delete reflection: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    const handleDeleteAllLogs = async () => {
        try {
            const res = await fetch('/api/daily-logs?all=true', { method: 'DELETE' });
            if (res.ok) {
                fetchDailyLogs();
                handleNewReflection();
                setIsDeletingAllLogs(false);
                showLogToast('All past journal entries deleted.');
            } else {
                const err = await res.json();
                alert(`Failed to delete all reflections: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    const handleSaveDailyLog = async () => {
        const payload = {
            date: new Date().toLocaleDateString('en-CA'),
            mood: logMood,
            summary: logSummary,
            wins: logWins,
            lessons: logLessons,
            ...(activeLogId ? { log_id: activeLogId } : {})
        };

        const res = await fetch('/api/daily-logs', {
            method: activeLogId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            fetchDailyLogs();
            handleNewReflection();
        }
    };

    const handleSaveNote = async (isAuto = false) => {
        if (!noteTitle && !noteContent) return;
        setIsSaving(true);
        const method = activeNote ? 'PATCH' : 'POST';
        const body = activeNote
            ? { note_id: activeNote.note_id, title: noteTitle, content: noteContent, category: noteCategory }
            : { title: noteTitle, content: noteContent, category: noteCategory };

        try {
            const res = await fetch('/api/notes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                if (!activeNote && data.note) {
                    setActiveNote(data.note);
                }
                setLastSaved(new Date());
                fetchNotes();
                if (!isAuto) {
                    setIsEditorOpen(false);
                }
            } else {
                const err = await res.json();
                console.error('Save failed:', err);
                if (!isAuto) alert('Failed to save note. Please try again.');
            }
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (id: string) => {
        const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchNotes();
            showToast('Note deleted.');
        }
    };

    const handleDeleteCategoryNotes = async () => {
        try {
            const url = selectedCategory === 'All'
                ? '/api/notes?all=true'
                : `/api/notes?all=true&category=${encodeURIComponent(selectedCategory)}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                fetchNotes();
                setIsDeletingCategoryNotes(false);
                showToast(selectedCategory === 'All' ? 'All notes deleted.' : `All notes in ${selectedCategory} deleted.`);
            } else {
                const err = await res.json();
                alert(`Failed to delete notes: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    const togglePin = async (note: any) => {
        await fetch('/api/notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note_id: note.note_id, is_pinned: !note.is_pinned })
        });
        fetchNotes();
    };

    const handleAddTask = async (title: string) => {
        if (!title) return;
        try {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    status: 'Pending',
                    priority: 'Medium',
                    due_date: todayStr
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Failed to save task: ${err.error || 'Unknown error'}`);
                return;
            }

            fetchTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('An unexpected error occurred while saving the task.');
        }
    };

    const deleteTask = async (taskId: string) => {
        const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
        if (res.ok) fetchTasks();
    };

    const handleDeleteAllTasks = async () => {
        try {
            const res = await fetch('/api/tasks?all=true', { method: 'DELETE' });
            if (res.ok) {
                fetchTasks();
                setIsDeletingAllTasks(false);
                showTaskToast('All global tasks deleted.');
            } else {
                const err = await res.json();
                alert(`Failed to delete all tasks: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
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

    const openEditor = (note: any = null) => {
        setActiveNote(note);
        setNoteTitle(note?.title || '');
        setNoteContent(note?.content || '');
        setNoteCategory(note?.category || 'General');
        setIsEditorOpen(true);
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
                                    <button
                                        className={styles.stickyDelete}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Sticky delete clicked for ID:', s.sticky_id);
                                            deleteSticky(s.sticky_id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {isAddingSticky ? (
                                <div className={styles.stickyAddForm} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <textarea
                                        autoFocus
                                        placeholder="Sticky content..."
                                        value={newStickyContent}
                                        onChange={(e) => setNewStickyContent(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', resize: 'vertical', minHeight: '60px' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <select
                                            value={newStickyColor}
                                            onChange={(e) => setNewStickyColor(e.target.value)}
                                            style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
                                        >
                                            <option value="yellow">Yellow</option>
                                            <option value="blue">Blue</option>
                                            <option value="green">Green</option>
                                            <option value="pink">Pink</option>
                                        </select>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className={styles.btnSecondary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setIsAddingSticky(false); setNewStickyContent(''); }}>Cancel</button>
                                            <button className={styles.btnPrimary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                                                if (newStickyContent.trim()) {
                                                    handleSaveSticky(newStickyContent, newStickyColor);
                                                    setIsAddingSticky(false);
                                                    setNewStickyContent('');
                                                }
                                            }}>Save</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button className={styles.addStickyBtn} onClick={() => setIsAddingSticky(true)}>+ Add Sticky</button>
                            )}
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

                    {toastMessage && (
                        <div style={{ padding: '0.5rem', marginBottom: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', animation: 'fadeIn 0.2s ease-out' }}>
                            {toastMessage}
                        </div>
                    )}

                    {viewMode === 'notes' && (
                        <>
                            <div className={styles.mainContentHeader} style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h2 style={{ margin: 0 }}>{selectedCategory === 'All' ? 'All Notes' : `${selectedCategory} Notes`}</h2>
                                    {notes.length > 0 && (
                                        isDeletingCategoryNotes ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleDeleteCategoryNotes}>Yes, Delete {selectedCategory === 'All' ? 'All Notes' : `All in ${selectedCategory}`}</button>
                                                <button className={styles.btnSecondary} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsDeletingCategoryNotes(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className={styles.logDeleteBtn} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsDeletingCategoryNotes(true)}>Delete All</button>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className={styles.notesGrid}>
                                {notes.map(note => (
                                    <div key={note.note_id} className={styles.noteCard} onClick={() => openEditor(note)}>
                                        <div className={styles.noteHeader}>
                                            <h3>{note.title}</h3>
                                            <div className={styles.noteActions}>
                                                <button
                                                    className={styles.pinBtn}
                                                    onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                                                    title={note.is_pinned ? 'Unpin' : 'Pin'}
                                                >
                                                    {note.is_pinned ? '📌' : '📍'}
                                                </button>
                                            </div>
                                        </div>
                                        <p className={styles.noteContent}>{note.content}</p>
                                        <div className={styles.noteFooter}>
                                            <div className={styles.noteMeta}>
                                                <span className={styles.categoryTag}>{note.category}</span>
                                                <span className={styles.noteDate}>
                                                    {new Date(note.updated_at).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>
                                            <button
                                                className={styles.footerDeleteBtn}
                                                onClick={(e) => { e.stopPropagation(); deleteNote(note.note_id); }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!loading && notes.length === 0 && <p className={styles.emptyText}>No notes found. Start writing!</p>}
                                {loading && <p className={styles.emptyText}>Loading notes...</p>}
                            </div>
                        </>
                    )}

                    {viewMode === 'daily' && (
                        <div className={styles.dailyLogPanel}>
                            <div className={styles.logHeader}>
                                <h2>{activeLogId ? 'Edit Reflection' : 'New Reflection'} • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                                <div className={styles.headerActions}>
                                    {activeLogId ? (
                                        <button className={styles.btnSecondary} onClick={handleNewReflection}>+ New Reflection</button>
                                    ) : (
                                        <button className={styles.btnSecondary} onClick={handleNewReflection}>Clear Fields</button>
                                    )}
                                    <button className={styles.btnPrimary} onClick={handleSaveDailyLog}>
                                        {activeLogId ? 'Update Reflection' : 'Save Reflection'}
                                    </button>
                                </div>
                            </div>

                            {logToast && (
                                <div style={{ padding: '0.5rem', marginBottom: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', animation: 'fadeIn 0.2s ease-out' }}>
                                    {logToast}
                                </div>
                            )}

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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Past Journal Entries</h3>
                                    {dailyLogs.length > 0 && (
                                        isDeletingAllLogs ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                                <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={handleDeleteAllLogs}>Yes, Delete All</button>
                                                <button className={styles.btnSecondary} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsDeletingAllLogs(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className={styles.logDeleteBtn} onClick={() => setIsDeletingAllLogs(true)}>Delete All</button>
                                        )
                                    )}
                                </div>
                                {dailyLogs.map(log => (
                                    <div key={log.log_id} className={styles.logHistoryItem} onClick={() => handleEditLog(log)} style={{ cursor: 'pointer' }}>
                                        <div className={styles.logItemHeader}>
                                            <strong>
                                                {new Date(log.created_at || log.date).toLocaleString([], {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </strong>
                                            <button
                                                className={styles.logDeleteBtn}
                                                onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.log_id); }}
                                            >
                                                Delete
                                            </button>
                                        </div>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h2>Global Tasks</h2>
                                    {tasks.length > 0 && (
                                        isDeletingAllTasks ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleDeleteAllTasks}>Yes, Delete All</button>
                                                <button className={styles.btnSecondary} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsDeletingAllTasks(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <button className={styles.logDeleteBtn} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setIsDeletingAllTasks(true)}>Delete All</button>
                                        )
                                    )}
                                </div>
                                {!isAddingTask && (
                                    <button className={styles.btnSecondary} onClick={() => setIsAddingTask(true)}>+ New Task</button>
                                )}
                            </div>

                            {taskToast && (
                                <div style={{ padding: '0.5rem', marginBottom: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', animation: 'fadeIn 0.2s ease-out' }}>
                                    {taskToast}
                                </div>
                            )}

                            {isAddingTask && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="What needs to be done?"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newTaskTitle.trim()) {
                                                handleAddTask(newTaskTitle.trim());
                                                setNewTaskTitle('');
                                                setIsAddingTask(false);
                                            } else if (e.key === 'Escape') {
                                                setIsAddingTask(false);
                                                setNewTaskTitle('');
                                            }
                                        }}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text)' }}
                                    />
                                    <button className={styles.btnPrimary} onClick={() => {
                                        if (newTaskTitle.trim()) {
                                            handleAddTask(newTaskTitle.trim());
                                            setNewTaskTitle('');
                                            setIsAddingTask(false);
                                        }
                                    }}>Add</button>
                                    <button className={styles.btnSecondary} onClick={() => {
                                        setIsAddingTask(false);
                                        setNewTaskTitle('');
                                    }}>Cancel</button>
                                </div>
                            )}

                            <div className={styles.taskList}>
                                {tasks.map(task => (
                                    <div key={task.task_id} className={`${styles.taskItem} ${task.status === 'Completed' ? styles.taskDone : ''}`}>
                                        <div className={styles.taskContent}>
                                            <div className={styles.taskHeader}>
                                                <div className={styles.taskCheckbox} onClick={() => toggleTask(task)}>
                                                    {task.status === 'Completed' ? '✓' : ''}
                                                </div>
                                                <span className={styles.taskText}>{task.title}</span>
                                            </div>
                                            <div className={styles.taskMetaArea}>
                                                <span className={styles.taskDate}>
                                                    {new Date(task.created_at || new Date()).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </span>
                                                <button className={styles.logDeleteBtn} onClick={() => deleteTask(task.task_id)}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p className={styles.emptyText}>No tasks yet. Plan your day!</p>}
                            </div>
                        </div>
                    )}
                </section>

                <aside className={styles.sideColumn}>
                    <div className={styles.sideCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>⚡ Quick Tasks</h2>
                            {tasks.length > 0 && (
                                isDeletingAllTasks ? (
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sure?</span>
                                        <button onClick={handleDeleteAllTasks} className={styles.logDeleteBtn} style={{ color: 'var(--red)', fontWeight: 'bold' }}>Yes</button>
                                        <button onClick={() => setIsDeletingAllTasks(false)} className={styles.logDeleteBtn}>No</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsDeletingAllTasks(true)} className={styles.logDeleteBtn} style={{ fontSize: '0.7rem' }}>Clear All 🗑️</button>
                                )
                            )}
                        </div>
                        <div className={styles.taskList}>
                            {tasks.slice(0, 5).map(task => (
                                <div key={task.task_id} className={styles.taskItem}>
                                    <div className={styles.taskContent}>
                                        <div className={styles.taskHeader}>
                                            <div
                                                className={styles.taskCheckbox}
                                                onClick={() => toggleTask(task)}
                                                style={task.status === 'Completed' ? {
                                                    background: 'var(--accent)',
                                                    border: '2px solid var(--accent)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0
                                                } : { flexShrink: 0 }}
                                            >
                                                {task.status === 'Completed' ? '✓' : ''}
                                            </div>
                                            <span className={styles.taskText} style={task.status === 'Completed' ? {
                                                textDecoration: 'line-through',
                                                opacity: 0.5
                                            } : {}}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <div className={styles.taskMetaArea}>
                                            <span className={styles.taskDate}>
                                                {new Date(task.created_at || new Date()).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                            <button className={styles.logDeleteBtn} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }} onClick={() => deleteTask(task.task_id)}>Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && <p className={styles.emptyText}>No pending tasks.</p>}
                        </div>
                    </div>
                </aside>
            </div>

            {/* General Note Editor Modal */}
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
                            <div className={styles.modalActions}>
                                {activeNote && (
                                    <span className={styles.noteDate}>
                                        Last updated: {new Date(activeNote.updated_at).toLocaleString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                    </span>
                                )}
                                <div className={styles.buttonGroup}>
                                    {activeNote && (
                                        <button className={styles.btnDanger} onClick={() => deleteNote(activeNote.note_id)}>Delete This Note</button>
                                    )}
                                    <button className={styles.btnSecondary} onClick={() => setIsEditorOpen(false)}>Close</button>
                                    <button className={styles.btnPrimary} onClick={() => handleSaveNote(false)} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Note'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </div>
                </div>
            )}

        </main>
    );
}
