export default function Footer() {
  return (
    <footer className="footer" style={{
      padding: '14px 24px', borderTop: '1px solid var(--line)', fontSize: 13,
      color: 'var(--slate)', background: 'var(--paper-2)',
    }}>
      © {new Date().getFullYear()} QuảnTrọ — Quản lý phòng trọ.
    </footer>
  );
}