import React, { useState } from 'react';

interface DeleteQuestionModalProps {
  isOpen: boolean;
  // Unknown until the API reports applicants for a round, so the warning is optional.
  applicantCount?: number;
  isHardBlock?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

// เปิด modal ด้วย key ของคำถามเสมอ เพื่อให้ช่องติ๊กยืนยันเริ่มต้นเป็นว่าง
export const DeleteQuestionModal: React.FC<DeleteQuestionModalProps> = ({
  isOpen,
  applicantCount = 0,
  isHardBlock = false,
  isDeleting = false,
  onClose,
  onConfirmDelete,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  if (isHardBlock && applicantCount > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl">
            🔒
          </div>
          <h3 className="text-xl font-bold text-slate-900">ไม่สามารถลบคำถามนี้ได้</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            เนื่องจากรอบรับสมัครนี้มีผู้ยื่นใบสมัครเข้ามาแล้ว ระบบไม่อนุญาตให้ลบคำถามคัดเลือกเดิม เพื่อรักษาความถูกต้องของข้อมูลใบสมัคร
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl">
          🗑️
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900">ยืนยันการลบคำถามคัดเลือก?</h3>
        </div>

        {applicantCount > 0 && (
          <div className="rounded-xl bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 border border-rose-200">
            <span className="font-bold block mb-1">คำเตือนสำคัญ</span>
            รอบนี้มีผู้สมัครแล้ว {applicantCount} คน คำถามนี้มีประวัติคำตอบในระบบ
          </div>
        )}

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-center sm:text-left">
          หากคุณลบคำถามนี้ ข้อมูลคำตอบของผู้สมัครทั้งหมดในข้อนี้จะถูกซ่อนหรือลบออกจากแบบฟอร์มการพิจารณา คุณต้องการดำเนินการต่อหรือไม่?
        </p>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-300 bg-rose-50/50 cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
          />
          <span className="text-xs sm:text-sm font-medium text-slate-700">
            ข้าพเจ้ารับทราบว่าการลบคำถามจะส่งผลกระทบต่อข้อมูลคำตอบของผู้สมัครเดิม
          </span>
        </label>

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
            disabled={!isChecked || isDeleting}
            onClick={onConfirmDelete}
            className="h-11 w-full sm:w-auto px-6 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
          >
            {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบคำถาม'}
          </button>
        </div>
      </div>
    </div>
  );
};