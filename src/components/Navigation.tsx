import styles from './Navigation.module.css';

interface NavigationProps {
    userEmail?: string;
}

export default function Navigation({ userEmail }: NavigationProps) {
    return (
        <nav className={styles.nav}>
            <div className={styles.container}>
                <div className={styles.logo}>Core8</div>

                <div className={styles.menu}>
                    {userEmail && (
                        <div className={styles.user}>
                            <span className={styles.email}>{userEmail}</span>
                            <form action="/auth/logout" method="post">
                                <button type="submit" className={styles.logoutBtn}>Logout</button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
