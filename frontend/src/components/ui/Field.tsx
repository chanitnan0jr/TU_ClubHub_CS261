import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

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
  hintAlign?: 'left' | 'right';
  error?: string | null;
  className?: string;
  /** Renders the control; spread the given props onto it so the label, hint and error are linked. */
  children: (control: FieldControlProps) => ReactNode;
}

/** A visible label above the control, an optional hint, and the error message under it. */
export function Field({
  id,
  label,
  required = false,
  hint,
  hintAlign = 'left',
  error,
  className = '',
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const errorNode = error && (
    <p id={errorId} className="flex items-start gap-1.5 text-sm text-red-700">
      <CircleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </p>
  );

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#25202A]">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hintAlign === 'right' ? (
        (error || hint) && (
          <div className="mt-1.5 flex items-start justify-between gap-3">
            {errorNode ?? <span />}
            {hint && (
              <p id={hintId} className="shrink-0 text-right text-xs text-[#706B70] tabular-nums">
                {hint}
              </p>
            )}
          </div>
        )
      ) : (
        <>
          {error && <div className="mt-1.5">{errorNode}</div>}
          {hint && (
            <p id={hintId} className="mt-1.5 text-xs leading-5 text-slate-600">
              {hint}
            </p>
          )}
        </>
      )}
    </div>
  );
}
