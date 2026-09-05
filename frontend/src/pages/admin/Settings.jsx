import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { btnPrimary, btnGhost, Card, Alert } from '../../components/accountUi';

const STORAGE_KEY = 'quantro:settings';

const DEFAULT_SETTINGS = {
  notifyNewInvoice: true,
  notifyDueSoon: true,
  notifyAccountChange: false,
  compactTable: false,
  currencyFormat: 'vi',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/* ---------- Công tắc bật/tắt ---------- */
function Toggle({ id, label, description, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-navy">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-slate-ink">{description}</span>}
      </span>

      <span className="relative shrink-0 pt-0.5">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="block h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-navy peer-focus-visible:ring-2 peer-focus-visible:ring-brass peer-focus-visible:ring-offset-2" />
        <span className="pointer-events-none absolute left-0.5 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function Settings() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const base = isAdmin ? '/admin' : '/toi';

  // Lưu ngay khi thay đổi, không cần bấm nút Lưu
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [settings]);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <div className="max-w-2xl">
      {saved && <Alert type="success">Đã lưu tuỳ chọn.</Alert>}

      {/* ---------- Tài khoản ---------- */}
      <Card title="Tài khoản" description="Thông tin đăng nhập và bảo mật.">
        <div className="divide-y divide-line">
          <div className="flex items-center justify-between gap-4 pb-3.5">
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-navy">Hồ sơ cá nhân</p>
              <p className="m-0 truncate text-[13px] text-slate-ink">
                {user?.name} · {user?.email || user?.phone}
              </p>
            </div>
            <Link to={`${base}/ho-so`} className={`${btnGhost} shrink-0`}>Xem</Link>
          </div>

          <div className="flex items-center justify-between gap-4 pt-3.5">
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-navy">Mật khẩu</p>
              <p className="m-0 text-[13px] text-slate-ink">Đổi mật khẩu đăng nhập của bạn</p>
            </div>
            <Link to={`${base}/doi-mat-khau`} className={`${btnGhost} shrink-0`}>Đổi</Link>
          </div>
        </div>
      </Card>

      {/* ---------- Thông báo ---------- */}
      <Card
        title="Thông báo"
        description={
          isAdmin
            ? 'Chọn những việc bạn muốn được nhắc.'
            : 'Nhận nhắc nhở về hoá đơn và hợp đồng của bạn.'
        }
      >
        <div className="divide-y divide-line">
          <Toggle
            id="st-invoice"
            label={isAdmin ? 'Người thuê thanh toán' : 'Có hoá đơn mới'}
            description={
              isAdmin
                ? 'Báo khi có người thuê báo đã chuyển khoản'
                : 'Báo khi chủ trọ phát hành hoá đơn tháng mới'
            }
            checked={settings.notifyNewInvoice}
            onChange={(v) => set('notifyNewInvoice', v)}
          />
          <Toggle
            id="st-due"
            label="Nhắc hạn thanh toán"
            description="Nhắc trước 3 ngày khi tới hạn đóng tiền"
            checked={settings.notifyDueSoon}
            onChange={(v) => set('notifyDueSoon', v)}
          />
          {isAdmin && (
            <Toggle
              id="st-account"
              label="Đăng ký tài khoản mới"
              description="Báo khi có người thuê đăng ký chờ duyệt"
              checked={settings.notifyAccountChange}
              onChange={(v) => set('notifyAccountChange', v)}
            />
          )}
        </div>
      </Card>

      {/* ---------- Hiển thị ---------- */}
      <Card title="Hiển thị" description="Tuỳ chọn này chỉ áp dụng trên trình duyệt hiện tại.">
        <div className="divide-y divide-line">
          <Toggle
            id="st-compact"
            label="Bảng gọn"
            description="Giảm khoảng cách dòng để xem được nhiều dữ liệu hơn"
            checked={settings.compactTable}
            onChange={(v) => set('compactTable', v)}
          />

          <div className="flex items-center justify-between gap-4 pt-3.5">
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-navy">Định dạng tiền</p>
              <p className="m-0 text-[13px] text-slate-ink">Cách hiển thị số tiền trong hoá đơn</p>
            </div>
            <select
              className="shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy focus-visible:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
              value={settings.currencyFormat}
              onChange={(e) => set('currencyFormat', e.target.value)}
            >
              <option value="vi">1.500.000 đ</option>
              <option value="short">1,5 triệu</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ---------- Phiên đăng nhập ---------- */}
      <Card title="Phiên đăng nhập">
        {!confirmLogout ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="m-0 text-[13.5px] text-slate-ink">
              Đăng xuất khỏi thiết bị này. Bạn sẽ cần đăng nhập lại để tiếp tục.
            </p>
            <button type="button" onClick={() => setConfirmLogout(true)} className={btnGhost}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div>
            <p className="m-0 mb-3.5 text-sm text-navy">Bạn chắc chắn muốn đăng xuất?</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Đăng xuất
              </button>
              <button type="button" onClick={() => setConfirmLogout(false)} className={btnGhost}>
                Huỷ
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <p className="m-0 text-xs text-slate-ink">
          Tuỳ chọn được lưu trên trình duyệt này, không đồng bộ sang thiết bị khác.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 text-xs text-brass-text underline underline-offset-2"
        >
          Khôi phục mặc định
        </button>
      </div>
    </div>
  );
}