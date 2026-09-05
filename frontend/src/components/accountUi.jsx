/**
 * Các lớp Tailwind và tiện ích dùng chung cho những trang tài khoản.
 * Gom vào một chỗ để 3 trang Hồ sơ / Cài đặt / Đổi mật khẩu trông nhất quán.
 */

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14.5px] text-navy outline-none placeholder:text-slate-ink/50 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:bg-paper/60 disabled:opacity-70';

export const inputErrorClass =
  'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30';

export const labelClass = 'mb-1.5 block text-[13.5px] font-medium text-navy';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70';

export const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-paper disabled:opacity-60';

export function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper"
      aria-hidden="true"
    />
  );
}

/** Khung trắng bao quanh mỗi nhóm nội dung */
export function Card({ title, description, children, footer }) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
      {(title || description) && (
        <div className="border-b border-line px-6 py-4">
          {title && <h3 className="m-0 font-display text-base font-semibold text-navy">{title}</h3>}
          {description && <p className="m-0 mt-1 text-[13.5px] text-slate-ink">{description}</p>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="border-t border-line bg-paper/40 px-6 py-3.5">{footer}</div>}
    </section>
  );
}

export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  const styles = {
    error: 'border-danger/30 bg-danger/10 text-danger',
    success: 'border-moss/30 bg-moss/10 text-moss',
    info: 'border-brass/30 bg-brass/10 text-brass-text',
  };
  return (
    <div role="alert" className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${styles[type]}`}>
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 underline">
          Đóng
        </button>
      )}
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Đọc thông báo lỗi từ backend, có phương án dự phòng khi mất mạng */
export function getErrorMessage(err, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ.';
  return fallback;
}