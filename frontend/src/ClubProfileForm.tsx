import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react'
import type {
  ClubResponseDto,
  ClubUpdateRequestDto,
} from './features/clubs/types/club'
import {
  validateClubProfile,
  type ClubProfileDraft,
  type ClubProfileFieldErrors,
} from './utils/clubProfileValidation'

export type ClubProfile = ClubResponseDto

interface ClubProfileFormProps {
  profile: ClubProfile
  onSave: (request: ClubUpdateRequestDto) => void | Promise<void>
}

interface FormSectionProps {
  title: string
  description: string
  children: React.ReactNode
}

type FieldName = keyof ClubProfileDraft
type UploadField = 'imageUrl' | 'bannerUrl'
type UploadErrors = Partial<Record<UploadField, string>>
type FieldErrors = ClubProfileFieldErrors
type SaveToast = { type: 'success' | 'error'; title: string; message: string }
interface LocalImagePreview {
  file: File
  url: string
}

const inputClassName =
  'mt-2 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-tu-maroon focus:ring-4 focus:ring-tu-maroon/10'

function createDraft(profile: ClubProfile): ClubProfileDraft {
  return {
    name: profile.name,
    description: profile.description,
    objectives: profile.objectives ?? '',
    contactUrl: profile.contactUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    instagramHandle: getInstagramHandle(profile.instagramUrl),
    contactEmail: profile.contactEmail ?? '',
    imageUrl: profile.imageUrl ?? '',
    bannerUrl: profile.bannerUrl ?? '',
  }
}

function getInstagramHandle(instagramUrl: string | null): string {
  if (!instagramUrl) return ''
  try {
    const url = new URL(instagramUrl)
    if (!['instagram.com', 'www.instagram.com'].includes(url.hostname)) {
      return instagramUrl
    }
    return url.pathname.split('/').filter(Boolean)[0] ?? ''
  } catch {
    return instagramUrl
  }
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="border-t border-slate-200 px-5 py-5 first:border-t-0 sm:px-7 sm:py-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-sm font-bold text-tu-maroon"
        >
          ◈
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <span className="mt-1 block text-xs font-normal text-red-700" id={id}>
      {message}
    </span>
  )
}

function ClubProfileFormFields({ profile, onSave }: ClubProfileFormProps) {
  const [draft, setDraft] = useState(() => createDraft(profile))
  const [categoryDraft, setCategoryDraft] = useState(
    () => profile.category?.name ?? '',
  )
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [uploadErrors, setUploadErrors] = useState<UploadErrors>({})
  const [imagePreview, setImagePreview] = useState<LocalImagePreview | null>(null)
  const [bannerPreview, setBannerPreview] =
    useState<LocalImagePreview | null>(null)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [toast, setToast] = useState<SaveToast | null>(null)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [toastPhase, setToastPhase] = useState<
    'entering' | 'visible' | 'exiting'
  >('entering')
  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(createDraft(profile)) ||
    imagePreview !== null ||
    bannerPreview !== null ||
    Object.values(uploadErrors).some(Boolean)
  const canCancel =
    hasChanges || categoryDraft !== (profile.category?.name ?? '')

  useEffect(() => {
    if (!toast) return

    const showTimer = window.setTimeout(() => setToastPhase('visible'), 20)
    const hideTimer = window.setTimeout(() => setToastPhase('exiting'), 6020)
    const dismissTimer = window.setTimeout(() => setToast(null), 7020)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
      window.clearTimeout(dismissTimer)
    }
  }, [toast])

  function showToast(nextToast: SaveToast) {
    setToastPhase('entering')
    setToast(nextToast)
  }

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview.url)
    },
    [imagePreview],
  )

  useEffect(
    () => () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview.url)
    },
    [bannerPreview],
  )

  function handleCancel() {
    setDraft(createDraft(profile))
    setCategoryDraft(profile.category?.name ?? '')
    setFieldErrors({})
    setUploadErrors({})
    setImagePreview(null)
    setBannerPreview(null)
    setAttemptedSubmit(false)
    setToast(null)
    setSaved(false)
  }

  function updateField(field: FieldName, value: string) {
    const updatedDraft = { ...draft, [field]: value }
    setDraft(updatedDraft)
    if (field === 'imageUrl') {
      setImagePreview(null)
      setUploadErrors((current) => ({ ...current, imageUrl: undefined }))
    } else if (field === 'bannerUrl') {
      setBannerPreview(null)
      setUploadErrors((current) => ({ ...current, bannerUrl: undefined }))
    }
    if (attemptedSubmit || Object.keys(fieldErrors).length > 0) {
      setFieldErrors(validateClubProfile(updatedDraft))
    }
    setSaved(false)
    setToast(null)
  }

  function handleImageSelect(
    field: UploadField,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    handleSelectedImage(field, file)
  }

  function handleSelectedImage(field: UploadField, file: File) {
    const setPreview =
      field === 'imageUrl' ? setImagePreview : setBannerPreview
    const error =
      !['image/jpeg', 'image/png'].includes(file.type)
        ? 'รองรับเฉพาะไฟล์ JPG และ PNG'
        : file.size > 5 * 1024 * 1024
          ? 'ขนาดไฟล์ต้องไม่เกิน 5 MB'
          : ''

    setSaved(false)
    if (error) {
      setUploadErrors((current) => ({ ...current, [field]: error }))
      showToast({
        type: 'error',
        title: 'การอัปโหลดรูปภาพไม่สำเร็จ',
        message: error,
      })
      return
    }

    setUploadErrors((current) => ({ ...current, [field]: undefined }))
    setPreview({ file, url: URL.createObjectURL(file) })
    showToast({
      type: 'success',
      title: 'แสดงตัวอย่างรูปภาพแล้ว',
      message: 'ไฟล์นี้จะแสดงในตัวอย่างบนอุปกรณ์นี้เท่านั้น',
    })
  }

  function handleBannerDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) handleSelectedImage('bannerUrl', file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)
    const errors = validateClubProfile(draft)
    setFieldErrors(errors)
    const invalidUploads = Object.values(uploadErrors).some(Boolean)
    if (Object.keys(errors).length > 0 || invalidUploads) {
      const errorCount =
        Object.keys(errors).length +
        Object.values(uploadErrors).filter(Boolean).length
      setValidationAttempt((attempt) => attempt + 1)
      showToast({
        type: 'error',
        title: `ยังบันทึกข้อมูลไม่ได้ พบข้อผิดพลาด ${errorCount} จุด`,
        message: 'กรุณาตรวจสอบข้อมูลและรูปภาพที่มีเครื่องหมายแจ้งเตือน',
      })
      return
    }

    const request: ClubUpdateRequestDto = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      objectives: draft.objectives?.trim() || null,
      contactUrl: draft.contactUrl?.trim() || null,
      facebookUrl: draft.facebookUrl?.trim() || null,
      instagramUrl: draft.instagramHandle.trim()
        ? `https://www.instagram.com/${draft.instagramHandle.trim()}/`
        : null,
      contactEmail: draft.contactEmail?.trim() || null,
      imageUrl: draft.imageUrl?.trim() || null,
      bannerUrl: draft.bannerUrl?.trim() || null,
    }

    setSaving(true)
    setToast(null)
    try {
      await onSave(request)
      setSaved(true)
      showToast({
        type: 'success',
        title: 'บันทึกข้อมูลโปรไฟล์ชมรมสำเร็จ',
        message:
          imagePreview || bannerPreview
            ? 'ข้อมูลโปรไฟล์บันทึกแล้ว แต่รูปที่เลือกเป็นตัวอย่างในเครื่องและยังไม่ได้อัปโหลด'
            : 'ข้อมูลโปรไฟล์ชมรมของคุณได้รับการบันทึกแล้ว',
      })
    } catch (error: unknown) {
      showToast({
        type: 'error',
        title: 'การบันทึกข้อมูลไม่สำเร็จ',
        message:
          error instanceof Error
            ? error.message
            : 'ไม่สามารถบันทึกข้อมูลชมรมได้ กรุณาลองอีกครั้ง',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {toast && (
        <div
          aria-live="polite"
          className={`fixed left-1/2 right-auto top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl border bg-white p-4 shadow-xl transition-opacity duration-1000 motion-reduce:transition-none ${
            toast.type === 'success'
              ? 'border-emerald-200'
              : 'border-red-200'
          } ${toastPhase === 'visible' ? 'opacity-100' : 'opacity-0'}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 ${toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {toast.type === 'success' ? '✓' : '!'}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {toast.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {toast.message}
            </p>
          </div>
          <button
            aria-label="ปิดข้อความแจ้งเตือน"
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            onClick={() => setToast(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <form
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)]"
        noValidate
        onSubmit={handleSubmit}
      >
      {attemptedSubmit &&
        (Object.keys(fieldErrors).length > 0 ||
          Object.values(uploadErrors).some(Boolean)) && (
          <div
            key={validationAttempt}
            className="validation-message-shake mx-4 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm sm:mx-7"
            role="alert"
          >
            <span aria-hidden="true" className="font-bold text-red-600">
              !
            </span>
            <div>
              <p className="font-semibold text-red-700">
                ยังบันทึกข้อมูลไม่ได้ พบข้อผิดพลาด{' '}
                {Object.keys(fieldErrors).length +
                  Object.values(uploadErrors).filter(Boolean).length}{' '}
                จุด
              </p>
              <p className="mt-1 text-xs text-red-600">
                กรุณาตรวจสอบข้อมูลและรูปภาพที่มีเครื่องหมายแจ้งเตือน
              </p>
            </div>
          </div>
        )}
      <fieldset
        className="min-w-0 disabled:opacity-70"
        disabled={saving}
      >
        <section className="px-4 pb-5 pt-4 sm:px-7 sm:pt-6">
          <div className="mb-3 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500"
            >
              ▧
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ภาพโปรไฟล์
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                แบนเนอร์และรูปโปรไฟล์ที่แสดงบนหน้าสาธารณะ
              </p>
            </div>
          </div>
          <div
            aria-label="ตัวอย่างภาพพื้นหลังชมรม"
            className="relative flex aspect-[3/1] min-h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 bg-cover bg-center sm:min-h-48"
          >
            {(bannerPreview?.url || draft.bannerUrl) &&
              !uploadErrors.bannerUrl && (
                <img
                  alt="ตัวอย่างภาพพื้นหลังชมรม"
                  className="absolute inset-0 size-full object-cover"
                  onError={() => {
                    setUploadErrors((current) => ({
                      ...current,
                      bannerUrl: 'ไม่สามารถแสดงภาพนี้ได้ กรุณาเลือกไฟล์ใหม่',
                    }))
                  }}
                  onLoad={() => {
                    setUploadErrors((current) => ({
                      ...current,
                      bannerUrl: undefined,
                    }))
                  }}
                  src={bannerPreview?.url ?? draft.bannerUrl ?? ''}
                />
              )}
            {!bannerPreview?.url && !draft.bannerUrl && (
              <svg
                aria-hidden="true"
                className="size-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.5" width="19" x="2.5" y="4" />
                <circle cx="8" cy="9" r="1.5" stroke="currentColor" />
                <path d="m4 18 5-5 3 3 3-4 5 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </div>
          <div className="relative z-10 -mt-7 flex flex-wrap items-center gap-3 pl-4 sm:-mt-9 sm:pl-6">
            <label
              className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-slate-400 shadow-sm transition hover:ring-2 hover:ring-tu-maroon/30 focus-within:ring-2 focus-within:ring-tu-maroon sm:size-20"
              title="เลือกรูปโปรไฟล์ชมรม"
            >
              {imagePreview?.url || draft.imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  onError={() => {
                    setUploadErrors((current) => ({
                      ...current,
                      imageUrl: 'ไม่สามารถโหลดรูปโปรไฟล์นี้ได้',
                    }))
                  }}
                  onLoad={() => {
                    setUploadErrors((current) => ({
                      ...current,
                      imageUrl: undefined,
                    }))
                  }}
                  src={imagePreview?.url ?? draft.imageUrl ?? ''}
                />
              ) : (
                <svg
                  aria-hidden="true"
                  className="size-8"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <rect
                    height="16"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="19"
                    x="2.5"
                    y="4"
                  />
                  <circle cx="8" cy="9" r="1.5" stroke="currentColor" />
                  <path
                    d="m4 18 5-5 3 3 3-4 5 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
              {!imagePreview?.url && !draft.imageUrl && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-2 flex size-5 items-center justify-center rounded-full border-2 border-white bg-slate-500 text-sm font-bold leading-none text-white"
                >
                  +
                </span>
              )}
              <input
                accept="image/png,image/jpeg"
                aria-label="เลือกรูปโปรไฟล์ชมรม"
                className="sr-only"
                onChange={(event) => handleImageSelect('imageUrl', event)}
                type="file"
              />
            </label>
            <div className="min-w-0 translate-y-5">
              <p className="text-xs font-medium text-slate-700">
                {imagePreview?.file.name ?? 'รูปโปรไฟล์ชมรม'}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                JPG หรือ PNG · ขนาดไม่เกิน 5 MB
              </p>
            </div>
          </div>
          <label
            aria-label="อัปโหลดภาพพื้นหลังชมรม"
            className={`mt-5 flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors sm:min-h-44 ${
              uploadErrors.bannerUrl
                ? 'border-red-500 bg-rose-50'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleBannerDrop}
            htmlFor="club-banner-upload"
          >
            <svg
              aria-hidden="true"
              className="size-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              {uploadErrors.bannerUrl ? (
                <>
                  <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="19" x="2.5" y="4" />
                  <path d="m4 18 5-5 3 3 3-4 5 6M5 5l14 14" stroke="currentColor" strokeWidth="1.7" />
                </>
              ) : (
                <>
                  <circle cx="8" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.5" width="19" x="2.5" y="4" />
                  <path d="m4 18 5-5 3 3 3-4 5 6" stroke="currentColor" strokeWidth="1.5" />
                </>
              )}
            </svg>
            <p className={`mt-1 text-sm font-medium ${uploadErrors.bannerUrl ? 'text-red-700' : 'text-slate-800'}`}>
              {uploadErrors.bannerUrl
                ? 'อัปโหลดไม่สำเร็จ · เก็บรูปเดิมไว้'
                : bannerPreview
                  ? bannerPreview.file.name
                  : 'คลิกเพื่ออัปโหลดหรือลากไฟล์แบนเนอร์มาวางที่นี่'}
            </p>
            <p className={`text-xs ${uploadErrors.bannerUrl ? 'text-red-600' : 'text-slate-500'}`}>
              {uploadErrors.bannerUrl ??
                'ขนาดแนะนำ 1200 × 400 px · JPG หรือ PNG (สูงสุด 5 MB)'}
            </p>
            <span className="mt-1 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100">
              {uploadErrors.bannerUrl || bannerPreview
                ? 'เลือกไฟล์ใหม่'
                : 'เลือกไฟล์'}
            </span>
            <input
              accept="image/png,image/jpeg"
              aria-label="เลือกภาพพื้นหลังชมรม"
              className="sr-only"
              id="club-banner-upload"
              onChange={(event) => handleImageSelect('bannerUrl', event)}
              type="file"
            />
          </label>
          {uploadErrors.imageUrl && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              {uploadErrors.imageUrl}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            รูปที่เลือกจะแสดงตัวอย่างในเครื่องเท่านั้น ขณะนี้ยังไม่สามารถอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์ได้
          </p>
        </section>

        <FormSection
          description="เล่าเรื่องชมรมให้ผู้สนใจรู้จักและอยากมีส่วนร่วม"
          title="ข้อมูลทั่วไป"
        >
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            ชื่อชมรม <span className="text-tu-maroon">*</span>
            <input
              autoComplete="organization"
              aria-describedby={fieldErrors.name ? 'club-name-error' : undefined}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-required="true"
              className={inputClassName}
              maxLength={200}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="ชื่อชมรมของคุณ"
              value={draft.name}
            />
            <FieldError id="club-name-error" message={fieldErrors.name} />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            วัตถุประสงค์ของชมรม
            <textarea
              className={`${inputClassName} min-h-24 resize-y`}
              onChange={(event) =>
                updateField('objectives', event.target.value)
              }
              placeholder="ระบุวัตถุประสงค์ของชมรม"
              rows={3}
              value={draft.objectives ?? ''}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            คำอธิบายกิจกรรม / รายละเอียดชมรม{' '}
            <span className="text-tu-maroon">*</span>
            <textarea
              aria-describedby={
                fieldErrors.description ? 'club-description-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.description)}
              aria-required="true"
              className={`${inputClassName} min-h-32 resize-y`}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="อธิบายกิจกรรมและรายละเอียดของชมรม"
              rows={5}
              value={draft.description}
            />
            <FieldError
              id="club-description-error"
              message={fieldErrors.description}
            />
          </label>
        </FormSection>

        <FormSection
          description="ตั้งค่าหมวดหมู่และแท็กเพื่อให้นักศึกษาค้นพบชมรมได้ง่ายขึ้น"
          title="การจัดหมวดหมู่"
        >
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            หมวดหมู่ชมรม
            <select
              className={inputClassName}
              onChange={(event) => setCategoryDraft(event.target.value)}
              value={categoryDraft}
            >
              <option value="">เลือกหมวดหมู่ชมรม</option>
              <option value="วิชาการ">วิชาการ</option>
              <option value="กีฬา">กีฬา</option>
              <option value="ศิลปวัฒนธรรม">ศิลปวัฒนธรรม</option>
              <option value="บำเพ็ญประโยชน์">บำเพ็ญประโยชน์</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">
              ตัวเลือกนี้เป็นตัวอย่างเท่านั้น ขณะนี้ระบบยังไม่รองรับการบันทึกหมวดหมู่
            </span>
          </label>
          <div className="text-sm font-semibold text-slate-700 sm:col-span-2">
            แท็กความสนใจ
            <div className="mt-2 flex min-h-12 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {profile.tags.length > 0 ? (
                profile.tags.map((tag) => (
                  <span
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                    key={tag.id}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-sm font-normal text-slate-400">
                  ยังไม่มีแท็กความสนใจ
                </span>
              )}
            </div>
            <span className="mt-1 block text-xs font-normal text-slate-400">
              แท็กแสดงเพื่อเป็นข้อมูลอ้างอิง และแก้ไขจากหน้านี้ไม่ได้
            </span>
          </div>
        </FormSection>

        <FormSection
          description="ข้อมูลสำหรับนักศึกษาที่ต้องการติดต่อชมรม"
          title="ช่องทางการติดต่อ"
        >
          <label className="text-sm font-semibold text-slate-700">
            อีเมลติดต่อ
            <input
              autoComplete="email"
              aria-describedby={
                fieldErrors.contactEmail ? 'club-email-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              className={inputClassName}
              onChange={(event) =>
                updateField('contactEmail', event.target.value)
              }
              placeholder="เช่น club@tu.ac.th"
              type="email"
              value={draft.contactEmail ?? ''}
            />
            <FieldError
              id="club-email-error"
              message={fieldErrors.contactEmail}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            เว็บไซต์หรือช่องทางติดต่อ
            <input
              aria-describedby={
                fieldErrors.contactUrl ? 'club-contact-url-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.contactUrl)}
              className={inputClassName}
              onChange={(event) =>
                updateField('contactUrl', event.target.value)
              }
              placeholder="https://example.org/contact"
              type="url"
              value={draft.contactUrl ?? ''}
            />
            <FieldError
              id="club-contact-url-error"
              message={fieldErrors.contactUrl}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            ชื่อบัญชี Instagram
            <input
              aria-describedby={
                fieldErrors.instagramUrl ? 'club-instagram-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.instagramUrl)}
              className={inputClassName}
              onChange={(event) =>
                updateField('instagramHandle', event.target.value)
              }
              placeholder="เช่น tu_club"
              value={draft.instagramHandle}
            />
            <FieldError
              id="club-instagram-error"
              message={fieldErrors.instagramUrl}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            ลิงก์ Facebook
            <input
              aria-describedby={
                fieldErrors.facebookUrl ? 'club-facebook-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.facebookUrl)}
              className={inputClassName}
              onChange={(event) =>
                updateField('facebookUrl', event.target.value)
              }
              placeholder="https://www.facebook.com/yourclub"
              type="url"
              value={draft.facebookUrl ?? ''}
            />
            <FieldError
              id="club-facebook-error"
              message={fieldErrors.facebookUrl}
            />
          </label>
        </FormSection>

      </fieldset>

      <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div aria-live="polite" className="min-w-0 text-xs sm:text-sm">
          <p className="font-medium text-slate-500">
            {saving
              ? 'กำลังบันทึก · ป้องกันการซ้ำ'
              : categoryDraft !== (profile.category?.name ?? '')
                ? 'ตัวเลือกหมวดหมู่ยังไม่บันทึก'
                : saved
                  ? 'บันทึกแล้ว · พร้อมใช้งาน'
                  : hasChanges
                    ? 'ปกติ · พร้อมบันทึก'
                    : 'ปิดใช้งาน · ยังไม่มีการเปลี่ยนแปลง'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-tu-maroon px-6 py-3 text-sm font-semibold text-white transition hover:bg-tu-maroon/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tu-maroon/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-40"
            disabled={saving || !hasChanges || saved}
            aria-busy={saving}
            type="submit"
          >
            {saving ? (
              <>
                <svg
                  aria-hidden="true"
                  className="size-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
                กำลังบันทึก
              </>
            ) : (
              <>
                <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                  <path d="M5 4h12l3 3v13H4V4h1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                  <path d="M8 4v6h8V4M8 20v-7h8v7" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
                บันทึกข้อมูล
              </>
            )}
          </button>
          <button
            className="inline-flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:min-w-24"
            disabled={saving || !canCancel}
            onClick={handleCancel}
            type="button"
          >
            ยกเลิก
          </button>
        </div>
      </div>
      </form>
    </>
  )
}

function ClubProfileForm({ profile, onSave }: ClubProfileFormProps) {
  return (
    <ClubProfileFormFields
      key={profile.id}
      onSave={onSave}
      profile={profile}
    />
  )
}

export default ClubProfileForm
