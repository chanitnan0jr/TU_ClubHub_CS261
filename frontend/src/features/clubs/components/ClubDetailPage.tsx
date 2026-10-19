import React, { useEffect, useState } from 'react';
import type { ClubDetailData } from '../types/club';
import { fetchClubDetailAPI } from '../services/clubService';
import { GuestLoginModal } from './GuestLoginModal';

interface ClubDetailPageProps {
  clubId?: string;
  isLoggedIn?: boolean;
  onNavigateToApplication?: (roundId: string) => void;
}

// รูป Cover สำรอง กรณีที่ชมรมไม่มีรูปหรือโหลดรูปไม่ขึ้น
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200';

export const ClubDetailPage: React.FC<ClubDetailPageProps> = ({
  clubId = 'volunteer',
  isLoggedIn = false,
  onNavigateToApplication,
}) => {
  const [club, setClub] = useState<ClubDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(DEFAULT_COVER_IMAGE);

  useEffect(() => {
    setIsLoading(true);
    fetchClubDetailAPI(clubId).then((data) => {
      setClub(data);
      if (data?.coverImageUrl) {
        setImgSrc(data.coverImageUrl);
      } else {
        setImgSrc(DEFAULT_COVER_IMAGE);
      }
      setIsLoading(false);
    });
  }, [clubId]);

  // ใช้ ID ของรอบจริง ไม่ Hardcode ค่า
  const handleApplyClick = () => {
    if (!club?.activeRound) return;

    const targetRoundId = club.activeRound.id || `round-${club.id}`;

    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      if (onNavigateToApplication) {
        onNavigateToApplication(targetRoundId);
      } else {
        alert(`นำทางไปยังแบบฟอร์มสมัครสมาชิกรอบ ID: ${targetRoundId}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-sm">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="animate-spin text-xl">⏳</span>
          <span className="font-semibold text-slate-700">กำลังโหลดข้อมูลชมรม...</span>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-sm">
        ไม่พบข้อมูลชมรม
      </div>
    );
  }

  // ตัวช่วยสร้าง URL สำหรับปุ่ม Social
  const formatUrl = (url?: string, type?: 'fb' | 'ig' | 'mail') => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      return url;
    }
    if (type === 'mail') return `mailto:${url}`;
    if (type === 'ig') return `https://instagram.com/${url.replace('@', '')}`;
    return `https://${url}`;
  };

  const facebookUrl = formatUrl(club.contacts?.facebook, 'fb');
  const instagramUrl = formatUrl(club.contacts?.instagram, 'ig');
  const emailUrl = formatUrl(club.contacts?.email, 'mail');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#C81E3D] flex items-center justify-center text-white font-black text-xs shadow-sm">
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
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div>
            {isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 transition-colors cursor-pointer">
                <span className="h-6 w-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[11px] font-black">
                  👤
                </span>
                <span>บัญชีนักศึกษา</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="h-9 px-4 rounded-xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <span>เข้าสู่ระบบ</span>
                <span>➔</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 flex flex-col gap-5">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
          <span className="hover:underline cursor-pointer">สำรวจชมรม</span>
          <span>&gt;</span>
          <span className="text-rose-700 font-semibold">{club.category}</span>
        </div>

        {/* Hero Cover Image & Fallback */}
        <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-sm">
          <div className="h-48 sm:h-72 w-full bg-slate-800 relative overflow-hidden">
            <img
              src={imgSrc}
              onError={() => setImgSrc(DEFAULT_COVER_IMAGE)}
              alt={club.name}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="p-5 sm:p-7 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 -mt-10 sm:-mt-14 relative z-10">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white p-1 shadow-lg border border-slate-100 shrink-0">
                <div className="h-full w-full rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-3xl font-bold">
                  🌱
                </div>
              </div>
              <div className="pt-1 sm:pt-12">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-100">
                    {club.category}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                  {club.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  {club.tagline}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {club.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-rose-500">❤️</span>
                <span>วัตถุประสงค์ของชมรม</span>
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {club.objective}
              </p>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-rose-500">📌</span>
                <span>เกี่ยวกับกิจกรรมของเรา</span>
              </h2>
              <div className="flex flex-col gap-2 pt-1">
                {club.activities.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 font-medium"
                  >
                    <span className="h-6 w-6 rounded-xl bg-white shadow-xs border border-slate-200/60 text-rose-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
              {club.announcementNote && (
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-rose-800 font-medium flex items-center gap-2.5 mt-1">
                  <span className="text-sm">✨</span>
                  <span>{club.announcementNote}</span>
                </div>
              )}
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-500">📅</span>
                  <span>รอบรับสมัครที่เปิดรับสมัครในขณะนี้</span>
                </h2>
                {club.activeRound && !club.activeRound.isClosed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>

              {club.activeRound && !club.activeRound.isClosed ? (
                <div className="p-5 rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/30 to-white flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      • กำลังเปิดรับสมัคร
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">
                    {club.activeRound.title}
                  </h3>

                  <div className="flex flex-col gap-2.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-slate-400">📆</span>
                      <div>
                        <span className="font-semibold text-slate-700">ระยะเวลารับสมัคร: </span>
                        <span>{club.activeRound.startDate} – {club.activeRound.endDate}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400">🎓</span>
                      <div>
                        <span className="font-semibold text-slate-700">คุณสมบัติผู้สมัคร: </span>
                        <span>{club.activeRound.qualification || club.activeRound.qualificationText}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400">📝</span>
                      <div>
                        <span className="font-semibold text-slate-700">แบบฟอร์มการสมัคร: </span>
                        <span>{club.activeRound.questionSummary}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyClick}
                    className="w-full h-12 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-rose-900/10 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <span>สมัครเข้าร่วมชมรมนี้</span>
                    <span className="text-sm">➔</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    {isLoggedIn
                      ? '✓ คุณเข้าสู่ระบบเรียบร้อยแล้ว พร้อมสำหรับกรอกแบบฟอร์ม'
                      : '🔒 จำเป็นต้องเข้าสู่ระบบด้วยบัญชี TU เพื่อส่งใบสมัคร'}
                  </p>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">📅</span>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">ไม่มีรอบรับสมัครในขณะนี้</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    ขณะนี้ชมรมยังไม่มีรอบรับสมัครที่เปิดอยู่ คุณสามารถติดตามข่าวสารผ่านช่องทางโซเชียลมีเดีย
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-5">
            {club.activeRound && !club.activeRound.isClosed && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 w-fit">
                  • กำลังเปิดรับสมัคร
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    มาเป็นส่วนหนึ่งของความเปลี่ยนแปลง
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {club.activeRound.term} • ปิดรับ {club.activeRound.endDate}
                  </p>
                </div>
                <button
                  onClick={handleApplyClick}
                  className="w-full h-11 rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] active:scale-[0.99] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>สมัครเข้าร่วมชมรมนี้</span>
                  <span>➔</span>
                </button>
                <span className="text-[10px] text-slate-400 text-center">
                  สำหรับนักศึกษามหาวิทยาลัยธรรมศาสตร์
                </span>
              </div>
            )}

            {/* ช่องทางการติดต่อ - แสดงเฉพาะช่องทางที่มีข้อมูลจริง */}
            {(facebookUrl || instagramUrl || emailUrl) && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3.5">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-500">💬</span>
                  <span>ช่องทางการติดต่อ</span>
                </h3>
                <p className="text-[11px] text-slate-400">พูดคุยกับเรา และติดตามกิจกรรมของชมรม</p>
                
                <div className="flex flex-col gap-2 text-xs pt-1">
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-blue-600 font-bold">f</span>
                        <span className="font-semibold text-slate-700">Facebook</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}

                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-pink-600 font-bold">📷</span>
                        <span className="font-semibold text-slate-700">Instagram</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}

                  {emailUrl && (
                    <a
                      href={emailUrl}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-amber-600 font-bold">✉️</span>
                        <span className="font-semibold text-slate-700">Email</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <GuestLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        roundTitle={club.activeRound?.title}
      />
    </div>
  );
};