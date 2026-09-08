const User = require('../models/User');
const Branch = require('../models/Branch');
const { canAccessBranch } = require('../middleware/branchScope');

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
    branch: user.branch?._id
      ? { id: user.branch._id, name: user.branch.name, code: user.branch.code }
      : user.branch || null,
    room: user.room?._id ? { id: user.room._id, roomNumber: user.room.roomNumber } : user.room || null,
    rejectionReason: user.rejectionReason || null,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount,
    approvedAt: user.approvedAt,
    createdAt: user.createdAt,
  };
}

/**
 * GET /api/users
 * Query: ?status=pending&role=tenant&search=abc&branch=<id>&page=1&limit=20
 */
exports.getUsers = async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 20 } = req.query;

    // Phạm vi chi nhánh áp trước mọi bộ lọc khác
    const filter = { ...req.branchFilter };
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) {
      const rx = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    // Manager không được xem tài khoản owner
    if (req.user.role === 'manager') {
      filter.role = role && role !== 'owner' ? role : { $in: ['tenant', 'manager'] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total, pendingCount] = await Promise.all([
      User.find(filter)
        .populate('room', 'roomNumber')
        .populate('branch', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
      // Số chờ duyệt cũng theo phạm vi chi nhánh
      User.countDocuments({ ...req.branchFilter, status: 'pending', role: 'tenant' }),
    ]);

    res.json({
      users: users.map(publicUser),
      total,
      pendingCount,
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
      .populate('branch', 'name code');

    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }

    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/users
 * Tạo tài khoản người thuê, duyệt sẵn.
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, idCard, role = 'tenant' } = req.body || {};

    if (!name || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên và mật khẩu' });
    }
    if (!email && !phone) {
      return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại' });
    }

    // Manager chỉ được tạo tài khoản người thuê.
    // Nếu bỏ kiểm tra này, manager có thể tự tạo thêm owner cho mình.
    if (req.user.role === 'manager' && role !== 'tenant') {
      return res.status(403).json({ message: 'Bạn chỉ được tạo tài khoản người thuê' });
    }
    if (!['tenant', 'manager'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    const branch = await Branch.findById(req.targetBranch);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

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
      role,
      branch: req.targetBranch, // từ middleware, không lấy thẳng từ req.body
      authProvider: 'local',
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    await user.populate('branch', 'name code');
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** PUT /api/users/:id */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, idCard, role, isActive, branch } = req.body || {};

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }
    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Không thể sửa tài khoản chủ hệ thống' });
    }

    // Không tự hạ quyền hoặc tự khoá chính mình
    if (user._id.toString() === req.user.id.toString()) {
      if (role && role !== user.role) {
        return res.status(400).json({ message: 'Không thể tự thay đổi vai trò của chính mình' });
      }
      if (isActive === false) {
        return res.status(400).json({ message: 'Không thể tự vô hiệu hoá tài khoản của mình' });
      }
    }

    // Chuyển tài khoản sang chi nhánh khác: chỉ owner, và phải chưa có phòng
    if (branch && branch !== user.branch?.toString()) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Chỉ chủ hệ thống mới chuyển được tài khoản sang chi nhánh khác' });
      }
      if (user.room) {
        return res.status(400).json({ message: 'Người này đang thuê phòng, hãy chuyển họ ra khỏi phòng trước' });
      }
      user.branch = branch;
    }

    // Chỉ owner mới đổi được vai trò
    if (role !== undefined) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Chỉ chủ hệ thống mới thay đổi được vai trò' });
      }
      user.role = role;
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email ? email.toLowerCase() : undefined;
    if (phone !== undefined) user.phone = phone || undefined;
    if (idCard !== undefined) user.idCard = idCard;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    await user.populate([
      { path: 'branch', select: 'name code' },
      { path: 'room', select: 'roomNumber' },
    ]);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** PATCH /api/users/:id/approve */
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }
    if (user.status === 'approved') {
      return res.status(400).json({ message: 'Tài khoản này đã được duyệt' });
    }

    // Người đăng ký tự do chưa có chi nhánh, gán khi duyệt
    if (!user.branch) {
      const target = req.body?.branch || req.user.branch;
      if (!target) {
        return res.status(400).json({ message: 'Vui lòng chọn chi nhánh cho tài khoản này' });
      }
      user.branch = target;
    }

    user.status = 'approved';
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    user.rejectionReason = undefined;

    await user.save({ validateBeforeSave: false });
    await user.populate('branch', 'name code');

    res.json({ message: 'Đã phê duyệt tài khoản', user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** PATCH /api/users/:id/reject */
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }
    if (['owner', 'manager'].includes(user.role)) {
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

/** DELETE /api/users/:id */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Không thể xoá tài khoản của chính mình' });
    }
    if (user.role === 'owner') {
      const ownerCount = await User.countDocuments({ role: 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Phải còn ít nhất một tài khoản chủ hệ thống' });
      }
      if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Không thể xoá tài khoản chủ hệ thống' });
      }
    }
    if (user.room) {
      return res.status(400).json({
        message: 'Người này đang thuê phòng. Hãy chuyển họ ra khỏi phòng trước khi xoá.',
      });
    }

    await user.deleteOne();
    res.json({ message: 'Đã xoá tài khoản' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /api/users/:id/reset-password */
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (!canAccessBranch(req, user)) {
      return res.status(403).json({ message: 'Tài khoản này không thuộc chi nhánh của bạn' });
    }
    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Không thể đặt lại mật khẩu của chủ hệ thống' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đã đặt lại mật khẩu' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};