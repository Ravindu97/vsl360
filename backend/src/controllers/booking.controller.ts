import { Response } from 'express';
import { BookingStatus } from '@prisma/client';
import { bookingService } from '../services/booking.service';
import { AuthRequest } from '../types';

export class BookingController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.create(req.body, req.user!.userId);
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    const status = req.query.status as string | undefined;
    const bookings = await bookingService.findAll(req.user!.role, req.user!.userId, status);
    res.json(bookings);
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.findById(req.params.id);
      res.json(booking);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.update(req.params.id, req.body);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, notes } = req.body;
      const booking = await bookingService.updateStatus(
        req.params.id,
        status as BookingStatus,
        req.user!.userId,
        notes
      );
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await bookingService.delete(req.params.id);
      res.json({ message: 'Booking deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const bookingController = new BookingController();
