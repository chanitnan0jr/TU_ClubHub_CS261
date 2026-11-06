import { Route, Routes } from "react-router";
import ApplicationRoutePage from "../pages/ApplicationRoutePage";
import ApplicationResultRoutePage from "../pages/ApplicationResultRoutePage";
import ClubDetailRoutePage from "../pages/ClubDetailRoutePage";
import ClubEditRoutePage from "../pages/ClubEditRoutePage";
import ClubManageRoutePage from "../pages/ClubManageRoutePage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MyApplicationsPage from "../pages/MyApplicationsPage";
import NotFoundPage from "../pages/NotFoundPage";
import OpenCallsPage from "../pages/OpenCallsPage";
import QuestionManagementRoutePage from "../pages/QuestionManagementRoutePage";
import RoundCreateRoutePage from "../pages/RoundCreateRoutePage";
import RoundEditRoutePage from "../pages/RoundEditRoutePage";
import RoundListRoutePage from "../pages/RoundListRoutePage";
import RequireAuth from "./RequireAuth";

// Paths must stay under the prefixes the backend forwards to index.html
// (SpaForwardController): /login, /clubs/**, /profile and /dashboard/**.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/open-calls" element={<OpenCallsPage />} />
      <Route path="/clubs/:clubId" element={<ClubDetailRoutePage />} />
      <Route
        path="/clubs/:clubId/rounds/:roundId/apply"
        element={
          <RequireAuth>
            <ApplicationRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/rounds/:roundId/apply/result"
        element={
          <RequireAuth>
            <ApplicationResultRoutePage />
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
        path="/clubs/:clubId/manage"
        element={
          <RequireAuth>
            <ClubManageRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/rounds"
        element={
          <RequireAuth>
            <RoundListRoutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/clubs/:clubId/rounds/:roundId/edit"
        element={
          <RequireAuth>
            <RoundEditRoutePage />
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
      <Route
        path="/me/applications"
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
