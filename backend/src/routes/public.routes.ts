import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { customItineraryInquiryController } from '../controllers/customItineraryInquiry.controller';
import { requireIngestApiKey } from '../middleware/ingestApiKey';
import { validate } from '../middleware/validate';
import { createCustomItineraryInquirySchema } from '../validators/inquiry.schema';

const router = Router();

const ingestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many inquiry submissions. Please try again later.' },
});

const trackRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests. Please try again later.' },
});

router.post(
  '/custom-itinerary-inquiries',
  ingestRateLimit,
  requireIngestApiKey,
  validate(createCustomItineraryInquirySchema),
  (req, res) => customItineraryInquiryController.createPublic(req, res),
);

router.get(
  '/inquiries/track',
  trackRateLimit,
  requireIngestApiKey,
  (req, res) => customItineraryInquiryController.trackPublic(req, res),
);

export default router;
