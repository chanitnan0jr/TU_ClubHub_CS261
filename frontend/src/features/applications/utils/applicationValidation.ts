import type {
  ApplicationFormData,
  ApplicationFormErrors,
} from '../types/applicationForm.ts';
import type {
  ApplicationFormQuestion,
  SubmitApplicationPayload,
} from '../services/applicationService.ts';

const characterLength = (value: string) => Array.from(value).length;
const isBlank = (value: string) => value.trim().length === 0;

function isValidHttpsUrl(value: string): boolean {
  if (
    characterLength(value) > 2048 ||
    /\s/u.test(value) ||
    Array.from(value, (character) => character.codePointAt(0) ?? 0).some(
      (codePoint) => codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f),
    )
  ) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

export function validateApplicationForm(
  form: ApplicationFormData,
  questions: ApplicationFormQuestion[],
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};

  if (isBlank(form.motivation)) {
    errors.motivation = 'กรุณาระบุเหตุผลที่สนใจเข้าร่วมชมรมนี้';
  } else if (characterLength(form.motivation) > 2000) {
    errors.motivation = 'กรุณากรอกไม่เกิน 2,000 ตัวอักษร';
  }

  const answerErrors: Record<string, string> = {};
  for (const question of questions) {
    const answer = form.answers[question.id] ?? '';
    if (question.isRequired && isBlank(answer)) {
      answerErrors[question.id] = 'กรุณากรอกคำตอบสำหรับคำถามข้อนี้';
    } else if (!isBlank(answer) && characterLength(answer) > question.maxLength) {
      answerErrors[question.id] =
        `กรุณากรอกคำตอบไม่เกิน ${question.maxLength.toLocaleString('th-TH')} ตัวอักษร`;
    }
  }
  if (Object.keys(answerErrors).length > 0) errors.answers = answerErrors;

  const linkErrors: NonNullable<ApplicationFormErrors['links']> = {};
  const nonEmptyLinks = form.links.filter(
    (link) => !isBlank(link.label) || !isBlank(link.url),
  );
  if (nonEmptyLinks.length > 5) {
    for (const link of nonEmptyLinks.slice(5)) {
      linkErrors[link.id] = {
        label: 'แนบเอกสารได้สูงสุด 5 รายการ',
        url: 'แนบเอกสารได้สูงสุด 5 รายการ',
      };
    }
  }

  for (const link of nonEmptyLinks) {
    const itemErrors: { label?: string; url?: string } = {};
    if (isBlank(link.label)) {
      itemErrors.label = 'กรุณาระบุชื่อเอกสาร';
    } else if (characterLength(link.label) > 200) {
      itemErrors.label = 'กรุณาระบุชื่อเอกสารไม่เกิน 200 ตัวอักษร';
    }

    if (!isValidHttpsUrl(link.url)) {
      itemErrors.url =
        'กรุณาระบุ URL HTTPS ที่ถูกต้องและไม่มีข้อมูลชื่อผู้ใช้หรือรหัสผ่าน';
    }

    if (Object.keys(itemErrors).length > 0) {
      linkErrors[link.id] = { ...linkErrors[link.id], ...itemErrors };
    }
  }
  if (Object.keys(linkErrors).length > 0) errors.links = linkErrors;

  return errors;
}

export function toApplicationSubmissionPayload(
  form: ApplicationFormData,
  questions: ApplicationFormQuestion[],
): SubmitApplicationPayload {
  return {
    motivation: form.motivation.trim(),
    answers: questions.flatMap((question) => {
      const answerText = form.answers[question.id]?.trim() ?? '';
      return answerText ? [{ questionId: question.id, answerText }] : [];
    }),
    links: form.links.flatMap((link) => {
      const label = link.label.trim();
      const url = link.url.trim();
      return label && url ? [{ label, url }] : [];
    }),
  };
}
