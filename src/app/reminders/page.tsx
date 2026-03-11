'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './reminders.module.css';

export default function RemindersPage() {
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reminderFilter, setReminderFilter] = useState('pending');

    // Reminder Modal state
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [remTitle, setRemTitle] = useState('');
    const [remDesc, setRemDesc] = useState('');
    const [remDate, setRemDate] = useState('');
    const [remHour, setRemHour] = useState('12');
    const [remMinute, setRemMinute] = useState('00');
    const [remAmPm, setRemAmPm] = useState('PM');
    const [remCategory, setRemCategory] = useState('personal');
    const [remPriority, setRemPriority] = useState('medium');
    const [remRecurrence, setRemRecurrence] = useState('none');
    const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Toast State
    const [reminderToast, setReminderToast] = useState<string | null>(null);
    const [isDeletingAllReminders, setIsDeletingAllReminders] = useState(false);

    const showReminderToast = (msg: string) => {
        setReminderToast(msg);
        setTimeout(() => setReminderToast(null), 3000);
    };

    const fetchReminders = useCallback(async () => {
        setLoading(true);
        let url = `/api/reminders?filter=${reminderFilter}`;
        const res = await fetch(url);
        if (res.ok) setReminders(await res.json());
        setLoading(false);
    }, [reminderFilter]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    const toggleReminderStatus = async (reminder: any) => {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        const res = await fetch('/api/reminders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reminder_id: reminder.reminder_id, status: newStatus })
        });
        if (res.ok) {
            fetchReminders();
            if (newStatus === 'completed') showReminderToast(`"${reminder.title}" marked as complete!`);
        }
    };

    const handleEditReminder = (reminder: any) => {
        setActiveReminderId(reminder.reminder_id);
        setRemTitle(reminder.title);
        setRemDesc(reminder.description || '');
        setRemCategory(reminder.category || 'personal');
        setRemPriority(reminder.priority || 'medium');
        setRemRecurrence(reminder.recurrence || 'none');

        const rDate = new Date(reminder.remind_at);
        const offset = rDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(rDate.getTime() - offset)).toISOString().slice(0, 16);
        const [datePart, timePart] = localISOTime.split('T');

        let h = parseInt(timePart.split(':')[0]);
        const m = timePart.split(':')[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;

        setRemDate(datePart);
        setRemHour(h.toString());
        setRemMinute(m);
        setRemAmPm(ampm);

        setIsReminderOpen(true);
    };

    const handleAddReminder = async () => {
        if (!remTitle || !remDate) {
            alert('Title and Date are required.');
            return;
        }
        setIsSaving(true);

        let hours = parseInt(remHour, 10);
        if (remAmPm === 'PM' && hours !== 12) hours += 12;
        if (remAmPm === 'AM' && hours === 12) hours = 0;
        const dateTimeStr = `${remDate}T${hours.toString().padStart(2, '0')}:${remMinute}:00`;

        const bodyPayload: any = {
            title: remTitle,
            description: remDesc,
            remind_at: new Date(dateTimeStr).toISOString(),
            category: remCategory,
            priority: remPriority,
            recurrence: remRecurrence
        };

        if (activeReminderId) bodyPayload.reminder_id = activeReminderId;

        const res = await fetch('/api/reminders', {
            method: activeReminderId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        setIsSaving(false);
        if (res.ok) {
            setIsReminderOpen(false);
            setRemTitle(''); setRemDesc(''); setRemDate(''); setActiveReminderId(null);
            fetchReminders();
            showReminderToast(activeReminderId ? 'Reminder updated!' : 'Reminder created!');
        } else {
            console.error('Failed to save reminder');
            alert('Failed to save reminder.');
        }
    };

    const deleteReminder = async (id: string) => {
        const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchReminders();
            showReminderToast('Reminder deleted.');
        }
    };

    const handleDeleteAllReminders = async () => {
        try {
            const res = await fetch('/api/reminders?all=true', { method: 'DELETE' });
            if (res.ok) {
                fetchReminders();
                setIsDeletingAllReminders(false);
                showReminderToast('All reminders deleted.');
            } else {
                const err = await res.json();
                alert(`Failed to delete all reminders: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred during deletion.');
        }
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>Reminders</h1>
                    <p>Stay on top of your tasks and events.</p>
                </div>
            </header>

            <div className={styles.panelHeader}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>📅 Active Reminders</h2>
                    {reminders.length > 0 && (
                        isDeletingAllReminders ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button className={styles.btnDanger} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={handleDeleteAllReminders}>Yes, Delete All</button>
                                <button className={styles.btnSecondary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} onClick={() => setIsDeletingAllReminders(false)}>Cancel</button>
                            </div>
                        ) : (
                            <button className={styles.logDeleteBtn} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={() => setIsDeletingAllReminders(true)}>
                                🗑️ Delete All
                            </button>
                        )
                    )}
                </div>
                <button className={styles.miniBtn} onClick={() => {
                    const now = new Date();
                    const offset = now.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
                    const [datePart, timePart] = localISOTime.split('T');

                    let h = parseInt(timePart.split(':')[0]);
                    const m = timePart.split(':')[1];
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;

                    setRemDate(datePart);
                    setRemHour(h.toString());
                    setRemMinute(m);
                    setRemAmPm(ampm);
                    setRemTitle(''); setRemDesc(''); setRemCategory('personal'); setRemPriority('medium'); setRemRecurrence('none'); setActiveReminderId(null);
                    setIsReminderOpen(true);
                }}>+ Add Reminder</button>
            </div>

            {reminderToast && (
                <div style={{ padding: '1rem', margin: '1rem 0', background: 'var(--primary)', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', animation: 'fadeIn 0.2s ease-out', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                    {reminderToast}
                </div>
            )}

            <div className={styles.filterTabs}>
                {['pending', 'completed', 'all'].map(f => (
                    <button
                        key={f}
                        onClick={() => setReminderFilter(f)}
                        className={`${styles.filterTab} ${reminderFilter === f ? styles.activeTab : ''}`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className={styles.emptyText}>Loading reminders...</p>
            ) : (
                <div className={styles.reminderList}>
                    {reminders.map(r => {
                        const isOverdue = new Date(r.remind_at) < new Date() && r.status === 'pending';
                        return (
                            <div key={r.reminder_id} className={`${styles.reminderItem} ${r.status === 'completed' ? styles.taskDone : ''}`} style={{ borderLeft: `4px solid ${r.priority === 'high' ? 'var(--red)' : r.priority === 'low' ? 'var(--blue)' : 'var(--yellow)'}`, flexDirection: 'column', gap: '0.75rem', width: '100%', overflow: 'hidden' }}>
                                <div className={styles.reminderHeaderRow}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                        <input type="checkbox" checked={r.status === 'completed'} onChange={() => toggleReminderStatus(r)} style={{ cursor: 'pointer', marginTop: '0.3rem', flexShrink: 0, width: '18px', height: '18px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                                            <strong style={{ fontSize: '1.05rem', textDecoration: r.status === 'completed' ? 'line-through' : 'none', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{r.title}</strong>
                                            {r.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{r.description}</p>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        <button className={styles.logDeleteBtn} onClick={() => handleEditReminder(r)}>Edit</button>
                                        <button className={styles.logDeleteBtn} onClick={() => deleteReminder(r.reminder_id)}>Delete</button>
                                    </div>
                                </div>
                                <div className={styles.reminderTime} style={{ marginLeft: '2rem', marginTop: '0', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span>{new Date(r.remind_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                    {isOverdue && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--red)', borderRadius: '4px' }}>OVERDUE</span>}
                                    <span style={{ color: 'var(--text-muted)' }}>• {r.category}</span>
                                </div>
                            </div>
                        )
                    })}
                    {reminders.length === 0 && <p className={styles.emptyText}>No reminders for this filter.</p>}
                </div>
            )}

            {/* Reminder Creation Modal */}
            {isReminderOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsReminderOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <header className={styles.modalHeader}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{activeReminderId ? 'Edit Reminder' : 'New Reminder'}</h2>
                            <button className={styles.modalClose} onClick={() => setIsReminderOpen(false)}>×</button>
                        </header>
                        <div className={styles.modalBody}>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Reminder Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Doctor's Appointment"
                                    value={remTitle}
                                    onChange={(e) => setRemTitle(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '1rem' }}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Description (Optional)</label>
                                <textarea
                                    placeholder="Add notes..."
                                    value={remDesc}
                                    onChange={(e) => setRemDesc(e.target.value)}
                                    rows={3}
                                    className={styles.logTextarea}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Date & Time</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <input
                                        type="date"
                                        value={remDate}
                                        onChange={(e) => setRemDate(e.target.value)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minWidth: '150px' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                                        <select value={remHour} onChange={(e) => setRemHour(e.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                            {[...Array(12)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>{(i + 1).toString()}</option>)}
                                        </select>
                                        <span style={{ fontWeight: 800 }}>:</span>
                                        <select value={remMinute} onChange={(e) => setRemMinute(e.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                            {[...Array(60)].map((_, i) => {
                                                const min = i.toString().padStart(2, '0');
                                                return <option key={min} value={min}>{min}</option>;
                                            })}
                                        </select>
                                        <select value={remAmPm} onChange={(e) => setRemAmPm(e.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Category</label>
                                    <select value={remCategory} onChange={(e) => setRemCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
                                        <option value="personal">Personal</option>
                                        <option value="task">Task</option>
                                        <option value="health">Health</option>
                                        <option value="finance">Finance</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Priority</label>
                                    <select value={remPriority} onChange={(e) => setRemPriority(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Recurrence</label>
                                    <select value={remRecurrence} onChange={(e) => setRemRecurrence(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
                                        <option value="none">One-time</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <footer className={styles.modalFooter}>
                            <button className={styles.btnSecondary} onClick={() => setIsReminderOpen(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handleAddReminder} disabled={isSaving || !remTitle || !remDate}>
                                {isSaving ? 'Saving...' : (activeReminderId ? 'Save Changes' : 'Set Reminder')}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </main>
    );
}
