import { Router } from 'express';
import { hotelController } from '../controllers/hotel.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createHotelSchema, updateHotelSchema } from '../validators/hotel.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => hotelController.findByBookingId(req, res));
router.post(
  '/',
  authorize('RESERVATION', 'OPS_MANAGER'),
  validate(createHotelSchema),
  (req, res) => hotelController.create(req, res)
);
router.put(
  '/:hotelId',
  authorize('RESERVATION', 'OPS_MANAGER'),
  validate(updateHotelSchema),
  (req, res) => hotelController.update(req, res)
);
router.put(
  '/:hotelId/confirm',
  authorize('RESERVATION', 'OPS_MANAGER'),
  (req, res) => hotelController.confirm(req, res)
);
router.delete(
  '/:hotelId',
  authorize('RESERVATION', 'OPS_MANAGER'),
  (req, res) => hotelController.delete(req, res)
);

export default router;
