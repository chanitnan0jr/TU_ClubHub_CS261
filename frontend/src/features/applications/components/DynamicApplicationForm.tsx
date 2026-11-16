import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Image as LucideImage,
  Info,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react';
import { WIDE_CONTAINER_CLASS } from '../../../components/layout/PublicLayout.tsx';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs.tsx';
import { buttonClass, inputClass } from '../../../components/ui/classes.ts';
import { Field } from '../../../components/ui/Field.tsx';
import { apiRequest, describeApiError } from '../../../lib/api.ts';
import { formatThaiDateTime } from '../../../lib/format';
import { useAuth, type User } from '../../auth/AuthContext.tsx';
import type { PublicClubProfile } from '../../clubs/types/club.ts';
import { ApplicantIdentityGrid } from './ApplicantIdentityGrid.tsx';
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

const applicationBreadcrumbs = (clubId: string, clubName: string) => [
  { label: 'สำรวจชมรม', to: '/' },
  { label: clubName, to: `/clubs/${encodeURIComponent(clubId)}` },
  { label: 'ส่งใบสมัคร' },
];

const BREADCRUMB_SEPARATOR = (
  <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 shrink-0 text-[#9A918B]" />
);

const EDITORIAL_TEXTAREA_CLASS =
  'w-full rounded-xl border bg-white px-4 py-3 text-base leading-6 text-[#25202A] placeholder:text-[#766E68] shadow-[0_1px_2px_rgba(37,32,42,0.03)] transition duration-150 focus:outline-none focus:ring-4 sm:text-sm';

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
      const errorBanner = document.getElementById('application-form-errors');
      errorBanner?.focus({ preventScroll: true });
      errorBanner?.scrollIntoView({
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
        <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-[#59545B]">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-[#DFD6CB] border-t-[#861638]"
          />
          <span>กำลังโหลดแบบฟอร์มสมัคร...</span>
        </div>
      </PageShell>
    );
  }

  if (loadError || !current) {
    return (
      <PageShell>
        <section className="flex flex-col items-center rounded-2xl border border-[#E5DDD2] bg-white p-8 text-center" role="alert">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertCircle strokeWidth={1.75} className="size-6" />
          </span>
          <h1 className="text-lg font-bold text-[#25202A]">
            ไม่สามารถเปิดแบบฟอร์มได้
          </h1>
          <p className="mt-2 text-sm text-[#59545B]">{loadError}</p>
          <Link
            to={`/clubs/${encodeURIComponent(clubId)}`}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#861638] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#68112B]"
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
    <PageShell footer={reviewFooter}>
      <Breadcrumbs items={applicationBreadcrumbs(clubId, title)} separator={BREADCRUMB_SEPARATOR} />

      <div className="animate-club-rise pb-1">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-7 w-[3.5px] shrink-0 rounded-full bg-[#861638]" />
              <h1 className="text-[28px] font-extrabold tracking-[-0.015em] text-[#25202A] sm:text-[32px]">
                {step === 'form' ? 'ส่งใบสมัครเข้าชมรม' : 'ตรวจสอบข้อมูลใบสมัคร'}
              </h1>
            </div>
            <p className="mt-1 pl-[15.5px] text-[15px] text-[#59545B]">
              {step === 'form'
                ? 'กรอกข้อมูลและเอกสารเพื่อสมัครเข้าร่วมชมรม'
                : 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร'}
            </p>
          </div>

          <ol
            className="inline-flex w-fit items-center gap-3 rounded-full border border-[#E5DDD2] bg-white/80 px-4 py-2 text-sm shadow-[0_1px_2px_rgba(37,32,42,0.03)]"
            aria-label="ขั้นตอนการสมัคร"
          >
            <li className="flex items-center gap-2 whitespace-nowrap">
              {step === 'form' ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#861638] text-xs font-bold text-white ring-4 ring-[#861638]/12">
                  1
                </span>
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1E7A48] text-white">
                  <Check aria-hidden="true" strokeWidth={2.5} className="size-4" />
                </span>
              )}
              <span className={step === 'form' ? 'font-bold text-[#861638]' : 'font-semibold text-[#185C3A]'}>
                กรอกข้อมูล
              </span>
            </li>
            <li
              aria-hidden="true"
              className={`h-[2px] w-8 rounded-full transition-colors sm:w-12 ${
                step === 'review' ? 'bg-[#1E7A48]/40' : 'bg-[#DFD6CB]'
              }`}
            />
            <li className="flex items-center gap-2 whitespace-nowrap">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step === 'review'
                    ? 'bg-[#861638] text-white ring-4 ring-[#861638]/12'
                    : 'bg-[#EDE6DC] text-[#59545B]'
                }`}
              >
                2
              </span>
              <span className={step === 'review' ? 'font-bold text-[#861638]' : 'font-medium text-[#59545B]'}>
                ตรวจสอบข้อมูล
              </span>
            </li>
          </ol>
        </div>
      </div>

      {submitError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {step === 'form' ? (
        <form
          className="flex flex-col gap-7 rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_2px_10px_-4px_rgba(37,32,42,0.06)] sm:p-8 lg:p-10"
          onSubmit={handleNext}
          noValidate
        >
          <ClubRoundSummary
            embedded
            clubName={title}
            clubCategory={club.category?.name}
            clubImageUrl={club.bannerUrl ?? club.imageUrl}
            form={form}
          />

          {Object.keys(errors).length > 0 && (
            <div
              id="application-form-errors"
              tabIndex={-1}
              className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:outline-none"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" />
                <p>กรุณาตรวจสอบข้อมูลที่จำเป็นและแก้ไขช่องที่แสดงข้อความแจ้งเตือน</p>
              </div>
              {errorTargets.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 pl-[30px] text-sm font-semibold">
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

          <section className="flex flex-col gap-5 border-b border-[#E5DDD2] pb-7">
            <EditorialSectionHeading title="คำถามจากชมรม" />

            <Field
              id="application-motivation"
              label={
                <>
                  เหตุผลที่สนใจเข้าร่วมชมรม<span className="sr-only">นี้</span>
                </>
              }
              required
              error={errors.motivation}
              hint={`${Array.from(formData.motivation).length.toLocaleString('th-TH')} / 2,000 ตัวอักษร`}
              hintAlign="right"
            >
              {(control) => (
                <textarea
                  {...control}
                  rows={4}
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
                  placeholder="อธิบายเหตุผล ความคาดหวัง หรือสิ่งที่ต้องการเรียนรู้จากการเข้าร่วมกิจกรรมของชมรม..."
                  className={`${EDITORIAL_TEXTAREA_CLASS} min-h-[124px] resize-y ${
                    errors.motivation
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
                      : 'border-[#DFD6CB] focus:border-[#861638] focus:ring-[#861638]/12'
                  }`}
                />
              )}
            </Field>

            {form.questions.map((question) => {
              const answer = formData.answers[question.id] ?? '';
              const questionError = errors.answers?.[question.id];
              return (
                <Field
                  key={question.id}
                  id={`application-answer-${question.id}`}
                  label={
                    <>
                      {question.displayOrder}. {question.questionText}
                      {!question.isRequired && (
                        <span className="font-normal text-[#706B70]"> (ไม่บังคับ)</span>
                      )}
                    </>
                  }
                  required={question.isRequired}
                  error={questionError}
                  hint={`${Array.from(answer).length.toLocaleString('th-TH')} / ${question.maxLength.toLocaleString('th-TH')} ตัวอักษร`}
                  hintAlign="right"
                >
                  {(control) => (
                    <textarea
                      {...control}
                      rows={3}
                      value={answer}
                      onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                      placeholder="เขียนคำตอบของคุณ..."
                      className={`${EDITORIAL_TEXTAREA_CLASS} min-h-[88px] resize-y ${
                        questionError
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
                          : 'border-[#DFD6CB] focus:border-[#861638] focus:ring-[#861638]/12'
                      }`}
                    />
                  )}
                </Field>
              );
            })}
          </section>

          <section className="flex flex-col gap-3 border-b border-[#E5DDD2] pb-7">
            <div>
              <EditorialSectionHeading title="เอกสารประกอบ (ถ้ามี)" />
              <p className="mt-1 text-sm text-[#59545B]">
                แนบลิงก์เอกสารที่เกี่ยวข้อง เช่น Portfolio, ใบรับรองผลงาน (รองรับ HTTPS เท่านั้น)
              </p>
            </div>

            {formData.links.length === 0 ? (
              <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div
                  onClick={addLink}
                  className="flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border border-[#DFD6CB] bg-[#FAF7F3]/70 px-4 py-2.5 text-sm text-[#686065] transition duration-150 hover:border-[#861638]/35 hover:bg-white"
                >
                  <Paperclip aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-[#59545B]" />
                  <span>เพิ่มลิงก์เอกสาร</span>
                </div>
                <button
                  type="button"
                  onClick={addLink}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#DFD6CB] bg-white px-5 py-2.5 text-sm font-semibold text-[#25202A] shadow-[0_1px_2px_rgba(37,32,42,0.03)] transition duration-150 hover:border-[#861638]/40 hover:bg-[#F7F1EB] hover:text-[#861638] active:scale-[0.99]"
                >
                  <Plus aria-hidden="true" strokeWidth={2} className="size-4" />
                  <span>
                    เพิ่มลิงก์<span className="sr-only">เอกสาร</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-3">
                {formData.links.map((link, index) => {
                  const linkErrors = errors.links?.[link.id];
                  return (
                    <fieldset
                      key={link.id}
                      className="rounded-xl border border-[#DFD6CB] bg-white p-4 shadow-[0_1px_2px_rgba(37,32,42,0.03)]"
                    >
                      <legend className="px-1 text-xs font-semibold text-[#59545B]">
                        เอกสารรายการที่ {index + 1}
                      </legend>
                      <div className="mt-2 grid gap-4 sm:grid-cols-2">
                        <Field id={`${link.id}-label`} label="ชื่อ/คำอธิบายเอกสาร" error={linkErrors?.label}>
                          {(control) => (
                            <input
                              {...control}
                              value={link.label}
                              onChange={(event) => updateLink(link.id, 'label', event.target.value)}
                              placeholder="พอร์ตโฟลิโอ หรือผลงานที่เคยทำ"
                              className={`${inputClass(Boolean(linkErrors?.label))} text-base sm:text-sm`}
                            />
                          )}
                        </Field>
                        <Field id={`${link.id}-url`} label="URL ลิงก์เอกสาร" error={linkErrors?.url}>
                          {(control) => (
                            <input
                              {...control}
                              type="url"
                              inputMode="url"
                              value={link.url}
                              onChange={(event) => updateLink(link.id, 'url', event.target.value)}
                              placeholder="https://example.com/portfolio"
                              className={`${inputClass(Boolean(linkErrors?.url))} text-base sm:text-sm`}
                            />
                          )}
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLink(link.id)}
                        className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                      >
                        <Trash2 aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                        <span>ลบเอกสารรายการนี้</span>
                      </button>
                    </fieldset>
                  );
                })}
                {formData.links.length < 5 && (
                  <button
                    type="button"
                    onClick={addLink}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-xl border border-[#DFD6CB] bg-white px-5 py-2.5 text-sm font-semibold text-[#25202A] transition duration-150 hover:border-[#861638]/40 hover:bg-[#F7F1EB] hover:text-[#861638] active:scale-[0.99]"
                  >
                    <Plus aria-hidden="true" strokeWidth={2} className="size-4" />
                    <span>
                      เพิ่มลิงก์<span className="sr-only">เอกสาร</span>
                    </span>
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-[#59545B]">รองรับลิงก์ HTTPS สูงสุด 5 รายการ</p>
          </section>

          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-xs text-[#59545B] sm:text-sm">
              <Info aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-[#59545B]" />
              <span>ข้อมูลของคุณจะถูกใช้เพื่อพิจารณาการสมัครเข้าร่วมชมรมนี้เท่านั้น</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2.2fr]">
              <Link
                to={`/clubs/${encodeURIComponent(clubId)}`}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-[#DFD6CB] bg-white px-6 py-3 text-sm font-semibold text-[#25202A] shadow-[0_1px_2px_rgba(37,32,42,0.03)] transition duration-150 hover:border-[#C9BFAF] hover:bg-[#F5EFE8] active:scale-[0.99]"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#861638] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[#861638]/20 transition duration-150 hover:-translate-y-0.5 hover:bg-[#68112B] active:translate-y-0 active:scale-[0.99]"
              >
                <span>ตรวจสอบข้อมูลใบสมัคร</span>
                <ArrowRight aria-hidden="true" strokeWidth={1.85} className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-7 rounded-2xl border border-[#EAE2D8] bg-white p-6 shadow-[0_2px_10px_-4px_rgba(37,32,42,0.06)] sm:p-8 lg:p-10">
          <ClubRoundSummary
            embedded
            clubName={title}
            clubCategory={club.category?.name}
            clubImageUrl={club.bannerUrl ?? club.imageUrl}
            form={form}
          />
          <ApplicantIdentityCard user={user} />

          <section className="flex flex-col gap-3 border-b border-[#E5DDD2] pb-6">
            <EditorialSectionHeading title="เหตุผลที่สนใจเข้าร่วมชมรม" />
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#25202A]">
              {formData.motivation}
            </p>
          </section>

          {form.questions.length > 0 && (
            <section className="flex flex-col gap-5 border-b border-[#E5DDD2] pb-6">
              <EditorialSectionHeading title="คำตอบคำถามคัดเลือก" />
              {form.questions.map((question) => (
                <div key={question.id}>
                  <h3 className="text-sm font-semibold leading-relaxed text-[#25202A]">
                    {question.displayOrder}. {question.questionText}
                  </h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#59545B]">
                    {formData.answers[question.id]?.trim() || 'ไม่ได้กรอกข้อมูล'}
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <EditorialSectionHeading title="เอกสารประกอบ" />
            {formData.links.filter((link) => link.label.trim() && link.url.trim()).length === 0 ? (
              <p className="text-sm text-[#706B70]">ไม่ได้แนบเอกสาร</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {formData.links
                  .filter((link) => link.label.trim() && link.url.trim())
                  .map((link) => (
                    <li key={link.id}>
                      <p className="text-sm font-semibold text-[#25202A]">{link.label.trim()}</p>
                      <a
                        href={link.url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block break-all text-sm text-[#861638] underline underline-offset-2"
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
  return (
    <PageShell footer={<OutcomeActionBar />}>
      <Breadcrumbs items={applicationBreadcrumbs(clubId, club.name)} separator={BREADCRUMB_SEPARATOR} />
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-7 w-[3.5px] shrink-0 rounded-full bg-[#861638]" />
        <h1 className="text-[26px] font-extrabold tracking-tight text-[#25202A] sm:text-[30px]">
          ผลการส่งใบสมัคร
        </h1>
      </div>
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5DDD2] bg-white p-6 text-center sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CircleCheck strokeWidth={1.75} className="size-7" />
        </span>
        <h2 className="text-xl font-bold text-[#25202A]">
          ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!
        </h2>
        <p className="rounded-full bg-[#F5EFE8] px-3.5 py-1.5 text-sm font-semibold text-[#25202A]">
          เลขที่ใบสมัคร {receipt.id} · {receipt.status}
        </p>
        <p className="text-sm text-[#59545B]">
          ระบบได้รับใบสมัครของคุณแล้ว สามารถติดตามผลการพิจารณาได้ที่ประวัติการสมัคร
        </p>
      </section>
      <ClubRoundSummary
        clubName={club.name}
        clubCategory={club.category?.name}
        clubImageUrl={club.bannerUrl ?? club.imageUrl}
        form={form}
      />
    </PageShell>
  );
}

function EditorialSectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
      <h2 className="text-lg font-extrabold text-[#25202A]">{title}</h2>
    </div>
  );
}

// Page body inside PublicLayout; leaves room for the fixed action bar when there is one.
function PageShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={footer ? 'pb-56 sm:pb-48' : 'pb-10'}>
      <div className={`${WIDE_CONTAINER_CLASS} flex flex-col gap-6 py-6 sm:py-8`}>
        {children}
      </div>
      {footer}
    </div>
  );
}

function ApplicantIdentityCard({ user }: { user: User | null }) {
  return (
    <section aria-labelledby="applicant-identity-heading" className="border-b border-[#E5DDD2] pb-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-5 w-[3px] shrink-0 rounded-full bg-[#861638]" />
          <h2 id="applicant-identity-heading" className="text-lg font-extrabold text-[#25202A]">
            ข้อมูลผู้สมัคร
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CDE6D6] bg-[#EDF7F1] px-2.5 py-1 font-medium text-[#185C3A]">
            <CircleCheck aria-hidden="true" strokeWidth={1.85} className="size-3.5 shrink-0" />
            <span>ยืนยันตัวตนผ่านบัญชีที่เข้าสู่ระบบแล้ว</span>
          </span>
          <span className="text-[#59545B]">ไม่สามารถแก้ไขได้ที่นี่</span>
        </div>
      </div>

      <ApplicantIdentityGrid
        user={user}
        emptyText="ยังไม่มีข้อมูลจากระบบ"
        iconBgClass="bg-[#F5EFE8]"
        className="mt-4"
      />
    </section>
  );
}

const actionBarClass =
  'fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DDD2] bg-white/95 pb-6 pt-3 backdrop-blur-sm sm:pb-5';

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
    <footer className={actionBarClass}>
      <div className={`${WIDE_CONTAINER_CLASS} flex flex-col gap-2.5`}>
        <p className="text-sm text-[#59545B]">
          กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร
        </p>
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-[#25202A]">
          <input
            type="checkbox"
            checked={hasConfirmed}
            onChange={(event) => onConfirmationChange(event.target.checked)}
            className="mt-1 size-4 shrink-0 cursor-pointer accent-[#861638]"
          />
          <span>ฉันตรวจสอบข้อมูลและยืนยันว่าข้อมูลในใบสมัครถูกต้อง</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_2.2fr]">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#DFD6CB] bg-white px-5 py-2.5 text-sm font-semibold text-[#25202A] transition duration-150 hover:border-[#C9BFAF] hover:bg-[#F5EFE8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            กลับไปแก้ไข
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasConfirmed || hasSubmitted || isSubmitting}
            aria-live="polite"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#861638] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#861638]/20 transition duration-150 hover:bg-[#68112B] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            <span>
              {isSubmitting
                ? 'กำลังส่งใบสมัคร...'
                : hasSubmitted
                  ? 'ส่งใบสมัครแล้ว'
                  : 'ยืนยันและส่งใบสมัคร'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}

function OutcomeActionBar() {
  return (
    <footer className={actionBarClass}>
      <div className={`${WIDE_CONTAINER_CLASS} flex flex-col gap-2.5 sm:flex-row`}>
        <Link to="/profile/applications" className={`${buttonClass('primary')} flex-1`}>
          ไปยังประวัติการสมัคร
        </Link>
        <Link to="/" className={`${buttonClass('secondary')} flex-1`}>
          กลับหน้าหลัก
        </Link>
      </div>
    </footer>
  );
}

function ClubRoundSummary({
  clubName,
  clubCategory,
  clubImageUrl,
  form,
  embedded = false,
}: {
  clubName: string;
  clubCategory?: string | null;
  clubImageUrl: string | null;
  form: RoundApplicationForm;
  embedded?: boolean;
}) {
  const closeFormatted = formatThaiDateTime(form.round.closesAt);

  return (
    <section
      className={
        embedded
          ? 'group flex flex-col gap-4 border-b border-[#E5DDD2] pb-7 sm:flex-row sm:items-center sm:justify-between'
          : 'group flex flex-col gap-4 rounded-2xl border border-[#E5DDD2] bg-white p-4 shadow-[0_1px_2px_rgba(37,32,42,0.03)] sm:flex-row sm:items-center sm:justify-between sm:p-5'
      }
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E5DDD2] bg-[#F2E7E5] text-[#861638] sm:h-[100px] sm:w-[180px]">
          {clubImageUrl ? (
            <img
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              src={clubImageUrl}
              alt=""
            />
          ) : (
            <LucideImage aria-hidden="true" strokeWidth={1.75} className="size-7" />
          )}
        </div>
        <div className="min-w-0">
          {clubCategory?.trim() && (
            <span className="mb-1.5 inline-flex rounded-full bg-[#F2E7E5] px-2.5 py-0.5 text-xs font-semibold text-[#861638]">
              {clubCategory}
            </span>
          )}
          <h2 className="truncate text-lg font-extrabold tracking-tight text-[#25202A] sm:text-xl">
            {clubName}
          </h2>
          <p className="mt-0.5 text-sm text-[#59545B]">{form.round.title}</p>
        </div>
      </div>

      {closeFormatted && (
        <p className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#E5DDD2] bg-[#FAF7F3] px-3.5 py-1.5 text-xs font-medium text-[#25202A] sm:text-sm">
          <CalendarDays aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-[#861638]" />
          <span>ปิดรับ {closeFormatted} น.</span>
        </p>
      )}
    </section>
  );
}
