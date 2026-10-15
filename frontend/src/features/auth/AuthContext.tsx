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

// รองรับทั้ง VITE_MOCK_AUTH และ VITE_ENABLE_MOCK_AUTH
const isMockAuth =
  import.meta.env.VITE_MOCK_AUTH === "true" ||
  import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    if (isMockAuth) {
      const mockUser: User = {
        id: "mock-1",
        studentId: username,
        name: "นักศึกษา ธรรมศาสตร์ (Test Mode)",
        email: `${username}@dome.tu.ac.th`,
        role: "STUDENT",
      };
      setUser(mockUser);
      sessionStorage.setItem("tu_test_user", JSON.stringify(mockUser));
      return;
    }

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
        // Ignore CSRF fetch error if managed by cookies
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
      let errorMsg = "เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบรหัสนักศึกษาหรือรหัสผ่าน";
      try {
        const errData = await response.json();
        if (errData.message) errorMsg = errData.message;
      } catch {
        // Fallback to default error message
      }
      throw new Error(errorMsg);
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
      // Clear client state anyway
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