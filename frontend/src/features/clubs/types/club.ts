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

// Response of GET /api/v1/public/clubs/{id} (PublicClubProfileDto).
export interface PublicClubProfile {
  id: string;
  name: string;
  description: string;
  objectives: string | null;
  contactUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  contactEmail: string | null;
  affiliationLevel: string | null;
  affiliationName: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
}

// Response of GET /api/v1/public/clubs/{id}/recruitment-rounds.
export interface PublicOpenRound {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
}

export interface PublicOpenRoundPage {
  items: PublicOpenRound[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface RecruitmentRoundData {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
}

export interface ClubDetailData {
  id: string;
  name: string;
  category: string;
  description: string;
  objectives: string;
  tags: string[];
  imageUrl?: string;
  bannerUrl?: string;
  contacts: {
    website?: string;
    facebook?: string;
    instagram?: string;
    email?: string;
  };
  rounds: RecruitmentRoundData[];
  // True when the club loaded but its open rounds could not be fetched.
  roundsUnavailable: boolean;
}