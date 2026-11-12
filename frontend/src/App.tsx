import AppRoutes from "./app/AppRoutes";
import LoginSuccessNotice from "./features/auth/LoginSuccessNotice";

export default function App() {
  return (
    <>
      <LoginSuccessNotice />
      <AppRoutes />
    </>
  );
}
