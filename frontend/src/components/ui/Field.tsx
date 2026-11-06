import type { ReactNode } from 'react';
import { CircleAlertIcon } from './icons';

export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

interface FieldProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  /** Renders the control; spread the given props onto it so the label, hint and error are linked. */
  children: (control: FieldControlProps) => ReactNode;
}

/** A visible label above the control, an optional hint, and the error message under it. */
export function Field({ id, label, required = false, hint, error, className = '', children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700">
          <CircleAlertIcon className="mt-0.5 size-4" />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs leading-5 text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}
