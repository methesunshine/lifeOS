'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const res = await fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
            window.location.href = '/';
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
                        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop"
                        alt="Green Nature"
                    />
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Sign In</h1>
                    </div>

                    {error && <div className={styles.alertError}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="Username"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                placeholder="Password"
                                className={styles.input}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>

                        <button type="submit" className={styles.signInBtn} disabled={loading}>
                            {loading ? 'Logging in...' : 'Sign In'}
                        </button>

                        <div className={styles.formFooter}>
                            <label className={styles.rememberMe}>
                                <input type="checkbox" />
                                <span>Remember Me</span>
                            </label>
                            <Link href="#" className={styles.forgotPass}>Forgot Password</Link>
                        </div>

                        <p className={styles.signUpPrompt}>
                            Not a member? <Link href="/signup" className={styles.signUpLink}>Sign Up</Link>
                        </p>
                    </form>
                </div>
            </div>
        </main>
    );
}
