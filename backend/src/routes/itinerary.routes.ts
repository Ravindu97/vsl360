import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { itineraryController } from '../controllers/itinerary.controller';
import {
  createActivitySchema,
  createDestinationSchema,
  importCatalogSchema,
  updateActivitySchema,
  updateDestinationSchema,
} from '../validators/itinerary.schema';

const router = Router();

router.use(authenticate);
router.use(authorize('OPS_MANAGER'));

router.get('/destinations', (req, res) => itineraryController.listDestinations(req, res));
router.post('/destinations', validate(createDestinationSchema), (req, res) => itineraryController.createDestination(req, res));
router.put('/destinations/:destinationId', validate(updateDestinationSchema), (req, res) => itineraryController.updateDestination(req, res));
router.delete('/destinations/:destinationId', (req, res) => itineraryController.deleteDestination(req, res));

router.get('/activities', (req, res) => itineraryController.listActivities(req, res));
router.post('/activities', validate(createActivitySchema), (req, res) => itineraryController.createActivity(req, res));
router.put('/activities/:activityId', validate(updateActivitySchema), (req, res) => itineraryController.updateActivity(req, res));
router.delete('/activities/:activityId', (req, res) => itineraryController.deleteActivity(req, res));

router.get('/export', (req, res) => itineraryController.exportCatalog(req, res));
router.post('/import', validate(importCatalogSchema), (req, res) => itineraryController.importCatalog(req, res));

export default router;
