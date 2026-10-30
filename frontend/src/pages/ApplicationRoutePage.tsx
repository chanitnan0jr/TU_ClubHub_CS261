import { useParams } from 'react-router';
import { DynamicApplicationForm } from '../features/applications/components/DynamicApplicationForm';
import { isValidId } from '../lib/ids';
import NotFoundPage from './NotFoundPage';

export default function ApplicationRoutePage() {
  const { clubId, roundId } = useParams();

  if (!isValidId(clubId) || !isValidId(roundId)) return <NotFoundPage />;

  return (
    <DynamicApplicationForm
      key={`${clubId}:${roundId}`}
      clubId={clubId}
      roundId={roundId}
    />
  );
}
