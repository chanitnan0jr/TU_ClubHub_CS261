import React, { useState } from 'react';
import type {
  ScreeningQuestion,
  ApplicationFormData,
  ApplicationFormError,
  ApplicationStep,
} from '../types/applicationForm';
import { submitApplicationAPI } from '../services/applicationService';

const mockQuestions: ScreeningQuestion[] = [
  {
    id: 'q1',
    questionText:
      'หากต้องเล่าเรื่องชีวิตในรั้วธรรมศาสตร์ผ่านภาพ 1 ภาพ คุณจะถ่ายอะไร เพราะเหตุใด?',
    isRequired: true,
    orderIndex: 1,
  },
  {
    id: 'q2',
    questionText: 'คุณเคยใช้กล้องหรือโปรแกรมแต่งภาพอะไรบ้าง?',
    isRequired: false,
    orderIndex: 2,
  },
];

export const DynamicApplicationForm: React.FC = () => {
  const [step, setStep] = useState<ApplicationStep>('form');
  const [formData, setFormData] = useState<ApplicationFormData>({
    reason: '',
    answers: {
      q2: 'ใช้กล้องมือถือและ Lightroom Mobile ในระดับพื้นฐาน',
    },
    documentTitle: 'พอร์ตโฟลิโอแนะนำตัว / ผลงานที่เคยทำ',
    documentUrl: '',
  });
  const [errors, setErrors] = useState<ApplicationFormError>({});
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // State สำหรับป้องกันการกดส่งซ้ำ

  const studentInfo = {
    name: 'พิมพ์ชนก ใจดี',
    studentId: '6809617xxx',
    email: 'student@tu.ac.th',
    faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี',
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: ApplicationFormError = {};
    const answerErrors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      newErrors.reason = 'กรุณาระบุเหตุผลที่สนใจเข้าร่วมชมรมนี้';
    }

    mockQuestions.forEach((q) => {
      if (q.isRequired && (!formData.answers[q.id] || !formData.answers[q.id].trim())) {
        answerErrors[q.id] = 'กรุณากรอกคำตอบสำหรับคำถามข้อนี้';
      }
    });

    if (Object.keys(answerErrors).length > 0) {
      newErrors.answers = answerErrors;
    }

    if (formData.documentUrl && !formData.documentUrl.startsWith('https://')) {
      newErrors.documentUrl = 'รูปแบบ URL ไม่ถูกต้อง กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextToReview = () => {
    if (validateForm()) {
      setStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ฟังก์ชันยิง API และป้องกันการกดส่งซ้ำ (Task44:U03-FE-3)
  const handleSubmitApplication = async () => {
    if (!hasConfirmed || isSubmitting) return;

    setIsSubmitting(true); // ล็อคปุ่มทันที
    try {
      const payload = {
        roundId: 'ROUND-1234',
        reason: formData.reason,
        answers: Object.entries(formData.answers).map(([qId, ans]) => ({
          questionId: qId,
          answerText: ans,
        })),
        documentTitle: formData.documentTitle,
        documentUrl: formData.documentUrl,
      };

      const res = await submitApplicationAPI(payload);
      if (res.success) {
        setStep('success'); // แสดงหน้า Success หลังส่งสำเร็จ
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false); // ปลดล็อคปุ่ม
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#C81E3D] flex items-center justify-center text-white font-black text-xs">
              TU
            </div>
            <span className="font-extrabold text-slate-900 text-base tracking-tight">
              ClubHub
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-600">
            <span className="hover:text-rose-600 cursor-pointer hidden sm:inline">ค้นหาชมรม</span>
            <span className="hover:text-rose-600 cursor-pointer hidden sm:inline">ประวัติการสมัคร</span>
            <span className="font-bold text-slate-900">{studentInfo.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400">
          ค้นหาชมรม &gt; ชมรมถ่ายภาพธรรมศาสตร์ &gt;{' '}
          <span className="text-slate-700 font-medium">ส่งใบสมัคร</span>
        </div>

        {/* STATE: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-slate-900">ผลการส่งใบสมัคร</h1>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!
              </h2>
              <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                สถานะ: รอพิจารณา (Pending)
              </span>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                ระบบได้รับใบสมัครของคุณแล้ว กรุณารอการพิจารณาจากกรรมการชมรม
              </p>
            </div>

            <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200 flex flex-col gap-1 text-xs text-slate-600">
              <span className="font-bold text-slate-800">ชมรมถ่ายภาพธรรมศาสตร์</span>
              <span>รอบรับสมัครสมาชิกใหม่ 1/2567</span>
              <span className="text-slate-400">วันปิดรับสมัคร: 31 สิงหาคม 2567 เวลา 23:59 น.</span>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button className="w-full h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-sm font-bold shadow-md">
                ดูประวัติการสมัครของคุณ
              </button>
              <button className="w-full h-11 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50">
                กลับหน้าแรก
              </button>
            </div>
          </div>
        )}

        {/* STATE: FORM & REVIEW */}
        {(step === 'form' || step === 'review') && (
          <>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {step === 'form' ? 'แบบฟอร์มสมัครเข้าร่วมชมรม' : 'ตรวจสอบข้อมูลใบสมัคร'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {step === 'form'
                  ? 'บอกเล่าความสนใจ แล้วมาเป็นส่วนหนึ่งของชมรม'
                  : 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร'}
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-3 text-xs font-bold py-1">
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    step === 'form'
                      ? 'bg-[#C81E3D] text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {step === 'review' ? '✓' : '1'}
                </span>
                <span className={step === 'form' ? 'text-rose-700' : 'text-slate-600'}>
                  กรอกข้อมูล
                </span>
              </div>
              <span className="text-slate-300">━━━━</span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    step === 'review'
                      ? 'bg-[#C81E3D] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  2
                </span>
                <span className={step === 'review' ? 'text-rose-700' : 'text-slate-400'}>
                  ตรวจสอบข้อมูล
                </span>
              </div>
            </div>

            {/* SECTION 1: ข้อมูลผู้สมัคร */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">ข้อมูลผู้สมัคร</h3>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  ✓ ยืนยันตัวตนผ่าน TU Auth แล้ว
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">ชื่อ-นามสกุล</span>
                  <span className="font-bold text-slate-800">{studentInfo.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">รหัสนักศึกษา</span>
                  <span className="font-bold text-slate-800">{studentInfo.studentId}</span>
                </div>
              </div>
            </section>

            {/* SECTION 2: ความสนใจ */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <h3 className="text-base font-bold text-slate-900">ความสนใจและแรงบันดาลใจ</h3>
              {step === 'form' ? (
                <textarea
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="อธิบายเหตุผล ความคาดหวัง..."
                  className={`w-full rounded-2xl border p-3.5 text-xs focus:outline-none ${
                    errors.reason ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
              ) : (
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {formData.reason || 'อยากเรียนรู้การถ่ายภาพและการเล่าเรื่องผ่านภาพถ่าย'}
                </p>
              )}
            </section>

            {/* SECTION 3: Dynamic Questions */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-900">คำถามคัดเลือกจากทางชมรม</h3>
              {mockQuestions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    {q.orderIndex}. {q.questionText} {q.isRequired && <span className="text-rose-600">*</span>}
                  </label>
                  {step === 'form' ? (
                    <textarea
                      rows={3}
                      value={formData.answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="เขียนคำตอบของคุณ..."
                      className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      {formData.answers[q.id] || 'ไม่ได้กรอกข้อมูล'}
                    </p>
                  )}
                </div>
              ))}
            </section>

            {/* Checkbox ยืนยัน */}
            {step === 'review' && (
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer shadow-sm">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600"
                />
                <span className="text-xs text-slate-700 font-medium">
                  ข้าพเจ้าขอรับรองว่าข้อมูลและลิงก์เอกสารดังกล่าวเป็นความจริง
                </span>
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (step === 'review') setStep('form');
                }}
                className="w-full sm:w-auto px-8 h-12 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold"
              >
                {step === 'form' ? 'ยกเลิก' : 'ย้อนกลับไปแก้ไข'}
              </button>

              {step === 'form' ? (
                <button
                  type="button"
                  onClick={handleNextToReview}
                  className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-[#C81E3D] text-white text-xs font-bold shadow-md"
                >
                  ถัดไป: ตรวจสอบข้อมูล ➔
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!hasConfirmed || isSubmitting}
                  onClick={handleSubmitApplication}
                  className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-[#C81E3D] text-white text-xs font-bold shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>กำลังส่งใบสมัคร...</span>
                    </>
                  ) : (
                    <span>ยืนยันการส่งใบสมัคร</span>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};