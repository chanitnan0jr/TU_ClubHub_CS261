import React, { useState } from 'react';
import { inputClass } from '../../../components/ui/classes';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Field } from '../../../components/ui/Field';
import type { ScreeningQuestionDraft } from '../api/questionApi';

interface EditQuestionModalProps {
  isOpen: boolean;
  // Unknown until the API reports applicants for a round, so the warning is optional.
  applicantCount?: number;
  originalQuestion: string;
  originalRequired: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (draft: ScreeningQuestionDraft) => void;
}

// เปิด modal ด้วย key ของคำถามเสมอ เพื่อให้ state เริ่มจากคำถามที่เลือก
export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  applicantCount = 0,
  originalQuestion,
  originalRequired,
  isSaving = false,
  onClose,
  onConfirm,
}) => {
  const [newText, setNewText] = useState(originalQuestion);
  const [isRequired, setIsRequired] = useState(originalRequired);

  const trimmed = newText.trim();
  const isUnchanged = trimmed === originalQuestion && isRequired === originalRequired;

  return (
    <ConfirmDialog
      open={isOpen}
      title="ยืนยันการแก้ไขคำถามคัดเลือก?"
      description="การแก้ไขข้อความคำถามอาจทำให้คำตอบที่ผู้สมัครเดิมเคยตอบไว้ไม่ตรงกับคำถามใหม่ ซึ่งอาจส่งผลกระทบต่อการพิจารณาคัดเลือก"
      confirmLabel={isSaving ? 'กำลังบันทึก...' : 'ยืนยันการแก้ไข'}
      busy={isSaving}
      confirmDisabled={!trimmed || isUnchanged}
      onConfirm={() => onConfirm({ questionText: trimmed, isRequired })}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4">
        {applicantCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span className="mb-1 block font-semibold">ข้อควรระวัง</span>
            รอบรับสมัครนี้มีผู้ยื่นใบสมัครเข้ามาแล้วจำนวน <span className="font-semibold">{applicantCount}</span> รายการ
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-800">คำถามเดิม</span>
          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            {originalQuestion}
          </div>
        </div>

        <Field id="edit-question-text" label="คำถามใหม่ (ที่จะเปลี่ยน)">
          {(control) => (
            <input
              {...control}
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className={inputClass()}
            />
          )}
        </Field>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="size-4 accent-tu-maroon"
          />
          <span>จำเป็นต้องตอบ</span>
        </label>
      </div>
    </ConfirmDialog>
  );
};
