import { useState } from 'react'
import ClubProfileForm, { type ClubProfile } from './ClubProfileForm'
import type { ClubUpdateRequestDto } from './features/clubs/types/club'

const initialProfile: ClubProfile = {
  id: 'local-preview',
  categoryId: 'local-academic',
  name: '',
  description: '',
  objectives: null,
  contactUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  contactEmail: null,
  affiliationLevel: null,
  affiliationName: null,
  imageUrl: null,
  bannerUrl: null,
  status: 'ACTIVE',
  category: { id: 'local-academic', name: 'วิชาการ' },
  tags: [],
  recruitmentRounds: [],
}

function ClubProfilePreview() {
  const [profile, setProfile] = useState(initialProfile)

  function saveProfile(request: ClubUpdateRequestDto) {
    setProfile((current) => ({ ...current, ...request }))
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold text-tu-maroon">
            TU ClubHub · ตัวอย่างแบบฟอร์ม
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            แก้ไขข้อมูลชมรม
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            หน้านี้เป็นตัวอย่างสำหรับทดลองกรอกข้อมูล โดยจะบันทึกไว้ในหน้าเว็บนี้เท่านั้น
            และไม่เชื่อมต่อกับ API
          </p>
        </div>
        <ClubProfileForm onSave={saveProfile} profile={profile} />
        <p className="mt-4 text-center text-xs text-slate-400">
          ตัวอย่างข้อมูลชมรม · {profile.id}
        </p>
      </div>
    </main>
  )
}

export default ClubProfilePreview
