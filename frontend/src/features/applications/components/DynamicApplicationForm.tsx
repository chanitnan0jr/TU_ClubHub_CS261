import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
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

interface LoadedApplication {
  club: PublicClubProfile;
  form: RoundApplicationForm;
}

interface LoadFailure {
  key: string;
  message: string;
}

type FormStep = 'form' | 'review' | 'success';

const cardClass =
  'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#C81E3D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#A01830] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none';

export function DynamicApplicationForm({
  clubId,
  roundId,
}: DynamicApplicationFormProps) {
  const [loaded, setLoaded] = useState<{
    key: string;
    application: LoadedApplication;
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
        links[linkId] = { ...links[linkId], [field]: undefined };
        if (!links[linkId].label && !links[linkId].url) delete links[linkId];
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
    if (!current || !hasConfirmed || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitApplicationAPI(
        roundId,
        toApplicationSubmissionPayload(formData, current.form.questions),
      );
      setReceipt(response);
      setStep('success');
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

      {step === 'success' ? (
        <section className="flex flex-col gap-5">
          <h1 className="text-2xl font-extrabold text-slate-900">ส่งใบสมัครสำเร็จ</h1>
          <div className={`${cardClass} flex flex-col items-center gap-4 py-10 text-center`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">
              ✓
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              ระบบได้รับใบสมัครของคุณแล้ว
            </h2>
            <p className="max-w-lg text-sm leading-6 text-slate-500">
              กรุณารอการพิจารณาจากกรรมการชมรม คุณสามารถกลับมาตรวจสอบสถานะได้ภายหลัง
            </p>
            {receipt && (
              <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                เลขที่ใบสมัคร {receipt.id} · {receipt.status}
              </p>
            )}
          </div>
          <ClubRoundSummary clubName={title} form={form} />
          <Link
            to={`/clubs/${encodeURIComponent(clubId)}`}
            className={`${primaryButtonClass} w-full`}
          >
            กลับไปหน้าชมรม
          </Link>
        </section>
      ) : (
        <>
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

          <ol className="flex items-center gap-3 text-xs font-bold" aria-label="ขั้นตอนการสมัคร">
            <li className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === 'form' ? 'bg-[#C81E3D] text-white' : 'bg-emerald-500 text-white'
              }`}>
                {step === 'form' ? '1' : '✓'}
              </span>
              <span className={step === 'form' ? 'text-rose-700' : 'text-slate-600'}>
                กรอกข้อมูล
              </span>
            </li>
            <li aria-hidden="true" className="text-slate-300">━━━━</li>
            <li className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === 'review' ? 'bg-[#C81E3D] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                2
              </span>
              <span className={step === 'review' ? 'text-rose-700' : 'text-slate-400'}>
                ตรวจสอบข้อมูล
              </span>
            </li>
          </ol>

          {submitError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
              {submitError}
            </div>
          )}

          {step === 'form' ? (
            <form className="flex flex-col gap-5" onSubmit={handleNext}>
              {Object.keys(errors).length > 0 && (
                <div
                  id="application-form-errors"
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="font-bold">ยังส่งใบสมัครไม่ได้ กรุณาตรวจสอบข้อมูล</p>
                  <p className="mt-1 text-xs">แก้ไขช่องที่มีข้อความแจ้งเตือนสีแดง</p>
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
                <h2 className="mb-3 text-base font-extrabold text-slate-900">
                  ความสนใจและแรงบันดาลใจ
                </h2>
                <label htmlFor="application-motivation" className="mb-1.5 block text-sm font-bold text-slate-800">
                  เหตุผลที่สนใจเข้าร่วมชมรมนี้ <span className="text-rose-600">*</span>
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
                  aria-describedby={errors.motivation ? 'motivation-error' : 'motivation-count'}
                  className={`${inputClass} resize-y ${errors.motivation ? 'border-rose-500 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                />
                {errors.motivation ? (
                  <p id="motivation-error" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.motivation}
                  </p>
                ) : (
                  <p id="motivation-count" className="mt-1.5 text-right text-xs text-slate-400">
                    {Array.from(formData.motivation).length.toLocaleString('th-TH')} / 2,000 ตัวอักษร
                  </p>
                )}
              </section>

              <section className={cardClass}>
                <div className="mb-4">
                  <h2 className="text-base font-extrabold text-slate-900">
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
                          <label htmlFor={answerId} className="mb-1.5 block text-sm font-bold leading-relaxed text-slate-800">
                            {question.displayOrder}. {question.questionText}{' '}
                            {question.isRequired ? (
                              <span className="text-rose-600">* (จำเป็นต้องตอบ)</span>
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
                            className={`${inputClass} resize-y ${questionError ? 'border-rose-500 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                          />
                          {questionError ? (
                            <p id={errorId} className="mt-1.5 text-xs font-medium text-rose-600">
                              {questionError}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-right text-xs text-slate-400">
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
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    แนบลิงก์ HTTPS ที่กรรมการสามารถเข้าถึงได้ ไม่รองรับการอัปโหลดไฟล์ (สูงสุด 5 รายการ)
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {formData.links.map((link, index) => {
                    const linkErrors = errors.links?.[link.id];
                    return (
                      <fieldset
                        key={link.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
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
                              className={`${inputClass} ${linkErrors?.label ? 'border-rose-500' : ''}`}
                            />
                            {linkErrors?.label && (
                              <p className="mt-1 text-xs text-rose-600">{linkErrors.label}</p>
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
                              className={`${inputClass} ${linkErrors?.url ? 'border-rose-500' : ''}`}
                            />
                            {linkErrors?.url && (
                              <p className="mt-1 text-xs text-rose-600">{linkErrors.url}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLink(link.id)}
                            className="self-end rounded-xl px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
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
                      className="self-start rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      + เพิ่มลิงก์เอกสาร
                    </button>
                  )}
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Link
                  to={`/clubs/${encodeURIComponent(clubId)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  ยกเลิก
                </Link>
                <button type="submit" className={primaryButtonClass}>
                  ตรวจสอบข้อมูลใบสมัคร <span className="ml-2" aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
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
                            className="mt-1 block break-all text-sm text-rose-700 underline"
                          >
                            {link.url.trim()}
                          </a>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(event) => setHasConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#C81E3D]"
                />
                <span>ฉันตรวจสอบข้อมูลและยืนยันว่าข้อมูลในใบสมัครถูกต้อง</span>
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setHasConfirmed(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasConfirmed || isSubmitting}
                  className={primaryButtonClass}
                >
                  {isSubmitting ? 'กำลังส่งใบสมัคร...' : 'ยืนยันและส่งใบสมัคร'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C81E3D] text-xs font-black text-white shadow-sm">
              TU
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              ClubHub
            </span>
          </Link>
          <span className="text-xs font-semibold text-slate-500">แบบฟอร์มสมัครชมรม</span>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-6 sm:pt-8">
        {children}
      </main>
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
    <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100/80 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-bold text-rose-700">
        TU
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-extrabold text-slate-900">{clubName}</h2>
        <p className="mt-0.5 text-xs font-medium text-slate-600">{form.round.title}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          ปิดรับสมัคร {formatThaiDateTime(form.round.closesAt)}
        </p>
      </div>
    </section>
  );
}
