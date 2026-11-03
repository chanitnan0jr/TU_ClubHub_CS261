import { apiRequest, describeApiError } from '../../../lib/api';
import type { PublicClubSearchPage } from '../types/publicClubSearch';

export interface ClubSearchFilters {
  query: string;
  categoryId: string;
  recruitmentOpen: boolean;
  page: number;
}

export async function searchPublicClubs(
  filters: ClubSearchFilters,
): Promise<PublicClubSearchPage> {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: '20',
    sort: 'name,asc',
  });
  const query = filters.query.trim();
  if (query) params.set('q', query);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.recruitmentOpen) params.set('recruitmentStatus', 'OPEN');

  try {
    return await apiRequest<PublicClubSearchPage>(`/api/v1/public/clubs?${params}`);
  } catch (error) {
    throw new Error(describeApiError(error, 'ไม่สามารถโหลดรายชื่อชมรมได้ กรุณาลองใหม่'));
  }
}
