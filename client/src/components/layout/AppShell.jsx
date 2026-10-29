import { useState } from 'react';
import { Menu as MenuIcon, LogOut } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AppShell.module.css';

const NAV_BY_ROLE = {
  waiter: [{ to: '/waiter', label: 'Tables' }],
  kitchen: [{ to: '/kitchen', label: 'Kitchen display' }],
  manager: [
    { to: '/manager/menu', label: 'Menu' },
    { to: '/manager/tables', label: 'Tables' },
    { to: '/manager/staff', label: 'Staff' },
    { to: '/manager/reports', label: 'Reports' },
    { to: '/manager/activity', label: 'Activity log' },
  ],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const isKitchen = location.pathname.startsWith('/kitchen');
  const navItems = NAV_BY_ROLE[user?.role] ?? [];

  return (
    <div className={styles.shell} data-theme={isKitchen ? 'dark' : undefined}>
      {navOpen && <div className={styles.scrim} onClick={() => setNavOpen(false)} />}

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>T</div>
          <div className={styles.brandText}>
            <strong>TOSS</strong>
            <span>Table-Side Ordering</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{user?.name?.[0] ?? '?'}</div>
            <div className={styles.userMeta}>
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <MenuIcon size={20} />
          </button>
          <strong>TOSS</strong>
          <div className={styles.avatar}>{user?.name?.[0] ?? '?'}</div>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
