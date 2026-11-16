import React from 'react';
import { FileText } from 'lucide-react';
import type { AdminCategoryStatsItem, AdminTopClubItem } from '../types/dashboard';

interface DataChartsProps {
  categories: AdminCategoryStatsItem[];
  topClubs: AdminTopClubItem[];
  totalApplications: number;
}

export const DataCharts: React.FC<DataChartsProps> = ({ categories, topClubs, totalApplications }) => {
  const categoryColors = ['#861638', '#35599C', '#18794E', '#C79C60'];
  const maxApps = Math.max(1, ...topClubs.map((club) => club.totalApplications));

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* กราฟ 1: สถิติผู้สมัครตามหมวดหมู่ชมรม */}
      <div className="rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_1px_2px_rgba(37,32,42,0.03)]">
        <div className="mb-5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
            <h3 className="text-base font-extrabold text-[#25202A]">สถิติผู้สมัครตามหมวดหมู่ชมรม</h3>
          </div>
          <p className="mt-1 pl-[13px] text-xs text-[#59545B]">จำนวนใบสมัครในแต่ละหมวดหมู่</p>
        </div>

        {totalApplications === 0 ? (
          <div className="flex min-h-[210px] flex-col items-center justify-center rounded-xl bg-[#FAF7F3]/70 px-4 py-8 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-2xl bg-[#F2E7E5] text-[#861638]"
            >
              <FileText strokeWidth={1.75} className="size-7" />
            </span>
            <p className="mt-3 text-sm font-bold text-[#25202A]">ยังไม่มีข้อมูลใบสมัคร</p>
            <p className="mt-1 text-xs text-[#59545B]">ไม่พบใบสมัครในช่วงเวลาที่เลือก</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-around gap-6 sm:flex-row">
              <div className="relative flex h-44 w-44 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-[#EFEAE2]"
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
                  <span className="text-xl font-extrabold text-[#25202A] tabular-nums">
                    {totalApplications.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-[#59545B]">ใบสมัครทั้งหมด</span>
                </div>
              </div>

              <div className="w-full space-y-3 sm:w-auto">
                {categories.map((cat, idx) => (
                  <div key={cat.categoryId} className="flex items-center justify-between gap-4 sm:justify-start">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColors[idx % categoryColors.length] }}
                      />
                      <span className="text-xs font-medium text-[#25202A]">{cat.categoryName}</span>
                    </div>
                    <span className="text-xs font-bold text-[#25202A] tabular-nums">
                      {cat.totalApplications.toLocaleString()}{' '}
                      <span className="font-normal text-[#59545B]">ใบสมัคร</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {categories.length > 0 && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-[#EAE2D8] bg-[#FAF7F3] px-4 py-2.5 text-xs text-[#25202A]">
                <span className="font-medium">
                  หมวด{categories[0]?.categoryName}: ใบสมัคร {categories[0]?.totalApplications} | ผ่านคัดเลือก {categories[0]?.acceptedCount} | ยืนยัน {categories[0]?.confirmedCount}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* กราฟ 2: 5 อันดับชมรมที่มีผู้สมัครสูงสุด */}
      <div className="rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_1px_2px_rgba(37,32,42,0.03)]">
        <div className="mb-5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
            <h3 className="text-base font-extrabold text-[#25202A]">5 อันดับชมรมที่มีผู้สมัครสูงสุด</h3>
          </div>
          <p className="mt-1 pl-[13px] text-xs text-[#59545B]">จัดอันดับชมรมตามจำนวนใบสมัคร</p>
        </div>

        {topClubs.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center rounded-xl bg-[#FAF7F3]/70 px-4 py-8 text-xs text-[#59545B]">
            ยังไม่มีข้อมูลการจัดอันดับชมรม
          </div>
        ) : (
          <ol className="divide-y divide-[#F2ECE4]">
            {topClubs.map((club, index) => (
              <li key={club.clubId} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F2E7E5] text-xs font-bold text-[#861638] tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-[#25202A]">{club.clubName}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#25202A] tabular-nums">
                    {club.totalApplications.toLocaleString()}{' '}
                    <span className="font-normal text-[#59545B]">ใบสมัคร</span>
                  </span>
                </div>
                {club.totalApplications > 0 && (
                  <div className="relative mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-[#F2ECE4]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#861638]"
                      style={{ width: `${(club.totalApplications / maxApps) * 100}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#18794E]"
                      style={{ width: `${(club.confirmedCount / maxApps) * 100}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
