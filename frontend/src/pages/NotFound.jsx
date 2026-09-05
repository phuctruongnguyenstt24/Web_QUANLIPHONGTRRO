import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper p-10 text-center">
      <p className="font-display text-5xl font-semibold text-brass">404</p>
      <h2 className="font-display text-xl">Không tìm thấy trang</h2>
      <Link to="/" className="text-brass-text underline underline-offset-2">Về trang chủ</Link>
    </div>
  );
}