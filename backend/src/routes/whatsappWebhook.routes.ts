import { Router } from 'express';
import express from 'express';
import { whatsappWebhookController } from '../controllers/whatsappWebhook.controller';

const router = Router();

router.get('/', (req, res) => whatsappWebhookController.verify(req, res));
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  (req, res) => void whatsappWebhookController.handlePost(req, res)
);

export default router;
