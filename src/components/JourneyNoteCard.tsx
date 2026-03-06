'use client';

import { useState } from 'react';
import styles from './JourneyNoteCard.module.css';

export default function JourneyNoteCard() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        if (!title && !content) return;
        setIsSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title || 'Quick Note',
                    content: content,
                    category: 'General'
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Note saved successfully!' });
                setTitle('');
                setContent('');
                // Refresh activity feed if possible via window event or just let user know
                window.dispatchEvent(new Event('activity-update'));
            } else {
                setMessage({ type: 'error', text: 'Failed to save note.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="card glass">
            <p className={styles.label}>Quick Journey Note</p>
            <div className={styles.form}>
                <input
                    type="text"
                    placeholder="Note Title (Optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={styles.titleInput}
                />
                <textarea
                    placeholder="Write a quick thought..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={styles.contentInput}
                    rows={3}
                />
                <div className={styles.footer}>
                    {message && (
                        <span className={`${styles.status} ${styles[message.type]}`}>
                            {message.text}
                        </span>
                    )}
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={isSaving || (!title && !content)}
                    >
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </div>
        </div>
    );
}
