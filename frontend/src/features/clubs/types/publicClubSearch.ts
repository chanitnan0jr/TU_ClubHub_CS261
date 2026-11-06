export interface PublicClubSearchItem {
  id: string;
  name: string;
  description: string;
  affiliationLevel: string | null;
  affiliationName: string | null;
  imageUrl: string | null;
  category: { id: string; name: string };
  tags: { id: string; name: string }[];
  hasOpenRecruitment: boolean;
}

export interface PublicClubSearchPage {
  items: PublicClubSearchItem[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}
