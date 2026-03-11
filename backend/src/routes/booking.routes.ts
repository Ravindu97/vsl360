import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createBookingSchema, updateBookingSchema, updateStatusSchema } from '../validators/booking.schema';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => bookingController.findAll(req, res));
router.post(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  validate(createBookingSchema),
  (req, res) => bookingController.create(req, res)
);
router.get('/:id', (req, res) => bookingController.findById(req, res));
router.put(
  '/:id',
  authorize('SALES', 'OPS_MANAGER'),
  validate(updateBookingSchema),
  (req, res) => bookingController.update(req, res)
);
router.put(
  '/:id/status',
  validate(updateStatusSchema),
  (req, res) => bookingController.updateStatus(req, res)
);
router.delete(
  '/:id',
  authorize('OPS_MANAGER'),
  (req, res) => bookingController.delete(req, res)
);

export default router;
