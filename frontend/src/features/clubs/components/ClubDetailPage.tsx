import React, { useEffect, useState } from 'react';
import type { RecruitmentRoundData } from '../types/club';
import { fetchClubDetail, type ClubDetailResult } from '../services/clubService';
import { formatThaiDateTime } from '../../../lib/format';
import { GuestLoginModal } from './GuestLoginModal';

interface ClubDetailPageProps {
  clubId: string;
  isLoggedIn?: boolean;
  // Sends the visitor to the login page. Needed to sign in from this page.
  onRequestLogin?: () => void;
  // The application form is not available yet, so the apply buttons stay
  // disabled until a caller provides this.
  onNavigateToApplication?: (roundId: string) => void;
}

// รูป Cover สำรอง กรณีที่ชมรมไม่มีรูปหรือโหลดรูปไม่ขึ้น
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200';

const formatPeriod = (round: RecruitmentRoundData) =>
  `${formatThaiDateTime(round.opensAt)} – ${formatThaiDateTime(round.closesAt)}`;

export const ClubDetailPage: React.FC<ClubDetailPageProps> = ({
  clubId,
  isLoggedIn = false,
  onRequestLogin,
  onNavigateToApplication,
}) => {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [loaded, setLoaded] = useState<{ key: string; result: ClubDetailResult } | null>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [pendingRound, setPendingRound] = useState<RecruitmentRoundData | null>(null);

  // A result only counts for the club and retry it was fetched for.
  const requestKey = `${clubId}:${reloadKey}`;
  const result = loaded?.key === requestKey ? loaded.result : null;

  useEffect(() => {
    let ignore = false;

    fetchClubDetail(clubId).then((next) => {
      if (!ignore) setLoaded({ key: requestKey, result: next });
    });

    return () => {
      ignore = true;
    };
  }, [clubId, requestKey]);

  const applicationAvailable = Boolean(onNavigateToApplication);

  const handleApplyClick = (round: RecruitmentRoundData) => {
    if (!onNavigateToApplication) return;

    if (!isLoggedIn) {
      setPendingRound(round);
      setShowLoginModal(true);
    } else {
      onNavigateToApplication(round.id);
    }
  };

  if (result === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-sm">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <span className="animate-spin text-xl">⏳</span>
          <span className="font-semibold text-slate-700">กำลังโหลดข้อมูลชมรม...</span>
        </div>
      </div>
    );
  }

  if (result.status === 'not-found') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-sm">
        ไม่พบข้อมูลชมรม
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 text-slate-500 font-sans text-sm px-4 text-center">
        <p role="alert">{result.message}</p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="h-9 px-4 rounded-xl bg-[#C81E3D] hover:bg-[#A01830] text-white text-xs font-bold transition-all shadow-sm"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  const { club } = result;
  const coverSrc =
    club.bannerUrl && club.bannerUrl !== failedCover ? club.bannerUrl : DEFAULT_COVER_IMAGE;
  const emailUrl = club.contacts.email ? `mailto:${club.contacts.email}` : '';
  const hasContacts = Boolean(
    club.contacts.website || club.contacts.facebook || club.contacts.instagram || emailUrl,
  );
  const firstRound = club.rounds[0];

  const applyButtonClass =
    'w-full rounded-2xl bg-[#C81E3D] hover:bg-[#A01830] active:scale-[0.99] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100';

  const contactLinkClass =
    'p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors group';

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
                disabled
                placeholder="ค้นหาชมรม (ยังไม่เปิดใช้งาน)"
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div>
            {isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
                <span className="h-6 w-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[11px] font-black">
                  👤
                </span>
                <span>เข้าสู่ระบบแล้ว</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onRequestLogin}
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
          <span>สำรวจชมรม</span>
          {club.category && (
            <>
              <span>&gt;</span>
              <span className="text-rose-700 font-semibold">{club.category}</span>
            </>
          )}
        </div>

        {/* Hero Cover Image & Fallback */}
        <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-sm">
          <div className="h-48 sm:h-72 w-full bg-slate-800 relative overflow-hidden">
            <img
              src={coverSrc}
              onError={() => setFailedCover(coverSrc)}
              alt={club.name}
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="p-5 sm:p-7 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 -mt-10 sm:-mt-14 relative z-10">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white p-1 shadow-lg border border-slate-100 shrink-0">
                {club.imageUrl ? (
                  <img
                    src={club.imageUrl}
                    alt={`โลโก้ ${club.name}`}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-3xl font-bold">
                    🌱
                  </div>
                )}
              </div>
              <div className="pt-1 sm:pt-12">
                {club.category && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-100">
                      {club.category}
                    </span>
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                  {club.name}
                </h1>
                {club.tags.length > 0 && (
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-rose-500">📌</span>
                <span>เกี่ยวกับชมรม</span>
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-line">
                {club.description}
              </p>
            </section>

            {club.objectives && (
              <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-500">❤️</span>
                  <span>วัตถุประสงค์ของชมรม</span>
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-line">
                  {club.objectives}
                </p>
              </section>
            )}

            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-500">📅</span>
                  <span>รอบรับสมัครที่เปิดรับสมัครในขณะนี้</span>
                </h2>
                {club.rounds.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>

              {club.roundsUnavailable ? (
                <div
                  role="alert"
                  className="p-8 rounded-2xl border border-amber-100 bg-amber-50 flex flex-col items-center text-center gap-2"
                >
                  <h4 className="text-sm font-bold text-amber-900">
                    ไม่สามารถโหลดรอบรับสมัครได้ในขณะนี้
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReloadKey((key) => key + 1)}
                    className="h-9 px-4 rounded-xl bg-white border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    ลองใหม่
                  </button>
                </div>
              ) : club.rounds.length > 0 ? (
                club.rounds.map((round) => (
                  <div
                    key={round.id}
                    className="p-5 rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/30 to-white flex flex-col gap-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        • กำลังเปิดรับสมัคร
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">{round.title}</h3>

                    <div className="flex flex-col gap-2.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-start gap-2 pt-1">
                        <span className="text-slate-400">📆</span>
                        <div>
                          <span className="font-semibold text-slate-700">ระยะเวลารับสมัคร: </span>
                          <span>{formatPeriod(round)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!applicationAvailable}
                      onClick={() => handleApplyClick(round)}
                      className={`${applyButtonClass} h-12 mt-2`}
                    >
                      <span>
                        {applicationAvailable
                          ? 'สมัครเข้าร่วมชมรมนี้'
                          : 'ระบบรับใบสมัครยังไม่เปิดใช้งาน'}
                      </span>
                      {applicationAvailable && <span className="text-sm">➔</span>}
                    </button>
                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      {!applicationAvailable
                        ? 'ขณะนี้ยังส่งใบสมัครผ่านระบบไม่ได้ กรุณาติดตามประกาศจากชมรม'
                        : isLoggedIn
                          ? '✓ คุณเข้าสู่ระบบเรียบร้อยแล้ว พร้อมสำหรับกรอกแบบฟอร์ม'
                          : '🔒 จำเป็นต้องเข้าสู่ระบบด้วยบัญชี TU เพื่อส่งใบสมัคร'}
                    </p>
                  </div>
                ))
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
            {firstRound && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 w-fit">
                  • กำลังเปิดรับสมัคร
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{firstRound.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ปิดรับ {formatThaiDateTime(firstRound.closesAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!applicationAvailable}
                  onClick={() => handleApplyClick(firstRound)}
                  className={`${applyButtonClass} h-11`}
                >
                  <span>
                    {applicationAvailable
                      ? 'สมัครเข้าร่วมชมรมนี้'
                      : 'ระบบรับใบสมัครยังไม่เปิดใช้งาน'}
                  </span>
                  {applicationAvailable && <span>➔</span>}
                </button>
                <span className="text-[10px] text-slate-400 text-center">
                  สำหรับนักศึกษามหาวิทยาลัยธรรมศาสตร์
                </span>
              </div>
            )}

            {/* ช่องทางการติดต่อ - แสดงเฉพาะช่องทางที่มีข้อมูลจริง */}
            {hasContacts && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3.5">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-500">💬</span>
                  <span>ช่องทางการติดต่อ</span>
                </h3>
                <p className="text-[11px] text-slate-400">พูดคุยกับเรา และติดตามกิจกรรมของชมรม</p>

                <div className="flex flex-col gap-2 text-xs pt-1">
                  {club.contacts.website && (
                    <a
                      href={club.contacts.website}
                      target="_blank"
                      rel="noreferrer"
                      className={contactLinkClass}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-600 font-bold">🌐</span>
                        <span className="font-semibold text-slate-700">เว็บไซต์</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}

                  {club.contacts.facebook && (
                    <a
                      href={club.contacts.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className={contactLinkClass}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-blue-600 font-bold">f</span>
                        <span className="font-semibold text-slate-700">Facebook</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}

                  {club.contacts.instagram && (
                    <a
                      href={club.contacts.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className={contactLinkClass}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-pink-600 font-bold">📷</span>
                        <span className="font-semibold text-slate-700">Instagram</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px]">↗</span>
                    </a>
                  )}

                  {emailUrl && (
                    <a href={emailUrl} className={contactLinkClass}>
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
        onLogin={onRequestLogin}
        roundTitle={pendingRound?.title}
      />
    </div>
  );
};
