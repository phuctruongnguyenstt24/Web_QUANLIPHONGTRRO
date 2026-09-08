/**
 * Tạo tài khoản admin đầu tiên.
 *
 * Cách chạy:
 *   node seedAdmin.js                        -> nhập thông tin trực tiếp trên terminal
 *   node seedAdmin.js --force                -> cho phép tạo thêm admin dù đã có admin
 *
 * Hoặc đặt sẵn trong .env rồi chạy không cần nhập:
 *   ADMIN_NAME=Nguyen Van A
 *   ADMIN_EMAIL=admin@quantro.vn
 *   ADMIN_PASSWORD=matkhaumanh123
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

const User = require('./models/User');

const force = process.argv.includes('--force');

/* ---------- Nhập liệu từ terminal ---------- */
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

// Nhập mật khẩu mà không hiện ký tự ra màn hình
function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.resume();
    if (stdin.isTTY) stdin.setRawMode(true);

    let value = '';
    function onData(char) {
      const c = char.toString('utf8');
      if (c === '\n' || c === '\r' || c === '\u0004') {
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value.trim());
      } else if (c === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else if (c === '\u007f' || c === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        value += c;
        process.stdout.write('*');
      }
    }
    stdin.on('data', onData);
  });
}

/* ---------- Kiểm tra dữ liệu nhập ---------- */
function validate({ name, email, phone, password }) {
  const errors = [];
  if (!name) errors.push('Họ tên không được để trống');
  if (!email && !phone) errors.push('Cần có email hoặc số điện thoại');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không hợp lệ');
  if (phone && !/^(0|\+84)[0-9]{9}$/.test(phone)) errors.push('Số điện thoại không hợp lệ');
  if (!password || password.length < 6) errors.push('Mật khẩu phải có ít nhất 6 ký tự');
  return errors;
}

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('Thiếu MONGO_URI trong file .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Đã kết nối MongoDB\n');

    // Đã có admin thì dừng lại, tránh vô tình tạo trùng
    const existingAdmin = await User.findOne({ role: 'owner' });
    if (existingAdmin && !force) {
      console.log(`Hệ thống đã có tài khoản admin: ${existingAdmin.email || existingAdmin.phone}`);
      console.log('Muốn tạo thêm admin, chạy lại với: node seedAdmin.js --force');
      return;
    }

    // Ưu tiên lấy từ .env, thiếu thì hỏi trên terminal
    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;
    let phone = process.env.ADMIN_PHONE;
    let password = process.env.ADMIN_PASSWORD;

    const fromEnv = name && password && (email || phone);

    if (!fromEnv) {
      console.log('Nhập thông tin tài khoản admin:\n');
      name = name || (await ask('Họ tên: '));
      email = email || (await ask('Email (bỏ trống nếu dùng SĐT): '));
      phone = phone || (await ask('Số điện thoại (bỏ trống nếu dùng email): '));
      password = password || (await askPassword('Mật khẩu: '));
      const confirm = await askPassword('Nhập lại mật khẩu: ');

      if (password !== confirm) {
        console.error('\nHai mật khẩu không khớp nhau.');
        return;
      }
    }

    const errors = validate({ name, email, phone, password });
    if (errors.length) {
      console.error('\nDữ liệu chưa hợp lệ:');
      errors.forEach((e) => console.error(' - ' + e));
      return;
    }

    // Kiểm tra trùng email/SĐT
    const duplicate = await User.findOne({
      $or: [email ? { email: email.toLowerCase() } : null, phone ? { phone } : null].filter(Boolean),
    });
    if (duplicate) {
      console.error('\nEmail hoặc số điện thoại này đã được sử dụng.');
      return;
    }

    // Mật khẩu được model tự băm ở hook pre('save'), không cần bcrypt ở đây
    const admin = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone: phone || undefined,
      password,
      role: 'owner',
      authProvider: 'local',
      status: 'approved',      // thêm dòng này
      approvedAt: new Date(),  // và dòng này
    });

    console.log('\nTạo tài khoản admin thành công:');
    console.log('  Họ tên:   ' + admin.name);
    console.log('  Đăng nhập:' + ' ' + (admin.email || admin.phone));
    console.log('  Vai trò:  ' + admin.role);
    console.log('\nĐăng nhập tại http://localhost:5173/login với vai trò Chủ trọ.');

    if (fromEnv) {
      console.log('\nXoá ADMIN_PASSWORD khỏi file .env sau khi đã tạo xong.');
    }
  } catch (err) {
    console.error('\nLỗi:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
}

run();