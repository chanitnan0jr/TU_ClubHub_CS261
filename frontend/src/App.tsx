import { useAuth } from "./features/auth/AuthContext";
import Login from "./features/auth/Login";

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-bold text-red-700">ยินดีต้อนรับสู่ TU ClubHub</h1>
        <div className="text-left bg-gray-50 p-4 rounded-lg space-y-2 border">
          <p><strong>ID ผู้ใช้:</strong> {user.id}</p>
          <p><strong>สิทธิ์ (Role):</strong> {user.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}