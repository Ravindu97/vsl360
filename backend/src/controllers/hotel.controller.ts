import { Request, Response } from 'express';
import prisma from '../config/database';

export class HotelController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const hotels = await prisma.hotelBooking.findMany({
      where: { bookingId },
      orderBy: { nightNumber: 'asc' },
    });
    res.json(hotels);
  }

  async create(req: Request, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const hotel = await prisma.hotelBooking.create({
      data: {
        bookingId,
        ...req.body,
      },
    });
    res.status(201).json(hotel);
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = String(req.params.hotelId);
      const hotel = await prisma.hotelBooking.update({
        where: { id: hotelId },
        data: req.body,
      });
      res.json(hotel);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Hotel booking not found' });
        return;
      }
      throw error;
    }
  }

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = String(req.params.hotelId);
      const hotel = await prisma.hotelBooking.update({
        where: { id: hotelId },
        data: { confirmationStatus: 'CONFIRMED' },
      });
      res.json(hotel);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Hotel booking not found' });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = String(req.params.hotelId);
      await prisma.hotelBooking.delete({ where: { id: hotelId } });
      res.json({ message: 'Hotel booking removed' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Hotel booking not found' });
        return;
      }
      throw error;
    }
  }
}

export const hotelController = new HotelController();
