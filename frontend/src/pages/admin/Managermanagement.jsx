import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

/* ---------- Tiện ích ---------- */
function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-slate-ink/50 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-60';
const labelClass = 'mb-1.5 block text-[13px] font-medium text-navy';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-paper';

export default function ManagerManagement() {
  const { user: currentUser } = useAuth();
  const { branches, refreshBranches } = useBranch();

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'demote', user }
  const [resetting, setResetting] = useState(null);

  const activeBranches = branches.filter((b) => b.isActive);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { role: 'manager', limit: 100 };
      if (debounced) params.search = debounced;

      const res = await api.get('/users', { params });
      setManagers(res.data.users);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách quản lý.'));
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  }

  async function handleToggleActive(user) {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      flash(user.isActive ? `Đã khoá tài khoản ${user.name}.` : `Đã mở khoá tài khoản ${user.name}.`);
      fetchManagers();
    } catch (err) {
      setError(getErrorMessage(err, 'Không cập nhật được.'));
    }
  }

  // Hạ quyền: chuyển về vai trò người thuê nhưng giữ tài khoản
  async function handleDemote(user) {
    try {
      await api.put(`/users/${user.id}`, { role: 'tenant' });
      flash(`${user.name} đã trở lại vai trò người thuê.`);
      setConfirm(null);
      fetchManagers();
      refreshBranches();
    } catch (err) {
      setError(getErrorMessage(err, 'Không hạ quyền được.'));
      setConfirm(null);
    }
  }

  async function handleDelete(user) {
    try {
      await api.delete(`/users/${user.id}`);
      flash(`Đã xoá tài khoản ${user.name}.`);
      setConfirm(null);
      fetchManagers();
      refreshBranches();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xoá được tài khoản.'));
      setConfirm(null);
    }
  }

  // Chi nhánh đang hoạt động mà chưa có ai quản lý
  const uncovered = activeBranches.filter(
    (b) => !managers.some((m) => m.branch?.id === b.id && m.isActive)
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-xl font-semibold">Quản lý tài khoản quản trị</h2>
          <p className="mt-1 text-sm text-slate-ink">
            Người quản lý chỉ thao tác được trong chi nhánh được giao.
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
          + Tạo quản lý
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

      {/* Nhắc những chi nhánh chưa có người quản lý */}
      {!loading && uncovered.length > 0 && (
        <div className="mb-5 rounded-lg border border-brass/30 bg-brass/10 px-4 py-3">
          <p className="m-0 text-sm text-brass-text">
            <strong>{uncovered.length} chi nhánh</strong> chưa có người quản lý:{' '}
            {uncovered.map((b) => b.name).join(', ')}. Bạn vẫn quản lý trực tiếp được, nhưng nên giao cho ai đó phụ trách.
          </p>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-slate-ink">
          {managers.length} tài khoản quản lý trên {activeBranches.length} chi nhánh
        </p>
        <input
          type="search"
          className={`${inputClass} max-w-[260px]`}
          placeholder="Tìm theo tên, email, SĐT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-left text-[13px] text-slate-ink">
              <th className="px-4 py-3 font-medium">Người quản lý</th>
              <th className="px-4 py-3 font-medium">Chi nhánh phụ trách</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3 font-medium">Truy cập gần nhất</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-ink">Đang tải…</td></tr>
            ) : managers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="m-0 text-slate-ink">Chưa có tài khoản quản lý nào.</p>
                  <p className="m-0 mt-1 text-[13px] text-slate-ink/80">
                    Bạn có thể tạo mới tại đây, hoặc nâng một tài khoản sẵn có ở{' '}
                    <Link to="/admin/branches" className="text-brass-text underline">trang chi nhánh</Link>.
                  </p>
                </td>
              </tr>
            ) : (
              managers.map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <p className="m-0 font-medium text-navy">
                      {m.name}
                      {!m.isActive && (
                        <span className="ml-2 rounded bg-slate-ink/10 px-1.5 py-0.5 text-[11px] text-slate-ink">
                          Đã khoá
                        </span>
                      )}
                    </p>
                    <p className="m-0 text-[13px] text-slate-ink">{m.email || m.phone}</p>
                  </td>

                  <td className="px-4 py-3">
                    {m.branch?.name ? (
                      <span className="inline-block rounded-full border border-brass/30 bg-brass/15 px-2.5 py-0.5 text-xs font-medium text-brass-text">
                        {m.branch.name}
                      </span>
                    ) : (
                      <span className="text-xs text-danger">Chưa gán chi nhánh</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-ink">{formatDateTime(m.createdAt)}</td>

                  <td className="px-4 py-3">
                    <p className="m-0 text-navy">{timeAgo(m.lastLoginAt)}</p>
                    <p className="m-0 text-xs text-slate-ink">{m.loginCount || 0} lượt đăng nhập</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditing(m); setFormOpen(true); }}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetting(m)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        Đặt lại mật khẩu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        {m.isActive ? 'Khoá' : 'Mở khoá'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ type: 'demote', user: m })}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        Hạ quyền
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ type: 'delete', user: m })}
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
        <ManagerFormModal
          manager={editing}
          branches={activeBranches}
          onClose={() => setFormOpen(false)}
          onSaved={(msg) => {
            setFormOpen(false);
            flash(msg);
            fetchManagers();
            refreshBranches();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={(msg) => { setResetting(null); flash(msg); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          data={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            confirm.type === 'delete' ? handleDelete(confirm.user) : handleDemote(confirm.user)
          }
        />
      )}
    </div>
  );
}

/* ---------- Modal tạo / sửa quản lý ---------- */
function ManagerFormModal({ manager, branches, onClose, onSaved }) {
  const isEdit = !!manager;
  const [branchId, setBranchId] = useState(manager?.branch?.id || '');
  const [form, setForm] = useState({
    name: manager?.name || '',
    email: manager?.email || '',
    phone: manager?.phone || '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Vui lòng nhập họ tên.');
    if (!form.email.trim() && !form.phone.trim()) return setError('Cần có email hoặc số điện thoại.');
    if (!branchId) return setError('Vui lòng chọn chi nhánh phụ trách.');
    if (!isEdit && form.password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      if (isEdit) {
        if (branchId !== manager.branch?.id) payload.branch = branchId;
        await api.put(`/users/${manager.id}`, payload);
        onSaved(`Đã cập nhật tài khoản ${payload.name}.`);
      } else {
        await api.post('/users', {
          ...payload,
          password: form.password,
          role: 'manager',
          branch: branchId,
        });
        onSaved(`Đã tạo tài khoản quản lý ${payload.name}.`);
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
          {isEdit ? `Sửa tài khoản ${manager.name}` : 'Tạo tài khoản quản lý'}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-ink">
          Người này sẽ quản lý phòng và người thuê của chi nhánh được chọn, không thấy dữ liệu chi nhánh khác.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        {branches.length === 0 ? (
          <>
            <div className="mb-5 rounded-lg border border-dashed border-line px-4 py-5 text-center">
              <p className="m-0 text-sm text-slate-ink">
                Chưa có chi nhánh nào đang hoạt động. Hãy tạo chi nhánh trước khi giao quản lý.
              </p>
            </div>
            <button type="button" onClick={onClose} className={`${btnGhost} w-full`}>Đóng</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3.5">
              <label className={labelClass} htmlFor="mg-branch">Chi nhánh phụ trách</label>
              <select
                id="mg-branch"
                className={inputClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">— Chọn chi nhánh —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.stats?.totalRooms ?? 0} phòng)
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3.5">
              <label className={labelClass} htmlFor="mg-name">Họ tên</label>
              <input id="mg-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="mg-email">Email</label>
                <input id="mg-email" type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="mg-phone">Số điện thoại</label>
                <input id="mg-phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>

            {!isEdit && (
              <div className="mb-3.5">
                <label className={labelClass} htmlFor="mg-password">Mật khẩu</label>
                <input
                  id="mg-password"
                  type="text"
                  className={inputClass}
                  placeholder="Ít nhất 6 ký tự"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-ink">
                  Gửi mật khẩu này cho người quản lý và nhắc họ đổi ngay sau khi đăng nhập.
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2.5">
              <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
              <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Modal đặt lại mật khẩu ---------- */
function ResetPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');

    setSubmitting(true);
    try {
      await api.patch(`/users/${user.id}/reset-password`, { newPassword: password });
      onSaved(`Đã đặt lại mật khẩu cho ${user.name}.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Không đặt lại được mật khẩu.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">Đặt lại mật khẩu</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-ink">
          Đặt mật khẩu mới cho <strong className="text-navy">{user.name}</strong> và gửi cho họ.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className={labelClass} htmlFor="rp-password">Mật khẩu mới</label>
            <input
              id="rp-password"
              type="text"
              className={inputClass}
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
              {submitting ? 'Đang lưu…' : 'Đặt lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Modal xác nhận ---------- */
function ConfirmModal({ data, onClose, onConfirm }) {
  const isDelete = data.type === 'delete';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">
          {isDelete ? 'Xoá tài khoản?' : 'Hạ quyền quản lý?'}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-ink">
          {isDelete ? (
            <>
              Tài khoản <strong className="text-navy">{data.user.name}</strong> sẽ bị xoá vĩnh viễn.
              Chi nhánh {data.user.branch?.name} sẽ không còn người quản lý.
            </>
          ) : (
            <>
              <strong className="text-navy">{data.user.name}</strong> trở lại vai trò người thuê và mất
              quyền quản lý {data.user.branch?.name}. Tài khoản vẫn giữ nguyên, bạn có thể giao quyền lại sau.
            </>
          )}
        </p>

        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              isDelete
                ? 'flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90'
                : `${btnPrimary} flex-1`
            }
          >
            {isDelete ? 'Xoá' : 'Hạ quyền'}
          </button>
        </div>
      </div>
    </div>
  );
}