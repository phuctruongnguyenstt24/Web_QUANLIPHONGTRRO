const express = require('express');
const router = express.Router();

const {
  getInvoices,
  getInvoice,
  prepareInvoices,
  createInvoices,
  updateInvoice,
  confirmPayment,
  reportPayment,
  cancelInvoice,
  deleteInvoice,
  getMyInvoices,
} = require('../controllers/Invoicecontroller');

const { protect, requireRole } = require('../middleware/Auth');
const { branchScope } = require('../middleware/branchScope');

router.use(protect);

/* ---------- Route của người thuê ---------- */
// Đặt TRƯỚC branchScope: người thuê không có phạm vi chi nhánh quản trị,
// và trước /:id để "my" không bị hiểu là một id.
router.get('/my', requireRole('tenant'), getMyInvoices);
router.patch('/:id/report', requireRole('tenant'), reportPayment);

/* ---------- Route quản trị ---------- */
const staff = requireRole('owner', 'manager');

router.get('/prepare', staff, branchScope, prepareInvoices);

router.route('/')
  .get(staff, branchScope, getInvoices)
  .post(staff, branchScope, createInvoices);

// getInvoice cho phép cả người thuê xem hoá đơn của mình,
// nên không gắn branchScope ở đây — controller tự phân quyền.
router.get('/:id', getInvoice);

router.put('/:id', staff, branchScope, updateInvoice);
router.delete('/:id', staff, branchScope, deleteInvoice);
router.patch('/:id/confirm', staff, branchScope, confirmPayment);
router.patch('/:id/cancel', staff, branchScope, cancelInvoice);

module.exports = router;