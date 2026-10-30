import { apiRequest } from '../../../lib/api.ts';

export interface ApplicationFormQuestion {
  id: string;
  type: 'TEXT';
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
  maxLength: number;
}

export interface RoundApplicationForm {
  round: {
    id: string;
    clubId: string;
    title: string;
    description: string;
    eligibilityText: string | null;
    opensAt: string;
    closesAt: string;
  };
  questions: ApplicationFormQuestion[];
}

export interface SubmitApplicationPayload {
  motivation: string;
  answers: {
    questionId: string;
    answerText: string;
  }[];
  links: {
    label: string;
    url: string;
  }[];
}

export interface SubmitApplicationResponse {
  id: string;
  clubId: string;
  roundId: string;
  status: string;
  submittedAt: string;
}

export const fetchApplicationForm = (roundId: string) =>
  apiRequest<RoundApplicationForm>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/application-form`,
  );

export const submitApplicationAPI = (
  roundId: string,
  payload: SubmitApplicationPayload,
) =>
  apiRequest<SubmitApplicationResponse>(
    `/api/v1/rounds/${encodeURIComponent(roundId)}/applications`,
    { method: 'POST', body: payload },
  );
