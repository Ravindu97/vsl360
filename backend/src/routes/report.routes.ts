import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('OPS_MANAGER'));

router.get('/dashboard', (req, res) => reportController.dashboard(req, res));
router.get('/bookings', (req, res) => reportController.bookings(req, res));

export default router;
