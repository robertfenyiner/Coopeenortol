'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  FileSearch,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  List,
  Wrench,
  Bell,
  UserPlus,
  Wallet,
  Landmark,
  FileSpreadsheet,
  PieChart,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { NAV_ITEMS } from '@/lib/constants';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  FileSearch,
  List,
  Wrench,
  UserPlus,
  Wallet,
  Landmark,
  FileSpreadsheet,
  PieChart,
  Receipt,
};

interface NavItemConfig {
  label: string;
  href: string;
  icon: string;
  permission: string;
  children?: { label: string; href: string; permission: string }[];
}

const navItems = NAV_ITEMS as NavItemConfig[];

function SidebarNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/parametrizacion']);

  const hasPermission = (perm: string) => {
    return permissions.includes(perm) || permissions.length === 0; // fallback
  };

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((i) => i !== href) : [...prev, href]
    );
  };

  return (
    <div className="nav-section">
      <div className="nav-section-label">Menú Principal</div>
      {navItems.map((item) => {
        if (!hasPermission(item.permission)) return null;
        const Icon = iconMap[item.icon] || Settings;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        const isExpanded = expandedItems.includes(item.href);

        if (item.children) {
          return (
            <div key={item.href}>
              <div
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => toggleExpand(item.href)}
              >
                <Icon className="nav-item-icon" size={20} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              {isExpanded && (
                <div className="nav-children">
                  {item.children.map((child) => {
                    if (!hasPermission(child.permission)) return null;
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`nav-item ${childActive ? 'active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
            <Icon className="nav-item-icon" size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const user = session?.user;
  const permissions = user?.permissions || [];
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '?';
  const roleName = user?.roles?.[0] || 'Usuario';

  // Build breadcrumb
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const breadcrumbMap: Record<string, string> = {
    dashboard: 'Dashboard',
    usuarios: 'Usuarios',
    roles: 'Roles',
    parametrizacion: 'Parametrización',
    catalogos: 'Catálogos',
    configuracion: 'Configuración',
    asociados: 'Asociados',
    aportes: 'Aportes',
    creditos: 'Créditos',
    cartera: 'Cartera',
    reportes: 'Reportes',
    perfil: 'Mi Perfil',
    auditoria: 'Auditoría',
    nuevo: 'Nuevo',
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 35,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Image src="/logo-secundario.jpg" alt="Coopeenortol" width={44} height={44} />
          <div className="sidebar-brand-text">
            <h2>Coopeenortol</h2>
            <span>Sistema de Gestión</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <SidebarNav permissions={permissions} />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Link href="/perfil" className="sidebar-user-avatar" title="Mi perfil" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>{initials}</Link>
            <div className="sidebar-user-info">
              <Link href="/perfil" className="sidebar-user-name" style={{ textDecoration: 'none', color: 'inherit' }}>
                {user?.firstName} {user?.lastName}
              </Link>
              <div className="sidebar-user-role">{roleName}</div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Cerrar sesión"
              style={{ color: 'var(--gray-400)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button
              className="btn btn-ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }}
              id="mobile-menu-btn"
            >
              <Menu size={20} />
            </button>
            <div className="header-breadcrumb">
              {pathSegments.map((segment, idx) => (
                <span key={idx}>
                  {idx > 0 && <span style={{ margin: '0 0.25rem', color: 'var(--gray-300)' }}>/</span>}
                  {idx === pathSegments.length - 1 ? (
                    <span className="current">{breadcrumbMap[segment] || segment}</span>
                  ) : (
                    <Link href={'/' + pathSegments.slice(0, idx + 1).join('/')}>
                      {breadcrumbMap[segment] || segment}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" title="Notificaciones">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <style jsx global>{`
        @media (max-width: 1024px) {
          #mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SessionProvider>
  );
}
