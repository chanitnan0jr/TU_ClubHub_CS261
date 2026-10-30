import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-5">
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900">เพิ่มคำถามคัดเลือก</h3>
          <p className="text-xs text-slate-500 mt-1">คำถามใหม่จะอยู่ท้ายรายการ</p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="add-question-text"
              className="block text-xs font-semibold text-slate-500 mb-1"
            >
              ข้อความคำถาม
            </label>
            <input
              id="add-question-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="กรอกข้อความคำถามคัดเลือก..."
              className="w-full rounded-lg border-2 border-rose-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-slate-400 text-rose-600 focus:ring-rose-500"
            />
            <span>จำเป็นต้องตอบ</span>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full sm:w-auto px-6 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!trimmed || isSaving}
            onClick={() => onConfirm({ questionText: trimmed, isRequired })}
            className="h-11 w-full sm:w-auto px-6 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'กำลังบันทึก...' : 'เพิ่มคำถาม'}
          </button>
        </div>
      </div>
    </div>
  );
};
