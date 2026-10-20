import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-gray-500">ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ยังไม่เปิดให้ใช้งาน</p>
      <Link to="/" className="font-semibold text-red-700 hover:underline">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
