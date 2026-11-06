import { useState } from 'react';
import { isValidUrl } from '../../utils/validation';
import { inputClass } from './classes';
import { Field } from './Field';
import { ImageIcon } from './icons';

interface ImageUrlFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** banner: 3:1 cover preview; avatar: round logo preview. */
  variant: 'banner' | 'avatar';
  hint?: string;
  error?: string | null;
  disabled?: boolean;
}

/** HTTPS image URL input with a live preview; shows a placeholder until the image loads. */
export function ImageUrlField({ id, label, value, onChange, variant, hint, error, disabled }: ImageUrlFieldProps) {
  // The URL that failed to load; a new URL gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = value.trim();
  const canPreview = isValidUrl(url) && url !== failedUrl;
  const placeholderText = !url
    ? 'ยังไม่มีรูป'
    : !isValidUrl(url)
      ? 'ต้องใช้ https://'
      : 'โหลดรูปไม่สำเร็จ';

  const previewClass =
    variant === 'banner'
      ? 'aspect-[3/1] w-full rounded-lg'
      : 'size-24 shrink-0 rounded-full';

  return (
    <div className={variant === 'avatar' ? 'flex flex-col gap-4 sm:flex-row sm:items-start' : 'flex flex-col gap-3'}>
      <div className={`overflow-hidden border border-slate-200 bg-slate-100 ${previewClass}`}>
        {canPreview ? (
          <img
            src={url}
            alt={`ตัวอย่าง${label}`}
            onError={() => setFailedUrl(url)}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-slate-600">
            <ImageIcon className={variant === 'banner' ? 'size-8' : 'size-6'} />
            <span className={variant === 'banner' ? 'text-sm' : 'text-xs leading-4'}>{placeholderText}</span>
          </div>
        )}
      </div>
      <Field id={id} label={label} hint={hint} error={error} className="min-w-0 flex-1">
        {(control) => (
          <input
            {...control}
            type="url"
            inputMode="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://"
            disabled={disabled}
            className={inputClass(Boolean(error))}
          />
        )}
      </Field>
    </div>
  );
}
