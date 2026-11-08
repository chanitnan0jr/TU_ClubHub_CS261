import { useId, type ReactNode } from 'react';

interface SectionCardProps {
  /** Step number shown before the title, as in the committee form wireframe. */
  number?: number;
  title: string;
  description?: ReactNode;
  /** Secondary actions shown at the right of the header. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({ number, title, description, actions, className = '', children }: SectionCardProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={`rounded-xl border border-slate-200 bg-white ${className}`}>
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {number !== undefined && (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
            >
              {number}
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </header>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
