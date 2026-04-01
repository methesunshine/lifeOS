'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './reminders.module.css';

const REMINDER_REFRESH_EVENT = 'reminderUpdated';

function getReminderBadge(reminder: any) {
    const isOverdue = new Date(reminder.remind_at) < new Date() && reminder.status === 'pending';

    if (isOverdue) {
        return { label: 'OVERDUE', background: 'var(--red)', color: 'white' };
    }

    if (reminder.status === 'snoozed' && new Date(reminder.remind_at) > new Date()) {
        return { label: 'DELAY', background: 'var(--yellow)', color: 'black' };
    }

    if (reminder.status === 'completed') {
        return { label: 'DONE', background: '#10b981', color: 'white' };
    }

    if (reminder.status === 'cancelled') {
        return { label: 'CANCEL', background: '#ef4444', color: 'white' };
    }

    return null;
}

function SnoozeCountdown({ remindAt }: { remindAt: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculate = () => {
            const now = new Date();
            const target = new Date(remindAt);
            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('00:00');
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [remindAt]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--yellow)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>SNOOZE TIMER</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--yellow)', fontWeight: 'bold', fontFamily: 'monospace' }}>{timeLeft}</span>
        </div>
    );
}

export default function RemindersPage() {
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reminderFilter, setReminderFilter] = useState('pending');

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
    const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

    const [reminderToast, setReminderToast] = useState<string | null>(null);
    const [deleteConfirmScope, setDeleteConfirmScope] = useState<'filtered' | 'everything' | null>(null);

    const showReminderToast = (msg: string) => {
        setReminderToast(msg);
        setTimeout(() => setReminderToast(null), 3000);
    };

    const fetchReminders = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/reminders?filter=${reminderFilter}`);
        if (res.ok) {
            setReminders(await res.json());
        }
        setLoading(false);
    }, [reminderFilter]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    useEffect(() => {
        if (!loading && reminders.length > 0) {
            const urlParams = new URLSearchParams(window.location.search);
            const highlightId = urlParams.get('id');
            if (highlightId) {
                setTimeout(() => {
                    const element = document.getElementById(`reminder-${highlightId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.style.transition = 'all 1s ease';
                        element.style.boxShadow = '0 0 20px var(--primary)';
                        element.style.borderColor = 'var(--primary)';
                        element.style.transform = 'scale(1.02)';
                        
                        setTimeout(() => {
                            element.style.boxShadow = '';
                            element.style.transform = '';
                        }, 3000);
                    }
                }, 500);
            }
        }
    }, [loading, reminders]);

    useEffect(() => {
        const handleRefresh = () => fetchReminders();
        window.addEventListener(REMINDER_REFRESH_EVENT, handleRefresh);
        return () => window.removeEventListener(REMINDER_REFRESH_EVENT, handleRefresh);
    }, [fetchReminders]);

    useEffect(() => {
        setDeleteConfirmScope(null);
    }, [reminderFilter]);

    const toggleReminderStatus = async (reminder: any) => {
        const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
        const res = await fetch('/api/reminders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reminder_id: reminder.reminder_id, status: newStatus }),
        });

        if (res.ok) {
            fetchReminders();
            if (newStatus === 'completed') {
                showReminderToast(`"${reminder.title}" marked as complete!`);
            }
        }
    };

    const handleEditReminder = (reminder: any) => {
        setActiveReminderId(reminder.reminder_id);
        setRemTitle(reminder.title);
        setRemDesc(reminder.description || '');
        setRemCategory(reminder.category || 'personal');
        setRemPriority(reminder.priority || 'medium');
        setRemRecurrence(reminder.recurrence || 'none');

        const reminderDate = new Date(reminder.remind_at);
        const offset = reminderDate.getTimezoneOffset() * 60000;
        const localISOTime = new Date(reminderDate.getTime() - offset).toISOString().slice(0, 16);
        const [datePart, timePart] = localISOTime.split('T');
        let hour = parseInt(timePart.split(':')[0], 10);
        const minute = timePart.split(':')[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;

        setRemDate(datePart);
        setRemHour(hour.toString());
        setRemMinute(minute);
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
            recurrence: remRecurrence,
        };

        if (activeReminderId) {
            bodyPayload.reminder_id = activeReminderId;
        }

        const res = await fetch('/api/reminders', {
            method: activeReminderId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
        });

        setIsSaving(false);
        if (res.ok) {
            setIsReminderOpen(false);
            setRemTitle('');
            setRemDesc('');
            setRemDate('');
            setActiveReminderId(null);
            fetchReminders();
            showReminderToast(activeReminderId ? 'Reminder updated!' : 'Reminder created!');
        } else {
            alert('Failed to save reminder.');
        }
    };

    const deleteReminder = async (id: string) => {
        const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchReminders();
            showReminderToast('Reminder deleted!');
        }
    };

    const getFilterDeleteLabel = () => {
        if (reminderFilter === 'pending') return 'Delete Pending';
        if (reminderFilter === 'completed') return 'Delete Completed';
        return 'Delete All';
    };

    const getFilterDeleteEmoji = () => {
        if (reminderFilter === 'pending') return '🟡';
        if (reminderFilter === 'completed') return '🟢';
        return '🔵';
    };

    const handleDeleteReminders = async (scope: 'filtered' | 'everything') => {
        try {
            const filter = scope === 'everything' ? 'all' : reminderFilter;
            const res = await fetch(`/api/reminders?all=true&filter=${filter}`, { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                fetchReminders();
                setDeleteConfirmScope(null);
                showReminderToast(data.message || 'Reminders deleted.');
            } else {
                const err = await res.json();
                alert(`Failed to delete reminders: ${err.error || 'Unknown error'}`);
            }
        } catch {
            alert('An error occurred during deletion.');
        }
    };

    return (
        <>
            <main className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>Reminders</h1>
                    <p>Stay on top of your tasks and events.</p>
                </div>
            </header>

            <div className={styles.panelHeader}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Active Reminders</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={styles.logDeleteBtn} onClick={() => handleDeleteReminders('filtered')}>
                            {getFilterDeleteEmoji()} {getFilterDeleteLabel()}
                        </button>
                        <button className={styles.logDeleteBtn} onClick={() => handleDeleteReminders('everything')}>
                            🗑️ EVERYTHING
                        </button>
                    </div>
                </div>

                <button
                    className={styles.miniBtn}
                    onClick={() => {
                        const now = new Date();
                        const offset = now.getTimezoneOffset() * 60000;
                        const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                        const [datePart, timePart] = localISOTime.split('T');
                        let hour = parseInt(timePart.split(':')[0], 10);
                        const minute = timePart.split(':')[1];
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        hour = hour % 12 || 12;

                        setRemDate(datePart);
                        setRemHour(hour.toString());
                        setRemMinute(minute);
                        setRemAmPm(ampm);
                        setRemTitle('');
                        setRemDesc('');
                        setRemCategory('personal');
                        setRemPriority('medium');
                        setRemRecurrence('none');
                        setActiveReminderId(null);
                        setIsReminderOpen(true);
                    }}
                >
                    + Add Reminder
                </button>
            </div>

            {reminderToast && (
                <div style={{ padding: '1rem', margin: '1rem 0', background: 'var(--primary)', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', animation: 'fadeIn 0.2s ease-out', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                    {reminderToast}
                </div>
            )}

            <section className={styles.activeReminderBox}>
                <div className={styles.filterTabs}>
                    {['pending', 'completed', 'all'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setReminderFilter(filter)}
                            className={`${styles.filterTab} ${reminderFilter === filter ? styles.activeTab : ''}`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>

                <div className={styles.reminderScrollArea}>
                        {loading ? (
                            <p className={styles.emptyText}>Loading reminders...</p>
                        ) : (
                            <div className={styles.reminderList}>
                                {reminders.map((reminder) => {
                                    const reminderBadge = getReminderBadge(reminder);
                                    return (
                                        <div
                                            key={reminder.reminder_id}
                                            id={`reminder-${reminder.reminder_id}`}
                                            className={`${styles.reminderItem} ${reminder.status === 'completed' ? styles.taskDone : ''}`}
                                            style={{
                                                borderLeft: `4px solid ${reminder.priority === 'high' ? 'var(--red)' : reminder.priority === 'low' ? 'var(--blue)' : 'var(--yellow)'}`,
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                width: '100%',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div className={styles.reminderHeaderRow}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={reminder.status === 'completed'}
                                                        onChange={() => toggleReminderStatus(reminder)}
                                                        style={{ cursor: 'pointer', marginTop: '0.3rem', flexShrink: 0, width: '18px', height: '18px' }}
                                                    />
                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                                                        <strong style={{ fontSize: '1.05rem', textDecoration: reminder.status === 'completed' ? 'line-through' : 'none', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                            {reminder.title}
                                                        </strong>
                                                        {reminder.description && (
                                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                {reminder.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                    <button className={styles.logDeleteBtn} onClick={() => handleEditReminder(reminder)}>Edit</button>
                                                    <button className={styles.logDeleteBtn} onClick={() => deleteReminder(reminder.reminder_id)}>Delete</button>
                                                </div>
                                            </div>

                                            <div className={styles.reminderTime} style={{ marginLeft: '2rem', marginTop: '0', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', width: 'calc(100% - 2rem)' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span>{new Date(reminder.remind_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                    {reminderBadge && (
                                                        <span style={{ color: reminderBadge.color, fontWeight: 'bold', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: reminderBadge.background, borderRadius: '4px' }}>
                                                            {reminderBadge.label}
                                                        </span>
                                                    )}
                                                    <span style={{ color: 'var(--text-muted)' }}>• {reminder.category}</span>
                                                </div>

                                                {reminder.status === 'snoozed' && new Date(reminder.remind_at) > new Date() && (
                                                    <SnoozeCountdown remindAt={reminder.remind_at} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {reminders.length === 0 && <p className={styles.emptyText}>No reminders for this filter.</p>}
                            </div>
                        )}
                    </div>
            </section>
        </main>

        {isReminderOpen && (
            <div className={styles.modalOverlay} onClick={() => setIsReminderOpen(false)}>
                <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
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
                                onChange={(event) => setRemTitle(event.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '1rem' }}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Description (Optional)</label>
                            <textarea
                                placeholder="Add notes..."
                                value={remDesc}
                                onChange={(event) => setRemDesc(event.target.value)}
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
                                    onChange={(event) => setRemDate(event.target.value)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minWidth: '150px' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    <select value={remHour} onChange={(event) => setRemHour(event.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                        {[...Array(12)].map((_, index) => (
                                            <option key={index + 1} value={(index + 1).toString()}>
                                                {(index + 1).toString()}
                                            </option>
                                        ))}
                                    </select>
                                    <span style={{ fontWeight: 800 }}>:</span>
                                    <select value={remMinute} onChange={(event) => setRemMinute(event.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                        {[...Array(60)].map((_, index) => {
                                            const minute = index.toString().padStart(2, '0');
                                            return (
                                                <option key={minute} value={minute}>
                                                    {minute}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <select value={remAmPm} onChange={(event) => setRemAmPm(event.target.value)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Category</label>
                                <select value={remCategory} onChange={(event) => setRemCategory(event.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
                                    <option value="personal">Personal</option>
                                    <option value="task">Task</option>
                                    <option value="health">Health</option>
                                    <option value="finance">Finance</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Priority</label>
                                <select value={remPriority} onChange={(event) => setRemPriority(event.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Recurrence</label>
                                <select value={remRecurrence} onChange={(event) => setRemRecurrence(event.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
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
                            {isSaving ? 'Saving...' : activeReminderId ? 'Save Changes' : 'Set Reminder'}
                        </button>
                    </footer>
                </div>
            </div>
        )}
        </>
    );
}
