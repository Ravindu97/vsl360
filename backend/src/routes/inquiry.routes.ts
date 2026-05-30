import { Router } from 'express';
import { inquiryController } from '../controllers/inquiry.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { updateInquirySchema } from '../validators/inquiry.schema';

const router = Router();

router.use(authenticate);
router.use(authorize('SALES', 'OPS_MANAGER'));

router.get('/', (req, res) => void inquiryController.findAll(req, res));
router.get('/:id', (req, res) => void inquiryController.findById(req, res));
router.patch('/:id', validate(updateInquirySchema), (req, res) => void inquiryController.update(req, res));

export default router;
