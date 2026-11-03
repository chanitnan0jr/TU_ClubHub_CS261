import { CentralDashboardPage } from '../features/admin-dashboard/pages/CentralDashboardPage';
import { Route, Routes } from "react-router";
import ApplicationRoutePage from "../pages/ApplicationRoutePage";
import ClubDetailRoutePage from "../pages/ClubDetailRoutePage";
import ClubEditRoutePage from "../pages/ClubEditRoutePage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MyApplicationsPage from "../pages/MyApplicationsPage";
import NotFoundPage from "../pages/NotFoundPage";
import QuestionManagementRoutePage from "../pages/QuestionManagementRoutePage";
import RoundCreateRoutePage from "../pages/RoundCreateRoutePage";
import RequireAuth from "./RequireAuth";

// Paths must stay under the prefixes the backend forwards to index.html
// (SpaForwardController): /login, /clubs/**, /profile and /dashboard/**.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/clubs/:clubId" element={<ClubDetailRoutePage />} />
      <Route path="/admin/dashboard" element={<CentralDashboardPage />} />
      <Route
        path="/clubs/:clubId/rounds/:roundId/apply"
        element={
          <RequireAuth>
            <ApplicationRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/edit"
        element={
          <RequireAuth>
            <ClubEditRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/rounds/new"
        element={
          <RequireAuth>
            <RoundCreateRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/rounds/:roundId/questions"
        element={
          <RequireAuth>
            <QuestionManagementRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/applications"
        element={
          <RequireAuth>
            <MyApplicationsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
