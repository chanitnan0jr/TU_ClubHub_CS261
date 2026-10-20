import { useNavigate, useParams } from "react-router";
import { useAuth } from "../features/auth/AuthContext";
import { ClubDetailPage } from "../features/clubs/components/ClubDetailPage";
import { isValidId } from "../lib/ids";
import NotFoundPage from "./NotFoundPage";

// Public page: shown to visitors without a session as well.
export default function ClubDetailRoutePage() {
  const { clubId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isValidId(clubId)) return <NotFoundPage />;

  return (
    <ClubDetailPage
      clubId={clubId}
      isLoggedIn={isAuthenticated}
      onRequestLogin={() =>
        navigate(`/login?next=${encodeURIComponent(`/clubs/${clubId}`)}`)
      }
    />
  );
}
