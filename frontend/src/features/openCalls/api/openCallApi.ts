import { apiRequest } from '../../../lib/api';
import type { PublicOpenCallPage } from '../types/openCall';

/** Rounds open now across all active clubs, soonest deadline first. `page` is zero-based. */
export const listOpenCalls = (page: number, size: number): Promise<PublicOpenCallPage> =>
  apiRequest(`/api/v1/public/recruitment-rounds?page=${page}&size=${size}`);
