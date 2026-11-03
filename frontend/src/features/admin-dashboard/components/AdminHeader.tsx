import React from 'react';

export const AdminHeader: React.FC = () => {
  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* ไอคอน TU สี่เหลี่ยมสีแดงมน */}
        <div className="w-8 h-8 bg-[#c82333] text-white rounded-lg flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
          TU
        </div>
        {/* ข้อความ ClubHub เป็นตัวหนาแน่นตามรูปที่ 10 */}
        <div className="text-xl tracking-tight text-gray-900">
          <span className="font-extrabold text-[#002b49]">ClubHub</span>
          <span className="text-xs text-gray-500 ml-2 font-normal">ระบบบริหารชมรม • มหาวิทยาลัยธรรมศาสตร์</span>
        </div>
      </div>
      <div className="text-xs text-gray-400 font-mono">
        /admin/dashboard
      </div>
    </header>
  );
};