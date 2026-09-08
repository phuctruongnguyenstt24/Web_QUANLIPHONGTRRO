const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Xác thực JWT. Gắn { id, role } vào req.user nếu hợp lệ.
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra lại trong DB: tài khoản có thể đã bị xoá hoặc đổi vai trò
    // sau khi token được cấp, nên không tin tuyệt đối vào payload.
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hoá' });
    }

 req.user = {
      id: user._id,
      role: user.role,
      name: user.name,
      branch: user.branch,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

/**
 * Chặn theo vai trò. Dùng sau protect.
 * Ví dụ: router.delete('/:id', protect, requireRole('owner', 'manager'), deleteRoom);
 */
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
  }
  next();
};