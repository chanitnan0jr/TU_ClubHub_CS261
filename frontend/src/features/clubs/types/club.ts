// ==========================================
// 1. Core Category & Tag Types
// ==========================================

export interface CategoryDto {
  id?: string;
  name?: string;
}

export type ClubCategory = CategoryDto & string;

export interface ClubTag {
  id: string;
  name?: string;
}

export interface FieldErrorDto {
  field: string;
  message: string;
}

export interface ApiProblemResponse {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  fieldErrors?: FieldErrorDto[];
}

// ==========================================
// 2. Club DTOs (แก้ instagramUrl & recruitmentRounds)
// ==========================================

export interface ClubResponseDto {
  id: string;
  name: string;
  status?: string | null;
  categoryId?: string;
  category?: CategoryDto | any;
  tagline?: string | null;
  description: string;
  objective?: string | null;
  objectives?: string | null;
  activities?: string[];
  announcementNote?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  contactUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl: string | null; // กำหนดบังคับเป็น string | null แน่นอน (ไม่มี undefined)
  contactEmail?: string | null;
  affiliationLevel?: string | null;
  affiliationName?: string | null;
  recruitmentRounds?: any[]; // เพิ่ม recruitmentRounds สำหรับ ClubProfilePreview
  tags: (ClubTag | any)[];
  contacts?: {
    facebook?: string;
    instagram?: string;
    email?: string;
  };
}

export interface ClubUpdateRequestDto {
  name: string;
  status?: string | null;
  categoryId?: string;
  category?: CategoryDto | any;
  tagline?: string | null;
  description: string;
  objective?: string | null;
  objectives?: string | null;
  activities?: string[];
  announcementNote?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  contactUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  contactEmail?: string | null;
  affiliationLevel?: string | null;
  affiliationName?: string | null;
  recruitmentRounds?: any[];
  tags?: (ClubTag | any)[];
  contacts?: {
    facebook?: string;
    instagram?: string;
    email?: string;
  };
}

export interface ClubProfileDraft extends Partial<ClubUpdateRequestDto> {
  name: string;
  description: string;
  instagramHandle?: string;
  tags?: (ClubTag | any)[];
  instagramUrl: string | null;
}

// ==========================================
// 3. Types สำหรับ Task36 (Club Detail & Recruitment)
// ==========================================

export interface RecruitmentRoundData {
  id?: string;
  title: string;
  term?: string;
  startDate?: string;
  endDate?: string;
  qualificationText?: string;
  qualification?: string;
  questionSummary?: string;
  isClosed?: boolean;
}

export interface ClubDetailData {
  id: string;
  name: string;
  category: string;
  tagline?: string;
  tags: string[];
  logoUrl?: string;
  coverImageUrl?: string;
  objective: string;
  activities: string[];
  announcementNote?: string;
  contacts: {
    facebook?: string;
    instagram?: string;
    email?: string;
  };
  activeRound?: RecruitmentRoundData;
}