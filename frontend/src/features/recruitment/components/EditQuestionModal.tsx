import React, { useState } from 'react';

interface EditQuestionModalProps {
  isOpen: boolean;
  applicantCount: number;
  originalQuestion: string;
  onClose: () => void;
  onConfirm: (newQuestionText: string) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  applicantCount,
  originalQuestion,
  onClose,
  onConfirm,
}) => {
  const [newText, setNewText] = useState(originalQuestion);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl font-bold">
          ⚠️
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900">ยืนยันการแก้ไขคำถามคัดเลือก?</h3>
        </div>

        {applicantCount > 0 && (
          <div className="rounded-xl bg-orange-50 p-4 text-xs sm:text-sm text-orange-800 border border-orange-200">
            <span className="font-bold block mb-1">ข้อควรระวัง</span>
            รอบรับสมัครนี้มีผู้ยื่นใบสมัครเข้ามาแล้วจำนวน <span className="font-bold">{applicantCount}</span> รายการ
          </div>
        )}

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-center sm:text-left">
          การแก้ไขข้อความคำถามอาจทำให้คำตอบที่ผู้สมัครเดิมเคยตอบไว้ไม่ตรงกับคำถามใหม่ ซึ่งอาจส่งผลกระทบต่อการพิจารณาคัดเลือก
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">คำถามเดิม</label>
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              {originalQuestion}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">คำถามใหม่ (ที่จะเปลี่ยน)</label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="w-full rounded-lg border-2 border-amber-500 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
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
            onClick={() => onConfirm(newText)}
            className="h-11 w-full sm:w-auto px-6 rounded-xl bg-amber-700 text-sm font-semibold text-white hover:bg-amber-800 shadow-sm"
          >
            ยืนยันการแก้ไข
          </button>
        </div>
      </div>
    </div>
  );
};