import { Link } from 'react-router';
import { buttonClass } from '../../../components/ui/classes';
import { formatThaiDateTime } from '../../../lib/format';
import { ClubLogo } from '../../clubs/components/ClubLogo';
import type {
  ApplicantApplicationSummary,
  ApplicantVisibleStatus,
} from '../types/application';

const badgeStyles: Record<
  ApplicantVisibleStatus,
  { defaultLabel: string; className: string; dot: string }
> = {
  SUBMITTED: {
    defaultLabel: 'รอพิจารณา',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  ACCEPTED_PENDING_CONFIRMATION: {
    defaultLabel: 'ผ่านการคัดเลือก (รอยืนยันสิทธิ์)',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    defaultLabel: 'ไม่ผ่านการคัดเลือก',
    className: 'bg-red-50 text-red-800 ring-red-200',
    dot: 'bg-red-500',
  },
  CONFIRMED: {
    defaultLabel: 'ยืนยันสิทธิ์แล้ว',
    className: 'bg-blue-50 text-blue-800 ring-blue-200',
    dot: 'bg-blue-500',
  },
  DECLINED: {
    defaultLabel: 'สละสิทธิ์',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
  },
  EXPIRED: {
    defaultLabel: 'สละสิทธิ์ (หมดเวลาตอบรับ)',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
  },
  WITHDRAWN: {
    defaultLabel: 'ถอนใบสมัครแล้ว',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
  },
};

export function ApplicationStatusBadge({
  status,
  label,
}: {
  status: ApplicantVisibleStatus;
  label?: string;
}) {
  const style = badgeStyles[status] ?? badgeStyles.SUBMITTED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style.className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
      {label?.trim() || style.defaultLabel}
    </span>
  );
}

export function ApplicationCard({
  application,
}: {
  application: ApplicantApplicationSummary;
}) {
  const { club, round, applicantVisibleStatus, displayStatusLabel } = application;
  const headingId = `application-card-${application.id}`;
  const submittedText = formatThaiDateTime(application.submittedAt);
  const deadlineText = round.confirmationDeadline
    ? formatThaiDateTime(round.confirmationDeadline)
    : '';
  const respondedText = application.respondedAt
    ? formatThaiDateTime(application.respondedAt)
    : '';
  const isAcceptedPending =
    applicantVisibleStatus === 'ACCEPTED_PENDING_CONFIRMATION';

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-xs sm:p-6 ${
        isAcceptedPending ? 'border-emerald-300' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="size-12 shrink-0">
            <ClubLogo src={club.imageUrl} clubName={club.name} iconClassName="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {club.name}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-700">{round.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              ปีการศึกษา {round.academicYear} ภาคเรียนที่ {round.semester}
              {submittedText ? ` · ส่งใบสมัครเมื่อ ${submittedText}` : ''}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ApplicationStatusBadge
            status={applicantVisibleStatus}
            label={displayStatusLabel}
          />
        </div>
      </div>

      {applicantVisibleStatus === 'SUBMITTED' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            ใบสมัครของคุณอยู่ระหว่างการพิจารณาของคณะกรรมการชมรม
          </p>
        </div>
      )}

      {applicantVisibleStatus === 'ACCEPTED_PENDING_CONFIRMATION' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">
            ยินดีด้วย! คุณผ่านการคัดเลือกเข้าเป็นสมาชิกชมรม
          </p>
          {deadlineText && (
            <p className="mt-1 text-xs font-medium text-emerald-800">
              กำหนดยืนยันสิทธิ์ภายใน: {deadlineText}
            </p>
          )}
        </div>
      )}

      {applicantVisibleStatus === 'REJECTED' && (
        <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">
            ขอขอบคุณที่ให้ความสนใจสมัครเข้าร่วมชมรมในรอบนี้
          </p>
        </div>
      )}

      {applicantVisibleStatus === 'CONFIRMED' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-950">
          <p className="font-medium">คุณได้ยืนยันสิทธิ์เข้าร่วมเป็นสมาชิกชมรมนี้แล้ว</p>
          {respondedText && (
            <p className="mt-1 text-xs text-blue-800">ยืนยันสิทธิ์เมื่อ: {respondedText}</p>
          )}
        </div>
      )}

      {(applicantVisibleStatus === 'DECLINED' ||
        applicantVisibleStatus === 'EXPIRED' ||
        applicantVisibleStatus === 'WITHDRAWN') && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium">
            {applicantVisibleStatus === 'EXPIRED'
              ? 'หมดเวลาการยืนยันสิทธิ์ภายในกำหนด ระบบจึงบันทึกการสละสิทธิ์อัตโนมัติ'
              : applicantVisibleStatus === 'WITHDRAWN'
                ? 'คุณได้ถอนใบสมัครในรอบนี้แล้ว'
                : 'คุณได้แจ้งสละสิทธิ์การเข้าเป็นสมาชิกชมรมในรอบนี้แล้ว'}
          </p>
          {respondedText && (
            <p className="mt-1 text-xs text-slate-500">ดำเนินการเมื่อ: {respondedText}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <Link
          to={`/clubs/${encodeURIComponent(club.id)}`}
          aria-label={`ดูหน้าชมรม ${club.name}`}
          className={buttonClass('ghost')}
        >
          ดูหน้าชมรม
        </Link>
        <Link
          to={`/me/applications/${encodeURIComponent(application.id)}`}
          aria-label={`ดูรายละเอียดใบสมัคร ${club.name}`}
          className={buttonClass('secondary')}
        >
          ดูรายละเอียดใบสมัคร
        </Link>
      </div>
    </article>
  );
}
