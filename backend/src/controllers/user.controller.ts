import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';

export class UserController {
  async findAll(_req: Request, res: Response): Promise<void> {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  }

  async findById(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      });

      res.status(201).json(user);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: any = { ...req.body };

      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      });

      res.json(user);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      res.json({ message: 'User deactivated' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      throw error;
    }
  }
}

export const userController = new UserController();
