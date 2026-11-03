export interface StatusBreakdown {
  SUBMITTED: number;
  UNDER_REVIEW: number;
  ACCEPTED: number;
  REJECTED: number;
  CONFIRMED: number;
  DECLINED: number;
  WITHDRAWN: number;
  EXPIRED: number;
}

export interface AdminDashboardSummaryMetrics {
  totalClubs: number;
  activeClubs: number;
  inactiveClubs: number;
  clubsCurrentlyRecruiting: number;
  totalRecruitmentRounds: number;
  openRecruitmentRounds: number;
  totalApplications: number;
  uniqueApplicants: number;
  confirmedNewMembers: number;
  currentActiveMemberships: number;
  confirmationRatePercent: number;
  statusBreakdown: StatusBreakdown;
}

export interface AdminCategoryStatsItem {
  categoryId: string;
  categoryName: string;
  clubCount: number;
  totalRounds: number;
  totalApplications: number;
  acceptedCount: number;
  confirmedCount: number;
  activeMemberCount: number;
}

export interface AdminTopClubItem {
  clubId: string;
  clubName: string;
  categoryName: string;
  totalApplications: number;
  acceptedCount: number;
  confirmedCount: number;
  activeMemberCount: number;
}

export interface AdminClubStatsItem {
  clubId: string;
  clubName: string;
  category: {
    id: string;
    name: string;
  };
  clubStatus: 'ACTIVE' | 'INACTIVE';
  hasOpenRecruitment: boolean;
  roundCount: number;
  totalApplications: number;
  submittedCount: number;
  underReviewCount: number;
  acceptedCount: number;
  rejectedCount: number;
  confirmedCount: number;
  declinedCount: number;
  withdrawnCount: number;
  expiredCount: number;
  activeMemberCount: number;
}

export interface AdminDashboardStatsResponse {
  generatedAt: string;
  filters: {
    academicYear: number | null;
    semester: number | null;
    categoryId: string | null;
    clubStatus: string;
  };
  summary: AdminDashboardSummaryMetrics;
  categoryBreakdown: AdminCategoryStatsItem[];
  topClubs: AdminTopClubItem[];
  clubs: {
    items: AdminClubStatsItem[];
    page: {
      number: number;
      size: number;
      totalElements: number;
      totalPages: number;
    };
  };
}

export interface ClubCategoryOption {
  id: string;
  name: string;
}