export type Semester = 'SEMESTER_1' | 'SEMESTER_2' | 'SUMMER';

export interface ScreeningQuestionInput {
  id?: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
}

export interface RecruitmentRoundFormInput {
  title: string;
  academicYear: number | null;
  semester: Semester | '';
  capacity: number | null;
  isUnlimitedCapacity: boolean;
  description: string;
  openAt: string;
  closeAt: string;
  announcementDate: string;
  confirmationStartDate: string;
  confirmationEndDate: string;
  questions: ScreeningQuestionInput[];
}

export interface FormValidationError {
  title?: string;
  academicYear?: string;
  semester?: string;
  capacity?: string;
  description?: string;
  openAt?: string;
  closeAt?: string;
  announcementDate?: string;
  confirmationDates?: string;
  questions?: string;
  general?: string;
}