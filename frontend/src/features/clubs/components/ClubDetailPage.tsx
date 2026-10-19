import { useState } from 'react';
import type { ClubDetailData } from '../types/club';
import { GuestLoginModal } from './GuestLoginModal';

// ข้อมูลจำลองชมรมที่ 1: มีรอบเปิดรับสมัครอยู่ (LIVE)
const mockVolunteerClub: ClubDetailData = {
  id: 'volunteer-community',
  name: 'ชมรมอาสาพัฒนาชุมชน',
  category: 'บำเพ็ญประโยชน์',
  slogan: 'อาสาด้วยใจ เติบโตไปด้วยกัน พลังเล็ก ๆ ของเรา สร้างความเปลี่ยนแปลงให้ชุมชน',
  tags: ['#จิตอาสา', '#พัฒนาชุมชน', '#สิ่งแวดล้อม'],
  coverImageUrl:
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=200&q=80',
  objective:
    'ส่งเสริมให้นักศึกษาร่วมทำงานอาสา เรียนรู้วิถีชุมชน และใช้ความรู้สร้างประโยชน์ให้สังคม พร้อมพัฒนาทักษะการทำงานเป็นทีมและความรับผิดชอบต่อส่วนรวม',
  activities: [
    'ค่ายอาสาพัฒนาโรงเรียนและพื้นที่สาธารณะ',
    'กิจกรรมสอนหนังสือและแบ่งปันความรู้ให้เด็ก ๆ',
    'โครงการสิ่งแวดล้อมร่วมกับชุมชนรอบมหาวิทยาลัย',
  ],
  welcomeNote: 'ยินดีต้อนรับนักศึกษาทุกคน ไม่จำเป็นต้องมีประสบการณ์',
  contacts: {
    facebook: 'facebook.com/tu.volunteer',
    instagram: 'tu_volunteer',
    email: 'volunteer@club.tu.ac.th',
  },
  activeRound: {
    id: 'round-1-2567',
    title: 'รอบรับสมัครสมาชิกใหม่ ประจำภาคเรียนที่ 1/2567',
    academicYear: 2567,
    semester: 'ภาคเรียนที่ 1/2567',
    startDateText: '1 พ.ย. 2567 (09:00 น.) – 15 พ.ย. 2567 (23:59 น.)',
    endDateText: '15 พ.ย. 2567 (23:59 น.)',
    qualificationText: 'นักศึกษา มธ. ทุกชั้นปี ทุกคณะ',
    questionCountText: 'มีคำถามคัดเลือก 3 ข้อ (ตอบแบบข้อความ)',
    isOpen: true,
  },
};

// ข้อมูลจำลองชมรมที่ 2: ไม่มีรอบเปิดรับสมัคร (Alternate State)
const mockPhotoClub: ClubDetailData = {
  id: 'tu-photo',
  name: 'ชมรมถ่ายภาพธรรมศาสตร์',
  category: 'ศิลปวัฒนธรรม',
  slogan: 'บันทึกความทรงจำผ่านเลนส์ มุมมองใหม่ของชีวิตในรั้ว มธ.',
  tags: ['#ถ่ายภาพ', '#ศิลปะ', '#มุมกล้อง'],
  coverImageUrl:
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=200&q=80',
  objective: 'พัฒนาทักษะการถ่ายภาพและการตัดต่อ จัดเวิร์กชอป และแสดงนิทรรศการภาพถ่ายของนักศึกษา',
  activities: ['ออกทริปถ่ายภาพนอกสถานที่', 'เวิร์กชอปการแต่งรูป Lightroom/Photoshop', 'นิทรรศการภาพถ่ายประจำปี'],
  welcomeNote: 'ยินดีต้อนรับผู้สนใจถ่ายภาพทุกระดับ มีหรือไม่มีกล้องก็มาเรียนรู้ร่วมกันได้',
  contacts: {
    facebook: 'facebook.com/tu.photo',
    instagram: 'tu_photo',
    email: 'photo@club.tu.ac.th',
  },
  activeRound: undefined, // ไม่มีรอบเปิดรับ
};

interface ClubDetailPageProps {
  clubId?: string;
}

export const ClubDetailPage = ({ clubId = 'volunteer-community' }: ClubDetailPageProps) => {
  // สลับข้อมูลชมรมตาม clubId
  const [currentClubId, setCurrentClubId] = useState<string>(clubId);
  const club: ClubDetailData =
    currentClubId === 'tu-photo' ? mockPhotoClub : mockVolunteerClub;

  const [isLoggedIn] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      setIsLoginModalOpen(true);
    } else {
      alert(`นำทางไปยังหน้ากรอกใบสมัครของ ${club.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24 sm:pb-16">
      {/* แถบจำลองการทดสอบเปลี่ยน Direct URL /clubs/:id */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-rose-600 px-2 py-0.5 rounded font-mono font-bold text-[10px]">DIRECT URL</span>
          <span className="font-mono text-slate-300">/clubs/{club.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 hidden sm:inline">ทดสอบสลับชมรม:</span>
          <button
            type="button"
            onClick={() => setCurrentClubId('volunteer-community')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              currentClubId === 'volunteer-community'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ชมรมอาสา (มีรอบเปิด)
          </button>
          <button
            type="button"
            onClick={() => setCurrentClubId('tu-photo')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              currentClubId === 'tu-photo'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ชมรมถ่ายภาพ (ไม่มีรอบเปิด)
          </button>
        </div>
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#C81E3D] flex items-center justify-center text-white font-black text-xs">
              TU
            </div>
            <span className="font-extrabold text-slate-900 text-base tracking-tight">
              ClubHub
            </span>
          </div>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชมรมอื่น ๆ ที่คุณสนใจ ⌘ K"
                className="w-full h-9 rounded-xl bg-slate-100 border border-transparent px-9 text-xs focus:bg-white focus:border-rose-400 focus:outline-none transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>เข้าสู่ระบบ</span>
            <span>➔</span>
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 pb-2 text-xs text-slate-400 flex items-center gap-1">
        <span>สำรวจชมรม</span>
        <span>&gt;</span>
        <span className="text-slate-700 font-medium">{club.category}</span>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col gap-6">
        {/* Banner & Cover */}
        <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="h-48 sm:h-72 w-full overflow-hidden bg-slate-200 relative">
            <img
              src={club.coverImageUrl}
              alt="Club Banner"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5 sm:p-8 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 sm:-mt-16">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl bg-white p-1.5 shadow-md border border-slate-100 shrink-0">
              <div className="h-full w-full rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#C81E3D] font-bold text-center text-xs p-2">
                TU CLUB
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-50 text-[#C81E3D] text-[11px] font-bold w-fit">
                {club.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {club.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {club.slogan}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {club.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 text-lg">❤️</span>
                <h2 className="text-base font-bold text-slate-900">วัตถุประสงค์ของชมรม</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {club.objective}
              </p>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 text-lg">🌱</span>
                <h2 className="text-base font-bold text-slate-900">เกี่ยวกับกิจกรรมของเรา</h2>
              </div>
              <div className="flex flex-col gap-2.5">
                {club.activities.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-3"
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#C81E3D]">
                <span>✨</span>
                <span>{club.welcomeNote}</span>
              </div>
            </section>

            {/* รอบรับสมัครที่เปิดรับสมัครในขณะนี้ / Alternate State */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 text-lg">📅</span>
                  <h2 className="text-base font-bold text-slate-900">
                    รอบรับสมัครที่เปิดรับสมัครในขณะนี้
                  </h2>
                </div>
                {club.activeRound?.isOpen && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {club.activeRound && club.activeRound.isOpen ? (
                <div className="flex flex-col gap-4 pt-1">
                  <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold w-fit">
                    กำลังเปิดรับสมัคร
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {club.activeRound.title}
                  </h3>

                  <div className="flex flex-col gap-3 text-xs sm:text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-start gap-2.5">
                      <span className="text-slate-400">🕒</span>
                      <div>
                        <span className="font-bold text-slate-700 block">ระยะเวลารับสมัคร</span>
                        <span>{club.activeRound.startDateText}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-slate-400">🎓</span>
                      <div>
                        <span className="font-bold text-slate-700 block">คุณสมบัติผู้สมัคร</span>
                        <span>{club.activeRound.qualificationText}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-slate-400">📝</span>
                      <div>
                        <span className="font-bold text-slate-700 block">แบบฟอร์มการสมัคร</span>
                        <span>{club.activeRound.questionCountText}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyClick}
                    className="w-full h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-sm font-bold transition-colors shadow-lg shadow-rose-900/10 flex items-center justify-center gap-2"
                  >
                    <span>สมัครเข้าร่วมชมรมนี้</span>
                    <span>➔</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    🔒 เข้าสู่ระบบด้วยบัญชี TU เพื่อสมัคร
                  </p>
                </div>
              ) : (
                /* Alternate State: ไม่มีรอบรับสมัครในขณะนี้ */
                <div className="py-10 px-4 text-center flex flex-col items-center gap-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-xl">
                    📂
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    ไม่มีรอบรับสมัครในขณะนี้
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    ขณะนี้ชมรมยังไม่มีรอบรับสมัครที่เปิดอยู่ คุณสามารถติดตามช่องทางโซเชียลมีเดียของชมรมเพื่อรับข่าวสารเปิดรับสมัครรอบถัดไป
                  </p>
                  <span className="text-xs font-semibold text-rose-600 mt-1">
                    @{club.contacts.instagram}
                  </span>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            {club.activeRound && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold w-fit">
                  กำลังเปิดรับสมัคร
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  มาเป็นส่วนหนึ่งของความเปลี่ยนแปลง
                </h3>
                <p className="text-xs text-slate-500">
                  {club.activeRound.title}
                </p>
                <div className="text-xs text-slate-500 pt-1">
                  📅 ปิดรับ: {club.activeRound.startDateText.split('–')[1]}
                </div>
                <button
                  type="button"
                  onClick={handleApplyClick}
                  className="w-full h-11 rounded-xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold transition-colors mt-2 shadow-md flex items-center justify-center gap-2"
                >
                  <span>สมัครเข้าร่วมชมรมนี้</span>
                  <span>➔</span>
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">ช่องทางการติดต่อ</h3>
                <p className="text-xs text-slate-400 mt-0.5">พูดคุยกับเรา และติดตามกิจกรรมของชมรม</p>
              </div>

              <div className="flex flex-col gap-2.5">
                {club.contacts.facebook && (
                  <a
                    href={`https://${club.contacts.facebook}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs text-slate-700 font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600 font-bold">f</span>
                      <div>
                        <span className="font-bold block text-slate-800">Facebook</span>
                        <span className="text-slate-400 text-[11px]">{club.contacts.facebook}</span>
                      </div>
                    </div>
                    <span>↗</span>
                  </a>
                )}

                {club.contacts.instagram && (
                  <a
                    href={`https://instagram.com/${club.contacts.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs text-slate-700 font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-rose-500 font-bold">📷</span>
                      <div>
                        <span className="font-bold block text-slate-800">Instagram</span>
                        <span className="text-slate-400 text-[11px]">@{club.contacts.instagram}</span>
                      </div>
                    </div>
                    <span>↗</span>
                  </a>
                )}

                {club.contacts.email && (
                  <a
                    href={`mailto:${club.contacts.email}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs text-slate-700 font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-bold">✉️</span>
                      <div>
                        <span className="font-bold block text-slate-800">Email</span>
                        <span className="text-slate-400 text-[11px]">{club.contacts.email}</span>
                      </div>
                    </div>
                    <span>↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {club.activeRound && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-lg">
          <button
            type="button"
            onClick={handleApplyClick}
            className="w-full h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-sm font-bold shadow-md flex items-center justify-center gap-2"
          >
            <span>สมัครเข้าร่วมชมรมนี้</span>
            <span>➔</span>
          </button>
        </div>
      )}

      <GuestLoginModal
        isOpen={isLoginModalOpen}
        roundTitle={club.activeRound?.title || ''}
        clubName={club.name}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={() => {
          alert('นำทางไปหน้า TU Authentication Login');
          setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
};