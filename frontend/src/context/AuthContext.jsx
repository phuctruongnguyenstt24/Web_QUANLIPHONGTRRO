import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  TENANT: 'tenant',
};

export const ROLE_LABELS = {
  owner: 'Chủ hệ thống',
  manager: 'Quản lý chi nhánh',
  tenant: 'Người thuê',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) {
      setToken(savedToken);
      setUser(savedUser ? JSON.parse(savedUser) : null);
    }
    setLoading(false);
  }, []);

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeBranch'); // xoá luôn chi nhánh đang chọn
    setToken(null);
    setUser(null);
  }

  const role = user?.role || null;

  const value = {
    user,
    token,
    role,
    isAuthenticated: !!token,
    isOwner: role === ROLES.OWNER,
    isManager: role === ROLES.MANAGER,
    isTenant: role === ROLES.TENANT,
    // Owner và manager đều vào được khu quản trị
    isStaff: role === ROLES.OWNER || role === ROLES.MANAGER,
    // Chi nhánh cố định của manager/tenant; owner không có
    userBranch: user?.branch || null,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
}