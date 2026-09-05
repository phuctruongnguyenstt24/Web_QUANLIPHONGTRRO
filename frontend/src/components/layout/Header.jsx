import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
 
// Tiêu đề tự đổi theo route, không cần truyền prop title ở từng trang
const TITLES = {
  '/admin': 'Tổng quan',
  '/admin/rooms': 'Quản lý phòng',
  '/admin/tenants': 'Người thuê',
  '/admin/contracts': 'Hợp đồng',
  '/admin/payments': 'Hoá đơn',
  '/admin/accounts': 'Quản lý tài khoản',
  '/admin/ho-so': 'Hồ sơ của tôi',
  '/admin/cai-dat': 'Cài đặt',
  '/toi': 'Trang chủ',
  '/toi/phong': 'Phòng của tôi',
  '/toi/hoa-don': 'Hoá đơn của tôi',
  '/toi/ho-so': 'Hồ sơ của tôi',
  '/toi/cai-dat': 'Cài đặt',
};
 
/* ---------- Icon ---------- */
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
 
const IconUser = () => (
  <svg {...iconProps}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconSettings = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0c.28.66.9 1.09 1.61 1.09H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconKey = () => (
  <svg {...iconProps}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
  </svg>
);
const IconLogout = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const IconChevron = ({ open }) => (
  <svg
    {...iconProps}
    width="14"
    height="14"
    className={`transition-transform ${open ? 'rotate-180' : ''}`}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
 
export default function Header({ onToggleSidebar }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
 
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
 
  // Đường dẫn khác nhau tuỳ vai trò
  const base = isAdmin ? '/admin' : '/toi';
 
  const initials = (user?.name || 'ND')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
 
  // Đóng menu khi bấm ra ngoài hoặc nhấn Escape
  useEffect(() => {
    if (!menuOpen) return;
 
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
 
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);
 
  // Chuyển trang thì đóng menu
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
 
  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  }
 
  const menuItemClass =
    'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-navy no-underline transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-none';
 
  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Mở menu"
          className="cursor-pointer border-none bg-transparent text-xl text-navy md:hidden"
        >
          ☰
        </button>
        <h1 className="m-0 font-display text-lg font-semibold text-navy">
          {TITLES[pathname] || 'QuảnTrọ'}
        </h1>
      </div>
 
      {/* ---------- Nút tài khoản + dropdown ---------- */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1.5 transition-colors ${
            menuOpen ? 'border-line bg-paper' : 'border-transparent hover:bg-paper'
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-paper">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-navy">
              {user?.name || 'Người dùng'}
            </span>
            <span className="block text-xs leading-tight text-slate-ink">
              {isAdmin ? 'Chủ trọ' : 'Người thuê'}
            </span>
          </span>
          <span className="text-slate-ink">
            <IconChevron open={menuOpen} />
          </span>
        </button>
 
        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lg shadow-navy/5"
          >
            {/* Thông tin tài khoản */}
            <div className="border-b border-line px-3.5 pb-3 pt-2">
              <p className="m-0 truncate text-sm font-semibold text-navy">
                {user?.name || 'Người dùng'}
              </p>
              <p className="m-0 truncate text-xs text-slate-ink">
                {user?.email || user?.phone || '—'}
              </p>
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  isAdmin
                    ? 'border-brass/30 bg-brass/15 text-brass-text'
                    : 'border-moss/30 bg-moss/15 text-moss'
                }`}
              >
                {isAdmin ? 'Chủ trọ' : 'Người thuê'}
              </span>
            </div>
 
            <div className="py-1">
              <Link to={`${base}/ho-so`} role="menuitem" className={menuItemClass}>
                <span className="text-slate-ink"><IconUser /></span>
                Hồ sơ của tôi
              </Link>
 
              <Link to={`${base}/cai-dat`} role="menuitem" className={menuItemClass}>
                <span className="text-slate-ink"><IconSettings /></span>
                Cài đặt
              </Link>
 
              <Link to={`${base}/doi-mat-khau`} role="menuitem" className={menuItemClass}>
                <span className="text-slate-ink"><IconKey /></span>
                Đổi mật khẩu
              </Link>
            </div>
 
            <div className="border-t border-line pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className={`${menuItemClass} cursor-pointer border-none bg-transparent text-danger hover:bg-danger/5`}
              >
                <IconLogout />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
 
