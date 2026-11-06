import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Field } from '../../../components/ui/Field';
import { CircleAlertIcon } from '../../../components/ui/icons';
import { SectionCard } from '../../../components/ui/SectionCard';
import type {
  RecruitmentRoundFormInput,
  FormValidationError,
  ScreeningQuestionInput,
  Semester,
} from '../types/recruitment';
import { validateRecruitmentRoundForm } from '../utils/recruitmentValidation';
import { DateTimePicker } from './DateTimePicker';
import { QuestionInputRow } from './QuestionInputRow';

interface RecruitmentRoundFormProps {
  initialValues?: Partial<RecruitmentRoundFormInput>;
  /** "edit" saves a draft in place with one button; publishing is done from the round list. */
  mode?: 'create' | 'edit';
  onSubmit: (data: RecruitmentRoundFormInput, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitError?: string | null;
}

// Buddhist-era academic years around the current one.
const currentAcademicYear = new Date().getFullYear() + 543;
const academicYearOptions = [currentAcademicYear - 1, currentAcademicYear, currentAcademicYear + 1];

const defaultFormInput: RecruitmentRoundFormInput = {
  title: '',
  academicYear: currentAcademicYear,
  semester: 'SEMESTER_1',
  description: '',
  openAt: '',
  closeAt: '',
  announcementDate: '',
  confirmationDeadline: '',
  questions: [
    { questionText: 'เพราะเหตุใดคุณจึงสนใจเข้าร่วมชมรมอาสาพัฒนา?', isRequired: true, orderIndex: 0 },
    { questionText: 'คุณมีทักษะหรือประสบการณ์ใดที่อยากนำมาช่วยชมรม?', isRequired: true, orderIndex: 1 },
  ],
};

const withQuestionOrder = (
  questions: ScreeningQuestionInput[],
): ScreeningQuestionInput[] =>
  questions.map((question, orderIndex) => ({ ...question, orderIndex }));

export const RecruitmentRoundForm = ({
  initialValues,
  mode = 'create',
  onSubmit,
  onCancel,
  isLoading = false,
  submitError = null,
}: RecruitmentRoundFormProps) => {
  const [formData, setFormData] = useState<RecruitmentRoundFormInput>({
    ...defaultFormInput,
    ...initialValues,
    questions: withQuestionOrder(
      initialValues?.questions ?? defaultFormInput.questions,
    ),
  });

  const [errors, setErrors] = useState<FormValidationError>({});

  // A round being edited may use a year outside the default range; keep it selectable.
  const yearOptions =
    initialValues?.academicYear && !academicYearOptions.includes(initialValues.academicYear)
      ? [...academicYearOptions, initialValues.academicYear].sort((a, b) => a - b)
      : academicYearOptions;

  const updateField = <K extends keyof RecruitmentRoundFormInput>(
    field: K,
    value: RecruitmentRoundFormInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddQuestion = () => {
    const newQuestion: ScreeningQuestionInput = {
      questionText: '',
      isRequired: true,
      orderIndex: formData.questions.length,
    };
    updateField('questions', [...formData.questions, newQuestion]);
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...formData.questions];
    updated[index].questionText = text;
    updateField('questions', updated);
  };

  const handleToggleQuestionRequired = (index: number) => {
    const updated = [...formData.questions];
    updated[index].isRequired = !updated[index].isRequired;
    updateField('questions', updated);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = formData.questions.filter((_, i) => i !== index);
    updateField('questions', withQuestionOrder(updated));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.questions.length) return;

    const updated = [...formData.questions];
    const movedQuestion = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = movedQuestion;
    updateField('questions', withQuestionOrder(updated));
  };

  // The API needs every round field even for a draft, so drafts are validated too.
  const handleSubmit = async (isDraft: boolean) => {
    const validationErrors = validateRecruitmentRoundForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});
    await onSubmit(formData, isDraft);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {errorCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          <CircleAlertIcon className="mt-0.5 size-5" />
          <span>ยังบันทึกข้อมูลไม่ได้ พบข้อผิดพลาด {errorCount} จุด กรุณาตรวจสอบข้อมูล</span>
        </div>
      )}

      {submitError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          <CircleAlertIcon className="mt-0.5 size-5" />
          <span>{submitError}</span>
        </div>
      )}

      <form className="flex flex-col gap-6">
        <SectionCard
          number={1}
          title="ข้อมูลรอบรับสมัคร"
          description="ระบุข้อมูลที่จะแสดงให้นักศึกษาเห็นในหน้ารับสมัคร"
        >
          <Field id="round-title" label="ชื่อรอบรับสมัคร" required error={errors.title}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="เช่น รอบรับสมัครสมาชิกใหม่ ประจำภาคเรียนที่ 1/2567"
                className={inputClass(Boolean(errors.title))}
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="round-academic-year" label="ปีการศึกษา" required error={errors.academicYear}>
              {(control) => (
                <select
                  {...control}
                  value={formData.academicYear || ''}
                  onChange={(e) => updateField('academicYear', Number(e.target.value))}
                  className={inputClass(Boolean(errors.academicYear))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field id="round-semester" label="ภาคเรียน" required error={errors.semester}>
              {(control) => (
                <select
                  {...control}
                  value={formData.semester}
                  onChange={(e) => updateField('semester', e.target.value as Semester)}
                  className={inputClass(Boolean(errors.semester))}
                >
                  <option value="SEMESTER_1">ภาคเรียนที่ 1</option>
                  <option value="SEMESTER_2">ภาคเรียนที่ 2</option>
                  <option value="SUMMER">ภาคฤดูร้อน</option>
                </select>
              )}
            </Field>
          </div>

          <Field id="round-description" label="รายละเอียด/คุณสมบัติผู้สมัคร" required error={errors.description}>
            {(control) => (
              <textarea
                {...control}
                rows={4}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="นักศึกษามหาวิทยาลัยธรรมศาสตร์ทุกชั้นปี สนใจงานอาสา สามารถเข้าร่วมกิจกรรมและทำงานเป็นทีมได้"
                className={inputClass(Boolean(errors.description))}
              />
            )}
          </Field>
        </SectionCard>

        <SectionCard
          number={2}
          title="กำหนดการรับสมัคร"
          description="เวลาในประเทศไทย (GMT+7) • เวลา 00:00-23:59 น."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateTimePicker
              id="round-open-at"
              label="วัน-เวลา เปิดรับสมัคร"
              required
              value={formData.openAt}
              onChange={(val) => updateField('openAt', val)}
              error={errors.openAt}
            />
            <DateTimePicker
              id="round-close-at"
              label="วัน-เวลา ปิดรับสมัคร"
              required
              value={formData.closeAt}
              onChange={(val) => updateField('closeAt', val)}
              error={errors.closeAt}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="round-announcement-date" label="วันประกาศผล" error={errors.announcementDate}>
              {(control) => (
                <input
                  {...control}
                  type="date"
                  value={formData.announcementDate}
                  onChange={(e) => updateField('announcementDate', e.target.value)}
                  className={inputClass(Boolean(errors.announcementDate))}
                />
              )}
            </Field>

            <Field
              id="round-confirmation-deadline"
              label="วันสุดท้ายของการยืนยันสิทธิ์"
              required
              hint="ผู้ผ่านการคัดเลือกยืนยันสิทธิ์ได้ถึง 23:59 น. ของวันนี้"
              error={errors.confirmationDeadline}
            >
              {(control) => (
                <input
                  {...control}
                  type="date"
                  value={formData.confirmationDeadline}
                  onChange={(e) => updateField('confirmationDeadline', e.target.value)}
                  className={inputClass(Boolean(errors.confirmationDeadline))}
                />
              )}
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          number={3}
          title="คำถามคัดเลือกสำหรับผู้สมัคร"
          description="สร้างชุดคำถามแบบข้อความ เพื่อให้นักศึกษากรอกตอบในแบบฟอร์มใบสมัคร"
          actions={<Button onClick={handleAddQuestion}>+ เพิ่มคำถามคัดเลือก</Button>}
        >
          {formData.questions.length === 0 ? (
            <EmptyState
              title="ยังไม่มีคำถามคัดเลือก"
              description="กดปุ่ม + เพิ่มคำถามคัดเลือก เพื่อสร้างข้อถาม"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {formData.questions.map((q, idx) => (
                <QuestionInputRow
                  key={q.id ?? idx}
                  index={idx}
                  question={q}
                  onChangeText={handleQuestionTextChange}
                  onToggleRequired={handleToggleQuestionRequired}
                  onMove={handleMoveQuestion}
                  onRemove={handleRemoveQuestion}
                  isFirst={idx === 0}
                  isLast={idx === formData.questions.length - 1}
                  disabled={isLoading}
                />
              ))}
            </div>
          )}
          {errors.questions && (
            <p className="flex items-start gap-1.5 text-sm text-red-700">
              <CircleAlertIcon className="mt-0.5 size-4" />
              <span>{errors.questions}</span>
            </p>
          )}
        </SectionCard>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
            ยกเลิก
          </Button>
          {mode === 'edit' ? (
            <Button
              variant="primary"
              onClick={() => handleSubmit(true)}
              loading={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกเป็นฉบับร่าง'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit(false)}
                loading={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกและเผยแพร่'}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
