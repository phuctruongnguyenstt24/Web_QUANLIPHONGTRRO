const express = require('express');
const router = express.Router();

const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  assignManager,
} = require('../controllers/branchController');

const { protect, requireRole } = require('../middleware/Auth');

router.use(protect);

// Owner và manager đều xem được (manager chỉ thấy chi nhánh của mình,
// đã lọc trong controller). Tenant không cần xem danh sách chi nhánh.
router.get('/', requireRole('owner', 'manager'), getBranches);
router.get('/:id', requireRole('owner', 'manager'), getBranch);

// Tạo, sửa, xoá chi nhánh và giao quản lý: chỉ chủ hệ thống
router.post('/', requireRole('owner'), createBranch);
router.put('/:id', requireRole('owner'), updateBranch);
router.delete('/:id', requireRole('owner'), deleteBranch);
router.patch('/:id/manager', requireRole('owner'), assignManager);

module.exports = router;