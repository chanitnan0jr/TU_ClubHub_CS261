import type { ClubResponseDto, ClubUpdateRequestDto } from '../types/club';
import { apiRequest, getCsrfHeaders } from '../../../lib/api';

// Retain the existing export; HTTP/security/error handling lives in the shared client.
export const getCsrfToken = async (): Promise<{ headerName: string; token: string }> => {
  const headers = await getCsrfHeaders();
  return { headerName: 'X-CSRF-TOKEN', token: headers['X-CSRF-TOKEN'] };
};

// The editor reads the public projection until a dedicated committee GET exists.
export const getClubProfile = (clubId: string): Promise<ClubResponseDto> =>
  apiRequest(`/api/v1/public/clubs/${encodeURIComponent(clubId)}`);

export const updateClubProfile = (clubId: string, data: ClubUpdateRequestDto): Promise<ClubResponseDto> =>
  apiRequest(`/api/v1/clubs/${encodeURIComponent(clubId)}`, { method: 'PUT', body: data });
