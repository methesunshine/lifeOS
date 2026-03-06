'use client';

import { useEffect, useState } from 'react';

export default function ActiveReminderAlert() {
    const [dueReminders, setDueReminders] = useState<any[]>([]);

    const checkReminders = async () => {
        try {
            const res = await fetch('/api/reminders?filter=pending');
            if (!res.ok) return;
            const reminders = await res.json();

            const now = new Date();
            const acknowledged = JSON.parse(localStorage.getItem('acknowledgedReminders') || '[]');

            const newlyDue = reminders.filter((r: any) => {
                const remindAt = new Date(r.remind_at);
                // If it is past or exactly the remind time, AND we haven't acknowledged it yet
                return remindAt <= now && !acknowledged.includes(r.reminder_id);
            });

            if (newlyDue.length > 0) {
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

    const handleMarkComplete = async (reminder_id: string) => {
        try {
            await fetch('/api/reminders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reminder_id, status: 'completed' })
            });
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

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={() => handleMarkComplete(r.reminder_id)}
                            style={{ flex: 1, padding: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Complete
                        </button>
                        <button
                            onClick={() => handleAcknowledge(r.reminder_id)}
                            style={{ flex: 1, padding: '0.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Snooze / Dismiss
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
