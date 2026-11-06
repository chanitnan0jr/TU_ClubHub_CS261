import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page, which is always the last item. */
  to?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="เส้นทางนำทาง">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-2">
              {item.to && !isLast ? (
                <Link to={item.to} className="truncate rounded hover:text-tu-maroon hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={`truncate ${isLast ? 'font-medium text-slate-900' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
