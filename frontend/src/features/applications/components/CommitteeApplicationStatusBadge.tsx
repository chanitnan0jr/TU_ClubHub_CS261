import type { CommitteeApplicationStatus } from '../types/application';
import { COMMITTEE_APPLICATION_STATUS_PRESENTATION } from './committeeApplicationStatus';

export function CommitteeApplicationStatusBadge({
  status,
}: {
  status: CommitteeApplicationStatus;
}) {
  const presentation = COMMITTEE_APPLICATION_STATUS_PRESENTATION[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}
