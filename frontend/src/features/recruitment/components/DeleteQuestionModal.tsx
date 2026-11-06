import React, { useState } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface DeleteQuestionModalProps {
  isOpen: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

// เปิด modal ด้วย key ของคำถามเสมอ เพื่อให้ช่องติ๊กยืนยันเริ่มต้นเป็นว่าง
export const DeleteQuestionModal: React.FC<DeleteQuestionModalProps> = ({
  isOpen,
  isDeleting = false,
  onClose,
  onConfirmDelete,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <ConfirmDialog
      open={isOpen}
      tone="danger"
      title="ยืนยันการลบคำถามคัดเลือก?"
      description="ลบได้เฉพาะคำถามที่ยังไม่มีคำตอบในรอบฉบับร่างที่ยังไม่ปิด โดยข้อมูลคำตอบและตำแหน่งของข้อที่มีคำตอบแล้วจะคงเดิม คุณต้องการดำเนินการต่อหรือไม่?"
      confirmLabel={isDeleting ? 'กำลังลบ...' : 'ยืนยันลบคำถาม'}
      busy={isDeleting}
      confirmDisabled={!isChecked}
      onConfirm={onConfirmDelete}
      onCancel={onClose}
    >
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          className="mt-0.5 size-4 accent-red-700"
        />
        <span className="text-sm font-medium text-slate-800">
          ข้าพเจ้ายืนยันว่าต้องการลบคำถามนี้
        </span>
      </label>
    </ConfirmDialog>
  );
};
