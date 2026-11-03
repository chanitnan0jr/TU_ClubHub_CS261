import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../features/auth/AuthContext';
import { searchPublicClubs } from '../features/clubs/services/publicClubSearchService';
import type { PublicClubSearchItem, PublicClubSearchPage } from '../features/clubs/types/publicClubSearch';

function ClubCard({ club }: { club: PublicClubSearchItem }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      to={`/clubs/${club.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-rose-50">
        {club.imageUrl && !imageFailed ? (
          <img src={club.imageUrl} alt={`${club.name} logo`} onError={() => setImageFailed(true)} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <span className="text-sm font-medium text-slate-500">ไม่มีรูปภาพ</span>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
            club.hasOpenRecruitment
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-white/90 text-slate-600'
          }`}
        >
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
        <p className="line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
          {club.description}
        </p>
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

export default function ClubSearchPage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; page: PublicClubSearchPage } | null>(null);
  const [categories, setCategories] = useState<[string, string][]>([]);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([query, categoryId, recruitmentOpen, pageNumber, retry]);
  const result = loaded?.key === requestKey ? loaded.page : null;
  const error = failure?.key === requestKey ? failure.message : '';
  const isLoading = result === null && !error;

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      searchPublicClubs({ query, categoryId, recruitmentOpen, page: pageNumber })
        .then((data) => {
          if (!active) return;
          setLoaded({ key: requestKey, page: data });
          setFailure(null);
          setCategories((current) => {
            const found = new Map(current);
            data.items.forEach((club) => found.set(club.category.id, club.category.name));
            return [...found.entries()].sort((a, b) => a[1].localeCompare(b[1], 'th'));
          });
        })
        .catch((cause: unknown) => {
          if (active) {
            setFailure({
              key: requestKey,
              message: cause instanceof Error ? cause.message : 'ไม่สามารถโหลดรายชื่อชมรมได้',
            });
          }
        });
    }, query.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, categoryId, recruitmentOpen, pageNumber, retry, requestKey]);

  return (
    <div className="min-h-screen bg-[#faf8f6] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="TU ClubHub หน้าหลัก">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b1e3f] text-sm font-black text-white shadow-sm">
              TU
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">ClubHub</span>
              <span className="block text-xs text-slate-500">ค้นพบชมรมที่ใช่ในธรรมศาสตร์</span>
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
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                to={`/login?next=${encodeURIComponent('/')}`}
                className="rounded-xl bg-[#8b1e3f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#701832]"
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
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  id="club-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPageNumber(0);
                  }}
                  placeholder="พิมพ์ชื่อชมรมที่สนใจ"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-rose-700 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="club-category" className="mb-1.5 block text-sm font-semibold text-slate-700">หมวดหมู่ชมรม</label>
              <select
                id="club-category"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPageNumber(0);
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-rose-700 focus:ring-4 focus:ring-rose-100"
              >
                <option value="">ทุกหมวดหมู่</option>
                {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={recruitmentOpen}
                onChange={(event) => {
                  setRecruitmentOpen(event.target.checked);
                  setPageNumber(0);
                }}
                className="h-4 w-4 accent-[#8b1e3f]"
              />
              <span className="text-sm font-semibold text-slate-700">เปิดรับสมัครอยู่</span>
            </label>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">ชมรมทั้งหมด</h2>
          {result && <p className="text-sm text-slate-500">พบ {result.page.totalElements.toLocaleString('th-TH')} ชมรม</p>}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-white px-5 py-10 text-center" role="alert">
            <p className="font-semibold text-slate-800">{error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 rounded-xl bg-[#8b1e3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#701832]">
              ลองอีกครั้ง
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-hidden="true">
                <div className="aspect-[16/9] animate-pulse bg-slate-200" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
            <span className="sr-only" role="status">กำลังโหลดรายชื่อชมรม</span>
          </div>
        ) : result?.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <span className="text-4xl" aria-hidden="true">🔎</span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">ไม่พบชมรมที่ตรงกับการค้นหา</h3>
            <p className="mt-2 text-sm text-slate-500">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองดูนะ</p>
          </div>
        ) : result ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((club) => <ClubCard key={club.id} club={club} />)}
            </div>
            {result.page.totalPages > 1 && (
              <nav aria-label="เปลี่ยนหน้ารายชื่อชมรม" className="mt-8 flex items-center justify-center gap-4">
                <button type="button" disabled={pageNumber === 0} onClick={() => setPageNumber((page) => page - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
                <span className="text-sm text-slate-600">หน้า {pageNumber + 1} จาก {result.page.totalPages}</span>
                <button type="button" disabled={pageNumber + 1 >= result.page.totalPages} onClick={() => setPageNumber((page) => page + 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
              </nav>
            )}
          </>
        ) : null}
      </main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        TU ClubHub · สำรวจชมรมมหาวิทยาลัยธรรมศาสตร์
      </footer>
    </div>
  );
}
