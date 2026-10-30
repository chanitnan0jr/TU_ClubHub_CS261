import { useState } from 'react';
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
  clubName?: string;
  initialValues?: Partial<RecruitmentRoundFormInput>;
  onSubmit: (data: RecruitmentRoundFormInput, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultFormInput: RecruitmentRoundFormInput = {
  title: '',
  academicYear: 2567,
  semester: 'SEMESTER_1',
  capacity: 60,
  isUnlimitedCapacity: false,
  description: '',
  openAt: '',
  closeAt: '',
  announcementDate: '',
  confirmationStartDate: '',
  confirmationEndDate: '',
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
  clubName = 'ชมรมอาสาพัฒนา',
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: RecruitmentRoundFormProps) => {
  const [formData, setFormData] = useState<RecruitmentRoundFormInput>({
    ...defaultFormInput,
    ...initialValues,
    questions: withQuestionOrder(
      initialValues?.questions ?? defaultFormInput.questions,
    ),
  });

  const [errors, setErrors] = useState<FormValidationError>({});

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

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      const validationErrors = validateRecruitmentRoundForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    setErrors({});
    await onSubmit(formData, isDraft);
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={onCancel}
              className="hover:text-blue-600 hover:underline flex items-center gap-1 font-semibold text-slate-600"
            >
              ← ย้อนกลับ
            </button>
            <span>/</span>
            <span>พื้นที่คณะกรรมการ</span>
            <span>&gt;</span>
            <span className="text-slate-800 font-semibold">จัดการรอบรับสมัคร</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">สร้าง / แก้ไขรอบรับสมัคร</h1>
              <p className="text-sm text-slate-500">{clubName}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-lg"
              title="ปิดแบบฟอร์ม"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Step Indicator Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1.5 text-center sm:text-left">
            01 ข้อมูลทั่วไป
          </div>
          <div className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1.5 text-center sm:text-left">
            02 กำหนดการ
          </div>
          <div className="text-slate-700 font-semibold border-b-2 border-slate-300 pb-1.5 text-center sm:text-left">
            03 คำถามคัดเลือก
          </div>
          <div className="text-slate-400 border-b-2 border-transparent pb-1.5 text-center sm:text-left">
            04 ตรวจสอบและเผยแพร่
          </div>
        </div>

        {/* Alert Banner เมื่อพบปัญหา Validation */}
        {errorCount > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium flex items-center gap-3 shadow-sm">
            <span className="text-lg">⚠️</span>
            <span>ยังบันทึกข้อมูลไม่ได้ พบข้อผิดพลาด {errorCount} จุด กรุณาตรวจสอบข้อมูล</span>
          </div>
        )}

        <form className="flex flex-col gap-6">
          {/* SECTION 01: ข้อมูลรอบรับสมัคร */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">01 ข้อมูลรอบรับสมัคร</h2>
              <p className="text-xs text-slate-500">ระบุข้อมูลที่จะแสดงให้นักศึกษาเห็นในหน้ารับสมัคร</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อรอบรับสมัคร <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="เช่น รอบรับสมัครสมาชิกใหม่ ประจำภาคเรียนที่ 1/2567"
                className={`h-[44px] w-full rounded-lg border px-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.title
                    ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ปีการศึกษา <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.academicYear || ''}
                  onChange={(e) => updateField('academicYear', Number(e.target.value))}
                  className="h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value={2567}>2567</option>
                  <option value={2568}>2568</option>
                </select>
                {errors.academicYear && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.academicYear}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ภาคเรียน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => updateField('semester', e.target.value as Semester)}
                  className="h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="SEMESTER_1">ภาคเรียนที่ 1</option>
                  <option value="SEMESTER_2">ภาคเรียนที่ 2</option>
                  <option value="SUMMER">ภาคฤดูร้อน</option>
                </select>
                {errors.semester && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.semester}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนที่รับ (คน)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  disabled={formData.isUnlimitedCapacity}
                  value={formData.capacity ?? ''}
                  onChange={(e) =>
                    updateField('capacity', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="60"
                  className="h-[44px] w-36 rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isUnlimitedCapacity}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateField('isUnlimitedCapacity', checked);
                      if (checked) updateField('capacity', null);
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  ไม่จำกัดจำนวน
                </label>
              </div>
              {errors.capacity && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.capacity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รายละเอียด/คุณสมบัติผู้สมัคร <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="นักศึกษามหาวิทยาลัยธรรมศาสตร์ทุกชั้นปี สนใจงานอาสา สามารถเข้าร่วมกิจกรรมและทำงานเป็นทีมได้"
                className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 ${
                  errors.description
                    ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.description}</p>
              )}
            </div>
          </section>

          {/* SECTION 02: กำหนดการรับสมัคร */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <h2 className="text-base font-bold text-slate-900">02 กำหนดการรับสมัคร</h2>
              <span className="text-xs text-slate-400">เวลาในประเทศไทย (GMT+7) • เวลา 00:00-23:59 น.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateTimePicker
                label="วัน-เวลา เปิดรับสมัคร"
                required
                value={formData.openAt}
                onChange={(val) => updateField('openAt', val)}
                error={errors.openAt}
              />
              <DateTimePicker
                label="วัน-เวลา ปิดรับสมัคร"
                required
                value={formData.closeAt}
                onChange={(val) => updateField('closeAt', val)}
                error={errors.closeAt}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วันประกาศผล</label>
                <input
                  type="date"
                  value={formData.announcementDate}
                  onChange={(e) => updateField('announcementDate', e.target.value)}
                  className="h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {errors.announcementDate && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.announcementDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ช่วงเวลายืนยันสิทธิ์</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="date"
                    value={formData.confirmationStartDate}
                    onChange={(e) => updateField('confirmationStartDate', e.target.value)}
                    className="h-[44px] w-full rounded-lg border border-slate-300 px-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="hidden sm:inline text-slate-400 text-center">-</span>
                  <input
                    type="date"
                    value={formData.confirmationEndDate}
                    onChange={(e) => updateField('confirmationEndDate', e.target.value)}
                    className="h-[44px] w-full rounded-lg border border-slate-300 px-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {errors.confirmationDates && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.confirmationDates}</p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 03: คำถามคัดเลือก */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  03 คำถามคัดเลือกสำหรับผู้สมัคร (Screening Questions)
                </h2>
                <p className="text-xs text-slate-500">
                  สร้างชุดคำถามแบบข้อความ เพื่อให้นักศึกษากรอกตอบในแบบฟอร์มใบสมัคร
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="h-[40px] px-4 rounded-lg border border-blue-600 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap self-start sm:self-auto shrink-0 shadow-sm"
              >
                + เพิ่มคำถามคัดเลือก
              </button>
            </div>

            {formData.questions.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                ยังไม่มีคำถามคัดเลือก กดปุ่ม + เพิ่มคำถามคัดเลือก เพื่อสร้างข้อถาม
              </p>
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
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.questions}</p>
            )}
          </section>

          {/* BOTTOM FORM ACTIONS */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="h-[44px] w-full sm:w-auto px-6 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="h-[44px] w-full sm:w-auto px-6 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกเป็นฉบับร่าง'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="h-[44px] w-full sm:w-auto px-6 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
            >
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกและเผยแพร่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};