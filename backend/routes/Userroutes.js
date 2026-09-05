const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  approveUser,
  rejectUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/userController');

const { protect, requireRole } = require('../middleware/Auth');

// Toàn bộ route trong file này chỉ dành cho admin.
// Đặt ở đây một lần thay vì lặp lại trên từng dòng.
router.use(protect, requireRole('admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/approve', approveUser);
router.patch('/:id/reject', rejectUser);
router.patch('/:id/reset-password', resetUserPassword);

module.exports = router;