import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  Pencil,
  ClipboardList,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import PreprouteLogo from './PreprouteLogo';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine if sidebar should be collapsed (narrow & dark) for question creation or preview
  const isCollapsedMode =
    location.pathname.includes('/questions') || location.pathname.includes('/preview');

  // Dynamically generate breadcrumbs based on route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      return <span style={{ fontWeight: 600, color: '#1e293b' }}>Dashboard</span>;
    }
    if (path.includes('/tests/create')) {
      return (
        <>
          <span>Test Creation</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span>Create Test</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span style={{ color: '#004fe6', fontWeight: 600 }}>Chapter Wise</span>
        </>
      );
    }
    if (path.includes('/edit')) {
      return (
        <>
          <span>Test Creation</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span style={{ color: '#004fe6', fontWeight: 600 }}>Edit Test</span>
        </>
      );
    }
    if (path.includes('/questions')) {
      return (
        <>
          <span>Test Creation</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span>Create Test</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span style={{ color: '#004fe6', fontWeight: 600 }}>Chapter Wise</span>
        </>
      );
    }
    if (path.includes('/preview')) {
      return (
        <>
          <span>Test Creation</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span>Create Test</span>
          <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
          <span style={{ color: '#004fe6', fontWeight: 600 }}>Chapter Wise</span>
        </>
      );
    }
    return <span>Preproute</span>;
  };

  const renderSidebarContent = () => (
    <>
      {/* LOGO */}
      <div style={{ padding: isCollapsedMode ? '0 12px' : '0 24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PreprouteLogo size={isCollapsedMode ? 28 : 32} showText={!isCollapsedMode} />
        {/* Mobile close button inside drawer */}
        <button
          className="mobile-close-btn"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: isCollapsedMode ? '#ffffff' : '#64748b',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: isCollapsedMode ? '0 8px' : '0 16px',
          flexGrow: 1,
          width: '100%',
        }}
      >
        <NavLink
          to="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsedMode ? 'center' : 'flex-start',
            gap: isCollapsedMode ? '0' : '12px',
            padding: '12px',
            borderRadius: '8px',
            color: isActive
              ? '#004fe6'
              : isCollapsedMode
              ? '#94a3b8'
              : '#64748b',
            background: isActive ? '#f0f5ff' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          })}
          title="Dashboard"
        >
          <TrendingUp size={20} />
          {!isCollapsedMode && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/tests/create"
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsedMode ? 'center' : 'flex-start',
            gap: isCollapsedMode ? '0' : '12px',
            padding: '12px',
            borderRadius: '8px',
            color: isActive
              ? '#004fe6'
              : isCollapsedMode
              ? '#94a3b8'
              : '#64748b',
            background: isActive ? '#f0f5ff' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          })}
          title="Test Creation"
        >
          <Pencil size={20} />
          {!isCollapsedMode && <span>Test Creation</span>}
        </NavLink>

        <NavLink
          to="/dashboard?tab=tracking"
          onClick={() => setMobileMenuOpen(false)}
          style={() => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsedMode ? 'center' : 'flex-start',
            gap: isCollapsedMode ? '0' : '12px',
            padding: '12px',
            borderRadius: '8px',
            color: isCollapsedMode ? '#94a3b8' : '#64748b',
            background: 'transparent',
            fontWeight: 500,
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          })}
          title="Test Tracking"
        >
          <ClipboardList size={20} />
          {!isCollapsedMode && <span>Test Tracking</span>}
        </NavLink>
      </nav>

      {/* FOOTER */}
      <div
        style={{
          padding: isCollapsedMode ? '0 8px' : '0 16px',
          width: '100%',
          borderTop: `1px solid ${isCollapsedMode ? '#2d2d3a' : '#e2e8f0'}`,
          paddingTop: '16px',
        }}
      >
        {!isCollapsedMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                fontWeight: 600,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Alex Wando'}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                {user?.role || 'Admin'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsedMode ? 'center' : 'flex-start',
            gap: isCollapsedMode ? '0' : '12px',
            padding: '12px',
            width: '100%',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          title="Logout"
        >
          <LogOut size={20} />
          {!isCollapsedMode && <span style={{ fontSize: '14px', fontWeight: 500 }}>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="app-layout" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      {/* DESKTOP SIDEBAR */}
      <aside
        className="sidebar-desktop"
        style={{
          width: isCollapsedMode ? '72px' : '240px',
          minWidth: isCollapsedMode ? '72px' : '240px',
          background: isCollapsedMode ? '#1e1e24' : '#ffffff',
          borderRight: `1px solid ${isCollapsedMode ? '#2d2d3a' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsedMode ? 'center' : 'stretch',
          padding: '24px 0',
          transition: 'all 0.25s ease',
          height: '100vh',
          flexShrink: 0,
        }}
      >
        {renderSidebarContent()}
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileMenuOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 999,
          }}
        />
      )}
      <aside
        className={`sidebar-mobile ${mobileMenuOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '240px',
          background: isCollapsedMode ? '#1e1e24' : '#ffffff',
          borderRight: `1px solid ${isCollapsedMode ? '#2d2d3a' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          zIndex: 1000,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease-out',
        }}
      >
        {renderSidebarContent()}
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* GLOBAL HEADER BAR */}
        <header
          style={{
            height: '64px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          {/* Breadcrumbs / Menu Toggle */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 500,
            }}
          >
            {/* Hamburger menu button visible only on mobile */}
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              style={{
                marginRight: '12px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'none',
                alignItems: 'center',
              }}
            >
              <Menu size={22} />
            </button>
            {getBreadcrumbs()}
          </div>

          {/* User profile & notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notification Bell */}
            <button
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <Bell size={18} />
              {/* Notification dot */}
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '6px',
                  height: '6px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  border: '1px solid #ffffff',
                }}
              />
            </button>

            {/* Profile info block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  border: '1.5px solid #f59e0b',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '16px' }}>👨‍💼</span>
              </div>
              <div className="profile-text" style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {user?.name || 'Alex Wando'}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
                  {user?.role || 'Admin'}
                </p>
              </div>
              <ChevronDown size={14} style={{ color: '#64748b' }} />
            </div>
          </div>
        </header>

        {/* PAGE BODY VIEW */}
        <main
          style={{
            flexGrow: 1,
            padding: '24px',
            overflowY: 'auto',
            background: '#f8fafc',
            position: 'relative',
            width: '100%',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Inject Media Queries for Sidebar and Elements Responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop {
            display: none !important;
          }
          .hamburger-btn {
            display: flex !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
          .profile-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
