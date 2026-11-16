import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import CommitteeLayout from '../../../components/layout/CommitteeLayout';
import { Button } from '../../../components/ui/Button';
import { buttonClass, inputClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CircleAlert, ExternalLink } from 'lucide-react';
import { SectionCard } from '../../../components/ui/SectionCard';
import { useApiResource } from '../../../hooks/useApiResource';
import { describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { isValidId } from '../../../lib/ids';
import { isValidHttpsUrl } from '../../../utils/validation';
import NotFoundPage from '../../../pages/NotFoundPage';
import { useAuth } from '../../auth/AuthContext';
import { getRound, type Round } from '../../recruitment/api/roundApi';
import { StatusPill } from '../../../components/ui/StatusBadge';
import { COMMITTEE_APPLICATION_STATUS_PRESENTATION } from '../components/committeeApplicationStatus';
import { PublishResultsModal } from '../components/PublishResultsModal';
import {
  fetchApplicationDecisionSnapshot,
  fetchCommitteeApplicationDetail,
  recordApplicationDecision,
} from '../services/committeeApplicationService';
import type {
  CommitteeApplicationDetail,
  CommitteeEvaluationDetail,
  SelectionDecisionChoice,
} from '../types/application';

export default function CommitteeApplicationDetailPage() {
  const { clubId, applicationId } = useParams();
  if (!isValidId(clubId) || !isValidId(applicationId)) return <NotFoundPage />;
  return <ApplicationDetail key={`${clubId}:${applicationId}`} clubId={clubId} applicationId={applicationId} />;
}

function ApplicantInformation({ application }: { application: CommitteeApplicationDetail }) {
  const details = [
    ['รหัสนักศึกษา', application.applicant.studentCode],
    ['อีเมล', application.applicant.email],
    ['คณะ', application.applicant.facultyName],
    ['ภาควิชา', application.applicant.departmentName],
    ['หลักสูตร', application.applicant.programName],
    ['ชั้นปี', application.applicant.studyYear === null ? null : `ปี ${application.applicant.studyYear}`],
  ] as const;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-600">{label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{value || 'ไม่ระบุ'}</dd>
        </div>
      ))}
    </dl>
  );
}

function ResultPublicationBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
      ประกาศผลแล้ว (Published)
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
      ฉบับร่าง (Draft)
    </span>
  );
}

function ApplicationDetail({ clubId, applicationId }: { clubId: string; applicationId: string }) {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useApiResource(
    `committee-application:${clubId}:${applicationId}`,
    () => fetchCommitteeApplicationDetail(clubId, applicationId),
  );

  const [snapshot, setSnapshot] = useState<CommitteeEvaluationDetail | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [decision, setDecision] = useState<SelectionDecisionChoice | ''>('');
  const [resultMessage, setResultMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  const backLink = `/clubs/${clubId}/applications`;

  const assignment = user?.activeCommitteeAssignments?.find((item) => item.clubId === clubId);
  const isPresident = assignment?.permissionRole === 'PRESIDENT';
  const loadedApplicationId = data?.id;
  const loadedRoundId = data?.roundId;
  const loadedStatus = data?.status;

  useEffect(() => {
    if (!loadedApplicationId || !loadedRoundId) return;
    let cancelled = false;

    const loadDecisionContext = async () => {
      const [decisionResult, roundResult] = await Promise.allSettled([
        fetchApplicationDecisionSnapshot(loadedRoundId, loadedApplicationId),
        getRound(clubId, loadedRoundId),
      ]);
      if (cancelled) return;

      if (decisionResult.status === 'fulfilled') {
        const evalData = decisionResult.value;
        setSnapshot(evalData);
        if (evalData.status === 'ACCEPTED' || evalData.status === 'REJECTED') {
          setDecision(evalData.status);
        }
        setResultMessage(evalData.resultMessage ?? '');
        const myReview = evalData.reviews.find((review) => review.reviewerId === user?.id);
        setInternalNote(myReview?.internalComment ?? '');
      } else if (loadedStatus === 'ACCEPTED' || loadedStatus === 'REJECTED') {
        setDecision(loadedStatus);
      }

      if (roundResult.status === 'fulfilled') {
        setRound(roundResult.value);
      }
    };

    void loadDecisionContext();
    return () => {
      cancelled = true;
    };
  }, [clubId, loadedApplicationId, loadedRoundId, loadedStatus, user?.id]);

  const currentStatus = snapshot?.status ?? data?.status ?? 'SUBMITTED';
  const isResultsPublished = Boolean(round?.resultsPublishedAt || publishSuccessMessage);
  const isLockedStatus = ['CONFIRMED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'].includes(currentStatus);
  const isEvaluationDisabled = isResultsPublished || isLockedStatus || isSaving;

  const handleSaveDecision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;

    if (decision !== 'ACCEPTED' && decision !== 'REJECTED') {
      setSaveError('กรุณาเลือกผลการคัดเลือก (ผ่าน หรือ ไม่ผ่าน)');
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    try {
      const version = snapshot?.version ?? 0;
      const updated = await recordApplicationDecision(data.roundId, data.id, {
        decision,
        resultMessage: resultMessage.trim() ? resultMessage.trim() : null,
        internalNote: internalNote.trim() ? internalNote.trim() : null,
        version,
      });
      setSnapshot(updated);
      setSaveSuccess('บันทึกผลการประเมินและหมายเหตุเรียบร้อยแล้ว (สถานะฉบับร่าง จนกว่าจะกดประกาศผล)');
    } catch (err) {
      setSaveError(
        describeApiError(
          err,
          'ไม่สามารถบันทึกผลการประเมินได้ กรุณาตรวจสอบว่ารอบรับสมัครปิดรับแล้วและยังไม่ประกาศผล',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CommitteeLayout
      clubId={clubId}
      title="รายละเอียดใบสมัคร"
      description="ตรวจข้อมูล คำตอบ และเอกสารประกอบการสมัคร"
      breadcrumbs={[
        { label: 'ตรวจสอบใบสมัคร', to: backLink },
        { label: 'รายละเอียดใบสมัคร' },
      ]}
      actions={
        <Link to={backLink} className={buttonClass('secondary')}>
          กลับไปหน้ารายชื่อ
        </Link>
      }
    >
      {isLoading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          กำลังโหลดรายละเอียดใบสมัคร...
        </div>
      ) : !data ? (
        <EmptyState
          icon={<CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-6 shrink-0" />}
          title="โหลดรายละเอียดใบสมัครไม่สำเร็จ"
          description={describeApiError(error, 'ไม่สามารถโหลดรายละเอียดใบสมัครได้ กรุณาลองใหม่อีกครั้ง')}
          action={<Button variant="primary" onClick={reload}>ลองใหม่</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <SectionCard
            title="ข้อมูลใบสมัคร"
            description={`เลขที่ใบสมัคร ${data.id} · รอบรับสมัครรหัส ${data.roundId}${round ? ` (${round.title})` : ''}`}
            actions={<StatusPill {...COMMITTEE_APPLICATION_STATUS_PRESENTATION[currentStatus]} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-600">ชื่อผู้สมัคร</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{data.applicant.displayName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">วันที่สมัคร</p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatThaiDateTime(data.submittedAt) || 'ไม่ระบุวันที่'}
                </p>
              </div>
            </div>
            <ApplicantInformation application={data} />
          </SectionCard>

          <SectionCard title="เหตุผลที่สมัคร">
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
              {data.motivation || 'ผู้สมัครไม่ได้ระบุเหตุผลในการสมัคร'}
            </p>
          </SectionCard>

          <SectionCard title="คำตอบเพิ่มเติม">
            {data.questionsWithAnswers.length === 0 ? (
              <p className="text-sm text-slate-600">รอบรับสมัครนี้ไม่มีคำถามเพิ่มเติม</p>
            ) : (
              <ol className="flex flex-col gap-5">
                {data.questionsWithAnswers.map((item, index) => (
                  <li key={item.questionId} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold leading-6 text-slate-900">
                      {index + 1}. {item.questionText}
                      {item.isRequired && <span className="ml-1 text-red-700" aria-label="จำเป็น">*</span>}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {item.answerText?.trim() || 'ไม่ได้ระบุคำตอบ'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="เอกสารและผลงานประกอบ">
            {data.links.length === 0 ? (
              <p className="text-sm text-slate-600">ผู้สมัครไม่ได้แนบลิงก์เอกสารหรือผลงาน</p>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {data.links.map((link) => (
                    <li
                      key={link.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-slate-900">{link.label}</p>
                        {isValidHttpsUrl(link.url) ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm text-tu-maroon underline-offset-4 hover:underline"
                          >
                            {link.url}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-red-700">ลิงก์นี้ไม่สามารถเปิดได้อย่างปลอดภัย</p>
                        )}
                      </div>
                      {isValidHttpsUrl(link.url) && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${buttonClass('secondary')} shrink-0`}
                        >
                          <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
                          ดู / ดาวน์โหลด
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-5 text-slate-600">
                  เอกสารจะเปิดจากเว็บไซต์ต้นทาง การดาวน์โหลดขึ้นอยู่กับบริการของเว็บไซต์นั้น
                </p>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="ประเมินผลและบันทึกผลการคัดเลือก"
            description="เลือกผลการคัดเลือกและระบุหมายเหตุ ระบบจะเก็บเป็นฉบับร่างจนกว่าประธานชมรมจะกดประกาศผลการคัดเลือก"
            actions={<ResultPublicationBadge isPublished={isResultsPublished} />}
          >
            <form onSubmit={(event) => void handleSaveDecision(event)} className="flex flex-col gap-5">
              <div>
                <span id="decision-choice-label" className="mb-2 block text-sm font-medium text-slate-800">
                  ผลการคัดเลือก <span className="text-red-700">*</span>
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="decision-choice-label"
                  className="flex flex-wrap gap-3"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={decision === 'ACCEPTED'}
                    disabled={isEvaluationDisabled}
                    onClick={() => setDecision('ACCEPTED')}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      decision === 'ACCEPTED'
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    ผ่านการคัดเลือก (อนุมัติ)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={decision === 'REJECTED'}
                    disabled={isEvaluationDisabled}
                    onClick={() => setDecision('REJECTED')}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      decision === 'REJECTED'
                        ? 'border-rose-700 bg-rose-700 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    ไม่ผ่านการคัดเลือก (ไม่อนุมัติ)
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  หมายเหตุ: ระบบรองรับสถานะ ผ่าน (ACCEPTED) และ ไม่ผ่าน (REJECTED) ตามมาตรฐาน API ของรอบรับสมัคร
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="result-message-input" className="mb-1.5 block text-sm font-medium text-slate-800">
                    ข้อความแจ้งผู้สมัคร (แสดงหลังประกาศผล)
                  </label>
                  <textarea
                    id="result-message-input"
                    rows={3}
                    maxLength={1000}
                    disabled={isEvaluationDisabled}
                    value={resultMessage}
                    onChange={(event) => setResultMessage(event.target.value)}
                    placeholder="เช่น ยินดีต้อนรับสู่ชมรม กรุณายืนยันสิทธิ์ภายในกำหนด..."
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label htmlFor="internal-note-input" className="mb-1.5 block text-sm font-medium text-slate-800">
                    หมายเหตุภายในกรรมการ (ผู้สมัครไม่เห็น)
                  </label>
                  <textarea
                    id="internal-note-input"
                    rows={3}
                    maxLength={2000}
                    disabled={isEvaluationDisabled}
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                    placeholder="บันทึกความเห็นหรือคะแนนประเมินสำหรับคณะกรรมการ..."
                    className={inputClass()}
                  />
                </div>
              </div>

              {saveError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {saveError}
                </p>
              )}

              {saveSuccess && (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {saveSuccess}
                </p>
              )}

              {publishSuccessMessage && (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {publishSuccessMessage}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button type="submit" variant="primary" disabled={isEvaluationDisabled || !decision}>
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกผลการประเมิน'}
                </Button>

                {isPresident && round && !isResultsPublished && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPublishModalOpen(true)}
                  >
                    ประกาศผลการคัดเลือก
                  </Button>
                )}
              </div>
            </form>

            {snapshot && snapshot.reviews.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">บันทึกความเห็นกรรมการ ({snapshot.reviews.length})</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {snapshot.reviews.map((review) => (
                    <li key={review.id} className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{review.reviewerDisplayName}</span>
                        <span className="text-xs text-slate-500">
                          {formatThaiDateTime(review.updatedAt)}
                        </span>
                      </div>
                      {review.internalComment && (
                        <p className="mt-1 whitespace-pre-wrap text-slate-700">{review.internalComment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          {round && (
            <PublishResultsModal
              open={publishModalOpen}
              round={round}
              onClose={() => setPublishModalOpen(false)}
              onPublished={(published) => {
                setRound((prev) =>
                  prev
                    ? {
                        ...prev,
                        resultsPublishedAt: published.resultsPublishedAt,
                        version: published.roundVersion,
                      }
                    : prev,
                );
                setPublishSuccessMessage(
                  `ประกาศผลการคัดเลือกเรียบร้อยแล้ว (ผ่าน ${published.acceptedCount} คน, ไม่ผ่าน ${published.rejectedCount} คน)`,
                );
                reload();
              }}
            />
          )}
        </div>
      )}
    </CommitteeLayout>
  );
}