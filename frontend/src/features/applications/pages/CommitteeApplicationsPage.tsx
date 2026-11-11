import { useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import CommitteeLayout from '../../../components/layout/CommitteeLayout';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CircleAlertIcon, ClipboardCheckIcon } from '../../../components/ui/icons';
import { useApiResource } from '../../../hooks/useApiResource';
import { describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { isValidId } from '../../../lib/ids';
import NotFoundPage from '../../../pages/NotFoundPage';
import {
  CommitteeApplicationStatusBadge,
} from '../components/CommitteeApplicationStatusBadge';
import {
  COMMITTEE_APPLICATION_STATUS_OPTIONS,
  isCommitteeApplicationStatus,
} from '../components/committeeApplicationStatus';
import {
  COMMITTEE_APPLICATIONS_PAGE_SIZE,
  fetchCommitteeApplications,
} from '../services/committeeApplicationService';
import type { CommitteeApplicationStatus } from '../types/application';

const selectedPage = (value: string | null) =>
  value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) - 1 : 0;

export default function CommitteeApplicationsPage() {
  const { clubId } = useParams();
  if (!isValidId(clubId)) return <NotFoundPage />;
  return <ApplicationsList key={clubId} clubId={clubId} />;
}

function ApplicationsList({ clubId }: { clubId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const page = selectedPage(searchParams.get('page'));
  const rawStatus = searchParams.get('status');
  const status = isCommitteeApplicationStatus(rawStatus) ? rawStatus : undefined;
  const resourceKey = `committee-applications:${clubId}:${status ?? 'ALL'}:${page}`;
  const { data, error, isLoading, reload } = useApiResource(
    resourceKey,
    () => fetchCommitteeApplications(clubId, { status, page }),
  );

  const updateFilters = (nextStatus: CommitteeApplicationStatus | undefined) => {
    setSearchParams(nextStatus ? { status: nextStatus } : {});
    headingRef.current?.focus();
  };
  const goToPage = (nextPage: number) => {
    setSearchParams({
      ...(status ? { status } : {}),
      ...(nextPage > 0 ? { page: String(nextPage + 1) } : {}),
    });
    headingRef.current?.focus();
  };

  return (
    <CommitteeLayout
      clubId={clubId}
      title="ตรวจสอบใบสมัคร"
      description="ตรวจรายชื่อ สถานะ และข้อมูลที่ผู้สมัครส่งเข้ามา"
      breadcrumbs={[{ label: 'ตรวจสอบใบสมัคร' }]}
    >
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="application-status-filter" className="mb-1.5 block text-sm font-medium text-slate-800">
              กรองตามสถานะ
            </label>
            <select
              id="application-status-filter"
              className={inputClass()}
              value={status ?? ''}
              onChange={(event) => updateFilters(isCommitteeApplicationStatus(event.target.value)
                ? event.target.value
                : undefined)}
            >
              <option value="">ทุกสถานะ</option>
              {COMMITTEE_APPLICATION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {data && (
            <p className="text-sm text-slate-600" aria-live="polite">
              พบใบสมัคร {data.page.totalElements.toLocaleString('th-TH')} รายการ
            </p>
          )}
        </div>

        {isLoading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            กำลังโหลดรายชื่อผู้สมัคร...
          </div>
        ) : !data ? (
          <EmptyState
            icon={<CircleAlertIcon className="size-6" />}
            title="โหลดรายชื่อผู้สมัครไม่สำเร็จ"
            description={describeApiError(error, 'ไม่สามารถโหลดรายชื่อผู้สมัครได้ กรุณาลองใหม่อีกครั้ง')}
            action={<Button variant="primary" onClick={reload}>ลองใหม่</Button>}
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheckIcon className="size-6" />}
            title={status ? 'ไม่พบใบสมัครในสถานะนี้' : 'ยังไม่มีผู้สมัคร'}
            description={status ? 'ลองเลือกสถานะอื่นเพื่อดูใบสมัครเพิ่มเติม' : 'ใบสมัครที่ส่งเข้ามาจะแสดงในหน้านี้'}
            headingLevel={2}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">ผู้สมัคร</th>
                      <th scope="col" className="px-5 py-3">รอบรับสมัคร</th>
                      <th scope="col" className="px-5 py-3">วันที่สมัคร</th>
                      <th scope="col" className="px-5 py-3">สถานะ</th>
                      <th scope="col" className="px-5 py-3"><span className="sr-only">รายละเอียด</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((application) => (
                      <tr key={application.id} className="hover:bg-slate-50">
                        <th scope="row" className="px-5 py-4 font-medium text-slate-900">
                          <span className="block">{application.applicant.displayName}</span>
                          <span className="mt-0.5 block text-xs font-normal text-slate-600">
                            รหัสนักศึกษา {application.applicant.studentCode}
                          </span>
                        </th>
                        <td className="px-5 py-4 text-slate-700">รอบรหัส {application.roundId}</td>
                        <td className="px-5 py-4 text-slate-700">
                          {formatThaiDateTime(application.submittedAt) || 'ไม่ระบุวันที่'}
                        </td>
                        <td className="px-5 py-4">
                          <CommitteeApplicationStatusBadge status={application.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/clubs/${clubId}/applications/${application.id}`}
                            className="font-semibold text-tu-maroon underline-offset-4 hover:underline"
                          >
                            ดูใบสมัคร
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data.page.totalPages > 1 && (
              <nav aria-label="เปลี่ยนหน้ารายชื่อผู้สมัคร" className="flex items-center justify-between gap-3">
                <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>ก่อนหน้า</Button>
                <p className="text-sm text-slate-600">
                  หน้า {(page + 1).toLocaleString('th-TH')} จาก {data.page.totalPages.toLocaleString('th-TH')}
                  {' '}· แสดง {COMMITTEE_APPLICATIONS_PAGE_SIZE} รายการต่อหน้า
                </p>
                <Button
                  disabled={page + 1 >= data.page.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  ถัดไป
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </CommitteeLayout>
  );
}
