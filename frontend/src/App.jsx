import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

//Dropdown
import Profile from "./pages/admin/Profile";
import Settings from "./pages/admin/Settings";
import ChangePassword from "./pages/admin/Changepassword";

// Khu vực admin
import UserManagement from "./pages/admin/Usermanagement";
import AdminDashboard from "./pages/admin/Dashboard";
import RoomList from './pages/admin/RoomList';
// import TenantList from './pages/admin/TenantList';
// import ContractList from './pages/admin/ContractList';
// import PaymentList from './pages/admin/PaymentList';

// Khu vực người thuê
// import TenantHome from './pages/tenant/TenantHome';
// import MyRoom from './pages/tenant/MyRoom';
// import MyInvoices from './pages/tenant/MyInvoices';
// import Profile from './pages/tenant/Profile';

import "./index.css";

// Đường dẫn trang chủ theo vai trò — khai báo một chỗ để dùng lại
export const HOME_PATH = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.TENANT]: "/toi",
};

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <div className="p-6 text-slate-ink">Đang tải…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // to= luôn là CHUỖI đường dẫn, không phải component
  return <Navigate to={HOME_PATH[role] || "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RootRedirect />} />

           

          {/* ---------- KHU VỰC ADMIN ---------- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* index = đúng đường dẫn /admin */}
            <Route path="accounts" element={<UserManagement />} />
            <Route path="ho-so" element={<Profile />} />
          <Route path="cai-dat" element={<Settings />} />
          <Route path="doi-mat-khau" element={<ChangePassword />} />
            <Route index element={<AdminDashboard />} />
             <Route path="rooms" element={<RoomList />} />
            {/* <Route path="tenants" element={<TenantList />} />
            <Route path="contracts" element={<ContractList />} />
            <Route path="payments" element={<PaymentList />} />  */}
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
            {/* <Route index element={<TenantHome />} /> */}
            {/* <Route path="phong" element={<MyRoom />} />
            <Route path="hoa-don" element={<MyInvoices />} />
            <Route path="ho-so" element={<Profile />} /> */}
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
