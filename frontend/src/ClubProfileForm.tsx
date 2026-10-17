import { useState, type FormEvent } from 'react'
import type {
  ClubResponseDto,
  ClubUpdateRequestDto,
} from './features/clubs/types/club'
import {
  isValidFacebookUrl,
  isValidInstagramUrl,
  isRequired,
  isValidClubContactEmail,
  isValidUrl,
} from './utils/validation'

export type ClubProfile = ClubResponseDto

interface ClubProfileFormProps {
  profile: ClubProfile
  onSave: (request: ClubUpdateRequestDto) => void | Promise<void>
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

type FieldErrors = Partial<Record<keyof ClubUpdateRequestDto, string>>
type EditableField = keyof ClubUpdateRequestDto

const inputClassName =
  'mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-tu-maroon focus:ring-4 focus:ring-tu-maroon/10'

function createDraft(profile: ClubProfile): ClubUpdateRequestDto {
  return {
    name: profile.name,
    description: profile.description,
    objectives: profile.objectives ?? '',
    contactUrl: profile.contactUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    instagramUrl: profile.instagramUrl ?? '',
    contactEmail: profile.contactEmail ?? '',
    imageUrl: profile.imageUrl ?? '',
    bannerUrl: profile.bannerUrl ?? '',
  }
}

function validateProfile(profile: ClubUpdateRequestDto): FieldErrors {
  const errors: FieldErrors = {}

  if (!isRequired(profile.name)) {
    errors.name = 'กรุณากรอกชื่อชมรม'
  } else if (profile.name.trim().length > 200) {
    errors.name = 'ชื่อชมรมต้องมีความยาวไม่เกิน 200 ตัวอักษร'
  }
  if (!isRequired(profile.description)) {
    errors.description = 'กรุณากรอกรายละเอียดชมรม'
  }
  if (profile.contactEmail && !isValidClubContactEmail(profile.contactEmail)) {
    errors.contactEmail =
      'กรุณาใช้อีเมล @dome.tu.ac.th, @tu.ac.th หรือ @gmail.com'
  }

  const urlFields: Array<{
    field: keyof ClubUpdateRequestDto
    value: string | null | undefined
    isValid: (value: string) => boolean
  }> = [
    { field: 'contactUrl', value: profile.contactUrl, isValid: isValidUrl },
    {
      field: 'facebookUrl',
      value: profile.facebookUrl,
      isValid: isValidFacebookUrl,
    },
    {
      field: 'instagramUrl',
      value: profile.instagramUrl,
      isValid: isValidInstagramUrl,
    },
    { field: 'imageUrl', value: profile.imageUrl, isValid: isValidUrl },
    { field: 'bannerUrl', value: profile.bannerUrl, isValid: isValidUrl },
  ]

  for (const { field, value, isValid } of urlFields) {
    if (value && !isValid(value)) {
      errors[field] =
        field === 'facebookUrl'
          ? 'กรุณาใช้ลิงก์ Facebook ที่ขึ้นต้นด้วย https://'
          : field === 'instagramUrl'
            ? 'กรุณาใช้ลิงก์ Instagram ที่ขึ้นต้นด้วย https://'
            : 'กรุณากรอก URL HTTPS ที่ถูกต้อง'
    }
  }

  return errors
}

function FormSection({ title, children }: FormSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function updateField(field: EditableField, value: string) {
    const updatedDraft = { ...draft, [field]: value }
    setDraft(updatedDraft)
    setFieldErrors((currentErrors) =>
      Object.keys(currentErrors).length
        ? validateProfile(updatedDraft)
        : currentErrors,
    )
    setSaved(false)
    setSaveError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateProfile(draft)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const request: ClubUpdateRequestDto = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      objectives: draft.objectives?.trim() || null,
      contactUrl: draft.contactUrl?.trim() || null,
      facebookUrl: draft.facebookUrl?.trim() || null,
      instagramUrl: draft.instagramUrl?.trim() || null,
      contactEmail: draft.contactEmail?.trim() || null,
      imageUrl: draft.imageUrl?.trim() || null,
      bannerUrl: draft.bannerUrl?.trim() || null,
    }

    setSaving(true)
    setSaveError('')
    try {
      await onSave(request)
      setSaved(true)
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถบันทึกข้อมูลชมรมได้ กรุณาลองอีกครั้ง',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(35,25,35,0.35)]"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-tu-maroon">
              ข้อมูลชมรม
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              แก้ไขข้อมูลชมรม
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              แก้ไขข้อมูลที่กำหนดไว้สำหรับโปรไฟล์ชมรม
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            กำลังแก้ไข · {profile.id}
          </span>
        </div>
      </div>

      <fieldset
        className="min-w-0 space-y-7 px-5 py-6 disabled:opacity-70 sm:px-9 sm:py-8"
        disabled={saving}
      >
        <FormSection title="ข้อมูลทั่วไป">
          <label className="text-sm font-semibold text-slate-700">
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
          <div className="text-sm font-semibold text-slate-700">
            หมวดหมู่ชมรม
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-600">
              {profile.category?.name ?? 'ยังไม่ได้ระบุ'}
            </p>
            <span className="mt-1 block text-xs font-normal text-slate-400">
              หมวดหมู่ไม่สามารถแก้ไขได้จากหน้าโปรไฟล์นี้
            </span>
          </div>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            รายละเอียดชมรม <span className="text-tu-maroon">*</span>
            <textarea
              aria-describedby={
                fieldErrors.description ? 'club-description-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.description)}
              aria-required="true"
              className={`${inputClassName} min-h-36 resize-y`}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="เล่ารายละเอียดกิจกรรมและเป้าหมายของชมรมของคุณ"
              rows={5}
              value={draft.description}
            />
            <FieldError
              id="club-description-error"
              message={fieldErrors.description}
            />
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
              แท็กแสดงไว้เพื่อเป็นข้อมูลอ้างอิง และแก้ไขไม่ได้จาก API โปรไฟล์
            </span>
          </div>
        </FormSection>

        <FormSection title="ช่องทางติดต่อและโซเชียลมีเดีย">
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
            ลิงก์ Instagram
            <input
              aria-describedby={
                fieldErrors.instagramUrl ? 'club-instagram-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.instagramUrl)}
              className={inputClassName}
              onChange={(event) =>
                updateField('instagramUrl', event.target.value)
              }
              placeholder="https://www.instagram.com/yourclub"
              type="url"
              value={draft.instagramUrl ?? ''}
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

        <FormSection title="รูปภาพของชมรม">
          <label className="text-sm font-semibold text-slate-700">
            URL รูปโปรไฟล์ชมรม
            <input
              aria-describedby={
                fieldErrors.imageUrl ? 'club-image-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.imageUrl)}
              className={inputClassName}
              onChange={(event) => updateField('imageUrl', event.target.value)}
              placeholder="https://example.org/club-image.png"
              type="url"
              value={draft.imageUrl ?? ''}
            />
            <FieldError id="club-image-error" message={fieldErrors.imageUrl} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            URL ภาพแบนเนอร์
            <input
              aria-describedby={
                fieldErrors.bannerUrl ? 'club-banner-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.bannerUrl)}
              className={inputClassName}
              onChange={(event) =>
                updateField('bannerUrl', event.target.value)
              }
              placeholder="https://example.org/club-banner.png"
              type="url"
              value={draft.bannerUrl ?? ''}
            />
            <FieldError
              id="club-banner-error"
              message={fieldErrors.bannerUrl}
            />
          </label>
        </FormSection>
      </fieldset>

      <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:px-9">
        <div aria-live="polite" className="text-sm">
          {saveError ? (
            <p className="text-red-700" role="alert">
              {saveError}
            </p>
          ) : (
            <p className="text-emerald-700">
              {saving
                ? 'กำลังบันทึกข้อมูล…'
                : saved
                  ? 'บันทึกข้อมูลชมรมแล้ว'
                  : 'ยังไม่ได้บันทึกการเปลี่ยนแปลง'}
            </p>
          )}
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-tu-maroon px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-tu-maroon/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tu-maroon/20 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          disabled={saving}
          type="submit"
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
        </button>
      </div>
    </form>
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
