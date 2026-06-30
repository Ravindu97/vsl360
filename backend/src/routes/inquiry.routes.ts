import { Router } from 'express';
import { customItineraryInquiryController } from '../controllers/customItineraryInquiry.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateCustomItineraryInquirySchema } from '../validators/inquiry.schema';

const router = Router();

router.use(authenticate);

router.get('/custom-itinerary/stats', (req, res) =>
  customItineraryInquiryController.getStats(req, res),
);
router.get('/custom-itinerary', (req, res) =>
  customItineraryInquiryController.findAll(req, res),
);
router.get('/custom-itinerary/:id', (req, res) =>
  customItineraryInquiryController.findById(req, res),
);
router.patch(
  '/custom-itinerary/:id',
  validate(updateCustomItineraryInquirySchema),
  (req, res) => customItineraryInquiryController.update(req, res),
);

export default router;
