/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { apiRequest, describeApiError, resetAuthFailureNotification, subscribeAuthFailures } from "../../lib/api";

export type User = {
  id: string;
  role: "USER" | "STUDENT" | "CLUB_COMMITTEE" | "ADMIN" | string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notice: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const isMockAuth = import.meta.env?.VITE_MOCK_AUTH === "true" || import.meta.env?.VITE_ENABLE_MOCK_AUTH === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const authVersion = useRef(0);

  useEffect(() => subscribeAuthFailures(failure => {
    authVersion.current++;
    setUser(null);
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
    authVersion.current++;
    setNotice(null);
    if (isMockAuth) {
      const mockUser: User = { id: "mock-id-1", role: "STUDENT" };
      setUser(mockUser);
      sessionStorage.setItem("tu_test_user", JSON.stringify(mockUser));
      resetAuthFailureNotification();
      return;
    }
    try {
      await apiRequest("/api/v1/auth/login", { method: "POST", body: { username, password } });
      // Subsequent writes fetch the fresh token from the current session through apiRequest.
      const data = await apiRequest<{ user: User }>("/api/v1/auth/me");
      resetAuthFailureNotification();
      setUser(data.user);
    } catch (error) { throw new Error(describeApiError(error, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")); }
  };

  const logout = async () => {
    authVersion.current++;
    setNotice(null);
    try {
      if (isMockAuth) sessionStorage.removeItem("tu_test_user");
      else await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
    } catch (error) {
      setNotice(describeApiError(error, "ไม่สามารถติดต่อระบบเพื่อออกจากระบบได้ กรุณาลองใหม่"));
    } finally { setUser(null); }
  };

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, notice, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
