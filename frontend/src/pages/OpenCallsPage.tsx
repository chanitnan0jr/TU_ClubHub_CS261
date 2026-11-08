import PublicLayout from "../components/layout/PublicLayout";
import { OpenCallBoard } from "../features/openCalls/components/OpenCallBoard";

// Public page: anyone can browse open rounds; the apply link asks for a login.
export default function OpenCallsPage() {
  return (
    <PublicLayout>
      <OpenCallBoard />
    </PublicLayout>
  );
}
