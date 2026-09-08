import { NavLink } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

/* ---------- Icon ---------- */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const IconDashboard = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const IconBranch = () => (
  <svg {...iconProps}>
    <path d="M3 21h18M5 21V7l7-4 7 4v14" />
    <path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  </svg>
);

const IconRoom = () => (
  <svg {...iconProps}>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M9 21v-8h6v8" />
  </svg>
);

const IconTenants = () => (
  <svg {...iconProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

const IconInvoice = () => (
  <svg {...iconProps}>
    <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2-3-2V4a1 1 0 0 1 1-1z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

const IconShield = () => (
  <svg {...iconProps}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconKey = () => (
  <svg {...iconProps}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 8.3-8.3M17 6l2 2M14 9l2 2" />
  </svg>
);

const IconUser = () => (
  <svg {...iconProps}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ---------- Danh sách menu theo vai trò ---------- */
const ownerLinks = [
  { to: '/admin', label: 'Tổng quan', end: true, Icon: IconDashboard },
  { to: '/admin/branches', label: 'Chi nhánh', Icon: IconBranch },
  { to: '/admin/rooms', label: 'Phòng', Icon: IconRoom },
  { to: '/admin/accounts', label: 'Tài khoản người thuê', Icon: IconTenants },
  { to: '/admin/invoices', label: 'Hoá đơn', Icon: IconInvoice },
  { to: '/admin/managers', label: 'Tài khoản quản trị', Icon: IconShield },
];

const managerLinks = [
  { to: '/admin', label: 'Tổng quan', end: true, Icon: IconDashboard },
  { to: '/admin/rooms', label: 'Phòng', Icon: IconRoom },
  { to: '/admin/accounts', label: 'Tài khoản người thuê', Icon: IconTenants },
  { to: '/admin/invoices', label: 'Hoá đơn', Icon: IconInvoice },
];

const tenantLinks = [
  { to: '/toi', label: 'Trang chủ', end: true, Icon: IconDashboard },
  { to: '/toi/phong', label: 'Phòng của tôi', Icon: IconKey },
  { to: '/toi/hoa-don', label: 'Hoá đơn của tôi', Icon: IconInvoice },
  { to: '/toi/ho-so', label: 'Hồ sơ', Icon: IconUser },
];

export default function Sidebar({ open, onClose }) {
  const { role, isOwner, isManager, user } = useAuth();
  const links = isOwner ? ownerLinks : isManager ? managerLinks : tenantLinks;

  return (
    <>
      {/* Lớp phủ khi mở menu trên mobile */}
      {open && (
        <div onClick={onClose} className="fixed inset-0 z-20 bg-navy/50 md:hidden" aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col bg-navy p-4 text-paper transition-transform
          md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Thương hiệu */}
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-brass font-display text-sm font-semibold text-brass">
            QT
          </span>
          <span className="font-display font-semibold">QuảnTrọ</span>
        </div>

        {/* Vai trò và chi nhánh */}
        <div className="mb-3 border-b border-white/10 px-2 pb-3">
          <p className="m-0 text-xs text-paper/50">{ROLE_LABELS[role]}</p>
          {user?.branch?.name && (
            <p className="m-0 mt-0.5 truncate text-xs font-medium text-brass">{user.branch.name}</p>
          )}
        </div>

        {/* Menu */}
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-brass font-semibold text-navy'
                    : 'text-paper/85 hover:bg-white/10 hover:text-paper'
                }`
              }
            >
              {/* shrink-0 để icon không bị bóp khi nhãn dài */}
              <span className="shrink-0"><Icon /></span>
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="mt-4 px-2 text-[11px] text-paper/35">
          © {new Date().getFullYear()} QuảnTrọ
        </p>
      </aside>
    </>
  );
}