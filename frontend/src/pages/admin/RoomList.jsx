import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
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

/* ---------- Tiện ích ---------- */
const formatVnd = (n) => (n || 0).toLocaleString('vi-VN') + ' đ';

const STATUS_META = {
  vacant: { label: 'Còn trống', className: 'border-moss/30 bg-moss/15 text-moss' },
  occupied: { label: 'Đã thuê', className: 'border-brass/30 bg-brass/15 text-brass-text' },
  maintenance: { label: 'Bảo trì', className: 'border-slate-ink/25 bg-slate-ink/10 text-slate-ink' },
};

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'vacant', label: 'Còn trống' },
  { key: 'occupied', label: 'Đã thuê' },
  { key: 'maintenance', label: 'Bảo trì' },
];

const AMENITY_OPTIONS = ['Gác lửng', 'Máy lạnh', 'Nóng lạnh', 'Wifi', 'Ban công', 'Chỗ để xe', 'Bếp riêng', 'Cửa sổ'];

function StatCard({ label, value, accent = 'text-navy' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <p className="m-0 text-[13px] text-slate-ink">{label}</p>
      <p className={`m-0 mt-1 font-display text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

export default function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({ total: 0, vacant: 0, occupied: 0, maintenance: 0, monthlyRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (debounced) params.search = debounced;

      const res = await api.get('/rooms', { params });
      setRooms(res.data.rooms);
      setStats(res.data.stats);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách phòng.'));
    } finally {
      setLoading(false);
    }
  }, [filter, debounced]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  }

  async function handleDelete(room) {
    try {
      await api.delete(`/rooms/${room.id}`);
      flash(`Đã xoá phòng ${room.roomNumber}.`);
      setDeleting(null);
      fetchRooms();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xoá được phòng.'));
      setDeleting(null);
    }
  }

  async function handleToggleMaintenance(room) {
    try {
      await api.put(`/rooms/${room.id}`, {
        status: room.status === 'maintenance' ? 'vacant' : 'maintenance',
      });
      flash(
        room.status === 'maintenance'
          ? `Phòng ${room.roomNumber} đã hoạt động trở lại.`
          : `Phòng ${room.roomNumber} chuyển sang bảo trì.`
      );
      fetchRooms();
    } catch (err) {
      setError(getErrorMessage(err, 'Không cập nhật được.'));
    }
  }

  async function handleRemoveTenant(roomId, tenantId, tenantName) {
    try {
      await api.delete(`/rooms/${roomId}/tenants/${tenantId}`);
      flash(`Đã chuyển ${tenantName} ra khỏi phòng.`);
      fetchRooms();
    } catch (err) {
      setError(getErrorMessage(err, 'Không thực hiện được.'));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-xl font-semibold">Quản lý phòng trọ</h2>
          <p className="mt-1 text-sm text-slate-ink">Thêm phòng, cập nhật giá và xếp người thuê vào phòng.</p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Thêm phòng
        </button>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert type="error" onClose={() => setError('')}>{error}</Alert>

      {/* ---------- Thống kê ---------- */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng số phòng" value={stats.total} />
        <StatCard label="Còn trống" value={stats.vacant} accent="text-moss" />
        <StatCard label="Đã cho thuê" value={stats.occupied} accent="text-brass-text" />
        <StatCard label="Doanh thu / tháng" value={formatVnd(stats.monthlyRevenue)} />
      </div>

      {/* ---------- Bộ lọc ---------- */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                filter === f.key ? 'bg-navy text-paper' : 'text-slate-ink hover:text-navy'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          className={`${inputClass} max-w-[220px]`}
          placeholder="Tìm số phòng…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ---------- Danh sách phòng ---------- */}
      {loading ? (
        <p className="py-10 text-center text-slate-ink">Đang tải…</p>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="m-0 text-slate-ink">
            {search || filter ? 'Không có phòng nào khớp bộ lọc.' : 'Chưa có phòng nào. Hãy thêm phòng đầu tiên.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => {
            const meta = STATUS_META[room.status];
            return (
              <article key={room.id} className="flex flex-col rounded-xl border border-line bg-white p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 font-display text-lg font-semibold text-navy">
                      Phòng {room.roomNumber}
                    </h3>
                    <p className="m-0 text-[13px] text-slate-ink">
                      Tầng {room.floor}
                      {room.area ? ` · ${room.area} m²` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>

                <p className="m-0 mb-3 font-display text-xl font-semibold text-navy">
                  {formatVnd(room.price)}
                  <span className="text-sm font-normal text-slate-ink"> / tháng</span>
                </p>

                {room.amenities.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="rounded bg-paper px-2 py-0.5 text-xs text-slate-ink">{a}</span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span className="rounded bg-paper px-2 py-0.5 text-xs text-slate-ink">
                        +{room.amenities.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Người thuê */}
                <div className="mb-4 flex-1 border-t border-line pt-3">
                  <p className="m-0 mb-2 text-[13px] font-medium text-slate-ink">
                    Người thuê ({room.tenants.length}/{room.maxOccupants})
                  </p>
                  {room.tenants.length === 0 ? (
                    <p className="m-0 text-[13px] text-slate-ink/70">Chưa có ai ở</p>
                  ) : (
                    <ul className="m-0 list-none space-y-1.5 p-0">
                      {room.tenants.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                          <span className="min-w-0 truncate text-navy">
                            {t.name}
                            {t.phone && <span className="text-slate-ink"> · {t.phone}</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTenant(room.id, t.id, t.name)}
                            className="shrink-0 text-xs text-danger underline"
                          >
                            Chuyển ra
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {room.status !== 'maintenance' && room.tenants.length < room.maxOccupants && (
                    <button
                      type="button"
                      onClick={() => setAssigning(room)}
                      className="rounded-md bg-navy px-2.5 py-1.5 text-[13px] font-medium text-paper hover:bg-navy-soft"
                    >
                      Xếp người thuê
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(room);
                      setFormOpen(true);
                    }}
                    className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                  >
                    Sửa
                  </button>
                  {room.tenants.length === 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleMaintenance(room)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                    >
                      {room.status === 'maintenance' ? 'Mở lại' : 'Bảo trì'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleting(room)}
                    className="rounded-md border border-danger/40 px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger/5"
                  >
                    Xoá
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <RoomFormModal
          room={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(msg) => {
            setFormOpen(false);
            flash(msg);
            fetchRooms();
          }}
        />
      )}

      {assigning && (
        <AssignTenantModal
          room={assigning}
          onClose={() => setAssigning(null)}
          onSaved={(msg) => {
            setAssigning(null);
            flash(msg);
            fetchRooms();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-[360px] rounded-xl border border-line bg-white p-6">
            <h3 className="mb-2 font-display text-lg font-semibold">Xoá phòng?</h3>
            <p className="mb-5 text-sm leading-relaxed text-slate-ink">
              Phòng <strong className="text-navy">{deleting.roomNumber}</strong> sẽ bị xoá vĩnh viễn.
              Thao tác này không thể hoàn tác.
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

/* ---------- Modal thêm / sửa phòng ---------- */
function RoomFormModal({ room, onClose, onSaved }) {
  const isEdit = !!room;
  const [form, setForm] = useState({
    roomNumber: room?.roomNumber || '',
    floor: room?.floor ?? 1,
    area: room?.area || '',
    price: room?.price || '',
    deposit: room?.deposit || '',
    maxOccupants: room?.maxOccupants ?? 2,
    electricityPrice: room?.electricityPrice ?? 3500,
    waterPrice: room?.waterPrice ?? 20000,
    amenities: room?.amenities || [],
    description: room?.description || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleAmenity(a) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!form.roomNumber.trim()) errs.roomNumber = 'Vui lòng nhập số phòng.';
    if (form.price === '' || Number(form.price) < 0) errs.price = 'Vui lòng nhập giá thuê hợp lệ.';
    if (Number(form.maxOccupants) < 1) errs.maxOccupants = 'Tối thiểu 1 người.';
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setSubmitting(true);
    try {
      const payload = {
        roomNumber: form.roomNumber.trim(),
        floor: Number(form.floor) || 1,
        area: form.area === '' ? undefined : Number(form.area),
        price: Number(form.price),
        deposit: form.deposit === '' ? 0 : Number(form.deposit),
        maxOccupants: Number(form.maxOccupants),
        electricityPrice: Number(form.electricityPrice),
        waterPrice: Number(form.waterPrice),
        amenities: form.amenities,
        description: form.description.trim(),
      };

      if (isEdit) {
        await api.put(`/rooms/${room.id}`, payload);
        onSaved(`Đã cập nhật phòng ${payload.roomNumber}.`);
      } else {
        await api.post('/rooms', payload);
        onSaved(`Đã thêm phòng ${payload.roomNumber}.`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được phòng.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-[520px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">
          {isEdit ? `Sửa phòng ${room.roomNumber}` : 'Thêm phòng mới'}
        </h3>
        <p className="mb-5 text-sm text-slate-ink">Thông tin này dùng để lập hợp đồng và tính hoá đơn.</p>

        <Alert type="error" onClose={() => setError('')}>{error}</Alert>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="rm-number">Số phòng</label>
              <input
                id="rm-number"
                className={`${inputClass} ${fieldErrors.roomNumber ? inputErrorClass : ''}`}
                placeholder="101"
                value={form.roomNumber}
                onChange={(e) => set('roomNumber', e.target.value)}
              />
              <FieldError>{fieldErrors.roomNumber}</FieldError>
            </div>
            <div>
              <label className={labelClass} htmlFor="rm-floor">Tầng</label>
              <input id="rm-floor" type="number" min="0" className={inputClass}
                value={form.floor} onChange={(e) => set('floor', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="rm-area">Diện tích (m²)</label>
              <input id="rm-area" type="number" min="0" className={inputClass}
                value={form.area} onChange={(e) => set('area', e.target.value)} />
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="rm-price">Giá thuê / tháng</label>
              <input
                id="rm-price"
                type="number"
                min="0"
                className={`${inputClass} ${fieldErrors.price ? inputErrorClass : ''}`}
                placeholder="2500000"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
              <FieldError>{fieldErrors.price}</FieldError>
            </div>
            <div>
              <label className={labelClass} htmlFor="rm-deposit">Tiền cọc</label>
              <input id="rm-deposit" type="number" min="0" className={inputClass}
                value={form.deposit} onChange={(e) => set('deposit', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="rm-max">Số người tối đa</label>
              <input
                id="rm-max"
                type="number"
                min="1"
                className={`${inputClass} ${fieldErrors.maxOccupants ? inputErrorClass : ''}`}
                value={form.maxOccupants}
                onChange={(e) => set('maxOccupants', e.target.value)}
              />
              <FieldError>{fieldErrors.maxOccupants}</FieldError>
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="rm-elec">Giá điện (đ/kWh)</label>
              <input id="rm-elec" type="number" min="0" className={inputClass}
                value={form.electricityPrice} onChange={(e) => set('electricityPrice', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="rm-water">Giá nước (đ/m³)</label>
              <input id="rm-water" type="number" min="0" className={inputClass}
                value={form.waterPrice} onChange={(e) => set('waterPrice', e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <span className={labelClass}>Tiện nghi</span>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const on = form.amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                      on ? 'border-navy bg-navy text-paper' : 'border-line bg-white text-slate-ink hover:border-navy/40'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <label className={labelClass} htmlFor="rm-desc">Ghi chú</label>
            <textarea
              id="rm-desc"
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Hướng cửa, vị trí, lưu ý riêng…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
            <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Modal xếp người thuê ---------- */
function AssignTenantModal({ room, onClose, onSaved }) {
  const [tenants, setTenants] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/rooms/available-tenants')
      .then((res) => setTenants(res.data.tenants))
      .catch((err) => setError(getErrorMessage(err, 'Không tải được danh sách người thuê.')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) return setError('Vui lòng chọn người thuê.');

    setSubmitting(true);
    try {
      const res = await api.post(`/rooms/${room.id}/tenants`, { tenantId: selected });
      onSaved(res.data.message);
    } catch (err) {
      setError(getErrorMessage(err, 'Không xếp được người thuê.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">Xếp người thuê vào phòng {room.roomNumber}</h3>
        <p className="mb-5 text-sm text-slate-ink">
          Còn {room.maxOccupants - room.tenants.length} chỗ trong phòng này.
        </p>

        <Alert type="error" onClose={() => setError('')}>{error}</Alert>

        {loading ? (
          <p className="py-4 text-center text-sm text-slate-ink">Đang tải…</p>
        ) : tenants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
            <p className="m-0 text-sm text-slate-ink">
              Không có người thuê nào đang chờ xếp phòng. Hãy duyệt tài khoản ở trang Quản lý tài khoản trước.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className={labelClass} htmlFor="as-tenant">Chọn người thuê</label>
              <select
                id="as-tenant"
                className={inputClass}
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setError('');
                }}
              >
                <option value="">— Chọn —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.phone || t.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-ink">Chỉ hiện những người đã được duyệt và chưa có phòng.</p>
            </div>

            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
              <button type="submit" className={`${btnPrimary} flex-1`} disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Đang xếp…' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}

        {!loading && tenants.length === 0 && (
          <button type="button" onClick={onClose} className={`${btnGhost} mt-4 w-full`}>Đóng</button>
        )}
      </div>
    </div>
  );
}