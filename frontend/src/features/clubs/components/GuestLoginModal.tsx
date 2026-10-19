import React from 'react';

interface GuestLoginModalProps {
  isOpen: boolean;
  roundTitle: string;
  clubName: string;
  onClose: () => void;
  onLogin: () => void;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  isOpen,
  roundTitle,
  clubName,
  onClose,
  onLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-5 relative animate-in fade-in zoom-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg p-1"
        >
          ✕
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
          <span className="text-2xl">🛡️</span>
        </div>

        <div>
          <span className="text-xs font-bold text-rose-600 block mb-1">
            การสมัครสำหรับผู้เยี่ยมชม
          </span>
          <h3 className="text-xl font-bold text-slate-900">เข้าสู่ระบบก่อนสมัครชมรม</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            กรุณาเข้าสู่ระบบผ่าน TU Authentication ด้วยบัญชีนักศึกษามหาวิทยาลัยธรรมศาสตร์
            เพื่อสมัครเข้าร่วม{clubName}
          </p>
        </div>

        <div className="w-full rounded-2xl bg-slate-50 p-4 border border-slate-200 text-left">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
            รอบที่คุณกำลังสมัคร
          </span>
          <span className="text-xs font-bold text-slate-800 block">{roundTitle}</span>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onLogin}
            className="w-full h-12 rounded-xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-sm font-bold transition-colors shadow-md shadow-rose-900/10 flex items-center justify-center gap-2"
          >
            เข้าสู่ระบบด้วยบัญชี TU ➔
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            ยกเลิก ↵
          </button>
        </div>
      </div>
    </div>
  );
};