import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleTuLogin = () => {
    setIsLoading(true);
    // จำลองการต่อ TU Authentication API
    setTimeout(() => {
      login({
        id: "1",
        studentId: "6809617001",
        name: "เขมจิรา แสนกล้า",
        email: "khemjira.sae@dome.tu.ac.th",
        role: "STUDENT",
      });
      setIsLoading(false);
      alert("เข้าสู่ระบบสำเร็จ!");
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-700">TU ClubHub</h1>
          <p className="mt-2 text-sm text-gray-500">
            ศูนย์รวมข้อมูลชมรม มหาวิทยาลัยธรรมศาสตร์
          </p>
        </div>

        <button
          onClick={handleTuLogin}
          disabled={isLoading}
          className="w-full px-4 py-3 font-semibold text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400"
        >
          {isLoading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย"}
        </button>

        <p className="text-xs text-center text-gray-400">
          *ต้องใช้บัญชี @dome.tu.ac.th ในการเข้าสู่ระบบ
        </p>
      </div>
    </div>
  );
}