/**
 * Phân phạm vi dữ liệu theo chi nhánh.
 *
 * owner   -> thấy mọi chi nhánh, có thể lọc bằng ?branch=<id>
 * manager -> chỉ thấy chi nhánh của mình, bỏ qua ?branch= người dùng gửi lên
 * tenant  -> chỉ thấy chi nhánh của mình
 *
 * Dùng SAU protect. Kết quả gắn vào req.branchFilter để controller trộn vào query.
 */
exports.branchScope = (req, res, next) => {
  const { role, branch } = req.user;

  if (role === 'owner') {
    // Owner được phép lọc theo chi nhánh nếu muốn, không lọc thì thấy tất cả
    const requested = req.query.branch;
    req.branchFilter = requested ? { branch: requested } : {};
    req.scopedBranch = requested || null;
    return next();
  }

  // Manager và tenant bắt buộc thuộc một chi nhánh
  if (!branch) {
    return res.status(403).json({
      message: 'Tài khoản chưa được gán chi nhánh. Liên hệ chủ hệ thống để được cấp quyền.',
    });
  }

  // Không dùng req.query.branch ở đây: nếu tin vào giá trị client gửi,
  // manager chi nhánh A có thể xem dữ liệu chi nhánh B bằng cách sửa URL.
  req.branchFilter = { branch };
  req.scopedBranch = branch.toString();
  next();
};

/**
 * Xác định chi nhánh khi TẠO dữ liệu mới.
 * Owner phải chỉ định rõ, manager thì lấy từ token.
 */
exports.resolveBranchForCreate = (req, res, next) => {
  const { role, branch } = req.user;

  if (role === 'owner') {
    const target = req.body?.branch;
    if (!target) {
      return res.status(400).json({ message: 'Vui lòng chọn chi nhánh' });
    }
    req.targetBranch = target;
    return next();
  }

  req.targetBranch = branch;
  next();
};

/**
 * Kiểm tra một bản ghi có thuộc phạm vi của người đang đăng nhập không.
 * Dùng cho các thao tác trên bản ghi cụ thể (sửa, xoá).
 */
exports.canAccessBranch = (req, doc) => {
  if (req.user.role === 'owner') return true;
  if (!doc?.branch) return false;
  const docBranch = doc.branch._id ? doc.branch._id.toString() : doc.branch.toString();
  return docBranch === req.user.branch?.toString();
};