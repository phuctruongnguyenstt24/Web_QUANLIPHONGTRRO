import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  inputClass,
  inputErrorClass,
  labelClass,
  btnPrimary,
  btnGhost,
  Spinner,
  Card,
  Alert,
  FieldError,
  formatDate,
  formatDateTime,
  getErrorMessage,
} from '../../components/accountUi';

// Chuyển ISO date sang định dạng mà input type="date" hiểu được
function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function Profile() {
  const { user: authUser, isAdmin, login, token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    idCard: '',
    dateOfBirth: '',
    address: '',
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await api.get('/auth/me');
        if (ignore) return;
        const u = res.data.user;
        setProfile(u);
        setForm({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          idCard: u.idCard || '',
          dateOfBirth: toDateInput(u.dateOfBirth),
          address: u.address || '',
        });
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được thông tin hồ sơ.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên.';
    if (!form.email.trim() && !form.phone.trim()) {
      errs.email = 'Cần có email hoặc số điện thoại.';
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errs.email = 'Email không hợp lệ.';
    }
    if (form.phone.trim() && !/^(0|\+84)[0-9]{9}$/.test(form.phone.trim())) {
      errs.phone = 'Số điện thoại không hợp lệ.';
    }
    return errs;
  }

  function cancelEdit() {
    setForm({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      idCard: profile.idCard || '',
      dateOfBirth: toDateInput(profile.dateOfBirth),
      address: profile.address || '',
    });
    setFieldErrors({});
    setError('');
    setEditing(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/auth/me', {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        idCard: form.idCard.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address.trim() || undefined,
      });

      const updated = res.data.user;
      setProfile(updated);
      // Cập nhật lại context để tên trên Header đổi theo ngay
      login(token, { ...authUser, ...updated });
      setEditing(false);
      setSuccess('Đã lưu thay đổi.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được thay đổi.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-slate-ink">Đang tải hồ sơ…</p>;
  }
  if (!profile) {
    return <Alert type="error">{error || 'Không tìm thấy hồ sơ.'}</Alert>;
  }

  const initials = (profile.name || 'ND')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-4xl">
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>
      <Alert type="error" onClose={() => setError('')}>{error}</Alert>

      {/* ---------- Thẻ tóm tắt ---------- */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white px-6 py-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy font-display text-lg font-semibold text-paper">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-display text-lg font-semibold text-navy">{profile.name}</h2>
          <p className="m-0 truncate text-sm text-slate-ink">{profile.email || profile.phone}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            isAdmin
              ? 'border-brass/30 bg-brass/15 text-brass-text'
              : 'border-moss/30 bg-moss/15 text-moss'
          }`}
        >
          {isAdmin ? 'Chủ trọ' : 'Người thuê'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* ---------- Thông tin cá nhân ---------- */}
        <Card
          title="Thông tin cá nhân"
          description="Thông tin này dùng cho hợp đồng và liên hệ."
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className={labelClass} htmlFor="pf-name">Họ và tên</label>
              <input
                id="pf-name"
                className={`${inputClass} ${fieldErrors.name ? inputErrorClass : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={!editing || saving}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="pf-email">Email</label>
                <input
                  id="pf-email"
                  type="email"
                  className={`${inputClass} ${fieldErrors.email ? inputErrorClass : ''}`}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  disabled={!editing || saving}
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-phone">Số điện thoại</label>
                <input
                  id="pf-phone"
                  type="tel"
                  className={`${inputClass} ${fieldErrors.phone ? inputErrorClass : ''}`}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  disabled={!editing || saving}
                />
                <FieldError>{fieldErrors.phone}</FieldError>
              </div>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="pf-idcard">CCCD / CMND</label>
                <input
                  id="pf-idcard"
                  className={inputClass}
                  value={form.idCard}
                  onChange={(e) => set('idCard', e.target.value)}
                  disabled={!editing || saving}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-dob">Ngày sinh</label>
                <input
                  id="pf-dob"
                  type="date"
                  className={inputClass}
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                  disabled={!editing || saving}
                />
              </div>
            </div>

            <div className="mb-1">
              <label className={labelClass} htmlFor="pf-address">Địa chỉ thường trú</label>
              <textarea
                id="pf-address"
                rows={2}
                className={`${inputClass} resize-none`}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                disabled={!editing || saving}
              />
            </div>

            <div className="mt-5 flex gap-2.5">
              {editing ? (
                <>
                  <button type="submit" className={btnPrimary} disabled={saving}>
                    {saving && <Spinner />}
                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                  <button type="button" className={btnGhost} onClick={cancelEdit} disabled={saving}>
                    Huỷ
                  </button>
                </>
              ) : (
                <button type="button" className={btnPrimary} onClick={() => setEditing(true)}>
                  Chỉnh sửa
                </button>
              )}
            </div>
          </form>
        </Card>

        {/* ---------- Thông tin tài khoản ---------- */}
        <div>
          <Card title="Tài khoản">
            <dl className="m-0 space-y-3.5 text-sm">
              <div>
                <dt className="text-[13px] text-slate-ink">Vai trò</dt>
                <dd className="m-0 mt-0.5 font-medium text-navy">
                  {isAdmin ? 'Chủ trọ' : 'Người thuê'}
                </dd>
              </div>

              {!isAdmin && (
                <div>
                  <dt className="text-[13px] text-slate-ink">Phòng đang thuê</dt>
                  <dd className="m-0 mt-0.5 font-medium text-navy">
                    {profile.room?.roomNumber ? `Phòng ${profile.room.roomNumber}` : 'Chưa được xếp phòng'}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-[13px] text-slate-ink">Đăng nhập bằng</dt>
                <dd className="m-0 mt-0.5 font-medium text-navy">
                  {profile.authProvider === 'google' ? 'Google' : 'Email / SĐT'}
                </dd>
              </div>

              <div>
                <dt className="text-[13px] text-slate-ink">Ngày tham gia</dt>
                <dd className="m-0 mt-0.5 font-medium text-navy">{formatDate(profile.createdAt)}</dd>
              </div>

              <div>
                <dt className="text-[13px] text-slate-ink">Đăng nhập gần nhất</dt>
                <dd className="m-0 mt-0.5 font-medium text-navy">{formatDateTime(profile.lastLoginAt)}</dd>
              </div>
            </dl>
          </Card>

          <p className="px-1 text-xs leading-relaxed text-slate-ink">
            Cần đổi phòng hoặc thay đổi thông tin hợp đồng? Liên hệ chủ trọ để được cập nhật.
          </p>
        </div>
      </div>
    </div>
  );
}