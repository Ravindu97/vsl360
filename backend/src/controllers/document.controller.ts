import { Request, Response } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { documentGeneratorService } from '../services/documentGenerator';

export class DocumentController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize ?? 5), 100));
    const where = { bookingId: String(req.params.id) };

    const [items, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.generatedDocument.count({ where }),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  async generateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateInvoice(
        String(req.params.id),
        req.user!.userId
      );
      res.json({ message: 'Invoice generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async generateTransport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateTransportDetails(
        String(req.params.id),
        req.user!.userId
      );
      res.json({ message: 'Transport document generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async generateReservation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateHotelReservation(
        String(req.params.id),
        req.user!.userId
      );
      res.json({ message: 'Reservation document generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async generateItinerary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { filePath, docId } = await documentGeneratorService.generateItinerary(
        String(req.params.id),
        req.user!.userId,
        req.body?.planDays
      );
      res.json({ message: 'Itinerary generated', filePath, docId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async generateTravelConfirmation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateTravelConfirmation(
        String(req.params.id),
        req.user!.userId
      );
      res.json({ message: 'Travel confirmation generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    const docId = String(req.params.docId);
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.download(doc.filePath, path.basename(doc.filePath));
  }
}

export const documentController = new DocumentController();
