import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bookingRoutes from './routes/booking.routes';
import clientRoutes from './routes/client.routes';
import paxRoutes from './routes/pax.routes';
import hotelRoutes from './routes/hotel.routes';
import transportRoutes from './routes/transport.routes';
import invoiceRoutes from './routes/invoice.routes';
import attachmentRoutes from './routes/attachment.routes';
import documentRoutes from './routes/document.routes';
import reportRoutes from './routes/report.routes';
import itineraryRoutes from './routes/itinerary.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/bookings/:id/client', clientRoutes);
app.use('/api/bookings/:id/pax', paxRoutes);
app.use('/api/bookings/:id/hotels', hotelRoutes);
app.use('/api/bookings/:id/transport', transportRoutes);
app.use('/api/bookings/:id/invoice', invoiceRoutes);
app.use('/api/bookings/:id/attachments', attachmentRoutes);
app.use('/api/bookings/:id/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/itinerary', itineraryRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

export default app;
