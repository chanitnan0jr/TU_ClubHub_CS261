import { apiRequest } from '../../../lib/api';
import type { PublicOpenRound, PublicOpenRoundPage } from '../types/club';

/** The club endpoint sorts by opening time, so inspect every page for the earliest close. */
export async function earliestOpenRound(clubId: string, signal: AbortSignal): Promise<PublicOpenRound | null> {
  let earliest: PublicOpenRound | null = null;
  let page = 0;
  let totalPages: number;
  do {
    const result = await apiRequest<PublicOpenRoundPage>(
      `/api/v1/public/clubs/${encodeURIComponent(clubId)}/recruitment-rounds?page=${page}&size=100`,
      { signal, notifyAuthFailure: false },
    );
    for (const round of result.items) {
      const close = Date.parse(round.closesAt);
      if (Number.isFinite(close) && (!earliest || close < Date.parse(earliest.closesAt))) earliest = round;
    }
    totalPages = result.page.totalPages;
    page += 1;
  } while (page < totalPages);
  return earliest;
}

/** Remaining duration rounded up so the label never says zero before the deadline. */
export function recruitmentCountdown(closesAt: string, now: number): string | null {
  const remaining = Date.parse(closesAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const hours = Math.ceil(remaining / 3_600_000);
  return remaining < 86_400_000
    ? `ปิดรับสมัครในอีก ${hours} ชั่วโมง`
    : `ปิดรับสมัครในอีก ${Math.ceil(remaining / 86_400_000)} วัน`;
}
