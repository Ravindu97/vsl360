import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { runItineraryMigrations } from './config/runItineraryMigrations';
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

const defaultAllowedOrigins = [
  'https://admin.visitsrilanka360.com',
  'https://www.admin.visitsrilanka360.com',
];

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...env.CORS_ORIGINS])
);

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow server-to-server requests or CLI tools without an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

// Start server (itinerary raw SQL migrations for existing DBs)
void runItineraryMigrations()
  .then(() => {
    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  })
  .catch((err) => {
    logger.error('Failed to run itinerary migrations', err);
    process.exit(1);
  });

export default app;
