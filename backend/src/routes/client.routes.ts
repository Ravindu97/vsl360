import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { updateClientSchema } from '../validators/client.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => clientController.findByBookingId(req, res));
router.put(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  validate(updateClientSchema),
  (req, res) => clientController.update(req, res)
);

export default router;
