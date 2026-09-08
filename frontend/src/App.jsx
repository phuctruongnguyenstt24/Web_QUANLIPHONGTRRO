import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import { BranchProvider } from "./context/BranchContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Trang dùng chung cho mọi vai trò
import Profile from "./pages/admin/Profile";
import Settings from "./pages/admin/Settings";
import ChangePassword from "./pages/admin/Changepassword";

// Khu vực quản trị (owner + manager)
import ManagerManagement from "./pages/admin/Managermanagement";
import AdminDashboard from "./pages/admin/Dashboard";
import RoomList from "./pages/admin/RoomList";
import UserManagement from "./pages/admin/Usermanagement";
import BranchList from "./pages/admin/BranchList";
import InvoiceList from './pages/admin/InvoiceList';

// Khu vực người thuê
// import TenantHome from './pages/tenant/TenantHome';
// import MyRoom from './pages/tenant/MyRoom';
// import MyInvoices from './pages/tenant/MyInvoices';

import "./index.css";

// Owner và manager dùng chung khu /admin, phân quyền chi tiết ở từng trang
export const HOME_PATH = {
  [ROLES.OWNER]: "/admin",
  [ROLES.MANAGER]: "/admin",
  [ROLES.TENANT]: "/toi",
};

const STAFF_ROLES = [ROLES.OWNER, ROLES.MANAGER];

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <div className="p-6 text-slate-ink">Đang tải…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_PATH[role] || "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* BranchProvider nằm trong AuthProvider vì nó cần biết vai trò người dùng */}
        <BranchProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<RootRedirect />} />

            {/* ---------- KHU VỰC QUẢN TRỊ ---------- */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="rooms" element={<RoomList />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="accounts" element={<UserManagement />} />
              <Route
                path="managers"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.OWNER]}>
                    <ManagerManagement />
                  </ProtectedRoute>
                }
              />

              {/* Quản lý chi nhánh: chỉ chủ hệ thống */}
              <Route
                path="branches"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.OWNER]}>
                    <BranchList />
                  </ProtectedRoute>
                }
              />

              <Route path="ho-so" element={<Profile />} />
              <Route path="cai-dat" element={<Settings />} />
              <Route path="doi-mat-khau" element={<ChangePassword />} />
            </Route>

            {/* ---------- KHU VỰC NGƯỜI THUÊ ---------- */}
            <Route
              path="/toi"
              element={
                <ProtectedRoute allowedRoles={[ROLES.TENANT]}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* <Route index element={<TenantHome />} />
              <Route path="phong" element={<MyRoom />} />
              <Route path="hoa-don" element={<MyInvoices />} />
              <Route path="ho-so" element={<Profile />} />
              <Route path="cai-dat" element={<Settings />} />
              <Route path="doi-mat-khau" element={<ChangePassword />} /> */}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BranchProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
