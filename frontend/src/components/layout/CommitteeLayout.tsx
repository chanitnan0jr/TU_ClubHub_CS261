import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../features/auth/AuthContext';
import { Breadcrumbs, type BreadcrumbItem } from '../ui/Breadcrumbs';
import { buttonClass } from '../ui/classes';
import { EmptyState } from '../ui/EmptyState';
import {
  CalendarDaysIcon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  LayoutGridIcon,
  LogOutIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
} from '../ui/icons';
import PublicLayout, { SkipLink } from './PublicLayout';

interface CommitteeLayoutProps {
  clubId: string;
  title: string;
  description?: ReactNode;
  /** Trail after the club name, ending with the current page. */
  breadcrumbs: BreadcrumbItem[];
  /** Secondary actions at the top right of the page header. */
  actions?: ReactNode;
  children: ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** False when nested pages (a round's questions) also mark the item active. */
  end: boolean;
}

const menuItemClass = 'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors';

// The first characters of the club name without the word "ชมรม".
function clubInitials(name: string) {
  const initials = Array.from(name.replace(/^ชมรม\s*/, '').trim()).slice(0, 2).join('');
  return initials || 'ชม';
}

/**
 * Sidebar workspace for one club's committee pages. The menu comes from the
 * user's active committee assignments; the backend still checks every request.
 */
export default function CommitteeLayout({
  clubId,
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: CommitteeLayoutProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const assignments = user?.activeCommitteeAssignments;
  const assignment = assignments?.find((item) => item.clubId === clubId);

  // Until /auth/me sends assignments the page is shown and the backend decides.
  if (assignments && !assignment) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl py-8">
          <EmptyState
            headingLevel={1}
            icon={<CircleAlertIcon className="size-6" />}
            title="คุณไม่มีสิทธิ์จัดการชมรมนี้"
            description="หน้านี้สำหรับกรรมการของชมรมที่ยังอยู่ในวาระเท่านั้น หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อประธานชมรมหรือผู้ดูแลระบบ"
            action={
              <>
                <Link to={`/clubs/${clubId}`} className={buttonClass('secondary')}>
                  ดูหน้าชมรม
                </Link>
                <Link to="/" className={buttonClass('primary')}>
                  กลับหน้าหลัก
                </Link>
              </>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  const base = `/clubs/${clubId}`;
  const clubName = assignment?.clubName ?? `ชมรมรหัส ${clubId}`;
  const roleLabel = assignment
    ? assignment.positionName?.trim() || (assignment.permissionRole === 'PRESIDENT' ? 'ประธานชมรม' : 'กรรมการชมรม')
    : 'กรรมการชมรม';
  const menu: MenuItem[] = [
    { label: 'ภาพรวม', path: `${base}/manage`, icon: LayoutGridIcon, end: true },
    { label: 'โปรไฟล์ชมรม', path: `${base}/edit`, icon: UsersIcon, end: true },
    { label: 'จัดการรอบรับสมัคร', path: `${base}/rounds`, icon: CalendarDaysIcon, end: false },
    { label: 'ตรวจสอบใบสมัคร', path: `${base}/applications`, icon: ClipboardCheckIcon, end: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <SkipLink />
      <aside className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <Link to={`${base}/manage`} className="flex min-w-0 items-center gap-3 rounded-lg">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white"
            >
              {assignment ? clubInitials(assignment.clubName) : 'ชม'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{clubName}</span>
              <span className="block text-xs text-slate-600">พื้นที่กรรมการชมรม</span>
            </span>
          </Link>
          <button
            type="button"
            className={`${buttonClass('ghost', 'icon')} lg:hidden`}
            aria-expanded={menuOpen}
            aria-controls="committee-menu"
            aria-label={menuOpen ? 'ปิดเมนูชมรม' : 'เปิดเมนูชมรม'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        <div
          id="committee-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} max-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto border-t border-slate-100 px-3 pb-4 pt-3 lg:flex lg:max-h-none lg:flex-1 lg:border-t-0 lg:pt-0`}
        >
          <nav aria-label="เมนูจัดการชมรม">
            <p className="px-3 pb-2 text-xs font-medium text-slate-600">จัดการชมรม</p>
            <ul className="flex flex-col gap-1">
              {menu.map(({ label, path, icon: Icon, end }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    end={end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `${menuItemClass} ${
                        isActive
                          ? 'bg-tu-maroon-50 font-semibold text-tu-maroon'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="size-5" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 px-1 pt-4">
            <div className="flex items-center gap-3 px-2">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tu-maroon-100 text-sm font-semibold text-tu-maroon"
              >
                {Array.from(user?.displayName?.trim() || 'ผ')[0]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {user?.displayName?.trim() || 'ผู้ใช้'}
                </span>
                <span className="block truncate text-xs text-slate-600">{roleLabel}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className={`${menuItemClass} text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
            >
              <LogOutIcon className="size-5" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      <main id="main-content" className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Breadcrumbs items={[{ label: clubName, to: `${base}/manage` }, ...breadcrumbs]} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
