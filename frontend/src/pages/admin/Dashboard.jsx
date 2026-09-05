import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const formatVnd = (n) => (n || 0).toLocaleString('vi-VN') + ' đ';

function StatCard({ label, value, accent = 'text-navy' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <p className="m-0 text-[13px] text-slate-ink">{label}</p>
      <p className={`m-0 mt-1 font-display text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        // Gọi song song cho nhanh
        const [roomRes, userRes] = await Promise.all([
          api.get('/rooms'),
          api.get('/users', { params: { status: 'pending', role: 'tenant' } }),
        ]);
        if (ignore) return;

        setRooms(roomRes.data.rooms);
        setStats(roomRes.data.stats);
        setPendingCount(userRes.data.pendingCount);
      } catch (err) {
        if (!ignore) setError(err.response?.data?.message || 'Không tải được dữ liệu.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, []);

  if (loading) return <p className="text-slate-ink">Đang tải…</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
        {error}
      </div>
    );
  }

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const vacantRooms = rooms.filter((r) => r.status === 'vacant');

  return (
    <div>
      {pendingCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brass/30 bg-brass/10 px-4 py-3">
          <p className="m-0 text-sm text-brass-text">
            Có <strong>{pendingCount}</strong> tài khoản đang chờ bạn phê duyệt.
          </p>
          <Link
            to="/admin/accounts"
            className="rounded-md bg-navy px-3 py-1.5 text-[13px] font-medium text-paper hover:bg-navy-soft"
          >
            Xem ngay
          </Link>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng số phòng" value={stats.total} />
        <StatCard label="Còn trống" value={stats.vacant} accent="text-moss" />
        <StatCard label="Đã cho thuê" value={stats.occupied} accent="text-brass-text" />
        <StatCard label="Doanh thu / tháng" value={formatVnd(stats.monthlyRevenue)} />
      </div>

      {/* Tỷ lệ lấp đầy */}
      <div className="mb-6 rounded-xl border border-line bg-white px-6 py-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="m-0 font-display text-base font-semibold">Tỷ lệ lấp đầy</h3>
          <span className="font-display text-xl font-semibold text-navy">{occupancyRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${occupancyRate}%` }} />
        </div>
        <p className="m-0 mt-2 text-[13px] text-slate-ink">
          {stats.occupied}/{stats.total} phòng đang có người thuê
          {stats.maintenance > 0 && ` · ${stats.maintenance} phòng đang bảo trì`}
        </p>
      </div>

      {/* Phòng còn trống */}
      <div className="rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-display text-base font-semibold">Phòng còn trống</h3>
          <Link to="/admin/rooms" className="text-[13px] text-brass-text underline underline-offset-2">
            Quản lý phòng
          </Link>
        </div>

        <div className="px-6 py-5">
          {stats.total === 0 ? (
            <p className="m-0 text-sm text-slate-ink">
              Chưa có phòng nào. <Link to="/admin/rooms" className="text-brass-text underline">Thêm phòng đầu tiên</Link>.
            </p>
          ) : vacantRooms.length === 0 ? (
            <p className="m-0 text-sm text-slate-ink">Tất cả phòng đều đã cho thuê.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {vacantRooms.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5">
                  <span className="text-sm font-medium text-navy">Phòng {r.roomNumber}</span>
                  <span className="text-[13px] text-slate-ink">{formatVnd(r.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}