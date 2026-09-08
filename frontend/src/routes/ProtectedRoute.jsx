import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOME_PATH } from '../App';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-6 text-slate-ink">Đang kiểm tra đăng nhập…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = HOME_PATH[role];
    // Không điều hướng nếu đã ở đúng khu vực của mình — tránh lặp vô hạn
    // khi manager vào trang chỉ dành cho owner (cả hai cùng ở /admin).
    if (!home || location.pathname.startsWith(home)) {
      return (
        <div className="p-10 text-center">
          <h2 className="mb-2 font-display text-xl">Không có quyền truy cập</h2>
          <p className="text-slate-ink">Chức năng này chỉ dành cho chủ hệ thống.</p>
        </div>
      );
    }
    return <Navigate to={home} replace />;
  }

  return children;
}