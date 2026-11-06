import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { buttonClass } from '../../../components/ui/classes';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CalendarDaysIcon, CircleAlertIcon, CircleCheckIcon, XIcon } from '../../../components/ui/icons';
import { StatusBadge, type RoundStatus } from '../../../components/ui/StatusBadge';
import { useApiResource } from '../../../hooks/useApiResource';
import { ApiError, describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import { closeRound, listRounds, publishRound, type Round } from '../api/roundApi';
import { roundDisplayStatus, roundTermLabel } from '../utils/roundDisplay';

const PAGE_SIZE = 20;

type RoundAction = 'PUBLISH' | 'CLOSE';
type Message = { tone: 'success' | 'error'; text: string };

interface RoundListPageProps {
  clubId: string;
  /** Success text carried from the page that sent the user here, such as the edit page. */
  notice?: string | null;
}

interface RowProps {
  clubId: string;
  round: Round;
  status: RoundStatus;
  /** False for a draft whose closing time has passed: the backend refuses to publish it. */
  publishable: boolean;
  onAction: (action: RoundAction, round: Round) => void;
}

function RoundPeriod({ round }: { round: Round }) {
  return (
    <>
      <span className="block">{formatThaiDateTime(round.opensAt)}</span>
      <span className="block text-slate-600">ถึง {formatThaiDateTime(round.closesAt)}</span>
      {round.closedAt && (
        <span className="block text-slate-600">ปิดก่อนกำหนดเมื่อ {formatThaiDateTime(round.closedAt)}</span>
      )}
    </>
  );
}

// What a committee member can do depends on the display status: drafts are edited
// and published, an open round can be closed early, and every round's questions can be viewed.
function RoundActions({ clubId, round, status, publishable, onAction }: RowProps) {
  const base = `/clubs/${clubId}/rounds/${round.id}`;
  // Every row has the same buttons, so each name adds the round; it starts with the visible text.
  const named = (action: string) => `${action} ${round.title}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === 'DRAFT' && (
          <Link to={`${base}/edit`} aria-label={named('แก้ไข')} className={buttonClass('secondary')}>
            แก้ไข
          </Link>
        )}
        <Link to={`${base}/questions`} aria-label={named('คำถาม')} className={buttonClass('secondary')}>
          คำถาม
        </Link>
        {publishable && (
          <Button aria-label={named('เผยแพร่')} onClick={() => onAction('PUBLISH', round)}>
            เผยแพร่
          </Button>
        )}
        {status === 'OPEN' && (
          <Button aria-label={named('ปิดรับสมัคร')} onClick={() => onAction('CLOSE', round)}>
            ปิดรับสมัคร
          </Button>
        )}
      </div>
      {status === 'DRAFT' && !publishable && (
        <p className="text-xs leading-5 text-slate-600">เลยเวลาปิดรับแล้ว แก้ไขกำหนดการก่อนเผยแพร่</p>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <span className="sr-only">กำลังโหลดรอบรับสมัคร...</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden="true" className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

const dialogText: Record<RoundAction, { title: string; confirm: string; success: string; failure: string }> = {
  PUBLISH: {
    title: 'เผยแพร่รอบรับสมัคร',
    confirm: 'เผยแพร่',
    success: 'เผยแพร่รอบรับสมัครแล้ว',
    failure: 'เผยแพร่รอบรับสมัครไม่สำเร็จ กรุณาลองใหม่',
  },
  CLOSE: {
    title: 'ปิดรับสมัครก่อนกำหนด',
    confirm: 'ปิดรับสมัคร',
    success: 'ปิดรับสมัครแล้ว',
    failure: 'ปิดรับสมัครไม่สำเร็จ กรุณาลองใหม่',
  },
};

/** The club's rounds in every state, newest first, with publish and early-close actions. */
export function RoundListPage({ clubId, notice = null }: RoundListPageProps) {
  const [page, setPage] = useState(0);
  const rounds = useApiResource(`${clubId}:${page}`, () => listRounds(clubId, { page, size: PAGE_SIZE }));
  const [pending, setPending] = useState<{ action: RoundAction; round: Round } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(notice ? { tone: 'success', text: notice } : null);

  const runPending = async () => {
    if (!pending) return;
    const { action, round } = pending;
    const text = dialogText[action];
    setIsBusy(true);
    try {
      const saved = await (action === 'PUBLISH' ? publishRound : closeRound)(clubId, round.id, round.version);
      rounds.update((data) => ({ ...data, items: data.items.map((item) => (item.id === saved.id ? saved : item)) }));
      setMessage({ tone: 'success', text: `${text.success}: ${round.title}` });
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      setMessage({
        tone: 'error',
        text: describeApiError(error, text.failure) + (conflict ? ' (โหลดรายการล่าสุดให้แล้ว)' : ''),
      });
      // Someone else changed the round, so the row on screen is out of date.
      if (conflict) rounds.reload();
    } finally {
      setIsBusy(false);
      setPending(null);
    }
  };

  // Statuses are worked out for the time the list arrived.
  const { loadedAt } = rounds;
  const rows: RowProps[] = loadedAt
    ? (rounds.data?.items ?? []).map((round) => {
        const status = roundDisplayStatus(round, loadedAt);
        return {
          clubId,
          round,
          status,
          publishable: status === 'DRAFT' && loadedAt.getTime() < Date.parse(round.closesAt),
          onAction: (action, target) => setPending({ action, round: target }),
        };
      })
    : [];

  return (
    <div className="flex flex-col gap-4 pb-8">
      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-3 rounded-lg border py-2 pl-4 pr-2 text-sm font-medium ${
            message.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span className="flex items-start gap-2 py-2.5">
            {message.tone === 'error' ? <CircleAlertIcon className="mt-0.5 size-4" /> : <CircleCheckIcon className="mt-0.5 size-4" />}
            {message.text}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMessage(null)} aria-label="ปิดข้อความ">
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      {rounds.isLoading && <ListSkeleton />}

      {rounds.error !== undefined && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-white p-6">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
            <CircleAlertIcon className="mt-0.5 size-5" />
            {describeApiError(rounds.error, 'โหลดรายการรอบรับสมัครไม่สำเร็จ กรุณาลองใหม่')}
          </p>
          <Button onClick={rounds.reload}>ลองใหม่</Button>
        </div>
      )}

      {rounds.data && rounds.data.totalElements === 0 && (
        <EmptyState
          headingLevel={2}
          icon={<CalendarDaysIcon className="size-6" />}
          title="ยังไม่มีรอบรับสมัคร"
          description="สร้างรอบรับสมัครแรกของชมรม กำหนดช่วงเวลาและคำถามคัดเลือก แล้วเผยแพร่เมื่อพร้อม"
          action={
            <Link to={`/clubs/${clubId}/rounds/new`} className={buttonClass('secondary')}>
              สร้างรอบรับสมัคร
            </Link>
          }
        />
      )}

      {rounds.data && rounds.data.totalElements > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">รอบรับสมัครของชมรม เรียงจากรอบที่สร้างล่าสุด</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ชื่อรอบ</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">ปี/ภาค</th>
                  <th scope="col" className="px-4 py-3">ช่วงรับสมัคร</th>
                  <th scope="col" className="px-4 py-3">สถานะ</th>
                  <th scope="col" className="px-4 py-3">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {rows.map((row) => (
                  <tr key={row.round.id}>
                    <th scope="row" className="px-4 py-4 font-semibold text-slate-900">{row.round.title}</th>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-700">{roundTermLabel(row.round)}</td>
                    <td className="px-4 py-4 text-slate-700"><RoundPeriod round={row.round} /></td>
                    <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-4"><RoundActions {...row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden" aria-label="รอบรับสมัครของชมรม">
            {rows.map((row) => (
              <li key={row.round.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-base font-semibold text-slate-900">{row.round.title}</h2>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-slate-700">
                  <dt className="text-slate-600">ปี/ภาค</dt>
                  <dd>{roundTermLabel(row.round)}</dd>
                  <dt className="text-slate-600">ช่วงรับสมัคร</dt>
                  <dd><RoundPeriod round={row.round} /></dd>
                </dl>
                <RoundActions {...row} />
              </li>
            ))}
          </ul>

          {rounds.data.totalPages > 1 && (
            <nav aria-label="เปลี่ยนหน้ารายการรอบรับสมัคร" className="flex items-center justify-between gap-3">
              <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                ก่อนหน้า
              </Button>
              <p className="text-sm text-slate-600">
                หน้า {page + 1} จาก {rounds.data.totalPages}
              </p>
              <Button
                disabled={page >= rounds.data.totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                ถัดไป
              </Button>
            </nav>
          )}
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? dialogText[pending.action].title : ''}
        tone={pending?.action === 'CLOSE' ? 'danger' : 'primary'}
        confirmLabel={pending ? dialogText[pending.action].confirm : ''}
        busy={isBusy}
        onConfirm={() => void runPending()}
        onCancel={() => { if (!isBusy) setPending(null); }}
        description={
          pending?.action === 'CLOSE' ? (
            <p>
              รอบ “{pending.round.title}” จะ<strong className="font-semibold text-slate-900">หยุดรับใบสมัครใหม่ทันที</strong>
              ที่ยืนยัน ก่อนถึงกำหนดปิดเดิม {formatThaiDateTime(pending.round.closesAt)} ใบสมัครที่ส่งมาแล้วยังอยู่ครบ
              และเปิดรับสมัครรอบนี้อีกครั้งไม่ได้
            </p>
          ) : pending ? (
            <p>
              รอบ “{pending.round.title}” จะแสดงให้นักศึกษาเห็น และเปิดรับใบสมัครตั้งแต่{' '}
              {formatThaiDateTime(pending.round.opensAt)} ถึง {formatThaiDateTime(pending.round.closesAt)}{' '}
              หลังเผยแพร่จะแก้ไขข้อมูลรอบไม่ได้อีก
            </p>
          ) : undefined
        }
      />
    </div>
  );
}
