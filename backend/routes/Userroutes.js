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
const { branchScope, resolveBranchForCreate } = require('../middleware/branchScope');

// Toàn bộ route này dành cho owner và manager.
// branchScope giới hạn manager chỉ thấy chi nhánh của mình.
router.use(protect, requireRole('owner', 'manager'), branchScope);

router.route('/')
  .get(getUsers)
  .post(resolveBranchForCreate, createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/approve', approveUser);
router.patch('/:id/reject', rejectUser);
router.patch('/:id/reset-password', resetUserPassword);

module.exports = router;