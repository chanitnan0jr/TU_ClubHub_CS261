import React, { useEffect, useState } from 'react';
import type { ApplicationUIItem, ApplicationSummaryStats, ApplicationFilterTab } from '../types/application';
import { fetchMyApplicationsAPI } from '../services/myApplicationService';
import { ApplicationCard } from '../components/ApplicationCard';

export const MyApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationUIItem[]>([]);
  const [stats, setStats] = useState<ApplicationSummaryStats | null>(null);
  const [activeTab, setActiveTab] = useState<ApplicationFilterTab>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await fetchMyApplicationsAPI();
      setApplications(res.items);
      setStats(res.stats);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleConfirmMembership = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'CONFIRMED' } : app))
    );
    if (stats) {
      setStats({
        ...stats,
        passedCount: Math.max(0, stats.passedCount - 1),
        confirmedCount: stats.confirmedCount + 1,
        currentMembershipCount: stats.currentMembershipCount + 1,
      });
    }
  };

  const handleDeclineMembership = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: 'DECLINED' } : app))
    );
    if (stats) {
      setStats({
        ...stats,
        passedCount: Math.max(0, stats.passedCount - 1),
      });
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return app.status === 'PENDING';
    if (activeTab === 'INTERVIEW') return app.status === 'INTERVIEW';
    if (activeTab === 'PASSED') return app.status === 'PASSED';
    if (activeTab === 'REJECTED') return app.status === 'REJECTED';
    if (activeTab === 'CONFIRMED_DECLINED') {
      return app.status === 'CONFIRMED' || app.status === 'DECLINED';
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 font-medium mb-3">
        <span>หน้าหลัก</span> <span className="mx-1">&gt;</span> <span className="text-gray-900 font-semibold">ประวัติการสมัครของฉัน</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ประวัติและสถานะใบสมัคร</h1>
          <p className="text-sm text-gray-600 mt-1.5">
            ติดตามสถานะการพิจารณา ยืนยันสิทธิ์ หรือสละสิทธิ์การเข้าเป็นสมาชิกชมรม
          </p>
        </div>

        <div className="shrink-0">
          <select className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C81E3D]">
            <option>ปีการศึกษา 2567 / ภาคเรียนที่ 1</option>
            <option>ปีการศึกษา 2566 / ภาคเรียนที่ 2</option>
          </select>
        </div>
      </div>

      {/* สถิติ 4 ช่อง */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-sm font-medium text-gray-500">ใบสมัครทั้งหมด</span>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {stats.totalCount} <span className="text-sm font-normal text-gray-500">รายการ</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-sm font-medium text-amber-700">รอพิจารณา</span>
            <div className="text-3xl font-bold text-amber-800 mt-1">
              {stats.pendingCount} <span className="text-sm font-normal text-amber-700">รายการ</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-sm font-medium text-emerald-700">ผ่านการคัดเลือก</span>
            <div className="text-3xl font-bold text-emerald-800 mt-1">
              {stats.passedCount} <span className="text-sm font-normal text-emerald-700">รายการ</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-sm font-medium text-blue-700">เป็นสมาชิกแล้ว</span>
            <div className="text-3xl font-bold text-blue-900 mt-1">
              {stats.currentMembershipCount} <span className="text-sm font-normal text-blue-700">ชมรม</span>
            </div>
          </div>
        </div>
      )}

      {/* แจ้งเตือนสิทธิ์ */}
      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-6">
        <span className="w-4.5 h-4.5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">ⓘ</span>
        <span>เป็นสมาชิกได้สูงสุด 5 ชมรม • ปัจจุบันเป็นสมาชิกแล้ว {stats?.currentMembershipCount || 1} ชมรม</span>
      </div>

      {/* แท็บกรองสถานะ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'ALL'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'PENDING'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          รอพิจารณา
        </button>
        <button
          onClick={() => setActiveTab('INTERVIEW')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'INTERVIEW'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          นัดสัมภาษณ์
        </button>
        <button
          onClick={() => setActiveTab('PASSED')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'PASSED'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ผ่านการคัดเลือก
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'REJECTED'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ไม่ผ่าน
        </button>
        <button
          onClick={() => setActiveTab('CONFIRMED_DECLINED')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'CONFIRMED_DECLINED'
              ? 'bg-[#C81E3D] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ยืนยัน/สละสิทธิ์แล้ว
        </button>
      </div>

      {/* การ์ดรายการ */}
      {isLoading ? (
        <div className="text-center py-16 text-sm font-medium text-gray-400">กำลังโหลดข้อมูลประวัติใบสมัคร...</div>
      ) : filteredApplications.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-4 text-sm font-bold text-gray-800">
            <span>ใบสมัครของฉัน • {filteredApplications.length} รายการ</span>
            <span className="text-gray-500 font-normal">แสดงรายการที่ต้องดำเนินการก่อน</span>
          </div>

          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onConfirmMembership={handleConfirmMembership}
              onDeclineMembership={handleDeclineMembership}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center my-6 space-y-4 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">คุณยังไม่มีประวัติการสมัครชมรมในขณะนี้</h3>
            <p className="text-sm text-gray-500 font-medium">ค้นหาชมรมที่ใช่ แล้วเริ่มกิจกรรมใหม่ไปด้วยกัน</p>
          </div>
          <div className="pt-2">
            <button className="px-6 py-3 bg-[#C81E3D] hover:bg-[#A61832] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
              + ค้นหาชมรมและเปิดดูรอบรับสมัคร
            </button>
          </div>
        </div>
      )}
    </div>
  );
};