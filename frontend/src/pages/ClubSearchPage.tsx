import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../features/auth/AuthContext';
import { searchPublicClubs } from '../features/clubs/services/publicClubSearchService';
import type { PublicClubSearchItem } from '../features/clubs/types/publicClubSearch';
import { apiRequest, describeApiError } from '../lib/api';

interface PublicClubCategoriesResponse {
  items: { id: string; name: string }[];
}

function ClubCard({ club }: { club: PublicClubSearchItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to={`/clubs/${club.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-rose-50">
        {club.imageUrl && !imageFailed ? (
          <img
            src={club.imageUrl}
            alt={`${club.name} logo`}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-sm font-medium text-slate-500">ไม่มีรูปภาพ</span>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
          club.hasOpenRecruitment ? 'bg-emerald-100 text-emerald-800' : 'bg-white/90 text-slate-600'
        }`}>
          {club.hasOpenRecruitment ? 'กำลังเปิดรับสมัคร' : 'ยังไม่เปิดรับสมัคร'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-rose-800">
            {club.name}
          </h2>
          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
            {club.category.name}
          </span>
        </div>
        <p className="line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{club.description}</p>
        {club.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {club.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

interface ClubSearchPageProps {
  clubs?: PublicClubSearchItem[];
}

export default function ClubSearchPage({ clubs }: ClubSearchPageProps) {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [categoriesResult, setCategoriesResult] = useState<{
    retryKey: number;
    items: PublicClubCategoriesResponse['items'];
  } | null>(null);
  const [categoryFailure, setCategoryFailure] = useState<{
    retryKey: number;
    message: string;
  } | null>(null);
  const [searchResult, setSearchResult] = useState<{
    key: string;
    items: PublicClubSearchItem[];
    page: { number: number; totalPages: number };
  } | null>(null);
  const [searchFailure, setSearchFailure] = useState<{ key: string; message: string } | null>(null);
  const usesApi = clubs === undefined;
  const currentCategories = categoriesResult?.retryKey === retryKey
    ? categoriesResult.items
    : [];
  const categoriesReady = categoriesResult?.retryKey === retryKey;
  const categoryError = categoryFailure?.retryKey === retryKey
    ? categoryFailure.message
    : null;
  const searchKey = JSON.stringify([query.trim(), category, recruitmentOpen, page, retryKey]);
  const currentSearch = searchResult?.key === searchKey ? searchResult : null;
  const searchError = searchFailure?.key === searchKey ? searchFailure.message : null;
  const categoryId = currentCategories.find((item) => item.name === category)?.id ?? '';
  const hasFilters = Boolean(query.trim() || category || recruitmentOpen);
  const filteredClubs = (usesApi ? currentSearch?.items ?? [] : clubs ?? []).filter((club) => {
    const matchesQuery = !query.trim()
      || club.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      || club.description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesCategory = !category || club.category.name === category;
    const matchesRecruitment = !recruitmentOpen || club.hasOpenRecruitment;
    return matchesQuery && matchesCategory && matchesRecruitment;
  });

  useEffect(() => {
    if (!usesApi) return;
    let ignore = false;
    apiRequest<PublicClubCategoriesResponse>('/api/v1/public/club-categories')
      .then((response) => {
        if (!ignore) {
          setCategoriesResult({ retryKey, items: response.items });
          setCategoryFailure(null);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setCategoryFailure({
            retryKey,
            message: describeApiError(error, 'ไม่สามารถโหลดหมวดหมู่ชมรมได้ กรุณาลองใหม่'),
          });
        }
      });
    return () => {
      ignore = true;
    };
  }, [retryKey, usesApi]);

  useEffect(() => {
    if (!usesApi || !categoriesReady) return;
    let ignore = false;
    const timeout = window.setTimeout(() => {
      searchPublicClubs({
        query,
        categoryId,
        recruitmentOpen,
        page,
      })
        .then((response) => {
          if (!ignore) {
            setSearchResult({
              key: searchKey,
              items: response.items,
              page: {
                number: response.page.number,
                totalPages: response.page.totalPages,
              },
            });
            setSearchFailure(null);
          }
        })
        .catch((error: unknown) => {
          if (!ignore) {
            setSearchFailure({
              key: searchKey,
              message: error instanceof Error
                ? error.message
                : 'ไม่สามารถโหลดรายชื่อชมรมได้ กรุณาลองใหม่',
            });
          }
        });
    }, 250);
    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [categoriesReady, categoryId, page, query, recruitmentOpen, retryKey, searchKey, usesApi]);

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setRecruitmentOpen(false);
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="TU ClubHub หน้าหลัก">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#c81e3d] text-[10px] font-black text-white shadow-sm">
              TU
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">ClubHub</span>
              <span className="hidden text-[10px] text-slate-500 sm:inline">ระบบบริหารชมรม · มหาวิทยาลัยธรรมศาสตร์</span>
            </span>
          </Link>
          {!authLoading && (
            isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="hidden text-sm font-semibold text-slate-600 hover:text-rose-800 sm:inline">
                  จัดการชมรม
                </Link>
                <Link to="/profile/applications" className="hidden text-sm font-semibold text-slate-600 hover:text-rose-800 sm:inline">
                  ใบสมัครของฉัน
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                to={`/login?next=${encodeURIComponent('/')}`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                เข้าสู่ระบบ
              </Link>
            )
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#741a35] via-[#8b1e3f] to-[#b13a5b] px-6 py-9 text-white shadow-md sm:px-10 sm:py-12">
          <p className="mb-3 text-sm font-bold tracking-wide text-rose-100">TU CLUBHUB · CLUB DIRECTORY</p>
          <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            ค้นพบชมรมที่ใช่
            <br className="hidden sm:block" /> แล้วเริ่มต้นสิ่งใหม่ไปด้วยกัน
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-rose-50 sm:text-base">
            สำรวจชุมชนและกิจกรรมจากชมรมธรรมศาสตร์ เลือกดูตามความสนใจและสถานะการรับสมัคร
          </p>
        </section>

        <section aria-label="ค้นหาและกรองชมรม" className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(210px,0.55fr)_auto] md:items-end">
            <div>
              <label htmlFor="club-search" className="mb-1.5 block text-sm font-semibold text-slate-700">ค้นหาชมรม</label>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  id="club-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder="พิมพ์ชื่อชมรมที่สนใจ"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-rose-700 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="club-category" className="mb-1.5 block text-sm font-semibold text-slate-700">หมวดหมู่ชมรม</label>
              <div className="relative">
                <select
                  id="club-category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(0);
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white py-0 pl-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-rose-700 focus:ring-4 focus:ring-rose-100"
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {usesApi
                    ? currentCategories.map((item) => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))
                    : [
                      'เทคโนโลยีและนวัตกรรม',
                      'กีฬาและสุขภาพ',
                      'ศิลปะและวัฒนธรรม',
                      'จิตอาสาและสิ่งแวดล้อม',
                    ].map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                >
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={recruitmentOpen}
                onChange={(event) => {
                  setRecruitmentOpen(event.target.checked);
                  setPage(0);
                }}
                className="h-4 w-4 accent-[#8b1e3f]"
              />
              <span className="text-sm font-semibold text-slate-700">เปิดรับสมัครอยู่</span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-rose-800 underline-offset-2 hover:underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">ชมรมทั้งหมด</h2>
        </div>

        {categoryError || searchError ? (
          <section aria-live="polite" className="rounded-2xl border border-rose-200 bg-white px-5 py-14 text-center">
            <p role="alert" className="text-sm font-semibold text-rose-800">
              {categoryError ?? searchError}
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              ลองใหม่
            </button>
          </section>
        ) : usesApi && !currentSearch ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center text-sm font-semibold text-slate-600">
            กำลังโหลดชมรม...
          </p>
        ) : filteredClubs.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        ) : (
          <section aria-live="polite" className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center sm:py-20">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-800" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">ไม่พบชมรม</h3>
          </section>
        )}
        {usesApi && currentSearch && currentSearch.page.totalPages > 1 && (
          <nav aria-label="หน้ารายการชมรม" className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="text-sm text-slate-600">
              หน้า {currentSearch.page.number + 1} จาก {currentSearch.page.totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= currentSearch.page.totalPages}
              onClick={() => setPage((current) => Math.min(currentSearch.page.totalPages - 1, current + 1))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ถัดไป
            </button>
          </nav>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        TU ClubHub · สำรวจชมรมมหาวิทยาลัยธรรมศาสตร์
      </footer>
    </div>
  );
}
