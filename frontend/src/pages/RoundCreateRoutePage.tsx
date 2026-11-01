import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { createRound, publishRound } from "../features/recruitment/api/roundApi";
import { RecruitmentRoundForm } from "../features/recruitment/components/RecruitmentRoundForm";
import type { RecruitmentRoundFormInput } from "../features/recruitment/types/recruitment";
import { toRoundWriteRequest } from "../features/recruitment/utils/roundRequest";
import { describeApiError } from "../lib/api";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

// Creates the round with its questions, then publishes it when asked. A draft can
// be edited on the questions page, but there is no round read API to publish it later.
export default function RoundCreateRoutePage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isValidId(clubId)) return <NotFoundPage />;

  const handleSubmit = async (data: RecruitmentRoundFormInput, isDraft: boolean) => {
    setIsSaving(true);
    setSubmitError(null);
    let round;
    try {
      round = await createRound(clubId, toRoundWriteRequest(data));
    } catch (error) {
      setSubmitError(describeApiError(error, "ไม่สามารถบันทึกรอบรับสมัครได้"));
      setIsSaving(false);
      return;
    }
    if (isDraft) {
      navigate(`/clubs/${clubId}/rounds/${round.id}/questions`);
      return;
    }
    try {
      await publishRound(clubId, round.id, round.version);
      navigate(`/clubs/${clubId}`);
    } catch (error) {
      setSubmitError(
        `บันทึกรอบ #${round.id} เป็นฉบับร่างแล้ว แต่เผยแพร่ไม่สำเร็จ: ${describeApiError(error, "กรุณาลองใหม่")}`,
      );
      setIsSaving(false);
    }
  };

  return (
    <RecruitmentRoundForm
      clubName={`ชมรมรหัส ${clubId}`}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/clubs/${clubId}`)}
      isLoading={isSaving}
      submitError={submitError}
    />
  );
}
