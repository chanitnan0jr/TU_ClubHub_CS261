import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page, which is always the last item. */
  to?: string;
}

export function Breadcrumbs({
  items,
  separator = <span aria-hidden="true" className="text-slate-400">/</span>,
  className,
  listClassName = 'text-sm',
}: {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
  listClassName?: string;
}) {
  return (
    <nav aria-label="เส้นทางนำทาง" className={className}>
      <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[#706B70] ${listClassName}`}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-2">
              {item.to && !isLast ? (
                <Link to={item.to} className="truncate rounded transition-colors hover:text-[#861638] hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={`truncate ${isLast ? 'font-semibold text-[#25202A]' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && separator}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
