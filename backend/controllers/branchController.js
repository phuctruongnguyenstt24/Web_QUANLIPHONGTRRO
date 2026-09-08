const Branch = require('../models/Branch');
const Room = require('../models/Room');
const User = require('../models/User');

function publicBranch(branch, stats) {
  return {
    id: branch._id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone || null,
    manager: branch.manager
      ? { id: branch.manager._id, name: branch.manager.name, phone: branch.manager.phone }
      : null,
    defaultElectricityPrice: branch.defaultElectricityPrice,
    defaultWaterPrice: branch.defaultWaterPrice,
    note: branch.note || '',
    isActive: branch.isActive,
    createdAt: branch.createdAt,
    ...(stats ? { stats } : {}),
  };
}

/**
 * GET /api/branches
 * Owner thấy tất cả; manager chỉ thấy chi nhánh của mình.
 */
exports.getBranches = async (req, res) => {
  try {
    const filter = req.user.role === 'owner' ? {} : { _id: req.user.branch };
    if (req.query.active === 'true') filter.isActive = true;

    const branches = await Branch.find(filter)
      .populate('manager', 'name phone')
      .sort({ name: 1 });

    // Gộp thống kê phòng của tất cả chi nhánh trong một truy vấn
    const ids = branches.map((b) => b._id);
    const roomStats = await Room.aggregate([
      { $match: { branch: { $in: ids } } },
      {
        $group: {
          _id: '$branch',
          totalRooms: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          vacant: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, '$price', 0] } },
        },
      },
    ]);

    const tenantStats = await User.aggregate([
      { $match: { branch: { $in: ids }, role: 'tenant', status: 'approved' } },
      { $group: { _id: '$branch', tenants: { $sum: 1 } } },
    ]);

    const roomMap = Object.fromEntries(roomStats.map((s) => [s._id.toString(), s]));
    const tenantMap = Object.fromEntries(tenantStats.map((s) => [s._id.toString(), s.tenants]));

    const result = branches.map((b) => {
      const r = roomMap[b._id.toString()] || {};
      return publicBranch(b, {
        totalRooms: r.totalRooms || 0,
        occupied: r.occupied || 0,
        vacant: r.vacant || 0,
        revenue: r.revenue || 0,
        tenants: tenantMap[b._id.toString()] || 0,
      });
    });

    res.json({ branches: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/branches/:id */
exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('manager', 'name phone email');
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

    if (req.user.role !== 'owner' && branch._id.toString() !== req.user.branch?.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền xem chi nhánh này' });
    }

    res.json({ branch: publicBranch(branch) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/branches — chỉ owner */
exports.createBranch = async (req, res) => {
  try {
    const { name, code, address } = req.body || {};
    if (!name || !code || !address) {
      return res.status(400).json({ message: 'Vui lòng nhập tên, mã và địa chỉ chi nhánh' });
    }

    const duplicate = await Branch.findOne({ code: code.toUpperCase().trim() });
    if (duplicate) {
      return res.status(409).json({ message: `Mã chi nhánh ${code} đã tồn tại` });
    }

    const branch = await Branch.create({
      ...req.body,
      code: code.toUpperCase().trim(),
      manager: null, // gán quản lý bằng route riêng
    });

    res.status(201).json({ branch: publicBranch(branch) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Mã chi nhánh đã tồn tại' });
    res.status(400).json({ message: err.message });
  }
};

/** PUT /api/branches/:id — chỉ owner */
exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

    const fields = ['name', 'address', 'phone', 'defaultElectricityPrice', 'defaultWaterPrice', 'note', 'isActive'];
    fields.forEach((f) => {
      if (req.body?.[f] !== undefined) branch[f] = req.body[f];
    });

    if (req.body?.code) branch.code = req.body.code.toUpperCase().trim();

    // Ngừng hoạt động chi nhánh còn phòng đang cho thuê sẽ khiến
    // người thuê mất quyền truy cập đột ngột.
    if (req.body?.isActive === false) {
      const occupied = await Room.countDocuments({ branch: branch._id, status: 'occupied' });
      if (occupied > 0) {
        return res.status(400).json({
          message: `Chi nhánh còn ${occupied} phòng đang cho thuê, không thể ngừng hoạt động.`,
        });
      }
    }

    await branch.save();
    await branch.populate('manager', 'name phone');
    res.json({ branch: publicBranch(branch) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Mã chi nhánh đã tồn tại' });
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/branches/:id — chỉ owner */
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

    const [roomCount, userCount] = await Promise.all([
      Room.countDocuments({ branch: branch._id }),
      User.countDocuments({ branch: branch._id }),
    ]);

    // Xoá chi nhánh còn dữ liệu sẽ để lại phòng và tài khoản mồ côi
    if (roomCount > 0 || userCount > 0) {
      return res.status(400).json({
        message: `Chi nhánh còn ${roomCount} phòng và ${userCount} tài khoản. Hãy chuyển hoặc xoá chúng trước.`,
      });
    }

    await branch.deleteOne();
    res.json({ message: 'Đã xoá chi nhánh' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/branches/:id/manager — chỉ owner
 * Body: { userId } hoặc { userId: null } để gỡ quản lý
 */
exports.assignManager = async (req, res) => {
  try {
    const { userId } = req.body || {};
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

    // Gỡ quản lý hiện tại
    if (!userId) {
      if (branch.manager) {
        await User.findByIdAndUpdate(branch.manager, { role: 'tenant', branch: null });
      }
      branch.manager = null;
      await branch.save();
      return res.json({ message: 'Đã gỡ quản lý chi nhánh', branch: publicBranch(branch) });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (user.role === 'owner') {
      return res.status(400).json({ message: 'Không thể gán chủ hệ thống làm quản lý chi nhánh' });
    }
    if (user.room) {
      return res.status(400).json({ message: 'Tài khoản này đang thuê phòng, không thể làm quản lý' });
    }

    // Quản lý cũ trở lại vai trò thường
    if (branch.manager && branch.manager.toString() !== userId) {
      await User.findByIdAndUpdate(branch.manager, { role: 'tenant', branch: null });
    }

    user.role = 'manager';
    user.branch = branch._id;
    user.status = 'approved';
    branch.manager = user._id;

    await Promise.all([user.save({ validateBeforeSave: false }), branch.save()]);
    await branch.populate('manager', 'name phone');

    res.json({ message: `Đã giao ${user.name} quản lý chi nhánh ${branch.name}`, branch: publicBranch(branch) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};