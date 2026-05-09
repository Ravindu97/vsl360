import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { generateInvoiceDocumentSchema } from '../validators/document.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res) => documentController.findByBookingId(req, res));
router.post(
  '/invoice',
  authorize('SALES', 'OPS_MANAGER'),
  validate(generateInvoiceDocumentSchema),
  (req, res) => documentController.generateInvoice(req, res)
);
router.post('/transport', authorize('TRANSPORT', 'OPS_MANAGER'), (req, res) => documentController.generateTransport(req, res));
router.post('/reservation', authorize('RESERVATION', 'OPS_MANAGER'), (req, res) => documentController.generateReservation(req, res));
router.post('/itinerary', authorize('OPS_MANAGER'), (req, res) => documentController.generateItinerary(req, res));
router.post('/travel-confirmation', authorize('RESERVATION', 'TRANSPORT', 'OPS_MANAGER'), (req, res) => documentController.generateTravelConfirmation(req, res));
router.get('/:docId/download', (req, res) => documentController.download(req, res));

export default router;
