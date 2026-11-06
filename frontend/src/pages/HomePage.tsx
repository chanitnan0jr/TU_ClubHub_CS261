import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import LoadingScreen from "../app/LoadingScreen";
import PublicLayout from "../components/layout/PublicLayout";
import { buttonClass, inputClass as fieldInputClass } from "../components/ui/classes";
import { useAuth } from "../features/auth/AuthContext";
import Login from "../features/auth/Login";
import { isValidId } from "../lib/ids";

const inputClass = `mt-1.5 ${fieldInputClass()}`;
const linkButtonClass = buttonClass("secondary");

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [clubId, setClubId] = useState("");
  const [roundId, setRoundId] = useState("");

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated || !user) {
    return (
      <PublicLayout>
        <Login />
      </PublicLayout>
    );
  }

  const clubOk = isValidId(clubId);
  const roundOk = isValidId(roundId);

  const handleSubmit = (e: FormEvent) => e.preventDefault();

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ยินดีต้อนรับสู่ TU ClubHub</h1>
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p><strong>ID ผู้ใช้:</strong> {user.id}</p>
          <p><strong>สิทธิ์ (Role):</strong> {user.role}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">ไปยังหน้าของชมรม</h2>
          <p className="text-sm text-slate-600">
            ระบบยังไม่มีรายการชมรมและรอบของคุณ จึงต้องระบุรหัส (ตัวเลข) เอง
          </p>

          <div>
            <label htmlFor="home-club-id" className="block text-sm font-medium text-slate-800">
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
            <button
              type="button"
              disabled={!clubOk}
              onClick={() => navigate(`/clubs/${clubId}/rounds/new`)}
              className={linkButtonClass}
            >
              สร้างรอบรับสมัคร
            </button>
          </div>

          <div>
            <label htmlFor="home-round-id" className="block text-sm font-medium text-slate-800">
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

          <p className="text-xs text-slate-600">
            หน้าแก้ไขโปรไฟล์และจัดการคำถามใช้ได้เฉพาะกรรมการของชมรมนั้น
          </p>
        </form>
      </div>
    </PublicLayout>
  );
}
