import { useEffect, useRef, useState, type FormEvent } from 'react'
import { inputClass } from '../../../components/ui/classes'
import { Field } from '../../../components/ui/Field'
import { CircleAlertIcon, CircleCheckIcon, XIcon } from '../../../components/ui/icons'
import { ImageUrlField } from '../../../components/ui/ImageUrlField'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StickySaveBar } from '../../../components/ui/StickySaveBar'
import { ApiError, describeApiError } from '../../../lib/api'
import type { ClubOption, ClubResponseDto, ClubUpdateRequestDto } from '../types/club'
import {
  MAX_CLUB_TAGS,
  fromServerFieldErrors,
  isSameClubEditForm,
  toClubEditFormValues,
  toClubUpdateRequest,
  validateClubEditForm,
  type ClubEditFormErrors,
  type ClubEditFormValues,
} from '../utils/clubEditForm'

interface ClubProfileFormProps {
  /** Current profile (public projection) used to prefill the form. */
  profile: ClubResponseDto
  categories: ClubOption[]
  tags: ClubOption[]
  /** Sends the PUT; resolves to the saved profile and rejects with the API error. */
  onSave: (request: ClubUpdateRequestDto) => Promise<ClubResponseDto>
}

type FieldName = keyof ClubEditFormValues
type Notice = { type: 'success' | 'error'; message: string; focus: boolean }

// Control ids in page order; the first invalid one receives focus.
const FIELD_IDS: Record<FieldName, string> = {
  bannerUrl: 'club-banner-url',
  imageUrl: 'club-image-url',
  name: 'club-name',
  objectives: 'club-objectives',
  description: 'club-description',
  categoryId: 'club-category',
  tagIds: 'club-tags',
  facebookUrl: 'club-facebook',
  instagramHandle: 'club-instagram',
  contactEmail: 'club-email',
  contactUrl: 'club-contact-url',
}

const textAreaClass = (invalid: boolean) => `${inputClass(invalid)} min-h-24 resize-y leading-6`

function withoutField(errors: ClubEditFormErrors, field: FieldName): ClubEditFormErrors {
  const next = { ...errors }
  delete next[field]
  return next
}

/** Club profile editor for committee members (UC-06 wireframe, US-06). */
export default function ClubProfileForm({ profile, categories, tags, onSave }: ClubProfileFormProps) {
  const [saved, setSaved] = useState(() => toClubEditFormValues(profile))
  const [values, setValues] = useState(saved)
  const [errors, setErrors] = useState<ClubEditFormErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [tagLimitHit, setTagLimitHit] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)
  const dirty = !isSameClubEditForm(values, saved)

  // Warn before the tab closes or reloads while changes are unsaved.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Move focus to a save result so it is seen and announced.
  useEffect(() => {
    if (notice?.focus) noticeRef.current?.focus()
  }, [notice])

  function update<K extends FieldName>(field: K, value: ClubEditFormValues[K]) {
    const next = { ...values, [field]: value }
    setValues(next)
    setErrors(attempted ? validateClubEditForm(next) : withoutField(errors, field))
    if (notice?.type === 'success') setNotice(null)
  }

  function addTag(tagId: string) {
    if (values.tagIds.includes(tagId)) return
    if (values.tagIds.length >= MAX_CLUB_TAGS) {
      setTagLimitHit(true)
      return
    }
    update('tagIds', [...values.tagIds, tagId])
  }

  function removeTag(tagId: string) {
    setTagLimitHit(false)
    update('tagIds', values.tagIds.filter((id) => id !== tagId))
  }

  function handleCancel() {
    setValues(saved)
    setErrors({})
    setAttempted(false)
    setNotice(null)
    setTagLimitHit(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setAttempted(true)
    const clientErrors = validateClubEditForm(values)
    setErrors(clientErrors)
    const invalid = (Object.keys(FIELD_IDS) as FieldName[]).filter((field) => clientErrors[field])
    if (invalid.length > 0) {
      setNotice({
        type: 'error',
        message: `ยังบันทึกข้อมูลไม่ได้ พบข้อผิดพลาด ${invalid.length} จุด กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน`,
        focus: false,
      })
      document.getElementById(FIELD_IDS[invalid[0]])?.focus()
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      const next = toClubEditFormValues(await onSave(toClubUpdateRequest(values)))
      setSaved(next)
      setValues(next)
      setErrors({})
      setAttempted(false)
      setTagLimitHit(false)
      setNotice({
        type: 'success',
        message: 'บันทึกข้อมูลโปรไฟล์ชมรมเรียบร้อยแล้ว หน้าชมรมสาธารณะแสดงข้อมูลใหม่แล้ว',
        focus: true,
      })
    } catch (error: unknown) {
      // Keep everything the user typed; show what the server rejected under each field.
      setErrors(error instanceof ApiError ? fromServerFieldErrors(error.fieldErrors) : {})
      setNotice({
        type: 'error',
        message: describeApiError(error, 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
        focus: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedTags = values.tagIds.map(
    (id) => tags.find((tag) => tag.id === id) ?? { id, name: `แท็กรหัส ${id}` },
  )
  const unselectedTags = tags.filter((tag) => !values.tagIds.includes(tag.id))

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6" aria-busy={saving || undefined}>
      <p className="text-sm text-slate-600">
        ช่องที่มีเครื่องหมาย <span className="text-red-700">*</span> จำเป็นต้องกรอก
      </p>

      {notice && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm font-medium ${
            notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {notice.type === 'error' ? (
            <CircleAlertIcon className="mt-0.5 size-5" />
          ) : (
            <CircleCheckIcon className="mt-0.5 size-5" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
        <legend className="sr-only">ข้อมูลโปรไฟล์ชมรม</legend>

        <SectionCard
          number={1}
          title="รูปภาพชมรม"
          description="แบนเนอร์และรูปโปรไฟล์ที่แสดงบนหน้าชมรมสาธารณะ วางลิงก์รูปแบบ HTTPS (ยังไม่รองรับการอัปโหลดไฟล์)"
        >
          <ImageUrlField
            id={FIELD_IDS.bannerUrl}
            label="ภาพแบนเนอร์ชมรม"
            variant="banner"
            hint="อัตราส่วน 3:1 เช่น 1200 × 400 พิกเซล"
            value={values.bannerUrl}
            onChange={(value) => update('bannerUrl', value)}
            error={errors.bannerUrl}
            disabled={saving}
          />
          <ImageUrlField
            id={FIELD_IDS.imageUrl}
            label="รูปโปรไฟล์ชมรม"
            variant="avatar"
            hint="รูปสี่เหลี่ยมจัตุรัส แสดงเป็นวงกลม หากไม่มีรูประบบจะแสดงรูปเริ่มต้น"
            value={values.imageUrl}
            onChange={(value) => update('imageUrl', value)}
            error={errors.imageUrl}
            disabled={saving}
          />
        </SectionCard>

        <SectionCard number={2} title="ข้อมูลทั่วไป" description="เล่าเรื่องชมรมให้นักศึกษารู้จักและอยากเข้าร่วม">
          <Field id={FIELD_IDS.name} label="ชื่อชมรม" required error={errors.name}>
            {(control) => (
              <input
                {...control}
                autoComplete="organization"
                maxLength={200}
                value={values.name}
                onChange={(event) => update('name', event.target.value)}
                className={inputClass(Boolean(errors.name))}
              />
            )}
          </Field>
          <Field id={FIELD_IDS.objectives} label="วัตถุประสงค์ชมรม" required error={errors.objectives}>
            {(control) => (
              <textarea
                {...control}
                rows={3}
                value={values.objectives}
                onChange={(event) => update('objectives', event.target.value)}
                className={textAreaClass(Boolean(errors.objectives))}
              />
            )}
          </Field>
          <Field
            id={FIELD_IDS.description}
            label="คำอธิบายกิจกรรม / รายละเอียดชมรม"
            required
            hint="ข้อความธรรมดา ขึ้นบรรทัดใหม่ได้"
            error={errors.description}
          >
            {(control) => (
              <textarea
                {...control}
                rows={6}
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                className={textAreaClass(Boolean(errors.description))}
              />
            )}
          </Field>
        </SectionCard>

        <SectionCard number={3} title="การจัดหมวดหมู่" description="ช่วยให้นักศึกษาค้นพบชมรมได้ง่ายขึ้น">
          <Field id={FIELD_IDS.categoryId} label="หมวดหมู่ชมรม" required error={errors.categoryId}>
            {(control) => (
              <select
                {...control}
                value={values.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
                className={inputClass(Boolean(errors.categoryId))}
              >
                <option value="" disabled>
                  เลือกหมวดหมู่ชมรม
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <fieldset
            id={FIELD_IDS.tagIds}
            tabIndex={-1}
            aria-describedby={`${FIELD_IDS.tagIds}-count${errors.tagIds ? ` ${FIELD_IDS.tagIds}-error` : ''}`}
            className="min-w-0"
          >
            <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm font-medium text-slate-800">
              แท็กความสนใจ
              <span id={`${FIELD_IDS.tagIds}-count`} className="text-xs font-normal text-slate-600">
                เลือกแล้ว {values.tagIds.length}/{MAX_CLUB_TAGS}
              </span>
            </legend>
            <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white p-2">
              {selectedTags.length === 0 && (
                <span className="px-2 text-sm text-slate-600">ยังไม่ได้เลือกแท็ก</span>
              )}
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex h-11 items-center rounded-full border border-tu-maroon/20 bg-tu-maroon-50 pl-4 text-sm font-medium text-tu-maroon"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(tag.id)}
                    aria-label={`ลบแท็ก ${tag.name}`}
                    className="flex size-11 items-center justify-center rounded-full hover:bg-tu-maroon-100"
                  >
                    <XIcon className="size-4" />
                  </button>
                </span>
              ))}
            </div>
            {errors.tagIds && (
              <p id={`${FIELD_IDS.tagIds}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700">
                <CircleAlertIcon className="mt-0.5 size-4" />
                <span>{errors.tagIds}</span>
              </p>
            )}
            <p aria-live="polite" className="mt-1.5 min-h-5 text-sm text-amber-800">
              {tagLimitHit && `เลือกแท็กได้สูงสุด ${MAX_CLUB_TAGS} แท็ก ลบแท็กเดิมก่อนเพิ่มแท็กใหม่`}
            </p>
            {unselectedTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-slate-600">เพิ่มแท็ก</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {unselectedTags.map((tag) => (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onClick={() => addTag(tag.id)}
                        aria-label={`เพิ่มแท็ก ${tag.name}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700 transition-colors hover:border-tu-maroon hover:text-tu-maroon"
                      >
                        <span aria-hidden="true">+</span>
                        {tag.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </fieldset>
        </SectionCard>

        <SectionCard number={4} title="ช่องทางการติดต่อ" description="ช่องทางที่นักศึกษาใช้ติดต่อหรือติดตามชมรม">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id={FIELD_IDS.facebookUrl} label="Facebook" hint="ลิงก์เพจ เช่น https://www.facebook.com/yourclub" error={errors.facebookUrl}>
              {(control) => (
                <input
                  {...control}
                  type="url"
                  inputMode="url"
                  placeholder="https://www.facebook.com/"
                  value={values.facebookUrl}
                  onChange={(event) => update('facebookUrl', event.target.value)}
                  className={inputClass(Boolean(errors.facebookUrl))}
                />
              )}
            </Field>
            <Field id={FIELD_IDS.instagramHandle} label="Instagram" hint="ชื่อบัญชี เช่น tu_club" error={errors.instagramHandle}>
              {(control) => (
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-600"
                  >
                    @
                  </span>
                  <input
                    {...control}
                    autoCapitalize="none"
                    spellCheck={false}
                    value={values.instagramHandle}
                    onChange={(event) => update('instagramHandle', event.target.value)}
                    className={`${inputClass(Boolean(errors.instagramHandle))} pl-7`}
                  />
                </div>
              )}
            </Field>
            <Field id={FIELD_IDS.contactEmail} label="อีเมล" hint="ใช้อีเมลของ tu.ac.th หรือ gmail.com" error={errors.contactEmail}>
              {(control) => (
                <input
                  {...control}
                  type="email"
                  autoComplete="email"
                  value={values.contactEmail}
                  onChange={(event) => update('contactEmail', event.target.value)}
                  className={inputClass(Boolean(errors.contactEmail))}
                />
              )}
            </Field>
            <Field id={FIELD_IDS.contactUrl} label="เว็บไซต์หรือลิงก์ติดต่ออื่น" hint="ลิงก์ HTTPS" error={errors.contactUrl}>
              {(control) => (
                <input
                  {...control}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={values.contactUrl}
                  onChange={(event) => update('contactUrl', event.target.value)}
                  className={inputClass(Boolean(errors.contactUrl))}
                />
              )}
            </Field>
          </div>
        </SectionCard>
      </fieldset>

      <StickySaveBar dirty={dirty} saving={saving} onCancel={handleCancel} />
    </form>
  )
}
