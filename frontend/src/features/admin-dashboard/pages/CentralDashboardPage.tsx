import React, { useEffect, useState } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { StatCards } from '../components/StatCards';
import { DataCharts } from '../components/DataCharts';
import { AdminGuard } from '../components/AdminGuard';
import type { AdminDashboardStatsResponse, ClubCategoryOption } from '../types/dashboard';

export const CentralDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // States สำหรับ Dynamic Filters
  const [categories, setCategories] = useState<ClubCategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2569');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. ดึงข้อมูลหมวดหมู่ชมรม master data
  useEffect(() => {
    fetch('/api/v1/public/club-categories')
      .then((res) => res.json())
      .then((resData) => setCategories(resData.items || []))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // 2. ดึงข้อมูลสถิติ Stats จาก Backend API จริง
  const fetchDashboardStats = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    if (selectedYear) params.append('academicYear', selectedYear);
    if (selectedSemester) params.append('semester', selectedSemester);
    if (selectedStatus) params.append('clubStatus', selectedStatus);

    fetch(`/api/v1/admin/dashboard/stats?${params.toString()}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard stats', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCategory, selectedYear, selectedSemester, selectedStatus]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedYear('2569');
    setSelectedSemester('1');
    setSelectedStatus('ACTIVE');
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#f8f9fa]">
        <AdminHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb และ Title */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-1">
              พื้นที่ส่วนกลาง &gt; แดชบอร์ดสถิติภาพรวมมหาวิทยาลัย
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                แดชบอร์ดสถิติภาพรวมส่วนกลาง (Admin Dashboard)
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                🛡️ ผู้ดูแลระบบส่วนกลาง (System Admin)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              สรุปตัวชี้วัดการรับสมัครสมาชิกชมรม ภาพรวมสถิติสัดส่วนตามหมวดหมู่ และรายชื่อชมรมระดับมหาวิทยาลัย
            </p>
          </div>

          {/* Dynamic Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDashboardStats()}
                placeholder="ค้นหาด้วยชื่อชมรม..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#c82333]"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-gray-400">🔍</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none"
            >
              <option value="">ทุกหมวดหมู่ชมรม</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none"
            >
              <option value="2569">ปีการศึกษา 2569</option>
              <option value="2568">ปีการศึกษา 2568</option>
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="3">ภาคฤดูร้อน</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none"
            >
              <option value="ACTIVE">สถานะ: ACTIVE</option>
              <option value="INACTIVE">สถานะ: INACTIVE</option>
              <option value="ALL">ทั้งหมด</option>
            </select>

            <button
              onClick={handleClearFilters}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              + ล้างตัวกรอง
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 my-6">
              <p className="text-gray-400 text-xs animate-pulse">กำลังโหลดข้อมูลสถิติ Central Dashboard...</p>
            </div>
          ) : data ? (
            <>
              <StatCards summary={data.summary} />
              <DataCharts
                categories={data.categoryBreakdown}
                topClubs={data.topClubs}
                totalApplications={data.summary.totalApplications}
              />

              {/* Table สรุปข้อมูลรายชมรม */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">รายงานสรุปสถิติจำนวนผู้สมัครรายชมรม</h3>
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                    ระดับมหาวิทยาลัย
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="p-3">ชื่อชมรม</th>
                        <th className="p-3">หมวดหมู่</th>
                        <th className="p-3">สถานะชมรม</th>
                        <th className="p-3">สถานะเปิดรับ</th>
                        <th className="p-3">ใบสมัครทั้งหมด</th>
                        <th className="p-3">รอยืนยันสิทธิ์</th>
                        <th className="p-3">ยืนยันสิทธิ์แล้ว</th>
                        <th className="p-3">สมาชิก Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.clubs.items.map((club) => (
                        <tr key={club.clubId} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-gray-900 flex items-center space-x-2">
                            <span className="text-red-500 font-bold">‹/›</span>
                            <span>{club.clubName}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-medium text-[10px]">
                              {club.category.name}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                              {club.clubStatus}
                            </span>
                          </td>
                          <td className="p-3 text-emerald-600 font-medium">
                            • {club.hasOpenRecruitment ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                          </td>
                          <td className="p-3 font-bold text-gray-900">{club.totalApplications}</td>
                          <td className="p-3">{club.underReviewCount}</td>
                          <td className="p-3 font-bold text-emerald-600">{club.confirmedCount}</td>
                          <td className="p-3 font-bold text-gray-900">{club.activeMemberCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </AdminGuard>
  );
};