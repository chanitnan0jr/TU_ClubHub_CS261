import AppRoutes from "./app/AppRoutes";
import DevRoleSwitcherPill from "./features/auth/DevRoleSwitcherPill";
import LoginSuccessNotice from "./features/auth/LoginSuccessNotice";

export default function App() {
  return (
    <>
      <LoginSuccessNotice />
      <AppRoutes />
      <DevRoleSwitcherPill />
    </>
  );
}
