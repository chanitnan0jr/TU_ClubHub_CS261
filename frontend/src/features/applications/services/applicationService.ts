export interface SubmitApplicationPayload {
  roundId: string;
  reason: string;
  answers: Array<{ questionId: string; answerText: string }>;
  documentTitle?: string;
  documentUrl?: string;
}

export const submitApplicationAPI = async (
  payload: SubmitApplicationPayload
): Promise<{ success: boolean; applicationId: string }> => {
  // จำลองการใช้ payload เพื่อไม่ให้เกิด Warning ts(6133)
  console.log('Submitting application payload:', payload);

  // จำลองการยิง API ไปยัง Backend /api/v1/applications (Delay 1.5 วินาที)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        applicationId: 'APP-' + Math.floor(100000 + Math.random() * 900000),
      });
    }, 1500);
  });
};