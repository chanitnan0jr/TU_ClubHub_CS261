// PublicOpenCall and PublicOpenCallPage in docs/api/openapi.yaml.
export interface PublicOpenCall {
  id: string;
  name: string;
  // Round details and qualifications; plain text that may contain line breaks.
  description: string;
  opensAt: string;
  closesAt: string;
  resultsScheduledAt: string | null;
  club: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: { id: string; name: string };
  };
}

export interface PublicOpenCallPage {
  items: PublicOpenCall[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}
