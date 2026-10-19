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
    capacity: 30,
    isUnlimitedCapacity: false,
    description: 'รายละเอียดและคุณสมบัติผู้สมัคร',
    openAt: '2026-11-01T09:00',
    closeAt: '2026-11-10T17:00',
    announcementDate: '2026-11-15',
    confirmationStartDate: '2026-11-16',
    confirmationEndDate: '2026-11-20',
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

test('requires positive capacity unless capacity is unlimited', () => {
  assert.equal(
    'capacity' in validateRecruitmentRoundForm(validForm({ capacity: null })),
    true,
  )
  assert.equal(
    'capacity' in validateRecruitmentRoundForm(validForm({ capacity: 0 })),
    true,
  )
  assert.equal(
    'capacity' in
      validateRecruitmentRoundForm(
        validForm({ isUnlimitedCapacity: true, capacity: null }),
      ),
    false,
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

test('does not allow confirmation to end before it starts', () => {
  assert.equal(
    'confirmationDates' in
      validateRecruitmentRoundForm(
        validForm({
          confirmationStartDate: '2026-11-20',
          confirmationEndDate: '2026-11-19',
        }),
      ),
    true,
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
