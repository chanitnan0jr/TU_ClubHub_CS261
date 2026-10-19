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