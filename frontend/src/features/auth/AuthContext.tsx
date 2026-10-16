/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";

export type User = {
  id: string;
  role: "USER" | "STUDENT" | "CLUB_COMMITTEE" | "ADMIN" | string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isMockAuth =
  import.meta.env.VITE_MOCK_AUTH === "true" ||
  import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const csrfTokenRef = useRef<string>("");

  // ดึง CSRF Token เริ่มต้น
  const fetchCsrfToken = async () => {
    try {
      const res = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const token = data.token || data.csrfToken || "";
        if (token) {
          csrfTokenRef.current = token;
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (isMockAuth) {
          const testUser = sessionStorage.getItem("tu_test_user");
          if (testUser) {
            setUser(JSON.parse(testUser));
          }
          setIsLoading(false);
          return;
        }

        await fetchCsrfToken();

        const res = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          // รองรับทั้งแบบหุ้ม user: { ... } หรือส่งตรงๆ
          const userData = data.user || data;
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    if (isMockAuth) {
      const mockUser: User = {
        id: "mock-id-1",
        role: "STUDENT",
      };
      setUser(mockUser);
      sessionStorage.setItem("tu_test_user", JSON.stringify(mockUser));
      return;
    }

    if (!csrfTokenRef.current) {
      await fetchCsrfToken();
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (csrfTokenRef.current) {
      headers["X-CSRF-TOKEN"] = csrfTokenRef.current;
    }

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      let errorMsg = "เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบรหัสนักศึกษาหรือรหัสผ่าน";
      try {
        const errData = await response.json();
        // รองรับมาตรฐาน RFC 7807 Problem Details (detail / title / message)
        errorMsg = errData.detail || errData.title || errData.message || errorMsg;
      } catch {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    // อัปเดต CSRF Token ใหม่จาก Response Body หากมีส่งกลับมา (ตามสเปก PR #8)
    try {
      const responseData = await response.json().catch(() => ({}));
      if (responseData.csrf && responseData.csrf.token) {
        csrfTokenRef.current = responseData.csrf.token;
      }
    } catch {
      // Ignore parsing if empty
    }

    // ดึงข้อมูลผู้ใช้ต่อ
    const meResponse = await fetch("/api/v1/auth/me", {
      credentials: "include",
    });

    if (meResponse.ok) {
      const data = await meResponse.json();
      const userData = data.user || data;
      setUser(userData);
    } else {
      throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้หลังเข้าสู่ระบบ");
    }
  };

  const logout = async () => {
    if (isMockAuth) {
      setUser(null);
      sessionStorage.removeItem("tu_test_user");
      return;
    }

    try {
      if (!csrfTokenRef.current) {
        await fetchCsrfToken();
      }

      const headers: Record<string, string> = {};
      if (csrfTokenRef.current) {
        headers["X-CSRF-TOKEN"] = csrfTokenRef.current;
      }

      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers,
        credentials: "include",
      });

      // ตรวจสอบ Status ตามสเปก (204 No Content หรือ 401) ก่อนล้าง State
      if (response.status === 204 || response.status === 401 || response.ok) {
        setUser(null);
      } else {
        throw new Error("Server rejected logout");
      }
    } catch {
      // หากเกิดข้อผิดพลาดเครือข่าย แต่บังคับล้างเฉพาะเมื่อแน่ใจ หรือเคลียร์ client state
      setUser(null);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};