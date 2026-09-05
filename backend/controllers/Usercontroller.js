const User = require('../models/User');

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    idCard: user.idCard || null,
    room: user.room || null,
    rejectionReason: user.rejectionReason || null,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy || null,
    createdAt: user.createdAt,
  };
}

/**
 * GET /api/users
 * Query: ?status=pending&role=tenant&search=abc&page=1&limit=20
 */
exports.getUsers = async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) {
      const rx = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total, pendingCount] = await Promise.all([
      User.find(filter)
        .populate('room', 'roomNumber')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
      User.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      users: users.map(publicUser),
      total,
      pendingCount, // để hiện chấm đỏ trên menu
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/users/:id */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('room', 'roomNumber price')
      .populate('approvedBy', 'name');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/users
 * Admin tạo tài khoản người thuê -> duyệt sẵn, không phải chờ.
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, idCard, room, role = 'tenant' } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên và mật khẩu' });
    }
    if (!email && !phone) {
      return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại' });
    }
    if (!['admin', 'tenant'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    const duplicate = await User.findOne({
      $or: [email ? { email: email.toLowerCase() } : null, phone ? { phone } : null].filter(Boolean),
    });
    if (duplicate) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: phone || undefined,
      password,
      idCard,
      room: room || null,
      role,
      authProvider: 'local',
      status: 'approved', // admin tạo thì duyệt luôn
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * PUT /api/users/:id
 * Không cho sửa password qua route này (dùng reset password riêng).
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, idCard, room, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    // Không cho admin tự hạ quyền hoặc tự khoá chính mình
    if (user._id.toString() === req.user.id.toString()) {
      if (role && role !== user.role) {
        return res.status(400).json({ message: 'Không thể tự thay đổi vai trò của chính mình' });
      }
      if (isActive === false) {
        return res.status(400).json({ message: 'Không thể tự vô hiệu hoá tài khoản của mình' });
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email ? email.toLowerCase() : undefined;
    if (phone !== undefined) user.phone = phone || undefined;
    if (idCard !== undefined) user.idCard = idCard;
    if (room !== undefined) user.room = room || null;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

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
 * PATCH /api/users/:id/approve
 * Phê duyệt tài khoản đăng ký.
 */
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (user.status === 'approved') {
      return res.status(400).json({ message: 'Tài khoản này đã được duyệt' });
    }

    user.status = 'approved';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    user.rejectionReason = undefined;
    if (req.body?.room) user.room = req.body.room;

    await user.save({ validateBeforeSave: false });
    res.json({ message: 'Đã phê duyệt tài khoản', user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * PATCH /api/users/:id/reject
 * Body: { reason }
 */
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Không thể từ chối tài khoản quản trị' });
    }

    user.status = 'rejected';
    user.rejectionReason = req.body?.reason || 'Không đủ điều kiện thuê phòng';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();

    await user.save({ validateBeforeSave: false });
    res.json({ message: 'Đã từ chối tài khoản', user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Không thể xoá tài khoản của chính mình' });
    }

    // Giữ lại ít nhất một admin trong hệ thống
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Phải còn ít nhất một tài khoản quản trị' });
      }
    }

    await user.deleteOne();
    res.json({ message: 'Đã xoá tài khoản' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/users/:id/reset-password
 * Admin đặt lại mật khẩu hộ người thuê khi họ quên.
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đã đặt lại mật khẩu' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};