import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  getErrorMessage,
} from '../../components/accountUi';

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

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(form.newPassword);
  const isGoogleAccount = user?.authProvider === 'google';

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!form.newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới.';
    else if (form.newPassword.length < 6) errs.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    else if (form.newPassword === form.currentPassword) {
      errs.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    }
    if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = 'Hai mật khẩu không khớp nhau.';
    }
    return errs;
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

    setSubmitting(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      // Backend cấp token mới sau khi đổi mật khẩu, phải lưu lại
      // nếu không các request sau sẽ dùng token cũ.
      if (res.data.token) login(res.data.token, user);

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Đổi mật khẩu thành công.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không đổi được mật khẩu.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>
      <Alert type="error" onClose={() => setError('')}>{error}</Alert>

      {isGoogleAccount && (
        <Alert type="info">
          Tài khoản của bạn đăng nhập bằng Google nên chưa có mật khẩu riêng. Hãy đổi mật khẩu Google
          trong phần cài đặt tài khoản Google.
        </Alert>
      )}

      <Card
        title="Đổi mật khẩu"
        description="Nhập mật khẩu hiện tại để xác nhận, sau đó đặt mật khẩu mới."
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={labelClass} htmlFor="cp-current">Mật khẩu hiện tại</label>
            <input
              id="cp-current"
              type={show ? 'text' : 'password'}
              className={`${inputClass} ${fieldErrors.currentPassword ? inputErrorClass : ''}`}
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
              disabled={submitting || isGoogleAccount}
            />
            <FieldError>{fieldErrors.currentPassword}</FieldError>
          </div>

          <div className="mb-4">
            <label className={labelClass} htmlFor="cp-new">Mật khẩu mới</label>
            <input
              id="cp-new"
              type={show ? 'text' : 'password'}
              className={`${inputClass} ${fieldErrors.newPassword ? inputErrorClass : ''}`}
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
              disabled={submitting || isGoogleAccount}
            />
            {form.newPassword && (
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
            <FieldError>{fieldErrors.newPassword}</FieldError>
          </div>

          <div className="mb-4">
            <label className={labelClass} htmlFor="cp-confirm">Nhập lại mật khẩu mới</label>
            <input
              id="cp-confirm"
              type={show ? 'text' : 'password'}
              className={`${inputClass} ${fieldErrors.confirmPassword ? inputErrorClass : ''}`}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              disabled={submitting || isGoogleAccount}
            />
            <FieldError>{fieldErrors.confirmPassword}</FieldError>
          </div>

          <label className="mb-5 flex w-fit cursor-pointer items-center gap-2 text-[13.5px] text-slate-ink">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="size-[15px] accent-navy"
            />
            Hiện mật khẩu
          </label>

          <div className="flex gap-2.5">
            <button type="submit" className={btnPrimary} disabled={submitting || isGoogleAccount}>
              {submitting && <Spinner />}
              {submitting ? 'Đang cập nhật…' : 'Đổi mật khẩu'}
            </button>
            <button type="button" className={btnGhost} onClick={() => navigate(-1)} disabled={submitting}>
              Quay lại
            </button>
          </div>
        </form>
      </Card>

      <div className="rounded-xl border border-line bg-paper/50 px-5 py-4">
        <h4 className="m-0 mb-2 text-sm font-semibold text-navy">Gợi ý đặt mật khẩu an toàn</h4>
        <ul className="m-0 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-ink">
          <li>Dài từ 10 ký tự trở lên, kết hợp chữ hoa, chữ thường và số</li>
          <li>Không dùng lại mật khẩu của email hay ngân hàng</li>
          <li>Tránh thông tin dễ đoán như ngày sinh, số điện thoại</li>
        </ul>
      </div>
    </div>
  );
}