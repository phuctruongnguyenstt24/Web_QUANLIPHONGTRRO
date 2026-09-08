const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên chi nhánh'],
      trim: true,
      maxlength: [100, 'Tên chi nhánh quá dài'],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{2,10}$/, 'Mã chi nhánh chỉ gồm chữ in hoa, số và dấu gạch ngang'],
    },
    address: { type: String, required: [true, 'Vui lòng nhập địa chỉ'], trim: true },
    phone: { type: String, trim: true },

    // Người quản lý chi nhánh này (role: manager)
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Đơn giá mặc định, phòng mới trong chi nhánh sẽ lấy theo đây
    defaultElectricityPrice: { type: Number, default: 3500 },
    defaultWaterPrice: { type: Number, default: 20000 },

    note: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Branch', branchSchema);