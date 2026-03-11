import { Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { AuthRequest } from '../types';

export class InvoiceController {
  async findByBookingId(req: AuthRequest, res: Response): Promise<void> {
    const invoice = await invoiceService.findByBookingId(req.params.id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.create(req.params.id, req.body);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.update(req.params.id, req.body);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const invoiceController = new InvoiceController();
