import { apiRequest } from '../../../lib/api';
import type {
  ApplicantApplicationDetail,
  ApplicantApplicationPage,
  MembershipDecision,
  MembershipOfferResponse,
} from '../types/application';

export const MY_APPLICATIONS_PAGE_SIZE = 20;

export async function fetchMyApplications(
  page = 0,
  size = MY_APPLICATIONS_PAGE_SIZE,
): Promise<ApplicantApplicationPage> {
  return apiRequest<ApplicantApplicationPage>(
    `/api/v1/me/applications?page=${page}&size=${size}`,
  );
}

export async function fetchMyApplicationDetail(
  applicationId: string,
): Promise<ApplicantApplicationDetail> {
  return apiRequest<ApplicantApplicationDetail>(
    `/api/v1/me/applications/${encodeURIComponent(applicationId)}`,
  );
}

export async function respondToMembershipOffer(
  applicationId: string,
  decision: MembershipDecision,
): Promise<MembershipOfferResponse> {
  return apiRequest<MembershipOfferResponse>(
    `/api/v1/me/applications/${encodeURIComponent(applicationId)}/${decision}`,
    { method: 'POST' },
  );
}
