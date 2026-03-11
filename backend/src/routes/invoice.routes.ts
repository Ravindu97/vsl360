import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => invoiceController.findByBookingId(req, res));
router.post(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  validate(createInvoiceSchema),
  (req, res) => invoiceController.create(req, res)
);
router.put(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  validate(updateInvoiceSchema),
  (req, res) => invoiceController.update(req, res)
);

export default router;
