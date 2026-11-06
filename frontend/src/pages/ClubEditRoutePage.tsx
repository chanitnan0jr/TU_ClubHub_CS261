import { Link, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { Button } from "../components/ui/Button";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";
import { CircleAlertIcon, ExternalLinkIcon } from "../components/ui/icons";
import { updateClubProfile } from "../features/clubs/api/clubApi";
import ClubProfileForm from "../features/clubs/components/ClubProfileForm";
import { useClubProfile } from "../features/clubs/hooks/useClubProfile";
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
          ดูหน้าโปรไฟล์สาธารณะ
        </Link>
      }
    >
      <ClubProfileEditor key={clubId} clubId={clubId} />
    </CommitteeLayout>
  );
}

function ClubProfileEditor({ clubId }: { clubId: string }) {
  const { data, isLoading, errorMessage, refetch } = useClubProfile(clubId);

  if (isLoading) {
    return (
      <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        กำลังโหลดข้อมูลชมรม...
      </p>
    );
  }

  // Never show an empty form: saving it would overwrite the club with blank values.
  if (!data) {
    return (
      <EmptyState
        icon={<CircleAlertIcon className="size-6" />}
        title="โหลดข้อมูลชมรมไม่สำเร็จ"
        description={errorMessage ?? "ไม่สามารถโหลดข้อมูลชมรมได้"}
        action={
          <Button variant="primary" onClick={refetch}>
            ลองใหม่
          </Button>
        }
      />
    );
  }

  return (
    <ClubProfileForm
      profile={data.profile}
      categories={data.categories}
      tags={data.tags}
      onSave={(request) => updateClubProfile(clubId, request)}
    />
  );
}
