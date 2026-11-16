import { Link, Navigate, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import PublicLayout from "../components/layout/PublicLayout";
import { Button } from "../components/ui/Button";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";
import { CircleAlert, ExternalLink } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { getClubProfile, listClubCategories, listInterestTags, updateClubProfile } from "../features/clubs/api/clubApi";
import ClubProfileForm from "../features/clubs/components/ClubProfileForm";
import { useApiResource } from "../hooks/useApiResource";
import { describeApiError } from "../lib/api";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function ClubEditRoutePage() {
  const { clubId } = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  if (!isValidId(clubId)) return <NotFoundPage />;
  if (isAuthLoading) return <LoadingProfileStatus />;

  const assignments = user?.activeCommitteeAssignments;
  if (assignments && !assignments.some((item) => item.clubId === clubId)) {
    return <Navigate to={`/clubs/${clubId}`} replace />;
  }

  return <ClubProfileEditor key={clubId} clubId={clubId} />;
}

function LoadingProfileStatus() {
  return (
    <PublicLayout>
      <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        กำลังตรวจสอบสิทธิ์และโหลดข้อมูลชมรม...
      </p>
    </PublicLayout>
  );
}

function ClubProfileEditor({ clubId }: { clubId: string }) {
  const { data, isLoading, error, reload: refetch } = useApiResource(
    `club-profile:${clubId}`,
    async () => {
      const [profile, categories, tags] = await Promise.all([
        getClubProfile(clubId),
        listClubCategories(),
        listInterestTags(),
      ]);
      return { profile, categories: categories.items, tags: tags.items };
    },
  );
  const errorMessage = error ? describeApiError(error, "เกิดข้อผิดพลาดในการโหลดข้อมูล") : null;

  if (isLoading) return <LoadingProfileStatus />;

  // Never show an empty form: saving it would overwrite the club with blank values.
  if (!data) {
    return (
      <PublicLayout>
        <EmptyState
          icon={<CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-6 shrink-0" />}
          title="โหลดข้อมูลชมรมไม่สำเร็จ"
          description={errorMessage ?? "ไม่สามารถโหลดข้อมูลชมรมได้"}
          action={
            <Button variant="primary" onClick={refetch}>
              ลองใหม่
            </Button>
          }
        />
      </PublicLayout>
    );
  }

  if (data.profile.id !== clubId || data.profile.canEditProfile !== true) {
    return <Navigate to={`/clubs/${clubId}`} replace />;
  }

  return (
    <CommitteeLayout
      clubId={clubId}
      title="จัดการข้อมูลโปรไฟล์ชมรม"
      description="ข้อมูลในหน้านี้จะแสดงบนหน้าชมรมสาธารณะ"
      breadcrumbs={[{ label: "โปรไฟล์ชมรม" }]}
      actions={
        <Link to={`/clubs/${clubId}`} className={buttonClass("secondary")}>
          <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          ดูหน้าโปรไฟล์สาธารณะ
        </Link>
      }
    >
      <ClubProfileForm
        profile={data.profile}
        categories={data.categories}
        tags={data.tags}
        onSave={(request) => updateClubProfile(clubId, request)}
      />
    </CommitteeLayout>
  );
}
