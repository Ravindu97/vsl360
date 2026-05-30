import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import logger from '../utils/logger';
import { inquiryService } from '../services/inquiry.service';

type WaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          timestamp?: string;
        }>;
      };
    }>;
  }>;
};

function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function normalizePhone(from: string): string {
  const digits = from.replace(/\D/g, '');
  if (!digits) return from;
  return `+${digits}`;
}

export class WhatsappWebhookController {
  verify(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      logger.warn('WhatsApp GET webhook: WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set');
      res.status(503).send('Webhook verify token not configured');
      return;
    }

    if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  }

  async handlePost(req: Request, res: Response): Promise<void> {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ error: 'Expected raw body' });
      return;
    }

    const signature = req.get('X-Hub-Signature-256');
    const allowSkip =
      env.NODE_ENV === 'development' && env.WHATSAPP_DEV_SKIP_SIGNATURE && !env.WHATSAPP_APP_SECRET;

    if (env.WHATSAPP_APP_SECRET) {
      if (!verifyMetaSignature(rawBody, signature, env.WHATSAPP_APP_SECRET)) {
        logger.warn('WhatsApp webhook: invalid signature');
        res.sendStatus(403);
        return;
      }
    } else if (!allowSkip) {
      logger.warn('WhatsApp webhook: WHATSAPP_APP_SECRET not set (configure it or set WHATSAPP_DEV_SKIP_SIGNATURE=true in development only)');
      res.status(503).json({ error: 'Webhook signature verification not configured' });
      return;
    } else {
      logger.warn('WhatsApp webhook: accepting unsigned payload (development only)');
    }

    let payload: WaWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as WaWebhookPayload;
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }

    if (payload.object !== 'whatsapp_business_account') {
      res.sendStatus(404);
      return;
    }

    res.sendStatus(200);

    try {
      await this.processPayload(payload);
    } catch (err) {
      logger.error('WhatsApp webhook processing error', err);
    }
  }

  private async processPayload(payload: WaWebhookPayload): Promise<void> {
    const entries = payload.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') {
          continue;
        }
        const value = change.value;
        if (!value?.messages?.length) {
          continue;
        }
        const phoneNumberId = value.metadata?.phone_number_id ?? undefined;
        const contacts = value.contacts ?? [];

        for (const msg of value.messages) {
          if (!msg.id || !msg.from) {
            continue;
          }
          if (msg.type !== 'text' || !msg.text?.body) {
            logger.info(`WhatsApp webhook: skip non-text message ${msg.id} type=${msg.type}`);
            continue;
          }

          const waId = msg.from;
          const profileName =
            contacts.find((c) => (c.wa_id ?? '').replace(/\D/g, '') === waId.replace(/\D/g, ''))?.profile?.name ??
            null;

          await inquiryService.ingestWhatsappText({
            waMessageId: msg.id,
            waPhoneNumberId: phoneNumberId,
            fromPhone: normalizePhone(waId),
            waProfileName: profileName,
            messageBody: msg.text.body,
            rawPayload: payload as object,
          });
        }
      }
    }
  }
}

export const whatsappWebhookController = new WhatsappWebhookController();
