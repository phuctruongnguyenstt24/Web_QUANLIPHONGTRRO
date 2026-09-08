const Room = require('../models/Room');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { canAccessBranch } = require('../middleware/branchScope');

function publicRoom(room) {
  return {
    id: room._id,
    roomNumber: room.roomNumber,
    branch: room.branch?._id
      ? { id: room.branch._id, name: room.branch.name, code: room.branch.code }
      : room.branch || null,
    floor: room.floor,
    area: room.area,
    price: room.price,
    deposit: room.deposit,
    maxOccupants: room.maxOccupants,
    electricityPrice: room.electricityPrice,
    waterPrice: room.waterPrice,
    amenities: room.amenities || [],
    description: room.description || '',
    status: room.status,
    tenants: (room.tenants || []).map((t) =>
      t._id ? { id: t._id, name: t.name, phone: t.phone, email: t.email } : { id: t }
    ),
    createdAt: room.createdAt,
  };
}

/**
 * GET /api/rooms
 * req.branchFilter do middleware branchScope gắn vào:
 *   owner   -> {} hoặc { branch: <id được chọn> }
 *   manager -> { branch: <chi nhánh của họ> }
 */
exports.getRooms = async (req, res) => {
  try {
    const { status, floor, search, minPrice, maxPrice } = req.query;

    // Phạm vi chi nhánh đặt TRƯỚC, các bộ lọc khác trộn vào sau
    const filter = { ...req.branchFilter };
    if (status) filter.status = status;
    if (floor) filter.floor = Number(floor);
    if (search) filter.roomNumber = new RegExp(search.trim(), 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const rooms = await Room.find(filter)
      .populate('tenants', 'name phone email')
      .populate('branch', 'name code')
      .sort({ floor: 1, roomNumber: 1 });

    // Thống kê cũng phải nằm trong phạm vi chi nhánh, nếu không
    // manager sẽ thấy con số của toàn hệ thống.
    const scope = req.branchFilter;
    const [total, vacant, occupied, maintenance] = await Promise.all([
      Room.countDocuments(scope),
      Room.countDocuments({ ...scope, status: 'vacant' }),
      Room.countDocuments({ ...scope, status: 'occupied' }),
      Room.countDocuments({ ...scope, status: 'maintenance' }),
    ]);

    const revenue = await Room.aggregate([
      { $match: { ...scope, status: 'occupied' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    res.json({
      rooms: rooms.map(publicRoom),
      stats: {
        total,
        vacant,
        occupied,
        maintenance,
        monthlyRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/rooms/:id */
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('tenants', 'name phone email idCard')
      .populate('branch', 'name code');

    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    if (!canAccessBranch(req, room)) {
      return res.status(403).json({ message: 'Phòng này không thuộc chi nhánh của bạn' });
    }

    res.json({ room: publicRoom(room) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/rooms
 * req.targetBranch do middleware resolveBranchForCreate gắn vào.
 */
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, price } = req.body || {};
    if (!roomNumber || price === undefined) {
      return res.status(400).json({ message: 'Vui lòng nhập số phòng và giá thuê' });
    }

    const branch = await Branch.findById(req.targetBranch);
    if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
    if (!branch.isActive) {
      return res.status(400).json({ message: 'Chi nhánh này đã ngừng hoạt động' });
    }

    // Số phòng chỉ cần duy nhất TRONG chi nhánh — hai chi nhánh
    // đều được có phòng 101.
    const duplicate = await Room.findOne({
      branch: req.targetBranch,
      roomNumber: roomNumber.trim(),
    });
    if (duplicate) {
      return res.status(409).json({ message: `Phòng ${roomNumber} đã tồn tại ở ${branch.name}` });
    }

    const room = await Room.create({
      ...req.body,
      roomNumber: roomNumber.trim(),
      branch: req.targetBranch, // lấy từ middleware, KHÔNG lấy thẳng từ req.body
      electricityPrice: req.body.electricityPrice ?? branch.defaultElectricityPrice,
      waterPrice: req.body.waterPrice ?? branch.defaultWaterPrice,
      tenants: [],
    });

    await room.populate('branch', 'name code');
    res.status(201).json({ room: publicRoom(room) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Số phòng này đã tồn tại trong chi nhánh' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** PUT /api/rooms/:id */
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    if (!canAccessBranch(req, room)) {
      return res.status(403).json({ message: 'Phòng này không thuộc chi nhánh của bạn' });
    }

    // Chuyển phòng sang chi nhánh khác: chỉ owner, và phòng phải trống
    if (req.body?.branch && req.body.branch !== room.branch.toString()) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Chỉ chủ hệ thống mới chuyển được phòng sang chi nhánh khác' });
      }
      if (room.tenants.length > 0) {
        return res.status(400).json({ message: 'Phòng đang có người thuê, không thể chuyển chi nhánh' });
      }
      room.branch = req.body.branch;
    }

    const fields = [
      'roomNumber', 'floor', 'area', 'price', 'deposit', 'maxOccupants',
      'electricityPrice', 'waterPrice', 'amenities', 'description',
    ];
    fields.forEach((f) => {
      if (req.body?.[f] !== undefined) room[f] = req.body[f];
    });

    if (req.body?.status === 'maintenance' || room.status === 'maintenance') {
      if (req.body?.status === 'maintenance' && room.tenants.length > 0) {
        return res.status(400).json({ message: 'Phòng đang có người thuê, không thể chuyển sang bảo trì' });
      }
      room.status = req.body?.status ?? room.status;
    }

    await room.save();
    await room.populate([
      { path: 'tenants', select: 'name phone email' },
      { path: 'branch', select: 'name code' },
    ]);
    res.json({ room: publicRoom(room) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Số phòng này đã tồn tại trong chi nhánh' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/rooms/:id */
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    if (!canAccessBranch(req, room)) {
      return res.status(403).json({ message: 'Phòng này không thuộc chi nhánh của bạn' });
    }

    if (room.tenants.length > 0) {
      return res.status(400).json({
        message: 'Phòng đang có người thuê. Hãy chuyển họ ra khỏi phòng trước khi xoá.',
      });
    }

    await room.deleteOne();
    res.json({ message: 'Đã xoá phòng' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/rooms/:id/tenants
 * Body: { tenantId }
 */
exports.assignTenant = async (req, res) => {
  try {
    const { tenantId } = req.body || {};
    if (!tenantId) return res.status(400).json({ message: 'Thiếu thông tin người thuê' });

    const [room, tenant] = await Promise.all([
      Room.findById(req.params.id),
      User.findById(tenantId),
    ]);

    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    if (!canAccessBranch(req, room)) {
      return res.status(403).json({ message: 'Phòng này không thuộc chi nhánh của bạn' });
    }
    if (!tenant) return res.status(404).json({ message: 'Không tìm thấy người thuê' });

    // Người thuê phải cùng chi nhánh với phòng. Thiếu kiểm tra này,
    // manager chi nhánh A có thể kéo người thuê của chi nhánh B sang phòng mình.
    if (tenant.branch?.toString() !== room.branch.toString()) {
      return res.status(400).json({ message: 'Người thuê này không thuộc chi nhánh của phòng' });
    }
    if (tenant.role !== 'tenant') {
      return res.status(400).json({ message: 'Chỉ có thể xếp phòng cho tài khoản người thuê' });
    }
    if (tenant.status !== 'approved') {
      return res.status(400).json({ message: 'Tài khoản này chưa được phê duyệt' });
    }
    if (room.status === 'maintenance') {
      return res.status(400).json({ message: 'Phòng đang bảo trì' });
    }
    if (room.tenants.some((t) => t.toString() === tenantId)) {
      return res.status(400).json({ message: 'Người này đã ở trong phòng' });
    }
    if (room.tenants.length >= room.maxOccupants) {
      return res.status(400).json({ message: `Phòng đã đủ ${room.maxOccupants} người` });
    }
    if (tenant.room && tenant.room.toString() !== room._id.toString()) {
      return res.status(400).json({ message: 'Người này đang thuê phòng khác' });
    }

    room.tenants.push(tenantId);
    tenant.room = room._id;

    await Promise.all([room.save(), tenant.save({ validateBeforeSave: false })]);
    await room.populate([
      { path: 'tenants', select: 'name phone email' },
      { path: 'branch', select: 'name code' },
    ]);

    res.json({ message: `Đã xếp ${tenant.name} vào phòng ${room.roomNumber}`, room: publicRoom(room) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/rooms/:id/tenants/:tenantId */
exports.removeTenant = async (req, res) => {
  try {
    const { id, tenantId } = req.params;

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    if (!canAccessBranch(req, room)) {
      return res.status(403).json({ message: 'Phòng này không thuộc chi nhánh của bạn' });
    }

    room.tenants = room.tenants.filter((t) => t.toString() !== tenantId);
    await room.save();

    // Gỡ phòng nhưng GIỮ chi nhánh — người này vẫn thuộc chi nhánh đó,
    // chỉ là chưa được xếp phòng mới.
    await User.findByIdAndUpdate(tenantId, { room: null });

    await room.populate([
      { path: 'tenants', select: 'name phone email' },
      { path: 'branch', select: 'name code' },
    ]);

    res.json({ message: 'Đã chuyển người thuê ra khỏi phòng', room: publicRoom(room) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * GET /api/rooms/available-tenants
 * Người thuê đã duyệt, chưa có phòng, trong phạm vi chi nhánh cho phép.
 */
exports.getAvailableTenants = async (req, res) => {
  try {
    const tenants = await User.find({
      ...req.branchFilter,
      role: 'tenant',
      status: 'approved',
      isActive: true,
      $or: [{ room: null }, { room: { $exists: false } }],
    })
      .select('name email phone branch')
      .populate('branch', 'name')
      .sort({ name: 1 });

    res.json({
      tenants: tenants.map((t) => ({
        id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        branch: t.branch ? { id: t.branch._id, name: t.branch.name } : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};