import { Link, useLocation, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { buttonClass } from "../components/ui/classes";
import { RoundListPage } from "../features/recruitment/components/RoundListPage";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function RoundListRoutePage() {
  const { clubId } = useParams();
  const location = useLocation();

  if (!isValidId(clubId)) return <NotFoundPage />;

  // The edit page sends a success message in the navigation state.
  const notice: unknown = location.state?.notice;

  return (
    <CommitteeLayout
      clubId={clubId}
      title="จัดการรอบรับสมัคร"
      description="สร้าง แก้ไข เผยแพร่ และปิดรับสมัครรอบของชมรม แก้ไขได้เฉพาะรอบที่ยังเป็นฉบับร่าง"
      breadcrumbs={[{ label: "จัดการรอบรับสมัคร" }]}
      actions={
        <Link to={`/clubs/${clubId}/rounds/new`} className={buttonClass("primary")}>
          สร้างรอบรับสมัคร
        </Link>
      }
    >
      <RoundListPage key={clubId} clubId={clubId} notice={typeof notice === "string" ? notice : null} />
    </CommitteeLayout>
  );
}
