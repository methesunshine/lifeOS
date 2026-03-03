'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const menuItems = [
    { name: 'Dashboard', icon: '🏠', path: '/' },
    { name: 'Mental Health', icon: '🧠', path: '/mental' },
    { name: 'Physical Health', icon: '💪', path: '/physical' },
    { name: 'Finance', icon: '💰', path: '/finance' },
    { name: 'Skills', icon: '📚', path: '/skills' },
    { name: 'Goals', icon: '🎯', path: '/goals' },
    { name: 'Journey', icon: '📓', path: '/journey' },
    { name: 'Productivity', icon: '⚡', path: '/productivity' },
    { name: 'Reflection', icon: '🪞', path: '/reflection' },
];

export default function Sidebar({ userEmail }: { userEmail?: string }) {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <div className={styles.logoIcon}>C8</div>
                <h2 className={styles.logoText}>LifeOS</h2>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.menuList}>
                    {menuItems.map((item) => (
                        <li key={item.name}>
                            <Link
                                href={item.path}
                                className={`${styles.menuItem} ${pathname === item.path ? styles.active : ''}`}
                            >
                                <span className={styles.icon}>{item.icon}</span>
                                <span className={styles.name}>{item.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className={styles.footer}>
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>
                        {userEmail ? userEmail[0].toUpperCase() : 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{userEmail?.split('@')[0] || 'User'}</p>
                        <form action="/auth/logout" method="post">
                            <button type="submit" className={styles.logoutBtn}>Logout</button>
                        </form>
                    </div>
                </div>
            </div>
        </aside>
    );
}
