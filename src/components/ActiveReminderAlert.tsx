'use client';

import { useEffect, useState } from 'react';

const REMINDER_REFRESH_EVENT = 'reminderUpdated';
const TELEGRAM_DUE_NOTIFIED_KEY = 'telegramDueNotifiedReminders';

type ReminderAlert = {
    reminder_id: string
    remind_at: string
    title: string
    description?: string
    status: string
}

export default function ActiveReminderAlert() {
    const [dueReminders, setDueReminders] = useState<ReminderAlert[]>([]);

    const checkReminders = async () => {
        try {
            const res = await fetch('/api/reminders?filter=pending');
            if (!res.ok) return;
            const reminders = await res.json() as ReminderAlert[];

            const now = new Date();
            const acknowledged = JSON.parse(localStorage.getItem('acknowledgedReminders') || '[]');

            const newlyDue = reminders.filter((r) => {
                const remindAt = new Date(r.remind_at);
                // Trigger if it's due OR if it's snoozed but the snooze time has passed
                // (Note: The API filter 'pending' should now include 'snoozed' items)
                return remindAt <= now && !acknowledged.includes(r.reminder_id);
            });

            if (newlyDue.length > 0) {
                const notified = JSON.parse(localStorage.getItem(TELEGRAM_DUE_NOTIFIED_KEY) || '[]');

                for (const reminder of newlyDue) {
                    if (!notified.includes(reminder.reminder_id)) {
                        fetch('/api/reminders/notify-due', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reminder_id: reminder.reminder_id })
                        }).catch((error) => {
                            console.error('Failed to send due Telegram notification', error);
                        });
                        notified.push(reminder.reminder_id);
                    }
                }

                localStorage.setItem(TELEGRAM_DUE_NOTIFIED_KEY, JSON.stringify(notified));
                setDueReminders(newlyDue);
            } else {
                setDueReminders([]);
            }
        } catch (error) {
            console.error('Failed to check reminders for alerts', error);
        }
    };

    useEffect(() => {
        // Initial check
        checkReminders();
        // Check every 30 seconds
        const interval = setInterval(checkReminders, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAcknowledge = (reminder_id: string) => {
        const acknowledged = JSON.parse(localStorage.getItem('acknowledgedReminders') || '[]');
        if (!acknowledged.includes(reminder_id)) {
            acknowledged.push(reminder_id);
            localStorage.setItem('acknowledgedReminders', JSON.stringify(acknowledged));
        }
        setDueReminders(prev => prev.filter(r => r.reminder_id !== reminder_id));
    };

    const handleSnooze = async (reminder_id: string) => {
        try {
            const tenMinsLater = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            const res = await fetch('/api/reminders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminder_id, remind_at: tenMinsLater, status: 'snoozed' })
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || 'Failed to snooze reminder.');
            }
            // When snoozing, we MUST remove it from acknowledged list so it triggers again later
            const acknowledged = JSON.parse(localStorage.getItem('acknowledgedReminders') || '[]');
            const updated = acknowledged.filter((id: string) => id !== reminder_id);
            localStorage.setItem('acknowledgedReminders', JSON.stringify(updated));
            const notified = JSON.parse(localStorage.getItem(TELEGRAM_DUE_NOTIFIED_KEY) || '[]');
            localStorage.setItem(
                TELEGRAM_DUE_NOTIFIED_KEY,
                JSON.stringify(notified.filter((id: string) => id !== reminder_id))
            );

            // Notify reminder surfaces to refresh so SNOOZE badge and timer appear immediately.
            window.dispatchEvent(new CustomEvent(REMINDER_REFRESH_EVENT));

            setDueReminders(prev => prev.filter(r => r.reminder_id !== reminder_id));
        } catch (e) {
            console.error('Snooze failed', e);
        }
    };

    const handleDismiss = async (reminder_id: string) => {
        try {
            // Dismissing stores a cancelled state so the reminders page can show CANCEL.
            const res = await fetch('/api/reminders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminder_id, status: 'cancelled' })
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || 'Failed to dismiss reminder.');
            }
            
            const acknowledged = JSON.parse(localStorage.getItem('acknowledgedReminders') || '[]');
            if (!acknowledged.includes(reminder_id)) {
                acknowledged.push(reminder_id);
                localStorage.setItem('acknowledgedReminders', JSON.stringify(acknowledged));
            }
            const notified = JSON.parse(localStorage.getItem(TELEGRAM_DUE_NOTIFIED_KEY) || '[]');
            localStorage.setItem(
                TELEGRAM_DUE_NOTIFIED_KEY,
                JSON.stringify(notified.filter((id: string) => id !== reminder_id))
            );

            // Notify page to show the CANCEL badge immediately.
            window.dispatchEvent(new CustomEvent(REMINDER_REFRESH_EVENT));
            
            setDueReminders(prev => prev.filter(r => r.reminder_id !== reminder_id));
        } catch (e) {
            console.error('Dismiss failed', e);
        }
    };

    const handleMarkComplete = async (reminder_id: string) => {
        try {
            const res = await fetch('/api/reminders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminder_id, status: 'completed' })
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || 'Failed to complete reminder.');
            }
            const notified = JSON.parse(localStorage.getItem(TELEGRAM_DUE_NOTIFIED_KEY) || '[]');
            localStorage.setItem(
                TELEGRAM_DUE_NOTIFIED_KEY,
                JSON.stringify(notified.filter((id: string) => id !== reminder_id))
            );
            window.dispatchEvent(new CustomEvent(REMINDER_REFRESH_EVENT));
            handleAcknowledge(reminder_id); // dismiss it from screen
        } catch (e) {
            console.error(e);
        }
    };

    if (dueReminders.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {dueReminders.map(r => (
                <div key={r.reminder_id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--primary)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    width: '320px',
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>⏰</span>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>Reminder Due!</h3>
                    </div>

                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '4px', wordBreak: 'break-word' }}>{r.title}</strong>
                    {r.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0', wordBreak: 'break-word' }}>{r.description}</p>}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={() => handleMarkComplete(r.reminder_id)}
                            style={{ flex: 2, minWidth: '100px', padding: '0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                            Complete
                        </button>
                        <button
                            onClick={() => handleSnooze(r.reminder_id)}
                            style={{ flex: 1, minWidth: '80px', padding: '0.6rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                            Snooze
                        </button>
                        <button
                            onClick={() => handleDismiss(r.reminder_id)}
                            style={{ flex: 1, minWidth: '80px', padding: '0.6rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ))}
            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
