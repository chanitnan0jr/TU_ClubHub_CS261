/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type User = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: "STUDENT" | "CLUB_COMMITTEE" | "ADMIN";
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ตรวจสอบโหมดทดสอบเฉพาะเครื่อง (Local Mock Gate)
const isMockAuth = import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ตรวจสอบ Session กับ Backend API เมื่อเปิดหรือรีเฟรชหน้าเว็บ
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (isMockAuth) {
          const testUser = sessionStorage.getItem("tu_test_user");
          if (testUser) {
            setUser(JSON.parse(testUser));
          }
          return;
        }

        const res = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const userData = await res.json();
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
    // 1. กรณีเปิดใช้งาน Gated Mock สำหรับ Local Test
    if (isMockAuth) {
      const mockUser: User = {
        id: "mock-1",
        studentId: username,
        name: "เขมจิรา แสนกล้า (Local Test)",
        email: `${username}@dome.tu.ac.th`,
        role: "STUDENT",
      };
      setUser(mockUser);
      sessionStorage.setItem("tu_test_user", JSON.stringify(mockUser));
      return;
    }

    // 2. เรียกใช้งาน API ตามสถาปัตยกรรม Backend
    let csrfToken = "";
    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
      csrfToken = decodeURIComponent(cookieMatch[1]);
    } else {
      try {
        const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
        if (csrfRes.ok) {
          const data = await csrfRes.json();
          csrfToken = data.token || data.csrfToken || "";
        }
      } catch {
        // ข้ามหาก Backend ส่งเฉพาะ HTTP Cookie
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (csrfToken) {
      headers["X-CSRF-TOKEN"] = csrfToken;
    }

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบรหัสนักศึกษาหรือรหัสผ่าน");
    }

    const meResponse = await fetch("/api/v1/auth/me", {
      credentials: "include",
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();
      setUser(userData);
    } else {
      throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }
  };

  const logout = async () => {
    if (isMockAuth) {
      setUser(null);
      sessionStorage.removeItem("tu_test_user");
      return;
    }

    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ดำเนินการล้างสถานะหน้าบ้านต่อ
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