import React from 'react';
import type { AdminDashboardSummaryMetrics } from '../types/dashboard';

interface StatCardsProps {
  summary: AdminDashboardSummaryMetrics;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* การ์ด 1: ชมรมทั้งหมด */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-gray-600">ชมรมทั้งหมดในระบบ</span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
            🏛️
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">{summary.totalClubs}</span>
          <span className="text-xs text-gray-500">ชมรม</span>
        </div>
        <div className="mt-3 text-xs text-emerald-600 flex items-center font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          เปิดรับสมัครอยู่ {summary.clubsCurrentlyRecruiting} ชมรม
        </div>
      </div>

      {/* การ์ด 2: ยอดผู้สมัครทั้งหมด */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-gray-600">ยอดผู้สมัครทั้งหมด</span>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
            📄
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">{summary.totalApplications.toLocaleString()}</span>
          <span className="text-xs text-gray-500">ใบสมัคร</span>
        </div>
        <div className="mt-3 text-xs text-blue-600 font-medium">
          ผู้สมัครไม่ซ้ำคน: {summary.uniqueApplicants.toLocaleString()} คน
        </div>
      </div>

      {/* การ์ด 3: สมาชิกใหม่ที่ยืนยันสิทธิ์ */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-gray-600">สมาชิกภาพใหม่ที่ยืนยันสิทธิ์</span>
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
            ☑️
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">{summary.confirmedNewMembers.toLocaleString()}</span>
          <span className="text-xs text-gray-500">รายการ</span>
        </div>
        <div className="mt-3 inline-block px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[11px] font-semibold">
          อัตราตอบรับ {summary.confirmationRatePercent}%
        </div>
      </div>

      {/* การ์ด 4: สมาชิกชมรมปัจจุบัน */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-gray-600">สมาชิกภาพชมรมปัจจุบัน (Active)</span>
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
            👥
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">{summary.currentActiveMemberships.toLocaleString()}</span>
          <span className="text-xs text-gray-500">รายการ</span>
        </div>
        <div className="mt-3 text-xs text-purple-600 font-medium">
          จำนวนสมาชิกภาพในชมรมทั้งหมด
        </div>
      </div>
    </div>
  );
};
