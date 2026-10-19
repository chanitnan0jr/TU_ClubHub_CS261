export interface ScreeningQuestion {
  id: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
}

export interface ApplicationFormData {
  reason: string;
  answers: Record<string, string>;
  documentTitle: string;
  documentUrl: string;
}

export interface ApplicationFormError {
  reason?: string;
  answers?: Record<string, string>;
  documentUrl?: string;
}

export type ApplicationStep = 'form' | 'review' | 'success' | 'already_applied' | 'closed';