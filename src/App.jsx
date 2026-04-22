import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import ParentDashboard from "./pages/ParentDashboard";
import ParentQueriesPage from "./pages/ParentQueriesPage";
import SGADashboard from "./pages/SGADashboard";
import SessionControlPage from "./pages/SessionControlPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentDetails from "./pages/StudentDetails";
import WeeklyReportsPage from "./pages/WeeklyReportsPage";
import { useAppState } from "./hooks/useAppState";
import "./styles/sga-dashboard.css";

function App() {
  const {
    studentsWithSessionData,
    isLoading,
    errorMessage,
    currentPhase,
    ACTIVE_SESSION_SLOT,
    studentQueriesById,
    attendanceHistoryById,
    handleSetPhase,
    handleStartNewSession,
    handleSgaMarkSessionPresent,
    handleCloseSession,
    handleApproveAttendanceRequest,
    handleGenerateWeeklyReport,
    handleResolveParentQuery,
    handleStudentMarkAttendance,
    handleRequestAttendanceApproval,
    handleMarkAttendance,
    handleGenerateAlert,
    handleSaveParentQuery,
    handleEscalateParentQuery,
    toasts,
  } = useAppState();

  return (
    <Routes>
      <Route element={<DashboardLayout toasts={toasts} />}>
        <Route path="/" element={<Navigate to="/sga-dashboard" replace />} />
        <Route
          path="/sga-dashboard"
          element={
            <SGADashboard
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          }
        />
        <Route
          path="/session-control"
          element={
            <SessionControlPage
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              currentPhase={currentPhase}
              currentSessionSlot={ACTIVE_SESSION_SLOT}
              onSetPhase={handleSetPhase}
              onStartNewSession={handleStartNewSession}
              onSgaMarkSessionPresent={handleSgaMarkSessionPresent}
              onCloseSession={handleCloseSession}
              onApproveAttendanceRequest={handleApproveAttendanceRequest}
            />
          }
        />
        <Route
          path="/student-dashboard/:id"
          element={
            <StudentDashboard
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              currentPhase={currentPhase}
              currentSessionSlot={ACTIVE_SESSION_SLOT}
              onStudentMarkAttendance={handleStudentMarkAttendance}
              onRequestAttendanceApproval={handleRequestAttendanceApproval}
            />
          }
        />
        <Route
          path="/student/:id"
          element={
            <StudentDetails
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              studentQueriesById={studentQueriesById}
              attendanceHistoryById={attendanceHistoryById}
              onMarkAttendance={handleMarkAttendance}
              onGenerateAlert={handleGenerateAlert}
            />
          }
        />
        <Route
          path="/parent-dashboard"
          element={
            <ParentDashboard
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              studentQueriesById={studentQueriesById}
              onSaveParentQuery={handleSaveParentQuery}
              onEscalateParentQuery={handleEscalateParentQuery}
            />
          }
        />
        <Route
          path="/parent-dashboard/:id"
          element={
            <ParentDashboard
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              studentQueriesById={studentQueriesById}
              onSaveParentQuery={handleSaveParentQuery}
              onEscalateParentQuery={handleEscalateParentQuery}
            />
          }
        />
        <Route
          path="/weekly-reports"
          element={
            <WeeklyReportsPage
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onGenerateWeeklyReport={handleGenerateWeeklyReport}
            />
          }
        />

        <Route
          path="/parent-queries"
          element={
            <ParentQueriesPage
              students={studentsWithSessionData}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onResolveParentQuery={handleResolveParentQuery}
            />
          }
        />
        <Route path="*" element={<Navigate to="/sga-dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
