import { useState, type ComponentType, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Pencil,
  Play,
  Users,
  XCircle,
} from "lucide-react";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { Button } from "../components/ui/Button";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";
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

interface Shortcut {
  label: string;
  description: string;
  path: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface MetricCardDef {
  key: string;
  label: string;
  count: number;
  icon: ReactNode;
  chipClass: string;
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
      description="ภาพรวมการดำเนินงานของชมรม จัดการข้อมูล และติดตามรอบรับสมัครได้ที่นี่"
      breadcrumbs={[{ label: "ภาพรวม" }]}
      actions={
        <Link
          to={`/clubs/${clubId}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DFD6CB] bg-white px-4 py-2 text-sm font-semibold text-[#25202A] shadow-[0_1px_2px_rgba(37,32,42,0.03)] transition duration-150 hover:border-[#861638]/40 hover:text-[#861638]"
        >
          <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4" />
          <span>ดูหน้าชมรม</span>
        </Link>
      }
    >
      <ClubOverview key={clubId} clubId={clubId} />
    </CommitteeLayout>
  );
}

function ClubOverview({ clubId }: { clubId: string }) {
  const rounds = useApiResource(clubId, () => listRounds(clubId, { page: 0, size: SUMMARY_SIZE }));
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");
  const base = `/clubs/${clubId}`;
  const shortcuts: Shortcut[] = [
    {
      label: "โปรไฟล์ชมรม",
      description: "แก้ไขข้อมูลพื้นฐาน เช่น ชื่อ คำอธิบาย และช่องทางติดต่อ",
      path: `${base}/edit`,
      icon: Users,
    },
    {
      label: "จัดการรอบรับสมัคร",
      description: "สร้างและจัดการรอบรับสมัครสมาชิก",
      path: `${base}/rounds`,
      icon: CalendarDays,
    },
    {
      label: "สร้างรอบรับสมัคร",
      description: "เปิดรับสมัครรอบใหม่สำหรับสมาชิก",
      path: `${base}/rounds/new`,
      icon: Pencil,
    },
  ];

  const { data, loadedAt } = rounds;
  const allItems = data?.items ?? [];
  const terms = Array.from(new Set(allItems.map((round) => roundTermLabel(round))));
  const filteredItems = selectedTerm === "ALL"
    ? allItems
    : allItems.filter((round) => roundTermLabel(round) === selectedTerm);
  const statuses: RoundStatus[] = data && loadedAt
    ? filteredItems.map((round) => roundDisplayStatus(round, loadedAt))
    : [];
  const recent = filteredItems.slice(0, 3);

  const metrics: MetricCardDef[] = [
    {
      key: "ALL",
      label: "ทั้งหมด",
      count: filteredItems.length,
      icon: <Layers aria-hidden="true" strokeWidth={1.75} className="size-5" />,
      chipClass: "bg-[#F1EFF2] text-[#59545B]",
    },
    {
      key: "PENDING",
      label: "รอดำเนินการ",
      count: statuses.filter((s) => s === "DRAFT" || s === "UPCOMING").length,
      icon: <Clock aria-hidden="true" strokeWidth={1.75} className="size-5" />,
      chipClass: "bg-[#FEF3DC] text-[#B4690E]",
    },
    {
      key: "OPEN",
      label: "เปิดรับสมัคร",
      count: statuses.filter((s) => s === "OPEN").length,
      icon: <Play aria-hidden="true" strokeWidth={1.75} className="size-5" />,
      chipClass: "bg-[#E6F6EC] text-[#18794E]",
    },
    {
      key: "CLOSED",
      label: "ปิดรับแล้ว",
      count: statuses.filter((s) => s === "CLOSED").length,
      icon: <CheckCircle2 aria-hidden="true" strokeWidth={1.75} className="size-5" />,
      chipClass: "bg-[#EDF2FA] text-[#35599C]",
    },
    {
      key: "CANCELLED",
      label: "ยกเลิก",
      count: statuses.filter((s) => s === "CANCELLED").length,
      icon: <XCircle aria-hidden="true" strokeWidth={1.75} className="size-5" />,
      chipClass: "bg-[#FDECEC] text-[#C62828]",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <nav aria-label="ทางลัดของกรรมการ">
        <ul className="grid gap-4 sm:grid-cols-3">
          {shortcuts.map(({ label, description, path, icon: Icon }) => (
            <li key={path}>
              <Link
                to={path}
                className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-[#EAE2D8] bg-white p-5 shadow-[0_1px_2px_rgba(37,32,42,0.03)] transition duration-150 hover:-translate-y-0.5 hover:border-[#861638]/40 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F2E7E5] text-[#861638] transition-colors group-hover:bg-[#861638] group-hover:text-white">
                    <Icon aria-hidden="true" strokeWidth={1.75} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#25202A]">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#59545B] sm:text-sm sm:leading-6">
                      {description}
                    </span>
                  </span>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="mt-0.5 size-4 shrink-0 text-[#706B70] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#861638]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rounds.isLoading && (
        <div role="status" className="flex flex-col gap-4 rounded-2xl border border-[#EAE2D8] bg-white p-6">
          <span className="sr-only">กำลังโหลดรอบรับสมัคร...</span>
          <div aria-hidden="true" className="h-20 animate-pulse rounded-xl bg-[#F5EFE8]" />
          <div aria-hidden="true" className="h-36 animate-pulse rounded-xl bg-[#F5EFE8]" />
        </div>
      )}

      {rounds.error !== undefined && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-white p-6">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
            <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" />
            {describeApiError(rounds.error, "โหลดรอบรับสมัครไม่สำเร็จ กรุณาลองใหม่")}
          </p>
          <Button onClick={rounds.reload}>ลองใหม่</Button>
        </div>
      )}

      {data && data.totalElements === 0 && (
        <div className="rounded-2xl border border-[#EAE2D8] bg-white p-6">
          <EmptyState
            title="ยังไม่มีรอบรับสมัคร"
            description="สร้างรอบรับสมัครแรกเพื่อเปิดรับสมาชิกใหม่ของชมรม"
            action={
              <Link to={`${base}/rounds/new`} className={buttonClass("secondary")}>
                สร้างรอบรับสมัคร
              </Link>
            }
          />
        </div>
      )}

      {data && data.totalElements > 0 && (
        <>
          <section
            aria-labelledby="round-summary-heading"
            className="rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_1px_2px_rgba(37,32,42,0.03)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
                  <h2 id="round-summary-heading" className="text-lg font-extrabold text-[#25202A]">
                    สรุปภาพรวมรอบรับสมัคร
                  </h2>
                </div>
                <p className="mt-1 pl-[13px] text-sm text-[#59545B]">
                  สถานะและจำนวนรอบรับสมัครทั้งหมดของชมรม
                </p>
              </div>

              {terms.length > 0 && (
                <div>
                  <label htmlFor="overview-term-filter" className="sr-only">
                    กรองตามภาคการศึกษา
                  </label>
                  <select
                    id="overview-term-filter"
                    value={selectedTerm}
                    onChange={(event) => setSelectedTerm(event.target.value)}
                    className="min-h-11 cursor-pointer rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 text-sm font-medium text-[#25202A] outline-none transition focus:border-[#861638] focus:ring-2 focus:ring-[#861638]/15"
                  >
                    <option value="ALL">ทุกช่วงเวลา</option>
                    {terms.map((term) => (
                      <option key={term} value={term}>
                        ภาค {term}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {metrics.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-center gap-2.5 rounded-xl border border-[#EAE2D8] bg-[#FFFDFB] p-3 sm:gap-3.5 sm:p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10 ${metric.chipClass}`}
                  >
                    {metric.icon}
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-[#59545B]">{metric.label}</dt>
                    <dd className="mt-0.5 text-xl font-extrabold text-[#25202A] tabular-nums">
                      {metric.count}
                      <span className="ml-1 text-xs font-medium text-[#59545B]">รอบ</span>
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            {data.totalElements > data.items.length && (
              <p className="mt-3 text-xs text-[#59545B]">
                นับจาก {data.items.length} รอบที่สร้างล่าสุด จากทั้งหมด {data.totalElements} รอบ
              </p>
            )}
          </section>

          <section
            aria-labelledby="recent-rounds-heading"
            className="rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_1px_2px_rgba(37,32,42,0.03)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
                  <h2 id="recent-rounds-heading" className="text-lg font-extrabold text-[#25202A]">
                    รอบรับสมัครล่าสุด
                  </h2>
                </div>
                <p className="mt-1 pl-[13px] text-sm text-[#59545B]">
                  รอบรับสมัครที่กำลังดำเนินการและเพิ่งสิ้นสุด
                </p>
              </div>
              <Link
                to={`${base}/rounds`}
                className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[#861638] transition hover:text-[#68112B]"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-[#EAE2D8]">
              {recent.map((round, index) => (
                <li key={round.id}>
                  <Link
                    to={`${base}/rounds/${round.id}/edit`}
                    className="group -mx-2 flex flex-col gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-[#FAF7F3] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#25202A] transition-colors group-hover:text-[#861638]">
                        {round.title}
                      </p>
                      <p className="mt-0.5 text-sm text-[#59545B]">
                        {roundPeriodLabel(round)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={statuses[index]} />
                      <ArrowRight
                        aria-hidden="true"
                        strokeWidth={1.75}
                        className="size-4 text-[#706B70] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#861638]"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
