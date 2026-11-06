/**
 * Display state of a recruitment round. The API stores DRAFT / PUBLISHED / CANCELLED;
 * a published round shows as UPCOMING, OPEN or CLOSED depending on its dates and closedAt.
 */
export type RoundStatus = 'DRAFT' | 'UPCOMING' | 'OPEN' | 'CLOSED' | 'CANCELLED';

const badges: Record<RoundStatus, { label: string; className: string; dot: string }> = {
  DRAFT: { label: 'ร่าง', className: 'bg-white text-slate-700 ring-slate-300', dot: 'bg-slate-400' },
  UPCOMING: { label: 'ยังไม่เปิด', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  OPEN: { label: 'เปิดรับสมัคร', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'ปิดรับแล้ว', className: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' },
  CANCELLED: { label: 'ยกเลิก', className: 'bg-red-50 text-red-800 ring-red-200', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: RoundStatus }) {
  const badge = badges[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badge.className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}
