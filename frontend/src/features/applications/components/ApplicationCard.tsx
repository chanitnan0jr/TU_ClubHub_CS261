import { Link } from 'react-router';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Send,
  X,
} from 'lucide-react';
import { StatusPill } from '../../../components/ui/StatusBadge';
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
    className: 'border-[#F2DDA4] bg-[#FFF8DF] text-[#9A5B04]',
    dot: 'bg-[#D97706]',
  },
  ACCEPTED_PENDING_CONFIRMATION: {
    defaultLabel: 'ผ่านการคัดเลือก (รอยืนยันสิทธิ์)',
    className: 'border-[#B6E6CA] bg-[#ECFDF3] text-[#146C3B]',
    dot: 'bg-[#16A34A]',
  },
  REJECTED: {
    defaultLabel: 'ไม่ผ่านการคัดเลือก',
    className: 'border-[#F3C5CA] bg-[#FEF2F2] text-[#9F1239]',
    dot: 'bg-[#E11D48]',
  },
  CONFIRMED: {
    defaultLabel: 'ยืนยันสิทธิ์แล้ว',
    className: 'border-[#BFD6FB] bg-[#EFF6FF] text-[#1E40AF]',
    dot: 'bg-[#2563EB]',
  },
  DECLINED: {
    defaultLabel: 'สละสิทธิ์',
    className: 'border-[#E5DDD2] bg-[#F5EFE8] text-[#59545B]',
    dot: 'bg-[#706B70]',
  },
  EXPIRED: {
    defaultLabel: 'สละสิทธิ์ (หมดเวลาตอบรับ)',
    className: 'border-[#E5DDD2] bg-[#F5EFE8] text-[#59545B]',
    dot: 'bg-[#706B70]',
  },
  WITHDRAWN: {
    defaultLabel: 'ถอนใบสมัครแล้ว',
    className: 'border-[#E5DDD2] bg-[#F5EFE8] text-[#59545B]',
    dot: 'bg-[#706B70]',
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
    <StatusPill
      label={label?.trim() || style.defaultLabel}
      className={style.className}
      dot={style.dot}
      variant="border"
    />
  );
}

type BannerTone = 'amber' | 'emerald' | 'rose' | 'blue' | 'slate';

const BANNER_TONES: Record<BannerTone, string> = {
  amber: 'border-[#F2DDA4] bg-[#FFFBEB] text-[#784805]',
  emerald: 'border-[#B6E6CA] bg-[#ECFDF3] text-[#14532D]',
  rose: 'border-[#F3C5CA] bg-[#FFF1F2] text-[#881337]',
  blue: 'border-[#BFD6FB] bg-[#EFF6FF] text-[#1E3A8A]',
  slate: 'border-[#EAE2D8] bg-[#FAF7F3] text-[#59545B]',
};

function statusBanner(
  status: ApplicantVisibleStatus,
  deadlineText: string,
  respondedText: string,
) {
  switch (status) {
    case 'SUBMITTED':
      return {
        tone: 'amber' as const,
        title: 'ใบสมัครของคุณอยู่ระหว่างการพิจารณาของคณะกรรมการชมรม',
        sub: 'ระบบจะแจ้งผลการคัดเลือกให้คุณทราบทางอีเมลและในหน้านี้ เมื่อมีการอัปเดตสถานะ',
      };
    case 'ACCEPTED_PENDING_CONFIRMATION':
      return {
        tone: 'emerald' as const,
        title: 'ยินดีด้วย! คุณผ่านการคัดเลือกเข้าเป็นสมาชิกชมรม',
        sub: deadlineText
          ? `กำหนดยืนยันสิทธิ์ภายใน: ${deadlineText}`
          : 'กรุณาเปิดดูรายละเอียดเพื่อยืนยันสิทธิ์ภายในเวลาที่กำหนด',
      };
    case 'REJECTED':
      return {
        tone: 'rose' as const,
        title: 'ขอขอบคุณที่ให้ความสนใจสมัครเข้าร่วมชมรมในรอบนี้',
      };
    case 'CONFIRMED':
      return {
        tone: 'blue' as const,
        title: 'คุณได้ยืนยันสิทธิ์เข้าร่วมเป็นสมาชิกชมรมนี้แล้ว',
        sub: respondedText ? `ยืนยันสิทธิ์เมื่อ: ${respondedText}` : '',
      };
    case 'EXPIRED':
    case 'WITHDRAWN':
    case 'DECLINED':
      return {
        tone: 'slate' as const,
        title:
          status === 'EXPIRED'
            ? 'หมดเวลาการยืนยันสิทธิ์ภายในกำหนด ระบบจึงบันทึกการสละสิทธิ์อัตโนมัติ'
            : status === 'WITHDRAWN'
              ? 'คุณได้ถอนใบสมัครในรอบนี้แล้ว'
              : 'คุณได้แจ้งสละสิทธิ์การเข้าเป็นสมาชิกชมรมในรอบนี้แล้ว',
        sub: respondedText ? `ดำเนินการเมื่อ: ${respondedText}` : '',
      };
  }
}

type StepState = 'done' | 'current' | 'pending' | 'rejected' | 'stopped';

interface ProgressStep {
  label: string;
  sub?: string;
  state: StepState;
}

const STEP_NODE_STYLES: Record<StepState, string> = {
  done: 'border-[#861638] bg-[#861638] text-white',
  current: 'border-2 border-[#D97706] bg-[#FFFBEB] text-[#D97706] shadow-[0_0_0_4px_rgba(217,119,6,0.12)]',
  pending: 'border border-[#D8CEC2] bg-white text-[#9A918B]',
  rejected: 'border-[#E11D48] bg-[#E11D48] text-white',
  stopped: 'border-[#8C837C] bg-[#8C837C] text-white',
};

const STEP_LABEL_STYLES: Record<StepState, string> = {
  done: 'font-bold text-[#25202A]',
  current: 'font-bold text-[#861638]',
  pending: 'font-medium text-[#706B70]',
  rejected: 'font-bold text-[#9F1239]',
  stopped: 'font-semibold text-[#59545B]',
};

function buildProgressSteps(
  status: ApplicantVisibleStatus,
  submittedText: string,
  publishedText: string,
  respondedText: string,
): ProgressStep[] {
  const decided = status !== 'SUBMITTED' && status !== 'WITHDRAWN';

  const step2: ProgressStep =
    status === 'SUBMITTED'
      ? { label: 'อยู่ระหว่างการพิจารณา', state: 'current' }
      : status === 'WITHDRAWN'
        ? { label: 'ถอนใบสมัครแล้ว', sub: respondedText, state: 'stopped' }
        : { label: 'พิจารณาใบสมัครแล้ว', state: 'done' };

  const step3: ProgressStep =
    status === 'REJECTED'
      ? { label: 'ประกาศผลการคัดเลือก', sub: publishedText, state: 'rejected' }
      : decided
        ? { label: 'ประกาศผลการคัดเลือก', sub: publishedText, state: 'done' }
        : { label: 'ประกาศผลการคัดเลือก', state: 'pending' };

  const step4: ProgressStep =
    status === 'CONFIRMED'
      ? { label: 'ยืนยันสิทธิ์', sub: respondedText, state: 'done' }
      : status === 'DECLINED' || status === 'EXPIRED'
        ? {
            label: status === 'EXPIRED' ? 'หมดเวลายืนยัน' : 'สละสิทธิ์แล้ว',
            sub: respondedText,
            state: 'stopped',
          }
        : status === 'ACCEPTED_PENDING_CONFIRMATION'
          ? { label: 'ยืนยันสิทธิ์', sub: 'รอดำเนินการ', state: 'current' }
          : { label: 'ยืนยันสิทธิ์', state: 'pending' };

  return [
    { label: 'ส่งใบสมัครแล้ว', sub: submittedText, state: 'done' },
    step2,
    step3,
    step4,
  ];
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5" />;
  if (state === 'current') return <Clock aria-hidden="true" strokeWidth={2.25} className="size-3.5" />;
  if (state === 'rejected' || state === 'stopped') {
    return <X aria-hidden="true" strokeWidth={2.5} className="size-3.5" />;
  }
  return null;
}

export function ApplicationProgressStepper({
  status,
  submittedText,
  publishedText = '',
  respondedText = '',
  className = '',
}: {
  status: ApplicantVisibleStatus;
  submittedText: string;
  publishedText?: string;
  respondedText?: string;
  className?: string;
}) {
  const steps = buildProgressSteps(
    status,
    submittedText,
    publishedText,
    respondedText,
  );
  return (
    <div
      aria-label="ความคืบหน้าสถานะใบสมัคร"
      className={`rounded-xl border border-[#EFE9E1] bg-[#FAF7F3]/90 px-4 py-3.5 sm:px-6 ${className}`}
    >
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
        {steps.map((step, index) => {
          const isDoneBefore = index > 0 && steps[index - 1].state === 'done';
          const isDoneAfter =
            step.state === 'done' &&
            index < steps.length - 1 &&
            steps[index + 1].state !== 'pending';
          return (
            <li
              key={step.label}
              className="relative flex flex-col items-start sm:items-center sm:text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute left-0 right-1/2 top-3 -z-0 h-[2px] -translate-y-1/2 ${
                    isDoneBefore ? 'bg-[#861638]' : 'bg-[#E5DDD2]'
                  }`}
                />
              )}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute left-1/2 right-0 top-3 -z-0 h-[2px] -translate-y-1/2 ${
                    isDoneAfter ? 'bg-[#861638]' : 'bg-[#E5DDD2]'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 flex size-6 items-center justify-center rounded-full ${STEP_NODE_STYLES[step.state]}`}
              >
                <StepIcon state={step.state} />
              </span>
              <span className={`mt-2 text-xs leading-snug ${STEP_LABEL_STYLES[step.state]}`}>
                {step.label}
              </span>
              {step.sub && (
                <span className="mt-0.5 text-[11px] leading-tight text-[#706B70]">
                  {step.sub}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
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
  const publishedText = round.resultsPublishedAt
    ? formatThaiDateTime(round.resultsPublishedAt)
    : '';
  const deadlineText = round.confirmationDeadline
    ? formatThaiDateTime(round.confirmationDeadline)
    : '';
  const respondedText = application.respondedAt
    ? formatThaiDateTime(application.respondedAt)
    : '';
  const banner = statusBanner(
    applicantVisibleStatus,
    deadlineText,
    respondedText,
  );
  const semesterLabel =
    round.semester === 3 ? 'ภาคฤดูร้อน' : `ภาคเรียนที่ ${round.semester}`;

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-[0_2px_10px_-4px_rgba(37,32,42,0.06)] transition hover:shadow-[0_6px_18px_-6px_rgba(37,32,42,0.1)] sm:p-6 ${
        applicantVisibleStatus === 'ACCEPTED_PENDING_CONFIRMATION'
          ? 'border-[#86EFAC]'
          : 'border-[#EAE2D8]'
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-[#EAE2D8] bg-[#F5EFE8] sm:w-44 md:w-48">
          <ClubLogo src={club.imageUrl} clubName={club.name} iconClassName="size-8" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id={headingId}
                className="truncate text-lg font-extrabold tracking-tight text-[#25202A] sm:text-xl"
              >
                {club.name}
              </h2>
              <p className="mt-0.5 text-sm font-medium text-[#59545B]">{round.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#706B70]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-[#8A827A]" />
                  <span>
                    ปีการศึกษา {round.academicYear} {semesterLabel}
                  </span>
                </span>
                {submittedText && (
                  <span className="inline-flex items-center gap-1.5">
                    <Send aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-[#8A827A]" />
                    <span>ส่งใบสมัครเมื่อ {submittedText}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <ApplicationStatusBadge
                status={applicantVisibleStatus}
                label={displayStatusLabel}
              />
            </div>
          </div>

          <ApplicationProgressStepper
            status={applicantVisibleStatus}
            submittedText={submittedText}
            publishedText={publishedText}
            respondedText={respondedText}
            className="mt-4"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#F2ECE4] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className={`flex flex-1 items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm ${BANNER_TONES[banner.tone]}`}
        >
          {banner.tone === 'emerald' || banner.tone === 'blue' ? (
            <CheckCircle2 aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          ) : banner.tone === 'rose' ? (
            <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Info aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{banner.title}</p>
            {banner.sub && <p className="mt-0.5 text-xs opacity-85">{banner.sub}</p>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
          <Link
            to={`/clubs/${encodeURIComponent(club.id)}`}
            aria-label={`ดูหน้าชมรม ${club.name}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DFD6CB] bg-white px-4 py-2 text-sm font-semibold text-[#25202A] transition hover:border-[#C5B9AB] hover:bg-[#FAF6F1]"
          >
            <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4 text-[#59545B]" />
            <span>ดูหน้าชมรม</span>
          </Link>
          <Link
            to={`/me/applications/${encodeURIComponent(application.id)}`}
            aria-label={`ดูรายละเอียดใบสมัคร ${club.name}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#861638] px-4 py-2 text-sm font-semibold text-white shadow-2xs transition hover:bg-[#6E112D]"
          >
            <FileText aria-hidden="true" strokeWidth={1.75} className="size-4" />
            <span>ดูรายละเอียดใบสมัคร</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
