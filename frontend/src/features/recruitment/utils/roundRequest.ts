import type { RecruitmentRoundFormInput, Semester } from '../types/recruitment';

// RoundWrite in docs/api/rounds.openapi.yaml. Instants are ISO 8601 UTC.
export interface RoundWriteRequest {
  title: string;
  academicYear: number;
  semester: number;
  description: string;
  eligibilityText: null;
  opensAt: string;
  closesAt: string;
  confirmationDeadline: string;
  resultsScheduledAt: string | null;
  questions: {
    prompt: string;
    required: boolean;
    displayOrder: number;
    maxLength: number;
  }[];
}

const SEMESTER_NUMBER: Record<Semester, number> = {
  SEMESTER_1: 1,
  SEMESTER_2: 2,
  SUMMER: 3,
};

// The question editor has no length setting; 2000 matches the database default.
const QUESTION_MAX_LENGTH = 2000;

// Form values are local (Thai) times without an offset.
const toInstant = (localDateTime: string) => new Date(localDateTime).toISOString();

/**
 * Maps a validated form to the create request. The results date starts its day
 * and the confirmation deadline ends its day, in local time.
 */
export const toRoundWriteRequest = (input: RecruitmentRoundFormInput): RoundWriteRequest => ({
  title: input.title.trim(),
  academicYear: input.academicYear as number,
  semester: SEMESTER_NUMBER[input.semester as Semester],
  description: input.description.trim(),
  eligibilityText: null,
  opensAt: toInstant(input.openAt),
  closesAt: toInstant(input.closeAt),
  confirmationDeadline: toInstant(`${input.confirmationDeadline}T23:59:59`),
  resultsScheduledAt: input.announcementDate ? toInstant(`${input.announcementDate}T00:00`) : null,
  questions: input.questions.map((question, index) => ({
    prompt: question.questionText.trim(),
    required: question.isRequired,
    displayOrder: index + 1,
    maxLength: QUESTION_MAX_LENGTH,
  })),
});
