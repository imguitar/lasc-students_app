import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/Home/HomePage';
import LoginRedirect from './pages/LoginRedirect';
import SsoLandingPage from './pages/SsoLandingPage';
import DashboardPage from './pages/Student/Dashboard/DashboardPage';
import ProfilePage from './pages/Student/Dashboard/ProfilePage';
import MyRequestsPage from './pages/Student/Dashboard/MyRequestsPage';
import AdvisorDashboardPage from './pages/Advisor/AdvisorDashboardPage';
import AdvisorProfilePage from './pages/Advisor/AdvisorProfilePage';
import NewRequestPage from './pages/Student/NewRequestPage';
import AdminDashboardPage from './pages/Admin/Dashboard/AdminDashboardPage';
import AllRequestsOverviewPage from './pages/Admin/Dashboard/AllRequestsOverviewPage';
import AdminNotificationsPage from './pages/Admin/Dashboard/AdminNotificationsPage';
import StudentListPage from './pages/Admin/Dashboard/StudentListPage';
import PaymentProofPage from './pages/Student/Dashboard/PaymentProofPage';
import AdminReportsPage from './pages/Admin/Dashboard/AdminReportsPage';
import AdminHomeEditorPage from './pages/Admin/Dashboard/AdminHomeEditorPage';
import AdminProfilePage from './pages/Admin/Dashboard/AdminProfilePage';
import AdminCompanyManagementPage from './pages/Admin/Dashboard/AdminCompanyManagementPage';
import AdvisorStudentListPage from './pages/Advisor/AdvisorStudentListPage';
import AdvisorSupervisionPage from './pages/Advisor/AdvisorSupervisionPage';
import AdvisorRelocationsPage from './pages/Advisor/AdvisorRelocationsPage';
import AdminRelocationsPage from './pages/Admin/Dashboard/AdminRelocationsPage';
import AdminRelocationDetailPage from './pages/Admin/Dashboard/AdminRelocationDetailPage';
import AdvisorProgressCheckPage from './pages/Advisor/AdvisorProgressCheckPage';
import AdvisorEvaluationPage from './pages/Advisor/AdvisorEvaluationPage';
import RequestDetailsPage from './pages/Admin/Shared/RequestDetailsPage';
import StudentDetailsPage from './pages/Admin/Shared/StudentDetailsPage';
import StudentCheckInPage from './pages/Student/Dashboard/StudentCheckInPage';
import StudentNotificationsPage from './pages/Student/Dashboard/StudentNotificationsPage';
import AdminCheckInPage from './pages/Admin/Dashboard/AdminCheckInPage';

import PublicRequestPage from './pages/Public/PublicRequestPage';
import PublicEvaluationPage from './pages/Public/PublicEvaluationPage';
import PublicRelocationApprovalPage from './pages/Public/PublicRelocationApprovalPage';
import PublicRelocationDeanPage from './pages/Public/PublicRelocationDeanPage';
import PublicCompanyAcceptancePage from './pages/Public/PublicCompanyAcceptancePage';
import RelocationRequestPage from './pages/Student/RelocationRequestPage';
import AnnouncementDetailPage from './pages/Public/AnnouncementDetailPage';
import NewsListPage from './pages/Public/NewsListPage';
import PublicCompaniesPage from './pages/Public/PublicCompaniesPage';
import './App.css';

function App() {
  return (
    <Router basename="/coop">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginRedirect />} />
        {/* ปลายทาง SSO จากระบบฐานข้อมูลนักศึกษา (Profile) */}
        <Route path="/sso" element={<SsoLandingPage />} />
        <Route path="/sso-landing" element={<SsoLandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/profile" element={<ProfilePage />} />
        <Route path="/dashboard/new-request" element={<NewRequestPage />} />
        <Route path="/dashboard/edit-request/:id" element={<NewRequestPage />} />
        <Route path="/dashboard/my-requests" element={<MyRequestsPage />} />
        <Route path="/dashboard/relocation-request" element={<RelocationRequestPage />} />
        <Route path="/dashboard/request/:id" element={<RequestDetailsPage />} />
        <Route path="/dashboard/student/:id" element={<StudentDetailsPage />} />
        <Route path="/dashboard/payment-proof" element={<PaymentProofPage />} />
        <Route path="/dashboard/check-in" element={<StudentCheckInPage />} />
        <Route path="/dashboard/daily-reports" element={<StudentCheckInPage />} />
        <Route path="/dashboard/notifications" element={<StudentNotificationsPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin-dashboard/requests" element={<AllRequestsOverviewPage />} />
        <Route path="/admin-dashboard/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin-dashboard/students" element={<StudentListPage />} />
        <Route path="/admin-dashboard/users" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/admin-dashboard/companies" element={<AdminCompanyManagementPage />} />
        <Route path="/admin-dashboard/checkins" element={<AdminCheckInPage />} />
        <Route path="/admin-dashboard/attendance-overview" element={<Navigate to="/admin-dashboard/checkins" replace />} />
        <Route path="/admin-dashboard/reports" element={<AdminReportsPage />} />
        <Route path="/admin-dashboard/relocations" element={<AdminRelocationsPage />} />
        <Route path="/admin-dashboard/relocations/:id" element={<AdminRelocationDetailPage />} />
        {/* เมนูข่าวสาร/แบนเนอร์รวมศูนย์ที่ Home Editor — ลิงก์เก่า redirect มาที่เดียวกัน */}
        <Route path="/admin-dashboard/announcements" element={<Navigate to="/admin-dashboard/home-editor" replace />} />
        <Route path="/admin-dashboard/banners" element={<Navigate to="/admin-dashboard/home-editor" replace />} />
        <Route path="/admin-dashboard/home-editor" element={<AdminHomeEditorPage />} />
        <Route path="/admin-dashboard/profile" element={<AdminProfilePage />} />
        <Route path="/advisor-dashboard" element={<AdvisorDashboardPage />} />
        <Route path="/advisor-dashboard/students" element={<AdvisorStudentListPage />} />
        <Route path="/advisor-dashboard/supervision" element={<AdvisorSupervisionPage />} />
        <Route path="/advisor-dashboard/relocations" element={<AdvisorRelocationsPage />} />
        <Route path="/advisor-dashboard/supervision/evaluate/:id" element={<AdvisorEvaluationPage />} />
        <Route path="/advisor-dashboard/progress" element={<AdvisorProgressCheckPage />} />
        <Route path="/advisor-dashboard/profile" element={<AdvisorProfilePage />} />
        <Route path="/public/request/:id" element={<PublicRequestPage />} />
        <Route path="/public/evaluate/:id" element={<PublicEvaluationPage />} />
        <Route path="/public/relocation-approval/:token" element={<PublicRelocationApprovalPage />} />
        <Route path="/public/relocation-dean/:token" element={<PublicRelocationDeanPage />} />
        <Route path="/public/company-acceptance/:token" element={<PublicCompanyAcceptancePage />} />
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/:id" element={<AnnouncementDetailPage />} />
        <Route path="/companies" element={<PublicCompaniesPage />} />
      </Routes>
    </Router>
  );
}

export default App;
