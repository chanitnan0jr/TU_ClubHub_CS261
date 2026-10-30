import { useParams } from "react-router";
import { QuestionManagementPage } from "../features/recruitment/components/QuestionManagementPage";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function QuestionManagementRoutePage() {
  const { clubId, roundId } = useParams();

  if (!isValidId(clubId) || !isValidId(roundId)) return <NotFoundPage />;

  return <QuestionManagementPage clubId={clubId} roundId={roundId} />;
}
