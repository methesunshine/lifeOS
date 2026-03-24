'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './settings.module.css';

function SettingsContent() {
    const searchParams = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [telegramToken, setTelegramToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [telegramTestLoading, setTelegramTestLoading] = useState(false);
    const [showTelegramToken, setShowTelegramToken] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info', text: string } | null>(null);

    // Auto-dismiss message timer
    useEffect(() => {
        if (message) {
            const durations = {
                success: 4000,
                warning: 7000,
                info: 7000,
                error: 10000
            };
            const timer = setTimeout(() => {
                setMessage(null);
            }, durations[message.type] || 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setHighlightedId(id);
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 600);
            const timer = setTimeout(() => setHighlightedId(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    const fetchProfile = async () => {
        try {
            // Get User Email
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || 'N/A');
            }

            const res = await fetch('/api/profile');
            const data = await res.json();
            if (data.profile) {
                setTelegramToken(data.profile.telegram_bot_token || '');
                setTelegramChatId(data.profile.telegram_chat_id || '');
                setEnabled(data.profile.notifications_enabled ?? true);
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
                    telegram_bot_token: telegramToken,
                    telegram_chat_id: telegramChatId,
                    notifications_enabled: enabled
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                // Trigger an update for the activity log to show up immediately
                window.dispatchEvent(new Event('activity-update'));
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleTelegramTest = async () => {
        setTelegramTestLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/notify/telegram-test', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Telegram test message sent! Check your chat.' });
            } else {
                let errorText = data.error || 'Telegram test failed.';
                if (errorText.toLowerCase().includes('chat not found')) {
                    errorText += ' (Tip: Ensure you have started a conversation with your bot first by sending it any message.)';
                }
                setMessage({ type: 'error', text: errorText });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred during Telegram test.' });
        } finally {
            setTelegramTestLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>System Settings</h1>
                <p>Configure your personal LifeOS interface and notification preferences.</p>
            </header>

            <div className={styles.settingsGrid}>
                <section id="telegram" className={`${styles.section} ${styles.pushbulletSection} card glass ${highlightedId === 'telegram' ? styles.highlightedItem : ''}`}>
                    <h2><span>✈️</span> Telegram Notifications</h2>
                    
                    {message && (
                        <div className={`
                            ${styles.statusMessage} 
                            ${message.type === 'success' ? styles.statusSuccess : ''}
                            ${message.type === 'error' ? styles.statusError : ''}
                            ${message.type === 'warning' ? styles.statusWarning : ''}
                            ${message.type === 'info' ? styles.statusInfo : ''}
                        `} style={{ marginBottom: '1.5rem' }}>
                            {message.type === 'success' && '✅'}
                            {message.type === 'error' && '❌'}
                            {message.type === 'warning' && '⚠️'}
                            {message.type === 'info' && 'ℹ️'}
                            {' '}{message.text}
                        </div>
                    )}

                    <p className={styles.sectionText}>
                        Unlimited free alerts via your personal Telegram Bot.
                    </p>

                    <div className={styles.toggleRow}>
                        <div className={styles.toggleLabel}>
                            <span className={styles.toggleTitle}>Enable Notifications</span>
                            <span className={styles.toggleDesc}>Toggle all system-wide real-time alerts.</span>
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

                    <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>Bot Token</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showTelegramToken ? "text" : "password"}
                                placeholder="123456789:ABCDefGhIJKlmNoPQRStuvWxYz"
                                className={styles.inputField}
                                value={telegramToken}
                                onChange={(e) => setTelegramToken(e.target.value)}
                            />
                            <button 
                                type="button"
                                className={styles.toggleVisibilityBtn}
                                onClick={() => setShowTelegramToken(!showTelegramToken)}
                                title={showTelegramToken ? "Hide Token" : "Show Token"}
                            >
                                {showTelegramToken ? '👁️' : '🔒'}
                            </button>
                        </div>
                        <p className={styles.hint}>
                            Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a>.
                        </p>
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                        <label className={styles.inputLabel}>Chat ID</label>
                        <input
                            type="text"
                            placeholder="12345678"
                            className={styles.inputField}
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                        />
                        <p className={styles.hint}>
                            Get your ID from <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">@userinfobot</a>. <strong>Important:</strong> You must message your bot first.
                        </p>
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
                            onClick={handleTelegramTest}
                            disabled={telegramTestLoading || !telegramToken || !telegramChatId}
                        >
                            {telegramTestLoading ? 'Sending...' : 'Test Connection'}
                        </button>
                    </div>
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

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
