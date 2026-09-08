import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import {
  inputClass,
  inputErrorClass,
  labelClass,
  btnPrimary,
  btnGhost,
  Spinner,
  Alert,
  FieldError,
  getErrorMessage,
} from '../../components/accountUi';

const formatVnd = (n) => (n || 0).toLocaleString('vi-VN') + ' đ';

function StatLine({ label, value }) {
  return (
    <div>
      <p className="m-0 text-xs text-slate-ink">{label}</p>
      <p className="m-0 mt-0.5 font-display text-lg font-semibold text-navy">{value}</p>
    </div>
  );
}

export default function BranchList() {
  const { refreshBranches } = useBranch();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [managerFor, setManagerFor] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      setBranches(res.data.branches);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách chi nhánh.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
    // Đồng bộ lại bộ chọn chi nhánh trên Header
    refreshBranches();
  }

  async function handleDelete(branch) {
    try {
      await api.delete(`/branches/${branch.id}`);
      flash(`Đã xoá chi nhánh ${branch.name}.`);
      setDeleting(null);
      fetchBranches();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xoá được chi nhánh.'));
      setDeleting(null);
    }
  }

  async function handleToggleActive(branch) {
    try {
      await api.put(`/branches/${branch.id}`, { isActive: !branch.isActive });
      flash(
        branch.isActive
          ? `Đã ngừng hoạt động ${branch.name}.`
          : `${branch.name} đã hoạt động trở lại.`
      );
      fetchBranches();
    } catch (err) {
      setError(getErrorMessage(err, 'Không cập nhật được.'));
    }
  }

  const totals = branches.reduce(
    (acc, b) => ({
      rooms: acc.rooms + (b.stats?.totalRooms || 0),
      occupied: acc.occupied + (b.stats?.occupied || 0),
      revenue: acc.revenue + (b.stats?.revenue || 0),
    }),
    { rooms: 0, occupied: 0, revenue: 0 }
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-xl font-semibold">Quản lý chi nhánh</h2>
          <p className="mt-1 text-sm text-slate-ink">
            Mỗi chi nhánh có phòng, người thuê và quản lý riêng.
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
          + Thêm chi nhánh
        </button>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert type="error" onClose={() => setError('')}>{error}</Alert>

      {/* Tổng hợp toàn hệ thống */}
      {branches.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-white px-5 py-4">
            <p className="m-0 text-[13px] text-slate-ink">Số chi nhánh</p>
            <p className="m-0 mt-1 font-display text-2xl font-semibold text-navy">{branches.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-white px-5 py-4">
            <p className="m-0 text-[13px] text-slate-ink">Tổng số phòng</p>
            <p className="m-0 mt-1 font-display text-2xl font-semibold text-navy">{totals.rooms}</p>
          </div>
          <div className="rounded-xl border border-line bg-white px-5 py-4">
            <p className="m-0 text-[13px] text-slate-ink">Đã cho thuê</p>
            <p className="m-0 mt-1 font-display text-2xl font-semibold text-brass-text">{totals.occupied}</p>
          </div>
          <div className="rounded-xl border border-line bg-white px-5 py-4">
            <p className="m-0 text-[13px] text-slate-ink">Doanh thu / tháng</p>
            <p className="m-0 mt-1 font-display text-2xl font-semibold text-navy">{formatVnd(totals.revenue)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-ink">Đang tải…</p>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="m-0 text-slate-ink">Chưa có chi nhánh nào. Hãy tạo chi nhánh đầu tiên.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {branches.map((b) => (
            <article key={b.id} className="rounded-xl border border-line bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 font-display text-lg font-semibold text-navy">{b.name}</h3>
                    <span className="rounded bg-paper px-2 py-0.5 font-mono text-xs text-slate-ink">{b.code}</span>
                    {!b.isActive && (
                      <span className="rounded-full border border-slate-ink/25 bg-slate-ink/10 px-2 py-0.5 text-xs text-slate-ink">
                        Ngừng hoạt động
                      </span>
                    )}
                  </div>
                  <p className="m-0 mt-1 text-[13px] text-slate-ink">{b.address}</p>
                  {b.phone && <p className="m-0 text-[13px] text-slate-ink">{b.phone}</p>}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-4 gap-3 border-y border-line py-3.5">
                <StatLine label="Phòng" value={b.stats?.totalRooms ?? 0} />
                <StatLine label="Trống" value={b.stats?.vacant ?? 0} />
                <StatLine label="Người thuê" value={b.stats?.tenants ?? 0} />
                <StatLine label="Doanh thu" value={formatVnd(b.stats?.revenue)} />
              </div>

              <div className="mb-4">
                <p className="m-0 text-xs text-slate-ink">Quản lý chi nhánh</p>
                {b.manager ? (
                  <p className="m-0 mt-0.5 text-sm font-medium text-navy">
                    {b.manager.name}
                    {b.manager.phone && <span className="font-normal text-slate-ink"> · {b.manager.phone}</span>}
                  </p>
                ) : (
                  <p className="m-0 mt-0.5 text-sm text-slate-ink/70">Chưa giao cho ai</p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setManagerFor(b)}
                  className="rounded-md bg-navy px-2.5 py-1.5 text-[13px] font-medium text-paper hover:bg-navy-soft"
                >
                  {b.manager ? 'Đổi quản lý' : 'Giao quản lý'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(b);
                    setFormOpen(true);
                  }}
                  className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(b)}
                  className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                >
                  {b.isActive ? 'Ngừng hoạt động' : 'Mở lại'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(b)}
                  className="rounded-md border border-danger/40 px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger/5"
                >
                  Xoá
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <BranchFormModal
          branch={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(msg) => {
            setFormOpen(false);
            flash(msg);
            fetchBranches();
          }}
        />
      )}

      {managerFor && (
        <AssignManagerModal
          branch={managerFor}
          onClose={() => setManagerFor(null)}
          onSaved={(msg) => {
            setManagerFor(null);
            flash(msg);
            fetchBranches();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
            <h3 className="mb-2 font-display text-lg font-semibold">Xoá chi nhánh?</h3>
            <p className="mb-5 text-sm leading-relaxed text-slate-ink">
              Chi nhánh <strong className="text-navy">{deleting.name}</strong> sẽ bị xoá vĩnh viễn.
              Chỉ xoá được khi không còn phòng và tài khoản nào thuộc chi nhánh này.
            </p>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setDeleting(null)} className={`${btnGhost} flex-1`}>Huỷ</button>
              <button
                type="button"
                onClick={() => handleDelete(deleting)}
                className="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Modal thêm / sửa chi nhánh ---------- */
function BranchFormModal({ branch, onClose, onSaved }) {
  const isEdit = !!branch;
  const [form, setForm] = useState({
    name: branch?.name || '',
    code: branch?.code || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    defaultElectricityPrice: branch?.defaultElectricityPrice ?? 3500,
    defaultWaterPrice: branch?.defaultWaterPrice ?? 20000,
    note: branch?.note || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên chi nhánh.';
    if (!form.code.trim()) errs.code = 'Vui lòng nhập mã chi nhánh.';
    else if (!/^[A-Za-z0-9-]{2,10}$/.test(form.code.trim())) {
      errs.code = 'Mã gồm 2-10 ký tự chữ, số hoặc gạch ngang.';
    }
    if (!form.address.trim()) errs.address = 'Vui lòng nhập địa chỉ.';
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        phone: form.phone.trim() || undefined,
        defaultElectricityPrice: Number(form.defaultElectricityPrice),
        defaultWaterPrice: Number(form.defaultWaterPrice),
        note: form.note.trim(),
      };

      if (isEdit) {
        await api.put(`/branches/${branch.id}`, payload);
        onSaved(`Đã cập nhật ${payload.name}.`);
      } else {
        await api.post('/branches', payload);
        onSaved(`Đã thêm chi nhánh ${payload.name}.`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được chi nhánh.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-[480px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">
          {isEdit ? `Sửa ${branch.name}` : 'Thêm chi nhánh mới'}
        </h3>
        <p className="mb-5 text-sm text-slate-ink">
          Đơn giá điện nước ở đây là mặc định, phòng mới sẽ lấy theo và có thể sửa riêng.
        </p>

        <Alert type="error" onClose={() => setError('')}>{error}</Alert>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <label className={labelClass} htmlFor="br-name">Tên chi nhánh</label>
              <input
                id="br-name"
                className={`${inputClass} ${fieldErrors.name ? inputErrorClass : ''}`}
                placeholder="Cơ sở Thủ Đức"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>
            <div>
              <label className={labelClass} htmlFor="br-code">Mã</label>
              <input
                id="br-code"
                className={`${inputClass} uppercase ${fieldErrors.code ? inputErrorClass : ''}`}
                placeholder="TD"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
              />
              <FieldError>{fieldErrors.code}</FieldError>
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass} htmlFor="br-address">Địa chỉ</label>
            <input
              id="br-address"
              className={`${inputClass} ${fieldErrors.address ? inputErrorClass : ''}`}
              placeholder="123 Võ Văn Ngân, Thủ Đức"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
            <FieldError>{fieldErrors.address}</FieldError>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="br-phone">Số điện thoại</label>
              <input id="br-phone" type="tel" className={inputClass}
                value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="br-elec">Giá điện (đ/kWh)</label>
              <input id="br-elec" type="number" min="0" className={inputClass}
                value={form.defaultElectricityPrice} onChange={(e) => set('defaultElectricityPrice', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="br-water">Giá nước (đ/m³)</label>
              <input id="br-water" type="number" min="0" className={inputClass}
                value={form.defaultWaterPrice} onChange={(e) => set('defaultWaterPrice', e.target.value)} />
            </div>
          </div>

          <div className="mb-5">
            <label className={labelClass} htmlFor="br-note">Ghi chú</label>
            <textarea
              id="br-note"
              rows={2}
              className={`${inputClass} resize-none`}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm chi nhánh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Modal giao quản lý ---------- */
function AssignManagerModal({ branch, onClose, onSaved }) {
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Chỉ chọn được người đã duyệt, chưa thuê phòng
    api
      .get('/users', { params: { role: 'tenant', status: 'approved', limit: 100 } })
      .then((res) => setCandidates(res.data.users.filter((u) => !u.room)))
      .catch((err) => setError(getErrorMessage(err, 'Không tải được danh sách tài khoản.')))
      .finally(() => setLoading(false));
  }, []);

  async function submit(userId) {
    setSubmitting(true);
    try {
      const res = await api.patch(`/branches/${branch.id}/manager`, { userId });
      onSaved(res.data.message);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thực hiện được.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">Giao quản lý {branch.name}</h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-ink">
          Người được chọn sẽ chuyển sang vai trò quản lý và chỉ thao tác được trong chi nhánh này.
        </p>

        <Alert type="error" onClose={() => setError('')}>{error}</Alert>

        {branch.manager && (
          <div className="mb-4 rounded-lg border border-line bg-paper/50 px-3.5 py-3">
            <p className="m-0 text-xs text-slate-ink">Quản lý hiện tại</p>
            <p className="m-0 mt-0.5 text-sm font-medium text-navy">{branch.manager.name}</p>
            <button
              type="button"
              onClick={() => submit(null)}
              disabled={submitting}
              className="mt-2 text-xs text-danger underline"
            >
              Gỡ quyền quản lý
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-4 text-center text-sm text-slate-ink">Đang tải…</p>
        ) : candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
            <p className="m-0 text-sm text-slate-ink">
              Không có tài khoản nào phù hợp. Người quản lý phải là tài khoản đã duyệt và chưa thuê phòng.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selected) return setError('Vui lòng chọn một tài khoản.');
              submit(selected);
            }}
          >
            <div className="mb-5">
              <label className={labelClass} htmlFor="am-user">Chọn tài khoản</label>
              <select
                id="am-user"
                className={inputClass}
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setError('');
                }}
              >
                <option value="">— Chọn —</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.phone || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
              <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Đang lưu…' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}

        {!loading && candidates.length === 0 && (
          <button type="button" onClick={onClose} className={`${btnGhost} mt-4 w-full`}>Đóng</button>
        )}
      </div>
    </div>
  );
}