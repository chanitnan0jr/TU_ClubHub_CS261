import type { ApplicationFormQuestion } from '../services/applicationService.ts';

export interface ApplicationLinkDraft {
  id: string;
  label: string;
  url: string;
}

export interface ApplicationFormData {
  motivation: string;
  answers: Record<string, string>;
  links: ApplicationLinkDraft[];
}

export interface ApplicationFormErrors {
  motivation?: string;
  answers?: Record<string, string>;
  links?: Record<string, { label?: string; url?: string }>;
}

export type { ApplicationFormQuestion };
