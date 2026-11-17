import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ClubDetailData, RecruitmentRoundData } from '../types/club';
import { fetchClubDetail, type ClubDetailResult } from '../services/clubService';
import { formatThaiDateTime } from '../../../lib/format';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { WIDE_CONTAINER_CLASS as containerClass } from '../../../components/layout/PublicLayout';
import { Button } from '../../../components/ui/Button';
import { buttonClass } from '../../../components/ui/classes';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Code2,
  Cpu,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Layers,
  Leaf,
  Mail,
  MapPin,
  Music,
  Pencil,
  UserRoundPlus,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { ClubLogo } from './ClubLogo';
import { GuestLoginModal } from './GuestLoginModal';
import { demoClubActivities } from '../utils/demoClubActivities';

interface ClubDetailPageProps {
  clubId: string;
  isLoggedIn?: boolean;
  onRequestLogin?: () => void;
  onNavigateToApplication?: (roundId: string) => void;
}

const formatPeriod = (round: RecruitmentRoundData) =>
  `${formatThaiDateTime(round.opensAt)} – ${formatThaiDateTime(round.closesAt)}`;

const CLUB_EMBLEM_MAP: Array<[string[], typeof Users]> = [
  [['ai', 'วิทยาการข้อมูล', 'โปรแกรม'], Code2],
  [['หุ่นยนต์', 'iot'], Cpu],
  [['ดนตรี'], Music],
  [['ถ่ายภาพ'], Camera],
  [['ฟุตบอล', 'แบดมินตัน', 'วิ่ง', 'กีฬา'], Trophy],
  [['สิ่งแวดล้อม', 'อนุรักษ์'], Leaf],
];

const formatShortDateRange = (round: RecruitmentRoundData) => {
  const fmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = new Date(round.opensAt);
  const end = new Date(round.closesAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return formatPeriod(round);
  }
  return fmt.formatRange(start, end);
};

function ClubEmblemIcon({ club }: { club: ClubDetailData }) {
  const text = `${club.name} ${club.category} ${club.tags.join(' ')}`.toLowerCase();
  const Icon = CLUB_EMBLEM_MAP.find(([keywords]) => keywords.some((kw) => text.includes(kw)))?.[1] ?? Users;
  return <Icon aria-hidden="true" strokeWidth={1.75} className="size-9" />;
}

function BenefitIcon({ index }: { index: number }) {
  const slot = index % 3;
  const Icon = slot === 0 ? Code2 : slot === 1 ? Users : Layers;
  return <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-[#861638]" />;
}

const CONTACT_ROW_ICONS = {
  location: MapPin,
  instagram: Instagram,
  facebook: Facebook,
  website: Globe,
  email: Mail,
} as const;

function ContactRowIcon({ kind }: { kind: keyof typeof CONTACT_ROW_ICONS }) {
  const Icon = CONTACT_ROW_ICONS[kind];
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center text-[#861638]"
    >
      <Icon strokeWidth={1.75} className="size-[18px]" />
    </span>
  );
}

function formatSocialHandle(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    return pathname ? `@${pathname.split('/')[0]}` : fallback;
  } catch {
    return fallback;
  }
}

export const ClubDetailPage: React.FC<ClubDetailPageProps> = ({
  clubId,
  isLoggedIn = false,
  onRequestLogin,
  onNavigateToApplication,
}) => {
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [loaded, setLoaded] = useState<{ key: string; result: ClubDetailResult } | null>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fallbackMapClubId, setFallbackMapClubId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [pendingRound, setPendingRound] = useState<RecruitmentRoundData | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!previewUrl) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewUrl(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewUrl]);

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
      <div className="mx-auto flex w-full max-w-[1680px] items-center justify-center px-4 py-24 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center gap-3 rounded-xl border border-[#E6DFD6] bg-white px-6 py-4 text-sm">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#861638]"
          />
          <span className="font-medium text-[#25202A]">กำลังโหลดข้อมูลชมรม...</span>
        </div>
      </div>
    );
  }

  if (result.status === 'not-found') {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <EmptyState headingLevel={1} title="ไม่พบข้อมูลชมรม" />
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center text-sm text-[#25202A]">
        <p role="alert">{result.message}</p>
        <Button variant="primary" onClick={() => setReloadKey((key) => key + 1)}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { club } = result;
  const coverSrc = club.bannerUrl && club.bannerUrl !== failedCover ? club.bannerUrl : null;
  const hasSeparateLogo = Boolean(club.imageUrl && club.imageUrl !== club.bannerUrl);
  const demoImages = demoClubActivities(coverSrc);
  const galleryImages = demoImages.length ? demoImages : coverSrc?.startsWith('/images/') ? [coverSrc] : [];
  const objectiveLines = (club.objectives ?? '').split(/\r?\n|·|•/).map((item) => item.trim()).filter(Boolean);
  const emailUrl = club.contacts.email ? `mailto:${club.contacts.email}` : '';
  const selectedRound = club.rounds.find((round) => round.id === selectedRoundId) ?? club.rounds[0];
  const mapLocation = club.affiliationName?.trim();
  const locationQuery = mapLocation ? `${mapLocation} มหาวิทยาลัยธรรมศาสตร์` : '';
  const showUniversityMap = !mapLocation || fallbackMapClubId === clubId;
  const mapQuery = showUniversityMap ? 'มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต' : locationQuery;

  const contactItems: Array<{
    key: string;
    kind: 'location' | 'instagram' | 'facebook' | 'website' | 'email';
    label: string;
    href: string;
    external: boolean;
  }> = [
    ...(club.affiliationName
      ? [{
          key: 'affiliation',
          kind: 'location' as const,
          label: club.affiliationName,
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`,
          external: true,
        }]
      : []),
    ...(club.contacts.instagram
      ? [{
          key: 'instagram',
          kind: 'instagram' as const,
          label: formatSocialHandle(club.contacts.instagram, 'Instagram'),
          href: club.contacts.instagram,
          external: true,
        }]
      : []),
    ...(club.contacts.facebook
      ? [{
          key: 'facebook',
          kind: 'facebook' as const,
          label: club.name,
          href: club.contacts.facebook,
          external: true,
        }]
      : []),
    ...(club.contacts.website
      ? [{
          key: 'website',
          kind: 'website' as const,
          label: 'เว็บไซต์ชมรม',
          href: club.contacts.website,
          external: true,
        }]
      : []),
    ...(emailUrl
      ? [{
          key: 'email',
          kind: 'email' as const,
          label: club.contacts.email ?? 'Email',
          href: emailUrl,
          external: false,
        }]
      : []),
  ];

  return (
    <div className="bg-[#FAF7F2] pb-16 text-[#25202A]">
      <div className={`${containerClass} py-3.5`}>
        <Breadcrumbs
          items={[
            { label: 'สำรวจชมรม', to: '/' },
            ...(club.category ? [{ label: club.category }] : []),
            { label: club.name },
          ]}
        />
      </div>

      {/* The banner and identity use the club's supplied profile data. */}
      <section className="relative overflow-hidden bg-[#F8EDEE]">
        {coverSrc && (
          <img
            src={coverSrc}
            onError={() => setFailedCover(coverSrc)}
            alt={club.name}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-center opacity-25"
          />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FAF3F1] via-[#FAF3F1]/95 to-[#861638]/20" />
        <div className={`${containerClass} relative py-8 sm:py-10`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#861638] p-1 text-white sm:size-24">
                {hasSeparateLogo ? <ClubLogo src={club.imageUrl} clubName={club.name} /> : <ClubEmblemIcon club={club} />}
              </div>
              <div className="min-w-0">
                {club.category && <span className="inline-flex rounded-full bg-[#F2E1E3] px-3 py-0.5 text-xs font-semibold text-[#861638] sm:text-[13px]">{club.category}</span>}
                <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-[#25202A] sm:text-[32px]">{club.name}</h1>
                <p className="mt-1 line-clamp-2 max-w-2xl text-[15px] leading-6 text-[#59545B] sm:text-base">{club.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {club.canEditProfile && <Link to={`/clubs/${clubId}/edit`} className={buttonClass('secondary')}>แก้ไขข้อมูลชมรม</Link>}
            </div>
          </div>
        </div>
      </section>

      <div className={`${containerClass} pt-7`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="flex h-full flex-col gap-8 rounded-2xl border border-[#EDE3DC] bg-white/75 p-5 shadow-sm sm:p-7 lg:col-span-8">
            <section aria-labelledby="club-about-heading">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-5 w-[3px] rounded-full bg-[#861638]" />
                <h2 id="club-about-heading" className="text-[20px] font-extrabold text-[#25202A] sm:text-[22px]">เกี่ยวกับชมรม</h2>
              </div>
              <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-[#4B4349] sm:text-base">{club.description}</p>
              {club.objectives && objectiveLines.length < 2 && <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-[#706B70]">{club.objectives}</p>}
            </section>
            {objectiveLines.length >= 2 && (
              <section aria-labelledby="club-benefits-heading">
                <h2 id="club-benefits-heading" className="text-base font-bold text-[#25202A]">สิ่งที่คุณจะได้</h2>
                <div className={`mt-4 grid gap-3 ${objectiveLines.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {objectiveLines.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-xl border border-[#EDE3DC] bg-white/70 p-4 motion-safe:transition-colors motion-safe:duration-200 hover:border-[#DDBFC7] hover:bg-white">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F6E9E9]"><BenefitIcon index={index} /></span>
                      <p className="pt-0.5 text-sm leading-6 text-[#3B3540]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {galleryImages.length > 0 && (
              <section aria-labelledby="club-gallery-heading" className="mt-auto border-t border-[#E6DFD6] pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="club-gallery-heading" className="text-base font-bold text-[#25202A]">ตัวอย่างกิจกรรม</h2>
                  {demoImages.length > 0 && <span className="text-xs text-[#706B70]">ภาพประกอบจำลอง</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryImages.map((src, index) => (
                    <button key={src} type="button" onClick={() => setPreviewUrl(src)} aria-label={`ดูภาพกิจกรรม ${club.name} (${index + 1})`} className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-[#E6DFD6] bg-[#EDE5DC] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#861638]">
                      <img src={src} alt={`${demoImages.length ? 'ภาพประกอบจำลองกิจกรรม' : 'บรรยากาศกิจกรรม'} ${club.name}`} loading="lazy" decoding="async" className="size-full object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.035]" />
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#861638] shadow-sm">ดูภาพ</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
          <aside className="flex h-full flex-col gap-6 lg:col-span-4 lg:col-start-9">
              <section
                aria-labelledby="sidebar-recruitment-heading"
                className="overflow-hidden rounded-2xl border border-[#E8D7D4] bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 bg-[#861638] px-5 py-4 text-white sm:px-6">
                  <UserRoundPlus aria-hidden="true" strokeWidth={1.75} className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 id="sidebar-recruitment-heading" className="text-lg font-bold">สมัครเข้าชมรม</h2>
                    <p className="mt-0.5 text-sm text-white/85">ร่วมเป็นส่วนหนึ่งของ{club.name}</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-3 p-2 sm:p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-bold text-[#25202A]">
                        <CalendarDays aria-hidden="true" strokeWidth={1.75} className="size-5 text-[#861638]" />
                        รอบรับสมัครปัจจุบัน
                      </p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedRound ? 'bg-[#E4F4E2] text-[#247447]' : 'bg-[#F0EDEA] text-[#706B70]'}`}>
                        {selectedRound ? 'เปิดรับสมัคร' : club.roundsUnavailable ? 'โหลดข้อมูลไม่สำเร็จ' : 'ปิดรับสมัคร'}
                      </span>
                    </div>
                    {club.rounds.length > 1 ? (
                      <div role="radiogroup" aria-label="เลือกรอบรับสมัคร" className="space-y-2">
                        {club.rounds.map((round) => {
                          const isSelected = selectedRound?.id === round.id;
                          return (
                            <button
                              key={round.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setSelectedRoundId(round.id)}
                              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                isSelected
                                  ? 'border-[#861638] bg-[#FAF0F2]'
                                  : 'border-[#E8D7D4] bg-white hover:border-[#DDBFC7] hover:bg-[#FAF7F2]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-[#25202A]">{round.title}</p>
                              <p className="mt-0.5 text-xs text-[#59545B]">เปิดรับ {formatShortDateRange(round)}</p>
                            </button>
                          );
                        })}
                      </div>
                    ) : selectedRound ? (
                      <>
                        <p className="text-sm font-semibold text-[#25202A]">{selectedRound.title}</p>
                        <p className="text-sm text-[#59545B]">เปิดรับ {formatShortDateRange(selectedRound)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-[#59545B]">
                        {club.roundsUnavailable ? 'ไม่สามารถโหลดข้อมูลรอบรับสมัครได้ในขณะนี้' : 'ยังไม่มีรอบที่เปิดรับสมัครในขณะนี้'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!selectedRound || !applicationAvailable}
                    onClick={() => { if (selectedRound) handleApplyClick(selectedRound); }}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#861638] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#68112B] disabled:cursor-not-allowed disabled:bg-[#E5E2E0] disabled:text-[#77716F]"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    สมัครเข้าชมรม
                  </button>
                  {club.roundsUnavailable && <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="min-h-10 w-full text-sm font-semibold text-[#861638] hover:underline">ลองโหลดอีกครั้ง</button>}
                </div>
              </section>

            {contactItems.length > 0 && (
              <section aria-labelledby="club-contact-heading" className="flex flex-1 flex-col rounded-2xl border border-[#EDE3DC] bg-white/75 p-5 shadow-sm sm:p-6">
                <div className="mb-2 flex items-center gap-3">
                  <span aria-hidden="true" className="h-5 w-[3px] bg-[#861638]" />
                  <h2 id="club-contact-heading" className="text-base font-bold text-[#25202A]">
                    ข้อมูลติดต่อ
                  </h2>
                </div>
                <ul className="flex flex-1 flex-col divide-y divide-[#EDE8E3] border-b border-[#EDE8E3]">
                  {contactItems.map((item) => (
                    <li key={item.key} className="flex flex-1 flex-col justify-center">
                      <a
                        href={item.href}
                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="group flex min-h-12 items-center justify-between gap-3 rounded-md px-2 py-3 text-sm text-[#25202A] transition-colors duration-150 hover:bg-[#F9F0EF] hover:text-[#861638] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#861638]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0">
                            <ContactRowIcon kind={item.kind} />
                          </span>
                          <span className="min-w-0 break-words leading-5">{item.label}</span>
                        </span>
                        {item.kind === 'location' ? (
                          <ExternalLink
                            strokeWidth={1.75}
                            className="size-4 shrink-0 text-[#861638] transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        ) : (
                          <ChevronRight
                            strokeWidth={1.75}
                            className="size-4 shrink-0 text-[#861638] transition-transform duration-150 group-hover:translate-x-0.5"
                          />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
        <section aria-labelledby="club-map-heading" className="mt-10 border-t border-[#E6DFD6] pt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-5 w-[3px] bg-[#861638]" />
              <h2 id="club-map-heading" className="text-base font-bold text-[#25202A]">แผนที่</h2>
            </div>
            {!showUniversityMap && <button type="button" onClick={() => setFallbackMapClubId(clubId)} className="min-h-11 text-sm font-semibold text-[#861638] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#861638]">แสดงแผนที่ธรรมศาสตร์</button>}
          </div>
          {showUniversityMap && <p className="mb-3 text-sm text-[#706B70]">แสดงมหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต</p>}
          <iframe
            title={`แผนที่ ${showUniversityMap ? 'มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต' : mapLocation}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
            onError={() => setFallbackMapClubId(clubId)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full rounded-xl border border-[#E6DFD6] sm:h-96"
          />
        </section>
      </div>

      {previewUrl && (
        <div role="dialog" aria-modal="true" aria-label={`ภาพกิจกรรม ${club.name}`} onClick={() => setPreviewUrl(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div onClick={(event) => event.stopPropagation()} className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <button type="button" onClick={() => setPreviewUrl(null)} aria-label="ปิดภาพตัวอย่าง" className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><X strokeWidth={2} className="size-4" /></button>
            <img src={previewUrl} alt={`ภาพกิจกรรม ${club.name}`} className="max-h-[85vh] w-auto object-contain" />
          </div>
        </div>
      )}
      <GuestLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={onRequestLogin}
        roundTitle={pendingRound?.title}
      />
    </div>
  );
};
