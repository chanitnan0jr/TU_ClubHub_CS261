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

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notice: string | null;
  loginSuccess: boolean;
  dismissLoginSuccess: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const isMockAuth = import.meta.env?.VITE_MOCK_AUTH === "true" || import.meta.env?.VITE_ENABLE_MOCK_AUTH === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
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
        if (isMockAuth) {
          const saved = sessionStorage.getItem("tu_test_user");
          if (saved && !cancelled) setUser(JSON.parse(saved));
          return;
        }
        const data = await apiRequest<{ user: User }>("/api/v1/auth/me", { notifyAuthFailure: false });
        if (!cancelled && version === authVersion.current) { resetAuthFailureNotification(); setUser(data.user); }
      } catch { if (!cancelled && version === authVersion.current) setUser(null); }
      finally { if (!cancelled) setIsLoading(false); }
    };
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string) => {
    const version = ++authVersion.current;
    setNotice(null);
    setLoginSuccess(false);
    try {
      if (isMockAuth) {
        const mockUser: User = { id: "mock-id-1", role: "STUDENT" };
        sessionStorage.setItem("tu_test_user", JSON.stringify(mockUser));
        resetAuthFailureNotification();
        setUser(mockUser);
        setLoginSuccess(true);
        return;
      }
      await apiRequest("/api/v1/auth/login", { method: "POST", body: { username, password } });
      if (version !== authVersion.current) throw new Error("Login superseded");
      // Subsequent writes fetch the fresh token from the current session through apiRequest.
      const data = await apiRequest<{ user: User }>("/api/v1/auth/me");
      if (version !== authVersion.current || !data?.user
          || typeof data.user.id !== "string" || !data.user.id.trim()
          || typeof data.user.role !== "string" || !data.user.role.trim()) {
        throw new Error("Authenticated session could not be loaded");
      }
      resetAuthFailureNotification();
      setUser(data.user);
      setLoginSuccess(true);
    } catch (error) {
      if (version === authVersion.current) { setUser(null); setLoginSuccess(false); }
      throw new Error(describeApiError(error, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    }
  };

  const logout = async () => {
    authVersion.current++;
    setNotice(null);
    setLoginSuccess(false);
    try {
      if (isMockAuth) sessionStorage.removeItem("tu_test_user");
      else await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
    } catch (error) {
      setNotice(describeApiError(error, "ไม่สามารถติดต่อระบบเพื่อออกจากระบบได้ กรุณาลองใหม่"));
    } finally { setUser(null); }
  };

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, notice,
    loginSuccess, dismissLoginSuccess: () => setLoginSuccess(false), login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
