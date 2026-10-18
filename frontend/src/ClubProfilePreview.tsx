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

const navItems = [
  { label: 'ภาพรวม', icon: '▦' },
  { label: 'โปรไฟล์ชมรม', icon: '◉', active: true },
  { label: 'จัดการรอบรับสมัคร', icon: '▤' },
  { label: 'ตรวจสอบใบสมัคร', icon: '☑' },
]

function ClubProfilePreview() {
  const [profile, setProfile] = useState(initialProfile)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function saveProfile(request: ClubUpdateRequestDto) {
    setProfile((current) => ({ ...current, ...request }))
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
        <Brand />
        <p className="px-4 pb-2 pt-6 text-[11px] font-medium text-slate-400">
          พื้นที่คณะกรรมการ
        </p>
        <nav aria-label="เมนูจัดการชมรม" className="space-y-1 px-2">
          {navItems.map((item) => (
            <NavItem item={item} key={item.label} />
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-tu-maroon">
              ช
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-700">
                ทีมชมรม
              </span>
              <span className="block truncate text-[10px] text-slate-400">
                เจ้าหน้าที่ชมรม
              </span>
            </span>
          </div>
          <button
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
            type="button"
          >
            ↪ &nbsp; ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileNavOpen((open) => !open)}
              type="button"
            >
              {mobileNavOpen ? '×' : '☰'}
            </button>
            <Brand compact />
          </div>
          <div className="hidden text-xs text-slate-500 lg:block">
            TU ClubHub <span className="mx-2 text-slate-300">›</span>
            โปรไฟล์ชมรม
          </div>
          <span className="ml-auto text-xs text-slate-500 lg:hidden">
            เจ้าหน้าที่ชมรม
          </span>
        </header>

        {mobileNavOpen && (
          <nav
            aria-label="เมนูจัดการชมรม"
            className="space-y-1 border-b border-slate-200 bg-white p-2 lg:hidden"
          >
            {navItems.map((item) => (
              <NavItem
                item={item}
                key={item.label}
                onClick={() => setMobileNavOpen(false)}
              />
            ))}
          </nav>
        )}

        <main className="mx-auto max-w-6xl px-3 pb-8 pt-5 sm:px-6 sm:pt-7">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                จัดการข้อมูลโปรไฟล์ชมรม
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                อัปเดตข้อมูลชมรมให้เป็นปัจจุบัน เพื่อให้นักศึกษารู้จักชมรมของคุณ
              </p>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:shrink-0 sm:text-sm"
              disabled
              title="ฟังก์ชันนี้จะใช้งานได้เมื่อเชื่อมต่อหน้าโปรไฟล์สาธารณะ"
              type="button"
            >
              <span aria-hidden="true">↗</span>
              ดูหน้าโปรไฟล์สาธารณะ
            </button>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-500">
            <span aria-hidden="true" className="mt-0.5 text-slate-500">
              ⓘ
            </span>
            <p>
              ช่องที่มีเครื่องหมาย <span className="text-tu-maroon">*</span>{' '}
              จำเป็นต้องกรอก ข้อมูลจะแสดงเมื่อบันทึกเท่านั้น
            </p>
          </div>

          <ClubProfileForm onSave={saveProfile} profile={profile} />
        </main>
      </div>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? '' : 'border-b border-slate-200 px-4 py-4'}`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tu-maroon text-[10px] font-black text-white">
        มธ.
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-800">
        ที ยู คลับฮับ
      </span>
    </div>
  )
}

function NavItem({
  item,
  onClick,
}: {
  item: { label: string; icon: string; active?: boolean }
  onClick?: () => void
}) {
  return (
    <button
      aria-current={item.active ? 'page' : undefined}
      className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition ${
        item.active
          ? 'bg-rose-50 text-tu-maroon'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="w-4 text-center text-sm">
        {item.icon}
      </span>
      {item.label}
    </button>
  )
}

export default ClubProfilePreview
