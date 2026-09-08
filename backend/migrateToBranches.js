/**
 * Chuyển dữ liệu hiện có sang cấu trúc nhiều chi nhánh.
 *
 * Việc script làm:
 *  1. Tạo chi nhánh mặc định "Cơ sở 1" nếu chưa có chi nhánh nào
 *  2. Gán mọi phòng chưa có branch vào chi nhánh đó
 *  3. Đổi role 'admin' cũ thành 'owner'
 *  4. Gán branch cho người thuê theo phòng họ đang ở
 *
 * Chạy: node migrateToBranches.js
 * Chạy thử không ghi gì: node migrateToBranches.js --dry
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('./models/Branch');
const Room = require('./models/Room');
const User = require('./models/User');

const dryRun = process.argv.includes('--dry');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('Thiếu MONGO_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB');
  if (dryRun) console.log('CHẾ ĐỘ THỬ — không ghi gì vào database\n');

  try {
    /* --- 1. Chi nhánh mặc định --- */
    let branch = await Branch.findOne({ code: 'CS1' });

    if (!branch) {
      console.log('Tạo chi nhánh mặc định "Cơ sở 1"…');
      if (!dryRun) {
        branch = await Branch.create({
          name: 'Cơ sở 1',
          code: 'CS1',
          address: 'Chưa cập nhật — hãy sửa lại trong trang Quản lý chi nhánh',
        });
      } else {
        branch = { _id: 'DRY_RUN_ID', name: 'Cơ sở 1' };
      }
    } else {
      console.log(`Đã có chi nhánh: ${branch.name} (${branch.code})`);
    }

    /* --- 2. Phòng chưa có chi nhánh --- */
    const roomsWithout = await Room.countDocuments({ branch: { $exists: false } });
    console.log(`\nPhòng chưa gán chi nhánh: ${roomsWithout}`);
    if (roomsWithout > 0 && !dryRun) {
      const r = await Room.updateMany({ branch: { $exists: false } }, { branch: branch._id });
      console.log(`  -> đã gán ${r.modifiedCount} phòng vào ${branch.name}`);
    }

    /* --- 3. admin cũ thành owner --- */
    const admins = await User.countDocuments({ role: 'admin' });
    console.log(`\nTài khoản role 'admin' cũ: ${admins}`);
    if (admins > 0 && !dryRun) {
      const r = await User.updateMany({ role: 'admin' }, { role: 'owner', branch: null });
      console.log(`  -> đã chuyển ${r.modifiedCount} tài khoản sang 'owner'`);
    }

    /* --- 4. Người thuê lấy chi nhánh theo phòng --- */
    const tenants = await User.find({ role: 'tenant', room: { $ne: null } }).select('name room branch');
    let updated = 0;

    for (const t of tenants) {
      const room = await Room.findById(t.room).select('branch');
      if (room?.branch && t.branch?.toString() !== room.branch.toString()) {
        if (!dryRun) {
          await User.findByIdAndUpdate(t._id, { branch: room.branch });
        }
        updated++;
      }
    }
    console.log(`\nNgười thuê cần gán chi nhánh: ${updated}`);

    // Người thuê chưa có phòng thì gán vào chi nhánh mặc định
    const noRoom = await User.countDocuments({ role: 'tenant', branch: null });
    console.log(`Người thuê chưa có phòng, gán vào ${branch.name}: ${noRoom}`);
    if (noRoom > 0 && !dryRun) {
      await User.updateMany({ role: 'tenant', branch: null }, { branch: branch._id });
    }

    console.log(
      dryRun
        ? '\nChạy thử xong. Bỏ cờ --dry để thực hiện thật.'
        : '\nHoàn tất. Hãy đăng xuất rồi đăng nhập lại để token mang thông tin chi nhánh mới.'
    );
  } catch (err) {
    console.error('\nLỗi:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();