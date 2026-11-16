import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { CircleAlertIcon } from '../../../components/ui/icons';
import { describeApiError } from '../../../lib/api';
import { formatThaiDateTime } from '../../../lib/format';
import type { Round } from '../../recruitment/api/roundApi';
import { publishRoundSelectionResults } from '../services/committeeApplicationService';
import type { PublishResultsResponse } from '../types/application';

interface PublishResultsModalProps {
  open: boolean;
  round: Round;
  acceptedCount?: number;
  rejectedCount?: number;
  undecidedCount?: number;
  onClose: () => void;
  onPublished: (result: PublishResultsResponse) => void;
}

export function PublishResultsModal({
  open,
  round,
  acceptedCount,
  rejectedCount,
  undecidedCount,
  onClose,
  onPublished,
}: PublishResultsModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [open, round.id, round.version]);

  if (!open) return null;

  const hasUndecided = typeof undecidedCount === 'number' && undecidedCount > 0;

  const handleConfirmPublish = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const response = await publishRoundSelectionResults(round.id, round.version);
      onPublished(response);
      onClose();
    } catch (error) {
      setErrorMessage(
        describeApiError(
          error,
          'ไม่สามารถประกาศผลการคัดเลือกได้ กรุณาตรวจสอบว่าปิดรับสมัครและพิจารณาใบสมัครครบทุกรายการแล้ว',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-results-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <CircleAlertIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="publish-results-modal-title" className="text-lg font-semibold text-slate-900">
              ยืนยันการประกาศผลการคัดเลือก
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              รอบรับสมัคร: <span className="font-medium text-slate-900">{round.title}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">คำเตือนสำคัญ: การประกาศผลไม่สามารถยกเลิกหรือแก้ไขย้อนหลังได้</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
            <li>ผู้สมัครทุกคนในรอบนี้จะเห็นผลการคัดเลือกและข้อความแจ้งผลทันที</li>
            <li>ระบบจะส่งการแจ้งเตือนผลการคัดเลือกไปยังผู้สมัครโดยอัตโนมัติ</li>
            <li>
              ผู้ผ่านการคัดเลือกต้องยืนยันสิทธิ์ภายในวันที่{' '}
              <span className="font-semibold">
                {formatThaiDateTime(round.confirmationDeadline) || round.confirmationDeadline}
              </span>
            </li>
          </ul>
        </div>

        {(typeof acceptedCount === 'number' || typeof rejectedCount === 'number') && (
          <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div>
              <dt className="text-xs text-slate-600">ผ่านการคัดเลือก</dt>
              <dd className="mt-0.5 text-base font-semibold text-emerald-700">
                {(acceptedCount ?? 0).toLocaleString('th-TH')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">ไม่ผ่านการคัดเลือก</dt>
              <dd className="mt-0.5 text-base font-semibold text-rose-700">
                {(rejectedCount ?? 0).toLocaleString('th-TH')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">ยังไม่พิจารณา</dt>
              <dd className={`mt-0.5 text-base font-semibold ${hasUndecided ? 'text-amber-700' : 'text-slate-900'}`}>
                {(undecidedCount ?? 0).toLocaleString('th-TH')}
              </dd>
            </div>
          </dl>
        )}

        {hasUndecided && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            ยังมีใบสมัครที่รอพิจารณาอยู่ {undecidedCount} รายการ กรุณาประเมินผลให้ครบทุกรายการก่อนประกาศผล
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {errorMessage}
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-slate-300 text-tu-maroon focus:ring-tu-maroon"
            checked={confirmed}
            disabled={isSubmitting || hasUndecided}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            ข้าพเจ้าได้ตรวจสอบผลการคัดเลือกเรียบร้อยแล้ว และยืนยันที่จะประกาศผลให้ผู้สมัครทราบ
          </span>
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!confirmed || isSubmitting || hasUndecided}
            onClick={() => void handleConfirmPublish()}
          >
            {isSubmitting ? 'กำลังประกาศผล...' : 'ยืนยันประกาศผลการคัดเลือก'}
          </Button>
        </div>
      </div>
    </div>
  );
}