import { Building2, GraduationCap, Mail, User as UserIcon } from 'lucide-react';
import { maskStudentCode } from '../../../lib/format';
import type { User } from '../../auth/AuthContext';

/** Shared 4-column applicant identity strip used on both application form and detail views. */
export function ApplicantIdentityGrid({
  user,
  emptyText = '-',
  iconBgClass = 'bg-[#FAF0F2]',
  className = '',
}: {
  user: User | null;
  emptyText?: string;
  iconBgClass?: string;
  className?: string;
}) {
  const fields = [
    { label: 'ชื่อ-นามสกุล', value: user?.displayName, Icon: UserIcon },
    {
      label: 'รหัสนักศึกษา',
      value: user?.studentCode?.trim() ? maskStudentCode(user.studentCode) : null,
      Icon: GraduationCap,
    },
    { label: 'อีเมลนักศึกษา', value: user?.email, Icon: Mail },
    { label: 'คณะ', value: user?.facultyName, Icon: Building2 },
  ];

  return (
    <dl
      className={`grid grid-cols-1 divide-y divide-[#EAE2D8] overflow-hidden rounded-2xl border border-[#E5DDD2] bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x ${className}`}
    >
      {fields.map(({ label, value, Icon }) => {
        const display = value?.trim();
        return (
          <div key={label} className="flex items-start gap-3 p-4">
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-[#861638] ${iconBgClass}`}
            >
              <Icon strokeWidth={1.75} className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-[#59545B]">{label}</dt>
              <dd
                className={`mt-0.5 min-w-0 break-words text-sm ${
                  display ? 'font-semibold text-[#25202A]' : 'text-[#59545B]'
                }`}
              >
                {display || emptyText}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
