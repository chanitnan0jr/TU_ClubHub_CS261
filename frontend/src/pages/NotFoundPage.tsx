import { Link } from "react-router";
import PublicLayout from "../components/layout/PublicLayout";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          headingLevel={1}
          title="ไม่พบหน้าที่ต้องการ"
          description="ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ยังไม่เปิดให้ใช้งาน"
          action={
            <Link to="/" className={buttonClass("primary")}>
              กลับหน้าหลัก
            </Link>
          }
        />
      </div>
    </PublicLayout>
  );
}
