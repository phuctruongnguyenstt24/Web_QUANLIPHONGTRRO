import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
    
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/rooms', label: 'Phòng' },
  { to: '/admin/tenants', label: 'Người thuê' },
  { to: '/admin/contracts', label: 'Hợp đồng' },
  { to: '/admin/payments', label: 'Hoá đơn' },
  { to: '/admin/accounts', label: 'Tài khoản' },
];

const tenantLinks = [
  { to: '/toi', label: 'Trang chủ', end: true },
  { to: '/toi/phong', label: 'Phòng của tôi' },
  { to: '/toi/hoa-don', label: 'Hoá đơn của tôi' },
  { to: '/toi/ho-so', label: 'Hồ sơ' },
];

export default function Sidebar({ open, onClose }) {
  const { isAdmin, user } = useAuth();
  const links = isAdmin ? adminLinks : tenantLinks;

  return (
    <>
      {/* Lớp phủ khi mở menu trên mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-20 bg-navy/50 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col gap-1 bg-navy p-4 text-paper transition-transform
          md:static md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <span className="flex size-8 items-center justify-center rounded-md border-[1.5px] border-brass font-display text-sm font-semibold text-brass">
            QT
          </span>
          <span className="font-display font-semibold">QuảnTrọ</span>
        </div>

        <span className="mb-2 px-2 text-xs text-paper/50">
          {isAdmin ? 'Khu vực quản trị' : `Xin chào, ${user?.name || 'bạn'}`}
        </span>

        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={onClose}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm no-underline transition-colors ${
                isActive ? 'bg-brass font-semibold text-navy' : 'text-paper/85 hover:bg-white/10'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </aside>
    </>
  );
}