import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api, { setActiveBranch } from '../services/api';

const BranchContext = createContext(null);

/**
 * Quản lý chi nhánh mà owner đang xem.
 *
 * owner   -> chọn được, null nghĩa là "tất cả chi nhánh"
 * manager -> luôn cố định theo chi nhánh của họ, không đổi được
 * tenant  -> không dùng context này
 */
export function BranchProvider({ children }) {
  const { isOwner, isStaff, userBranch, isAuthenticated } = useAuth();

  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Nạp danh sách chi nhánh cho owner và manager
  const fetchBranches = useCallback(async () => {
    if (!isAuthenticated || !isStaff) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isStaff]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Khôi phục lựa chọn cũ của owner sau khi tải lại trang
  useEffect(() => {
    if (!isOwner) return;
    const saved = localStorage.getItem('activeBranch');
    if (saved) {
      setActiveBranchId(saved);
      setActiveBranch(saved);
    }
  }, [isOwner]);

  // Manager luôn bị khoá vào chi nhánh của mình
  useEffect(() => {
    if (isOwner || !userBranch) return;
    const id = userBranch.id || userBranch;
    setActiveBranchId(id);
    setActiveBranch(null); // backend tự lọc rồi, không cần gửi tham số
  }, [isOwner, userBranch]);

  function selectBranch(branchId) {
    if (!isOwner) return; // chỉ owner mới đổi được
    setActiveBranchId(branchId);
    setActiveBranch(branchId);
    if (branchId) localStorage.setItem('activeBranch', branchId);
    else localStorage.removeItem('activeBranch');
  }

  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  const value = {
    branches,
    activeBranchId,
    activeBranch,
    // Owner khi chưa chọn gì thì đang xem toàn hệ thống
    isViewingAll: isOwner && !activeBranchId,
    canSwitchBranch: isOwner,
    loading,
    selectBranch,
    refreshBranches: fetchBranches,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch phải dùng bên trong BranchProvider');
  return ctx;
}