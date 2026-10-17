import { useState, type FormEvent } from 'react'
import {
  isValidClubContactEmail,
  isRequired,
  isValidUrl,
} from './utils/validation'

export type ClubCategory =
  | 'กีฬา'
  | 'วิชาการ'
  | 'บำเพ็ญประโยชน์'
  | 'ศิลปวัฒนธรรม'

export interface ClubProfile {
  id: string
  name: string
  category: ClubCategory
  tagline: string
  description: string
  tags: string[]
  email: string
  instagram: string
  website: string
  meetingSchedule: string
  meetingLocation: string
  logoUrl: string
}

interface ClubProfileFormProps {
  profile: ClubProfile
  onSave: (profile: ClubProfile) => void | Promise<void>
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

type FieldErrors = Partial<Record<keyof ClubProfile, string>>

const categories: ClubCategory[] = [
  'กีฬา',
  'วิชาการ',
  'บำเพ็ญประโยชน์',
  'ศิลปวัฒนธรรม',
]

const inputClassName =
  'mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-tu-maroon focus:ring-4 focus:ring-tu-maroon/10'

function validateProfile(profile: ClubProfile): FieldErrors {
  const errors: FieldErrors = {}

  if (!isRequired(profile.name)) {
    errors.name = 'กรุณากรอกชื่อชมรม'
  }
  if (!isRequired(profile.category)) {
    errors.category = 'กรุณาเลือกประเภทชมรม'
  }
  if (!isRequired(profile.description)) {
    errors.description = 'กรุณากรอกรายละเอียดชมรม'
  }
  if (profile.email && !isValidClubContactEmail(profile.email)) {
    errors.email =
      'กรุณาใช้อีเมล @dome.tu.ac.th, @tu.ac.th หรือ @gmail.com'
  }
  if (profile.website && !isValidUrl(profile.website)) {
    errors.website = 'กรุณากรอก URL ที่ถูกต้อง โดยขึ้นต้นด้วย http:// หรือ https://'
  }
  if (profile.logoUrl && !isValidUrl(profile.logoUrl)) {
    errors.logoUrl = 'กรุณากรอก URL ที่ถูกต้อง โดยขึ้นต้นด้วย http:// หรือ https://'
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

function ClubProfileFormFields({ profile, onSave }: ClubProfileFormProps) {
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function updateField<K extends keyof ClubProfile>(
    field: K,
    value: ClubProfile[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setFieldErrors((currentErrors) =>
      Object.keys(currentErrors).length
        ? validateProfile({ ...draft, [field]: value })
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

    const updatedProfile = {
      ...draft,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      email: draft.email.trim(),
      instagram: draft.instagram.trim(),
      website: draft.website.trim(),
      meetingSchedule: draft.meetingSchedule.trim(),
      meetingLocation: draft.meetingLocation.trim(),
      logoUrl: draft.logoUrl.trim(),
    }
    setSaving(true)
    setSaveError('')
    try {
      await onSave(updatedProfile)
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
              แนะนำชมรมของคุณ
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
        <FormSection
          title="เกี่ยวกับชมรม"
        >
            <label className="text-sm font-semibold text-slate-700">
              ชื่อชมรม <span className="text-tu-maroon">*</span>
              <input
                autoComplete="organization"
                className={inputClassName}
                aria-describedby={fieldErrors.name ? 'club-name-error' : undefined}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-required="true"
                maxLength={80}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="ชื่อชมรมของคุณ"
                value={draft.name}
              />
              {fieldErrors.name && (
                <span className="mt-1 block text-xs font-normal text-red-700" id="club-name-error">
                  {fieldErrors.name}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold text-slate-700">
              ประเภทชมรม <span className="text-tu-maroon">*</span>
              <select
                className={inputClassName}
                aria-describedby={fieldErrors.category ? 'club-category-error' : undefined}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-required="true"
                onChange={(event) => {
                  const category = categories.find(
                    (option) => option === event.target.value,
                  )
                  if (category) updateField('category', category)
                }}
                value={draft.category}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                  <span className="mt-1 block text-xs font-normal text-red-700" id="club-category-error">
                    {fieldErrors.category}
                  </span>
              )}
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              คำแนะนำชมรม
              <input
                className={inputClassName}
                maxLength={120}
                onChange={(event) => updateField('tagline', event.target.value)}
                placeholder="แนะนำชมรมของคุณแบบสั้นๆ"
                value={draft.tagline}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              รายละเอียดชมรม <span className="text-tu-maroon">*</span>
              <textarea
                className={`${inputClassName} min-h-36 resize-y`}
                aria-describedby={fieldErrors.description ? 'club-description-error' : undefined}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-required="true"
                maxLength={1200}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="เล่ารายละเอียดกิจกรรมและเป้าหมายของชมรมของคุณ"
                rows={5}
                value={draft.description}
              />
              {fieldErrors.description && (
                <span className="mt-1 block text-xs font-normal text-red-700" id="club-description-error">
                  {fieldErrors.description}
                </span>
              )}
              <span className="mt-1.5 block text-right text-xs font-normal text-slate-400">
                {draft.description.length}/1200
              </span>
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              แท็กความสนใจ
              <input
                className={inputClassName}
                onChange={(event) =>
                  updateField(
                    'tags',
                    event.target.value.split(',').map((tag) => tag.trim()),
                  )
                }
                placeholder="เช่น โต้วาที, การพูดในที่สาธารณะ, ภาษาอังกฤษ"
                value={draft.tags.join(', ')}
              />
              <span className="mt-1.5 block text-xs font-normal text-slate-400">
                คั่นแต่ละแท็กด้วยเครื่องหมายจุลภาค เพื่อให้นักศึกษาค้นหาชมรมได้ง่ายขึ้น
              </span>
            </label>
        </FormSection>

        <FormSection
          title="ช่องทางติดต่อและโซเชียลมีเดีย"
        >
            <label className="text-sm font-semibold text-slate-700">
              อีเมลติดต่อ
              <input
                autoComplete="email"
                className={inputClassName}
                aria-describedby={fieldErrors.email ? 'club-email-error' : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="เช่น club@tu.ac.th"
                type="email"
                value={draft.email}
              />
              {fieldErrors.email && (
                <span className="mt-1 block text-xs font-normal text-red-700" id="club-email-error">
                  {fieldErrors.email}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold text-slate-700">
              อินสตาแกรม
              <input
                className={inputClassName}
                onChange={(event) =>
                  updateField('instagram', event.target.value)
                }
                placeholder="เช่น @yourclub"
                value={draft.instagram}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              เว็บไซต์
              <input
                className={inputClassName}
                aria-describedby={fieldErrors.website ? 'club-website-error' : undefined}
                aria-invalid={Boolean(fieldErrors.website)}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="เช่น https://yourclub.example"
                type="url"
                value={draft.website}
              />
              {fieldErrors.website && (
                <span className="mt-1 block text-xs font-normal text-red-700" id="club-website-error">
                  {fieldErrors.website}
                </span>
              )}
            </label>
        </FormSection>

        <FormSection
          title="การนัดพบและตราสัญลักษณ์"
        >
            <label className="text-sm font-semibold text-slate-700">
              วันและเวลานัดพบ
              <input
                className={inputClassName}
                onChange={(event) =>
                  updateField('meetingSchedule', event.target.value)
                }
                placeholder="เช่น ทุกวันพุธ เวลา 16:00–18:00 น."
                value={draft.meetingSchedule}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              สถานที่นัดพบ
              <input
                className={inputClassName}
                onChange={(event) =>
                  updateField('meetingLocation', event.target.value)
                }
                placeholder="เช่น มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต"
                value={draft.meetingLocation}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              ลิงก์โลโก้ชมรม
              <input
                className={inputClassName}
                aria-describedby={fieldErrors.logoUrl ? 'club-logo-error' : undefined}
                aria-invalid={Boolean(fieldErrors.logoUrl)}
                onChange={(event) => updateField('logoUrl', event.target.value)}
                placeholder="เช่น https://example.com/club-logo.png"
                type="url"
                value={draft.logoUrl}
              />
              {fieldErrors.logoUrl && (
                <span className="mt-1 block text-xs font-normal text-red-700" id="club-logo-error">
                  {fieldErrors.logoUrl}
                </span>
              )}
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
