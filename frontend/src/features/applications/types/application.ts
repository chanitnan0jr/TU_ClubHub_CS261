// 1. Backend DTO Status
export type BackendApplicationStatus =
  | 'PENDING'
  | 'INTERVIEW'
  | 'PASSED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'DECLINED';

// 2. Data Structure ที่ส่งมาจาก Backend API (/api/v1/applications/my)
export interface ApplicationResponseDto {
  id: string;
  clubId: string;
  clubName: string;
  clubLogoUrl?: string;
  roundId: string;
  roundTitle: string;
  academicYear: number;
  semester: number;
  submittedAt: string;
  reason: string;
  portfolioUrl?: string;
  status: BackendApplicationStatus;
  note?: string;
  reviewDate?: string;
  interviewDate?: string;
  interviewLocation?: string;
  interviewNote?: string;
  confirmationDeadline?: string;
}

// 3. UI Status Filtering Type
export type ApplicationFilterTab =
  | 'ALL'
  | 'PENDING'
  | 'INTERVIEW'
  | 'PASSED'
  | 'REJECTED'
  | 'CONFIRMED_DECLINED';

// 4. Data Structure สำหรับใช้แสดงผลในการ์ดบน UI
export interface ApplicationUIItem {
  id: string;
  clubId: string;
  clubName: string;
  clubLogoUrl?: string;
  roundTitle: string;
  academicYearTerm: string;
  submittedAtFormatted: string;
  reason: string;
  portfolioName?: string;
  portfolioUrl?: string;
  status: BackendApplicationStatus;
  note?: string;
  interviewDateFormatted?: string;
  interviewLocation?: string;
  interviewNote?: string;
  confirmationDeadlineFormatted?: string;
  remainingTimeText?: string;
}

// 5. Summary Stats Data
export interface ApplicationSummaryStats {
  totalCount: number;
  pendingCount: number;
  passedCount: number;
  confirmedCount: number;
  maxMembershipLimit: number;
  currentMembershipCount: number;
}