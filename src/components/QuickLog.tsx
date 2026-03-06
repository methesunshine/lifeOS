'use client';

import { useState } from 'react';
import styles from './QuickLog.module.css';

export default function QuickLog() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mood, setMood] = useState('5');
    const [sleep, setSleep] = useState('');
    const [water, setWater] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Essential');
    const [note, setNote] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/quicklog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mood,
                    sleep_hours: sleep,
                    water_intake_ml: water,
                    expense_amount: amount,
                    expense_category: category,
                    note: note
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Daily log saved successfully!' });
                setTimeout(() => {
                    setIsOpen(false);
                    setMessage(null);
                    // Reset form
                    setMood('5');
                    setSleep('');
                    setWater('');
                    setAmount('');
                    setNote('');
                }, 1500);
            } else {
                setMessage({ type: 'error', text: 'Failed to save log. Please try again.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button className={styles.fab} onClick={() => setIsOpen(true)}>
                <span className={styles.fabIcon}>+</span> Quick Log
            </button>

            {isOpen && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <header className={styles.header}>
                            <h2>Quick Daily Log</h2>
                            <button className={styles.close} onClick={() => setIsOpen(false)}>×</button>
                        </header>

                        <div className={styles.content}>
                            {message && (
                                <div className={`${styles.message} ${styles[message.type]}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className={styles.formSection}>
                                <label>How is your mood? ({mood}/10)</label>
                                <input
                                    type="range" min="1" max="10"
                                    value={mood}
                                    onChange={(e) => setMood(e.target.value)}
                                    className={styles.rangeInput}
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formField}>
                                    <label>Sleep (hours)</label>
                                    <input
                                        type="number" step="0.5"
                                        placeholder="8.0"
                                        value={sleep}
                                        onChange={(e) => setSleep(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>Water (ml)</label>
                                    <input
                                        type="number" step="100"
                                        placeholder="2000"
                                        value={water}
                                        onChange={(e) => setWater(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label>Quick Expense</label>
                                <div className={styles.expenseRow}>
                                    <input
                                        type="number"
                                        placeholder="$ Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                        <option>Essential</option>
                                        <option>Lifestyle</option>
                                        <option>Social</option>
                                        <option>Work</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label>Quick Note (Journey)</label>
                                <textarea
                                    placeholder="Write a quick thought..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className={styles.noteInput}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <footer className={styles.footer}>
                            <button
                                className={styles.save}
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Log'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
}
