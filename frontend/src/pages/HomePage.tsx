import { Link } from "react-router";
import LoadingScreen from "../app/LoadingScreen";
import PublicLayout from "../components/layout/PublicLayout";
import { buttonClass } from "../components/ui/classes";
import { CalendarDaysIcon, UsersIcon } from "../components/ui/icons";
import { useAuth, type ActiveCommitteeAssignment } from "../features/auth/AuthContext";
import Login from "../features/auth/Login";

const roleLabel = (assignment: ActiveCommitteeAssignment) =>
  assignment.positionName?.trim() || (assignment.permissionRole === "PRESIDENT" ? "ประธานชมรม" : "กรรมการชมรม");

function OpenCallsLink({ primary }: { primary: boolean }) {
  return (
    <Link to="/open-calls" className={`${buttonClass(primary ? "primary" : "secondary")} shrink-0`}>
      <CalendarDaysIcon className="size-4" />
      ดูรอบที่เปิดรับสมัคร
    </Link>
  );
}

// Visitors see the login form; signed-in users get the open-call board and the
// clubs they manage, from the active committee assignments in /auth/me.
export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated || !user) {
    return (
      <PublicLayout>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-700">ดูรอบที่ชมรมเปิดรับสมัครได้โดยไม่ต้องเข้าสู่ระบบ</p>
          <OpenCallsLink primary={false} />
        </div>
        <Login />
      </PublicLayout>
    );
  }

  const assignments = user.activeCommitteeAssignments ?? [];
  const name = user.displayName?.trim();

  return (
    <PublicLayout>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {name ? `สวัสดี ${name}` : "ยินดีต้อนรับสู่ TU ClubHub"}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              ดูรอบรับสมัครที่เปิดอยู่ของทุกชมรม แล้วสมัครเข้าร่วมชมรมที่สนใจ
            </p>
          </div>
          <OpenCallsLink primary />
        </section>

        {assignments.length > 0 && (
          <section aria-labelledby="my-clubs-heading" className="flex flex-col gap-3">
            <h2 id="my-clubs-heading" className="text-lg font-semibold text-slate-900">
              ชมรมที่ฉันดูแล
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <li key={`${assignment.clubId}-${assignment.startsAt}`}>
                  <Link
                    to={`/clubs/${assignment.clubId}/manage`}
                    className="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-tu-maroon hover:bg-tu-maroon-50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tu-maroon-50 text-tu-maroon">
                      <UsersIcon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{assignment.clubName}</span>
                      <span className="block text-sm text-slate-600">{roleLabel(assignment)}</span>
                      <span className="mt-3 block text-sm font-semibold text-tu-maroon">ไปที่ภาพรวมชมรม</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
