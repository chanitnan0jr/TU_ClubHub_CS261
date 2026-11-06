import React, { useEffect, useState } from 'react';
import type { RecruitmentRoundData } from '../types/club';
import { fetchClubDetail, type ClubDetailResult } from '../services/clubService';
import { formatThaiDateTime } from '../../../lib/format';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CalendarDaysIcon, ClipboardCheckIcon, ExternalLinkIcon } from '../../../components/ui/icons';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ClubLogo } from './ClubLogo';
import { GuestLoginModal } from './GuestLoginModal';

interface ClubDetailPageProps {
  clubId: string;
  isLoggedIn?: boolean;
  // Sends the visitor to the login page. Needed to sign in from this page.
  onRequestLogin?: () => void;
  // Routes an authenticated student to the selected round's application form.
  onNavigateToApplication?: (roundId: string) => void;
}

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
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-tu-maroon"
          />
          <span className="font-medium text-slate-700">กำลังโหลดข้อมูลชมรม...</span>
        </div>
      </div>
    );
  }

  if (result.status === 'not-found') {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState headingLevel={1} title="ไม่พบข้อมูลชมรม" />
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center text-sm text-slate-700">
        <p role="alert">{result.message}</p>
        <Button variant="primary" onClick={() => setReloadKey((key) => key + 1)}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { club } = result;
  // No banner, or it failed to load: show the local placeholder, never an external image.
  const coverSrc = club.bannerUrl && club.bannerUrl !== failedCover ? club.bannerUrl : null;
  const emailUrl = club.contacts.email ? `mailto:${club.contacts.email}` : '';
  const hasContacts = Boolean(
    club.contacts.website || club.contacts.facebook || club.contacts.instagram || emailUrl,
  );
  const firstRound = club.rounds[0];
  const applyLabel = applicationAvailable ? 'สมัครเข้าร่วมชมรมนี้' : 'ระบบรับใบสมัครยังไม่เปิดใช้งาน';

  const contactLinks = [
    { label: 'เว็บไซต์', href: club.contacts.website, external: true },
    { label: 'Facebook', href: club.contacts.facebook, external: true },
    { label: 'Instagram', href: club.contacts.instagram, external: true },
    { label: 'Email', href: emailUrl, external: false },
  ].filter((link) => link.href);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'สำรวจชมรม', to: '/' },
          ...(club.category ? [{ label: club.category }] : []),
          { label: club.name },
        ]}
      />

      {/* Cover image with fallback, logo and title */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="aspect-[3/1] min-h-32 w-full bg-slate-200">
          {coverSrc ? (
            <img
              src={coverSrc}
              onError={() => setFailedCover(coverSrc)}
              alt={club.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-linear-to-br from-tu-maroon-100 via-tu-maroon-50 to-slate-100" />
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
          <div className="-mt-10 size-20 shrink-0 rounded-xl border border-slate-200 bg-white p-1 sm:-mt-12 sm:size-24">
            <ClubLogo src={club.imageUrl} clubName={club.name} />
          </div>
          <div className="min-w-0">
            {club.category && (
              <span className="inline-flex rounded-md bg-tu-maroon-50 px-2 py-0.5 text-xs font-medium text-tu-maroon">
                {club.category}
              </span>
            )}
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {club.name}
            </h1>
            {club.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="แท็กของชมรม">
                {club.tags.map((tag, idx) => (
                  <li
                    key={idx}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionCard title="เกี่ยวกับชมรม">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{club.description}</p>
          </SectionCard>

          {club.objectives && (
            <SectionCard title="วัตถุประสงค์ของชมรม">
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{club.objectives}</p>
            </SectionCard>
          )}

          <SectionCard title="รอบรับสมัครที่เปิดรับสมัครในขณะนี้">
            {club.roundsUnavailable ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center"
              >
                <h3 className="text-sm font-semibold text-amber-900">
                  ไม่สามารถโหลดรอบรับสมัครได้ในขณะนี้
                </h3>
                <Button onClick={() => setReloadKey((key) => key + 1)}>ลองใหม่</Button>
              </div>
            ) : club.rounds.length > 0 ? (
              club.rounds.map((round) => (
                <article key={round.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-5">
                  <div>
                    <StatusBadge status="OPEN" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{round.title}</h3>
                  <p className="flex items-start gap-2 text-sm text-slate-700">
                    <CalendarDaysIcon className="mt-0.5 size-4 text-slate-500" />
                    <span>
                      <span className="font-medium text-slate-900">ระยะเวลารับสมัคร: </span>
                      {formatPeriod(round)}
                    </span>
                  </p>
                  {round.resultsScheduledAt && (
                    <p className="flex items-start gap-2 text-sm text-slate-700">
                      <ClipboardCheckIcon className="mt-0.5 size-4 text-slate-500" />
                      <span>
                        <span className="font-medium text-slate-900">กำหนดประกาศผล: </span>
                        {formatThaiDateTime(round.resultsScheduledAt)}
                      </span>
                    </p>
                  )}
                  {round.description.trim() && (
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <h4 className="text-sm font-medium text-slate-900">รายละเอียด/คุณสมบัติ</h4>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {round.description}
                      </p>
                    </div>
                  )}
                  <Button
                    disabled={!applicationAvailable}
                    onClick={() => handleApplyClick(round)}
                    className="mt-1 w-full sm:w-auto sm:self-start"
                  >
                    {applyLabel}
                  </Button>
                  <p className="text-xs text-slate-600">
                    {!applicationAvailable
                      ? 'ขณะนี้ยังส่งใบสมัครผ่านระบบไม่ได้ กรุณาติดตามประกาศจากชมรม'
                      : isLoggedIn
                        ? 'คุณเข้าสู่ระบบเรียบร้อยแล้ว พร้อมสำหรับกรอกแบบฟอร์ม'
                        : 'จำเป็นต้องเข้าสู่ระบบด้วยบัญชี TU เพื่อส่งใบสมัคร'}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<CalendarDaysIcon className="size-6" />}
                title="ไม่มีรอบรับสมัครในขณะนี้"
                description="ขณะนี้ชมรมยังไม่มีรอบรับสมัครที่เปิดอยู่ คุณสามารถติดตามข่าวสารผ่านช่องทางโซเชียลมีเดีย"
              />
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          {firstRound && (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <StatusBadge status="OPEN" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{firstRound.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  ปิดรับ {formatThaiDateTime(firstRound.closesAt)}
                </p>
              </div>
              <Button
                variant="primary"
                disabled={!applicationAvailable}
                onClick={() => handleApplyClick(firstRound)}
                className="w-full"
              >
                {applyLabel}
              </Button>
              <span className="text-center text-xs text-slate-600">
                สำหรับนักศึกษามหาวิทยาลัยธรรมศาสตร์
              </span>
            </div>
          )}

          {/* ช่องทางการติดต่อ - แสดงเฉพาะช่องทางที่มีข้อมูลจริง */}
          {hasContacts && (
            <SectionCard title="ช่องทางการติดต่อ" description="พูดคุยกับเรา และติดตามกิจกรรมของชมรม">
              <ul className="flex flex-col gap-2">
                {contactLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      {link.label}
                      <ExternalLinkIcon className="size-4 text-slate-500" />
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <GuestLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={onRequestLogin}
        roundTitle={pendingRound?.title}
      />
    </div>
  );
};
