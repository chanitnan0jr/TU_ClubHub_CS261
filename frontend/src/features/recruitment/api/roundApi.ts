import { apiRequest } from '../../../lib/api.ts';
import type { RoundWriteRequest } from '../utils/roundRequest.ts';

export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

// Round in docs/api/rounds.openapi.yaml. IDs are decimal strings and instants
// are ISO 8601 UTC.
export interface Round {
  id: string;
  clubId: string;
  title: string;
  academicYear: number;
  semester: number;
  description: string;
  eligibilityText: string | null;
  opensAt: string;
  closesAt: string;
  confirmationDeadline: string;
  resultsScheduledAt: string | null;
  publicationStatus: PublicationStatus;
  closedAt: string | null;
  publishedAt: string | null;
  resultsPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  questions: {
    id: string;
    prompt: string;
    required: boolean;
    displayOrder: number;
    maxLength: number;
  }[];
}

// RoundPage: zero-based page of rounds, newest first.
export interface RoundPage {
  items: Round[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// RoundReplace: every RoundWrite field plus the version being replaced.
export type RoundReplaceRequest = RoundWriteRequest & { version: number };

const roundsUrl = (clubId: string) => `/api/v1/clubs/${encodeURIComponent(clubId)}/rounds`;
const roundUrl = (clubId: string, roundId: string) =>
  `${roundsUrl(clubId)}/${encodeURIComponent(roundId)}`;

// รอบทุกสถานะของชมรม (รวมฉบับร่าง) เรียงจากรอบที่สร้างล่าสุด size ได้ 1-100
export const listRounds = (clubId: string, { page = 0, size = 20 }: { page?: number; size?: number } = {}) =>
  apiRequest<RoundPage>(`${roundsUrl(clubId)}?${new URLSearchParams({ page: String(page), size: String(size) })}`);

// รอบเดียวพร้อมคำถาม ใช้ version ของผลลัพธ์กับ PUT และ PATCH
export const getRound = (clubId: string, roundId: string) => apiRequest<Round>(roundUrl(clubId, roundId));

// สร้างรอบเป็นฉบับร่างพร้อมคำถามคัดเลือก
export const createRound = (clubId: string, request: RoundWriteRequest) =>
  apiRequest<Round>(roundsUrl(clubId), { method: 'POST', body: request });

// แทนที่ข้อมูลทั้งรอบ (รวมคำถาม) ได้เฉพาะฉบับร่างที่ยังไม่มีใบสมัคร ต้องส่ง version ล่าสุด
export const updateRound = (clubId: string, roundId: string, request: RoundReplaceRequest) =>
  apiRequest<Round>(roundUrl(clubId, roundId), { method: 'PUT', body: request });

// เผยแพร่รอบ ต้องส่ง version ล่าสุดของรอบ
export const publishRound = (clubId: string, roundId: string, version: number) =>
  apiRequest<Round>(roundUrl(clubId, roundId), {
    method: 'PATCH',
    body: { action: 'PUBLISH', version },
  });

// ปิดรับสมัครก่อนกำหนด ได้เฉพาะรอบที่เผยแพร่และกำลังเปิดรับอยู่
export const closeRound = (clubId: string, roundId: string, version: number) =>
  apiRequest<Round>(roundUrl(clubId, roundId), {
    method: 'PATCH',
    body: { action: 'CLOSE', version },
  });
