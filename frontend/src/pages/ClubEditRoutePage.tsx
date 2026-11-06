import { Link, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { buttonClass } from "../components/ui/classes";
import { ExternalLinkIcon } from "../components/ui/icons";
import { ClubEditFormContainer } from "../features/clubs/components/ClubEditFormContainer";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function ClubEditRoutePage() {
  const { clubId } = useParams();

  if (!isValidId(clubId)) return <NotFoundPage />;

  return (
    <CommitteeLayout
      clubId={clubId}
      title="จัดการข้อมูลโปรไฟล์ชมรม"
      description="ข้อมูลในหน้านี้จะแสดงบนหน้าชมรมสาธารณะ"
      breadcrumbs={[{ label: "โปรไฟล์ชมรม" }]}
      actions={
        <Link to={`/clubs/${clubId}`} className={buttonClass("secondary")}>
          <ExternalLinkIcon className="size-4" />
          ดูหน้าชมรมสาธารณะ
        </Link>
      }
    >
      <ClubEditFormContainer clubId={clubId} />
    </CommitteeLayout>
  );
}
