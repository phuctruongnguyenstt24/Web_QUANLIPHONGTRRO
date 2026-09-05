const express = require('express');
const router = express.Router();

const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  assignTenant,
  removeTenant,
  getAvailableTenants,
} = require('../controllers/Roomcontroller');

const { protect, requireRole } = require('../middleware/Auth');

// Mọi route đều cần đăng nhập
router.use(protect);

// Đặt TRƯỚC /:id, nếu không Express sẽ hiểu "available-tenants" là một id
router.get('/available-tenants', requireRole('admin'), getAvailableTenants);

// Người thuê được xem danh sách phòng (để biết phòng trống);
// thêm, sửa, xoá thì chỉ admin.
router.route('/')
  .get(getRooms)
  .post(requireRole('admin'), createRoom);

router.route('/:id')
  .get(getRoom)
  .put(requireRole('admin'), updateRoom)
  .delete(requireRole('admin'), deleteRoom);

router.post('/:id/tenants', requireRole('admin'), assignTenant);
router.delete('/:id/tenants/:tenantId', requireRole('admin'), removeTenant);

module.exports = router;