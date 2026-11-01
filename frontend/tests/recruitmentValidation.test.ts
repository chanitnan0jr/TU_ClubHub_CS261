import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateRecruitmentRoundForm,
} from '../src/features/recruitment/utils/recruitmentValidation.ts'
import type { RecruitmentRoundFormInput } from '../src/features/recruitment/types/recruitment.ts'

function validForm(
  overrides: Partial<RecruitmentRoundFormInput> = {},
): RecruitmentRoundFormInput {
  return {
    title: 'รอบรับสมัครตัวอย่าง',
    academicYear: 2569,
    semester: 'SEMESTER_1',
    description: 'รายละเอียดและคุณสมบัติผู้สมัคร',
    openAt: '2026-11-01T09:00',
    closeAt: '2026-11-10T17:00',
    announcementDate: '2026-11-15',
    confirmationDeadline: '2026-11-20',
    questions: [
      { questionText: 'เหตุใดจึงสนใจเข้าร่วมชมรม?', isRequired: true, orderIndex: 0 },
    ],
    ...overrides,
  }
}

test('requires title, academic year, semester, description, and application dates', () => {
  assert.deepEqual(
    validateRecruitmentRoundForm(
      validForm({
        title: '  ',
        academicYear: null,
        semester: '',
        description: '\n',
        openAt: '',
        closeAt: '',
      }),
    ),
    {
      title: 'กรุณาระบุชื่อรอบรับสมัคร',
      academicYear: 'กรุณาระบุปีการศึกษา',
      semester: 'กรุณาเลือกภาคเรียน',
      description: 'กรุณาระบุรายละเอียด/คุณสมบัติผู้สมัคร',
      openAt: 'กรุณาระบุวัน-เวลา เปิดรับสมัคร',
      closeAt: 'กรุณาระบุวัน-เวลา ปิดรับสมัคร',
    },
  )
})

test('requires closing date to be after opening date', () => {
  assert.equal(
    'closeAt' in
      validateRecruitmentRoundForm(
        validForm({
          openAt: '2026-11-10T17:00',
          closeAt: '2026-11-10T17:00',
        }),
      ),
    true,
  )
})

test('does not allow announcement before applications close', () => {
  assert.equal(
    'announcementDate' in
      validateRecruitmentRoundForm(
        validForm({
          closeAt: '2026-11-10T17:00',
          announcementDate: '2026-11-09',
        }),
      ),
    true,
  )
})

test('requires a confirmation deadline after closing and on or after the announcement', () => {
  assert.equal(
    validateRecruitmentRoundForm(validForm({ confirmationDeadline: '' })).confirmationDeadline,
    'กรุณาระบุวันสุดท้ายของการยืนยันสิทธิ์',
  )
  assert.equal(
    validateRecruitmentRoundForm(
      validForm({ closeAt: '2026-11-21T09:00', announcementDate: '', confirmationDeadline: '2026-11-20' }),
    ).confirmationDeadline,
    'วันสุดท้ายของการยืนยันสิทธิ์ต้องอยู่หลังวันปิดรับสมัคร',
  )
  assert.equal(
    validateRecruitmentRoundForm(
      validForm({ announcementDate: '2026-11-21', confirmationDeadline: '2026-11-20' }),
    ).confirmationDeadline,
    'วันสุดท้ายของการยืนยันสิทธิ์ต้องไม่เกิดก่อนวันประกาศผล',
  )
  assert.equal(
    'confirmationDeadline' in
      validateRecruitmentRoundForm(validForm({ announcementDate: '2026-11-20', confirmationDeadline: '2026-11-20' })),
    false,
  )
})

test('rejects blank screening question text and accepts a valid form', () => {
  assert.deepEqual(validateRecruitmentRoundForm(validForm()), {})
  assert.equal(
    'questions' in
      validateRecruitmentRoundForm(
        validForm({
          questions: [
            { questionText: '   ', isRequired: true, orderIndex: 0 },
          ],
        }),
      ),
    true,
  )
})
