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

  if (!data.isUnlimitedCapacity) {
    if (data.capacity === null || data.capacity <= 0) {
      errors.capacity = 'กรุณาระบุจำนวนที่รับเป็นตัวเลขที่มากกว่า 0';
    }
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

  if (data.confirmationStartDate && data.confirmationEndDate) {
    const startConf = new Date(data.confirmationStartDate);
    const endConf = new Date(data.confirmationEndDate);

    if (endConf < startConf) {
      errors.confirmationDates = 'วันสิ้นสุดการยืนยันสิทธิ์ต้องไม่เกิดก่อนวันเริ่มต้น';
    }
  }

  const emptyQuestions = data.questions.some((q) => !q.questionText.trim());
  if (emptyQuestions) {
    errors.questions = 'กรุณากรอกข้อความคำถามคัดเลือกให้ครบถ้วน หรือลบข้อที่ไม่ใช้ออก';
  }

  return errors;
};