import { Request, Response } from 'express';
import prisma from '../config/database';

const inferPaxType = (age: number): 'INFANT' | 'CHILD' | 'ADULT' => {
  if (age <= 6) return 'INFANT';
  if (age <= 12) return 'CHILD';
  return 'ADULT';
};

export class PaxController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const paxList = await prisma.pax.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(paxList);
  }

  async create(req: Request, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const age = Number(req.body.age);
    const type = inferPaxType(age);

    const pax = await prisma.pax.create({
      data: {
        bookingId,
        ...req.body,
        age,
        type,
      },
    });
    res.status(201).json(pax);
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (req.body.type && req.body.age === undefined) {
        res.status(400).json({ error: 'Age is required when updating passenger type' });
        return;
      }

      const dataToUpdate = { ...req.body };
      if (req.body.age !== undefined) {
        const age = Number(req.body.age);
        dataToUpdate.age = age;
        dataToUpdate.type = inferPaxType(age);
      }

      const paxId = String(req.params.paxId);
      const pax = await prisma.pax.update({
        where: { id: paxId },
        data: dataToUpdate,
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
      const paxId = String(req.params.paxId);
      await prisma.pax.delete({ where: { id: paxId } });
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
