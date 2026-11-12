import React from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface ConfirmMembershipDialogProps {
  isOpen: boolean;
  roundTitle?: string;
  clubName?: string;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmMembershipDialog: React.FC<ConfirmMembershipDialogProps> = ({
  isOpen,
  roundTitle,
  clubName,
  isConfirming,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmDialog
      open={isOpen}
      title="ยืนยันการเข้าร่วมเป็นสมาชิกชมรม"
      confirmLabel={isConfirming ? 'กำลังยืนยัน...' : 'ยืนยันสิทธิ์'}
      cancelLabel="ยกเลิก"
      busy={isConfirming}
      confirmDisabled={isConfirming}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-slate-700">
          คุณต้องการยืนยันสิทธิ์เข้าร่วม <strong>{clubName}</strong> ในรอบ{' '}
          <strong>{roundTitle}</strong> ใช่หรือไม่?
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          เมื่อกดยืนยันสิทธิ์แล้ว ระบบจะขึ้นทะเบียนคุณเป็นสมาชิกชมรมทันที
          และไม่สามารถยกเลิกหรือเปลี่ยนแปลงการตัดสินใจในภายหลังได้
          (นักศึกษาสามารถเป็นสมาชิกชมรมได้สูงสุดไม่เกิน 5 ชมรม)
        </div>
      </div>
    </ConfirmDialog>
  );
};

interface DeclineMembershipDialogProps {
  isOpen: boolean;
  clubName?: string;
  isDeclining: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeclineMembershipDialog: React.FC<DeclineMembershipDialogProps> = ({
  isOpen,
  clubName,
  isDeclining,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmDialog
      open={isOpen}
      tone="danger"
      title="ยืนยันการสละสิทธิ์เข้าชมรม"
      confirmLabel={isDeclining ? 'กำลังสละสิทธิ์...' : 'ยืนยันสละสิทธิ์'}
      cancelLabel="ยกเลิก"
      busy={isDeclining}
      confirmDisabled={isDeclining}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-slate-700">
          คุณต้องการสละสิทธิ์การเข้าร่วม <strong>{clubName}</strong> ใช่หรือไม่?
        </p>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
          หากคุณกดสละสิทธิ์
          สิทธิ์การเข้าเป็นสมาชิกชมรมในรอบนี้จะสิ้นสุดลงทันที
          และไม่สามารถขอกลับมายืนยันสิทธิ์ในภายหลังได้
        </div>
      </div>
    </ConfirmDialog>
  );
};