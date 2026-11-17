import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import { buttonClass } from '../ui/classes';
import { LogOut, Menu, X } from 'lucide-react';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex min-h-11 items-center px-1.5 text-[15px] transition-colors sm:px-1 ${
    isActive
      ? 'font-semibold text-[#8B1E3F] after:absolute after:inset-x-0 after:bottom-1.5 after:h-[2px] after:bg-[#8B1E3F]'
      : 'font-medium text-[#3D3530] hover:text-[#8B1E3F]'
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

export const WIDE_CONTAINER_CLASS = 'mx-auto w-full max-w-[1680px] px-4 sm:px-8 lg:px-12 xl:px-16';

/** Top bar for public and student pages. */
export default function PublicLayout({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const assignments = user?.activeCommitteeAssignments ?? [];
  // One club goes straight to its workspace; the dashboard page lists several.
  const myClubsPath = assignments.length === 1 ? `/clubs/${assignments[0].clubId}/manage` : '/dashboard';
  const loginPath = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  const displayName = user?.displayName?.trim() || 'ผู้ใช้';
  const avatarInitial = displayName.slice(0, 1).toUpperCase();
  const isCommitteeWorkspace =
    location.pathname === '/dashboard' ||
    /^\/clubs\/[^/]+\/(manage|edit|rounds|applications)(\/|$)/.test(location.pathname);

  const navItems = [
    { to: '/', label: 'สำรวจชมรม', end: true, forceActive: location.pathname === '/clubs', visible: true },
    { to: '/me/applications', label: 'ใบสมัครของฉัน', end: false, forceActive: location.pathname.startsWith('/profile/applications'), visible: isAuthenticated },
    { to: myClubsPath, label: 'ชมรมที่ฉันดูแล', end: true, forceActive: isCommitteeWorkspace, visible: assignments.length > 0 },
    { to: '/admin/dashboard', label: 'แดชบอร์ดส่วนกลาง', end: false, forceActive: false, visible: user?.role === 'ADMIN' },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#231B17]">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-[#EAE2D8] bg-white">
        <div className={`${WIDE_CONTAINER_CLASS} flex h-[72px] items-center justify-between gap-4`}>
          <Link to="/" className="flex items-center gap-3 rounded-lg" aria-label="TU ClubHub หน้าหลัก">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-md bg-[#8B1E3F] font-['Manrope',var(--font-sans)] text-sm font-extrabold text-white shadow-xs"
            >
              TU
            </span>
            <span className="font-['Manrope',var(--font-sans)] text-lg font-bold tracking-tight text-[#231B17]">TU ClubHub</span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-[#DFD6CB] lg:block" />
            <span className="hidden text-sm font-medium text-[#7A6F67] lg:inline">
              ศูนย์รวมชมรมสำหรับนักศึกษาธรรมศาสตร์
            </span>
          </Link>

          <button
            type="button"
            className={`${buttonClass('ghost', 'icon')} sm:hidden`}
            aria-expanded={menuOpen}
            aria-controls="public-menu"
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
            ) : (
              <Menu aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
            )}
          </button>

          <div
            id="public-menu"
            onClick={() => setMenuOpen(false)}
            className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-[72px] flex-col gap-2 border-b border-[#EAE2D8] bg-white px-4 py-3 shadow-sm sm:static sm:flex sm:flex-row sm:items-center sm:gap-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
          >
            <nav aria-label="เมนูหลัก" className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-7">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navLinkClass({ isActive: isActive || item.forceActive })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {isAuthenticated ? (
              <div className="flex items-center justify-between gap-2.5 border-t border-[#EFE9E1] pt-2 sm:border-l sm:border-t-0 sm:border-[#E5DDD3] sm:pl-4 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#DFD5C8] bg-[#F5EFE8] text-xs font-bold text-[#8B1E3F]"
                  >
                    {avatarInitial}
                  </span>
                  <span className="max-w-36 truncate text-sm font-medium text-[#3B332E]">
                    {displayName}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => void logout()}>
                  <LogOut aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
                  ออกจากระบบ
                </Button>
              </div>
            ) : (
              location.pathname !== '/login' && (
                <div className="border-t border-[#EFE9E1] pt-2 sm:border-l sm:border-t-0 sm:border-[#E5DDD3] sm:pl-4 sm:pt-0">
                  <Link to={loginPath} className={buttonClass('secondary')}>
                    เข้าสู่ระบบ
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className={fullBleed ? 'w-full' : 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8'}
      >
        {children}
      </main>
    </div>
  );
}
