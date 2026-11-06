import React from 'react';
import { useAuth } from '../../auth/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
      </div>
    );
  }

  // ผู้ใช้ต้อง Login และมี system_role เป็น 'ADMIN' เท่านั้น
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#c82333] border border-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-light">⊘</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            403 - ไม่สามารถเข้าถึงหน้านี้ได้ (Access Denied)
          </h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            หน้าแดชบอร์ดสถิติส่วนกลางอนุญาตเฉพาะผู้ดูแลระบบส่วนกลาง (System Admin) เท่า นั้น
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#c82333] hover:bg-[#b21f2d] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            🏠 กลับสู่หน้าแรก
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};