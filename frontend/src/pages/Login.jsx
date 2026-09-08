import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import { authService } from "../services/authService";

/* ---------- Google "G" mark ---------- */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

/* ---------- Blueprint minh hoạ dãy trọ ---------- */
function BuildingBlueprint() {
  const rooms = [
    { x: 24, y: 40, label: "101", status: "rented" },
    { x: 104, y: 40, label: "102", status: "vacant" },
    { x: 184, y: 40, label: "103", status: "rented" },
    { x: 24, y: 120, label: "201", status: "vacant" },
    { x: 104, y: 120, label: "202", status: "rented" },
    { x: 184, y: 120, label: "203", status: "rented" },
  ];
  return (
    <svg
      viewBox="0 0 280 220"
      width="100%"
      height="100%"
      role="img"
      aria-label="Sơ đồ dãy phòng trọ"
    >
      <rect
        x="8"
        y="16"
        width="264"
        height="176"
        rx="4"
        fill="none"
        stroke="rgba(245,242,236,0.35)"
        strokeWidth="1.5"
      />
      {rooms.map((r) => (
        <g key={r.label}>
          <rect
            x={r.x}
            y={r.y}
            width="72"
            height="64"
            rx="3"
            fill={
              r.status === "rented"
                ? "rgba(184,134,59,0.16)"
                : "rgba(245,242,236,0.05)"
            }
            stroke={r.status === "rented" ? "#B8863B" : "rgba(245,242,236,0.4)"}
            strokeWidth="1.5"
          />
          <text
            x={r.x + 36}
            y={r.y + 36}
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="15"
            fill="#F5F2EC"
            opacity="0.9"
          >
            {r.label}
          </text>
          <circle
            cx={r.x + 62}
            cy={r.y + 12}
            r="3.5"
            fill={r.status === "rented" ? "#B8863B" : "#5FA98A"}
          />
        </g>
      ))}
      <rect
        x="118"
        y="192"
        width="44"
        height="18"
        fill="none"
        stroke="rgba(245,242,236,0.35)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/* ---------- Lớp Tailwind dùng lại ---------- */
const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14.5px] text-navy outline-none placeholder:text-slate-ink/50 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-60";
const labelClass = "mb-1.5 block text-[13.5px] font-medium text-navy";
const linkClass =
  "cursor-pointer border-none bg-transparent p-0 font-body text-[13.5px] font-medium text-brass-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brass";
const primaryBtnClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 font-display text-[15px] font-semibold text-paper transition-colors hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70";

function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper"
      aria-hidden="true"
    />
  );
}

// Đọc thông báo lỗi do backend trả về, có phương án dự phòng khi mất mạng
function getErrorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === "ERR_NETWORK")
    return "Không kết nối được máy chủ. Kiểm tra lại backend đang chạy chưa.";
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

// Sau khi đăng nhập, đưa người dùng về đúng khu vực theo vai trò server trả về
function homePathFor(role) {
  // owner và manager dùng chung khu quản trị
  return role === ROLES.OWNER || role === ROLES.MANAGER ? '/admin' : '/toi';
}
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState("");
  const [error, setError] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const identifierLabel = activeTab === "email" ? "Email" : "Số điện thoại";
  const identifierPlaceholder =
    activeTab === "email" ? "ban@vidu.com" : "09xx xxx xxx";

  /**
   * Vai trò do server quyết định (đọc từ JWT trong DB), không phải do người dùng
   * chọn trên giao diện. Nếu người dùng vào thẳng một trang bị chặn thì quay lại
   * đúng trang đó, miễn là vai trò của họ được phép.
   */
  function handleAuthSuccess(data) {
    const { token, user } = data;
    login(token, user);

    const intended = location.state?.from?.pathname;
    const home = homePathFor(user.role);
    // Chỉ quay lại trang cũ nếu nó nằm trong khu vực người này được vào
    const allowed = intended && intended.startsWith(home);

    navigate(allowed ? intended : home, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.login(identifier.trim(), password);
      // Không tick "ghi nhớ" thì chỉ giữ phiên đến khi đóng tab
      handleAuthSuccess({ ...res.data, persist: rememberMe });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    // Cần Google Identity Services: thêm <script src="https://accounts.google.com/gsi/client" async>
    // vào index.html và VITE_GOOGLE_CLIENT_ID vào .env
    if (!window.google?.accounts?.id) {
      setError("Chưa cấu hình đăng nhập Google.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        setIsSubmitting(true);
        try {
          const res = await authService.googleLogin(response.credential);
          // 202 = vừa tạo tài khoản, chưa được duyệt nên không có token
          if (res.data.pending) {
            setGooglePending(res.data.message);
            return;
          }
          handleAuthSuccess(res.data);
        } catch (err) {
          setError(getErrorMessage(err));
        } finally {
          setIsSubmitting(false);
        }
      },
    });
    window.google.accounts.id.prompt();
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) return;

    setForgotSubmitting(true);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setForgotError(getErrorMessage(err));
    } finally {
      setForgotSubmitting(false);
    }
  }

  function closeForgot() {
    setForgotOpen(false);
    setForgotSent(false);
    setForgotEmail("");
    setForgotError("");
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-paper font-body text-navy md:grid-cols-[5fr_6fr]">
      {/* ---------- Panel minh hoạ ---------- */}
      <div
        className="hidden flex-col justify-between bg-navy p-11 md:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,242,236,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,236,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md border-[1.5px] border-brass font-display text-[15px] font-semibold text-brass">
            QT
          </span>
          <span className="font-display text-[17px] font-semibold text-paper">
            QuảnTrọ
          </span>
        </div>

        <div className="flex max-w-[320px] flex-col gap-6">
          <p className="font-display text-[26px] font-semibold leading-[1.35] tracking-tight text-paper">
            Quản lý phòng trọ rõ ràng như một bản vẽ.
          </p>
          <div className="w-full max-w-[280px]">
            <BuildingBlueprint />
          </div>
          <div className="flex gap-4 text-[13px] text-paper/75">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2 rounded-full bg-[#5FA98A]" />{" "}
              Phòng trống
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2 rounded-full bg-brass" /> Đã cho
              thuê
            </span>
          </div>
        </div>

        <p className="max-w-[320px] text-[13px] leading-relaxed text-paper/55">
          Chủ trọ theo dõi toàn khu, người thuê xem phòng và hoá đơn của mình —
          cùng một nơi.
        </p>
      </div>

      {/* ---------- Panel form ---------- */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-7">
            <h1 className="mb-2 font-display text-[26px] font-semibold">
              Đăng nhập
            </h1>
            <p className="m-0 text-[14.5px] leading-relaxed text-slate-ink">
              Hệ thống sẽ đưa bạn tới đúng khu vực của mình sau khi đăng nhập.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-line bg-white px-4 py-2.5 text-[14.5px] font-medium text-navy transition-colors hover:border-slate-ink/40 hover:bg-paper/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleMark />
            Tiếp tục với Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[12.5px] text-slate-ink">
              hoặc đăng nhập bằng
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div
            className="mb-4 flex rounded-lg border border-line p-[3px]"
            role="tablist"
            aria-label="Phương thức đăng nhập"
          >
            {[
              { key: "email", label: "Email" },
              { key: "phone", label: "Số điện thoại" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setIdentifier("");
                  setError("");
                }}
                className={`flex-1 cursor-pointer rounded-md border-none py-2 text-[13.5px] font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-navy text-paper"
                    : "bg-transparent text-slate-ink hover:text-navy"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {googlePending && (
              <div className="mb-4 rounded-lg border border-brass/40 bg-brass/10 px-3 py-2.5 text-[13.5px] text-brass-text">
                {googlePending}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13.5px] text-danger"
              >
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className={labelClass} htmlFor="lp-identifier">
                {identifierLabel}
              </label>
              <input
                id="lp-identifier"
                className={inputClass}
                type={activeTab === "email" ? "email" : "tel"}
                placeholder={identifierPlaceholder}
                autoComplete={activeTab === "email" ? "email" : "tel"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-4">
              <label className={labelClass} htmlFor="lp-password">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="lp-password"
                  className={`${inputClass} pr-14`}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded border-none bg-transparent px-1.5 py-1 text-[12.5px] text-slate-ink hover:text-navy focus-visible:outline-2 focus-visible:outline-brass"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-slate-ink">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-[15px] accent-navy"
                />
                Ghi nhớ đăng nhập
              </label>
              <button
                type="button"
                className={linkClass}
                onClick={() => setForgotOpen(true)}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              className={primaryBtnClass}
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-4 text-[12.5px] leading-relaxed text-slate-ink">
            Bằng việc đăng nhập, bạn đồng ý với{" "}
            <Link to="/terms" className={`${linkClass} text-[12.5px]`}>
              Điều khoản dịch vụ
            </Link>{" "}
            và{" "}
            <Link to="/privacy" className={`${linkClass} text-[12.5px]`}>
              Chính sách bảo mật
            </Link>{" "}
            của chúng tôi.
          </p>

          <div className="mt-6 space-y-2 text-center text-sm text-slate-ink">
            <p>
              Chưa có tài khoản?{" "}
              <Link to="/register" className={linkClass}>
                Đăng ký
              </Link>
            </p>
            <p className="text-[12.5px] text-slate-ink/80">
              Tài khoản chủ trọ do quản lý hệ thống cấp, không đăng ký công
              khai.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Modal quên mật khẩu ---------- */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-navy/55 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lp-forgot-title"
        >
          <div className="w-full max-w-[360px] rounded-xl border border-line bg-white p-7">
            {!forgotSent ? (
              <>
                <h2
                  id="lp-forgot-title"
                  className="mb-2 font-display text-[19px] font-semibold"
                >
                  Đặt lại mật khẩu
                </h2>
                <p className="mb-5 text-sm leading-relaxed text-slate-ink">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật
                  khẩu.
                </p>
                <form onSubmit={handleForgotSubmit}>
                  {forgotError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13.5px] text-danger"
                    >
                      {forgotError}
                    </div>
                  )}
                  <div className="mb-4">
                    <label className={labelClass} htmlFor="lp-forgot-email">
                      Email
                    </label>
                    <input
                      id="lp-forgot-email"
                      className={inputClass}
                      type="email"
                      placeholder="ban@vidu.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotSubmitting}
                    />
                  </div>
                  <div className="mt-5 flex gap-2.5">
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="flex-1 cursor-pointer rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-navy hover:bg-paper/60"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className={primaryBtnClass}
                      disabled={forgotSubmitting}
                    >
                      {forgotSubmitting && <Spinner />}
                      {forgotSubmitting ? "Đang gửi…" : "Gửi liên kết"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="mb-2 font-display text-[19px] font-semibold">
                  Đã gửi liên kết
                </h2>
                <p className="mb-5 text-sm leading-relaxed text-slate-ink">
                  Nếu <strong className="text-navy">{forgotEmail}</strong> có
                  trong hệ thống, liên kết đặt lại mật khẩu đã được gửi tới hộp
                  thư này. Liên kết có hiệu lực trong 30 phút.
                </p>
                <button
                  type="button"
                  onClick={closeForgot}
                  className={primaryBtnClass}
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
