import { useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { QuestionManagementPage } from "../features/recruitment/components/QuestionManagementPage";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function QuestionManagementRoutePage() {
  const { clubId, roundId } = useParams();

  if (!isValidId(clubId) || !isValidId(roundId)) return <NotFoundPage />;

  return (
    <CommitteeLayout
      clubId={clubId}
      title="คำถามคัดเลือก"
      description="คำถามที่ผู้สมัครต้องตอบในแบบฟอร์มสมัครของรอบนี้ เรียงตามลำดับที่แสดง"
      breadcrumbs={[
        { label: "จัดการรอบรับสมัคร", to: `/clubs/${clubId}/rounds` },
        { label: `รอบรับสมัคร ${roundId}` },
        { label: "คำถามคัดเลือก" },
      ]}
    >
      <QuestionManagementPage roundId={roundId} />
    </CommitteeLayout>
  );
}
