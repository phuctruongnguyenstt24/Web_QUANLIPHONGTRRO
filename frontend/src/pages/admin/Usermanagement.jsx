import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

/* ---------- Tiện ích hiển thị thời gian ---------- */
function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "3 giờ trước", "2 ngày trước" — dễ đọc hơn ngày giờ đầy đủ
function timeAgo(value) {
  if (!value) return 'Chưa đăng nhập';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDateTime(value);
}

function getErrorMessage(err, fallback = 'Đã có lỗi xảy ra.') {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ.';
  return fallback;
}

/* ---------- Lớp Tailwind dùng lại ---------- */
const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-slate-ink/50 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-60';
const labelClass = 'mb-1.5 block text-[13px] font-medium text-navy';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-paper';

const STATUS_META = {
  pending: { label: 'Chờ duyệt', className: 'bg-brass/15 text-brass-text border-brass/30' },
  approved: { label: 'Đã duyệt', className: 'bg-moss/15 text-moss border-moss/30' },
  rejected: { label: 'Từ chối', className: 'bg-danger/10 text-danger border-danger/30' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const TABS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đang hoạt động' },
  { key: 'rejected', label: 'Đã từ chối' },
  { key: '', label: 'Tất cả' },
];

export default function UserManagement() {
  const { isOwner, user: currentUser } = useAuth();
  const { branches, activeBranchId } = useBranch();

  const [users, setUsers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [approving, setApproving] = useState(null); // tài khoản chưa có chi nhánh
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'reject', user }

  const activeBranches = branches.filter((b) => b.isActive);

  // Chờ người dùng gõ xong mới gọi API, tránh bắn request mỗi ký tự
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Tham số branch do interceptor trong api.js tự thêm theo chi nhánh
      // owner đang xem, nên ở đây không cần truyền tay.
      const params = { role: 'tenant' };
      if (tab) params.status = tab;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/users', { params });
      setUsers(res.data.users);
      setPendingCount(res.data.pendingCount);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách tài khoản.'));
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, activeBranchId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  }

  async function handleApprove(user, branchId) {
    try {
      // Người tự đăng ký chưa thuộc chi nhánh nào, phải gán khi duyệt
      await api.patch(`/users/${user.id}/approve`, branchId ? { branch: branchId } : {});
      flash(`Đã phê duyệt tài khoản ${user.name}.`);
      setApproving(null);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Không phê duyệt được.'));
      setApproving(null);
    }
  }

  // Bấm Duyệt: nếu tài khoản chưa có chi nhánh thì hỏi trước
  function startApprove(user) {
    if (!user.branch) {
      setApproving(user);
      return;
    }
    handleApprove(user, null);
  }

  async function handleReject(user, reason) {
    try {
      await api.patch(`/users/${user.id}/reject`, { reason });
      flash(`Đã từ chối tài khoản ${user.name}.`);
      setConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Không từ chối được.'));
      setConfirm(null);
    }
  }

  async function handleDelete(user) {
    try {
      await api.delete(`/users/${user.id}`);
      flash(`Đã xoá tài khoản ${user.name}.`);
      setConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xoá được tài khoản.'));
      setConfirm(null);
    }
  }

  async function handleToggleActive(user) {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      flash(user.isActive ? `Đã khoá tài khoản ${user.name}.` : `Đã mở khoá tài khoản ${user.name}.`);
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Không cập nhật được.'));
    }
  }

  return (
    <div>
      {/* ---------- Thanh tiêu đề ---------- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-xl font-semibold">Quản lý tài khoản người thuê</h2>
          <p className="mt-1 text-sm text-slate-ink">
            {isOwner
              ? 'Duyệt đăng ký, phân bổ chi nhánh và theo dõi hoạt động truy cập.'
              : `Người thuê thuộc ${currentUser?.branch?.name || 'chi nhánh của bạn'}.`}
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Tạo tài khoản
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-moss/30 bg-moss/10 px-3 py-2.5 text-sm text-moss">{notice}</div>
      )}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <span>{error}</span>
          <button onClick={() => setError('')} className="shrink-0 text-danger underline">Đóng</button>
        </div>
      )}

      {/* ---------- Tab + tìm kiếm ---------- */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key || 'all'}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                tab === t.key ? 'bg-navy text-paper' : 'text-slate-ink hover:text-navy'
              }`}
            >
              {t.label}
              {t.key === 'pending' && pendingCount > 0 && (
                <span className="rounded-full bg-brass px-1.5 py-0.5 text-[11px] font-semibold text-navy">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          type="search"
          className={`${inputClass} max-w-[260px]`}
          placeholder="Tìm theo tên, email, SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ---------- Bảng ---------- */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-left text-[13px] text-slate-ink">
              <th className="px-4 py-3 font-medium">Người thuê</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              {isOwner && <th className="px-4 py-3 font-medium">Chi nhánh</th>}
              <th className="px-4 py-3 font-medium">Phòng</th>
              <th className="px-4 py-3 font-medium">Ngày đăng ký</th>
              <th className="px-4 py-3 font-medium">Truy cập gần nhất</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="px-4 py-10 text-center text-slate-ink">Đang tải…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="px-4 py-10 text-center text-slate-ink">
                  {tab === 'pending' ? 'Không có tài khoản nào chờ duyệt.' : 'Chưa có tài khoản nào.'}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <p className="m-0 font-medium text-navy">
                      {u.name}
                      {!u.isActive && (
                        <span className="ml-2 rounded bg-slate-ink/10 px-1.5 py-0.5 text-[11px] text-slate-ink">
                          Đã khoá
                        </span>
                      )}
                    </p>
                    <p className="m-0 text-[13px] text-slate-ink">{u.email || u.phone}</p>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                    {u.status === 'rejected' && u.rejectionReason && (
                      <p className="m-0 mt-1 max-w-[180px] text-xs text-slate-ink">{u.rejectionReason}</p>
                    )}
                  </td>

                  {isOwner && (
                    <td className="px-4 py-3">
                      {u.branch?.name ? (
                        <span className="text-navy">{u.branch.name}</span>
                      ) : (
                        <span className="rounded bg-brass/15 px-2 py-0.5 text-xs text-brass-text">
                          Chưa phân bổ
                        </span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-slate-ink">
                    {u.room?.roomNumber ? `Phòng ${u.room.roomNumber}` : '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-ink">{formatDateTime(u.createdAt)}</td>

                  <td className="px-4 py-3">
                    <p className="m-0 text-navy">{timeAgo(u.lastLoginAt)}</p>
                    <p className="m-0 text-xs text-slate-ink">{u.loginCount || 0} lượt đăng nhập</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {u.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => startApprove(u)}
                            className="rounded-md bg-moss px-2.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ type: 'reject', user: u })}
                            className="rounded-md border border-danger/40 px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger/5"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {u.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                        >
                          {u.isActive ? 'Khoá' : 'Mở khoá'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirm({ type: 'delete', user: u })}
                        className="rounded-md border border-danger/40 px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger/5"
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <UserFormModal
          user={editing}
          isOwner={isOwner}
          branches={activeBranches}
          defaultBranch={activeBranchId}
          onClose={() => setFormOpen(false)}
          onSaved={(msg) => {
            setFormOpen(false);
            flash(msg);
            fetchUsers();
          }}
        />
      )}

      {approving && (
        <ApproveBranchModal
          user={approving}
          branches={activeBranches}
          defaultBranch={activeBranchId}
          onClose={() => setApproving(null)}
          onConfirm={(branchId) => handleApprove(approving, branchId)}
        />
      )}

      {confirm && (
        <ConfirmModal
          data={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={(reason) =>
            confirm.type === 'delete' ? handleDelete(confirm.user) : handleReject(confirm.user, reason)
          }
        />
      )}
    </div>
  );
}

/* ---------- Modal chọn chi nhánh khi duyệt ---------- */
function ApproveBranchModal({ user, branches, defaultBranch, onClose, onConfirm }) {
  const [branchId, setBranchId] = useState(defaultBranch || '');
  const [error, setError] = useState('');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[400px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">Phê duyệt tài khoản</h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-ink">
          <strong className="text-navy">{user.name}</strong> đăng ký trực tiếp nên chưa thuộc chi nhánh nào.
          Chọn chi nhánh để họ được xếp phòng ở đó.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        {branches.length === 0 ? (
          <div className="mb-5 rounded-lg border border-dashed border-line px-4 py-5 text-center">
            <p className="m-0 text-sm text-slate-ink">
              Chưa có chi nhánh nào đang hoạt động. Hãy tạo chi nhánh trước.
            </p>
          </div>
        ) : (
          <div className="mb-5">
            <label className={labelClass} htmlFor="ap-branch">Chi nhánh</label>
            <select
              id="ap-branch"
              className={inputClass}
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setError('');
              }}
            >
              <option value="">— Chọn chi nhánh —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.stats?.vacant ?? 0} phòng trống)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
          <button
            type="button"
            onClick={() => {
              if (!branchId) return setError('Vui lòng chọn chi nhánh.');
              onConfirm(branchId);
            }}
            className={`${btnPrimary} flex-1`}
            disabled={branches.length === 0}
          >
            Duyệt
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Modal tạo / sửa tài khoản ---------- */
function UserFormModal({ user, isOwner, branches, defaultBranch, onClose, onSaved }) {
  const isEdit = !!user;
  const [branchId, setBranchId] = useState(user?.branch?.id || defaultBranch || '');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    idCard: user?.idCard || '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Owner phải chọn chi nhánh; manager thì backend tự lấy từ token
  const needBranch = isOwner && !isEdit;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Vui lòng nhập họ tên.');
    if (!form.email.trim() && !form.phone.trim()) return setError('Cần có email hoặc số điện thoại.');
    if (!isEdit && form.password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');
    if (needBranch && !branchId) return setError('Vui lòng chọn chi nhánh.');

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        idCard: form.idCard.trim() || undefined,
      };

      if (isEdit) {
        // Owner đổi được chi nhánh của người chưa thuê phòng
        if (isOwner && branchId && branchId !== user.branch?.id) {
          payload.branch = branchId;
        }
        await api.put(`/users/${user.id}`, payload);
        onSaved(`Đã cập nhật tài khoản ${payload.name}.`);
      } else {
        await api.post('/users', {
          ...payload,
          password: form.password,
          role: 'tenant',
          branch: branchId || undefined,
        });
        onSaved(`Đã tạo tài khoản ${payload.name}.`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-[440px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">
          {isEdit ? 'Sửa tài khoản' : 'Tạo tài khoản người thuê'}
        </h3>
        <p className="mb-5 text-sm text-slate-ink">
          {isEdit ? 'Cập nhật thông tin của người thuê.' : 'Tài khoản do bạn tạo sẽ được duyệt sẵn.'}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isOwner && (
            <div className="mb-3.5">
              <label className={labelClass} htmlFor="uf-branch">Chi nhánh</label>
              <select
                id="uf-branch"
                className={inputClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={isEdit && !!user.room}
              >
                <option value="">— Chọn chi nhánh —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {isEdit && user.room && (
                <p className="mt-1 text-xs text-slate-ink">
                  Người này đang thuê phòng, hãy chuyển họ ra khỏi phòng trước khi đổi chi nhánh.
                </p>
              )}
            </div>
          )}

          <div className="mb-3.5">
            <label className={labelClass} htmlFor="uf-name">Họ tên</label>
            <input id="uf-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="uf-email">Email</label>
              <input id="uf-email" type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="uf-phone">Số điện thoại</label>
              <input id="uf-phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="mb-3.5">
            <label className={labelClass} htmlFor="uf-idcard">CCCD / CMND</label>
            <input id="uf-idcard" className={inputClass} value={form.idCard} onChange={(e) => set('idCard', e.target.value)} />
          </div>

          {!isEdit && (
            <div className="mb-3.5">
              <label className={labelClass} htmlFor="uf-password">Mật khẩu</label>
              <input
                id="uf-password"
                type="text"
                className={inputClass}
                placeholder="Ít nhất 6 ký tự"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-ink">Gửi mật khẩu này cho người thuê và nhắc họ đổi sau khi đăng nhập.</p>
            </div>
          )}

          <div className="mt-5 flex gap-2.5">
            <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Modal xác nhận xoá / từ chối ---------- */
function ConfirmModal({ data, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const isDelete = data.type === 'delete';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">
          {isDelete ? 'Xoá tài khoản?' : 'Từ chối đăng ký?'}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-ink">
          {isDelete ? (
            <>
              Tài khoản <strong className="text-navy">{data.user.name}</strong> sẽ bị xoá vĩnh viễn. Thao tác này không thể hoàn tác.
            </>
          ) : (
            <>
              <strong className="text-navy">{data.user.name}</strong> sẽ không đăng nhập được. Bạn có thể ghi lý do để họ biết.
            </>
          )}
        </p>

        {!isDelete && (
          <div className="mb-4">
            <label className={labelClass} htmlFor="cf-reason">Lý do (không bắt buộc)</label>
            <input
              id="cf-reason"
              className={inputClass}
              placeholder="Ví dụ: hết phòng trống"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {isDelete ? 'Xoá' : 'Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}