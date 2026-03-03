'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './signup.module.css';

export default function SignupPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirm = formData.get('confirm') as string;

        if (password !== confirm) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const res = await fetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            window.location.href = '/login?msg=Account created. Please login.';
        } else {
            const data = await res.json();
            setError(data.error || 'Authentication failed');
            setLoading(false);
        }
    }

    return (
        <main className={styles.main}>
            <div className={styles.authCard}>
                <div className={styles.bannerImage}>
                    <img
                        src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1000&auto=format&fit=crop"
                        alt="Join Us"
                    />
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Sign Up</h1>
                    </div>

                    {error && <div className={styles.alertError}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="Email Address"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="Create Password"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <input
                                type="password"
                                name="confirm"
                                required
                                placeholder="Confirm Password"
                                className={styles.input}
                            />
                        </div>

                        <button type="submit" className={styles.signUpBtn} disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>

                        <p className={styles.loginPrompt}>
                            Already a member? <Link href="/login" className={styles.loginLink}>Sign In</Link>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}
