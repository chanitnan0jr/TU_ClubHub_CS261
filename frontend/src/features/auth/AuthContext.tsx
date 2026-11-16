/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { apiRequest, describeApiError, resetAuthFailureNotification, subscribeAuthFailures } from "../../lib/api";

// ActiveCommitteeAssignmentSummary in docs/api/openapi.yaml.
export type ActiveCommitteeAssignment = {
  clubId: string;
  clubName: string;
  permissionRole: "COMMITTEE" | "PRESIDENT";
  positionName: string | null;
  startsAt: string;
  endsAt: string | null;
};

export type User = {
  id: string;
  role: "USER" | "STUDENT" | "CLUB_COMMITTEE" | "ADMIN" | string;
  displayName?: string | null;
  studentCode?: string | null;
  email?: string | null;
  facultyName?: string | null;
  studentStatus?: string | null;
  // Missing until /auth/me sends it; an empty list means no committee role.
  activeCommitteeAssignments?: ActiveCommitteeAssignment[];
};

export type DevMockRole = "USER" | "ADMIN" | "COMMITTEE" | "PRESIDENT";

export type DevAccount = {
  role: DevMockRole;
  username: string;
  displayName: string;
  label: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notice: string | null;
  loginSuccess: boolean;
  devAccounts: DevAccount[];
  dismissLoginSuccess: () => void;
  login: (username: string, password: string) => Promise<void>;
  switchDevAccount: (role: DevMockRole) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const defaultDevProbe = import.meta.env?.MODE !== undefined;

function assertValidUser(user: User | undefined | null): User {
  if (!user || typeof user.id !== "string" || !user.id.trim() || typeof user.role !== "string" || !user.role.trim()) {
    throw new Error("Authenticated session could not be loaded");
  }
  return user;
}

export const AuthProvider = ({
  children,
  devSwitcherProbe = defaultDevProbe,
}: {
  children: ReactNode;
  devSwitcherProbe?: boolean;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [devAccounts, setDevAccounts] = useState<DevAccount[]>([]);
  // An explicit login event only; never persisted or set by session restoration.
  const [loginSuccess, setLoginSuccess] = useState(false);
  const authVersion = useRef(0);

  useEffect(() => subscribeAuthFailures(failure => {
    authVersion.current++;
    setUser(null);
    setLoginSuccess(false);
    setNotice(failure === 'account-not-allowed'
      ? 'บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ'
      : 'เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบอีกครั้ง');
  }), []);

  useEffect(() => {
    let cancelled = false;
    const version = authVersion.current;
    const checkSession = async () => {
      try {
        const data = await apiRequest<{ user: User }>("/api/v1/auth/me", { notifyAuthFailure: false });
        if (!cancelled && version === authVersion.current) { resetAuthFailureNotification(); setUser(data.user); }
      } catch { if (!cancelled && version === authVersion.current) setUser(null); }
      finally { if (!cancelled) setIsLoading(false); }
    };
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!devSwitcherProbe) return;
    let cancelled = false;
    const loadDevAccounts = async () => {
      try {
        const res = await fetch("/api/v1/auth/dev/accounts", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { accounts?: DevAccount[] };
        if (!cancelled && Array.isArray(data.accounts)) {
          setDevAccounts(data.accounts);
        }
      } catch {
        // Keep the dev switcher hidden when the endpoint is unavailable.
      }
    };
    void loadDevAccounts();
    return () => { cancelled = true; };
  }, [devSwitcherProbe]);

  const login = async (username: string, password: string) => {
    const version = ++authVersion.current;
    setNotice(null);
    setLoginSuccess(false);
    try {
      await apiRequest("/api/v1/auth/login", { method: "POST", body: { username, password } });
      if (version !== authVersion.current) throw new Error("Login superseded");
      // Subsequent writes fetch the fresh token from the current session through apiRequest.
      const data = await apiRequest<{ user: User }>("/api/v1/auth/me");
      if (version !== authVersion.current) throw new Error("Login superseded");
      const validUser = assertValidUser(data?.user);
      resetAuthFailureNotification();
      setUser(validUser);
      setLoginSuccess(true);
    } catch (error) {
      if (version === authVersion.current) { setUser(null); setLoginSuccess(false); }
      throw new Error(describeApiError(error, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    }
  };

  const switchDevAccount = async (role: DevMockRole): Promise<User> => {
    const version = ++authVersion.current;
    setNotice(null);
    setLoginSuccess(false);
    try {
      const data = await apiRequest<{ user: User }>("/api/v1/auth/dev/switch", {
        method: "POST",
        body: { role },
      });
      if (version !== authVersion.current) throw new Error("Login superseded");
      const validUser = assertValidUser(data?.user);
      resetAuthFailureNotification();
      setUser(validUser);
      return validUser;
    } catch (error) {
      throw new Error(describeApiError(error, "สลับบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    }
  };

  const logout = async () => {
    authVersion.current++;
    setNotice(null);
    setLoginSuccess(false);
    try {
      await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
    } catch (error) {
      setNotice(describeApiError(error, "ไม่สามารถติดต่อระบบเพื่อออกจากระบบได้ กรุณาลองใหม่"));
    } finally { setUser(null); }
  };

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, notice,
    loginSuccess, devAccounts, dismissLoginSuccess: () => setLoginSuccess(false), login, switchDevAccount, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
