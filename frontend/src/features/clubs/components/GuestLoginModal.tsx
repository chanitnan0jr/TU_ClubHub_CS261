import React from 'react';

interface GuestLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundTitle?: string;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  isOpen,
  onClose,
  roundTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-lg">
            🔒
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div>
          <span className="text-[11px] font-bold text-rose-600">การสมัครสำหรับผู้เยี่ยมชม</span>
          <h2 className="text-lg font-extrabold text-slate-900 mt-1">
            เข้าสู่ระบบก่อนสมัครชมรม
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            กรุณาเข้าสู่ระบบผ่าน TU Authentication ด้วยบัญชีนักศึกษามหาวิทยาลัยธรรมศาสตร์เพื่อสมัครเข้าร่วมชมรม
          </p>
        </div>

        {roundTitle && (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px]">รอบที่คุณกำลังสมัคร</span>
            <span className="font-bold text-slate-800">{roundTitle}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => alert('นำทางไปหน้า TU Login')}
            className="w-full h-11 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold shadow-md transition-colors"
          >
            เข้าสู่ระบบด้วยบัญชี TU ➔
          </button>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};