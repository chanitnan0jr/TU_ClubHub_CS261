import { Link, useParams } from 'react-router';
import CommitteeLayout from '../../../components/layout/CommitteeLayout';
import { Button } from '../../../components/ui/Button';
import { buttonClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CircleAlertIcon, ExternalLinkIcon } from '../../../components/ui/icons';
import { SectionCard } from '../../../components/ui/SectionCard';
import { useApiResource } from '../../../hooks/useApiResource';
import { describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { isValidId } from '../../../lib/ids';
import NotFoundPage from '../../../pages/NotFoundPage';
import { CommitteeApplicationStatusBadge } from '../components/CommitteeApplicationStatusBadge';
import { fetchCommitteeApplicationDetail } from '../services/committeeApplicationService';
import type { CommitteeApplicationDetail } from '../types/application';

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

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function ApplicationDetail({ clubId, applicationId }: { clubId: string; applicationId: string }) {
  const { data, error, isLoading, reload } = useApiResource(
    `committee-application:${clubId}:${applicationId}`,
    () => fetchCommitteeApplicationDetail(clubId, applicationId),
  );
  const backLink = `/clubs/${clubId}/applications`;

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
          icon={<CircleAlertIcon className="size-6" />}
          title="โหลดรายละเอียดใบสมัครไม่สำเร็จ"
          description={describeApiError(error, 'ไม่สามารถโหลดรายละเอียดใบสมัครได้ กรุณาลองใหม่อีกครั้ง')}
          action={<Button variant="primary" onClick={reload}>ลองใหม่</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <SectionCard
            title="ข้อมูลใบสมัคร"
            description={`เลขที่ใบสมัคร ${data.id} · รอบรับสมัครรหัส ${data.roundId}`}
            actions={<CommitteeApplicationStatusBadge status={data.status} />}
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
                        {isHttpsUrl(link.url) ? (
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
                      {isHttpsUrl(link.url) && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${buttonClass('secondary')} shrink-0`}
                        >
                          <ExternalLinkIcon className="size-4" />
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

          <SectionCard title="ผลการพิจารณา">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">
                อนุมัติ
              </Button>
              <Button variant="danger">
                ไม่อนุมัติ
              </Button>
            </div>
            <p role="note" className="text-sm leading-6 text-slate-600">
              การเปิดดูใบสมัครเป็นการอ่านข้อมูลเท่านั้น จึงไม่มีการเปลี่ยนสถานะใบสมัคร
            </p>
          </SectionCard>
        </div>
      )}
    </CommitteeLayout>
  );
}
