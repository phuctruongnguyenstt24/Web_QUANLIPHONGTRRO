const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* ---------- Tiện ích ---------- */

// Tạo JWT. Role LẤY TỪ DB, không bao giờ lấy từ req.body.
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

// Định dạng dữ liệu người dùng trả về cho client (không kèm mật khẩu)
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    avatar: user.avatar || null,
    room: user.room || null,
    idCard: user.idCard || null,
    dateOfBirth: user.dateOfBirth || null,
    address: user.address || null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * POST /api/auth/register
 * Đăng ký tài khoản người thuê. Vai trò luôn là 'tenant';
 * tài khoản admin phải do admin khác tạo qua /api/auth/create-admin.
 */
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên và mật khẩu' });
    }
    if (!email && !phone) {
      return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại' });
    }

    // Kiểm tra trùng
    const existed = await User.findOne({
      $or: [email ? { email: email.toLowerCase() } : null, phone ? { phone } : null].filter(Boolean),
    });
    if (existed) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: phone || undefined,
      password,
      role: 'tenant', // chốt cứng, không nhận role từ client
      authProvider: 'local',
    });

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * POST /api/auth/login
 * Đăng nhập bằng email hoặc số điện thoại.
 * Body: { identifier, password }
 */
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đăng nhập' });
    }

    const user = await User.findByIdentifier(identifier);

    // Trả cùng một thông báo cho cả hai trường hợp sai,
    // tránh để lộ tài khoản nào đang tồn tại trong hệ thống.
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không đúng' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hoá' });
    }
        if (user.status === 'pending') {
      return res.status(403).json({ message: 'Tài khoản đang chờ chủ trọ phê duyệt.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        message: user.rejectionReason || 'Tài khoản của bạn đã bị từ chối.',
      });
    }

    // Ghi nhận thời gian truy cập
    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/google
 * Đăng nhập/đăng ký bằng Google.
 * Body: { credential }  (ID token do Google Identity Services trả về)
 */
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Thiếu thông tin xác thực từ Google' });
    }

    // Xác minh token với Google. Cần: npm install google-auth-library
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Đã có tài khoản Google -> đăng nhập luôn
       let user = await User.findOne({ googleId });
    let isNewAccount = false;

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        // Liên kết Google vào tài khoản sẵn có, giữ nguyên status hiện tại
        user.googleId = googleId;
        if (!user.avatar) user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      } else {
        user = await User.create({
          name,
          email: email.toLowerCase(),
          googleId,
          avatar: picture,
          authProvider: 'google',
          role: 'tenant',
          status: 'pending', // vẫn phải chờ chủ trọ duyệt
        });
        isNewAccount = true;
      }
    }

    // Tài khoản mới tạo qua Google -> báo cho người dùng biết phải chờ
    if (isNewAccount) {
      return res.status(202).json({
        pending: true,
        message: 'Đã tạo tài khoản. Vui lòng chờ chủ trọ phê duyệt trước khi đăng nhập.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hoá' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Tài khoản đang chờ chủ trọ phê duyệt.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        message: user.rejectionReason || 'Tài khoản của bạn đã bị từ chối.',
      });
    }

    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    res.status(401).json({ message: 'Không xác thực được tài khoản Google' });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản đang đăng nhập. Cần middleware protect.
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('room', 'roomNumber price status');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng nhập email' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Luôn trả về thành công, kể cả khi email không tồn tại,
    // để không tiết lộ email nào có trong hệ thống.
    const successMessage = 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.';
    if (!user) return res.json({ message: successMessage });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // TODO: gửi email thật bằng nodemailer.
    // Khi đang phát triển, in ra console để tự copy link mà test.
    console.log('Link đặt lại mật khẩu:', resetUrl);

    res.json({ message: successMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/auth/me
 * Người dùng tự cập nhật thông tin của mình.
 * Không cho đổi role, status, room — những thứ đó chỉ admin mới được sửa.
 */
exports.updateMe = async (req, res) => {
  try {
    const { name, email, phone, idCard, dateOfBirth, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email ? email.toLowerCase() : undefined;
    if (phone !== undefined) user.phone = phone || undefined;
    if (idCard !== undefined) user.idCard = idCard;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;
    if (address !== undefined) user.address = address;

    await user.save();
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * PUT /api/auth/reset-password/:token
 * Body: { password }
 */
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Token trong DB là bản băm, nên phải băm token nhận được để so khớp
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Liên kết không hợp lệ hoặc đã hết hạn' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công', token: signToken(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }. Cần middleware protect.
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công', token: signToken(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/create-admin
 * Tạo tài khoản admin. Chỉ admin hiện có mới được gọi (protect + requireRole('admin')).
 */
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: phone || undefined,
      password,
      role: 'admin',
      authProvider: 'local',
      status: 'approved',           // thêm
      approvedBy: req.user.id,      // thêm
      approvedAt: new Date(),       // thêm
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};