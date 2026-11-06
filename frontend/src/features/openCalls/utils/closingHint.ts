const DAY_MS = 24 * 60 * 60 * 1000;
// Asia/Bangkok is UTC+7 all year; Thailand has no daylight saving time.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const bangkokDay = (time: number) => Math.floor((time + BANGKOK_OFFSET_MS) / DAY_MS);

export interface ClosingHint {
  /** Bangkok calendar days from now to the last open moment; 0 means today. */
  days: number;
  label: string;
}

/**
 * Deadline hint for an open round, counted in Bangkok calendar days.
 * closesAt is exclusive, so a round closing at midnight closes "today".
 * Returns null when closesAt is invalid or has already passed.
 */
export function closingHint(closesAt: string, now: number): ClosingHint | null {
  const closes = new Date(closesAt).getTime();
  if (Number.isNaN(closes) || closes <= now) return null;

  const days = bangkokDay(closes - 1) - bangkokDay(now);
  return { days, label: days === 0 ? 'ปิดรับวันนี้' : `ปิดรับในอีก ${days} วัน` };
}
