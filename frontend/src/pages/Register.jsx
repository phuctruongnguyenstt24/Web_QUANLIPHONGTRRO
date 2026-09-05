import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

/* ---------- Blueprint minh hoạ ---------- */
function BuildingBlueprint() {
  const rooms = [
    { x: 24, y: 40, label: '101', status: 'rented' },
    { x: 104, y: 40, label: '102', status: 'vacant' },
    { x: 184, y: 40, label: '103', status: 'rented' },
    { x: 24, y: 120, label: '201', status: 'vacant' },
    { x: 104, y: 120, label: '202', status: 'rented' },
    { x: 184, y: 120, label: '203', status: 'vacant' },
  ];
  return (
    <svg viewBox="0 0 280 220" width="100%" height="100%" role="img" aria-label="Sơ đồ dãy phòng trọ">
      <rect x="8" y="16" width="264" height="176" rx="4" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="1.5" />
      {rooms.map((r) => (
        <g key={r.label}>
          <rect
            x={r.x} y={r.y} width="72" height="64" rx="3"
            fill={r.status === 'rented' ? 'rgba(184,134,59,0.16)' : 'rgba(95,169,138,0.14)'}
            stroke={r.status === 'rented' ? '#B8863B' : '#5FA98A'}
            strokeWidth={r.status === 'vacant' ? 2 : 1.5}
          />
          <text x={r.x + 36} y={r.y + 36} textAnchor="middle" fontFamily="Space Grotesk, sans-serif"
            fontSize="15" fill="#F5F2EC" opacity="0.9">{r.label}</text>
          <circle cx={r.x + 62} cy={r.y + 12} r="3.5" fill={r.status === 'rented' ? '#B8863B' : '#5FA98A'} />
        </g>
      ))}
      <rect x="118" y="192" width="44" height="18" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------- Lớp Tailwind dùng lại ---------- */
const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14.5px] text-navy outline-none placeholder:text-slate-ink/50 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-60';
const inputErrorClass = 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30';
const labelClass = 'mb-1.5 block text-[13.5px] font-medium text-navy';
const linkClass =
  'font-medium text-brass-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brass';
const primaryBtnClass =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 font-display text-[15px] font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70';

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper" aria-hidden="true" />;
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}

/* ---------- Đánh giá độ mạnh mật khẩu ---------- */
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: 'Yếu', color: 'bg-danger' };
  if (score <= 3) return { score, label: 'Trung bình', color: 'bg-brass' };
  return { score, label: 'Mạnh', color: 'bg-moss' };
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = passwordStrength(form.password);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Xoá lỗi của riêng ô đang gõ, giữ lỗi các ô khác
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};

    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên.';
    else if (form.name.trim().length < 2) errs.name = 'Họ tên quá ngắn.';

    if (!form.email.trim() && !form.phone.trim()) {
      errs.email = 'Cần có email hoặc số điện thoại.';
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errs.email = 'Email không hợp lệ.';
    }
    if (form.phone.trim() && !/^(0|\+84)[0-9]{9}$/.test(form.phone.trim())) {
      errs.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).';
    }

    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.length < 6) errs.password = 'Mật khẩu phải có ít nhất 6 ký tự.';

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Hai mật khẩu không khớp nhau.';
    }

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    if (!agreed) {
      setError('Vui lòng đồng ý với điều khoản dịch vụ để tiếp tục.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      // Tài khoản mới ở trạng thái chờ duyệt nên KHÔNG tự đăng nhập,
      // chỉ hiện màn hình thông báo.
      setDone(true);
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Không kết nối được máy chủ. Kiểm tra lại backend đang chạy chưa.');
      } else {
        setError(err.response?.data?.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Màn hình sau khi đăng ký thành công ---------- */
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-10 font-body text-navy">
        <div className="w-full max-w-[420px] rounded-xl border border-line bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-moss/15">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4C7A63" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h1 className="mb-2 font-display text-xl font-semibold">Đăng ký thành công</h1>
          <p className="mb-1 text-sm leading-relaxed text-slate-ink">
            Tài khoản của <strong className="text-navy">{form.name}</strong> đã được gửi tới chủ trọ.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-slate-ink">
            Bạn sẽ đăng nhập được sau khi chủ trọ phê duyệt. Nếu cần gấp, hãy liên hệ trực tiếp với chủ trọ.
          </p>

          <button type="button" onClick={() => navigate('/login')} className={primaryBtnClass}>
            Về trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-paper font-body text-navy md:grid-cols-[5fr_6fr]">
      {/* ---------- Panel minh hoạ ---------- */}
      <div
        className="hidden flex-col justify-between bg-navy p-11 md:flex"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,242,236,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,236,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md border-[1.5px] border-brass font-display text-[15px] font-semibold text-brass">
            QT
          </span>
          <span className="font-display text-[17px] font-semibold text-paper">QuảnTrọ</span>
        </div>

        <div className="flex max-w-[320px] flex-col gap-6">
          <p className="font-display text-[26px] font-semibold leading-[1.35] tracking-tight text-paper">
            Tạo tài khoản để theo dõi phòng và hoá đơn của bạn.
          </p>
          <div className="w-full max-w-[280px]">
            <BuildingBlueprint />
          </div>
          <div className="flex gap-4 text-[13px] text-paper/75">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2 rounded-full bg-[#5FA98A]" /> Phòng còn trống
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2 rounded-full bg-brass" /> Đã cho thuê
            </span>
          </div>
        </div>

        <p className="max-w-[320px] text-[13px] leading-relaxed text-paper/55">
          Sau khi chủ trọ duyệt tài khoản, bạn xem được hợp đồng, tiền phòng và chỉ số điện nước hằng tháng.
        </p>
      </div>

      {/* ---------- Panel form ---------- */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <h1 className="mb-2 font-display text-[26px] font-semibold">Đăng ký</h1>
            <p className="m-0 text-[14.5px] leading-relaxed text-slate-ink">
              Dành cho người thuê. Tài khoản cần chủ trọ phê duyệt trước khi sử dụng.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13.5px] text-danger">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className={labelClass} htmlFor="rg-name">Họ và tên</label>
              <input
                id="rg-name"
                className={`${inputClass} ${fieldErrors.name ? inputErrorClass : ''}`}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>

            <div className="mb-4">
              <label className={labelClass} htmlFor="rg-email">Email</label>
              <input
                id="rg-email"
                type="email"
                className={`${inputClass} ${fieldErrors.email ? inputErrorClass : ''}`}
                placeholder="ban@vidu.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </div>

            <div className="mb-4">
              <label className={labelClass} htmlFor="rg-phone">Số điện thoại</label>
              <input
                id="rg-phone"
                type="tel"
                className={`${inputClass} ${fieldErrors.phone ? inputErrorClass : ''}`}
                placeholder="09xx xxx xxx"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.phone}</FieldError>
              <p className="mt-1 text-xs text-slate-ink">Điền ít nhất một trong hai: email hoặc số điện thoại.</p>
            </div>

            <div className="mb-4">
              <label className={labelClass} htmlFor="rg-password">Mật khẩu</label>
              <div className="relative">
                <input
                  id="rg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-14 ${fieldErrors.password ? inputErrorClass : ''}`}
                  placeholder="Ít nhất 6 ký tự"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded bg-transparent px-1.5 py-1 text-[12.5px] text-slate-ink hover:text-navy focus-visible:outline-2 focus-visible:outline-brass"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>

              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-1 flex-1 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`h-full flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-line'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-ink">{strength.label}</span>
                </div>
              )}
              <FieldError>{fieldErrors.password}</FieldError>
            </div>

            <div className="mb-5">
              <label className={labelClass} htmlFor="rg-confirm">Nhập lại mật khẩu</label>
              <input
                id="rg-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} ${fieldErrors.confirmPassword ? inputErrorClass : ''}`}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.confirmPassword}</FieldError>
            </div>

            <label className="mb-5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-slate-ink">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-[15px] shrink-0 accent-navy"
                disabled={submitting}
              />
              <span>
                Tôi đồng ý với <Link to="/terms" className={linkClass}>Điều khoản dịch vụ</Link> và{' '}
                <Link to="/privacy" className={linkClass}>Chính sách bảo mật</Link>.
              </span>
            </label>

            <button type="submit" className={primaryBtnClass} disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-ink">
            Đã có tài khoản?{' '}
            <Link to="/login" className={linkClass}>Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}