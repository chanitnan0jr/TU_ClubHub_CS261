import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import LoadingScreen from "../app/LoadingScreen";
import { useAuth } from "../features/auth/AuthContext";
import Login from "../features/auth/Login";
import { isValidId } from "../lib/ids";

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm shadow-sm";
const linkButtonClass =
  "rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent";

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [clubId, setClubId] = useState("");
  const [roundId, setRoundId] = useState("");

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated || !user) return <Login />;

  const clubOk = isValidId(clubId);
  const roundOk = isValidId(roundId);

  const handleSubmit = (e: FormEvent) => e.preventDefault();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-bold text-red-700">ยินดีต้อนรับสู่ TU ClubHub</h1>
        <div className="text-left bg-gray-50 p-4 rounded-lg space-y-2 border">
          <p><strong>ID ผู้ใช้:</strong> {user.id}</p>
          <p><strong>สิทธิ์ (Role):</strong> {user.role}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <h2 className="text-sm font-bold text-gray-800">ไปยังหน้าของชมรม</h2>
          <p className="text-xs text-gray-500">
            ระบบยังไม่มีรายการชมรมและรอบของคุณ จึงต้องระบุรหัส (ตัวเลข) เอง
          </p>

          <div>
            <label htmlFor="home-club-id" className="block text-xs font-medium text-gray-700">
              รหัสชมรม
            </label>
            <input
              id="home-club-id"
              inputMode="numeric"
              value={clubId}
              onChange={(e) => setClubId(e.target.value.trim())}
              placeholder="เช่น 20001"
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!clubOk}
              onClick={() => navigate(`/clubs/${clubId}`)}
              className={linkButtonClass}
            >
              ดูหน้าชมรม
            </button>
            <button
              type="button"
              disabled={!clubOk}
              onClick={() => navigate(`/clubs/${clubId}/edit`)}
              className={linkButtonClass}
            >
              แก้ไขโปรไฟล์ชมรม
            </button>
          </div>

          <div>
            <label htmlFor="home-round-id" className="block text-xs font-medium text-gray-700">
              รหัสรอบรับสมัคร
            </label>
            <input
              id="home-round-id"
              inputMode="numeric"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value.trim())}
              placeholder="เช่น 10"
              className={inputClass}
            />
          </div>

          <button
            type="button"
            disabled={!clubOk || !roundOk}
            onClick={() => navigate(`/clubs/${clubId}/rounds/${roundId}/questions`)}
            className={linkButtonClass}
          >
            จัดการคำถามคัดเลือก
          </button>

          <p className="text-xs text-gray-500">
            หน้าแก้ไขโปรไฟล์และจัดการคำถามใช้ได้เฉพาะกรรมการของชมรมนั้น
          </p>
        </form>

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
