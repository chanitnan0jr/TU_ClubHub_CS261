import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Button } from '../../../components/ui/Button';
import { buttonClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  ClipboardCheckIcon,
  ExternalLinkIcon,
} from '../../../components/ui/icons';
import { SectionCard } from '../../../components/ui/SectionCard';
import { useApiResource } from '../../../hooks/useApiResource';
import { describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { ClubLogo } from '../../clubs/components/ClubLogo';
import {
  ApplicationCard,
  ApplicationStatusBadge,
} from '../components/ApplicationCard';
import {
  fetchMyApplicationDetail,
  fetchMyApplications,
  MY_APPLICATIONS_PAGE_SIZE,
} from '../services/myApplicationService';
import type {
  ApplicantApplicationSummary,
  ApplicationFilterTab,
} from '../types/application';

const pageIndex = (value: string | null) =>
  value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) - 1 : 0;

const filterTabs: { id: ApplicationFilterTab; label: string }[] = [
  { id: 'ALL', label: 'ทั้งหมด' },
  { id: 'SUBMITTED', label: 'รอพิจารณา' },
  { id: 'ACCEPTED_PENDING_CONFIRMATION', label: 'ผ่านการคัดเลือก' },
  { id: 'REJECTED', label: 'ไม่ผ่านการคัดเลือก' },
  { id: 'CONFIRMED_DECLINED', label: 'ยืนยัน/สละสิทธิ์แล้ว' },
];

const closedStatuses = new Set([
  'CONFIRMED',
  'DECLINED',
  'EXPIRED',
  'WITHDRAWN',
]);

const matchesFilter = (
  app: ApplicantApplicationSummary,
  tab: ApplicationFilterTab,
) =>
  tab === 'ALL' ||
  (tab === 'CONFIRMED_DECLINED'
    ? closedStatuses.has(app.applicantVisibleStatus)
    : app.applicantVisibleStatus === tab);

export function MyApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageIndex(searchParams.get('page'));
  const [activeTab, setActiveTab] = useState<ApplicationFilterTab>('ALL');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { data, error, isLoading, reload } = useApiResource(
    `my-applications:${page}`,
    () => fetchMyApplications(page, MY_APPLICATIONS_PAGE_SIZE),
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
              className="h-36 rounded-xl border border-slate-200 bg-white p-5 motion-safe:animate-pulse"
            />
          ))}
        </ul>
      </div>
    );
  } else if (!data) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p role="alert" className="text-sm text-slate-700">
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
    const filteredItems = items.filter((item) => matchesFilter(item, activeTab));
    const countOf = (status: string) =>
      items.filter((item) => item.applicantVisibleStatus === status).length;
    const stats = [
      ['ใบสมัครทั้งหมด', meta.totalElements, 'text-slate-500', 'text-slate-900'],
      ['รอพิจารณา', countOf('SUBMITTED'), 'text-amber-700', 'text-amber-800'],
      [
        'ผ่านการคัดเลือก',
        countOf('ACCEPTED_PENDING_CONFIRMATION'),
        'text-emerald-700',
        'text-emerald-800',
      ],
      ['ยืนยันสิทธิ์แล้ว', countOf('CONFIRMED'), 'text-blue-700', 'text-blue-900'],
    ] as const;

    content =
      items.length === 0 && meta.totalElements > 0 ? (
        <EmptyState
          headingLevel={2}
          title="ไม่พบใบสมัครในหน้านี้"
          action={
            <Link to="/me/applications" className={buttonClass('primary')}>
              กลับไปหน้าแรกของรายการ
            </Link>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          headingLevel={2}
          icon={<ClipboardCheckIcon className="size-6" />}
          title="คุณยังไม่มีประวัติการสมัครชมรม"
          description="ค้นหาชมรมที่สนใจและสมัครเข้าร่วมในรอบที่กำลังเปิดรับสมัคร"
          action={
            <Link to="/open-calls" className={buttonClass('primary')}>
              ดูรอบที่เปิดรับสมัคร
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([label, count, dtColor, ddColor]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <dt className={`text-xs font-medium ${dtColor}`}>{label}</dt>
                <dd className={`mt-1 text-2xl font-bold ${ddColor}`}>
                  {count}{' '}
                  <span className={`text-xs font-normal ${dtColor}`}>รายการ</span>
                </dd>
              </div>
            ))}
          </dl>

          <div
            role="group"
            aria-label="กรองตามสถานะใบสมัคร"
            className="flex flex-wrap items-center gap-2"
          >
            {filterTabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-tu-maroon text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              headingLevel={2}
              title="ไม่พบใบสมัครในสถานะที่เลือก"
              description="ลองเปลี่ยนตัวกรองเป็นสถานะอื่นเพื่อดูรายการใบสมัครทั้งหมดของคุณ"
              action={
                <Button variant="secondary" onClick={() => setActiveTab('ALL')}>
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
              className="flex items-center justify-between gap-3"
            >
              <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>
                ก่อนหน้า
              </Button>
              <p className="text-sm text-slate-600">
                หน้า {page + 1} จาก {meta.totalPages}
              </p>
              <Button
                disabled={page >= meta.totalPages - 1}
                onClick={() => goToPage(page + 1)}
              >
                ถัดไป
              </Button>
            </nav>
          )}
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'หน้าหลัก', to: '/' },
          { label: 'ประวัติการสมัครของฉัน' },
        ]}
      />
      <header className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-3xl"
        >
          ประวัติและสถานะใบสมัคร
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          ติดตามสถานะใบสมัครชมรม ผลการคัดเลือก และรายละเอียดคำตอบที่คุณได้ยื่นไว้
        </p>
      </header>
      {content}
    </div>
  );
}

export function MyApplicationDetailPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const { data: detail, error, isLoading, reload } = useApiResource(
    `my-application-detail:${applicationId}`,
    () => fetchMyApplicationDetail(applicationId),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 pb-12" role="status">
        <span className="sr-only">กำลังโหลดรายละเอียดใบสมัคร...</span>
        <div
          aria-hidden="true"
          className="h-40 rounded-xl border border-slate-200 bg-white p-6 motion-safe:animate-pulse"
        />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <Breadcrumbs
          items={[
            { label: 'หน้าหลัก', to: '/' },
            { label: 'ประวัติการสมัครของฉัน', to: '/me/applications' },
            { label: 'รายละเอียดใบสมัคร' },
          ]}
        />
        <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p role="alert" className="text-sm text-slate-700">
            {describeApiError(
              error,
              'ไม่สามารถโหลดรายละเอียดใบสมัครได้ กรุณาลองใหม่อีกครั้ง',
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" onClick={reload}>
              ลองใหม่
            </Button>
            <Link to="/me/applications" className={buttonClass('secondary')}>
              กลับหน้ารายการใบสมัคร
            </Link>
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

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'หน้าหลัก', to: '/' },
          { label: 'ประวัติการสมัครของฉัน', to: '/me/applications' },
          { label: club.name },
        ]}
      />

      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="size-14 shrink-0">
            <ClubLogo
              src={club.imageUrl}
              clubName={club.name}
              iconClassName="size-7"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {club.name}
              </h1>
              <ApplicationStatusBadge
                status={detail.applicantVisibleStatus}
                label={detail.displayStatusLabel}
              />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {round.title} · ปีการศึกษา {round.academicYear} ภาคเรียนที่{' '}
              {round.semester}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              รหัสใบสมัคร #{detail.id}
              {submittedText ? ` · ส่งเมื่อ ${submittedText}` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={`/clubs/${encodeURIComponent(club.id)}`}
            className={buttonClass('secondary')}
          >
            ดูหน้าชมรม
          </Link>
          <Link to="/me/applications" className={buttonClass('ghost')}>
            กลับหน้ารายการ
          </Link>
        </div>
      </header>

      <SectionCard
        title="สถานะและขั้นตอนต่อไป"
        description="ข้อมูลผลการพิจารณาและกำหนดการที่เกี่ยวข้องกับใบสมัครของคุณ"
      >
        <div className="flex flex-col gap-4">
          {detail.applicantVisibleStatus === 'SUBMITTED' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                ใบสมัครของคุณอยู่ระหว่างการพิจารณาของคณะกรรมการชมรม
              </p>
            </div>
          )}

          {detail.applicantVisibleStatus ===
            'ACCEPTED_PENDING_CONFIRMATION' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
              <p className="font-semibold">
                ยินดีด้วย! คุณผ่านการคัดเลือกเข้าเป็นสมาชิกชมรม
              </p>
              {deadlineText && (
                <p className="mt-1 text-xs font-medium text-emerald-800">
                  กรุณายืนยันสิทธิ์ภายในวันที่: {deadlineText}
                </p>
              )}
            </div>
          )}

          {detail.resultMessage && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                หมายเหตุจากคณะกรรมการชมรม
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
                {detail.resultMessage}
              </p>
            </div>
          )}

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {dateItems.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 px-4 py-3"
              >
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </SectionCard>

      <SectionCard
        title="ไทม์ไลน์สถานะใบสมัคร"
        description="ลำดับเหตุการณ์ของใบสมัครตั้งแต่ส่งใบสมัครจนถึงสถานะปัจจุบัน"
      >
        <ol
          aria-label="ไทม์ไลน์สถานะใบสมัคร"
          className="relative ml-3 border-l border-slate-200 pl-6"
        >
          {detail.statusHistory.map((entry, index) => {
            const isLatest = index === detail.statusHistory.length - 1;
            const entryTime = formatThaiDateTime(entry.occurredAt);
            return (
              <li
                key={`${entry.status}-${entry.occurredAt}-${index}`}
                className="mb-6 last:mb-0"
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-2 mt-1.5 size-4 rounded-full border-2 border-white ${
                    isLatest ? 'bg-tu-maroon' : 'bg-slate-400'
                  }`}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.displayStatusLabel}
                  </p>
                  {entryTime && (
                    <p className="text-xs text-slate-500">{entryTime}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      <SectionCard
        title="ข้อมูลใบสมัครที่ส่ง"
        description="รายละเอียดเหตุผลการสมัคร คำตอบสำหรับคำถามของชมรม และลิงก์ผลงานที่แนบ"
      >
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              เหตุผลและแรงจูงใจในการสมัคร
            </h3>
            <p className="mt-2 whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              {detail.motivation}
            </p>
          </div>

          {detail.questionsWithAnswers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                คำถามเพิ่มเติมจากชมรม
              </h3>
              <ol className="flex flex-col gap-3">
                {detail.questionsWithAnswers.map((qa, index) => (
                  <li
                    key={qa.questionId}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {index + 1}. {qa.questionText}
                      {qa.isRequired && (
                        <span className="ml-1.5 text-xs font-normal text-tu-maroon">
                          (จำเป็น)
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">
                      {qa.answerText?.trim() || 'ไม่ได้ระบุคำตอบ'}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {detail.links.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                ลิงก์ผลงานหรือเอกสารแนบ
              </h3>
              <ul className="flex flex-col gap-2">
                {detail.links.map((link) => (
                  <li key={`${link.displayOrder}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-tu-maroon hover:underline"
                    >
                      <span>{link.label}</span>
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
