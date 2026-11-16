import { apiRequest } from '../../../lib/api';
import type {
  ApplicationDecisionRequest,
  BatchApplicationDecisionItem,
  CommitteeApplicationDetail,
  CommitteeApplicationPage,
  CommitteeApplicationStatus,
  CommitteeEvaluationDetail,
  PublishResultsResponse,
} from '../types/application';

export const COMMITTEE_APPLICATIONS_PAGE_SIZE = 20;

export function fetchCommitteeApplications(
  clubId: string,
  options: {
    roundId?: string;
    status?: CommitteeApplicationStatus;
    q?: string;
    page?: number;
  } = {},
): Promise<CommitteeApplicationPage> {
  const query = new URLSearchParams({
    page: String(options.page ?? 0),
    size: String(COMMITTEE_APPLICATIONS_PAGE_SIZE),
  });
  if (options.roundId) query.set('roundId', options.roundId);
  if (options.status) query.set('status', options.status);
  if (options.q?.trim()) query.set('q', options.q.trim());

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

export function fetchApplicationDecisionSnapshot(
  roundId: string,
  applicationId: string,
): Promise<CommitteeEvaluationDetail> {
  return apiRequest<CommitteeEvaluationDetail>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/decision`,
  );
}

export function recordApplicationDecision(
  roundId: string,
  applicationId: string,
  payload: ApplicationDecisionRequest,
): Promise<CommitteeEvaluationDetail> {
  return apiRequest<CommitteeEvaluationDetail>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/decision`,
    { method: 'PUT', body: payload },
  );
}

export function recordBatchApplicationDecisions(
  roundId: string,
  decisions: BatchApplicationDecisionItem[],
): Promise<{ items: CommitteeEvaluationDetail[] }> {
  return apiRequest<{ items: CommitteeEvaluationDetail[] }>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/application-decisions`,
    { method: 'PUT', body: { decisions } },
  );
}

export function publishRoundSelectionResults(
  roundId: string,
  version: number,
): Promise<PublishResultsResponse> {
  return apiRequest<PublishResultsResponse>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/publish-results`,
    { method: 'POST', body: { version } },
  );
}