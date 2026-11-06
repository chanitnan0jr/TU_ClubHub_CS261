import { Button } from './Button';
import { InfoIcon } from './icons';

interface StickySaveBarProps {
  /** True when the form has changes that are not saved yet. */
  dirty: boolean;
  saving?: boolean;
  onCancel: () => void;
  saveLabel?: string;
}

/** Bottom bar of an edit form. Place it inside the <form>: the save button submits it. */
export function StickySaveBar({ dirty, saving = false, onCancel, saveLabel = 'บันทึกข้อมูล' }: StickySaveBarProps) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-slate-700">
          {dirty && (
            <>
              <InfoIcon className="size-4 text-amber-700" />
              มีสิ่งที่ยังไม่ได้บันทึก
            </>
          )}
        </p>
        <div className="flex gap-3">
          <Button className="flex-1 sm:flex-none" onClick={onCancel} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" className="flex-1 sm:flex-none" loading={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
