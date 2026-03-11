import { Request, Response } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { documentGeneratorService } from '../services/documentGenerator';

export class DocumentController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const documents = await prisma.generatedDocument.findMany({
      where: { bookingId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  }

  async generateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateInvoice(
        req.params.id,
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
        req.params.id,
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
        req.params.id,
        req.user!.userId
      );
      res.json({ message: 'Reservation document generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async generateItinerary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filePath = await documentGeneratorService.generateItinerary(
        req.params.id,
        req.user!.userId
      );
      res.json({ message: 'Itinerary generated', filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: req.params.docId },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.download(doc.filePath, path.basename(doc.filePath));
  }
}

export const documentController = new DocumentController();
