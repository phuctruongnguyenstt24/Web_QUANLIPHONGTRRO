const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Vui lòng nhập số phòng'],
      unique: true,
      trim: true,
    },
    floor: { type: Number, default: 1, min: 0 },
    area: { type: Number, min: 0 },            // m2
    price: { type: Number, required: true, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    maxOccupants: { type: Number, default: 2, min: 1 },

    // Đơn giá dịch vụ, để tính hoá đơn sau này
    electricityPrice: { type: Number, default: 3500 },
    waterPrice: { type: Number, default: 20000 },

    amenities: [{ type: String }],  // gác lửng, máy lạnh, wifi…
    description: { type: String, trim: true },

    status: {
      type: String,
      enum: ['vacant', 'occupied', 'maintenance'],
      default: 'vacant',
    },

    // Người đang thuê. Mảng vì một phòng có thể ở ghép.
    tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

roomSchema.index({ status: 1, floor: 1 });

// Trạng thái luôn khớp với số người thuê thực tế,
// tránh việc phòng còn người mà lại hiển thị là trống.
roomSchema.pre('save', function () {
  if (this.status !== 'maintenance') {
    this.status = this.tenants.length > 0 ? 'occupied' : 'vacant';
  }
});

module.exports = mongoose.model('Room', roomSchema);