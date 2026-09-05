const Room = require('../models/Room');
const User = require('../models/User');

function publicRoom(room) {
  return {
    id: room._id,
    roomNumber: room.roomNumber,
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
 * Query: ?status=vacant&floor=2&search=101&minPrice=&maxPrice=
 * Người thuê cũng gọi được (để xem phòng trống), nhưng chỉ admin thấy danh sách người thuê.
 */
exports.getRooms = async (req, res) => {
  try {
    const { status, floor, search, minPrice, maxPrice } = req.query;

    const filter = {};
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
      .sort({ floor: 1, roomNumber: 1 });

    // Thống kê trên toàn bộ phòng, không phụ thuộc bộ lọc đang áp dụng
    const [total, vacant, occupied, maintenance] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'vacant' }),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'maintenance' }),
    ]);

    const revenue = await Room.aggregate([
      { $match: { status: 'occupied' } },
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
    const room = await Room.findById(req.params.id).populate('tenants', 'name phone email idCard');
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    res.json({ room: publicRoom(room) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /api/rooms */
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, price } = req.body;
    if (!roomNumber || price === undefined) {
      return res.status(400).json({ message: 'Vui lòng nhập số phòng và giá thuê' });
    }

    const duplicate = await Room.findOne({ roomNumber: roomNumber.trim() });
    if (duplicate) {
      return res.status(409).json({ message: `Phòng ${roomNumber} đã tồn tại` });
    }

    const room = await Room.create({ ...req.body, roomNumber: roomNumber.trim(), tenants: [] });
    res.status(201).json({ room: publicRoom(room) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Số phòng này đã tồn tại' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** PUT /api/rooms/:id */
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });

    const fields = [
      'roomNumber', 'floor', 'area', 'price', 'deposit', 'maxOccupants',
      'electricityPrice', 'waterPrice', 'amenities', 'description',
    ];
    fields.forEach((f) => {
      if (req.body?.[f] !== undefined) room[f] = req.body[f];
    });

    // Chỉ cho đổi thủ công sang/khỏi trạng thái bảo trì.
    // vacant/occupied do hook trong model tự tính theo số người thuê.
    if (req.body?.status === 'maintenance' || room.status === 'maintenance') {
      if (req.body?.status === 'maintenance' && room.tenants.length > 0) {
        return res.status(400).json({ message: 'Phòng đang có người thuê, không thể chuyển sang bảo trì' });
      }
      room.status = req.body?.status ?? room.status;
    }

    await room.save();
    await room.populate('tenants', 'name phone email');
    res.json({ room: publicRoom(room) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Số phòng này đã tồn tại' });
    }
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/rooms/:id */
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });

    // Xoá phòng còn người thuê sẽ để lại user trỏ tới phòng không tồn tại
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
    if (!tenant) return res.status(404).json({ message: 'Không tìm thấy người thuê' });

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

    // Hai chiều phải luôn khớp nhau: room.tenants và user.room
    await Promise.all([room.save(), tenant.save({ validateBeforeSave: false })]);
    await room.populate('tenants', 'name phone email');

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

    room.tenants = room.tenants.filter((t) => t.toString() !== tenantId);
    await room.save();

    await User.findByIdAndUpdate(tenantId, { room: null });
    await room.populate('tenants', 'name phone email');

    res.json({ message: 'Đã chuyển người thuê ra khỏi phòng', room: publicRoom(room) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * GET /api/rooms/available-tenants
 * Danh sách người thuê đã duyệt nhưng chưa có phòng, để đưa vào ô chọn.
 */
exports.getAvailableTenants = async (req, res) => {
  try {
    const tenants = await User.find({
      role: 'tenant',
      status: 'approved',
      isActive: true,
      $or: [{ room: null }, { room: { $exists: false } }],
    })
      .select('name email phone')
      .sort({ name: 1 });

    res.json({ tenants: tenants.map((t) => ({ id: t._id, name: t.name, email: t.email, phone: t.phone })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};