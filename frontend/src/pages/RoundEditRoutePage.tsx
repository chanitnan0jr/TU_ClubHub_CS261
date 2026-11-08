import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CommitteeLayout from "../components/layout/CommitteeLayout";
import { Button } from "../components/ui/Button";
import { buttonClass } from "../components/ui/classes";
import { EmptyState } from "../components/ui/EmptyState";
import { CircleAlertIcon } from "../components/ui/icons";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getRound, updateRound } from "../features/recruitment/api/roundApi";
import { RecruitmentRoundForm } from "../features/recruitment/components/RecruitmentRoundForm";
import type { RecruitmentRoundFormInput } from "../features/recruitment/types/recruitment";
import { roundDisplayStatus } from "../features/recruitment/utils/roundDisplay";
import { toRoundFormInput, toRoundWriteRequest } from "../features/recruitment/utils/roundRequest";
import { useApiResource } from "../hooks/useApiResource";
import { ApiError, describeApiError } from "../lib/api";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

const EDIT_RULE = "แก้ไขได้เฉพาะรอบที่ยังเป็นฉบับร่าง ยังไม่มีผู้สมัคร และคำถามยังไม่มีคำตอบ";

export default function RoundEditRoutePage() {
  const { clubId, roundId } = useParams();
  if (!isValidId(clubId) || !isValidId(roundId)) return <NotFoundPage />;
  return <RoundEdit key={`${clubId}:${roundId}`} clubId={clubId} roundId={roundId} />;
}

// Prefills the round form from the saved draft and replaces it with PUT, sending
// the version that was loaded so a concurrent change is rejected (409).
function RoundEdit({ clubId, roundId }: { clubId: string; roundId: string }) {
  const navigate = useNavigate();
  const round = useApiResource(`${clubId}:${roundId}`, () => getRound(clubId, roundId));
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const listPath = `/clubs/${clubId}/rounds`;
  const backLink = (
    <Link to={listPath} className={buttonClass("secondary")}>
      กลับไปหน้าจัดการรอบรับสมัคร
    </Link>
  );

  const handleSubmit = async (data: RecruitmentRoundFormInput) => {
    if (!round.data) return;
    setIsSaving(true);
    setSubmitError(null);
    setConflict(null);
    try {
      await updateRound(clubId, roundId, {
        ...toRoundWriteRequest(data),
        eligibilityText: round.data.eligibilityText,
        version: round.data.version,
      });
      navigate(listPath, { state: { notice: `บันทึกการแก้ไขรอบ “${data.title.trim()}” แล้ว` } });
    } catch (error) {
      const message = describeApiError(error, "ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่");
      if (error instanceof ApiError && error.status === 409) setConflict(message);
      else setSubmitError(message);
      setIsSaving(false);
      window.scrollTo({ top: 0 });
    }
  };

  const saved = round.data;
  const editable = saved && saved.publicationStatus === "DRAFT" && saved.closedAt === null;

  return (
    <CommitteeLayout
      clubId={clubId}
      title="แก้ไขรอบรับสมัคร"
      description="แก้ไขข้อมูล กำหนดการ และคำถามของรอบฉบับร่าง เมื่อพร้อมแล้วเผยแพร่จากหน้าจัดการรอบรับสมัคร"
      breadcrumbs={[
        { label: "จัดการรอบรับสมัคร", to: listPath },
        { label: saved?.title ?? `รอบรับสมัคร ${roundId}` },
        { label: "แก้ไข" },
      ]}
    >
      {round.isLoading && (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">กำลังโหลดข้อมูลรอบรับสมัคร...</span>
          {[0, 1].map((block) => (
            <div key={block} aria-hidden="true" className="h-48 animate-pulse rounded-xl bg-slate-200/60" />
          ))}
        </div>
      )}

      {round.error !== undefined && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-white p-6">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
            <CircleAlertIcon className="mt-0.5 size-5" />
            {describeApiError(round.error, "โหลดข้อมูลรอบรับสมัครไม่สำเร็จ กรุณาลองใหม่")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={round.reload}>ลองใหม่</Button>
            {backLink}
          </div>
        </div>
      )}

      {saved && !editable && round.loadedAt && (
        <EmptyState
          headingLevel={2}
          icon={<CircleAlertIcon className="size-6" />}
          title="แก้ไขรอบนี้ไม่ได้"
          description={
            <>
              {EDIT_RULE} รอบ “{saved.title}” มีสถานะ{" "}
              <StatusBadge status={roundDisplayStatus(saved, round.loadedAt)} />
            </>
          }
          action={
            <>
              {backLink}
              <Link to={`${listPath}/${roundId}/questions`} className={buttonClass("ghost")}>
                ดูคำถามคัดเลือก
              </Link>
            </>
          }
        />
      )}

      {saved && editable && (
        <>
          {conflict && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <p className="flex items-start gap-2 font-semibold">
                <CircleAlertIcon className="mt-0.5 size-5" />
                บันทึกการแก้ไขไม่ได้: {conflict}
              </p>
              <p className="text-red-800">{EDIT_RULE} โหลดข้อมูลล่าสุดแล้วลองอีกครั้ง หรือกลับไปดูสถานะรอบ</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setConflict(null);
                    round.reload();
                  }}
                >
                  โหลดข้อมูลล่าสุด
                </Button>
                {backLink}
              </div>
            </div>
          )}
          <RecruitmentRoundForm
            mode="edit"
            initialValues={toRoundFormInput(saved)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(listPath)}
            isLoading={isSaving}
            submitError={submitError}
          />
        </>
      )}
    </CommitteeLayout>
  );
}
