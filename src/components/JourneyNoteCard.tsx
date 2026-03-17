'use client';

import { useState, useEffect } from 'react';
import styles from './JourneyNoteCard.module.css';

const QUICK_CATEGORY = 'Quick Journey';

export default function JourneyNoteCard() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [notes, setNotes] = useState<any[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [showConfirmAll, setShowConfirmAll] = useState(false);

    const loadNotes = async () => {
        try {
            const res = await fetch(`/api/notes?category=${encodeURIComponent(QUICK_CATEGORY)}`);
            if (res.ok) {
                const data = await res.json();
                setNotes(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to load quick notes:', e);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim() || 'Quick Note',
                    content: content.trim(),
                    category: QUICK_CATEGORY
                })
            });
            if (res.ok) {
                setTitle('');
                setContent('');
                setMessage('✓ Saved!');
                setTimeout(() => setMessage(null), 2500);
                await loadNotes();
            } else {
                setMessage('✗ Failed to save');
                setTimeout(() => setMessage(null), 2500);
            }
        } catch {
            setMessage('✗ Error saving');
            setTimeout(() => setMessage(null), 2500);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setNotes(prev => prev.filter(n => n.note_id !== id));
        }
    };

    const handleDeleteAll = async () => {
        const res = await fetch(
            `/api/notes?all=true&category=${encodeURIComponent(QUICK_CATEGORY)}`,
            { method: 'DELETE' }
        );
        if (res.ok) {
            setNotes([]);
            setShowConfirmAll(false);
        }
    };

    return (
        <div className={`card glass ${styles.container}`}>
            <div className={styles.cardHeader}>
                <p className={styles.label}>⚡ Quick Journey Note</p>
            </div>

            {/* Input form */}
            <div className={styles.form}>
                <input
                    type="text"
                    placeholder="Title (optional)"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={styles.titleInput}
                />
                <textarea
                    placeholder="Write a quick thought... (Ctrl+Enter to save)"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className={styles.contentInput}
                    rows={3}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
                    }}
                />
                <div className={styles.footer}>
                    {message && <span className={styles.msg}>{message}</span>}
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                    >
                        {isSaving ? 'Saving...' : '💾 Save Note'}
                    </button>
                </div>
            </div>

            {/* Saved notes */}
            {notes.length > 0 && (
                <div className={styles.notesList}>
                    <div className={styles.notesHeader}>
                        <div className={styles.notesLabel}>Saved Notes ({notes.length})</div>
                        {showConfirmAll ? (
                            <div className={styles.confirmRow}>
                                <span className={styles.confirmText}>Delete all?</span>
                                <button className={styles.dangerBtn} onClick={handleDeleteAll}>Yes</button>
                                <button className={styles.logDeleteBtn} onClick={() => setShowConfirmAll(false)}>No</button>
                            </div>
                        ) : (
                            <button className={styles.logDeleteBtn} onClick={() => setShowConfirmAll(true)}>Delete All 🗑️</button>
                        )}
                    </div>
                    {notes.map(note => (
                        <div key={note.note_id} className={styles.noteItem}>
                            <div className={styles.noteBody}>
                                <div className={styles.noteTitle}>{note.title}</div>
                                {note.content && (
                                    <div className={styles.noteContent}>
                                        {note.content.length > 100
                                            ? note.content.substring(0, 100) + '...'
                                            : note.content}
                                    </div>
                                )}
                                <div className={styles.noteMeta}>
                                    {new Date(note.updated_at).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true
                                    })}
                                </div>
                            </div>
                            <button
                                className={styles.logDeleteBtn}
                                onClick={() => handleDelete(note.note_id)}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {notes.length === 0 && (
                <p className={styles.emptyMsg}>No quick notes yet. Write one above!</p>
            )}
        </div>
    );
}
