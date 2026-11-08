import React, { useState } from 'react';
import { inputClass } from '../../../components/ui/classes';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Field } from '../../../components/ui/Field';
import type { ScreeningQuestionDraft } from '../api/questionApi';

interface AddQuestionModalProps {
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (draft: ScreeningQuestionDraft) => void;
}

// Mount this only while it is open so each opening starts with an empty form.
export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isSaving = false,
  onClose,
  onConfirm,
}) => {
  const [text, setText] = useState('');
  const [isRequired, setIsRequired] = useState(true);

  const trimmed = text.trim();

  return (
    <ConfirmDialog
      open
      title="เพิ่มคำถามคัดเลือก"
      description="คำถามใหม่จะอยู่ท้ายรายการ"
      confirmLabel={isSaving ? 'กำลังบันทึก...' : 'เพิ่มคำถาม'}
      busy={isSaving}
      confirmDisabled={!trimmed}
      onConfirm={() => onConfirm({ questionText: trimmed, isRequired })}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-3">
        <Field id="add-question-text" label="ข้อความคำถาม">
          {(control) => (
            <input
              {...control}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="กรอกข้อความคำถามคัดเลือก..."
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
