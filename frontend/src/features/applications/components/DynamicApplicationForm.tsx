import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiRequest, describeApiError } from '../../../lib/api.ts';
import { formatThaiDateTime } from '../../../lib/format';
import type { PublicClubProfile } from '../../clubs/types/club.ts';
import {
  fetchApplicationForm,
  submitApplicationAPI,
  type RoundApplicationForm,
  type SubmitApplicationResponse,
} from '../services/applicationService.ts';
import type {
  ApplicationFormData,
  ApplicationFormErrors,
  ApplicationLinkDraft,
} from '../types/applicationForm.ts';
import {
  toApplicationSubmissionPayload,
  validateApplicationForm,
} from '../utils/applicationValidation.ts';

interface DynamicApplicationFormProps {
  clubId: string;
  roundId: string;
}

interface LoadFailure {
  key: string;
  message: string;
}

type FormStep = 'form' | 'review';

const cardClass =
  'rounded-xl border border-[#E5E7EB] bg-white p-6';
const inputClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-sm leading-[1.5] text-[#1F2937] outline-none transition placeholder:text-[#6B7280] focus:border-[#C41E3A] focus:ring-2 focus:ring-[#C41E3A]/10';
const primaryButtonClass =
  'inline-flex min-h-12 items-center justify-center rounded-lg bg-[#C41E3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#9B1C1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C41E3A] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280]';

export function DynamicApplicationForm({
  clubId,
  roundId,
}: DynamicApplicationFormProps) {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<{
    key: string;
    application: { club: PublicClubProfile; form: RoundApplicationForm };
  } | null>(null);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [step, setStep] = useState<FormStep>('form');
  const [formData, setFormData] = useState<ApplicationFormData>({
    motivation: '',
    answers: {},
    links: [],
  });
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmitApplicationResponse | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const nextLinkId = useRef(0);
  const requestKey = `${clubId}:${roundId}`;

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetchApplicationForm(roundId),
      apiRequest<PublicClubProfile>(
        `/api/v1/public/clubs/${encodeURIComponent(clubId)}`,
      ),
    ])
      .then(([form, club]) => {
        if (form.round.clubId !== club.id || form.round.id !== roundId) {
          throw new Error('ข้อมูลชมรมหรือรอบรับสมัครไม่ตรงกัน');
        }
        if (!ignore) setLoaded({ key: requestKey, application: { form, club } });
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setLoadFailure({
            key: requestKey,
            message: describeApiError(
              error,
              'ไม่สามารถโหลดแบบฟอร์มสมัครได้ กรุณาลองใหม่อีกครั้ง',
            ),
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [clubId, roundId, requestKey]);

  const current =
    loaded?.key === requestKey ? loaded.application : null;
  const loadError =
    loadFailure?.key === requestKey ? loadFailure.message : null;
  const errorTargets: Array<{ id: string; label: string }> = [];
  if (errors.motivation) {
    errorTargets.push({ id: 'application-motivation', label: 'เหตุผลที่สนใจเข้าร่วมชมรม' });
  }
  if (current) {
    for (const question of current.form.questions) {
      if (errors.answers?.[question.id]) {
        errorTargets.push({
          id: `application-answer-${question.id}`,
          label: `คำถามข้อ ${question.displayOrder}`,
        });
      }
    }
  }
  formData.links.forEach((link, index) => {
    const linkErrors = errors.links?.[link.id];
    if (linkErrors?.label) {
      errorTargets.push({ id: `${link.id}-label`, label: `ชื่อเอกสารรายการที่ ${index + 1}` });
    }
    if (linkErrors?.url) {
      errorTargets.push({ id: `${link.id}-url`, label: `URL เอกสารรายการที่ ${index + 1}` });
    }
  });

  const updateFormData = (update: (data: ApplicationFormData) => ApplicationFormData) => {
    setFormData(update);
    setSubmitError(null);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    updateFormData((previous) => ({
      ...previous,
      answers: { ...previous.answers, [questionId]: value },
    }));
    setErrors((previous) => {
      const answers = { ...previous.answers };
      delete answers[questionId];
      const next: ApplicationFormErrors = { ...previous, answers };
      if (Object.keys(answers).length === 0) delete next.answers;
      return next;
    });
  };

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current) return;
    const nextErrors = validateApplicationForm(formData, current.form.questions);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById('application-form-errors')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addLink = () => {
    const newLink: ApplicationLinkDraft = {
      id: `link-${nextLinkId.current++}`,
      label: '',
      url: '',
    };
    updateFormData((previous) => ({
      ...previous,
      links: [...previous.links, newLink],
    }));
  };

  const updateLink = (
    linkId: string,
    field: 'label' | 'url',
    value: string,
  ) => {
    updateFormData((previous) => ({
      ...previous,
      links: previous.links.map((link) =>
        link.id === linkId ? { ...link, [field]: value } : link,
      ),
    }));
    setErrors((previous) => {
      const links = { ...previous.links };
      if (links[linkId]) {
        const remainingErrors = { ...links[linkId] };
        delete remainingErrors[field];
        if (!remainingErrors.label && !remainingErrors.url) {
          delete links[linkId];
        } else {
          links[linkId] = remainingErrors;
        }
      }
      const next: ApplicationFormErrors = { ...previous, links };
      if (Object.keys(links).length === 0) delete next.links;
      return next;
    });
  };

  const removeLink = (linkId: string) => {
    updateFormData((previous) => ({
      ...previous,
      links: previous.links.filter((link) => link.id !== linkId),
    }));
    setErrors((previous) => {
      const links = { ...previous.links };
      delete links[linkId];
      const next: ApplicationFormErrors = { ...previous, links };
      if (Object.keys(links).length === 0) delete next.links;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!current || !hasConfirmed || isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitApplicationAPI(
        roundId,
        toApplicationSubmissionPayload(formData, current.form.questions),
      );
      setReceipt(response);
      setHasSubmitted(true);
      setShowSuccessDialog(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      setSubmitError(
        describeApiError(
          error,
          'ส่งใบสมัครไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!current && !loadError) {
    return (
      <PageShell>
        <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-slate-500">
          <span className="animate-spin text-xl" aria-hidden="true">⏳</span>
          <span>กำลังโหลดแบบฟอร์มสมัคร...</span>
        </div>
      </PageShell>
    );
  }

  if (loadError || !current) {
    return (
      <PageShell>
        <section className={`${cardClass} text-center`} role="alert">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-600">
            !
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">
            ไม่สามารถเปิดแบบฟอร์มได้
          </h1>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <Link
            to={`/clubs/${encodeURIComponent(clubId)}`}
            className={`${primaryButtonClass} mt-5`}
          >
            กลับไปหน้าชมรม
          </Link>
        </section>
      </PageShell>
    );
  }

  const { club, form } = current;
  const title = club.name;

  return (
    <PageShell>
      <nav aria-label="เส้นทางนำทาง" className="text-xs text-slate-400">
        <Link className="transition hover:text-rose-700" to="/">
          ค้นหาชมรม
        </Link>
        <span className="mx-2">&gt;</span>
        <Link
          className="transition hover:text-rose-700"
          to={`/clubs/${encodeURIComponent(clubId)}`}
        >
          {title}
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="font-medium text-slate-700">ส่งใบสมัคร</span>
      </nav>

      <div className="flex flex-col gap-5 sm:gap-6">
          {step === 'form' && (
            <p className="rounded-lg bg-[#EFF4F8] px-3 py-2.5 text-xs leading-[1.5] text-[#4B5563]">
              กรุณากรอกข้อมูลให้ครบถ้วน ระบบจะแจ้งช่องที่ต้องแก้ไขก่อนส่งใบสมัคร
            </p>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {step === 'form' ? 'แบบฟอร์มสมัครเข้าร่วมชมรม' : 'ตรวจสอบข้อมูลใบสมัคร'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === 'form'
                ? 'บอกเล่าความสนใจ แล้วมาเป็นส่วนหนึ่งของชมรม'
                : 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร'}
            </p>
          </div>

          <ClubRoundSummary clubName={title} form={form} />

          <ol className="grid grid-cols-2 gap-3 text-sm font-semibold" aria-label="ขั้นตอนการสมัคร">
            <li className="flex items-center gap-2">
              <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
                step === 'form' ? 'bg-[#C41E3A] text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step === 'form' ? '1' : '✓'}
              </span>
              <span className={step === 'form' ? 'text-[#C41E3A]' : 'text-slate-600'}>
                กรอกข้อมูล
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
                step === 'review' ? 'bg-[#C41E3A] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                2
              </span>
              <span className={step === 'review' ? 'text-[#C41E3A]' : 'text-slate-400'}>
                ตรวจสอบข้อมูล
              </span>
            </li>
          </ol>

          {submitError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
              {submitError}
            </div>
          )}

          {step === 'form' ? (
            <form className="flex flex-col gap-5 sm:gap-6" onSubmit={handleNext} noValidate>
              {errorTargets.length > 0 && (
                <div
                  id="application-form-errors"
                  className="rounded-lg bg-[#FDE8E8] p-4 text-sm text-[#9B1C1C]"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="font-semibold">ยังส่งใบสมัครไม่ได้ กรุณาตรวจสอบข้อมูลต่อไปนี้</p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#C41E3A]">
                    {errorTargets.map((target) => (
                      <li key={target.id}>
                        <a className="underline underline-offset-2" href={`#${target.id}`}>
                          {target.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <section className={cardClass}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">ข้อมูลผู้สมัคร</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      ระบบใช้บัญชีนักศึกษาที่เข้าสู่ระบบเพื่อระบุตัวผู้สมัคร
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    ✓ ยืนยันตัวตนแล้ว
                  </span>
                </div>
              </section>

              <section className={cardClass}>
                <h2 className="mb-3 text-lg font-bold text-[#112937]">
                  ความสนใจและแรงบันดาลใจ
                </h2>
                <label htmlFor="application-motivation" className="mb-1.5 block text-sm font-bold text-slate-800">
                  เหตุผลที่สนใจเข้าร่วมชมรมนี้ <span className="text-[#C41E3A]">*</span>
                </label>
                <textarea
                  id="application-motivation"
                  rows={5}
                  value={formData.motivation}
                  onChange={(event) => {
                    updateFormData((previous) => ({
                      ...previous,
                      motivation: event.target.value,
                    }));
                    setErrors((previous) => {
                      const next = { ...previous };
                      delete next.motivation;
                      return next;
                    });
                  }}
                  placeholder="อธิบายเหตุผล ความคาดหวัง หรือสิ่งที่อยากเรียนรู้จากการเข้าร่วมกิจกรรมของชมรม..."
                  aria-invalid={Boolean(errors.motivation)}
                  aria-describedby={
                    errors.motivation
                      ? 'motivation-error motivation-count'
                      : 'motivation-count'
                  }
                  className={`${inputClass} min-h-[120px] resize-y ${errors.motivation ? 'border-2 border-[#C41E3A]' : ''}`}
                />
                {errors.motivation && (
                  <p id="motivation-error" className="text-sm text-[#9B1C1C]">
                    {errors.motivation}
                  </p>
                )}
                <p
                  id="motivation-count"
                  className={`text-right text-xs ${errors.motivation ? 'text-[#9B1C1C]' : 'text-[#6B7280]'}`}
                >
                  {Array.from(formData.motivation).length.toLocaleString('th-TH')} / 2,000 ตัวอักษร
                </p>
              </section>

              <section className={cardClass}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-[#112937]">
                    คำถามคัดเลือกจากทางชมรม
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    คำตอบของคุณจะช่วยให้ชมรมรู้จักคุณมากขึ้น
                  </p>
                </div>
                {form.questions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    รอบนี้ไม่มีคำถามเพิ่มเติม กรุณาระบุเหตุผลในการสมัครให้ครบถ้วน
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {form.questions.map((question) => {
                      const answerId = `application-answer-${question.id}`;
                      const errorId = `${answerId}-error`;
                      const answer = formData.answers[question.id] ?? '';
                      const questionError = errors.answers?.[question.id];
                      return (
                        <div key={question.id}>
                          <label htmlFor={answerId} className="mb-1.5 block text-sm font-semibold leading-relaxed text-[#1F2937]">
                            {question.displayOrder}. {question.questionText}{' '}
                            {question.isRequired ? (
                              <span className="text-[#C41E3A]">* (จำเป็นต้องตอบ)</span>
                            ) : (
                              <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                            )}
                          </label>
                          <textarea
                            id={answerId}
                            rows={4}
                            value={answer}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                            placeholder="เขียนคำตอบของคุณ..."
                            aria-invalid={Boolean(questionError)}
                            aria-describedby={questionError ? errorId : undefined}
                            className={`${inputClass} min-h-12 resize-y ${questionError ? 'border-2 border-[#C41E3A]' : ''}`}
                          />
                          {questionError ? (
                            <p id={errorId} className="text-sm text-[#9B1C1C]">
                              {questionError}
                            </p>
                          ) : (
                            <p className="text-right text-xs text-[#6B7280]">
                              {Array.from(answer).length.toLocaleString('th-TH')} / {question.maxLength.toLocaleString('th-TH')} ตัวอักษร
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={cardClass}>
                <div className="mb-4">
                  <h2 className="text-base font-extrabold text-slate-900">
                    เอกสารประกอบ / พอร์ตโฟลิโอ <span className="font-normal text-slate-400">(ถ้ามี)</span>
                  </h2>
                  <div className="rounded-lg bg-[#EFF4F8] p-3.5 text-sm leading-[1.5] text-[#1F2937]">
                    <p className="text-xs font-semibold">การแนบเอกสารประกอบ</p>
                    <p className="mt-1">
                      ใช้ลิงก์ HTTPS ที่กรรมการสามารถเปิดดูได้ ตั้งค่าสิทธิ์การเข้าถึงให้เรียบร้อย
                      ไม่รองรับการอัปโหลดไฟล์ และแนบได้สูงสุด 5 รายการ
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {formData.links.map((link, index) => {
                    const linkErrors = errors.links?.[link.id];
                    return (
                      <fieldset
                        key={link.id}
                        className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5"
                      >
                        <legend className="px-1 text-xs font-bold text-slate-600">
                          เอกสารรายการที่ {index + 1}
                        </legend>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label htmlFor={`${link.id}-label`} className="mb-1 block text-xs font-bold text-slate-700">
                              ชื่อ/คำอธิบายเอกสาร
                            </label>
                            <input
                              id={`${link.id}-label`}
                              value={link.label}
                              onChange={(event) => updateLink(link.id, 'label', event.target.value)}
                              placeholder="พอร์ตโฟลิโอ หรือผลงานที่เคยทำ"
                              aria-invalid={Boolean(linkErrors?.label)}
                              className={`${inputClass} min-h-12 ${linkErrors?.label ? 'border-2 border-[#C41E3A]' : ''}`}
                            />
                            {linkErrors?.label && (
                              <p className="text-sm text-[#9B1C1C]">{linkErrors.label}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`${link.id}-url`} className="mb-1 block text-xs font-bold text-slate-700">
                              URL ลิงก์เอกสาร
                            </label>
                            <input
                              id={`${link.id}-url`}
                              type="url"
                              inputMode="url"
                              value={link.url}
                              onChange={(event) => updateLink(link.id, 'url', event.target.value)}
                              placeholder="https://example.com/portfolio"
                              aria-invalid={Boolean(linkErrors?.url)}
                              className={`${inputClass} min-h-12 ${linkErrors?.url ? 'border-2 border-[#C41E3A]' : ''}`}
                            />
                            {linkErrors?.url && (
                              <p className="text-sm text-[#9B1C1C]">{linkErrors.url}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLink(link.id)}
                            className="self-end rounded-lg px-3 py-2 text-sm font-semibold text-[#C41E3A] transition hover:bg-rose-50"
                          >
                            ลบเอกสารรายการนี้
                          </button>
                        </div>
                      </fieldset>
                    );
                  })}
                  {formData.links.length < 5 && (
                    <button
                      type="button"
                      onClick={addLink}
                      className="self-start rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-[#C41E3A] transition hover:bg-rose-100"
                    >
                      + เพิ่มลิงก์เอกสาร
                    </button>
                  )}
                </div>
              </section>

              <p className="text-xs text-[#6B7280]">
                โปรดตรวจสอบสิทธิ์การเข้าถึงของลิงก์เอกสารก่อนส่งใบสมัคร
              </p>
              <div className="flex flex-row gap-3">
                <Link
                  to={`/clubs/${encodeURIComponent(clubId)}`}
                  className="inline-flex min-h-12 w-[90px] shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-50"
                >
                  ยกเลิก
                </Link>
                <button type="submit" className={`${primaryButtonClass} flex-1`}>
                  ตรวจสอบข้อมูลใบสมัคร <span className="ml-2" aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5 sm:gap-6">
              <section className={cardClass}>
                <h2 className="text-base font-extrabold text-slate-900">ความสนใจและแรงบันดาลใจ</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {formData.motivation}
                </p>
              </section>
              {form.questions.length > 0 && (
                <section className={`${cardClass} flex flex-col gap-5`}>
                  <h2 className="text-base font-extrabold text-slate-900">คำตอบคำถามคัดเลือก</h2>
                  {form.questions.map((question) => (
                    <div key={question.id}>
                      <h3 className="text-sm font-bold leading-relaxed text-slate-800">
                        {question.displayOrder}. {question.questionText}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {formData.answers[question.id]?.trim() || 'ไม่ได้กรอกข้อมูล'}
                      </p>
                    </div>
                  ))}
                </section>
              )}
              <section className={cardClass}>
                <h2 className="text-base font-extrabold text-slate-900">เอกสารประกอบ</h2>
                {formData.links.filter((link) => link.label.trim() && link.url.trim()).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">ไม่ได้แนบเอกสาร</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {formData.links
                      .filter((link) => link.label.trim() && link.url.trim())
                      .map((link) => (
                        <li key={link.id}>
                          <p className="text-sm font-bold text-slate-800">{link.label.trim()}</p>
                          <a
                            href={link.url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm text-[#C41E3A] underline"
                          >
                            {link.url.trim()}
                          </a>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-[1.5] text-[#1F2937]">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(event) => setHasConfirmed(event.target.checked)}
                  className="mt-3 h-5 w-5 shrink-0 accent-[#C41E3A]"
                />
                <span>ฉันตรวจสอบข้อมูลและยืนยันว่าข้อมูลในใบสมัครถูกต้อง</span>
              </label>
              <p className="text-xs text-[#6B7280]">
                การส่งใบสมัครนี้จะส่งข้อมูลให้ชมรมที่คุณเลือกเพื่อพิจารณา
              </p>
              <div className="flex flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setHasConfirmed(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasConfirmed || isSubmitting || hasSubmitted}
                  className={`${primaryButtonClass} flex-1`}
                  aria-live="polite"
                >
                  {isSubmitting ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      />
                      <span>กำลังส่งใบสมัคร...</span>
                    </>
                  ) : hasSubmitted ? (
                    'ส่งใบสมัครแล้ว'
                  ) : (
                    'ยืนยันและส่งใบสมัคร'
                  )}
                </button>
              </div>
            </div>
          )}
      </div>
      {showSuccessDialog && (
        <SuccessDialog
          receipt={receipt}
          onClose={() => setShowSuccessDialog(false)}
          onViewApplications={() => navigate('/profile/applications')}
        />
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16 font-sans text-[#1F2937]">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[#E5E7EB] bg-white px-4 sm:h-20 sm:px-12">
        <div className="mx-auto flex w-full max-w-[1344px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C41E3A] text-sm font-black text-white">
              TU
            </span>
            <span className="text-xl font-bold tracking-tight text-[#112937]">
              ClubHub
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-8 text-sm sm:flex">
            <Link to="/" className="font-semibold text-[#C41E3A]">
              ค้นหาชมรม
            </Link>
            <Link to="/profile/applications" className="text-[#4B5563] hover:text-[#C41E3A]">
              ประวัติการสมัคร
            </Link>
            <span className="text-[#112937]">บัญชีนักศึกษา</span>
          </nav>
          <span className="text-xs font-semibold text-[#6B7280] sm:hidden">แบบฟอร์มสมัครชมรม</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[832px] flex-col gap-5 px-4 pt-5 sm:gap-6 sm:px-8 sm:pt-7">
        {children}
      </main>
    </div>
  );
}

function SuccessDialog({
  receipt,
  onClose,
  onViewApplications,
}: {
  receipt: SubmitApplicationResponse | null;
  onClose: () => void;
  onViewApplications: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-success-title"
        className="w-full max-w-md rounded-xl bg-white p-7 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">
          ✓
        </div>
        <h2
          id="application-success-title"
          className="mt-4 text-xl font-extrabold text-slate-900"
        >
          ส่งใบสมัครสำเร็จ
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ระบบได้รับใบสมัครของคุณแล้ว สามารถไปตรวจสอบประวัติการสมัครได้
        </p>
        {receipt && (
          <p className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
            เลขที่ใบสมัคร {receipt.id} · {receipt.status}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onViewApplications}
            className={primaryButtonClass}
          >
            ไปยังประวัติการสมัคร
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C41E3A]"
          >
            ปิด
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          หน้ารายการประวัติยังรอการเชื่อมต่อ API ของ US-04
        </p>
      </section>
    </div>
  );
}

function ClubRoundSummary({
  clubName,
  form,
}: {
  clubName: string;
  form: RoundApplicationForm;
}) {
  return (
    <section className="flex items-start gap-4 rounded-xl bg-[#EFF4F8] p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white text-lg font-bold text-[#C41E3A]">
        TU
      </div>
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-lg font-semibold text-[#112937]">{clubName}</h2>
        <p className="text-sm text-[#1F2937]">{form.round.title}</p>
        <p className="text-xs text-[#4B5563]">{form.round.description}</p>
        {form.round.eligibilityText && (
          <p className="text-xs text-[#6B7280]">{form.round.eligibilityText}</p>
        )}
        <p className="text-xs text-[#6B7280]">
          เปิดรับสมัคร {formatThaiDateTime(form.round.opensAt)} – ปิดรับสมัคร{' '}
          {formatThaiDateTime(form.round.closesAt)}
        </p>
      </div>
    </section>
  );
}
