import type { ReactNode } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import type { MembershipDecision } from '../types/application';

interface MembershipDecisionDialogProps {
  decision: MembershipDecision | null;
  clubName: string;
  roundTitle: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY: Record<
  MembershipDecision,
  {
    title: string;
    action: string;
    busyAction: string;
    tone: 'primary' | 'danger';
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

export function MembershipDecisionDialog({
  decision,
  clubName,
  roundTitle,
  busy,
  onCancel,
  onConfirm,
}: MembershipDecisionDialogProps) {
  const copy = COPY[decision ?? 'confirm'];
  return (
    <ConfirmDialog
      open={decision !== null}
      tone={copy.tone}
      title={copy.title}
      confirmLabel={busy ? copy.busyAction : copy.action}
      cancelLabel="ยกเลิก"
      busy={busy}
      confirmDisabled={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-slate-700">
          {copy.prompt(clubName, roundTitle)}
        </p>
        <div
          className={`rounded-lg border p-4 text-sm leading-relaxed ${copy.warningClass}`}
        >
          {copy.warning}
        </div>
      </div>
    </ConfirmDialog>
  );
}
