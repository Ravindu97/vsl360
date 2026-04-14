import { Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { AuthRequest } from '../types';

export class InvoiceController {
  async findByBookingId(req: AuthRequest, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const invoice = await invoiceService.findByBookingId(bookingId);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookingId = String(req.params.id);
      const invoice = await invoiceService.create(bookingId, req.body);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookingId = String(req.params.id);
      const invoice = await invoiceService.update(bookingId, req.body);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const invoiceController = new InvoiceController();
