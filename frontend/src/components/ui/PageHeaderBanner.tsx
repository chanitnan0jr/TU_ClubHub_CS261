import type { ReactNode, RefObject } from 'react';
import { ChevronRight } from 'lucide-react';
import { WIDE_CONTAINER_CLASS } from '../layout/PublicLayout';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

interface PageHeaderBannerProps {
  breadcrumbs: BreadcrumbItem[];
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  rightSlot?: ReactNode;
}

export function PageHeaderBanner({
  breadcrumbs,
  icon,
  title,
  subtitle,
  headingRef,
  rightSlot,
}: PageHeaderBannerProps) {
  return (
    <div className="relative overflow-hidden border-b border-[#EAE2D8] bg-[#FAF6F0]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 overflow-hidden lg:block"
      >
        <img
          src="/images/campus-etching.webp"
          alt=""
          decoding="async"
          className="h-full w-full object-cover object-right opacity-25 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6F0] via-[#FAF6F0]/60 to-[#861638]/75" />
      </div>

      <div className={`relative ${WIDE_CONTAINER_CLASS} py-6`}>
        <Breadcrumbs
          items={breadcrumbs}
          className="mb-3.5"
          listClassName="text-xs font-medium"
          separator={<ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 shrink-0 text-[#9A918B]" />}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {icon ? (
            <div className="flex items-start gap-4">
              {icon}
              <div className="min-w-0">
                <h1
                  ref={headingRef}
                  tabIndex={headingRef ? -1 : undefined}
                  className="scroll-mt-24 text-2xl font-extrabold tracking-tight text-[#25202A] focus:outline-none sm:text-[28px]"
                >
                  {title}
                </h1>
                {subtitle && <p className="mt-1 max-w-2xl text-sm text-[#59545B]">{subtitle}</p>}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-7 w-[3.5px] shrink-0 rounded-full bg-[#861638]" />
                <h1
                  ref={headingRef}
                  tabIndex={headingRef ? -1 : undefined}
                  className="scroll-mt-24 text-2xl font-extrabold tracking-tight text-[#25202A] focus:outline-none sm:text-[28px]"
                >
                  {title}
                </h1>
              </div>
              {subtitle && <p className="mt-1 pl-[15.5px] text-sm text-[#59545B]">{subtitle}</p>}
            </div>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
