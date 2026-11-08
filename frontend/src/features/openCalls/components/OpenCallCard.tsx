import { useId } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '../../../components/ui/classes';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatThaiDateTime } from '../../../lib/format';
import { ClubLogo } from '../../clubs/components/ClubLogo';
import type { PublicOpenCall } from '../types/openCall';
import { closingHint } from '../utils/closingHint';

interface OpenCallCardProps {
  call: PublicOpenCall;
  /** Instant the list was loaded; the deadline hint is counted from it. */
  now: number;
}

export function OpenCallCard({ call, now }: OpenCallCardProps) {
  const headingId = useId();
  const { club } = call;
  const hint = closingHint(call.closesAt, now);

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center gap-3">
        <div className="size-12 shrink-0 rounded-lg border border-slate-200 bg-white p-0.5">
          <ClubLogo src={club.imageUrl} clubName={club.name} iconClassName="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{club.name}</p>
          <span className="mt-1 inline-block max-w-full truncate rounded-md bg-tu-maroon-50 px-2 py-0.5 text-xs font-medium text-tu-maroon">
            {club.category.name}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="OPEN" />
        {hint && (
          <span
            className={`text-xs font-medium ${hint.days <= 3 ? 'text-amber-800' : 'text-slate-600'}`}
          >
            {hint.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          {call.name}
        </h2>
        {call.description.trim() && (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">{call.description}</p>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-slate-600">รับสมัคร</dt>
        {/* Each date stays on one line; a narrow card breaks the period at the dash. */}
        <dd className="text-slate-800">
          <span className="whitespace-nowrap">{formatThaiDateTime(call.opensAt)}</span> –{' '}
          <span className="whitespace-nowrap">{formatThaiDateTime(call.closesAt)}</span>
        </dd>
        {call.resultsScheduledAt && (
          <>
            <dt className="text-slate-600">ประกาศผล</dt>
            <dd className="text-slate-800">{formatThaiDateTime(call.resultsScheduledAt)}</dd>
          </>
        )}
      </dl>

      {/* Every card has the same two links; the labels say which round and club they open. */}
      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        <Link
          to={`/clubs/${club.id}/rounds/${call.id}/apply`}
          aria-label={`สมัคร ${call.name}`}
          className={`${buttonClass('primary')} sm:flex-1`}
        >
          สมัคร
        </Link>
        <Link
          to={`/clubs/${club.id}`}
          aria-label={`ดูรายละเอียดชมรม ${club.name}`}
          className={`${buttonClass('secondary')} sm:flex-1`}
        >
          ดูรายละเอียดชมรม
        </Link>
      </div>
    </article>
  );
}
