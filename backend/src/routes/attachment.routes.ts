import { Router } from 'express';
import { attachmentController } from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { upload } from '../middleware/upload';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => attachmentController.findByBookingId(req, res));
router.post(
  '/',
  authorize('SALES', 'OPS_MANAGER'),
  upload.single('file'),
  (req, res) => attachmentController.upload(req, res)
);
router.get('/:attachId/download', (req, res) => attachmentController.download(req, res));
router.delete(
  '/:attachId',
  authorize('SALES', 'OPS_MANAGER'),
  (req, res) => attachmentController.delete(req, res)
);

export default router;
