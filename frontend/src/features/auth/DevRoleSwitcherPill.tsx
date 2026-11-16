import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth, type DevMockRole, type User } from "./AuthContext";

function resolveCurrentRole(user: User | null): DevMockRole | null {
  if (!user) return null;
  if (user.role === "ADMIN") return "ADMIN";
  const assignments = user.activeCommitteeAssignments ?? [];
  if (assignments.some((item) => item.permissionRole === "PRESIDENT")) return "PRESIDENT";
  if (assignments.some((item) => item.permissionRole === "COMMITTEE")) return "COMMITTEE";
  return "USER";
}

function landingPathFor(role: DevMockRole, switchedUser: User): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMMITTEE" || role === "PRESIDENT") {
    const assignments = switchedUser.activeCommitteeAssignments ?? [];
    if (assignments.length === 1) return `/clubs/${assignments[0].clubId}/manage`;
    if (assignments.length > 1) return "/dashboard";
  }
  return "/";
}

/** Floating pill for switching between the 4 mock accounts when DEV=true & TU_AUTH_MODE=mock. */
export default function DevRoleSwitcherPill() {
  const { user, devAccounts, switchDevAccount } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<DevMockRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (devAccounts.length === 0) return null;

  const activeRole = resolveCurrentRole(user);

  const handleSwitch = async (role: DevMockRole) => {
    if (switchingRole !== null) return;
    setError(null);
    setSwitchingRole(role);
    try {
      const switchedUser = await switchDevAccount(role);
      navigate(landingPathFor(role, switchedUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "สลับบัญชีไม่สำเร็จ");
    } finally {
      setSwitchingRole(null);
    }
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-[60]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="เปิดแถบสลับบทบาท Dev"
          className="inline-flex items-center gap-2 rounded-full border border-[#8B1E3F]/30 bg-[#231B17] px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#3B2E28]"
        >
          <span className="rounded-full bg-[#8B1E3F] px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
            DEV
          </span>
          <span>{activeRole ?? "GUEST"}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Dev Role Switcher"
      className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-1.5 rounded-2xl border border-[#DFD6CB] bg-white/95 p-2 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5A514A]">
          <span className="rounded-full bg-[#8B1E3F] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
            DEV
          </span>
          <span className="truncate">
            {user?.displayName ? `${user.displayName} (${activeRole})` : "ยังไม่ได้เข้าสู่ระบบ"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="ซ่อนแถบสลับบทบาท Dev"
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#7A6F67] transition hover:bg-[#F5EFE8] hover:text-[#231B17]"
        >
          ซ่อน
        </button>
      </div>

      <div
        role="group"
        aria-label="สลับบัญชีทดสอบ"
        className="flex flex-wrap items-center gap-1 rounded-full bg-[#F5EFE8] p-1"
      >
        {devAccounts.map((account) => {
          const isActive = activeRole === account.role;
          const isBusy = switchingRole === account.role;
          return (
            <button
              key={account.role}
              type="button"
              aria-pressed={isActive}
              disabled={switchingRole !== null}
              title={`${account.displayName} (${account.username}) - ${account.label}`}
              onClick={() => void handleSwitch(account.role)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-[#8B1E3F] text-white shadow-xs"
                  : "text-[#4A413B] hover:bg-white hover:text-[#8B1E3F]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isBusy ? `${account.role}...` : account.role}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 px-2 text-xs text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-semibold underline"
          >
            ปิด
          </button>
        </div>
      )}
    </aside>
  );
}
