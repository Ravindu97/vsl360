import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import logger from '../utils/logger';

export const requireIngestApiKey = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.INGEST_API_KEY) {
    logger.error('Inquiry ingest rejected: INGEST_API_KEY is not configured on admin backend');
    res.status(503).json({ error: 'Inquiry ingest is not configured' });
    return;
  }

  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== env.INGEST_API_KEY) {
    logger.warn('Inquiry ingest rejected: invalid or missing X-API-Key');
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
};
