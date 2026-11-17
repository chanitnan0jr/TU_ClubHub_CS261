import { useState, type ComponentType, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Code2,
  ExternalLink,
  LayoutGrid,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Breadcrumbs, type BreadcrumbItem } from '../ui/Breadcrumbs';
import { buttonClass } from '../ui/classes';
import { EmptyState } from '../ui/EmptyState';
import PublicLayout, { WIDE_CONTAINER_CLASS } from './PublicLayout';

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
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** False when nested pages (a round's questions) also mark the item active. */
  end: boolean;
}

const menuItemClass =
  'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors duration-150';

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
  const { user } = useAuth();
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
            icon={<AlertCircle aria-hidden="true" strokeWidth={1.75} className="size-6" />}
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
  const myClubsRootPath = (assignments?.length ?? 0) > 1 ? '/dashboard' : `${base}/manage`;
  const workspaceMenu: MenuItem[] = [
    { label: 'ภาพรวม', path: `${base}/manage`, icon: LayoutGrid, end: true },
    { label: 'โปรไฟล์ชมรม', path: `${base}/edit`, icon: Users, end: true },
  ];
  const recruitmentMenu: MenuItem[] = [
    { label: 'จัดการรอบรับสมัคร', path: `${base}/rounds`, icon: CalendarDays, end: false },
    { label: 'ตรวจสอบใบสมัคร', path: `${base}/applications`, icon: ClipboardCheck, end: false },
  ];
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'ชมรมที่ดูแล', to: myClubsRootPath },
    { label: clubName, to: `${base}/manage` },
    ...breadcrumbs,
  ];

  return (
    <PublicLayout fullBleed>
      <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A] lg:flex">
        <aside className="sticky top-[72px] z-30 border-b border-[#EAE2D8] bg-white lg:flex lg:h-[calc(100vh-72px)] lg:w-[272px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-[#F2ECE4] px-4 py-3.5 lg:px-5 lg:py-5">
            <Link to={`${base}/manage`} className="flex min-w-0 items-center gap-3 rounded-lg">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#68112B] text-xs font-bold text-white shadow-xs"
              >
                {assignment ? clubInitials(assignment.clubName) : <Code2 strokeWidth={1.75} className="size-5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#25202A]">{clubName}</span>
                <span className="block truncate text-xs text-[#59545B]">{roleLabel}</span>
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
              {menuOpen ? <X aria-hidden="true" strokeWidth={1.75} className="size-5" /> : <Menu aria-hidden="true" strokeWidth={1.75} className="size-5" />}
            </button>
          </div>

          <div
            id="committee-menu"
            className={`${menuOpen ? 'flex' : 'hidden'} max-h-[calc(100vh-8.5rem)] flex-col gap-4 overflow-y-auto px-3 pb-4 pt-4 lg:flex lg:max-h-none lg:flex-1`}
          >
            <nav aria-label="เมนูจัดการชมรม" className="flex flex-col gap-5">
              <div>
                <p className="px-3.5 pb-2 text-xs font-medium text-[#706B70]">พื้นที่ทำงาน</p>
                <ul className="flex flex-col gap-1">
                  {workspaceMenu.map((item) => (
                    <SidebarMenuLink key={item.path} item={item} onSelect={() => setMenuOpen(false)} />
                  ))}
                </ul>
              </div>
              <div>
                <p className="px-3.5 pb-2 text-xs font-medium text-[#706B70]">การรับสมัคร</p>
                <ul className="flex flex-col gap-1">
                  {recruitmentMenu.map((item) => (
                    <SidebarMenuLink key={item.path} item={item} onSelect={() => setMenuOpen(false)} />
                  ))}
                </ul>
              </div>
            </nav>

            <div className="mt-auto border-t border-[#EAE2D8] pt-3">
              <Link
                to={`/clubs/${clubId}`}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#3B3540] transition-colors duration-150 hover:bg-[#FAF7F3] hover:text-[#861638]"
              >
                <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
                <span>ดูหน้าชมรม</span>
              </Link>
            </div>
          </div>
        </aside>

        <div className={`${WIDE_CONTAINER_CLASS} flex flex-1 min-w-0 flex-col gap-6 py-6 lg:py-8`}>
          <Breadcrumbs
            items={breadcrumbItems}
            separator={<ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 shrink-0 text-[#9A918B]" />}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-7 w-[3.5px] shrink-0 rounded-full bg-[#861638]" />
                <h1 className="text-[26px] font-extrabold tracking-tight text-[#25202A] sm:text-[30px]">{title}</h1>
              </div>
              {description && <p className="mt-1 pl-[15.5px] text-sm leading-6 text-[#59545B]">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}

function SidebarMenuLink({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.path}
        end={item.end}
        onClick={onSelect}
        className={({ isActive }) =>
          `${menuItemClass} ${
            isActive
              ? 'bg-[#F2E7E5] font-semibold text-[#861638]'
              : 'text-[#3B3540] hover:bg-[#FAF7F3] hover:text-[#25202A]'
          }`
        }
      >
        <Icon aria-hidden="true" strokeWidth={1.75} className="size-[18px] shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}
