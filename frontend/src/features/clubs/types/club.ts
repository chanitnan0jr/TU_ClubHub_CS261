// frontend/src/features/clubs/types/club.ts

export interface ClubCategory {
  id: string;
  name: string;
}

export interface ClubTag {
  id: string;
  name: string;
}

export interface PublicRecruitmentRound {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
  closedAt: string | null;
}

export interface ClubResponseDto {
  id: string;
  categoryId: string;
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
  status: string;
  category: ClubCategory | null;
  tags: ClubTag[];
  recruitmentRounds: PublicRecruitmentRound[];
}

export interface ClubUpdateRequestDto {
  name: string;
  description: string;
  objectives?: string;
  contactUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  contactEmail?: string;
  imageUrl?: string;
  bannerUrl?: string;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiProblemResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  fieldErrors?: FieldError[];
  traceId: string;
}