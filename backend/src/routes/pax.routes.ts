import { Router } from 'express';
import { paxController } from '../controllers/pax.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createPaxSchema, updatePaxSchema } from '../validators/pax.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => paxController.findByBookingId(req, res));
router.post(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  validate(createPaxSchema),
  (req, res) => paxController.create(req, res)
);
router.put(
  '/:paxId',
  authorize('SALES', 'OPS_MANAGER'),
  validate(updatePaxSchema),
  (req, res) => paxController.update(req, res)
);
router.delete(
  '/:paxId',
  authorize('SALES', 'OPS_MANAGER'),
  (req, res) => paxController.delete(req, res)
);

export default router;
