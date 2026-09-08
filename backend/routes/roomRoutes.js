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
const { branchScope, resolveBranchForCreate } = require('../middleware/branchScope');

// protect trước (xác định người dùng), branchScope sau (xác định phạm vi).
// Thứ tự này bắt buộc: branchScope đọc req.user do protect gắn vào.
router.use(protect, branchScope);

// Đặt TRƯỚC /:id, nếu không Express hiểu "available-tenants" là một id
router.get('/available-tenants', requireRole('owner', 'manager'), getAvailableTenants);

router.route('/')
  .get(getRooms)
  .post(requireRole('owner', 'manager'), resolveBranchForCreate, createRoom);

router.route('/:id')
  .get(getRoom)
  .put(requireRole('owner', 'manager'), updateRoom)
  .delete(requireRole('owner', 'manager'), deleteRoom);

router.post('/:id/tenants', requireRole('owner', 'manager'), assignTenant);
router.delete('/:id/tenants/:tenantId', requireRole('owner', 'manager'), removeTenant);

module.exports = router;