import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { canAccess, NAV_PERMISSIONS, roleLabel } from '../utils/permissions';
import './AppLayout.css';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: NAV_PERMISSIONS.dashboard, ready: true },
  { to: '/customers', label: 'Customers', icon: Users, roles: NAV_PERMISSIONS.customers, ready: true },
  { to: '/products', label: 'Products', icon: Package, roles: NAV_PERMISSIONS.products, ready: true },
  {
    to: '/stock-movements',
    label: 'Stock Movements',
    icon: Warehouse,
    roles: NAV_PERMISSIONS.stockMovements,
    ready: true,
  },
  {
    to: '/challans',
    label: 'Sales Challans',
    icon: ClipboardList,
    roles: NAV_PERMISSIONS.challans,
    ready: true,
  },
  { to: '/profile', label: 'Profile', icon: UserRound, roles: NAV_PERMISSIONS.dashboard, ready: true },
] as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = useMemo(
    () => navItems.filter((item) => user && canAccess(user.role, item.roles)),
    [user],
  );

  if (!user) {
    return null;
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      {mobileOpen ? <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Primary">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Boxes size={18} />
          </div>
          <div className="brand-copy">
            <strong>FundFlow ERP</strong>
            <span>Mini ERP + CRM</span>
          </div>
          <Button
            variant="ghost"
            className="mobile-only"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            style={{ marginLeft: 'auto', color: '#cbd5e1' }}
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''} ${item.ready ? '' : 'soon'}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Button
            variant="ghost"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ color: '#cbd5e1', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className="label-text">{collapsed ? '' : 'Collapse'}</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            style={{ color: '#cbd5e1', justifyContent: collapsed ? 'center' : 'flex-start' }}
            title="Logout"
          >
            <LogOut size={18} />
            <span className="label-text">Logout</span>
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="secondary"
              className="mobile-menu-btn"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <div>
              <strong style={{ display: 'block', color: 'var(--ff-navy-900)' }}>Operations Portal</strong>
              <span style={{ color: 'var(--ff-slate-500)', fontSize: '0.85rem' }}>
                Live wholesale distribution workspace
              </span>
            </div>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="user-chip user-chip-button"
              onClick={() => navigate('/profile')}
              aria-label="Open profile"
              title="Profile"
            >
              <div className="user-avatar" aria-hidden="true">
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="user-meta">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <Badge tone="role">{roleLabel(user.role)}</Badge>
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
