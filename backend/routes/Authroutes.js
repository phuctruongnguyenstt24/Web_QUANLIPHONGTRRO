const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  googleLogin,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  changePassword,
  createOwner,
} = require('../controllers/Authcontroller');

const { protect, requireRole } = require('../middleware/Auth');

/**
 * Giới hạn số lần thử đăng nhập / quên mật khẩu từ cùng một IP,
 * tránh bị dò mật khẩu bằng cách thử hàng loạt.
 * Cần: npm install express-rate-limit
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: { message: 'Bạn đã thử quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------- Route công khai ---------- */
router.post('/register', register);
router.post('/login', authLimiter, login);
router.post('/google', googleLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

/* ---------- Route cần đăng nhập ---------- */
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

/* ---------- Route chỉ dành cho admin ---------- */

router.post('/create-owner', protect, requireRole('owner'), createOwner);

module.exports = router;