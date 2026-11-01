import { apiRequest } from '../../../lib/api.ts';
import type { RoundWriteRequest } from '../utils/roundRequest.ts';

// The Round fields this client uses, from docs/api/rounds.openapi.yaml.
export interface SavedRound {
  id: string;
  clubId: string;
  version: number;
  publicationStatus: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
}

const roundsUrl = (clubId: string) => `/api/v1/clubs/${encodeURIComponent(clubId)}/rounds`;

// สร้างรอบเป็นฉบับร่างพร้อมคำถามคัดเลือก
export const createRound = (clubId: string, request: RoundWriteRequest) =>
  apiRequest<SavedRound>(roundsUrl(clubId), { method: 'POST', body: request });

// เผยแพร่รอบ ต้องส่ง version ล่าสุดของรอบ
export const publishRound = (clubId: string, roundId: string, version: number) =>
  apiRequest<SavedRound>(`${roundsUrl(clubId)}/${encodeURIComponent(roundId)}`, {
    method: 'PATCH',
    body: { action: 'PUBLISH', version },
  });
