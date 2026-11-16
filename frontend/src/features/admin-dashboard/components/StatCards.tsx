import React from 'react';
import { CheckCircle2, FileText, Landmark, Users } from 'lucide-react';
import type { AdminDashboardSummaryMetrics } from '../types/dashboard';

interface StatCardsProps {
  summary: AdminDashboardSummaryMetrics;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary }) => {
  const cards = [
    {
      key: 'clubs',
      label: 'ชมรมทั้งหมดในระบบ',
      value: summary.totalClubs.toLocaleString(),
      unit: 'ชมรม',
      subtext: `เปิดรับสมัครอยู่ ${summary.clubsCurrentlyRecruiting.toLocaleString()} ชมรม`,
      icon: <Landmark aria-hidden="true" strokeWidth={1.75} className="size-5" />,
    },
    {
      key: 'applications',
      label: 'ยอดผู้สมัครทั้งหมด',
      value: summary.totalApplications.toLocaleString(),
      unit: 'ใบสมัคร',
      subtext: `ผู้สมัครไม่ซ้ำคน ${summary.uniqueApplicants.toLocaleString()} คน`,
      icon: <FileText aria-hidden="true" strokeWidth={1.75} className="size-5" />,
    },
    {
      key: 'confirmed',
      label: 'สมาชิกภาพใหม่ที่ยืนยันสิทธิ์',
      value: summary.confirmedNewMembers.toLocaleString(),
      unit: 'รายการ',
      subtext: `อัตราตอบรับ ${summary.confirmationRatePercent}%`,
      icon: <CheckCircle2 aria-hidden="true" strokeWidth={1.75} className="size-5" />,
    },
    {
      key: 'active',
      label: 'สมาชิกภาพชมรมปัจจุบัน (Active)',
      value: summary.currentActiveMemberships.toLocaleString(),
      unit: 'รายการ',
      subtext: `รอบรับสมัครเปิดอยู่ ${summary.openRecruitmentRounds.toLocaleString()} รอบ`,
      icon: <Users aria-hidden="true" strokeWidth={1.75} className="size-5" />,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="flex items-start gap-4 rounded-2xl border border-[#EAE2D8] bg-white p-5 shadow-[0_1px_2px_rgba(37,32,42,0.03)]"
        >
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F2E7E5] text-[#861638]"
          >
            {card.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#59545B]">{card.label}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-[#25202A] tabular-nums sm:text-[28px]">
                {card.value}
              </span>
              <span className="text-xs font-medium text-[#59545B]">{card.unit}</span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-[#59545B]">{card.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
