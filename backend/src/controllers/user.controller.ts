import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';

export class UserController {
  async findAll(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize ?? 10), 100));

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count(),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }

  async findById(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      const id = String(req.params.id);
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
      const userId = String(req.params.id);
      await prisma.user.update({
        where: { id: userId },
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
