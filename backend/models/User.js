const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng nhập họ tên'],
            trim: true,
            maxlength: [100, 'Họ tên không được quá 100 ký tự'],
        },

        // Đăng nhập bằng email HOẶC số điện thoại -> cả hai đều không bắt buộc,
        // nhưng phải có ít nhất một (kiểm tra ở hook pre-validate bên dưới).
        email: {
            type: String,
            unique: true,
            sparse: true, // cho phép nhiều document không có email mà không vi phạm unique
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            match: [/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'],
        },

        password: {
            type: String,
            minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
            select: false, // không trả về password khi query thông thường
        },

        // Đăng nhập Google
        googleId: { type: String, unique: true, sparse: true, select: false },
        avatar: String,
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },

        // Phân quyền
          role: {
      type: String,
      enum: {
        values: ['owner', 'manager', 'tenant'],
        message: 'Vai trò không hợp lệ',
      },
      default: 'tenant',
    },

    // Chi nhánh mà tài khoản này thuộc về.
    // owner: null (thấy tất cả). manager & tenant: bắt buộc có.
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

        // Thông tin bổ sung cho người thuê
        idCard: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            match: [/^[0-9]{12}$/, 'CCCD phải gồm đúng 12 chữ số']
        },// CCCD/CMND
        dateOfBirth: Date,
        address: { type: String, trim: true }, // địa chỉ thường trú
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },

        isActive: { type: Boolean, default: true },
        // Trạng thái phê duyệt tài khoản
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending', // tài khoản tự đăng ký phải chờ admin duyệt
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true },

        // Theo dõi truy cập
        lastLoginAt: { type: Date, default: null },
        loginCount: { type: Number, default: 0 },

        // Quên mật khẩu
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpire: { type: Date, select: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/* ---------- Index ---------- */
userSchema.index({ role: 1 });
userSchema.index({ room: 1 });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ branch: 1, role: 1 });
/* ---------- Virtual: định danh đăng nhập hiển thị ---------- */
userSchema.virtual('loginIdentifier').get(function () {
    return this.email || this.phone;
});

/* ---------- Bắt buộc có email hoặc số điện thoại ---------- */
userSchema.pre('validate', async function () {
    if (!this.email && !this.phone) {
        throw new Error('Cần có email hoặc số điện thoại để đăng nhập');
    }
    if (this.authProvider === 'local' && !this.password) {
        throw new Error('Vui lòng nhập mật khẩu');
    }
});

/* ---------- Mã hoá mật khẩu trước khi lưu ---------- */
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/* ---------- So khớp mật khẩu khi đăng nhập ---------- */
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false; // tài khoản Google không có mật khẩu
    return bcrypt.compare(enteredPassword, this.password);
};

/* ---------- Tạo token đặt lại mật khẩu (hiệu lực 30 phút) ---------- */
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Chỉ lưu bản băm vào DB, gửi bản gốc qua email cho người dùng
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    return resetToken;
};

/* ---------- Tìm người dùng bằng email hoặc số điện thoại ---------- */
userSchema.statics.findByIdentifier = function (identifier) {
    const isEmail = identifier.includes('@');
    const query = isEmail
        ? { email: identifier.toLowerCase().trim() }
        : { phone: identifier.trim() };
    return this.findOne(query).select('+password');
};

module.exports = mongoose.model('User', userSchema);