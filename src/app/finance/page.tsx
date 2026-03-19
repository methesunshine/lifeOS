'use client';

import { useState, useEffect } from 'react';
import styles from './finance.module.css';

const CATEGORIES = ['Housing', 'Food', 'Transport', 'Healthcare', 'Entertainment', 'Shopping', 'Utilities', 'Income', 'Savings', 'Other'];

export default function FinancePage() {
    const [viewMode, setViewMode] = useState<'entry' | 'history'>('entry');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [type, setType] = useState<'expense' | 'income' | 'savings'>('expense');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isTimeEdited, setIsTimeEdited] = useState(false);


    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Inline Confirmation States
    const [isDeletingFinanceId, setIsDeletingFinanceId] = useState<string | null>(null);
    const [isDeletingAllFinance, setIsDeletingAllFinance] = useState(false);

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

        fetchHistory();

        return () => clearInterval(intervalId);
    }, [isTimeEdited]);

    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    async function fetchHistory() {
        const res = await fetch('/api/finance');
        if (res.ok) {
            const data = await res.json();
            setHistory(data);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);
        if (!amount || isNaN(parseFloat(amount))) {
            setMessage({ type: 'error', text: 'Please enter a valid amount.' });
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
            const res = await fetch('/api/finance', {
                method: 'POST',
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    category,
                    transaction_type: type,
                    description,
                    transaction_date: timestamp
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
                setAmount('');
                setDescription('');
                fetchHistory();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Failed to save transaction.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Server connection error.' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        setMessage(null);

        const res = await fetch(`/api/finance?id=${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            setIsDeletingFinanceId(null);
            setMessage({ type: 'success', text: 'Entry discarded.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to delete transaction.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    async function handleClearAll() {
        setLoading(true);
        setMessage(null);

        const res = await fetch(`/api/finance?id=all`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchHistory();
            setIsDeletingAllFinance(false);
            setMessage({ type: 'success', text: 'Financial history wiped clean.' });
        } else {
            setMessage({ type: 'error', text: 'Failed to clear history.' });
        }
        setLoading(false);
        setTimeout(() => setMessage(null), 3000);
    }

    // Calculations
    const totalIncome = history.filter(h => h.transaction_type === 'income').reduce((acc, h) => acc + parseFloat(h.amount), 0);
    const totalExpenses = history.filter(h => h.transaction_type === 'expense').reduce((acc, h) => acc + parseFloat(h.amount), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.badge}>SYSTEMS / FINANCE</div>
                <h1>Financial Management</h1>
                <p>Track your flow, optimize savings, and build wealth with precision.</p>

                <div className={styles.viewSwitcher}>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'entry' ? styles.switchBtnActive : ''}`}
                        onClick={() => setViewMode('entry')}
                    >
                        New Entry
                    </button>
                    <button
                        className={`${styles.switchBtn} ${viewMode === 'history' ? styles.switchBtnActive : ''}`}
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

            {viewMode === 'entry' ? (
                <div className={styles.grid}>
                    <section className={styles.mainCol}>
                        <form onSubmit={handleSubmit} className={styles.formCard}>
                            <div className="card glass" style={{ padding: '0.65rem' }}>
                                <h2 className={styles.sectionTitle}>New Transaction</h2>
                                <div className={styles.fieldGroup} style={{ gap: '0.75rem' }}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Type</label>
                                        <div className={styles.typeSelector}>
                                            <button
                                                type="button"
                                                className={type === 'income' ? styles.activeType : ''}
                                                onClick={() => setType('income')}
                                            >Income</button>
                                            <button
                                                type="button"
                                                className={type === 'expense' ? styles.activeType : ''}
                                                onClick={() => setType('expense')}
                                            >Expense</button>
                                            <button
                                                type="button"
                                                className={type === 'savings' ? styles.activeType : ''}
                                                onClick={() => setType('savings')}
                                            >Savings</button>
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Category</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className={styles.select}
                                        >
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Description</label>
                                        <input
                                            type="text"
                                            placeholder="What was this for?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Date & Time</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                </div>
                            </div>

                            <button type="submit" className="primary-btn" style={{ marginTop: '1rem', width: '100%', padding: '0.65rem', fontSize: '0.8rem' }} disabled={loading}>
                                {loading ? 'Processing...' : 'Record Transaction'}
                            </button>
                        </form>
                    </section>

                    <aside className={styles.sideCol}>
                        <div className="card glass">
                            <h3 className={styles.sideTitle}>Financial Vitals</h3>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>Savings Rate</p>
                                <p className={styles.statValue} style={{ color: 'var(--accent)' }}>{savingsRate}%</p>
                            </div>
                            <div className={styles.miniCharts}>
                                <div className={styles.progressLabel}>
                                    <span>Income</span>
                                    <span>₹{totalIncome.toLocaleString()}</span>
                                </div>
                                <div className={styles.progressBar}><div style={{ width: '100%', background: 'var(--accent)' }}></div></div>

                                <div className={styles.progressLabel} style={{ marginTop: '1rem' }}>
                                    <span>Expenses</span>
                                    <span>₹{totalExpenses.toLocaleString()}</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div style={{
                                        width: totalIncome > 0 ? `${Math.min((totalExpenses / totalIncome) * 100, 100)}%` : '0%',
                                        background: 'var(--secondary)'
                                    }}></div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.historyCardStandard}>
                            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.65rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className={styles.sideTitle} style={{ margin: 0 }}>Recent Logs</h3>
                                    {history.length > 0 && (
                                        isDeletingAllFinance ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <button onClick={handleClearAll} className={styles.deleteBtn} style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem' }}>CONFIRM</button>
                                                <button onClick={() => setIsDeletingAllFinance(false)} className={styles.deleteBtn} style={{ fontSize: '0.7rem', padding: '0.2rem' }}>NO</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setIsDeletingAllFinance(true)} className={styles.deleteBtn} style={{ fontSize: '0.8rem', padding: '0.2rem' }} title="Clear All">🗑️ ALL</button>
                                        )
                                    )}
                                </div>
                                <div className={styles.historyList}>
                                    {history.length > 0 ? (
                                        history.map((entry) => (
                                            <div key={entry.id} className={styles.historyItem}>
                                                <div className={styles.historyHeader}>
                                                    <div className={styles.historyDate}>
                                                        <div>{formatDateTime(entry.transaction_date || entry.created_at).date}</div>
                                                        <div style={{ opacity: 0.6 }}>{formatDateTime(entry.transaction_date || entry.created_at).time}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: entry.transaction_type === 'income' ? 'var(--accent)' : (entry.transaction_type === 'expense' ? '#ff4d4d' : '#ff9f43') }}>
                                                            {entry.transaction_type === 'income' ? '+' : '-'}₹{parseFloat(entry.amount).toLocaleString()}
                                                        </span>
                                                        {isDeletingFinanceId === entry.id ? (
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                <button onClick={() => handleDelete(entry.id)} className={styles.deleteBtn} style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold' }}>✓</button>
                                                                <button onClick={() => setIsDeletingFinanceId(null)} className={styles.deleteBtn} style={{ fontSize: '0.7rem' }}>✗</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setIsDeletingFinanceId(entry.id)} className={styles.deleteBtn} style={{ fontSize: '0.7rem' }}>🗑️</button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{entry.category}</span>
                                                    {entry.description && <span style={{ fontStyle: 'italic' }}>{entry.description.slice(0, 15)}{entry.description.length > 15 ? '...' : ''}</span>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.hint}>No transactions found.</p>
                                    )}
                                </div>
                                <button className="secondary-btn" style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.7rem', padding: '0.4rem' }} onClick={() => setViewMode('history')}>
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
                            <div className={styles.statValue}>
                                ₹{history.filter(h => h.transaction_type === 'income').reduce((acc, h) => acc + parseFloat(h.amount), 0).toLocaleString()}
                            </div>
                            <div className={styles.statLabel}>Total Income</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                ₹{history.filter(h => h.transaction_type === 'expense').reduce((acc, h) => acc + parseFloat(h.amount), 0).toLocaleString()}
                            </div>
                            <div className={styles.statLabel}>Total Expenses</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                {history.length > 0 ? (
                                    ((history.filter(h => h.transaction_type === 'income').reduce((acc, h) => acc + parseFloat(h.amount), 0) -
                                        history.filter(h => h.transaction_type === 'expense').reduce((acc, h) => acc + parseFloat(h.amount), 0)) /
                                        Math.max(1, history.filter(h => h.transaction_type === 'income').reduce((acc, h) => acc + parseFloat(h.amount), 0)) * 100).toFixed(1)
                                ) : '0'}%
                            </div>
                            <div className={styles.statLabel}>Savings Rate</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{history.length}</div>
                            <div className={styles.statLabel}>Total Logs</div>
                        </div>
                    </div>

                    <div className={styles.trackingList}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Financial Performance Timeline</h2>
                            {history.length > 0 && (
                                isDeletingAllFinance ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure?</span>
                                        <button className={styles.clearAllBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }} onClick={handleClearAll}>Yes, Clear All</button>
                                        <button className={styles.clearAllBtn} onClick={() => setIsDeletingAllFinance(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsDeletingAllFinance(true)} className={styles.clearAllBtn}>Clear Entire History 🗑️</button>
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
                                        <p>{new Date(entry.created_at).getFullYear()} • {formatDateTime(entry.created_at).time}</p>
                                    </div>
                                    <div className={styles.expandedScores}>
                                        <div className={styles.scoreBadge} style={{ color: entry.transaction_type === 'income' ? 'var(--accent)' : '#ff4d4d' }}>
                                            {entry.transaction_type === 'income' ? '+' : '-'}₹{parseFloat(entry.amount).toLocaleString()}
                                        </div>
                                        <div className={styles.scoreBadge}>{entry.category}</div>
                                        <div className={styles.scoreBadge} style={{ textTransform: 'capitalize' }}>{entry.transaction_type}</div>
                                    </div>
                                </div>
                                {entry.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{entry.description}</p>}
                                <div className={styles.deleteActionArea} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    {isDeletingFinanceId === entry.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 'bold' }}>Are you sure?</span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className={styles.discardBtn} style={{ background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }}
                                            >
                                                Yes, Discard
                                            </button>
                                            <button
                                                onClick={() => setIsDeletingFinanceId(null)}
                                                className={styles.discardBtn}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsDeletingFinanceId(entry.id)}
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
