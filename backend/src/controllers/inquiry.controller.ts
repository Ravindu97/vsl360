import { Response } from 'express';
import { InquiryStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import { inquiryService } from '../services/inquiry.service';
import { listInquiriesQuerySchema } from '../validators/inquiry.schema';

export class InquiryController {
  async findAll(req: AuthRequest, res: Response): Promise<void> {
    const parsed = listInquiriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }

    const { status, search, page = 1, pageSize = 10 } = parsed.data;
    const filters: { status?: InquiryStatus; search?: string } = {};
    if (status) {
      filters.status = status;
    }
    if (search) {
      filters.search = search;
    }

    const result = await inquiryService.findAll(filters, page, pageSize);
    res.json(result);
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inquiry = await inquiryService.findById(String(req.params.id));
      if (!inquiry) {
        res.status(404).json({ error: 'Inquiry not found' });
        return;
      }
      res.json(inquiry);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      res.status(400).json({ error: message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const inquiry = await inquiryService.update(String(req.params.id), req.body);
      res.json(inquiry);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      const code = message === 'Inquiry not found' ? 404 : 400;
      res.status(code).json({ error: message });
    }
  }
}

export const inquiryController = new InquiryController();
