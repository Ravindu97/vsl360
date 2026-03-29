import { Response } from 'express';
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
    const search = req.query.search as string | undefined;
    const arrivalFrom = req.query.arrivalFrom as string | undefined;
    const arrivalTo = req.query.arrivalTo as string | undefined;
    const salesOwnerId = req.query.salesOwnerId as string | undefined;
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    const bookings = await bookingService.findAll(
      req.user!.role, req.user!.userId,
      { status, search, arrivalFrom, arrivalTo, salesOwnerId },
      page, pageSize,
    );
    res.json(bookings);
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.findById(String(req.params.id));
      res.json(booking);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.update(String(req.params.id), req.body);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, notes } = req.body;
      const booking = await bookingService.updateStatus(
        String(req.params.id),
        status,
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
      await bookingService.delete(String(req.params.id));
      res.json({ message: 'Booking deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const bookingController = new BookingController();
