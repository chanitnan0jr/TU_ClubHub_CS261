export interface SubmitApplicationPayload {
  roundId: string;
  reason: string;
  answers: {
    questionId: string;
    answerText: string;
  }[];
  documentTitle?: string;
  documentUrl?: string;
}

export interface SubmitApplicationResponse {
  success: boolean;
  message: string;
  applicationId?: string;
}

export const submitApplicationAPI = async (
  payload: SubmitApplicationPayload
): Promise<SubmitApplicationResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Submitting application payload:', payload);
      resolve({
        success: true,
        message: 'ส่งใบสมัครสำเร็จเรียบร้อยแล้ว',
        applicationId: 'APP-' + Math.floor(100000 + Math.random() * 900000),
      });
    }, 1500);
  });
};