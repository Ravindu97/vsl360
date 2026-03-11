import { Router } from 'express';
import { transportController } from '../controllers/transport.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createTransportSchema, updateTransportSchema, createDayPlanSchema, updateDayPlanSchema } from '../validators/transport.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => transportController.findByBookingId(req, res));
router.post(
  '/',
  authorize('TRANSPORT', 'OPS_MANAGER'),
  validate(createTransportSchema),
  (req, res) => transportController.create(req, res)
);
router.put(
  '/',
  authorize('TRANSPORT', 'OPS_MANAGER'),
  validate(updateTransportSchema),
  (req, res) => transportController.update(req, res)
);

// Day plans
router.post(
  '/day-plans',
  authorize('TRANSPORT', 'OPS_MANAGER'),
  validate(createDayPlanSchema),
  (req, res) => transportController.createDayPlan(req, res)
);
router.put(
  '/day-plans/:dayId',
  authorize('TRANSPORT', 'OPS_MANAGER'),
  validate(updateDayPlanSchema),
  (req, res) => transportController.updateDayPlan(req, res)
);
router.delete(
  '/day-plans/:dayId',
  authorize('TRANSPORT', 'OPS_MANAGER'),
  (req, res) => transportController.deleteDayPlan(req, res)
);

export default router;
