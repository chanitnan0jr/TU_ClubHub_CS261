import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import PublicLayout, { WIDE_CONTAINER_CLASS } from '../../../components/layout/PublicLayout';
import { PageHeaderBanner } from '../../../components/ui/PageHeaderBanner';
import { StatCards } from '../components/StatCards';
import { DataCharts } from '../components/DataCharts';
import { AdminGuard } from '../components/AdminGuard';
import type { AdminDashboardStatsResponse, ClubCategoryOption } from '../types/dashboard';
import { apiRequest, describeApiError } from '../../../lib/api';

export const CentralDashboardPage: React.FC = () => (
  <PublicLayout fullBleed>
    <AdminGuard>
      <CentralDashboardContent />
    </AdminGuard>
  </PublicLayout>
);

const CentralDashboardContent: React.FC = () => {
  const [data, setData] = useState<AdminDashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Filters
  const [categories, setCategories] = useState<ClubCategoryOption[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryReload, setCategoryReload] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [yearInput, setYearInput] = useState<string>('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedQuery, setAppliedQuery] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState<number>(0);

  // 1. ดึงหมวดหมู่ชมรม master data
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ items: ClubCategoryOption[] }>('/api/v1/public/club-categories', { signal: controller.signal })
      .then((resData) => { if (!controller.signal.aborted) setCategories(resData.items); })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setCategoryError(describeApiError(err, 'กรุณาลองใหม่อีกครั้ง'));
      });
    return () => controller.abort();
  }, [categoryReload]);

  // 2. ดึงสถิติ Dashboard ด้วย apiRequest
  useEffect(() => {
    // ponytail: the abort signal also marks obsolete responses.
    const controller = new AbortController();

    const fetchDashboardStats = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (appliedQuery) params.append('q', appliedQuery);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedYear) params.append('academicYear', selectedYear);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedStatus !== 'ALL') params.append('clubStatus', selectedStatus);
      params.append('page', page.toString());

      try {
        const resData = await apiRequest<AdminDashboardStatsResponse>(
          `/api/v1/admin/dashboard/stats?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setData(resData);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setError(describeApiError(err, 'โหลดข้อมูลสถิติไม่สำเร็จ'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardStats();

    return () => controller.abort();
  }, [appliedQuery, selectedCategory, selectedYear, selectedSemester, selectedStatus, page]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setAppliedQuery('');
    setSelectedCategory('');
    setSelectedYear('');
    setYearInput('');
    setYearError(null);
    setSelectedSemester('');
    setSelectedStatus('ALL');
    setPage(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setAppliedQuery(searchQuery);
      setPage(0);
    }
  };

  const applyYearFilter = () => {
    const value = yearInput.trim();
    const year = Number(value);
    if (value && (!/^\d+$/.test(value) || !Number.isInteger(year) || year < 1 || year > 32767)) {
      setYearError('กรุณาระบุปีการศึกษาเป็นจำนวนเต็มตั้งแต่ 1 ถึง 32767');
      return;
    }
    setYearError(null);
    const normalizedYear = value ? String(year) : '';
    if (normalizedYear !== selectedYear) {
      setSelectedYear(normalizedYear);
      setPage(0);
    }
  };

  const totalPages = data?.clubs.page.totalPages ?? 0;
  const currentPage = data?.clubs.page.number ?? page;

  const handleDownloadCsv = () => {
    if (!data || data.clubs.items.length === 0) return;
    const header = [
      'ชื่อชมรม',
      'หมวดหมู่',
      'สถานะชมรม',
      'สถานะเปิดรับ',
      'ใบสมัครทั้งหมด',
      'รอยืนยันสิทธิ์',
      'ยืนยันสิทธิ์แล้ว',
      'สมาชิก Active',
    ];
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = data.clubs.items.map((club) => [
      club.clubName,
      club.category.name,
      club.clubStatus,
      club.hasOpenRecruitment ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร',
      club.totalApplications,
      club.acceptedCount,
      club.confirmedCount,
      club.activeMemberCount,
    ]);
    const csv = ['\uFEFF' + header.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tu-clubhub-admin-report-page-${currentPage + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#FAF7F3] text-[#25202A]">
      <PageHeaderBanner
        breadcrumbs={[
          { label: 'พื้นที่ส่วนกลาง' },
          { label: 'แดชบอร์ดสถิติภาพรวมมหาวิทยาลัย' },
        ]}
        title="แดชบอร์ดสถิติภาพรวมส่วนกลาง (Admin Dashboard)"
        subtitle="สรุปตัวชี้วัดการรับสมัครสมาชิกชมรม ภาพรวมสถิติสัดส่วนตามหมวดหมู่ และรายชื่อชมรมระดับมหาวิทยาลัย"
        rightSlot={
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E5DDD2] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#68112B] shadow-2xs backdrop-blur-xs">
            <ShieldCheck aria-hidden="true" strokeWidth={1.75} className="size-4 text-[#861638]" />
            <span>ผู้ดูแลระบบส่วนกลาง (System Admin)</span>
          </span>
        }
      />

      <div className={`${WIDE_CONTAINER_CLASS} py-6 sm:py-8`}>
        {/* Dynamic Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#EAE2D8] bg-white p-4 shadow-[0_1px_2px_rgba(37,32,42,0.03)]">
          <div className="relative min-w-[220px] flex-1">
            <Search
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#706B70]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="ค้นหาด้วยชื่อชมรม... (กด Enter เพื่อค้นหา)"
              className="min-h-11 w-full rounded-xl border border-[#DFD6CB] bg-white pl-10 pr-3.5 py-2 text-sm text-[#25202A] placeholder:text-[#766E68] transition focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
            className="min-h-11 cursor-pointer rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 text-sm font-medium text-[#25202A] transition focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
          >
            <option value="">ทุกหมวดหมู่ชมรม</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-medium text-[#59545B]">
            <span>ปีการศึกษา</span>
            <input
              type="number"
              min="1"
              max="32767"
              step="1"
              aria-invalid={Boolean(yearError)}
              aria-describedby={yearError ? 'dashboard-year-error' : undefined}
              placeholder="ทุกปี"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onBlur={applyYearFilter}
              onKeyDown={(e) => { if (e.key === 'Enter') applyYearFilter(); }}
              className="min-h-11 w-24 rounded-xl border border-[#DFD6CB] bg-white px-3 py-2 text-sm text-[#25202A] placeholder:text-[#766E68] transition focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
            />
          </label>

          <select
            value={selectedSemester}
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setPage(0);
            }}
            className="min-h-11 cursor-pointer rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 text-sm font-medium text-[#25202A] transition focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
          >
            <option value="">ทุกภาคเรียน</option>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
            <option value="3">ภาคฤดูร้อน</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
            className="min-h-11 cursor-pointer rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 text-sm font-medium text-[#25202A] transition focus:border-[#861638] focus:outline-none focus:ring-2 focus:ring-[#861638]/15"
          >
            <option value="ALL">สถานะ: ทั้งหมด</option>
            <option value="ACTIVE">สถานะ: ACTIVE</option>
            <option value="INACTIVE">สถานะ: INACTIVE</option>
          </select>

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD6CB] bg-[#FAF7F3] px-4 py-2 text-sm font-semibold text-[#25202A] transition hover:border-[#861638]/40 hover:bg-[#F2E7E5]/60 hover:text-[#861638]"
          >
            <RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />
            <span>ล้างตัวกรอง</span>
          </button>
        </div>

        {yearError && <p id="dashboard-year-error" role="alert" className="mb-4 text-xs font-medium text-red-700">{yearError}</p>}

        {categoryError && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            โหลดหมวดหมู่ชมรมไม่สำเร็จ: {categoryError}{' '}
            <button type="button" className="font-semibold underline" onClick={() => { setCategoryError(null); setCategoryReload((value) => value + 1); }}>
              โหลดหมวดหมู่ใหม่
            </button>
          </div>
        )}

        {error ? (
          <div className="my-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        ) : loading ? (
          <div className="my-6 rounded-2xl border border-[#EAE2D8] bg-white p-12 text-center">
            <p className="animate-pulse text-sm text-[#59545B]">กำลังโหลดข้อมูลสถิติ Central Dashboard...</p>
          </div>
        ) : data ? (
          <>
            <StatCards summary={data.summary} />
            <DataCharts
              categories={data.categoryBreakdown}
              topClubs={data.topClubs}
              totalApplications={data.summary.totalApplications}
            />

            <div className="mb-8 overflow-hidden rounded-2xl border border-[#EAE2D8] bg-white shadow-[0_1px_2px_rgba(37,32,42,0.03)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE2D8] p-5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
                  <h3 className="text-base font-extrabold text-[#25202A]">รายงานสรุปสถิติจำนวนผู้สมัครรายชมรม</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {data.clubs.items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#25202A] transition hover:border-[#861638]/40 hover:text-[#861638]"
                    >
                      <Download aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                      <span>ดาวน์โหลดรายงาน</span>
                    </button>
                  )}
                  <span className="rounded-xl border border-[#EAE2D8] bg-[#FAF7F3] px-3 py-1.5 text-xs font-semibold text-[#59545B]">
                    ระดับมหาวิทยาลัย
                  </span>
                </div>
              </div>

              <div className="w-full min-w-0 overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm text-[#59545B]">
                  <thead className="border-b border-[#EAE2D8] bg-[#FAF7F3] text-xs font-semibold text-[#59545B]">
                    <tr>
                      <th className="px-5 py-3.5">ชื่อชมรม</th>
                      <th className="px-4 py-3.5">หมวดหมู่</th>
                      <th className="px-4 py-3.5">สถานะชมรม</th>
                      <th className="px-4 py-3.5">สถานะเปิดรับ</th>
                      <th className="px-4 py-3.5">ใบสมัครทั้งหมด</th>
                      <th className="px-4 py-3.5">รอยืนยันสิทธิ์</th>
                      <th className="px-4 py-3.5">ยืนยันสิทธิ์แล้ว</th>
                      <th className="px-4 py-3.5">สมาชิก Active</th>
                      <th className="w-10 px-4 py-3.5"><span className="sr-only">รายละเอียด</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2ECE4]">
                    {data.clubs.items.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-sm text-[#59545B]">
                          ไม่พบชมรมที่ตรงกับตัวกรอง
                        </td>
                      </tr>
                    )}
                    {data.clubs.items.map((club) => (
                      <tr key={club.clubId} className="transition-colors hover:bg-[#FAF7F3]/70">
                        <td className="px-5 py-3.5 font-semibold text-[#25202A]">
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#F2E7E5] text-[#861638]"
                            >
                              <Code2 strokeWidth={1.75} className="size-3.5" />
                            </span>
                            <span>{club.clubName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-full bg-[#F2E7E5] px-2.5 py-0.5 text-xs font-semibold text-[#861638]">
                            {club.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              club.clubStatus === 'ACTIVE'
                                ? 'bg-[#E6F6EC] text-[#18794E]'
                                : 'bg-[#F3EFEA] text-[#59545B]'
                            }`}
                          >
                            {club.clubStatus}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3.5 text-xs font-semibold ${
                            club.hasOpenRecruitment ? 'text-[#18794E]' : 'text-[#706B70]'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className={`size-1.5 rounded-full ${club.hasOpenRecruitment ? 'bg-[#18794E]' : 'bg-[#8F878B]'}`}
                            />
                            {club.hasOpenRecruitment ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#25202A] tabular-nums">{club.totalApplications}</td>
                        <td className="px-4 py-3.5 tabular-nums">{club.acceptedCount}</td>
                        <td className="px-4 py-3.5 font-bold text-[#18794E] tabular-nums">{club.confirmedCount}</td>
                        <td className="px-4 py-3.5 font-bold text-[#25202A] tabular-nums">{club.activeMemberCount}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/clubs/${club.clubId}`}
                            aria-label={`ดูรายละเอียด ${club.clubName}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-[#706B70] transition hover:bg-[#F2E7E5] hover:text-[#861638]"
                          >
                            <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[#EAE2D8] px-5 py-4 text-xs sm:px-6">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 font-semibold text-[#25202A] transition hover:bg-[#FAF7F3] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <span className="font-medium text-[#59545B]">
                    หน้า <strong className="text-[#25202A]">{currentPage + 1}</strong> จาก{' '}
                    <strong className="text-[#25202A]">{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD6CB] bg-white px-3.5 py-2 font-semibold text-[#25202A] transition hover:bg-[#FAF7F3] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
