import React from 'react';
import type { AdminCategoryStatsItem, AdminTopClubItem } from '../types/dashboard';

interface DataChartsProps {
  categories: AdminCategoryStatsItem[];
  topClubs: AdminTopClubItem[];
  totalApplications: number;
}

export const DataCharts: React.FC<DataChartsProps> = ({ categories, topClubs, totalApplications }) => {
  const categoryColors = ['#ef4444', '#2563eb', '#9333ea', '#10b981'];
  const maxApps = Math.max(1, ...topClubs.map((club) => club.totalApplications));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* กราฟ 1: สถิติผู้สมัครตามหมวดหมู่ชมรม */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-1">สถิติผู้สมัครตามหมวดหมู่ชมรม</h3>
        <p className="text-xs text-gray-500 mb-6">เปรียบเทียบสัดส่วนใบสมัครตามหมวดหมู่หลัก</p>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {categories.map((cat, idx) => {
                const percent = totalApplications > 0 ? (cat.totalApplications / totalApplications) * 100 : 0;
                const prevOffset = categories
                  .slice(0, idx)
                  .reduce((acc, curr) => acc + (totalApplications > 0 ? (curr.totalApplications / totalApplications) * 100 : 0), 0);
                return (
                  <path
                    key={cat.categoryId}
                    stroke={categoryColors[idx % categoryColors.length]}
                    strokeDasharray={`${percent}, 100`}
                    strokeDashoffset={`-${prevOffset}`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                );
              })}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-gray-900">{totalApplications.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400">ใบสมัครทั้งหมด</span>
            </div>
          </div>

          <div className="space-y-3 w-full sm:w-auto">
            {categories.map((cat, idx) => (
              <div key={cat.categoryId} className="flex items-center justify-between sm:justify-start space-x-4">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[idx % categoryColors.length] }}
                  ></span>
                  <span className="text-xs text-gray-700">{cat.categoryName}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">
                  {cat.totalApplications.toLocaleString()} <span className="font-normal text-gray-400">ใบสมัคร</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-6 bg-[#002b49] text-white p-3 rounded-lg text-xs flex items-center justify-between">
            <span className="font-medium">
              📌 หมวด{categories[0]?.categoryName}: ใบสมัคร {categories[0]?.totalApplications} | ผ่านคัดเลือก {categories[0]?.acceptedCount} | ยืนยัน {categories[0]?.confirmedCount}
            </span>
          </div>
        )}
      </div>

      {/* กราฟ 2: 5 อันดับชมรมที่มีผู้สมัครสูงสุด */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-1">5 อันดับชมรมที่มีผู้สมัครสูงสุด</h3>
        <p className="text-xs text-gray-500 mb-6">จัดอันดับชมรมยอดนิยมในรอบการรับสมัครปัจจุบัน</p>

        <div className="space-y-4">
          {topClubs.map((club) => {
            return (
              <div key={club.clubId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-800">{club.clubName}</span>
                  <span className="text-gray-500 font-medium">
                    {club.totalApplications} / {club.confirmedCount}
                  </span>
                </div>
                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#c82333]"
                    style={{ width: `${(club.totalApplications / maxApps) * 100}%` }}
                  ></div>
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500"
                    style={{ width: `${(club.confirmedCount / maxApps) * 100}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
