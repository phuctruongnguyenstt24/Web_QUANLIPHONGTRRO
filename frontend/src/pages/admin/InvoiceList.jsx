import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

/* ---------- Tiện ích ---------- */
const formatVnd = (n) => (n || 0).toLocaleString('vi-VN') + ' đ';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function getErrorMessage(err, fallback = 'Đã có lỗi xảy ra.') {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ.';
  return fallback;
}

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:bg-paper/60 disabled:opacity-70';
const labelClass = 'mb-1.5 block text-[13px] font-medium text-navy';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70';
const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-paper';

const STATUS_META = {
  unpaid: { label: 'Chưa thu', className: 'border-danger/30 bg-danger/10 text-danger' },
  pending: { label: 'Chờ xác nhận', className: 'border-brass/30 bg-brass/15 text-brass-text' },
  paid: { label: 'Đã thu', className: 'border-moss/30 bg-moss/15 text-moss' },
  cancelled: { label: 'Đã huỷ', className: 'border-slate-ink/25 bg-slate-ink/10 text-slate-ink' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.unpaid;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, accent = 'text-navy' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <p className="m-0 text-[13px] text-slate-ink">{label}</p>
      <p className={`m-0 mt-1 font-display text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

const now = new Date();

export default function InvoiceList() {
  const { isOwner } = useAuth();
  const { activeBranchId } = useBranch();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');

  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ unpaid: 0, pending: 0, paid: 0, totalAmount: 0, collectedAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/invoices', { params });
      setInvoices(res.data.invoices);
      setStats(res.data.stats);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách hoá đơn.'));
    } finally {
      setLoading(false);
    }
  }, [month, year, statusFilter, activeBranchId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  }

  async function handleConfirm(invoice, method) {
    try {
      const res = await api.patch(`/invoices/${invoice.id}/confirm`, { method });
      flash(res.data.message);
      setConfirming(null);
      fetchInvoices();
    } catch (err) {
      setError(getErrorMessage(err, 'Không xác nhận được.'));
      setConfirming(null);
    }
  }

  async function handleCancel(invoice) {
    try {
      await api.patch(`/invoices/${invoice.id}/cancel`, {});
      flash(`Đã huỷ hoá đơn ${invoice.code}.`);
      fetchInvoices();
    } catch (err) {
      setError(getErrorMessage(err, 'Không huỷ được hoá đơn.'));
    }
  }

  const collectRate = stats.totalAmount > 0
    ? Math.round((stats.collectedAmount / stats.totalAmount) * 100)
    : 0;

  const years = [year - 1, year, year + 1];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-xl font-semibold">Hoá đơn tiền phòng</h2>
          <p className="mt-1 text-sm text-slate-ink">
            Nhập chỉ số điện nước và phát hành hoá đơn cho cả kỳ.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Lập hoá đơn kỳ này
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

      {/* ---------- Chọn kỳ ---------- */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white px-5 py-4">
        <div>
          <label className={labelClass} htmlFor="iv-month">Tháng</label>
          <select id="iv-month" className={inputClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="iv-year">Năm</label>
          <select id="iv-year" className={inputClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 rounded-lg border border-line p-1">
          {[
            { key: '', label: 'Tất cả' },
            { key: 'unpaid', label: 'Chưa thu' },
            { key: 'pending', label: 'Chờ xác nhận' },
            { key: 'paid', label: 'Đã thu' },
          ].map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                statusFilter === f.key ? 'bg-navy text-paper' : 'text-slate-ink hover:text-navy'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Thống kê ---------- */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng phải thu" value={formatVnd(stats.totalAmount)} />
        <StatCard label="Đã thu" value={formatVnd(stats.collectedAmount)} accent="text-moss" />
        <StatCard label="Chưa thu" value={stats.unpaid} accent="text-danger" />
        <StatCard label="Chờ xác nhận" value={stats.pending} accent="text-brass-text" />
      </div>

      {stats.totalAmount > 0 && (
        <div className="mb-6 rounded-xl border border-line bg-white px-5 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-slate-ink">Tỷ lệ thu tiền tháng {month}/{year}</span>
            <span className="font-display text-lg font-semibold text-navy">{collectRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${collectRate}%` }} />
          </div>
        </div>
      )}

      {/* ---------- Bảng ---------- */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-left text-[13px] text-slate-ink">
              <th className="px-4 py-3 font-medium">Phòng</th>
              {isOwner && <th className="px-4 py-3 font-medium">Chi nhánh</th>}
              <th className="px-4 py-3 font-medium">Người thuê</th>
              <th className="px-4 py-3 font-medium">Điện / Nước</th>
              <th className="px-4 py-3 font-medium">Tổng tiền</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isOwner ? 7 : 6} className="px-4 py-10 text-center text-slate-ink">Đang tải…</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="px-4 py-12 text-center">
                  <p className="m-0 text-slate-ink">Chưa có hoá đơn nào cho tháng {month}/{year}.</p>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mt-2 text-[13px] text-brass-text underline"
                  >
                    Lập hoá đơn ngay
                  </button>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetail(inv)}
                      className="text-left font-medium text-navy underline-offset-2 hover:underline"
                    >
                      Phòng {inv.room?.roomNumber}
                    </button>
                    <p className="m-0 font-mono text-[11px] text-slate-ink">{inv.code}</p>
                  </td>

                  {isOwner && <td className="px-4 py-3 text-slate-ink">{inv.branch?.name || '—'}</td>}

                  <td className="px-4 py-3">
                    <p className="m-0 text-navy">{inv.tenant?.name || '—'}</p>
                    {inv.tenant?.phone && <p className="m-0 text-xs text-slate-ink">{inv.tenant.phone}</p>}
                  </td>

                  <td className="px-4 py-3 text-[13px] text-slate-ink">
                    <p className="m-0">{inv.electricityUsed} kWh · {formatVnd(inv.electricityAmount)}</p>
                    <p className="m-0">{inv.waterUsed} m³ · {formatVnd(inv.waterAmount)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="m-0 font-display text-base font-semibold text-navy">{formatVnd(inv.total)}</p>
                    {inv.dueDate && inv.status === 'unpaid' && (
                      <p className="m-0 text-xs text-slate-ink">Hạn {formatDate(inv.dueDate)}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                    {inv.status === 'pending' && inv.tenantNote && (
                      <p className="m-0 mt-1 max-w-[160px] text-xs text-slate-ink">{inv.tenantNote}</p>
                    )}
                    {inv.status === 'paid' && (
                      <p className="m-0 mt-1 text-xs text-slate-ink">{formatDate(inv.paidAt)}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {(inv.status === 'unpaid' || inv.status === 'pending') && (
                        <button
                          type="button"
                          onClick={() => setConfirming(inv)}
                          className="rounded-md bg-moss px-2.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                        >
                          Xác nhận thu
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetail(inv)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-navy hover:bg-paper"
                      >
                        Chi tiết
                      </button>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(inv)}
                          className="rounded-md border border-danger/40 px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger/5"
                        >
                          Huỷ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateInvoicesModal
          month={month}
          year={year}
          isOwner={isOwner}
          onClose={() => setCreating(false)}
          onDone={(msg) => { setCreating(false); flash(msg); fetchInvoices(); }}
        />
      )}

      {detail && <InvoiceDetailModal invoice={detail} onClose={() => setDetail(null)} />}

      {confirming && (
        <ConfirmPaymentModal
          invoice={confirming}
          onClose={() => setConfirming(null)}
          onConfirm={(method) => handleConfirm(confirming, method)}
        />
      )}
    </div>
  );
}

/* ---------- Modal lập hoá đơn hàng loạt ---------- */
function CreateInvoicesModal({ month, year, isOwner, onClose, onDone }) {
  const [items, setItems] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get('/invoices/prepare', { params: { month, year } })
      .then((res) => {
        // Bỏ những phòng đã có hoá đơn kỳ này
        setItems(
          res.data.items
            .filter((i) => !i.alreadyCreated)
            .map((i) => ({ ...i, electricityEnd: '', waterEnd: '' }))
        );
      })
      .catch((err) => setError(getErrorMessage(err, 'Không tải được danh sách phòng.')))
      .finally(() => setLoading(false));
  }, [month, year]);

  function updateItem(roomId, field, value) {
    setItems((prev) => prev.map((i) => (i.roomId === roomId ? { ...i, [field]: value } : i)));
  }

  // Tính tạm để người dùng thấy ngay số tiền
  function computeTotal(item) {
    const eUsed = Math.max(0, (Number(item.electricityEnd) || 0) - item.electricityStart);
    const wUsed = Math.max(0, (Number(item.waterEnd) || 0) - item.waterStart);
    return item.roomPrice + eUsed * item.electricityPrice + wUsed * item.waterPrice;
  }

  const filled = items.filter((i) => i.electricityEnd !== '' && i.waterEnd !== '');
  const grandTotal = filled.reduce((sum, i) => sum + computeTotal(i), 0);

  async function handleSubmit() {
    setError('');
    if (filled.length === 0) {
      return setError('Vui lòng nhập chỉ số điện nước cho ít nhất một phòng.');
    }

    // Chặn chỉ số cuối nhỏ hơn đầu ngay ở giao diện
    const invalid = filled.find(
      (i) => Number(i.electricityEnd) < i.electricityStart || Number(i.waterEnd) < i.waterStart
    );
    if (invalid) {
      return setError(`Phòng ${invalid.roomNumber}: chỉ số cuối kỳ không được nhỏ hơn đầu kỳ.`);
    }

    setSubmitting(true);
    try {
      const res = await api.post('/invoices', {
        month,
        year,
        dueDate: dueDate || undefined,
        items: filled.map((i) => ({
          roomId: i.roomId,
          roomNumber: i.roomNumber,
          roomPrice: i.roomPrice,
          electricityStart: i.electricityStart,
          electricityEnd: Number(i.electricityEnd),
          electricityPrice: i.electricityPrice,
          waterStart: i.waterStart,
          waterEnd: Number(i.waterEnd),
          waterPrice: i.waterPrice,
        })),
      });

      if (res.data.failed?.length > 0) {
        setResult(res.data);
      } else {
        onDone(res.data.message);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không lập được hoá đơn.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-[880px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">
          Lập hoá đơn tháng {month}/{year}
        </h3>
        <p className="mb-5 text-sm text-slate-ink">
          Chỉ số đầu kỳ lấy từ hoá đơn tháng trước. Nhập chỉ số cuối kỳ để tính tiền.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        {result ? (
          <div>
            <div className="mb-4 rounded-lg border border-moss/30 bg-moss/10 px-3.5 py-3 text-sm text-moss">
              {result.message}
            </div>
            {result.failed.length > 0 && (
              <div className="mb-5 rounded-lg border border-brass/30 bg-brass/10 px-3.5 py-3">
                <p className="m-0 mb-1.5 text-sm font-medium text-brass-text">
                  {result.failed.length} phòng không tạo được:
                </p>
                <ul className="m-0 list-disc pl-5 text-[13px] text-brass-text">
                  {result.failed.map((f, i) => (
                    <li key={i}>Phòng {f.roomNumber}: {f.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={() => onDone(result.message)} className={`${btnPrimary} w-full`}>
              Đóng
            </button>
          </div>
        ) : loading ? (
          <p className="py-8 text-center text-slate-ink">Đang tải danh sách phòng…</p>
        ) : items.length === 0 ? (
          <>
            <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
              <p className="m-0 text-sm text-slate-ink">
                Không có phòng nào cần lập hoá đơn. Có thể tất cả phòng đang cho thuê đã có hoá đơn kỳ này,
                hoặc chưa có phòng nào được xếp người thuê.
              </p>
            </div>
            <button type="button" onClick={onClose} className={`${btnGhost} mt-4 w-full`}>Đóng</button>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <div>
                <label className={labelClass} htmlFor="ci-due">Hạn thanh toán</label>
                <input
                  id="ci-due"
                  type="date"
                  className={inputClass}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <p className="m-0 pb-2 text-sm text-slate-ink">
                {filled.length}/{items.length} phòng đã nhập
              </p>
            </div>

            <div className="mb-4 max-h-[45vh] overflow-y-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-line text-left text-[13px] text-slate-ink">
                    <th className="px-3 py-2.5 font-medium">Phòng</th>
                    <th className="px-3 py-2.5 font-medium">Điện đầu</th>
                    <th className="px-3 py-2.5 font-medium">Điện cuối</th>
                    <th className="px-3 py-2.5 font-medium">Nước đầu</th>
                    <th className="px-3 py-2.5 font-medium">Nước cuối</th>
                    <th className="px-3 py-2.5 text-right font-medium">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.roomId} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2">
                        <p className="m-0 font-medium text-navy">Phòng {item.roomNumber}</p>
                        <p className="m-0 text-xs text-slate-ink">
                          {item.tenant?.name || 'Chưa có người thuê'}
                          {isOwner && item.branch ? ` · ${item.branch.name}` : ''}
                        </p>
                        {!item.hasPrevious && (
                          <p className="m-0 text-xs text-brass-text">Kỳ đầu, kiểm tra lại chỉ số đầu</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className={`${inputClass} w-24`}
                          value={item.electricityStart}
                          onChange={(e) => updateItem(item.roomId, 'electricityStart', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          className={`${inputClass} w-24`}
                          value={item.electricityEnd}
                          onChange={(e) => updateItem(item.roomId, 'electricityEnd', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          className={`${inputClass} w-24`}
                          value={item.waterStart}
                          onChange={(e) => updateItem(item.roomId, 'waterStart', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          className={`${inputClass} w-24`}
                          value={item.waterEnd}
                          onChange={(e) => updateItem(item.roomId, 'waterEnd', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.electricityEnd !== '' && item.waterEnd !== '' ? (
                          <span className="font-medium text-navy">{formatVnd(computeTotal(item))}</span>
                        ) : (
                          <span className="text-slate-ink">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-5 flex items-center justify-between rounded-lg bg-paper px-4 py-3">
              <span className="text-sm text-slate-ink">Tổng cộng {filled.length} hoá đơn</span>
              <span className="font-display text-lg font-semibold text-navy">{formatVnd(grandTotal)}</span>
            </div>

            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
              <button
                type="button"
                onClick={handleSubmit}
                className={`${btnPrimary} flex-1`}
                disabled={submitting || filled.length === 0}
              >
                {submitting ? 'Đang tạo…' : `Phát hành ${filled.length} hoá đơn`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Modal chi tiết hoá đơn ---------- */
function InvoiceDetailModal({ invoice, onClose }) {
  const rows = [
    { label: 'Tiền phòng', value: formatVnd(invoice.roomPrice) },
    {
      label: `Tiền điện (${invoice.electricityUsed} kWh × ${formatVnd(invoice.electricityPrice)})`,
      value: formatVnd(invoice.electricityAmount),
      sub: `Chỉ số ${invoice.electricityStart} → ${invoice.electricityEnd}`,
    },
    {
      label: `Tiền nước (${invoice.waterUsed} m³ × ${formatVnd(invoice.waterPrice)})`,
      value: formatVnd(invoice.waterAmount),
      sub: `Chỉ số ${invoice.waterStart} → ${invoice.waterEnd}`,
    },
    ...(invoice.otherFees || []).map((f) => ({ label: f.label, value: formatVnd(f.amount) })),
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-[440px] rounded-xl border border-line bg-white p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="m-0 font-display text-lg font-semibold">
            Phòng {invoice.room?.roomNumber} — Tháng {invoice.month}/{invoice.year}
          </h3>
          <StatusBadge status={invoice.status} />
        </div>
        <p className="mb-5 font-mono text-xs text-slate-ink">{invoice.code}</p>

        <dl className="m-0 divide-y divide-line border-y border-line">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-4 py-3">
              <dt className="text-[13.5px] text-slate-ink">
                {r.label}
                {r.sub && <span className="block text-xs text-slate-ink/70">{r.sub}</span>}
              </dt>
              <dd className="m-0 shrink-0 text-sm font-medium text-navy">{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-medium text-navy">Tổng cộng</span>
          <span className="font-display text-2xl font-semibold text-navy">{formatVnd(invoice.total)}</span>
        </div>

        <dl className="mt-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-slate-ink">Người thuê</dt>
            <dd className="m-0 text-navy">{invoice.tenant?.name || '—'}</dd>
          </div>
          {invoice.dueDate && (
            <div className="flex justify-between">
              <dt className="text-slate-ink">Hạn thanh toán</dt>
              <dd className="m-0 text-navy">{formatDate(invoice.dueDate)}</dd>
            </div>
          )}
          {invoice.paidAt && (
            <div className="flex justify-between">
              <dt className="text-slate-ink">Đã thu ngày</dt>
              <dd className="m-0 text-navy">
                {formatDate(invoice.paidAt)}
                {invoice.paidMethod === 'transfer' ? ' (chuyển khoản)' : ' (tiền mặt)'}
              </dd>
            </div>
          )}
        </dl>

        {invoice.tenantNote && (
          <div className="mt-4 rounded-lg border border-brass/30 bg-brass/10 px-3 py-2.5">
            <p className="m-0 text-xs text-brass-text">Ghi chú của người thuê</p>
            <p className="m-0 mt-0.5 text-sm text-brass-text">{invoice.tenantNote}</p>
          </div>
        )}

        <button type="button" onClick={onClose} className={`${btnGhost} mt-5 w-full`}>Đóng</button>
      </div>
    </div>
  );
}

/* ---------- Modal xác nhận thu tiền ---------- */
function ConfirmPaymentModal({ invoice, onClose, onConfirm }) {
  const [method, setMethod] = useState(invoice.status === 'pending' ? 'transfer' : 'cash');

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6">
        <h3 className="mb-2 font-display text-lg font-semibold">Xác nhận đã thu tiền</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-ink">
          Phòng <strong className="text-navy">{invoice.room?.roomNumber}</strong> tháng {invoice.month}/{invoice.year},
          số tiền <strong className="text-navy">{formatVnd(invoice.total)}</strong>.
        </p>

        <div className="mb-5">
          <span className={labelClass}>Hình thức</span>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'cash', label: 'Tiền mặt' },
              { key: 'transfer', label: 'Chuyển khoản' },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  method === m.key ? 'border-navy bg-navy text-paper' : 'border-line bg-white text-navy hover:bg-paper'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-slate-ink">
          Sau khi xác nhận, hoá đơn không sửa được nữa để giữ đúng sổ sách.
        </p>

        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btnGhost} flex-1`}>Huỷ</button>
          <button
            type="button"
            onClick={() => onConfirm(method)}
            className="flex-1 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}