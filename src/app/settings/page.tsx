'use client';

import { useState, useEffect } from 'react';
import styles from './settings.module.css';

export default function SettingsPage() {
    const [token, setToken] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/profile');
            const data = await res.json();
            if (data.profile) {
                setToken(data.profile.pushbullet_token || '');
                setEnabled(data.profile.notifications_enabled);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pushbullet_token: token,
                    notifications_enabled: enabled
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTestLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/notify/test', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Test notification sent! Check your devices.' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Test notification failed.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred during test.' });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>System Settings</h1>
                <p>Configure your personal LifeOS interface and notification preferences.</p>
            </header>

            <div className={styles.settingsGrid}>
                <section className={`${styles.section} card glass`}>
                    <h2><span>📱</span> Pushbullet Notifications</h2>
                    <p className={styles.sectionText}>
                        Receive real-time system alerts, burnout risks, and reminders on your phone or desktop.
                    </p>

                    <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>Access Token</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showToken ? "text" : "password"}
                                placeholder="o.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className={styles.inputField}
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                            <button 
                                type="button"
                                className={styles.toggleVisibilityBtn}
                                onClick={() => setShowToken(!showToken)}
                                title={showToken ? "Hide Token" : "Show Token"}
                            >
                                {showToken ? '👁️' : '🔒'}
                            </button>
                        </div>
                        <p className={styles.hint}>
                            Get your token from the <a href="https://www.pushbullet.com/#settings" target="_blank" rel="noopener noreferrer">Pushbullet Settings</a> page.
                        </p>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <div className={styles.toggleRow}>
                            <div className={styles.toggleLabel}>
                                <span className={styles.toggleTitle}>Enable System Alerts</span>
                                <span className={styles.toggleDesc}>Pushes critical anomalies and daily summaries.</span>
                            </div>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => setEnabled(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.controls}>
                        <button
                            className={`${styles.saveBtn} primary-btn`}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button
                            className={styles.testBtn}
                            onClick={handleTest}
                            disabled={testLoading || !token}
                        >
                            {testLoading ? 'Sending...' : 'Test Connection'}
                        </button>
                    </div>

                    {message && (
                        <div className={`${styles.statusMessage} ${message.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
                            {message.text}
                        </div>
                    )}
                </section>

                <section className={`${styles.section} card glass`}>
                    <h2><span>🛠️</span> System Maintenance</h2>
                    <p className={styles.sectionText}>
                        Manually trigger logic checks for overdue tasks and system alerts.
                    </p>

                    <div className={styles.controls}>
                        <button
                            className={styles.testBtn}
                            onClick={async () => {
                                setMessage(null);
                                try {
                                    const res = await fetch('/api/notify/check', { method: 'POST' });
                                    const data = await res.json();
                                    if (res.ok) {
                                        setMessage({ type: 'success', text: data.message });
                                    } else {
                                        setMessage({ type: 'error', text: data.error || 'Check failed.' });
                                    }
                                } catch (err) {
                                    setMessage({ type: 'error', text: 'An unexpected error occurred.' });
                                }
                            }}
                        >
                            Run System Check (Overdue Alerts)
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
