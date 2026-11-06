import type { Round } from '../api/roundApi.ts';
import type { RecruitmentRoundFormInput, Semester } from '../types/recruitment';

// RoundWrite in docs/api/rounds.openapi.yaml. Instants are ISO 8601 UTC.
export interface RoundWriteRequest {
  title: string;
  academicYear: number;
  semester: number;
  description: string;
  // The form has no eligibility field; an edit keeps the round's current value.
  eligibilityText: string | null;
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

const SEMESTER_BY_NUMBER: Record<number, Semester> = { 1: 'SEMESTER_1', 2: 'SEMESTER_2', 3: 'SUMMER' };

const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// datetime-local value in the same local time zone toInstant reads. Seconds are
// kept when present (e.g. 23:59:59), so saving an untouched form changes nothing.
const toLocalDateTime = (instant: string) => {
  const date = new Date(instant);
  const seconds = date.getSeconds() ? `:${pad(date.getSeconds())}` : '';
  return `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}${seconds}`;
};

type RoundFormSource = Pick<
  Round,
  | 'title' | 'academicYear' | 'semester' | 'description' | 'opensAt' | 'closesAt'
  | 'confirmationDeadline' | 'resultsScheduledAt' | 'questions'
>;

/**
 * Maps a saved round back to form values, the reverse of toRoundWriteRequest:
 * instants become local date-times, and the two date-only fields take their
 * local calendar day.
 */
export const toRoundFormInput = (round: RoundFormSource): RecruitmentRoundFormInput => ({
  title: round.title,
  academicYear: round.academicYear,
  semester: SEMESTER_BY_NUMBER[round.semester] ?? '',
  description: round.description,
  openAt: toLocalDateTime(round.opensAt),
  closeAt: toLocalDateTime(round.closesAt),
  announcementDate: round.resultsScheduledAt ? localDate(new Date(round.resultsScheduledAt)) : '',
  confirmationDeadline: localDate(new Date(round.confirmationDeadline)),
  questions: [...round.questions]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((question, orderIndex) => ({
      id: question.id,
      questionText: question.prompt,
      isRequired: question.required,
      orderIndex,
    })),
});
