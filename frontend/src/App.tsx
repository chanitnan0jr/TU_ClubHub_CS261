import { useState } from 'react'
import ClubProfileForm, {
  type ClubProfile,
} from './ClubProfileForm'

const initialProfile: ClubProfile = {
  id: 'tu-debate-society',
  name: '',
  category: 'วิชาการ',
  tagline: '',
  description: '',
  tags: [],
  email: '',
  instagram: '',
  website: '',
  meetingSchedule: '',
  meetingLocation: '',
  logoUrl: '',
}

function App() {
  const [profile, setProfile] = useState(initialProfile)

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a
            aria-label="หน้าหลัก TU ClubHub"
            className="flex items-center gap-3"
            href="#"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-tu-maroon text-sm font-black tracking-tight text-white">
              TU
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-tight text-slate-900">
                ClubHub
              </span>
              <span className="block text-xs text-slate-500">
                มหาวิทยาลัยธรรมศาสตร์
              </span>
            </span>
          </a>
          <span className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            พื้นที่จัดการสำหรับเจ้าหน้าที่ชมรม
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold text-tu-maroon">
            พื้นที่เจ้าหน้าที่ <span className="px-1 text-slate-300">/</span>{' '}
            ข้อมูลชมรม
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            ทำให้ชมรมของคุณโดดเด่น
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            อัปเดตข้อมูลชมรมให้น่าสนใจ เพื่อให้นักศึกษาค้นพบชุมชนที่ใช่สำหรับพวกเขา
          </p>
        </div>
        <ClubProfileForm profile={profile} onSave={setProfile} />
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-slate-400">
          รหัสชมรม: {profile.id} — เมื่อนำไปใช้งานจริง เซิร์ฟเวอร์ต้องตรวจสอบสิทธิ์
          ของเจ้าหน้าที่ก่อนบันทึกข้อมูล
        </p>
      </main>
    </div>
  )
}

export default App
