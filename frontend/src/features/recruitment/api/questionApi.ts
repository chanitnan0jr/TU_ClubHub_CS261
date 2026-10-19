import type { ScreeningQuestionInput } from '../types/recruitment';

const API_BASE_URL = '/api/v1/recruitment-rounds';

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string>;
}

// Service ดึงข้อมูลคำถามคัดเลือก
export const fetchScreeningQuestions = async (roundId: string) => {
  const response = await fetch(`${API_BASE_URL}/${roundId}/questions`);
  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: 'ไม่สามารถโหลดข้อมูลคำถามคัดเลือกได้ กรุณาลองใหม่อีกครั้ง',
    }));
    throw new Error(errorData.message);
  }
  return response.json();
};

// Service บันทึก/แก้ไขคำถามคัดเลือก
export const updateScreeningQuestion = async (
  roundId: string,
  questionId: string,
  data: Partial<ScreeningQuestionInput>
) => {
  const response = await fetch(`${API_BASE_URL}/${roundId}/questions/${questionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล กรุณาตรวจสอบและลองอีกครั้ง',
    }));
    throw errorData;
  }

  return response.json();
};

// Service ลบคำถามคัดเลือก
export const deleteScreeningQuestion = async (roundId: string, questionId: string) => {
  const response = await fetch(`${API_BASE_URL}/${roundId}/questions/${questionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      message: 'ไม่สามารถลบคำถามได้ เนื่องจากมีผู้สมัครยื่นคำตอบในข้อนี้แล้ว',
    }));
    throw errorData;
  }

  return response.json();
};