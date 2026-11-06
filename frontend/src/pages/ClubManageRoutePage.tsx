import type { ComponentType, SVGProps } from "react";
import { Link, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { Button } from "../components/ui/Button";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";
import { CalendarDaysIcon, CircleAlertIcon, PencilIcon, UsersIcon } from "../components/ui/icons";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge, type RoundStatus } from "../components/ui/StatusBadge";
import { useAuth } from "../features/auth/AuthContext";
import { listRounds } from "../features/recruitment/api/roundApi";
import { roundDisplayStatus, roundPeriodLabel, roundTermLabel } from "../features/recruitment/utils/roundDisplay";
import { useApiResource } from "../hooks/useApiResource";
import { describeApiError } from "../lib/api";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

// The largest page the API allows; counts cover at most this many recent rounds.
const SUMMARY_SIZE = 100;
const STATUSES: RoundStatus[] = ["DRAFT", "UPCOMING", "OPEN", "CLOSED", "CANCELLED"];

interface Shortcut {
  label: string;
  description: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export default function ClubManageRoutePage() {
  const { clubId } = useParams();
  const { user } = useAuth();

  if (!isValidId(clubId)) return <NotFoundPage />;

  const clubName =
    user?.activeCommitteeAssignments?.find((item) => item.clubId === clubId)?.clubName ?? `ชมรมรหัส ${clubId}`;

  return (
    <CommitteeLayout
      clubId={clubId}
      title={clubName}
      description="ภาพรวมสำหรับกรรมการ: ทางลัดไปยังงานของชมรม และสรุปรอบรับสมัคร"
      breadcrumbs={[{ label: "ภาพรวม" }]}
      actions={
        <Link to={`/clubs/${clubId}`} className={buttonClass("secondary")}>
          ดูหน้าชมรม
        </Link>
      }
    >
      <ClubOverview key={clubId} clubId={clubId} />
    </CommitteeLayout>
  );
}

function ClubOverview({ clubId }: { clubId: string }) {
  const rounds = useApiResource(clubId, () => listRounds(clubId, { page: 0, size: SUMMARY_SIZE }));
  const base = `/clubs/${clubId}`;
  const shortcuts: Shortcut[] = [
    { label: "โปรไฟล์ชมรม", description: "แก้ไขข้อมูล รูปภาพ หมวดหมู่ แท็ก และช่องทางติดต่อ", path: `${base}/edit`, icon: UsersIcon },
    { label: "จัดการรอบรับสมัคร", description: "ดู แก้ไขฉบับร่าง เผยแพร่ และปิดรับสมัคร", path: `${base}/rounds`, icon: CalendarDaysIcon },
    { label: "สร้างรอบรับสมัคร", description: "เปิดรอบใหม่ พร้อมกำหนดการและคำถามคัดเลือก", path: `${base}/rounds/new`, icon: PencilIcon },
  ];

  const { data, loadedAt } = rounds;
  const statuses = data && loadedAt ? data.items.map((round) => roundDisplayStatus(round, loadedAt)) : [];
  const recent = data?.items.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <nav aria-label="ทางลัดของกรรมการ">
        <ul className="grid gap-3 sm:grid-cols-3">
          {shortcuts.map(({ label, description, path, icon: Icon }) => (
            <li key={path}>
              <Link
                to={path}
                className="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-tu-maroon hover:bg-tu-maroon-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tu-maroon-50 text-tu-maroon">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-slate-600">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <SectionCard
        title="รอบรับสมัคร"
        description="จำนวนรอบตามสถานะ และรอบที่สร้างล่าสุด"
        actions={
          <Link to={`${base}/rounds`} className={buttonClass("ghost")}>
            ดูทั้งหมด
          </Link>
        }
      >
        {rounds.isLoading && (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">กำลังโหลดรอบรับสมัคร...</span>
            <div aria-hidden="true" className="h-20 animate-pulse rounded-lg bg-slate-100" />
            <div aria-hidden="true" className="h-32 animate-pulse rounded-lg bg-slate-100" />
          </div>
        )}

        {rounds.error !== undefined && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
              <CircleAlertIcon className="mt-0.5 size-5" />
              {describeApiError(rounds.error, "โหลดรอบรับสมัครไม่สำเร็จ กรุณาลองใหม่")}
            </p>
            <Button onClick={rounds.reload}>ลองใหม่</Button>
          </div>
        )}

        {data && data.totalElements === 0 && (
          <EmptyState
            title="ยังไม่มีรอบรับสมัคร"
            description="สร้างรอบรับสมัครแรกเพื่อเปิดรับสมาชิกใหม่ของชมรม"
            action={
              <Link to={`${base}/rounds/new`} className={buttonClass("secondary")}>
                สร้างรอบรับสมัคร
              </Link>
            }
          />
        )}

        {data && data.totalElements > 0 && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {STATUSES.map((status) => (
                <div key={status} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
                  <dt>
                    <StatusBadge status={status} />
                  </dt>
                  <dd className="text-2xl font-semibold text-slate-900">
                    {statuses.filter((item) => item === status).length}
                    <span className="ml-1 text-sm font-normal text-slate-600">รอบ</span>
                  </dd>
                </div>
              ))}
            </dl>
            {data.totalElements > data.items.length && (
              <p className="text-xs text-slate-600">นับจาก {data.items.length} รอบที่สร้างล่าสุด จากทั้งหมด {data.totalElements} รอบ</p>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-900">รอบล่าสุด</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {recent.map((round, index) => (
                  <li key={round.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{round.title}</p>
                      <p className="text-sm text-slate-600">
                        ภาค {roundTermLabel(round)} · {roundPeriodLabel(round)}
                      </p>
                    </div>
                    <StatusBadge status={statuses[index]} />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
