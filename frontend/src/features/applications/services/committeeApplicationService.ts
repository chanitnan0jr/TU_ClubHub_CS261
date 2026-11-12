import { apiRequest } from '../../../lib/api';
import type {
  CommitteeApplicationDetail,
  CommitteeApplicationPage,
  CommitteeApplicationStatus,
} from '../types/application';

export const COMMITTEE_APPLICATIONS_PAGE_SIZE = 20;

export function fetchCommitteeApplications(
  clubId: string,
  options: {
    status?: CommitteeApplicationStatus;
    page?: number;
  } = {},
): Promise<CommitteeApplicationPage> {
  const query = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(COMMITTEE_APPLICATIONS_PAGE_SIZE),
  });
  if (options.status) query.set('status', options.status);

  return apiRequest<CommitteeApplicationPage>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/applications?${query.toString()}`,
  );
}

export function fetchCommitteeApplicationDetail(
  clubId: string,
  applicationId: string,
): Promise<CommitteeApplicationDetail> {
  return apiRequest<CommitteeApplicationDetail>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/applications/${encodeURIComponent(applicationId)}`,
  );
}
