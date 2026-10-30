import { Link, useParams } from "react-router";
import { ClubEditFormContainer } from "../features/clubs/components/ClubEditFormContainer";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

export default function ClubEditRoutePage() {
  const { clubId } = useParams();

  if (!isValidId(clubId)) return <NotFoundPage />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto mb-4 max-w-2xl">
        <Link to={`/clubs/${clubId}`} className="text-sm font-semibold text-red-700 hover:underline">
          ← กลับหน้าชมรม
        </Link>
      </div>
      <ClubEditFormContainer clubId={clubId} />
    </div>
  );
}
