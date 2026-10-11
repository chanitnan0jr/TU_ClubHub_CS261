import { createContext, useContext, useState, ReactNode } from "react";

// กำหนดประเภทข้อมูลของผู้ใช้ตามที่ Proposal ระบุ
type User = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: "STUDENT" | "CLUB_COMMITTEE" | "ADMIN";
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    setUser(userData);
    // ในระบบจริง Backend จะจัดการ Session ให้ แต่เบื้องต้นเราอาจเก็บ flag ไว้ใน localStorage เพื่อเช็ก state เบื้องต้น
    localStorage.setItem("isAuthenticated", "true"); 
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    // TODO: เรียก API Logout เพื่อทำลาย Session ที่ฝั่ง Backend ด้วย
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};