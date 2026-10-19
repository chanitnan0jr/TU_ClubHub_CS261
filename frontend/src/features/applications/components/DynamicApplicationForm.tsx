import React, { useState } from 'react';
import type {
  ScreeningQuestion,
  ApplicationFormData,
  ApplicationFormError,
  ApplicationStep,
} from '../types/applicationForm';

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

    if (
      formData.documentUrl &&
      !formData.documentUrl.startsWith('https://')
    ) {
      newErrors.documentUrl =
        'รูปแบบ URL ไม่ถูกต้อง กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https://';
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

  const triggerValidationErrorDemo = () => {
    setFormData({
      reason: '',
      answers: {
        q2: 'ใช้กล้องมือถือและ Lightroom Mobile ในระดับพื้นฐาน',
      },
      documentTitle: 'พอร์ตโฟลิโอแนะนำตัว / ผลงานที่เคยทำ',
      documentUrl: 'http://portfolio',
    });
    setErrors({
      reason: 'กรุณาระบุเหตุผลที่สนใจเข้าร่วมชมรมนี้',
      answers: {
        q1: 'กรุณากรอกคำตอบสำหรับคำถามข้อนี้',
      },
      documentUrl:
        'รูปแบบ URL ไม่ถูกต้อง กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https://',
    });
    setStep('form');
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

      {/* Controller สำหรับทดสอบสลับหน้าจอ UI ต่างๆ */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-slate-300">ทดสอบเปลี่ยนสเตตัส UI:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setErrors({});
              setStep('form');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              step === 'form' && Object.keys(errors).length === 0
                ? 'bg-rose-600'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            1. กรอกข้อมูล
          </button>
          <button
            onClick={triggerValidationErrorDemo}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              Object.keys(errors).length > 0 ? 'bg-rose-600' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ⚠️ แสดงข้อผิดพลาด
          </button>
          <button
            onClick={() => setStep('review')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              step === 'review' ? 'bg-rose-600' : 'bg-slate-800 text-slate-300'
            }`}
          >
            2. ตรวจสอบข้อมูล
          </button>
          <button
            onClick={() => setStep('success')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              step === 'success' ? 'bg-rose-600' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ส่งสำเร็จ
          </button>
          <button
            onClick={() => setStep('already_applied')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              step === 'already_applied' ? 'bg-rose-600' : 'bg-slate-800 text-slate-300'
            }`}
          >
            สมัครแล้ว
          </button>
          <button
            onClick={() => setStep('closed')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              step === 'closed' ? 'bg-rose-600' : 'bg-slate-800 text-slate-300'
            }`}
          >
            ปิดรับสมัคร
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400">
          ค้นหาชมรม &gt; ชมรมถ่ายภาพธรรมศาสตร์ &gt;{' '}
          <span className="text-slate-700 font-medium">ส่งใบสมัคร</span>
        </div>

        {/* ==================== 1. STATE: SUCCESS (ส่งสำเร็จ) ==================== */}
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

        {/* ==================== 2. STATE: ALREADY APPLIED (สมัครแล้ว) ==================== */}
        {step === 'already_applied' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-slate-900">การสมัครเข้าร่วมชมรม</h1>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">
                📄
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                คุณได้สมัครรอบนี้แล้ว
              </h2>
              <p className="text-xs sm:text-sm text-rose-600 font-medium">
                คุณได้ยื่นใบสมัครในรอบรับสมัครนี้ไปแล้ว ไม่สามารถส่งซ้ำได้
              </p>
              <span className="text-xs text-slate-400 pt-1">
                สถานะใบสมัครเดิม: รอพิจารณา (Pending)
              </span>
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
                กลับไปหน้าชมรม
              </button>
            </div>
          </div>
        )}

        {/* ==================== 3. STATE: CLOSED (ปิดรับสมัคร) ==================== */}
        {step === 'closed' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-slate-900">การสมัครเข้าร่วมชมรม</h1>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">
                📅
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                รอบรับสมัครปิดแล้ว
              </h2>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                ปิดรับสมัครแล้ว
              </span>
              <p className="text-xs sm:text-sm text-rose-600 font-medium pt-1">
                รอบรับสมัครนี้ปิดรับสมัครแล้ว ไม่สามารถส่งใบสมัครได้
              </p>
            </div>

            <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200 flex flex-col gap-1 text-xs text-slate-600">
              <span className="font-bold text-slate-800">ชมรมถ่ายภาพธรรมศาสตร์</span>
              <span>รอบรับสมัครสมาชิกใหม่ 1/2567</span>
              <span className="text-slate-400">วันปิดรับสมัคร: 31 สิงหาคม 2567 เวลา 23:59 น.</span>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button className="w-full h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-sm font-bold shadow-md">
                กลับไปค้นหาชมรม
              </button>
              <button className="w-full h-11 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50">
                กลับไปหน้าชมรม
              </button>
            </div>
          </div>
        )}

        {/* ==================== 4. STATE: FORM & REVIEW ==================== */}
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

            {/* Banner ชมรม */}
            <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white p-2 border border-slate-200 flex items-center justify-center text-rose-600 text-xl font-bold shrink-0">
                📷
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">ชมรมถ่ายภาพธรรมศาสตร์</h2>
                <p className="text-xs font-medium text-slate-600">
                  รอบรับสมัครสมาชิกใหม่ 1/2567
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  วันปิดรับสมัคร: 31 สิงหาคม 2567 เวลา 23:59 น.
                </p>
              </div>
            </div>

            {/* Stepper (1 -> 2) */}
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

            {/* Banner เตือน Error (ถ้ามี) */}
            {Object.keys(errors).length > 0 && step === 'form' && (
              <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <span className="text-base">⚠️</span>
                  <span>ยังส่งใบสมัครไม่ได้ พบข้อผิดพลาด กรุณาตรวจสอบข้อมูลช่องที่มีสีแดง</span>
                </div>
                <div className="text-[11px] text-rose-600 pl-6">
                  ไปยังช่องที่ต้องแก้ไข: เหตุผลในการสมัคร • คำถามข้อ 1 • URL
                </div>
              </div>
            )}

            {/* SECTION 1: ข้อมูลผู้สมัคร (Read-only) */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">ข้อมูลผู้สมัคร</h3>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                  <span>✓</span> ยืนยันตัวตนผ่าน TU Auth แล้ว
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-2">
                ข้อมูลจากระบบ TU Auth • ไม่สามารถแก้ไขได้
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">ชื่อ-นามสกุล</span>
                  <span className="font-bold text-slate-800">{studentInfo.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">รหัสนักศึกษา</span>
                  <span className="font-bold text-slate-800">{studentInfo.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">อีเมลมหาลัย</span>
                  <span className="font-bold text-slate-800">{studentInfo.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">คณะ</span>
                  <span className="font-bold text-slate-800">{studentInfo.faculty}</span>
                </div>
              </div>
            </section>

            {/* SECTION 2: ความสนใจและแรงบันดาลใจ */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <h3 className="text-base font-bold text-slate-900">ความสนใจและแรงบันดาลใจ</h3>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  เหตุผลที่สนใจเข้าร่วมชมรมนี้ <span className="text-rose-600">*</span>
                </label>

                {step === 'form' ? (
                  <>
                    <textarea
                      rows={4}
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      placeholder="อธิบายเหตุผล ความคาดหวัง หรือสิ่งที่อยากเรียนรู้จากการเข้าร่วมกิจกรรมของชมรม..."
                      className={`w-full rounded-2xl border p-3.5 text-xs focus:outline-none transition-all ${
                        errors.reason
                          ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                          : 'border-slate-200 focus:border-rose-400'
                      }`}
                    />
                    {errors.reason && (
                      <span className="text-[11px] text-rose-600 font-medium block mt-1">
                        {errors.reason}
                      </span>
                    )}
                    <div className="text-right text-[11px] text-slate-400 mt-1">
                      {formData.reason.length} / 500 ตัวอักษร
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                    {formData.reason || 'อยากเรียนรู้การถ่ายภาพและการเล่าเรื่องผ่านภาพถ่ายจากเพื่อน ๆ ในชมรม พร้อมพัฒนาทักษะการจัดองค์ประกอบภาพ และร่วมบันทึกกิจกรรมของมหาวิทยาลัย'}
                  </p>
                )}
              </div>
            </section>

            {/* SECTION 3: คำถามคัดเลือกจากทางชมรม (Dynamic Questions) */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">คำถามคัดเลือกจากทางชมรม</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  คำตอบของคุณจะช่วยให้ชมรมรู้จักคุณมากขึ้น
                </p>
              </div>

              {mockQuestions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-800 leading-relaxed">
                    {q.orderIndex}. {q.questionText}{' '}
                    {q.isRequired ? (
                      <span className="text-rose-600 font-bold">* (จำเป็นต้องตอบ)</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                    )}
                  </label>

                  {step === 'form' ? (
                    <>
                      <textarea
                        rows={3}
                        value={formData.answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="เขียนคำตอบของคุณ..."
                        className={`w-full rounded-2xl border p-3.5 text-xs focus:outline-none transition-all ${
                          errors.answers && errors.answers[q.id]
                            ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                            : 'border-slate-200 focus:border-rose-400'
                        }`}
                      />
                      {errors.answers && errors.answers[q.id] && (
                        <span className="text-[11px] text-rose-600 font-medium">
                          {errors.answers[q.id]}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                      {formData.answers[q.id] || 'ไม่ได้กรอกข้อมูล'}
                    </p>
                  )}
                </div>
              ))}
            </section>

            {/* SECTION 4: เอกสารประกอบ / พอร์ตโฟลิโอ (ถ้ามี) */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  เอกสารประกอบ / พอร์ตโฟลิโอ (ถ้ามี)
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <span className="text-slate-400 text-sm">ℹ️</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-800">
                    ลิงก์เท่านั้น • ไม่รองรับการอัปโหลดไฟล์
                  </span>
                  <span className="text-[11px] text-slate-500">
                    กรุณาแนบลิงก์เอกสาร เช่น Google Drive, Canva, หรือ PDF Online พร้อมเปิดสิทธิ์เข้าถึง (Access Permission) ให้กรรมการชมรมสามารถเปิดดูได้
                  </span>
                </div>
              </div>

              {step === 'form' ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อ/คำอธิบายเอกสาร
                    </label>
                    <input
                      type="text"
                      value={formData.documentTitle}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, documentTitle: e.target.value }))
                      }
                      placeholder="พอร์ตโฟลิโอแนะนำตัว / ผลงานที่เคยทำ"
                      className="w-full h-11 rounded-2xl border border-slate-200 px-3.5 text-xs focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      URL ลิงก์เอกสาร
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.documentUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, documentUrl: e.target.value }))
                        }
                        placeholder="https://example.com/pimchanok/portfolio"
                        className={`w-full h-11 rounded-2xl border px-9 text-xs focus:outline-none transition-all ${
                          errors.documentUrl
                            ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                            : 'border-slate-200 focus:border-rose-400'
                        }`}
                      />
                      <span className="absolute left-3 top-3 text-slate-400 text-xs">🔗</span>
                    </div>
                    {errors.documentUrl && (
                      <span className="text-[11px] text-rose-600 font-medium block mt-1">
                        {errors.documentUrl}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 block mt-1">
                      ใช้ลิงก์ HTTPS และเปิดสิทธิ์ให้ผู้ที่มีลิงก์เข้าดูได้
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {formData.documentTitle || 'พอร์ตโฟลิโอแนะนำตัว / ผลงานที่เคยทำ'}
                  </span>
                  <a
                    href={formData.documentUrl || 'https://example.com/pimchanok/portfolio'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-rose-600 font-medium underline break-all"
                  >
                    {formData.documentUrl || 'https://example.com/pimchanok/portfolio'}
                  </a>
                  <button
                    type="button"
                    onClick={() => window.open(formData.documentUrl || 'https://example.com/pimchanok/portfolio', '_blank')}
                    className="w-full h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 mt-1"
                  >
                    <span>↗</span>
                    <span>ทดสอบเปิดลิงก์ในแท็บใหม่</span>
                  </button>
                  <span className="text-[11px] text-slate-400 text-center mt-0.5">
                    ตรวจสอบว่ากรรมการชมรมสามารถเปิดดูเอกสารได้ก่อนส่ง
                  </span>
                </div>
              )}
            </section>

            {/* Checkbox ยืนยันในหน้า ตรวจสอบข้อมูล */}
            {step === 'review' && (
              <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer shadow-sm">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  ข้าพเจ้าขอรับรองว่าข้อมูลและลิงก์เอกสารดังกล่าวเป็นความจริง และได้เปิดสิทธิ์การเข้าถึงเอกสารเรียบร้อยแล้ว
                </span>
              </label>
            )}

            {/* Action Bottom Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (step === 'review') setStep('form');
                }}
                className="w-full sm:w-auto px-8 h-12 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                {step === 'form' ? 'ยกเลิก' : 'ย้อนกลับไปแก้ไข'}
              </button>

              {step === 'form' ? (
                <button
                  type="button"
                  onClick={handleNextToReview}
                  className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold shadow-md transition-colors"
                >
                  ถัดไป: ตรวจสอบข้อมูล ➔
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!hasConfirmed}
                  onClick={() => {
                    setStep('success');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold shadow-md transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  ยืนยันการส่งใบสมัคร
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};