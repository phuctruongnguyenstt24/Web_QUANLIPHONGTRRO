const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    // Mã hoá đơn hiển thị: HD-CS1-202609-101
    code: { type: String, unique: true },

    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

    // Người chịu trách nhiệm thanh toán (người thuê chính của phòng)
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Kỳ hoá đơn
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    // Tiền phòng — sao chép giá tại thời điểm lập, không tham chiếu Room.
    // Nếu sau này chủ trọ tăng giá, hoá đơn cũ vẫn giữ đúng số tiền đã tính.
    roomPrice: { type: Number, required: true, min: 0 },

    // Điện
    electricityStart: { type: Number, default: 0, min: 0 },
    electricityEnd: { type: Number, default: 0, min: 0 },
    electricityPrice: { type: Number, required: true, min: 0 },

    // Nước
    waterStart: { type: Number, default: 0, min: 0 },
    waterEnd: { type: Number, default: 0, min: 0 },
    waterPrice: { type: Number, required: true, min: 0 },

    // Khoản thu thêm: rác, giữ xe, internet…
    otherFees: [
      {
        label: { type: String, required: true, trim: true },
        amount: { type: Number, required: true },
      },
    ],

    // Tổng tiền, tính ở hook pre-save
    electricityAmount: { type: Number, default: 0 },
    waterAmount: { type: Number, default: 0 },
    otherAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'cancelled'],
      default: 'unpaid',
    },
    // unpaid  : chưa thanh toán
    // pending : người thuê báo đã chuyển khoản, chờ chủ trọ xác nhận
    // paid    : đã xác nhận thu tiền
    // cancelled: huỷ bỏ

    dueDate: { type: Date },
    paidAt: { type: Date, default: null },
    paidMethod: { type: String, enum: ['cash', 'transfer', null], default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Người thuê ghi chú khi báo đã chuyển khoản
    tenantNote: { type: String, trim: true },
    note: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Mỗi phòng chỉ có một hoá đơn cho mỗi kỳ
invoiceSchema.index({ room: 1, year: 1, month: 1 }, { unique: true });
invoiceSchema.index({ branch: 1, status: 1 });
invoiceSchema.index({ tenant: 1, year: -1, month: -1 });

/* ---------- Số điện, nước tiêu thụ ---------- */
invoiceSchema.virtual('electricityUsed').get(function () {
  return Math.max(0, this.electricityEnd - this.electricityStart);
});
invoiceSchema.virtual('waterUsed').get(function () {
  return Math.max(0, this.waterEnd - this.waterStart);
});

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

/* ---------- Tính tiền trước khi lưu ---------- */
invoiceSchema.pre('save', function () {
  // Chỉ số cuối phải lớn hơn hoặc bằng chỉ số đầu
  if (this.electricityEnd < this.electricityStart) {
    throw new Error('Chỉ số điện cuối kỳ không được nhỏ hơn đầu kỳ');
  }
  if (this.waterEnd < this.waterStart) {
    throw new Error('Chỉ số nước cuối kỳ không được nhỏ hơn đầu kỳ');
  }

  this.electricityAmount = (this.electricityEnd - this.electricityStart) * this.electricityPrice;
  this.waterAmount = (this.waterEnd - this.waterStart) * this.waterPrice;
  this.otherAmount = (this.otherFees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
  this.total = this.roomPrice + this.electricityAmount + this.waterAmount + this.otherAmount;
});

module.exports = mongoose.model('Invoice', invoiceSchema);