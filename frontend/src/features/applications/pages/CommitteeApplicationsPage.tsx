import { useEffect, useState } from 'react';
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
import { useAuth } from '../../auth/AuthContext';
import { listRounds, type Round } from '../../recruitment/api/roundApi';
import { CommitteeApplicationStatusBadge } from '../components/CommitteeApplicationStatusBadge';
import {
  COMMITTEE_APPLICATION_STATUS_OPTIONS,
  isCommitteeApplicationStatus,
} from '../components/committeeApplicationStatus';
import { PublishResultsModal } from '../components/PublishResultsModal';
import {
  COMMITTEE_APPLICATIONS_PAGE_SIZE,
  fetchApplicationDecisionSnapshot,
  fetchCommitteeApplications,
  recordBatchApplicationDecisions,
} from '../services/committeeApplicationService';
import type {
  CommitteeApplicationStatus,
  SelectionDecisionChoice,
} from '../types/application';

const selectedPage = (value: string | null) =>
  value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) - 1 : 0;

export default function CommitteeApplicationsPage() {
  const { clubId } = useParams();
  if (!isValidId(clubId)) return <NotFoundPage />;
  return <ApplicationsList key={clubId} clubId={clubId} />;
}

function ApplicationsList({ clubId }: { clubId: string }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = selectedPage(searchParams.get('page'));
  const rawStatus = searchParams.get('status');
  const status = isCommitteeApplicationStatus(rawStatus) ? rawStatus : undefined;
  const rawRoundId = searchParams.get('roundId') ?? undefined;
  const selectedRoundId = isValidId(rawRoundId) ? rawRoundId : undefined;
  const [rounds, setRounds] = useState<Round[]>([]);
  const [draftDecisions, setDraftDecisions] = useState<Record<string, SelectionDecisionChoice>>({});
  const [batchNote, setBatchNote] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  const assignment = user?.activeCommitteeAssignments?.find((item) => item.clubId === clubId);
  const isPresident = assignment?.permissionRole === 'PRESIDENT';

  useEffect(() => {
    let cancelled = false;
    void listRounds(clubId, { size: 100 })
      .then((res) => {
        if (!cancelled) {
          setRounds(res.items.filter((round) => round.publicationStatus === 'PUBLISHED'));
        }
      })
      .catch(() => {
        if (!cancelled) setRounds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const activeRound = rounds.find((round) => round.id === selectedRoundId);
  const isRoundPublished = Boolean(activeRound?.resultsPublishedAt);

  const resourceKey = `committee-applications:${clubId}:${selectedRoundId ?? 'ALL'}:${status ?? 'ALL'}:${page}`;
  const { data, error, isLoading, reload } = useApiResource(
    resourceKey,
    () => fetchCommitteeApplications(clubId, { roundId: selectedRoundId, status, page }),
  );

  const updateFilters = (nextRoundId: string | undefined, nextStatus: CommitteeApplicationStatus | undefined) => {
    setDraftDecisions({});
    setBatchFeedback(null);
    setSearchParams({
      ...(nextRoundId ? { roundId: nextRoundId } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
    });
  };

  const goToPage = (nextPage: number) => {
    setSearchParams({
      ...(selectedRoundId ? { roundId: selectedRoundId } : {}),
      ...(status ? { status } : {}),
      ...(nextPage > 0 ? { page: String(nextPage + 1) } : {}),
    });
  };

  const draftEntries = Object.entries(draftDecisions);
  const exactItems = data && !status && data.page.totalPages <= 1 ? data.items : null;
  const acceptedCount = exactItems
    ? exactItems.filter((item) => item.status === 'ACCEPTED').length
    : undefined;
  const rejectedCount = exactItems
    ? exactItems.filter((item) => item.status === 'REJECTED').length
    : undefined;
  const undecidedCount = exactItems
    ? exactItems.filter((item) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW').length
    : undefined;

  const handleSaveBatchDecisions = async () => {
    if (!selectedRoundId || draftEntries.length === 0) return;
    setIsBatchSaving(true);
    setBatchFeedback(null);

    try {
      const snapshots = await Promise.all(
        draftEntries.map(([appId]) => fetchApplicationDecisionSnapshot(selectedRoundId, appId)),
      );
      const snapshotMap = new Map(snapshots.map((item) => [item.id, item]));

      await recordBatchApplicationDecisions(
        selectedRoundId,
        draftEntries.map(([applicationId, decision]) => {
          const snapshotItem = snapshotMap.get(applicationId);
          return {
            applicationId,
            decision,
            resultMessage: snapshotItem?.resultMessage ?? null,
            internalNote: batchNote.trim() ? batchNote.trim() : null,
            version: snapshotItem?.version ?? 0,
          };
        }),
      );

      setDraftDecisions({});
      setBatchNote('');
      setBatchFeedback({
        type: 'success',
        text: `บันทึกผลการคัดเลือกฉบับร่างจำนวน ${draftEntries.length} รายการเรียบร้อยแล้ว`,
      });
      reload();
    } catch (err) {
      setBatchFeedback({
        type: 'error',
        text: describeApiError(err, 'ไม่สามารถบันทึกผลการคัดเลือกแบบกลุ่มได้ กรุณาลองใหม่อีกครั้ง'),
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  return (
    <CommitteeLayout
      clubId={clubId}
      title="ตรวจสอบใบสมัคร"
      description="ตรวจรายชื่อ สถานะ ประเมินผล และประกาศผลการคัดเลือก"
      breadcrumbs={[{ label: 'ตรวจสอบใบสมัคร' }]}
    >
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="application-round-filter" className="mb-1.5 block text-sm font-medium text-slate-800">
                รอบรับสมัคร
              </label>
              <select
                id="application-round-filter"
                className={inputClass()}
                value={selectedRoundId ?? ''}
                onChange={(event) => updateFilters(event.target.value || undefined, status)}
              >
                <option value="">ทุกรอบรับสมัคร</option>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.title} (ปี {round.academicYear}/{round.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="application-status-filter" className="mb-1.5 block text-sm font-medium text-slate-800">
                กรองตามสถานะ
              </label>
              <select
                id="application-status-filter"
                className={inputClass()}
                value={status ?? ''}
                onChange={(event) =>
                  updateFilters(
                    selectedRoundId,
                    isCommitteeApplicationStatus(event.target.value) ? event.target.value : undefined,
                  )
                }
              >
                <option value="">ทุกสถานะ</option>
                {COMMITTEE_APPLICATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {activeRound && (
              <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600">สถานะการประกาศผล</span>
                  {isRoundPublished ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      ประกาศผลแล้ว (Published)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      ฉบับร่าง (Draft)
                    </span>
                  )}
                </div>
                {isPresident && !isRoundPublished && (
                  <Button
                    type="button"
                    variant="primary"
                    className="mt-3 w-full"
                    onClick={() => setPublishModalOpen(true)}
                  >
                    ประกาศผลการคัดเลือก
                  </Button>
                )}
              </div>
            )}
          </div>

          {data && (
            <p className="text-sm text-slate-600" aria-live="polite">
              พบใบสมัคร {data.page.totalElements.toLocaleString('th-TH')} รายการ
            </p>
          )}
        </div>

        {selectedRoundId && !isRoundPublished && draftEntries.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-950">
                เลือกผลการคัดเลือกชั่วคราวไว้ {draftEntries.length} รายการ (ยังไม่บันทึก)
              </p>
              <label htmlFor="batch-internal-note" className="mt-2 block text-xs font-medium text-amber-900">
                หมายเหตุภายในกรรมการสำหรับรายการที่เลือก (ถ้ามี)
              </label>
              <input
                id="batch-internal-note"
                type="text"
                maxLength={2000}
                value={batchNote}
                onChange={(event) => setBatchNote(event.target.value)}
                placeholder="ระบุหมายเหตุร่วมกันสำหรับรายการที่เลือก..."
                className={`${inputClass()} mt-1 bg-white`}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isBatchSaving}
                onClick={() => setDraftDecisions({})}
              >
                ล้างที่เลือก
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isBatchSaving}
                onClick={() => void handleSaveBatchDecisions()}
              >
                {isBatchSaving ? 'กำลังบันทึก...' : 'บันทึกผลที่เลือก'}
              </Button>
            </div>
          </div>
        )}

        {batchFeedback && (
          <p
            role={batchFeedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-4 py-3 text-sm ${
              batchFeedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {batchFeedback.text}
          </p>
        )}

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
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">ผู้สมัคร</th>
                      <th scope="col" className="px-5 py-3">รอบรับสมัคร</th>
                      <th scope="col" className="px-5 py-3">วันที่สมัคร</th>
                      <th scope="col" className="px-5 py-3">สถานะ</th>
                      {selectedRoundId && !isRoundPublished && (
                        <th scope="col" className="px-5 py-3">ประเมินผลด่วน</th>
                      )}
                      <th scope="col" className="px-5 py-3"><span className="sr-only">รายละเอียด</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((application) => {
                      const canQuickEvaluate =
                        selectedRoundId &&
                        !isRoundPublished &&
                        ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(application.status);
                      const draftChoice = draftDecisions[application.id];

                      return (
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
                          {selectedRoundId && !isRoundPublished && (
                            <td className="px-5 py-4">
                              {canQuickEvaluate ? (
                                <select
                                  aria-label={`เลือกผลการคัดเลือกของ ${application.applicant.displayName}`}
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
                                  value={draftChoice ?? ''}
                                  onChange={(event) => {
                                    const val = event.target.value as SelectionDecisionChoice | '';
                                    setDraftDecisions((prev) => {
                                      const next = { ...prev };
                                      if (!val) delete next[application.id];
                                      else next[application.id] = val;
                                      return next;
                                    });
                                  }}
                                >
                                  <option value="">-- เลือกผล --</option>
                                  <option value="ACCEPTED">ผ่าน (อนุมัติ)</option>
                                  <option value="REJECTED">ไม่ผ่าน (ไม่อนุมัติ)</option>
                                </select>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-5 py-4 text-right">
                            <Link
                              to={`/clubs/${clubId}/applications/${application.id}`}
                              className="font-semibold text-tu-maroon underline-offset-4 hover:underline"
                            >
                              ดูใบสมัคร
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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

      {activeRound && (
        <PublishResultsModal
          open={publishModalOpen}
          round={activeRound}
          acceptedCount={acceptedCount}
          rejectedCount={rejectedCount}
          undecidedCount={undecidedCount}
          onClose={() => setPublishModalOpen(false)}
          onPublished={(published) => {
            setRounds((prev) =>
              prev.map((item) =>
                item.id === published.roundId
                  ? {
                      ...item,
                      resultsPublishedAt: published.resultsPublishedAt,
                      version: published.roundVersion,
                    }
                  : item,
              ),
            );
            setBatchFeedback({
              type: 'success',
              text: `ประกาศผลการคัดเลือกเรียบร้อยแล้ว (ผ่าน ${published.acceptedCount} คน, ไม่ผ่าน ${published.rejectedCount} คน)`,
            });
            reload();
          }}
        />
      )}
    </CommitteeLayout>
  );
}