import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiRequest, describeApiError } from '../../../lib/api.ts';
import { formatThaiDateTime } from '../../../lib/format';
import { useAuth, type User } from '../../auth/AuthContext.tsx';
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
  'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-sm leading-[21px] text-[#1F2937] outline-none transition placeholder:text-[#6B7280] focus:border-[#C41E3A] focus:ring-2 focus:ring-rose-100';
const primaryButtonClass =
  'inline-flex min-h-12 items-center justify-center rounded-lg bg-[#C41E3A] px-3.5 py-3 text-sm font-semibold text-white transition hover:bg-[#A01830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C41E3A] disabled:cursor-not-allowed disabled:bg-slate-300';

export function DynamicApplicationForm({
  clubId,
  roundId,
}: DynamicApplicationFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
    if (!current || !hasConfirmed || isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitApplicationAPI(
        roundId,
        toApplicationSubmissionPayload(formData, current.form.questions),
      );
      setHasSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(
        `/clubs/${encodeURIComponent(clubId)}/rounds/${encodeURIComponent(roundId)}/apply/result`,
        {
          state: {
            club: current.club,
            form: current.form,
            receipt: response,
          },
        },
      );
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
  const errorTargets: { id: string; label: string }[] = [];
  if (errors.motivation) {
    errorTargets.push({
      id: 'application-motivation',
      label: 'เหตุผลที่สนใจเข้าร่วมชมรม',
    });
  }
  for (const question of form.questions) {
    if (errors.answers?.[question.id]) {
      errorTargets.push({
        id: `application-answer-${question.id}`,
        label: `คำถามข้อ ${question.displayOrder}`,
      });
    }
  }
  for (const [index, link] of formData.links.entries()) {
    const linkErrors = errors.links?.[link.id];
    if (linkErrors?.label) {
      errorTargets.push({
        id: `${link.id}-label`,
        label: `ชื่อเอกสาร ${index + 1}`,
      });
    }
    if (linkErrors?.url) {
      errorTargets.push({
        id: `${link.id}-url`,
        label: `URL เอกสาร ${index + 1}`,
      });
    }
  }
  const reviewFooter = step === 'review' ? (
    <ReviewActionBar
      hasConfirmed={hasConfirmed}
      isSubmitting={isSubmitting}
      hasSubmitted={hasSubmitted}
      onConfirmationChange={setHasConfirmed}
      onBack={() => {
        setStep('form');
        setHasConfirmed(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onSubmit={handleSubmit}
    />
  ) : null;

  return (
    <PageShell accountName={user?.displayName} footer={reviewFooter}>
      <div className="rounded-lg bg-[#EFF4F8] px-2.5 py-2.5 text-xs leading-[18px] text-[#4B5563]">
        ข้อมูลการสมัครจะแสดงตามรายละเอียดรอบและข้อมูลบัญชีที่เข้าสู่ระบบ
      </div>
      <nav aria-label="เส้นทางนำทาง" className="text-xs leading-[18px] text-[#6B7280]">
        <Link className="transition hover:text-[#C41E3A]" to="/">
          ค้นหาชมรม
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <Link
          className="transition hover:text-[#C41E3A]"
          to={`/clubs/${encodeURIComponent(clubId)}`}
        >
          {title}
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <span className="font-medium text-[#1F2937]">ส่งใบสมัคร</span>
      </nav>

      <>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-extrabold text-[#112937]">
              {step === 'form' ? 'แบบฟอร์มสมัครเข้าร่วมชมรม' : 'ตรวจสอบข้อมูลใบสมัคร'}
            </h1>
            <p className="text-sm leading-[21px] text-[#4B5563]">
              {step === 'form'
                ? 'บอกเล่าความสนใจ แล้วมาเป็นส่วนหนึ่งของชมรม'
                : 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร'}
            </p>
          </div>

          <ClubRoundSummary
            clubName={title}
            clubImageUrl={club.imageUrl}
            form={form}
          />

          <ol className="flex w-full items-center gap-3 py-2 text-sm font-semibold" aria-label="ขั้นตอนการสมัคร">
            <li className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === 'form' ? 'bg-[#C41E3A] text-white' : 'bg-[#DEF7EC] text-[#03543F]'
              }`}>
                {step === 'form' ? '1' : '✓'}
              </span>
              <span className={`truncate ${step === 'form' ? 'text-[#C41E3A]' : 'text-[#03543F]'}`}>
                กรอกข้อมูล
              </span>
            </li>
            <li className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === 'review' ? 'bg-[#C41E3A] text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
              }`}>
                2
              </span>
              <span className={`truncate ${step === 'review' ? 'text-[#C41E3A]' : 'text-[#6B7280]'}`}>
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
            <form className="flex flex-col gap-5 sm:gap-6" onSubmit={handleNext} noValidate>
              {Object.keys(errors).length > 0 && (
                <div
                  id="application-form-errors"
                  className="flex flex-col gap-3 rounded-lg bg-[#FDE8E8] p-4 text-sm leading-[21px] text-[#9B1C1C]"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start gap-2.5">
                    <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <p>กรุณาตรวจสอบข้อมูลที่จำเป็นและแก้ไขช่องที่แสดงข้อความแจ้งเตือน</p>
                  </div>
                  {errorTargets.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-[30px] text-xs font-semibold leading-[18px]">
                      {errorTargets.map((target) => (
                        <a key={target.id} className="underline underline-offset-2" href={`#${target.id}`}>
                          {target.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ApplicantIdentityCard user={user} />

              <section className={cardClass}>
                <h2 className="mb-4 text-lg font-bold leading-[27px] text-[#112937]">
                  ความสนใจและแรงบันดาลใจ
                </h2>
                <label htmlFor="application-motivation" className="mb-2 block text-sm font-semibold text-[#1F2937]">
                  เหตุผลที่สนใจเข้าร่วมชมรมนี้ <span className="text-[#C41E3A]">*</span>
                </label>
                <textarea
                  id="application-motivation"
                  rows={4}
                  maxLength={2000}
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
                  className={`${inputClass} min-h-[120px] resize-y ${errors.motivation ? 'border-2 border-[#C41E3A] focus:border-[#C41E3A]' : ''}`}
                />
                {errors.motivation ? (
                  <p id="motivation-error" className="text-sm leading-[21px] text-[#9B1C1C]">
                    {errors.motivation}
                  </p>
                ) : (
                  <p id="motivation-count" className="text-right text-xs leading-[18px] text-[#6B7280]">
                    {Array.from(formData.motivation).length.toLocaleString('th-TH')} / 2,000 ตัวอักษร
                  </p>
                )}
              </section>

              <section className={`${cardClass} flex flex-col gap-4`}>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-[#112937]">
                    คำถามคัดเลือกจากทางชมรม
                  </h2>
                  <p className="text-xs leading-[18px] text-[#6B7280]">
                    คำตอบของคุณจะช่วยให้ชมรมรู้จักคุณมากขึ้น
                  </p>
                </div>
                {form.questions.length === 0 ? (
                  <p className="rounded-lg bg-[#EFF4F8] p-3.5 text-sm leading-[21px] text-[#4B5563]">
                    รอบนี้ไม่มีคำถามเพิ่มเติม กรุณาระบุเหตุผลในการสมัครให้ครบถ้วน
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {form.questions.map((question) => {
                      const answerId = `application-answer-${question.id}`;
                      const errorId = `${answerId}-error`;
                      const answer = formData.answers[question.id] ?? '';
                      const questionError = errors.answers?.[question.id];
                      return (
                        <div key={question.id}>
                          <label htmlFor={answerId} className="mb-2 block text-sm font-semibold leading-[21px] text-[#1F2937]">
                            {question.displayOrder}. {question.questionText}{' '}
                            {question.isRequired ? (
                              <span className="text-[#C41E3A]">*</span>
                            ) : (
                              <span className="font-normal text-[#6B7280]">(ไม่บังคับ)</span>
                            )}
                          </label>
                          <textarea
                            id={answerId}
                            rows={3}
                            maxLength={question.maxLength}
                            value={answer}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                            placeholder="เขียนคำตอบของคุณ..."
                            aria-invalid={Boolean(questionError)}
                            aria-describedby={questionError ? errorId : undefined}
                            className={`${inputClass} min-h-[66px] resize-y ${questionError ? 'border-2 border-[#C41E3A] focus:border-[#C41E3A]' : ''}`}
                          />
                          {questionError ? (
                            <p id={errorId} className="text-sm leading-[21px] text-[#9B1C1C]">
                              {questionError}
                            </p>
                          ) : (
                            <p className="text-right text-xs leading-[18px] text-[#6B7280]">
                              {Array.from(answer).length.toLocaleString('th-TH')} / {question.maxLength.toLocaleString('th-TH')} ตัวอักษร
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={`${cardClass} flex flex-col gap-4`}>
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-bold text-[#112937]">
                    เอกสารประกอบ / พอร์ตโฟลิโอ <span className="font-normal text-slate-400">(ถ้ามี)</span>
                  </h2>
                  <p className="mt-2 text-sm leading-[21px] text-[#4B5563]">
                    แนบลิงก์ HTTPS ที่กรรมการสามารถเข้าถึงได้ ไม่รองรับการอัปโหลดไฟล์ (สูงสุด 5 รายการ)
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-[#EFF4F8] p-3.5">
                  <p className="flex items-center gap-2 text-xs font-semibold leading-[18px] text-[#1F2937]">
                    <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#4B5563]" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    ตรวจสอบสิทธิ์การเข้าถึงเอกสาร
                  </p>
                  <p className="text-sm leading-[21px] text-[#1F2937]">
                    ตั้งค่าลิงก์ให้ผู้พิจารณาสามารถเปิดดูได้ หากต้องลงชื่อเข้าใช้ โปรดใช้บริการที่เข้าถึงได้ด้วยบัญชีมหาวิทยาลัย
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {formData.links.map((link, index) => {
                    const linkErrors = errors.links?.[link.id];
                    return (
                      <fieldset
                        key={link.id}
                        className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5"
                      >
                        <legend className="px-1 text-xs font-semibold text-[#4B5563]">
                          เอกสารรายการที่ {index + 1}
                        </legend>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label htmlFor={`${link.id}-label`} className="mb-2 block text-sm font-semibold text-[#1F2937]">
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
                              <p className="mt-2 text-sm leading-[21px] text-[#9B1C1C]">{linkErrors.label}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`${link.id}-url`} className="mb-2 block text-sm font-semibold text-[#1F2937]">
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
                              <p className="mt-2 text-sm leading-[21px] text-[#9B1C1C]">{linkErrors.url}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLink(link.id)}
                            className="self-start rounded-lg px-3 py-2 text-xs font-semibold text-[#C41E3A] transition hover:bg-[#FFF1F3]"
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
                      className="inline-flex min-h-11 items-center justify-center self-start rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB]"
                    >
                      + เพิ่มลิงก์เอกสาร
                    </button>
                  )}
                </div>
              </section>

              <div className="flex flex-col gap-4">
                <p className="flex items-start gap-2 text-xs leading-[18px] text-[#6B7280]">
                  <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <span>ข้อมูลของคุณจะถูกใช้เพื่อพิจารณาการสมัครเข้าร่วมชมรมนี้เท่านั้น</span>
                </p>
                <div className="flex w-full items-center gap-3">
                <Link
                  to={`/clubs/${encodeURIComponent(clubId)}`}
                  className="inline-flex min-h-12 w-[90px] shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB] sm:w-[180px]"
                >
                  ยกเลิก
                </Link>
                <button type="submit" className={`${primaryButtonClass} min-w-0 flex-1`}>
                  ตรวจสอบข้อมูลใบสมัคร <span className="ml-2" aria-hidden="true">→</span>
                </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5 sm:gap-6">
              <ApplicantIdentityCard user={user} />
              <section className={cardClass}>
                <h2 className="text-base font-extrabold text-[#112937]">ความสนใจและแรงบันดาลใจ</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1F2937]">
                  {formData.motivation}
                </p>
              </section>
              {form.questions.length > 0 && (
                <section className={`${cardClass} flex flex-col gap-5`}>
                  <h2 className="text-base font-extrabold text-[#112937]">คำตอบคำถามคัดเลือก</h2>
                  {form.questions.map((question) => (
                    <div key={question.id}>
                      <h3 className="text-sm font-bold leading-relaxed text-[#1F2937]">
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
                <h2 className="text-base font-extrabold text-[#112937]">เอกสารประกอบ</h2>
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
            </div>
          )}
      </>
    </PageShell>
  );
}

export function ApplicationSuccessPage({
  clubId,
  club,
  form,
  receipt,
}: {
  clubId: string;
  club: PublicClubProfile;
  form: RoundApplicationForm;
  receipt: SubmitApplicationResponse;
}) {
  const { user } = useAuth();
  return (
    <PageShell accountName={user?.displayName} footer={<OutcomeActionBar />}>
      <nav aria-label="เส้นทางนำทาง" className="text-xs leading-[18px] text-[#6B7280]">
        <Link className="transition hover:text-[#C41E3A]" to="/">
          ค้นหาชมรม
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <Link
          className="transition hover:text-[#C41E3A]"
          to={`/clubs/${encodeURIComponent(clubId)}`}
        >
          {club.name}
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <span className="font-medium text-[#1F2937]">ส่งใบสมัคร</span>
      </nav>
      <h1 className="text-2xl font-bold leading-9 text-[#112937]">
        ผลการส่งใบสมัคร
      </h1>
      <section className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5 text-center sm:p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DEF7EC] text-[#03543F]">
          <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="m8 12 2.5 2.5L16.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-2xl font-bold leading-9 text-[#112937]">
          ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!
        </h2>
        <p className="rounded-full bg-[#EFF4F8] px-3 py-1.5 text-sm font-semibold leading-[21px] text-[#112937]">
          เลขที่ใบสมัคร {receipt.id} · {receipt.status}
        </p>
        <p className="text-sm leading-[21px] text-[#4B5563]">
          ระบบได้รับใบสมัครของคุณแล้ว สามารถติดตามผลการพิจารณาได้ที่ประวัติการสมัคร
        </p>
      </section>
      <ClubRoundSummary
        clubName={club.name}
        clubImageUrl={club.imageUrl}
        form={form}
      />
    </PageShell>
  );
}

function PageShell({
  children,
  accountName,
  footer,
}: {
  children: ReactNode;
  accountName?: string | null;
  footer?: ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-[#F9FAFB] font-sans text-[#1F2937] ${footer ? 'pb-56 sm:pb-60' : 'pb-16'}`}>
      <header className="sticky top-0 z-40 h-16 border-b border-[#E5E7EB] bg-white px-4 sm:h-20 sm:px-12">
        <div className="flex h-full items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="TU ClubHub หน้าหลัก">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C41E3A] text-sm font-extrabold text-white">
              TU
            </span>
            <span className="text-xl font-bold tracking-tight text-[#112937]">
              ClubHub
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-8 text-sm sm:flex">
            <Link className="font-semibold text-[#C41E3A]" to="/">
              ค้นหาชมรม
            </Link>
            <Link className="font-medium text-[#4B5563] hover:text-[#C41E3A]" to="/profile/applications">
              ประวัติการสมัคร
            </Link>
            <span className="max-w-48 truncate text-[#112937]">
              {accountName?.trim() || 'ผู้สมัคร'}
            </span>
          </nav>
          <details className="relative sm:hidden">
            <summary
              aria-label="เปิดเมนูหลัก"
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center text-[#112937] marker:hidden [&::-webkit-details-marker]:hidden"
            >
              <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              aria-label="เมนูหลัก"
              className="absolute right-0 top-12 z-50 flex w-52 flex-col gap-1 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
            >
              <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-[#C41E3A] hover:bg-[#F9FAFB]" to="/">
                ค้นหาชมรม
              </Link>
              <Link className="rounded-lg px-3 py-2 text-sm text-[#1F2937] hover:bg-[#F9FAFB]" to="/profile/applications">
                ประวัติการสมัคร
              </Link>
              <span className="truncate px-3 py-2 text-sm text-[#112937]">
                {accountName?.trim() || 'ผู้สมัคร'}
              </span>
            </nav>
          </details>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[832px] flex-col gap-5 px-4 pb-8 pt-5 sm:gap-6 sm:px-8 sm:pt-7">
        <div className="mx-auto flex w-full max-w-[768px] flex-col gap-5 sm:gap-6">
        {children}
        </div>
      </main>
      {footer}
    </div>
  );
}

function ApplicantIdentityCard({ user }: { user: User | null }) {
  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <h2 className="text-lg font-bold leading-[27px] text-[#112937]">ข้อมูลผู้สมัคร</h2>
      <div className="inline-flex min-h-[30px] self-start items-center gap-1.5 rounded-full bg-[#DEF7EC] px-2.5 py-1.5 text-xs leading-[18px] text-[#03543F]">
        <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>ยืนยันตัวตนผ่านบัญชีที่เข้าสู่ระบบแล้ว</span>
      </div>
      <p className="text-xs leading-[18px] text-[#6B7280]">
        ข้อมูลผู้สมัครอ้างอิงจากบัญชีที่เข้าสู่ระบบและไม่สามารถแก้ไขได้ในหน้านี้
      </p>
      <dl className="grid gap-y-4">
        <ProfileDetail label="ชื่อ-นามสกุล" value={user?.displayName} />
        <ProfileDetail label="รหัสนักศึกษา" value={user?.studentCode ? maskStudentCode(user.studentCode) : null} />
        <ProfileDetail label="อีเมลนักศึกษา" value={user?.email} />
        <ProfileDetail label="คณะ" value={user?.facultyName} />
      </dl>
    </section>
  );
}

function ProfileDetail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs leading-[18px] text-[#6B7280] sm:text-sm sm:leading-[21px]">{label}</dt>
      <dd className={`min-w-0 break-words text-sm leading-[21px] font-semibold ${value?.trim() ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
        {value?.trim() || 'ยังไม่มีข้อมูลจากระบบ'}
      </dd>
    </div>
  );
}

function maskStudentCode(studentCode: string) {
  const code = studentCode.trim();
  if (code.length <= 4) return '•'.repeat(code.length);
  return `${code.slice(0, 2)}${'•'.repeat(code.length - 4)}${code.slice(-2)}`;
}

function ReviewActionBar({
  hasConfirmed,
  isSubmitting,
  hasSubmitted,
  onConfirmationChange,
  onBack,
  onSubmit,
}: {
  hasConfirmed: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  onConfirmationChange: (confirmed: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white px-4 pb-6 pt-3 sm:px-8 sm:pb-5">
      <div className="mx-auto flex max-w-[768px] flex-col gap-2.5">
        <p className="text-xs leading-5 text-[#6B7280]">
          กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร
        </p>
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-[#1F2937]">
          <input
            type="checkbox"
            checked={hasConfirmed}
            onChange={(event) => onConfirmationChange(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#C41E3A]"
          />
          <span>ฉันตรวจสอบข้อมูลและยืนยันว่าข้อมูลในใบสมัครถูกต้อง</span>
        </label>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            กลับไปแก้ไข
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasConfirmed || isSubmitting || hasSubmitted}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[#C41E3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A01830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C41E3A] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
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
    </footer>
  );
}

function OutcomeActionBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white px-4 pb-6 pt-3 sm:px-8 sm:pb-5">
      <div className="mx-auto flex max-w-[768px] flex-col gap-2.5 sm:flex-row">
        <Link
          to="/profile/applications"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[#C41E3A] px-3.5 py-3 text-sm font-semibold text-white transition hover:bg-[#A01830]"
        >
          ไปยังประวัติการสมัคร
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-[#F9FAFB]"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </footer>
  );
}

function ClubRoundSummary({
  clubName,
  clubImageUrl,
  form,
}: {
  clubName: string;
  clubImageUrl: string | null;
  form: RoundApplicationForm;
}) {
  return (
    <section className="flex min-h-[139px] items-start gap-4 rounded-xl bg-[#EFF4F8] p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white text-[#C41E3A]">
        {clubImageUrl ? (
          <img className="h-full w-full object-cover" src={clubImageUrl} alt="" />
        ) : (
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <h2 className="text-lg font-semibold leading-[27px] text-[#112937]">{clubName}</h2>
        <p className="text-sm leading-[21px] text-[#1F2937]">{form.round.title}</p>
        <p className="line-clamp-1 text-xs leading-[18px] text-[#4B5563]">
          เปิดรับสมัคร {formatThaiDateTime(form.round.opensAt)}
        </p>
        <p className="line-clamp-1 text-xs leading-[18px] text-[#6B7280]">
          ปิดรับสมัคร {formatThaiDateTime(form.round.closesAt)}
        </p>
      </div>
    </section>
  );
}
