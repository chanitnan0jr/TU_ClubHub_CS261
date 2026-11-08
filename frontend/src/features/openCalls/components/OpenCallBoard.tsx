import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { buttonClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CalendarDaysIcon } from '../../../components/ui/icons';
import { describeApiError } from '../../../lib/api';
import { listOpenCalls } from '../api/openCallApi';
import type { PublicOpenCallPage } from '../types/openCall';
import { OpenCallCard } from './OpenCallCard';

const PAGE_SIZE = 12;
const gridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3';

type LoadResult =
  | { status: 'ok'; data: PublicOpenCallPage; loadedAt: number }
  | { status: 'error'; message: string };

/** `?page=` is one-based for people; anything else means the first page. */
const pageIndex = (value: string | null) => (value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) - 1 : 0);

function SkeletonCards() {
  return (
    <div role="status">
      <span className="sr-only">กำลังโหลดรอบที่เปิดรับสมัคร...</span>
      <ul aria-hidden="true" className={gridClass}>
        {Array.from({ length: 6 }, (_, index) => (
          <li
            key={index}
            className="flex h-full min-h-96 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 motion-safe:animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-slate-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-6 w-28 rounded-full bg-slate-100" />
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="flex flex-col gap-2">
              <div className="h-3.5 rounded bg-slate-100" />
              <div className="h-3.5 w-5/6 rounded bg-slate-100" />
            </div>
            <div className="mt-auto h-11 rounded-lg bg-slate-200" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Open Call Board (US-07 AC-03): every round open now, soonest deadline first. */
export function OpenCallBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = pageIndex(searchParams.get('page'));
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: LoadResult } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A result only counts for the page and retry it was fetched for.
  const requestKey = `${page}:${reloadKey}`;
  const result = loaded?.key === requestKey ? loaded.result : null;

  useEffect(() => {
    let ignore = false;
    listOpenCalls(page, PAGE_SIZE).then(
      (data) => {
        if (!ignore) setLoaded({ key: requestKey, result: { status: 'ok', data, loadedAt: Date.now() } });
      },
      (error: unknown) => {
        if (ignore) return;
        const message = describeApiError(error, 'ไม่สามารถโหลดรอบที่เปิดรับสมัครได้ กรุณาลองใหม่อีกครั้ง');
        setLoaded({ key: requestKey, result: { status: 'error', message } });
      },
    );
    return () => {
      ignore = true;
    };
  }, [page, requestKey]);

  const goToPage = (next: number) => {
    setSearchParams(next === 0 ? {} : { page: String(next + 1) });
    // Back to the top of the list, so keyboard and screen reader users start at the new page.
    headingRef.current?.focus();
  };

  let content: ReactNode;
  if (result === null) {
    content = <SkeletonCards />;
  } else if (result.status === 'error') {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p role="alert" className="text-sm text-slate-700">
          {result.message}
        </p>
        <Button variant="primary" onClick={() => setReloadKey((key) => key + 1)}>
          ลองใหม่
        </Button>
      </div>
    );
  } else {
    const { items, page: meta } = result.data;
    content =
      items.length === 0 && meta.totalElements > 0 ? (
        // A page past the end, e.g. an old link after rounds closed.
        <EmptyState
          headingLevel={2}
          title="ไม่พบรอบรับสมัครในหน้านี้"
          action={
            <Link to="/open-calls" className={buttonClass('primary')}>
              กลับไปหน้าแรก
            </Link>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          headingLevel={2}
          icon={<CalendarDaysIcon className="size-6" />}
          title="ยังไม่มีรอบที่เปิดรับสมัครในขณะนี้"
          description="ลองกลับมาดูใหม่ภายหลัง หรือติดตามประกาศจากหน้าชมรมที่สนใจ"
        />
      ) : (
        <>
          <ul className={gridClass}>
            {items.map((call) => (
              <li key={call.id}>
                <OpenCallCard call={call} now={result.loadedAt} />
              </li>
            ))}
          </ul>
          {meta.totalPages > 1 && (
            <nav aria-label="เปลี่ยนหน้ารายการรอบรับสมัคร" className="flex items-center justify-between gap-3">
              <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>
                ก่อนหน้า
              </Button>
              <p className="text-sm text-slate-600">
                หน้า {page + 1} จาก {meta.totalPages}
              </p>
              <Button disabled={page >= meta.totalPages - 1} onClick={() => goToPage(page + 1)}>
                ถัดไป
              </Button>
            </nav>
          )}
        </>
      );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none sm:text-3xl"
        >
          รอบที่เปิดรับสมัคร
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          รวมรอบรับสมัครของทุกชมรมที่เปิดอยู่ตอนนี้ เรียงจากรอบที่ใกล้ปิดรับที่สุด
          {result?.status === 'ok' && result.data.page.totalElements > 0 && (
            <> · ทั้งหมด {result.data.page.totalElements} รอบ</>
          )}
        </p>
      </header>
      {content}
    </div>
  );
}
