import { matchPath, useLocation } from "react-router";
import { Button } from "../../components/ui/Button";
import { CircleCheck, X } from "lucide-react";
import { useAuth } from "./AuthContext";

/** Stays mounted across routes; only a fresh, fully loaded login can populate it. */
export default function LoginSuccessNotice() {
  const { isAuthenticated, loginSuccess, dismissLoginSuccess } = useAuth();
  const location = useLocation();
  const visible = isAuthenticated && loginSuccess && !matchPath("/login", location.pathname);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {visible && (
        <div className="fixed left-4 right-4 top-5 z-50 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-lg sm:left-auto sm:right-5 sm:max-w-md">
          <CircleCheck aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0" />
          <span>เข้าสู่ระบบสำเร็จ</span>
          <Button variant="ghost" size="icon" onClick={dismissLoginSuccess} aria-label="ปิดข้อความเข้าสู่ระบบสำเร็จ">
            <X aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          </Button>
        </div>
      )}
    </div>
  );
}
