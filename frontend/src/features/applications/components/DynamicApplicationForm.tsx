import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { buttonClass, inputClass } from '../../../components/ui/classes.ts';
import { Field } from '../../../components/ui/Field.tsx';
import { CircleAlertIcon, CircleCheckIcon, ImageIcon, InfoIcon } from '../../../components/ui/icons.tsx';
import { SectionCard } from '../../../components/ui/SectionCard.tsx';
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

const applicationBreadcrumbs = (clubId: string, clubName: string) => [
  { label: 'ค้นหาชมรม', to: '/' },
  { label: clubName, to: `/clubs/${encodeURIComponent(clubId)}` },
  { label: 'ส่งใบสมัคร' },
];

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
        <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-slate-600">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-tu-maroon"
          />
          <span>กำลังโหลดแบบฟอร์มสมัคร...</span>
        </div>
      </PageShell>
    );
  }

  if (loadError || !current) {
    return (
      <PageShell>
        <section className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center" role="alert">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
            <CircleAlertIcon className="size-6" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">
            ไม่สามารถเปิดแบบฟอร์มได้
          </h1>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <Link
            to={`/clubs/${encodeURIComponent(clubId)}`}
            className={`${buttonClass('primary')} mt-5`}
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
      <Breadcrumbs items={applicationBreadcrumbs(clubId, title)} />
      <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
        <InfoIcon className="mt-0.5 size-4 text-slate-600" />
        ข้อมูลการสมัครจะแสดงตามรายละเอียดรอบและข้อมูลบัญชีที่เข้าสู่ระบบ
      </p>

      <>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {step === 'form' ? 'แบบฟอร์มสมัครเข้าร่วมชมรม' : 'ตรวจสอบข้อมูลใบสมัคร'}
            </h1>
            <p className="text-sm text-slate-600">
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
              {step === 'form' ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-tu-maroon text-white">1</span>
              ) : (
                <CircleCheckIcon className="size-7 text-emerald-700" />
              )}
              <span className={`truncate ${step === 'form' ? 'text-tu-maroon' : 'text-emerald-800'}`}>
                กรอกข้อมูล
              </span>
            </li>
            <li className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`flex size-7 items-center justify-center rounded-full ${
                step === 'review' ? 'bg-tu-maroon text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <span className={`truncate ${step === 'review' ? 'text-tu-maroon' : 'text-slate-600'}`}>
                ตรวจสอบข้อมูล
              </span>
            </li>
          </ol>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <CircleAlertIcon className="mt-0.5 size-4" />
              <span>{submitError}</span>
            </div>
          )}

          {step === 'form' ? (
            <form className="flex flex-col gap-6" onSubmit={handleNext} noValidate>
              {Object.keys(errors).length > 0 && (
                <div
                  id="application-form-errors"
                  className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start gap-2.5">
                    <CircleAlertIcon className="mt-0.5 size-5" />
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

              <SectionCard title="ความสนใจและแรงบันดาลใจ">
                <Field
                  id="application-motivation"
                  label="เหตุผลที่สนใจเข้าร่วมชมรมนี้"
                  required
                  error={errors.motivation}
                  hint={`${Array.from(formData.motivation).length.toLocaleString('th-TH')} / 2,000 ตัวอักษร`}
                >
                  {(control) => (
                    <textarea
                      {...control}
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
                      className={`${inputClass(Boolean(errors.motivation))} min-h-[120px] resize-y`}
                    />
                  )}
                </Field>
              </SectionCard>

              <SectionCard
                title="คำถามคัดเลือกจากทางชมรม"
                description="คำตอบของคุณจะช่วยให้ชมรมรู้จักคุณมากขึ้น"
              >
                {form.questions.length === 0 ? (
                  <p className="rounded-lg bg-slate-100 p-3.5 text-sm text-slate-700">
                    รอบนี้ไม่มีคำถามเพิ่มเติม กรุณาระบุเหตุผลในการสมัครให้ครบถ้วน
                  </p>
                ) : (
                  form.questions.map((question) => {
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
                              <span className="font-normal text-slate-600"> (ไม่บังคับ)</span>
                            )}
                          </>
                        }
                        required={question.isRequired}
                        error={questionError}
                        hint={`${Array.from(answer).length.toLocaleString('th-TH')} / ${question.maxLength.toLocaleString('th-TH')} ตัวอักษร`}
                      >
                        {(control) => (
                          <textarea
                            {...control}
                            rows={3}
                            maxLength={question.maxLength}
                            value={answer}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                            placeholder="เขียนคำตอบของคุณ..."
                            className={`${inputClass(Boolean(questionError))} min-h-[66px] resize-y`}
                          />
                        )}
                      </Field>
                    );
                  })
                )}
              </SectionCard>

              <SectionCard
                title="เอกสารประกอบ / พอร์ตโฟลิโอ (ถ้ามี)"
                description="แนบลิงก์ HTTPS ที่กรรมการสามารถเข้าถึงได้ ไม่รองรับการอัปโหลดไฟล์ (สูงสุด 5 รายการ)"
              >
                <div className="flex flex-col gap-1.5 rounded-lg bg-slate-100 p-3.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <InfoIcon className="size-4 text-slate-600" />
                    ตรวจสอบสิทธิ์การเข้าถึงเอกสาร
                  </p>
                  <p className="text-sm text-slate-700">
                    ตั้งค่าลิงก์ให้ผู้พิจารณาสามารถเปิดดูได้ หากต้องลงชื่อเข้าใช้ โปรดใช้บริการที่เข้าถึงได้ด้วยบัญชีมหาวิทยาลัย
                  </p>
                </div>
                {formData.links.map((link, index) => {
                  const linkErrors = errors.links?.[link.id];
                  return (
                    <fieldset
                      key={link.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <legend className="px-1 text-sm font-semibold text-slate-700">
                        เอกสารรายการที่ {index + 1}
                      </legend>
                      <div className="flex flex-col gap-4">
                        <Field id={`${link.id}-label`} label="ชื่อ/คำอธิบายเอกสาร" error={linkErrors?.label}>
                          {(control) => (
                            <input
                              {...control}
                              value={link.label}
                              onChange={(event) => updateLink(link.id, 'label', event.target.value)}
                              placeholder="พอร์ตโฟลิโอ หรือผลงานที่เคยทำ"
                              className={inputClass(Boolean(linkErrors?.label))}
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
                              className={inputClass(Boolean(linkErrors?.url))}
                            />
                          )}
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeLink(link.id)}
                          className="inline-flex min-h-11 items-center self-start rounded-lg px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          ลบเอกสารรายการนี้
                        </button>
                      </div>
                    </fieldset>
                  );
                })}
                {formData.links.length < 5 && (
                  <Button onClick={addLink} className="self-start">
                    + เพิ่มลิงก์เอกสาร
                  </Button>
                )}
              </SectionCard>

              <div className="flex flex-col gap-4">
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <InfoIcon className="mt-0.5 size-4" />
                  <span>ข้อมูลของคุณจะถูกใช้เพื่อพิจารณาการสมัครเข้าร่วมชมรมนี้เท่านั้น</span>
                </p>
                <div className="flex w-full items-center gap-3">
                  <Link
                    to={`/clubs/${encodeURIComponent(clubId)}`}
                    className={`${buttonClass('secondary')} w-[90px] shrink-0 sm:w-[180px]`}
                  >
                    ยกเลิก
                  </Link>
                  <Button type="submit" variant="primary" className="min-w-0 flex-1">
                    ตรวจสอบข้อมูลใบสมัคร
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <ApplicantIdentityCard user={user} />
              <SectionCard title="ความสนใจและแรงบันดาลใจ">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {formData.motivation}
                </p>
              </SectionCard>
              {form.questions.length > 0 && (
                <SectionCard title="คำตอบคำถามคัดเลือก">
                  {form.questions.map((question) => (
                    <div key={question.id}>
                      <h3 className="text-sm font-semibold leading-relaxed text-slate-900">
                        {question.displayOrder}. {question.questionText}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {formData.answers[question.id]?.trim() || 'ไม่ได้กรอกข้อมูล'}
                      </p>
                    </div>
                  ))}
                </SectionCard>
              )}
              <SectionCard title="เอกสารประกอบ">
                {formData.links.filter((link) => link.label.trim() && link.url.trim()).length === 0 ? (
                  <p className="text-sm text-slate-600">ไม่ได้แนบเอกสาร</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {formData.links
                      .filter((link) => link.label.trim() && link.url.trim())
                      .map((link) => (
                        <li key={link.id}>
                          <p className="text-sm font-semibold text-slate-900">{link.label.trim()}</p>
                          <a
                            href={link.url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm text-tu-maroon underline"
                          >
                            {link.url.trim()}
                          </a>
                        </li>
                      ))}
                  </ul>
                )}
              </SectionCard>
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
  return (
    <PageShell footer={<OutcomeActionBar />}>
      <Breadcrumbs items={applicationBreadcrumbs(clubId, club.name)} />
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        ผลการส่งใบสมัคร
      </h1>
      <section className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-center sm:p-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CircleCheckIcon className="size-7" />
        </span>
        <h2 className="text-xl font-semibold text-slate-900">
          ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!
        </h2>
        <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">
          เลขที่ใบสมัคร {receipt.id} · {receipt.status}
        </p>
        <p className="text-sm text-slate-600">
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

// Page body inside PublicLayout; leaves room for the fixed action bar when there is one.
function PageShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={footer ? 'pb-56 sm:pb-48' : 'pb-8'}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {children}
      </div>
      {footer}
    </div>
  );
}

function ApplicantIdentityCard({ user }: { user: User | null }) {
  return (
    <SectionCard title="ข้อมูลผู้สมัคร">
      <div className="inline-flex min-h-[30px] self-start items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
        <CircleCheckIcon className="size-4" />
        <span>ยืนยันตัวตนผ่านบัญชีที่เข้าสู่ระบบแล้ว</span>
      </div>
      <p className="text-sm text-slate-600">
        ข้อมูลผู้สมัครอ้างอิงจากบัญชีที่เข้าสู่ระบบและไม่สามารถแก้ไขได้ในหน้านี้
      </p>
      <dl className="grid gap-y-4">
        <ProfileDetail label="ชื่อ-นามสกุล" value={user?.displayName} />
        <ProfileDetail label="รหัสนักศึกษา" value={user?.studentCode ? maskStudentCode(user.studentCode) : null} />
        <ProfileDetail label="อีเมลนักศึกษา" value={user?.email} />
        <ProfileDetail label="คณะ" value={user?.facultyName} />
      </dl>
    </SectionCard>
  );
}

function ProfileDetail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={`min-w-0 break-words text-sm ${value?.trim() ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
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

const actionBarClass =
  'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-4 pb-6 pt-3 sm:px-8 sm:pb-5';

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
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        <p className="text-sm text-slate-600">
          กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยันการส่งใบสมัคร
        </p>
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={hasConfirmed}
            onChange={(event) => onConfirmationChange(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-tu-maroon"
          />
          <span>ฉันตรวจสอบข้อมูลและยืนยันว่าข้อมูลในใบสมัครถูกต้อง</span>
        </label>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
          <Button onClick={onBack} disabled={isSubmitting} className="flex-1">
            กลับไปแก้ไข
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!hasConfirmed || hasSubmitted}
            loading={isSubmitting}
            className="flex-1"
            aria-live="polite"
          >
            {isSubmitting
              ? 'กำลังส่งใบสมัคร...'
              : hasSubmitted
                ? 'ส่งใบสมัครแล้ว'
                : 'ยืนยันและส่งใบสมัคร'}
          </Button>
        </div>
      </div>
    </footer>
  );
}

function OutcomeActionBar() {
  return (
    <footer className={actionBarClass}>
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5 sm:flex-row">
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
  clubImageUrl,
  form,
}: {
  clubName: string;
  clubImageUrl: string | null;
  form: RoundApplicationForm;
}) {
  return (
    <section className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-tu-maroon-50 text-tu-maroon">
        {clubImageUrl ? (
          <img className="size-full object-cover" src={clubImageUrl} alt="" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">{clubName}</h2>
        <p className="text-sm text-slate-800">{form.round.title}</p>
        <p className="text-sm text-slate-600">
          เปิดรับสมัคร {formatThaiDateTime(form.round.opensAt)}
        </p>
        <p className="text-sm text-slate-600">
          ปิดรับสมัคร {formatThaiDateTime(form.round.closesAt)}
        </p>
      </div>
    </section>
  );
}
