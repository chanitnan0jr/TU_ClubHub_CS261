import { useParams } from 'react-router';
import PublicLayout from '../components/layout/PublicLayout';
import {
  MyApplicationDetailPage,
  MyApplicationsPage as MyApplicationsContent,
} from '../features/applications/pages/MyApplicationsPage';
import { isValidId } from '../lib/ids';
import NotFoundPage from './NotFoundPage';

export default function MyApplicationsPage() {
  return (
    <PublicLayout>
      <MyApplicationsContent />
    </PublicLayout>
  );
}

export function MyApplicationDetailRoutePage() {
  const { applicationId } = useParams();
  if (!isValidId(applicationId)) return <NotFoundPage />;
  return (
    <PublicLayout>
      <MyApplicationDetailPage applicationId={applicationId} />
    </PublicLayout>
  );
}
