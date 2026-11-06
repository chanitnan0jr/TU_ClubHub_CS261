import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Buttons or links that help the user move on. */
  action?: ReactNode;
  /** Use 1 when the empty state is the whole page. */
  headingLevel?: 1 | 2 | 3;
}

export function EmptyState({ icon, title, description, action, headingLevel = 3 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          {icon}
        </span>
      )}
      <Heading className="text-base font-semibold text-slate-900">{title}</Heading>
      {description && <p className="max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
