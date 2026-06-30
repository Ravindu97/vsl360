import { Request, Response } from 'express';
import { customItineraryInquiryService } from '../services/customItineraryInquiry.service';
import logger from '../utils/logger';
import { AuthRequest } from '../types';

export class CustomItineraryInquiryController {
  async findAll(req: AuthRequest, res: Response): Promise<void> {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const submittedFrom = req.query.submittedFrom as string | undefined;
    const submittedTo = req.query.submittedTo as string | undefined;
    const overdueOnly = req.query.overdueOnly === 'true';
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);

    const result = await customItineraryInquiryService.findAll(
      { status, search, submittedFrom, submittedTo, overdueOnly },
      page,
      pageSize,
    );
    res.json(result);
  }

  async getStats(_req: AuthRequest, res: Response): Promise<void> {
    const stats = await customItineraryInquiryService.getStats();
    res.json(stats);
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inquiry = await customItineraryInquiryService.findById(String(req.params.id));
      res.json(inquiry);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Inquiry not found';
      res.status(404).json({ error: message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inquiry = await customItineraryInquiryService.update(String(req.params.id), req.body);
      res.json(inquiry);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed';
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }

  async createPublic(req: Request, res: Response): Promise<void> {
    try {
      const result = await customItineraryInquiryService.create(req.body);
      logger.info(`Custom itinerary inquiry created: ${result.id} (${result.publicRef})`);
      res.status(201).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Create failed';
      logger.error('Custom itinerary inquiry create failed', {
        error: message,
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      });
      res.status(400).json({ error: message });
    }
  }

  async trackPublic(req: Request, res: Response): Promise<void> {
    const reference = String(req.query.reference ?? '').trim();
    const email = String(req.query.email ?? '').trim();

    if (!reference || !email) {
      res.status(400).json({ error: 'reference and email are required' });
      return;
    }

    const result = await customItineraryInquiryService.trackByReference(reference, email);
    if (!result) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json(result);
  }
}

export const customItineraryInquiryController = new CustomItineraryInquiryController();
