import { Request, Response } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { fileStorageService } from '../services/fileStorage';

export class AttachmentController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    const attachments = await prisma.attachment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  }

  async upload(req: AuthRequest, res: Response): Promise<void> {
    const bookingId = String(req.params.id);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        bookingId,
        fileName: req.file.originalname,
        fileType: req.body.fileType || 'other',
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: req.user!.userId,
      },
    });

    res.status(201).json(attachment);
  }

  async download(req: Request, res: Response): Promise<void> {
    const attachmentId = String(req.params.attachId);
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    res.download(attachment.filePath, attachment.fileName);
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const attachmentId = String(req.params.attachId);
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });

      if (!attachment) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }

      fileStorageService.deleteFile(path.basename(attachment.filePath));
      await prisma.attachment.delete({ where: { id: attachmentId } });
      res.json({ message: 'Attachment deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const attachmentController = new AttachmentController();
