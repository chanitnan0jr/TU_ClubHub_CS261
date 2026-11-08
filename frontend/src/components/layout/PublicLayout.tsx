import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import { buttonClass } from '../ui/classes';
import { LogOutIcon, MenuIcon, XIcon } from '../ui/icons';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-tu-maroon-50 text-tu-maroon' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-tu-maroon focus:shadow-lg"
    >
      ข้ามไปยังเนื้อหาหลัก
    </a>
  );
}

/** Top bar for public and student pages. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const assignments = user?.activeCommitteeAssignments ?? [];
  // One club goes straight to its workspace; the dashboard page lists several.
  const myClubsPath = assignments.length === 1 ? `/clubs/${assignments[0].clubId}/manage` : '/dashboard';
  const loginPath = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="TU ClubHub หน้าหลัก">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-md bg-tu-maroon text-xs font-bold text-white"
            >
              TU
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">TU ClubHub</span>
          </Link>

          <button
            type="button"
            className={`${buttonClass('ghost', 'icon')} sm:hidden`}
            aria-expanded={menuOpen}
            aria-controls="public-menu"
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>

          <div
            id="public-menu"
            onClick={() => setMenuOpen(false)}
            className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-16 flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:static sm:flex sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:p-0 sm:shadow-none`}
          >
            <nav aria-label="เมนูหลัก" className="flex flex-col gap-1 sm:flex-row">
              <NavLink to="/" end className={navLinkClass}>
                สำรวจชมรม
              </NavLink>
              <NavLink to="/open-calls" className={navLinkClass}>
                รอบที่เปิดรับ
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/me/applications" className={navLinkClass}>
                  ใบสมัครของฉัน
                </NavLink>
              )}
              {assignments.length > 0 && (
                <NavLink to={myClubsPath} end className={navLinkClass}>
                  ชมรมที่ฉันดูแล
                </NavLink>
              )}
            </nav>
            {isAuthenticated ? (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                <span className="max-w-48 truncate px-3 text-sm text-slate-700 sm:px-0">
                  {user?.displayName?.trim() || 'ผู้ใช้'}
                </span>
                <Button variant="ghost" onClick={() => void logout()}>
                  <LogOutIcon className="size-4" />
                  ออกจากระบบ
                </Button>
              </div>
            ) : (
              location.pathname !== '/login' && (
                <Link to={loginPath} className={buttonClass('secondary')}>
                  เข้าสู่ระบบ
                </Link>
              )
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
