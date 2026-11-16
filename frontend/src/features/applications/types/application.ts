export type ApplicantVisibleStatus =
  | 'SUBMITTED'
  | 'ACCEPTED_PENDING_CONFIRMATION'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export interface ApplicantClubSummary {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export interface ApplicantRoundSummary {
  id: string;
  title: string;
  academicYear: number;
  semester: number;
  opensAt: string;
  closesAt: string;
  resultsPublishedAt: string | null;
  confirmationDeadline: string | null;
}

export interface ApplicantApplicationSummary {
  id: string;
  club: ApplicantClubSummary;
  round: ApplicantRoundSummary;
  submittedAt: string;
  applicantVisibleStatus: ApplicantVisibleStatus;
  displayStatusLabel: string;
  canConfirm: boolean;
  canDecline: boolean;
  respondedAt: string | null;
}

export interface PageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApplicantApplicationPage {
  items: ApplicantApplicationSummary[];
  page: PageMeta;
}

export interface CommitteeQuestionAnswerView {
  questionId: string;
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
  answerText: string | null;
}

export interface ApplicantDocumentLinkView {
  label: string;
  url: string;
  displayOrder: number;
}

export interface ApplicantStatusHistoryEntry {
  status: ApplicantVisibleStatus;
  displayStatusLabel: string;
  occurredAt: string;
}

export interface ApplicantApplicationDetail extends ApplicantApplicationSummary {
  motivation: string;
  questionsWithAnswers: CommitteeQuestionAnswerView[];
  links: ApplicantDocumentLinkView[];
  resultMessage: string | null;
  statusHistory: ApplicantStatusHistoryEntry[];
}

export type ApplicationFilterTab =
  | 'ALL'
  | 'SUBMITTED'
  | 'ACCEPTED_PENDING_CONFIRMATION'
  | 'REJECTED'
  | 'CONFIRMED_DECLINED';

export type MembershipDecision = 'confirm' | 'decline';

export interface MembershipOfferResponse {
  applicationId: string;
  clubId: string;
  roundId: string;
  status: Extract<ApplicantVisibleStatus, 'CONFIRMED' | 'DECLINED'>;
  displayStatusLabel: string;
  respondedAt: string;
  membershipId: string | null;
  idempotentReplay: boolean;
}

export type CommitteeApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export interface CommitteeApplicant {
  userId: string;
  studentCode: string;
  displayName: string;
  email: string | null;
  facultyName: string | null;
  departmentName: string | null;
  programName: string | null;
  studyYear: number | null;
}

export interface CommitteeApplicationSummary {
  id: string;
  roundId: string;
  applicant: CommitteeApplicant;
  submittedAt: string;
  status: CommitteeApplicationStatus;
}

export interface CommitteeApplicationPage {
  items: CommitteeApplicationSummary[];
  page: PageMeta;
}

export interface CommitteeApplicationDetail extends CommitteeApplicationSummary {
  clubId: string;
  motivation: string;
  questionsWithAnswers: CommitteeQuestionAnswerView[];
  links: (ApplicantDocumentLinkView & { id: string; displayOrder: number })[];
}

export type SelectionDecisionChoice = 'ACCEPTED' | 'REJECTED';

export interface CommitteeReviewEntry {
  id: string;
  reviewerId: string;
  reviewerDisplayName: string;
  recommendation: 'ACCEPT' | 'REJECT' | 'DISCUSS';
  internalComment: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CommitteeStatusHistoryEntry {
  fromStatus: CommitteeApplicationStatus | null;
  toStatus: CommitteeApplicationStatus;
  actorId: string | null;
  reason: string | null;
  changedAt: string;
}

export interface CommitteeEvaluationDetail extends CommitteeApplicationDetail {
  resultMessage: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  respondedAt: string | null;
  version: number;
  reviews: CommitteeReviewEntry[];
  statusHistory: CommitteeStatusHistoryEntry[];
}

export interface ApplicationDecisionRequest {
  decision: SelectionDecisionChoice;
  resultMessage?: string | null;
  internalNote?: string | null;
  version: number;
}

export interface BatchApplicationDecisionItem extends ApplicationDecisionRequest {
  applicationId: string;
}

export interface PublishResultsResponse {
  roundId: string;
  clubId: string;
  resultsPublishedAt: string;
  confirmationDeadline: string;
  acceptedCount: number;
  rejectedCount: number;
  roundVersion: number;
}