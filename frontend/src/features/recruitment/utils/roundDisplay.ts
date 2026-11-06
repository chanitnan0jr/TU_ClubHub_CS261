import type { RoundStatus } from '../../../components/ui/StatusBadge';
import { formatThaiDateTime } from '../../../lib/format.ts';
import type { Round } from '../api/roundApi.ts';

type StatusFields = Pick<Round, 'publicationStatus' | 'opensAt' | 'closesAt' | 'closedAt'>;

/**
 * Display state of a round at `now`. A published round is open from opensAt
 * (inclusive) to closesAt (exclusive), the same window the backend accepts
 * applications in, unless a committee member closed it early (closedAt).
 */
export function roundDisplayStatus(round: StatusFields, now: Date = new Date()): RoundStatus {
  if (round.publicationStatus !== 'PUBLISHED') return round.publicationStatus;
  const time = now.getTime();
  if (round.closedAt !== null || time >= Date.parse(round.closesAt)) return 'CLOSED';
  if (time < Date.parse(round.opensAt)) return 'UPCOMING';
  return 'OPEN';
}

/** Semester and Buddhist-era academic year, e.g. "1/2569" or "ฤดูร้อน/2569". */
export const roundTermLabel = (round: Pick<Round, 'semester' | 'academicYear'>) =>
  `${round.semester === 3 ? 'ฤดูร้อน' : round.semester}/${round.academicYear}`;

/** Application window in Thai, Bangkok time. */
export const roundPeriodLabel = (round: Pick<Round, 'opensAt' | 'closesAt'>) =>
  `${formatThaiDateTime(round.opensAt)} – ${formatThaiDateTime(round.closesAt)}`;
