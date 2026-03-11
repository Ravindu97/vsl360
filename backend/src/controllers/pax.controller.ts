import { Request, Response } from 'express';
import prisma from '../config/database';

export class PaxController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const paxList = await prisma.pax.findMany({
      where: { bookingId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(paxList);
  }

  async create(req: Request, res: Response): Promise<void> {
    const pax = await prisma.pax.create({
      data: {
        bookingId: req.params.id,
        ...req.body,
      },
    });
    res.status(201).json(pax);
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const pax = await prisma.pax.update({
        where: { id: req.params.paxId },
        data: req.body,
      });
      res.json(pax);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Passenger not found' });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await prisma.pax.delete({ where: { id: req.params.paxId } });
      res.json({ message: 'Passenger removed' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Passenger not found' });
        return;
      }
      throw error;
    }
  }
}

export const paxController = new PaxController();
