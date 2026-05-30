import dotenv from 'dotenv';
dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  DOCUMENT_LOGO_PATH: process.env.DOCUMENT_LOGO_PATH || '',
  DOCUMENT_INVOICE_LOGO_PATH: process.env.DOCUMENT_INVOICE_LOGO_PATH || '',
  DOCUMENT_THEME_PATH: process.env.DOCUMENT_THEME_PATH || '',
  DOCUMENT_LOGO_URL: process.env.DOCUMENT_LOGO_URL || '',
  DOCUMENT_INVOICE_LOGO_URL: process.env.DOCUMENT_INVOICE_LOGO_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** OpenStreetMap OSRM public router (no key). */
  OSRM_BASE_URL: (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, ''),
  /** If set, OpenRouteService is used instead of OSRM for driving distance. */
  ORS_API_KEY: (process.env.ORS_API_KEY || '').trim() || undefined,
  DISTANCE_PROVIDER_TIMEOUT_MS: parseInt(process.env.DISTANCE_PROVIDER_TIMEOUT_MS || '4000', 10),
  NOMINATIM_USER_AGENT: (process.env.NOMINATIM_USER_AGENT || 'VSL360/1.0 (itinerary geocoding)').trim(),
  NOMINATIM_EMAIL: (process.env.NOMINATIM_EMAIL || '').trim() || undefined,
  REPORT_USD_TO_INR: parseFloat(process.env.REPORT_USD_TO_INR || '83'),
  REPORT_EUR_TO_INR: parseFloat(process.env.REPORT_EUR_TO_INR || '90'),
  FX_API_BASE_URL: (process.env.FX_API_BASE_URL || 'https://api.frankfurter.app').replace(/\/$/, ''),
  FX_CACHE_TTL_MINUTES: parseInt(process.env.FX_CACHE_TTL_MINUTES || '360', 10),
  /** Meta WhatsApp Cloud API — GET webhook verification */
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim(),
  /** App secret from Meta app — used to verify X-Hub-Signature-256 on POST webhooks */
  WHATSAPP_APP_SECRET: (process.env.WHATSAPP_APP_SECRET || '').trim(),
  /**
   * If true (and NODE_ENV is development), accept POST webhooks without signature verification.
   * Never enable in production.
   */
  WHATSAPP_DEV_SKIP_SIGNATURE: process.env.WHATSAPP_DEV_SKIP_SIGNATURE === 'true',
};
