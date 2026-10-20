import { apiRequest } from '../../../lib/api.ts';

// Shape of ApplicationQuestion in docs/api/rounds.openapi.yaml. IDs are decimal
// strings, and displayOrder starts at 1.
export interface ScreeningQuestion {
  id: string;
  roundId: string;
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface ScreeningQuestionDraft {
  questionText: string;
  isRequired: boolean;
}

interface ScreeningQuestionList {
  items: ScreeningQuestion[];
}

const questionsUrl = (roundId: string) =>
  `/api/v1/rounds/${encodeURIComponent(roundId)}/questions`;

const questionUrl = (roundId: string, questionId: string) =>
  `${questionsUrl(roundId)}/${encodeURIComponent(questionId)}`;

// ดึงคำถามคัดเลือกของรอบ เรียงตาม displayOrder
export const fetchScreeningQuestions = async (roundId: string): Promise<ScreeningQuestion[]> => {
  const list = await apiRequest<ScreeningQuestionList>(questionsUrl(roundId));
  return list.items;
};

// เพิ่มคำถามต่อท้ายรอบ
export const createScreeningQuestion = (roundId: string, draft: ScreeningQuestionDraft) =>
  apiRequest<ScreeningQuestion>(questionsUrl(roundId), { method: 'POST', body: draft });

// แก้ไขข้อความและสถานะจำเป็นต้องตอบ (ต้องส่งครบทั้งสองฟิลด์)
export const updateScreeningQuestion = (
  roundId: string,
  questionId: string,
  draft: ScreeningQuestionDraft,
) => apiRequest<ScreeningQuestion>(questionUrl(roundId, questionId), { method: 'PUT', body: draft });

// ลบคำถาม (204 ไม่มี body)
export const deleteScreeningQuestion = (roundId: string, questionId: string) =>
  apiRequest<void>(questionUrl(roundId, questionId), { method: 'DELETE' });

// จัดลำดับใหม่ ต้องส่ง ID ของทุกคำถามในรอบ
export const reorderScreeningQuestions = async (
  roundId: string,
  questionIds: string[],
): Promise<ScreeningQuestion[]> => {
  const list = await apiRequest<ScreeningQuestionList>(`${questionsUrl(roundId)}/order`, {
    method: 'PUT',
    body: { questionIds },
  });
  return list.items;
};
