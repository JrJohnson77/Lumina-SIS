import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { SessionExpiredModal } from "./components/SessionExpiredModal";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SchoolsPage from "./pages/SchoolsPage";
import StudentsPage from "./pages/StudentsPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import ClassesPage from "./pages/ClassesPage";
import AttendancePage from "./pages/AttendancePage";
import GradebookPage from "./pages/GradebookPage";
import GradesPage from "./pages/GradesPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import StaffProfilePage from "./pages/StaffProfilePage";
import ImportExportPage from "./pages/ImportExportPage";
import ReportTemplateDesigner from "./pages/ReportTemplateDesigner";
import AdmissionsPage from "./pages/AdmissionsPage";
import HealthPage from "./pages/HealthPage";
import DisciplinePage from "./pages/DisciplinePage";
import ReEnrollmentPage from "./pages/ReEnrollmentPage";
import AuditLogPage from "./pages/AuditLogPage";
import FormTeacherCommentsPage from "./pages/FormTeacherCommentsPage";
import SocialSkillsManagerPage from "./pages/SocialSkillsManagerPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import { Loader2 } from "lucide-react";

// Listens to route changes and persists the path for the next login redirect
const RouteWatcher = () => {
    const location = useLocation();
    const { rememberLastPage, isAuthenticated } = useAuth();
    useEffect(() => {
        if (isAuthenticated) rememberLastPage(location.pathname);
    }, [location.pathname, isAuthenticated, rememberLastPage]);
    return null;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, user } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    // Superuser has access to everything
    if (user?.role === 'superuser') {
        return <Layout>{children}</Layout>;
    }
    
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, getLastPage } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (isAuthenticated) {
        return <Navigate to={getLastPage()} replace />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <>
            <RouteWatcher />
            <SessionExpiredModal />
            <Routes>
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/forgot-password" 
                element={
                    <PublicRoute>
                        <ForgotPasswordPage />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/schools" 
                element={
                    <ProtectedRoute allowedRoles={['superuser']}>
                        <SchoolsPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/students" 
                element={
                    <ProtectedRoute>
                        <StudentProfilePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/students/manage" 
                element={
                    <ProtectedRoute>
                        <StudentsPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/students/:studentId" 
                element={
                    <ProtectedRoute>
                        <StudentProfilePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/classes" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <ClassesPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/attendance" 
                element={
                    <ProtectedRoute>
                        <AttendancePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/gradebook" 
                element={
                    <ProtectedRoute>
                        <GradebookPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/grades" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <GradesPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/report-cards" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <ReportsPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/report-manager/comments" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <FormTeacherCommentsPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/report-manager/social-skills" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <SocialSkillsManagerPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/report-template" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <ReportTemplateDesigner />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/import-export" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <ImportExportPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/users" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <UsersPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/staff" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <StaffProfilePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/staff/:userId" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <StaffProfilePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/admissions" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <AdmissionsPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/health" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <HealthPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/discipline" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin', 'teacher']}>
                        <DisciplinePage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/re-enrollment" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <ReEnrollmentPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/audit-logs" 
                element={
                    <ProtectedRoute allowedRoles={['superuser', 'admin']}>
                        <AuditLogPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/reports" 
                element={<Navigate to="/report-cards" replace />}
            />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
