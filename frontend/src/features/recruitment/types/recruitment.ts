export type Semester = 'SEMESTER_1' | 'SEMESTER_2' | 'SUMMER';

export interface ScreeningQuestionInput {
  id?: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
}

// Rounds have no seat capacity, and confirmation needs only its last day
// (RoundWrite in docs/api/rounds.openapi.yaml).
export interface RecruitmentRoundFormInput {
  title: string;
  academicYear: number | null;
  semester: Semester | '';
  description: string;
  openAt: string;
  closeAt: string;
  announcementDate: string;
  confirmationDeadline: string;
  questions: ScreeningQuestionInput[];
}

export interface FormValidationError {
  title?: string;
  academicYear?: string;
  semester?: string;
  description?: string;
  openAt?: string;
  closeAt?: string;
  announcementDate?: string;
  confirmationDeadline?: string;
  questions?: string;
  general?: string;
}
