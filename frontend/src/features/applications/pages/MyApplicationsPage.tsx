import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Hourglass,
  Info,
  Layers,
  XCircle,
} from 'lucide-react';
import { WIDE_CONTAINER_CLASS } from '../../../components/layout/PublicLayout';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeaderBanner } from '../../../components/ui/PageHeaderBanner';
import { useApiResource } from '../../../hooks/useApiResource';
import { ApiError, apiRequest, describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { ClubLogo } from '../../clubs/components/ClubLogo';
import { ApplicantIdentityGrid } from '../components/ApplicantIdentityGrid';
import {
  ApplicationCard,
  ApplicationProgressStepper,
  ApplicationStatusBadge,
} from '../components/ApplicationCard';
import type {
  ApplicantApplicationDetail,
  ApplicantApplicationPage,
  ApplicantApplicationSummary,
  ApplicationFilterTab,
  MembershipDecision,
  MembershipOfferResponse,
} from '../types/application';

const MY_APPLICATIONS_PAGE_SIZE = 20;

const pageIndex = (value: string | null) =>
  value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) - 1 : 0;

const closedStatuses = new Set([
  'CONFIRMED',
  'DECLINED',
  'EXPIRED',
  'WITHDRAWN',
]);

const matchesFilter = (
  app: ApplicantApplicationSummary,
  tab: ApplicationFilterTab,
  year: string,
) => {
  const tabMatch =
    tab === 'ALL' ||
    (tab === 'CONFIRMED_DECLINED'
      ? closedStatuses.has(app.applicantVisibleStatus)
      : app.applicantVisibleStatus === tab);
  const yearMatch = year === 'ALL' || String(app.round.academicYear) === year;
  return tabMatch && yearMatch;
};

export function MyApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageIndex(searchParams.get('page'));
  const [activeTab, setActiveTab] = useState<ApplicationFilterTab>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { data, error, isLoading, reload } = useApiResource(
    `my-applications:${page}`,
    () =>
      apiRequest<ApplicantApplicationPage>(
        `/api/v1/me/applications?page=${page}&size=${MY_APPLICATIONS_PAGE_SIZE}`,
      ),
  );

  const goToPage = (next: number) => {
    setSearchParams(next === 0 ? {} : { page: String(next + 1) });
    headingRef.current?.focus();
  };

  let content: ReactNode;
  if (isLoading) {
    content = (
      <div role="status">
        <span className="sr-only">กำลังโหลดข้อมูลประวัติใบสมัคร...</span>
        <ul aria-hidden="true" className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <li
              key={index}
              className="h-44 rounded-2xl border border-[#EAE2D8] bg-white p-6 motion-safe:animate-pulse"
            />
          ))}
        </ul>
      </div>
    );
  } else if (!data) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#EAE2D8] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(37,32,42,0.03)]">
        <p role="alert" className="text-sm text-[#59545B]">
          {describeApiError(
            error,
            'ไม่สามารถโหลดประวัติใบสมัครได้ กรุณาลองใหม่อีกครั้ง',
          )}
        </p>
        <Button variant="primary" onClick={reload}>
          ลองใหม่
        </Button>
      </div>
    );
  } else {
    const { items, page: meta } = data;
    const yearOptions = Array.from(
      new Set(items.map((item) => String(item.round.academicYear))),
    ).sort((a, b) => Number(b) - Number(a));
    const effectiveYear =
      selectedYear !== 'ALL' && yearOptions.includes(selectedYear)
        ? selectedYear
        : 'ALL';
    const yearScopedItems =
      effectiveYear === 'ALL'
        ? items
        : items.filter((item) => String(item.round.academicYear) === effectiveYear);
    const filteredItems = items.filter((item) =>
      matchesFilter(item, activeTab, effectiveYear),
    );

    const countOf = (status: string) =>
      yearScopedItems.filter((item) => item.applicantVisibleStatus === status).length;
    const closedCount = yearScopedItems.filter((item) =>
      closedStatuses.has(item.applicantVisibleStatus),
    ).length;

    const pendingCount = countOf('SUBMITTED');
    const acceptedCount = countOf('ACCEPTED_PENDING_CONFIRMATION');
    const rejectedCount = countOf('REJECTED');

    const stats = [
      {
        label: 'ใบสมัครทั้งหมด',
        count: meta.totalElements,
        cardClass: 'border-[#EAE2D8] bg-white',
        iconWrap: 'bg-[#FAF0F2] text-[#861638]',
        labelColor: 'text-[#59545B]',
        Icon: FileText,
      },
      {
        label: 'รอพิจารณา',
        count: pendingCount,
        cardClass:
          pendingCount > 0
            ? 'border-[#F1DEB5] bg-[#FFFBF2]'
            : 'border-[#EAE2D8] bg-white',
        iconWrap: 'bg-[#FEF3D6] text-[#D97706]',
        labelColor: pendingCount > 0 ? 'text-[#B45309]' : 'text-[#59545B]',
        Icon: Hourglass,
      },
      {
        label: 'ผ่านการคัดเลือก',
        count: acceptedCount,
        cardClass:
          acceptedCount > 0
            ? 'border-[#B6E6CA] bg-[#F5FEF8]'
            : 'border-[#EAE2D8] bg-white',
        iconWrap: 'bg-[#E8F8EE] text-[#16A34A]',
        labelColor: acceptedCount > 0 ? 'text-[#15803D]' : 'text-[#59545B]',
        Icon: CheckCircle2,
      },
      {
        label: 'ไม่ผ่านการคัดเลือก',
        count: rejectedCount,
        cardClass: 'border-[#EAE2D8] bg-white',
        iconWrap: 'bg-[#EDF2FE] text-[#2563EB]',
        labelColor: 'text-[#59545B]',
        Icon: XCircle,
      },
    ];

    const filterTabs: {
      id: ApplicationFilterTab;
      label: string;
      count: number;
      Icon: typeof Layers;
      iconColor: string;
    }[] = [
      {
        id: 'ALL',
        label: 'ทั้งหมด',
        count: yearScopedItems.length,
        Icon: Layers,
        iconColor: 'text-[#861638]',
      },
      {
        id: 'SUBMITTED',
        label: 'รอพิจารณา',
        count: pendingCount,
        Icon: Hourglass,
        iconColor: 'text-[#D97706]',
      },
      {
        id: 'ACCEPTED_PENDING_CONFIRMATION',
        label: 'ผ่านการคัดเลือก',
        count: acceptedCount,
        Icon: CheckCircle2,
        iconColor: 'text-[#16A34A]',
      },
      {
        id: 'REJECTED',
        label: 'ไม่ผ่านการคัดเลือก',
        count: rejectedCount,
        Icon: XCircle,
        iconColor: 'text-[#2563EB]',
      },
      {
        id: 'CONFIRMED_DECLINED',
        label: 'ยืนยัน/สละสิทธิ์แล้ว',
        count: closedCount,
        Icon: Archive,
        iconColor: 'text-[#706B70]',
      },
    ];

    content =
      items.length === 0 && meta.totalElements > 0 ? (
        <EmptyState
          headingLevel={2}
          title="ไม่พบใบสมัครในหน้านี้"
          action={
            <Link
              to="/me/applications"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#861638] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6E112D]"
            >
              กลับไปหน้าแรกของรายการ
            </Link>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          headingLevel={2}
          icon={<ClipboardList className="size-6" />}
          title="คุณยังไม่มีประวัติการสมัครชมรม"
          description="ค้นหาชมรมที่สนใจและสมัครเข้าร่วมในรอบที่กำลังเปิดรับสมัคร"
          action={
            <Link
              to="/clubs"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#861638] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6E112D]"
            >
              ดูรายชื่อชมรม
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, count, cardClass, iconWrap, labelColor, Icon }) => (
              <div
                key={label}
                className={`flex items-center gap-4 rounded-2xl border p-5 shadow-[0_1px_2px_rgba(37,32,42,0.03)] ${cardClass}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
                >
                  <Icon strokeWidth={1.75} className="size-5" />
                </span>
                <div className="min-w-0">
                  <dt className={`text-xs font-semibold ${labelColor}`}>{label}</dt>
                  <dd className="mt-1 flex items-baseline gap-1.5 text-2xl font-extrabold tracking-tight text-[#25202A]">
                    <span>{count}</span>
                    <span className="text-xs font-medium text-[#706B70]">รายการ</span>
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          {meta.totalPages > 1 && (
            <p className="text-sm text-[#59545B]">
              จำนวนตามสถานะและตัวกรองแสดงเฉพาะใบสมัครในหน้านี้
            </p>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="กรองตามสถานะใบสมัคร"
              className="flex flex-wrap items-center gap-2"
            >
              {filterTabs.map(({ id, label, count, Icon, iconColor }) => {
                const selected = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveTab(id)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'border-[#861638] bg-[#861638] text-white shadow-2xs'
                        : 'border-[#E5DDD2] bg-white text-[#4E464D] hover:border-[#D5C9BA] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`size-4 ${selected ? 'text-white' : iconColor}`}
                    />
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className={`text-xs ${selected ? 'text-white/90' : 'text-[#706B70]'}`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {yearOptions.length > 0 && (
              <div className="flex items-center self-start lg:self-auto">
                <div className="relative inline-flex items-center">
                  <Calendar
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-3.5 size-4 text-[#706B70]"
                  />
                  <select
                    aria-label="กรองตามปีการศึกษา"
                    value={effectiveYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="min-h-10 appearance-none rounded-xl border border-[#DFD6CB] bg-white pl-9 pr-8 py-2 text-sm font-semibold text-[#25202A] transition hover:border-[#C5B9AB] focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
                  >
                    <option value="ALL">ทุกปีการศึกษา</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        ปีการศึกษา {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="ไม่พบใบสมัครในสถานะที่เลือกในหน้านี้"
              description="ลองเปลี่ยนตัวกรองหรือไปหน้าอื่นเพื่อดูใบสมัครเพิ่มเติม"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveTab('ALL');
                    setSelectedYear('ALL');
                  }}
                >
                  แสดงทั้งหมด
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {filteredItems.map((application) => (
                <li key={application.id}>
                  <ApplicationCard application={application} />
                </li>
              ))}
            </ul>
          )}

          {meta.totalPages > 1 && (
            <nav
              aria-label="เปลี่ยนหน้ารายการใบสมัคร"
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#EAE2D8] bg-white px-5 py-3.5"
            >
              <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>
                <ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />
                <span>ก่อนหน้า</span>
              </Button>
              <p className="text-sm font-medium text-[#59545B]">
                หน้า {page + 1} จาก {meta.totalPages}
              </p>
              <Button
                disabled={page >= meta.totalPages - 1}
                onClick={() => goToPage(page + 1)}
              >
                <span>ถัดไป</span>
                <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
              </Button>
            </nav>
          )}
        </div>
      );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A]">
      <PageHeaderBanner
        headingRef={headingRef}
        breadcrumbs={[
          { label: 'หน้าหลัก', to: '/' },
          { label: 'ประวัติการสมัครของฉัน' },
        ]}
        icon={
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#EFE3DF] bg-[#FAF0F2] text-[#861638] shadow-2xs"
          >
            <ClipboardList strokeWidth={1.75} className="size-6" />
          </span>
        }
        title="ประวัติและสถานะใบสมัคร"
        subtitle="ติดตามสถานะใบสมัครชมรม ผลการคัดเลือก และรายละเอียดคำตอบที่คุณได้ยื่นไว้"
      />
      <div className={`${WIDE_CONTAINER_CLASS} py-6 sm:py-8`}>{content}</div>
    </div>
  );
}

const DECISION_COPY: Record<
  MembershipDecision,
  {
    title: string;
    action: string;
    busyAction: string;
    tone: 'primary' | 'danger';
    errorFallback: string;
    prompt: (clubName: string, roundTitle: string) => ReactNode;
    warning: string;
    warningClass: string;
  }
> = {
  confirm: {
    title: 'ยืนยันการเข้าร่วมเป็นสมาชิกชมรม',
    action: 'ยืนยันสิทธิ์',
    busyAction: 'กำลังยืนยัน...',
    tone: 'primary',
    errorFallback: 'ไม่สามารถยืนยันสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง',
    prompt: (clubName, roundTitle) => (
      <>
        คุณต้องการยืนยันสิทธิ์เข้าร่วม <strong>{clubName}</strong> ในรอบ{' '}
        <strong>{roundTitle}</strong> ใช่หรือไม่?
      </>
    ),
    warning:
      'เมื่อกดยืนยันสิทธิ์แล้ว ระบบจะขึ้นทะเบียนคุณเป็นสมาชิกชมรมทันที และไม่สามารถยกเลิกหรือเปลี่ยนแปลงการตัดสินใจในภายหลังได้ (นักศึกษาสามารถเป็นสมาชิกชมรมได้สูงสุดไม่เกิน 5 ชมรม)',
    warningClass: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  decline: {
    title: 'ยืนยันการสละสิทธิ์เข้าชมรม',
    action: 'ยืนยันสละสิทธิ์',
    busyAction: 'กำลังสละสิทธิ์...',
    tone: 'danger',
    errorFallback: 'ไม่สามารถสละสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง',
    prompt: (clubName) => (
      <>
        คุณต้องการสละสิทธิ์การเข้าร่วม <strong>{clubName}</strong> ใช่หรือไม่?
      </>
    ),
    warning:
      'หากคุณกดสละสิทธิ์ สิทธิ์การเข้าเป็นสมาชิกชมรมในรอบนี้จะสิ้นสุดลงทันที และไม่สามารถขอกลับมายืนยันสิทธิ์ในภายหลังได้',
    warningClass: 'border-red-200 bg-red-50 text-red-900',
  },
};

/** Mirrors the server transition so the page updates without a refetch. */
function applyOfferResult(
  detail: ApplicantApplicationDetail,
  result: MembershipOfferResponse,
): ApplicantApplicationDetail {
  const lastEntry = detail.statusHistory.at(-1);
  const nextHistory =
    lastEntry?.status === result.status
      ? detail.statusHistory
      : [
          ...detail.statusHistory,
          {
            status: result.status,
            displayStatusLabel: result.displayStatusLabel,
            occurredAt: result.respondedAt,
          },
        ];

  return {
    ...detail,
    applicantVisibleStatus: result.status,
    displayStatusLabel: result.displayStatusLabel,
    respondedAt: result.respondedAt,
    canConfirm: false,
    canDecline: false,
    statusHistory: nextHistory,
  };
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-5 w-[3.5px] shrink-0 rounded-full bg-[#861638]" />
        <h2 className="text-base font-extrabold tracking-tight text-[#25202A] sm:text-lg">
          {title}
        </h2>
      </div>
      {subtitle && <p className="mt-1 pl-[13.5px] text-xs text-[#706B70] sm:text-sm">{subtitle}</p>}
    </div>
  );
}

const DETAIL_BREADCRUMB_SEPARATOR = (
  <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-[#9A918B]" />
);

export function MyApplicationDetailPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const { user } = useAuth();
  const {
    data: detail,
    error,
    isLoading,
    reload,
    update,
  } = useApiResource(`my-application-detail:${applicationId}`, () =>
    apiRequest<ApplicantApplicationDetail>(
      `/api/v1/me/applications/${encodeURIComponent(applicationId)}`,
    ),
  );

  const [decision, setDecision] = useState<MembershipDecision | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openDecision = (next: MembershipDecision) => {
    setActionError(null);
    setDecision(next);
  };

  const submitDecision = async () => {
    if (!decision) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const result = await apiRequest<MembershipOfferResponse>(
        `/api/v1/me/applications/${encodeURIComponent(applicationId)}/${decision}`,
        { method: 'POST' },
      );
      update((current) => applyOfferResult(current, result));
    } catch (err) {
      setActionError(describeApiError(err, DECISION_COPY[decision].errorFallback));
      if (err instanceof ApiError && err.status === 409) {
        reload();
      }
    } finally {
      setIsProcessing(false);
      setDecision(null);
    }
  };

  const detailBreadcrumbs = [
    { label: 'หน้าหลัก', to: '/' },
    { label: 'ใบสมัครของฉัน', to: '/me/applications' },
    { label: detail?.club.name ? `รายละเอียดใบสมัคร · ${detail.club.name}` : 'รายละเอียดใบสมัคร' },
  ];
  const breadcrumbNav = (
    <Breadcrumbs
      items={detailBreadcrumbs}
      className="mb-4"
      listClassName="text-xs font-medium"
      separator={DETAIL_BREADCRUMB_SEPARATOR}
    />
  );

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A]">
        <div className={`${WIDE_CONTAINER_CLASS} py-6 sm:py-8`}>
          {breadcrumbNav}
          <div role="status">
            <span className="sr-only">กำลังโหลดรายละเอียดใบสมัคร...</span>
            <div
              aria-hidden="true"
              className="h-96 rounded-2xl border border-[#EAE2D8] bg-white p-6 motion-safe:animate-pulse"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A]">
        <div className={`${WIDE_CONTAINER_CLASS} py-6 sm:py-8`}>
          {breadcrumbNav}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#EAE2D8] bg-white px-6 py-12 text-center shadow-[0_2px_10px_-4px_rgba(37,32,42,0.06)]">
            <p role="alert" className="text-sm text-[#59545B]">
              {describeApiError(
                error,
                'ไม่สามารถโหลดรายละเอียดใบสมัครได้ กรุณาลองใหม่อีกครั้ง',
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="primary" onClick={reload}>
                ลองใหม่
              </Button>
              <Link
                to="/me/applications"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DFD6CB] bg-white px-4 py-2 text-sm font-semibold text-[#25202A] transition hover:bg-[#FAF6F1]"
              >
                กลับหน้ารายการใบสมัคร
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { club, round } = detail;
  const submittedText = formatThaiDateTime(detail.submittedAt);
  const publishedText = round.resultsPublishedAt
    ? formatThaiDateTime(round.resultsPublishedAt)
    : '';
  const deadlineText = round.confirmationDeadline
    ? formatThaiDateTime(round.confirmationDeadline)
    : '';
  const respondedText = detail.respondedAt
    ? formatThaiDateTime(detail.respondedAt)
    : '';
  const dateItems = [
    ['วันที่ส่งใบสมัคร', submittedText || '-'],
    ['วันที่ประกาศผล', publishedText],
    ['กำหนดยืนยันสิทธิ์', deadlineText],
    ['วันที่ตอบรับสิทธิ์', respondedText],
  ].filter(([, value]) => Boolean(value));
  const decisionCopy = DECISION_COPY[decision ?? 'confirm'];
  const semesterLabel =
    round.semester === 3 ? 'ภาคฤดูร้อน' : `ภาคเรียนที่ ${round.semester}`;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A]">
      <div className={`${WIDE_CONTAINER_CLASS} py-6 sm:py-8`}>
        {breadcrumbNav}

        <div className="flex flex-col gap-7 rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_2px_10px_-4px_rgba(37,32,42,0.06)] sm:p-8 lg:p-10">
          {/* Header summary */}
          <header className="flex flex-col gap-5 border-b border-[#F2ECE4] pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-[#EAE2D8] bg-[#F5EFE8] sm:w-44">
                <ClubLogo
                  src={club.imageUrl}
                  clubName={club.name}
                  iconClassName="size-8"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex w-fit items-center rounded-full bg-[#FAF0F2] px-3 py-0.5 text-xs font-semibold text-[#861638]">
                  ปีการศึกษา {round.academicYear} {semesterLabel} · รหัสใบสมัคร #{detail.id}
                </span>
                <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-[#25202A] sm:text-2xl">
                  {club.name}
                </h1>
                <p className="mt-0.5 text-sm font-medium text-[#59545B]">
                  {round.title}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <ApplicationStatusBadge
                status={detail.applicantVisibleStatus}
                label={detail.displayStatusLabel}
              />
              {submittedText && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DDD2] bg-[#FAF7F3] px-3 py-1 text-xs font-medium text-[#59545B]">
                  <Calendar aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-[#8A827A]" />
                  <span>ส่งใบสมัคร {submittedText}</span>
                </span>
              )}
            </div>
          </header>

          {/* 1. Status & timeline */}
          <section className="flex flex-col gap-4 border-b border-[#F2ECE4] pb-7">
            <SectionHeading
              title="สถานะใบสมัคร"
              subtitle="ติดตามความคืบหน้าการพิจารณาใบสมัครของคุณ"
            />

            <ApplicationProgressStepper
              status={detail.applicantVisibleStatus}
              submittedText={submittedText}
              publishedText={publishedText}
              respondedText={respondedText}
            />

            {actionError && (
              <div
                role="alert"
                className="rounded-xl border border-[#F3C5CA] bg-[#FFF1F2] p-4 text-sm font-medium text-[#9F1239]"
              >
                {actionError}
              </div>
            )}

            {detail.applicantVisibleStatus === 'SUBMITTED' && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#F2DDA4] bg-[#FFFBEB] px-4 py-3 text-sm text-[#784805]">
                <Info aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
                <p className="font-semibold">
                  ใบสมัครของคุณอยู่ระหว่างการพิจารณาของคณะกรรมการชมรม
                </p>
              </div>
            )}

            {detail.applicantVisibleStatus === 'ACCEPTED_PENDING_CONFIRMATION' && (
              <div className="rounded-xl border border-[#B6E6CA] bg-[#ECFDF3] p-5 text-sm text-[#14532D]">
                <p className="font-bold text-[#146C3B]">
                  ยินดีด้วย! คุณผ่านการคัดเลือกเข้าเป็นสมาชิกชมรม
                </p>
                {deadlineText && (
                  <p className="mt-1 text-xs font-medium text-[#15803D]">
                    กรุณายืนยันสิทธิ์ภายในวันที่: {deadlineText}
                  </p>
                )}

                {(detail.canConfirm || detail.canDecline) && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[#B6E6CA] pt-4">
                    <p className="text-xs text-[#15803D]">
                      เมื่อยืนยันหรือสละสิทธิ์แล้วจะไม่สามารถเปลี่ยนใจได้
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {detail.canConfirm && (
                        <Button
                          variant="primary"
                          onClick={() => openDecision('confirm')}
                        >
                          ยืนยันสิทธิ์เข้าชมรม
                        </Button>
                      )}
                      {detail.canDecline && (
                        <Button
                          variant="secondary"
                          onClick={() => openDecision('decline')}
                        >
                          สละสิทธิ์
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {detail.applicantVisibleStatus === 'CONFIRMED' && (
              <div className="rounded-xl border border-[#B6E6CA] bg-[#ECFDF3] p-4 text-sm text-[#14532D]">
                <p className="text-base font-bold text-[#146C3B]">
                  เป็นสมาชิกชมรมเรียบร้อยแล้ว
                </p>
                <p className="mt-1 text-[#15803D]">
                  คุณได้ยืนยันสิทธิ์เข้าร่วม {club.name} เรียบร้อยแล้ว
                  {respondedText ? ` (เมื่อ ${respondedText})` : ''}
                </p>
              </div>
            )}

            {detail.applicantVisibleStatus === 'DECLINED' && (
              <div className="rounded-xl border border-[#EAE2D8] bg-[#FAF7F3] p-4 text-sm text-[#59545B]">
                <p className="font-semibold text-[#25202A]">
                  คุณได้สละสิทธิ์การเข้าร่วมชมรมนี้แล้ว
                </p>
                {respondedText && (
                  <p className="mt-1 text-xs text-[#706B70]">
                    ดำเนินการเมื่อ: {respondedText}
                  </p>
                )}
              </div>
            )}

            {detail.resultMessage && (
              <div className="rounded-xl border border-[#EAE2D8] bg-[#FAF7F3] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#706B70]">
                  หมายเหตุจากคณะกรรมการชมรม
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm text-[#25202A]">
                  {detail.resultMessage}
                </p>
              </div>
            )}

            {dateItems.length > 0 && (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {dateItems.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#EFE9E1] bg-[#FAF7F3]/60 px-4 py-3"
                  >
                    <dt className="text-xs text-[#706B70]">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-[#25202A]">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="pt-1">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#706B70]">
                ประวัติการเปลี่ยนสถานะ
              </h3>
              {detail.statusHistory.length > 0 ? (
                <ol
                  aria-label="ไทม์ไลน์สถานะใบสมัคร"
                  className="relative ml-2.5 border-l border-[#E5DDD2] pl-5"
                >
                  {detail.statusHistory.map((entry, index) => {
                    const isLatest = index === detail.statusHistory.length - 1;
                    const entryTime = formatThaiDateTime(entry.occurredAt);
                    return (
                      <li
                        key={`${entry.status}-${entry.occurredAt}-${index}`}
                        className="mb-4 last:mb-0"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-white ${
                            isLatest ? 'bg-[#861638]' : 'bg-[#B6ABA0]'
                          }`}
                        />
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <p className="text-sm font-semibold text-[#25202A]">
                            {entry.displayStatusLabel}
                          </p>
                          {entryTime && (
                            <p className="text-xs text-[#706B70]">{entryTime}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <ol aria-label="ไทม์ไลน์สถานะใบสมัคร" className="text-xs text-[#706B70]">
                  <li>ยังไม่มีบันทึกประวัติเพิ่มเติม</li>
                </ol>
              )}
            </div>
          </section>

          {/* 2. Applicant Info */}
          <section className="flex flex-col gap-4 border-b border-[#F2ECE4] pb-7">
            <SectionHeading title="ข้อมูลผู้สมัคร" />

            <ApplicantIdentityGrid user={user} />
          </section>

          {/* 3. Application answers */}
          <section className="flex flex-col gap-4 border-b border-[#F2ECE4] pb-7">
            <SectionHeading title="คำตอบในใบสมัคร" />

            <div className="rounded-xl border border-[#EFE9E1] bg-[#FAF7F3]/80 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-[#25202A]">
                เหตุผลที่สนใจเข้าร่วมชมรม
              </h3>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#59545B]">
                {detail.motivation}
              </p>
            </div>

            {detail.questionsWithAnswers.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[#25202A]">
                  คำถามเพิ่มเติมจากชมรม
                </h3>
                <ol className="flex flex-col gap-3">
                  {detail.questionsWithAnswers.map((qa, index) => (
                    <li
                      key={qa.questionId}
                      className="rounded-xl border border-[#EFE9E1] bg-[#FAF7F3]/60 p-4"
                    >
                      <p className="text-sm font-semibold text-[#25202A]">
                        {index + 1}. {qa.questionText}
                        {qa.isRequired && (
                          <span className="ml-1.5 text-xs font-normal text-[#861638]">
                            (จำเป็น)
                          </span>
                        )}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-[#59545B]">
                        {qa.answerText?.trim() || 'ไม่ได้ระบุคำตอบ'}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* 4. Supporting links */}
          <section className="flex flex-col gap-4">
            <SectionHeading
              title="เอกสารประกอบ"
              subtitle="เอกสารหรือลิงก์ผลงานที่แนบมากับใบสมัคร (ถ้ามี)"
            />

            {detail.links.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {detail.links.map((link) => (
                  <li
                    key={`${link.displayOrder}-${link.url}`}
                    className="flex flex-col gap-3 rounded-xl border border-[#EAE2D8] bg-[#FAF7F3]/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FAF0F2] text-[#861638]"
                      >
                        <FileText strokeWidth={1.75} className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#25202A]">
                          {link.label}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#706B70]">
                          {link.url}
                        </p>
                      </div>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DFD6CB] bg-white px-4 py-2 text-sm font-semibold text-[#25202A] transition hover:border-[#C5B9AB] hover:bg-[#FAF6F1]"
                    >
                      <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4 text-[#59545B]" />
                      <span>เปิดลิงก์</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-[#DFD6CB] bg-[#FAF7F3]/50 px-4 py-4 text-sm text-[#706B70]">
                ไม่มีเอกสารหรือลิงก์ผลงานแนบมากับใบสมัครนี้
              </p>
            )}
          </section>

          {/* Card Footer */}
          <footer className="flex flex-col gap-3 border-t border-[#F2ECE4] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/me/applications"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DFD6CB] bg-white px-4 py-2 text-sm font-semibold text-[#25202A] transition hover:border-[#C5B9AB] hover:bg-[#FAF6F1]"
              >
                <ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4 text-[#59545B]" />
                <span>กลับไปใบสมัครของฉัน</span>
              </Link>
              <Link
                to={`/clubs/${encodeURIComponent(club.id)}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#59545B] transition hover:bg-[#F5EFE8] hover:text-[#25202A]"
              >
                <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4" />
                <span>ดูหน้าชมรม</span>
              </Link>
            </div>

            <p className="inline-flex items-center gap-2 text-xs text-[#706B70]">
              <Info aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-[#8A827A]" />
              <span>หากมีคำถามเกี่ยวกับผลการคัดเลือก กรุณาติดต่อชมรมโดยตรง</span>
            </p>
          </footer>
        </div>

        <ConfirmDialog
          open={decision !== null}
          tone={decisionCopy.tone}
          title={decisionCopy.title}
          confirmLabel={
            isProcessing ? decisionCopy.busyAction : decisionCopy.action
          }
          busy={isProcessing}
          onCancel={() => setDecision(null)}
          onConfirm={submitDecision}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-[#59545B]">
              {decisionCopy.prompt(club.name, round.title)}
            </p>
            <div
              className={`rounded-lg border p-4 text-sm leading-relaxed ${decisionCopy.warningClass}`}
            >
              {decisionCopy.warning}
            </div>
          </div>
        </ConfirmDialog>
      </div>
    </div>
  );
}
