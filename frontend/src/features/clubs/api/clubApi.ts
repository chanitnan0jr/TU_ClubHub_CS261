import type { ClubResponseDto, ClubUpdateRequestDto, ApiProblemResponse } from '../types/club';
// ดึง CSRF Token สำหรับใช้ใน Request PUT ตามสเปก Security
export const getCsrfToken = async (): Promise<{ headerName: string; token: string }> => {
  const response = await fetch('/api/v1/auth/csrf', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('ไม่สามารถดึง CSRF Token ได้');
  }
  return response.json();
};

// GET: ดึงข้อมูลเดิมของชมรมมาแสดงในฟอร์ม
// Backend ยังไม่มี GET /api/v1/clubs/{clubId} สำหรับกรรมการ จึงโหลดจากโปรไฟล์สาธารณะ
// ซึ่งมีครบทุกฟิลด์ที่ PUT แก้ไขได้ (ชมรมที่ไม่ ACTIVE จะตอบ 404)
export const getClubProfile = async (clubId: string): Promise<ClubResponseDto> => {
  const response = await fetch(`/api/v1/public/clubs/${encodeURIComponent(clubId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('ไม่พบชมรมนี้ หรือชมรมยังไม่เปิดใช้งาน');
    }
    const errorData: ApiProblemResponse = await response.json().catch(() => ({}) as ApiProblemResponse);
    throw new Error(errorData.detail || 'ไม่สามารถโหลดข้อมูลชมรมได้');
  }

  return response.json();
};

// PUT: ส่งข้อมูลอัปเดตไปบันทึกที่ Backend
export const updateClubProfile = async (
  clubId: string,
  data: ClubUpdateRequestDto
): Promise<ClubResponseDto> => {
  const csrf = await getCsrfToken();

  const response = await fetch(`/api/v1/clubs/${clubId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ApiProblemResponse = await response.json().catch(() => ({}) as ApiProblemResponse);

    if (response.status === 401) {
      throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    }

    if (response.status === 403) {
      if (errorData.code === 'CSRF_INVALID') {
        throw new Error('CSRF Token ไม่ถูกต้องหรือหมดอายุ');
      }
      throw new Error('คุณไม่มีสิทธิ์แก้ไขข้อมูลชมรมนี้ (Require Club Committee)');
    }

    if (response.status === 400 && errorData.fieldErrors) {
      const fieldMsgs = errorData.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', ');
      throw new Error(`ข้อมูลไม่ถูกต้อง: ${fieldMsgs}`);
    }

    throw new Error(errorData.detail || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  }

  return response.json();
};