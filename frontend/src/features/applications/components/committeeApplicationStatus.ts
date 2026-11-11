import type { CommitteeApplicationStatus } from '../types/application';

export const COMMITTEE_APPLICATION_STATUS_PRESENTATION: Record<
  CommitteeApplicationStatus,
  { label: string; className: string }
> = {
  SUBMITTED: { label: 'รอพิจารณา', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  UNDER_REVIEW: { label: 'กำลังพิจารณา', className: 'bg-tu-maroon-50 text-tu-maroon ring-tu-maroon-100' },
  ACCEPTED: { label: 'ผ่านการคัดเลือก', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REJECTED: { label: 'ไม่ผ่านการคัดเลือก', className: 'bg-red-50 text-red-800 ring-red-200' },
  CONFIRMED: { label: 'ยืนยันสิทธิ์แล้ว', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DECLINED: { label: 'สละสิทธิ์แล้ว', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  WITHDRAWN: { label: 'ถอนใบสมัคร', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  EXPIRED: { label: 'หมดเขตยืนยันสิทธิ์', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export const COMMITTEE_APPLICATION_STATUS_OPTIONS: {
  value: CommitteeApplicationStatus;
  label: string;
}[] = Object.entries(COMMITTEE_APPLICATION_STATUS_PRESENTATION).map(([value, presentation]) => ({
  value: value as CommitteeApplicationStatus,
  label: presentation.label,
}));

export function isCommitteeApplicationStatus(
  value: string | null,
): value is CommitteeApplicationStatus {
  return COMMITTEE_APPLICATION_STATUS_OPTIONS.some((option) => option.value === value);
}
