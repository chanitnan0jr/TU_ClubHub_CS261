import { useState } from "react";
import { useAuth } from "./features/auth/AuthContext";
import Login from "./features/auth/Login";
import { MyApplicationsPage } from "./features/applications/pages/MyApplicationsPage";

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  // กำหนด State เลือกหน้าปัจจุบัน (Default เป็น 'my-applications' เพื่อให้ตรวจงาน Task 64 ได้ หรือปรับเป็น 'search' ได้)
  const [activeTab, setActiveTab] = useState<'search' | 'my-applications' | 'my-clubs'>('my-applications');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium text-sm">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Navigation Bar ด้านบน */}
      <nav className="bg-white border-b border-gray-200 px-6 sm:px-12 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('search')}>
            <div className="w-9 h-9 rounded-xl bg-[#C81E3D] text-white font-black flex items-center justify-center text-sm tracking-wider shadow-sm">
              TU
            </div>
            <span className="font-extrabold text-xl text-[#1E293B] tracking-tight">ClubHub</span>
          </div>

          {/* ปุ่มเมนูสลับหน้าบน Navbar */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            <button
              onClick={() => setActiveTab('search')}
              className={`transition-colors ${
                activeTab === 'search'
                  ? 'text-[#C81E3D] border-b-2 border-[#C81E3D] pb-1'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ค้นหาชมรม
            </button>
            <button
              onClick={() => setActiveTab('my-applications')}
              className={`transition-colors ${
                activeTab === 'my-applications'
                  ? 'text-[#C81E3D] border-b-2 border-[#C81E3D] pb-1'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ประวัติการสมัครของฉัน
            </button>
            <button
              onClick={() => setActiveTab('my-clubs')}
              className={`transition-colors ${
                activeTab === 'my-clubs'
                  ? 'text-[#C81E3D] border-b-2 border-[#C81E3D] pb-1'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ชมรมของฉัน
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
              W
            </div>
            <span className="text-sm font-bold text-slate-800 hidden sm:inline">พิมพ์ชนก ใจดี</span>
            <button
              onClick={logout}
              className="ml-2 text-xs font-semibold text-gray-400 hover:text-rose-600 transition-colors"
            >
              (ออกจากระบบ)
            </button>
          </div>
        </div>
      </nav>

      {/* สลับการแสดงผลตามเมนูที่เลือก */}
      <main className="pb-16">
        {activeTab === 'my-applications' && <MyApplicationsPage />}
        {activeTab === 'search' && (
          <div className="max-w-6xl mx-auto p-12 text-center text-gray-500 font-medium">
            [ หน้าค้นหาชมรม / หน้าหลัก ]
          </div>
        )}
        {activeTab === 'my-clubs' && (
          <div className="max-w-6xl mx-auto p-12 text-center text-gray-500 font-medium">
            [ หน้าชมรมของฉัน ]
          </div>
        )}
      </main>
    </div>
  );
}