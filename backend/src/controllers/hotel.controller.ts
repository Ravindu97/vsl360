import { Request, Response } from 'express';
import prisma from '../config/database';

export class HotelController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const hotels = await prisma.hotelBooking.findMany({
      where: { bookingId: req.params.id },
      orderBy: { nightNumber: 'asc' },
    });
    res.json(hotels);
  }

  async create(req: Request, res: Response): Promise<void> {
    const hotel = await prisma.hotelBooking.create({
      data: {
        bookingId: req.params.id,
        ...req.body,
      },
    });
    res.status(201).json(hotel);
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const hotel = await prisma.hotelBooking.update({
        where: { id: req.params.hotelId },
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
      const hotel = await prisma.hotelBooking.update({
        where: { id: req.params.hotelId },
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
      await prisma.hotelBooking.delete({ where: { id: req.params.hotelId } });
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
