const Invoice = require('../models/Invoice');
const Room = require('../models/Room');
const { canAccessBranch } = require('../middleware/branchScope');

function publicInvoice(inv) {
  return {
    id: inv._id,
    code: inv.code,
    branch: inv.branch?._id ? { id: inv.branch._id, name: inv.branch.name } : inv.branch,
    room: inv.room?._id ? { id: inv.room._id, roomNumber: inv.room.roomNumber } : inv.room,
    tenant: inv.tenant?._id
      ? { id: inv.tenant._id, name: inv.tenant.name, phone: inv.tenant.phone }
      : inv.tenant,
    month: inv.month,
    year: inv.year,
    roomPrice: inv.roomPrice,
    electricityStart: inv.electricityStart,
    electricityEnd: inv.electricityEnd,
    electricityPrice: inv.electricityPrice,
    electricityUsed: Math.max(0, inv.electricityEnd - inv.electricityStart),
    electricityAmount: inv.electricityAmount,
    waterStart: inv.waterStart,
    waterEnd: inv.waterEnd,
    waterPrice: inv.waterPrice,
    waterUsed: Math.max(0, inv.waterEnd - inv.waterStart),
    waterAmount: inv.waterAmount,
    otherFees: inv.otherFees || [],
    otherAmount: inv.otherAmount,
    total: inv.total,
    status: inv.status,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    paidMethod: inv.paidMethod,
    tenantNote: inv.tenantNote || '',
    note: inv.note || '',
    createdAt: inv.createdAt,
  };
}

function buildCode(branchCode, year, month, roomNumber) {
  return `HD-${branchCode}-${year}${String(month).padStart(2, '0')}-${roomNumber}`;
}

/**
 * GET /api/invoices
 * Query: ?month=9&year=2026&status=unpaid&room=<id>&search=
 */
exports.getInvoices = async (req, res) => {
  try {
    const { month, year, status, room, search } = req.query;

    const filter = { ...req.branchFilter };
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;
    if (room) filter.room = room;
    if (search) filter.code = new RegExp(search.trim(), 'i');

    const invoices = await Invoice.find(filter)
      .populate('room', 'roomNumber')
      .populate('tenant', 'name phone')
      .populate('branch', 'name code')
      .sort({ year: -1, month: -1, code: 1 });

    // Thống kê theo cùng bộ lọc kỳ, để chủ trọ biết còn bao nhiêu chưa thu
    const statScope = { ...req.branchFilter };
    if (month) statScope.month = Number(month);
    if (year) statScope.year = Number(year);

    const agg = await Invoice.aggregate([
      { $match: { ...statScope, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$total' },
        },
      },
    ]);

    const stats = { unpaid: 0, pending: 0, paid: 0, totalAmount: 0, collectedAmount: 0 };
    agg.forEach((g) => {
      stats[g._id] = g.count;
      stats.totalAmount += g.amount;
      if (g._id === 'paid') stats.collectedAmount = g.amount;
    });

    res.json({ invoices: invoices.map(publicInvoice), stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/invoices/:id */
exports.getInvoice = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id)
      .populate('room', 'roomNumber floor')
      .populate('tenant', 'name phone email')
      .populate('branch', 'name code address phone');

    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });

    // Người thuê chỉ xem được hoá đơn của mình
    if (req.user.role === 'tenant') {
      if (inv.tenant?._id?.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Bạn không có quyền xem hoá đơn này' });
      }
    } else if (!canAccessBranch(req, inv)) {
      return res.status(403).json({ message: 'Hoá đơn này không thuộc chi nhánh của bạn' });
    }

    res.json({ invoice: publicInvoice(inv) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/invoices/prepare?month=9&year=2026
 * Trả về danh sách phòng đang cho thuê kèm chỉ số điện nước kỳ trước,
 * để chủ trọ chỉ cần nhập chỉ số mới.
 */
exports.prepareInvoices = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ message: 'Thiếu tháng hoặc năm' });
    }

    const rooms = await Room.find({ ...req.branchFilter, status: 'occupied' })
      .populate('tenants', 'name phone')
      .populate('branch', 'name code')
      .sort({ floor: 1, roomNumber: 1 });

    // Kỳ trước để lấy chỉ số cuối làm chỉ số đầu kỳ này
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const roomIds = rooms.map((r) => r._id);
    const [prevInvoices, existing] = await Promise.all([
      Invoice.find({ room: { $in: roomIds }, month: prevMonth, year: prevYear })
        .select('room electricityEnd waterEnd'),
      Invoice.find({ room: { $in: roomIds }, month, year }).select('room'),
    ]);

    const prevMap = Object.fromEntries(prevInvoices.map((i) => [i.room.toString(), i]));
    const doneSet = new Set(existing.map((i) => i.room.toString()));

    const items = rooms.map((r) => {
      const prev = prevMap[r._id.toString()];
      return {
        roomId: r._id,
        roomNumber: r.roomNumber,
        branch: r.branch ? { id: r.branch._id, name: r.branch.name } : null,
        tenant: r.tenants[0]
          ? { id: r.tenants[0]._id, name: r.tenants[0].name, phone: r.tenants[0].phone }
          : null,
        roomPrice: r.price,
        electricityPrice: r.electricityPrice,
        waterPrice: r.waterPrice,
        // Kỳ đầu tiên chưa có hoá đơn trước, chỉ số đầu để 0 và chủ trọ tự sửa
        electricityStart: prev?.electricityEnd ?? 0,
        waterStart: prev?.waterEnd ?? 0,
        hasPrevious: !!prev,
        alreadyCreated: doneSet.has(r._id.toString()),
      };
    });

    res.json({ month, year, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/invoices
 * Body: { month, year, dueDate, items: [{ roomId, electricityStart, electricityEnd, ... }] }
 * Tạo hàng loạt cho cả kỳ.
 */
exports.createInvoices = async (req, res) => {
  try {
    const { month, year, dueDate, items } = req.body || {};
    if (!month || !year || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Thiếu thông tin kỳ hoá đơn' });
    }

    const created = [];
    const failed = [];

    for (const item of items) {
      try {
        const room = await Room.findById(item.roomId).populate('branch', 'code');
        if (!room) {
          failed.push({ roomId: item.roomId, message: 'Không tìm thấy phòng' });
          continue;
        }
        if (!canAccessBranch(req, room)) {
          failed.push({ roomNumber: room.roomNumber, message: 'Ngoài phạm vi chi nhánh của bạn' });
          continue;
        }

        const duplicate = await Invoice.findOne({ room: room._id, month, year });
        if (duplicate) {
          failed.push({ roomNumber: room.roomNumber, message: 'Đã có hoá đơn cho kỳ này' });
          continue;
        }

        const inv = new Invoice({
          code: buildCode(room.branch.code, year, month, room.roomNumber),
          branch: room.branch._id,
          room: room._id,
          tenant: room.tenants[0] || null,
          month,
          year,
          roomPrice: item.roomPrice ?? room.price,
          electricityStart: item.electricityStart ?? 0,
          electricityEnd: item.electricityEnd ?? 0,
          electricityPrice: item.electricityPrice ?? room.electricityPrice,
          waterStart: item.waterStart ?? 0,
          waterEnd: item.waterEnd ?? 0,
          waterPrice: item.waterPrice ?? room.waterPrice,
          otherFees: item.otherFees || [],
          dueDate: dueDate || null,
          note: item.note,
          createdBy: req.user.id,
        });

        await inv.save();
        created.push(publicInvoice(inv));
      } catch (err) {
        failed.push({ roomNumber: item.roomNumber, message: err.message });
      }
    }

    res.status(201).json({
      message: `Đã tạo ${created.length} hoá đơn`,
      created,
      failed,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** PUT /api/invoices/:id */
exports.updateInvoice = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    if (!canAccessBranch(req, inv)) {
      return res.status(403).json({ message: 'Hoá đơn này không thuộc chi nhánh của bạn' });
    }
    // Hoá đơn đã thu tiền thì không sửa số liệu nữa, tránh sai lệch sổ sách
    if (inv.status === 'paid') {
      return res.status(400).json({ message: 'Hoá đơn đã thanh toán, không thể sửa' });
    }

    const fields = [
      'roomPrice', 'electricityStart', 'electricityEnd', 'electricityPrice',
      'waterStart', 'waterEnd', 'waterPrice', 'otherFees', 'dueDate', 'note',
    ];
    fields.forEach((f) => {
      if (req.body?.[f] !== undefined) inv[f] = req.body[f];
    });

    await inv.save();
    await inv.populate([
      { path: 'room', select: 'roomNumber' },
      { path: 'tenant', select: 'name phone' },
    ]);

    res.json({ invoice: publicInvoice(inv) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * PATCH /api/invoices/:id/confirm
 * Chủ trọ xác nhận đã thu tiền.
 * Body: { method: 'cash' | 'transfer' }
 */
exports.confirmPayment = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate('room', 'roomNumber');
    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    if (!canAccessBranch(req, inv)) {
      return res.status(403).json({ message: 'Hoá đơn này không thuộc chi nhánh của bạn' });
    }
    if (inv.status === 'paid') {
      return res.status(400).json({ message: 'Hoá đơn này đã được thanh toán' });
    }
    if (inv.status === 'cancelled') {
      return res.status(400).json({ message: 'Hoá đơn đã bị huỷ' });
    }

    inv.status = 'paid';
    inv.paidAt = new Date();
    inv.paidMethod = req.body?.method || 'cash';
    inv.confirmedBy = req.user.id;

    await inv.save();
    res.json({ message: `Đã xác nhận thu tiền phòng ${inv.room.roomNumber}`, invoice: publicInvoice(inv) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * PATCH /api/invoices/:id/report
 * Người thuê báo đã chuyển khoản. Chuyển sang trạng thái chờ xác nhận,
 * KHÔNG tự đánh dấu đã thanh toán.
 */
exports.reportPayment = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    if (inv.tenant?.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Đây không phải hoá đơn của bạn' });
    }
    if (inv.status !== 'unpaid') {
      return res.status(400).json({ message: 'Hoá đơn này không ở trạng thái chờ thanh toán' });
    }

    inv.status = 'pending';
    inv.tenantNote = req.body?.note || '';
    await inv.save();

    res.json({ message: 'Đã gửi thông báo cho chủ trọ. Vui lòng chờ xác nhận.', invoice: publicInvoice(inv) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** PATCH /api/invoices/:id/cancel */
exports.cancelInvoice = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    if (!canAccessBranch(req, inv)) {
      return res.status(403).json({ message: 'Hoá đơn này không thuộc chi nhánh của bạn' });
    }
    if (inv.status === 'paid') {
      return res.status(400).json({ message: 'Hoá đơn đã thanh toán, không thể huỷ' });
    }

    inv.status = 'cancelled';
    inv.note = req.body?.reason || inv.note;
    await inv.save();

    res.json({ message: 'Đã huỷ hoá đơn', invoice: publicInvoice(inv) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /api/invoices/:id */
exports.deleteInvoice = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    if (!canAccessBranch(req, inv)) {
      return res.status(403).json({ message: 'Hoá đơn này không thuộc chi nhánh của bạn' });
    }
    // Xoá hoá đơn đã thu sẽ làm mất dấu vết dòng tiền
    if (inv.status === 'paid') {
      return res.status(400).json({ message: 'Hoá đơn đã thanh toán, chỉ có thể huỷ chứ không xoá' });
    }

    await inv.deleteOne();
    res.json({ message: 'Đã xoá hoá đơn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/invoices/my
 * Hoá đơn của chính người thuê đang đăng nhập.
 */
exports.getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ tenant: req.user.id, status: { $ne: 'cancelled' } })
      .populate('room', 'roomNumber')
      .populate('branch', 'name')
      .sort({ year: -1, month: -1 });

    const unpaidTotal = invoices
      .filter((i) => i.status === 'unpaid')
      .reduce((sum, i) => sum + i.total, 0);

    res.json({
      invoices: invoices.map(publicInvoice),
      unpaidTotal,
      unpaidCount: invoices.filter((i) => i.status === 'unpaid').length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};