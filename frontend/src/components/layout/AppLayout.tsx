import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';

export const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="app-root">
      <header className="global-header">
        <div className="header__left">
          <button
            className="header__menu-btn"
            type="button"
            onClick={() => setIsSidebarOpen((s) => !s)}
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <span className="hamburger-icon">
              <span /><span /><span />
            </span>
          </button>

          <div className="header__brand">
            <svg className="header__logo" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="9" fill="url(#hg)" />
              <path d="M9 25l7-9 4 5 3-4 6 8H9z" fill="white" opacity="0.92" />
              <circle cx="24" cy="12" r="3.5" fill="white" opacity="0.7" />
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4655e8" />
                  <stop offset="1" stopColor="#17b5be" />
                </linearGradient>
              </defs>
            </svg>
            <span className="header__product-name">SalesDemo</span>
          </div>
        </div>

        <div className="header__right">
          <div className="header__user">
            <div className="user-avatar">MJ</div>
            <div className="user-info">
              <strong>Mohamed Yaseen</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </header>

      <div className="app-body">
        <SidebarNav isOpen={isSidebarOpen} />
        <main className="main-view">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
