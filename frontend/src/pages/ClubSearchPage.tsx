import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import PublicLayout from '../components/layout/PublicLayout';
import { searchPublicClubs } from '../features/clubs/services/publicClubSearchService';
import type { PublicClubSearchItem } from '../features/clubs/types/publicClubSearch';
import { apiRequest, describeApiError } from '../lib/api';

interface PublicClubCategoriesResponse {
  items: { id: string; name: string }[];
}

function SearchIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="8.8" cy="8.8" r="5.5" />
      <path strokeLinecap="round" d="m13 13 4 4" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" />
    </svg>
  );
}

const HERO_IMAGE_URL = '/images/CampusHomepage.png';
const HERO_ETCHING_URL = '/images/Elegant%20Ivory%20University%20Campus%20Etching.png';

function ClubCard({ club }: { club: PublicClubSearchItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = club.imageUrl ?? null;

  return (
    <Link
      to={`/clubs/${club.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EAE2D8] bg-white shadow-[0_2px_10px_rgba(35,27,23,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#D9B8C2] hover:shadow-[0_14px_28px_-10px_rgba(139,30,63,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1E3F]"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F3EDE5] to-[#E8DFD4]">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={club.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[#9A8F86]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7 opacity-75">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 16-5-5-4.5 4.5L9 13l-6 5" />
            </svg>
            <span className="text-xs font-medium">ยังไม่มีภาพกิจกรรม</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold leading-snug text-[#231B17] transition-colors group-hover:text-[#8B1E3F]">
            {club.name}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              club.hasOpenRecruitment
                ? 'bg-[#E9F5EE] text-[#1F6B45]'
                : 'bg-[#F2EFEA] text-[#6B625B]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                club.hasOpenRecruitment ? 'bg-[#248A57]' : 'bg-[#A89F97]'
              }`}
            />
            {club.hasOpenRecruitment ? 'เปิดรับสมัคร' : 'ยังไม่เปิดรับสมัคร'}
          </span>
        </div>

        <p className="mt-2.5 line-clamp-2 flex-1 text-[15px] leading-6 text-[#645B53]">
          {club.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {club.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-[#F3EFEA] px-3 py-1 text-xs font-medium text-[#5F564F]"
              >
                {tag.name}
              </span>
            ))}
            <span className="rounded-full bg-[#F9EBEE] px-3 py-1 text-xs font-medium text-[#8B1E3F]">
              {club.category.name}
            </span>
          </div>
          <ArrowRightIcon className="size-4 shrink-0 text-[#8B1E3F] transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

interface ClubSearchPageProps {
  clubs?: PublicClubSearchItem[];
}

export default function ClubSearchPage({ clubs }: ClubSearchPageProps) {
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
  const categoryId = category;
  const hasFilters = Boolean(query.trim() || category || recruitmentOpen);
  const filteredClubs = usesApi ? currentSearch?.items ?? [] : (clubs ?? []).filter((club) => {
    const matchesQuery = !query.trim()
      || club.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      || club.description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesCategory = !category || club.category.id === category;
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

  const scrollToDirectory = () => {
    document.getElementById('club-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    scrollToDirectory();
  };

  return (
    <PublicLayout fullBleed>
      <div className="pb-14">
        <section className="relative overflow-hidden border-b border-[#EAE2D8] bg-[#FAF6F0]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-full overflow-hidden lg:w-[56%]"
          >
            <img
              src={HERO_ETCHING_URL}
              alt=""
              className="absolute bottom-0 right-0 h-full w-auto max-w-none object-contain object-right-bottom opacity-95 [mask-image:linear-gradient(to_right,transparent_0%,black_25%,black_100%)]"
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#FAF6F0]/80 via-[#FAF6F0]/40 to-transparent"
          />

          <div className="relative mx-auto w-full max-w-[1680px] lg:min-h-[490px] xl:min-h-[540px]">
            <div className="relative z-10 flex flex-col justify-center px-4 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-12 lg:min-h-[490px] lg:w-1/2 lg:px-12 lg:pb-24 lg:pr-16 xl:min-h-[540px] xl:px-16">
              <div className="relative z-10">
                <p className="flex flex-wrap items-center gap-2.5 text-xs font-bold tracking-[0.14em] text-[#8B1E3F] uppercase font-['Manrope',var(--font-sans)] sm:text-[13px]">
                  <span>THAMMASAT STUDENT COMMUNITY</span>
                  <span aria-hidden="true" className="text-[#C8BEB3]">/</span>
                  <span className="font-sans text-xs font-medium tracking-normal text-[#6B625B] normal-case sm:text-[13px]">
                    ชีวิตในรั้วธรรมศาสตร์
                  </span>
                </p>
                <span aria-hidden="true" className="mt-3 block h-0.5 w-10 bg-[#8B1E3F]" />

                <h1 className="mt-5 text-4xl font-extrabold leading-[1.12] tracking-tight text-[#231B17] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem]">
                  ค้นพบพื้นที่ของคุณ
                  <br />
                  ในรั้วธรรมศาสตร์
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5A514A] sm:text-lg">
                  สำรวจชมรมและกิจกรรมจากชมรมธรรมศาสตร์
                  <br className="hidden sm:block" />
                  เลือกตามความสนใจและเริ่มต้นประสบการณ์ใหม่ไปด้วยกัน
                </p>

                <div className="mt-8">
                  <a
                    href="#club-directory"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToDirectory();
                      document.getElementById('club-search')?.focus();
                    }}
                    className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#8B1E3F] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#731733]"
                  >
                    <span>สำรวจชมรม</span>
                    <ArrowRightIcon className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-14 sm:px-8 lg:pointer-events-none lg:absolute lg:inset-y-0 lg:right-0 lg:w-[51%] lg:p-0">
            <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-[#DFD5C8] bg-[#E6DDD2] sm:h-72 lg:h-full lg:rounded-none lg:border-0 lg:[clip-path:polygon(11%_0,100%_0,100%_100%,0%_100%)]">
              <img
                src={HERO_IMAGE_URL}
                alt="นักศึกษาธรรมศาสตร์ร่วมกิจกรรมชมรมในบรรยากาศแคมปัส"
                className="h-full w-full object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#231B17]/15 via-transparent to-transparent"
              />
              <div className="absolute right-5 top-6 z-10 bg-[#7A1835]/95 px-7 py-2 font-['Manrope',var(--font-sans)] text-xs font-semibold tracking-[0.22em] text-white shadow-sm [clip-path:polygon(10px_0,100%_0,calc(100%-10px)_100%,0_100%)] sm:right-7 lg:right-12 lg:top-7 xl:right-16">
                / FIND YOUR PEOPLE
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-8 lg:px-12 xl:px-16">
          <section
            aria-label="ค้นหาและกรองชมรม"
            className="relative z-20 -mt-10 mb-12 rounded-2xl border border-[#EAE2D8] bg-white p-4 shadow-[0_12px_32px_-8px_rgba(35,27,23,0.10)] sm:p-5"
          >
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="relative flex-1">
                <label htmlFor="club-search" className="sr-only">ค้นหาชมรม</label>
                <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8F86]">
                  <SearchIcon className="size-5" />
                </span>
                <input
                  id="club-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder="ค้นหาชมรมที่สนใจ"
                  className="h-14 w-full rounded-xl border border-[#E2D9CE] bg-white pl-12 pr-4 text-base text-[#231B17] placeholder:text-[#9A8F86] outline-none transition focus:border-[#8B1E3F] focus:ring-4 focus:ring-[#8B1E3F]/10"
                />
              </div>

              <div className="relative md:w-64">
                <label htmlFor="club-category" className="sr-only">หมวดหมู่ชมรม</label>
                <select
                  id="club-category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(0);
                  }}
                  className="h-14 w-full appearance-none rounded-xl border border-[#E2D9CE] bg-white pl-4 pr-11 text-base text-[#231B17] outline-none transition focus:border-[#8B1E3F] focus:ring-4 focus:ring-[#8B1E3F]/10"
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {(usesApi ? currentCategories : (clubs ?? []).map((club) => club.category))
                    .filter((item, index, items) => items.findIndex((other) => other.id === item.id) === index)
                    .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A6F67]"
                >
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <label className="flex min-h-14 shrink-0 cursor-pointer items-center gap-2.5 px-2">
                <input
                  type="checkbox"
                  aria-label="เปิดรับสมัครอยู่"
                  checked={recruitmentOpen}
                  onChange={(event) => {
                    setRecruitmentOpen(event.target.checked);
                    setPage(0);
                  }}
                  className="h-4 w-4 rounded border-[#CFC4B8] accent-[#8B1E3F]"
                />
                <span className="text-[15px] font-medium text-[#3B332E]">เฉพาะที่เปิดรับสมัคร</span>
              </label>

              <button
                type="submit"
                className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-7 text-base font-semibold text-white transition hover:bg-[#731733]"
              >
                <SearchIcon className="size-4" />
                <span>ค้นหา</span>
              </button>
            </form>

            {hasFilters && (
              <div className="mt-3 flex items-center justify-end border-t border-[#F3ECE4] pt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-[#8B1E3F] underline-offset-2 hover:underline"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </section>

          <section id="club-directory" aria-labelledby="club-directory-heading">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-3.5">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-7 w-[3px] rounded-full bg-[#8B1E3F]" />
                  <h2 id="club-directory-heading" className="text-2xl font-extrabold tracking-tight text-[#231B17] sm:text-[1.75rem]">
                    ชมรมที่น่าสนใจ
                  </h2>
                </div>
                <p className="text-base text-[#7A6F67]">
                  ค้นหากิจกรรมและผู้คนที่ชอบสิ่งเดียวกัน
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (hasFilters) {
                    clearFilters();
                  } else {
                    scrollToDirectory();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#8B1E3F] transition hover:text-[#6E1832]"
              >
                <span>ดูชมรมทั้งหมด</span>
                <ArrowRightIcon className="size-4" />
              </button>
            </div>

            {categoryError || searchError ? (
              <section aria-live="polite" className="rounded-2xl border border-rose-200 bg-white px-5 py-14 text-center">
                <p role="alert" className="text-sm font-semibold text-[#8B1E3F]">
                  {categoryError ?? searchError}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryKey((key) => key + 1)}
                  className="mt-4 rounded-lg bg-[#8B1E3F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#731733]"
                >
                  ลองใหม่
                </button>
              </section>
            ) : usesApi && !currentSearch ? (
              <p role="status" className="rounded-2xl border border-[#EAE2D8] bg-white px-5 py-14 text-center text-sm font-semibold text-[#6B625B]">
                กำลังโหลดชมรม...
              </p>
            ) : filteredClubs.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredClubs.map((club) => <ClubCard key={club.id} club={club} />)}
              </div>
            ) : (
              <section aria-live="polite" className="rounded-2xl border border-dashed border-[#D8CEC2] bg-white px-5 py-14 text-center sm:py-20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9EBEE] text-[#8B1E3F]" aria-hidden="true">
                  <SearchIcon className="size-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#231B17]">ไม่พบชมรม</h3>
              </section>
            )}

            {usesApi && currentSearch && currentSearch.page.totalPages > 1 && (
              <nav aria-label="หน้ารายการชมรม" className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="rounded-lg border border-[#DCD2C7] bg-white px-4 py-2 text-sm font-semibold text-[#3B332E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <span className="text-sm text-[#6B625B]">
                  หน้า {currentSearch.page.number + 1} จาก {currentSearch.page.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= currentSearch.page.totalPages}
                  onClick={() => setPage((current) => Math.min(currentSearch.page.totalPages - 1, current + 1))}
                  className="rounded-lg border border-[#DCD2C7] bg-white px-4 py-2 text-sm font-semibold text-[#3B332E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
