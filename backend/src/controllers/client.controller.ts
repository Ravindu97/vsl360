import { Request, Response } from 'express';
import prisma from '../config/database';

export class ClientController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const client = await prisma.client.findUnique({
      where: { bookingId: req.params.id },
    });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client);
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const client = await prisma.client.update({
        where: { bookingId: req.params.id },
        data: req.body,
      });
      res.json(client);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      throw error;
    }
  }
}

export const clientController = new ClientController();
