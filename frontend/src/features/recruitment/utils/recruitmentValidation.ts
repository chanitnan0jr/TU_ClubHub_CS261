import type { RecruitmentRoundFormInput, FormValidationError } from '../types/recruitment';

export const validateRecruitmentRoundForm = (
  data: RecruitmentRoundFormInput
): FormValidationError => {
  const errors: FormValidationError = {};

  if (!data.title.trim()) {
    errors.title = 'กรุณาระบุชื่อรอบรับสมัคร';
  }

  if (!data.academicYear) {
    errors.academicYear = 'กรุณาระบุปีการศึกษา';
  }

  if (!data.semester) {
    errors.semester = 'กรุณาเลือกภาคเรียน';
  }

  if (!data.description.trim()) {
    errors.description = 'กรุณาระบุรายละเอียด/คุณสมบัติผู้สมัคร';
  }

  if (!data.openAt) {
    errors.openAt = 'กรุณาระบุวัน-เวลา เปิดรับสมัคร';
  }

  if (!data.closeAt) {
    errors.closeAt = 'กรุณาระบุวัน-เวลา ปิดรับสมัคร';
  }

  if (data.openAt && data.closeAt) {
    const openDate = new Date(data.openAt);
    const closeDate = new Date(data.closeAt);

    if (closeDate <= openDate) {
      errors.closeAt = 'วันปิดรับสมัครต้องอยู่หลังจากวันเปิดรับสมัคร';
    }
  }

  if (data.announcementDate && data.closeAt) {
    const closeDate = new Date(data.closeAt);
    const announceDate = new Date(data.announcementDate);
    closeDate.setHours(0, 0, 0, 0);

    if (announceDate < closeDate) {
      errors.announcementDate = 'วันประกาศผลต้องไม่เกิดก่อนวันปิดรับสมัคร';
    }
  }

  // The API needs a confirmation deadline after closing and after any announcement.
  if (!data.confirmationDeadline) {
    errors.confirmationDeadline = 'กรุณาระบุวันสุดท้ายของการยืนยันสิทธิ์';
  } else {
    const deadline = new Date(`${data.confirmationDeadline}T23:59:59`);

    if (data.closeAt && deadline <= new Date(data.closeAt)) {
      errors.confirmationDeadline = 'วันสุดท้ายของการยืนยันสิทธิ์ต้องอยู่หลังวันปิดรับสมัคร';
    } else if (data.announcementDate && data.announcementDate > data.confirmationDeadline) {
      errors.confirmationDeadline = 'วันสุดท้ายของการยืนยันสิทธิ์ต้องไม่เกิดก่อนวันประกาศผล';
    }
  }

  const emptyQuestions = data.questions.some((q) => !q.questionText.trim());
  if (emptyQuestions) {
    errors.questions = 'กรุณากรอกข้อความคำถามคัดเลือกให้ครบถ้วน หรือลบข้อที่ไม่ใช้ออก';
  }

  return errors;
};