import { Navigate, useLocation, useParams } from 'react-router';
import {
  ApplicationSuccessPage,
} from '../features/applications/components/DynamicApplicationForm';
import type {
  RoundApplicationForm,
  SubmitApplicationResponse,
} from '../features/applications/services/applicationService';
import type { PublicClubProfile } from '../features/clubs/types/club';
import { isValidId } from '../lib/ids';
import NotFoundPage from './NotFoundPage';

interface ApplicationResultState {
  club: PublicClubProfile;
  form: RoundApplicationForm;
  receipt: SubmitApplicationResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApplicationResultState(
  value: unknown,
  clubId: string,
  roundId: string,
): value is ApplicationResultState {
  if (!isRecord(value)) return false;
  const club = value.club;
  const form = value.form;
  const receipt = value.receipt;
  if (!isRecord(club) || !isRecord(form) || !isRecord(receipt)) return false;
  const round = form.round;
  return (
    club.id === clubId &&
    typeof club.name === 'string' &&
    isRecord(round) &&
    round.id === roundId &&
    round.clubId === clubId &&
    Array.isArray(form.questions) &&
    typeof receipt.id === 'string' &&
    typeof receipt.status === 'string'
  );
}

export default function ApplicationResultRoutePage() {
  const { clubId, roundId } = useParams();
  const location = useLocation();

  if (!isValidId(clubId) || !isValidId(roundId)) return <NotFoundPage />;
  if (!isApplicationResultState(location.state, clubId, roundId)) {
    return (
      <Navigate
        to={`/clubs/${encodeURIComponent(clubId)}/rounds/${encodeURIComponent(roundId)}/apply`}
        replace
      />
    );
  }

  return (
    <ApplicationSuccessPage
      clubId={clubId}
      club={location.state.club}
      form={location.state.form}
      receipt={location.state.receipt}
    />
  );
}
