import React from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface GuestLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
  roundTitle?: string;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  roundTitle,
}) => (
  <ConfirmDialog
    open={isOpen}
    title="เข้าสู่ระบบก่อนสมัครชมรม"
    description="กรุณาเข้าสู่ระบบผ่าน TU Authentication ด้วยบัญชีนักศึกษามหาวิทยาลัยธรรมศาสตร์เพื่อสมัครเข้าร่วมชมรม"
    confirmLabel="เข้าสู่ระบบด้วยบัญชี TU"
    onConfirm={() => onLogin?.()}
    onCancel={onClose}
  >
    {roundTitle && (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <span className="block text-xs text-slate-600">รอบที่คุณกำลังสมัคร</span>
        <span className="font-semibold text-slate-900">{roundTitle}</span>
      </div>
    )}
  </ConfirmDialog>
);
