import { useAuth, AuthProvider } from "./features/auth/AuthContext";
import Login from "./features/auth/Login";

function MainContent() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-4 text-center bg-white rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-green-600">เข้าสู่ระบบสำเร็จ!</h1>
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold text-gray-800">ชื่อ: {user?.name}</p>
          <p className="text-sm text-gray-600">รหัส: {user?.studentId}</p>
          <p className="text-sm text-gray-600">อีเมล: {user?.email}</p>
        </div>
        
        <button
          onClick={logout}
          className="w-full px-4 py-2 font-semibold text-white transition-colors bg-gray-800 rounded-lg hover:bg-gray-900"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;