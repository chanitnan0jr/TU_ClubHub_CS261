import { useState } from 'react';
import { Image as LucideImage } from 'lucide-react';

interface ClubLogoProps {
  src?: string | null;
  clubName: string;
  /** Size of the icon in the placeholder. */
  iconClassName?: string;
}

/**
 * Club logo that fills its parent; shows the placeholder when there is no logo
 * or the image fails to load. The parent sets the size, so nothing shifts.
 */
export function ClubLogo({ src, clubName, iconClassName = 'size-8' }: ClubLogoProps) {
  // The URL that failed to load; a new URL gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={`โลโก้ ${clubName}`}
        onError={() => setFailedSrc(src)}
        className="size-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center rounded-lg bg-tu-maroon-50 text-tu-maroon">
      <LucideImage aria-hidden="true" strokeWidth={1.75} className={`shrink-0 ${iconClassName}`} />
    </div>
  );
}
